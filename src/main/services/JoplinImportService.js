const fs = require('fs');
const path = require('path');
const os = require('os');
const tar = require('tar');
const { marked } = require('marked');

class JoplinImportService {
  static async importJex(filePath) {
    let tempDir = null;
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo no existe');
      }

      // 1. Crear directorio temporal
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-joplin-'));

      // 2. Extraer el archivo JEX (tar)
      await tar.x({
        file: filePath,
        cwd: tempDir
      });

      // 3. Leer todos los archivos .md en el directorio temporal
      const files = fs.readdirSync(tempDir);
      const mdFiles = files.filter(f => f.toLowerCase().endsWith('.md'));

      const notes = [];
      const folders = [];
      const itemsMap = new Map();

      // 4. Parsear cada archivo
      for (const file of mdFiles) {
        const fullPath = path.join(tempDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const parsed = this.parseJoplinMarkdown(content);
        
        if (parsed && parsed.metadata && parsed.metadata.id) {
          const type = parseInt(parsed.metadata.type_, 10);
          const item = {
            id: parsed.metadata.id,
            parent_id: parsed.metadata.parent_id || '',
            title: parsed.title,
            body: parsed.body,
            type: type, // 1 = note, 2 = notebook/folder
            createdAt: parsed.metadata.created_time ? new Date(parsed.metadata.created_time).getTime() : Date.now(),
            updatedAt: parsed.metadata.updated_time ? new Date(parsed.metadata.updated_time).getTime() : Date.now()
          };
          
          itemsMap.set(item.id, item);
          if (type === 1) {
            notes.push(item);
          } else if (type === 2) {
            folders.push(item);
          }
        }
      }

      // 5. Reconstruir la estructura jerárquica
      // Primero, crear nodos para todas las carpetas
      const folderNodesMap = new Map();
      
      for (const folder of folders) {
        folderNodesMap.set(folder.id, {
          key: 'docfolder_' + folder.id,
          label: folder.title || 'Nueva Carpeta',
          type: 'document-folder',
          droppable: true,
          children: [],
          data: {
            type: 'document-folder',
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt
          }
        });
      }

      // Organizar la jerarquía de carpetas
      const rootFolders = [];
      for (const folder of folders) {
        const node = folderNodesMap.get(folder.id);
        if (folder.parent_id && folderNodesMap.has(folder.parent_id)) {
          const parentNode = folderNodesMap.get(folder.parent_id);
          parentNode.children.push(node);
        } else {
          rootFolders.push(node);
        }
      }

      // Crear nodos para todas las notas y colocarlas en sus carpetas
      const rootNotes = [];
      let importedNotesCount = 0;
      let importedFoldersCount = folders.length;

      for (const note of notes) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="80" viewBox="0 0 350 80" style="background:#1e1e2f; border:1px dashed #4f46e5; border-radius:8px; font-family:system-ui,-apple-system,sans-serif;"><rect width="100%" height="100%" fill="none"/><text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="12" font-weight="600">📌 Recurso de Evernote</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-size="10">Imagen privada no disponible sin sesion</text></svg>`;
        const evernotePlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const cleanBody = (note.body || '').replace(/en-cache:\/\/[^\s"'>\)]*/gi, evernotePlaceholder);
        const htmlContent = marked.parse(cleanBody);
        const noteNode = {
          key: 'doc_' + note.id,
          label: note.title || 'Sin Título',
          type: 'document',
          data: {
            type: 'document',
            content: htmlContent,
            markdownSource: cleanBody,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
          }
        };

        importedNotesCount++;

        if (note.parent_id && folderNodesMap.has(note.parent_id)) {
          const parentNode = folderNodesMap.get(note.parent_id);
          parentNode.children.push(noteNode);
        } else {
          rootNotes.push(noteNode);
        }
      }

      // Combinar los nodos raíz de carpetas y de notas
      const rootNodesList = [...rootFolders, ...rootNotes];

      return {
        success: true,
        structure: {
          nodes: rootNodesList,
          noteCount: importedNotesCount,
          folderCount: importedFoldersCount
        },
        metadata: {
          source: 'Joplin',
          importDate: new Date().toISOString(),
          originalFile: path.basename(filePath)
        }
      };

    } catch (error) {
      console.error('Error in JoplinImportService:', error);
      throw error;
    } finally {
      // Limpiar directorio temporal
      if (tempDir && fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('No se pudo eliminar el directorio temporal de Joplin:', e.message);
        }
      }
    }
  }

  static parseJoplinMarkdown(content) {
    const lines = content.split(/\r?\n/);
    const metadata = {};
    let boundaryIndex = -1;

    // Escanear hacia atrás para encontrar el bloque de metadatos
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === '') {
        if (boundaryIndex === -1 && Object.keys(metadata).length === 0) {
          continue;
        }
        boundaryIndex = i;
        break;
      }

      const match = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (match) {
        const [_, key, value] = match;
        metadata[key] = value;
      } else {
        boundaryIndex = i + 1;
        break;
      }
    }

    let body = '';
    let title = '';

    if (boundaryIndex !== -1) {
      const bodyLines = lines.slice(0, boundaryIndex);
      body = bodyLines.join('\n').trim();
    } else {
      body = content.trim();
    }

    if (metadata.title) {
      title = metadata.title;
    } else {
      const bodyLines = body.split('\n');
      title = bodyLines[0] || 'Sin Título';
      title = title.replace(/^#+\s+/, '').trim();
      body = bodyLines.slice(1).join('\n').trim();
    }

    return {
      title,
      body,
      metadata
    };
  }
}

module.exports = JoplinImportService;
