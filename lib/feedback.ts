'use client';

export type FeedbackKind = 'success'|'error'|'warning'|'info';

export type ToastPayload = {
  id?: string;
  kind?: FeedbackKind;
  title?: string;
  message: string;
  duration?: number;
};

export type PromptPayload = {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  minLength?: number;
  maxLength?: number;
  multiline?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
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
const PROMPT_EVENT='sga:prompt';

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

export function promptAction(payload:PromptPayload):Promise<string|null>{
  if(typeof window==='undefined')return Promise.resolve(null);
  return new Promise(resolve=>window.dispatchEvent(new CustomEvent(PROMPT_EVENT,{detail:{payload,resolve}})));
}

export const feedbackEvents={toast:TOAST_EVENT,confirm:CONFIRM_EVENT,prompt:PROMPT_EVENT};
