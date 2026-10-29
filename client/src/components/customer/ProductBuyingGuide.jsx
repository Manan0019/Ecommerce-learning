import UiIcon from '../common/UiIcon';

/** Public content is plain React text only; no HTML injection, no assumed claims. */
export default function ProductBuyingGuide({guide}) {
  if (!guide || typeof guide !== 'object') return null;
  const {kind, introduction, sizeChart={}, compatibility={}, beauty={}, care, faqs=[]}=guide;
  const chartReady=kind==='clothing' && Array.isArray(sizeChart.columns) && sizeChart.columns.length>=2 && Array.isArray(sizeChart.rows) && sizeChart.rows.length>0;
  const showCompatibility=kind==='electronics' && (compatibility.models?.length || compatibility.notes);
  const showBeauty=kind==='beauty' && (beauty.ingredients || beauty.instructions || beauty.cautions);
  if (!introduction && !chartReady && !showCompatibility && !showBeauty && !care && !faqs.length) return null;
  return <section className="nx90-buying-guide" aria-labelledby="nx90-buying-guide-title">
    <div className="section-heading"><div><p className="eyebrow">Shop with confidence</p><h2 id="nx90-buying-guide-title">Buying guide & FAQs</h2></div></div>
    {introduction&&<div className="nx90-guide-block"><h3>What to know before buying</h3><p>{introduction}</p></div>}
    {chartReady&&<div className="nx90-guide-block"><h3>Size & fit</h3><div className="nx90-size-scroll"><table><thead><tr>{sizeChart.columns.map((column,index)=><th scope="col" key={index}>{column}</th>)}</tr></thead><tbody>{sizeChart.rows.map((row,index)=><tr key={index}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>{sizeChart.note&&<p className="nx90-guide-fineprint">{sizeChart.note}</p>}</div>}
    {showCompatibility&&<div className="nx90-guide-block"><h3>Compatibility</h3>{compatibility.models?.length>0&&<ul className="nx90-compatibility-list">{compatibility.models.map((model,index)=><li key={index}><UiIcon name="check" size={15}/>{model}</li>)}</ul>}{compatibility.notes&&<p>{compatibility.notes}</p>}</div>}
    {showBeauty&&<div className="nx90-guide-block"><h3>Ingredients & use</h3>{beauty.ingredients&&<p><strong>Ingredients:</strong> {beauty.ingredients}</p>}{beauty.instructions&&<p><strong>Directions:</strong> {beauty.instructions}</p>}{beauty.cautions&&<p className="nx90-guide-caution"><strong>Important:</strong> {beauty.cautions}</p>}</div>}
    {care&&<div className="nx90-guide-block"><h3>Care & usage tips</h3><p>{care}</p></div>}
    {faqs.length>0&&<div className="nx90-guide-block"><h3>Common questions</h3><div className="nx90-faq-list">{faqs.map((faq,index)=><details key={index}><summary>{faq.question}<UiIcon name="chevron-down" size={18}/></summary><p>{faq.answer}</p></details>)}</div></div>}
  </section>;
}
