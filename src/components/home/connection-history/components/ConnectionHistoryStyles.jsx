import React from 'react';
import { adjustOpacity } from '../utils/connectionHistoryHelpers';

/**
 * Generador de estilos dinámicos interpolados para ConnectionHistory
 * Aísla ~1.400 líneas de reglas CSS dinámicas dependientes de themeColors y terminalTheme
 */
const ConnectionHistoryStyles = ({
	themeColors = {},
	terminalTheme = {},
	terminalOpacity = 0.85
}) => {
	return (
			<style>{`
				/* -- Custom Hero Splash Styles -- */
				.connection-history-root { background: transparent !important; height: 100%; display: flex; flex-direction: column; color: ${themeColors.textPrimary || '#fff'}; }
				.connection-history-root:not(.is-terminal-view) { overflow-y: auto; }
				.connection-history-root.is-terminal-view { overflow: hidden; }
				.connection-history-section { border: none !important; background: transparent !important; }
				.hero-splash-header {
					text-align: center;
					padding: 10px 20px 10px;
					background: transparent;
					position: relative;
					margin-bottom: 0px;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
				}
				.hero-title { 
					font-size: 28px; 
					font-weight: 900; 
					color: ${themeColors.textPrimary || '#ffffff'};
					margin: 0; 
					letter-spacing: 2px;
					font-family: 'Fira Code', monospace;
					text-transform: uppercase;
					text-shadow: 0 0 10px ${terminalTheme.green || '#27c93f'}, 
					            0 0 20px ${terminalTheme.green ? terminalTheme.green + '44' : 'rgba(0,0,0,0.2)'};
					position: relative;
				}
				.hero-title::after {
					content: '_';
					animation: blink 1s step-end infinite;
					color: ${terminalTheme.green || '#27c93f'};
				}
				@keyframes blink {
					50% { opacity: 0; }
				}
				.hero-status { color: #81c784; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; font-family: 'Fira Code', monospace; }
				.hero-search-container { 
					width: 100%; 
					max-width: 480px;
					margin: 0 auto;
					position: relative; 
					z-index: 100;
					filter: drop-shadow(0 0 5px ${terminalTheme.green ? terminalTheme.green + '11' : 'rgba(0,0,0,0)'});
				}
				.hero-search-container::before {
					content: "\u279C  ~";
					position: absolute;
					left: 18px;
					top: 50%;
					transform: translateY(-50%);
					color: ${terminalTheme.green || '#27c93f'};
					font-family: 'Fira Code', 'Consolas', monospace;
					font-weight: bold;
					font-size: 0.8rem;
					z-index: 2;
					pointer-events: none;
					text-shadow: 0 0 5px ${terminalTheme.green || '#27c93f'};
				}
				/* Scanline animation for the search bar */
				.hero-search-container::after {
					content: "";
					position: absolute;
					top: 0; left: 0; right: 0; bottom: 0;
					background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.05) 50%);
					background-size: 100% 2px;
					pointer-events: none;
					z-index: 4;
					border-radius: 4px;
					opacity: 0.3;
				}
				.hero-search-input, .p-inputtext.hero-search-input:enabled:focus {
					width: 100% !important;
					background: ${terminalTheme.background ? adjustOpacity(terminalTheme.background, 0.6) : 'rgba(15, 15, 15, 0.6)'} !important;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '66' : 'rgba(255,255,255,0.15)'} !important;
					border-radius: 4px !important;
					padding: 8px 65px 8px 55px !important;
					color: ${terminalTheme.foreground || '#fff'} !important;
					font-size: 0.85rem;
					font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace !important;
					outline: none !important;
					box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.02) !important;
					backdrop-filter: blur(8px);
					transition: all 0.2s ease;
				}
				.hero-search-input::placeholder {
					color: ${terminalTheme.foreground || '#fff'};
					opacity: 0.25;
					text-transform: uppercase;
					font-size: 0.7rem;
					letter-spacing: 1px;
				}
				.hero-search-input:focus, .p-inputtext.hero-search-input:enabled:focus {
					border-color: ${terminalTheme.green ? adjustOpacity(terminalTheme.green, 0.6) : 'rgba(39, 201, 63, 0.6)'} !important;
					box-shadow: 0 0 15px ${terminalTheme.green ? terminalTheme.green + '33' : 'rgba(39, 201, 63, 0.2)'},
					            inset 0 0 5px rgba(0,0,0,0.3) !important;
				}
				.hero-search-spinner { position: absolute; right: 70px; top: 50%; transform: translateY(-50%); color: ${terminalTheme.green || '#27c93f'}; font-size: 1rem; z-index: 5; }
				
				.hero-terminal-btn {
					position: absolute;
					right: 10px;
					top: 50%;
					transform: translateY(-50%);
					height: 24px;
					min-width: 44px;
					padding: 0 10px;
					border-radius: 6px;
					background: rgba(255, 255, 255, 0.05);
					border: 1px solid rgba(255, 255, 255, 0.12);
					color: ${terminalTheme.foreground || '#fff'};
					font-family: 'Fira Code', monospace;
					font-weight: 700;
					font-size: 0.85rem;
					display: flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					z-index: 10;
					transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
					backdrop-filter: blur(10px);
					box-shadow: 0 2px 8px rgba(0,0,0,0.3);
					letter-spacing: 1px;
				}
				.hero-terminal-btn .btn-prompt {
					color: ${terminalTheme.green || '#27c93f'};
					text-shadow: 0 0 5px ${terminalTheme.green ? terminalTheme.green + '55' : 'rgba(39, 201, 63, 0.3)'};
				}
				.hero-terminal-btn .btn-cursor {
					opacity: 0.8;
					animation: btn-blink 1s step-end infinite;
					margin-left: 1px;
				}
				@keyframes btn-blink {
					50% { opacity: 0; }
				}
				.hero-terminal-btn:hover {
					background: ${terminalTheme.green ? terminalTheme.green + '15' : 'rgba(39, 201, 63, 0.1)'};
					border-color: ${terminalTheme.green ? terminalTheme.green + '55' : 'rgba(39, 201, 63, 0.4)'};
					transform: translateY(-50%) scale(1.04);
					box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 8px ${terminalTheme.green ? terminalTheme.green + '22' : 'rgba(39, 201, 63, 0.1)'};
				}
				.hero-terminal-btn:hover .btn-cursor {
					animation: none;
					opacity: 1;
				}
				.hero-terminal-btn:active {
					transform: translateY(-50%) scale(0.96);
					background: ${terminalTheme.green ? terminalTheme.green + '25' : 'rgba(39, 201, 63, 0.2)'};
				}

				.hero-action-buttons {
					display: flex;
					justify-content: center;
					gap: 8px;
					margin-top: 10px;
					padding: 3px;
					background: rgba(0, 0, 0, 0.2);
					border-radius: 6px;
					border: 1px solid rgba(255, 255, 255, 0.05);
					box-shadow: inset 0 1px 5px rgba(0,0,0,0.2);
					backdrop-filter: blur(6px);
				}
				.hero-action-btn {
					background: transparent;
					border: 1px solid transparent;
					border-radius: 4px;
					padding: 6px 16px;
					color: rgba(255,255,255,0.4);
					font-size: 0.75rem;
					font-weight: 600;
					font-family: 'Fira Code', 'Consolas', monospace;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					display: flex;
					align-items: center;
					gap: 8px;
					cursor: pointer;
					transition: all 0.2s;
				}
				.hero-action-btn:hover {
					color: #fff;
					background: rgba(255, 255, 255, 0.05);
				}
				.hero-action-btn.active {
					background: ${terminalTheme.selectionBackground ? adjustOpacity(terminalTheme.selectionBackground, 0.2) : 'rgba(255,255,255,0.05)'};
					color: #fff;
					border-bottom: 2px solid ${terminalTheme.green || '#3fb950'};
					box-shadow: 0 2px 10px rgba(0,0,0,0.2);
				}
				.hero-action-btn i {
					font-size: 0.85rem;
					opacity: 0.6;
				}
				.hero-action-btn.active i {
					opacity: 1;
					color: ${terminalTheme.green || '#3fb950'};
				}
				.hero-action-btn.terminal-primary {
					color: ${terminalTheme.green || '#3fb950'};
					border-bottom: 2px solid ${terminalTheme.green || '#3fb950'};
				}
				.hero-action-btn.terminal-primary:hover {
					background: ${terminalTheme.green ? terminalTheme.green + '11' : 'rgba(39, 201, 63, 0.05)'};
				}
				
				.hero-shortcuts { color: ${themeColors.textSecondary || 'rgba(255,255,255,0.2)'}; font-size: 0.7rem;}
				.hero-shortcuts kbd { background: rgba(255,255,255,0.03); padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.05); margin-right: 4px; font-family: monospace; color: rgba(255,255,255,0.5); }

				/* --- Top Terminal Frame (Search + Actions) --- */
				.top-terminal-frame {
					margin: 0 auto 12px auto;
					border-radius: 6px;
					overflow: hidden;
					display: flex;
					flex-direction: column;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '44' : 'rgba(255,255,255,0.1)'};
					background: ${terminalTheme.background ? adjustOpacity(terminalTheme.background, 0.8) : 'rgba(15, 15, 15, 0.8)'};
					box-shadow: 0 15px 40px rgba(0,0,0,0.5), inset 0 0 80px rgba(0,0,0,0.2);
					max-width: 600px;
					width: 100%;
					position: relative;
					backdrop-filter: blur(12px);
				}
				.top-terminal-header {
					height: 30px;
					box-sizing: border-box;
					flex-shrink: 0;
					background: ${adjustOpacity(terminalTheme.background || '#0d1117', Math.min(terminalOpacity + 0.1, 1.0))};
					border-bottom: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '44' : 'rgba(255,255,255,0.08)'};
					border-radius: 12px 12px 0 0;
					display: flex;
					align-items: center;
					padding: 0 10px;
					position: relative;
					gap: 0;
				}
				.top-terminal-header .traffic-lights {
					display: flex;
					gap: 6px;
					align-items: center;
					flex-shrink: 0;
				}
				.top-terminal-header .traffic-dot {
					width: 12px;
					height: 12px;
					border-radius: 50%;
					flex-shrink: 0;
				}
				.top-terminal-header .traffic-dot.red { background: #ff5f56; border: 1px solid #e0443e; cursor: pointer; transition: filter 0.15s; }
				.top-terminal-header .traffic-dot.red:hover { filter: brightness(1.25); }
				.top-terminal-header .traffic-dot.yellow { background: #ffbd2e; border: 1px solid #dea123; cursor: pointer; transition: filter 0.15s; }
				.top-terminal-header .traffic-dot.yellow:hover { filter: brightness(1.25); }
				.top-terminal-header .traffic-dot.green { background: #27c93f; border: 1px solid #1aab29; cursor: pointer; transition: filter 0.15s; }
				.top-terminal-header .traffic-dot.green:hover { filter: brightness(1.25); }
				.top-terminal-header .header-path {
					position: absolute;
					left: 50%;
					top: 50%;
					transform: translate(-50%, -50%);
					color: ${terminalTheme.foreground || '#c9d1d9'};
					font-size: 11.5px;
					user-select: none;
					pointer-events: none;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
					font-weight: 500;
					letter-spacing: 0.3px;
					display: flex;
					align-items: center;
					gap: 6px;
					white-space: nowrap;
				}
				.top-terminal-header .header-brand {
					font-weight: 800;
					letter-spacing: 0.5px;
					color: ${themeColors.textPrimary || '#fff'};
					opacity: 1;
				}
				.top-terminal-header .header-sessions {
					font-size: 10px;
					opacity: 0.7;
					display: flex;
					align-items: center;
					gap: 4px;
					background: rgba(129, 199, 132, 0.1);
					padding: 2px 8px;
					border-radius: 10px;
					color: #81c784;
					border: 1px solid rgba(129, 199, 132, 0.2);
				}
				.top-terminal-header .header-path .path-tilde { color: ${terminalTheme.green || '#3fb950'}; opacity: 0.8; }
				
				.top-terminal-body {
					padding: 10px 20px 12px;
					display: flex;
					flex-direction: column;
					align-items: center;
					background: transparent;
				}

				/* --- Terminal Frame for Recents --- */
				.recents-terminal-frame {
					margin: 0 1rem 1rem 1rem;
					border-radius: 12px;
					overflow: hidden;
					display: flex;
					flex-direction: column;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '55' : 'rgba(255,255,255,0.12)'};
					box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
					flex: 1;
					min-height: 120px;
					box-sizing: border-box;
				}
				.recents-terminal-header {
					height: 30px;
					box-sizing: border-box;
					flex-shrink: 0;
					background: ${(() => {
					const bg = terminalTheme.background || '#0d1117';
					const adjustOpacity = (color, opacity) => {
						if (!color) return `rgba(0,0,0,${opacity})`;
						if (color.startsWith('rgba')) {
							return color.replace(/[\d.]+\)$/g, `${opacity})`);
						}
						if (color.startsWith('#')) {
							const hex = color.replace('#', '');
							const r = parseInt(hex.substring(0, 2), 16) || 0;
							const g = parseInt(hex.substring(2, 4), 16) || 0;
							const b = parseInt(hex.substring(4, 6), 16) || 0;
							return `rgba(${r}, ${g}, ${b}, ${opacity})`;
						}
						return color;
					};
					// Un poco más de opacidad para el header para que se note, pero que siga siendo transparente
					return adjustOpacity(bg, Math.min(terminalOpacity + 0.1, 1.0));
				})()};
					border-bottom: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '44' : 'rgba(255,255,255,0.08)'};
					border-radius: 12px 12px 0 0;
					display: flex;
					align-items: center;
					padding: 0 12px;
					position: relative;
					gap: 0;
				}
				.recents-terminal-header .traffic-lights {
					display: flex;
					gap: 6px;
					align-items: center;
					flex-shrink: 0;
					min-width: 50px;
					z-index: 5;
				}
				.recents-terminal-header .traffic-dot {
					width: 12px;
					height: 12px;
					border-radius: 50%;
					flex-shrink: 0;
				}
				.recents-terminal-header .traffic-dot.red { background: #ff5f56; border: 1px solid #e0443e; cursor: pointer; transition: filter 0.15s; }
				.recents-terminal-header .traffic-dot.red:hover { filter: brightness(1.25); }
				.recents-terminal-header .traffic-dot.yellow { background: #ffbd2e; border: 1px solid #dea123; cursor: pointer; transition: filter 0.15s; }
				.recents-terminal-header .traffic-dot.yellow:hover { filter: brightness(1.25); }
				.recents-terminal-header .traffic-dot.green { background: #27c93f; border: 1px solid #1aab29; cursor: pointer; transition: filter 0.15s; }
				.recents-terminal-header .traffic-dot.green:hover { filter: brightness(1.25); }
				.recents-terminal-header .header-path {
					flex: 1;
					text-align: center;
					color: ${terminalTheme.foreground || '#c9d1d9'};
					opacity: 0.6;
					font-size: 11.5px;
					user-select: none;
					pointer-events: none;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
					font-weight: 400;
					letter-spacing: 0.3px;
				}
				.recents-terminal-header .header-path .path-tilde { color: ${terminalTheme.green || '#3fb950'}; }
				
				/* GNOME Style */
				.gnome-dot {
					width: 24px;
					height: 24px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					background: rgba(255,255,255,0.1);
					color: #fff;
					font-size: 10px;
					cursor: pointer;
					transition: background 0.2s;
				}
				.gnome-dot:hover { background: #e81123; }
				.gnome-controls { display: flex; align-items: center; }

				/* KDE Style */
				.kde-controls { display: flex; align-items: center; gap: 4px; }
				.kde-dot {
					width: 24px;
					height: 24px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: ${themeColors.textPrimary || '#fff'};
					cursor: pointer;
					border-radius: 4px;
					transition: all 0.2s;
				}
				.kde-dot:hover { background: rgba(255,255,255,0.1); }
				.kde-dot.close:hover { background: #e81123; color: #fff !important; }

				/* Custom Thin Icons */
				.custom-icon {
					width: 10px;
					height: 10px;
					position: relative;
					display: flex;
					align-items: center;
					justify-content: center;
					opacity: 0.8;
				}
				.kde-dot:hover .custom-icon { opacity: 1; }
				.icon-min::after {
					content: '';
					width: 10px;
					height: 1px;
					background: currentColor;
				}
				.icon-max::after {
					content: '';
					width: 8px;
					height: 8px;
					border: 1px solid currentColor;
				}
				.icon-close::before, .icon-close::after {
					content: '';
					position: absolute;
					width: 11px;
					height: 1px;
					background: currentColor;
				}
				.icon-close::before { transform: rotate(45deg); }
				.icon-close::after { transform: rotate(-45deg); }

				/* Windows Style */
				.windows-controls { display: flex; align-items: center; }
				.win-dot {
					width: 32px;
					height: 24px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: ${themeColors.textPrimary || '#fff'};
					cursor: pointer;
					transition: all 0.15s;
				}
				.win-dot:hover { background: rgba(255,255,255,0.1); }
				.win-dot.close:hover { background: #e81123; color: #fff !important; }

				/* Futuristic Style */
				.recents-terminal-frame.futuristic, .top-terminal-frame.futuristic {
					border: 1px solid #00f2ff !important;
					box-shadow: 0 0 15px rgba(0, 242, 255, 0.3) !important;
					clip-path: polygon(0 0, 98% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%);
					background: transparent !important;
					padding: 1px;
				}
				.futuristic-controls { display: flex; gap: 10px; }
				.cyber-dot {
					width: 20px; height: 20px;
					border: 1px solid #00f2ff;
					display: flex; align-items: center; justify-content: center;
					font-size: 10px; color: #00f2ff; cursor: pointer;
					text-shadow: 0 0 5px #00f2ff;
					transform: skew(-15deg);
					transition: all 0.2s;
				}
				.cyber-dot:hover { background: #00f2ff; color: #000; box-shadow: 0 0 10px #00f2ff; }

				/* Modern Glass Style */
				.recents-terminal-frame.modern {
					border: 1px solid rgba(255,255,255,0.2) !important;
					backdrop-filter: blur(25px) saturate(180%) !important;
					background: transparent !important;
					border-radius: 16px !important;
					overflow: hidden;
				}
				.modern-controls { display: flex; gap: 6px; }
				.glass-dot {
					width: 28px; height: 28px;
					border-radius: 8px;
					display: flex; align-items: center; justify-content: center;
					background: rgba(255,255,255,0.05);
					border: 1px solid rgba(255,255,255,0.1);
					color: #fff; cursor: pointer;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				}
				.glass-dot:hover { background: rgba(255,255,255,0.15); transform: translateY(-1px); }

				/* Retro CRT Style */
				.recents-terminal-frame.retro {
					border: 10px solid #2c2c2c !important;
					border-radius: 20px !important;
					box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 5px 15px rgba(0,0,0,0.5) !important;
					background: transparent !important;
				}
				.retro-controls { display: flex; gap: 8px; }
				.retro-switch {
					width: 24px; height: 12px;
					background: #444; border: 2px solid #666;
					position: relative; cursor: pointer;
				}
				.retro-switch::after {
					content: ''; position: absolute; left: 2px; top: 2px;
					width: 8px; height: 4px; background: #888;
				}
				.retro-switch.on::after { left: auto; right: 2px; background: #0f0; box-shadow: 0 0 5px #0f0; }

				/* Removed WhiteSur, Orchis, Fluent as requested */

				/* Matcha Style */
				.recents-terminal-frame.matcha {
					border-top: 3px solid #2eb398 !important;
					border-radius: 4px !important;
				}
				.matcha-controls { display: flex; gap: 2px; }
				.matcha-dot {
					width: 26px; height: 26px;
					display: flex; align-items: center; justify-content: center;
					color: #aaa; cursor: pointer;
				}
				.matcha-dot:hover { color: #fff; background: rgba(255,255,255,0.05); }
				
				.recents-header-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
				.recents-header-filter-btn {
					background: transparent;
					border: none;
					color: ${terminalTheme.foreground || '#c9d1d9'};
					opacity: 0.6;
					cursor: pointer;
					padding: 4px 6px;
					border-radius: 4px;
					font-size: 0.85rem;
					transition: color 0.15s, background 0.15s;
					display: flex; align-items: center;
				}
				.recents-header-filter-btn:hover, .recents-header-filter-btn.active { color: ${terminalTheme.green || '#3fb950'}; background: rgba(255,255,255,0.06); opacity: 1; }
				.recents-filter-chips-bar {
					display: flex;
					align-items: center;
					gap: 6px;
					padding: 4px 12px;
					border-bottom: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '33' : 'rgba(255,255,255,0.05)'};
					background: transparent;
					flex-wrap: wrap;
				}
				.recents-terminal-body {
					flex: 1;
					overflow-y: auto;
					padding: 4px 0;
					scrollbar-width: thin;
					scrollbar-color: ${terminalTheme.brightBlack || '#444'} transparent;
				}

				/* Apply Opacity to Terminal Backgrounds (High Specificity Overrides) */
				.recents-terminal-frame, .top-terminal-frame,
				.recents-terminal-frame.macos, .top-terminal-frame.macos,
				.recents-terminal-frame.gnome, .top-terminal-frame.gnome,
				.recents-terminal-frame.kde, .top-terminal-frame.kde,
				.recents-terminal-frame.windows, .top-terminal-frame.windows,
				.recents-terminal-frame.matcha, .top-terminal-frame.matcha,
				.recents-terminal-frame.futuristic, .top-terminal-frame.futuristic,
				.recents-terminal-frame.modern, .top-terminal-frame.modern,
				.recents-terminal-frame.retro, .top-terminal-frame.retro,
				.recents-terminal-frame.cyberpunk-pro, .top-terminal-frame.cyberpunk-pro,
				.recents-terminal-frame.hologram, .top-terminal-frame.hologram,
				.recents-terminal-frame.holo-amber, .top-terminal-frame.holo-amber,
				.recents-terminal-frame.holo-emerald, .top-terminal-frame.holo-emerald,
				.recents-terminal-frame.holo-crimson, .top-terminal-frame.holo-crimson,
				.recents-terminal-frame.holo-violet, .top-terminal-frame.holo-violet,
				.recents-terminal-frame.plasma-cyan, .top-terminal-frame.plasma-cyan,
				.recents-terminal-frame.synthwave, .top-terminal-frame.synthwave,
				.recents-terminal-frame.matrix, .top-terminal-frame.matrix,
				.recents-terminal-frame.aurora-glass, .top-terminal-frame.aurora-glass,
				.recents-terminal-frame.stealth, .top-terminal-frame.stealth {
					background-color: ${(() => {
					const bg = terminalTheme.background || '#0d1117';
					const adjustOpacityLoc = (color, opacity) => {
						if (!color) return `rgba(0,0,0,${opacity})`;
						if (color.startsWith('rgba')) {
							return color.replace(/[\d.]+\)$/g, `${opacity})`);
						}
						if (color.startsWith('#')) {
							const hex = color.replace('#', '');
							const r = parseInt(hex.substring(0, 2), 16) || 0;
							const g = parseInt(hex.substring(2, 4), 16) || 0;
							const b = parseInt(hex.substring(4, 6), 16) || 0;
							return `rgba(${r}, ${g}, ${b}, ${opacity})`;
						}
						return color;
					};
					return adjustOpacityLoc(bg, terminalOpacity);
				})()} !important;
					background: ${(() => {
					const bg = terminalTheme.background || '#0d1117';
					const adjustOpacityLoc = (color, opacity) => {
						if (!color) return `rgba(0,0,0,${opacity})`;
						if (color.startsWith('rgba')) {
							return color.replace(/[\d.]+\)$/g, `${opacity})`);
						}
						if (color.startsWith('#')) {
							const hex = color.replace('#', '');
							const r = parseInt(hex.substring(0, 2), 16) || 0;
							const g = parseInt(hex.substring(2, 4), 16) || 0;
							const b = parseInt(hex.substring(4, 6), 16) || 0;
							return `rgba(${r}, ${g}, ${b}, ${opacity})`;
						}
						return color;
					};
					return adjustOpacityLoc(bg, terminalOpacity);
				})()} !important;
				}
				}

				/* Tarjeta NodeTerm (hometab): mismo fondo que la sidebar */
				.top-terminal-frame,
				.top-terminal-frame.macos, .top-terminal-frame.gnome,
				.top-terminal-frame.kde, .top-terminal-frame.windows,
				.top-terminal-frame.matcha, .top-terminal-frame.futuristic,
				.top-terminal-frame.modern, .top-terminal-frame.retro {
					background-color: ${adjustOpacity(themeColors.sidebarBackground || terminalTheme.background || '#0d1117', terminalOpacity)} !important;
					background: ${adjustOpacity(themeColors.sidebarBackground || terminalTheme.background || '#0d1117', terminalOpacity)} !important;
				}

				/* --- Grep-style connection rows (Adaptable y fluido) --- */
				.connection-list-container {
					container-type: inline-size;
					width: 100%;
					min-width: 0;
				}
				.connection-list-body {
					display: flex !important;
					flex-direction: column !important;
					gap: 0 !important;
					padding: 0 !important;
					width: 100% !important;
					max-width: 100% !important;
					margin: 0 !important;
					overflow: visible !important;
				}
				.hero-recent-card {
					display: flex !important;
					align-items: center !important;
					gap: 6px !important;
					background: transparent !important;
					border: none !important;
					border-left: 2px solid transparent !important;
					border-bottom: 1px solid rgba(255,255,255,0.02) !important;
					border-radius: 0 !important;
					padding: 0 8px 0 8px !important;
					cursor: pointer !important;
					transition: background 0.12s, border-color 0.12s !important;
					box-shadow: none !important;
					min-width: 0 !important;
					width: 100% !important;
					height: 35px !important;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace !important;
					font-size: 0.82rem !important;
					backdrop-filter: none !important;
					box-sizing: border-box !important;
					overflow: hidden !important;
				}
				.hero-recent-card:hover {
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.08)'} !important;
					border-left-color: var(--row-accent) !important;
				}
				.hero-recent-card.active-row {
					border-left-color: var(--row-accent) !important;
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.06)'} !important;
				}
				.hrc-prompt {
					color: ${terminalTheme.green || '#3fb950'};
					font-weight: 700;
					flex-shrink: 0;
					opacity: 0.85;
					font-size: 0.8rem;
					width: 8px;
					text-align: center;
				}
				.hrc-protocol-tag {
					font-weight: 600;
					font-size: 0.68rem;
					flex-shrink: 0;
					padding: 1px 4px;
					border-radius: 3px;
					border: 1px solid transparent;
					letter-spacing: 0.2px;
					max-width: 70px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					line-height: 1.25;
				}
				.hrc-main-info {
					display: flex;
					align-items: baseline;
					gap: 6px;
					flex: 1;
					min-width: 0;
					overflow: hidden;
				}
				.hrc-name {
					font-weight: 600;
					font-size: 0.82rem;
					color: ${terminalTheme.foreground || '#ffffff'};
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					letter-spacing: 0.2px;
					flex: 0 1 auto;
					min-width: 0;
				}
				.hrc-main-info.has-host .hrc-name {
					max-width: 60%;
				}
				.hrc-host {
					font-size: 0.75rem;
					color: ${themeColors.textSecondary || 'rgba(255,255,255,0.45)'};
					opacity: 0.6;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					flex: 1 1 auto;
					min-width: 0;
				}
				.hrc-time {
					font-size: 0.72rem;
					color: ${themeColors.textSecondary || 'rgba(255,255,255,0.45)'};
					opacity: 0.55;
					flex-shrink: 0;
					margin-left: auto;
					white-space: nowrap;
					text-align: right;
					padding-left: 4px;
				}
				.hrc-time-full {
					display: inline;
				}
				.hrc-time-short {
					display: none;
				}
				@container (max-width: 380px) {
					.hrc-time-full {
						display: none;
					}
					.hrc-time-short {
						display: inline;
					}
				}
				@container (max-width: 340px) {
					.hero-recent-card {
						padding: 0 6px 0 6px !important;
						gap: 4px !important;
					}
					.hrc-main-info {
						gap: 4px;
					}
					/* Al reducir a tamaño muy pequeño, ocultar la cadena de conexión (host / user@host) */
					.hrc-host {
						display: none !important;
					}
					.hrc-main-info.has-host .hrc-name {
						max-width: 100% !important;
						flex: 1 1 auto;
					}
				}
				@container (max-width: 270px) {
					.hero-recent-card {
						padding: 0 4px 0 4px !important;
						gap: 3px !important;
					}
					.hrc-protocol-tag {
						padding: 1px 2px;
						font-size: 0.62rem;
						max-width: 52px;
					}
					.hrc-time {
						font-size: 0.68rem;
						padding-left: 2px;
					}
				}
				/* --- Split / Sidebar compact connections --- */
				.split-recent-card {
					display: flex !important;
					position: relative !important;
					align-items: center !important;
					padding: 6px 12px 6px 8px !important;
					height: 46px !important;
					background: transparent !important;
					border: none !important;
					border-bottom: 1px solid rgba(255,255,255,0.03) !important;
					cursor: pointer !important;
					transition: background 0.15s !important;
					overflow: hidden !important;
					min-width: 0 !important;
					width: 100% !important;
				}
				.split-recent-card:hover {
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.08)'} !important;
				}
				.split-recent-card.active-row {
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.06)'} !important;
				}
				.src-left-border {
					width: 3px !important;
					height: 24px !important;
					border-radius: 2px !important;
					margin-right: 8px !important;
					flex-shrink: 0 !important;
				}
				.src-content {
					display: flex !important;
					flex-direction: column !important;
					flex: 1 !important;
					min-width: 0 !important;
					gap: 2px !important;
				}
				.src-first-row {
					display: flex !important;
					align-items: center !important;
					justify-content: space-between !important;
					gap: 6px !important;
					min-width: 0 !important;
				}
				.src-name {
					color: ${terminalTheme.foreground || '#ffffff'} !important;
					font-weight: 600 !important;
					font-size: 0.82rem !important;
					white-space: nowrap !important;
					overflow: hidden !important;
					text-overflow: ellipsis !important;
					letter-spacing: 0.1px !important;
				}
				.src-protocol-badge {
					font-size: 0.6rem !important;
					font-weight: bold !important;
					padding: 1px 4px !important;
					border-radius: 3px !important;
					border: 1px solid currentColor !important;
					opacity: 0.8 !important;
					font-family: 'Fira Code', 'Cascadia Code', monospace !important;
					flex-shrink: 0 !important;
				}
				.src-second-row {
					display: flex !important;
					align-items: center !important;
					color: rgba(255,255,255,0.38) !important;
					font-size: 0.7rem !important;
					min-width: 0 !important;
					gap: 4px !important;
					font-family: 'Fira Code', 'Cascadia Code', monospace !important;
				}
				.src-host {
					white-space: nowrap !important;
					overflow: hidden !important;
					text-overflow: ellipsis !important;
					flex: 1 !important;
				}
				.src-time {
					white-space: nowrap !important;
					opacity: 0.7 !important;
					flex-shrink: 0 !important;
				}
				.src-actions {
					display: flex !important;
					align-items: center !important;
					justify-content: flex-end !important;
					opacity: 0 !important;
					transition: opacity 0.15s !important;
					margin-left: 6px !important;
					flex-shrink: 0 !important;
				}
				.split-recent-card:hover .src-actions {
					opacity: 1 !important;
				}
				.glass-action-btn { background: transparent; border: none; cursor: pointer; color: ${terminalTheme.brightBlack || '#6e7681'}; font-size: 0.8rem; padding: 2px 4px; transition: color 0.15s; }
				.glass-action-btn:hover { color: #FFD700; }
				.glass-action-btn.fav-active i { color: #FFD700; filter: drop-shadow(0 0 3px rgba(255,215,0,0.5)); }
				/* Empty state inside terminal frame */
				.recents-terminal-body .ribbon-empty { flex-direction: column; gap: 8px; color: ${terminalTheme.brightBlack || '#6e7681'}; background: transparent; border: none; font-family: 'Fira Code', monospace; font-size: 0.82rem; min-height: 60px; }

				/* --- CYBERPUNK INTEGRATED SEARCH PANEL STYLES --- */
				.cyber-search-panel-body {
					display: flex;
					flex-direction: column;
					height: 100%;
					width: 100%;
					min-height: 0;
					overflow: hidden;
					position: relative;
					box-sizing: border-box;
				}

				.cyber-search-top-zone {
					flex-shrink: 0;
					padding: 8px 14px 6px 14px;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}

				.cyber-search-input-wrapper {
					position: relative;
					width: 100%;
					display: flex;
					align-items: center;
				}

				.cyber-search-clear-btn {
					position: absolute;
					right: 48px;
					top: 50%;
					transform: translateY(-50%);
					width: 22px;
					height: 22px;
					border-radius: 4px;
					border: 1px solid rgba(255, 255, 255, 0.15);
					background: rgba(0, 0, 0, 0.5);
					color: rgba(255, 255, 255, 0.6);
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 0.7rem;
					cursor: pointer;
					z-index: 10;
					transition: all 0.15s ease;
				}
				.cyber-search-clear-btn:hover {
					background: rgba(255, 80, 80, 0.25);
					border-color: #ff5252;
					color: #ff5252;
					box-shadow: 0 0 8px rgba(255, 82, 82, 0.4);
				}

				.cyber-filter-reset-badge {
					font-size: 0.75rem;
					font-weight: bold;
					line-height: 1;
					padding: 0 3px;
					border-radius: 50%;
					background: rgba(255, 255, 255, 0.2);
					margin-left: 4px;
					transition: all 0.15s;
				}
				.cyber-filter-reset-badge:hover {
					background: #ff5252;
					color: #fff;
				}

				.cyber-protocol-chips-bar {
					display: flex;
					align-items: center;
					gap: 5px;
					overflow-x: auto;
					padding: 4px 2px 2px 2px;
					margin-top: 4px;
					scrollbar-width: none;
					-ms-overflow-style: none;
					animation: cyberFadeIn 0.15s ease;
				}
				.cyber-protocol-chips-bar::-webkit-scrollbar {
					display: none;
				}
				.cyber-protocol-chip {
					display: flex;
					align-items: center;
					gap: 4px;
					padding: 3px 8px;
					border-radius: 4px;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
					font-size: 0.66rem;
					font-weight: 600;
					cursor: pointer;
					border: 1px solid var(--chip-color, rgba(255,255,255,0.2));
					background: rgba(255, 255, 255, 0.03);
					color: var(--chip-color, rgba(255,255,255,0.7));
					white-space: nowrap;
					flex-shrink: 0;
					transition: all 0.15s ease;
				}
				.cyber-protocol-chip:hover {
					background: rgba(255, 255, 255, 0.08);
					transform: translateY(-1px);
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
				}
				.cyber-protocol-chip.active {
					background: var(--chip-color, #4fc3f7);
					color: #000 !important;
					border-color: var(--chip-color, #4fc3f7);
					box-shadow: 0 0 10px var(--chip-color, #4fc3f7);
					font-weight: 700;
				}

				/* Integrated Results Area */
				.cyber-search-results-container {
					flex: 1;
					min-height: 0;
					display: flex;
					flex-direction: column;
					overflow: hidden;
					margin: 2px 14px 8px 14px;
					border-radius: 8px;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '55' : 'rgba(255,255,255,0.1)'};
					background: ${terminalTheme.background ? adjustOpacity(terminalTheme.background, 0.5) : 'rgba(0, 0, 0, 0.35)'};
					backdrop-filter: blur(14px);
					box-shadow: inset 0 1px 10px rgba(0,0,0,0.4);
					animation: cyberFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
				}

				@keyframes cyberFadeIn {
					from { opacity: 0; transform: translateY(-4px); }
					to { opacity: 1; transform: translateY(0); }
				}

				.cyber-results-header-bar {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 6px 12px;
					font-family: 'Fira Code', 'Consolas', monospace;
					font-size: 0.72rem;
					border-bottom: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '44' : 'rgba(255,255,255,0.06)'};
					background: rgba(255, 255, 255, 0.02);
					flex-shrink: 0;
					letter-spacing: 0.5px;
					color: ${themeColors.textSecondary || 'rgba(255,255,255,0.6)'};
				}

				.cyber-results-list-scroll {
					flex: 1;
					min-height: 0;
					overflow-y: auto;
					overflow-x: hidden;
					padding: 4px 6px;
					display: flex;
					flex-direction: column;
					gap: 3px;
					scrollbar-width: thin;
					scrollbar-color: ${terminalTheme.green || '#3fb950'} transparent;
				}

				.cyber-result-card {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 6px 10px;
					border-radius: 6px;
					cursor: pointer;
					border: 1px solid transparent;
					border-left: 3px solid var(--row-color, #4fc3f7);
					background: rgba(255, 255, 255, 0.02);
					transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
					min-height: 42px;
					box-sizing: border-box;
				}

				.cyber-result-card:hover, .cyber-result-card.active-item {
					background: ${terminalTheme.selectionBackground ? adjustOpacity(terminalTheme.selectionBackground, 0.25) : 'rgba(255,255,255,0.08)'} !important;
					border-color: rgba(255, 255, 255, 0.15);
					border-left-color: var(--row-color, #4fc3f7) !important;
					transform: translateX(2px);
					box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 10px rgba(var(--row-color-rgb), 0.2);
				}

				.cyber-result-card.active-item {
					border-color: var(--row-color, #4fc3f7);
					background: rgba(var(--row-color-rgb), 0.12) !important;
				}

				.crc-prefix-arrow {
					font-size: 0.78rem;
					color: var(--row-color, #4fc3f7);
					opacity: 0;
					transition: all 0.15s ease;
					flex-shrink: 0;
					font-weight: bold;
				}
				.cyber-result-card:hover .crc-prefix-arrow, .cyber-result-card.active-item .crc-prefix-arrow {
					opacity: 1;
					transform: translateX(1px);
					text-shadow: 0 0 5px var(--row-color, #4fc3f7);
				}

				.crc-badge {
					font-size: 0.68rem;
					font-weight: 700;
					padding: 2px 6px;
					border-radius: 4px;
					border: 1px solid var(--row-color, #4fc3f7);
					background: rgba(var(--row-color-rgb), 0.15);
					color: var(--row-color, #4fc3f7);
					letter-spacing: 0.5px;
					flex-shrink: 0;
					text-shadow: 0 0 6px rgba(var(--row-color-rgb), 0.4);
					max-width: 90px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.crc-info {
					display: flex;
					flex-direction: column;
					flex: 1;
					min-width: 0;
					gap: 1px;
				}

				.crc-top-line {
					display: flex;
					align-items: baseline;
					gap: 8px;
					min-width: 0;
				}

				.crc-name {
					font-size: 0.86rem;
					font-weight: 600;
					color: ${terminalTheme.foreground || '#ffffff'};
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					letter-spacing: 0.2px;
				}

				.crc-host {
					font-size: 0.74rem;
					color: ${themeColors.textSecondary || 'rgba(255,255,255,0.55)'};
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					opacity: 0.8;
				}

				.crc-folder-path {
					font-size: 0.68rem;
					color: ${themeColors.textSecondary || 'rgba(255,255,255,0.4)'};
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					opacity: 0.7;
				}

				.crc-action-btn {
					padding: 3px 8px;
					border-radius: 4px;
					border: 1px solid var(--row-color, #4fc3f7);
					background: rgba(var(--row-color-rgb), 0.1);
					color: var(--row-color, #4fc3f7);
					font-size: 0.68rem;
					font-weight: 700;
					letter-spacing: 0.5px;
					display: flex;
					align-items: center;
					gap: 4px;
					opacity: 0.85;
					cursor: pointer;
					transition: all 0.15s;
					flex-shrink: 0;
					font-family: inherit;
				}

				.cyber-result-card:hover .crc-action-btn, .cyber-result-card.active-item .crc-action-btn {
					opacity: 1;
					background: var(--row-color, #4fc3f7);
					color: #000;
					box-shadow: 0 0 10px rgba(var(--row-color-rgb), 0.6);
				}

				.cyber-direct-connect-row {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 8px 12px;
					border-radius: 6px;
					border: 1px dashed ${terminalTheme.green ? terminalTheme.green + '88' : 'rgba(39, 201, 63, 0.5)'};
					background: ${terminalTheme.green ? terminalTheme.green + '15' : 'rgba(39, 201, 63, 0.08)'};
					cursor: pointer;
					margin: 4px 0;
					transition: all 0.15s;
					font-family: 'Fira Code', monospace;
				}
				.cyber-direct-connect-row:hover {
					background: ${terminalTheme.green ? terminalTheme.green + '28' : 'rgba(39, 201, 63, 0.2)'};
					border-color: ${terminalTheme.green || '#27c93f'};
					box-shadow: 0 0 12px ${terminalTheme.green ? terminalTheme.green + '44' : 'rgba(39, 201, 63, 0.3)'};
				}

				/* Standby Clean HUD Footer */
				.cyber-search-standby {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 6px 16px 8px 16px;
					font-family: 'Fira Code', 'Consolas', monospace;
					font-size: 0.7rem;
					color: ${themeColors.textSecondary || 'rgba(255,255,255,0.4)'};
					letter-spacing: 0.5px;
					border-top: 1px solid rgba(255, 255, 255, 0.04);
					margin-top: auto;
				}
				.cyber-search-standby .css-dot {
					width: 6px;
					height: 6px;
					border-radius: 50%;
					background: ${terminalTheme.green || '#27c93f'};
					display: inline-block;
					box-shadow: 0 0 6px ${terminalTheme.green || '#27c93f'};
					animation: btn-blink 1.5s infinite;
					margin-right: 6px;
				}
				.cyber-search-standby kbd {
					background: rgba(255, 255, 255, 0.06);
					border: 1px solid rgba(255, 255, 255, 0.12);
					border-radius: 3px;
					padding: 1px 4px;
					margin: 0 2px;
					font-size: 0.65rem;
					color: ${themeColors.textPrimary || 'rgba(255,255,255,0.7)'};
				}
				
				/* Hero Chips */
				.hero-chip { display: flex; align-items: center; background: ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}; border: 1px solid transparent; border-radius: 16px; padding: 8px 24px 8px 8px; width: 220px; height: 70px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); backdrop-filter: blur(10px); flex-shrink: 0; text-align: left; }
				.hero-chip:hover { background: ${themeColors.hoverBackground || 'rgba(30, 36, 45, 0.6)'}; transform: translateY(-4px); border-color: ${themeColors.borderColor || 'rgba(255,255,255,0.05)'}; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
				.hero-chip.active { border-color: var(--card-accent); background: linear-gradient(135deg, ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}, ${themeColors.hoverBackground || 'rgba(30,36,45,0.6)'}); box-shadow: 0 0 0 1px var(--card-accent) inset;}
				.hero-chip-icon { width: 54px; height: 54px; min-width: 54px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; }
				.hero-chip-content { display: flex; flex-direction: column; overflow: hidden; justify-content: center;}
				.hero-chip-name { color: ${themeColors.textPrimary || '#fff'}; font-weight: 500; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;}
				.hero-chip-host { color: ${themeColors.textSecondary || 'rgba(255,255,255,0.5)'}; font-size: 0.8rem; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.7;}
				
				/* Command Palette List Styles (override grid/cards) */
				.ribbon-side-btn, .ribbon-pagination { display: none !important; }
				.ribbon-container-relative { display: block !important; padding: 0 !important; }

				/* Keep favorites-ribbon-track in original style (horizontal scroll) */
				.favorites-ribbon-track {
					display: flex !important;
					flex-direction: row !important;
					gap: 16px !important;
					padding: 8px !important;
					width: auto !important;
					max-width: 100% !important;
					margin: 0 !important;
					overflow-x: auto !important;
					scrollbar-width: none !important;
					overflow-y: visible !important;
				}

				/* Hero Chips */
				.hero-chip { display: flex; align-items: center; background: ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}; border: 1px solid transparent; border-radius: 16px; padding: 8px 24px 8px 8px; width: 220px; height: 70px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); backdrop-filter: blur(10px); flex-shrink: 0; text-align: left; }
				.hero-chip:hover { background: ${themeColors.hoverBackground || 'rgba(30, 36, 45, 0.6)'}; transform: translateY(-4px); border-color: ${themeColors.borderColor || 'rgba(255,255,255,0.05)'}; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
				.hero-chip.active { border-color: var(--card-accent); background: linear-gradient(135deg, ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}, ${themeColors.hoverBackground || 'rgba(30,36,45,0.6)'}); box-shadow: 0 0 0 1px var(--card-accent) inset;}
				.hero-chip-icon { width: 54px; height: 54px; min-width: 54px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; }
				.hero-chip-content { display: flex; flex-direction: column; overflow: hidden; justify-content: center;}
				.hero-chip-name { color: ${themeColors.textPrimary || '#fff'}; font-weight: 500; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;}
				.hero-chip-host { color: ${themeColors.textSecondary || 'rgba(255,255,255,0.5)'}; font-size: 0.8rem; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.7;}
				/* Custom scrollbar for theme picker overlay */
				.theme-picker-overlay .p-overlaypanel-content {
					padding: 0;
				}
				.theme-picker-overlay *::-webkit-scrollbar {
					width: 8px;
				}
				.theme-picker-overlay *::-webkit-scrollbar-track {
					background: transparent;
				}
				.theme-picker-overlay *::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.15);
					border-radius: 4px;
					border: 2px solid transparent;
					background-clip: padding-box;
				}
				.theme-picker-overlay *::-webkit-scrollbar-thumb:hover {
					background: rgba(255, 255, 255, 0.3);
					border: 2px solid transparent;
					background-clip: padding-box;
				}

				/* Override rules for maximized local terminal in HomeTab */
				.connection-history-root.is-terminal-maximized {
					height: 100% !important;
					max-height: 100% !important;
					overflow: hidden !important;
				}

				.connection-history-root.is-terminal-maximized .hero-splash-header {
					display: none !important;
				}

				.connection-history-root.is-terminal-maximized .home-integrated-terminal-row {
					margin: 0 !important;
					padding: 0 !important;
					height: 100% !important;
					width: 100% !important;
				}

				.connection-history-root.is-terminal-maximized .recents-terminal-frame {
					margin: 0 !important;
					border-radius: 0 !important;
					box-shadow: none !important;
					border: none !important;
					height: 100% !important;
					width: 100% !important;
					flex: 1 !important;
				}

				.connection-history-root.is-terminal-maximized .recents-terminal-frame.futuristic {
					clip-path: none !important;
					border: none !important;
					box-shadow: none !important;
					padding: 0 !important;
				}

				.connection-history-root.is-terminal-maximized .recents-terminal-frame.modern {
					border-radius: 0 !important;
					border: none !important;
				}

				.connection-history-root.is-terminal-maximized .recents-terminal-frame.retro {
					border: none !important;
					border-radius: 0 !important;
					box-shadow: none !important;
				}

				.connection-history-root.is-terminal-maximized .recents-terminal-frame.matcha {
					border-top: none !important;
					border-radius: 0 !important;
				}

				.connection-history-root.is-terminal-maximized .recents-terminal-header {
					border-radius: 0 !important;
				}

				.connection-history-root.is-terminal-maximized .recents-terminal-body {
					border-radius: 0 !important;
					border-bottom-left-radius: 0 !important;
					border-bottom-right-radius: 0 !important;
				}

				.connection-history-root.is-terminal-maximized .home-integrated-terminal-quickbar {
					display: none !important;
				}

				/* --- Canvas & Modular Panels Styles --- */
				.home-panels-canvas {
					position: relative;
					width: 100%;
					height: 100%;
					min-height: 0;
					flex: 1;
					overflow: hidden;
				}
				.home-panel-frame {
					margin: 0 !important;
					border-radius: 12px;
					box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
					backdrop-filter: blur(16px);
					transition: box-shadow 0.2s ease, border-color 0.2s ease;
				}
				.home-panel-frame.is-maximized {
					border-radius: 0 !important;
					box-shadow: none !important;
					border: none !important;
				}
				.home-panel-drag-handle {
					user-select: none;
				}

				/* Ocultar barra de scroll en paneles pero mantener el scroll */
				.recents-terminal-body,
				.connection-list-container,
				.home-panels-canvas,
				.home-panels-canvas div,
				.home-panel-frame,
				.home-panel-frame div {
					scrollbar-width: none !important;
					-ms-overflow-style: none !important;
				}
				.recents-terminal-body::-webkit-scrollbar,
				.connection-list-container::-webkit-scrollbar,
				.home-panels-canvas::-webkit-scrollbar,
				.home-panels-canvas *::-webkit-scrollbar,
				.home-panel-frame::-webkit-scrollbar,
				.home-panel-frame *::-webkit-scrollbar {
					display: none !important;
					width: 0 !important;
					height: 0 !important;
				}
			`}</style>
	);
};

export default React.memo(ConnectionHistoryStyles);
