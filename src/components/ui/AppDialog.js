/**
 * AppDialog - shell unico de dialogos NodeTerm.
 *
 * Contrato:
 * - size: sm (380) | md (480) | lg (680) | xl (900)
 * - header: string | ReactNode; o headerIcon + headerTitle (+ headerSubtitle)
 * - footer: ReactNode; o cancelLabel/confirmLabel + onConfirm
 * - Siempre usa tokens --ui-dialog-* / --ui-button-* (clase app-dialog)
 */
import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

export const APP_DIALOG_SIZES = {
  sm: { width: '380px', maxWidth: '95vw' },
  md: { width: '480px', maxWidth: '95vw' },
  lg: { width: '680px', maxWidth: '95vw', minWidth: '460px' },
  xl: { width: '900px', maxWidth: '96vw', minWidth: '560px' }
};

export function AppDialogHeader({ icon, title, subtitle, children }) {
  return (
    <div className="app-dialog-header">
      {icon ? (
        <span className="app-dialog-header-icon" aria-hidden="true">
          {typeof icon === 'string' ? <i className={icon} /> : icon}
        </span>
      ) : null}
      <div className="app-dialog-header-text">
        {title ? <span className="app-dialog-header-title">{title}</span> : null}
        {subtitle ? <span className="app-dialog-header-subtitle">{subtitle}</span> : null}
        {children}
      </div>
    </div>
  );
}

export function AppDialogFooter({
  cancelLabel = 'Cancelar',
  confirmLabel = 'Aceptar',
  onCancel,
  onConfirm,
  loading = false,
  confirmDisabled = false,
  confirmSeverity = 'primary',
  confirmIcon,
  cancelIcon = 'pi pi-times',
  extra
}) {
  const confirmClass =
    confirmSeverity === 'danger' ? 'p-button-danger' : 'p-button-primary';

  return (
    <div className="app-dialog-footer">
      <div className="app-dialog-footer-extra">{extra}</div>
      <div className="app-dialog-footer-actions">
        {onCancel ? (
          <Button
            type="button"
            label={cancelLabel}
            icon={cancelIcon}
            className="p-button-text app-dialog-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          />
        ) : null}
        {onConfirm ? (
          <Button
            type="button"
            label={confirmLabel}
            icon={confirmIcon}
            className={`${confirmClass} app-dialog-btn-confirm`}
            onClick={onConfirm}
            loading={loading}
            disabled={confirmDisabled || loading}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function AppDialog({
  visible,
  onHide,
  size = 'md',
  header,
  headerIcon,
  headerTitle,
  headerSubtitle,
  footer,
  cancelLabel,
  confirmLabel,
  onConfirm,
  loading = false,
  confirmDisabled = false,
  confirmSeverity = 'primary',
  confirmIcon,
  children,
  className = '',
  style,
  contentStyle,
  resizable = false,
  closable = true,
  modal = true,
  blockScroll = true,
  dismissableMask = false,
  ...rest
}) {
  const sizeStyle = APP_DIALOG_SIZES[size] || APP_DIALOG_SIZES.md;

  const resolvedHeader =
    header != null
      ? header
      : headerTitle || headerIcon
        ? (
          <AppDialogHeader
            icon={headerIcon}
            title={headerTitle}
            subtitle={headerSubtitle}
          />
        )
        : undefined;

  const showCancel = cancelLabel !== false && cancelLabel !== null;
  const resolvedFooter =
    footer !== undefined
      ? footer
      : onConfirm || showCancel
        ? (
          <AppDialogFooter
            cancelLabel={typeof cancelLabel === 'string' ? cancelLabel : 'Cancelar'}
            confirmLabel={confirmLabel}
            onCancel={showCancel ? onHide : undefined}
            onConfirm={onConfirm}
            loading={loading}
            confirmDisabled={confirmDisabled}
            confirmSeverity={confirmSeverity}
            confirmIcon={confirmIcon}
          />
        )
        : undefined;

  const mergedClassName = ['app-dialog', `app-dialog--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={resolvedHeader}
      footer={resolvedFooter}
      modal={modal}
      resizable={resizable}
      closable={closable}
      blockScroll={blockScroll}
      dismissableMask={dismissableMask}
      className={mergedClassName}
      style={{ ...sizeStyle, borderRadius: 'var(--ui-radius-lg)', ...style }}
      contentStyle={{
        padding: 'var(--ui-space-3)',
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        ...contentStyle
      }}
      {...rest}
    >
      <div className="app-dialog-body">{children}</div>
    </Dialog>
  );
}
