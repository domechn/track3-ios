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

Use `MobileCard` for one metric or chart, `InsetGroup` and `ListRow` for settings and allocation, and `SectionHeader` immediately above a group. `Button` is the 44 pt primary action; `IconButton` requires a readable `label`. `Switch` re-exports the app's Radix switch, which gets its iOS dimensions only in the phone media query. Use `Pill` for neutral labels and `DeltaPill` with a numeric signed value. `EmptyState` needs a translated `illustrationLabel` and a primary action that goes directly to source setup. Sheets keep their grabber and restore focus. Segments expose the selected item as a radio control; `value={null}` leaves every segment unselected until a quick range is applied.

`AnimatedAmount` takes a raw number and the existing currency formatter; it animates only when the value changes and skips animation when reduced motion is requested. The Overview range segments filter points inside the portfolio date selection; they do not change the saved date selection or data queries. Gain and loss pills follow the user's quote-color convention.

The tab bar and compact navigation bar use blur, a 97% surface fill, and a hairline so text behind them stays quiet if blur is unavailable. Root tabs place the large title at the top without a separate brand bar; the compact value appears in the top bar after scrolling. Pushed pages show Back alone until their large title scrolls away. Overview exposes date selection when saved history exists and refresh when a source is configured. Use `MobileIcon` for shell icons. Keep existing route targets and per-tab stacks.

The Overview P&L chart has a fixed 172 px phone height so responsive chart resizing cannot expand its flex column. Its localized short dates sit below the canvas, leaving the plot full width. The hero chart has no reserved Chart.js x ticks; its date labels sit just below the plotting area. Range filtering uses millisecond timestamps; a touch scrub measures its value chip before clamping it inside the chart. Allocation rows use the same palette index as the donut slice, including the shared Other slice on later pages. The source teaser lists the three largest latest-source balances with one-line alias and type, and links to Wallets. It disappears when no source balances are available.

## Motion and access

Interactive transitions use `--ios-motion` at 150–350 ms. Press states scale to 0.97; all motion is disabled under `prefers-reduced-motion`. `MobileSkeleton` reserves the flat hero and grouped sections while loading; `ui/Skeleton` retains the desktop pulse. Portal sheets, dialogs, and toasts inherit the phone system font from `body`. A chart scrub must also have a visible value chip and an accessible chart summary. Charts use at least 11 px tick labels and at most four vertical ticks. Keep a visible focus ring, 44 pt controls, and color independent gain/loss text with a sign. The Overview movers' positive and negative filters apply only to phone rows; desktop keeps its prior ranking selection.

## Data screens

Data screens use the same grouped background and surface tokens. Their phone styling lives in `src/components/index/data-screens.css` and is scoped to the coarse-pointer phone media query. Analytics has a two-column tile hub of 44 pt or larger targets, with titles aligned from the top of each tile. Allocation, Top coins, Returns, and Position changes open full-height sheets; Wallets, Comparison, and Cost basis keep their routes. Sheets keep the common grabber, close action, and focus behavior. These pages use the shared `SegmentedControl` for range, period, rank, and attribution choices. Use component classes and the additive `data-ui-card` marker for phone rules so Tailwind utility changes do not silently alter layouts.

History groups the current SQL page by local calendar month. Each inset group has a large tabular total, a signed change pill, and the asset preview. The page size and SQL query remain bounded; the latest snapshot still has swipe-delete and Undo. The detail uses a real `BottomSheet` with an asset count, search, and rows whose delete action is revealed by a swipe. The destructive snapshot action follows the asset list. Comparison keeps both short dates and totals side by side even on a narrow phone. Its total change uses `DeltaPill`; signed changes sit on their own line so amounts do not split in the middle.

The Analytics report leads with a 36–44 pt latest-snapshot value, followed by two-column metrics, monthly return tiles, and contribution rows. Profit metric tiles stand directly on the grouped background, use short labels, compact date ranges, and inclusive day counts; a zero-day streak shows a dash instead of a date. Phone monthly returns show the newest month first, including in the Returns sheet, and use a dash when the month has no snapshot; desktop keeps calendar order. The Analytics Net P&L hero has a 7D/1M/1Y/All range control that filters its own P&L and attribution queries within the selected portfolio dates. Monthly P&L drilldown has a 7D/1M range control. The bar chart uses semantic gain/loss colors and a touch value chip mapped to the Chart.js x scale; it keeps its accessible data table. Attribution uses 48 pt ranked rows with asset logos and expandable breakdowns. Wallets leads with its total, then the source chart and inset rows; individual wallet tiles take distinct muted colors and Value Changes uses the same source names. Coin detail puts the logo and last stored price ahead of the chart and source/transaction sections. Its adjacent pill compares the stored price with the last stored price at or before the 24-hour cutoff of the selected range. The phone coin trend uses one value axis, short horizontal dates, and four ticks. Transaction rows show month and day; the detail sheet retains the full timestamp.

