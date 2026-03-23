<script setup lang="ts">
const currentYear = new Date().getFullYear()

const quickLinks = [
  { name: 'Mentions légales', to: '/legal' },
  { name: 'Politique de confidentialité', to: '/privacy' },
  { name: 'Contact', to: '/contact' },
]
</script>

<template>
  <footer class="bg-nuit-900 text-nuit-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Organization Info -->
        <div>
          <h3 class="text-lg font-bold mb-4">Verifinvestigation</h3>
          <p class="text-nuit-300 text-sm leading-relaxed">
            Organisation indépendante dédiée à la vérification des faits et à la lutte contre la désinformation. 
            Nous promouvons l'intégrité informationnelle et soutenons le journalisme d'investigation.
          </p>
        </div>

        <!-- Quick Links -->
        <div>
          <h3 class="text-lg font-bold mb-4">Liens rapides</h3>
          <ul class="space-y-2">
            <li v-for="link in quickLinks" :key="link.name">
              <router-link
                :to="link.to"
                class="text-nuit-300 hover:text-white text-sm transition-colors"
              >
                {{ link.name }}
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Contact Info -->
        <div>
          <h3 class="text-lg font-bold mb-4">Contact</h3>
          <ul class="space-y-2 text-sm text-nuit-300">
            <li class="flex items-center space-x-2">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>contact@verifinvestigation.org</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Copyright -->
      <div class="mt-8 pt-8 border-t border-nuit-800">
        <p class="text-center text-nuit-400 text-sm">
          © {{ currentYear }} Verifinvestigation. Tous droits réservés.
        </p>
      </div>
    </div>
  </footer>
</template>
