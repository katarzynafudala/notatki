# Dokumentacja projektu Notatki

1. Opis projektu i funkcjonalności
   - Aplikacja webowa do tworzenia i organizacji prywatnych notatek przypisanych do konta użytkownika
   - Rejestracja i logowanie użytkowników z walidacją formularza
   - Operacje CRUD: dodawanie, przeglądanie, edycja i usuwanie notatek
   - Prypinanie, filtrowanie, wyszukiwarka oraz sortowanie
   - Udostępnianie notatek innym użytkownikom
   - Responsywny układ strony

2. Wykorzystane technologie
   - Frontend: HTML5, CSS3, JavaScript, Vue 3, Vite, Fetch API
   - Backend: Node.js, Express.js, REST API, JSON, CORS
   - Baza danych: SQLite
   - Testy: node:test

3. Struktura projektu
   - backend/server.js - serwer Express i endpointy REST API
   - backend/db.js - konfiguracja bazy SQLite i zapytania SQL
   - backend/api.test.js - testy automatyczne API
   - frontend/src/App.vue - główny interfejs aplikacji w Vue 3
   - login/ - strona logowania i rejestracji (index.html, style.css, script.js)

4. Baza danych (tabele i relacje)
   - uzytkownicy (id, email, password_hash, salt, created_at)
   - notatki (id, user_id -> uzytkownicy.id, tytul, tresc, kategoria, przypieta, data)
   - udostepnione_notatki (id, note_id -> notatki.id, shared_with_user_id -> uzytkownicy.id, created_at)
   - sesje (token, user_id -> uzytkownicy.id, created_at)

5. Endpointy REST API
   - GET /api/health - sprawdzenie działania serwera
   - POST /api/register - rejestracja nowego konta
   - POST /api/login - logowanie użytkownika
   - GET /api/me - dane zalogowanego użytkownika
   - GET /api/notes - pobranie własnych i udostępnionych notatek
   - GET /api/notes/:id - pobranie pojedynczej notatki
   - POST /api/notes - dodanie nowej notatki
   - PUT /api/notes/:id - edycja notatki
   - DELETE /api/notes/:id - usunięcie notatki
   - POST /api/notes/:id/share - udostępnienie notatki po e-mailu
   - DELETE /api/notes/:id/share - cofnięcie udostępnienia

6. Bezpieczeństwo i testowanie
   - Walidacja formularzy po stronie klienta i serwera
   - Haszowanie haseł algorytmem scrypt + salt
   - Zapytania parametryzowane chroniące przed SQL Injection oraz weryfikacja właściciela notatki przy edycji i usuwaniu
   - Automatyczne testy API [cd backend && npm test]

7. Uruchomienie projektu
   - Zbudowanie frontendu:
     cd frontend && npm install && npm run build
   - Uruchomienie serwera (port 3000):
     cd backend && npm install && npm start
   - Adres aplikacji: http://localhost:3000
