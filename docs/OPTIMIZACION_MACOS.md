# Optimización de Guacamole en macOS

## Problema
En macOS, especialmente en Macs con Apple Silicon (M1/M2/M3), la imagen Docker `guacamole/guacd` muestra el warning "Image may have poor performance, or fail, if run via emulation" porque está ejecutando una imagen AMD64/x86_64 a través de emulación.

## Soluciones Implementadas

### 1. Detección Automática de Arquitectura
- El servicio ahora detecta automáticamente si estás en Apple Silicon
- Prioriza el método nativo en Apple Silicon para mejor rendimiento
- Usa imágenes ARM64 nativas cuando están disponibles

### 2. Optimizaciones de Docker
- Configuración específica de plataforma (`linux/arm64` vs `linux/amd64`)
- Límites de memoria y CPU optimizados para macOS
- Mejor manejo de volúmenes compartidos

### 3. Optimizaciones de Sistema
- Variables de entorno optimizadas para Apple Silicon
- Reducción de logs para mejor rendimiento
- Configuración de memoria optimizada

## Recomendaciones Adicionales

### 1. Configuración de Docker Desktop
```bash
# Aumentar recursos asignados a Docker
# En Docker Desktop > Settings > Resources:
# - Memory: 4GB o más
# - CPUs: 2 o más
# - Disk image size: 64GB o más
```

### 2. Optimización del Sistema de Archivos
```bash
# Usar volúmenes con nombre en lugar de bind mounts
docker volume create nodeterm-guacd-data

# Configurar NFS para mejor rendimiento (opcional)
# Instalar: brew install nfs-utils
```

### 3. Variables de Entorno Recomendadas
```bash
# Agregar al archivo .env o configurar en el sistema
export NODETERM_GUACD_METHOD=native  # Para forzar método nativo en Apple Silicon
export GUACD_LOG_LEVEL=WARN          # Reducir logs
export MALLOC_ARENA_MAX=2            # Optimización de memoria
```

### 4. Alternativas a Docker Desktop

#### OrbStack (Recomendado)
```bash
# Instalar OrbStack como alternativa más eficiente
brew install --cask orbstack
```

#### Lima + nerdctl
```bash
# Instalar Lima para contenedores nativos
brew install lima
limactl start default
```

### 5. Compilación Nativa de Guacd
Si tienes problemas con Docker, puedes compilar guacd nativamente:

```bash
# Instalar dependencias
brew install autoconf automake libtool pkg-config
brew install cairo libjpeg libpng libjpeg-turbo

# Compilar guacd desde fuentes
git clone https://github.com/apache/guacamole-server.git
cd guacamole-server
autoreconf -fi
./configure --with-init-dir=/usr/local/etc/init.d
make
sudo make install
```

## Monitoreo de Rendimiento

### Verificar Arquitectura
```bash
# Verificar arquitectura del sistema
uname -m
# Debería mostrar: arm64 en Apple Silicon

# Verificar arquitectura de Docker
docker version
# Buscar "Architecture: aarch64" para ARM64
```

### Verificar Rendimiento
```bash
# Monitorear uso de recursos
docker stats nodeterm-guacd

# Verificar logs de rendimiento
docker logs nodeterm-guacd
```

## Solución de Problemas

### Si Docker sigue siendo lento:
1. Usar método nativo: `export NODETERM_GUACD_METHOD=native`
2. Instalar OrbStack como alternativa
3. Considerar compilación nativa de guacd

### Si el método nativo no funciona:
1. Verificar que guacd esté instalado: `brew install guacd`
2. Verificar permisos de ejecución
3. Revisar logs del sistema

### Para máxima compatibilidad:
1. Usar Docker con imágenes ARM64 nativas
2. Configurar Docker Desktop con recursos suficientes
3. Considerar usar OrbStack en lugar de Docker Desktop
