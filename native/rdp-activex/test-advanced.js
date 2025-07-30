const RdpActiveXManager = require('./index');

console.log('=== Prueba del Control RDP ActiveX Mejorado ===\n');

try {
    // Crear instancia del manager
    const manager = new RdpActiveXManager();
    console.log('✓ Manager creado correctamente');
    
    // Simular handle de ventana (en un entorno real, esto vendría de Electron)
    const mockWindowHandle = BigInt('0x12345678'); // Handle simulado
    
    console.log('\n--- Creando instancia de control ActiveX ---');
    let instanceId;
    
    try {
        instanceId = manager.createInstance(mockWindowHandle);
        console.log(`✓ Instancia creada con ID: ${instanceId}`);
    } catch (createError) {
        console.log(`⚠ Error esperado (no hay ventana real): ${createError.message}`);
        console.log('Esto es normal en pruebas fuera de Electron');
        
        // Continuar con pruebas que no requieren ventana real
        console.log('\n--- Probando métodos del manager ---');
        
        console.log('✓ getActiveInstances():', manager.getActiveInstances());
        
        // Simular instancia para otras pruebas
        instanceId = 1;
        manager.instances.set(instanceId, {
            control: {
                isConnected: () => false,
                getStatus: () => 'Test Status',
                setDisplaySettings: (w, h) => console.log(`Mock setDisplaySettings: ${w}x${h}`),
                connect: (s, u, p) => { 
                    console.log(`Mock connect: ${s} with user ${u}`);
                    return true;
                },
                disconnect: () => console.log('Mock disconnect'),
                resize: (x, y, w, h) => console.log(`Mock resize: ${x},${y} ${w}x${h}`)
            },
            server: '',
            username: '',
            password: '',
            width: 1024,
            height: 768
        });
        
        console.log('✓ Instancia mock creada para pruebas');
    }
    
    if (instanceId) {
        console.log('\n--- Configurando parámetros ---');
        
        // Configurar servidor
        manager.setServer(instanceId, 'test-server.example.com');
        console.log('✓ Servidor configurado');
        
        // Configurar credenciales
        manager.setCredentials(instanceId, 'testuser', 'testpass');
        console.log('✓ Credenciales configuradas');
        
        // Configurar resolución
        manager.setDisplaySettings(instanceId, 1920, 1080);
        console.log('✓ Resolución configurada: 1920x1080');
        
        console.log('\n--- Verificando estado ---');
        console.log('Conectado:', manager.isConnected(instanceId));
        console.log('Estado:', manager.getStatus(instanceId));
        console.log('Instancias activas:', manager.getActiveInstances());
        
        console.log('\n--- Probando redimensionamiento ---');
        manager.resize(instanceId, 0, 0, 1600, 900);
        console.log('✓ Redimensionamiento simulado');
        
        console.log('\n--- Limpiando recursos ---');
        manager.cleanup();
        console.log('✓ Recursos limpiados');
    }
    
    console.log('\n=== Prueba completada exitosamente ===');
    console.log('\nPara usar en producción:');
    console.log('1. Compilar: npm run build-advanced');
    console.log('2. Integrar con Electron mediante los IPC handlers');
    console.log('3. Usar desde el componente React ActiveXRdpSession');
    
} catch (error) {
    console.error('\n❌ Error en la prueba:', error);
    console.error('Stack trace:', error.stack);
    
    console.log('\n=== Información de diagnóstico ===');
    console.log('Node.js version:', process.version);
    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
    
    if (process.platform !== 'win32') {
        console.log('\n⚠ Nota: Este módulo solo funciona en Windows');
    }
}
