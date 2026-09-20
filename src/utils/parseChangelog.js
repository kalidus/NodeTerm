'use strict';

const GITHUB_RELEASES_URL = 'https://github.com/kalidus/NodeTerm/releases';

const VERSION_HEADING_RE = /^##\s+\[([^\]]+)\](?:\s*-\s*(.+))?\s*$/;
const SECTION_HEADING_RE = /^###\s+(.+)\s*$/;
const BULLET_RE = /^\s*[-*+]\s+(.+)$/;
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function foldText(title) {
  return stripSectionTitle(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function stripSectionTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\u200D/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifySection(title) {
  const t = foldText(title);
  if (/\b(hotfix|fix|fixes|bug|bugs|correccion|correcciones|error|errors)\b/.test(t)) {
    return 'fixes';
  }
  if (/\b(added|add|novedad|novedades|feature|features|caracteristica|caracteristicas|mejora|mejoras|improvement|improvements|rendimiento|ux)\b/.test(t)) {
    return 'improvements';
  }
  return 'changes';
}

function minorKey(version) {
  const raw = String(version || '').replace(/^v/i, '').trim();
  const parts = raw.split('.');
  if (parts.length >= 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    return `${parts[0]}.${parts[1]}`;
  }
  return raw || 'other';
}

function parseBulletItem(raw) {
  const text = String(raw || '').trim();
  const bold = /^\*\*(.+?)\*\*\s*:?\s*(.*)$/.exec(text);
  if (bold) {
    return {
      title: bold[1].trim(),
      detail: stripInlineMarkdown(bold[2] || '').trim()
    };
  }
  return {
    title: '',
    detail: stripInlineMarkdown(text)
  };
}

function stripInlineMarkdown(text) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

function formatReleaseDate(dateStr) {
  const raw = String(dateStr || '').trim();
  if (!raw) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!iso) return raw;
  const year = iso[1];
  const month = parseInt(iso[2], 10);
  const day = parseInt(iso[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return raw;
  return `${day} de ${MONTHS_ES[month - 1]} de ${year}`;
}

function githubReleaseUrl(version) {
  const tag = String(version || '').replace(/^v/i, '').trim();
  if (!tag || /^unreleased$/i.test(tag)) return GITHUB_RELEASES_URL;
  return `${GITHUB_RELEASES_URL}/tag/v${tag}`;
}

function isReleaseEmpty(release) {
  if (!release) return true;
  const hasItems = (release.sections || []).some((section) => (section.items || []).length > 0);
  return !hasItems && !(release.paragraphs || []).length;
}

function parseChangelog(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return { releases: [], groups: [] };
  }

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const releases = [];
  let current = null;
  let currentSection = null;
  let started = false;

  const flushSection = () => {
    if (!current || !currentSection) return;
    if (currentSection.items.length || currentSection.paragraphs.length) {
      current.sections.push(currentSection);
    }
    currentSection = null;
  };

  const flushRelease = () => {
    flushSection();
    if (!current) return;
    const unreleased = /^unreleased$/i.test(current.version);
    if (!(unreleased && isReleaseEmpty(current))) {
      releases.push(current);
    }
    current = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const versionMatch = line.match(VERSION_HEADING_RE);
    if (versionMatch) {
      started = true;
      flushRelease();
      current = {
        version: versionMatch[1].trim(),
        date: (versionMatch[2] || '').trim(),
        minor: minorKey(versionMatch[1]),
        sections: [],
        paragraphs: []
      };
      continue;
    }

    if (!started || !current) continue;

    if (/^##\s+/.test(line) && !VERSION_HEADING_RE.test(line)) {
      flushRelease();
      started = false;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      continue;
    }

    const sectionMatch = line.match(SECTION_HEADING_RE);
    if (sectionMatch) {
      flushSection();
      const rawTitle = sectionMatch[1].trim();
      currentSection = {
        title: stripSectionTitle(rawTitle) || rawTitle,
        kind: classifySection(rawTitle),
        items: [],
        paragraphs: []
      };
      continue;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      const item = parseBulletItem(bulletMatch[1]);
      if (currentSection) {
        currentSection.items.push(item);
      } else {
        current.paragraphs.push([item.title, item.detail].filter(Boolean).join(': '));
      }
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (currentSection) {
      if (currentSection.items.length) {
        const last = currentSection.items[currentSection.items.length - 1];
        const extra = stripInlineMarkdown(trimmed);
        if (extra) {
          last.detail = last.detail ? `${last.detail} ${extra}` : extra;
        }
      } else {
        currentSection.paragraphs.push(stripInlineMarkdown(trimmed));
      }
    } else {
      current.paragraphs.push(stripInlineMarkdown(trimmed));
    }
  }

  flushRelease();

  const visible = releases.filter((release) => {
    if (/^unreleased$/i.test(release.version)) {
      return !isReleaseEmpty(release);
    }
    return true;
  });

  return {
    releases: visible,
    groups: groupReleasesByMinor(visible)
  };
}

function groupReleasesByMinor(releases) {
  const groups = [];
  const index = new Map();
  (releases || []).forEach((release) => {
    const id = release.minor || minorKey(release.version);
    if (!index.has(id)) {
      const group = { id, label: id, releases: [] };
      index.set(id, group);
      groups.push(group);
    }
    index.get(id).releases.push(release);
  });
  return groups;
}

module.exports = {
  __esModule: true,
  GITHUB_RELEASES_URL,
  stripSectionTitle,
  classifySection,
  minorKey,
  parseBulletItem,
  formatReleaseDate,
  githubReleaseUrl,
  parseChangelog,
  groupReleasesByMinor
};
