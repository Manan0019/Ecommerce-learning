import { Router } from 'express';
import { requireCustomer } from '../middleware/authMiddleware.js';
import { listAddresses,saveAddress,deleteAddress,setDefaultAddress } from '../controllers/addressController.js';
const router=Router();router.use(requireCustomer);
const originCheck=(req,res,next)=>{const origin=req.get('origin');const trusted=process.env.CLIENT_ORIGIN||'http://localhost:5173';if(origin&&origin!==trusted)return res.status(403).json({message:'Request origin not allowed.'});next();};
router.get('/',listAddresses);router.post('/',originCheck,saveAddress);router.put('/:id',originCheck,saveAddress);router.delete('/:id',originCheck,deleteAddress);router.patch('/:id/default',originCheck,setDefaultAddress);
export default router;
