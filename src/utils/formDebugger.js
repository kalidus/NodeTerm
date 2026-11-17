/**
 * API mínima para el menú manual "Desbloquear formularios".
 * Sin hooks de debug ni rutas de emergencia globales.
 */

export const detectBlockedInputs = () => {
  const inputs = document.querySelectorAll('input, textarea, select, [contenteditable]');
  const blockedInputs = [];

  inputs.forEach((input) => {
    const computedStyle = window.getComputedStyle(input);
    const isBlocked =
      computedStyle.pointerEvents === 'none' ||
      computedStyle.userSelect === 'none' ||
      input.disabled ||
      input.readOnly;

    if (isBlocked) {
      blockedInputs.push({
        element: input,
        id: input.id,
        name: input.name,
        type: input.type,
        reason: {
          pointerEvents: computedStyle.pointerEvents,
          userSelect: computedStyle.userSelect,
          disabled: input.disabled,
          readOnly: input.readOnly
        }
      });
    }
  });

  return blockedInputs;
};

export const unblockAllInputs = () => {
  const inputs = document.querySelectorAll('input, textarea, select, [contenteditable]');

  inputs.forEach((input) => {
    input.style.pointerEvents = 'auto';
    input.style.userSelect = 'auto';
    input.disabled = false;
    input.readOnly = false;
    input.removeAttribute('readonly');
    input.removeAttribute('disabled');
  });
};
