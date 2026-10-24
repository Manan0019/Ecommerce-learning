/** Minimal Chrome DevTools client; no browser dependency or installed extension required. */
export async function browserSession() {
  const targets=await fetch('http://127.0.0.1:9223/json/list').then(r=>r.json());
  const target=targets.find(t=>t.type==='page');
  if(!target)throw new Error('Start a headless Chrome with --remote-debugging-port=9223.');
  const socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let nextId=0;
  const pending=new Map(),listeners=new Map();
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const callbacks=pending.get(message.id);pending.delete(message.id);if(message.error)callbacks?.reject(new Error(JSON.stringify(message.error)));else callbacks?.resolve(message.result);}else listeners.get(message.method)?.forEach(fn=>fn(message.params));};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const on=(event,fn)=>listeners.set(event,[...(listeners.get(event)||[]),fn]);
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const until=async(expression,timeout=10000)=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,100));}throw new Error(`Timed out: ${expression}`);};
  await send('Runtime.enable');await send('Page.enable');
  return {send,on,evaluate,until,close:()=>socket.close()};
}
