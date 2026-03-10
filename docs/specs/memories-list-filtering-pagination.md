# Spec — Memories List, Filters, and Pagination

## Goal
Define the list behavior on `/memories` including filter UX, grouping, pagination, and loading states.

## Scope
- Sticky header and filter chips
- Month and tag picker sheets
- Infinite scrolling behavior
- Empty and error states

## List Rules
- Memories are shown newest first.
- Items are grouped by month using `recordedAt` fallback `createdAt`.
- List item tap opens detail route `/memories/:id`.

## Filter UX
- Inline chip bar below page title.
- Chips:
  - Month (single selection)
  - Tags (multi-selection)
  - Clear (only visible when any filter is active)
- Month and tags are edited in bottom sheets.

## Filter Semantics
- Month:
  - default `all`
  - when set, frontend sends `month=YYYY-MM` query param
- Tags:
  - multi-select list
  - frontend sends repeated `tags=<value>` params
- Clear resets month to `all` and tags to empty list.

## Pagination and Loading
- Initial page size: 5.
- Infinite scroll uses sentinel + `IntersectionObserver`.
- Loads next page when near list end and `hasMore=true`.
- Shows:
  - skeletons during initial load
  - "Loading more..." during append
  - "Scroll to load more" hint once per filter context
  - "You're all caught up." when no more data

## Caching
- Query-level list cache exists in frontend hook.
- Cache key includes familyId, month, tags, page size.
- Cache TTL: 5 minutes.
- Non-GET writes invalidate backend JSON cache.

## Error and Empty States
- Initial request error with empty list: show error text + retry button.
- Load-more error: show inline retry control in footer.
- Filtered empty result: "No moments match these filters."

## Acceptance Criteria
- Filters update API query params correctly.
- Month and tag changes refresh list context.
- Infinite scroll appends without replacing existing items.
- Empty/error/load states are clearly differentiated.

## Implementation References
- `frontend/src/pages/MemoriesPage.tsx`
- `frontend/src/features/memories/components/FilterChipBar.tsx`
- `frontend/src/features/memories/components/MonthPickerSheet.tsx`
- `frontend/src/features/memories/components/TagPickerSheet.tsx`
- `frontend/src/components/BottomSheet.tsx`
- `frontend/src/features/memories/hooks/usePaginatedMemories.ts`
