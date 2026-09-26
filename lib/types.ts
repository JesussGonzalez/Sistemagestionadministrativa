export type Role = 'SUPER_ADMIN'|'RRHH_ADMIN'|'RRHH'|'DEPARTAMENTO'|'SERVICIO'|'CONSULTA';

export type Profile = {
  nombre:string;
  apellido:string;
  usuario:string;
  rol:Role;
  departamentoId:string;
  servicioId:string;
  passwordResetRequired:boolean;
  puedeAdministrarContrasenas:boolean;
  permisos:string[];
};

export type Department = { id:string; nombre:string; descripcion:string; responsableLP:string; activo:boolean };
export type Service = { id:string; departamentoId:string; nombre:string; descripcion:string; responsableLP:string; activo:boolean };
export type Structure = { departamentos:Department[]; servicios:Service[]; puedeEditarEstructura:boolean; puedeGestionarUsuarios:boolean };

export type PersonnelListItem = {
  id:string; lp:string; apellido:string; nombres:string; jerarquia:string;
  departamentoId:string; servicioId:string; estadoLaboral:string; activo:boolean;
};

export type PersonnelDetail = {
  id:string;
  puedeEditar:boolean;
  Activo:boolean;
  LP:string; Apellido:string; Nombres:string; Jerarquia:string; DNI:string; CUIL:string;
  FechaNacimiento:string; Sexo:string; Nacionalidad:string; EstadoCivil:string; Domicilio:string;
  Localidad:string; Provincia:string; CodigoPostal:string; Telefono:string; TelefonoAlternativo:string;
  Email:string; ContactoEmergencia:string; TelefonoEmergencia:string; DepartamentoID:string; ServicioID:string;
  Funcion:string; Cargo:string; Categoria:string; SituacionRevista:string; Planta:string; FechaIngreso:string;
  FechaIngresoServicio:string; AntiguedadReconocida:string; Horario:string; Turno:string; FrancoHabitual:string;
  EstadoLaboral:string; ObraSocial:string; NumeroAfiliado:string; FotoURL:string; Observaciones:string;
  NumeroCredencial:string; CredencialDeGrado:string; ObservacionesCredencial:string;
};

export type FichaMovement = { fechaDesde:string; fechaHasta:string; tipo:string; estado:string; horaDesde:string; horaHasta:string };
export type FichaExpediente = { numero:string; tipo:string; fechaInicio:string; estado:string };
export type FichaDocumento = { tipo:string; nombre:string; fecha:string; estado:string };
export type FichaHistory = { fecha:string; accion:string; modulo:string; campo:string; antes:string; despues:string; usuario:string };
export type Ficha = {
  personal:PersonnelDetail;
  estadoActual:string;
  movimientos:FichaMovement[];
  licencias:FichaMovement[];
  expedientes:FichaExpediente[];
  documentos:FichaDocumento[];
  historial:FichaHistory[];
  accesos:{movimientos:boolean;expedientes:boolean;documentos:boolean;historial:boolean};
  limites:Record<string,number>;
};

export type Paged<T> = { items:T[]; total:number; offset:number; limite:number };
export type PersonnelPaged = { personas:PersonnelListItem[]; total:number; offset:number; limite:number; puedeEditar:boolean };

export type MovementType = { id:string; nombre:string; categoria:string; fechaHasta:boolean; documento:boolean; expediente:boolean; archivo:boolean };
export type MovementCatalog = { tipos:MovementType[]; puedeCrear:boolean; puedeEditar:boolean; puedeAnular:boolean };
export type MovementItem = {
  id:string; personalId:string; lp:string; nombre:string; tipo:string; desde:string; hasta:string;
  horaDesde:string; horaHasta:string; dias:number; estado:string; editable:boolean; anulable:boolean;
};

export type ExpedientePermissions = { puedeCrear:boolean; puedeEditar:boolean; puedeCerrar:boolean; estados:string[] };
export type ExpedienteItem = {
  id:string; personalId:string; lp:string; nombre:string; numero:string; tipo:string; fechaInicio:string;
  fechaCierre:string; estado:string; ubicacion:string; editable:boolean; gestionable:boolean;
};

export type ParteRow = {
  id:string; lp:string; apellido:string; nombres:string; jerarquia:string; funcion:string;
  horario:string; horarioOriginal:string; novedades:string[]; estado:string; automatico:boolean; conflicto:boolean;
  horaDesde:string; horaHasta:string; observaciones:string; version:number;
};
export type ParteData = {
  filtros:{fecha:string;departamentoId:string;servicioId:string;turno:string};
  puedeEditar:boolean; puedeEnviar:boolean; estados:string[];
  envio:{estado:string;fecha:string;consolidado:boolean};
  filas:ParteRow[];
};
export type ParteObligation = {
  bloqueo:boolean; verificando?:boolean; fecha:string; departamentoId:string; servicioId:string;
  pendientes:Array<{turno:string}>; error?:string;
};

