import { calculateBaseScore, validate } from 'cvss4';

const METRIC_ORDER = ['AV', 'AC', 'AT', 'PR', 'UI', 'VC', 'VI', 'VA', 'SC', 'SI', 'SA'];

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
  AT: [
    { label: 'None (N)', value: 'N' },
    { label: 'Present (P)', value: 'P' }
  ],
  PR: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  UI: [
    { label: 'None (N)', value: 'N' },
    { label: 'Passive (P)', value: 'P' },
    { label: 'Active (A)', value: 'A' }
  ],
  VC: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  VI: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  VA: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  SC: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  SI: [
    { label: 'None (N)', value: 'N' },
    { label: 'Low (L)', value: 'L' },
    { label: 'High (H)', value: 'H' }
  ],
  SA: [
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
      N: 'Network — La vulnerabilidad es explotable de forma remota a través de la red. No se requiere acceso físico ni proximidad al objetivo.',
      A: 'Adjacent — El atacante necesita acceso al segmento de red adyacente (LAN, dominio de difusión, Bluetooth). No es explotable directamente desde internet.',
      L: 'Local — Se requiere acceso local al sistema. El atacante tiene acceso de usuario o sesión en el dispositivo afectado.',
      P: 'Physical — El atacante debe tener contacto físico con el hardware (insertar USB, conectar cable, etc.).'
    }
  },
  AC: {
    label: 'Attack Complexity',
    labelEs: 'Complejidad del Ataque',
    description:
      'Condiciones fuera del control del atacante que deben cumplirse. En CVSS 4.0 se refiere a condiciones de red/sistema, no a ingeniería social.',
    values: {
      L: 'Low — No se requieren condiciones especiales. El ataque puede ejecutarse de forma reproducible y consistente.',
      H: 'High — El ataque requiere condiciones adicionales: configuración especial del objetivo, carrera de condiciones, acceso a información del entorno, etc.'
    }
  },
  AT: {
    label: 'Attack Requirements',
    labelEs: 'Requisitos de Ataque',
    description:
      'Nuevo en CVSS 4.0. Condiciones específicas del componente vulnerable necesarias para el ataque, como la presencia de usuarios o una configuración particular.',
    values: {
      N: 'None — No existen requisitos adicionales de configuración o estado del sistema para que el ataque funcione.',
      P: 'Present — El ataque depende de condiciones de implementación específicas del componente, como configuración no predeterminada, estado de sesión activa, etc.'
    }
  },
  PR: {
    label: 'Privileges Required',
    labelEs: 'Privilegios Requeridos',
    description:
      'Nivel de privilegios que el atacante debe tener en el sistema objetivo antes de explotar la vulnerabilidad.',
    values: {
      N: 'None — No se requieren privilegios. Cualquier actor sin autenticación puede intentar el ataque.',
      L: 'Low — Se necesitan privilegios básicos de usuario (sin acceso a datos privilegiados ni funciones administrativas).',
      H: 'High — Se requieren privilegios elevados como administrador, root o acceso a funciones críticas del sistema.'
    }
  },
  UI: {
    label: 'User Interaction',
    labelEs: 'Interacción de Usuario',
    description:
      'En CVSS 4.0, distingue entre interacción pasiva (el usuario simplemente navega o está presente) y activa (el usuario realiza una acción deliberada).',
    values: {
      N: 'None — No se requiere ninguna interacción de usuario. El ataque puede completarse automáticamente.',
      P: 'Passive — El ataque requiere la presencia pasiva de un usuario, como visitar una página web o recibir un correo sin interactuar activamente.',
      A: 'Active — El ataque requiere una acción deliberada del usuario: abrir un archivo, hacer clic en un enlace específico, rellenar un formulario, etc.'
    }
  },
  VC: {
    label: 'Vulnerable System Confidentiality',
    labelEs: 'Confidencialidad del Sistema Vulnerable',
    description:
      'Impacto sobre la confidencialidad de los datos dentro del componente/sistema directamente vulnerable.',
    values: {
      N: 'None — Sin pérdida de confidencialidad en el sistema vulnerable.',
      L: 'Low — Acceso limitado a información restringida; el atacante no controla exactamente qué datos obtiene.',
      H: 'High — Pérdida total o acceso a información altamente sensible del sistema vulnerable.'
    }
  },
  VI: {
    label: 'Vulnerable System Integrity',
    labelEs: 'Integridad del Sistema Vulnerable',
    description:
      'Impacto sobre la integridad de los datos o funcionalidades del componente directamente vulnerable.',
    values: {
      N: 'None — Sin pérdida de integridad. No es posible modificar datos.',
      L: 'Low — Modificación de datos limitada sin control sobre qué se modifica ni impacto directo grave.',
      H: 'High — Modificación completa de datos o funciones críticas del sistema vulnerable.'
    }
  },
  VA: {
    label: 'Vulnerable System Availability',
    labelEs: 'Disponibilidad del Sistema Vulnerable',
    description:
      'Impacto sobre la disponibilidad del componente directamente vulnerable (denegación de servicio, consumo de recursos, etc.).',
    values: {
      N: 'None — Sin impacto en disponibilidad.',
      L: 'Low — Degradación intermitente del servicio. El componente sigue operativo la mayor parte del tiempo.',
      H: 'High — Pérdida total de disponibilidad (crash, DoS completo, el servicio queda inutilizable).'
    }
  },
  SC: {
    label: 'Subsequent System Confidentiality',
    labelEs: 'Confidencialidad de Sistemas Posteriores',
    description:
      'Nuevo en CVSS 4.0. Impacto sobre la confidencialidad de otros sistemas o componentes más allá del sistema vulnerable (sistemas downstream).',
    values: {
      N: 'None — Sin impacto en confidencialidad de sistemas posteriores.',
      L: 'Low — Exposición limitada de información en sistemas adyacentes o downstream.',
      H: 'High — Pérdida total de confidencialidad en sistemas posteriores o acceso a datos especialmente sensibles.'
    }
  },
  SI: {
    label: 'Subsequent System Integrity',
    labelEs: 'Integridad de Sistemas Posteriores',
    description:
      'Impacto sobre la integridad de otros sistemas o componentes más allá del sistema directamente vulnerable.',
    values: {
      N: 'None — Sin impacto en integridad de sistemas posteriores.',
      L: 'Low — Modificaciones limitadas en sistemas downstream sin control completo del atacante.',
      H: 'High — Modificación o corrupción completa de datos en sistemas posteriores.'
    }
  },
  SA: {
    label: 'Subsequent System Availability',
    labelEs: 'Disponibilidad de Sistemas Posteriores',
    description:
      'Impacto sobre la disponibilidad de otros sistemas o componentes más allá del sistema directamente vulnerable.',
    values: {
      N: 'None — Sin impacto en disponibilidad de sistemas posteriores.',
      L: 'Low — Degradación o interrupciones intermitentes en sistemas downstream.',
      H: 'High — Pérdida total de disponibilidad en sistemas posteriores (DoS en cascada).'
    }
  }
};

