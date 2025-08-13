# NodeTerm v1.5.0

Fecha: 2025-08-13

## Novedades principales

- RDP embebido con Guacamole dentro de pestañas.
- Las conexiones RDP ya no dependen de una ventana externa de MSTSC.
- Pestañas dedicadas con controles propios y manejo de errores/timeout.
- Ajuste automático al contenedor y mejores mensajes de estado.
- Backend guacd con autodetección y fallback: Docker Desktop → WSL → nativo → mock.
- Selector de terminal local: se oculta RDP y se listan las distros WSL detectadas.
- Detección robusta de WSL: soporte para nombres como Ubuntu-24.04.1.
- Varias mejoras de estabilidad, rendimiento y ajustes menores de UI.

## Cambios técnicos destacados

- TabbedTerminal: eliminación de RDP (Guacamole) del menú de terminales locales y pestañas RDP dedicadas.
- main.js: nueva detección WSL (primero "wsl -l -q", luego fallback) y mapeo automático de ejecutables Ubuntu YYMM.
- GuacdService: estrategia de arranque preferente Docker → WSL → nativo → mock.
- Actualización de versión en package.json, src/version-info.js, UI y documentación.

## Instrucciones y requisitos de RDP (Guacamole)

- Requiere uno de los siguientes entornos:
  - Docker Desktop habilitado, o
  - WSL con distribución Linux funcional, o
  - Ejecución de guacd nativo en el sistema.
- Compartición de unidad temporal/hogar disponible para redirección de archivos.

## Notas de actualización

- No se requieren migraciones de datos.
- Recomendado actualizar a esta versión para disfrutar de la integración RDP embebida y mejoras en WSL.

---

Para más detalles consulte el README y el changelog.
