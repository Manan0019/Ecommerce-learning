import UiIcon from '../common/UiIcon';
import {defaultPromotionTextStyle,promotionTextInlineStyle} from '../../services/promotionTextStyle';

/** The SAME text presentation is used in the admin live editor and on the storefront. */
export default function PromotionBannerCopy({banner}){
 const custom=banner.textStyle;
 if(banner.showText===false)return null;
 const config=custom?{...defaultPromotionTextStyle,...custom}:null;
 return <span className={`nx37-promotion-copy${custom?' nx-promo-custom-copy':''}`}
   style={promotionTextInlineStyle(custom)}>
   <strong>{banner.title}</strong>
   {banner.subtitle&&<span className="nx-promo-subtitle">{banner.subtitle}</span>}
   {(!config||config.ctaVisible)&&<em className="nx-promo-cta">{config?.ctaText||'Explore offer'} <UiIcon name="chevron-right" size={17}/></em>}
 </span>;
}
