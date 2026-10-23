/** Integer paise avoid float drift; changing a profile rate never reprices assigned deliveries. */
export function parseDeliveryRate(value){
 const raw=String(value??'').trim();
 if(!/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(raw))return null;
 const [whole,fraction='']=raw.split('.');
 const paise=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 return Number.isSafeInteger(paise)&&paise<=5000000?paise:null;
}
export const rupees = paise => (Number(paise||0)/100).toFixed(2);
export function parseFinanceWindow(query={}){
 const {from,to}=query;
 if(from!==undefined && (typeof from!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(from)||!validDate(from)))return {error:'Invalid from date (YYYY-MM-DD).'};
 if(to!==undefined && (typeof to!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!validDate(to)))return {error:'Invalid to date (YYYY-MM-DD).'};
 if(from&&to&&from>to)return {error:'Start date must not be later than end date.'};
 return {from:from||null,to:to||null};
}
function validDate(value){const day=new Date(`${value}T00:00:00Z`);return !Number.isNaN(day.valueOf())&&day.toISOString().slice(0,10)===value;}
export function financeSummary(rows=[]){
 const output={total:0,completed:0,pending:0,earnedPaise:0,paidPaise:0,unpaidPaise:0,codAmount:0,prepaidAmount:0,codCollected:0,prepaidCollected:0};
 for(const row of rows){
  output.total++;
  const delivered=row.deliveryStatus==='delivered'&&Boolean(row.deliveredAt);
  if(delivered){output.completed++;const earning=Number(row.payRatePaise||0);output.earnedPaise+=earning;if(row.paidAt)output.paidPaise+=earning;else output.unpaidPaise+=earning;}
  else output.pending++;
  const amount=Number(row.total||0);
  if(row.paymentMethod==='cod'){output.codAmount+=amount;if(row.paymentStatus==='cod_collected')output.codCollected+=amount;}
  else if(row.paymentMethod==='razorpay'){output.prepaidAmount+=amount;if(row.paymentStatus==='razorpay_paid'&&!row.refundStatus)output.prepaidCollected+=amount;}
 }
 return output;
}
