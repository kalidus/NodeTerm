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
    let settled = false;
    const finish = (accepted) => {
      if (!settled) {
        settled = true;
        resolve(accepted);
      }
    };

    try {
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
            finish(true);
          }
        },
        reject: () => {
          try {
            if (typeof reject === 'function') reject();
          } finally {
            finish(false);
          }
        },
        onHide: (result) => {
          try {
            if (result !== 'accept' && result !== 'reject') {
              if (typeof reject === 'function') reject();
            }
          } finally {
            finish(false);
          }
        },
        ...rest
      });
    } catch (err) {
      console.warn('[AppConfirm] Error al abrir confirmDialog de PrimeReact, recurriendo a window.confirm:', err);
      try {
        const text = typeof message === 'string' ? message : (header || 'Confirmar');
        const ok = window.confirm(text);
        if (ok) {
          if (typeof accept === 'function') accept();
          finish(true);
        } else {
          if (typeof reject === 'function') reject();
          finish(false);
        }
      } catch {
        finish(false);
      }
    }
  });
}

export default appConfirm;
