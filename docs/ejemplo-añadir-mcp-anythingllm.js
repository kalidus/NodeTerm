/**
 * Ejemplo práctico: Cómo añadir servidores MCP a AnythingLLM desde NodeTerm
 * 
 * Este script muestra diferentes formas de modificar la configuración MCP de AnythingLLM
 */

// ============================================
// EJEMPLO 1: Añadir un servidor MCP básico
// ============================================
async function ejemplo1_AñadirServidorBasico() {
  console.log('📝 Ejemplo 1: Añadir servidor MCP básico');
  
  const serverName = "mi-servidor-mcp";
  const serverConfig = {
    command: "node",
    args: ["/ruta/al/servidor.js"],
    env: {
      API_KEY: "tu-api-key-aqui"
    }
  };

  try {
    const response = await window.electron.anythingLLM.addMCPServer(serverName, serverConfig);
    
    if (response.success) {
      console.log('✅ Servidor añadido correctamente');
      console.log('Configuración actual:', JSON.stringify(response.config, null, 2));
    } else {
      console.error('❌ Error:', response.error);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// ============================================
// EJEMPLO 2: Añadir servidor MCP Filesystem
// ============================================
async function ejemplo2_AñadirFilesystemMCP() {
  console.log('📝 Ejemplo 2: Añadir servidor MCP Filesystem');
  
  const serverName = "filesystem";
  const serverConfig = {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "C:\\Users\\kalid\\Documents"  // Ruta permitida (ajusta según tu sistema)
    ],
    env: {}
  };

  try {
    const response = await window.electron.anythingLLM.addMCPServer(serverName, serverConfig);
    
    if (response.success) {
      console.log('✅ Servidor Filesystem añadido');
    } else {
      console.error('❌ Error:', response.error);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// ============================================
// EJEMPLO 3: Leer y modificar configuración completa
// ============================================
async function ejemplo3_LeerYModificar() {
  console.log('📝 Ejemplo 3: Leer y modificar configuración completa');
  
  try {
    // 1. Leer configuración actual
    const readResponse = await window.electron.anythingLLM.readMCPConfig();
    
    if (!readResponse.success) {
      console.error('❌ Error leyendo configuración:', readResponse.error);
      return;
    }

    const config = readResponse.config;
    console.log('📖 Configuración actual:', JSON.stringify(config, null, 2));

    // 2. Añadir o modificar servidores
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Añadir múltiples servidores
    config.mcpServers["servidor-1"] = {
      command: "node",
      args: ["servidor1.js"],
      env: {}
    };

    config.mcpServers["servidor-2"] = {
      command: "python",
      args: ["-m", "mcp_servidor"],
      env: {
        PYTHONPATH: "/ruta/a/modulos"
      }
    };

    // 3. Guardar configuración modificada
    const writeResponse = await window.electron.anythingLLM.writeMCPConfig(config);
    
    if (writeResponse.success) {
      console.log('✅ Configuración guardada correctamente');
    } else {
      console.error('❌ Error guardando:', writeResponse.error);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// ============================================
// EJEMPLO 4: Obtener información del directorio
// ============================================
async function ejemplo4_InformacionDirectorio() {
  console.log('📝 Ejemplo 4: Información del directorio de datos');
  
  try {
    // Obtener ruta del directorio
    const dirResponse = await window.electron.anythingLLM.getDataDir();
    if (dirResponse.success) {
      console.log('📁 Directorio de datos:', dirResponse.dataDir);
    }

    // Listar archivos
    const filesResponse = await window.electron.anythingLLM.listDataFiles();
    if (filesResponse.success) {
      console.log('📄 Archivos en el directorio:', filesResponse.files);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// ============================================
// EJEMPLO 5: Eliminar un servidor MCP
// ============================================
async function ejemplo5_EliminarServidor() {
  console.log('📝 Ejemplo 5: Eliminar servidor MCP');
  
  const serverName = "mi-servidor-mcp";  // Nombre del servidor a eliminar

  try {
    const response = await window.electron.anythingLLM.removeMCPServer(serverName);
    
    if (response.success) {
      console.log('✅ Servidor eliminado correctamente');
      console.log('Configuración actualizada:', JSON.stringify(response.config, null, 2));
    } else {
      console.error('❌ Error:', response.error);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// ============================================
// EJEMPLO 6: Leer/Escribir archivo JSON personalizado
// ============================================
async function ejemplo6_ArchivoPersonalizado() {
  console.log('📝 Ejemplo 6: Leer/Escribir archivo JSON personalizado');
  
  const filename = "mi-configuracion.json";
  
  try {
    // Leer archivo (si existe)
    const readResponse = await window.electron.anythingLLM.readJsonFile(filename);
    console.log('📖 Contenido actual:', readResponse.data);

    // Escribir o actualizar archivo
    const data = {
      version: "1.0",
      configuracion: {
        opcion1: "valor1",
        opcion2: 123
      },
      fecha: new Date().toISOString()
    };

    const writeResponse = await window.electron.anythingLLM.writeJsonFile(filename, data);
    
    if (writeResponse.success) {
      console.log('✅ Archivo guardado correctamente');
    } else {
      console.error('❌ Error:', writeResponse.error);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// ============================================
// FUNCIÓN HELPER: Verificar y mostrar configuración actual
// ============================================
async function mostrarConfiguracionActual() {
  console.log('🔍 Configuración MCP actual de AnythingLLM:');
  console.log('==========================================');
  
  try {
    const response = await window.electron.anythingLLM.readMCPConfig();
    
    if (response.success) {
      const config = response.config;
      const servers = config.mcpServers || {};
      const serverNames = Object.keys(servers);
      
      if (serverNames.length === 0) {
        console.log('⚠️  No hay servidores MCP configurados');
      } else {
        console.log(`✅ ${serverNames.length} servidor(es) MCP configurado(s):`);
        serverNames.forEach(name => {
          console.log(`   - ${name}: ${servers[name].command} ${servers[name].args.join(' ')}`);
        });
      }
      
      console.log('\n📋 Configuración completa:');
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.error('❌ Error:', response.error);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// ============================================
// EXPORTAR FUNCIONES (para usar en consola del navegador)
// ============================================
if (typeof window !== 'undefined') {
  window.ejemplosAnythingLLM = {
    añadirBasico: ejemplo1_AñadirServidorBasico,
    añadirFilesystem: ejemplo2_AñadirFilesystemMCP,
    leerYModificar: ejemplo3_LeerYModificar,
    infoDirectorio: ejemplo4_InformacionDirectorio,
    eliminarServidor: ejemplo5_EliminarServidor,
    archivoPersonalizado: ejemplo6_ArchivoPersonalizado,
    mostrarConfig: mostrarConfiguracionActual
  };
  
  console.log('✅ Ejemplos cargados. Usa:');
  console.log('   window.ejemplosAnythingLLM.mostrarConfig() - Ver configuración actual');
  console.log('   window.ejemplosAnythingLLM.añadirBasico() - Añadir servidor básico');
  console.log('   window.ejemplosAnythingLLM.añadirFilesystem() - Añadir servidor filesystem');
  console.log('   window.ejemplosAnythingLLM.leerYModificar() - Leer y modificar');
  console.log('   window.ejemplosAnythingLLM.infoDirectorio() - Info del directorio');
  console.log('   window.ejemplosAnythingLLM.eliminarServidor() - Eliminar servidor');
  console.log('   window.ejemplosAnythingLLM.archivoPersonalizado() - Archivo personalizado');
}

