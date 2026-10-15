---
name: peruandes-ui-design
description: Crear o modificar interfaces de Perú Andes con React o Astro, tokens, responsive y accesibilidad. Aplicar a pantallas y estados visuales, no a reglas de negocio ni persistencia.
---

# Diseño de interfaz de Perú Andes

Adaptada de `tmb-ui-design`. Reutilizar composición, tokens y accesibilidad sin trasladar la identidad visual de TMB. Revisar pantalla y estilos existentes; consultar Context7 para sintaxis específica de librerías.

## Tokens y componentes

- En Next.js, revisar `src/app/globals.css` y Tailwind CSS 4. Centralizar decisiones compartidas en tokens semánticos; crear solo los necesarios. Usar `@theme inline` cuando dependan de otras variables CSS.
- Astro tiene estilos propios: no hereda Tailwind ni estilos globales de Next.js. Compartir estilos solo cuando exista necesidad real.
- No presentar colores, fuentes o logos nuevos como identidad aprobada. Seguir contexto del encargo y decisiones existentes.
- Usar utilidades completas y estáticas, sin construir clases mediante fragmentos dinámicos.
- Extraer primitivas por reutilización o interacción coherente. Preferir composición y variantes tipadas a booleanos ambiguos.
- Usar enlaces para navegación y botones para acciones, preservando atributos HTML y eventos.
- Mantener UI ajena a Supabase y reglas del negocio. No instalar librerías de componentes, iconos o animación solo por aplicar esta skill.

## Pantallas y estados

Conservar jerarquía de títulos y acciones, anchos y espaciado coherentes. Diseñar para móvil y ampliar según contenido. En tablas, elegir scroll o alternativa conservando información y acciones.

Representar carga, vacío, error, éxito y deshabilitado cuando correspondan. Diferenciar fallos de ausencia de datos. Mostrar feedback durante envíos, evitar duplicados y respetar reducción de movimiento.

Campos con etiquetas, errores asociados mediante `aria-describedby` y `aria-invalid`; anunciar errores y resultados sin depender solo del color. Verificar foco visible, teclado y contraste. En modales, verificar entrada y retorno del foco.

Revisar en navegador tamaños e interacciones afectados y ejecutar las comprobaciones pertinentes. Informar verificaciones visuales no realizadas; compilación y lint no demuestran calidad visual.
