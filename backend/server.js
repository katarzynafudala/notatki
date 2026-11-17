import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase, notesDb, usersDb, verifyPassword } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = process.env.PORT || 3000;

// start bazy
initDatabase();

// middleware
app.use(cors());
app.use(express.json());

// serwowanie strony logowania / rejestracji
app.use('/login', express.static(path.join(__dirname, '../login')));

// serwowanie zbudowanego frontendu (jeśli istnieje)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// pobieranie zalogowanego użytkownika z nagłówka lub query
function getAuthUser(req) {
  const raw = req.headers['authorization'] || req.headers['x-user-token'] || req.query.user_token || req.query.user;
  if (!raw) return null;
  const token = raw.replace(/^Bearer\s+/i, '').trim();
  return usersDb.findByTokenOrEmail(token);
}

// middleware wymagające autoryzacji
function requireAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Wymagane logowanie' });
  }
  req.user = user;
  next();
}

// healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rejestracja nowego użytkownika (lub logowanie jeśli konto już istnieje i hasło pasuje)
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Adres e-mail i hasło są wymagane' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Hasło musi mieć co najmniej 8 znaków' });
  }

  const existing = usersDb.findByEmail(email);
  if (existing) {
    if (verifyPassword(password, existing.password_hash, existing.salt)) {
      return res.json({
        success: true,
        message: 'Zalogowano pomyślnie!',
        token: existing.email,
        user: { id: existing.id, email: existing.email }
      });
    }
    return res.status(400).json({ error: 'Konto o tym adresie e-mail już istnieje' });
  }

  const newUser = usersDb.create({ email, password });

  // Domyślna notatka powitalna dla nowego użytkownika
  notesDb.create({
    userId: newUser.id,
    tytul: 'Witaj w Notatkach! 🚀',
    tresc: 'Twoje notatki są teraz w pełni prywatne i przypisane do Twojego konta.',
    kategoria: 'Ogólne',
    przypieta: 1,
    data: new Date().toLocaleDateString('pl-PL')
  });

  res.status(201).json({
    success: true,
    message: 'Konto utworzone pomyślnie!',
    token: newUser.email,
    user: newUser
  });
});

// Logowanie użytkownika
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Adres e-mail i hasło są wymagane' });
  }

  const user = usersDb.verifyCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Nieprawidłowy adres e-mail lub hasło' });
  }

  res.json({
    success: true,
    message: 'Zalogowano pomyślnie!',
    token: user.email,
    user
  });
});

// Informacje o aktualnym użytkowniku
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// pobieranie wszystkich notatek zalogowanego użytkownika
app.get('/api/notes', requireAuth, (req, res) => {
  const notes = notesDb.getAll(req.user.id);
  res.json(notes);
});

// pobranie pojedynczej notatki zalogowanego użytkownika
app.get('/api/notes/:id', requireAuth, (req, res) => {
  const note = notesDb.getById(req.params.id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Notatka nie istnieje' });
  }
  res.json(note);
});

// dodanie nowej notatki dla zalogowanego użytkownika
app.post('/api/notes', requireAuth, (req, res) => {
  const { tytul, tresc, kategoria, przypieta, data } = req.body;
  if (!tytul || !tresc) {
    return res.status(400).json({ error: 'Tytuł i treść są wymagane' });
  }

  const newNote = notesDb.create({
    userId: req.user.id,
    tytul,
    tresc,
    kategoria,
    przypieta,
    data
  });
  res.status(201).json(newNote);
});

// edycja notatki zalogowanego użytkownika
app.put('/api/notes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { tytul, tresc, kategoria, przypieta } = req.body;

  const updatedNote = notesDb.update(id, { tytul, tresc, kategoria, przypieta }, req.user.id);
  if (!updatedNote) {
    return res.status(404).json({ error: 'Notatka nie istnieje' });
  }
  res.json(updatedNote);
});

// usuniecie notatki zalogowanego użytkownika
app.delete('/api/notes/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  const deleted = notesDb.delete(id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Notatka nie istnieje' });
  }
  res.json({ success: true, id: Number(id) });
});

// udostępnienie notatki innemu użytkownikowi po adresie e-mail (tylko do odczytu)
app.post('/api/notes/:id/share', requireAuth, (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Podaj adres e-mail odbiorcy' });
  }

  const result = notesDb.share(Number(id), req.user.id, email.trim());
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result.note);
});

// cofnięcie udostępnienia notatki
app.delete('/api/notes/:id/share', requireAuth, (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Podaj adres e-mail użytkownika' });
  }

  const result = notesDb.unshare(Number(id), req.user.id, email.trim());
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result.note);
});

// obsluga 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// start serwera
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}
