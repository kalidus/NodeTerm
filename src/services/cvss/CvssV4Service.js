import { calculateBaseScore, expectedMetricOrder, parseVectorV4, validateVectorV4 } from 'cvss4';

const BASE_METRICS = ['AV', 'AC', 'AT', 'PR', 'UI', 'VC', 'VI', 'VA', 'SC', 'SI', 'SA'];
const THREAT_METRICS = ['E'];
const ENVIRONMENTAL_METRICS = ['CR', 'IR', 'AR', 'MAV', 'MAC', 'MAT', 'MPR', 'MUI', 'MVC', 'MVI', 'MVA', 'MSC', 'MSI', 'MSA'];
const SUPPLEMENTAL_METRICS = ['S', 'AU', 'R', 'V', 'RE', 'U'];
const METRIC_ORDER = [...BASE_METRICS, ...THREAT_METRICS, ...ENVIRONMENTAL_METRICS, ...SUPPLEMENTAL_METRICS];

const VALUE_LABELS = {
  X: 'Not Defined',
  N: 'None / Network',
  A: 'Adjacent / Active',
  L: 'Low / Local',
  P: 'Present / Passive / Physical',
  H: 'High',
  M: 'Medium',
  U: 'Unreported / Unknown',
  S: 'Safety',
  Y: 'Yes',
  D: 'Diffused',
  C: 'Confirmed / Concentrated',
  I: 'Internal',
  Clear: 'Clear',
  Green: 'Green',
  Amber: 'Amber',
  Red: 'Red'
};

const METRIC_OPTIONS = Object.fromEntries(
  Object.entries(expectedMetricOrder).map(([metric, values]) => [
    metric,
    values.map((value) => ({ label: `${VALUE_LABELS[value] || value} (${value})`, value }))
  ])
);

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
  },
  E: {
    label: 'Exploit Maturity',
    labelEs: 'Madurez del Exploit',
    description: 'Métrica Threat de CVSS 4.0 que refleja la probabilidad real de explotación.',
    values: { X: 'No definido.', A: 'Ataque activo observado.', P: 'PoC pública.', U: 'No disponible / no observado.' }
  },
  CR: {
    label: 'Confidentiality Requirement',
    labelEs: 'Requisito de Confidencialidad',
    description: 'Importancia de la confidencialidad para el entorno.',
    values: { X: 'No definido.', L: 'Baja.', M: 'Media.', H: 'Alta.' }
  },
  IR: {
    label: 'Integrity Requirement',
    labelEs: 'Requisito de Integridad',
    description: 'Importancia de la integridad para el entorno.',
    values: { X: 'No definido.', L: 'Baja.', M: 'Media.', H: 'Alta.' }
  },
  AR: {
    label: 'Availability Requirement',
    labelEs: 'Requisito de Disponibilidad',
    description: 'Importancia de la disponibilidad para el entorno.',
    values: { X: 'No definido.', L: 'Baja.', M: 'Media.', H: 'Alta.' }
  },
  MAV: {
    label: 'Modified Attack Vector',
    labelEs: 'Vector de Ataque Modificado',
    description: 'Sobrescribe AV para reflejar el entorno real.',
    values: { X: 'No definido.', N: 'Network.', A: 'Adjacent.', L: 'Local.', P: 'Physical.' }
  },
  MAC: {
    label: 'Modified Attack Complexity',
    labelEs: 'Complejidad Modificada',
    description: 'Sobrescribe AC según controles y contexto del entorno.',
    values: { X: 'No definido.', L: 'Low.', H: 'High.' }
  },
  MAT: {
    label: 'Modified Attack Requirements',
    labelEs: 'Requisitos de Ataque Modificados',
    description: 'Sobrescribe AT en el entorno evaluado.',
    values: { X: 'No definido.', N: 'None.', P: 'Present.' }
  },
  MPR: {
    label: 'Modified Privileges Required',
    labelEs: 'Privilegios Requeridos Modificados',
    description: 'Sobrescribe PR para la realidad operativa.',
    values: { X: 'No definido.', N: 'None.', L: 'Low.', H: 'High.' }
  },
  MUI: {
    label: 'Modified User Interaction',
    labelEs: 'Interacción de Usuario Modificada',
    description: 'Sobrescribe UI según la superficie de ataque real.',
    values: { X: 'No definido.', N: 'None.', P: 'Passive.', A: 'Active.' }
  },
  MVC: {
    label: 'Modified Vulnerable Confidentiality',
    labelEs: 'Confidencialidad Vulnerable Modificada',
    description: 'Sobrescribe VC en el entorno real.',
    values: { X: 'No definido.', H: 'High.', L: 'Low.', N: 'None.' }
  },
  MVI: {
    label: 'Modified Vulnerable Integrity',
    labelEs: 'Integridad Vulnerable Modificada',
    description: 'Sobrescribe VI en el entorno real.',
    values: { X: 'No definido.', H: 'High.', L: 'Low.', N: 'None.' }
  },
  MVA: {
    label: 'Modified Vulnerable Availability',
    labelEs: 'Disponibilidad Vulnerable Modificada',
    description: 'Sobrescribe VA en el entorno real.',
    values: { X: 'No definido.', H: 'High.', L: 'Low.', N: 'None.' }
  },
  MSC: {
    label: 'Modified Subsequent Confidentiality',
    labelEs: 'Confidencialidad Posterior Modificada',
    description: 'Sobrescribe SC para sistemas posteriores.',
    values: { X: 'No definido.', H: 'High.', L: 'Low.', N: 'None.' }
  },
  MSI: {
    label: 'Modified Subsequent Integrity',
    labelEs: 'Integridad Posterior Modificada',
    description: 'Sobrescribe SI para sistemas posteriores.',
    values: { X: 'No definido.', S: 'Safety.', H: 'High.', L: 'Low.', N: 'None.' }
  },
  MSA: {
    label: 'Modified Subsequent Availability',
    labelEs: 'Disponibilidad Posterior Modificada',
    description: 'Sobrescribe SA para sistemas posteriores.',
    values: { X: 'No definido.', S: 'Safety.', H: 'High.', L: 'Low.', N: 'None.' }
  },
  S: {
    label: 'Safety',
    labelEs: 'Impacto en Seguridad Física',
    description: 'Métrica Supplemental para reflejar riesgo de daño físico.',
    values: { X: 'No definido.', N: 'Sin impacto.', P: 'Posible impacto.' }
  },
  AU: {
    label: 'Automatable',
    labelEs: 'Automatizable',
    description: 'Indica si el ataque puede automatizarse en masa.',
    values: { X: 'No definido.', N: 'No automatizable.', Y: 'Automatizable.' }
  },
  R: {
    label: 'Recovery',
    labelEs: 'Recuperación',
    description: 'Nivel de recuperación esperado tras explotación.',
    values: { X: 'No definido.', A: 'Automática.', U: 'Intervención de usuario.', I: 'Intervención intensiva.' }
  },
  V: {
    label: 'Value Density',
    labelEs: 'Densidad de Valor',
    description: 'Concentración de activos valiosos en el objetivo.',
    values: { X: 'No definido.', D: 'Difusa.', C: 'Concentrada.' }
  },
  RE: {
    label: 'Vulnerability Response Effort',
    labelEs: 'Esfuerzo de Respuesta',
    description: 'Esfuerzo operativo necesario para responder y mitigar.',
    values: { X: 'No definido.', L: 'Bajo.', M: 'Medio.', H: 'Alto.' }
  },
  U: {
    label: 'Provider Urgency',
    labelEs: 'Urgencia del Proveedor',
    description: 'Nivel de urgencia recomendado por proveedor/equipo.',
    values: { X: 'No definido.', Clear: 'Clear', Green: 'Green', Amber: 'Amber', Red: 'Red' }
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
  SA: 'N',
  E: 'X',
  CR: 'X',
  IR: 'X',
  AR: 'X',
  MAV: 'X',
  MAC: 'X',
  MAT: 'X',
  MPR: 'X',
  MUI: 'X',
  MVC: 'X',
  MVI: 'X',
  MVA: 'X',
  MSC: 'X',
  MSI: 'X',
  MSA: 'X',
  S: 'X',
  AU: 'X',
  R: 'X',
  V: 'X',
  RE: 'X',
  U: 'X'
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
    const rawValue = (metrics[key] || '').toString().trim();
    if (!rawValue) continue;
    const value = rawValue.length === 1 ? rawValue.toUpperCase() : rawValue;
    normalized[key] = value;
  }
  return normalized;
}

