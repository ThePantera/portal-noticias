# ADR 0009: Fotos de Wikimedia Commons descargadas por el sitio

**Estado:** aceptado (7 oct 2026)

## Contexto

Manu pidió que las notas del asistente lleven fotos reales. El asistente corre en un entorno de nube cuya red no llega a Wikimedia ni a los bancos de fotos, y la rutina que publica tres notas por día despierta siempre la misma sesión, así que un cambio en la red del entorno no le llega. Mientras tanto las notas salían con ilustraciones generadas.

## Decisión

- **El sitio busca y descarga las fotos.** Vercel sí tiene salida a internet. El asistente le pide al sitio:
  - `GET /api/assistant/photos?q=texto`: candidatas de Commons con título, licencia, autor y crédito.
  - `image: { commons: "File:…", alt }` al crear o corregir una nota: el sitio descarga la foto y la sube como cualquier otra (ADR 0005).
- **Sólo Commons.** Las consultas van a `commons.wikimedia.org` y las descargas sólo a `upload.wikimedia.org`, por HTTPS y sin seguir redirecciones. No se aceptan direcciones arbitrarias, así que la API no sirve para que el servidor pida cualquier URL.
- **Licencia verificada en el servidor.** Al descargar, el sitio vuelve a consultar la licencia del archivo y sólo acepta dominio público, CC0, CC BY y CC BY-SA (sin NC ni ND). Formatos JPG, PNG y WebP.
- **Crédito automático:** "Autor / Wikimedia Commons, Licencia", de hasta 120 caracteres. El asistente puede mandar otro con `credit`.
- Se sigue aceptando `image.data` en base64 con crédito obligatorio.

## Riesgos

- Commons puede estar caído o lento: la API responde 503 y la nota no se guarda con una foto a medias. Los tiempos de espera son de 8 s para la consulta y 15 s para la descarga.
- La metadata de licencia de Commons la cargan sus usuarios. Se usa la que Commons publica para el archivo, y el crédito enlaza la licencia por su nombre corto.
