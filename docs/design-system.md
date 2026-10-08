# Reloved Design System

**Status:** v1 / September 2026 / Working document
**Last updated:** 2026-09-28

## How to use this file

This is the single source of truth for all visual and UI decisions in Reloved. Every developer and designer working on the project should reference this file before building or styling any component. If something isn't covered here, ask before inventing. If a decision is marked **TBD**, do not ship a permanent implementation until it's resolved.

---

## Brand

- **App name:** Reloved
- **Wordmark:** reloved. (lowercase, with full stop, always. Set in Fraunces Regular 400.)
- **Tagline:** TBD. Shortlist under consideration:
  - great style shouldn't cost full price.
  - the good stuff, already sorted for you.
  - thrift shopping without the sweat.
  - your brands. your size. your price.

---

## Colors

### In-app palette

| Token | Hex | Use |
|---|---|---|
| color-canvas | #FAF9F7 | Page background |
| color-surface | #F3F2EF | Cards, input backgrounds, photo containers |
| color-text-primary | #2D2D2D | Primary text, CTA buttons |
| color-text-secondary | #6B6B6B | Supporting text, brand names on cards |
| color-text-tertiary | #737373 | Timestamps, placeholders, hints |
| color-border | #E5E4E1 | Dividers, card edges, input borders |
| color-white | #FFFFFF | Card backgrounds, modal surfaces |

No accent colour. Interactive elements (active filters, links) use color-text-primary.

### Status colours

Small labels only, never large fills.

| Token | Hex | Use |
|---|---|---|
| color-status-pending | #92600A | Listing under review |
| color-status-live | #15803D | Active listing |
| color-status-rejected | #DC2626 | Rejected listing |
| color-status-sold | #0A0A0A | Sold item |
| color-status-expired | #71717A | Expired listing |
| color-status-hidden | #5E6B7A | Hidden by user |

### Brand gradient (outside the app only)

Organic colour blend with film-grain texture overlay. Used for: splash screen, onboarding, social assets, the hero section of the landing page. Never behind product listings or functional UI. Two directions in play (warm and dark).

- Warm variant: `/assets/gradient-warm.jpg`
- Dark variant: `/assets/gradient-dark.jpg`

**Fallback until assets are delivered:** Use `color-canvas (#FAF9F7)` for warm contexts and `#1A1A18` for dark contexts. Do not substitute a CSS gradient — the film-grain texture is part of the identity and a flat gradient is not an acceptable interim.

---

## Typography

| Token | Typeface | Weight | Use |
|---|---|---|---|
| font-display | Fraunces | Regular 400 | Wordmark only |
| font-heading | Fraunces | Light 300 | Section headings |
| font-body | Inter | Regular 400 | Body text, descriptions |
| font-ui | Inter | Medium 500 | Buttons, labels, prices, filter chips |

- Both fonts loaded from Google Fonts.
- Fraunces is a variable font with an `opsz` axis (range 5–144). Set `font-optical-sizing: auto` as the base rule. For explicit control:
  - **Display size (≥ 24px):** `font-variation-settings: "opsz" 144` — maximises calligraphic character and ink traps
  - **Text size (< 24px):** `font-variation-settings: "opsz" 12` — slightly more upright, better legibility at small sizes
  - Wordmark uses display opsz at all sizes.
- Sentence case everywhere. No all-caps except internal labels.
- No em dashes anywhere in copy or UI strings.

### Type scale

| Token | Typeface | Size | Weight | Line height | Use |
|---|---|---|---|---|---|
| text-h1 | Fraunces | 32px | Light 300 | 1.2 | Page-level headings |
| text-h2 | Fraunces | 24px | Light 300 | 1.3 | Section headings |
| text-h3 | Inter | 18px | Medium 500 | 1.3 | Subsection headings |
| text-body | Inter | 16px | Regular 400 | 1.6 | Body text, descriptions |
| text-body-sm | Inter | 14px | Regular 400 | 1.5 | Secondary body text |
| text-caption | Inter | 12px | Regular 400 | 1.5 | Timestamps, hints |
| text-ui | Inter | 14px | Medium 500 | 1.4 | Buttons, labels, prices, chips |
| text-wordmark | Fraunces | contextual | Regular 400 | 1.0 | reloved. wordmark only |

---

## Spacing

Base unit: **8px**.

| Token | Value | Use |
|---|---|---|
| space-1 | 4px | Tight inline gaps |
| space-2 | 8px | Icon-to-label, inner chip padding |
| space-3 | 12px | Card inner padding, input padding vertical |
| space-4 | 16px | Standard element gap, input padding horizontal |
| space-5 | 24px | Between grouped elements, button padding horizontal |
| space-6 | 32px | Between sections (small) |
| space-7 | 48px | Section inner padding |
| space-8 | 64px | Major page-level divisions |

