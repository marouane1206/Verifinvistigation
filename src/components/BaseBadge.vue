<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status: 'en_attente' | 'en_cours' | 'termine'
}

const props = defineProps<Props>()

const statusConfig = {
  en_attente: {
    label: 'En attente',
    bgColor: 'bg-jaune-100',
    textColor: 'text-jaune-800',
    borderColor: 'border-jaune-300',
  },
  en_cours: {
    label: 'En cours',
    bgColor: 'bg-bleu-100',
    textColor: 'text-bleu-800',
    borderColor: 'border-bleu-300',
  },
  termine: {
    label: 'Terminé',
    bgColor: 'bg-vert-100',
    textColor: 'text-vert-800',
    borderColor: 'border-vert-300',
  },
}

const config = computed(() => statusConfig[props.status])
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase border',
      config.bgColor,
      config.textColor,
      config.borderColor
    ]"
  >
    {{ config.label }}
  </span>
</template>
