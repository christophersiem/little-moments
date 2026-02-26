import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { MemoryListItemCard } from '../features/memories/components/MemoryListItemCard'
import { useMemoriesList } from '../features/memories/hooks'
import { MEMORY_TAG_OPTIONS, type MemoryListItem, type MemoryTag } from '../features/memories/types'
import { formatMonthYear } from '../lib/utils'

interface MemoriesPageProps {
  navigate: (nextPath: string) => void
}

interface MonthOption {
  key: string
  label: string
}

interface MonthGroup {
  key: string
  label: string
  items: MemoryListItem[]
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x4};
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x3};
`

const Heading = styled.h2`
  margin: 0;
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text};
`

const FilterToggle = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 1.1rem;
  cursor: pointer;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  min-width: ${({ theme }) => theme.layout.minTouchTarget};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const FiltersPanel = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const FilterLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const MonthSelect = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.md};
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.x3};
`

const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

const TagFilterButton = styled.button<{ $active: boolean }>`
  min-height: 36px;
  padding: ${({ theme }) => `${theme.space.x1} ${theme.space.x2}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.textMuted)};
  cursor: pointer;
`

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const GroupTitle = styled.h3`
  margin: 0;
  padding: ${({ theme }) => `${theme.space.x2} 0`};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-size: 1.35rem;
  font-weight: 500;
`

const EmptyText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

function getEventDate(item: MemoryListItem): string {
  return item.recordedAt || item.createdAt
}

function monthKey(dateIso: string): string {
  const date = new Date(dateIso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function collectMonthOptions(items: MemoryListItem[]): MonthOption[] {
  const seen = new Set<string>()
  const options: MonthOption[] = []

  for (const item of items) {
    const eventDate = getEventDate(item)
    const key = monthKey(eventDate)
    if (!seen.has(key)) {
      seen.add(key)
      options.push({ key, label: formatMonthYear(eventDate) })
    }
  }

  return options
}

function groupByMonth(items: MemoryListItem[]): MonthGroup[] {
  const groups: MonthGroup[] = []

  for (const item of items) {
    const eventDate = getEventDate(item)
    const key = monthKey(eventDate)
    const current = groups[groups.length - 1]
    if (!current || current.key !== key) {
      groups.push({ key, label: formatMonthYear(eventDate), items: [item] })
      continue
    }
    current.items.push(item)
  }

  return groups
}

export function MemoriesPage({ navigate }: MemoriesPageProps) {
  const { loading, error, items } = useMemoriesList()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedTags, setSelectedTags] = useState<MemoryTag[]>([])

  const monthOptions = useMemo(() => collectMonthOptions(items), [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const eventDate = getEventDate(item)
      if (selectedMonth !== 'all' && monthKey(eventDate) !== selectedMonth) {
        return false
      }
      if (selectedTags.length > 0 && !item.tags.some((tag) => selectedTags.includes(tag))) {
        return false
      }
      return true
    })
  }, [items, selectedMonth, selectedTags])

  const groups = useMemo(() => groupByMonth(filteredItems), [filteredItems])

  const toggleTag = (tag: MemoryTag) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }

  if (loading) {
    return (
      <Section>
        <Heading>Memories</Heading>
        <EmptyText>Loading...</EmptyText>
      </Section>
    )
  }

  if (error) {
    return (
      <Section>
        <Heading>Memories</Heading>
        <ErrorText>{error}</ErrorText>
      </Section>
    )
  }

  return (
    <Section>
      <HeadingRow>
        <Heading>Memories</Heading>
        <FilterToggle onClick={() => setFiltersOpen((open) => !open)} aria-label="Toggle filters">
          ⌄
        </FilterToggle>
      </HeadingRow>

      {filtersOpen && (
        <FiltersPanel>
          <FilterLabel>
            Month
            <MonthSelect value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              <option value="all">All months</option>
              {monthOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </MonthSelect>
          </FilterLabel>

          <FilterLabel>
            Tags
            <TagGrid>
              {MEMORY_TAG_OPTIONS.map((tag) => (
                <TagFilterButton key={tag} $active={selectedTags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {tag}
                </TagFilterButton>
              ))}
            </TagGrid>
          </FilterLabel>
        </FiltersPanel>
      )}

      {groups.length === 0 ? (
        <EmptyText>No memories match the current filters.</EmptyText>
      ) : (
        groups.map((group) => (
          <Group key={group.key}>
            <GroupTitle>{group.label}</GroupTitle>
            {group.items.map((item, index) => (
              <MemoryListItemCard
                key={item.id}
                item={item}
                isLastInGroup={index === group.items.length - 1}
                onOpen={(id) => navigate(`/memories/${id}`)}
              />
            ))}
          </Group>
        ))
      )}
    </Section>
  )
}
