<script setup>
// Funkcje Vue
import { ref, computed, watch } from 'vue'

// Odczyt zapisanych notatek
const notatki = ref(JSON.parse(localStorage.getItem('notatki') || '[]'))

// Ustawienia aplikacji
const szukaj = ref('')
const kategoria = ref('Wszystkie')
const sortowanie = ref('najnowsze')
const trybCiemny = ref(localStorage.getItem('trybCiemny') === 'true')

// Dane formularza
const formularz = ref(false)
const edytowaneId = ref(null)
const tytul = ref('')
const tresc = ref('')
const wybranaKategoria = ref('Studia')

// Kategorie
const kategorie = ['Wszystkie', 'Studia', 'Praca', 'Prywatne']

// Filtrowanie i sortowanie notatek
const widoczneNotatki = computed(() => {
  return notatki.value
    .filter(n =>
      (kategoria.value === 'Wszystkie' || n.kategoria === kategoria.value) &&
      (n.tytul + ' ' + n.tresc).toLowerCase().includes(szukaj.value.toLowerCase())
    )
    .sort((a, b) => {
      // Przypięte notatki na początku
      if (a.przypieta !== b.przypieta) {
        return Number(b.przypieta) - Number(a.przypieta)
      }

      // Sortowanie A–Z
      if (sortowanie.value === 'az') {
        return a.tytul.localeCompare(b.tytul, 'pl')
      }

      // Sortowanie Z–A
      if (sortowanie.value === 'za') {
        return b.tytul.localeCompare(a.tytul, 'pl')
      }

      // Od najstarszych
      if (sortowanie.value === 'najstarsze') {
        return a.id - b.id
      }

      // Od najnowszych
      return b.id - a.id
    })
})

// Zapis notatek w localStorage
watch(notatki, (wartosc) => {
  localStorage.setItem('notatki', JSON.stringify(wartosc))
}, { deep: true })

// Zapis ustawienia motywu
watch(trybCiemny, (wartosc) => {
  localStorage.setItem('trybCiemny', String(wartosc))
})

// Formularz nowej notatki
function otworzFormularz() {
  edytowaneId.value = null
  tytul.value = ''
  tresc.value = ''
  wybranaKategoria.value = 'Studia'
  formularz.value = true
}

// Dodawanie i edycja notatek
function zapiszNotatke() {
  // Sprawdzenie tytułu
  if (!tytul.value.trim()) return

  if (edytowaneId.value !== null) {
    // Wyszukanie edytowanej notatki
    const notatka = notatki.value.find(n => n.id === edytowaneId.value)

    if (notatka) {
      notatka.tytul = tytul.value
      notatka.tresc = tresc.value
      notatka.kategoria = wybranaKategoria.value
    }
  } else {
    // Nowa notatka
    notatki.value.unshift({
      id: Date.now(),
      tytul: tytul.value,
      tresc: tresc.value,
      kategoria: wybranaKategoria.value,
      przypieta: false,
      data: new Date().toLocaleDateString('pl-PL')
    })
  }

  // Zamknięcie formularza
  formularz.value = false
}

// Dane notatki do edycji
function edytuj(n) {
  edytowaneId.value = n.id
  tytul.value = n.tytul
  tresc.value = n.tresc
  wybranaKategoria.value = n.kategoria
  formularz.value = true
}

// Usuwanie z potwierdzeniem
function usun(id) {
  if (confirm('Czy na pewno usunąć notatkę?')) {
    notatki.value = notatki.value.filter(n => n.id !== id)
  }
}

// Przypinanie notatki
function przypnij(n) {
  n.przypieta = !n.przypieta
}
</script>

