<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from './BaseBadge.vue'

interface Report {
  id: string
  title: string
  description: string
  status: 'en_attente' | 'en_cours' | 'termine'
  created_at: string
}

interface Props {
  report: Report
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const formattedDate = computed(() => {
  const date = new Date(props.report.created_at)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const truncatedDescription = computed(() => {
  const maxLength = 120
  if (props.report.description.length <= maxLength) {
    return props.report.description
  }
  return props.report.description.substring(0, maxLength) + '...'
})

function handleClick() {
  emit('click')
}
</script>

<template>
  <div
    class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden border border-gray-100"
    @click="handleClick"
  >
    <div class="p-5">
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-900 line-clamp-2">
          {{ report.title }}
        </h3>
        <BaseBadge :status="report.status" class="ml-2 flex-shrink-0" />
      </div>
      
      <p class="text-gray-600 text-sm mb-4 line-clamp-3">
        {{ truncatedDescription }}
      </p>
      
      <div class="flex items-center text-sm text-gray-500">
        <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Créé le {{ formattedDate }}</span>
      </div>
    </div>
  </div>
</template>
