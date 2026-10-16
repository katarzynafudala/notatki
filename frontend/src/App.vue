
<script setup>
// Importujemy funkcje Vue potrzebne do działania aplikacji
import { ref, computed, watch } from 'vue'

// Wczytujemy zapisane notatki z pamięci przeglądarki
const notatki = ref(JSON.parse(localStorage.getItem('notatki') || '[]'))

// Zmienne przechowujące ustawienia aplikacji
const szukaj = ref('')
const kategoria = ref('Wszystkie')
const sortowanie = ref('najnowsze')
const trybCiemny = ref(localStorage.getItem('trybCiemny') === 'true')

// Zmienne obsługujące formularz dodawania i edycji notatek
const formularz = ref(false)
const edytowaneId = ref(null)
const tytul = ref('')
const tresc = ref('')
const wybranaKategoria = ref('Studia')

// Lista dostępnych kategorii
const kategorie = ['Wszystkie', 'Studia', 'Praca', 'Prywatne']

// Filtrowanie, wyszukiwanie i sortowanie notatek
const widoczneNotatki = computed(() => {
  return notatki.value
    .filter(n =>
      (kategoria.value === 'Wszystkie' || n.kategoria === kategoria.value) &&
      (n.tytul + ' ' + n.tresc).toLowerCase().includes(szukaj.value.toLowerCase())
    )
    .sort((a, b) => {
      // Przypięte notatki wyświetlamy na początku
      if (a.przypieta !== b.przypieta) {
        return Number(b.przypieta) - Number(a.przypieta)
      }

      // Sortowanie alfabetyczne od A do Z
      if (sortowanie.value === 'az') {
        return a.tytul.localeCompare(b.tytul, 'pl')
      }

      // Sortowanie alfabetyczne od Z do A
      if (sortowanie.value === 'za') {
        return b.tytul.localeCompare(a.tytul, 'pl')
      }

      // Sortowanie od najstarszych notatek
      if (sortowanie.value === 'najstarsze') {
        return a.id - b.id
      }

      // Domyślnie wyświetlamy najnowsze notatki
      return b.id - a.id
    })
})

// Automatycznie zapisujemy zmiany notatek w localStorage
watch(notatki, (wartosc) => {
  localStorage.setItem('notatki', JSON.stringify(wartosc))
}, { deep: true })

// Zapamiętujemy wybrany tryb jasny lub ciemny
watch(trybCiemny, (wartosc) => {
  localStorage.setItem('trybCiemny', String(wartosc))
})

// Otwieramy pusty formularz dodawania nowej notatki
function otworzFormularz() {
  edytowaneId.value = null
  tytul.value = ''
  tresc.value = ''
  wybranaKategoria.value = 'Studia'
  formularz.value = true
}

// Zapisujemy nową notatkę lub zmiany w istniejącej
function zapiszNotatke() {
  // Nie pozwalamy zapisać notatki bez tytułu
  if (!tytul.value.trim()) return

  if (edytowaneId.value !== null) {
    // Aktualizujemy istniejącą notatkę
    const notatka = notatki.value.find(n => n.id === edytowaneId.value)

    if (notatka) {
      notatka.tytul = tytul.value
      notatka.tresc = tresc.value
      notatka.kategoria = wybranaKategoria.value
    }
  } else {
    // Tworzymy nową notatkę
    notatki.value.unshift({
      id: Date.now(),
      tytul: tytul.value,
      tresc: tresc.value,
      kategoria: wybranaKategoria.value,
      przypieta: false,
      data: new Date().toLocaleDateString('pl-PL')
    })
  }

  // Zamykamy formularz po zapisaniu
  formularz.value = false
}

// Wczytujemy dane wybranej notatki do formularza edycji
function edytuj(n) {
  edytowaneId.value = n.id
  tytul.value = n.tytul
  tresc.value = n.tresc
  wybranaKategoria.value = n.kategoria
  formularz.value = true
}

