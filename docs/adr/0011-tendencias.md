# ADR 0011: Notas de tendencia detectadas por el sitio

**Estado:** aceptado (6 nov 2026)

## Contexto

MeContaron pasó a ser un diario nacional. Manu pidió un sistema automático que publique "noticias verdaderamente tendencia" y eligió que se publiquen solas, hasta 15 por día. El asistente de redacción corre en un entorno de nube sin salida a los medios; el sitio (Vercel) sí la tiene, como con las fotos (ADR 0009).

## Decisión

- **Tendencia = varias fuentes a la vez.** `GET /api/assistant/trends` lee Google Trends Argentina, Google Noticias y los RSS de medios grandes (lista fija en `src/server/services/trends.ts`). Agrupa los titulares que comparten al menos dos palabras significativas y sólo devuelve temas cubiertos por 3 fuentes distintas o más (`?min=` entre 2 y 6). Suman puntos las fuentes, coincidir con una búsqueda en alza de Google Trends y ser reciente.
- **Sin repetir:** la respuesta trae las notas publicadas en el portal en las últimas 48 horas.
- **Leer la fuente:** `GET /api/assistant/trends/read?url=` devuelve el texto de una nota, sólo de los medios de la lista, por HTTPS y siguiendo hasta tres redirecciones dentro de la lista. Así la API no sirve para pedir cualquier URL.
- **Nota propia:** el asistente escribe con sus palabras, cita las fuentes (obligatorio en la API de notas) y usa fotos con licencia libre. No copia párrafos ni fotos de otros medios.
- **Volumen:** hasta 15 notas por día, entre las 7 y las 24 (hora de Buenos Aires). El tope duro de la API sigue en 20 por 24 horas.

## Riesgos

- Un medio puede cambiar o cerrar su RSS: la respuesta informa el estado de cada fuente y el resto sigue funcionando.
- El agrupamiento por palabras puede juntar temas distintos o separar uno mismo; el asistente decide con los titulares a la vista.
- Publicar sin revisión humana: la nota cita fuentes y Manu puede corregirla o despublicarla desde el panel.
