export type MemoryStatus = 'PROCESSING' | 'READY' | 'FAILED'
export type MemoryTag =
  | 'Language'
  | 'Motor Skills'
  | 'Emotional'
  | 'Social'
  | 'Milestone'
  | 'Play'
  | 'Family'
  | 'Funny'
  | 'Growth'
  | 'Challenge'

export const MEMORY_TAG_OPTIONS: MemoryTag[] = [
  'Language',
  'Motor Skills',
  'Emotional',
  'Social',
  'Milestone',
  'Play',
  'Family',
  'Funny',
  'Growth',
  'Challenge',
]

export interface CreateMemoryResponse {
  id: string
  status: MemoryStatus
  errorMessage: string | null
  transcriptPreview: string | null
  tags: MemoryTag[]
}

export interface MemoryListItem {
  id: string
  createdAt: string
  recordedAt: string
  status: MemoryStatus
  transcriptSnippet: string
  tags: MemoryTag[]
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
  tags: MemoryTag[]
}
