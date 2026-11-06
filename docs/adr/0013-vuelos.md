# ADR 0013: Vuelos en vivo

**Estado:** aceptado e implementado (6 nov 2026)

## Contexto

Manu pidió sumar un mapa de vuelos en vivo como el de Flightradar24, centrado en Buenos Aires. Los términos de Flightradar24 permiten el uso gratuito sólo para fines personales y no comerciales; mostrarlo en un sitio público exige su suscripción Business o su API paga, y prohíben leer el sitio con programas. Por eso no se incrusta ni se copia.

## Decisión

La página `/vuelos` (en el menú, después de Mercados) tiene un mapa propio con los aviones que vuelan en un radio de 250 millas náuticas (~460 km) alrededor del Obelisco.

- **Datos:** adsb.lol, red abierta de receptores ADS-B. Su API es gratis y sin llave, y los datos tienen licencia ODbL (la de OpenStreetMap): se pueden usar, también con fines comerciales, citando la fuente. La página la cita junto al mapa y en la atribución. adsb.lol avisa que en el futuro puede pedir una llave (que se consigue aportando un receptor); si pasa, la página muestra que no hay datos y el resto del sitio no se entera.
- **Pedido:** `GET /api/vuelos` llama a `https://api.adsb.lol/v2/point/{lat}/{lon}/250` (`src/server/services/flights.ts`), valida con zod y recorta cada avión a lo que se muestra (`parseAdsbLol` en `src/lib/flights.ts`). La CDN guarda la respuesta 10 segundos, así que adsb.lol recibe pocos pedidos aunque haya muchos lectores. El navegador la vuelve a pedir cada 15 segundos mientras la pestaña está a la vista (`useFlights`).
- **Mapa:** Leaflet 1.9.4 desde unpkg, con versión fija y hash de integridad (SRI). Se carga sólo en `/vuelos` y no suma dependencias. Las teselas son las de OpenStreetMap, con su atribución, pasadas a gris cálido por CSS para que combinen con el papel; en oscuro se invierten. Los controles siguen el estilo del diario: filete de tinta, sin sombras ni radios.
- **Lectura sin mapa:** la ficha del avión elegido y la lista de todos los vuelos son HTML común, así que la página se puede usar con teclado o lector de pantalla y sigue andando si el mapa no carga.

## Consecuencias

Las teselas de OpenStreetMap están pensadas para uso moderado. Si `/vuelos` tuviera mucho tráfico, conviene pasar a un proveedor de teselas propio o pago (o a OpenFreeMap con MapLibre). No todos los aviones transmiten ADS-B y la cobertura depende de los receptores voluntarios de la zona: la página lo aclara.
