import { markChangesSaved } from "../common/savedFormState.js";
import { Button, FormField, IconButton, Select } from "../ui/index";

import { useState } from "react";
import UiIcon from "../common/UiIcon";
import { apiAssetUrl } from "../../services/apiClient";
import { reorderPromotions } from "../../services/bannerService";
import { movePromotion } from "../../services/promotionOrder";

/** Atomic, 1-based GLOBAL order. Each page filters this same consistent sequence. */
export default function PromotionOrderManager({ items, onSaved }) {
  const [pendingIds,setPendingIds]=useState(null);
  const [dragIndex,setDragIndex]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const sourceIds=items.map(item=>String(item.id));
  const ids=pendingIds ?? sourceIds;
  const lookup=new Map(items.map(item=>[String(item.id),item]));
  const dirty=ids.length!==sourceIds.length || ids.some((id,i)=>id!==sourceIds[i]);
  const change=(from,to)=>{setPendingIds(movePromotion(ids,from,to));setMessage("");};
  async function save(){
    setBusy(true);setMessage("");
    try{
      await reorderPromotions(ids,sourceIds);
      await onSaved();
      markChangesSaved();
      setPendingIds(null);
      setMessage("Saved. Homepage and category promotions will follow this order.");
    }catch(err){setMessage(err.message||"Unable to save promotion order. Refresh and try again.");}
    finally{setBusy(false);}
  }
  return <section className="nx39-order-panel" aria-label="Promotion positions">
    <div className="nx39-order-top"><div><span className="nx39-eyebrow">DISPLAY SEQUENCE</span><h2>Promotion positions</h2>
      <p>Position 1 appears first. Drag a banner, choose its number, or use the move controls. All locations share this order.</p></div>
      <div className="nx39-order-actions"><IconButton variant="danger" type="button"  title="Discard unsaved order changes" aria-label="Discard unsaved order changes" disabled={!dirty||busy} onClick={()=>{setPendingIds(null);setMessage("");}}><UiIcon name="x" size={18}/><span className="sr-only">Discard changes</span></IconButton>
        <Button variant="primary" type="button"  disabled={!dirty||busy} onClick={save}><UiIcon name="save" size={17}/>{busy?"Saving…":"Save positions"}</Button></div>
    </div>
    {message&&<p className="nx39-feedback" role="status">{message}</p>}
    <ol className="nx39-order-list">{ids.map((id,i)=>{
      const item=lookup.get(id);if(!item)return null;
      return <li key={id} draggable={!busy} onDragStart={e=>{setDragIndex(i);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",id);}}
        onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragIndex!==null)change(dragIndex,i);setDragIndex(null);}}
        onDragEnd={()=>setDragIndex(null)} className={`nx39-order-row${dragIndex===i?" is-dragging":""}`}>
        <span className="nx39-grip" title="Drag to change position" aria-hidden="true">⠿</span>
        <span className="nx39-rank" aria-label={`Position ${i+1}`}>{i+1}</span>
        <img src={apiAssetUrl(item.imageUrl)} alt="" loading="lazy"/>
        <div className="nx39-order-copy"><strong>{item.title}</strong><span>{item.position.replaceAll("_"," ")} · {item.isActive?"Enabled":"Hidden"}</span></div>
        <FormField className="nx39-select-position"><span>Position</span><Select aria-label={`Position of ${item.title}`} value={i} disabled={busy}
          onChange={e=>change(i,Number(e.target.value))}>{ids.map((_,j)=><option key={j} value={j}>{j+1}</option>)}</Select></FormField>
        <div className="nx39-order-movers"><IconButton variant="secondary" type="button" aria-label={`Move ${item.title} up`} disabled={busy||i===0} onClick={()=>change(i,i-1)}><UiIcon name="up" size={17}/></IconButton>
          <IconButton variant="secondary" type="button" aria-label={`Move ${item.title} down`} disabled={busy||i===ids.length-1} onClick={()=>change(i,i+1)}><UiIcon name="down" size={17}/></IconButton></div>
      </li>;
    })}</ol>
    {!items.length&&<p className="nx39-empty">Add your first promotion to manage its position.</p>}
  </section>;
}
