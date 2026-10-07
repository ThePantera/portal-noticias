# ADR 0010: Reacciones con emojis

**Estado:** aceptado e implementado (7 oct 2026)

## Decisión

Debajo de cada nota publicada los lectores pueden reaccionar con cualquier emoji, sin cuenta.

- **Qué se ofrece:** una fila de emojis frecuentes (👍 ❤️ 😂 🤯 🔥 🚀 🤓 🐛), los que ya usaron otros lectores con su conteo, y "Otro emoji", que abre un selector por grupos y un campo para escribir o pegar cualquier emoji. Tocar uno lo pone; tocarlo de nuevo lo saca. Cada persona puede dejar varios.
- **Qué es un emoji:** exactamente una secuencia `RGI_Emoji` de Unicode (incluye tonos de piel, banderas y secuencias como 👩‍💻). Se valida en el servidor con `normalizeEmoji` (`src/lib/reactions.ts`); el texto suelto, varios emojis juntos o HTML se rechazan.
- **Identidad anónima:** el primer toque crea la cookie `portal_lector` (aleatoria, `httpOnly`, dos años). En la base se guarda sólo su SHA-256 (`article_reactions.visitor_hash`), con una reacción por emoji, nota y navegador (índice único).
- **Topes contra abuso sin login:** hasta 6 emojis por persona y nota, 40 emojis distintos por nota, 120 reacciones por hora desde una misma IP y 8 veces el mismo emoji en la misma nota desde una IP (alcanza para una casa u oficina). La IP se guarda sólo en hash (`ip_hash`). La API acepta pedidos sólo desde el propio sitio (`Origin` y `Sec-Fetch-Site`) y en JSON.
- **API:** `GET /api/reacciones/:articleId` devuelve `{ reactions: [{ emoji, count }], mine: [emoji] }`; `POST` con `{ emoji }` pone o saca y devuelve lo mismo. Sólo para notas publicadas; si no, 404. Si se pasa un tope, 429 con el motivo en español. Nunca se guarda en caché.
- **Página:** la nota sigue saliendo de caché. El componente `ArticleReactions` pide los conteos al cargar y muestra cada toque al instante; si el servidor lo rechaza, vuelve a lo que diga él.

## Preparado para el login

`article_reactions.user_id` (opcional, con su índice único por nota y emoji) queda listo para cuando haya cuentas de lectores: entonces la reacción se asociará a la persona y la cookie servirá para pasar las reacciones anónimas a su cuenta.

## Consecuencias

Sin login, alguien decidido puede inflar conteos borrando cookies y cambiando de conexión; los topes por IP lo hacen lento, no imposible. Borrar una nota borra sus reacciones.