<template>
  <!-- Motyw aplikacji -->
  <div class="app" :class="{ ciemny: trybCiemny }">

    <!-- Nagłówek -->
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
      <!-- Powitanie -->
      <section class="powitanie">
        <h1>Twoje myśli, w jednym miejscu ✨</h1>
        <p>Zapisuj pomysły, zadania i wszystko, co ważne.</p>
      </section>

      <!-- Statystyki -->
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

      <!-- Wyszukiwarka i dodawanie -->
      <section class="narzedzia">
        <input v-model="szukaj" placeholder="⌕  Szukaj notatek..." />
        <button class="glowny" @click="otworzFormularz">
          + Nowa notatka
        </button>
      </section>

      <!-- Kategorie -->
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

      <!-- Sortowanie -->
      <div class="naglowek-notatek">
        <h2>Twoje notatki</h2>

        <select v-model="sortowanie" class="sortowanie">
          <option value="najnowsze">Od najnowszych</option>
          <option value="najstarsze">Od najstarszych</option>
          <option value="az">Alfabetycznie A–Z</option>
          <option value="za">Alfabetycznie Z–A</option>
        </select>
      </div>

      <!-- Pusta lista -->
      <div v-if="widoczneNotatki.length === 0" class="pusto">
        <div class="pusto-ikona">✎</div>
        <h3>Jeszcze tu pusto</h3>
        <p>Dodaj pierwszą notatkę albo zmień wyszukiwanie.</p>
      </div>

      <!-- Lista notatek -->
      <section class="siatka">
        <article
          v-for="(n, index) in widoczneNotatki"
          :key="n.id"
          class="notatka"
          :class="'kolor-' + (index % 4)"
        >
          <div class="gora">
            <span class="etykieta">{{ n.kategoria }}</span>

            <!-- Przypinanie -->
            <button class="ikona" @click="przypnij(n)" :aria-label="n.przypieta ? 'Odepnij notatkę' : 'Przypnij notatkę'">
              {{ n.przypieta ? '📌' : '♧' }}
            </button>
          </div>

          <h3>{{ n.tytul }}</h3>
          <p class="tresc">{{ n.tresc }}</p>

          <div class="dol">
            <small>{{ n.data }}</small>

            <div>
              <!-- Edycja i usuwanie -->
              <button class="ikona" @click="edytuj(n)" aria-label="Edytuj notatkę">✎</button>
              <button class="ikona" @click="usun(n.id)" aria-label="Usuń notatkę">✕</button>
            </div>
          </div>
        </article>
      </section>
    </main>

    <!-- Formularz notatki -->
    <div v-if="formularz" class="nakladka" @click.self="formularz = false">
      <div class="okno">
        <div class="okno-gora">
          <h2>{{ edytowaneId !== null ? 'Edytuj notatkę' : 'Nowa notatka' }}</h2>
          <button class="ikona" @click="formularz = false" aria-label="Zamknij formularz">✕</button>
        </div>

        <!-- Tytuł -->
        <label for="tytul-notatki">Tytuł</label>
        <input
          id="tytul-notatki"
          v-model="tytul"
          placeholder="Np. Pomysły na projekt"
          maxlength="100"
        />

        <!-- Kategoria -->
        <label for="kategoria-notatki">Kategoria</label>
        <select id="kategoria-notatki" v-model="wybranaKategoria">
          <option>Studia</option>
          <option>Praca</option>
          <option>Prywatne</option>
        </select>

        <!-- Treść -->
        <label for="tresc-notatki">Treść notatki</label>
        <textarea
          id="tresc-notatki"
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
/* Podstawowe ustawienia aplikacji */

/* Oliczanie szerokości elementów */
* {
  box-sizing: border-box;
}

/* Kremowe tło i ciemny tekst w trybie jasnym */
.app {
  min-height: 100vh;
  background: #faf7f4;
  color: #443b3d;
  font-family: 'Inter', Arial, sans-serif;
}

/* Nagłówek i logo */

/* Różowy pasek na górze strony */
header {
  background: #f1d7de;
  padding: 20px max(6%, calc((100% - 1100px) / 2));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

/* Ikona i nazwa aplikacji są ustawione obok siebie */
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Ciemniejszy róż jako ikonka aplikacji */
.logo-icon {
  background: #d49bad;
  color: white;
  padding: 10px 15px;
  border-radius: 12px;
  font-size: 25px;
}

/* Nazwa i podpis aplikacji */
.logo strong {
  display: block;
  font-size: 23px;
}

.logo small {
  color: #75676b;
  font-size: 11px;
}

/* Przyciski i główna część strony */

button {
  cursor: pointer;
  font: inherit;
}

/* Jasnoróżowy przycisk zmiany motywu */
.przelacznik {
  border: none;
  background: #fff5f7;
  color: #805361;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 600;
}

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
  color: #82787b;
}

/* Statystyki notatek */

/* Dwie karty statystyk wyświetlane obok siebie */
.statystyki {
  display: flex;
  gap: 20px;
  margin: 35px 0;
}

/* Jasne karty ze statystykami */
.stat {
  background: #ffffff;
  padding: 25px;
  border-radius: 18px;
  flex: 1;
}

.stat span {
  display: block;
  color: #82787b;
  font-size: 14px;
}

/* Liczby */
.stat strong {
  display: block;
  color: #718d79;
  font-size: 32px;
  margin-top: 8px;
}

/* Wyszukiwarka i główne przyciski */

