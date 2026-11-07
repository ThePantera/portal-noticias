# ADR 0012: publicador automático de notas de tendencia

Fecha: 2026-11-06. Estado: aceptado.

## Contexto

Manu quiere el portal lleno de noticias actuales. Redactar desde una sesión de Claude Code cuesta
mucho por nota (la sesión relee todo su contexto en cada paso) y no llega a "tiempo real". Eligió
un publicador propio con Claude Haiku.

## Decisión

- `POST /api/cron/autopublish` (con `CRON_SECRET`) publica como mucho una nota por llamada:
  1. Lee las tendencias (ADR 0011) y descarta los temas ya cubiertos en las últimas 48 h
     (comparten 3 palabras clave o la mitad) y los que no tienen dos medios legibles.
  2. Lee en paralelo hasta 4 notas de medios distintos (sin Google, sin ediciones extranjeras ni
     coberturas "en vivo") y se queda con 2 o 3 de más de 600 caracteres.
  3. Un solo pedido a la API de Claude (`AUTOPUBLISH_MODEL`, por defecto `claude-haiku-5-5`,
     esfuerzo bajo) con salida estructurada: título, bajada, bloques, sección, etiquetas,
     búsquedas de foto. Las reglas editoriales van en el prompt de sistema
     (`src/lib/autopublish.ts`): datos en dos fuentes, palabras propias, atribución en policiales.
  4. Valida la respuesta (sección existente, 450 palabras o más; se piden 600 a 850), busca foto
     en Commons y publica por el mismo servicio que la API del asistente (ADR 0008), con las fuentes
     al pie. Si la foto falla, la nota sale sin foto.
- Tope: `AUTOPUBLISH_MAX_PER_DAY` (100) notas del asistente por 24 h. La API con llave sigue en 20.
- Lo dispara `.github/workflows/notas-automaticas.yml` cada 15 minutos de 7 a 24 (hora argentina),
  hasta dos notas por vez.
- HTTP directo a la API en lugar del SDK: es un pedido sin herramientas ni streaming y evita
  sumar una dependencia.

## Costo

Por nota: ~6-10 mil tokens de entrada y ~1.500 de salida. Con Haiku 5.5 ($0,10 / $0,50 por
millón) son menos de US$ 0,002 por nota; 100 notas por día, unos US$ 0,20 diarios.

## Consecuencias

- Sin `ANTHROPIC_API_KEY` en Vercel el endpoint responde 503 y el workflow termina sin error.
- Sin revisión humana: un error de dato puede publicarse. Se mitiga con las reglas del prompt,
  fuentes citadas y la posibilidad de corregir o despublicar desde el panel.
