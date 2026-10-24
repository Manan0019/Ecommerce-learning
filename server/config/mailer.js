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


const orderEmailSubjects={order_placed:'Your Nexora order is confirmed',payment_verified:'Your Nexora payment was received',order_shipped:'Your Nexora order is on the way',order_delivered:'Your Nexora delivery is complete',order_cancelled:'Your Nexora order was cancelled',refund_processed:'Your Nexora refund was processed'};
export async function sendOrderNotificationEmail(email,{kind,orderId,amount,name}) {
 if(process.env.NODE_ENV==='test')return {messageId:'test-transaction-not-sent'};
 if(!process.env.SMTP_USER||!process.env.SMTP_PASSWORD)throw new Error('SMTP_NOT_CONFIGURED');
 const subject=orderEmailSubjects[kind];if(!subject)throw new Error('Unrecognized event');
 const url=`${process.env.CLIENT_ORIGIN||'http://localhost:5173'}/orders`;
 const content=[`Hello ${name||'customer'},`, '', `${subject}.`, `Order number: #${orderId}.`, `Order value: INR ${amount}.`,'',`Sign in to see verified order and payment details: ${url}`,'', 'If you need assistance, use the contact details on the Nexora website.','Do not share delivery OTPs before you have received your parcel.'].join('\n');
 return transporter.sendMail({from:process.env.SMTP_USER,to:email,subject,text:content});
}

export async function sendNewsletterVerificationEmail(email, confirmationUrl) {
  if(process.env.NODE_ENV==='test')return {messageId:'test-newsletter-confirm-not-sent'};
  if(!process.env.SMTP_USER || !process.env.SMTP_PASSWORD)throw new Error('SMTP_NOT_CONFIGURED');
  return transporter.sendMail({from:process.env.SMTP_USER,to:email,subject:'Confirm your Nexora newsletter subscription',
    text:`Confirm your subscription to Nexora updates within 24 hours using this link:\n${confirmationUrl}\n\nIf you did not request this, no action is needed.`});
}

export async function sendPasswordResetEmail(email, resetUrl) {
  if(process.env.NODE_ENV==='test')return {messageId:'test-reset-not-sent'};
  if(!process.env.SMTP_USER || !process.env.SMTP_PASSWORD)throw new Error('SMTP_NOT_CONFIGURED');
  return transporter.sendMail({from:process.env.SMTP_USER,to:email,subject:'Reset your Nexora password',
    text:`Someone requested a password reset for your Nexora account. Open this link within 20 minutes to set a new password:\n\n${resetUrl}\n\nIf you did not request this, ignore this message. Never share the link.`});
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
