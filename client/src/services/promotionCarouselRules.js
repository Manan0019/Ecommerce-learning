/** Pure carousel rules: never duplicate banners and always wrap around. */
export function visiblePromotionWindow(banners, index, count) {
  if (!Array.isArray(banners) || banners.length === 0) return [];
  const size=Math.min(banners.length,Math.max(1,Math.min(6,Number(count)||3)));
  const start=((Math.trunc(index)||0)%banners.length+banners.length)%banners.length;
  return Array.from({length:size},(_,i)=>banners[(start+i)%banners.length]);
}
export function movePromotionSlide(index,step,length) {
  if (!Number.isInteger(length) || length<=0) return 0;
  return ((index+step)%length+length)%length;
}

/** Avoid rendering hundreds of navigation dots for long seasonal campaigns. */
export function promotionDotIndices(total,active) {
  if(!Number.isInteger(total)||total<=0)return [];
  if(total<=11)return Array.from({length:total},(_,i)=>i);
  const center=((active%total)+total)%total;
  return Array.from({length:7},(_,i)=>(center+i-3+total)%total);
}