// Usuwamy notatkę po potwierdzeniu przez użytkownika
function usun(id) {
  if (confirm('Czy na pewno usunąć notatkę?')) {
    notatki.value = notatki.value.filter(n => n.id !== id)
  }
}

// Przypinamy lub odpinamy wybraną notatkę
function przypnij(n) {
  n.przypieta = !n.przypieta
}
</script>

<template>
  <!-- Główny kontener aplikacji, który obsługuje zmianę motywu -->
  <div class="app" :class="{ ciemny: trybCiemny }">

    <!-- Nagłówek z nazwą aplikacji i przyciskiem zmiany motywu -->
    <header>
      <div class="logo">
        <div class="logo-icon">✎</div>
        <div>
          <strong>Notatki</strong>
          <small>Twoja przestrzeń na pomysły</small>
        </div>
      </div>

      <button class="przelacznik" @click="trybCiemny = !trybCiemny">
        {{ trybCiemny ? '☀️ Tryb jasny' : '🌙 Tryb ciemny' }}
      </button>
    </header>

    <main>
      <!-- Powitanie użytkownika -->
      <section class="powitanie">
        <h1>Twoje myśli, w jednym miejscu ✨</h1>
        <p>Zapisuj pomysły, zadania i wszystko, co ważne.</p>
      </section>

      <!-- Statystyki pokazujące liczbę notatek -->
      <section class="statystyki">
        <div class="stat">
          <span>Wszystkie notatki</span>
          <strong>{{ notatki.length }}</strong>
        </div>

        <div class="stat">
          <span>Przypięte</span>
          <strong>{{ notatki.filter(n => n.przypieta).length }}</strong>
        </div>
      </section>

      <!-- Wyszukiwarka i przycisk dodawania notatki -->
      <section class="narzedzia">
        <input v-model="szukaj" placeholder="⌕  Szukaj notatek..." />
        <button class="glowny" @click="otworzFormularz">
          + Nowa notatka
        </button>
      </section>

      <!-- Przyciski filtrowania notatek według kategorii -->
      <nav class="kategorie">
        <button
          v-for="kat in kategorie"
          :key="kat"
          :class="{ aktywna: kategoria === kat }"
          @click="kategoria = kat"
        >
          {{ kat }}
        </button>
      </nav>

      <!-- Wybór sposobu sortowania notatek -->
      <div class="naglowek-notatek">
        <h2>Twoje notatki</h2>

        <select v-model="sortowanie" class="sortowanie">
          <option value="najnowsze">Od najnowszych</option>
          <option value="najstarsze">Od najstarszych</option>
          <option value="az">Alfabetycznie A–Z</option>
          <option value="za">Alfabetycznie Z–A</option>
        </select>
      </div>

      <!-- Komunikat wyświetlany, gdy nie znaleziono notatek -->
      <div v-if="widoczneNotatki.length === 0" class="pusto">
        <div class="pusto-ikona">✎</div>
        <h3>Jeszcze tu pusto</h3>
        <p>Dodaj pierwszą notatkę albo zmień wyszukiwanie.</p>
      </div>

      <!-- Lista notatek w postaci kolorowych kart -->
      <section class="siatka">
        <article
          v-for="(n, index) in widoczneNotatki"
          :key="n.id"
          class="notatka"
          :class="'kolor-' + (index % 4)"
        >
          <div class="gora">
            <span class="etykieta">{{ n.kategoria }}</span>

            <!-- Przycisk przypinania notatki -->
            <button class="ikona" @click="przypnij(n)">
              {{ n.przypieta ? '📌' : '♧' }}
            </button>
          </div>

          <h3>{{ n.tytul }}</h3>
          <p class="tresc">{{ n.tresc }}</p>

          <div class="dol">
            <small>{{ n.data }}</small>

            <div>
              <!-- Edycja i usuwanie notatki -->
              <button class="ikona" @click="edytuj(n)">✎</button>
              <button class="ikona" @click="usun(n.id)">✕</button>
            </div>
          </div>
        </article>
      </section>
    </main>

    <!-- Okno formularza dodawania lub edycji notatki -->
    <div v-if="formularz" class="nakladka" @click.self="formularz = false">
      <div class="okno">
        <div class="okno-gora">
          <h2>{{ edytowaneId !== null ? 'Edytuj notatkę' : 'Nowa notatka' }}</h2>
          <button class="ikona" @click="formularz = false">✕</button>
        </div>

        <!-- Pole tytułu -->
        <label>Tytuł</label>
        <input
          v-model="tytul"
          placeholder="Np. Pomysły na projekt"
          maxlength="100"
        />

        <!-- Wybór kategorii -->
        <label>Kategoria</label>
        <select v-model="wybranaKategoria">
          <option>Studia</option>
          <option>Praca</option>
          <option>Prywatne</option>
        </select>

        <!-- Pole treści notatki -->
        <label>Treść notatki</label>
        <textarea
          v-model="tresc"
          placeholder="Zapisz swoje myśli..."
          rows="6"
        ></textarea>

        <!-- Przyciski formularza -->
        <div class="przyciski">
          <button class="anuluj" @click="formularz = false">Anuluj</button>
          <button class="glowny" @click="zapiszNotatke">Zapisz notatkę</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Podstawowe ustawienia wyglądu */
