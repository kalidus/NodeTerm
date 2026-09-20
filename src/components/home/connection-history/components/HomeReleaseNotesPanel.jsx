import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getVersionInfo } from '../../../../version-info';
import changelogMarkdown from '../../../../data/changelogSource';
import {
  parseChangelog,
  formatReleaseDate,
  githubReleaseUrl,
  GITHUB_RELEASES_URL
} from '../../../../utils/parseChangelog';

const KIND_META = {
  improvements: { label: 'Mejoras', icon: 'pi pi-arrow-up', tone: 'improvements' },
  fixes: { label: 'Correcciones', icon: 'pi pi-times', tone: 'fixes' },
  changes: { label: 'Cambios', icon: 'pi pi-circle', tone: 'changes' }
};

function normalizeVersion(value) {
  return String(value || '').replace(/^v/i, '').trim();
}

function openExternal(url) {
  if (!url) return;
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(url);
    return;
  }
  if (window.electron?.import?.openExternal) {
    window.electron.import.openExternal(url);
  }
}

function sectionCount(section) {
  return (section.items || []).length + (section.paragraphs || []).length;
}

export const HomeReleaseNotesPanel = () => {
  const parsed = useMemo(() => parseChangelog(changelogMarkdown), []);
  const currentVersion = useMemo(
    () => normalizeVersion(getVersionInfo().appVersion),
    []
  );

  const releases = parsed.releases || [];
  const groups = parsed.groups || [];

  const initialSelected = useMemo(() => {
    const current = releases.find((item) => normalizeVersion(item.version) === currentVersion);
    return (current || releases[0] || null)?.version || '';
  }, [releases, currentVersion]);

  const [selectedVersion, setSelectedVersion] = useState(initialSelected);
  const [openGroups, setOpenGroups] = useState(() => {
    const selected = releases.find((item) => item.version === initialSelected);
    return selected ? { [selected.minor]: true } : {};
  });
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    if (!selectedVersion && initialSelected) {
      setSelectedVersion(initialSelected);
    }
  }, [initialSelected, selectedVersion]);

  const selected = useMemo(
    () => releases.find((item) => item.version === selectedVersion) || releases[0] || null,
    [releases, selectedVersion]
  );

  const toggleGroup = useCallback((groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const selectRelease = useCallback((release) => {
    setSelectedVersion(release.version);
    setOpenGroups((prev) => ({ ...prev, [release.minor]: true }));
  }, []);

  const sectionKey = (version, index) => `${version}:${index}`;

  const isSectionOpen = (version, index) => {
    const key = sectionKey(version, index);
    return openSections[key] !== false;
  };

  const toggleSection = (version, index) => {
    const key = sectionKey(version, index);
    setOpenSections((prev) => ({ ...prev, [key]: prev[key] === false }));
  };

  if (!releases.length) {
    return (
      <div className="home-widget-empty">
        No hay notas de version disponibles.
      </div>
    );
  }

  const summaryTitles = (selected?.sections || [])
    .slice(0, 2)
    .map((section) => section.title)
    .filter(Boolean);

  return (
    <div className="home-release-notes">
      <aside className="home-release-rail">
        <div className="home-release-rail-title">
          <i className="pi pi-book" />
          Release notes
        </div>
        <div className="home-release-rail-scroll">
          {groups.map((group) => {
            const hasCurrent = group.releases.some(
              (item) => normalizeVersion(item.version) === currentVersion
            );
            const expanded = openGroups[group.id] !== false && (
              openGroups[group.id] === true
              || group.releases.some((item) => item.version === selected?.version)
              || hasCurrent
            );
            return (
              <div key={group.id} className="home-release-group">
                <button
                  type="button"
                  className={`home-release-group-btn${expanded ? ' is-open' : ''}${hasCurrent ? ' is-current-group' : ''}`}
                  onClick={() => toggleGroup(group.id)}
                >
                  <i className={`pi ${expanded ? 'pi-chevron-down' : 'pi-chevron-right'}`} />
                  <span>{group.label}</span>
                  {hasCurrent && <span className="home-release-badge">Current</span>}
                </button>
                {expanded && (
                  <div className="home-release-group-children">
                    {group.releases.map((release) => {
                      const isCurrent = normalizeVersion(release.version) === currentVersion;
                      const isActive = release.version === selected?.version;
                      return (
                        <button
                          key={release.version}
                          type="button"
                          className={`home-release-version-btn${isActive ? ' is-active' : ''}`}
                          onClick={() => selectRelease(release)}
                        >
                          <span className={`home-release-dot${isActive ? ' is-on' : ''}`} />
                          <span>{release.version}</span>
                          {isCurrent && <span className="home-release-badge is-mini">Current</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="home-release-all"
          onClick={() => openExternal(GITHUB_RELEASES_URL)}
        >
          Ver todas las versiones
        </button>
      </aside>

      <section className="home-release-body">
        {selected && (
          <>
            <header className="home-release-header">
              <div className="home-release-kicker">Release notes</div>
              <div className="home-release-heading">
                {normalizeVersion(selected.version) === currentVersion && (
                  <span className="home-release-badge">Current</span>
                )}
                <h3>{selected.version}</h3>
                {selected.date && (
                  <time>{formatReleaseDate(selected.date)}</time>
                )}
              </div>
              {summaryTitles.length > 0 && (
                <p className="home-release-summary">
                  {summaryTitles.join(' · ')}
                </p>
              )}
            </header>

            <div className="home-release-scroll">
              {selected.paragraphs.map((paragraph, index) => (
                <p key={`p-${index}`} className="home-release-paragraph">{paragraph}</p>
              ))}

              {selected.sections.map((section, index) => {
                const meta = KIND_META[section.kind] || KIND_META.changes;
                const count = sectionCount(section);
                const open = isSectionOpen(selected.version, index);
                return (
                  <div
                    key={`${selected.version}-${index}`}
                    className={`home-release-section is-${meta.tone}${open ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="home-release-section-head"
                      onClick={() => toggleSection(selected.version, index)}
                    >
                      <i className={meta.icon} />
                      <span className="home-release-section-label">
                        {section.kind === 'changes' ? section.title : meta.label}
                      </span>
                      {section.kind !== 'changes' && section.title !== meta.label && (
                        <span className="home-release-section-sub">{section.title}</span>
                      )}
                      <span className="home-release-count">{count}</span>
                      <i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'}`} />
                    </button>
                    {open && (
                      <ul className="home-release-items">
                        {section.paragraphs.map((paragraph, pIndex) => (
                          <li key={`sp-${pIndex}`}>{paragraph}</li>
                        ))}
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex}>
                            {item.title ? <strong>{item.title}</strong> : null}
                            {item.title && item.detail ? ': ' : null}
                            {item.detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="home-release-github"
                onClick={() => openExternal(githubReleaseUrl(selected.version))}
              >
                Ver en GitHub
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default HomeReleaseNotesPanel;
