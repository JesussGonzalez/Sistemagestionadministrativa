'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight,
  ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Save, Search, Send, ShieldCheck,
  UserRound, Users, X
} from 'lucide-react';
import { sgaCall, SgaClientError } from '@/lib/sga-client';
import { confirmAction, notify } from '@/lib/feedback';
import type {
  Department, ExpedienteItem, ExpedientePermissions, Ficha, MovementCatalog, MovementItem, Paged, ParteData,
  ParteObligation, PersonnelDetail, PersonnelListItem, PersonnelPaged, Profile, Service, Structure
} from '@/lib/types';
import { isoHoy, turnos } from '@/lib/types';
import { AlertsWidget, CalendarWidget, DepartmentFunctionsModule, DepartmentsModule, DocumentsModule, LibroModule, MedicalModule, MessagesModule, ReportsModule, ServicesModule, UsersModule } from '@/components/sga-extended-modules';
import { CustomReportsModule, MovementWorkflowModule, ParteAdvancedModule, SchedulesModule } from '@/components/sga-advanced-modules';

type Tab = 'inicio'|'departamentos'|'servicios'|'usuarios'|'funciones'|'personal'|'movimientos'|'medicas'|'expedientes'|'documentos'|'parte'|'libro'|'mensajes'|'reportes';
type Modal = 'persona'|'movimiento'|'expediente'|'password'|null;

type PersonDraft = PersonnelDetail;
const blankPerson = (dep='',srv=''):PersonDraft => ({
  id:'',puedeEditar:false,Activo:true,LP:'',Apellido:'',Nombres:'',Jerarquia:'',DNI:'',CUIL:'',FechaNacimiento:'',Sexo:'',Nacionalidad:'',EstadoCivil:'',Domicilio:'',Localidad:'',Provincia:'',CodigoPostal:'',Telefono:'',TelefonoAlternativo:'',Email:'',ContactoEmergencia:'',TelefonoEmergencia:'',DepartamentoID:dep,ServicioID:srv,Funcion:'',Cargo:'',Categoria:'',SituacionRevista:'',Planta:'',FechaIngreso:'',FechaIngresoServicio:'',AntiguedadReconocida:'',Horario:'',Turno:'',FrancoHabitual:'',EstadoLaboral:'',ObraSocial:'',NumeroAfiliado:'',FotoURL:'',Observaciones:'',NumeroCredencial:'',CredencialDeGrado:'',ObservacionesCredencial:''
});

const menu = [
  {id:'inicio' as const,label:'Inicio',icon:LayoutDashboard,permission:'VER_INICIO'},
  {id:'departamentos' as const,label:'Departamentos',icon:BriefcaseBusiness,permission:'VER_INICIO'},
  {id:'servicios' as const,label:'Servicios',icon:BriefcaseBusiness,permission:'VER_INICIO'},
  {id:'usuarios' as const,label:'Usuarios',icon:Users,permission:'GESTION_USUARIOS'},
  {id:'funciones' as const,label:'Funciones departamentales',icon:UserRound,permission:'VER_INICIO'},
  {id:'personal' as const,label:'Personal',icon:Users,permission:'VER_PERSONAL'},
  {id:'movimientos' as const,label:'Movimientos',icon:Activity,permission:'VER_MOVIMIENTOS'},
  {id:'medicas' as const,label:'Gestión de licencias médicas',icon:Activity,permission:'VER_INICIO'},
  {id:'expedientes' as const,label:'Expedientes',icon:FileText,permission:'VER_EXPEDIENTES'},
  {id:'documentos' as const,label:'Documentación',icon:FileText,permission:'VER_DOCUMENTOS'},
  {id:'parte' as const,label:'Parte diario',icon:ClipboardList,permission:'VER_PARTE'},
  {id:'libro' as const,label:'Libro Report',icon:BookOpen,permission:'VER_PARTE'},
  {id:'mensajes' as const,label:'Mensajes',icon:Send,permission:'VER_INICIO'},
  {id:'reportes' as const,label:'Reportes',icon:FileText,permission:'VER_REPORTES'}
];

function errorText(error:unknown){ return error instanceof Error ? error.message : 'No se pudo completar la operación.'; }
function fmtDate(value:string){ if(!value)return '—'; const [y,m,d]=value.slice(0,10).split('-'); return y&&m&&d?`${d}/${m}/${y}`:value; }
function Notice({children,kind='error'}:{children:React.ReactNode;kind?:'error'|'success'|'info'}){return <div className={`notice ${kind}`} role="status">{children}</div>}
function Input({label,value,onChange,type='text',required=false,placeholder='',disabled=false}:{label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean;placeholder?:string;disabled?:boolean}){return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} required={required} placeholder={placeholder} disabled={disabled}/></label>}
function Select({label,value,onChange,children,disabled=false}:{label:string;value:string;onChange:(v:string)=>void;children:React.ReactNode;disabled?:boolean}){return <label className="select-field"><span>{label}</span><select value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{children}</select></label>}

