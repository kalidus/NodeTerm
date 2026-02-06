const net = require('net');

/**
 * Encuentra un puerto TCP libre disponible
 * @param {number} startPort - Puerto inicial para buscar (default: 8081)
 * @param {number} endPort - Puerto final límite (default: 65535)
 * @returns {Promise<number>} Puerto libre encontrado
 */
function findFreePort(startPort = 8081, endPort = 65535) {
    return new Promise((resolve, reject) => {
        if (startPort > endPort) {
            reject(new Error('No se encontraron puertos libres en el rango especificado'));
            return;
        }

        const server = net.createServer();

        server.listen(startPort, '0.0.0.0', () => {
            const { port } = server.address();
            server.close(() => {
                resolve(port);
            });
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Puerto ocupado, intentar con el siguiente
                resolve(findFreePort(startPort + 1, endPort));
            } else {
                reject(err);
            }
        });
    });
}

module.exports = {
    findFreePort
};
