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
    if (!contenido || contenido.length > 6 * 1024 * 1024) return sgaApiJson_({ok:false,data:null,message:'Solicitud inválida.'});
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
      case 'structure.department.save': respuesta = guardarDepartamento(token, p.data || {}); break;
      case 'structure.service.save': respuesta = guardarServicio(token, p.data || {}); break;
      case 'users.list': respuesta = listarUsuariosSGA(token); break;
      case 'users.save': respuesta = guardarUsuarioSGA(token, p.data || {}); break;
      case 'functions.get': respuesta = obtenerFuncionesDepartamentalesSGA(token, String(p.departamentoId || '')); break;
      case 'functions.save': respuesta = guardarFuncionDepartamentalSGA(token, p.data || {}); break;
      case 'medical.access': respuesta = obtenerAccesoLicenciasMedicasSGA(token); break;
      case 'medical.catalog': respuesta = obtenerCatalogoLicenciasMedicasSGA(token); break;
      case 'medical.list': respuesta = listarLicenciasMedicasSGA(token, p.filtro || {}); break;
      case 'medical.get': respuesta = obtenerLicenciaMedicaSGA(token, String(p.id || '')); break;
      case 'medical.doctor.save': respuesta = guardarMedicoSGA(token, p.data || {}); break;
      case 'medical.create': respuesta = crearLicenciaMedicaSGA(token, p.data || {}); break;
      case 'medical.upload': respuesta = subirComprobanteLicenciaSGA(token, String(p.id || ''), p.payload || {}); break;
      case 'medical.register': respuesta = registrarLicenciaMedicaSGA(token, String(p.id || '')); break;
      case 'documents.catalog': respuesta = obtenerCatalogoDocumentosSGA(token); break;
      case 'documents.list': respuesta = listarDocumentosSGA(token, p.filtros || {}); break;
      case 'documents.save': respuesta = guardarDocumentoSGA(token, p.data || {}); break;
      case 'documents.link': respuesta = obtenerEnlaceDocumentoSGA(token, String(p.id || '')); break;
      case 'documents.cancel': respuesta = anularDocumentoSGA(token, String(p.id || ''), String(p.motivo || '')); break;
      case 'libro.catalog': respuesta = obtenerCatalogoLibroSGA(token); break;
      case 'libro.list': respuesta = consultarLibroSGA(token, p.datos || {}); break;
      case 'libro.save': respuesta = registrarNovedadLibroSGA(token, p.datos || {}); break;
      case 'messages.catalog': respuesta = catalogoNotificacionesSGA(token); break;
      case 'messages.list': respuesta = listarNotificacionesSGA(token); break;
      case 'messages.get': respuesta = detalleNotificacionSGA(token, String(p.id || '')); break;
      case 'messages.read': respuesta = marcarNotificacionLeidaSGA(token, String(p.mensajeId || ''), String(p.destinatarioId || '')); break;
      case 'messages.send': respuesta = enviarNotificacionSGA(token, p.datos || {}); break;
      case 'reports.query': respuesta = consultarReporteSGA(token, p.filtros || {}); break;
      case 'reports.export': respuesta = exportarReporteExcelSGA(token, p.filtros || {}); break;
      case 'alerts.list': respuesta = obtenerAlertasSGA(token, p.opciones || {}); break;
      case 'calendar.get': respuesta = obtenerCalendarioSGA(token, p.opciones || {}); break;
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
      case 'schedules.list': respuesta = obtenerHorariosSGA(token); break;
      case 'schedules.save': respuesta = guardarHorarioSGA(token, p.data || {}); break;
      case 'movementRequests.catalog': respuesta = obtenerCatalogoSolicitudesSGA(token); break;
      case 'movementRequests.person': respuesta = obtenerPersonalSolicitudSGA(token, p.datos || {}); break;
      case 'movementRequests.list': respuesta = listarSolicitudesMovimientosSGA(token, p.filtros || {}); break;
      case 'movementRequests.create': respuesta = crearSolicitudMovimientoSGA(token, p.datos || {}); break;
      case 'movementRequests.supervise': respuesta = resolverSupervisionSolicitudSGA(token, p.datos || {}); break;
      case 'movementRequests.chief': respuesta = resolverJefaturaSolicitudSGA(token, p.datos || {}); break;
      case 'departmentRequests.catalog': respuesta = obtenerCatalogoSolicitudesDepartamentalesV2(token); break;
      case 'departmentRequests.person': respuesta = buscarPersonalSolicitudDepartamentalV2(token, p.datos || {}); break;
      case 'departmentRequests.list': respuesta = listarSolicitudesDepartamentalesV2(token, p.filtros || {}); break;
      case 'departmentRequests.create': respuesta = crearSolicitudDepartamentalV2(token, p.datos || {}); break;
      case 'departmentRequests.preapprove': respuesta = preautorizarSolicitudDepartamentalV2(token, p.datos || {}); break;
      case 'departmentRequests.resolve': respuesta = resolverSolicitudDepartamentalV2(token, p.datos || {}); break;
      case 'departmentRequests.cancel': respuesta = anularSolicitudAutorizadaSupervisorV2(token, p.datos || {}); break;
      case 'departmentRequests.note': respuesta = registrarNotaSolicitudDepartamentalV2(token, p.datos || {}); break;
      case 'departmentRequests.article4': respuesta = registrarArticulo4AdministracionSGA(token, p.datos || {}); break;
      case 'rectifications.list': respuesta = consultarRectificacionesSGA(token, p.datos || {}); break;
      case 'rectifications.request': respuesta = solicitarRectificacionSGA(token, p.datos || {}); break;
      case 'rectifications.respond': respuesta = responderRectificacionSGA(token, p.datos || {}); break;
      case 'rectifications.resolve': respuesta = resolverRectificacionSGA(token, p.datos || {}); break;
      case 'parte.consolidated': respuesta = obtenerConsolidadoParteSGA(token, p.datos || {}); break;
      case 'parte.consolidated.send': respuesta = enviarConsolidadoRRHHSGA(token, p.datos || {}); break;
      case 'parte.reopen': respuesta = reabrirParteServicioSGA(token, p.datos || {}); break;
      case 'parte.rrhh.inbox': respuesta = obtenerBandejaRRHHSGA(token, p.datos || {}); break;
      case 'parte.rrhh.receive': respuesta = confirmarRecepcionParteRRHHSGA(token, p.datos || {}); break;
      case 'parte.board': respuesta = obtenerTableroPartesSGA(token, p.datos || {}); break;
      case 'parte.followup': respuesta = consultarSeguimientoPartesSGA(token, p.datos || {}); break;
      case 'parte.followup.save': respuesta = registrarSeguimientoParteSGA(token, p.datos || {}); break;
      case 'parte.general': respuesta = consultarParteGeneralSGA(token, p.datos || {}); break;
      case 'parte.general.excel': respuesta = exportarParteGeneralExcelSGA(token, p.datos || {}); break;
      case 'parte.general.pdf': respuesta = exportarParteGeneralPdfSGA(token, p.datos || {}); break;
      case 'parte.archive': respuesta = consultarArchivoParteSGA(token, p.datos || {}); break;
      case 'parte.archive.close': respuesta = cerrarParteGeneralSGA(token, p.datos || {}); break;
      case 'parte.archive.excel': respuesta = exportarArchivoParteExcelSGA(token, p.datos || {}); break;
      case 'parte.presence': respuesta = consultarPresenciaActualSGA(token); break;
      case 'parte.presence.excel': respuesta = exportarPresenciaActualExcelSGA(token); break;
      case 'parte.person.add': respuesta = agregarPersonalParteSGA(token, p.filtros || {}, p.datos || {}); break;
      case 'parte.person.remove': respuesta = quitarPersonalParteSGA(token, p.filtros || {}, p.datos || {}); break;
      case 'reports.custom.templates': respuesta = obtenerPlantillasSGA(token); break;
      case 'reports.custom.template.save': respuesta = guardarPlantillaSGA(token, p.data || {}); break;
      case 'reports.custom.query': respuesta = consultarReportePersonalizadoSGA(token, String(p.reporteId || ''), p.filtros || {}); break;
      case 'reports.custom.export': respuesta = exportarReportePersonalizadoExcelSGA(token, String(p.reporteId || ''), p.filtros || {}); break;
      case 'messages.replies': respuesta = listarRespuestasNotificacionSGA(token, String(p.mensajeId || ''), String(p.destinatarioId || '')); break;
      case 'messages.reply': respuesta = enviarRespuestaNotificacionSGA(token, p.datos || {}); break;
      case 'messages.receipts': respuesta = consultarAcusesMensajeSGA(token, String(p.mensajeId || '')); break;
      case 'messages.receipt.confirm': respuesta = confirmarRecepcionMensajeSGA(token, String(p.mensajeId || ''), String(p.destinatarioId || '')); break;
      case 'messages.pending': respuesta = consultarPendientesMensajesSGA(token); break;
      case 'messages.thread.read': respuesta = marcarHiloLeidoSGA(token, String(p.mensajeId || ''), String(p.destinatarioId || ''), String(p.ultimaRespuestaId || '')); break;
      case 'medical.worked': respuesta = marcarLicenciaMedicaTrabajadaSGA(token, String(p.id || '')); break;
      case 'medical.notes': respuesta = generarNotasLicenciaSGA(token, String(p.id || '')); break;
      case 'medical.file': respuesta = obtenerArchivoLicenciaSGA(token, String(p.id || ''), String(p.tipo || '')); break;
      case 'medical.pdf': respuesta = obtenerPdfUnicoLicenciaSGA(token, String(p.id || '')); break;
      case 'password.users': respuesta = listarUsuariosResetSGA(token); break;
      case 'password.reset': respuesta = restablecerContrasenaSGA(token, String(p.usuarioId || ''), String(p.provisional || ''), String(p.confirmacion || '')); break;
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