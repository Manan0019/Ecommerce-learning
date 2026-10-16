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
