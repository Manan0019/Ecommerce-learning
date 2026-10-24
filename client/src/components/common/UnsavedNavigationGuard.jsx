import { Button } from "../ui/index";
import {useEffect,useRef,useState} from 'react';
import {useBlocker,useLocation} from 'react-router-dom';

/** Site-wide form change tracker: one guard shared by all routed pages.
 * Only editable form controls count; search/filter controls never block navigation.
 * Successful saves can dispatch 'nexora:changes-saved' to clear the tracker.
 * The browser handles external/refresh navigation with its native unsaved prompt.
 */
export default function UnsavedNavigationGuard(){
 const [dirty,setDirty]=useState(false);
 const originals=useRef(new Map());
 const location=useLocation();
 const blocker=useBlocker(({currentLocation,nextLocation})=>dirty&&
   (currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search));
 useEffect(()=>{originals.current.clear();},[location.pathname]);
 useEffect(()=>{
  function candidate(el){
   if(!(el instanceof HTMLElement))return false;
   if(!el.matches('input,textarea,select,[contenteditable="true"]'))return false;
   if(el.matches('input[type="search"],input[type="hidden"],input[type="submit"],input[type="button"],input[type="reset"],input[type="file"]'))return false;
   if(el.closest('[data-unsaved-ignore="true"]'))return false;
   if(el.closest('form,[data-unsaved-track="true"]'))return true;
   // Older admin editors contain controlled fields without a <form>. Protect
   // their text/number/textarea controls without treating filters as edits.
   const admin=el.closest('.admin-shell,.nx57-delivery-shell');
   if(!admin||!el.matches('input,textarea'))return false;
   if(!el.matches('textarea,input[type="text"],input[type="number"],input[type="email"],input[type="tel"],input[type="url"]'))return false;
   if(el.closest('[class*="filter"],[class*="search"],[class*="toolbar"],[class*="pagination"]'))return false;
   if(/search|filter|find|sort|lookup|coupon test/i.test(`${el.getAttribute('placeholder')||''} ${el.getAttribute('aria-label')||''}`))return false;
   return true;
  }
  function value(el){return el instanceof HTMLInputElement&&(el.type==='checkbox'||el.type==='radio')?String(el.checked):el.value??el.textContent??'';}
  function focus(event){const el=event.target;if(candidate(el)&&!originals.current.has(el))originals.current.set(el,value(el));}
  function changed(event){const el=event.target;if(!candidate(el))return;
   if(!originals.current.has(el))originals.current.set(el,value(el));
   // Remove detached inputs after closing an editor; there is nothing left to preserve.
   for(const old of originals.current.keys())if(!old.isConnected)originals.current.delete(old);
   setDirty([...originals.current].some(([field,initial])=>field.isConnected&&value(field)!==initial));
  }
  function saved(){originals.current.clear();setDirty(false);}
  function beforeUnload(e){if(!dirty)return;e.preventDefault();e.returnValue='';}
  document.addEventListener('focusin',focus,true);
  document.addEventListener('input',changed,true);
  document.addEventListener('change',changed,true);
  window.addEventListener('nexora:changes-saved',saved);
  window.addEventListener('nexora:changes-discarded',saved);
  window.addEventListener('beforeunload',beforeUnload);
  const observer=new MutationObserver(()=>{
   if(!originals.current.size)return;
   let removed=false;for(const el of originals.current.keys()){if(!el.isConnected){originals.current.delete(el);removed=true;}}
   if(removed)setDirty([...originals.current].some(([el,initial])=>value(el)!==initial));
  });
  if(dirty)observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();document.removeEventListener('focusin',focus,true);document.removeEventListener('input',changed,true);document.removeEventListener('change',changed,true);window.removeEventListener('nexora:changes-saved',saved);window.removeEventListener('nexora:changes-discarded',saved);window.removeEventListener('beforeunload',beforeUnload);};
 },[dirty]);
 return blocker.state==='blocked'&&<div className="nx81-leave-overlay" role="presentation">
  <div className="nx81-leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="nx81-leave-title" aria-describedby="nx81-leave-description">
   <span className="nx52-eyebrow">UNSAVED CHANGES</span><h2 id="nx81-leave-title">Leave without saving?</h2>
   <p id="nx81-leave-description">You have edited information on this page. Leaving now will discard changes that have not been saved. To save, return to the form and use its Save button.</p>
   <div className="nx81-leave-buttons"><Button variant="secondary" type="button" autoFocus onClick={()=>blocker.reset()}>Keep editing</Button><Button variant="danger" type="button" onClick={()=>{originals.current.clear();setDirty(false);blocker.proceed();}}>Discard and leave</Button></div>
  </div></div>;
}
