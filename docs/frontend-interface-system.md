# Frontend interface system

## Status and scope

The ReturnOps frontend uses Tailwind CSS 4 as its only component-styling
framework. `src/app/globals.css` is the only authored CSS file. It contains the
Tailwind entrypoint, design tokens, the minimal base layer, keyboard focus, and
reduced-motion behavior; it does not contain component selectors.

The interface system covers the customer center, the three-step return
workflow, the operations queue, the full operations review, and the Energybil
meter-to-invoice route in English and Spanish at desktop and mobile widths.

## Sources of truth

The visual implementation is deliberately split by responsibility:

- `src/app/globals.css` defines semantic color, font, and shadow tokens through
  `@theme`, plus browser-wide accessibility behavior.
- `control-styles.ts` owns reusable buttons and form controls.
- `surface-styles.ts` owns containers, layout, spacing, responsive geometry,
  panels, overlays, and dialogs.
- `pattern-styles.ts` owns contextual typography and complex descendant or
  state patterns such as tables, timelines, evidence hierarchies, and status
  decisions.
- `src/features/energybil/components/styles.ts` applies the same three-way
  control, surface, and pattern split within the independent Energybil feature.
- Small, self-contained primitives such as badges and the loading spinner may
  keep a complete static class string beside their markup.

When a component combines catalogs, the order is `surface` first and `pattern`
second. A short local utility may follow only when it represents a one-off
placement modifier rather than a new reusable component style.

## Tailwind conventions

1. Keep every utility as a complete static string visible to Tailwind's source
   scanner. Do not build class names such as `bg-${tone}`.
2. Express variants with complete lookup-map values, conditional complete
   strings, `data-*` attributes, or ARIA state selectors.
3. Prefer semantic theme tokens (`text-ink`, `bg-primary`, `border-border`) over
   new literal colors. A literal is acceptable for a deliberate one-off visual
   tone only after its text contrast is checked.
4. Within a class string, keep this approximate order: layout and position,
   size, spacing, border and surface, typography, interaction state, then
   responsive and motion variants.
5. Extract a shared constant when the same complete class string represents the
   same semantic primitive. Repeated Tailwind vocabulary such as `grid`,
   `border`, or `bg-surface` is expected and must not be abstracted.
6. Do not add CSS Modules or component selectors. If Tailwind cannot express a
   requirement cleanly, document the exception before extending the global
   base layer.

The returns consolidation audit found 236 static class-string literals across
its three catalogs and zero exact duplicate complete strings after extracting
the shared field, message, and heading-row primitives. Energybil keeps its
additional static strings inside its feature-local catalog.

## Accessibility contract

The production interface must preserve all of the following:

- One descriptive page title, one visible primary heading per role view, and a
  `main` landmark reachable through a localized skip link.
- A synchronized `html[lang]` value when the visitor switches languages.
- Native labels for form controls; icon-only buttons require localized
  accessible names.
- Toggle groups and filters expose selection through `aria-pressed`, not color
  alone. Expandable queue controls expose `aria-expanded` and `aria-controls`.
- Every modal has an accessible name, `aria-modal="true"`, contained keyboard
  focus, Escape handling when safe, scroll locking, and focus restoration.
- Validation errors use `role="alert"` and associate field-specific guidance
  through `aria-describedby`; non-error confirmations and notices use
  `role="status"`.
- Decorative symbols are hidden from assistive technology.
- Motion respects `prefers-reduced-motion`, including programmatic scrolling.

The active semantic color pairs meet WCAG AA for normal text. Audited contrast
ratios include ink/surface 16.17:1, secondary/surface 6.34:1,
surface/primary 5.47:1, success/success-soft 4.73:1,
warning/warning-soft 6.12:1, and danger/danger-soft 5.75:1. The inactive mobile
language option uses 92% white so it remains at or above 4.5:1 across the teal
header gradient.

## Responsive contract

The approved visual baselines use 1440px desktop and 390px mobile viewports.
The interface may use design-specific arbitrary breakpoints where the content,
not a device name, requires a layout change. Every approved viewport must avoid
horizontal document overflow. Desktop tables are replaced with semantic
expandable cards on mobile rather than compressed into unreadable rows.

## Verification workflow

Run static and unit validation inside Docker:

```bash
docker compose exec frontend npm test
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run build
```

Run browser tests from WSL, where the Playwright browser is installed:

```bash
cd frontend
npm run test:a11y
npm run test:e2e
```

`test:a11y` is a fast contract check for landmarks, localized state, dialog
focus containment and restoration, and unnamed buttons. The complete browser
suite also verifies the customer-to-operations lifecycle and all approved
screenshots.

Only run `npm run test:e2e:update` after reviewing an intentional visual change.
Never accept a new baseline merely to make a failing comparison green.

## Change checklist

Before merging an interface change:

1. Place styles in the catalog matching their responsibility.
2. Confirm all Tailwind classes remain statically discoverable.
3. Check keyboard behavior, accessible names, state attributes, and both
   languages.
4. Check 390px and 1440px without horizontal overflow.
5. Run unit, lint, type, build, accessibility, lifecycle, and visual checks.
6. Update this document only when the architecture or conventions change.