* {
  box-sizing: border-box;
}

/* Główny wygląd aplikacji w trybie jasnym */
.app {
  min-height: 100vh;
  background: #f5f3ee;
  color: #28243e;
  font-family: 'Inter', Arial, sans-serif;
}

/* Nagłówek aplikacji */
header {
  background: white;
  padding: 20px max(6%, calc((100% - 1100px) / 2));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  background: #5146b5;
  color: white;
  padding: 10px 15px;
  border-radius: 12px;
  font-size: 25px;
}

.logo strong {
  display: block;
  font-size: 23px;
}

.logo small {
  color: #88839b;
  font-size: 11px;
}

/* Wygląd przycisków */
button {
  cursor: pointer;
  font: inherit;
}

.przelacznik {
  border: none;
  background: #e9e5fb;
  color: #5146b5;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 600;
}

/* Główna część strony */
main {
  max-width: 1100px;
  margin: auto;
  padding: 45px 24px;
}

.powitanie h1 {
  font-size: clamp(25px, 4vw, 38px);
  margin: 0 0 12px;
}

.powitanie p {
  color: #77728b;
}

/* Karty ze statystykami */
.statystyki {
  display: flex;
  gap: 20px;
  margin: 35px 0;
}

.stat {
  background: white;
  padding: 25px;
  border-radius: 18px;
  flex: 1;
}

.stat span {
  display: block;
  color: #77728b;
  font-size: 14px;
}

.stat strong {
  display: block;
  color: #5146b5;
  font-size: 32px;
  margin-top: 8px;
}

