// Jeśli użytkownik jest już zalogowany, przenieś do notatek
if (localStorage.getItem('user_token')) {
  window.location.href = '/';
}

// Pola formularza
const form = document.querySelector('#registration-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const confirmation = document.querySelector('#confirm-password');
const status = document.querySelector('#form-status');
const fields = [email, password, confirmation];

let submitted = false;
const visited = new Set();

// Sprawdzanie poprawności danych
function check(field) {
  let valid;
  let message;

  if (field === email) {
    valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    message = 'Wpisz poprawny adres e-mail.';
  } else if (field === password) {
    valid = password.value.length >= 8;
    message = 'Hasło musi mieć minimum 8 znaków.';
  } else {
    valid = confirmation.value !== '' && confirmation.value === password.value;
    message = 'Hasła nie są takie same.';
  }

  const errorId = field === confirmation ? 'confirm-error' : field.id + '-error';
  document.getElementById(errorId).textContent = valid ? '' : message;
  field.setAttribute('aria-invalid', String(!valid));
  return valid;
}

// Sprawdzanie po opuszczeniu pola i podczas poprawiania
fields.forEach(field => {
  field.addEventListener('blur', () => {
    visited.add(field);
    check(field);
  });

  field.addEventListener('input', () => {
    status.textContent = '';
    if (submitted || visited.has(field)) check(field);
    if (field === password && (submitted || visited.has(confirmation))) {
      check(confirmation);
    }
  });
});

// Zatwierdzenie formularza
form.addEventListener('submit', event => {
  event.preventDefault();
  submitted = true;

  const results = fields.map(check);
  if (results.every(Boolean)) {
    localStorage.setItem('user_token', email.value.trim());
    status.textContent = 'Konto utworzone! Przekierowywanie do notatek...';
    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  } else {
    status.textContent = '';
    fields[results.indexOf(false)].focus();
  }
});
