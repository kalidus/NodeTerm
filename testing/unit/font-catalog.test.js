const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Catálogo de fuentes locales', () => {
  let catalog;
  let families;

  it('las familias nuevas van empaquetadas y las retiradas no salen en el selector', async () => {
    catalog = (await import('../../src/utils/fontCatalog.js')).default;
    families = new Set(catalog.fonts.map((font) => font.family));
    for (const family of ['Inter', 'Geist', 'Geist Mono', 'DM Sans', 'DM Mono', 'Intel One Mono', 'Martian Mono', 'Source Sans 3', 'Plus Jakarta Sans']) {
      const entry = catalog.fonts.find((font) => font.family === family);
      assert.ok(entry, `falta ${family}`);
      assert.strictEqual(entry.source, 'bundled');
    }

    for (const removed of Object.keys(catalog.replacements)) {
      assert.strictEqual(families.has(removed), false, `${removed} no debería ofrecerse`);
      assert.ok(families.has(catalog.replacements[removed]), `el reemplazo de ${removed} no está en el catálogo`);
    }
  });

  it('Symbols Nerd Font Mono va empaquetada y no sale en los selectores', async () => {
    catalog = (await import('../../src/utils/fontCatalog.js')).default;
    const symbols = catalog.fonts.find((font) => font.family === 'Symbols Nerd Font Mono');
    assert.ok(symbols);
    assert.strictEqual(symbols.source, 'bundled');
    assert.strictEqual(symbols.download, 'nerd-symbols');
    assert.strictEqual(symbols.terminalPicker, false);

    const { getAvailableFonts, getExplorerFonts, MONOSPACE_FONT_NAMES } = await import('../../src/utils/fontsList.js');
    assert.strictEqual(MONOSPACE_FONT_NAMES.includes('Symbols Nerd Font Mono'), false);
    assert.strictEqual(getExplorerFonts().includes('Symbols Nerd Font Mono'), false);
    assert.strictEqual(
      getAvailableFonts().some((font) => font.label === 'Symbols Nerd Font Mono'),
      false
    );
  });

  it('una familia retirada se sustituye y no sale en el selector', async () => {
    const { migrateStoredFont, getExplorerFonts } = await import('../../src/utils/fontsList.js');
    assert.strictEqual(migrateStoredFont('Poppins'), 'Inter');
    assert.strictEqual(migrateStoredFont('"Source Sans Pro", sans-serif'), '"Source Sans 3", sans-serif');
    assert.strictEqual(migrateStoredFont('JetBrains Mono'), 'JetBrains Mono');
    const explorer = getExplorerFonts();
    assert.strictEqual(explorer.includes('Poppins'), false);
    assert.strictEqual(explorer.includes('Inter'), true);
    assert.strictEqual(explorer.includes('Geist Mono'), true);
  });

  it('resolveTerminalFontFamily añade Symbols Nerd Font Mono a la pila', async () => {
    const {
      resolveTerminalFontFamily,
      withNerdSymbols
    } = await import('../../src/utils/resolveTerminalFontFamily.js');

    assert.match(
      resolveTerminalFontFamily('"JetBrains Mono", monospace'),
      /Symbols Nerd Font Mono/
    );
    assert.match(
      resolveTerminalFontFamily('Geist Mono'),
      /Geist Mono.*"Symbols Nerd Font Mono".*monospace/
    );
    assert.match(
      withNerdSymbols('"Fira Code", monospace'),
      /"Fira Code", "Symbols Nerd Font Mono", monospace/
    );
    // No duplicar si ya está
    assert.strictEqual(
      withNerdSymbols('"JetBrains Mono", "Symbols Nerd Font Mono", monospace'),
      '"JetBrains Mono", "Symbols Nerd Font Mono", monospace'
    );
  });

  it('fonts.css declara Symbols y solo enlaza archivos locales existentes', () => {
    const fontsCss = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'styles', 'fonts.css'), 'utf8');
    const coreCss = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'styles', 'fonts-core.css'), 'utf8');

    assert.match(fontsCss, /font-family:\s*['"]Inter['"]/);
    assert.match(fontsCss, /font-family:\s*['"]Geist Mono['"]/);
    assert.match(fontsCss, /font-family:\s*['"]Martian Mono['"]/);
    assert.match(fontsCss, /font-family:\s*['"]Symbols Nerd Font Mono['"]/);
    assert.match(fontsCss, /SymbolsNerdFontMono-Regular\.ttf/);
    assert.doesNotMatch(fontsCss, /U\+0460-052F/);
    assert.doesNotMatch(fontsCss, /fonts\.gstatic\.com/);
    assert.doesNotMatch(fontsCss, /fonts\.googleapis\.com/);

    assert.match(coreCss, /font-family:\s*['"]Inter['"]/);
    assert.match(coreCss, /font-family:\s*['"]JetBrains Mono['"]/);
    assert.match(coreCss, /font-family:\s*['"]Fira Code['"]/);
    assert.doesNotMatch(coreCss, /font-family:\s*['"]Share Tech Mono['"]/);
    assert.doesNotMatch(coreCss, /U\+0460-052F/);

    const referenced = new Set();
    const urlPattern = /url\((?:'|")?\.\.\/assets\/fonts\/([^'")]+)(?:'|")?\)/g;
    for (const css of [fontsCss, coreCss]) {
      let match;
      while ((match = urlPattern.exec(css)) !== null) {
        referenced.add(match[1]);
      }
    }
    const missing = [...referenced].filter((fileName) => (
      !fs.existsSync(path.join(__dirname, '..', '..', 'src', 'assets', 'fonts', fileName))
    ));
    assert.deepStrictEqual(missing, []);
    assert.ok(
      fs.existsSync(path.join(__dirname, '..', '..', 'src', 'assets', 'fonts', 'SymbolsNerdFontMono-Regular.ttf'))
    );
  });
});
