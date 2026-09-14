import React from 'react';
import { isFavorite } from '../../../../utils/connectionStore';
import { activeKey } from '../utils/connectionHistoryHelpers';
import ConnectionRow from './ConnectionRow';

export const ConnectionTable = ({
	connections = [],
	title,
	emptyMessage = '# no sessions found',
	themeColors = {},
	activeIds = new Set(),
	onConnect,
	onEdit,
	onToggleFav
}) => {
	if (connections.length === 0) {
		return (
			<div className="connection-list-container">
				<div
					className="ribbon-empty"
					style={{
						marginTop: '0.5rem',
						height: 'auto',
						minHeight: '100px',
						flexDirection: 'column',
						gap: '8px',
						color: themeColors.textSecondary || 'rgba(255,255,255,0.4)',
						background: themeColors.itemBackground || 'rgba(255,255,255,0.02)',
						border: `1px dashed ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`
					}}
				>
					<i className="pi pi-history" style={{ fontSize: '1.5rem', opacity: 0.5, color: themeColors.textSecondary }} />
					<span>{emptyMessage}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="connection-list-container">
			<div className="connection-list-body">
				{connections.map((c) => (
					<ConnectionRow
						key={c.id}
						connection={c}
						isPinned={isFavorite(c)}
						isActive={activeIds ? activeIds.has(activeKey(c)) : false}
						onConnect={onConnect}
						onEdit={onEdit}
						onToggleFav={onToggleFav}
					/>
				))}
			</div>
		</div>
	);
};

export default React.memo(ConnectionTable);
