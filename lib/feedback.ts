'use client';

export type FeedbackKind = 'success'|'error'|'warning'|'info';

export type ToastPayload = {
  id?: string;
  kind?: FeedbackKind;
  title?: string;
  message: string;
  duration?: number;
};

export type ConfirmPayload = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

const TOAST_EVENT='sga:toast';
const CONFIRM_EVENT='sga:confirm';

export function notify(message:string,kind:FeedbackKind='info',title?:string,duration=4200){
  if(typeof window==='undefined')return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT,{detail:{message,kind,title,duration}}));
}

export function confirmAction(payload:ConfirmPayload):Promise<boolean>{
  if(typeof window==='undefined')return Promise.resolve(false);
  return new Promise(resolve=>{
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT,{detail:{payload,resolve}}));
  });
}

export const feedbackEvents={toast:TOAST_EVENT,confirm:CONFIRM_EVENT};
