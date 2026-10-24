# Track3 iPhone design system

## Direction

Track3 uses the iOS grouped layout: quiet surfaces, one indigo-blue accent, prominent money, and controls with at least 44 pt touch targets. The phone layout uses the device font through `-apple-system, "SF Pro Text", "SF Pro Display", system-ui`. It applies at the existing coarse-pointer media query through 950 px. Desktop keeps its Outfit and JetBrains Mono fonts and original semantic theme values.

## Tokens

`src/style.css` is the source of truth. Tailwind semantic colors in `tailwind.config.js` resolve the same variables. Phone overrides apply only at the mobile media query. `--accent` remains the neutral control state on both layouts; `--ios-accent` supplies the blue brand color.

| Role | Light | Dark |
| --- | --- | --- |
| Grouped background | `#F2F2F7` | `#000000` |
| Raised surface | `#FFFFFF` | `#1C1C1E` |
| Primary label | near `#1C1C1E` | near white |
| Secondary label | `#636366` | `#AEAEB2` |
| Accent | `#315CBE` | `#6D97FA` |
| Gain | `--ios-gain` (`#166534` for readable light text on tinted surfaces; chart green is `#34C759`) | `#30D158` |
| Loss | `--ios-loss` (`#D70015` for readable light text; chart red is `#FF3B30`) | `#FF453A` |
| Inset separator | `--ios-separator`, 0.5 px | same token |
| Segment track / thumb | `--ios-segment-track` / `--ios-segment-selected` | same tokens, with the selected thumb lighter than its track |

Phone charts use `--ios-chart-1` through `--ios-chart-6`, with the accent first and five muted hues after it. `getChartPalette()` in `src/utils/chart-theme.ts` mirrors those tokens for canvas charts and retains the original eight-color desktop palette. The only fill gradient is the vertical fade under a trend line. Avoid drop shadows on content cards.

## Type and spacing

Use `ios-large-title` (34/700), `ios-title` (22/700), `ios-headline` (17/600), `ios-body` (17), `ios-subhead` (15), `ios-footnote` (13), and `ios-caption` (12). Apply `ios-money` to all money and percentages for tabular digits and tight tracking. Hero value is 44–56 px and must stay legible on a 320 pt screen. Spacing follows 8 pt steps with 16–20 pt card padding. Content cards use 16 pt continuous corners; inset groups use 14 pt.

## Components and usage

Import phone primitives from `@/components/mobile`: `MobileCard`, `InsetGroup`, `ListRow`, `SectionHeader`, `SegmentedControl`, `BottomSheet`, `Button`, `IconButton`, `Switch`, `Pill`, `DeltaPill`, `AnimatedAmount`, `MobileSkeleton`, `EmptyState`, `MobileIcon`, `MobilePage`, and `MobileNavigation`. `src/components/mobile/mobile.css` owns their visual rules. Keep labels translated through `useTranslation`; do not put data values or symbols through `t()`.

Use `MobileCard` for one metric or chart, `InsetGroup` and `ListRow` for settings and allocation, and `SectionHeader` immediately above a group. `Button` is the 44 pt primary action; `IconButton` requires a readable `label`. `Switch` re-exports the app's Radix switch, which gets its iOS dimensions only in the phone media query. Use `Pill` for neutral labels and `DeltaPill` with a numeric signed value. `EmptyState` needs a translated `illustrationLabel` and a primary action that goes directly to source setup. Sheets keep their grabber and restore focus. Segments expose the selected item as a radio control.

`AnimatedAmount` takes a raw number and the existing currency formatter; it animates only when the value changes and skips animation when reduced motion is requested. The Overview range segments filter points inside the portfolio date selection; they do not change the saved date selection or data queries. Gain and loss pills follow the user's quote-color convention.

The tab bar and compact navigation bar use blur, a 97% surface fill, and a hairline so text behind them stays quiet if blur is unavailable. Root tabs place the large title at the top without a separate brand bar; the compact value appears in the top bar after scrolling. Pushed pages show Back alone until their large title scrolls away. Overview exposes date selection when saved history exists and refresh when a source is configured. Use `MobileIcon` for shell icons. Keep existing route targets and per-tab stacks.

The Overview P&L chart has a fixed 172 px phone height so responsive chart resizing cannot expand its flex column. Its localized short dates sit below the canvas, leaving the plot full width. The hero chart has no reserved Chart.js x ticks; its date labels sit just below the plotting area. Range filtering uses millisecond timestamps; a touch scrub measures its value chip before clamping it inside the chart. Allocation rows use the same palette index as the donut slice, including the shared Other slice on later pages. The source teaser lists the three largest latest-source balances with one-line alias and type, and links to Wallets. It disappears when no source balances are available.

## Motion and access

Interactive transitions use `--ios-motion` at 150–350 ms. Press states scale to 0.97; all motion is disabled under `prefers-reduced-motion`. `MobileSkeleton` reserves the flat hero and grouped sections while loading; `ui/Skeleton` retains the desktop pulse. Portal sheets, dialogs, and toasts inherit the phone system font from `body`. A chart scrub must also have a visible value chip and an accessible chart summary. Charts use at least 11 px tick labels and at most four vertical ticks. Keep a visible focus ring, 44 pt controls, and color independent gain/loss text with a sign. The Overview movers' positive and negative filters apply only to phone rows; desktop keeps its prior ranking selection.

## Data screens

Data screens use the same grouped background and surface tokens. Their phone styling lives in `src/components/index/data-screens.css` and is scoped to the coarse-pointer phone media query. Analytics starts with a two-column grid of 44 pt or larger targets: Allocation and the route-based analyses open their existing pages, while Top Coins Rank and Profit Summary open full-height sheets. The sheets keep the common grabber, close action, and focus behavior.

History groups the current SQL page by local calendar month. Each inset group has a large tabular total, a signed change pill, and the asset preview. The page size and SQL query remain bounded; the latest snapshot still has swipe-delete and Undo. The detail sheet puts its two counts beside each other and uses asset rows below a searchable filter. Comparison keeps both dates and totals side by side even on a narrow phone. Signed changes sit on their own line so amounts do not split in the middle.

Summary leads with a 36–44 pt current value, followed by two-column metrics, monthly return tiles, and contribution rows. Phone monthly returns show the newest month first, including in the Returns sheet, so recent activity appears without scrolling; desktop keeps calendar order. The P&L bar chart uses semantic gain/loss colors and a touch value chip; it keeps its accessible data table. Wallets leads with its total, then the source chart and inset rows. Treemap category colors use the restrained chart tokens on phones, and a single source on a coin page is represented by its row instead of a full-width solid chart. Coin detail puts the logo and last stored price ahead of the chart and source/transaction sections. The adjacent return pill describes the selected period; it does not claim a 24-hour change.

Cost basis keeps the existing report, filters, export actions, and sheets for asset and lot rows. Its four headline values use a two-column phone grid. No screen-specific colors are needed beyond the shared `--ios-chart-*`, `--ios-gain`, `--ios-loss`, and `--ios-accent` tokens.
