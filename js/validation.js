/* ==========================================================================
   VALIDATION + NOTIFICATIONS
   ========================================================================== */

const Toast = {
  container: null,

  _ensureContainer() {
    if (!this.container) {
      this.container = document.getElementById('toastContainer');
    }
    if (!this.container) {
      // Admin panel pages create their own container if index.html's isn't present
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toastContainer';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }
    return this.container;
  },

  show(type, title, message, duration = 4200) {
    const container = this._ensureContainer();
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      info: 'fa-circle-info'
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info} toast-icon" aria-hidden="true"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss notification"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(el);

    const remove = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);
    const timer = setTimeout(remove, duration);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
  },

  success(title, message) { this.show('success', title, message); },
  error(title, message) { this.show('error', title, message); },
  info(title, message) { this.show('info', title, message); }
};

/* ---------- Validators ---------- */
const Validators = {
  name: (v) => v.trim().length >= 2,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  subject: (v) => v.trim().length >= 3,
  message: (v) => v.trim().length >= 10,
  required: (v) => v.trim().length > 0,
  minLen: (v, n) => v.trim().length >= n,
  phone: (v) => /^[+]?[\d\s\-()]{7,}$/.test(v.trim())
};

/**
 * Validate a single field wrapper (.field) that contains an input/textarea
 * and a .field-error message. Toggles .invalid / .valid classes.
 */
function validateFieldEl(fieldEl, validatorFn) {
  const input = fieldEl.querySelector('input, textarea, select');
  if (!input) return true;
  const isValid = validatorFn(input.value);
  fieldEl.classList.toggle('invalid', !isValid);
  fieldEl.classList.toggle('valid', isValid);
  return isValid;
}
