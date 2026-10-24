import {io} from 'socket.io-client';
import {API_BASE_URL} from '../config/api';
let socket=null;
let listeners=0;
function publish(detail){window.dispatchEvent(new CustomEvent('nexora:realtime',{detail}));}
export function startRealtime(){
  if(!socket){
    socket=io(import.meta.env.VITE_SOCKET_URL || API_BASE_URL || window.location.origin,{
      path:'/socket.io',withCredentials:true,autoConnect:false,
      transports:['websocket','polling'],reconnection:true,reconnectionDelay:1000,reconnectionDelayMax:15000
    });
    socket.on('nexora:invalidate',event=>{if(typeof event?.area==='string')publish({area:event.area});});
    socket.on('connect',()=>publish({area:'*'})); // Always reconcile after disconnect/reconnect.
    socket.on('connect_error',error=>{
      // Invalid sessions should not hammer the database. Login will reconnect explicitly.
      if(error?.message==='unauthorized'){socket.disconnect();}
    });
  }
  listeners++;
  if(!socket.connected)socket.connect();
  return()=>{listeners=Math.max(0,listeners-1);if(!listeners){socket.disconnect();socket.removeAllListeners();socket=null;}};
}
export function reconnectRealtime(){if(socket){socket.disconnect();socket.connect();}}