---

## Layout

### Breakpoints

| Token | Width | Description |
|---|---|---|
| bp-mobile | < 640px | Single column, full-bleed content |
| bp-tablet | 640px – 1023px | Two columns |
| bp-desktop | ≥ 1024px | Three or four columns |

### Container

Max-width: **1280px**, centred, with horizontal padding:

- Mobile: 16px each side
- Tablet: 24px each side
- Desktop: 40px each side

### Browse grid

| Viewport | Columns | Gap |
|---|---|---|
| Mobile (< 640px) | 2 | space-3 (12px) |
| Tablet (640–1023px) | 3 | space-4 (16px) |
| Desktop (≥ 1024px) | 4 | space-4 (16px) |

### Page layout

- Sticky nav: height 56px (mobile), 64px (desktop). Body content offset by nav height.
- No sidebar in v1. Full-width single-column content below the nav.

---

## Border radius

| Token | Value | Use |
|---|---|---|
| radius-none | 0px | Buttons, CTAs. Always sharp. |
| radius-sm | 4px | Cards, inputs, chips, modals |

Never use rounded-full or pill shapes on primary buttons.

---

## Focus states

All interactive elements use a consistent keyboard focus indicator:

- **Style:** 2px solid `color-text-primary (#2D2D2D)` outline, 2px offset from the element edge
- **CSS:** `outline: 2px solid #2D2D2D; outline-offset: 2px;`
- Never use `outline: none` without a replacement. The 2px border swap on inputs (border shifts to color-text-primary on focus) does **not** replace the outline — apply both.
- Focus rings are visible on all backgrounds in this palette; no dark-mode adjustment needed in v1.

---

## Dark mode

**Not in v1 scope.** Reloved v1 ships light mode only. Do not implement a dark theme, do not respond to `prefers-color-scheme: dark`, and do not introduce conditional token values. The warm neutral palette is not designed for dark inversion and will need a separately composed token set when dark mode is scoped.

When dark mode is added, it must be defined here before any implementation begins. Interim: if a device forces dark mode at the OS level and the app does not override it, that is an accepted known limitation, not a developer decision to solve.

---

## Motion

Movement should be barely perceptible — state changes, not performances.

| Token | Value | Use |
|---|---|---|
| duration-fast | 100ms | Hover border/colour changes |
| duration-base | 200ms | Toggle slide, modal entrance, drawer slide |
| easing-default | ease | All transitions unless noted |

Maximum: 200ms. Never animate layout properties (width, height, margin, padding). Stick to `opacity`, `transform`, and `border-color`.

**Reduced motion:** Wrap all transitions in `@media (prefers-reduced-motion: no-preference)`. At rest (no media query match), suppress transitions entirely — do not substitute a 0.01ms kill that removes visual feedback.

---

## Z-index

| Layer | Value | Use |
|---|---|---|
| z-base | 0 | Normal document flow |
| z-sticky | 100 | Sticky nav bar |
| z-drawer | 200 | Navigation drawer + overlay |
| z-modal | 300 | Modal dialog + overlay |
| z-toast | 400 | Toast / feedback banner |

---

## Elevation

No shadows are used in Reloved. The system is flat. Depth is communicated through layering, spacing, and subtle border contrast. Focus states use a 2px outline offset (see Focus states section).

---

## Components

### Nav

