---
name: design-language
description: Maintain one consistent visual language for Personal AI Workspace. Use when creating or changing any UI, styling, layout, spacing, typography, icons, surfaces, radii, animations, colors, or navigation, and when reviewing visual consistency.
---

# Design Language

Maintain **one** visual language across the product. Open WebUI is the visual
foundation; the PAW surface extends it, it does not compete with it.

## Rules

- **Preserve the Open WebUI visual identity.** The upstream shell/theme is the base.
- **Reuse native components** before styling from scratch. See `component-reuse`.
- **Consistent typography**: one type scale and font stack across views.
- **Consistent spacing**: use the existing spacing scale (Tailwind steps). No magic pixel values.
- **Consistent icons**: one icon set only (`lucide-react` in `apps/web`). Match stroke width and size rhythm.
- **Consistent surfaces**: defined background/border/elevation levels (the app currently uses `slate` surfaces on `#0f172a`).
- **Consistent radius**: a small set of radius tokens (e.g. `rounded-lg`, `rounded-xl`). Do not invent per-view radii.
- **Consistent animation**: short, purposeful, matching existing transitions.
- **One design system only.** Do not introduce a second component library or CSS framework.

## Forbidden

- Random/one-off design systems or duplicate button/menu primitives.
- Colorful emoji in navigation or chrome.
- Arbitrary, unexplained one-off UI patterns.
- Ad-hoc colors outside the established palette unless deliberately added as tokens.

## Checklist for any change

1. Does it reuse existing components/tokens? If not, why?
2. Are spacing/typography/radius/icons taken from the established scale?
3. Does it hold in light and dark surfaces?
4. Would a reviewer mistake it for a different product? If yes, fix it.
