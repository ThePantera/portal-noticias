# Skills del proyecto

Las skills de esta carpeta las usa Claude Code en cada sesión que trabaje sobre este repo. Están copiadas tal cual de sus repositorios originales, sin modificaciones.

| Skill | Origen | Para qué sirve acá |
| --- | --- | --- |
| `find-skills` | [vercel-labs/skills](https://github.com/vercel-labs/skills) | Buscar otras skills. Manu la pidió el 7 oct 2026. |
| `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Rendimiento de React y Next.js. |
| `web-design-guidelines` | vercel-labs/agent-skills | Revisión de interfaz y accesibilidad. |
| `react-view-transitions` | vercel-labs/agent-skills | Animaciones y transiciones entre páginas. |

En las sesiones de nube el registro de npm está bloqueado, así que `npx skills add` no anda. Para sumar otra skill hay que copiar su carpeta desde GitHub (`git clone --depth 1`) a `.claude/skills/`.
