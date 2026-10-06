# ADR 0008: Asistente de redacción con permiso para publicar

**Estado:** aceptado e implementado (6 oct 2026)

## Contexto

La primera etapa pedía que la IA no publicara sola: todo entraba como borrador y lo publicaba una persona. El 6 de octubre de 2026 Manu dio por cerrada esa etapa y pidió que el asistente publique tres notas por día (8, 14 y 21 h, hora de Buenos Aires), además de programar, corregir y eliminar notas cuando él lo autorice.

## Decisión

- **API propia** en `/api/assistant/articles` y `/api/assistant/articles/[id]`, con `Authorization: Bearer $ASSISTANT_API_KEY` comparado en tiempo constante. Sin la variable, responde 503: nunca queda abierta.
- **Mismos servicios que el panel**: `createArticle`, `updateArticle`, `transitionArticle` y `deleteArticle`. Valida y sanitiza igual (incluido el documento contra XSS), respeta la tabla de estados (lo publicado se archiva antes de eliminarlo) y escribe sus eventos en el outbox con el usuario del asistente como actor.
- **Usuario propio** `asistente@portal-noticias.invalid` ("Redacción"), rol EDITOR, `isActive=false` y un hash de contraseña inválido: no puede iniciar sesión ni usar sesiones, y no puede administrar usuarios. El rol se fija en código, no se lee de la base.
- **Origen** `AI_ASSISTED` en las notas que crea. El editor del panel muestra un aviso en esas notas.
- **Fuentes obligatorias** (http/https, de 1 a 10) al crear: se agregan al final del cuerpo como un párrafo "Fuentes" con enlaces. Las fotos necesitan descripción y crédito, y pasan por la misma validación con sharp que las subidas del panel (ADR 0005), con un tope de 3 MB porque viajan en base64.
- **Tope** de 20 notas nuevas por 24 horas, para acotar el daño si la llave se filtra.
- **Caché**: `revalidateTag(tag, { expire: 0 })`, para que una corrección o una baja se vea en el próximo pedido. El publicador de programadas pasó a hacer lo mismo.
- **Eliminar** sólo con autorización explícita de Manu en el chat: es una regla de proceso del asistente, no de la API.

## Riesgos

- Una llave filtrada permite publicar. Se mitiga con el tope diario, la llave sólo en variables de entorno (Vercel y el environment de Claude, nunca en el chat ni en el repositorio) y la rotación inmediata (cambiarla y hacer Redeploy).
- Errores de contenido: cada nota cita sus fuentes y queda registrada en `domain_events`, y Manu puede corregirla o despublicarla desde el panel.
