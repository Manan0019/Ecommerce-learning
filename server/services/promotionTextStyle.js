/** Strict, bounded format for optional per-banner visual text styling.
 * Null means legacy presentation: existing promotions render exactly as before.
 */
export const DEFAULT_PROMOTION_TEXT_STYLE = Object.freeze({
  fontFamily: 'sans', align: 'left', anchor: 'left', x: 7, y: 50, width: 80,
  titleSize: 48, subtitleSize: 18, titleWeight: 800, titleColor: '#FFFFFF',
  subtitleColor: '#F1EDFF', titleTransform: 'none', letterSpacing: 0,
  ctaText: 'Explore offer', ctaVisible: true, ctaColor: '#FFFFFF',
  ctaBackground: '#5D43DE', overlayOpacity: 55, textShadow: true,
});
const choices = {
  fontFamily:['sans','serif','mono','display'], align:['left','center','right'],
  anchor:['left','center','right'], titleTransform:['none','uppercase','capitalize'],
};
const numbers = {
  x:[0,100],y:[0,100],width:[20,100],titleSize:[18,96],subtitleSize:[12,44],
  titleWeight:[400,900],letterSpacing:[-2,6],overlayOpacity:[0,85],
};
const colors = new Set(['titleColor','subtitleColor','ctaColor','ctaBackground']);
const flags = new Set(['ctaVisible','textShadow']);
const keys = new Set(Object.keys(DEFAULT_PROMOTION_TEXT_STYLE));
export function parsePromotionTextStyle(value){
  if(value === undefined || value === null) return null;
  if(typeof value === 'string'){
    if(value.length > 4096) return undefined;
    try{ value = JSON.parse(value); }catch{return undefined;}
    if(value === null)return null;
  }
  if(!value || Array.isArray(value) || typeof value !== 'object')return undefined;
  if(Object.keys(value).length > keys.size || Object.keys(value).some(key=>!keys.has(key)))return undefined;
  const result={...DEFAULT_PROMOTION_TEXT_STYLE};
  for(const [key,val] of Object.entries(value)){
    if(choices[key]){
      if(typeof val !== 'string' || !choices[key].includes(val))return undefined;
    }else if(numbers[key]){
      if(typeof val !== 'number' || !Number.isFinite(val) || val < numbers[key][0] || val > numbers[key][1])return undefined;
      if(key === 'titleWeight' && val % 100 !== 0)return undefined;
    }else if(colors.has(key)){
      if(typeof val !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(val))return undefined;
    }else if(flags.has(key)){
      if(typeof val !== 'boolean')return undefined;
    }else if(key==='ctaText'){
      if(typeof val !== 'string' || val.length > 60 || /[\x00-\x1f]/.test(val))return undefined;
    }
    result[key]=val;
  }
  return result;
}
