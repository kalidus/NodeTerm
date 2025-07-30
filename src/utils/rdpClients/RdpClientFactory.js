const MstscClient = require('./MstscClient');
const FreeRdpWebClient = require('./FreeRdpWebClient');
const XrdpClient = require('./XrdpClient');
const RemminaClient = require('./RemminaClient');
const ActiveXRdpClient = require('./ActiveXRdpClient');

/**
 * Factory para clientes RDP
 */
class RdpClientFactory {
  constructor() {
    this.clients = new Map();
    this.availableClients = new Map();
    
    // Registrar clientes disponibles
    this.registerClient(new MstscClient());
    this.registerClient(new FreeRdpWebClient());
    this.registerClient(new XrdpClient());
    this.registerClient(new RemminaClient());
    this.registerClient(new ActiveXRdpClient());
  }

  /**
   * Registrar un cliente RDP
   */
  registerClient(client) {
    this.clients.set(client.name, client);
  }

  /**
   * Verificar disponibilidad de todos los clientes
   */
  async checkAllClientsAvailability() {
    const results = new Map();
    
    for (const [name, client] of this.clients) {
      try {
        const isAvailable = await client.checkAvailability();
        if (isAvailable) {
          this.availableClients.set(name, client);
        }
        results.set(name, {
          ...client.getInfo(),
          isAvailable
        });
      } catch (error) {
        console.error(`Error verificando cliente ${name}:`, error);
        results.set(name, {
          ...client.getInfo(),
          isAvailable: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Obtener cliente por nombre
   */
  getClient(clientName) {
    return this.availableClients.get(clientName) || this.clients.get(clientName);
  }

  /**
   * Obtener lista de clientes disponibles
   */
  getAvailableClients() {
    const available = [];
    
    for (const [name, client] of this.availableClients) {
      const info = client.getInfo();
      available.push({
        name,
        displayName: info.displayName,
        description: info.description,
        isAvailable: info.isAvailable
      });
    }
    
    return available;
  }

  /**
   * Obtener cliente predeterminado
   */
  getDefaultClient() {
    // Prioridad por plataforma
    if (process.platform === 'win32') {
      // Windows: ActiveX > MSTSC > FreeRDP > FreeRDP Web
      if (this.availableClients.has('activex')) {
        return this.availableClients.get('activex');
      }
      if (this.availableClients.has('mstsc')) {
        return this.availableClients.get('mstsc');
      }
      if (this.availableClients.has('freerdp')) {
        return this.availableClients.get('freerdp');
      }
      if (this.availableClients.has('freerdpweb')) {
        return this.availableClients.get('freerdpweb');
      }
    } else if (process.platform === 'linux') {
      // Linux: FreeRDP > Remmina > xRDP > FreeRDP Web
      if (this.availableClients.has('freerdp')) {
        return this.availableClients.get('freerdp');
      }
      if (this.availableClients.has('remmina')) {
        return this.availableClients.get('remmina');
      }
      if (this.availableClients.has('xrdp')) {
        return this.availableClients.get('xrdp');
      }
      if (this.availableClients.has('freerdpweb')) {
        return this.availableClients.get('freerdpweb');
      }
    } else {
      // macOS y otros: FreeRDP > FreeRDP Web
      if (this.availableClients.has('freerdp')) {
        return this.availableClients.get('freerdp');
      }
      if (this.availableClients.has('freerdpweb')) {
        return this.availableClients.get('freerdpweb');
      }
    }
    
    // Retornar el primer disponible como fallback
    const first = this.availableClients.values().next();
    return first.done ? null : first.value;
  }

  /**
   * Obtener opciones para dropdown
   */
  getClientOptions() {
    const options = [];
    
    for (const [name, client] of this.availableClients) {
      const info = client.getInfo();
      options.push({
        label: info.displayName,
        value: name,
        description: info.description
      });
    }
    
    return options;
  }
}

module.exports = RdpClientFactory;
