import pool from "../config/db.js";

export async function requireAuthenticated(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        message: "Please log in."
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, mobile_number, profile_image_url, role, password_changed_at
       FROM users
       WHERE id = $1`,
      [req.session.userId]
    );

    const user = result.rows[0];

    if (!user || !["admin", "customer", "delivery"].includes(user.role)) {
      return res.status(403).json({
        message: "Access denied."
      });
    }

    if(user.password_changed_at && (!req.session.authTime || Number(req.session.authTime)<new Date(user.password_changed_at).getTime())) {
      return res.status(401).json({message:'Your password was changed. Please sign in again.'});
    }
    req.user = user;

    next();

  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication check failed."
    });
  }
}


function requireRole(role) {
  return (req, res, next) => requireAuthenticated(req, res, () => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied." });
    }
    return next();
  });
}

export const requireCustomer = requireRole("customer");
export const requireAdmin = requireRole("admin");
export const requireDelivery = (req,res,next) => requireRole("delivery")(req,res,async()=>{
  try{const active=await pool.query("SELECT 1 FROM delivery_staff_profiles WHERE user_id=$1 AND is_active=TRUE",[req.user.id]);
    if(!active.rows.length)return res.status(403).json({message:"Delivery account disabled."});return next();
  }catch(e){console.error("Delivery access:",e);return res.status(500).json({message:"Delivery access unavailable."});}
});