- Sticky, fixed to top on scroll
- Background: color-canvas (#FAF9F7)
- Left: hamburger icon + wordmark (reloved. in font-display, Fraunces Regular 400)
- Right: search icon + Sell button
- Sell button: color-text-primary background (#2D2D2D), white text, radius-none, font-ui

### Primary button

| Property | Value |
|---|---|
| Background | color-text-primary (#2D2D2D) |
| Text | color-white (#FFFFFF), font-ui (Inter Medium 500) |
| Border radius | radius-none (0px) |
| Padding | space-3 (12px) vertical, space-5 (24px) horizontal |
| Width | Full width on mobile |
| Min height | 44px (touch target minimum) |
| Hover | Background inverts to color-white, text to color-text-primary, 1px border color-text-primary |
| Disabled | 0.3 opacity, disabled cursor, no hover transition |

### Secondary button

| Property | Value |
|---|---|
| Background | transparent |
| Border | 1px solid color-border (#E5E4E1) |
| Text | color-text-primary (#2D2D2D), font-ui |
| Border radius | radius-none (0px) |
| Min height | 44px (touch target minimum) |
| Hover | Border shifts to color-text-primary |
| Disabled | 0.3 opacity, disabled cursor |

### Input / search bar

| Property | Value |
|---|---|
| Background | color-white (#FFFFFF) |
| Border | 1px solid color-border (#E5E4E1) |
| Border radius | radius-sm (4px) |
| Text | font-body (Inter Regular 400), color-text-primary |
| Placeholder | color-text-tertiary (#737373) |
| Padding | space-3 (12px) vertical, space-4 (16px) horizontal |
| Min height | 44px (touch target minimum) |
| Focus | Border shifts to color-text-primary (#2D2D2D) + 2px outline offset (see Focus states) |
| Error | Border shifts to color-status-rejected (#DC2626) |
| Disabled | Background color-surface, border color-border |

### Filter chip

| Property | Value |
|---|---|
| Background | color-surface (#F3F2EF) |
| Border | 1px solid color-border (#E5E4E1) |
| Border radius | radius-sm (4px) |
| Text | font-ui (Inter Medium 500), color-text-secondary (#6B6B6B) |
| Min height | 44px (touch target minimum) |
| Active state | Border color-text-primary, text color-text-primary |
| Hover | Border shifts to color-text-secondary |

### Browse card

| Property | Value |
|---|---|
| Background | color-white (#FFFFFF) |
| Border | 1px solid color-border (#E5E4E1) |
| Border radius | radius-sm (4px) |
| Photo | 3:4 aspect ratio, object-fit cover, background color-surface |
| Info padding | space-3 (12px) |
| Line 1 | Brand name. font-ui, color-text-secondary, title case |
| Line 2 | Item title. font-body, color-text-primary |
| Line 3 | Price. font-ui, color-text-primary |
| Hover | Border shifts to color-text-primary |

### Toggle (Buy/Sell)

| Property | Value |
|---|---|
| Container | Background color-surface (#F3F2EF), border-radius radius-sm (4px) |
| Active tab | Background color-text-primary (#2D2D2D), text color-white |
| Inactive tab | Background transparent, text color-text-secondary (#6B6B6B) |
| Transition | 200ms ease |

### Status chips

| Status | Fill | Text | Border |
|---|---|---|---|
| Pending | transparent | color-status-pending (#92600A) | 1px color-status-pending |
| Live | transparent | color-status-live (#15803D) | 1px color-status-live |
| Rejected | transparent | color-status-rejected (#DC2626) | 1px color-status-rejected |
| Sold | color-text-primary (#2D2D2D) | color-white | none |
| Expired | transparent | color-status-expired (#71717A) | 1px color-status-expired |
| Hidden | transparent | color-status-hidden (#5E6B7A) | 1px color-status-hidden |

All status chips: radius-sm (4px), text-caption (12px), Inter Medium 500. Minimum height: 28px (to meet 44px touch target when paired with sufficient tap area on the row).

### Navigation drawer

Revealed by the hamburger icon. Slides in from the left.

| Property | Value |
|---|---|
| Width | 280px (mobile), 320px (tablet+) |
| Background | color-white (#FFFFFF) |
| Overlay | color-text-primary (#2D2D2D) at 40% opacity behind drawer |
| Border right | 1px solid color-border (#E5E4E1) |
| Nav items | font-body, color-text-primary, space-4 (16px) vertical padding |
| Active item | color-text-primary, left 2px solid color-text-primary, background color-surface |
| Close trigger | Tap overlay or swipe left |

### Modal

Used for: rejection detail, listing confirmation, destructive action prompts. Not for task flows longer than 3 steps.

| Property | Value |
|---|---|
| Overlay | color-text-primary (#2D2D2D) at 50% opacity |
| Container background | color-white (#FFFFFF) |
| Border radius | radius-sm (4px) |
| Max width | 480px, full-width on mobile with 16px margin each side |
| Padding | space-5 (24px) |
| Heading | text-h3 (Inter Medium 500, 18px) |
| Body | text-body (Inter Regular 400, 16px), color-text-secondary |
| Actions | Right-aligned primary + secondary button row, space-3 (12px) gap |
| Close | Top-right × button, 44×44px tap target |

### Bottom sheet

Slides up from the bottom edge on mobile. Used for: listing submission confirmation, photo quality advisory, and other single-task flows that do not require a full page.

| Property | Value |
|---|---|
| Background | color-canvas (#FAF9F7) |
| Border radius | radius-sm (4px) top-left and top-right, 0 on bottom corners |
| Overlay | color-text-primary (#2D2D2D) at 50% opacity |
| Padding | space-7 (48px) top, space-5 (24px) sides, space-7 (48px) bottom |
| Close | X icon button, position: absolute, top-right (top: 12px, right: 12px), 44×44px tap target, color-text-secondary. No drag handle. |
| Heading | text-h3 (Inter Medium 500, 18px), color-text-primary |
| Body | 15px Inter Regular 400, color-text-secondary, line-height 1.5 |
| CTAs | Stacked full-width: primary button on top, text-link below. Never side-by-side. |
| Transition | transform 200ms ease |

The 48px top padding creates clearance for the close button. Do not reduce it.

#### Photo quality advisory variant

Adds a flagged photo preview above the heading.

| Property | Value |
|---|---|
| Preview image | Full-width, 4:3 aspect ratio, color-surface background, radius-sm |
| Preview label | Absolute top-left chip: rgba(45,45,45,0.6) background, color-white, Inter Medium 500, 11px, radius-sm, 2px 6px padding |
| Phone frame height | Minimum 600px when showcasing — the sheet with preview is ~577px tall and will be clipped at shorter heights |

### Toast / feedback banner

Single-line feedback. Appears at the top of the screen, below the nav. Auto-dismisses after 4s. One at a time.

| Property | Value |
|---|---|
| Background | color-text-primary (#2D2D2D) |
| Text | color-white, font-ui (Inter Medium 500, 14px) |
| Border radius | radius-sm (4px) |
| Padding | space-3 (12px) vertical, space-4 (16px) horizontal |
| Max width | 480px, centred |
| Dismiss | Optional × on right. Auto-dismiss at 4s. |

Error toasts: color-white background, 1px solid color-status-rejected border, color-status-rejected text.

### Empty state

Visual layout for zero-result browse screens and empty seller dashboards.

| Property | Value |
|---|---|
| Illustration area | 120×120px, color-surface background, radius-sm. TBD: placeholder icon or asset. |
| Heading | text-h3, color-text-primary, centred |
| Body | text-body-sm, color-text-secondary, centred, max 280px width |
| CTA | Primary button, centred, space-6 (32px) top margin |
| Top margin | space-8 (64px) from page top |

---

## Voice and tone

Playful and familiar. Like a friend who has good taste and doesn't take herself too seriously. Short sentences, sentence case, exclamation marks welcome. Warm but not saccharine. When something goes wrong: say what happened, help them fix it, give a timeline.

### Copy samples

| Context | Copy |
|---|---|
| Under review | All good so far! We'll review your listing and get back to you within a day. |
| Empty browse | Nothing to see here? Try a different filter, or check back later! We're adding new stuff all the time. |
| Rejection (bad photos) | We couldn't see the item clearly enough. Try retaking your photos in natural light and resubmit. We'll review it again within 24 hours! |
| Rejection (missing details) | Almost there! A few details are missing. Fill those in and resubmit, and we'll take another look within 24 hours. |
| WhatsApp prefill | Hi! I saw your [item title] on Reloved and I'm interested. |

---

## Do's and don'ts

1. **Do** keep the UI neutral so product photos are the focal point.
2. **Don't** use accent colours. Monochrome with warm neutrals is the identity.
3. **Do** use the brand gradient for splash, onboarding, social, and landing hero only.
4. **Don't** place the gradient behind product listings or functional UI.
5. **Do** use Fraunces for the wordmark and section headings only. Everything else is Inter.
6. **Don't** use rounded-full or pill shapes on primary buttons. Buttons are always sharp.
7. **Do** use sentence case everywhere. No all-caps except internal labels.
8. **Don't** use em dashes anywhere in copy or UI strings.
9. **Do** keep transitions to 200ms or less. Movement should be barely perceptible.
10. **Don't** introduce any of the items listed in Anti-goals below.

---

## Anti-goals

Do not add, propose, or reference:

- Accent colours
- Rounded buttons
- Em dashes
- In-app chat
- In-app payments
- User authentication UI (beyond phone verification)
- Commission or fees
- Native app patterns (bottom tab bar, native modals)

---

## TBD tracker

| Item | Status | Notes |
|---|---|---|
| Tagline | TBD | Shortlist of four under consideration |
| Gradient asset files | TBD | Warm and dark variants to be provided at /assets/. Fallback: color-canvas (#FAF9F7) warm / #1A1A18 dark. |
| Empty state illustration | TBD | 120×120px placeholder asset for zero-result and empty dashboard states |
| Dark mode | Out of scope v1 | See Dark mode section — do not implement until spec is written |
