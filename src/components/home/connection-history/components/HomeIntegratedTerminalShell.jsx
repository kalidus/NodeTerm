import React from 'react';

export const HomeIntegratedTerminalShell = ({
	enabled,
	visible,
	rightQuickBar,
	frameClassName,
	frameBackground,
	terminalFrameStyle,
	children
}) => {
	const frame = (
		<div
			className={frameClassName}
			style={{
				display: enabled ? 'flex' : (visible ? 'flex' : 'none'),
				...(frameBackground ? { background: frameBackground } : {})
			}}
		>
			{children}
		</div>
	);

	if (!enabled || !rightQuickBar) {
		return frame;
	}

	return (
		<div
			className={`home-integrated-terminal-row${terminalFrameStyle ? ` home-integrated-terminal-row--${terminalFrameStyle}` : ''}`}
			style={{
				display: visible ? 'flex' : 'none',
				flex: 1,
				minHeight: 0
			}}
		>
			{frame}
			<div className="home-integrated-terminal-quickbar">
				{rightQuickBar}
			</div>
		</div>
	);
};

export default React.memo(HomeIntegratedTerminalShell);