/* Wyszukiwarka i formularze */
.narzedzia {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

input,
textarea,
select {
  padding: 14px;
  border: 1px solid #e5e2ed;
  border-radius: 12px;
  font: inherit;
  outline-color: #5146b5;
  background: white;
}

.narzedzia input {
  flex: 1;
  min-width: 0;
}

.glowny {
  background: #5146b5;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px 20px;
}

.glowny:hover {
  background: #40369e;
}

/* Przyciski filtrowania kategorii */
.kategorie {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 35px;
}

.kategorie button {
  background: white;
  border: none;
  padding: 10px 18px;
  border-radius: 25px;
  color: #77728b;
}

.kategorie .aktywna {
  background: #5146b5;
  color: white;
}

/* Nagłówek i lista wyboru sortowania */
.naglowek-notatek {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.naglowek-notatek h2 {
  margin: 0;
}

.sortowanie {
  cursor: pointer;
}

h2 {
  font-size: 21px;
  margin-bottom: 20px;
}

/* Siatka kolorowych notatek */
.siatka {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.notatka {
  border-radius: 18px;
  padding: 22px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  overflow-wrap: anywhere;
}

/* Kolory kart w trybie jasnym */
.kolor-0 { background: #eae6ff; }
.kolor-1 { background: #ffe9db; }
.kolor-2 { background: #e0f2e9; }
.kolor-3 { background: #fff1c9; }

/* Zawartość pojedynczej notatki */
.gora,
.dol {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.etykieta {
  font-size: 12px;
  color: #625a77;
}

.notatka h3 {
  margin: 22px 0 8px;
}

.tresc {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.dol {
  margin-top: auto;
  padding-top: 18px;
}

.dol small {
  color: #77728b;
}

.ikona {
  border: none;
  background: transparent;
  padding: 5px;
  font-size: 18px;
  color: inherit;
}

/* Komunikat o braku notatek */
.pusto {
  text-align: center;
  padding: 50px 15px;
  color: #77728b;
}

.pusto-ikona {
  font-size: 40px;
}

.pusto h3 {
  color: #28243e;
}

/* Tło i wygląd okna formularza */
.nakladka {
  position: fixed;
  inset: 0;
  background: #28243e88;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.okno {
  background: white;
  border-radius: 20px;
  padding: 30px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.okno-gora {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.okno label {
  display: block;
  margin: 18px 0 8px;
  font-size: 14px;
}

.okno input,
.okno textarea,
.okno select {
  width: 100%;
}

.przyciski {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.anuluj {
  border: none;
  background: #f0eef5;
  padding: 14px;
  border-radius: 12px;
}

/* TRYB CIEMNY - zmiana kolorów całej aplikacji */
.app.ciemny {
  background: #171725;
  color: #f4f2ff;
}

/* Ciemne tło nagłówka, statystyk i formularza */
.ciemny header,
.ciemny .stat,
.ciemny .okno {
  background: #252538;
  color: #f4f2ff;
}

/* Kolory tekstów w trybie ciemnym */
.ciemny .powitanie p,
.ciemny .stat span,
.ciemny .logo small,
.ciemny .pusto,
.ciemny .dol small {
  color: #b7b3ca;
}

.ciemny .stat strong {
  color: #b9aaff;
}

/* Pola formularzy i przyciski kategorii w trybie ciemnym */
.ciemny input,
.ciemny textarea,
.ciemny select,
.ciemny .kategorie button,
.ciemny .anuluj {
  background: #303047;
  color: #f4f2ff;
  border-color: #494961;
}

.ciemny input::placeholder,
.ciemny textarea::placeholder {
  color: #a8a5bb;
}

.ciemny .kategorie .aktywna {
  background: #7364d6;
  color: white;
}

/* Główne przyciski w trybie ciemnym */
.ciemny .glowny {
  background: #7364d6;
}

.ciemny .glowny:hover {
  background: #6253c5;
}

.ciemny .przelacznik {
  background: #393653;
  color: #e3dcff;
}

/* Kolory notatek w trybie ciemnym */
.ciemny .notatka {
  color: #f4f2ff;
}

.ciemny .kolor-0 { background: #393253; }
.ciemny .kolor-1 { background: #49362f; }
.ciemny .kolor-2 { background: #29453e; }
.ciemny .kolor-3 { background: #48402c; }

.ciemny .etykieta,
.ciemny .tresc,
.ciemny .dol small {
  color: #ded9e9;
}

.ciemny .pusto h3 {
  color: #f4f2ff;
}

/* Dostosowanie aplikacji do mniejszych ekranów */
@media (max-width: 750px) {
  .siatka {
    grid-template-columns: 1fr;
  }

  .narzedzia {
    flex-direction: column;
  }

  .statystyki {
    gap: 10px;
  }

  .stat {
    padding: 18px;
  }

  main {
    padding: 28px 16px;
  }
}

/* Dodatkowe ustawienia dla telefonów */
@media (max-width: 600px) {
  .naglowek-notatek {
    flex-direction: column;
    align-items: stretch;
  }

  .przelacznik {
    padding: 10px;
    font-size: 12px;
  }
}
</style>
