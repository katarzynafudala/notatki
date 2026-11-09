// Jeśli użytkownik jest już zalogowany, przenieś do notatek
if (localStorage.getItem('user_token')) {
  window.location.href = '/';
}

const API_BASE = window.location.port === '5173'
  ? `http://${window.location.hostname}:3000`
  : '';

// Pola formularza
const form = document.querySelector('#registration-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const confirmation = document.querySelector('#confirm-password');
const confirmField = document.querySelector('#confirm-field');
const status = document.querySelector('#form-status');
const heading = document.querySelector('#form-heading');
const submitBtn = document.querySelector('#submit-btn');
const toggleAuth = document.querySelector('#toggle-auth');
const pageTitle = document.querySelector('#page-title');

let isLoginMode = false;
let submitted = false;
const visited = new Set();

// Przełączanie między rejestracją a logowaniem
toggleAuth?.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  status.textContent = '';
  status.classList.remove('error-status');

  if (isLoginMode) {
    heading.textContent = 'Zaloguj się';
    pageTitle.textContent = 'Logowanie';
    submitBtn.textContent = 'Zaloguj się';
    toggleAuth.textContent = 'Nie masz konta? Zarejestruj się';
    confirmField.style.display = 'none';
    document.getElementById('confirm-error').textContent = '';
    confirmation.removeAttribute('required');
  } else {
    heading.textContent = 'Utwórz konto';
    pageTitle.textContent = 'Utwórz konto';
    submitBtn.textContent = 'Utwórz konto';
    toggleAuth.textContent = 'Masz już konto? Zaloguj się';
    confirmField.style.display = 'block';
    confirmation.setAttribute('required', '');
  }
});

// Sprawdzanie poprawności danych
function check(field) {
  let valid = true;
  let message = '';

  if (field === email) {
    valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    message = 'Wpisz poprawny adres e-mail.';
  } else if (field === password) {
    valid = password.value.length >= 8;
    message = 'Hasło musi mieć minimum 8 znaków.';
  } else if (field === confirmation && !isLoginMode) {
    valid = confirmation.value !== '' && confirmation.value === password.value;
    message = 'Hasła nie są takie same.';
  }

  const errorId = field === confirmation ? 'confirm-error' : field.id + '-error';
  const errEl = document.getElementById(errorId);
  if (errEl) {
    errEl.textContent = valid ? '' : message;
  }
  field.setAttribute('aria-invalid', String(!valid));
  return valid;
}

// Sprawdzanie po opuszczeniu pola i podczas poprawiania
const fields = [email, password, confirmation];
fields.forEach(field => {
  field.addEventListener('blur', () => {
    visited.add(field);
    check(field);
  });

  field.addEventListener('input', () => {
    status.textContent = '';
    status.classList.remove('error-status');
    if (submitted || visited.has(field)) check(field);
    if (field === password && !isLoginMode && (submitted || visited.has(confirmation))) {
      check(confirmation);
    }
  });
});

// Zatwierdzenie formularza
form.addEventListener('submit', async event => {
  event.preventDefault();
  submitted = true;
  status.textContent = '';
  status.classList.remove('error-status');

  const activeFields = isLoginMode ? [email, password] : [email, password, confirmation];
  const results = activeFields.map(check);

  if (!results.every(Boolean)) {
    activeFields[results.indexOf(false)].focus();
    return;
  }

  const endpoint = isLoginMode ? '/api/login' : '/api/register';
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      status.classList.add('error-status');
      status.textContent = data.error || 'Wystąpił błąd podczas logowania.';
      submitBtn.disabled = false;
      return;
    }

    localStorage.setItem('user_token', data.token || email.value.trim());
    status.textContent = data.message || 'Sukces! Przekierowywanie do notatek...';

    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  } catch (err) {
    console.error('Błąd połączenia:', err);
    status.classList.add('error-status');
    status.textContent = 'Nie udało się połączyć z serwerem.';
    submitBtn.disabled = false;
  }
});
