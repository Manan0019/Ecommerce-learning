export function normalizeNewsletterEmail(value) {
  if (typeof value !== 'string') return null;
  const email=value.trim().toLowerCase();
  return email.length <=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
export function validateReview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Review details are required.';
  if (!Number.isInteger(value.rating) || value.rating<1 || value.rating>5) return 'Choose a rating from 1 to 5.';
  if (typeof value.title!=='string' || value.title.trim().length<4 || value.title.trim().length>100) return 'Use a review title of 4–100 characters.';
  if (typeof value.body!=='string' || value.body.trim().length<20 || value.body.trim().length>1200) return 'Write a review of 20–1200 characters.';
  return null;
}
export const reviewEligible = row => row?.status==='delivered' && ['razorpay_paid','cod_collected'].includes(row.payment_status);
