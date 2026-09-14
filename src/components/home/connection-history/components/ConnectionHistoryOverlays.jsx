import React from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';

export const ConnectionHistoryOverlays = ({
	themePickerRef,
	uiThemePickerRef,
	terminalSwitcherOverlayRef,
	themes = {},
	localLinuxTerminalTheme,
	handleThemeSelect,
	onOpenSettings,
	UI_CATEGORIES = [],
	uiThemes = {},
	currentUITheme,
	handleUIThemeSelect,
	availableTerminals = [],
	isDetectingTerminals = false,
	groupedTerminalOptions = [],
	collapsedLauncherSections = {},
	setCollapsedLauncherSections,
	onSwitchTerminal
}) => {
	return (
		<>
			{/* Terminal Theme Picker Overlay */}
			<OverlayPanel
				ref={themePickerRef}
				style={{
					width: '280px',
					backgroundColor: 'var(--ui-dialog-bg)',
					border: '1px solid var(--ui-dialog-border)',
					boxShadow: '0 4px 12px var(--ui-dialog-shadow)',
					borderRadius: 'var(--ui-radius-md)'
				}}
				className="theme-picker-overlay app-surface"
			>
				<div style={{ maxHeight: '350px', overflowY: 'auto', padding: '4px' }}>
					<div style={{
						padding: '8px 12px',
						fontWeight: '600',
						fontSize: '14px',
						color: 'var(--ui-dialog-text)',
						borderBottom: '1px solid var(--ui-dialog-border)',
						marginBottom: '8px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between'
					}}>
						<span>Tema (Linux/WSL)</span>
						<i className="pi pi-palette" style={{ opacity: 0.7 }} />
					</div>
					{Object.keys(themes).map(themeKey => {
						const currentTheme = themes[themeKey]?.theme || {};
						return (
							<div
								key={themeKey}
								onClick={() => handleThemeSelect?.(themeKey)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '12px',
									padding: '10px 12px',
									cursor: 'pointer',
									borderRadius: '6px',
									backgroundColor: themeKey === localLinuxTerminalTheme ? 'rgba(var(--ui-button-primary-rgb), 0.2)' : 'transparent',
									transition: 'all 0.2s',
									margin: '2px 0'
								}}
								className="theme-picker-item"
								onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
								onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeKey === localLinuxTerminalTheme ? 'rgba(var(--ui-button-primary-rgb), 0.2)' : 'transparent'}
							>
								<div style={{
									width: '18px',
									height: '18px',
									borderRadius: '4px',
									background: `linear-gradient(135deg, ${currentTheme.background || '#000'} 0%, ${currentTheme.background || '#000'} 45%, ${currentTheme.cursor || currentTheme.green || currentTheme.foreground || '#fff'} 100%)`,
									border: `1px solid ${currentTheme.cursor || currentTheme.foreground || 'rgba(255,255,255,0.2)'}`,
									boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
									opacity: 0.9
								}} />
								<span style={{
									fontSize: '13px',
									color: 'var(--ui-dialog-text)',
									fontWeight: themeKey === localLinuxTerminalTheme ? '600' : 'normal',
									flex: 1
								}}>{themeKey}</span>
								{themeKey === localLinuxTerminalTheme && (
									<i className="pi pi-check" style={{ fontSize: '10px', color: 'var(--ui-button-primary)' }} />
								)}
							</div>
						);
					})}
					<div
						style={{
							padding: '10px 12px',
							marginTop: '8px',
							borderTop: '1px solid var(--ui-content-border, #444)',
							textAlign: 'center',
							fontSize: '11px',
							color: 'var(--ui-dialog-text)',
							opacity: 0.7,
							cursor: 'pointer'
						}}
						onClick={() => {
							themePickerRef.current?.hide();
							if (onOpenSettings) onOpenSettings();
							setTimeout(() => {
								try {
									window.dispatchEvent(new CustomEvent('open-settings-dialog', {
										detail: { tab: 'appearance', subTab: 'terminal' }
									}));
								} catch (err) {
									console.error('Error opening settings tab:', err);
								}
							}, 100);
						}}
					>
						Ajustes avanzados...
					</div>
				</div>
			</OverlayPanel>

			{/* UI Theme Picker Overlay */}
			<OverlayPanel
				ref={uiThemePickerRef}
				style={{
					width: '320px',
					backgroundColor: 'var(--ui-dialog-bg)',
					border: '1px solid var(--ui-dialog-border)',
					boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
					borderRadius: '12px'
				}}
				className="ui-theme-picker-overlay app-surface"
			>
				<div style={{ maxHeight: '450px', overflowY: 'auto', padding: '8px' }}>
					<div style={{
						padding: '8px 12px',
						fontWeight: '700',
						fontSize: '15px',
						color: 'var(--ui-dialog-text)',
						borderBottom: '1px solid var(--ui-dialog-border)',
						marginBottom: '12px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						letterSpacing: '0.5px'
					}}>
						<span>Temas de Interfaz</span>
						<i className="pi pi-palette" style={{ color: 'var(--ui-button-primary)', opacity: 0.9 }} />
					</div>

					{UI_CATEGORIES.map(category => (
						<div key={category.id} className="ui-theme-category-group">
							<div style={{
								fontSize: '11px',
								textTransform: 'uppercase',
								color: 'rgba(255,255,255,0.4)',
								fontWeight: '600',
								padding: '8px 12px 4px',
								letterSpacing: '1px'
							}}>
								{category.name}
							</div>
							{category.keys.map(themeKey => {
								const theme = uiThemes[themeKey];
								if (!theme) return null;
								const isActive = theme.name === currentUITheme;
								const colors = theme.colors || {};

								return (
									<div
										key={themeKey}
										onClick={() => handleUIThemeSelect?.(theme.name)}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '12px',
											padding: '8px 12px',
											cursor: 'pointer',
											borderRadius: 'var(--ui-radius-md)',
											backgroundColor: isActive ? 'rgba(var(--ui-button-primary-rgb), 0.15)' : 'transparent',
											transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
											margin: '2px 0'
										}}
										className={`ui-theme-item ${isActive ? 'active' : ''}`}
										onMouseEnter={(e) => {
											if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
										}}
										onMouseLeave={(e) => {
											if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
										}}
									>
										<div style={{
											display: 'flex',
											gap: '2px',
											width: '24px',
											height: '24px',
											borderRadius: '6px',
											overflow: 'hidden',
											border: `1px solid ${isActive ? 'var(--ui-button-primary)' : 'rgba(255,255,255,0.1)'}`,
											boxShadow: isActive ? '0 0 10px rgba(var(--ui-button-primary-rgb), 0.3)' : 'none'
										}}>
											<div style={{ flex: 1, backgroundColor: colors.sidebarBackground || '#000' }} />
											<div style={{ flex: 1, backgroundColor: colors.buttonPrimary || '#fff' }} />
											<div style={{ flex: 1, backgroundColor: colors.contentBackground || '#333' }} />
										</div>
										<span style={{
											fontSize: '13px',
											color: isActive ? 'var(--ui-button-primary)' : 'var(--ui-dialog-text)',
											fontWeight: isActive ? '600' : '500',
											flex: 1
										}}>{theme.name}</span>
										{isActive && (
											<i className="pi pi-check" style={{ fontSize: '12px', color: 'var(--ui-button-primary)' }} />
										)}
									</div>
								);
							})}
						</div>
					))}

					<div
						style={{
							padding: '12px',
							marginTop: '12px',
							borderTop: '1px solid var(--ui-content-border, #444)',
							textAlign: 'center',
							fontSize: '11px',
							color: 'var(--ui-dialog-text)',
							opacity: 0.6,
							cursor: 'pointer',
							transition: 'opacity 0.2s'
						}}
						onClick={() => {
							uiThemePickerRef.current?.hide();
							if (onOpenSettings) onOpenSettings();
							setTimeout(() => {
								try {
									window.dispatchEvent(new CustomEvent('open-settings-dialog', {
										detail: { tab: 'appearance' }
									}));
								} catch (err) {
									console.error('Error opening settings tab:', err);
								}
							}, 100);
						}}
						onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
						onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
					>
						Gestión completa de temas...
					</div>
				</div>
			</OverlayPanel>

			{/* Terminal Switcher Overlay */}
			<OverlayPanel
				ref={terminalSwitcherOverlayRef}
				appendTo={document.body}
				className="cyber-terminal-menu app-surface"
			>
				<div className="terminal-launcher-container">
					<div style={{
						fontSize: '9px',
						fontWeight: '800',
						letterSpacing: '0.2em',
						textTransform: 'uppercase',
						marginBottom: '15px',
						color: 'var(--terminal-tab-accent, #00f2ff)',
						opacity: 0.6,
						display: 'flex',
						alignItems: 'center',
						gap: '8px'
					}}>
						<i className="pi pi-th-large" style={{ fontSize: '9px' }} />
						TERMINAL LAUNCHER
					</div>

					{availableTerminals.length === 0 ? (
						<div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
							{isDetectingTerminals ? 'Detectando shell...' : 'No se detectaron terminales'}
						</div>
					) : (
						groupedTerminalOptions.map((group) => (
							<div key={group.label} className="launcher-section">
								<div
									className="launcher-section-title"
									onClick={() => {
										setCollapsedLauncherSections?.((prev) => ({
											...prev,
											[group.label]: !prev[group.label]
										}));
									}}
									style={{ cursor: 'pointer', userSelect: 'none' }}
								>
									<i className={group.icon} />
									{group.label} ({group.items.length})
									<i
										className={`pi ${collapsedLauncherSections[group.label] ? 'pi-chevron-down' : 'pi-chevron-up'}`}
										style={{ marginLeft: 'auto', opacity: 0.8, fontSize: '10px' }}
									/>
								</div>
								{!collapsedLauncherSections[group.label] && (
									<div className="launcher-grid">
										{group.items.map((shell, idx) => (
											<div
												key={`${shell.value}-${idx}`}
												className="launcher-card"
												onClick={() => {
													if (onSwitchTerminal) {
														onSwitchTerminal(shell.type || shell.value, shell.distroInfo);
													}
													terminalSwitcherOverlayRef.current?.hide();
												}}
											>
												{shell.icon || <i className="pi pi-desktop" style={{ color: 'var(--terminal-tab-accent, #00f2ff)' }} />}
												<span>{shell.label}</span>
											</div>
										))}
									</div>
								)}
							</div>
						))
					)}
				</div>
			</OverlayPanel>
		</>
	);
};

export default ConnectionHistoryOverlays;
