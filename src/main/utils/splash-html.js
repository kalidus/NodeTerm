/**
 * HTML de la ventana splash (arranque + preview).
 * Temas alineados con unlock (mismos IDs / paletas).
 */

const {
  SPLASH_STYLE_IDS,
  SPLASH_STYLE_META,
  normalizeSplashStyle
} = require('./splash-styles');

function getSplashThemeCss() {
  return `
    /* 1. classic */
    body.theme-classic {
      background: linear-gradient(180deg, #1a2332 0%, #0f1722 50%, #0a0f18 100%);
      color: #e3f2fd;
    }
    body.theme-classic .logo-icon {
      background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
      box-shadow: 0 0 0 1px rgba(100, 116, 139, 0.3), inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.3);
    }
    body.theme-classic .prompt { color: #4ade80; font-size: 22px; font-weight: bold; }
    body.theme-classic .code { color: #64748b; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-classic .brand { color: #ffffff; }
    body.theme-classic .progress-container { background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.2); }
    body.theme-classic .progress-bar { background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%); }
    body.theme-classic .status-icon { border: 2px solid rgba(59, 130, 246, 0.4); border-top-color: #3b82f6; }

    /* 2. vault-gate */
    body.theme-vault-gate {
      background:
        radial-gradient(ellipse 55% 70% at 88% 45%, rgba(30, 58, 95, 0.55), transparent 55%),
        radial-gradient(ellipse 80% 60% at 20% 30%, rgba(59, 130, 246, 0.1), transparent 50%),
        linear-gradient(180deg, #1a2332 0%, #0f1722 50%, #0a0f18 100%);
      color: #e3f2fd;
    }
    body.theme-vault-gate .cyber-grid {
      opacity: 0.75;
      background-image:
        linear-gradient(rgba(59, 130, 246, 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.045) 1px, transparent 1px);
      background-size: 48px 48px;
    }
    body.theme-vault-gate .container {
      background: rgba(28, 32, 40, 0.94);
      border: 1px solid rgba(59, 130, 246, 0.28);
      border-radius: 16px;
      box-shadow: 0 28px 72px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
      padding: 28px 24px;
    }
    body.theme-vault-gate .logo-icon {
      background: rgba(10, 14, 22, 0.85);
      border: 1px solid rgba(59, 130, 246, 0.35);
    }
    body.theme-vault-gate .prompt { color: #60a5fa; font-size: 22px; font-weight: bold; }
    body.theme-vault-gate .code { color: #94a3b8; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-vault-gate .brand { color: #fff; }
    body.theme-vault-gate .tagline { color: #93c5fd; }
    body.theme-vault-gate .progress-container { background: rgba(10, 14, 22, 0.85); border: 1px solid rgba(59, 130, 246, 0.28); }
    body.theme-vault-gate .progress-bar { background: #2563eb; }
    body.theme-vault-gate .status-icon { border: 2px solid rgba(59, 130, 246, 0.3); border-top-color: #3b82f6; }

    /* 3. terminal */
    body.theme-terminal {
      background: #000000;
      color: #00ff66;
      font-family: 'Fira Code', 'Courier New', monospace;
    }
    body.theme-terminal .logo-icon {
      background: #000000;
      border: 1px solid #00ff66;
      box-shadow: 0 0 10px rgba(0, 255, 102, 0.2);
    }
    body.theme-terminal .prompt { color: #00ff66; font-size: 22px; font-weight: bold; text-shadow: 0 0 6px rgba(0, 255, 102, 0.5); }
    body.theme-terminal .code { color: #008833; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-terminal .brand { color: #00ff66; text-shadow: 0 0 8px rgba(0, 255, 102, 0.4); }
    body.theme-terminal .tagline { color: #00aa44; }
    body.theme-terminal .hud-frame {
      display: block;
      border: 1px solid rgba(0, 255, 102, 0.2);
      background: rgba(0, 255, 102, 0.01);
      color: #00ff66;
    }
    body.theme-terminal .progress-container { background: #000000; border: 1px solid rgba(0, 255, 102, 0.4); }
    body.theme-terminal .progress-bar { background: #00ff66; box-shadow: 0 0 6px #00ff66; }
    body.theme-terminal .status-icon { border: 2px solid rgba(0, 255, 102, 0.2); border-top-color: #00ff66; }

    /* 4. premium-card */
    body.theme-premium-card {
      background: rgba(8, 10, 14, 0.92);
      color: #e2e8f0;
    }
    body.theme-premium-card .container {
      background: linear-gradient(180deg, #152033 0%, #0f172a 100%);
      border: 1px solid rgba(14, 99, 156, 0.35);
      border-radius: 18px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
      padding: 28px 24px;
    }
    body.theme-premium-card .logo-icon {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(14, 99, 156, 0.4);
    }
    body.theme-premium-card .prompt { color: #38bdf8; font-size: 22px; font-weight: bold; }
    body.theme-premium-card .code { color: #64748b; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-premium-card .brand { color: #f8fafc; }
    body.theme-premium-card .tagline { color: #94a3b8; }
    body.theme-premium-card .progress-container { background: rgba(0, 0, 0, 0.22); border: 1px solid rgba(14, 99, 156, 0.3); }
    body.theme-premium-card .progress-bar { background: #0e639c; }
    body.theme-premium-card .status-icon { border: 2px solid rgba(14, 99, 156, 0.35); border-top-color: #0e639c; }

    /* 5. glass-hud */
    body.theme-glass-hud {
      background: #06040d;
      color: #bbf7ff;
    }
    body.theme-glass-hud .cyber-grid {
      opacity: 1;
      background-image:
        linear-gradient(rgba(0, 242, 254, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 242, 254, 0.03) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    body.theme-glass-hud .logo-icon {
      background: rgba(13, 10, 31, 0.8);
      border: 1px solid #00f2fe;
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.3), inset 0 0 10px rgba(0, 242, 254, 0.2);
    }
    body.theme-glass-hud .prompt { color: #00f2fe; font-size: 22px; font-weight: bold; text-shadow: 0 0 8px rgba(0, 242, 254, 0.6); }
    body.theme-glass-hud .code { color: #9d4edd; font-size: 16px; font-weight: bold; text-shadow: 0 0 8px rgba(157, 78, 221, 0.6); margin-top: 2px; }
    body.theme-glass-hud .brand { color: #00f2fe; text-shadow: 0 0 12px rgba(0, 242, 254, 0.5); }
    body.theme-glass-hud .tagline { color: #9d4edd; text-shadow: 0 0 8px rgba(157, 78, 221, 0.4); }
    body.theme-glass-hud .hud-frame {
      display: block;
      border: 1px solid rgba(0, 242, 254, 0.2);
      background: rgba(0, 242, 254, 0.02);
      color: #00f2fe;
    }
    body.theme-glass-hud .progress-container { background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.3); }
    body.theme-glass-hud .progress-bar { background: #00f2fe; box-shadow: 0 0 8px #00f2fe; }
    body.theme-glass-hud .status-icon { border: 2px solid rgba(0, 242, 254, 0.2); border-top-color: #00f2fe; }

    /* 6. synthwave */
    body.theme-synthwave {
      background: #0f021a;
      color: #ff9de2;
    }
    body.theme-synthwave .cyber-grid {
      opacity: 1;
      background-image: linear-gradient(rgba(255, 0, 127, 0.04) 1px, transparent 1px);
      background-size: 100% 12px;
    }
    body.theme-synthwave .logo-icon {
      background: rgba(20, 2, 33, 0.8);
      border: 1px solid #ff007f;
      box-shadow: 0 0 15px rgba(255, 0, 127, 0.4), inset 0 0 8px rgba(255, 0, 127, 0.2);
    }
    body.theme-synthwave .prompt { color: #ff007f; font-size: 22px; font-weight: bold; text-shadow: 0 0 8px rgba(255, 0, 127, 0.6); }
    body.theme-synthwave .code { color: #ffea00; font-size: 16px; font-weight: bold; text-shadow: 0 0 8px rgba(255, 234, 0, 0.6); margin-top: 2px; }
    body.theme-synthwave .brand { color: #ff007f; text-shadow: 0 0 12px rgba(255, 0, 127, 0.5); }
    body.theme-synthwave .tagline { color: #ffea00; text-shadow: 0 0 8px rgba(255, 234, 0, 0.4); }
    body.theme-synthwave .hud-frame {
      display: block;
      border: 1px solid rgba(255, 0, 127, 0.2);
      background: rgba(255, 0, 127, 0.02);
      color: #ff9de2;
    }
    body.theme-synthwave .progress-container { background: rgba(255, 0, 127, 0.08); border: 1px solid rgba(255, 0, 127, 0.3); }
    body.theme-synthwave .progress-bar { background: linear-gradient(90deg, #ff007f 0%, #ffea00 100%); box-shadow: 0 0 8px #ff007f; }
    body.theme-synthwave .status-icon { border: 2px solid rgba(255, 0, 127, 0.2); border-top-color: #ff007f; }

    /* 7. aurora */
    body.theme-aurora {
      background:
        radial-gradient(circle at 18% 30%, rgba(255, 255, 255, 0.55), transparent 22%),
        radial-gradient(circle at 78% 22%, rgba(196, 181, 253, 0.7), transparent 26%),
        radial-gradient(circle at 70% 78%, rgba(125, 211, 252, 0.55), transparent 24%),
        linear-gradient(160deg, #7dd3fc 0%, #818cf8 48%, #c4b5fd 100%);
      color: #1e1b4b;
    }
    body.theme-aurora .container {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 255, 0.88));
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: 28px;
      box-shadow: 0 24px 60px rgba(79, 70, 229, 0.25);
      padding: 28px 24px;
    }
    body.theme-aurora .logo-icon {
      background: linear-gradient(135deg, #38bdf8, #6366f1);
      border: none;
      box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35);
    }
    body.theme-aurora .prompt { color: #fff; font-size: 22px; font-weight: bold; }
    body.theme-aurora .code { color: rgba(255,255,255,0.75); font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-aurora .brand { color: #1e1b4b; font-weight: 800; }
    body.theme-aurora .tagline { color: #64748b; opacity: 1; }
    body.theme-aurora .progress-container { background: #fff; border: 1px solid #e2e8f0; }
    body.theme-aurora .progress-bar { background: linear-gradient(90deg, #38bdf8 0%, #6366f1 55%, #a78bfa 100%); }
    body.theme-aurora .status-icon { border: 2px solid rgba(99, 102, 241, 0.25); border-top-color: #6366f1; }
    body.theme-aurora .progress-row { color: #334155; opacity: 1; }

    /* 8. matrix */
    body.theme-matrix {
      background:
        radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34, 197, 94, 0.12), transparent 50%),
        #020c06;
      color: #22c55e;
      font-family: 'Fira Code', 'Courier New', monospace;
    }
    body.theme-matrix .cyber-grid {
      opacity: 0.55;
      background-image:
        repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(57, 255, 20, 0.04) 14px, rgba(57, 255, 20, 0.04) 15px),
        repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(34, 197, 94, 0.03) 10px, rgba(34, 197, 94, 0.03) 11px);
    }
    body.theme-matrix .container {
      background: rgba(2, 12, 6, 0.92);
      border: 1px solid rgba(34, 197, 94, 0.35);
      border-radius: 8px;
      padding: 24px;
    }
    body.theme-matrix .logo-icon {
      background: transparent;
      border: 1px solid rgba(57, 255, 20, 0.45);
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.2);
    }
    body.theme-matrix .prompt { color: #39ff14; font-size: 22px; font-weight: bold; text-shadow: 0 0 8px rgba(57, 255, 20, 0.5); }
    body.theme-matrix .code { color: #166534; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-matrix .brand { color: #39ff14; letter-spacing: 0.08em; }
    body.theme-matrix .tagline { color: #4ade80; }
    body.theme-matrix .hud-frame {
      display: block;
      border: 1px solid rgba(34, 197, 94, 0.25);
      background: rgba(0, 0, 0, 0.55);
      color: #22c55e;
    }
    body.theme-matrix .progress-container { background: rgba(0, 0, 0, 0.55); border: 1px solid rgba(34, 197, 94, 0.35); }
    body.theme-matrix .progress-bar { background: linear-gradient(90deg, transparent, #39ff14, transparent); box-shadow: 0 0 8px #22c55e; }
    body.theme-matrix .status-icon { border: 2px solid rgba(34, 197, 94, 0.25); border-top-color: #22c55e; }

    /* 9. ember */
    body.theme-ember {
      background:
        radial-gradient(ellipse 80% 50% at 50% 100%, rgba(249, 115, 22, 0.28), transparent 55%),
        radial-gradient(ellipse 40% 30% at 20% 10%, rgba(180, 83, 9, 0.15), transparent 50%),
        #120a06;
      color: #fed7aa;
    }
    body.theme-ember .container {
      background: rgba(22, 14, 12, 0.94);
      border: 1px solid rgba(249, 115, 22, 0.55);
      border-radius: 22px;
      box-shadow: 0 0 40px rgba(249, 115, 22, 0.18), 0 24px 56px rgba(0, 0, 0, 0.5);
      padding: 28px 24px;
    }
    body.theme-ember .logo-icon {
      background: #1a100c;
      border: 2px solid #f97316;
      box-shadow: 0 0 22px rgba(249, 115, 22, 0.55);
      border-radius: 50%;
    }
    body.theme-ember .prompt { color: #fb923c; font-size: 22px; font-weight: bold; }
    body.theme-ember .code { color: #ea580c; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-ember .brand { color: #fff7ed; font-weight: 750; }
    body.theme-ember .tagline { color: #fb923c; letter-spacing: 0.35em; }
    body.theme-ember .progress-container { background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(251, 146, 60, 0.35); }
    body.theme-ember .progress-bar { background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%); }
    body.theme-ember .status-icon { border: 2px solid rgba(249, 115, 22, 0.3); border-top-color: #f97316; }

    /* 10. nord */
    body.theme-nord {
      background: linear-gradient(180deg, #4c566a 0%, #2e3440 40%, #3b4252 100%);
      color: #eceff4;
    }
    body.theme-nord .container {
      background: rgba(236, 239, 244, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 18px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 28px 24px;
    }
    body.theme-nord .logo-icon {
      background: transparent;
      border: 2px solid rgba(136, 192, 208, 0.7);
      border-radius: 50%;
      color: #88c0d0;
    }
    body.theme-nord .prompt { color: #88c0d0; font-size: 22px; font-weight: bold; }
    body.theme-nord .code { color: #81a1c1; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-nord .brand { color: #eceff4; font-weight: 650; }
    body.theme-nord .tagline { color: rgba(236, 239, 244, 0.75); opacity: 1; }
    body.theme-nord .progress-container { background: rgba(59, 66, 82, 0.85); border: 1px solid rgba(136, 192, 208, 0.35); }
    body.theme-nord .progress-bar { background: linear-gradient(180deg, #9ec9e0 0%, #5e81ac 100%); }
    body.theme-nord .status-icon { border: 2px solid rgba(136, 192, 208, 0.3); border-top-color: #88c0d0; }

    /* 11. midnight */
    body.theme-midnight {
      background:
        radial-gradient(ellipse 50% 40% at 70% 20%, rgba(129, 140, 248, 0.12), transparent 50%),
        #07070f;
      color: #e2e8f0;
    }
    body.theme-midnight .cyber-grid {
      opacity: 0.7;
      background-image:
        radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.35), transparent),
        radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.25), transparent),
        radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.2), transparent),
        radial-gradient(1px 1px at 35% 85%, rgba(255,255,255,0.2), transparent);
      background-size: 100% 100%;
    }
    body.theme-midnight .container {
      background: rgba(12, 12, 24, 0.9);
      border: 1px solid rgba(165, 180, 252, 0.28);
      border-radius: 18px;
      box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55);
      padding: 28px 24px;
    }
    body.theme-midnight .logo-icon {
      background: rgba(129, 140, 248, 0.12);
      border: 1px solid rgba(165, 180, 252, 0.35);
    }
    body.theme-midnight .prompt { color: #a5b4fc; font-size: 22px; font-weight: bold; }
    body.theme-midnight .code { color: #6366f1; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-midnight .brand { color: #e0e7ff; }
    body.theme-midnight .tagline { color: #a5b4fc; }
    body.theme-midnight .progress-container { background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(165, 180, 252, 0.28); }
    body.theme-midnight .progress-bar { background: #818cf8; box-shadow: 0 0 10px rgba(129, 140, 248, 0.4); }
    body.theme-midnight .status-icon { border: 2px solid rgba(129, 140, 248, 0.3); border-top-color: #818cf8; }
`;
}

