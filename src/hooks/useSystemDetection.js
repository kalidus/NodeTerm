/**
 * 🚀 OPTIMIZACIÓN: Hook para detección de sistema
 * Usa el servicio centralizado con caché para evitar llamadas IPC duplicadas
 */

import { useState, useEffect } from 'react';
import systemDetectionService from '../services/SystemDetectionService';

/**
 * Hook para obtener detecciones del sistema sin bloquear el render
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.detectWSL - Detectar distribuciones WSL (default: true)
 * @param {boolean} options.detectCygwin - Detectar Cygwin (default: true)
 * @param {boolean} options.detectDocker - Detectar Docker (default: true)
 * @param {number} options.delay - Delay antes de iniciar detección (default: 0)
 */
export function useSystemDetection(options = {}) {
  const {
    detectWSL = true,
    detectCygwin = true,
    detectDocker = true,
    delay = 0,
  } = options;

  const [wslDistributions, setWSLDistributions] = useState([]);
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
  const [dockerContainers, setDockerContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Suscribirse a cambios del servicio
    const unsubscribe = systemDetectionService.subscribe((data) => {
      if (!mounted) return;
      if (data.wslDistributions !== null) setWSLDistributions(data.wslDistributions);
      if (data.cygwinAvailable !== null) setCygwinAvailable(data.cygwinAvailable);
      if (data.dockerContainers !== null) setDockerContainers(data.dockerContainers);
    });

    // Cargar datos existentes del caché inmediatamente
    const cached = systemDetectionService.getAll();
    if (cached.wslDistributions !== null) setWSLDistributions(cached.wslDistributions);
    if (cached.cygwinAvailable !== null) setCygwinAvailable(cached.cygwinAvailable);
    if (cached.dockerContainers !== null) setDockerContainers(cached.dockerContainers);

    // Si ya hay datos en caché, no mostrar loading
    const hasCache = cached.wslDistributions !== null || 
                     cached.cygwinAvailable !== null || 
                     cached.dockerContainers !== null;
    
    if (hasCache) {
      setLoading(false);
    }

    // Iniciar detecciones con delay para no bloquear render
    const timeoutId = setTimeout(async () => {
      if (!mounted) return;

      const promises = [];
      if (detectWSL) promises.push(systemDetectionService.getWSLDistributions());
      if (detectCygwin) promises.push(systemDetectionService.getCygwinAvailable());
      if (detectDocker) promises.push(systemDetectionService.getDockerContainers());

      await Promise.all(promises);
      if (mounted) setLoading(false);
    }, delay);

    return () => {
      mounted = false;
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [detectWSL, detectCygwin, detectDocker, delay]);

  return {
    wslDistributions,
    cygwinAvailable,
    dockerContainers,
    loading,
    // Función para re-detectar (invalidar caché)
    refresh: (type) => systemDetectionService.invalidate(type),
  };
}

export default useSystemDetection;