Cost basis keeps the existing report, filters, and export actions. Its four headline values use a two-column phone grid; empty sections show a translated row. Phone lot rows expand inline with signed, two-decimal gain and loss values. USD values use the `$` symbol on phone, while lot dates use a short localized date. No screen-specific colors are needed beyond the shared `--ios-chart-*`, `--ios-gain`, `--ios-loss`, and `--ios-accent` tokens.

## D3 feature screens

`src/components/ios-d3.css` styles the More hub and pushed feature screens inside the same coarse-pointer media query as the D1 primitives. It uses the D1 `--primary`, grouped `--background`/`--card`, `--ios-separator`, gain/loss, and motion tokens. Do not add a second palette or font. Feature cards have no shadow or outline; 14–16 px rounded tone steps separate them. Keep text fields at 16 px to avoid iOS keyboard zoom and tap targets at least 44 px.

| Screen | Pattern |
| --- | --- |
| More | Two inset groups, Plan and Manage, with the shared 24 px navigation icons. The Settings hub alone puts icons in colored 30 px rounded squares. |
| Pushed Settings | One 34 px large title and inset groups; a centered compact title uses the page's own name after scrolling. Currency and result-count rows open full-page pickers; switches use the shared 51 px phone control. Appearance choices apply on tap and show a trailing checkmark. Sync fields put quiet labels above full-width, 44 px inputs in one grouped surface. |
| Data sources | Grouped source rows show a provider logo or monogram, alias, masked identity, shared enabled switch, and short action sheet. Add starts with a searchable provider list without a preselected logo; tapping a provider opens the grouped credentials page. Filled inputs show Required or Optional placeholders; secret fields can be seen only while the reveal control is held. An empty configuration shows three setup cards and one Add source action that opens a kind picker, including custom assets. |
| Goals and alerts | Rules use one inset surface, title first, and a progress ring and bar for current value and target on iPhone. Enabled state is a switch. Add alert is in the top bar; the full-screen editor uses a native kind select and keeps Save above the bottom bar without covering fields. |
| Rebalance | Target fields and touch sliders share one target group. Presets and assistant suggestions wrap inside their surface; removal is a labeled action below the slider. Suggested buy and sell values use distinct gain and loss colors with explicit signs. Charts show every category label and use accent plus muted teal for current and target. |
| Assistant | A compact chat header leaves room for messages. The empty state has an accent SVG and short suggestion chips; tapping a chip still submits its full prompt. Bubbles have separate user and assistant surfaces, streaming text gets a caret, tool activity collapses into a chip, and the composer sits above the keyboard and tab bar. |
| Refresh and status | A sheet grabber, grouped per-source status rows, measured source durations in an aligned column, and retry controls keep refresh feedback in one place. The result summary stays visible. Pending rows use the fetcher's source IDs and labels, so repeated aliases remain distinct. Source fetches report completion so rows change from pending to done while the rest of the refresh runs. The sheet scrolls as one surface. Toasts and the refresh tooltip are hidden while it is open. Sync and automatic backup indicators use compact, blurred surfaces above the tab bar. |
| Protected startup | The fallback lock screen uses an accent lock illustration and one retry action. The initial startup check reserves a skeleton. Native Face ID, Touch ID, and the app-switcher cover are outside browser screenshots. |

Add D3 copy to both flat locale catalogs. Run `tests/e2e/ios-d3-visual.spec.ts` after visual changes: it captures each D3 route, editors, source actions, goals, target and trade views, chat, refresh states, first launch, onboarding, and the protected-startup fallback in light and dark at SE and iPhone 14 sizes. Its rich fixture includes seven holdings, a current 60-day history, gain and loss trades, and an active target profile. The iPhone CI job includes this suite and uploads its review PNGs from `test-results/mobile/`.
