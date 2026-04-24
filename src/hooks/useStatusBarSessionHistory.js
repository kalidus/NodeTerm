import { useState, useEffect, useRef } from 'react';

const DEFAULT_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * @param {object} stats
 * @param {{ gpuStats?: object | null, windowMs?: number }} [options]
 * Muestras: { t, cpu, memUsed, memTotal, rx, tx, gpuUsedMB, gpuTotalMB, gpuTemp }
 */
export function useStatusBarSessionHistory(stats, options = {}) {
    const { gpuStats = null, windowMs = DEFAULT_WINDOW_MS } = options;
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

        setHistory([...samplesRef.current]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cpu, memUsed, rx, tx, netIfaces, gUsed, gTotal, gTemp]);

    return history;
}
