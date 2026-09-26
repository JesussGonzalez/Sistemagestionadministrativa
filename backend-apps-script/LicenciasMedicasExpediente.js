/**
 * Cierre administrativo de una licencia médica ya registrada.
 * Crea el expediente del personal, vincula el número al movimiento
 * y saca la licencia de la bandeja médica sin borrar información.
 */
function registrarExpedienteLicenciaMedicaSGA(token, id, numeroExpediente) {
  try {
    sgaLmContexto_(token);
    const numero = sgaTextoFormulario_(numeroExpediente || '', 'Número de expediente', 100, true);

    return sgaExigirLock_(() => {
      const ctx = sgaLmContexto_(token);
      if (!sgaTienePermiso_(ctx.usuario, 'CREAR_EXPEDIENTE')) {
        throw sgaError_('No tenés permiso para registrar expedientes.');
      }

      const x = sgaLmFila_(id, ctx);
      const r = x.r;
      const p = x.p;
      const estado = String(r.Estado || '');

      if (!r.MovimientoID || !['REGISTRADA', 'TRABAJADA'].includes(estado)) {
        throw sgaError_('Primero registrá la licencia en Movimientos.');
      }

      const movSh = sgaHoja_('MOVIMIENTOS');
      const mov = sgaBuscarFila_(movSh, 1, String(r.MovimientoID));
      if (!mov ||
          String(mov.PersonalID) !== String(p.PersonalID) ||
          String(mov.Estado) !== SGA_MOV_ESTADO ||
          sgaNombreClave_(mov.TipoMovimiento) !== 'licencia medica') {
        throw sgaError_('El movimiento definitivo de la licencia no está disponible.');
      }

      const movExp = String(mov.NumeroExpediente || '').trim();
      if (movExp && movExp.toLowerCase() !== numero.toLowerCase()) {
        throw sgaError_('El movimiento ya tiene asociado otro número de expediente.');
      }

      const existentes = sgaCatalogo_('EXPEDIENTES').filter(exp =>
        String(exp.PersonalID || '') === String(p.PersonalID) &&
        String(exp.NumeroExpediente || '').trim().toLowerCase() === numero.toLowerCase()
      );

      if (existentes.length > 1) {
        throw sgaError_('Hay más de un expediente con ese número para el personal. Requiere revisión.');
      }

      let expediente = existentes[0] || null;
      if (expediente && sgaNombreClave_(expediente.TipoExpediente) !== 'licencia medica') {
        throw sgaError_('Ese número de expediente ya existe para otro tipo de trámite.');
      }

      let expedienteId = expediente ? String(expediente.ExpedienteID) : '';
      if (!expediente) {
        expedienteId = sgaId_('EXP');
        const expSh = sgaHoja_('EXPEDIENTES');
        const registro = {
          ExpedienteID: expedienteId,
          PersonalID: String(p.PersonalID),
          LP: String(p.LP),
          NumeroExpediente: sgaTextoSeguroSheet_(numero),
          TipoExpediente: 'LICENCIA MEDICA',
          Asunto: 'Licencia médica',
          Descripcion: sgaTextoSeguroSheet_(
            'Generado desde Gestión de licencias médicas. Referencia administrativa: ' + String(r.LicenciaID)
          ),
          FechaInicio: sgaMovFecha_(r.FechaDesde),
          UbicacionActual: '',
          ArchivoURL: '',
          Observaciones: '',
          Estado: 'INICIADO',
          FechaCierre: '',
          DepartamentoID: String(p.DepartamentoID),
          ServicioID: String(p.ServicioID),
          FechaRegistro: sgaFechaIso_(),
          RegistradoPor: ctx.usuario.UsuarioID
        };
        const headers = expSh.getRange(1, 1, 1, expSh.getLastColumn()).getDisplayValues()[0];
        expSh.getRange(expSh.getLastRow() + 1, 1, 1, headers.length).setValues([
          headers.map(h => Object.prototype.hasOwnProperty.call(registro, h) ? registro[h] : '')
        ]);
        sgaExpAuditar_(ctx, 'CREAR_EXPEDIENTE_LICENCIA_MEDICA', expedienteId, String(p.PersonalID), []);
      }

      if (!movExp) {
        sgaActualizarFila_(movSh, mov, {NumeroExpediente: sgaTextoSeguroSheet_(numero)});
        sgaMovAuditar_(ctx, 'VINCULAR_EXPEDIENTE_LICENCIA_MEDICA', String(mov.MovimientoID),
          String(p.PersonalID), ['NumeroExpediente']);
      }

      if (estado !== 'TRABAJADA') {
        sgaActualizarFila_(sgaLmHoja_('LICENCIAS_MEDICAS_SGA'), r, {
          Estado: 'TRABAJADA',
          FechaModificacion: sgaFechaIso_(),
          ModificadoPor: ctx.usuario.UsuarioID
        });
        sgaLmAuditar_(ctx, 'REGISTRAR_EXPEDIENTE_LICENCIA_MEDICA',
          String(r.LicenciaID), String(p.PersonalID));
      }

      return sgaRespuesta_({
        id: String(r.LicenciaID),
        movimientoId: String(r.MovimientoID),
        expedienteId: expedienteId,
        numeroExpediente: numero
      }, estado === 'TRABAJADA'
        ? 'El expediente ya quedó vinculado a la licencia.'
        : 'Expediente registrado. La licencia salió de Gestión y permanece en Movimientos.');
    });
  } catch (e) {
    return sgaFallo_(e);
  }
}
