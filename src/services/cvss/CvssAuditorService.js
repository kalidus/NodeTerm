/**
 * Servicio para generar análisis de auditoría y remediación basados en métricas CVSS v3.1 y v4.0.
 */

export const CvssAuditorService = {
  getAuditorInsights(version, metrics = {}) {
    if (!metrics) {
      return {
        profile: 'Métricas no inicializadas',
        exposure: ['No se ha provisto información del vector para realizar el análisis.'],
        remediation: ['Configure las métricas base del vector para generar recomendaciones.'],
        technicalDetails: {
          affectedLayers: 'Desconocido',
          cwe: 'N/A',
          technicalImpact: 'No hay información suficiente.',
          affectedOS: 'No determinado.',
          possibleMitigations: 'Configure las métricas para obtener mitigaciones técnicas detalladas.'
        }
      };
    }

    const insights = {
      profile: 'Análisis base estándar',
      exposure: [],
      remediation: [],
      technicalDetails: {
        affectedLayers: 'Aplicación / Red',
        cwe: 'N/A',
        technicalImpact: '',
        affectedOS: '',
        possibleMitigations: ''
      }
    };

    // Extraemos las métricas principales según la versión
    let av, ac, pr, ui, c, i, a;
    let isV4 = version === '4.0';

    if (isV4) {
      av = metrics.AV || 'N';
      ac = metrics.AC || 'L';
      pr = metrics.PR || 'N';
      ui = metrics.UI || 'N';
      c = metrics.VC || 'N';
      i = metrics.VI || 'N';
      a = metrics.VA || 'N';
    } else {
      av = metrics.AV || 'N';
      ac = metrics.AC || 'L';
      pr = metrics.PR || 'N';
      ui = metrics.UI || 'N';
      c = metrics.C || 'N';
      i = metrics.I || 'N';
      a = metrics.A || 'N';
    }

    const cHigh = c === 'H';
    const iHigh = i === 'H';
    const aHigh = a === 'H';

    // 1. DETERMINAR PERFIL DE LA VULNERABILIDAD
    if (av === 'N' && pr === 'N' && ui === 'N') {
      if (cHigh && iHigh && aHigh) {
        insights.profile = 'Compromiso Crítico de Confidencialidad, Integridad y Disponibilidad (RCE Remoto Total)';
      } else if (cHigh && iHigh) {
        insights.profile = 'Ejecución Remota de Código / Exfiltración Directa (Sin Autenticación)';
      } else if (aHigh) {
        insights.profile = 'Denegación de Servicio (DoS) Remota y Crítica';
      } else {
        insights.profile = 'Explotación Remota Directa sin Autenticación';
      }
    } else if (ui !== 'N' && (ui === 'R' || ui === 'A' || ui === 'P')) {
      if (cHigh || iHigh) {
        insights.profile = 'Ataque de Ingeniería Social / Interacción del Usuario (e.g. Phishing, XSS, CSRF)';
      } else {
        insights.profile = 'Exposición dependiente de Interacción del Usuario';
      }
    } else if (av === 'L' || av === 'P') {
      if (pr !== 'N') {
        insights.profile = 'Escalada de Privilegios Local (LPE) / Amenaza Interna';
      } else {
        insights.profile = 'Explotación por Acceso Físico o Consola Local';
      }
    } else if (cHigh && iHigh && aHigh) {
      insights.profile = 'Compromiso Completo del Sistema';
    } else if (cHigh && !iHigh && !aHigh) {
      insights.profile = 'Fuga de Información Confidencial / Divulgación de Datos';
    } else if (!cHigh && iHigh && !aHigh) {
      insights.profile = 'Modificación de Datos / Integridad Comprometida';
    } else if (!cHigh && !iHigh && aHigh) {
      insights.profile = 'Denegación de Servicio (DoS)';
    } else {
      insights.profile = 'Riesgo Moderado / Impacto Limitado';
    }

    // 2. EXPOSICIÓN Y CÓMO AFECTA
    switch (av) {
      case 'N':
        insights.exposure.push('Explotable Remotamente: El ataque se realiza sobre la red (Internet o WAN) sin requerir proximidad al servidor.');
        break;
      case 'A':
        insights.exposure.push('Explotable en Red Adyacente: El atacante debe estar en la misma red local (LAN), subred o rango físico/lógico inmediato (WiFi, VPN).');
        break;
      case 'L':
        insights.exposure.push('Explotable Localmente: El atacante requiere credenciales locales o acceso a shell interactiva en el servidor vulnerable.');
        break;
      case 'P':
        insights.exposure.push('Explotable por Acceso Físico: Requiere interactuar directamente de forma física con el hardware del servidor o dispositivo.');
        break;
    }

    if (ac === 'H') {
      insights.exposure.push('Alta Complejidad de Ataque: Se requiere sincronización temporal muy precisa (race conditions) o configuraciones atípicas en la víctima.');
    } else {
      insights.exposure.push('Baja Complejidad de Ataque: El ataque es predecible y altamente reproducible en cualquier instalación estándar.');
    }

    if (isV4 && metrics.AT === 'P') {
      insights.exposure.push('Requisitos Específicos: El ataque requiere configuraciones o condiciones previas del sistema para tener éxito.');
    }

    switch (pr) {
      case 'N':
        insights.exposure.push('Sin Autenticación: Cualquier usuario o atacante externo anónimo puede detonar la vulnerabilidad.');
        break;
      case 'L':
        insights.exposure.push('Autenticación Básica (Low): Se requiere poseer una cuenta de usuario normal o privilegios mínimos de acceso.');
        break;
      case 'H':
        insights.exposure.push('Autenticación Elevada (High): Requiere credenciales de nivel administrativo o superusuario para ejecutar el exploit.');
        break;
    }

    if (ui === 'N') {
      insights.exposure.push('Sin Interacción de Usuario: El exploit se completa de forma silenciosa y automática sin intervención de terceros.');
    } else {
      const uiType = isV4 && ui === 'P' ? 'pasiva (ej. navegar por un sitio)' : 'activa (ej. abrir un archivo o link)';
      insights.exposure.push(`Interacción Requerida: Requiere participación ${uiType} de un usuario legítimo.`);
    }

    if (c === 'H') {
      insights.exposure.push('Impacto en Confidencialidad Crítico: Revela secretos de configuración, contraseñas, base de datos completa o datos personales del cliente.');
    } else if (c === 'L') {
      insights.exposure.push('Impacto en Confidencialidad Limitado: Fuga menor de metadatos o lecturas de archivos parciales no críticos.');
    }

    if (i === 'H') {
      insights.exposure.push('Impacto en Integridad Crítico: El atacante puede modificar configuraciones, código fuente, inyectar payloads o falsificar transacciones.');
    } else if (i === 'L') {
      insights.exposure.push('Impacto en Integridad Limitado: Posibilidad de alteraciones de datos cosméticas o sin impacto sistémico.');
    }

    if (a === 'H') {
      insights.exposure.push('Impacto en Disponibilidad Crítico: Detiene por completo el servicio o tira la aplicación (DoS), interrumpiendo el flujo de negocio.');
    } else if (a === 'L') {
      insights.exposure.push('Impacto en Disponibilidad Limitado: Pérdida intermitente de rendimiento o degradación del servicio sin caída total.');
    }

    if (isV4) {
      if (metrics.SC === 'H' || metrics.SI === 'H' || metrics.SA === 'H') {
        insights.exposure.push('Efecto Cascada (Subsequent System): El impacto puede escalar y comprometer sistemas periféricos o de infraestructura subyacente.');
      }
    }

    // 3. RECOMENDACIONES DE REMEDIACIÓN
    if (av === 'N') {
      insights.remediation.push('Segmentación de Red: Configurar reglas de Firewall y listas de acceso (ACLs) para restringir el acceso público al puerto afectado.');
      insights.remediation.push('Zero Trust / VPN: Colocar el endpoint/servicio afectado detrás de un esquema de autenticación robusto o red corporativa interna.');
    } else if (av === 'A') {
      insights.remediation.push('Aislamiento de VLAN: Aislar el tráfico de red de los hosts afectados y habilitar controles de puerto en switches locales.');
    } else if (av === 'L') {
      insights.remediation.push('Endurecimiento del SO (OS Hardening): Deshabilitar consolas innecesarias, shell remota restringida y habilitar auditoría de llamadas al sistema.');
    }

    if (pr === 'N') {
      insights.remediation.push('Agregar Capa de Autenticación: Si es posible, no exponer servicios de forma pública sin control de identidad previo.');
    } else {
      insights.remediation.push('Mínimo Privilegio: Asegurar que las cuentas con acceso estén limitadas al rol específico y no tengan permisos administrativos innecesarios.');
      insights.remediation.push('Control de Acceso / MFA: Implementar Autenticación Multifactor para mitigar el riesgo de robo de credenciales de usuario.');
    }

    if (ui !== 'N') {
      insights.remediation.push('Filtros de Seguridad Web/Correo: Habilitar protecciones en la puerta de enlace (WAF/antispam) para filtrar archivos adjuntos o URLs maliciosas.');
      insights.remediation.push('Campañas de Concientización: Educar a los usuarios en la identificación de técnicas de ingeniería social y manejo seguro de links.');
    }

    if (c === 'H' || c === 'L') {
      insights.remediation.push('Cifrado de Información: Asegurar que los datos estén cifrados tanto en tránsito (TLS 1.3) como en reposo (AES-256).');
      insights.remediation.push('Políticas de DLP: Implementar herramientas de Prevención de Pérdida de Datos en las salidas de información crítica.');
    }

    if (i === 'H' || i === 'L') {
      insights.remediation.push('Validación de Entrada y Firmado: Habilitar firmas digitales para asegurar que la integridad del código/archivos no sea compromised y validar de forma estricta las entradas de usuario.');
      insights.remediation.push('Auditoría Integrada de Logs: Registrar todas las transacciones críticas del negocio de manera inmutable (ej. syslog externo).');
    }

    if (a === 'H' || a === 'L') {
      insights.remediation.push('Protección DoS/Límites de Recursos: Habilitar rate-limiting, WAF con protección DDoS y configurar límites de memoria/CPU en contenedores (Docker/Kubernetes).');
      insights.remediation.push('Esquema de Redundancia: Diseñar clústeres activos/activos o balanceadores de carga para mantener alta disponibilidad ante caídas locales.');
    }

    if (metrics.RL === 'O') {
      insights.remediation.unshift('Parche Oficial Disponible: Aplicar de forma prioritaria la actualización del fabricante.');
    } else if (metrics.RL === 'W') {
      insights.remediation.unshift('Mitigación Temporal (Workaround): Aplicar la configuración temporal provista por el fabricante mientras se publica el parche oficial.');
    }

    if (insights.remediation.length === 0) {
      insights.remediation.push('Monitoreo del Fabricante: Seguir los boletines de seguridad correspondientes y mantener actualizado el software.');
    }

    // 4. DETALLES TÉCNICOS DETALLADOS (CWE, Capa, Impacto Profundo)
    let cweList = [];
    let layers = [];
    let technicalImpactText = '';

    // Capa y CWE según Vector de Ataque e Impactos
    if (av === 'N') {
      layers.push('Capa de Red / Perímetro', 'Capa de Aplicación (API/Web)');
      if (pr === 'N') {
        cweList.push('CWE-287 (Autenticación Inadecuada)');
      }
    } else if (av === 'A') {
      layers.push('Capa de Enlace / Subred Local');
    } else {
      layers.push('Capa de Sistema Operativo / Core Local');
    }

    if (ui !== 'N') {
      cweList.push('CWE-79 (XSS)', 'CWE-352 (CSRF)', 'CWE-20 (Validación de Entradas Incorrecta)');
      layers.push('Capa de Presentación / Cliente (Navegador)');
    }

    // CWEs por Impacto técnico
    if (cHigh && iHigh && aHigh) {
      cweList.push('CWE-94 (Inyección de Código)', 'CWE-78 (Inyección de Comandos de SO)', 'CWE-502 (Deserialización Insegura)');
      technicalImpactText = 'Compromiso sistémico completo. El atacante adquiere la capacidad de ejecutar comandos arbitrarios con los privilegios del proceso vulnerable (RCE), permitiendo el control del sistema operativo anfitrión, exfiltración de bases de datos y persistencia persistente (backdoors).';
    } else if (cHigh && iHigh) {
      cweList.push('CWE-89 (Inyección SQL)', 'CWE-22 (Path Traversal)');
      technicalImpactText = 'Pérdida severa de confidencialidad e integridad. Acceso directo de lectura y escritura en el almacenamiento de datos o archivos de configuración sensibles. Permite la exfiltración masiva de datos y evasión de controles de acceso.';
    } else if (aHigh) {
      cweList.push('CWE-400 (Consumo No Controlado de Recursos)', 'CWE-248 (Excepción no Manejada / Crash)');
      technicalImpactText = 'Agotamiento de sockets TCP, saturación de CPU o pánico de kernel. La aplicación o servicio queda inaccesible para los clientes legítimos, pudiendo requerir reinicio manual o automatizado de la infraestructura.';
    } else {
      cweList.push('CWE-200 (Exposición de Información Sensible)');
      technicalImpactText = 'Fuga pasiva de información técnica o datos del usuario sin capacidad de realizar modificaciones directas en el flujo de ejecución o estado del sistema.';
    }

    // Determinar SO/Kernels y mitigaciones técnicas
    let affectedOS = '';
    let possibleMitigations = '';

    if (av === 'L') {
      affectedOS = 'Sistemas Unix/Linux (Kernel Space/Syscalls), Windows OS (Servicios locales/Drivers) y macOS. Afecta especialmente a versiones de kernel obsoletas o sin parches de seguridad de desbordamiento de búfer / UAF.';
      possibleMitigations = 'Habilitar SMEP/SMAP, KASLR y endurecimiento del Kernel (e.g. sysctl -w kernel.unprivileged_userns_clone=0), perfiles de SELinux/AppArmor, y control de privilegios (políticas de sudo restrictivas).';
    } else if (av === 'P') {
      affectedOS = 'Dispositivos de Hardware, IoT/Firmware, BIOS/UEFI, Controladoras de almacenamiento y sistemas embebidos con acceso físico directo.';
      possibleMitigations = 'Cifrado de disco completo (BitLocker/LUKS), deshabilitar puertos USB/Thunderbolt no autorizados en BIOS, contraseñas de arranque de BIOS robustas e intrusión física de chasis.';
    } else if (av === 'A') {
      affectedOS = 'Equipos dentro del segmento de red adyacente (routers, switches, puntos de acceso WiFi, hosts del mismo segmento de Capa 2).';
      possibleMitigations = 'Habilitar seguridad de puertos en switches (Port Security, DHCP Snooping, Dynamic ARP Inspection), aislamiento de APs WiFi, cifrado de tráfico local (WPA3/IPsec).';
    } else { // Network 'N'
      affectedOS = 'Multiplataforma (Linux, Windows, macOS, Nubes públicas). Afecta al Stack TCP/IP del sistema operativo, servidores de base de datos, APIs HTTP, o demonios expuestos.';
      possibleMitigations = 'Parchear inmediatamente la aplicación/servidor, implementar WAF (Web Application Firewall), microsegmentación de red mediante firewalls internos, y endurecer el stack TCP/IP a nivel de sistema.';
    }

    // Asignar los detalles técnicos
    insights.technicalDetails = {
      affectedLayers: layers.join(' y '),
      cwe: cweList.length > 0 ? cweList.join(', ') : 'CWE-200 / CWE-284',
      technicalImpact: technicalImpactText,
      affectedOS,
      possibleMitigations
    };

    return insights;
  }
};
