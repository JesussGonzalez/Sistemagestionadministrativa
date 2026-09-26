/**
 * Puente HTTP para la interfaz Next.js.
 * Mantiene intacto doGet() y google.script.run del SGA actual.
 *
 * Antes de desplegar:
 * 1) Script Properties > SGA_NEXT_API_KEY = un secreto aleatorio largo.
 * 2) Implementar como Web App ejecutando como el propietario.
 * 3) Next/Vercel debe usar el mismo secreto en APPS_SCRIPT_API_KEY.
 */
function doPost(e) {
  try {
    const contenido = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
    if (!contenido || contenido.length > 1024 * 1024) return sgaApiJson_({ok:false,data:null,message:'Solicitud inválida.'});
    let req;
    try { req = JSON.parse(contenido); } catch (_) { return sgaApiJson_({ok:false,data:null,message:'JSON inválido.'}); }
    if (!req || typeof req !== 'object' || Array.isArray(req)) return sgaApiJson_({ok:false,data:null,message:'Solicitud inválida.'});

    const secreto = String(PropertiesService.getScriptProperties().getProperty('SGA_NEXT_API_KEY') || '');
    const recibido = String(req.apiKey || '');
    if (secreto.length < 24 || recibido.length < 24 || !sgaIgualesTiempo_(secreto, recibido)) {
      return sgaApiJson_({ok:false,data:null,message:'Acceso API no autorizado.'});
    }

    const accion = String(req.action || '');
    const token = String(req.token || '');
    const p = req.payload && typeof req.payload === 'object' && !Array.isArray(req.payload) ? req.payload : {};
    let respuesta;

    // Lista blanca explícita: nunca resolver nombres de funciones recibidos desde Internet.
    switch (accion) {
      case 'login': respuesta = iniciarSesion(String(p.usuario || ''), String(p.password || ''), String(p.userAgent || 'Next.js')); break;
      case 'session': respuesta = obtenerMiSesion(token); break;
      case 'logout': respuesta = cerrarSesion(token); break;
      case 'password.change': respuesta = cambiarMiContrasenaSGA(token, String(p.actual || ''), String(p.nueva || ''), String(p.confirmacion || '')); break;
      case 'structure': respuesta = obtenerEstructura(token); break;
      case 'personal.list': respuesta = listarPersonalSGA(token, p.filtros || {}); break;
      case 'personal.get': respuesta = obtenerPersonalSGA(token, p.id); break;
      case 'personal.save': respuesta = guardarPersonalSGA(token, p.data || {}); break;
      case 'ficha.get': respuesta = obtenerFichaSGA(token, p.id); break;
      case 'global.search': respuesta = buscarPersonalGlobalSGA(token, String(p.termino || '')); break;
      case 'movements.types': respuesta = obtenerTiposMovimientoSGA(token); break;
      case 'movements.list': respuesta = listarMovimientosSGA(token, p.filtros || {}); break;
      case 'movements.get': respuesta = obtenerMovimientoSGA(token, p.id); break;
      case 'movements.save': respuesta = guardarMovimientoSGA(token, p.data || {}); break;
      case 'movements.cancel': respuesta = anularMovimientoSGA(token, p.id, p.motivo); break;
      case 'expedientes.permissions': respuesta = obtenerPermisosExpedientesSGA(token); break;
      case 'expedientes.list': respuesta = listarExpedientesSGA(token, p.filtros || {}); break;
      case 'expedientes.get': respuesta = obtenerExpedienteSGA(token, p.id); break;
      case 'expedientes.save': respuesta = guardarExpedienteSGA(token, p.data || {}); break;
      case 'expedientes.state': respuesta = cambiarEstadoExpedienteSGA(token, p.id, p.estado, p.ubicacion); break;
      case 'parte.get': respuesta = obtenerParteDiarioSGA(token, p.filtros || {}); break;
      case 'parte.save': respuesta = guardarParteDiarioSGA(token, p.filtros || {}, p.cambios || []); break;
      case 'parte.send': respuesta = enviarParteServicioSGA(token, p.filtros || {}, p.cambios || [], p.versiones || []); break;
      case 'parte.obligation': respuesta = obtenerObligacionParteServicioSGA(token); break;
      default: respuesta = {ok:false,data:null,message:'Acción API no permitida.'};
    }
    return sgaApiJson_(respuesta);
  } catch (error) {
    return sgaApiJson_(sgaFallo_(error));
  }
}

function sgaApiJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj || {ok:false,data:null,message:'Respuesta vacía.'}))
    .setMimeType(ContentService.MimeType.JSON);
}
