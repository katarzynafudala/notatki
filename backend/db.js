import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// sciezka pliku bazy SQLite
const DB_PATH = path.join(dirname, 'notatki.db');

export const db = new DatabaseSync(DB_PATH);

/**
 * haszowanie i salt hasla
 */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * weryfikacja hasla
 */
export function verifyPassword(password, hash, salt) {
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return computed === hash;
}

/**
 * start
 * jesli db nie istnieje to tworzy tabele
 */
export function initDatabase() {
  // Tabela użytkowników
  db.exec(`
    CREATE TABLE IF NOT EXISTS uzytkownicy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Tabela notatek
  db.exec(`
    CREATE TABLE IF NOT EXISTS notatki (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      tytul TEXT NOT NULL,
      tresc TEXT NOT NULL,
      kategoria TEXT DEFAULT 'Ogólne',
      przypieta INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES uzytkownicy(id)
    );
  `);

  // Migracja: dodaj user_id jeśli brakuje w istniejącej tabeli notatki
  const columns = db.prepare("PRAGMA table_info(notatki)").all();
  const hasUserId = columns.some(col => col.name === 'user_id');
  if (!hasUserId) {
    db.exec("ALTER TABLE notatki ADD COLUMN user_id INTEGER;");
  }

  // Tabela sesji / tokenów
  db.exec(`
    CREATE TABLE IF NOT EXISTS sesje (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE
    );
  `);

  console.log('DB created');
}

/**
 * operacje na uzytkownikach
 */
export const usersDb = {
  // utworzenie nowego uzytkownika
  create: ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO uzytkownicy (email, password_hash, salt, created_at) VALUES (?, ?, ?, ?)');
    const result = stmt.run(normalizedEmail, hash, salt, now);
    return { id: result.lastInsertRowid, email: normalizedEmail, created_at: now };
  },

  // pobranie po emailu
  findByEmail: (email) => {
    if (!email) return null;
    return db.prepare('SELECT * FROM uzytkownicy WHERE LOWER(email) = LOWER(?)').get(email.trim());
  },

  // pobranie po ID
  findById: (id) => {
    if (!id) return null;
    return db.prepare('SELECT id, email, created_at FROM uzytkownicy WHERE id = ?').get(id);
  },

  // weryfikacja logowania
  verifyCredentials: (email, password) => {
    const user = usersDb.findByEmail(email);
    if (!user) return null;
    if (!verifyPassword(password, user.password_hash, user.salt)) {
      return null;
    }
    return { id: user.id, email: user.email };
  },

  // pobranie użytkownika po tokenie lub emailu
  findByTokenOrEmail: (identifier) => {
    if (!identifier) return null;
    const clean = identifier.trim();

    // 1. Sprawdź czy to email
    const userByEmail = db.prepare('SELECT id, email FROM uzytkownicy WHERE LOWER(email) = LOWER(?)').get(clean);
    if (userByEmail) return userByEmail;

    // 2. Sprawdź czy to token sesji
    try {
      const session = db.prepare('SELECT user_id FROM sesje WHERE token = ?').get(clean);
      if (session) {
        return db.prepare('SELECT id, email FROM uzytkownicy WHERE id = ?').get(session.user_id);
      }
    } catch {}

    // 3. Sprawdź czy to id numeryczne
    if (/^\d+$/.test(clean)) {
      const userById = db.prepare('SELECT id, email FROM uzytkownicy WHERE id = ?').get(Number(clean));
      if (userById) return userById;
    }

    return null;
  }
};

/**
 * zapytania sql dla notatek (z filtrowaniem po user_id)
 */
export const notesDb = {
  // pobieranie wszystkich notatek danego użytkownika
  getAll: (userId) => {
    return db.prepare('SELECT * FROM notatki WHERE user_id = ? ORDER BY przypieta DESC, id DESC').all(userId);
  },

  // pobranie notatki po ID dla danego użytkownika
  getById: (id, userId) => {
    if (userId !== undefined) {
      return db.prepare('SELECT * FROM notatki WHERE id = ? AND user_id = ?').get(id, userId);
    }
    return db.prepare('SELECT * FROM notatki WHERE id = ?').get(id);
  },

  // dodanie nowej notatki
  create: ({ tytul, tresc, kategoria, przypieta, data, userId }) => {
    const dataNotatki = data ?? new Date().toLocaleDateString('pl-PL');
    const stmt = db.prepare('INSERT INTO notatki (user_id, tytul, tresc, kategoria, przypieta, data) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(userId, tytul, tresc, kategoria ?? 'Ogólne', przypieta ? 1 : 0, dataNotatki);
    return { id: result.lastInsertRowid, user_id: userId, tytul, tresc, kategoria: kategoria ?? 'Ogólne', przypieta: przypieta ? 1 : 0, data: dataNotatki };
  },

  // aktualizacja notatki
  update: (id, { tytul, tresc, kategoria, przypieta }, userId) => {
    const existing = notesDb.getById(id, userId);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE notatki
      SET tytul = ?, tresc = ?, kategoria = ?, przypieta = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(
      tytul ?? existing.tytul,
      tresc ?? existing.tresc,
      kategoria ?? existing.kategoria,
      przypieta !== undefined ? (przypieta ? 1 : 0) : existing.przypieta,
      id,
      userId
    );
    return notesDb.getById(id, userId);
  },

  // usuniecie notatki
  delete: (id, userId) => {
    const stmt = db.prepare('DELETE FROM notatki WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }
};
