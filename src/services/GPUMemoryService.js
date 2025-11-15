/**
 * GPUMemoryService - Monitoreo de memoria VRAM para GPU
 * 
 * Soporta:
 * - NVIDIA (CUDA) via nvidia-smi
 * - AMD (ROCm) via rocm-smi
 * - Apple Silicon via Metal
 */

// ✅ Detectar si estamos en Node.js o navegador
const isNodeEnvironment = typeof window === 'undefined';

// ✅ Cargar child_process SOLO si estamos en Node.js
let childProcess = null;
if (isNodeEnvironment) {
  try {
    childProcess = require('child_process');
  } catch (e) {
    // child_process no disponible
    childProcess = null;
  }
}

class GPUMemoryService {
  constructor() {
    this.gpuInfo = null;
    this.lastUpdate = 0;
    this.updateInterval = 5000; // 5 segundos
    this.gpuType = null; // 'nvidia', 'amd', 'apple', null
    this.cacheTime = 5000;
  }

  /**
   * 🎮 Detectar tipo de GPU disponible
   */
  async detectGPU() {
    if (this.gpuType) return this.gpuType; // Cachear resultado

    if (!childProcess) {
      console.warn('[GPUMemory] No se puede ejecutar comandos (navegador)');
      return null;
    }

    // 1. Intentar NVIDIA
    try {
      const result = await this._executeCommand('nvidia-smi', ['--version']);
      if (result) {
        this.gpuType = 'nvidia';
        console.log('[GPUMemory] ✅ GPU detectada: NVIDIA (CUDA)');
        return 'nvidia';
      }
    } catch (e) {
      // No es NVIDIA
    }

    // 2. Intentar AMD
    try {
      const result = await this._executeCommand('rocm-smi', ['--version']);
      if (result) {
        this.gpuType = 'amd';
        console.log('[GPUMemory] ✅ GPU detectada: AMD (ROCm)');
        return 'amd';
      }
    } catch (e) {
      // No es AMD
    }

    // 3. Apple Silicon (detectar por sistema operativo)
    if (process.platform === 'darwin') {
      try {
        const { exec } = childProcess;
        const sysctl = require('util').promisify(exec);
        const result = await sysctl('sysctl hw.model');
        if (result.stdout.includes('Apple')) {
          this.gpuType = 'apple';
          console.log('[GPUMemory] ✅ GPU detectada: Apple Silicon (Metal)');
          return 'apple';
        }
      } catch (e) {
        // No es Apple
      }
    }

    console.log('[GPUMemory] ⚠️ No se detectó GPU');
    return null;
  }

  /**
   * 🎮 Obtener memoria de GPU (caché de 5 segundos)
   */
  async getGPUMemory() {
    const now = Date.now();
    if (this.gpuInfo && now - this.lastUpdate < this.cacheTime) {
      return this.gpuInfo; // Retornar caché
    }

    const gpuType = await this.detectGPU();
    if (!gpuType) {
      return null;
    }

    try {
      let info = null;

      switch (gpuType) {
        case 'nvidia':
          info = await this._getNVIDIAMemory();
          break;
        case 'amd':
          info = await this._getAMDMemory();
          break;
        case 'apple':
          info = await this._getAppleMemory();
          break;
      }

      this.gpuInfo = info;
      this.lastUpdate = now;
      return info;
    } catch (error) {
      console.error('[GPUMemory] Error obteniendo memoria GPU:', error.message);
      return null;
    }
  }

  /**
   * 🎮 NVIDIA: Usar nvidia-smi
   */
  async _getNVIDIAMemory() {
    try {
      // Comando: nvidia-smi --query-gpu=memory.total,memory.used --format=csv,noheader,nounits
      const output = await this._executeCommand('nvidia-smi', [
        '--query-gpu=index,name,driver_version,memory.total,memory.used',
        '--format=csv,noheader,nounits'
      ]);

      const lines = output.trim().split('\n');
      const gpus = [];

      for (const line of lines) {
        const [index, name, driver, total, used] = line.split(',').map(s => s.trim());
        gpus.push({
          index: parseInt(index),
          name: name || 'NVIDIA GPU',
          driver: driver,
          totalVRAM_MB: parseInt(total),
          usedVRAM_MB: parseInt(used),
          freeVRAM_MB: parseInt(total) - parseInt(used),
          usagePercent: Math.round((parseInt(used) / parseInt(total)) * 100)
        });
      }

      return gpus.length > 0 ? gpus : null;
    } catch (error) {
      console.error('[GPUMemory] Error leyendo nvidia-smi:', error.message);
      return null;
    }
  }

