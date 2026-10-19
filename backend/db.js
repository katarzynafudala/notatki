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
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'Ogólne',
      pinned INTEGER DEFAULT 0,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
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
    return db.prepare('SELECT * FROM notes ORDER BY pinned DESC, id DESC').all();
  },

  // pobranie notatki po ID
  getById: (id) => {
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  },

  // Dodanie nowej notatki
  create: ({ title, content, category, pinned, date }) => {
    const stmt = db.prepare('INSERT INTO notes (title, content, category, pinned, date) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(title, content, category ?? 'Ogólne', pinned ? 1 : 0, date);
    return { id: result.lastInsertRowid, title, content, category, pinned, date };
  },

  // Aktualizacja notatki
  update: (id, { title, content, category, pinned }) => {
    const existing = notesDb.getById(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE notes
      SET title = ?, content = ?, category = ?, pinned = ?
      WHERE id = ?
    `);
    stmt.run(
      title ?? existing.title,
      content ?? existing.content,
      category ?? existing.category,
      pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
      id
    );
    return notesDb.getById(id);
  },

  // Usunięcie notatki
  delete: (id) => {
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
