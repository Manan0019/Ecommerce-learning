// Centralized display-only store identity; replace these demo details when ready.
export const SITE_NAME = "Nexora";
export const SITE_TAGLINE = "A little of everything, all in one place.";
export const SITE_SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() || '';
export const SITE_MERCHANT_NAME = import.meta.env.VITE_MERCHANT_LEGAL_NAME?.trim() || '';
export const SITE_MERCHANT_ADDRESS = import.meta.env.VITE_MERCHANT_ADDRESS?.trim() || '';
export const SITE_GRIEVANCE_NAME = import.meta.env.VITE_GRIEVANCE_OFFICER?.trim() || '';
export const SITE_SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE?.trim() || '';
// These real merchant details must be supplied and reviewed before production launch.
export const SITE_POLICIES_COMPLETE = Boolean(SITE_SUPPORT_EMAIL && SITE_MERCHANT_NAME && SITE_MERCHANT_ADDRESS && SITE_GRIEVANCE_NAME && import.meta.env.VITE_POLICIES_APPROVED === 'true');
