<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TheNavbar from './components/TheNavbar.vue'
import AdminNav from './components/AdminNav.vue'
import TheFooter from './components/TheFooter.vue'

const route = useRoute()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AdminNav v-if="isAdminRoute" />
    <TheNavbar v-else />
    <main class="grow">
      <RouterView />
    </main>
    <TheFooter />
  </div>
</template>
