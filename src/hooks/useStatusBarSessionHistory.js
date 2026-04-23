import { useState, useEffect, useRef } from 'react';

// Ventana deslizante de 3 horas por defecto
const DEFAULT_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * Acumula muestras timestamped de stats de sistema durante toda la sesión,
 * descartando automáticamente las más antiguas que windowMs.
 *
 * Cada muestra: { t, cpu, memUsed, memTotal, rx, tx }
 *
 * @param {object} stats  - El objeto stats actual (mismo shape que recibe StatusBar)
 * @param {number} windowMs - Tamaño de la ventana de tiempo en ms (por defecto 3 h)
 * @returns {Array} history - Array de muestras ordenado de más antiguo a más reciente
 */
export function useStatusBarSessionHistory(stats, windowMs = DEFAULT_WINDOW_MS) {
    const samplesRef = useRef([]);
    const [history, setHistory] = useState([]);

    // El key de activación es la CPU porque cambia en cada tick de polling
    const cpu = stats?.cpu;
    const memUsed = stats?.mem?.used;
    const memTotal = stats?.mem?.total;
    const rx = stats?.network?.rx_speed;
    const tx = stats?.network?.tx_speed;

    useEffect(() => {
        const cpuNum = typeof cpu === 'number' ? cpu : parseFloat(cpu);
        if (cpu === undefined || cpu === null || isNaN(cpuNum)) return;

        const now = Date.now();
        const sample = {
            t: now,
            cpu: cpuNum,
            memUsed: typeof memUsed === 'number' ? memUsed : 0,
            memTotal: typeof memTotal === 'number' ? memTotal : 0,
            rx: typeof rx === 'number' ? rx : 0,
            tx: typeof tx === 'number' ? tx : 0,
        };

        samplesRef.current.push(sample);

        // Descartar muestras fuera de la ventana temporal
        const cutoff = now - windowMs;
        let i = 0;
        while (i < samplesRef.current.length && samplesRef.current[i].t < cutoff) i++;
        if (i > 0) samplesRef.current = samplesRef.current.slice(i);

        setHistory([...samplesRef.current]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cpu, memUsed, rx, tx]);

    return history;
}