function normalizeVector(vector = '') {
  const trimmed = vector.toString().trim();
  if (!trimmed) return '';
  const prefixed = trimmed.startsWith('CVSS:4.0/') ? trimmed : `CVSS:4.0/${trimmed.replace(/^CVSS:\d\.\d\//, '')}`;
  const parsed = parseVectorV4(prefixed);
  return buildVector(parsed);
}

function buildVector(metrics = {}) {
  const normalized = normalizeMetrics({ ...DEFAULT_METRICS, ...metrics });
  const chunks = [];
  for (const metric of BASE_METRICS) {
    if (!normalized[metric]) throw new Error(`Métrica requerida faltante: ${metric}`);
    chunks.push(`${metric}:${normalized[metric]}`);
  }
  for (const metric of [...THREAT_METRICS, ...ENVIRONMENTAL_METRICS, ...SUPPLEMENTAL_METRICS]) {
    const value = normalized[metric];
    if (value && value !== 'X') chunks.push(`${metric}:${value}`);
  }
  return `CVSS:4.0/${chunks.join('/')}`;
}

function parseVector(vector) {
  const normalizedVector = normalizeVector(vector);
  if (!normalizedVector) throw new Error('Vector CVSS vacío');
  const validation = validateVectorV4(normalizedVector);
  if (!validation.valid) {
    throw new Error(validation.reason || 'Vector CVSS v4.0 inválido');
  }
  const parsed = parseVectorV4(normalizedVector);
  return { ...DEFAULT_METRICS, ...parsed };
}

function validateMetrics(metrics = {}) {
  const vector = buildVector(metrics);
  const validation = validateVectorV4(vector);
  if (!validation.valid) throw new Error(validation.reason || 'Métricas CVSS v4.0 inválidas');
  return true;
}

function calculate(metrics = {}) {
  const vector = buildVector(metrics);
  const validation = validateVectorV4(vector);
  if (!validation.valid) throw new Error(validation.reason || 'Vector CVSS v4.0 inválido');
  const score = calculateBaseScore(vector);
  return {
    version: '4.0',
    vector,
    metrics: normalizeMetrics({ ...DEFAULT_METRICS, ...metrics }),
    score,
    severity: getSeverity(score),
    scoringMode: 'Base'
  };
}

function calculateFromVector(vector = '') {
  const parsed = parseVector(vector);
  return calculate(parsed);
}

export const cvssV4Service = {
  BASE_METRICS,
  THREAT_METRICS,
  ENVIRONMENTAL_METRICS,
  SUPPLEMENTAL_METRICS,
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
