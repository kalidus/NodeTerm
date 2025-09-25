// Utilidades para generar CSS avanzado de temas de pestañas

export const generateAdvancedCSS = (themeName, styles) => {
  const baseCSS = `
    /* Override completo de PrimeReact */
    .p-tabview .p-tabview-nav li .p-tabview-nav-link {
      ${styles['--tab-clip-path'] ? `clip-path: var(--tab-clip-path) !important;` : ''}
      ${styles['--tab-backdrop-filter'] ? `backdrop-filter: var(--tab-backdrop-filter) !important;` : ''}
      ${styles['--tab-background-size'] ? `background-size: var(--tab-background-size) !important;` : ''}
      background-attachment: fixed !important;
      position: relative !important;
      overflow: hidden !important;
    }
  `;

  const themeSpecificCSS = {
    futuristic: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, transparent 30%, rgba(0, 212, 255, 0.1) 50%, transparent 70%);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        z-index: 1;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link:hover::before {
        opacity: 1;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: futuristic-glow 2s ease-in-out infinite alternate !important;
      }
      
      @keyframes futuristic-glow {
        from { box-shadow: 0 0 10px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1) !important; }
        to { box-shadow: 0 0 20px rgba(0, 212, 255, 0.6), inset 0 1px 0 rgba(255,255,255,0.2) !important; }
      }
    `,

    retro80s: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: retro-pulse 1.5s ease-in-out infinite alternate !important;
      }
      
      @keyframes retro-pulse {
        from { box-shadow: 0 0 15px rgba(255, 0, 110, 0.5), inset 0 1px 0 rgba(255,255,255,0.2) !important; }
        to { box-shadow: 0 0 25px rgba(255, 0, 110, 0.8), inset 0 1px 0 rgba(255,255,255,0.4) !important; }
      }
    `,

    diamond: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        transform: perspective(100px) rotateX(10deg) !important;
        margin: 0 4px !important;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: diamond-sparkle 3s ease-in-out infinite !important;
        transform: perspective(100px) rotateX(0deg) scale(1.02) !important;
      }
      
      @keyframes diamond-sparkle {
        0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 157, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1) !important; }
        50% { box-shadow: 0 0 30px rgba(255, 107, 157, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.3) !important; }
      }
    `,

    neonCity: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: neon-flicker 4s ease-in-out infinite !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, #ff0080, transparent, #00ffff, transparent, #ff0080);
        background-size: 200% 200%;
        animation: neon-border 3s linear infinite;
        z-index: -1;
        border-radius: inherit;
      }
      
      @keyframes neon-flicker {
        0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
        20%, 24%, 55% { opacity: 0.8; }
      }
      
      @keyframes neon-border {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `,

    galaxy: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: 
          radial-gradient(2px 2px at 20px 30px, #eee, transparent),
          radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
          radial-gradient(1px 1px at 90px 40px, #fff, transparent),
          radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
          radial-gradient(2px 2px at 160px 30px, #eee, transparent);
        background-repeat: repeat;
        background-size: 200px 100px;
        animation: stars-twinkle 5s ease-in-out infinite !important;
        pointer-events: none;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: galaxy-swirl 8s linear infinite !important;
      }
      
      @keyframes stars-twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      
      @keyframes galaxy-swirl {
        from { background-position: 0% 50%; }
        to { background-position: 100% 50%; }
      }
    `,


    holographic: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffa726) !important;
        background-size: 400% 400% !important;
        animation: holographic-shift 3s ease infinite !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%);
        animation: holographic-scan 2s linear infinite;
        pointer-events: none;
      }
      
      @keyframes holographic-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes holographic-scan {
        0% { transform: translateX(-100%) skewX(-15deg); }
        100% { transform: translateX(200%) skewX(-15deg); }
      }
    `,

    vhs: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);
        pointer-events: none;
        animation: scanlines 0.1s linear infinite;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: vhs-glitch 5s ease-in-out infinite !important;
      }
      
      @keyframes scanlines {
        0% { transform: translateY(0); }
        100% { transform: translateY(4px); }
      }
      
      @keyframes vhs-glitch {
        0%, 90%, 100% { transform: translateX(0); }
        91% { transform: translateX(-2px); }
        92% { transform: translateX(2px); }
        93% { transform: translateX(-1px); }
        94% { transform: translateX(1px); }
        95% { transform: translateX(0); }
      }
    `,

    crystal: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        clip-path: polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%) !important;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: crystal-shine 4s ease-in-out infinite !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
        animation: crystal-refraction 3s linear infinite;
        pointer-events: none;
        clip-path: inherit;
      }
      
      @keyframes crystal-shine {
        0%, 100% { filter: brightness(1) saturate(1); }
        50% { filter: brightness(1.3) saturate(1.5); }
      }
      
      @keyframes crystal-refraction {
        0% { transform: translateX(-100%) skewX(-20deg); }
        100% { transform: translateX(200%) skewX(-20deg); }
      }
    `,

    cyberpunk2077: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px)) !important;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: cyberpunk-glitch 3s ease-in-out infinite !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, #fcee21, transparent);
        animation: cyberpunk-scan 2s linear infinite;
        pointer-events: none;
        clip-path: inherit;
      }
      
      @keyframes cyberpunk-glitch {
        0%, 95%, 100% { transform: translateX(0); }
        96% { transform: translateX(-2px) scaleX(0.98); }
        97% { transform: translateX(1px) scaleX(1.02); }
        98% { transform: translateX(-1px) scaleX(0.99); }
        99% { transform: translateX(0) scaleX(1); }
      }
      
      @keyframes cyberpunk-scan {
        0% { transform: translateX(-100%); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateX(100%); opacity: 0; }
      }
    `,

    lavaLamp: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: lava-bubble 4s ease-in-out infinite !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 10%;
        left: 20%;
        width: 60%;
        height: 80%;
        background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
        border-radius: 50%;
        animation: bubble-float 6s ease-in-out infinite;
        pointer-events: none;
      }
      
      @keyframes lava-bubble {
        0%, 100% { border-radius: 20px 20px 0 0; }
        25% { border-radius: 30px 15px 0 0; }
        50% { border-radius: 15px 30px 0 0; }
        75% { border-radius: 25px 20px 0 0; }
      }
      
      @keyframes bubble-float {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
        50% { transform: translateY(-10px) scale(1.1); opacity: 0.6; }
      }
    `,

    rainbow: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        background: linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff0080) !important;
        background-size: 200% 200% !important;
        animation: rainbow-shift 3s ease infinite !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: rainbow-sparkle 1.5s ease-in-out infinite;
        pointer-events: none;
      }
      
      @keyframes rainbow-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes rainbow-sparkle {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 0; }
        50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
      }
    `,

    terminal: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(0deg, transparent, transparent 1px, #00ff00 1px, #00ff00 2px);
        opacity: 0.1;
        animation: terminal-scan 2s linear infinite;
        pointer-events: none;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: terminal-blink 1s ease-in-out infinite alternate !important;
      }
      
      @keyframes terminal-scan {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      
      @keyframes terminal-blink {
        from { text-shadow: 0 0 5px #00ff00; }
        to { text-shadow: 0 0 10px #00ff00, 0 0 15px #00ff00; }
      }
    `,

    terminalBlue: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(0deg, transparent, transparent 1px, #00bfff 1px, #00bfff 2px);
        opacity: 0.1;
        animation: terminal-scan-blue 2s linear infinite;
        pointer-events: none;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: terminal-blink-blue 1s ease-in-out infinite alternate !important;
      }
      
      @keyframes terminal-scan-blue {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      
      @keyframes terminal-blink-blue {
        from { text-shadow: 0 0 5px #00bfff; }
        to { text-shadow: 0 0 10px #00bfff, 0 0 15px #00bfff; }
      }
    `,

    terminalOrange: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(0deg, transparent, transparent 1px, #ff8c00 1px, #ff8c00 2px);
        opacity: 0.1;
        animation: terminal-scan-orange 2s linear infinite;
        pointer-events: none;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: terminal-blink-orange 1s ease-in-out infinite alternate !important;
      }
      
      @keyframes terminal-scan-orange {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      
      @keyframes terminal-blink-orange {
        from { text-shadow: 0 0 5px #ff8c00; }
        to { text-shadow: 0 0 10px #ff8c00, 0 0 15px #ff8c00; }
      }
    `,

    neonPink: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: pink-glow 2s ease-in-out infinite alternate !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at center, rgba(255, 0, 128, 0.3) 0%, transparent 70%);
        animation: pink-pulse 3s ease-in-out infinite;
        pointer-events: none;
      }
      
      @keyframes pink-glow {
        from { box-shadow: 0 0 15px #ff0080, inset 0 0 15px rgba(255, 0, 128, 0.2); }
        to { box-shadow: 0 0 30px #ff0080, inset 0 0 30px rgba(255, 0, 128, 0.4); }
      }
      
      @keyframes pink-pulse {
        0%, 100% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.2); opacity: 0.6; }
      }
    `,

    fire: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: fire-flicker 0.5s ease-in-out infinite alternate !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(0deg, #ff4500 0%, transparent 80%);
        animation: fire-dance 2s ease-in-out infinite;
        pointer-events: none;
      }
      
      @keyframes fire-flicker {
        0%, 100% { box-shadow: 0 0 20px #ff4500, inset 0 0 20px rgba(255, 69, 0, 0.3); }
        50% { box-shadow: 0 0 40px #ff6347, inset 0 0 40px rgba(255, 99, 71, 0.5); }
      }
      
      @keyframes fire-dance {
        0%, 100% { transform: skewX(0deg) scaleY(1); }
        25% { transform: skewX(5deg) scaleY(1.1); }
        50% { transform: skewX(-3deg) scaleY(0.9); }
        75% { transform: skewX(2deg) scaleY(1.05); }
      }
    `,


    ocean: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: ocean-wave 4s ease-in-out infinite !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(90deg, transparent, #4fc3f7, transparent);
        animation: wave-motion 3s ease-in-out infinite;
        pointer-events: none;
      }
      
      @keyframes ocean-wave {
        0%, 100% { border-radius: 20px 20px 0 0; }
        33% { border-radius: 15px 25px 0 0; }
        66% { border-radius: 25px 15px 0 0; }
      }
      
      @keyframes wave-motion {
        0%, 100% { transform: translateX(-100%) scaleX(0.5); }
        50% { transform: translateX(100%) scaleX(1.5); }
      }
    `,

    steam: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: steam-glow 2s ease-in-out infinite alternate !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 50% 100%, rgba(191, 144, 0, 0.2) 0%, transparent 50%);
        animation: steam-rise 4s ease-in-out infinite;
        pointer-events: none;
      }
      
      @keyframes steam-glow {
        from { box-shadow: inset 0 0 20px rgba(191, 144, 0, 0.3), 0 0 15px rgba(191, 144, 0, 0.5); }
        to { box-shadow: inset 0 0 30px rgba(191, 144, 0, 0.5), 0 0 25px rgba(191, 144, 0, 0.8); }
      }
      
      @keyframes steam-rise {
        0% { transform: translateY(20px) scale(0.8); opacity: 0; }
        50% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-10px) scale(1.1); opacity: 0; }
      }
    `,

    steamBlue: `
      /* Eliminar completamente la barra inferior de PrimeReact */
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: steam-glow-blue 2s ease-in-out infinite alternate !important;
        border-bottom: none !important;
        border-bottom-width: 0 !important;
        border-bottom-style: none !important;
        border-bottom-color: transparent !important;
        box-shadow: inset 0 0 20px rgba(0, 188, 212, 0.3), 0 0 15px rgba(0, 188, 212, 0.5) !important;
      }
      
      /* Eliminar la barra inferior del contenedor de pestañas */
      .p-tabview .p-tabview-nav {
        border-bottom: none !important;
      }
      
      /* Eliminar cualquier pseudo-elemento que cree bordes */
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link::after,
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link::before {
        border-bottom: none !important;
      }
      
      /* Eliminar la línea inferior del panel de contenido */
      .p-tabview .p-tabview-panels {
        border-top: none !important;
      }
      
      /* Efecto de vapor steampunk */
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 50% 100%, rgba(0, 188, 212, 0.2) 0%, transparent 50%);
        animation: steam-rise-blue 4s ease-in-out infinite;
        pointer-events: none;
        z-index: 1;
      }
      
      @keyframes steam-glow-blue {
        from { box-shadow: inset 0 0 20px rgba(0, 188, 212, 0.3), 0 0 15px rgba(0, 188, 212, 0.5); }
        to { box-shadow: inset 0 0 30px rgba(0, 188, 212, 0.5), 0 0 25px rgba(0, 188, 212, 0.8); }
      }
      
      @keyframes steam-rise-blue {
        0% { transform: translateY(20px) scale(0.8); opacity: 0; }
        50% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-10px) scale(1.1); opacity: 0; }
      }
    `,

    steamGreen: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: steam-glow-green 2s ease-in-out infinite alternate !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 50% 100%, rgba(76, 175, 80, 0.2) 0%, transparent 50%);
        animation: steam-rise-green 4s ease-in-out infinite;
        pointer-events: none;
      }
      
      @keyframes steam-glow-green {
        from { box-shadow: inset 0 0 20px rgba(76, 175, 80, 0.3), 0 0 15px rgba(76, 175, 80, 0.5); }
        to { box-shadow: inset 0 0 30px rgba(76, 175, 80, 0.5), 0 0 25px rgba(76, 175, 80, 0.8); }
      }
      
      @keyframes steam-rise-green {
        0% { transform: translateY(20px) scale(0.8); opacity: 0; }
        50% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-10px) scale(1.1); opacity: 0; }
      }
    `,

    space: `
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        animation: space-glow 3s ease-in-out infinite alternate !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: 
          radial-gradient(1px 1px at 20% 30%, white, transparent),
          radial-gradient(1px 1px at 40% 70%, rgba(0, 188, 212, 0.8), transparent),
          radial-gradient(1px 1px at 90% 40%, white, transparent);
        background-size: 100px 80px;
        animation: stars-drift 10s linear infinite;
        pointer-events: none;
      }
      
      @keyframes space-glow {
        from { box-shadow: 0 0 20px rgba(0, 188, 212, 0.4), inset 2px 2px 10px rgba(0, 188, 212, 0.2); }
        to { box-shadow: 0 0 35px rgba(0, 188, 212, 0.7), inset 2px 2px 15px rgba(0, 188, 212, 0.4); }
      }
      
      @keyframes stars-drift {
        from { background-position: 0 0; }
        to { background-position: 100px 80px; }
      }
    `,

    vscode: `
      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        font-family: var(--tab-font-family, 'Segoe UI, system-ui, sans-serif') !important;
        font-size: var(--tab-font-size, 13px) !important;
        font-weight: var(--tab-font-weight, 400) !important;
        padding: var(--tab-padding, 8px 12px) !important;
        min-width: var(--tab-min-width, 120px) !important;
        max-width: var(--tab-max-width, 240px) !important;
        border-bottom: 1px solid var(--ui-tab-border) !important;
        position: relative !important;
      }
      
      .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
        border-bottom: 1px solid var(--ui-tab-active-bg) !important;
        background: var(--ui-tab-active-bg) !important;
        color: var(--ui-tab-active-text) !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link:hover {
        background: var(--ui-tab-hover-bg) !important;
        color: var(--ui-tab-active-text) !important;
      }
      
      /* Iconos de archivo estilo VS Code */
      .p-tabview .p-tabview-nav li .p-tabview-nav-link .p-tabview-nav-link-icon {
        margin-right: 6px !important;
        font-size: 14px !important;
      }
      
      /* Colores de iconos específicos para tipos de archivo */
      .p-tabview .p-tabview-nav li .p-tabview-nav-link[data-file-type="json"] .p-tabview-nav-link-icon {
        color: #fdd835 !important; /* Amarillo para JSON */
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link[data-file-type="js"] .p-tabview-nav-link-icon {
        color: #4caf50 !important; /* Verde para JavaScript */
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link[data-file-type="webpack"] .p-tabview-nav-link-icon {
        color: #2196f3 !important; /* Azul para Webpack */
      }
      
      /* Indicador de archivo modificado (U) */
      .p-tabview .p-tabview-nav li .p-tabview-nav-link::after {
        content: '';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #fdd835;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link[data-modified="true"]::after {
        opacity: 1;
      }
      
      /* Botón de cerrar estilo VS Code */
      .p-tabview .p-tabview-nav li .p-tabview-nav-link .p-tabview-nav-link-close {
        position: absolute !important;
        right: 8px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 2px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 0 !important;
        transition: all 0.2s ease !important;
        color: var(--ui-tab-text) !important;
        font-size: 12px !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link:hover .p-tabview-nav-link-close {
        opacity: 1 !important;
      }
      
      .p-tabview .p-tabview-nav li .p-tabview-nav-link .p-tabview-nav-link-close:hover {
        background: var(--ui-tab-close-hover) !important;
        color: white !important;
      }
      
      /* Separador entre pestañas */
      .p-tabview .p-tabview-nav li:not(:last-child) .p-tabview-nav-link {
        border-right: 1px solid var(--ui-tab-border) !important;
      }
      
      /* Efecto de hover suave */
      .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        transition: all 0.2s ease !important;
      }
    `
  };

  return baseCSS + (themeSpecificCSS[themeName] || '');
};
