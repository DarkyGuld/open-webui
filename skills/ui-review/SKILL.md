---
name: ui-review
description: Perform a strict UX/UI review of Personal AI Workspace screens. Use when reviewing any view or component for alignment, spacing, typography, states, responsiveness, and accessibility before considering it done.
---

# UI Review

Review every screen/component strictly. Do not sign off on visual work without evidence
(screenshots) at desktop and mobile widths.

## Must inspect

| Dimension | What to check |
|---|---|
| Alignment | Edges, baselines, optical alignment within grids |
| Spacing | Consistent scale; no cramped or floating elements |
| Typography | One type scale; weights/sizes intentional; no orphans |
| Iconography | Single icon set; consistent size/stroke; correct semantics |
| Density | Appropriate for the surface (chat vs settings vs list) |
| Hierarchy | Clear primary/secondary/tertiary emphasis |
| Hover | Clear affordance |
| Active | Selected/current state visible |
| Focus | Visible, consistent focus ring; keyboard reachable |
| Disabled | Clearly non-interactive |
| Loading | Skeletons/spinners; no layout jank |
| Empty | Helpful, on-brand empty state (not a blank pane) |
| Error | Clear, recoverable error state |
| Desktop | Layout works at 1440/1920 |
| Mobile | Layout works at ~390px; touch targets ≥ 44px |
| Accessibility | Contrast, labels, roles, keyboard order, a11y addon clean |

## Process

1. Capture desktop + mobile screenshots (Playwright harness in `audit/`).
2. Walk the checklist; record each finding with a screenshot reference.
3. Classify: blocker / should-fix / nit.
4. Fix, re-capture, re-review. Repeat until clean.
