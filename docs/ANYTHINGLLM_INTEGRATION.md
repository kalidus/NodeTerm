# Integración de AnythingLLM en NodeTerm

## Resumen
- Se ejecuta una instancia local mediante Docker (`mintplexlabs/anythingllm:latest`).
- El contenedor se maneja automáticamente desde el proceso principal a través de `AnythingLLMService`.
- La UI se muestra dentro de una pestaña dedicada mediante un `webview`, manteniendo la experiencia original del producto.

## Requisitos
1. **Docker Desktop** (Windows/macOS) o Docker Engine (Linux) instalado y en ejecución.
2. Permiso para descargar imágenes (≈2 GB en la primera descarga).
3. Puerto `3001` libre en el host (puede modificarse con `NODETERM_ANYTHINGLLM_PORT`).

## Detalles técnicos
| Elemento | Valor por defecto |
| --- | --- |
| Imagen | `mintplexlabs/anythingllm:latest` |
| Contenedor | `nodeterm-anythingllm` |
| Puerto host | `3001` (mapeado a `3001` interno) |
| Volumen | `<userData>/anythingllm-data:/app/server/storage` |
| Telemetría | Se desactiva automáticamente con `DISABLE_TELEMETRY=true` |

### Variables de entorno soportadas
- `NODETERM_ANYTHINGLLM_IMAGE` – Cambia la imagen (p. ej. un tag específico).
- `NODETERM_ANYTHINGLLM_PORT` – Puerto host.
- `NODETERM_ANYTHINGLLM_CONTAINER` – Nombre del contenedor.
- `NODETERM_ANYTHINGLLM_DATA` – Directorio local para la persistencia.
- `NODETERM_ANYTHINGLLM_URL` – URL base personalizada (se usa tanto en IPC como en el `webview`).

## Flujo de arranque
1. El renderer solicita la pestaña AnythingLLM.
2. Se invoca `anythingllm:start` vía IPC.
3. El servicio verifica Docker, descarga la imagen si falta, prepara el volumen y crea/arranca el contenedor.
4. Se espera el endpoint `GET /api/health` hasta 90 s antes de dar por listo el servicio.
5. La pestaña incrusta `http://127.0.0.1:3001` (o la URL configurada) en un `webview`.

## Solución de problemas rápida
| Síntoma | Acción recomendada |
| --- | --- |
| “Docker Desktop no está en ejecución” | Abrir Docker Desktop y reintentar desde la pestaña. |
| No se puede descargar la imagen | Verificar conexión o usar `docker pull mintplexlabs/anythingllm:latest` manualmente. |
| Puerto ocupado | Ajustar `NODETERM_ANYTHINGLLM_PORT` y reiniciar NodeTerm. |
| Datos perdidos | Revisar el volumen en `<userData>/anythingllm-data`. Se puede reutilizar en otra máquina copiando la carpeta. |

## Comandos útiles
```powershell
# Ver estado
docker ps --filter "name=nodeterm-anythingllm"

# Ver logs
docker logs -f nodeterm-anythingllm

# Detener manualmente
docker stop nodeterm-anythingllm && docker rm nodeterm-anythingllm
```

> **Nota:** No es necesario iniciar AnythingLLM fuera de NodeTerm; el servicio se encargará de crearlo, actualizarlo y reiniciarlo cuando sea necesario.

