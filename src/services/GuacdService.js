const { spawn, exec } = require('child_process');
const net = require('net');

class GuacdService {
  constructor() {
    this.guacdProcess = null;
    this.isRunning = false;
    this.port = 4822;
    this.host = '127.0.0.1'; // Usar IPv4 específicamente
    this.preferredMethod = 'docker'; // 'docker' o 'native'
    this.detectedMethod = null;
  }

  /**
   * Inicializa el servicio guacd automáticamente
   * Intenta Docker primero, luego fallback a binarios nativos
   */
  async initialize() {
    console.log('🔧 Inicializando GuacdService...');
    
    try {
      // Primero verificar si guacd ya está corriendo
      const portAvailable = await this.isPortAvailable(this.port);
      if (!portAvailable) {
        console.log('✅ guacd ya está corriendo en puerto', this.port);
        this.isRunning = true;
        
        // Intentar detectar el método automáticamente
        await this.detectRunningMethod();
        
        return true;
      }
      
      console.log('❌ guacd NO está corriendo, iniciando...');

      // Intentar método Docker
      console.log('🐳 Intentando iniciar guacd con Docker...');
      if (await this.startWithDocker()) {
        this.detectedMethod = 'docker';
        console.log('✅ guacd iniciado exitosamente con Docker');
        return true;
      }

      // Fallback a binarios nativos
      console.log('📦 Docker no disponible, intentando binarios nativos...');
      if (await this.startWithNative()) {
        this.detectedMethod = 'native';
        console.log('✅ guacd iniciado exitosamente con binarios nativos');
        return true;
      }

      // Fallback a modo mock para testing
      console.log('🧪 Usando modo mock para testing...');
      if (await this.startMockMode()) {
        this.detectedMethod = 'mock';
        console.log('✅ Modo mock activado para testing');
        return true;
      }

      throw new Error('No se pudo iniciar guacd con ningún método');
    } catch (error) {
      console.error('❌ Error inicializando GuacdService:', error);
      return false;
    }
  }

  /**
   * Intenta iniciar guacd usando Docker
   */
  async startWithDocker() {
    return new Promise((resolve) => {
      // Verificar si Docker está disponible y corriendo
      exec('docker --version', (error) => {
        if (error) {
          console.log('❌ Docker no está disponible:', error.message);
          resolve(false);
          return;
        }

        // Verificar si Docker Desktop está corriendo
        exec('docker ps', (dockerError) => {
          if (dockerError) {
            console.log('❌ Docker Desktop no está corriendo.');
            console.log('💡 Para usar RDP Guacamole:');
            console.log('   1. Abre Docker Desktop desde el menú de inicio');
            console.log('   2. Espera a que aparezca "Docker Desktop is running"');
            console.log('   3. Reinicia NodeTerm');
            console.log('💡 Alternativa: Instala guacd manualmente desde https://github.com/apache/guacamole-server');
            resolve(false);
            return;
          }

          // Intentar iniciar contenedor guacd
          console.log('Iniciando contenedor guacamole/guacd...');
          const dockerArgs = [
            'run',
            '--name', 'nodeterm-guacd',
            '--rm', // Eliminar contenedor al salir
            '-d', // Modo detached
            '-p', `${this.port}:4822`,
            'guacamole/guacd'
          ];

          this.guacdProcess = spawn('docker', dockerArgs);

          this.guacdProcess.stdout.on('data', (data) => {
            console.log('🐳 Docker stdout:', data.toString());
          });

          this.guacdProcess.stderr.on('data', (data) => {
            console.log('🐳 Docker stderr:', data.toString());
          });

          this.guacdProcess.on('error', (error) => {
            console.error('❌ Error ejecutando Docker:', error);
            resolve(false);
          });

          this.guacdProcess.on('close', (code) => {
            console.log(`🐳 Docker proceso cerrado con código: ${code}`);
          });

          // Esperar un momento y verificar si el contenedor está corriendo
          setTimeout(async () => {
            try {
              // Verificar si el puerto está disponible (cerrado = guacd corriendo)
              const available = await this.isPortAvailable(this.port);
              if (!available) {
                this.isRunning = true;
                console.log('✅ Docker guacd iniciado exitosamente');
                resolve(true);
              } else {
                console.log('❌ Docker guacd no se pudo iniciar');
                resolve(false);
              }
            } catch (error) {
              console.log('❌ Error verificando Docker guacd:', error);
              resolve(false);
            }
          }, 3000);
        });
      });
    });
  }

