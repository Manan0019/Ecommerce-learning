import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

export async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Verify your Ecommerce Account",
    text: `Your verification code is ${otp}.
It expires in 5 minutes.

If you did not request this code, ignore this email.`
  };

  if (process.env.NODE_ENV === "test") {
    return { messageId: "test-otp-not-sent" };
  }

  return transporter.sendMail(mailOptions);
}


export async function sendDeliveryConfirmationEmail(email, otp, orderId) {
  if (process.env.NODE_ENV === 'test') return {messageId:'test-delivery-otp-not-sent'};
  return transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: `Nexora delivery verification — Order #${orderId}`,
    text: `Your Nexora delivery confirmation code is ${otp}.\n\nShare this code only with your assigned Nexora delivery executive after receiving your parcel. It expires in 10 minutes.\n\nIf no parcel has arrived, DO NOT share this code. Nexora will never request it by phone before handing over your order.`
  });
}
