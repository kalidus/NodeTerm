const bindings = require('bindings')('rdp_activex_basic');

class RdpActiveXManager {
    constructor() {
        this.instances = new Map();
        this.nextInstanceId = 1;
    }

    /**
     * Crea una nueva instancia del control RDP ActiveX
     * @param {number} parentWindowHandle - Handle de la ventana padre
     * @returns {number} ID de la instancia creada
     */
    createInstance(parentWindowHandle) {
        try {
            const instanceId = this.nextInstanceId++;
            const instance = new bindings.RdpBasicWrapper();
            
            // Inicializar el control en la ventana padre
            const success = instance.initialize(parentWindowHandle);
            if (!success) {
                throw new Error('Failed to initialize RDP Basic control');
            }

            this.instances.set(instanceId, instance);
            return instanceId;
        } catch (error) {
            console.error('Error creating RDP Basic instance:', error);
            throw error;
        }
    }

    /**
     * Configura el servidor RDP
     * @param {number} instanceId - ID de la instancia
     * @param {string} server - Dirección del servidor
     */
    setServer(instanceId, server) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`RDP instance ${instanceId} not found`);
        }

        // En la versión básica, esto se maneja en connect()
        this.server = server;
    }

    /**
     * Configura las credenciales
     * @param {number} instanceId - ID de la instancia
     * @param {string} username - Nombre de usuario
     * @param {string} password - Contraseña
     */
    setCredentials(instanceId, username, password) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`RDP instance ${instanceId} not found`);
        }

        // En la versión básica, esto se maneja en connect()
        this.username = username;
        this.password = password;
    }

    /**
     * Configura la resolución de pantalla
     * @param {number} instanceId - ID de la instancia
     * @param {number} width - Ancho en píxeles
     * @param {number} height - Alto en píxeles
     */
    setDisplaySettings(instanceId, width, height) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`RDP instance ${instanceId} not found`);
        }

        // En la versión básica, esto se maneja en resize()
        this.displayWidth = width;
        this.displayHeight = height;
    }

    /**
     * Establece un callback para eventos
     * @param {number} instanceId - ID de la instancia
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función callback
     */
    onEvent(instanceId, eventName, callback) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`RDP instance ${instanceId} not found`);
        }

        // En la versión básica, los eventos se manejan de forma simple
        console.log(`Event ${eventName} registered for instance ${instanceId}`);
    }

    /**
     * Conecta la sesión RDP
     * @param {number} instanceId - ID de la instancia
     */
    connect(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`RDP instance ${instanceId} not found`);
        }

        const success = instance.connect(this.server || 'localhost', this.username || 'user', this.password || '');
        if (!success) {
            throw new Error('Failed to connect RDP session');
        }
    }

    /**
     * Desconecta la sesión RDP
     * @param {number} instanceId - ID de la instancia
     */
    disconnect(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`RDP instance ${instanceId} not found`);
        }

        instance.disconnect();

        // Remover la instancia del mapa
        this.instances.delete(instanceId);
    }

    /**
     * Redimensiona la ventana del control RDP
     * @param {number} instanceId - ID de la instancia
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {number} width - Ancho
     * @param {number} height - Alto
     */
    resize(instanceId, x, y, width, height) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`RDP instance ${instanceId} not found`);
        }

        instance.resize(x, y, width, height);
    }

    /**
     * Verifica si la instancia está conectada
     * @param {number} instanceId - ID de la instancia
     * @returns {boolean} Estado de conexión
     */
    isConnected(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return false;
        }

        return instance.isConnected();
    }

    /**
     * Obtiene el estado de la instancia
     * @param {number} instanceId - ID de la instancia
     * @returns {string} Estado de la instancia
     */
    getStatus(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return 'Instance not found';
        }

        return instance.getStatus();
    }

    /**
     * Obtiene todas las instancias activas
     * @returns {Array} Lista de IDs de instancias activas
     */
    getActiveInstances() {
        return Array.from(this.instances.keys());
    }

    /**
     * Limpia todas las instancias
     */
    cleanup() {
        for (const [instanceId, instance] of this.instances) {
            try {
                instance.disconnect();
            } catch (error) {
                console.error(`Error disconnecting instance ${instanceId}:`, error);
            }
        }
        this.instances.clear();
    }
}

module.exports = RdpActiveXManager; 