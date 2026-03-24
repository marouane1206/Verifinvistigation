<script setup lang="ts">
import { RouterView } from 'vue-router'
import TheNavbar from './components/TheNavbar.vue'
import TheFooter from './components/TheFooter.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <TheNavbar />
    <main class="grow">
      <RouterView />
    </main>
    <TheFooter />
  </div>
</template>
