/**
 * Terminal alternativo para casos extremos
 * Implementación de fallback que no depende de node-pty
 */

class SafeWindowsTerminal {
  constructor(shell, args, options) {
    this.shell = shell;
    this.args = args;
    this.options = options;
    this.process = null;
    this.dataCallbacks = [];
    this.exitCallbacks = [];
    this.isDestroyed = false;
  }

  spawn() {
    if (this.isDestroyed) throw new Error('Terminal already destroyed');
    
    this.process = require('child_process').spawn(this.shell, this.args, {
      cwd: this.options.cwd || require('os').homedir(),
      env: this.options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: this.options.windowsHide || false
    });

    this.process.stdout.on('data', (data) => {
      this.dataCallbacks.forEach(callback => callback(data));
    });

    this.process.stderr.on('data', (data) => {
      this.dataCallbacks.forEach(callback => callback(data));
    });

    this.process.on('exit', (code, signal) => {
      console.log(`SafeWindowsTerminal exit - code:`, code, 'signal:', signal, 'type:', typeof code);
      // Asegurar que code sea un número válido
      let exitCode = 0;
      if (typeof code === 'number') {
        exitCode = code;
      } else if (typeof code === 'string') {
        exitCode = parseInt(code, 10) || 0;
      } else if (code && typeof code === 'object' && code.exitCode !== undefined) {
        exitCode = code.exitCode;
      } else {
        exitCode = 0;
      }
      //console.log(`SafeWindowsTerminal actual exit code:`, exitCode);
      this.exitCallbacks.forEach(callback => callback(exitCode, signal));
    });

    return this;
  }

  onData(callback) { this.dataCallbacks.push(callback); }
  onExit(callback) { this.exitCallbacks.push(callback); }
  write(data) { if (this.process?.stdin && !this.process.stdin.destroyed) this.process.stdin.write(data); }
  kill() { if (this.process && !this.process.killed) this.process.kill(); }
  destroy() { this.isDestroyed = true; this.kill(); this.dataCallbacks = []; this.exitCallbacks = []; }
  resize() { /* console.log('Resize not supported in fallback mode'); */ }
}

module.exports = SafeWindowsTerminal;
