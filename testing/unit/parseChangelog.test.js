const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  parseChangelog,
  stripSectionTitle,
  classifySection,
  minorKey,
  parseBulletItem,
  formatReleaseDate,
  githubReleaseUrl,
  groupReleasesByMinor,
  GITHUB_RELEASES_URL
} = require('../../src/utils/parseChangelog');

const SAMPLE = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '## [1.7.5] - 2026-08-31',
  '',
  '### RDP Nativo HTML5 (IronRDP WASM)',
  '- **Motor nativo**: conexion RDP en pestana web.',
  '- **Bastiones y Wallix**: soporte TLS Direct.',
  '',
  '### Hotfix clipboard (release)',
  '- **Causa**: faltaba tar en produccion.',
  '',
  '## [1.7.2] - 2026-07-22',
  '',
  'Proceso de release: documenta aqui todos los cambios.',
  '',
  '## [1.6.9] - 2026-07-16',
  '',
  '### Nuevas Caracteristicas',
  '- **Servidor MCP**: autenticacion por API Key.',
  '',
  '---',
  '',
  '## Tipos de Cambios',
  '',
  '- **Nuevas Caracteristicas**: para nuevas funcionalidades'
].join('\n');

describe('parseChangelog', () => {
  it('devuelve vacio ante entrada nula o no string', () => {
    assert.deepStrictEqual(parseChangelog(null), { releases: [], groups: [] });
    assert.deepStrictEqual(parseChangelog(undefined), { releases: [], groups: [] });
    assert.deepStrictEqual(parseChangelog(''), { releases: [], groups: [] });
    assert.deepStrictEqual(parseChangelog(123), { releases: [], groups: [] });
  });

  it('omite Unreleased vacio y el footer sin version', () => {
    const { releases } = parseChangelog(SAMPLE);
    assert.strictEqual(releases.some((item) => item.version === 'Unreleased'), false);
    assert.strictEqual(releases.some((item) => /Tipos/.test(item.version)), false);
    assert.deepStrictEqual(releases.map((item) => item.version), ['1.7.5', '1.7.2', '1.6.9']);
  });

  it('parsea fecha, secciones y bullets con titulo en negrita', () => {
    const { releases } = parseChangelog(SAMPLE);
    const latest = releases[0];
    assert.strictEqual(latest.date, '2026-08-31');
    assert.strictEqual(latest.minor, '1.7');
    assert.strictEqual(latest.sections.length, 2);
    assert.strictEqual(latest.sections[0].title, 'RDP Nativo HTML5 (IronRDP WASM)');
    assert.strictEqual(latest.sections[0].kind, 'changes');
    assert.strictEqual(latest.sections[0].items[0].title, 'Motor nativo');
    assert.strictEqual(latest.sections[0].items[0].detail, 'conexion RDP en pestana web.');
    assert.strictEqual(latest.sections[1].kind, 'fixes');
  });

  it('conserva parrafos cuando no hay secciones', () => {
    const { releases } = parseChangelog(SAMPLE);
    const notes = releases.find((item) => item.version === '1.7.2');
    assert.ok(notes.paragraphs[0].includes('Proceso de release'));
    assert.strictEqual(notes.sections.length, 0);
  });

  it('agrupa por minor manteniendo el orden', () => {
    const { groups } = parseChangelog(SAMPLE);
    assert.deepStrictEqual(groups.map((group) => group.id), ['1.7', '1.6']);
    assert.deepStrictEqual(groups[0].releases.map((item) => item.version), ['1.7.5', '1.7.2']);
  });

  it('conserva Unreleased si tiene contenido', () => {
    const markdown = [
      '## [Unreleased]',
      '',
      '### Mejoras',
      '- algo nuevo',
      '',
      '## [1.0.0] - 2026-01-01',
      '- primer release'
    ].join('\n');
    const { releases } = parseChangelog(markdown);
    assert.strictEqual(releases[0].version, 'Unreleased');
    assert.strictEqual(releases[0].sections[0].kind, 'improvements');
  });
});

describe('parseChangelog helpers', () => {
  it('stripSectionTitle quita pictogramas y compacta espacios', () => {
    assert.strictEqual(stripSectionTitle('RDP Nativo'), 'RDP Nativo');
    assert.strictEqual(stripSectionTitle('  Hotfix clipboard  '), 'Hotfix clipboard');
    assert.strictEqual(stripSectionTitle(`\u{1F5A5}\uFE0F RDP Nativo`), 'RDP Nativo');
  });

  it('classifySection distingue fixes y mejoras', () => {
    assert.strictEqual(classifySection('Hotfix clipboard'), 'fixes');
    assert.strictEqual(classifySection('Correcciones de Bugs'), 'fixes');
    assert.strictEqual(classifySection('Nuevas Caracteristicas'), 'improvements');
    assert.strictEqual(classifySection('Mejoras de UI'), 'improvements');
    assert.strictEqual(classifySection('Sidebar y navegacion'), 'changes');
  });

  it('minorKey extrae major.minor', () => {
    assert.strictEqual(minorKey('1.7.5'), '1.7');
    assert.strictEqual(minorKey('v1.6.9'), '1.6');
    assert.strictEqual(minorKey('Unreleased'), 'Unreleased');
  });

  it('parseBulletItem separa titulo markdown', () => {
    assert.deepStrictEqual(
      parseBulletItem('**Motor nativo**: conexion RDP'),
      { title: 'Motor nativo', detail: 'conexion RDP' }
    );
    assert.deepStrictEqual(
      parseBulletItem('texto plano'),
      { title: '', detail: 'texto plano' }
    );
  });

  it('formatReleaseDate usa espanol en fechas ISO', () => {
    assert.strictEqual(formatReleaseDate('2026-08-31'), '31 de agosto de 2026');
    assert.strictEqual(formatReleaseDate('2025-01-XX (En Desarrollo)'), '2025-01-XX (En Desarrollo)');
    assert.strictEqual(formatReleaseDate(''), '');
  });

  it('githubReleaseUrl apunta al tag o al listado', () => {
    assert.strictEqual(githubReleaseUrl('1.7.5'), `${GITHUB_RELEASES_URL}/tag/v1.7.5`);
    assert.strictEqual(githubReleaseUrl('Unreleased'), GITHUB_RELEASES_URL);
  });

  it('groupReleasesByMinor agrupa una lista ya parseada', () => {
    const groups = groupReleasesByMinor([
      { version: '1.7.5', minor: '1.7' },
      { version: '1.7.4', minor: '1.7' },
      { version: '1.6.0', minor: '1.6' }
    ]);
    assert.strictEqual(groups.length, 2);
    assert.strictEqual(groups[0].releases.length, 2);
  });
});