export type SgaResponse<T> = { ok:boolean; data:T; message:string };
export const turnos = ['MAÑANA','TARDE','NOCHE'] as const;
export const isoHoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export type AdminUser = { id:string; usuario:string; nombre:string; apellido:string; email:string; rol:Role; departamentoId:string; servicioId:string; activo:boolean };
export type UsersData = { usuarios:AdminUser[]; rolesDisponibles:Role[] };

export type DepartmentFunctionAssignment = { id:string; usuarioId:string; usuario:string; nombre:string; departamentoId:string; servicioId:string; funcion:string; activo:boolean };
export type DepartmentFunctionUser = { id:string; usuario:string; rol:string; servicioId:string; nombre:string };
export type DepartmentFunctionsData = {
  departamentoId:string; puedeGestionar:boolean;
  servicios:Array<{id:string;nombre:string}>; usuarios:DepartmentFunctionUser[]; asignaciones:DepartmentFunctionAssignment[];
};

export type MedicalAccess = { puedeAcceder:boolean; puedeGestionarMedicos:boolean };
export type MedicalDoctor = { nombre:string; matricula:string; servicio:string };
export type MedicalCatalog = { medicos:MedicalDoctor[]; puedeGestionarMedicos:boolean; plantillasConfiguradas:boolean };
export type MedicalItem = { id:string; lp:string; nombre:string; desde:string; hasta:string; dias:number; estado:string; tieneComprobante:boolean; tieneNotas:boolean; movimientoId:string };
export type MedicalDetail = MedicalItem & { diagnostico:string; medico:string; matricula:string; servicio:string; declaracionTrauma:string; actuacion:string; expedienteActuacion:string; fechaNota:string };

export type DocumentCatalog = { tipos:Array<{id:string;nombre:string}>; puedeSubir:boolean; puedeAnular:boolean; maxMB:number };
export type DocumentItem = { id:string; personalId:string; lp:string; nombreEmpleado:string; tipo:string; nombre:string; fecha:string; vence:string; estado:string };
export type DocumentPaged = Paged<DocumentItem>;

export type LibroCatalog = { departamentos:Array<{id:string;nombre:string}>; servicios:Array<{id:string;departamentoId:string;nombre:string}>; puedeEscribir:boolean };
export type LibroItem = { id:string; fecha:string; servicio:string; servicioId:string; turno:string; tipo:string; asunto:string; detalle:string; resumen:string; fechaRegistro:string; registradoPor:string; envioId:string; estadoEnvio:string; nota:string };
export type LibroData = { fecha:string; total:number; filas:LibroItem[] };

export type MessageDestination = { id:string; tipo:string; departamentoId:string; servicioId:string; nombre:string };
export type MessageCatalog = { puedeEnviar:boolean; destinos:MessageDestination[] };
export type MessageItem = { id:string; asunto:string; prioridad:string; fecha:string; emisor:string; total:number; leidos:number; pendientes:number };
export type MessageList = { filas:MessageItem[]; puedeEnviar:boolean };
export type MessageDetail = { id:string; asunto:string; cuerpo:string; prioridad:string; fecha:string; emisor:string; puedeMarcar:boolean; destinos:Array<{id:string;tipo:string;nombre:string;leido:boolean;leidoPor:string;fechaLectura:string}> };

export type ReportData = { tipo:string; columnas:string[]; filas:string[][]; total:number; generado:string; alcance:string; filtros:{desde:string;hasta:string;estado:string;lp:string} };
export type FilePayload = { nombre:string; base64:string; mime:string };

export type AlertItem = { personalId:string; lp:string; empleado:string; clase:string; tipo:string; fecha:string; situacion:string; diasRestantes:number };
export type AlertsData = { items:AlertItem[]; total:number; mostrados:number; incluyeDocumentos:boolean };
export type CalendarItem = { fecha:string; personalId:string; lp:string; empleado:string; clase:string; tipo:string; etiqueta:string };
export type CalendarSummaryDay = { fecha:string; movimientos:number; documentos:number };
export type CalendarData = { mes:string; resumen:CalendarSummaryDay[]; items:CalendarItem[]; incluyeDocumentos:boolean; total:number };
