'use client';
import { useEffect, useRef } from 'react';
export async function api(base,path,options={}) {
  const response=await fetch(`${base}/${path}`,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},signal:options.signal??AbortSignal.timeout(45000)});
  let data;try{data=await response.json();}catch{throw new Error('Serverul nu este disponibil momentan.');}
  if(!response.ok)throw Object.assign(new Error(data.error||'Operațiunea nu a putut fi finalizată.'),{status:response.status});return data;
}
export const post=(body)=>({method:'POST',body:JSON.stringify(body)});
export function Icon({name,size=22,...props}) {
  const paths={coffee:<><path d="M4 8h13v5a6.5 6.5 0 0 1-13 0V8Zm13 1h2a3 3 0 1 1 0 6h-2M2 22h18M7 2v3m5-3v3"/></>,arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,plus:<path d="M12 5v14M5 12h14"/>,scan:<><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 12h18"/><rect x="7" y="7" width="10" height="10" rx="1"/></>,close:<path d="m6 6 12 12M6 18 18 6"/>,gift:<><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/></>,check:<path d="m5 12 4 4 10-10"/>,lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></>,search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,bell:<><path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3Zm5 4h4"/></>,logout:<><path d="M9 3H4v18h5m6-15 6 6-6 6M8 12h13"/></>};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]||paths.coffee}</svg>;
}
export function CardPreview({coffees=0,threshold=9,assets='/ibric/assets',assetBase,name,small=false}) {
 const prefix=assetBase?`${assetBase.replace(/\/$/,'')}/art/v2`:assets;
 return <div className={`ibric-card ${small?'small':''}`}><img className="ibric-card-logo" src={`${prefix}/wide-logo.png`} alt="IBRIC Coffee Club"/><div className="ibric-card-values"><div><span>CAFELE ADUNATE</span><strong>{coffees} / {threshold}</strong></div><div><span>{coffees>=threshold?'RECOMPENSA TA':'PÂNĂ LA GRATUITĂ'}</span><strong>{coffees>=threshold?'O cafea gratuită!':`${Math.max(0,threshold-coffees)} cafele`}</strong></div></div><img className="ibric-card-art" src={`${prefix}/stamps-${threshold}-${Math.min(coffees,threshold)}.png`} alt={`${coffees} din ${threshold} ștampile adunate`}/><div className="ibric-card-foot"><span>{name||'PENTRU OAMENI CU GUST'}</span><span>IBRIC COFFEE CLUB</span></div></div>;
}
export function Scanner({onScan,onClose}) {
 const video=useRef(null);const error=useRef(null);
 useEffect(()=>{let stopped=false,controls;import('@zxing/browser').then(async({BrowserQRCodeReader})=>{const reader=new BrowserQRCodeReader();const result=await reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}}},video.current,(value)=>{if(value&&!stopped){stopped=true;controls?.stop();onScan(value.getText());}});controls=result;if(stopped)controls.stop();}).catch(()=>{if(error.current)error.current.textContent='Camera nu este disponibilă. Poți introduce sau scana codul în câmpul de căutare.';});return()=>{stopped=true;controls?.stop();const stream=video.current?.srcObject;stream?.getTracks?.().forEach(track=>track.stop());};},[]);
 return <div className="ibric-modal-backdrop" role="presentation"><section className="ibric-dialog" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><button className="ibric-icon-button ibric-close" onClick={onClose} aria-label="Închide camera"><Icon name="close"/></button><h2 id="scanner-title">Scanează cardul clientului</h2><p>Îndreaptă camera spre QR-ul din Portofel Google.</p><video ref={video} autoPlay muted playsInline className="ibric-scanner-video"/><p ref={error} role="status"/><button className="ibric-button secondary" onClick={onClose}>Introdu codul manual</button></section></div>;
}
export function statusText(value){return {accepted:'Notificare solicitată',quota_reached:'Limita de notificări Google a fost atinsă',already_updated:'Card deja actualizat',not_requested:'Fără notificare'}[value]||value;}
