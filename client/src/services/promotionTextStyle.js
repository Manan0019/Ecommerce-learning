/** Frontend presentation model for text overlay customization.
 * A null style means use the original, legacy promotion CSS without overrides.
 */
export const defaultPromotionTextStyle = Object.freeze({
  fontFamily:'sans', align:'left', anchor:'left', x:7, y:50, width:80,
  titleSize:48, subtitleSize:18, titleWeight:800, titleColor:'#FFFFFF',
  subtitleColor:'#F1EDFF', titleTransform:'none', letterSpacing:0,
  ctaText:'Explore offer',ctaVisible:true,ctaColor:'#FFFFFF',
  ctaBackground:'#5D43DE',overlayOpacity:55,textShadow:true,
});
export const promotionFontOptions = [
 ['sans','Modern sans'],['display','Display'],['serif','Editorial serif'],['mono','Monospace'],
];
export const promotionPositionPresets = [
 ['top-left','Top left',7,18,'left'],['top-center','Top center',50,18,'center'],['top-right','Top right',93,18,'right'],
 ['middle-left','Middle left',7,50,'left'],['middle-center','Center',50,50,'center'],['middle-right','Middle right',93,50,'right'],
 ['bottom-left','Bottom left',7,82,'left'],['bottom-center','Bottom center',50,82,'center'],['bottom-right','Bottom right',93,82,'right'],
];
export function promotionTextInlineStyle(value){
 if(!value)return undefined;
 const s={...defaultPromotionTextStyle,...value};
 const anchor=s.anchor==='right' ? 100 : s.anchor==='center' ? 50 : 0;
 const family={sans:'inherit',display:'Trebuchet MS, Arial, sans-serif',serif:'Georgia, Times New Roman, serif',mono:'ui-monospace, SFMono-Regular, Consolas, monospace'}[s.fontFamily]||'inherit';
 return {
  left:`${s.x}%`,top:`${s.y}%`,width:`${s.width}%`,maxWidth:'none',right:'auto',bottom:'auto',
  transform:`translate(-${anchor}%,-50%)`,textAlign:s.align,fontFamily:family,
  '--nx-promo-title-size':`${s.titleSize}px`,
  '--nx-promo-subtitle-size':`${s.subtitleSize}px`,
  '--nx-promo-title-weight':s.titleWeight,
  '--nx-promo-title-color':s.titleColor,
  '--nx-promo-subtitle-color':s.subtitleColor,
  '--nx-promo-cta-color':s.ctaColor,
  '--nx-promo-cta-background':s.ctaBackground,
  '--nx-promo-letter-spacing':`${s.letterSpacing}px`,
  '--nx-promo-title-transform':s.titleTransform,
  '--nx-promo-text-shadow':s.textShadow?'0 2px 12px rgba(0,0,0,.55)':'none',
 };
}
export function promotionShadeStyle(value){
 if(!value)return undefined;
 const opacity=Math.max(0,Math.min(85,Number(value.overlayOpacity)||0))/100;
 return {'--nx-promo-overlay-opacity':opacity};
}
