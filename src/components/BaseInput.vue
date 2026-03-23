<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label?: string
  modelValue?: string | number
  type?: string
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const inputId = computed(() => props.id || `input-${Math.random().toString(36).substr(2, 9)}`)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-alerte-600">*</span>
    </label>
    
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="[
        'block w-full rounded-md border-gray-300 shadow-sm',
        'focus:border-nuit-500 focus:ring-nuit-500 sm:text-sm',
        'px-3 py-2 border',
        error ? 'border-alerte-500 focus:border-alerte-500 focus:ring-alerte-500' : '',
        disabled ? 'bg-gray-100 cursor-not-allowed' : '',
      ]"
      @input="handleInput"
    />
    
    <p v-if="error" class="mt-1 text-sm text-alerte-600">
      {{ error }}
    </p>
  </div>
</template>
