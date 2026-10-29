import {useEffect,useState} from 'react';
import {Button, Checkbox, FormField, Select, TextField} from '../ui/index';
import PromotionBannerCopy from '../customer/PromotionBannerCopy';
import UiIcon from '../common/UiIcon';
import {apiAssetUrl} from '../../services/apiClient';
import {defaultPromotionTextStyle,promotionFontOptions,promotionPositionPresets,promotionShadeStyle} from '../../services/promotionTextStyle';

const colorFields=[['titleColor','Headline colour'],['subtitleColor','Subtitle colour'],['ctaColor','Button text colour'],['ctaBackground','Button background']];
function NumberControl({label,min,max,value,onChange,step=1}){
 return <FormField className="nx-promo-number-field"><span>{label}</span>
  <TextField type="number" min={min} max={max} step={step} value={value}
   onChange={event=>{const n=Number(event.target.value);if(event.target.value!==''&&Number.isFinite(n))onChange(Math.min(max,Math.max(min,n)));}}/>
 </FormField>;
}
function ColorControl({label,value,onChange}){
 const [edit,setEdit]=useState({source:value,text:value});
 const typed=edit.source===value?edit.text:value;
 return <FormField className="nx-promo-color-field"><span>{label}</span><div className="nx-promo-color-pair">
  <input type="color" value={value} aria-label={label} onChange={e=>onChange(e.target.value.toUpperCase())}/>
  <TextField aria-label={`${label} hexadecimal code`} value={typed} maxLength={7}
   onChange={e=>{const v=e.target.value.toUpperCase();const valid=/^#[0-9A-F]{6}$/.test(v);setEdit({source:valid?v:value,text:v});if(valid)onChange(v);}}
   onBlur={()=>{if(!/^#[0-9A-F]{6}$/.test(typed))setEdit({source:value,text:value});}}/>
 </div></FormField>;
}

/** Self-contained banner editor; it never mutates product/page data. */
export default function PromotionTextStyleEditor({draft,originalImageUrl,onEnableOverlay,onChange}){
 const [localPreview,setLocalPreview]=useState('');
 useEffect(()=>{
  if(!draft.image)return;
  const objectUrl=URL.createObjectURL(draft.image);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLocalPreview(objectUrl);
  return ()=>URL.revokeObjectURL(objectUrl);
 },[draft.image]);
 const previewUrl=draft.image?localPreview:originalImageUrl?apiAssetUrl(originalImageUrl):null;
 const style=draft.textStyle;
 const effective=style||defaultPromotionTextStyle;
 const update=(key,val)=>onChange({...defaultPromotionTextStyle,...effective,[key]:val});
 const selectedPreset=promotionPositionPresets.find(([, ,x,y,anchor])=>x===effective.x && y===effective.y && anchor===effective.anchor)?.[0]||'custom';
 const banner={title:draft.title||'Your promotion headline',subtitle:draft.subtitle||'Add a subtitle to preview the design',showText:draft.showText,textStyle:style};
 return <section className="nx-promo-editor nx19-section" aria-label="Banner text and appearance settings">
  <details className="nx-promo-editor-disclosure">
    <summary className="nx-promo-editor-summary">
      <span className="nx-promo-editor-summary-copy">
        <strong>1. Banner text &amp; appearance</strong>
        <small>Fonts, colours, positioning, call-to-action and live preview</small>
      </span>
      <span className="nx-promo-editor-chevron" aria-hidden="true"><UiIcon name="chevron-down" size={19}/></span>
    </summary>
    <div className="nx-promo-editor-body">
  <p>Available when creating or editing a promotion. Changes apply only to this banner. Saved fonts, colours and positions appear in the preview.</p>
  <div className="nx-promo-preview" aria-label="Live promotion preview">
    {previewUrl?<img src={previewUrl} alt=""/>:<div className="nx-promo-preview-placeholder">Choose a banner image to preview the text on your artwork</div>}
    {draft.showText&&<div className={`nx-promo-preview-layer${style?' nx-promo-preview-custom':''}`} style={promotionShadeStyle(style)}>
      <PromotionBannerCopy banner={banner}/></div>}
  </div>
  <div className="nx-promo-preview-hint">Desktop-style preview · Smaller storefront tiles automatically scale the text. The banner is still clickable using its configured destination.</div>
  {!draft.showText&&<div className="nx-promo-image-only-notice" role="note">
    <div><strong>This banner is currently image-only.</strong><p>Text, including words already printed on the uploaded picture, is part of the image and cannot be restyled directly. Enable an editable text overlay to change its font, colour and position. You can also change a setting below to enable the overlay automatically.</p></div>
    <Button type="button" variant="primary" onClick={onEnableOverlay}>Enable editable text overlay</Button>
  </div>}
    <div className="nx-promo-editor-actions">
      <span className="nx-promo-style-status" role="status">{style?'Custom text styling active':'Original text styling (unchanged until you edit a setting)'}</span>
      {style&&<Button type="button" variant="secondary" onClick={()=>onChange(null)}>Restore original styling</Button>}
      {style&&<Button type="button" variant="secondary" onClick={()=>onChange({...defaultPromotionTextStyle})}>Reset custom values</Button>}
    </div>
    <div className="nx-promo-controls-grid">
        <FormField>Text placement
          <Select value={selectedPreset} onChange={e=>{
            const preset=promotionPositionPresets.find(([key])=>key===e.target.value);
            if(preset)onChange({...defaultPromotionTextStyle,...effective,x:preset[2],y:preset[3],anchor:preset[4],align:preset[4]});
          }}>
            {promotionPositionPresets.map(([key,label])=><option key={key} value={key}>{label}</option>)}
            {selectedPreset==='custom'&&<option value="custom">Custom position</option>}
          </Select>
        </FormField>
        <FormField>Font family<Select value={effective.fontFamily} onChange={e=>update('fontFamily',e.target.value)}>
          {promotionFontOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </Select></FormField>
        <FormField>Text alignment<Select value={effective.align} onChange={e=>update('align',e.target.value)}>
          <option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option>
        </Select></FormField>
        <FormField>Headline case<Select value={effective.titleTransform} onChange={e=>update('titleTransform',e.target.value)}>
          <option value="none">As written</option><option value="uppercase">UPPERCASE</option><option value="capitalize">Title Case</option>
        </Select></FormField>
        <FormField>Headline weight<Select value={effective.titleWeight} onChange={e=>update('titleWeight',Number(e.target.value))}>
          {[400,500,600,700,800,900].map(w=><option key={w} value={w}>{w}</option>)}
        </Select></FormField>
        <NumberControl label="Headline size (px)" min={18} max={96} value={effective.titleSize} onChange={v=>update('titleSize',v)}/>
        <NumberControl label="Subtitle size (px)" min={12} max={44} value={effective.subtitleSize} onChange={v=>update('subtitleSize',v)}/>
        <NumberControl label="Letter spacing (px)" min={-2} max={6} step={0.5} value={effective.letterSpacing} onChange={v=>update('letterSpacing',v)}/>
        <NumberControl label="Horizontal position (%)" min={0} max={100} value={effective.x} onChange={v=>update('x',v)}/>
        <NumberControl label="Vertical position (%)" min={0} max={100} value={effective.y} onChange={v=>update('y',v)}/>
        <NumberControl label="Text block width (%)" min={20} max={100} value={effective.width} onChange={v=>update('width',v)}/>
        <NumberControl label="Image darkening (%)" min={0} max={85} value={effective.overlayOpacity} onChange={v=>update('overlayOpacity',v)}/>
        {colorFields.map(([key,label])=><ColorControl key={key} label={label} value={effective[key]} onChange={v=>update(key,v)}/>)}
        <FormField>Call-to-action label<TextField maxLength={60} value={effective.ctaText} onChange={e=>update('ctaText',e.target.value)}/></FormField>
    </div>
    <div className="nx-promo-toggles">
        <FormField inline><Checkbox checked={effective.ctaVisible} onChange={e=>update('ctaVisible',e.target.checked)}/><span>Show call-to-action</span></FormField>
        <FormField inline><Checkbox checked={effective.textShadow} onChange={e=>update('textShadow',e.target.checked)}/><span>Text shadow for readability</span></FormField>
    </div>
    </div>
  </details>
 </section>;
}
