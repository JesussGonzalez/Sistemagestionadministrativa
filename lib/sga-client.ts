import type { SgaResponse } from './types';

export class SgaClientError extends Error {
  status:number;
  constructor(message:string,status:number){ super(message); this.name='SgaClientError'; this.status=status; }
}

export async function sgaCall<T>(action:string, payload:Record<string,unknown> = {}):Promise<SgaResponse<T>> {
  const response = await fetch('/api/sga', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,payload}),
    cache:'no-store'
  });
  let body:SgaResponse<T>;
  try { body = await response.json() as SgaResponse<T>; }
  catch { throw new SgaClientError('El servidor devolvió una respuesta inválida.', response.status); }
  if (!response.ok || !body.ok) throw new SgaClientError(body.message || 'No se pudo completar la operación.', response.status);
  return body;
}
