# Publicar el portal en Vercel con Neon

Guía paso a paso para poner el portal online por primera vez. Se hace una sola vez; después, cada cambio que se mergea a `main` se publica solo.

- **Vercel** aloja la aplicación (Next.js). Plan Hobby, gratis.
- **Neon** es la base PostgreSQL. Se crea desde Vercel y queda conectada sola. Plan Free.

No hace falta instalar nada en tu computadora: todo se hace desde el navegador.

> Los nombres de los botones son los de Vercel y Neon en octubre de 2026. Si alguno cambió, buscá la opción equivalente.

## Qué hace el deploy por vos

En cada deploy Vercel corre `npm run vercel-build`, que hace tres cosas en orden:

1. `prisma migrate deploy`: crea o actualiza las tablas de la base.
2. `npm run db:bootstrap`: si la base está vacía, carga las 10 categorías y crea el administrador con los datos de `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD`. Si ya hay datos, no toca nada.
3. `next build`: compila el sitio.

Si algo falla, el deploy se corta y el sitio anterior sigue funcionando.

## Paso 1. Mergear los PRs en orden

Vercel publica lo que está en `main`, y hoy `main` sólo tiene la documentación de las Fases 0 y 1. Los PRs, del #1 al #5, están apilados (cada uno parte del anterior), así que hay que mergearlos **en orden** y **con merge commit**.

Para cada PR, empezando por el #1:

1. Abrí el PR en GitHub y fijate que arriba diga **"wants to merge into `main`"**.
2. En el botón verde elegí **"Create a merge commit"**. No uses "Squash and merge": rompe los PRs que vienen después.
3. Tocá **"Confirm merge"**.
4. Tocá **"Delete branch"**. Esto es lo que hace que GitHub cambie solo el destino del PR siguiente a `main`.

Seguí con el siguiente. Si un PR todavía dice que va a una rama `fase-…` en vez de `main`, es porque no se borró la rama del anterior: borrala y recargá la página.

## Paso 2. Crear la cuenta y el proyecto en Vercel

