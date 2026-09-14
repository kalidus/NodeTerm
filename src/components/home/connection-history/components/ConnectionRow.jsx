import React from 'react';
import { isFavorite } from '../../../../utils/connectionStore';
import {
	getConnectionTypeColor,
	getProtocolLabel,
	buildHostLabel,
	formatRelativeTime,
	formatRelativeTimeShort
} from '../utils/connectionHistoryHelpers';

export const ConnectionRow = ({
	connection,
	isPinned,
	isActive,
	onConnect,
	onEdit,
	onToggleFav,
	isSplit = false
}) => {
	const typeColor = getConnectionTypeColor(connection?.type);
	const protocolLabel = getProtocolLabel(connection?.type);
	const hostLabel = buildHostLabel(connection);
	const timeStr = formatRelativeTime(connection?.lastConnected);
	const fav = isPinned || isFavorite(connection);

	if (isSplit) {
		return (
			<div
				className={`split-recent-card ${isActive ? 'active-row' : ''}`}
				onClick={() => onConnect?.(connection)}
				style={{ '--row-accent': typeColor }}
				onContextMenu={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onEdit?.(connection);
				}}
				title={`${connection.name} (${hostLabel})`}
			>
				<div className="src-left-border" style={{ backgroundColor: typeColor }} />
				<div className="src-content">
					<div className="src-first-row">
						<span className="src-name">{connection.name}</span>
						<span className="src-protocol-badge" style={{ color: typeColor, borderColor: typeColor + '44' }}>
							{protocolLabel}
						</span>
					</div>
					<div className="src-second-row">
						<span className="src-host">{hostLabel}</span>
						{timeStr && <span className="src-time">· {timeStr}</span>}
					</div>
				</div>
				<div className="src-actions" onClick={(e) => e.stopPropagation()}>
					<button
						className={`glass-action-btn ${fav ? 'fav-active' : ''}`}
						onClick={(e) => { e.stopPropagation(); onToggleFav?.(connection); }}
						title={fav ? "Quitar de Favoritos" : "Marcar como Favorito"}
					>
						<i className={fav ? 'pi pi-star-fill' : 'pi pi-star'} />
					</button>
				</div>
			</div>
		);
	}

	const isHostRedundant = !hostLabel || hostLabel === '-' || hostLabel.trim() === '' || hostLabel === connection.name;
	const timeShort = formatRelativeTimeShort(connection?.lastConnected);
	const fullTitle = isHostRedundant ? `${connection.name} · ${timeStr}` : `${connection.name} (${hostLabel}) · ${timeStr}`;

	return (
		<div
			className={`hero-recent-card ${isActive ? 'active-row' : ''}`}
			onClick={() => onConnect?.(connection)}
			style={{ '--row-accent': typeColor }}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onEdit?.(connection);
			}}
			title={fullTitle}
		>
			<span className="hrc-prompt">$</span>
			<span className="hrc-protocol-tag" style={{ color: typeColor, background: `${typeColor}15`, borderColor: `${typeColor}35` }}>[{protocolLabel}]</span>
			<div className={`hrc-main-info ${!isHostRedundant ? 'has-host' : ''}`}>
				<span className="hrc-name">{connection.name}</span>
				{!isHostRedundant && (
					<span className="hrc-host">{hostLabel}</span>
				)}
			</div>
			<span className="hrc-time">
				<span className="hrc-time-full">{timeStr}</span>
				<span className="hrc-time-short">{timeShort}</span>
			</span>
		</div>
	);
};

export default React.memo(ConnectionRow);