export default function Home(){
  const [authLoading,setAuthLoading]=useState(true);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [usuario,setUsuario]=useState('');
  const [password,setPassword]=useState('');
  const [authError,setAuthError]=useState('');
  const [structure,setStructure]=useState<Structure>({departamentos:[],servicios:[],puedeEditarEstructura:false,puedeGestionarUsuarios:false});
  const [depId,setDepId]=useState('');
  const [srvId,setSrvId]=useState('');
  const [tab,setTab]=useState<Tab>('inicio');
  const [mobileOpen,setMobileOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [messageKind,setMessageKind]=useState<'error'|'success'|'info'>('info');
  const [revision,setRevision]=useState(0);
  const [counters,setCounters]=useState([0,0,0]);
  const [obligation,setObligation]=useState<ParteObligation|null>(null);
  const [medicalAccess,setMedicalAccess]=useState(false);

  const [globalQuery,setGlobalQuery]=useState('');
  const [globalResults,setGlobalResults]=useState<Array<{id:string;lp:string;apellido:string;nombres:string;jerarquia:string;departamentoId:string;servicioId:string;activo:boolean}>>([]);
  const [globalOpen,setGlobalOpen]=useState(false);

  const [query,setQuery]=useState('');
  const [people,setPeople]=useState<PersonnelListItem[]>([]);
  const [peopleTotal,setPeopleTotal]=useState(0);
  const [peopleOffset,setPeopleOffset]=useState(0);
  const [peopleCanEdit,setPeopleCanEdit]=useState(false);
  const [ficha,setFicha]=useState<Ficha|null>(null);
  const [fichaLoading,setFichaLoading]=useState(false);

  const [movementCatalog,setMovementCatalog]=useState<MovementCatalog>({tipos:[],puedeCrear:false,puedeEditar:false,puedeAnular:false});
  const [movements,setMovements]=useState<MovementItem[]>([]);
  const [moveTotal,setMoveTotal]=useState(0);
  const [moveOffset,setMoveOffset]=useState(0);
  const [moveLp,setMoveLp]=useState('');
  const [moveTypeFilter,setMoveTypeFilter]=useState('');

  const [expPerms,setExpPerms]=useState<ExpedientePermissions>({puedeCrear:false,puedeEditar:false,puedeCerrar:false,estados:[]});
  const [expedientes,setExpedientes]=useState<ExpedienteItem[]>([]);
  const [expTotal,setExpTotal]=useState(0);
  const [expOffset,setExpOffset]=useState(0);
  const [expLp,setExpLp]=useState('');

  const [parteFecha,setParteFecha]=useState(isoHoy());
  const [parteTurno,setParteTurno]=useState<string>('MAÑANA');
  const [parte,setParte]=useState<ParteData|null>(null);
  const [parteDirty,setParteDirty]=useState<Set<string>>(new Set());

  const [modal,setModal]=useState<Modal>(null);
  const [personDraft,setPersonDraft]=useState<PersonDraft>(blankPerson());
  const [moveDraft,setMoveDraft]=useState({lp:'',tipo:'',subtipo:'',fechaDesde:isoHoy(),fechaHasta:isoHoy(),horaDesde:'',horaHasta:'',numeroDocumento:'',numeroExpediente:'',descripcion:'',observaciones:'',archivoURL:''});
  const [expDraft,setExpDraft]=useState({lp:'',numero:'',tipo:'',asunto:'',descripcion:'',fechaInicio:isoHoy(),ubicacion:'',archivoURL:'',observaciones:''});
  const [passDraft,setPassDraft]=useState({actual:'',nueva:'',confirmacion:''});

  const departments=structure.departamentos;
  const services=structure.servicios;
  const visibleServices=useMemo(()=>services.filter(s=>s.departamentoId===depId),[services,depId]);
  const activeMenu=useMemo(()=>menu.filter(item=>{
    if(!profile)return false;
    if(item.id==='inicio'||item.id==='departamentos'||item.id==='servicios')return true;
    if(item.id==='usuarios')return structure.puedeGestionarUsuarios;
    if(item.id==='funciones'||item.id==='mensajes')return ['SUPER_ADMIN','RRHH_ADMIN','RRHH','DEPARTAMENTO','SERVICIO'].includes(profile.rol);
    if(item.id==='medicas')return medicalAccess;
    if(item.id==='libro')return profile.permisos.includes('VER_PARTE')&&['SUPER_ADMIN','RRHH_ADMIN','RRHH','DEPARTAMENTO','SERVICIO'].includes(profile.rol);
    return profile.permisos.includes(item.permission);
  }),[profile,structure.puedeGestionarUsuarios,medicalAccess]);
  const mobileMenu=useMemo(()=>activeMenu.filter(item=>['inicio','personal','movimientos','parte','mensajes'].includes(item.id)).slice(0,5),[activeMenu]);
  const canUseDep=profile?.rol==='SUPER_ADMIN'||profile?.rol==='RRHH_ADMIN'||profile?.rol==='RRHH';
  const canUseSrv=!profile?.servicioId;
  const refresh=()=>setRevision(v=>v+1);

  const markMessage=(text:string,kind:'error'|'success'|'info'='info')=>{setMessage(text);setMessageKind(kind);notify(text,kind)};
  const handleError=useCallback((error:unknown)=>{
    const text=errorText(error);
    if(error instanceof SgaClientError&&error.status===401){setProfile(null);setStructure({departamentos:[],servicios:[],puedeEditarEstructura:false,puedeGestionarUsuarios:false});setAuthError(text);setTab('inicio');return;}
    markMessage(text,'error');
  },[]);

  const applyStructure=useCallback((s:Structure,p:Profile)=>{
    setStructure(s);
    const dep=p.departamentoId||s.departamentos.find(d=>d.activo)?.id||s.departamentos[0]?.id||'';
    const srv=p.servicioId||s.servicios.find(x=>x.departamentoId===dep&&x.activo)?.id||s.servicios.find(x=>x.departamentoId===dep)?.id||'';
    setDepId(dep);setSrvId(srv);
  },[]);

  const bootstrap=useCallback(async(p:Profile)=>{
    const s=(await sgaCall<Structure>('structure')).data;
    applyStructure(s,p);
    try{setMedicalAccess((await sgaCall<{puedeAcceder:boolean}>('medical.access')).data.puedeAcceder)}catch{setMedicalAccess(false)}
    if(p.rol==='SERVICIO'){
      try{
        const ob=(await sgaCall<ParteObligation>('parte.obligation')).data;
        setObligation(ob);
        if(ob?.bloqueo){setParteFecha(ob.fecha||isoHoy());setDepId(ob.departamentoId||p.departamentoId);setSrvId(ob.servicioId||p.servicioId);setParteTurno(ob.pendientes?.[0]?.turno||'MAÑANA');setTab('parte');}
      }catch(error){handleError(error)}
    } else setObligation(null);
  },[applyStructure,handleError]);

  useEffect(()=>{
    let alive=true;
    void (async()=>{
      try{
        const res=await sgaCall<{perfil:Profile}>('session');
        if(!alive)return;
        setProfile(res.data.perfil);setAuthError('');
        await bootstrap(res.data.perfil);
      }catch(error){ if(alive&&(!(error instanceof SgaClientError)||error.status!==401))setAuthError(errorText(error)); }
      finally{if(alive)setAuthLoading(false)}
    })();
    return()=>{alive=false};
  },[bootstrap]);

  const loadDashboard=useCallback(async()=>{
    if(!profile)return;
    const tasks:Promise<number>[]=[];
    tasks.push(profile.permisos.includes('VER_PERSONAL')?sgaCall<PersonnelPaged>('personal.list',{filtros:{offset:0}}).then(r=>r.data.total):Promise.resolve(0));
    tasks.push(profile.permisos.includes('VER_MOVIMIENTOS')?sgaCall<Paged<MovementItem>>('movements.list',{filtros:{offset:0,estado:'REGISTRADO'}}).then(r=>r.data.total):Promise.resolve(0));
    tasks.push(profile.permisos.includes('VER_EXPEDIENTES')?sgaCall<Paged<ExpedienteItem>>('expedientes.list',{filtros:{offset:0}}).then(r=>r.data.total):Promise.resolve(0));
    setCounters(await Promise.all(tasks));
  },[profile]);

  const loadPeople=useCallback(async(offset=0)=>{
    const res=await sgaCall<PersonnelPaged>('personal.list',{filtros:{q:query.trim(),departamentoId:depId,servicioId:srvId,offset}});
    setPeople(res.data.personas);setPeopleTotal(res.data.total);setPeopleOffset(res.data.offset);setPeopleCanEdit(res.data.puedeEditar);
  },[query,depId,srvId]);

  const loadMovements=useCallback(async(offset=0)=>{
    const [cat,list]=await Promise.all([
      sgaCall<MovementCatalog>('movements.types'),
      sgaCall<Paged<MovementItem>>('movements.list',{filtros:{lp:moveLp.trim(),tipo:moveTypeFilter,offset}})
    ]);
    setMovementCatalog(cat.data);setMovements(list.data.items);setMoveTotal(list.data.total);setMoveOffset(list.data.offset);
    if(!moveDraft.tipo&&cat.data.tipos.length)setMoveDraft(v=>({...v,tipo:cat.data.tipos[0].nombre}));
  },[moveLp,moveTypeFilter,moveDraft.tipo]);

  const loadExpedientes=useCallback(async(offset=0)=>{
    const [perms,list]=await Promise.all([
      sgaCall<ExpedientePermissions>('expedientes.permissions'),
      sgaCall<Paged<ExpedienteItem>>('expedientes.list',{filtros:{lp:expLp.trim(),offset}})
    ]);
    setExpPerms(perms.data);setExpedientes(list.data.items);setExpTotal(list.data.total);setExpOffset(list.data.offset);
  },[expLp]);

  const loadParte=useCallback(async()=>{
    if(!depId||!srvId)return;
    const res=await sgaCall<ParteData>('parte.get',{filtros:{fecha:parteFecha,departamentoId:depId,servicioId:srvId,turno:parteTurno}});
    setParte(res.data);setParteDirty(new Set());
  },[depId,srvId,parteFecha,parteTurno]);

  useEffect(()=>{
    if(!profile)return;
    setLoading(true);setMessage('');
    const work=tab==='inicio'?loadDashboard():tab==='personal'?loadPeople(0):tab==='movimientos'?loadMovements(0):tab==='expedientes'?loadExpedientes(0):Promise.resolve();
    void work.catch(handleError).finally(()=>setLoading(false));
  },[profile,tab,revision,loadDashboard,loadPeople,loadMovements,loadExpedientes,handleError]);

  async function login(event:FormEvent){
    event.preventDefault();setSaving(true);setAuthError('');
    try{
      const res=await sgaCall<{perfil:Profile}>('login',{usuario:usuario.trim(),password});
      const p=res.data.perfil;setProfile(p);setPassword('');setAuthError('');
      if(p.passwordResetRequired)setModal('password');
      else await bootstrap(p);
    }catch(error){setAuthError(errorText(error))}finally{setSaving(false);setAuthLoading(false)}
  }
  async function logout(){
    try{await sgaCall<null>('logout')}catch{/* limpiar igualmente */}
    setProfile(null);setMedicalAccess(false);setStructure({departamentos:[],servicios:[],puedeEditarEstructura:false,puedeGestionarUsuarios:false});setFicha(null);setTab('inicio');setModal(null);
  }
  function changeTab(next:Tab){if(profile?.rol==='SERVICIO'&&obligation?.bloqueo&&next!=='parte'){markMessage('Primero debés enviar el Parte Diario de hoy para continuar.','error');return;}setTab(next);setMobileOpen(false);setMessage('');setFicha(null)}
  function changeDepartment(value:string){setDepId(value);const first=services.find(s=>s.departamentoId===value&&s.activo)||services.find(s=>s.departamentoId===value);setSrvId(first?.id||'')}

  async function runGlobalSearch(event?:FormEvent){
    event?.preventDefault();
    const term=globalQuery.trim();
    if(term.length<2){setGlobalResults([]);setGlobalOpen(false);return;}
    try{
      const res=await sgaCall<{personas:Array<{id:string;lp:string;apellido:string;nombres:string;jerarquia:string;departamentoId:string;servicioId:string;activo:boolean}>}>('global.search',{termino:term});
      setGlobalResults(res.data.personas);setGlobalOpen(true);
    }catch(error){handleError(error)}
  }
  async function chooseGlobal(id:string){setGlobalOpen(false);setTab('personal');setMobileOpen(false);await openFicha(id)}

  async function openFicha(id:string){setFichaLoading(true);setFicha(null);try{setFicha((await sgaCall<Ficha>('ficha.get',{id})).data)}catch(error){handleError(error)}finally{setFichaLoading(false)}}
  async function editPerson(id?:string){
    try{
      if(id){const detail=(await sgaCall<PersonnelDetail>('personal.get',{id})).data;setPersonDraft(detail)}
      else setPersonDraft(blankPerson(depId,srvId));
      setModal('persona');
    }catch(error){handleError(error)}
  }
  async function savePerson(event:FormEvent){event.preventDefault();setSaving(true);try{
    const data={...personDraft,DepartamentoID:personDraft.DepartamentoID||depId,ServicioID:personDraft.ServicioID||srvId};
    const res=await sgaCall<{id:string}>('personal.save',{data});setModal(null);markMessage(res.message||'Personal guardado.','success');refresh();if(data.id)void openFicha(data.id);
  }catch(error){handleError(error)}finally{setSaving(false)}}

  async function saveMovement(event:FormEvent){event.preventDefault();setSaving(true);try{
    const res=await sgaCall<{id:string}>('movements.save',{data:{...moveDraft,personalId:'',id:''}});setModal(null);markMessage(res.message||'Movimiento registrado.','success');setMoveDraft(v=>({...v,lp:'',subtipo:'',descripcion:'',observaciones:'',numeroDocumento:'',numeroExpediente:'',archivoURL:''}));refresh();
  }catch(error){handleError(error)}finally{setSaving(false)}}

  async function saveExpediente(event:FormEvent){event.preventDefault();setSaving(true);try{
    const res=await sgaCall<{id:string}>('expedientes.save',{data:{...expDraft,personalId:'',id:''}});setModal(null);markMessage(res.message||'Expediente registrado.','success');setExpDraft(v=>({...v,lp:'',numero:'',asunto:'',descripcion:'',observaciones:'',ubicacion:'',archivoURL:''}));refresh();
  }catch(error){handleError(error)}finally{setSaving(false)}}

  async function changePassword(event:FormEvent){event.preventDefault();setSaving(true);try{
    const res=await sgaCall<null>('password.change',passDraft);setModal(null);setProfile(null);setPassDraft({actual:'',nueva:'',confirmacion:''});setAuthError(res.message||'Contraseña actualizada. Ingresá nuevamente.');
  }catch(error){handleError(error)}finally{setSaving(false)}}

  function updateParteRow(id:string,patch:Partial<ParteData['filas'][number]>){setParte(current=>current?{...current,filas:current.filas.map(row=>row.id===id?{...row,...patch}:row)}:current);setParteDirty(old=>new Set(old).add(id))}
  function parteChanges(){return (parte?.filas||[]).filter(r=>parteDirty.has(r.id)).map(r=>({id:r.id,version:r.version,estado:r.estado,horaDesde:r.horaDesde,horaHasta:r.horaHasta,observaciones:r.observaciones}))}
  async function saveParte(){if(!parte||!parteDirty.size)return;setSaving(true);try{const res=await sgaCall<{guardados:number}>('parte.save',{filtros:parte.filtros,cambios:parteChanges()});markMessage(res.message,'success');await loadParte()}catch(error){handleError(error)}finally{setSaving(false)}}
  async function sendParte(){if(!parte)return;const ok=await confirmAction({title:'Enviar parte diario',message:'Se enviará oficialmente al departamento y quedará bloqueado hasta una reapertura.',confirmLabel:'Enviar parte'});if(!ok)return;setSaving(true);try{
    const cambios=parteChanges();const versiones=parte.filas.map(r=>({id:r.id,version:r.version}));const res=await sgaCall<{id:string}>('parte.send',{filtros:parte.filtros,cambios,versiones});markMessage(res.message,'success');await loadParte();if(profile?.rol==='SERVICIO'){const ob=(await sgaCall<ParteObligation>('parte.obligation')).data;setObligation(ob)}
  }catch(error){handleError(error)}finally{setSaving(false)}}

  if(authLoading)return <main className="center"><div className="loading-mark">SGA</div><p>Verificando acceso…</p></main>;
  if(!profile)return <main className="auth-screen"><div className="auth-decor"/><section className="auth-card"><span className="brand-mark">S✦</span><div className="eyebrow">PLATAFORMA INSTITUCIONAL</div><h1>Gestión administrativa,<br/><span>también desde el celular.</span></h1><p>Usá el mismo usuario y contraseña del SGA actual. Ambas interfaces trabajan sobre las mismas planillas.</p><form onSubmit={login} className="auth-form"><Input label="Usuario" value={usuario} onChange={setUsuario} required/><Input label="Contraseña" value={password} onChange={setPassword} type="password" required/>{authError&&<Notice>{authError}</Notice>}<button disabled={saving} className="primary" type="submit">{saving?'Ingresando…':'Ingresar al sistema'} <ArrowRight size={18}/></button></form><div className="security"><ShieldCheck size={17}/> Acceso restringido · Backend Google Sheets</div></section><div className="auth-foot">SGA · Sistema de Gestión Administrativa</div></main>;

  const currentLabel=menu.find(v=>v.id===tab)?.label||'Inicio';
  const pageDescriptions:Record<Tab,string>={
    inicio:'La misma información del SGA actual, con una interfaz adaptable a PC y celular.',
    departamentos:'Administrá la estructura departamental usando las mismas hojas del sistema actual.',
    servicios:'Consultá y administrá los servicios habilitados por departamento.',
    usuarios:'Gestioná las cuentas, roles y ámbitos autorizados del SGA.',
    funciones:'Asigná jefaturas, administración, supervisores y enfermeros jefes.',
    personal:'Buscá por LP, apellido, nombre, DNI o CUIL y abrí la ficha completa.',
    movimientos:'Consultá y registrá novedades usando las reglas del backend actual.',
    medicas:'Gestión protegida de licencias médicas y sus comprobantes privados.',
    expedientes:'Seguimiento administrativo conectado a las mismas planillas.',
    documentos:'Legajo digital y documentación privada del personal.',
    parte:'Cargá y enviá el parte con las novedades automáticas ya existentes.',
    libro:'Libro de novedades por departamento, servicio y turno.',
    mensajes:'Mensajes internos y confirmaciones de lectura por unidad.',
    reportes:'Consultas administrativas y exportación a Excel con permisos del backend.'
  };
  const selectedMoveType=movementCatalog.tipos.find(t=>t.nombre===moveDraft.tipo);

  return <div className="shell">
    <aside className={`sidebar ${mobileOpen?'open':''}`}>
      <div className="side-top"><div className="brand"><span className="brand-mark">S✦</span><div><strong>SGA</strong><small>Gestión Administrativa</small></div></div><button className="mobile-close icon-btn" aria-label="Cerrar menú" onClick={()=>setMobileOpen(false)}><X size={20}/></button></div>
      <div className="nav-label">ESPACIO DE TRABAJO</div><nav aria-label="Navegación principal">{activeMenu.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-link ${tab===item.id?'active':''}`} onClick={()=>changeTab(item.id)}><Icon size={19}/><span>{item.label}</span>{tab===item.id&&<ChevronRight size={16} className="nav-chevron"/>}</button>})}</nav>
      <div className="side-bottom"><div className="secure-badge"><ShieldCheck size={18}/><div><strong>Misma base operativa</strong><span>Google Sheets + Apps Script</span></div></div><button className="signout" onClick={logout}><LogOut size={18}/> Cerrar sesión</button></div>
    </aside>
    {mobileOpen&&<button className="scrim" aria-label="Cerrar navegación" onClick={()=>setMobileOpen(false)}/>}
    <main className="main">
      <header className="topbar"><button className="menu-trigger icon-btn" aria-label="Abrir menú" onClick={()=>setMobileOpen(true)}><Menu size={23}/></button><span className="breadcrumb">SGA <ChevronRight size={14}/> <b>{currentLabel}</b></span>{profile.permisos.includes('VER_PERSONAL')&&<div className="top-search-wrap"><form className="top-search" onSubmit={runGlobalSearch}><Search size={15}/><input value={globalQuery} onChange={e=>{setGlobalQuery(e.target.value);if(e.target.value.trim().length<2){setGlobalOpen(false);setGlobalResults([])}}} placeholder="Buscar LP, apellido, nombre, DNI o CUIL…"/><button aria-label="Buscar">Buscar</button></form>{globalOpen&&<div className="top-search-results">{globalResults.length?globalResults.map(r=><button key={r.id} onClick={()=>void chooseGlobal(r.id)}><strong>{r.apellido}, {r.nombres}</strong><small>LP {r.lp} · {r.jerarquia||'Sin jerarquía'}</small></button>):<div className="top-search-empty">Sin coincidencias.</div>}</div>}</div>}<div className="account"><span className="avatar">{profile.nombre.slice(0,1)}{profile.apellido.slice(0,1)}</span><div><strong>{profile.nombre} {profile.apellido}</strong><small>{profile.rol.replaceAll('_',' ')}</small></div></div></header>
      <div className="content">
        <div className="page-heading"><div><span className="eyebrow">SISTEMA DE GESTIÓN ADMINISTRATIVA</span><h1>{tab==='inicio'?`Hola, ${profile.nombre} 👋`:currentLabel}</h1><p>{pageDescriptions[tab]}</p></div><span className="today"><CalendarDays size={17}/> {new Intl.DateTimeFormat('es-AR',{dateStyle:'medium'}).format(new Date())}</span></div>
        {obligation?.bloqueo&&<Notice kind="error">Parte diario obligatorio: {obligation.pendientes?.map(x=>x.turno).join(', ')||'hay turnos pendientes'}.</Notice>}
        {message&&<Notice kind={messageKind}>{message}</Notice>}

        {tab==='inicio'&&<>
          <div className="stats"><div className="stat"><span className="stat-icon lavender"><Users/></span><p>Personal visible</p><strong>{loading?'…':counters[0].toLocaleString('es-AR')}</strong><small>Según tus permisos actuales</small></div><div className="stat"><span className="stat-icon blue"><Activity/></span><p>Movimientos activos</p><strong>{loading?'…':counters[1].toLocaleString('es-AR')}</strong><small>Leídos desde Sheets</small></div><div className="stat"><span className="stat-icon green"><BriefcaseBusiness/></span><p>Expedientes</p><strong>{loading?'…':counters[2].toLocaleString('es-AR')}</strong><small>Dentro de tu ámbito</small></div></div>
          <div className="section-title"><h2>Accesos rápidos</h2><p>Continuá con tus tareas habituales</p></div><div className="quick-grid">{activeMenu.filter(x=>x.id!=='inicio').map(item=>{const Icon=item.icon;return <button key={item.id} className="quick-card" onClick={()=>changeTab(item.id)}><span className="quick-icon"><Icon size={23}/></span><strong>{item.label}</strong><span>Abrir módulo <ArrowRight size={16}/></span></button>})}</div>
          {profile.permisos.includes('VER_PERSONAL')&&profile.permisos.includes('VER_MOVIMIENTOS')&&<><AlertsWidget/><CalendarWidget/></>}
          <div className="hint"><BookOpen size={20}/><div><strong>Modo transición activo</strong><p>La página Next.js y la interfaz Apps Script trabajan sobre las mismas hojas. No hay una segunda base ni sincronización pendiente.</p></div></div>
        </>}

        {tab==='departamentos'&&<DepartmentsModule profile={profile} structure={structure} onStructureChanged={()=>bootstrap(profile)}/>} 
        {tab==='servicios'&&<ServicesModule profile={profile} structure={structure} onStructureChanged={()=>bootstrap(profile)}/>} 
        {tab==='usuarios'&&<UsersModule profile={profile} structure={structure}/>} 
        {tab==='funciones'&&<><DepartmentFunctionsModule profile={profile} structure={structure}/><SchedulesModule profile={profile}/></>} 
        {tab==='medicas'&&<MedicalModule/>}
        {tab==='documentos'&&<DocumentsModule/>}
        {tab==='movimientos'&&<MovementWorkflowModule profile={profile} structure={structure}/>}
        {tab==='libro'&&<LibroModule/>}
        {tab==='parte'&&<ParteAdvancedModule profile={profile} structure={structure} fecha={parteFecha} departamentoId={depId}/>}
        {tab==='mensajes'&&<MessagesModule/>}
        {tab==='reportes'&&<><ReportsModule profile={profile} structure={structure}/><CustomReportsModule/></>} 

        {tab==='personal'&&<>
          <div className="toolbar"><div className="filters"><Select label="Departamento" value={depId} disabled={!canUseDep} onChange={changeDepartment}>{departments.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</Select><Select label="Servicio" value={srvId} disabled={!canUseSrv} onChange={setSrvId}><option value="">Todos los servicios</option>{visibleServices.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</Select></div><div className="toolbar-actions">{peopleCanEdit&&depId&&srvId&&<button className="primary" onClick={()=>void editPerson()}><Plus size={17}/> Nuevo personal</button>}</div></div>
          <section className="panel"><div className="panel-heading"><div><h2>Personal</h2><small>{peopleTotal} registros encontrados</small></div><form className="search-box" onSubmit={e=>{e.preventDefault();setLoading(true);void loadPeople(0).catch(handleError).finally(()=>setLoading(false))}}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="LP, apellido, DNI o CUIL"/><button>Buscar</button></form></div>
            {loading?<div className="empty">Consultando Google Sheets…</div>:people.length?<><div className="mobile-card-list">{people.map(p=><button className="person-card" key={p.id} onClick={()=>void openFicha(p.id)}><span className="person-card-avatar">{p.apellido.slice(0,1)}{p.nombres.slice(0,1)}</span><span className="person-card-main"><strong>{p.apellido}, {p.nombres}</strong><small>LP {p.lp} · {p.jerarquia||'Sin jerarquía'}</small><small>{services.find(s=>s.id===p.servicioId)?.nombre||'Sin servicio'}</small></span><ChevronRight size={19}/></button>)}</div><div className="table-scroll desktop-table"><table><thead><tr><th>LP</th><th>Apellido y nombres</th><th>Jerarquía</th><th>Servicio</th><th>Estado</th><th/></tr></thead><tbody>{people.map(p=><tr key={p.id}><td className="mono">{p.lp}</td><td><strong>{p.apellido}, {p.nombres}</strong></td><td>{p.jerarquia||'—'}</td><td>{services.find(s=>s.id===p.servicioId)?.nombre||'—'}</td><td><span className={`pill ${p.activo?'ok':'muted'}`}>{p.estadoLaboral}</span></td><td><button className="text-button" onClick={()=>void openFicha(p.id)}>Ver ficha <ChevronRight size={14}/></button></td></tr>)}</tbody></table></div></>:<div className="empty">No se encontraron personas.</div>}
            <div className="pager"><button disabled={peopleOffset<=0||loading} onClick={()=>void loadPeople(Math.max(0,peopleOffset-20))}><ChevronLeft size={16}/> Anterior</button><span>{peopleTotal?`${peopleOffset+1}–${Math.min(peopleOffset+people.length,peopleTotal)} de ${peopleTotal}`:'0 registros'}</span><button disabled={peopleOffset+people.length>=peopleTotal||loading} onClick={()=>void loadPeople(peopleOffset+20)}>Siguiente <ChevronRight size={16}/></button></div>
          </section>
        </>}

        {tab==='movimientos'&&<>
          <div className="toolbar"><div className="filters"><label className="select-field"><span>LP</span><input value={moveLp} onChange={e=>setMoveLp(e.target.value)} inputMode="numeric" placeholder="Todos"/></label><Select label="Tipo" value={moveTypeFilter} onChange={setMoveTypeFilter}><option value="">Todos</option>{movementCatalog.tipos.map(t=><option key={t.id} value={t.nombre}>{t.nombre}</option>)}</Select><button className="secondary" onClick={()=>{setLoading(true);void loadMovements(0).catch(handleError).finally(()=>setLoading(false))}}><RefreshCw size={16}/> Consultar</button></div>{movementCatalog.puedeCrear&&<button className="primary" onClick={()=>setModal('movimiento')}><Plus size={17}/> Nuevo movimiento</button>}</div>
          <section className="panel"><div className="panel-heading"><div><h2>Movimientos</h2><small>{moveTotal} registros</small></div></div>{loading?<div className="empty">Consultando movimientos…</div>:movements.length?<div className="table-scroll"><table><thead><tr><th>Personal</th><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Estado</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td><strong>{m.nombre}</strong><small className="subline">LP {m.lp}</small></td><td>{m.tipo}{m.horaDesde&&<small className="subline">{m.horaDesde} – {m.horaHasta}</small>}</td><td>{fmtDate(m.desde)}</td><td>{fmtDate(m.hasta||m.desde)}</td><td><span className={`pill ${m.estado==='REGISTRADO'?'ok':'muted'}`}>{m.estado}</span></td></tr>)}</tbody></table></div>:<div className="empty">No hay movimientos para esos filtros.</div>}<div className="pager"><button disabled={moveOffset<=0} onClick={()=>void loadMovements(Math.max(0,moveOffset-25))}><ChevronLeft size={16}/> Anterior</button><span>{moveTotal?`${moveOffset+1}–${Math.min(moveOffset+movements.length,moveTotal)} de ${moveTotal}`:'0 movimientos'}</span><button disabled={moveOffset+movements.length>=moveTotal} onClick={()=>void loadMovements(moveOffset+25)}>Siguiente <ChevronRight size={16}/></button></div></section>
        </>}

        {tab==='expedientes'&&<>
          <div className="toolbar"><div className="filters"><label className="select-field"><span>LP</span><input value={expLp} onChange={e=>setExpLp(e.target.value)} inputMode="numeric" placeholder="Todos"/></label><button className="secondary" onClick={()=>{setLoading(true);void loadExpedientes(0).catch(handleError).finally(()=>setLoading(false))}}><RefreshCw size={16}/> Consultar</button></div>{expPerms.puedeCrear&&<button className="primary" onClick={()=>setModal('expediente')}><Plus size={17}/> Nuevo expediente</button>}</div>
          <section className="panel"><div className="panel-heading"><div><h2>Expedientes</h2><small>{expTotal} registros</small></div></div>{loading?<div className="empty">Consultando expedientes…</div>:expedientes.length?<div className="table-scroll"><table><thead><tr><th>Personal</th><th>Número</th><th>Tipo</th><th>Inicio</th><th>Estado</th><th>Ubicación</th></tr></thead><tbody>{expedientes.map(e=><tr key={e.id}><td><strong>{e.nombre}</strong><small className="subline">LP {e.lp}</small></td><td className="mono">{e.numero}</td><td>{e.tipo}</td><td>{fmtDate(e.fechaInicio)}</td><td><span className="pill muted">{e.estado}</span></td><td>{e.ubicacion||'—'}</td></tr>)}</tbody></table></div>:<div className="empty">No hay expedientes para esos filtros.</div>}<div className="pager"><button disabled={expOffset<=0} onClick={()=>void loadExpedientes(Math.max(0,expOffset-25))}><ChevronLeft size={16}/> Anterior</button><span>{expTotal?`${expOffset+1}–${Math.min(expOffset+expedientes.length,expTotal)} de ${expTotal}`:'0 expedientes'}</span><button disabled={expOffset+expedientes.length>=expTotal} onClick={()=>void loadExpedientes(expOffset+25)}>Siguiente <ChevronRight size={16}/></button></div></section>
        </>}

        {tab==='parte'&&<>
          <div className="toolbar"><div className="filters"><label className="select-field"><span>Fecha</span><input type="date" value={parteFecha} disabled={!!obligation?.bloqueo} onChange={e=>setParteFecha(e.target.value)}/></label><Select label="Departamento" value={depId} disabled={!canUseDep||!!obligation?.bloqueo} onChange={changeDepartment}>{departments.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</Select><Select label="Servicio" value={srvId} disabled={!canUseSrv||!!obligation?.bloqueo} onChange={setSrvId}>{visibleServices.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</Select><Select label="Turno" value={parteTurno} onChange={setParteTurno}>{turnos.map(t=><option key={t}>{t}</option>)}</Select></div><button className="primary" disabled={!depId||!srvId||loading} onClick={()=>{setLoading(true);void loadParte().catch(handleError).finally(()=>setLoading(false))}}><Search size={17}/> Cargar parte</button></div>
          {!parte?<div className="panel empty">Seleccioná el día, servicio y turno para consultar el parte.</div>:<section className="panel"><div className="panel-heading"><div><h2>{fmtDate(parte.filtros.fecha)} · {parte.filtros.turno}</h2><small>{services.find(s=>s.id===parte.filtros.servicioId)?.nombre} · {parte.envio.estado}</small></div><div className="parte-actions">{parte.puedeEditar&&parteDirty.size>0&&<button className="secondary" disabled={saving} onClick={()=>void saveParte()}><Save size={16}/> Guardar borrador ({parteDirty.size})</button>}{parte.puedeEnviar&&<button className="primary" disabled={saving} onClick={()=>void sendParte()}><Send size={16}/> Enviar parte</button>}</div></div><div className="table-scroll"><table className="parte-table"><thead><tr><th>Personal</th><th>Estado</th><th>Horario</th><th>Guardia paga</th><th>Observación</th></tr></thead><tbody>{parte.filas.map(row=><tr key={row.id} className={row.conflicto?'row-conflict':''}><td><strong>{row.apellido}, {row.nombres}</strong><small className="subline">LP {row.lp} · {row.jerarquia||'—'} · {row.horario||row.horarioOriginal||'Sin horario'}</small>{row.novedades.length>0&&<small className="subline auto-note">Automático: {row.novedades.join(', ')}</small>}</td><td><select disabled={!parte.puedeEditar||row.automatico} value={row.estado} onChange={e=>updateParteRow(row.id,{estado:e.target.value,horaDesde:e.target.value==='GUARDIA PAGA'?row.horaDesde:'',horaHasta:e.target.value==='GUARDIA PAGA'?row.horaHasta:''})}><option value="SIN INFORMAR">SIN INFORMAR</option>{parte.estados.map(e=><option key={e}>{e}</option>)}{row.conflicto&&<option value="CONFLICTO">CONFLICTO</option>}</select></td><td>{row.horario||'—'}</td><td><div className="time-pair"><input type="time" disabled={!parte.puedeEditar||row.automatico||row.estado!=='GUARDIA PAGA'} value={row.horaDesde} onChange={e=>updateParteRow(row.id,{horaDesde:e.target.value})}/><input type="time" disabled={!parte.puedeEditar||row.automatico||row.estado!=='GUARDIA PAGA'} value={row.horaHasta} onChange={e=>updateParteRow(row.id,{horaHasta:e.target.value})}/></div></td><td><input className="note-input" disabled={!parte.puedeEditar||row.automatico} value={row.observaciones} maxLength={250} onChange={e=>updateParteRow(row.id,{observaciones:e.target.value})} placeholder="Administrativa"/></td></tr>)}</tbody></table></div><div className="panel-foot">{parte.filas.length} personas · {parteDirty.size} cambios sin guardar</div></section>}
        </>}
      </div>
    </main>

    <nav className="mobile-nav" aria-label="Navegación móvil">{mobileMenu.map(item=>{const Icon=item.icon;return <button key={item.id} className={tab===item.id?'active':''} onClick={()=>changeTab(item.id)}><Icon size={20}/><span>{item.label.replace(' diario','')}</span></button>})}</nav>

    {(ficha||fichaLoading)&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setFicha(null)}}><aside className="detail-sheet">{fichaLoading?<div className="empty">Cargando ficha…</div>:ficha&&<><div className="modal-head"><button className="icon-btn" onClick={()=>setFicha(null)}><ArrowLeft size={20}/></button><button className="icon-btn" onClick={()=>setFicha(null)} aria-label="Cerrar"><X size={21}/></button></div><div className="person-avatar">{ficha.personal.Apellido.slice(0,1)}{ficha.personal.Nombres.slice(0,1)}</div><h2>{ficha.personal.Apellido}, {ficha.personal.Nombres}</h2><p>LP {ficha.personal.LP} · {ficha.personal.Jerarquia||'Sin jerarquía'}</p><div className="status-banner"><span>Estado actual</span><strong>{ficha.estadoActual}</strong></div><div className="detail-grid"><div><span>DNI</span><strong>{ficha.personal.DNI||'—'}</strong></div><div><span>CUIL</span><strong>{ficha.personal.CUIL||'—'}</strong></div><div><span>Teléfono</span><strong>{ficha.personal.Telefono||'—'}</strong></div><div><span>Email</span><strong>{ficha.personal.Email||'—'}</strong></div><div><span>Función</span><strong>{ficha.personal.Funcion||'—'}</strong></div><div><span>Horario</span><strong>{ficha.personal.Horario||'—'}</strong></div><div><span>Turno</span><strong>{ficha.personal.Turno||'—'}</strong></div><div><span>Ingreso</span><strong>{fmtDate(ficha.personal.FechaIngreso)}</strong></div></div>{ficha.personal.puedeEditar&&<button className="primary full" onClick={()=>void editPerson(ficha.personal.id)}>Editar datos</button>}<div className="sheet-section"><h3>Últimos movimientos</h3>{ficha.movimientos.length?ficha.movimientos.map((m,i)=><div className="timeline-item" key={`${m.tipo}-${m.fechaDesde}-${i}`}><span/><div><strong>{m.tipo}</strong><small>{fmtDate(m.fechaDesde)}{m.fechaHasta&&m.fechaHasta!==m.fechaDesde?` → ${fmtDate(m.fechaHasta)}`:''}{m.horaDesde?` · ${m.horaDesde}–${m.horaHasta}`:''}</small></div></div>):<p className="muted-text">Sin movimientos visibles.</p>}</div>{ficha.expedientes.length>0&&<div className="sheet-section"><h3>Expedientes</h3>{ficha.expedientes.map((e,i)=><div className="timeline-item" key={`${e.numero}-${i}`}><span/><div><strong>{e.numero} · {e.tipo}</strong><small>{fmtDate(e.fechaInicio)} · {e.estado}</small></div></div>)}</div>}</>}</aside></div>}

    {modal&&<div className="modal-backdrop"><section className="form-modal"><div className="modal-head"><div><span className="eyebrow">SGA</span><h2>{modal==='persona'?(personDraft.id?'Editar personal':'Nuevo personal'):modal==='movimiento'?'Nuevo movimiento':modal==='expediente'?'Nuevo expediente':'Cambiar contraseña'}</h2></div>{modal!=='password'&&<button className="icon-btn" onClick={()=>setModal(null)}><X size={22}/></button>}</div>
      {modal==='persona'&&<form className="form-grid" onSubmit={savePerson}><Input label="LP" value={personDraft.LP} onChange={v=>setPersonDraft(x=>({...x,LP:v}))} required/><Input label="Jerarquía" value={personDraft.Jerarquia} onChange={v=>setPersonDraft(x=>({...x,Jerarquia:v}))}/><Input label="Apellido" value={personDraft.Apellido} onChange={v=>setPersonDraft(x=>({...x,Apellido:v}))} required/><Input label="Nombres" value={personDraft.Nombres} onChange={v=>setPersonDraft(x=>({...x,Nombres:v}))} required/><Input label="DNI" value={personDraft.DNI} onChange={v=>setPersonDraft(x=>({...x,DNI:v}))}/><Input label="CUIL" value={personDraft.CUIL} onChange={v=>setPersonDraft(x=>({...x,CUIL:v}))}/><Input label="Teléfono" value={personDraft.Telefono} onChange={v=>setPersonDraft(x=>({...x,Telefono:v}))}/><Input label="Email" value={personDraft.Email} type="email" onChange={v=>setPersonDraft(x=>({...x,Email:v}))}/><Select label="Departamento" value={personDraft.DepartamentoID} onChange={v=>setPersonDraft(x=>({...x,DepartamentoID:v,ServicioID:''}))}>{departments.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</Select><Select label="Servicio" value={personDraft.ServicioID} onChange={v=>setPersonDraft(x=>({...x,ServicioID:v}))}>{services.filter(s=>s.departamentoId===personDraft.DepartamentoID).map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</Select><Input label="Función" value={personDraft.Funcion} onChange={v=>setPersonDraft(x=>({...x,Funcion:v}))}/><Input label="Horario" value={personDraft.Horario} onChange={v=>setPersonDraft(x=>({...x,Horario:v}))}/><Input label="Turno" value={personDraft.Turno} onChange={v=>setPersonDraft(x=>({...x,Turno:v}))}/><Input label="Fecha de ingreso" value={personDraft.FechaIngreso} type="date" onChange={v=>setPersonDraft(x=>({...x,FechaIngreso:v}))}/><label className="field wide"><span>Observaciones</span><textarea value={personDraft.Observaciones} onChange={e=>setPersonDraft(x=>({...x,Observaciones:e.target.value}))}/></label><label className="check-field wide"><input type="checkbox" checked={personDraft.Activo} onChange={e=>setPersonDraft(x=>({...x,Activo:e.target.checked}))}/> Registro activo</label><button className="primary form-submit" disabled={saving}>{saving?'Guardando…':'Guardar personal'}</button></form>}
      {modal==='movimiento'&&<form className="form-grid" onSubmit={saveMovement}><Input label="LP" value={moveDraft.lp} onChange={v=>setMoveDraft(x=>({...x,lp:v}))} required/><Select label="Tipo" value={moveDraft.tipo} onChange={v=>setMoveDraft(x=>({...x,tipo:v}))}>{movementCatalog.tipos.map(t=><option key={t.id} value={t.nombre}>{t.nombre}</option>)}</Select><Input label="Fecha desde" type="date" value={moveDraft.fechaDesde} onChange={v=>setMoveDraft(x=>({...x,fechaDesde:v}))} required/>{selectedMoveType?.fechaHasta&&<Input label="Fecha hasta" type="date" value={moveDraft.fechaHasta} onChange={v=>setMoveDraft(x=>({...x,fechaHasta:v}))} required/>}{moveDraft.tipo==='GUARDIA PAGA'&&<><Input label="Hora desde" type="time" value={moveDraft.horaDesde} onChange={v=>setMoveDraft(x=>({...x,horaDesde:v}))} required/><Input label="Hora hasta" type="time" value={moveDraft.horaHasta} onChange={v=>setMoveDraft(x=>({...x,horaHasta:v}))} required/></>}<Input label="Subtipo" value={moveDraft.subtipo} onChange={v=>setMoveDraft(x=>({...x,subtipo:v}))}/>{selectedMoveType?.documento&&<Input label="Número de documento" value={moveDraft.numeroDocumento} onChange={v=>setMoveDraft(x=>({...x,numeroDocumento:v}))} required/>}{selectedMoveType?.expediente&&<Input label="Número de expediente" value={moveDraft.numeroExpediente} onChange={v=>setMoveDraft(x=>({...x,numeroExpediente:v}))} required/>}<label className="field wide"><span>Descripción administrativa</span><textarea value={moveDraft.descripcion} onChange={e=>setMoveDraft(x=>({...x,descripcion:e.target.value}))}/></label><button className="primary form-submit" disabled={saving}>{saving?'Guardando…':'Registrar movimiento'}</button></form>}
      {modal==='expediente'&&<form className="form-grid" onSubmit={saveExpediente}><Input label="LP" value={expDraft.lp} onChange={v=>setExpDraft(x=>({...x,lp:v}))} required/><Input label="Número" value={expDraft.numero} onChange={v=>setExpDraft(x=>({...x,numero:v}))} required/><Input label="Tipo" value={expDraft.tipo} onChange={v=>setExpDraft(x=>({...x,tipo:v}))} required/><Input label="Fecha de inicio" type="date" value={expDraft.fechaInicio} onChange={v=>setExpDraft(x=>({...x,fechaInicio:v}))} required/><label className="field wide"><span>Asunto</span><textarea value={expDraft.asunto} required onChange={e=>setExpDraft(x=>({...x,asunto:e.target.value}))}/></label><Input label="Ubicación" value={expDraft.ubicacion} onChange={v=>setExpDraft(x=>({...x,ubicacion:v}))}/><label className="field wide"><span>Descripción administrativa</span><textarea value={expDraft.descripcion} onChange={e=>setExpDraft(x=>({...x,descripcion:e.target.value}))}/></label><button className="primary form-submit" disabled={saving}>{saving?'Guardando…':'Registrar expediente'}</button></form>}
      {modal==='password'&&<form className="form-grid" onSubmit={changePassword}><Notice kind="info">Tu cuenta requiere cambiar la contraseña provisional antes de continuar.</Notice><Input label="Contraseña actual/provisional" type="password" value={passDraft.actual} onChange={v=>setPassDraft(x=>({...x,actual:v}))} required/><Input label="Nueva contraseña" type="password" value={passDraft.nueva} onChange={v=>setPassDraft(x=>({...x,nueva:v}))} required/><Input label="Confirmar contraseña" type="password" value={passDraft.confirmacion} onChange={v=>setPassDraft(x=>({...x,confirmacion:v}))} required/><button className="primary form-submit" disabled={saving}>{saving?'Actualizando…':'Cambiar contraseña'}</button></form>}
    </section></div>}
  </div>;
}
