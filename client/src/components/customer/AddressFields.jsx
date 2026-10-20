const fields=[
  {key:'fullName',label:'Full name',autoComplete:'name',max:100},
  {key:'phone',label:'Mobile number',type:'tel',autoComplete:'tel',max:18,pattern:'[+]?[0-9\\s-]{10,18}'},
  {key:'addressLine1',label:'House / street / area',wide:true,max:200,autoComplete:'address-line1',min:5},
  {key:'addressLine2',label:'Apartment / landmark (optional)',wide:true,max:200,optional:true,autoComplete:'address-line2'},
  {key:'city',label:'City',max:100,autoComplete:'address-level2'},
  {key:'state',label:'State / Union territory',max:100,autoComplete:'address-level1'},
  {key:'pincode',label:'6-digit PIN code',max:6,inputMode:'numeric',pattern:'[0-9]{6}',autoComplete:'postal-code'},
];
export default function AddressFields({address,onChange,disabled=false}){
  return <div className="nx-cod-fields">{fields.map(field=><label key={field.key} className={`nx-cod-field ${field.wide?'nx-cod-wide':''}`}>
    <span>{field.label}{!field.optional&&<b aria-label="required"> *</b>}</span>
    <input name={field.key} value={address[field.key]??''} onChange={e=>onChange({...address,[field.key]:e.target.value})}
      type={field.type||'text'} required={!field.optional} disabled={disabled} maxLength={field.max} minLength={field.min}
      inputMode={field.inputMode} pattern={field.pattern} autoComplete={field.autoComplete}/>
  </label>)}</div>
}
