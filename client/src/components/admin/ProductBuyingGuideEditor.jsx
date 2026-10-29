import {useState} from 'react';
import {Button, FormField, Select, TextField, Textarea} from '../ui/index';
import UiIcon from '../common/UiIcon';

const guideKinds = [
  ['general','General product'], ['clothing','Clothing & footwear'],
  ['electronics','Electronics & compatibility'], ['beauty','Beauty & personal care']
];
export function suggestedBuyingGuideKind(category='') {
  const name=String(category).toLowerCase();
  if (/shirt|jeans|clothing|fashion|apparel|footwear|shoe|sneaker|dress|trouser|size|wear/.test(name)) return 'clothing';
  if (/electronic|mobile|phone|computer|laptop|camera|audio|speaker|earbud|tablet|charger|watch|gaming/.test(name)) return 'electronics';
  if (/beauty|cosmetic|skincare|serum|perfume|lotion|cream|hair|makeup|sunscreen|cleanser|fragrance/.test(name)) return 'beauty';
  return 'general';
}
const rowsOrEmpty=guide=>guide.sizeChart?.rows||[];
const columnsOrEmpty=guide=>guide.sizeChart?.columns||[];

export default function ProductBuyingGuideEditor({value={},onChange,categoryName=''}) {
  const [modelDraft,setModelDraft]=useState('');
  const kind=value.kind||suggestedBuyingGuideKind(categoryName);
  const update=patch=>onChange({...value,kind,...patch});
  const editSection=(name,patch)=>update({[name]:{...(value[name]||{}),...patch}});
  const chart=value.sizeChart||{};
  const columns=columnsOrEmpty(value);
  const rows=rowsOrEmpty(value);
  const models=value.compatibility?.models||[];
  const faqs=value.faqs||[];
  const editCell=(rowIndex,colIndex,newValue)=>editSection('sizeChart',{rows:rows.map((row,index)=> index===rowIndex? row.map((cell,j)=>j===colIndex?newValue:cell):row)});

  return <details className="nx90-guide-editor">
    <summary><span><strong>Product buying guide & FAQs</strong><small>Optional · Give shoppers accurate size, compatibility or usage information</small></span><UiIcon name="chevron-down" size={20}/></summary>
    <div className="nx90-guide-editor-body">
      <p className="nx90-guide-note">Only publish details confirmed for this product. Never guess measurements, supported models, ingredients or safety instructions.</p>
      <div className="nx90-guide-heading"><small>Empty sections stay hidden on the storefront.</small><Button variant="secondary" type="button" onClick={()=>{onChange({});setModelDraft('');}}>Clear buying guide</Button></div>
      <FormField label="Buying guide type">
        <Select value={kind} onChange={e=>update({kind:e.target.value})}>
          {guideKinds.map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </Select>
      </FormField>
      <FormField label="Buying advice" help="Describe how to choose this product. Leave blank to hide this section.">
        <Textarea rows={3} maxLength={800} value={value.introduction||''} onChange={e=>update({introduction:e.target.value})} placeholder="What should a customer consider before buying?"/>
      </FormField>
      {kind==='clothing'&&<section className="nx90-guide-edit-group">
        <h3>Size and fit chart</h3>
        <p>Add your own measured columns and sizes. All rows must have the same number of cells.</p>
        {columns.length>0 ? <>
          <div className="nx90-chart-edit-scroll"><div className="nx90-chart-edit-grid" style={{'--nx90-chart-cols':columns.length}}>
            {columns.map((column,colIndex)=><TextField key={`header-${colIndex}`} aria-label={`Chart column ${colIndex+1}`} maxLength={48} value={column} onChange={e=>editSection('sizeChart',{columns:columns.map((name,j)=>j===colIndex?e.target.value:name)})}/>)}
            {rows.map((row,rowIndex)=>row.map((cell,colIndex)=><TextField key={`${rowIndex}-${colIndex}`} aria-label={`Size chart row ${rowIndex+1}, column ${colIndex+1}`} maxLength={70} value={cell} onChange={e=>editCell(rowIndex,colIndex,e.target.value)}/>))}
          </div></div>
          <div className="nx90-guide-actions">
            <Button variant="secondary" type="button" disabled={rows.length>=16} onClick={()=>editSection('sizeChart',{rows:[...rows,columns.map(()=>'')]})}>Add size row</Button>
            <Button variant="secondary" type="button" disabled={columns.length>=5} onClick={()=>editSection('sizeChart',{columns:[...columns,'New measurement'],rows:rows.map(row=>[...row,''])})}>Add measurement column</Button>
            <Button variant="secondary" type="button" disabled={!rows.length} onClick={()=>editSection('sizeChart',{rows:rows.slice(0,-1)})}>Remove last row</Button>
            <Button variant="secondary" type="button" disabled={columns.length<=2} onClick={()=>editSection('sizeChart',{columns:columns.slice(0,-1),rows:rows.map(row=>row.slice(0,-1))})}>Remove last column</Button>
          </div>
        </> : <Button variant="secondary" type="button" onClick={()=>editSection('sizeChart',{columns:['Size','Measurement (cm)'],rows:[['','']]})}>Add size chart</Button>}
        {columns.length>0&&<FormField label="Size chart note"><TextField maxLength={400} value={chart.note||''} onChange={e=>editSection('sizeChart',{note:e.target.value})} placeholder="How to measure, fit notes, units..." /></FormField>}
      </section>}
      {kind==='electronics'&&<section className="nx90-guide-edit-group">
        <h3>Compatibility guide</h3>
        <p>Add verified compatible models or systems. Press Add model to include each entry in the guide.</p>
        <div className="nx90-model-input"><TextField aria-label="Compatible model name" maxLength={110} value={modelDraft} onChange={e=>setModelDraft(e.target.value)} placeholder="e.g. Exact compatible device or system"/>
          <Button variant="secondary" type="button" disabled={!modelDraft.trim()||models.length>=30} onClick={()=>{const next=modelDraft.trim();if(!models.includes(next))editSection('compatibility',{models:[...models,next]});setModelDraft('');}}>Add model</Button></div>
        {models.length>0&&<div className="nx90-model-list">{models.map((model,index)=><span key={`${model}-${index}`} className="nx90-model-tag">{model}<Button variant="ghost" type="button" aria-label={`Remove ${model}`} onClick={()=>editSection('compatibility',{models:models.filter((_,j)=>j!==index)})}><UiIcon name="x" size={14}/></Button></span>)}</div>}
        <FormField label="Compatibility details"><Textarea rows={3} maxLength={700} value={value.compatibility?.notes||''} onChange={e=>editSection('compatibility',{notes:e.target.value})} placeholder="Ports, system versions, accessories, limits, and exceptions..."/></FormField>
      </section>}
      {kind==='beauty'&&<section className="nx90-guide-edit-group">
        <h3>Ingredients, directions & cautions</h3>
        <FormField label="Ingredients"><Textarea rows={2} maxLength={900} value={value.beauty?.ingredients||''} onChange={e=>editSection('beauty',{ingredients:e.target.value})} placeholder="Exact ingredients from the product label"/></FormField>
        <FormField label="How to use"><Textarea rows={2} maxLength={900} value={value.beauty?.instructions||''} onChange={e=>editSection('beauty',{instructions:e.target.value})} placeholder="Manufacturer-approved directions"/></FormField>
        <FormField label="Safety / allergy cautions"><Textarea rows={2} maxLength={700} value={value.beauty?.cautions||''} onChange={e=>editSection('beauty',{cautions:e.target.value})} placeholder="Warnings printed on the packaging"/></FormField>
      </section>}
      <FormField label="Care & usage tips"><Textarea rows={2} maxLength={800} value={value.care||''} onChange={e=>update({care:e.target.value})} placeholder="Care, cleaning, setup or storage information specific to this item"/></FormField>
      <section className="nx90-guide-edit-group">
        <div className="nx90-guide-heading"><h3>Frequently asked questions</h3><Button variant="secondary" type="button" disabled={faqs.length>=8} onClick={()=>update({faqs:[...faqs,{question:'',answer:''}]})}>Add FAQ</Button></div>
        {faqs.map((faq,index)=><div className="nx90-faq-edit" key={index}>
          <FormField label={`Question ${index+1}`}><TextField maxLength={170} value={faq.question||''} onChange={e=>update({faqs:faqs.map((item,j)=>j===index?{...item,question:e.target.value}:item)})}/></FormField>
          <FormField label="Answer"><Textarea rows={2} maxLength={900} value={faq.answer||''} onChange={e=>update({faqs:faqs.map((item,j)=>j===index?{...item,answer:e.target.value}:item)})}/></FormField>
          <Button variant="secondary" type="button" onClick={()=>update({faqs:faqs.filter((_,j)=>j!==index)})}>Remove FAQ</Button>
        </div>)}
        {!faqs.length&&<p>No FAQs added. Customers will only see sections with actual content.</p>}
      </section>
    </div>
  </details>;
}
