import { getBaseScore, getRating } from 'cvss';

const METRIC_ORDER = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];

const METRIC_OPTIONS = {
  AV: [
    { label: 'Network (N)', value: 'N' },
    { label: 'Adjacent (A)', value: 'A' },
    { label: 'Local (L)', value: 'L' },
    { label: 'Physical (P)', value: 'P' }
  ],
  AC: [
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  PR: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  UI: [
    { label: 'None (N)', value: 'N' },
    { label: 'Required (R)', value: 'R' }
  ],
  S: [
    { label: 'Unchanged (U)', value: 'U' },
    { label: 'Changed (C)', value: 'C' }
  ],
  C: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  I: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  A: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ]
};

const METRIC_DESCRIPTIONS = {
  AV: {
    label: 'Attack Vector',
    labelEs: 'Vector de Ataque',
    description:
      'Refleja el contexto en el que es posible explotar la vulnerabilidad. Cuanto más remoto pueda ser el atacante, mayor es la puntuación.',
    values: {
      N: 'Network — La vulnerabilidad es explotable de forma remota a través de la red (internet). No se requiere acceso físico ni proximidad. Ejemplo: ataques RCE sobre servicios HTTP.',
      A: 'Adjacent — El atacante debe estar en el mismo segmento de red, dominio de difusión o zona lógica (LAN, VPN, Bluetooth). No es explotable desde internet directamente.',
      L: 'Local — El atacante necesita acceso local al sistema (shell local, sesión de usuario). Puede incluir acceso por consola o SSH autenticado.',
      P: 'Physical — El atacante debe tener contacto físico con el dispositivo (p. ej. insertar un USB, conectar directamente al puerto serie).'
    }
  },
  AC: {
    label: 'Attack Complexity',
    labelEs: 'Complejidad del Ataque',
    description:
      'Describe las condiciones adicionales fuera del control del atacante que deben existir para explotar la vulnerabilidad. No incluye acciones de ingeniería social.',
    values: {
      L: 'Low — No existen condiciones especiales de acceso. El atacante puede esperar resultados reproducibles de forma consistente cada vez que ejecuta el ataque.',
      H: 'High — Existen condiciones específicas que deben cumplirse: carrera de condiciones, configuración no estándar del objetivo, información previa del entorno objetivo, etc.'
    }
  },
  PR: {
    label: 'Privileges Required',
    labelEs: 'Privilegios Requeridos',
    description:
      'Nivel de privilegios que debe poseer el atacante en el sistema objetivo antes de la explotación.',
    values: {
      N: 'None — No se requiere ningún privilegio previo. El atacante puede actuar como usuario anónimo o sin autenticación.',
      L: 'Low — El atacante necesita privilegios básicos de usuario normal (sin acceso a datos o funciones privilegiadas). Ejemplo: cuenta de usuario sin permisos de administración.',
      H: 'High — El atacante necesita privilegios elevados como administrador, root o una cuenta con acceso a funciones críticas del sistema.'
    }
  },
  UI: {
    label: 'User Interaction',
    labelEs: 'Interacción de Usuario',
    description:
      'Indica si se requiere la participación de un usuario humano adicional al atacante para que el exploit tenga éxito.',
    values: {
      N: 'None — No se requiere ninguna acción por parte de un usuario para explotar la vulnerabilidad. El ataque puede ocurrir de forma completamente automatizada.',
      R: 'Required — La explotación requiere que un usuario legítimo realice alguna acción: abrir un fichero, hacer clic en un enlace, visitar una URL maliciosa, etc.'
    }
  },
  S: {
    label: 'Scope',
    labelEs: 'Alcance',
    description:
      'Indica si una vulnerabilidad en un componente puede afectar a recursos más allá de sus propios privilegios de seguridad. Clave para entender si el impacto trasciende al componente vulnerable.',
    values: {
      U: 'Unchanged — La vulnerabilidad solo puede afectar a los recursos gestionados por el mismo componente autorizado. El atacante no puede obtener acceso más allá del componente afectado.',
      C: 'Changed — La explotación de la vulnerabilidad puede impactar a componentes más allá del alcance del componente vulnerable. Ejemplo: escapar de una sandbox o de un contenedor.'
    }
  },
  C: {
    label: 'Confidentiality Impact',
    labelEs: 'Impacto en Confidencialidad',
    description:
      'Mide el impacto en la confidencialidad de los activos de información gestionados por el componente afectado si la vulnerabilidad es explotada con éxito.',
    values: {
      N: 'None — No hay pérdida de confidencialidad. El atacante no puede acceder a ninguna información restringida.',
      L: 'Low — Hay acceso a cierta información restringida, pero el atacante no controla qué información se obtiene ni el alcance es crítico.',
      H: 'High — Se produce pérdida total de confidencialidad, con acceso a toda la información del componente o a información especialmente sensible y crítica.'
    }
  },
  I: {
    label: 'Integrity Impact',
    labelEs: 'Impacto en Integridad',
    description:
      'Mide el impacto sobre la integridad: la fiabilidad y veracidad de la información si la vulnerabilidad es explotada.',
    values: {
      N: 'None — No hay pérdida de integridad. El atacante no puede modificar ningún dato del sistema.',
      L: 'Low — El atacante puede modificar datos, pero de forma limitada. No puede controlar exactamente qué se modifica ni el daño tiene consecuencias directas graves.',
      H: 'High — Pérdida total de integridad o posibilidad de modificación completa de archivos o información crítica del sistema.'
    }
  },
  A: {
    label: 'Availability Impact',
    labelEs: 'Impacto en Disponibilidad',
    description:
      'Mide el impacto en la disponibilidad del componente afectado si la vulnerabilidad es explotada (denegación de servicio, consumo de recursos, etc.).',
    values: {
      N: 'None — No hay impacto en la disponibilidad del sistema.',
      L: 'Low — Reducción de rendimiento o interrupciones intermitentes. El recurso está disponible la mayor parte del tiempo pero con degradación.',
      H: 'High — El atacante puede hacer que el componente quede completamente inaccesible, con pérdida total de disponibilidad (p. ej. crash, DoS permanente).'
    }
  }
};

