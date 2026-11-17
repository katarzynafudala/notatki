import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// sciezka pliku bazy SQLite
const DB_PATH = process.env.DB_PATH || path.join(dirname, 'notatki.db');

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

  // Tabela udostępnionych notatek (tylko do odczytu)
  db.exec(`
    CREATE TABLE IF NOT EXISTS udostepnione_notatki (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(note_id, shared_with_user_id),
      FOREIGN KEY (note_id) REFERENCES notatki(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES uzytkownicy(id) ON DELETE CASCADE
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
  // pobranie listy adresów e-mail, którym udostępniono daną notatkę
  getSharedEmails: (noteId) => {
    const rows = db.prepare(`
      SELECT u.email
      FROM udostepnione_notatki un
      JOIN uzytkownicy u ON u.id = un.shared_with_user_id
      WHERE un.note_id = ?
      ORDER BY un.id ASC
    `).all(noteId);
    return rows.map(r => r.email);
  },

  // pobieranie wszystkich notatek danego użytkownika (własnych + udostępnionych mu)
  getAll: (userId) => {
    const ownNotes = db.prepare(`
      SELECT n.*, u.email AS wlasciciel_email, 1 AS czy_wlasna
      FROM notatki n
      LEFT JOIN uzytkownicy u ON u.id = n.user_id
      WHERE n.user_id = ?
    `).all(userId).map(n => ({
      ...n,
      udostepniono_dla: notesDb.getSharedEmails(n.id)
    }));

    const sharedNotes = db.prepare(`
      SELECT n.*, u.email AS wlasciciel_email, 0 AS czy_wlasna
      FROM udostepnione_notatki un
      JOIN notatki n ON n.id = un.note_id
      LEFT JOIN uzytkownicy u ON u.id = n.user_id
      WHERE un.shared_with_user_id = ?
    `).all(userId).map(n => ({
      ...n,
      przypieta: 0,
      udostepniono_dla: []
    }));

    return [...ownNotes, ...sharedNotes].sort((a, b) => {
      if (a.przypieta !== b.przypieta) return b.przypieta - a.przypieta;
      return b.id - a.id;
    });
  },

  // pobranie notatki po ID dla właściciela
  getById: (id, userId) => {
    let note;
    if (userId !== undefined) {
      note = db.prepare('SELECT * FROM notatki WHERE id = ? AND user_id = ?').get(id, userId);
    } else {
      note = db.prepare('SELECT * FROM notatki WHERE id = ?').get(id);
    }
    if (!note) return null;
    return {
      ...note,
      czy_wlasna: 1,
      udostepniono_dla: notesDb.getSharedEmails(note.id)
    };
  },

  // dodanie nowej notatki
  create: ({ tytul, tresc, kategoria, przypieta, data, userId }) => {
    const dataNotatki = data ?? new Date().toLocaleDateString('pl-PL');
    const stmt = db.prepare('INSERT INTO notatki (user_id, tytul, tresc, kategoria, przypieta, data) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(userId, tytul, tresc, kategoria ?? 'Ogólne', przypieta ? 1 : 0, dataNotatki);
    return {
      id: Number(result.lastInsertRowid),
      user_id: userId,
      tytul,
      tresc,
      kategoria: kategoria ?? 'Ogólne',
      przypieta: przypieta ? 1 : 0,
      data: dataNotatki,
      czy_wlasna: 1,
      udostepniono_dla: []
    };
  },

  // aktualizacja notatki (tylko właściciel)
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

  // usuniecie notatki (tylko właściciel)
  delete: (id, userId) => {
    const existing = notesDb.getById(id, userId);
    if (!existing) return false;
    db.prepare('DELETE FROM udostepnione_notatki WHERE note_id = ?').run(id);
    const stmt = db.prepare('DELETE FROM notatki WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  },

  // udostępnienie notatki innemu użytkownikowi po adresie e-mail
  share: (noteId, ownerId, targetEmail) => {
    const note = notesDb.getById(noteId, ownerId);
    if (!note) return { error: 'Notatka nie istnieje lub brak uprawnień', status: 404 };

    const targetUser = usersDb.findByEmail(targetEmail);
    if (!targetUser) return { error: 'Użytkownik o podanym adresie e-mail nie istnieje', status: 404 };

    if (targetUser.id === ownerId) {
      return { error: 'Nie możesz udostępnić notatki samemu sobie', status: 400 };
    }

    const alreadyShared = db.prepare(
      'SELECT id FROM udostepnione_notatki WHERE note_id = ? AND shared_with_user_id = ?'
    ).get(noteId, targetUser.id);

    if (alreadyShared) {
      return { error: 'Notatka jest już udostępniona temu użytkownikowi', status: 400 };
    }

    db.prepare(
      'INSERT INTO udostepnione_notatki (note_id, shared_with_user_id, created_at) VALUES (?, ?, ?)'
    ).run(noteId, targetUser.id, new Date().toISOString());

    return {
      note: notesDb.getById(noteId, ownerId)
    };
  },

  // cofnięcie udostępnienia notatki
  unshare: (noteId, ownerId, targetEmail) => {
    const note = notesDb.getById(noteId, ownerId);
    if (!note) return { error: 'Notatka nie istnieje lub brak uprawnień', status: 404 };

    const targetUser = usersDb.findByEmail(targetEmail);
    if (!targetUser) return { error: 'Użytkownik nie istnieje', status: 404 };

    db.prepare(
      'DELETE FROM udostepnione_notatki WHERE note_id = ? AND shared_with_user_id = ?'
    ).run(noteId, targetUser.id);

    return {
      note: notesDb.getById(noteId, ownerId)
    };
  }
};
