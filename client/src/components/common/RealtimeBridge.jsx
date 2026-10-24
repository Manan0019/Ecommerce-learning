import {useEffect} from 'react';
import {startRealtime,reconnectRealtime} from '../../services/realtime';
export default function RealtimeBridge(){
  useEffect(()=>{
    const stop=startRealtime();
    const auth=()=>reconnectRealtime();
    const resume=()=>{if(document.visibilityState==='visible'){reconnectRealtime();window.dispatchEvent(new CustomEvent('nexora:realtime',{detail:{area:'*'}}));}};
    window.addEventListener('nexora:auth-changed',auth);
    document.addEventListener('visibilitychange',resume);
    return()=>{stop();window.removeEventListener('nexora:auth-changed',auth);document.removeEventListener('visibilitychange',resume)};
  },[]);
  return null;
}