const DEFAULT_METRICS = {
  AV: 'N',
  AC: 'L',
  AT: 'N',
  PR: 'N',
  UI: 'N',
  VC: 'N',
  VI: 'N',
  VA: 'N',
  SC: 'N',
  SI: 'N',
  SA: 'N'
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

function normalizeVector(vector = '') {
  const trimmed = vector.toString().trim();
  if (!trimmed) return '';
  const prefixed = trimmed.startsWith('CVSS:4.0/') ? trimmed : `CVSS:4.0/${trimmed.replace(/^CVSS:\d\.\d\//, '')}`;
  const parts = prefixed.split('/');
  const head = parts.shift();
  const map = {};
  for (const part of parts) {
    const [k, v] = part.split(':');
    if (k && v) map[k] = v.toUpperCase();
  }
  const ordered = METRIC_ORDER.filter((metric) => map[metric]).map((metric) => `${metric}:${map[metric]}`);
  return `${head}/${ordered.join('/')}`;
}

function buildVector(metrics = {}) {
  const normalized = normalizeMetrics(metrics);
  const chunks = [];
  for (const metric of METRIC_ORDER) {
    if (!normalized[metric]) throw new Error(`Métrica requerida faltante: ${metric}`);
    chunks.push(`${metric}:${normalized[metric]}`);
  }
  return `CVSS:4.0/${chunks.join('/')}`;
}

function parseVector(vector) {
  const normalizedVector = normalizeVector(vector);
  if (!normalizedVector) throw new Error('Vector CVSS vacío');
  validate(normalizedVector);
  const metrics = {};
  for (const pair of normalizedVector.replace('CVSS:4.0/', '').split('/')) {
    const [k, v] = pair.split(':');
    if (k && v) metrics[k] = v;
  }
  return metrics;
}

function validateMetrics(metrics = {}) {
  const vector = buildVector(metrics);
  validate(vector);
  return true;
}

function calculate(metrics = {}) {
  const vector = buildVector(metrics);
  validate(vector);
  const score = calculateBaseScore(vector);
  return {
    version: '4.0',
    vector,
    metrics: normalizeMetrics(metrics),
    score,
    severity: getSeverity(score)
  };
}

function calculateFromVector(vector = '') {
  const parsed = parseVector(vector);
  return calculate(parsed);
}

export const cvssV4Service = {
  METRIC_ORDER,
  METRIC_OPTIONS,
  METRIC_DESCRIPTIONS,
  DEFAULT_METRICS,
  buildVector,
  normalizeVector,
  parseVector,
  validateMetrics,
  calculate,
  calculateFromVector,
  getSeverity
};
