import React, { useEffect, useRef, useState } from 'react';
import { VirtualScroller } from 'primereact/virtualscroller';
import { isFavorite } from '../../../../utils/connectionStore';
import {
	hexToRgbString,
	getConnectionTypeColor,
	getProtocolBadge,
	buildHostLabel,
	formatRelativeTime,
	formatRelativeTimeShort,
	activeKey
} from '../utils/connectionHistoryHelpers';

const SECRET_TYPES = ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note', 'document', 'quick-note'];
const VIRTUALIZE_THRESHOLD = 80;
const CARD_ITEM_SIZE = 28;

export function usePanelBreakpoints(defaultWidth = 400) {
	const ref = useRef(null);
	const [width, setWidth] = useState(defaultWidth);

	useEffect(() => {
		if (!ref.current) return undefined;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const w = entry.contentRect.width;
				if (w > 0) setWidth(w);
			}
		});
		ro.observe(ref.current);
		return () => ro.disconnect();
	}, []);

	const isCompact = width < 440;
	const isNarrow = width < 340;
	const isVeryNarrow = width < 270;

	return {
		ref,
		width,
		isCompact,
		isNarrow,
		isVeryNarrow,
		className: [
			isCompact ? 'is-compact' : '',
			isNarrow ? 'is-narrow' : '',
			isVeryNarrow ? 'is-very-narrow' : ''
		].filter(Boolean).join(' ')
	};
}

const openSecretOrConnect = (conn, onConnect) => {
	const label = conn?.name || conn?.label || '-';
	if (SECRET_TYPES.includes(conn?.type)) {
		window.dispatchEvent(new CustomEvent('open-password-tab', {
			detail: { key: conn.id, label, data: { ...conn } }
		}));
		return;
	}
	onConnect?.(conn);
};

export const CyberConnectionCard = React.memo(({
	connection,
	isSelected = false,
	isConnected = false,
	onConnect,
	onEdit,
	onToggleFav,
	onMouseEnter,
	showTime = true,
	timeVerbose = false,
	showFav = true
}) => {
	if (!connection) return null;

	const isSecret = SECRET_TYPES.includes(connection.type);
	const color = isSecret ? '#E91E63' : getConnectionTypeColor(connection.type);
	const rgbColor = hexToRgbString(color);
	const label = connection.name || connection.label || '-';
	const sub = buildHostLabel(connection);
	const badgeLabel = isSecret ? 'PWD' : getProtocolBadge(connection.type);
	const timeStr = formatRelativeTime(connection.lastConnected);
	const timeShort = formatRelativeTimeShort(connection.lastConnected);
	const fav = isFavorite(connection);
	const isHostRedundant = !sub || sub === '-' || sub.trim() === '' || sub === label;
	const timeLabel = timeVerbose ? timeStr : timeShort;
	const showTimeTag = showTime && timeLabel && timeLabel !== '-';
	const fullTitle = isHostRedundant
		? `${label}${timeStr && timeStr !== '-' ? ` · ${timeStr}` : ''}`
		: `${label} (${sub})${timeStr && timeStr !== '-' ? ` · ${timeStr}` : ''}`;

	const handleItemClick = () => openSecretOrConnect(connection, onConnect);

	return (
		<div
			className={`cyber-result-card ${(isSelected || isConnected) ? 'active-item' : ''}`}
			style={{
				'--row-color': color,
				'--row-color-rgb': rgbColor
			}}
			title={fullTitle}
			onClick={handleItemClick}
			onMouseEnter={onMouseEnter}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onEdit?.(connection);
			}}
		>
			<span className="crc-prefix-arrow">$</span>
			<span className="crc-badge">{badgeLabel}</span>
			<div className="crc-info">
				<div className="crc-top-line">
					<span className="crc-name">{label}</span>
					{!isHostRedundant && <span className="crc-host">{sub}</span>}
				</div>
			</div>
			{showTime && (
				<span className="crc-time-tag">{showTimeTag ? timeLabel : ''}</span>
			)}
			{showFav && (
				<div className="crc-actions" onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						className={`glass-action-btn ${fav ? 'fav-active' : ''}`}
						onClick={(e) => {
							e.stopPropagation();
							onToggleFav?.(connection);
						}}
						title={fav ? 'Quitar de Favoritos' : 'Marcar como Favorito'}
					>
						<i className={fav ? 'pi pi-star-fill' : 'pi pi-star'} />
					</button>
				</div>
			)}
		</div>
	);
});

CyberConnectionCard.displayName = 'CyberConnectionCard';

const CyberEmptyState = ({ message }) => (
	<div className="cyber-sessions-empty">
		{message}
	</div>
);

export const CyberConnectionList = ({
	connections = [],
	emptyMessage = '// NO SE REGISTRARON SESIONES',
	accent = '#2196F3',
	title,
	titleExtra = null,
	subtitle = null,
	headerRight = null,
	activeIds,
	activeIndex = -1,
	onActiveIndexChange,
	onConnect,
	onEdit,
	onToggleFav,
	showTime = true,
	timeVerbose = false,
	showFav = true,
	itemKeyPrefix = 'conn',
	hudClassName = ''
}) => {
	const count = connections.length;
	const paddedCount = count.toString().padStart(2, '0');

	const renderCard = (conn, idx) => {
		if (!conn) return null;
		const isConnected = activeIds ? activeIds.has(activeKey(conn)) : false;
		return (
			<CyberConnectionCard
				key={conn.id || `${itemKeyPrefix}-${idx}`}
				connection={conn}
				isSelected={activeIndex === idx}
				isConnected={isConnected}
				onConnect={onConnect}
				onEdit={onEdit}
				onToggleFav={onToggleFav}
				onMouseEnter={onActiveIndexChange ? () => onActiveIndexChange(idx) : undefined}
				showTime={showTime}
				timeVerbose={timeVerbose}
				showFav={showFav}
			/>
		);
	};

	return (
		<div className={`cyber-search-results-container ${hudClassName}`.trim()}>
			<div className="cyber-results-header-bar">
				<div className="cyber-sessions-header-left">
					<span
						className="cyber-sessions-dot"
						style={{
							background: accent,
							boxShadow: `0 0 6px ${accent}`
						}}
					/>
					<span className="cyber-sessions-title" style={{ color: accent }}>
						{title || `SESSIONS // ${paddedCount}`}
					</span>
					{titleExtra}
				</div>
				<div className="cyber-sessions-header-right">
					{subtitle && (
						<span className="cyber-sessions-subtitle">{subtitle}</span>
					)}
					{headerRight}
				</div>
			</div>

			<div className="cyber-results-list-scroll">
				{count === 0 ? (
					<CyberEmptyState message={emptyMessage} />
				) : count > VIRTUALIZE_THRESHOLD ? (
					<VirtualScroller
						items={connections}
						itemSize={CARD_ITEM_SIZE}
						scrollHeight="100%"
						className="cyber-sessions-virtual"
						style={{ height: '100%', width: '100%' }}
						itemTemplate={(c, options) => renderCard(c, options?.index ?? 0)}
					/>
				) : (
					connections.map((conn, idx) => renderCard(conn, idx))
				)}
			</div>
		</div>
	);
};

export default CyberConnectionList;
