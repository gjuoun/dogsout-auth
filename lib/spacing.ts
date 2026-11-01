// Spacing for the instance pages, in one place. Values are CSS pixels on a 4px grid and are
// checked in the browser (see the PR body). Each entry is a complete Tailwind class, because
// Tailwind only generates classes it can find as whole strings in the source.
//
// Changing a value here changes every page that uses it.

export const SPACING = {
  // Card padding: 16 horizontal, 12 vertical. Used by the list card and the detail cards.
  cardPadX: "px-4",
  cardPadY: "py-3",
  cardPad: "px-4 py-3",
  // Table body cell: 8px vertical padding. The row itself is 40px (rowHeight).
  cellPadY: "py-2",
  rowHeight: "h-10",
  // Status pill height: 22px.
  pill: "h-[22px]",
  // Table header bottom padding, so the first row starts 8px below the header text.
  headerGap: "pb-2",
  // Timeline events: at least 8px between one event and the next. Preview is 12, detail page is 16.
  timelineGapCompact: "pb-3",
  timelineGap: "pb-4",
  // Title row to the list card top, and the gap between the two columns: 16px.
  titleToCard: "gap-4",
  columnGap: "gap-4",
  // Session log card to the Back button: 12px.
  blockGap: "gap-3",
} as const;

// The same values as numbers, for the measurement script to compare against.
export const SPACING_PX = {
  cardPadX: 16,
  cardPadY: 12,
  rowHeight: 40,
  pillHeight: 22,
  headerGap: 8,
  timelineGap: 8,
  titleToCard: 16,
  columnGap: 16,
  blockGap: 12,
} as const;
