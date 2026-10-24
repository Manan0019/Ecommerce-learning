// Cookie-session mutation defence for the entire API. Webhooks are registered before this guard.
const unsafe=new Set(['POST','PUT','PATCH','DELETE']);
export function validUnsafeRequestOrigin({method,origin,referer,fetchSite,expected,strict=true}) {
  if(!unsafe.has(String(method).toUpperCase()))return true;
  if(fetchSite==='cross-site')return false;
  let trusted;
  try { trusted=new URL(expected).origin; } catch { return false; }
  if(origin) { try {return new URL(origin).origin===trusted;} catch {return false;} }
  if(referer){try{return new URL(referer).origin===trusted;}catch{return false;}}
  // Production requires proof of same-origin. NODE_ENV=test is for isolated unit runners.
  if(!strict)return true;
  return fetchSite==='same-origin';
}
export function unsafeRequestOrigin(req,res,next){
  const trusted=process.env.CLIENT_ORIGIN||'http://localhost:5173';
  if(validUnsafeRequestOrigin({method:req.method,origin:req.get('origin'),referer:req.get('referer'),fetchSite:req.get('sec-fetch-site'),expected:trusted,strict:process.env.NODE_ENV!=='test'}))return next();
  return res.status(403).json({message:'This request could not be verified. Reload the page and try again.'});
}
