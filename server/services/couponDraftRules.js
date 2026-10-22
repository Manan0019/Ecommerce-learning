export function validateCouponDraft(raw){
 if(!raw||typeof raw!=='object')return null;
 const code=String(raw.code||'').trim().toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code))return null;
 const kind=raw.kind;
 if(!['percent','fixed'].includes(kind))return null;
 const validMoney=v=>/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(String(v));
 const v=String(raw.value),minimum=String(raw.minimumSubtotal??0),maxRedemptions=Number(raw.maxRedemptions??100);
 if(!validMoney(v)||Number(v)<=0||(kind==='percent'&&Number(v)>50)||(kind==='fixed'&&Number(v)>100000))return null;
 if(!validMoney(minimum)||!Number.isSafeInteger(maxRedemptions)||maxRedemptions<1||maxRedemptions>100000)return null;
 const startsAt=raw.startsAt?String(raw.startsAt):null,expiresAt=raw.expiresAt?String(raw.expiresAt):null;
 if(startsAt&&Number.isNaN(Date.parse(startsAt))||expiresAt&&Number.isNaN(Date.parse(expiresAt))||startsAt&&expiresAt&&Date.parse(expiresAt)<=Date.parse(startsAt))return null;
 return {code,kind,value:v,minimumSubtotal:minimum,maxRedemptions,startsAt,expiresAt};
}
// Preview only. Checkout must not call this until it has an atomic redemption counter and receipt snapshots.
export function draftDiscountPaise(draft,subtotalPaise){
 if(typeof subtotalPaise!=='bigint'||subtotalPaise<0n)throw new Error('Invalid subtotal');
 const rate=BigInt(Math.round(Number(draft.value)*100));
 if(draft.kind==='percent')return subtotalPaise*rate/10000n;
 if(draft.kind==='fixed'){const fixed=BigInt(Math.round(Number(draft.value)*100));return subtotalPaise<fixed?subtotalPaise:fixed;}
 throw new Error('Unknown discount type');
}
