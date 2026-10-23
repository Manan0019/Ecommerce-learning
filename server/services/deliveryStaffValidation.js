// Shared server-side field policy for delivery accounts; never trust browser validation.
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateDeliveryProfile(value){
 const errors={};
 const name=typeof value?.fullName==='string'?value.fullName.trim():'';
 const mobile=typeof value?.mobileNumber==='string'?value.mobileNumber.trim():'';
 if(name.length<2||name.length>100)errors.fullName='Enter a full name between 2 and 100 characters.';
 if(!/^[0-9]{10}$/.test(mobile))errors.mobileNumber='Enter exactly 10 digits (numbers only).';
 return errors;
}
export function validateNewDeliveryAccount(value){
 const errors=validateDeliveryProfile(value);
 const email=typeof value?.email==='string'?value.email.trim():'';
 if(!email || email.length>254 || !emailPattern.test(email))errors.email='Enter a valid email address (up to 254 characters).';
 const password=value?.password;
 if(typeof password!=='string'||password.length<12||Buffer.byteLength(password,'utf8')>72)errors.password='Password must have at least 12 characters and at most 72 UTF-8 bytes.';
 return errors;
}
