# Puente Apps Script → Next.js

`ApiNext.js` se agrega al **mismo proyecto Apps Script que hoy usa el SGA**. No reemplaza `Code.js`: el `doGet()` actual continúa sirviendo la interfaz de escritorio y este archivo aporta únicamente `doPost()` para Next.js.

## Activación

1. En Apps Script crear un archivo `ApiNext.js` y copiar el contenido de este archivo.
2. En **Configuración del proyecto > Propiedades de la secuencia de comandos**, agregar `SGA_NEXT_API_KEY` con un secreto aleatorio de al menos 24 caracteres.
3. Crear una **nueva versión** y actualizar/crear el despliegue de tipo **Aplicación web**:
   - Ejecutar como: el propietario del SGA.
   - Acceso: el necesario para que el servidor de Vercel pueda llamar la URL sin una sesión Google interactiva. En cuentas que lo permitan, `Cualquier usuario`.
4. Copiar la URL terminada en `/exec`.
5. En Vercel definir `APPS_SCRIPT_API_URL` con esa URL y `APPS_SCRIPT_API_KEY` con exactamente el mismo secreto.

El secreto nunca debe ir en una variable `NEXT_PUBLIC_*` ni subirse a GitHub.
