import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// sciezka pliku bazy SQLite
const DB_PATH = path.join(dirname, 'notatki.db');

export const db = new DatabaseSync(DB_PATH);

/**
 * start
 * jesli db nie istnieje to tworzy tabele
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notatki (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tytul TEXT NOT NULL,
      tresc TEXT NOT NULL,
      kategoria TEXT DEFAULT 'Ogólne',
      przypieta INTEGER DEFAULT 0,
      data TEXT NOT NULL
    );
  `);
  console.log('DB created');
}

/**
 * zapytania sql
 */
export const notesDb = {
  // pobieranie wszystkich notatek
  getAll: () => {
    return db.prepare('SELECT * FROM notatki ORDER BY przypieta DESC, id DESC').all();
  },

  // pobranie notatki po ID
  getById: (id) => {
    return db.prepare('SELECT * FROM notatki WHERE id = ?').get(id);
  },

  // dodanie nowej notatki
  create: ({ tytul, tresc, kategoria, przypieta, data }) => {
    const dataNotatki = data ?? new Date().toLocaleDateString('pl-PL');
    const stmt = db.prepare('INSERT INTO notatki (tytul, tresc, kategoria, przypieta, data) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(tytul, tresc, kategoria ?? 'Ogólne', przypieta ? 1 : 0, dataNotatki);
    return { id: result.lastInsertRowid, tytul, tresc, kategoria: kategoria ?? 'Ogólne', przypieta: przypieta ? 1 : 0, data: dataNotatki };
  },

  // aktualizacja notatki
  update: (id, { tytul, tresc, kategoria, przypieta }) => {
    const existing = notesDb.getById(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE notatki
      SET tytul = ?, tresc = ?, kategoria = ?, przypieta = ?
      WHERE id = ?
    `);
    stmt.run(
      tytul ?? existing.tytul,
      tresc ?? existing.tresc,
      kategoria ?? existing.kategoria,
      przypieta !== undefined ? (przypieta ? 1 : 0) : existing.przypieta,
      id
    );
    return notesDb.getById(id);
  },

  // usuniecie notatki
  delete: (id) => {
    const stmt = db.prepare('DELETE FROM notatki WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