  /**
   * 🎮 AMD: Usar rocm-smi
   */
  async _getAMDMemory() {
    try {
      // Comando: rocm-smi --showmeminfo
      const output = await this._executeCommand('rocm-smi', ['--showmeminfo']);

      // Parsear output de rocm-smi
      const gpus = [];
      let currentGPU = null;

      for (const line of output.split('\n')) {
        if (line.includes('GPU') && line.includes('Node')) {
          // Extraer índice de GPU
          const match = line.match(/GPU\[\s*(\d+)\]/);
          if (match) {
            if (currentGPU) gpus.push(currentGPU);
            currentGPU = {
              index: parseInt(match[1]),
              name: 'AMD GPU (ROCm)',
              totalVRAM_MB: 0,
              usedVRAM_MB: 0
            };
          }
        }

        if (currentGPU && line.includes('Total Heap')) {
          const match = line.match(/(\d+)\s*MB/);
          if (match) currentGPU.totalVRAM_MB = parseInt(match[1]);
        }

        if (currentGPU && line.includes('Used Heap')) {
          const match = line.match(/(\d+)\s*MB/);
          if (match) {
            currentGPU.usedVRAM_MB = parseInt(match[1]);
            currentGPU.freeVRAM_MB = currentGPU.totalVRAM_MB - currentGPU.usedVRAM_MB;
            currentGPU.usagePercent = Math.round((currentGPU.usedVRAM_MB / currentGPU.totalVRAM_MB) * 100);
          }
        }
      }

      if (currentGPU) gpus.push(currentGPU);
      return gpus.length > 0 ? gpus : null;
    } catch (error) {
      console.error('[GPUMemory] Error leyendo rocm-smi:', error.message);
      return null;
    }
  }

  /**
   * 🎮 APPLE: Metal API
   */
  async _getAppleMemory() {
    try {
      // En Apple Silicon, metal command-line tool
      const output = await this._executeCommand('system_profiler', ['SPDisplaysDataType']);

      // Parsear info de memoria de GPU desde system_profiler
      const match = output.match(/VRAM \(Dynamic, Max\):\s*([\d.]+\s*[KMGT]?B)/i);

      if (match) {
        const vramStr = match[1];
        // Convertir a MB
        let vramMB = 0;
        if (vramStr.includes('GB')) {
          vramMB = parseInt(vramStr) * 1024;
        } else if (vramStr.includes('MB')) {
          vramMB = parseInt(vramStr);
        }

        return [{
          index: 0,
          name: 'Apple Silicon (Metal)',
          totalVRAM_MB: vramMB,
          usedVRAM_MB: Math.round(vramMB * 0.5), // Estimado
          freeVRAM_MB: Math.round(vramMB * 0.5),
          usagePercent: 50 // Estimado
        }];
      }

      return null;
    } catch (error) {
      console.error('[GPUMemory] Error leyendo Metal info:', error.message);
      return null;
    }
  }

  /**
   * Helper: Ejecutar comando del sistema
   */
  _executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      if (!childProcess) {
        reject(new Error('child_process no disponible'));
        return;
      }

      const { exec } = childProcess;

      // Construir comando completo
      const fullCommand = `${command} ${args.join(' ')}`;

      // Timeout de 5 segundos
      exec(fullCommand, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(stdout);
      });
    });
  }

  /**
   * 📊 Obtener estadísticas formateadas
   */
  async getGPUStats() {
    const gpuInfo = await this.getGPUMemory();

    if (!gpuInfo) {
      return {
        available: false,
        gpus: []
      };
    }

    return {
      available: true,
      count: gpuInfo.length,
      gpus: gpuInfo.map(gpu => ({
        index: gpu.index,
        name: gpu.name,
        totalGB: (gpu.totalVRAM_MB / 1024).toFixed(2),
        usedGB: (gpu.usedVRAM_MB / 1024).toFixed(2),
        freeGB: (gpu.freeVRAM_MB / 1024).toFixed(2),
        usagePercent: gpu.usagePercent,
        status: gpu.usagePercent > 80 ? '⚠️ Alto' : gpu.usagePercent > 50 ? '🟡 Medio' : '✅ Bajo'
      }))
    };
  }

  /**
   * 📊 Limpiar (sin operaciones necesarias para GPU)
   */
  async cleanup() {
    this.gpuInfo = null;
    this.lastUpdate = 0;
    console.log('[GPUMemory] Limpieza completada');
  }
}

// Singleton
const gpuMemoryService = new GPUMemoryService();

export default gpuMemoryService;

