<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDocumentsStore } from '../stores/documents'
import BaseInput from '../components/BaseInput.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import BaseButton from '../components/BaseButton.vue'
import { supabase } from '../lib/supabase'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const documentsStore = useDocumentsStore()

// Determine form type from route path
const formType = computed<'signalement' | 'verification'>(() => {
  const path = route.path
  if (path.startsWith('/verifier')) {
    return 'verification'
  }
  return 'signalement'
})

// Dynamic steps based on form type
const steps = computed(() => [
  { number: 1, title: 'Informations' },
  { number: 2, title: 'Anonymat' },
  { number: 3, title: 'Documents' },
  { number: 4, title: 'Vérification' },
])

const currentStep = ref(1)
const loading = ref(false)
const error = ref('')

const formData = ref({
  type: '' as 'signalement' | 'verification' | '',
  title: '',
  description: '',
  // Signalement-specific fields
  suspectName: '',
  suspectOrganization: '',
  incidentDate: '',
  incidentLocation: '',
  // Verification-specific fields
  sourceToVerify: '',
  verificationContext: '',
  // Common fields
  isAnonymous: false,
  documents: [] as File[],
})

const documentPreviews = ref<string[]>([])

// Set form type on mount
onMounted(() => {
  formData.value.type = formType.value
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      // Validation based on form type
      if (formType.value === 'signalement') {
        return formData.value.title.trim().length >= 5 && 
               formData.value.description.trim().length >= 20
      } else {
        return formData.value.title.trim().length >= 5 && 
               formData.value.description.trim().length >= 20 &&
               formData.value.sourceToVerify.trim().length > 0
      }
    case 2:
      return true
    case 3:
      return true // Documents are optional
    case 4:
      return true
    default:
      return false
  }
})

function nextStep() {
  if (currentStep.value < 4 && canProceed.value) {
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
    // Check if user's email is confirmed before allowing submission
    const isConfirmed = await authStore.isEmailConfirmed()
    if (!isConfirmed) {
      error.value = 'Veuillez confirmer votre email avant de soumettre un rapport'
      loading.value = false
      return
    }

    // Create report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        created_by: authStore.user?.id,
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
    if (formData.value.documents.length > 0 && report && authStore.user) {
      for (const file of formData.value.documents) {
        const doc = await documentsStore.uploadDocument(file, report.id, authStore.user.id)
        if (!doc) {
          console.error('Failed to save document:', file.name)
        }
      }
    }

    router.push('/users/dashboard')
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la soumission'
  } finally {
    loading.value = false
  }
}

// Type-specific labels and descriptions
const typeLabels = computed(() => ({
  signalement: {
    title: 'Signalement',
    icon: '🚨',
    description: 'Signaler une activité suspecte, fraude ou infraction',
    stepTitle: 'Informations du signalement',
    titlePlaceholder: 'Titre concis de votre signalement',
    descriptionPlaceholder: 'Décrivez en détail les faits, les circonstances et toute information utile...',
  },
  verification: {
    title: 'Vérification',
    icon: '✓',
    description: 'Faire vérifier une information ou une source',
    stepTitle: 'Informations à vérifier',
    titlePlaceholder: 'Titre concis de votre demande de vérification',
    descriptionPlaceholder: 'Décrivez l\'information à vérifier, le contexte et pourquoi vous avez des doutes...',
  },
}))
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
            :style="{ width: `${((currentStep - 1) / 3) * 100}%` }"
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

      <!-- Step 1: Dynamic Form Based on Type -->
      <div v-if="currentStep === 1" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex items-center mb-6">
          <span class="text-2xl mr-3">{{ typeLabels[formType].icon }}</span>
          <h2 class="text-xl font-bold text-gray-900">{{ typeLabels[formType].stepTitle }}</h2>
        </div>
        
        <div class="space-y-6">
          <BaseInput
            v-model="formData.title"
            label="Titre"
            type="text"
            :placeholder="typeLabels[formType].titlePlaceholder"
            hint="Minimum 5 caractères"
          />
          
          <BaseTextarea
            v-model="formData.description"
            label="Description"
            :placeholder="typeLabels[formType].descriptionPlaceholder"
            :rows="6"
            hint="Minimum 20 caractères"
          />
          
          <!-- Signalement-specific fields -->
          <template v-if="formType === 'signalement'">
            <BaseInput
              v-model="formData.suspectName"
              label="Nom de la personne suspecte (optionnel)"
              type="text"
              placeholder="Nom et prénom si connu"
            />
            
            <BaseInput
              v-model="formData.suspectOrganization"
              label="Organisation / Entreprise (optionnel)"
              type="text"
              placeholder="Nom de l'organisation impliquée"
            />
            
            <BaseInput
              v-model="formData.incidentDate"
              label="Date des faits"
              type="date"
            />
            
            <BaseInput
              v-model="formData.incidentLocation"
              label="Lieu des faits"
              type="text"
              placeholder="Ville, région, adresse si connue"
            />
          </template>
          
          <!-- Verification-specific fields -->
          <template v-else>
            <BaseInput
              v-model="formData.sourceToVerify"
              label="Source à vérifier"
              type="text"
              placeholder="URL, nom du média, auteur de l'information..."
              hint="Indiquez la source exacte de l'information à vérifier"
            />
            
            <BaseTextarea
              v-model="formData.verificationContext"
              label="Contexte supplémentaire"
              placeholder="Quand avez-vous vu cette information ? Dans quel contexte ?"
              :rows="4"
            />
          </template>
        </div>
      </div>

      <!-- Step 2: Anonymous Option -->
      <div v-if="currentStep === 2" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

      <!-- Step 3: Document Upload -->
      <div v-if="currentStep === 3" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              v-for="(_, index) in documentPreviews"
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

      <!-- Step 4: Review -->
      <div v-if="currentStep === 4" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Vérification finale</h2>
        
        <div class="space-y-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-500 mb-1">Type</div>
            <div class="font-medium text-gray-900 flex items-center">
              <span class="mr-2">{{ typeLabels[formType].icon }}</span>
              {{ typeLabels[formType].title }}
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
          v-if="currentStep < 4"
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