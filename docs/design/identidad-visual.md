# Identidad visual (propuesta, Fase 1)

Vista previa navegable: `docs/design/preview.html`. Tokens: `src/styles/tokens.css`.

## Concepto
Tinta azul petróleo sobre papel frío. Transmite información y calma, no alarma. El rojo se reserva para "En vivo" y "Último momento", así conserva su urgencia. Sin gradientes decorativos, sombras ni tarjetas con caja: la jerarquía la dan la tipografía, las imágenes y los filetes.

## Paleta (claro / oscuro)
| Token | Claro | Oscuro | Uso | Contraste sobre el fondo (claro) |
|---|---|---|---|---|
| paper | #f6f7f7 | #0e1419 | Fondo | — |
| surface | #ffffff | #151d24 | Panel, menús | — |
| ink | #0f1a22 | #e7ecef | Texto principal | 16.4:1 |
| ink-muted | #4a5762 | #a7b3bc | Bajadas, metadatos | 6.9:1 |
| ink-subtle | #5f6b75 | #8a96a0 | Fechas, créditos | 5.1:1 |
| rule | #d9dee2 | #26323b | Filetes | — |
| accent | #0c5c6c | #5fb7c7 | Volantas, enlaces, foco | 7.1:1 |
| live | #c4242b | #ff5a5f | En vivo | 5.4:1 |

Los estados del panel (borrador, programada, publicada, archivada) usan colores semánticos propios, distintos del acento.

## Tipografía
- **Newsreader** (serif de Production Type, diseñada para noticias en pantalla, con eje óptico): titulares y cuerpo de nota.
- **Libre Franklin** (heredera de la Franklin Gothic de los diarios): navegación, volantas, metadatos, botones y panel.
- Se sirven con `next/font` desde el propio dominio: sin pedidos a Google en producción y sin saltos de diseño por la carga de fuentes.

Escala (base 16, razón ~1.25): 12 · 14 · 16 · 19 (cuerpo de nota) · 22 · 28 · 36 · 48 · 60. Interlineado: 1.1 en titulares y 1.6 en el cuerpo. Ancho del cuerpo de nota: 40rem (~68 caracteres).

## Espaciado y forma
Base de 4px (4, 8, 12, 16, 24, 32, 48, 64). Radios de 2px en imágenes y botones y de 4px en inputs: casi rectos, como un diario. Sin sombras.

## Componentes editoriales
- **Nota principal:** imagen 16:9, volanta, título de 36 a 60 px, bajada y firma. Ocupa 8 de 12 columnas.
- **Secundarias:** columna de 4/12 con hasta tres notas; puede incluir una pieza "En vivo" sin imagen.
- **Bloque de sección:** encabezado con filete grueso de 2px, nombre en versalitas de Franklin, enlace "Ver todas" y tres notas.
- **Minuto a minuto:** lista con hora tabular y titular corto.
- **Tarjeta:** sin caja; imagen, volanta, título, bajada y firma.
- **Nota:** volanta, H1, bajada, firma con tiempo de lectura y botones de compartir (WhatsApp, X, Facebook, copiar enlace), imagen con epígrafe y crédito, cuerpo, citas con filete de acento, tags y relacionadas.
- **Navegación:** fila de secciones que se desliza en mobile; la sección activa lleva un subrayado de 2px.
- **Botones:** primario en tinta (Publicar ahora), acento (Programar), fantasma (Guardar borrador), peligro (Eliminar).

## Verificación
Playwright en 1440, 820 y 390 px, temas claro y oscuro: sin scroll horizontal, sin errores de consola y fuentes cargadas. Contraste medido con la fórmula WCAG 2.x.
