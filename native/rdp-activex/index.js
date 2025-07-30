const bindings = require('bindings')('rdp_activex_basic');

class RdpActiveXManager {
    constructor() {
        this.instances = new Map();
        this.nextInstanceId = 1;
        this.eventCallbacks = new Map(); // Map<instanceId, Map<eventName, callback>>
        this.instanceConfigs = new Map(); // Map<instanceId, {server, username, password, width, height}>
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

        // Almacenar configuración por instancia
        if (!this.instanceConfigs.has(instanceId)) {
            this.instanceConfigs.set(instanceId, {});
        }
        this.instanceConfigs.get(instanceId).server = server;
        console.log(`Manager: Servidor configurado para instancia ${instanceId}: ${server}`);
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

        // Almacenar configuración por instancia
        if (!this.instanceConfigs.has(instanceId)) {
            this.instanceConfigs.set(instanceId, {});
        }
        this.instanceConfigs.get(instanceId).username = username;
        this.instanceConfigs.get(instanceId).password = password;
        console.log(`Manager: Credenciales configuradas para instancia ${instanceId}: ${username}`);
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

        // Almacenar configuración por instancia
        if (!this.instanceConfigs.has(instanceId)) {
            this.instanceConfigs.set(instanceId, {});
        }
        this.instanceConfigs.get(instanceId).width = width;
        this.instanceConfigs.get(instanceId).height = height;
        console.log(`Manager: Resolución configurada para instancia ${instanceId}: ${width}x${height}`);
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

        // Registrar el callback
        if (!this.eventCallbacks.has(instanceId)) {
            this.eventCallbacks.set(instanceId, new Map());
        }
        this.eventCallbacks.get(instanceId).set(eventName, callback);
        
        console.log(`Event ${eventName} registered for instance ${instanceId}`);
    }

    /**
     * Dispara un evento para una instancia
     * @param {number} instanceId - ID de la instancia
     * @param {string} eventName - Nombre del evento
     * @param {...any} args - Argumentos del evento
     */
    emitEvent(instanceId, eventName, ...args) {
        const instanceCallbacks = this.eventCallbacks.get(instanceId);
        if (instanceCallbacks && instanceCallbacks.has(eventName)) {
            const callback = instanceCallbacks.get(eventName);
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event callback for ${eventName}:`, error);
            }
        }
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

        // Obtener configuración específica de la instancia
        const config = this.instanceConfigs.get(instanceId) || {};
        const server = config.server || 'localhost';
        const username = config.username || 'user';
        const password = config.password || '';

        try {
            console.log(`Manager: Conectando instancia ${instanceId} a ${server}`);
            const success = instance.connect(server, username, password);
            
            if (success) {
                console.log(`Manager: Conexión exitosa para instancia ${instanceId}`);
                // Disparar evento de conexión exitosa después de un pequeño delay
                setTimeout(() => {
                    this.emitEvent(instanceId, 'connected');
                }, 1000);
            } else {
                console.log(`Manager: Error de conexión para instancia ${instanceId}`);
                this.emitEvent(instanceId, 'error', 'Failed to connect RDP session');
            }
        } catch (error) {
            console.error(`Manager: Error en conexión para instancia ${instanceId}:`, error);
            this.emitEvent(instanceId, 'error', error.message);
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

        try {
            instance.disconnect();
            console.log(`Manager: Desconectada instancia ${instanceId}`);
            
            // Disparar evento de desconexión
            this.emitEvent(instanceId, 'disconnected');
            
            // Remover la instancia del mapa y limpiar configuraciones
            this.instances.delete(instanceId);
            this.eventCallbacks.delete(instanceId);
            this.instanceConfigs.delete(instanceId);
        } catch (error) {
            console.error(`Manager: Error desconectando instancia ${instanceId}:`, error);
            this.emitEvent(instanceId, 'error', error.message);
        }
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