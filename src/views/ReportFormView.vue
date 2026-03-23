<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseInput from '../components/BaseInput.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import BaseButton from '../components/BaseButton.vue'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

const steps = [
  { number: 1, title: 'Type' },
  { number: 2, title: 'Informations' },
  { number: 3, title: 'Anonymat' },
  { number: 4, title: 'Documents' },
  { number: 5, title: 'Vérification' },
]

const currentStep = ref(1)
const loading = ref(false)
const error = ref('')

const formData = ref({
  type: '' as 'signalement' | 'verification' | '',
  title: '',
  description: '',
  isAnonymous: false,
  documents: [] as File[],
})

const documentPreviews = ref<string[]>([])

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return formData.value.type !== ''
    case 2:
      return formData.value.title.trim().length >= 5 && formData.value.description.trim().length >= 20
    case 3:
      return true
    case 4:
      return true // Documents are optional
    case 5:
      return true
    default:
      return false
  }
})

function nextStep() {
  if (currentStep.value < 5 && canProceed.value) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    formData.value.documents = [...formData.value.documents, ...files]
    
    // Create preview URLs
    files.forEach(file => {
      documentPreviews.value.push(URL.createObjectURL(file))
    })
  }
}

function removeDocument(index: number) {
  formData.value.documents.splice(index, 1)
  documentPreviews.value.splice(index, 1)
}

async function submitReport() {
  loading.value = true
  error.value = ''

  try {
    // Create report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: authStore.user?.id,
        title: formData.value.title,
        description: formData.value.description,
        type: formData.value.type,
        status: 'en_attente',
        is_anonymous: formData.value.isAnonymous,
      })
      .select()
      .single()

    if (reportError) throw reportError

    // Upload documents if any
    if (formData.value.documents.length > 0 && report) {
      for (const file of formData.value.documents) {
        const fileName = `${report.id}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Erreur upload:', uploadError)
        }
      }
    }

    router.push('/dashboard')
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la soumission'
  } finally {
    loading.value = false
  }
}

const typeOptions = [
  { value: 'signalement', label: 'Signalement', icon: '🚨', description: 'Signaler une activité suspecte, fraude ou infraction' },
  { value: 'verification', label: 'Vérification', icon: '✓', description: 'Faire vérifier une information ou une source' },
]
</script>

<template>
  <div class="min-h-screen bg-ardoise-50 py-8">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Progress Indicator -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div
            v-for="step in steps"
            :key="step.number"
            class="flex flex-col items-center"
          >
            <div
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                currentStep >= step.number
                  ? 'bg-nuit-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              ]"
            >
              {{ step.number }}
            </div>
            <span class="text-xs mt-2 text-gray-600 hidden sm:block">{{ step.title }}</span>
          </div>
        </div>
        <!-- Progress bar -->
        <div class="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-nuit-600 transition-all duration-300"
            :style="{ width: `${((currentStep - 1) / 4) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="mb-6 bg-alerte-50 border border-alerte-200 text-alerte-700 px-4 py-3 rounded relative"
      >
        {{ error }}
      </div>

      <!-- Step 1: Type Selection -->
      <div v-if="currentStep === 1" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Quel type de demande ?</h2>
        
        <div class="space-y-4">
          <label
            v-for="option in typeOptions"
            :key="option.value"
            :class="[
              'flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all',
              formData.type === option.value
                ? 'border-nuit-600 bg-nuit-50'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <input
              type="radio"
              :value="option.value"
              v-model="formData.type"
              class="hidden"
            />
            <span class="text-2xl mr-4">{{ option.icon }}</span>
            <div>
              <div class="font-semibold text-gray-900">{{ option.label }}</div>
              <div class="text-sm text-gray-600">{{ option.description }}</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Step 2: Basic Info -->
      <div v-if="currentStep === 2" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Informations détaillées</h2>
        
        <div class="space-y-6">
          <BaseInput
            v-model="formData.title"
            label="Titre"
            type="text"
            placeholder="Titre concis de votre demande"
            hint="Minimum 5 caractères"
          />
          
          <BaseTextarea
            v-model="formData.description"
            label="Description"
            placeholder="Décrivez en détail les faits, les circonstances et toute information utile..."
            :rows="6"
            hint="Minimum 20 caractères"
          />
        </div>
      </div>

      <!-- Step 3: Anonymous Option -->
      <div v-if="currentStep === 3" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Anonymat</h2>
        
        <div class="space-y-4">
          <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer border-nuit-600 bg-nuit-50">
            <input
              type="checkbox"
              v-model="formData.isAnonymous"
              class="hidden"
            />
            <input
              type="checkbox"
              v-model="formData.isAnonymous"
              class="mt-1 mr-4 h-5 w-5 text-nuit-600 rounded"
            />
            <div>
              <div class="font-semibold text-gray-900">Soumettre de manière anonyme</div>
              <div class="text-sm text-gray-600">
                Votre identité ne sera pas visible dans le rapport public. 
                Cependant, les administrateurs pourront voir votre identité pour des besoins de modération.
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- Step 4: Document Upload -->
      <div v-if="currentStep === 4" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Documents (optionnel)</h2>
        
        <div class="space-y-4">
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-nuit-400 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              class="hidden"
              id="file-upload"
              @change="handleFileUpload"
            />
            <label for="file-upload" class="cursor-pointer">
              <div class="text-4xl mb-2">📎</div>
              <div class="text-gray-700 font-medium">Cliquez pour ajouter des fichiers</div>
              <div class="text-sm text-gray-500 mt-1">Images, PDF, documents (max 10MB chacun)</div>
            </label>
          </div>

          <!-- Document Previews -->
          <div v-if="documentPreviews.length > 0" class="space-y-2">
            <div
              v-for="(preview, index) in documentPreviews"
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center">
                <span class="text-xl mr-3">📄</span>
                <span class="text-sm text-gray-700">{{ formData.documents[index].name }}</span>
              </div>
              <button
                @click="removeDocument(index)"
                class="text-alerte-600 hover:text-alerte-800 text-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: Review -->
      <div v-if="currentStep === 5" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Vérification finale</h2>
        
        <div class="space-y-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500 mb-1">Type</div>
            <div class="font-medium text-gray-900">
              {{ formData.type === 'signalement' ? 'Signalement' : 'Vérification' }}
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500 mb-1">Titre</div>
            <div class="font-medium text-gray-900">{{ formData.title }}</div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500 mb-1">Description</div>
            <div class="font-medium text-gray-900">{{ formData.description }}</div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500 mb-1">Anonymat</div>
            <div class="font-medium text-gray-900">
              {{ formData.isAnonymous ? 'Oui - Soumission anonyme' : 'Non - Identité visible' }}
            </div>
          </div>
          
          <div v-if="formData.documents.length > 0" class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500 mb-1">Documents ({{ formData.documents.length }})</div>
            <div class="font-medium text-gray-900">
              {{ formData.documents.map(f => f.name).join(', ') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex justify-between mt-6">
        <BaseButton
          v-if="currentStep > 1"
          variant="outline"
          @click="prevStep"
        >
          Précédent
        </BaseButton>
        <div v-else></div>
        
        <BaseButton
          v-if="currentStep < 5"
          variant="primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          Suivant
        </BaseButton>
        
        <BaseButton
          v-else
          variant="primary"
          :loading="loading"
          @click="submitReport"
        >
          Soumettre le rapport
        </BaseButton>
      </div>
    </div>
  </div>
</template>