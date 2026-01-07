/**
 * Utilidad de debugging para inspeccionar conversaciones
 * Ejecuta desde la consola: debugConversations.inspect()
 */

const debugConversations = {
  inspect: function() {
    console.clear();
    console.log('🔍 === DEBUGGER DE CONVERSACIONES ===\n');
    
    // 1. Verificar localStorage
    console.log('📦 PASO 1: Contenido en localStorage');
    const stored = localStorage.getItem('ai-conversations-data');
    if (!stored) {
      console.log('❌ PROBLEMA: localStorage está VACÍO');
      return;
    }
    
    try {
      const data = JSON.parse(stored);
      console.log(`✅ Conversaciones almacenadas: ${data.conversations.length}`);
      
      data.conversations.forEach((conv, idx) => {
        const [convId, convData] = conv;
        console.log(`\n  📌 Conversación ${idx}: ${convId}`);
        console.log(`     Título: "${convData.title}"`);
        console.log(`     Mensajes: ${convData.messages.length}`);
        
        convData.messages.forEach((msg, msgIdx) => {
          const role = msg.role || 'unknown';
          const hasContent = msg.content && msg.content.trim().length > 0;
          const contentPreview = msg.content ? msg.content.substring(0, 40) : '(vacío)';
          const isToolResult = msg.metadata?.isToolResult ? '🔧 TOOL' : '';
          
          console.log(`        [${msgIdx}] ${role.padEnd(10)} ${isToolResult} hasContent=${hasContent} "${contentPreview}"`);
        });
      });
    } catch (e) {
      console.error('❌ Error parseando localStorage:', e);
      return;
    }
    
    // 2. Verificar conversación en memoria
    console.log('\n\n🧠 PASO 2: Conversación en memoria (conversationService)');
    if (typeof conversationService === 'undefined') {
      console.log('❌ conversationService no está disponible');
      return;
    }
    
    const currentConv = conversationService.getCurrentConversation();
    if (!currentConv) {
      console.log('❌ No hay conversación actual cargada');
    } else {
      console.log(`✅ Conversación actual: ${currentConv.id}`);
      console.log(`   Título: "${currentConv.title}"`);
      console.log(`   Mensajes: ${currentConv.messages.length}`);
      
      currentConv.messages.forEach((msg, idx) => {
        const hasContent = msg.content && msg.content.trim().length > 0;
        const contentPreview = msg.content ? msg.content.substring(0, 40) : '(vacío)';
        const isToolResult = msg.metadata?.isToolResult ? '🔧 TOOL' : '';
        
        console.log(`     [${idx}] ${msg.role.padEnd(10)} ${isToolResult} hasContent=${hasContent} "${contentPreview}"`);
      });
    }
    
    // 3. Resumen del problema
    console.log('\n\n🔴 ANÁLISIS:');
    if (currentConv && data.conversations[0][1].messages.length > 0) {
      const msgsStored = data.conversations[0][1].messages;
      const emptyCount = msgsStored.filter(m => !m.content || m.content.trim().length === 0).length;
      
      if (emptyCount > 0) {
        console.warn(`⚠️ PROBLEMA DETECTADO: ${emptyCount}/${msgsStored.length} mensajes están VACÍOS`);
        console.warn('   Esto explica por qué no ves nada al cargar conversaciones antiguas');
      } else {
        console.log('✅ Los mensajes SÍ tienen contenido en localStorage');
      }
      
      const toolResults = msgsStored.filter(m => m.metadata?.isToolResult);
      console.log(`\n📊 Resultados de herramientas: ${toolResults.length} encontrados`);
      toolResults.forEach((msg, i) => {
        console.log(`   [${i}] ${msg.metadata.toolName}: "${msg.content.substring(0, 60)}"`);
      });
    }
  },
  
  clearAll: function() {
    if (confirm('⚠️ ¿Estás seguro de que quieres borrar TODO el historial?')) {
      localStorage.removeItem('ai-conversations-data');
      localStorage.removeItem('ai-conversations-data-backup');
      console.log('✅ Historial borrado');
      location.reload();
    }
  }
};

// Exportar para usar en consola
window.debugConversations = debugConversations;
// console.log('✅ debugConversations cargado. Usa: debugConversations.inspect()');

