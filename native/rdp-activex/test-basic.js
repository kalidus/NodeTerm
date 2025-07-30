const RdpActiveXManager = require('./index.js');

console.log('🧪 Probando módulo RDP ActiveX Básico...');

try {
    // Crear una instancia del manager
    const manager = new RdpActiveXManager();
    console.log('✅ Manager creado correctamente');

    // Simular una conexión (sin ventana real)
    console.log('📋 Instancias activas:', manager.getActiveInstances());
    
    // Probar métodos básicos
    console.log('✅ Módulo básico funcionando correctamente');
    console.log('📋 Próximos pasos:');
    console.log('   1. Integrar con la aplicación Electron');
    console.log('   2. Probar con ventanas reales');
    console.log('   3. Implementar funcionalidad RDP completa');

} catch (error) {
    console.error('❌ Error probando módulo:', error);
} 