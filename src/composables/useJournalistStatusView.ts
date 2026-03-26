import { ref, computed, watch } from 'vue'
import { useReportsStore } from '../stores/reports'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

export interface FilterState {
  dateFrom: string
  dateTo: string
  search: string
  sortBy: 'created_at' | 'updated_at' | 'title' | 'status'
  sortOrder: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}

export function useJournalistStatusView(
  reportType: 'signalement' | 'verification',
  statusFilter: 'en_attente' | 'en_cours' | 'termine'
) {
  const router = useRouter()
  const reportsStore = useReportsStore()
  const authStore = useAuthStore()

  // Loading state
  const loading = ref(false)

  // Filter state
  const filters = ref<FilterState>({
    dateFrom: '',
    dateTo: '',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  // Pagination state
  const pagination = ref<PaginationState>({
    page: 1,
    perPage: 10,
    total: 0
  })

  // Selection state
  const selectedReports = ref<Set<string>>(new Set())
  const allSelected = ref(false)

  // Computed: get reports based on type, status, and assignment
  const allReports = computed(() => {
    return reportsStore.reports.filter(report => {
      // Filter by type (signalement or verification)
      if (report.type !== reportType) return false
      
      // Filter by status
      if (statusFilter === 'en_attente') {
        // For "disponible" (en_attente), show unassigned reports
        return report.status === 'en_attente' && !report.assigned_to
      } else if (statusFilter === 'en_cours') {
        // For "en cours", show assigned to current user
        return report.status === 'en_cours' && report.assigned_to === authStore.user?.id
      } else if (statusFilter === 'termine') {
        // For "clos", show completed by current user
        return report.status === 'termine' && report.assigned_to === authStore.user?.id
      }
      return false
    })
  })

  // Computed: apply filters
  const filteredReports = computed(() => {
    let result = [...allReports.value]

    // Filter by date from
    if (filters.value.dateFrom) {
      const fromDate = new Date(filters.value.dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      result = result.filter(r => new Date(r.created_at) >= fromDate)
    }

    // Filter by date to
    if (filters.value.dateTo) {
      const toDate = new Date(filters.value.dateTo)
      toDate.setHours(23, 59, 59, 999)
      result = result.filter(r => new Date(r.created_at) <= toDate)
    }

    // Filter by search
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      result = result.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (filters.value.sortBy) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'updated_at':
          aVal = new Date(a.updated_at).getTime()
          bVal = new Date(b.updated_at).getTime()
          break
        default:
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
      }

      if (filters.value.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    // Update total
    pagination.value.total = result.length

    return result
  })

  // Computed: paginated reports
  const paginatedReports = computed(() => {
    const start = (pagination.value.page - 1) * pagination.value.perPage
    const end = start + pagination.value.perPage
    return filteredReports.value.slice(start, end)
  })

  // Computed: total pages
  const totalPages = computed(() => 
    Math.ceil(pagination.value.total / pagination.value.perPage)
  )

  // Computed: selected count
  const selectedCount = computed(() => selectedReports.value.size)

  // Reset pagination when filters change
  watch([filters], () => {
    pagination.value.page = 1
  })

  // Functions
  function clearFilters() {
    filters.value = {
      dateFrom: '',
      dateTo: '',
      search: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  }

  function toggleSort(field: FilterState['sortBy']) {
    if (filters.value.sortBy === field) {
      filters.value.sortOrder = filters.value.sortOrder === 'asc' ? 'desc' : 'asc'
    } else {
      filters.value.sortBy = field
      filters.value.sortOrder = 'desc'
    }
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedReports.value.clear()
      allSelected.value = false
    } else {
      paginatedReports.value.forEach(report => {
        selectedReports.value.add(report.id)
      })
      allSelected.value = true
    }
  }

  function toggleReportSelection(reportId: string) {
    if (selectedReports.value.has(reportId)) {
      selectedReports.value.delete(reportId)
    } else {
      selectedReports.value.add(reportId)
    }
    allSelected.value = selectedReports.value.size === paginatedReports.value.length
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      pagination.value.page = page
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  function formatDateFull(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function viewReportDetails(reportId: string) {
    router.push(`/investigation/${reportId}`)
  }

  function exportToCSV() {
    const headers = ['Titre', 'Type', 'Statut', 'Créé le', 'Mis à jour']
    const rows = filteredReports.value.map(r => [
      r.title,
      r.type === 'signalement' ? 'Signalement' : 'Vérification',
      r.status === 'en_attente' ? 'En attente' : r.status === 'en_cours' ? 'En cours' : 'Terminé',
      formatDate(r.created_at),
      formatDate(r.updated_at)
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${reportType}_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  async function fetchReports() {
    loading.value = true
    try {
      await reportsStore.fetchAllReports()
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    filters,
    pagination,
    selectedReports,
    allSelected,
    // Computed
    allReports,
    filteredReports,
    paginatedReports,
    totalPages,
    selectedCount,
    // Methods
    clearFilters,
    toggleSort,
    toggleSelectAll,
    toggleReportSelection,
    goToPage,
    formatDate,
    formatDateFull,
    viewReportDetails,
    exportToCSV,
    fetchReports
  }
}
