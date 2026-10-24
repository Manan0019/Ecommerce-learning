import { Button } from "../ui/index";
/** Accessible full- and half-star picker, using identical rounded SVG stars for fill and outline. */
const path='M12 2.7c.52 0 .97.31 1.21.8l2.59 5.23 5.78.84c1.12.16 1.57 1.54.76 2.33l-4.18 4.07.99 5.75c.2 1.12-.98 1.98-1.98 1.45L12 20.47l-5.17 2.72c-1 .53-2.18-.33-1.98-1.45l.99-5.75-4.18-4.07c-.81-.79-.36-2.17.76-2.33l5.78-.84L10.79 3.5c.24-.49.69-.8 1.21-.8Z';
function StarShape(){return <svg viewBox="0 0 24 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d={path} stroke="currentColor" strokeWidth=".9" strokeLinejoin="round" fill="currentColor"/></svg>}
export default function RatingStars({value=0,onChange,previewValue=null,onPreview,size='normal'}){
 const displayed=Number(previewValue??value);const readOnly=typeof onChange!=='function';
 return <div className={`nx64-rating-stars nx71-rating-stars ${readOnly?'is-readonly':'is-editable'} ${size==='large'?'is-large':''}`} role={readOnly?'img':'group'} aria-label={readOnly?`${Number(value)} out of 5 stars`:`Rating: ${Number(value)} out of 5 stars`}>
  {[1,2,3,4,5].map(index=><span key={index} className="nx64-star-unit nx71-star-unit">
   <span className="nx71-star-bg"><StarShape/></span><span className="nx71-star-fill" style={{width:`${Math.max(0,Math.min(1,displayed-index+1))*100}%`}}><StarShape/></span>
   {!readOnly&&<span className="nx64-star-targets">{[index-.5,index].map(n=><Button variant="plain" key={n} type="button" aria-label={`Rate ${n} out of 5 stars`} aria-pressed={value===n} onClick={()=>onChange(n)} onPointerEnter={event=>{if(event.pointerType==='mouse')onPreview?.(n)}} onFocus={()=>onPreview?.(n)} onBlur={()=>onPreview?.(null)}/>)}</span>}
  </span>)}
 </div>;
}
