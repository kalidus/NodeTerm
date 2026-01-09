# Plan de Pruebas - Refactor MCP y Orquestación

## Objetivos
- Conversaciones largas sin duplicados ni loops.
- Mensajes estructurados: `assistant_tool_call` y `tool`.
- Dedupe por args + anti-loop en el mismo turno.
- Keepalive estable con un solo timer.
- Trazas por `turnId`/`toolCallId` en metadatos.

## Escenarios Manuales
1) Listar → Escribir → Listar
   - Un bloque `tool` por acción y “Hecho.” final limpio.
2) read_text_file repetido (head:0, tail:0)
   - La segunda petición con args equivalentes se omite.
3) Cancelación
   - Durante tool; no se inyectan observaciones tardías.
4) Keepalive
   - Comprobar un ping cada ~30s, sin ráfagas.

## Unit (esqueleto)
- Orchestrator: normalización de args, TTL dedupe, anti-loop.
- AIService: integra orquestador al detectar tool-call.
- MCPService: un solo timer y throttle de capabilities.

