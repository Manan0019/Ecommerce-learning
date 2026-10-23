// Mirror the server policy to give each field immediate, accessible feedback.
export const DELIVERY_FIELDS=['fullName','email','mobileNumber','password','payRate'];
export function deliveryFieldError(field,value){
 const s=String(value??'');
 if(field==='fullName')return s.trim().length>=2&&s.trim().length<=100?'':'Enter 2–100 characters for the full name.';
 if(field==='email')return s.trim().length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())?'':'Enter a valid email address.';
 if(field==='mobileNumber')return /^[0-9]{10}$/.test(s)?'':'Enter exactly 10 digits (numbers only).';
 if(field==='payRate')return /^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(s)&&Number(s)<=50000?'':'Enter ₹0–₹50,000 with up to 2 decimal places.';
 if(field==='password')return s.length>=12&&new TextEncoder().encode(s).length<=72?'':'Use 12+ characters, maximum 72 UTF-8 bytes.';
 return '';
}
export function validateDeliveryForm(form,{profile=false}={}){
 const errors={};for(const field of DELIVERY_FIELDS){if(profile&&['email','password','payRate'].includes(field))continue;
  const message=deliveryFieldError(field,form?.[field]);if(message)errors[field]=message;
 }return errors;
}