1. Entrá a [vercel.com/signup](https://vercel.com/signup) y registrate con **"Continue with GitHub"**, usando la cuenta `ThePantera`. Elegí el plan **Hobby**.
2. En el panel tocá **"Add New…" → "Project"**.
3. En la lista de repositorios buscá `portal-noticias` y tocá **"Import"**. Si no aparece, tocá **"Adjust GitHub App Permissions"** y dale acceso a ese repositorio.
4. En la pantalla de configuración:
   - **Framework Preset**: tiene que decir **Next.js** (lo detecta solo).
   - **Build Command**: no lo toques. Vercel usa `vercel-build` automáticamente.
   - Abrí **"Environment Variables"** y agregá estas cuatro:

     | Nombre           | Valor                                                                     |
     | ---------------- | ------------------------------------------------------------------------- |
     | `SITE_NAME`      | El nombre del portal, por ahora `Portal Noticias`                         |
     | `ADMIN_EMAIL`    | Tu email, con el que vas a entrar al panel                                |
     | `ADMIN_NAME`     | Tu nombre como querés que aparezca en las firmas                          |
     | `ADMIN_PASSWORD` | Una contraseña de **al menos 12 caracteres**. Guardala en un lugar seguro |

5. Tocá **"Deploy"**.

**Este primer deploy va a fallar, y es esperado**: todavía no hay base de datos. Vas a ver un error de Prisma sobre la URL de la base. Seguí con el paso 3.

## Paso 3. Crear la base en Neon desde Vercel

1. Entrá al proyecto `portal-noticias` en Vercel y abrí la pestaña **"Storage"**.
2. Tocá **"Create Database"**, elegí **Neon** y **"Continue"**.
3. Configurala así:
   - **Region**: **São Paulo (sa-east-1)**, la más cercana a Argentina.
   - **Plan**: **Free**.
   - **Database name**: `portal-noticias`.
4. Tocá **"Create"** y aceptá los términos de Neon si te los pide.
5. Cuando pregunte a qué proyecto conectarla, elegí `portal-noticias` con los entornos **Production**, **Preview** y **Development** marcados, y tocá **"Connect"**.

Para comprobarlo, andá a **Settings → Environment Variables**: tienen que aparecer, entre otras, `DATABASE_URL` y `DATABASE_URL_UNPOOLED`. No hace falta copiarlas a ningún lado.

## Paso 4. Poner las funciones cerca de la base

Así cada consulta no cruza el continente.

1. En el proyecto, **Settings → Functions**.
2. En **"Function Region"** elegí **São Paulo, Brazil (gru1)** y guardá.

## Paso 5. Volver a publicar

1. Abrí la pestaña **"Deployments"**.
2. En el deploy que falló, tocá los tres puntos **⋯ → "Redeploy"** y confirmá.
3. Abrí el deploy para ver el log. Entre las líneas tienen que aparecer:

   ```
   All migrations have been successfully applied.
   Categorías: 10 creadas.
   Administrador creado: tu@email.com. Ya podés borrar ADMIN_PASSWORD del entorno.
   ```

4. Cuando termine, el estado pasa a **Ready**.

## Paso 6. Probarlo

Vercel te da una dirección del tipo `https://portal-noticias-xxxx.vercel.app` (la ves arriba en el proyecto, en **"Domains"**).

- `https://…vercel.app/` muestra la portada. Por ahora dice "Todavía no hay noticias publicadas": es correcto, la portada que lee las notas llega en la Fase 7.
- `https://…vercel.app/admin` te lleva al login. Entrá con `ADMIN_EMAIL` y `ADMIN_PASSWORD` y tenés que ver el tablero.
- `https://…vercel.app/api/health` tiene que responder `"status":"ok"` y `"database":"ok"`.

## Paso 7. Borrar la contraseña de Vercel

El administrador ya existe y la contraseña quedó guardada como hash en la base. La variable ya no se usa, así que no conviene dejarla:

1. **Settings → Environment Variables**.
2. En `ADMIN_PASSWORD`, tocá **⋯ → "Remove"**.

`ADMIN_EMAIL` y `ADMIN_NAME` pueden quedar; no tienen nada secreto.

## Paso 8. Activar la publicación automática de notas programadas

Cuando programás una nota, la publica un proceso que corre cada 5 minutos desde GitHub. Vercel en el plan gratis sólo permite tareas una vez por día, por eso se usa GitHub Actions, que es gratis para esto. Mientras no hagas este paso, las notas programadas no salen solas, y el tablero te avisa cuando alguna se pasó de hora.

1. **Inventá un secreto** de al menos 32 caracteres, letras y números, sin espacios. Lo más simple es pedirle una contraseña larga al generador de tu navegador o de tu gestor de contraseñas. No lo compartas con nadie, tampoco en el chat.
2. **En Vercel**: **Settings → Environment Variables → Add**. Nombre `CRON_SECRET` y como valor el secreto, para **Production**. Guardá y hacé **Redeploy** del último deploy, como en el paso 5.
3. **En GitHub**, en el repositorio `portal-noticias`: **Settings → Secrets and variables → Actions**.
   - En la pestaña **Secrets**, tocá **"New repository secret"**: nombre `CRON_SECRET` y el mismo valor.
   - En la pestaña **Variables**, tocá **"New repository variable"**: nombre `SITE_URL` y como valor la dirección del sitio, por ejemplo `https://portal-noticias-xxxx.vercel.app`, sin barra al final.
4. **Probalo**: en GitHub, pestaña **Actions → "Publicar notas programadas" → "Run workflow"**. En unos segundos tiene que terminar en verde, y en su log vas a ver `{"published":[]}`, o la lista de notas que publicó.

GitHub puede atrasar estas ejecuciones unos minutos en horas de mucha carga, así que una nota programada a las 9:00 puede salir a las 9:05 o un poco después. La fecha de publicación que se muestra es siempre la que programaste.

## Paso 9. Dar de alta el sitio en Google Search Console

Se hace una sola vez. Después, cada nota que publiques entra sola en el sitemap y Google lo vuelve a leer por su cuenta.

1. Entrá a [search.google.com/search-console](https://search.google.com/search-console) con tu cuenta de Google y tocá **"Agregar propiedad"**.
2. Elegí **"Prefijo de la URL"** (no "Dominio": una dirección `.vercel.app` no permite el método por DNS) y pegá la dirección del sitio, por ejemplo `https://portal-noticias-xxxx.vercel.app`.
3. En los métodos de verificación, abrí **"Etiqueta HTML"** y copiá la etiqueta que te muestra. Empieza con `<meta name="google-site-verification"`.
4. **En Vercel**: **Settings → Environment Variables → Add**. Nombre `GOOGLE_SITE_VERIFICATION` y como valor la etiqueta entera, o sólo el código que está entre las comillas de `content`. Guardala para **Production** y hacé **Redeploy**, como en el paso 5.
5. Cuando termine el deploy, volvé a Search Console y tocá **"Verificar"**.
6. En el menú de la izquierda, entrá a **Sitemaps** y agregá `sitemap.xml`. Después agregá también `news-sitemap.xml`.

Google tarda de unos días a un par de semanas en mostrar los primeros datos. Si después cambiás a un dominio propio, se agrega como una propiedad nueva y se repiten estos pasos.

## De acá en adelante

- **Cada merge a `main`** publica una versión nueva en producción, con las migraciones que traiga.
- **Cada PR** genera una vista previa en una dirección propia, con una copia de la base hecha por Neon. Se puede probar sin tocar producción. El enlace aparece como comentario de Vercel en el PR.
- **Dominio propio**: cuando lo tengas, se agrega en **Settings → Domains**, y conviene definir `SITE_URL` con la dirección completa (`https://tudominio.com`). Mientras no la definas, el sitio usa la dirección `.vercel.app` de producción.

## Si algo sale mal

| Qué ves en el log o en el sitio                                                    | Qué significa y qué hacer                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `La base no tiene administrador. Definí ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD…` | Falta alguna de las tres variables, o la contraseña tiene menos de 12 caracteres. Agregalas en **Settings → Environment Variables** y hacé **Redeploy**.                                                                                                                              |
| Error de Prisma sobre la URL o la conexión a la base                               | La base no está conectada al proyecto: repetí el paso 3. Si en **Environment Variables** la base aparece con otros nombres (por ejemplo `POSTGRES_URL`), avisame y lo ajusto.                                                                                                         |
| Las notas programadas no salen solas                                               | Falta el paso 8, o `CRON_SECRET` no es igual en Vercel y en GitHub. En **GitHub → Actions → "Publicar notas programadas"** el log de la última ejecución dice qué pasó: `No autorizado` es un secreto distinto, y `Falta CRON_SECRET o SITE_URL` es que falta configurarlo en GitHub. |
| `/api/health` responde `503`                                                       | La aplicación anda pero no llega a la base. Revisá en Neon que la base no esté suspendida o borrada.                                                                                                                                                                                  |
| Search Console dice que no encuentra la etiqueta                                   | Falta el **Redeploy** después de cargar `GOOGLE_SITE_VERIFICATION`, o el valor quedó incompleto. Abrí tu sitio, mirá el código de la página (clic derecho → "Ver código fuente") y buscá `google-site-verification`.                                                                  |
| El login dice "Email o contraseña incorrectos"                                     | Revisá la contraseña. Si la perdiste, avisame y te paso cómo cambiarla. Después de 5 intentos fallidos el login se bloquea 15 minutos.                                                                                                                                                |