/* Wyszukiwarka i przycisk */
.narzedzia {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

/* Wspólny wygląd pól tekstowych i list wyboru */
input,
textarea,
select {
  padding: 14px;
  border: 1px solid #e7dedc;
  border-radius: 12px;
  font: inherit;
  outline-color: #819a83;
  background: white;
  color: #443b3d;
}

/* Wyszukiwarka wypełnia wolną przestrzeń */
.narzedzia input {
  flex: 1;
  min-width: 0;
}

/* Główne przyciski */
.glowny {
  background: #718d79;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px 20px;
}

/* Po najechaniu przycisk ciemniejszy */
.glowny:hover {
  background: #58725f;
}

/* Filtrowanie według kategorii */

/* Przyciski kategorii ustawiamy w jednym rzędzie */
.kategorie {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 35px;
}

/* Nieaktywne kategorie mają białe tło */
.kategorie button {
  background: #ffffff;
  border: none;
  padding: 10px 18px;
  border-radius: 25px;
  color: #756d70;
}

/* Wybrana kategoria wyróżnia się różowym tłem */
.kategorie .aktywna {
  background: #d49bad;
  color: #ffffff;
}

/* Nagłówek i sortowanie notatek */

/* Tytuł listy i sortowanie wyświetlamy obok siebie */
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

/* Karty notatek */

/* Na komputerze wyświetlamy trzy kolumny kart */
.siatka {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* Karty notatek */
.notatka {
  border-radius: 18px;
  padding: 22px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  overflow-wrap: anywhere;
}

.kolor-0 { background: #f3dfe5; } /* Pudrowy róż */
.kolor-1 { background: #d5e2d4; } /* Jasna szałwia */
.kolor-2 { background: #e8ddd0; } /* Ciepły beż */
.kolor-3 { background: #eee9e3; } /* Jasny kremowy beż */

.gora,
.dol {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Podpis kategorii */
.etykieta {
  font-size: 12px;
  color: #6d6263;
}

/* Odstępy przy tytule notatki */
.notatka h3 {
  margin: 22px 0 8px;
}

.tresc {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Data i przyciski są przy dolnej krawędzi karty */
.dol {
  margin-top: auto;
  padding-top: 18px;
}

.dol small {
  color: #756d70;
}

/* Małe przyciski bez dodatkowego tła */
.ikona {
  border: none;
  background: transparent;
  padding: 5px;
  font-size: 18px;
  color: inherit;
}

/* Komunikat o braku notatek */

/* Wyśrodkowujemy informację o pustej liście */
.pusto {
  text-align: center;
  padding: 50px 15px;
  color: #82787b;
}

.pusto-ikona {
  font-size: 40px;
}

.pusto h3 {
  color: #443b3d;
}

/* Formularz dodawania i edycji notatki */

/* Półprzezroczyste tło za formularzem */
.nakladka {
  position: fixed;
  inset: 0;
  background: #30292c88;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

/* Białe okno formularza z zaokrąglonymi rogami */
.okno {
  background: #ffffff;
  border-radius: 20px;
  padding: 30px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

/* Tytuł formularza i przycisk zamknięcia */
.okno-gora {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Podpisy pól formularza */
.okno label {
  display: block;
  margin: 18px 0 8px;
  font-size: 14px;
}

/* Pola formularza - cała szerokość okna */
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

/* Przycisk anulowania */
.anuluj {
  border: none;
  background: #f2e9e8;
  color: #66575b;
  padding: 14px;
  border-radius: 12px;
}

/* Tryb ciemny */

/* Tło */
.app.ciemny {
  background: #1d1d1f;
  color: #f2e9e9;
}

.ciemny header,
.ciemny .stat,
.ciemny .okno {
  background: #2a292b;
  color: #f2e9e9;
}

/* Opisy i teksty pomocnicze */
.ciemny .powitanie p,
.ciemny .stat span,
.ciemny .logo small,
.ciemny .pusto,
.ciemny .dol small {
  color: #bdb1b4;
}

/* Liczby statystyk */
.ciemny .stat strong {
  color: #d995a9;
}

/* Pola i nieaktywne kategorie */
.ciemny input,
.ciemny textarea,
.ciemny select,
.ciemny .kategorie button,
.ciemny .anuluj {
  background: #383638;
  color: #f2e9e9;
  border-color: #555052;
}

/* Podpowiedzi w polach */
.ciemny input::placeholder,
.ciemny textarea::placeholder {
  color: #aaa0a3;
}

/* Aktywna kategoria w ciemnym trybie */
.ciemny .kategorie .aktywna {
  background: #c77f95;
  color: #251b1f;
}

/* Główne przyciski */
.ciemny .glowny {
  background: #c77f95;
  color: #251b1f;
}

.ciemny .glowny:hover {
  background: #b56a81;
}

/* Przycisk przełączania motywu w trybie ciemnym */
.ciemny .przelacznik {
  background: #45383d;
  color: #efc2cf;
}

/* Jasny tekst na ciemnych kartach */
.ciemny .notatka {
  color: #f2e9e9;
}

.ciemny .kolor-0 { background: #4b3c40; } /* Ciemny róż */
.ciemny .kolor-1 { background: #35443a; } /* Ciemna szałwia */
.ciemny .kolor-2 { background: #443d36; } /* Ciemny beż */
.ciemny .kolor-3 { background: #353334; } /* Ciemna szarość */

.ciemny .etykieta,
.ciemny .tresc,
.ciemny .dol small {
  color: #e1d7d9;
}

.ciemny .pusto h3 {
  color: #f2e9e9;
}

/* Dostosowanie do mniejszych ekranów */

@media (max-width: 750px) {
  .siatka {
    grid-template-columns: 1fr;
  }

  .narzedzia {
    flex-direction: column;
  }

  /* Odstępy w statystykach */
  .statystyki {
    gap: 10px;
  }

  .stat {
    padding: 18px;
  }

  /* Marginesy strony na wąskich ekranach */
  main {
    padding: 28px 16px;
  }
}

/* Małe ekrany */
@media (max-width: 600px) {
  /* Sortowanie pod tytuł listy */
  .naglowek-notatek {
    flex-direction: column;
    align-items: stretch;
  }

  /* Przycisk zmiany motywu */
  .przelacznik {
    padding: 10px;
    font-size: 12px;
  }
}
</style>
