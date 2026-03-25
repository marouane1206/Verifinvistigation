<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TheNavbar from './components/TheNavbar.vue'
import AdminNav from './components/AdminNav.vue'
import TheFooter from './components/TheFooter.vue'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

// Initialize auth state on app mount to ensure auth state is available early
onMounted(() => {
  if (!authStore.user && !authStore.loading) {
    authStore.initialize()
  }
})
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
