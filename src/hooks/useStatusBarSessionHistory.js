import { useState, useEffect, useRef } from 'react';

// 🛡️ MEMORIA: Ventana de 15 minutos y máximo 120 muestras (~240px para las gráficas SVG de StatusBar)
// Evita acumular miles de objetos en memoria por pestaña durante horas de inactividad
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 120;

/**
 * @param {object} stats
 * @param {{ gpuStats?: object | null, windowMs?: number, maxSamples?: number }} [options]
 * Muestras: { t, cpu, memUsed, memTotal, rx, tx, gpuUsedMB, gpuTotalMB, gpuTemp }
 */
export function useStatusBarSessionHistory(stats, options = {}) {
    const { gpuStats = null, windowMs = DEFAULT_WINDOW_MS, maxSamples = MAX_SAMPLES } = options;
    const samplesRef = useRef([]);
    const [history, setHistory] = useState([]);

    const cpu = stats?.cpu;
    const memUsed = stats?.mem?.used;
    const memTotal = stats?.mem?.total;
    const rx = stats?.network?.rx_speed;
    const tx = stats?.network?.tx_speed;
    const netIfaces = Array.isArray(stats?.networkInterfaces) ? stats.networkInterfaces : [];
    const gUsed = gpuStats?.usedMB;
    const gTotal = gpuStats?.totalMB;
    const gTemp = gpuStats?.temperature;

    useEffect(() => {
        const cpuNum = typeof cpu === 'number' ? cpu : parseFloat(cpu);
        const hasCpu = cpu !== undefined && cpu !== null && !isNaN(cpuNum);
        if (!hasCpu) return;

        const now = Date.now();
        const sample = {
            t: now,
            cpu: cpuNum,
            memUsed: typeof memUsed === 'number' ? memUsed : 0,
            memTotal: typeof memTotal === 'number' ? memTotal : 0,
            rx: typeof rx === 'number' ? rx : 0,
            tx: typeof tx === 'number' ? tx : 0,
            netIfaces: netIfaces.map((ni) => ({
                iface: ni?.iface || 'iface',
                rx: typeof ni?.rx_speed === 'number' ? ni.rx_speed : 0,
                tx: typeof ni?.tx_speed === 'number' ? ni.tx_speed : 0,
            })),
            gpuUsedMB: typeof gUsed === 'number' ? gUsed : null,
            gpuTotalMB: typeof gTotal === 'number' ? gTotal : null,
            gpuTemp: typeof gTemp === 'number' ? gTemp : null,
        };

        samplesRef.current.push(sample);

        const cutoff = now - windowMs;
        let i = 0;
        while (i < samplesRef.current.length && samplesRef.current[i].t < cutoff) i++;
        if (i > 0) samplesRef.current = samplesRef.current.slice(i);

        // 🛡️ MEMORIA: Acotar estrictamente a maxSamples para evitar crecimiento indefinido
        if (samplesRef.current.length > maxSamples) {
            samplesRef.current = samplesRef.current.slice(samplesRef.current.length - maxSamples);
        }

        setHistory([...samplesRef.current]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cpu, memUsed, rx, tx, netIfaces, gUsed, gTotal, gTemp, maxSamples, windowMs]);

    return history;
}
