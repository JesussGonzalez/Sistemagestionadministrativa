import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'sga_session';
const ACTIONS = new Set([
  'login','session','logout','password.change','structure','structure.department.save','structure.service.save',
  'users.list','users.save','functions.get','functions.save',
  'medical.access','medical.catalog','medical.list','medical.get','medical.doctor.save','medical.create','medical.upload','medical.register',
  'documents.catalog','documents.list','documents.save','documents.link','documents.cancel',
  'libro.catalog','libro.list','libro.save','messages.catalog','messages.list','messages.get','messages.read','messages.send',
  'reports.query','reports.export','alerts.list','calendar.get',
  'personal.list','personal.get','personal.save','ficha.get','global.search',
  'movements.types','movements.list','movements.get','movements.save','movements.cancel',
  'expedientes.permissions','expedientes.list','expedientes.get','expedientes.save','expedientes.state',
  'parte.get','parte.save','parte.send','parte.obligation'
]);

type UpstreamResponse = { ok:boolean; data?:unknown; message?:string };

function publicError(message:string,status=500){
  return NextResponse.json({ok:false,data:null,message},{status});
}

async function callAppsScript(action:string,payload:Record<string,unknown>):Promise<UpstreamResponse>{
  const url=process.env.APPS_SCRIPT_API_URL?.trim();
  const apiKey=process.env.APPS_SCRIPT_API_KEY?.trim();
  if(!url||!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(url)){
    throw new Error('Falta configurar APPS_SCRIPT_API_URL con la URL /exec del despliegue de Apps Script.');
  }
  if(!apiKey||apiKey.length<24) throw new Error('Falta configurar APPS_SCRIPT_API_KEY.');
  const response=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action,apiKey,...payload}),
    redirect:'follow',
    cache:'no-store'
  });
  if(!response.ok) throw new Error(`Apps Script respondió HTTP ${response.status}.`);
  const text=await response.text();
  try{return JSON.parse(text) as UpstreamResponse}
  catch{throw new Error('Apps Script no devolvió JSON válido. Revisá el despliegue web y ApiNext.js.');}
}

export async function POST(request:Request){
  try{
    const json=await request.json() as {action?:unknown;payload?:unknown};
    const action=typeof json.action==='string'?json.action:'';
    const payload=json.payload&&typeof json.payload==='object'&&!Array.isArray(json.payload)?json.payload as Record<string,unknown>:{};
    if(!ACTIONS.has(action)) return publicError('Acción no permitida.',400);

    const jar=await cookies();
    const requestHeaders=await headers();
    const token=jar.get(COOKIE_NAME)?.value||'';
    const upstreamPayload:Record<string,unknown>={payload};

    if(action==='login'){
      const usuario=typeof payload.usuario==='string'?payload.usuario.trim():'';
      const password=typeof payload.password==='string'?payload.password:'';
      if(!usuario||!password) return publicError('Ingresá usuario y contraseña.',400);
      const ua=(requestHeaders.get('user-agent')||'Next.js').slice(0,500);
      const upstream=await callAppsScript(action,{payload:{usuario,password,userAgent:ua}});
      if(!upstream.ok){return publicError(upstream.message||'Usuario o contraseña incorrectos.',401);}
      const data=upstream.data as {token?:unknown;perfil?:unknown}|undefined;
      if(!data||typeof data.token!=='string'||!data.token) return publicError('Apps Script no devolvió una sesión válida.',502);
      const response=NextResponse.json({ok:true,data:{perfil:data.perfil},message:upstream.message||'Sesión iniciada.'});
      response.cookies.set(COOKIE_NAME,data.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:8*60*60});
      return response;
    }

    if(!token) return publicError('La sesión no es válida. Ingresá nuevamente.',401);
    upstreamPayload.token=token;
    const upstream=await callAppsScript(action,upstreamPayload);
    const invalidSession=!upstream.ok&&/sesión|sesion|ingresá nuevamente|ingresa nuevamente/i.test(upstream.message||'');
    const status=upstream.ok?200:(invalidSession?401:400);
    const response=NextResponse.json({ok:upstream.ok,data:upstream.data??null,message:upstream.message||''},{status});
    if(action==='logout'||action==='password.change'||invalidSession) response.cookies.delete(COOKIE_NAME);
    return response;
  }catch(error){
    console.error('[SGA proxy]',error instanceof Error?error.message:error);
    return publicError(error instanceof Error?error.message:'No se pudo conectar con el backend SGA.',500);
  }
}
