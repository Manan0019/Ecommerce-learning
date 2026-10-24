import {useEffect,useState} from 'react';
/** Subscribe to resource invalidations; pages still load their own authorized REST data. */
export default function useRealtimeRevision(areas){
 const [revision,setRevision]=useState(0);
 const key=Array.isArray(areas)?areas.join('|'):String(areas);
 useEffect(()=>{
   const included=new Set(key.split('|'));
   let timer;
   const update=event=>{
     const area=event.detail?.area;
     if(area!=='*'&&!included.has(area))return;
     clearTimeout(timer);
     timer=setTimeout(()=>setRevision(v=>v+1),150);
   };
   window.addEventListener('nexora:realtime',update);
   return()=>{clearTimeout(timer);window.removeEventListener('nexora:realtime',update)};
 },[key]);
 return revision;
}
