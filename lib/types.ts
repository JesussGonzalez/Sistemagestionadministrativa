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