function getSplashBaseCss() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      overflow: hidden;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      z-index: 2;
      padding: 24px;
      width: 100%;
      max-width: 400px;
    }
    .logo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    .logo-wrapper {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      transition: all 0.3s ease;
    }
    .brand {
      font-weight: 700;
      font-size: 28px;
      letter-spacing: -0.5px;
      margin-top: 4px;
      transition: all 0.3s ease;
    }
    .tagline {
      font-size: 11px;
      letter-spacing: 1px;
      font-weight: 500;
      text-transform: uppercase;
      opacity: 0.6;
    }
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-top: 8px;
    }
    .progress-container {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .progress-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      opacity: 0.8;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-icon {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid transparent;
      animation: spin 0.7s linear infinite;
    }
    .progress-percent { font-weight: bold; }
    .cyber-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    .hud-frame {
      display: none;
      width: 100%;
      height: 115px;
      border: 1px solid transparent;
      position: relative;
      padding: 6px 12px;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 10px;
      overflow: hidden;
      margin-top: 4px;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }
    .terminal-ticker {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
      scrollbar-width: none;
    }
    .terminal-ticker::-webkit-scrollbar { display: none; }
    .ticker-line {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.85;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
`;
}

function getPreviewControlsCss() {
  return `
    .controls {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      z-index: 10000;
      max-width: min(96vw, 920px);
      background: rgba(10, 10, 20, 0.75);
      padding: 8px 12px;
      border-radius: 24px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }
    .controls button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      padding: 6px 10px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      border-radius: 16px;
      transition: all 0.2s ease;
    }
    .controls button:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }
    .controls button.active {
      color: #000;
      background: #fff;
      box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
    }
