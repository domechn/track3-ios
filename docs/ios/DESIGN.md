# Track3 iPhone design system

## Direction

Track3 uses the iOS grouped layout: quiet surfaces, one indigo-blue accent, prominent money, and controls with at least 44 pt touch targets. The app uses the device font through `-apple-system, "SF Pro Text", "SF Pro Display", system-ui`; it downloads no font. The phone layout applies at the existing coarse-pointer media query through 950 px. Desktop routes continue to use the same components and data.

## Tokens

`src/style.css` is the source of truth. Tailwind semantic colors in `tailwind.config.js` resolve the same variables.

| Role | Light | Dark |
| --- | --- | --- |
| Grouped background | `#F2F2F7` | `#000000` |
| Raised surface | `#FFFFFF` | `#1C1C1E` |
| Primary label | near `#1C1C1E` | near white |
| Secondary label | `#636366` | `#AEAEB2` |
| Accent | `#315CBE` | `#6D97FA` |
| Gain | `--ios-gain` (`#248A3D` for readable light text; chart green is `#34C759`) | `#30D158` |
| Loss | `--ios-loss` (`#D70015` for readable light text; chart red is `#FF3B30`) | `#FF453A` |
| Inset separator | `--ios-separator`, 0.5 px | same token |

Charts use `--ios-chart-1` through `--ios-chart-6`, with the accent first and five muted hues after it. The only fill gradient is the vertical fade under a trend line. Avoid drop shadows on content cards.

## Type and spacing

Use `ios-large-title` (34/700), `ios-title` (22/700), `ios-headline` (17/600), `ios-body` (17), `ios-subhead` (15), `ios-footnote` (13), and `ios-caption` (12). Apply `ios-money` to all money and percentages for tabular digits and tight tracking. Hero value is 44–56 px and must stay legible on a 320 pt screen. Spacing follows 8 pt steps with 16–20 pt card padding. Content cards use 16 pt continuous corners; inset groups use 14 pt.

## Components and usage

Import phone primitives from `@/components/mobile`: `MobileCard`, `InsetGroup`, `ListRow`, `SectionHeader`, `SegmentedControl`, `BottomSheet`, `IconButton`, `DeltaPill`, `AnimatedAmount`, `MobileSkeleton`, `EmptyState`, `MobileIcon`, `MobilePage`, and `MobileNavigation`. `src/components/mobile/mobile.css` owns their visual rules. Keep labels translated through `useTranslation`; do not put data values or symbols through `t()`.

Use `MobileCard` for one metric or chart, `InsetGroup` and `ListRow` for settings and allocation, and `SectionHeader` immediately above a group. Use `DeltaPill` with the numeric signed value. `IconButton` requires a readable `label`. `EmptyState` needs a translated `illustrationLabel` and a primary action that goes directly to source setup. Sheets keep their grabber and restore focus. Segments expose the selected item as a radio control.

`AnimatedAmount` takes a raw number and the existing currency formatter; it animates only when the value changes and skips animation when reduced motion is requested. The Overview range segments filter points inside the portfolio date selection; they do not change the saved date selection or data queries. Gain and loss pills follow the user's quote-color convention.

The tab bar and compact navigation bar use blur and a hairline. The Overview large title and hero value remain visible at the top of the page; the compact value appears in the top bar after scrolling. Use `MobileIcon` for shell icons. Keep existing route targets and per-tab stacks.

## Motion and access

Interactive transitions use `--ios-motion` at 150–350 ms. Press states scale to 0.97; all motion is disabled under `prefers-reduced-motion`. Skeletons reserve layout while loading. A chart scrub must also have a visible value chip and an accessible chart summary. Charts use at least 11 px tick labels and at most four vertical ticks. Keep a visible focus ring, 44 pt controls, and color independent gain/loss text with a sign.