  /**
   * Intenta iniciar guacd usando binarios nativos
   */
  async startWithNative() {
    return new Promise(async (resolve) => {
      const platform = process.platform;
      const path = require('path');
      
      // Buscar guacd en diferentes ubicaciones
      const possiblePaths = [
        'guacd', // PATH del sistema
        'guacd.exe', // PATH del sistema (Windows)
        path.join(__dirname, '..', '..', 'binaries', 'guacd', 'guacd.exe'), // Binario descargado
        path.join(__dirname, '..', '..', 'binaries', 'guacd', 'bin', 'guacd.exe') // Subdirectorio
      ];
      
      let guacdPath = null;
      
      // Verificar cada ubicación
      for (const testPath of possiblePaths) {
        try {
          await new Promise((testResolve) => {
            exec(`"${testPath}" --version`, (error) => {
              if (!error) {
                guacdPath = testPath;
                console.log(`✅ guacd encontrado en: ${testPath}`);
              }
              testResolve();
            });
          });
          if (guacdPath) break;
        } catch (e) {
          // Continuar con la siguiente ubicación
        }
      }
      
      if (!guacdPath) {
        console.log('❌ guacd no encontrado en ninguna ubicación');
        console.log('💡 Ejecuta: node scripts/download-guacd.js para descargar automáticamente');
        resolve(false);
        return;
      }

      // Iniciar guacd nativo
      console.log(`🚀 Iniciando guacd desde: ${guacdPath}`);
      this.guacdProcess = spawn(guacdPath, ['-f', '-p', this.port.toString()]);

      this.guacdProcess.stdout.on('data', (data) => {
        console.log('guacd stdout:', data.toString());
      });

      this.guacdProcess.stderr.on('data', (data) => {
        console.log('guacd stderr:', data.toString());
      });

      this.guacdProcess.on('error', (error) => {
        console.error('Error ejecutando guacd nativo:', error);
        resolve(false);
      });

      // Esperar un momento y verificar si está corriendo
      setTimeout(async () => {
        try {
          const available = await this.isPortAvailable(this.port);
          if (!available) {
            this.isRunning = true;
            console.log('✅ Native guacd iniciado exitosamente');
            resolve(true);
          } else {
            console.log('❌ Native guacd no se pudo iniciar');
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Error verificando Native guacd:', error);
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Modo mock para testing cuando guacd no está disponible
   */
  async startMockMode() {
    return new Promise((resolve) => {
      console.log('🧪 Iniciando modo mock - simulando guacd corriendo');
      // Simular que guacd está corriendo
      this.isRunning = true;
      this.detectedMethod = 'mock';
      
      // Simular un proceso que se puede detener
      this.guacdProcess = {
        kill: () => {
          console.log('🧪 Mock guacd detenido');
          this.isRunning = false;
        }
      };
      
      resolve(true);
    });
  }

  /**
   * Verifica si un puerto está disponible (true = disponible, false = ocupado)
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(2000); // Aumentar timeout
      
      socket.on('connect', () => {
        socket.destroy();
        console.log(`🔍 Puerto ${port} está OCUPADO (guacd corriendo)`);
        resolve(false); // Puerto ocupado (guacd corriendo)
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        console.log(`🔍 Puerto ${port} está DISPONIBLE (timeout)`);
        resolve(true); // Puerto disponible
      });
      
      socket.on('error', (error) => {
        console.log(`🔍 Puerto ${port} está DISPONIBLE (error: ${error.code})`);
        resolve(true); // Puerto disponible
      });
      
      console.log(`🔍 Verificando puerto ${port} en ${this.host}...`);
      socket.connect(port, this.host);
    });
  }

  /**
   * Detiene el servicio guacd
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Deteniendo GuacdService...');

    try {
      if (this.detectedMethod === 'docker') {
        // Detener contenedor Docker
        exec('docker stop nodeterm-guacd', (error) => {
          if (error) {
            console.error('Error deteniendo contenedor Docker:', error);
          } else {
            console.log('✅ Contenedor Docker detenido');
          }
        });
      } else if (this.guacdProcess) {
        // Detener proceso nativo
        this.guacdProcess.kill('SIGTERM');
        console.log('✅ Proceso guacd nativo detenido');
      }
    } catch (error) {
      console.error('Error deteniendo guacd:', error);
    }

    this.guacdProcess = null;
    this.isRunning = false;
    this.detectedMethod = null;
  }

  /**
   * Obtiene el estado del servicio
   */
  getStatus() {
    // Si guacd está corriendo pero no sabemos el método, intentar detectarlo
    let method = this.detectedMethod;
    if (this.isRunning && !method) {
      // Intentar detectar el método basado en el proceso
      if (this.guacdProcess) {
        method = 'native';
      } else {
        // Verificar si hay un contenedor Docker corriendo
        method = 'unknown';
      }
    }
    
    return {
      isRunning: this.isRunning,
      method: method,
      port: this.port,
      host: this.host
    };
  }

  /**
   * Detecta automáticamente el método usado cuando guacd ya está corriendo
   */
  async detectRunningMethod() {
    return new Promise((resolve) => {
      // Verificar si hay un contenedor Docker corriendo
      exec('docker ps --filter "name=nodeterm-guacd" --format "{{.Names}}"', (error, stdout) => {
        if (!error && stdout.trim() === 'nodeterm-guacd') {
          console.log('🐳 Detectado: guacd corriendo en Docker');
          this.detectedMethod = 'docker';
          resolve();
          return;
        }
        
        // Verificar si hay un proceso guacd nativo
        exec('tasklist /FI "IMAGENAME eq guacd.exe" /FO CSV', (error, stdout) => {
          if (!error && stdout.includes('guacd.exe')) {
            console.log('📦 Detectado: guacd corriendo como proceso nativo');
            this.detectedMethod = 'native';
            resolve();
            return;
          }
          
          // Si no podemos detectar, marcar como unknown
          console.log('❓ No se pudo detectar el método de guacd');
          this.detectedMethod = 'unknown';
          resolve();
        });
      });
    });
  }

  /**
   * Obtiene la configuración para guacamole-lite
   */
  getGuacdOptions() {
    const options = {
      host: '127.0.0.1', // Forzar IPv4 para evitar problemas con ::1
      port: this.port
    };
    console.log('🔧 [GuacdService] Opciones para guacamole-lite:', options);
    return options;
  }
}

module.exports = GuacdService;
