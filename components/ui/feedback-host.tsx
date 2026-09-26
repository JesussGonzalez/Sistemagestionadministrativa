'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { feedbackEvents, type ConfirmPayload, type FeedbackKind, type PromptPayload, type ToastPayload } from '@/lib/feedback';

type ToastItem=Required<Pick<ToastPayload,'message'|'kind'>> & {id:string;title?:string;duration:number};
type ConfirmState={payload:ConfirmPayload;resolve:(value:boolean)=>void}|null;
type PromptState={payload:PromptPayload;resolve:(value:string|null)=>void}|null;

const labels:Record<FeedbackKind,string>={success:'Listo',error:'Ocurrió un problema',warning:'Atención',info:'Información'};
const icons={success:CheckCircle2,error:CircleAlert,warning:AlertTriangle,info:Info};

export default function FeedbackHost(){
  const [toasts,setToasts]=useState<ToastItem[]>([]);
  const [confirm,setConfirm]=useState<ConfirmState>(null);
  const [prompt,setPrompt]=useState<PromptState>(null);
  const [promptValue,setPromptValue]=useState('');

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
    const onPrompt=(event:Event)=>{
      const detail=(event as CustomEvent<{payload:PromptPayload;resolve:(value:string|null)=>void}>).detail;
      if(detail?.payload&&typeof detail.resolve==='function'){setPrompt(detail);setPromptValue(detail.payload.initialValue||'')}
    };
    window.addEventListener(feedbackEvents.toast,onToast);
    window.addEventListener(feedbackEvents.confirm,onConfirm);
    window.addEventListener(feedbackEvents.prompt,onPrompt);
    return()=>{window.removeEventListener(feedbackEvents.toast,onToast);window.removeEventListener(feedbackEvents.confirm,onConfirm);window.removeEventListener(feedbackEvents.prompt,onPrompt)};
  },[]);

  function finish(value:boolean){const current=confirm;setConfirm(null);current?.resolve(value)}
  function finishPrompt(value:string|null){const current=prompt;setPrompt(null);current?.resolve(value)}

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
    {prompt&&<div className="smart-dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)finishPrompt(null)}}>
      <section className="smart-dialog prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="sga-prompt-title">
        <div className="smart-dialog-icon warning"><Info size={24}/></div>
        <div><h2 id="sga-prompt-title">{prompt.payload.title}</h2>{prompt.payload.message&&<p>{prompt.payload.message}</p>}</div>
        <label className="field smart-prompt-field"><span>{prompt.payload.label||'Detalle'}</span>{prompt.payload.multiline?<textarea autoFocus value={promptValue} maxLength={prompt.payload.maxLength||500} placeholder={prompt.payload.placeholder||''} onChange={e=>setPromptValue(e.target.value)}/>:<input autoFocus value={promptValue} maxLength={prompt.payload.maxLength||200} placeholder={prompt.payload.placeholder||''} onChange={e=>setPromptValue(e.target.value)}/>}</label>
        <div className="smart-dialog-actions"><button className="secondary" onClick={()=>finishPrompt(null)}>{prompt.payload.cancelLabel||'Cancelar'}</button><button className="primary" disabled={promptValue.trim().length<(prompt.payload.minLength||0)} onClick={()=>finishPrompt(promptValue.trim())}>{prompt.payload.confirmLabel||'Aceptar'}</button></div>
      </section>
    </div>}
  </>;
}
