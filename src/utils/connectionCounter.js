/**
 * Utilidad para contar conexiones en el árbol de nodos
 * Optimizada para no crear múltiples funciones dentro de renders
 */

/**
 * Cuenta las conexiones SSH, carpetas y RDP en un árbol de nodos
 * @param {Array} nodes - Árbol de nodos
 * @param {Array} rdpTabs - Pestañas de RDP actuales
 * @returns {Object} - Conteos calculados
 */
export const countConnections = (nodes, rdpTabs = []) => {
    if (!nodes || !Array.isArray(nodes)) {
        return { ssh: 0, folders: 0, rdp: 0 };
    }

    const uniqueSSHSessions = new Set();
    const uniqueRDPSessions = new Set();
    let folderCount = 0;

    const processNode = (node) => {
        if (!node) return;

        const data = node.data || {};
        const type = data.type;

        // 1. Contar Carpetas
        // Según lógica original: droppable y (!data || type !== 'ssh')
        if (node.droppable && type !== 'ssh') {
            folderCount++;
        }

        // 2. Contar SSH
        if (type === 'ssh') {
            uniqueSSHSessions.add(node.key);
        }

        // 3. Contar RDP (incluye heurística de HomeTab)
        if (type === 'rdp' || type === 'rdp-guacamole' || type === 'vnc' || type === 'vnc-guacamole') {
            const host = data.host || data.server || data.hostname || '';
            const port = data.port || 3389;
            const user = data.user || data.username || '';
            uniqueRDPSessions.add(`${host}:${port}|${user}`);
        } else {
            // Heurística para RDP no tipados (compatibilidad)
            const hasServer = (data.server || data.hostname || data.host);
            const maybeRdpPort = (data.port && Number(data.port) === 3389);
            const isGuac = (data.clientType === 'guacamole' || data.clientType === 'web-rdp');
            const nameLooksRdp = typeof data.name === 'string' && /rdp|windows|server|desktop|win/i.test(data.name);

            if (((hasServer && (maybeRdpPort || isGuac)) || nameLooksRdp) && type !== 'ssh') {
                const host = data.host || data.server || data.hostname || '';
                const port = data.port || (isGuac ? data.port : 3389);
                const user = data.user || data.username || '';
                uniqueRDPSessions.add(`${host}:${port}|${user}`);
            }
        }

        // Procesar hijos de forma recursiva (más eficiente que múltiples pasadas)
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                processNode(child);
            }
        }
    };

    // Una sola pasada por el árbol! 🚀
    for (const node of nodes) {
        processNode(node);
    }

    // Incluir pestañas RDP activas en el conteo de RDP
    if (Array.isArray(rdpTabs)) {
        rdpTabs.forEach(tab => {
            const cfg = tab.rdpConfig || {};
            const host = cfg.server || cfg.host || cfg.hostname;
            if (host) {
                uniqueRDPSessions.add(`${host}:${cfg.port || 3389}|${cfg.username || cfg.user || ''}`);
            }
        });
    }

    return {
        ssh: uniqueSSHSessions.size,
        folders: folderCount,
        rdp: uniqueRDPSessions.size
    };
};
