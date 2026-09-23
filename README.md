# SGA · Next.js + Supabase + Vercel

Migración **incremental** del SGA Apps Script. Esta primera versión incorpora acceso con Supabase Auth, alcance por rol/departamento/servicio (RLS), dashboard, búsqueda y fichas de personal, altas y ediciones de personal para RRHH administrador, registro de movimientos centralizados, expedientes básicos y parte diario editable con sugerencias desde movimientos vigentes. **No equivale todavía a toda la aplicación GAS**: faltan flujos de aprobación departamental, gestión clínica de licencias médicas, documentos privados, firmas, reportes, mensajería, rectificaciones, archivo y cierre formal de partes.

## Requisitos

Node.js 20.9+; proyecto **nuevo y exclusivo de Supabase**; repositorio importado en Vercel. No reutilizar una base ajena ni introducir datos clínicos hasta auditar su acceso.

## 1. Base de datos

1. Crear un proyecto Supabase propio del SGA.
2. En SQL Editor ejecutar `supabase/schema.sql` sobre el proyecto vacío. Verificar que el comando finalice sin errores.
3. En Authentication > Users crear al primer administrador usando su correo (no registrar la contraseña en este repositorio).
4. Copiar su UUID desde Authentication > Users y ejecutar lo siguiente en SQL Editor **reemplazando el UUID**:

```sql
insert into public.profiles (id,nombre,apellido,rol,activo)
values ('UUID-DEL-USUARIO','Nombre','Apellido','SUPER_ADMIN',true);
```

5. Cargar departamentos y servicios (primero departamentos, luego servicios). Ejemplo con nombres *de prueba*, no datos reales:

```sql
insert into public.departments(nombre) values ('Departamento de ejemplo');
insert into public.services(departamento_id,nombre)
select id,'Servicio de ejemplo' from public.departments where nombre='Departamento de ejemplo';
```

**Importante:** no habilitar autorregistro abierto para una aplicación administrativa: crear cuentas desde Supabase Authentication y vincular el perfil con rol y ámbito desde SQL Editor o un flujo administrativo seguro. El rol nunca depende de `user_metadata`. Las cuentas sin perfil activo no ven registros.

## 2. Desarrollo local

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Editar `.env.local` con la URL y la **publishable key** del nuevo proyecto. Nunca poner una `service_role` / secret key en `NEXT_PUBLIC_`. `http://localhost:3000`.

## 3. Publicación Vercel

Importar este repositorio como proyecto Next.js. En Settings > Environment Variables configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para Production (y Preview si corresponde). Ejecutar Deploy. Configurar en Supabase Auth > URL Configuration la URL de producción permitida. El esquema SQL se ejecuta antes de habilitar el sitio. La URL propia de Vercel se genera luego del despliegue: **este repositorio no configura por sí mismo tu cuenta ni publica automáticamente**.

## 4. Migrar los datos desde Sheets

Hacer copia de seguridad y exportar por separado `DEPARTAMENTOS`, `SERVICIOS`, `PERSONAL`, `MOVIMIENTOS`, `EXPEDIENTES`, `PARTES_DIARIOS`. **No subir CSV con datos personales al repositorio**. Mantener un mapa `legacy_id → UUID` para resolver referencias: importar departamentos antes que servicios, estos antes que personal y por último movimientos, expedientes y partes. Adaptar cabeceras y fechas a los campos definidos en `schema.sql`. Validar recuentos y muestras de registros en entorno de prueba antes de deshabilitar GAS. Los datos clínicos van en un circuito aparte, nunca en el CSV operativo.

## Alcance y seguridad

- `SUPER_ADMIN`, `RRHH_ADMIN`, `RRHH`, `DEPARTAMENTO`, `SERVICIO`, `CONSULTA`: las reglas RLS se verifican en PostgreSQL, no solamente en la interfaz.
- Por seguridad, las altas de movimientos están limitadas a RRHH hasta migrar el circuito de aprobación por departamento; no se simula la aprobación.
- El parte no se envía ni se cierra formalmente en esta etapa: solo se guardan filas por fecha/persona/turno. No considerar una selección automática equivalente a un cierre aprobado.
- No se incorpora información clínica/diagnóstica en el esquema operativo. Los documentos y firmas deben almacenarse en buckets privados con políticas independientes cuando se implemente el módulo.
- La lista de personal/movimientos muestra hasta 100 resultados y la del parte hasta 250. Agregar paginación real antes de importar un volumen alto.
- Para producción: añadir pruebas E2E con roles reales, auditoría de las políticas, backups, importación verificada y validación institucional de datos personales.
