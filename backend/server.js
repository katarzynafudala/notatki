import express from 'express';
import cors from 'cors';
import { initDatabase, notesDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// start bazy
initDatabase();

// middleware
app.use(cors());
app.use(express.json());

// healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// pobieranie wszystkich notatek
app.get('/api/notes', (req, res) => {
  const notes = notesDb.getAll();
  res.json(notes);
});

// pobranie pojedynczej notatki
app.get('/api/notes/:id', (req, res) => {
  const note = notesDb.getById(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Notatka nie istnieje' });
  }
  res.json(note);
});

// dodanie nowej notatki
app.post('/api/notes', (req, res) => {
  const { tytul, tresc, kategoria, przypieta, data } = req.body;
  if (!tytul || !tresc) {
    return res.status(400).json({ error: 'Tytuł i treść są wymagane' });
  }

  const newNote = notesDb.create({ tytul, tresc, kategoria, przypieta, data });
  res.status(201).json(newNote);
  console.log('new');
});

// edycja notatki
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { tytul, tresc, kategoria, przypieta } = req.body;

  const updatedNote = notesDb.update(id, { tytul, tresc, kategoria, przypieta });
  if (!updatedNote) {
    return res.status(404).json({ error: 'Notatka nie istnieje' });
  }
  res.json(updatedNote);
  console.log('edit');
});

// usuniecie notatki
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;

  const deleted = notesDb.delete(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Notatka nie istnieje' });
  }
  res.json({ success: true, id: Number(id) });
  console.log('delete');
});

// obsluga 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// start serwera
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
