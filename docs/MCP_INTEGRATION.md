# Integración de Modelos de Lenguaje y MCP Server

NodeTerm integra un servidor Model Context Protocol (MCP) que permite a asistentes de IA interactuar de forma controlada y segura con los terminales y conexiones SSH configuradas.

---

## 1. Arquitectura del Servidor MCP (`nodeterm`)

El servidor MCP de NodeTerm expone herramientas divididas en dos modalidades:

### 1.1 Ejecución Directa SSH (Rápida / No interactiva)
- **Herramienta principal**: `run_ssh_command`
- **Uso**: Para consultas rápidas de estado (`uptime`, `docker ps`, `cat log`, etc.).
- **Comportamiento**: Abre una conexión SSH rápida en segundo plano, ejecuta el comando y devuelve el `stdout`/`stderr` en 1-2 segundos sin requerir una pestaña gráfica abierta.

### 1.2 Sesión Gráfica / Interactiva (Con pestaña en UI)
- **Herramientas**: `list_open_terminals`, `open_terminal`, `run_terminal_command`, `read_terminal_buffer`, `wait_terminal_pattern`.
- **Uso**: Para flujos interactivos, prompts visibles para el usuario o comandos que requieren elevación (`sudo`).
- **Inyección de credenciales segura**: Mediante `inject_secret` y tickets temporales emitidos por `wait_terminal_pattern`, asegurando que las contraseñas nunca viajan en claro en los prompts o buffers del modelo.

---

## 2. Gestión de Contexto y Sliding Window

Para terminales con alta emisión de logs:
- **Lectura acotada de buffer**: `read_terminal_buffer` restringe la lectura a un número configurable de líneas (por defecto 80 líneas) para no saturar la ventana de contexto de los modelos.
- **Detección de patrones**: En lugar de enviar un volcado continuo, se usa `wait_terminal_pattern` para esperar estados concretos (prompts de shell, confirmaciones, etc.) antes de continuar la ejecución de herramientas.

