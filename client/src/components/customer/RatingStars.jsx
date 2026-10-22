/** A five-star readout/editor supporting real 0.5 increments, mouse, touch and keyboard. */
export default function RatingStars({ value = 0, onChange, previewValue = null, onPreview, size = 'normal' }) {
  const displayed = previewValue ?? value;
  const readOnly = typeof onChange !== 'function';
  return <div className={`nx64-rating-stars ${readOnly ? 'is-readonly' : 'is-editable'} ${size === 'large' ? 'is-large' : ''}`}
    role={readOnly ? 'img' : 'group'} aria-label={readOnly ? `${Number(value)} out of 5 stars` : `Rating: ${Number(value)} out of 5 stars`}>
    {[1,2,3,4,5].map(index => <span className="nx64-star-unit" key={index}>
      <span aria-hidden="true" className="nx64-star-bg">★</span>
      <span aria-hidden="true" className="nx64-star-fill" style={{width: `${Math.max(0, Math.min(1, displayed - (index - 1))) * 100}%`}}>★</span>
      {!readOnly && <span className="nx64-star-targets">
        {[index - .5,index].map(n=><button key={n} type="button" aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
          aria-pressed={value === n} onClick={()=>onChange(n)}
          onPointerEnter={event=>{if(event.pointerType==='mouse')onPreview?.(n)}}
          onFocus={()=>onPreview?.(n)} onBlur={()=>onPreview?.(null)} />)}
      </span>}
    </span>)}
  </div>;
}
