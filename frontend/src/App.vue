
<script setup>
import { ref } from 'vue'

const notatki = ref([])
const nowaNotatka = ref('')

function dodajNotatke() {
  if (nowaNotatka.value.trim() === '') return

  notatki.value.push(nowaNotatka.value)
  nowaNotatka.value = ''
}
</script>

<template>
  <main>
    <h1>Moje notatki</h1>

    <input
      v-model="nowaNotatka"
      placeholder="Wpisz notatkę"
    />

    <button @click="dodajNotatke">
      Dodaj notatkę
    </button>

    <ul>
      <li v-for="(notatka, index) in notatki" :key="index">
        {{ notatka }}
      </li>
    </ul>
  </main>
</template>
