# 🧠 Gestión de Memoria de Modelos IA

> **Sistema completo de monitoreo de RAM y GPU para modelos Ollama**

---

## ✅ Estado

✅ **COMPLETADO** - Widget con datos REALES de RAM y GPU en tiempo real

---

## 📊 Lo que Muestra el Widget (Ctrl+M)

```
💻 Sistema: 8000MB / 16000MB (50%)
🎮 GPU: NVIDIA - 4.5GB / 8.0GB (56%)

▼ 🧠 Modelos en RAM: 2
  📦 gpt-oss:20b     13.88GB    ⬇️
  📦 llama3.2         7.59GB    ⬇️
```

---

## 🎯 Características

✅ **RAM Monitor** - Datos REALES del sistema cada 5 segundos
✅ **GPU Support** - NVIDIA, AMD, Apple Silicon
✅ **Modelos Ollama** - Lista de modelos cargados
✅ **Liberar de RAM** - Botón para descargar sin borrar archivo
✅ **Protección** - Modelos NUNCA se borran, permanecen en `~/.ollama/models/`
✅ **Auto-restore** - Reiniciar restaura el último modelo usado

---

## 🔧 Archivos Modificados

1. `src/main/handlers/system-handlers.js` - IPC handlers
2. `preload.js` - APIs de sistema
3. `src/services/ModelMemoryService.js` - Obtiene datos reales
4. `src/components/ModelMemoryIndicator.jsx` - Widget UI

---

## 📖 Documentación Completa

→ **`docs/REFACTOR_MEMORIA_MODELOS_IA.md`** - Toda la información técnica detallada

---

## 🚀 Usar

```
Presionar: Ctrl+M
→ Se abre widget de memoria con datos REALES
→ Ver RAM, GPU, modelos cargados
→ Click ⬇️ para liberar modelo de RAM (archivo protegido)
```

---

**Listo para usar** ✨

