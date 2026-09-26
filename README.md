# SGA · Next.js + Google Apps Script + Google Sheets + Vercel

Interfaz web responsive del **Sistema de Gestión Administrativa (SGA)**. Esta versión no migra todavía la base: utiliza el mismo proyecto de Google Apps Script y las mismas Google Sheets que ya usa la interfaz actual.

## Arquitectura actual

```text
                       Google Sheets
                            ↑
                    Google Apps Script
                   lógica + permisos + sesión
                      ↑              ↑
             interfaz GAS        doPost API
                 PC                 ↑
                                  Vercel
                                    ↑
                                  Next.js
                              PC / tablet / móvil
```

No existe sincronización entre dos bases: ambas interfaces leen y escriben el mismo backend.

## Qué incluye Next.js

- Login con el mismo usuario y contraseña del SGA actual.
- Sesión protegida en cookie `HttpOnly`; el token de Apps Script no queda disponible para JavaScript del navegador.
- Dashboard con totales, vencimientos administrativos y calendario según permisos.
- Búsqueda global por LP, apellido, nombre, DNI o CUIL.
- Departamentos y Servicios: consulta y mantenimiento cuando el perfil tiene permiso.
- Usuarios: listado y administración para perfiles habilitados.
- Funciones departamentales: asignaciones por departamento/servicio.
- Personal: filtros, búsqueda, paginación, ficha integral, alta/edición básica conservando los campos no visibles.
- Movimientos: listado, filtros y alta usando las validaciones actuales de Apps Script.
- Gestión de licencias médicas: consulta, detalle, borrador, comprobante y registración con las reglas del backend existente.
- Expedientes: listado, filtro por LP y alta.
- Documentación: catálogo, consulta, carga de archivos, apertura y anulación según permisos.
- Parte diario: lectura de novedades automáticas, borrador y envío formal.
- Libro Report: consulta y registro de novedades según ámbito.
- Mensajes: bandeja, detalle, confirmación de lectura y envío a destinos autorizados.
- Reportes: personal, movimientos, licencias y expedientes con exportación a Excel.
- Respeta los permisos y el ámbito definidos en el backend actual.
- Diseño desktop responsive y navegación mobile-first.

Todavía no se considera paridad total con todos los circuitos especializados del Apps Script. Quedan para una etapa posterior el tablero avanzado de partes, bandeja RR. HH., consolidación/recepción, rectificaciones/seguimiento y algunos flujos clínicos/documentales específicos.

## 1. Agregar el puente al Apps Script actual

El archivo `backend-apps-script/ApiNext.js` debe copiarse al **mismo proyecto Apps Script que actualmente ejecuta el SGA**. No reemplaza ningún archivo existente y no modifica `doGet()`.

En Apps Script:

1. Crear un archivo `ApiNext.js`.
2. Copiar el contenido de `backend-apps-script/ApiNext.js`.
3. Ir a **Configuración del proyecto > Propiedades de la secuencia de comandos**.
4. Crear:

```text
SGA_NEXT_API_KEY = un-secreto-aleatorio-largo
```

Debe tener al menos 24 caracteres. No guardar ese valor en GitHub.

5. Crear una nueva versión del Apps Script y actualizar/crear el despliegue de **Aplicación web**.
6. Ejecutar como el propietario del SGA.
7. Dar el acceso necesario para que Vercel pueda llamar la URL sin una sesión Google interactiva. En cuentas que lo permitan, `Cualquier usuario`.
8. Copiar la URL final que termina en `/exec`.

La interfaz original Apps Script continúa usando `google.script.run` y sigue funcionando como antes.
> **Importante al actualizar esta rama:** cuando `backend-apps-script/ApiNext.js` cambie, también hay que reemplazar ese archivo en el proyecto Apps Script y actualizar la implementación de la Aplicación web. La URL `/exec` puede seguir siendo la misma si se actualiza el despliegue existente.


## 2. Variables locales

```powershell
Copy-Item .env.example .env.local
```

Completar:

```env
APPS_SCRIPT_API_URL=https://script.google.com/macros/s/ID_DEPLOY/exec
APPS_SCRIPT_API_KEY=EL_MISMO_VALOR_DE_SGA_NEXT_API_KEY
```

Nunca usar el prefijo `NEXT_PUBLIC_` para estas variables.

## 3. Ejecutar localmente

```powershell
npm install
npm run typecheck
npm run dev
```

Abrir `http://localhost:3000` e ingresar con un usuario real del SGA.

## 4. Vercel

En **Project > Settings > Environment Variables** cargar para Production y Preview:

- `APPS_SCRIPT_API_URL`
- `APPS_SCRIPT_API_KEY`

Después realizar un nuevo deploy.

## Seguridad

- Apps Script mantiene toda la autorización real: rol, departamento, servicio y permisos.
- `ApiNext.js` usa una lista blanca explícita de operaciones; no ejecuta nombres de funciones recibidos desde Internet.
- Vercel agrega el secreto servidor-servidor antes de llamar Apps Script.
- El navegador nunca recibe `APPS_SCRIPT_API_KEY`.
- El token de sesión se almacena como cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Los movimientos y partes continúan usando los locks y validaciones del sistema original, por lo que PC y Next.js pueden convivir sobre las mismas Sheets.

## Futuro Supabase

La migración a Supabase queda postergada. El diseño SQL inicial se conserva únicamente como referencia en `docs/future-supabase/schema.sql`; **no se utiliza en esta versión**.
