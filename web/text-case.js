// Normalize typed text before form handlers save drafts or submit data.
// Passwords are case-sensitive and must never be transformed.
export function installUppercaseInputs() {
  const isText = field => field instanceof HTMLTextAreaElement ||
    field instanceof HTMLInputElement && ['text','search','email','tel','url'].includes(field.type);
  const normalize = field => {
    if (!isText(field) || field.hasAttribute('data-password') || field.readOnly || field.disabled) return;
    field.autocapitalize = 'characters';
    const original = field.value, upper = original.toLocaleUpperCase('pt-BR');
    if (original === upper) return;
    const start = field.selectionStart, end = field.selectionEnd;
    field.value = upper;
    if (start !== null && end !== null) {
      try {
        field.setSelectionRange(
          original.slice(0,start).toLocaleUpperCase('pt-BR').length,
          original.slice(0,end).toLocaleUpperCase('pt-BR').length
        );
      } catch {}
    }
  };
  document.addEventListener('input', event => { if (!event.isComposing) normalize(event.target); }, true);
  document.addEventListener('compositionend', event => normalize(event.target), true);
  document.addEventListener('change', event => normalize(event.target), true);
  document.addEventListener('focusin', event => normalize(event.target), true);
  document.addEventListener('submit', event => {
    if (event.target instanceof HTMLFormElement) [...event.target.elements].forEach(normalize);
  }, true);
}