`;
}

function buildPreviewControlsHtml() {
  const buttons = SPLASH_STYLE_META.map(
    (m) =>
      `<button type="button" onclick="setTheme('${m.id}')" id="btn-${m.id}">${m.name}</button>`
  ).join('\n    ');
  return `<div class="controls" id="themeControls">\n    ${buttons}\n  </div>`;
}

function buildPreviewScript(initialStyle) {
  const validJson = JSON.stringify(SPLASH_STYLE_IDS);
  return `
  <script>
    const VALID_STYLES = ${validJson};
    const steps = [
      { percent: 25, text: 'Iniciando NodeTerm' },
      { percent: 50, text: 'Preparando ventana' },
      { percent: 75, text: 'Cargando interfaz' },
      { percent: 100, text: 'Listo' }
    ];
    let currentStep = 0;
    let animTimeout = null;

    function setTheme(themeId) {
      if (!VALID_STYLES.includes(themeId)) themeId = 'classic';
      document.body.className = 'theme-' + themeId;
      document.querySelectorAll('#themeControls button').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-' + themeId);
      if (activeBtn) activeBtn.classList.add('active');
      const ticker = document.getElementById('ticker');
      if (ticker) {
        ticker.innerHTML = '<div class="ticker-line">&gt;&gt; BOOTING NODETERM SHELL PROTOCOLS...</div>';
      }
      if (animTimeout) clearTimeout(animTimeout);
      currentStep = 0;
      document.getElementById('progressBar').style.width = '0%';
      document.getElementById('progressPercent').textContent = '0%';
      document.getElementById('statusText').textContent = 'Iniciando...';
      setTimeout(runStep, 500);
    }

    function runStep() {
      if (currentStep >= steps.length) {
        animTimeout = setTimeout(() => {
          const cls = document.body.className.replace('theme-', '');
          setTheme(cls || 'classic');
        }, 3000);
        return;
      }
      const step = steps[currentStep];
      const bar = document.getElementById('progressBar');
      const pct = document.getElementById('progressPercent');
      const txt = document.getElementById('statusText');
      if (bar) bar.style.width = step.percent + '%';
      if (pct) pct.textContent = step.percent + '%';
      if (txt) txt.textContent = step.text + '...';
      const ticker = document.getElementById('ticker');
      if (ticker) {
        const line = document.createElement('div');
        line.className = 'ticker-line';
        line.textContent = '>> ' + step.text.toUpperCase() + '... OK';
        ticker.appendChild(line);
        ticker.scrollTop = ticker.scrollHeight;
      }
      currentStep++;
      animTimeout = setTimeout(runStep, 1500);
    }

    window.addEventListener('DOMContentLoaded', () => {
      let initialTheme = ${JSON.stringify(initialStyle)};
      const hash = window.location.hash.replace('#', '');
      if (VALID_STYLES.includes(hash)) initialTheme = hash;
      setTheme(initialTheme);
    });
  </script>`;
}

function buildSettingsPreviewScript() {
  return `
  <script>
    const steps = [
      { percent: 25, text: 'Iniciando NodeTerm' },
      { percent: 50, text: 'Preparando ventana' },
      { percent: 75, text: 'Cargando interfaz' },
      { percent: 100, text: 'Listo' }
    ];
    let currentStep = 0;
    let animTimeout = null;

    function resetAnim() {
      currentStep = 0;
      const bar = document.getElementById('progressBar');
      const pct = document.getElementById('progressPercent');
      const txt = document.getElementById('statusText');
      const ticker = document.getElementById('ticker');
      if (bar) bar.style.width = '0%';
      if (pct) pct.textContent = '0%';
      if (txt) txt.textContent = 'Iniciando...';
      if (ticker) {
        ticker.innerHTML = '<div class="ticker-line">&gt;&gt; BOOTING NODETERM SHELL PROTOCOLS...</div>';
      }
    }

    function runStep() {
      if (currentStep >= steps.length) {
        animTimeout = setTimeout(() => {
          resetAnim();
          setTimeout(runStep, 400);
        }, 2200);
        return;
      }
      const step = steps[currentStep];
      const bar = document.getElementById('progressBar');
      const pct = document.getElementById('progressPercent');
      const txt = document.getElementById('statusText');
      if (bar) bar.style.width = step.percent + '%';
      if (pct) pct.textContent = step.percent + '%';
      if (txt) txt.textContent = step.text + '...';
      const ticker = document.getElementById('ticker');
      if (ticker) {
        const line = document.createElement('div');
        line.className = 'ticker-line';
        line.textContent = '>> ' + step.text.toUpperCase() + '... OK';
        ticker.appendChild(line);
        ticker.scrollTop = ticker.scrollHeight;
      }
      currentStep++;
      animTimeout = setTimeout(runStep, 1100);
    }

    window.addEventListener('DOMContentLoaded', () => {
      resetAnim();
      setTimeout(runStep, 350);
    });
  </script>`;
}

/**
 * @param {string} style
 * @param {{ preview?: boolean, settingsPreview?: boolean }} [options]
 * @returns {string}
 */
function buildSplashHtml(style, options = {}) {
  const id = normalizeSplashStyle(style);
  const preview = Boolean(options.preview);
  const settingsPreview = Boolean(options.settingsPreview);
  const title = preview ? 'NodeTerm Splash - Interactive Preview' : 'NodeTerm';
  const controlsCss = preview ? getPreviewControlsCss() : '';
  const controlsHtml = preview ? buildPreviewControlsHtml() : '';
  let previewScript = '';
  if (preview) previewScript = buildPreviewScript(id);
  else if (settingsPreview) previewScript = buildSettingsPreviewScript();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
${getSplashBaseCss()}
${getSplashThemeCss()}
${controlsCss}
  </style>
</head>
<body class="theme-${id}">
  ${controlsHtml}
  <div class="cyber-grid"></div>
  <div class="container">
    <div class="logo-section">
      <div class="logo-wrapper">
        <div class="logo-icon">
          <span class="prompt">&gt;_</span>
          <span class="code">&lt;/&gt;_</span>
        </div>
      </div>
      <div>
        <div class="brand">NodeTerm</div>
        <div class="tagline">Secure. Reliable. Connected.</div>
      </div>
    </div>

    <div class="hud-frame">
      <div class="terminal-ticker" id="ticker">
        <div class="ticker-line">&gt;&gt; BOOTING NODETERM SHELL PROTOCOLS...</div>
      </div>
    </div>

    <div class="progress-section">
      <div class="progress-container">
        <div class="progress-bar" id="progressBar"></div>
      </div>
      <div class="progress-row">
        <div class="status" id="status">
          <div class="status-icon"></div>
          <span id="statusText">Iniciando...</span>
        </div>
        <div class="progress-percent" id="progressPercent">0%</div>
      </div>
    </div>
  </div>
  ${previewScript}
</body>
</html>`;
}

module.exports = {
  buildSplashHtml,
  getSplashThemeCss,
  getSplashBaseCss
};
