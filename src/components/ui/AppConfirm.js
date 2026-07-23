/**
 * AppConfirm - API unica de confirmacion themed (reemplazo de window.confirm).
 *
 * Uso:
 *   const ok = await appConfirm({ message: '...' });
 *   appConfirm({ message: '...', accept: () => {}, severity: 'danger' });
 */
import { confirmDialog } from 'primereact/confirmdialog';

const SEVERITY_DEFAULTS = {
  info: {
    icon: 'pi pi-info-circle',
    acceptClassName: 'p-button-primary'
  },
  warn: {
    icon: 'pi pi-exclamation-triangle',
    acceptClassName: 'p-button-warning'
  },
  danger: {
    icon: 'pi pi-exclamation-triangle',
    acceptClassName: 'p-button-danger'
  }
};

/**
 * @param {object} options
 * @param {string} options.message
 * @param {string} [options.header]
 * @param {'info'|'warn'|'danger'} [options.severity]
 * @param {string} [options.icon]
 * @param {string} [options.acceptLabel]
 * @param {string} [options.rejectLabel]
 * @param {string} [options.acceptClassName]
 * @param {() => void} [options.accept]
 * @param {() => void} [options.reject]
 * @returns {Promise<boolean>}
 */
export function appConfirm(options = {}) {
  const {
    message,
    header = 'Confirmar',
    severity = 'warn',
    icon,
    acceptLabel,
    rejectLabel,
    acceptClassName,
    accept,
    reject,
    ...rest
  } = options;

  const defaults = SEVERITY_DEFAULTS[severity] || SEVERITY_DEFAULTS.warn;

  return new Promise((resolve) => {
    confirmDialog({
      message,
      header,
      icon: icon || defaults.icon,
      acceptLabel: acceptLabel || 'Aceptar',
      rejectLabel: rejectLabel || 'Cancelar',
      acceptClassName: acceptClassName || defaults.acceptClassName,
      className: 'app-confirm-dialog',
      accept: () => {
        try {
          if (typeof accept === 'function') accept();
        } finally {
          resolve(true);
        }
      },
      reject: () => {
        try {
          if (typeof reject === 'function') reject();
        } finally {
          resolve(false);
        }
      },
      ...rest
    });
  });
}

export default appConfirm;