const DEFAULT_METRICS = {
  AV: 'N',
  AC: 'L',
  PR: 'N',
  UI: 'N',
  S: 'U',
  C: 'N',
  I: 'N',
  A: 'N'
};

function getSeverity(score) {
  if (score === 0) return 'None';
  if (score < 4.0) return 'Low';
  if (score < 7.0) return 'Medium';
  if (score < 9.0) return 'High';
  return 'Critical';
}

function normalizeMetrics(metrics = {}) {
  const normalized = {};
  for (const key of METRIC_ORDER) {
    const value = (metrics[key] || '').toString().trim().toUpperCase();
    if (value) normalized[key] = value;
  }
  return normalized;
}

function buildVector(metrics = {}) {
  const normalized = normalizeMetrics(metrics);
  const chunks = [];
  for (const metric of METRIC_ORDER) {
    if (!normalized[metric]) {
      throw new Error(`Métrica requerida faltante: ${metric}`);
    }
    chunks.push(`${metric}:${normalized[metric]}`);
  }
  return `CVSS:3.1/${chunks.join('/')}`;
}

function buildV30Vector(metrics = {}) {
  return buildVector(metrics).replace('CVSS:3.1/', 'CVSS:3.0/');
}

function parseVector(vector = '') {
  const cleaned = vector.toString().trim();
  if (!cleaned) throw new Error('Vector CVSS vacío');
  const body = cleaned.replace(/^CVSS:3\.[01]\//, '');
  const metrics = {};
  for (const pair of body.split('/')) {
    const [k, v] = pair.split(':');
    if (k && v) metrics[k] = v.toUpperCase();
  }
  return metrics;
}

function calculate(metrics = {}) {
  const vector31 = buildVector(metrics);
  const vector30 = buildV30Vector(metrics);
  const score = getBaseScore(vector30);
  return {
    version: '3.1',
    vector: vector31,
    metrics: normalizeMetrics(metrics),
    score,
    severity: getSeverity(score)
  };
}

function calculateFromVector(vector = '') {
  const parsed = parseVector(vector);
  return calculate(parsed);
}

export const cvssV31Service = {
  METRIC_ORDER,
  METRIC_OPTIONS,
  METRIC_DESCRIPTIONS,
  DEFAULT_METRICS,
  buildVector,
  parseVector,
  calculate,
  calculateFromVector,
  getSeverity
};
