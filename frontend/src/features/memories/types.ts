export type MemoryStatus = 'PROCESSING' | 'READY' | 'FAILED'

export interface CreateMemoryResponse {
  id: string
  status: MemoryStatus
  errorMessage: string | null
  transcriptPreview: string | null
}

export interface MemoryListItem {
  id: string
  createdAt: string
  recordedAt: string
  status: MemoryStatus
  transcriptSnippet: string
}

export interface MemoriesListResponse {
  items: MemoryListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface Memory {
  id: string
  createdAt: string
  recordedAt: string
  status: MemoryStatus
  transcript: string | null
  errorMessage: string | null
}
