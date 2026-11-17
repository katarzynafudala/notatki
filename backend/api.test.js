import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './server.js';

let server;
let baseUrl;
let token = '';
let noteId;

// Uruchomienie serwera na losowym wolnym porcie przed testami
before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

// Zamknięcie serwera po testach
after(() => {
  server.close();
});

test('1. Healthcheck zwraca status ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.status, 'ok');
});

test('2. Rejestracja - odrzuca zbyt krótkie hasło (dane błędne)', async () => {
  const res = await fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@domena.pl', password: '123' })
  });

  assert.equal(res.status, 400);
});

test('3. Rejestracja - tworzy nowe konto (dane poprawne)', async () => {
  const res = await fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@domena.pl', password: 'haslo1234' })
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  token = data.token;
});

test('4. Logowanie - odrzuca błędne hasło (dane błędne)', async () => {
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@domena.pl', password: 'zle_haslo' })
  });

  assert.equal(res.status, 401);
});

test('5. Autoryzacja - blokuje dostęp do notatek bez tokenu', async () => {
  const res = await fetch(`${baseUrl}/api/notes`);
  assert.equal(res.status, 401);
});

test('6. CREATE - odrzuca notatkę bez tytułu lub treści (dane błędne)', async () => {
  const res = await fetch(`${baseUrl}/api/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ tytul: 'Tylko tytuł', tresc: '' })
  });

  assert.equal(res.status, 400);
});

test('7. CREATE - dodaje nową notatkę (dane poprawne)', async () => {
  const res = await fetch(`${baseUrl}/api/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      tytul: 'Notatka testowa',
      tresc: 'Treść testowa',
      kategoria: 'Studia'
    })
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.tytul, 'Notatka testowa');
  noteId = data.id;
});

test('8. READ - pobiera listę notatek użytkownika', async () => {
  const res = await fetch(`${baseUrl}/api/notes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const notes = await res.json();

  assert.equal(res.status, 200);
  assert.ok(notes.length >= 1);
});

test('9. UPDATE - aktualizuje istniejącą notatkę', async () => {
  const res = await fetch(`${baseUrl}/api/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ tytul: 'Zmieniony tytuł', przypieta: 1 })
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.tytul, 'Zmieniony tytuł');
  assert.equal(data.przypieta, 1);
});

test('10. DELETE - usuwa notatkę i zwraca 404 przy ponownej próbie', async () => {
  const delRes = await fetch(`${baseUrl}/api/notes/${noteId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.equal(delRes.status, 200);

  const getRes = await fetch(`${baseUrl}/api/notes/${noteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.equal(getRes.status, 404);
});
