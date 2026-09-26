'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { feedbackEvents, type ConfirmPayload, type FeedbackKind, type ToastPayload } from '@/lib/feedback';

type ToastItem=Required<Pick<ToastPayload,'message'|'kind'>> & {id:string;title?:string;duration:number};
type ConfirmState={payload:ConfirmPayload;resolve:(value:boolean)=>void}|null;

const labels:Record<FeedbackKind,string>={success:'Listo',error:'Ocurrió un problema',warning:'Atención',info:'Información'};
const icons={success:CheckCircle2,error:CircleAlert,warning:AlertTriangle,info:Info};

export default function FeedbackHost(){
  const [toasts,setToasts]=useState<ToastItem[]>([]);
  const [confirm,setConfirm]=useState<ConfirmState>(null);

  useEffect(()=>{
    const onToast=(event:Event)=>{
      const detail=(event as CustomEvent<ToastPayload>).detail;
      if(!detail?.message)return;
      const item:ToastItem={id:detail.id||crypto.randomUUID(),message:detail.message,kind:detail.kind||'info',title:detail.title,duration:detail.duration??4200};
      setToasts(old=>[...old.slice(-3),item]);
      if(item.duration>0)window.setTimeout(()=>setToasts(old=>old.filter(x=>x.id!==item.id)),item.duration);
    };
    const onConfirm=(event:Event)=>{
      const detail=(event as CustomEvent<{payload:ConfirmPayload;resolve:(value:boolean)=>void}>).detail;
      if(detail?.payload&&typeof detail.resolve==='function')setConfirm(detail);
    };
    window.addEventListener(feedbackEvents.toast,onToast);
    window.addEventListener(feedbackEvents.confirm,onConfirm);
    return()=>{window.removeEventListener(feedbackEvents.toast,onToast);window.removeEventListener(feedbackEvents.confirm,onConfirm)};
  },[]);

  function finish(value:boolean){const current=confirm;setConfirm(null);current?.resolve(value)}

  return <>
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map(item=>{const Icon=icons[item.kind];return <div key={item.id} className={`smart-toast ${item.kind}`} role={item.kind==='error'?'alert':'status'}>
        <span className="smart-toast-icon"><Icon size={20}/></span>
        <div className="smart-toast-body"><strong>{item.title||labels[item.kind]}</strong><p>{item.message}</p></div>
        <button aria-label="Cerrar aviso" onClick={()=>setToasts(old=>old.filter(x=>x.id!==item.id))}><X size={16}/></button>
      </div>})}
    </div>
    {confirm&&<div className="smart-dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)finish(false)}}>
      <section className="smart-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sga-confirm-title">
        <div className={`smart-dialog-icon ${confirm.payload.danger?'danger':'warning'}`}><AlertTriangle size={24}/></div>
        <div><h2 id="sga-confirm-title">{confirm.payload.title}</h2><p>{confirm.payload.message}</p></div>
        <div className="smart-dialog-actions">
          <button className="secondary" onClick={()=>finish(false)}>{confirm.payload.cancelLabel||'Cancelar'}</button>
          <button className={confirm.payload.danger?'danger-button':'primary'} onClick={()=>finish(true)}>{confirm.payload.confirmLabel||'Confirmar'}</button>
        </div>
      </section>
    </div>}
  </>;
}
