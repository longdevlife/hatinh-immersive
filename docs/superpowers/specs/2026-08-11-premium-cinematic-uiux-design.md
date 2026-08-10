# Premium Cinematic UI/UX — Design Specification

**Date:** 2026-08-11  
**Status:** Proposed for user approval  
**Target:** Raise the public immersive experience from ~7.3/10 to **9.0+/10** without redesigning the product architecture.

## 1. Product intent

The experience should feel like a premium destination film that the visitor can enter and control, not a dashboard laid over a renderer.

The hierarchy is:

```text
Google 3D world / 360 panorama
        ↓
spatial destination content
        ↓
scene navigation + contextual hotspot content
        ↓
secondary utility controls
        ↓
MapLibre minimap
```

The renderer is always the hero. Chrome exists only to help the visitor orient, discover, navigate, share, or recover.

## 2. Chosen visual direction

**Direction A — Premium Cinematic**

Visual language:

- full-bleed renderer with restrained overlays;
- deep neutral/translucent surfaces rather than bright dashboard cards;
- strong but quiet scene identity;
- warm Hà Tĩnh accent used sparingly for selection and calls to action;
- small number of high-quality visual layers instead of many decorative effects;
- typography and spacing do more work than borders, gradients, or glow;
- controls feel like precision instruments, not app toolbar widgets.

Motion language:

- **Subtle luxury** by default;
- micro-interactions: 140–220 ms;
- surface enter/exit: 220–320 ms;
- scene/chrome transitions: 300–450 ms;
- easing should feel smooth and decelerated, never bouncy;
- `prefers-reduced-motion: reduce` removes non-essential transforms and animated travel.

No heavy parallax system, no ornamental particle effects, no autoplay camera choreography, and no new animation framework dependency.

## 3. Non-negotiable architecture constraints

This design must preserve `AGENTS.md` and `docs/ARCHITECTURE.md` invariants:

1. Google 3D remains the primary exploration surface.
2. MapLibre/minimap remains secondary and is collapsed by default.
3. Selecting another 3D location must not remount Google 3D.
4. Normal panorama scene navigation must not remount Photo Sphere Viewer.
5. Vendor SDK details stay behind adapter boundaries.
6. Panorama scene commit semantics, stale-request protection, and rollback behavior are unchanged.
7. UI work must not rewrite stable backend/media infrastructure.
8. No ad-hoc production network calls outside the generated API client boundary.
9. Presentation-only state remains local React state where possible.
10. No new runtime UI dependency is required for this polish pass.

## 4. 9+/10 scorecard

The work is not complete merely because CI passes. Final review should meet these minimum qualitative scores after visual QA:

| Dimension | Target |
| --- | ---: |
| Visual hierarchy | >= 9.2 |
| Aesthetic / modern premium feel | >= 9.2 |
| Immersive experience | >= 9.3 |
| Interaction design | >= 9.0 |
| Responsive behavior | >= 9.0 |
| Information density | >= 9.0 |
| Design-system consistency | >= 9.0 |
| Accessibility UX | >= 9.0 |
| Spatial 360 UX | >= 9.2 |
| Production polish | >= 9.0 |
| **Overall** | **>= 9.0** |

A single P0 spatial/interaction defect blocks the 9+ rating even if the arithmetic average is above 9.

## 5. Spatial hotspot architecture — P0

### Problem

`ExploreShell` currently renders panorama hotspots as absolute DOM elements whose `left/top` values are derived from yaw/pitch. This is not a valid spatial projection. Hotspots can drift from their intended world position when the viewer rotates, zooms, changes FOV, or changes viewport size.

### Design

Panorama hotspots must be owned by the panorama renderer adapter and anchored by native yaw/pitch coordinates through Photo Sphere Viewer `MarkersPlugin`.

The application-facing panorama boundary should expose renderer-agnostic hotspot operations, for example:

```ts
export interface PanoramaHotspot {
  id: string;
  label: string;
  type: 'info' | 'media' | 'navigation';
  yaw: number;
  pitch: number;
}

setHotspots(hotspots: PanoramaHotspot[]): void;
subscribeHotspotSelected(listener: (hotspotId: string) => void): () => void;
```

Exact names may follow existing domain naming, but vendor marker types must not leak through the port.

The Photo Sphere Viewer adapter maps degree values to the SDK's coordinate format and updates marker content without recreating the viewer.

### Marker appearance

- minimum interactive hit target: 44 × 44 CSS px;
- visual core: 28–34 px;
- single warm accent ring with restrained pulse only while idle;
- label is hidden by default and appears on hover/focus or when selected;
- selected marker receives a stronger ring/halo, not a dramatically larger card;
- labels must remain legible over bright and dark panorama regions using a compact dark translucent backing.

### Accessibility

- each marker has an accessible label equal to hotspot label;
- keyboard activation performs the same action as pointer activation;
- focus style is distinct from hover;
- marker selection opens the contextual hotspot surface and transfers focus appropriately.

## 6. Contextual hotspot content

### Desktop

Do not use a large dashboard-like side panel by default.

Use a **contextual cinematic sheet**:

- width: approximately 320–380 px;
- max height: 60–68vh;
- positioned near the right/bottom safe area, never covering the scene center;
- dark translucent surface with strong text hierarchy and minimal chrome;
- image/media may span the sheet width when available;
- one primary action maximum in the first viewport.

### Mobile

Use a bottom sheet:

- rounded top corners;
- max height around 72dvh;
- clear drag-handle visual, but dragging is not required in this milestone;
- scrollable content region;
- close button always reachable;
- no content hidden under browser safe areas.

### Focus lifecycle

When opened:

1. remember the invoking hotspot;
2. focus the sheet title or first meaningful control;
3. Escape closes the sheet;
4. focus returns to the invoking hotspot;
5. background controls remain semantically unavailable while modal behavior is active where appropriate.

No new focus-trap dependency should be introduced unless existing browser primitives prove insufficient.

## 7. Destination search

### Desktop >= 768 px

Keep the approved **icon-first** behavior.

Closed state:

- one circular search control;
- same optical size as share/fullscreen controls.

Open state:

- expands horizontally into a compact command field;
- width target: 280–360 px depending on available space;
- search results appear directly below in one restrained surface;
- opening focuses the input;
- Escape closes and restores focus to launcher;
- selecting a result closes search after location selection begins.

### Mobile < 768 px

Do not squeeze the search field into the utility-control row.

Opening search creates a **near-full-width command surface**:

- inset: 12–16 px from viewport sides;
- search input occupies the main row;
- locale/share/fullscreen controls visually yield while search is open;
- results may extend downward to a capped height with internal scrolling;
- close action is explicit and keyboard accessible;
- launcher focus is restored on close.

Search remains a presentation surface; location selection still flows through existing application callbacks.

## 8. Panorama scene navigation

The bottom scene navigation should read as a premium filmstrip, not a tab bar.

Behavior:

- current scene is unmistakable using shape + text emphasis, not color alone;
- only current/reachable route context should dominate;
- non-reachable scenes, if displayed for orientation, must be visually de-emphasized and not imply immediate navigation;
- horizontal scrolling is acceptable on mobile;
- selected scene stays scrolled into view after navigation;
- use scene preview thumbnails only when already available from existing node data; do not create a new media requirement.

Visual target:

- 44–52 px item height desktop;
- 48–56 px touch target mobile;
- compact translucent rail;
- active item uses warm accent and a subtle inner highlight;
- no thick borders or glowing neon treatment.

## 9. Minimap

Approved lifecycle is preserved exactly:

```text
collapsed → idle
expand → loading → ready
collapse → idle + renderer teardown
```

### Collapsed

- small floating circular launcher;
- visually subordinate to scene navigation and primary controls;
- no map renderer mounted;
- tooltip/accessible label: `Mở rộng bản đồ`.

### Expanded desktop

- target width: 280–320 px;
- target height: 200–240 px;
- header is compact and low contrast;
- active node and route receive clear emphasis;
- avoid competing with panorama content.

### Expanded mobile

- width uses available viewport with 12–16 px side inset;
- height should not exceed roughly 34dvh;
- must not overlap the primary scene navigation interaction zone.

## 10. Utility controls and chrome

Controls include search, locale, share, fullscreen, info, and return-to-3D.

Rules:

- icon buttons use a shared 44–48 px hit area;
- visual circle/pill may be smaller than hit area if padding preserves target size;
- one background treatment, one border treatment, one shadow model;
- hover, focus, pressed, disabled, and success states are specified consistently;
- share success feedback is inline and ephemeral, not a permanent layout shift;
- `Quay lại không gian 3D` is a quiet contextual action, not a competing primary CTA;
- network-quality status only appears when degraded/offline.

## 11. Design tokens and CSS ownership

### Ownership

Component-specific styles belong to the component/module stylesheet that owns the component. Global immersive CSS should only contain shell/layout primitives and intentional cross-module tokens.

The current duplicate definitions between global immersive styles and `ImmersiveControls.css` must be removed so cascade order is not a behavior dependency.

### Token families

Use or extend shared CSS variables for:

```text
surface-overlay-strong
surface-overlay-soft
border-overlay
text-primary-on-media
text-muted-on-media
accent-warm
shadow-floating
blur-control
radius-control
motion-fast
motion-base
motion-surface
ease-luxury
safe-area-inline
safe-area-bottom
```

Names should follow the repository's existing token convention rather than introducing a second token dialect.

Hard-coded `rgba()` is acceptable only for truly component-local optical corrections. Reusable colors/surfaces must be tokenized.

## 12. Typography

Do not add a remote font dependency for this milestone.

Typography should feel premium through scale, tracking, weight, contrast, and line length:

- destination/scene identity: stronger display scale, restrained weight;
- kickers/metadata: small uppercase or letter-spaced text used sparingly;
- body copy: comfortable line-height, max line length around 55–68 characters;
- buttons: concise labels; avoid verbose utility text on desktop chrome;
- Vietnamese diacritics must render cleanly at every chosen weight.

## 13. Motion system

Motion communicates hierarchy and state, not decoration.

Recommended values:

```css
--motion-fast: 160ms;
--motion-base: 240ms;
--motion-surface: 360ms;
--ease-luxury: cubic-bezier(0.22, 1, 0.36, 1);
```

Use cases:

- control hover/press: `motion-fast`;
- search expand/collapse: `motion-base`;
- contextual sheet enter/exit: `motion-surface`;
- minimap expand/collapse shell: `motion-surface` while renderer lifecycle remains independent;
- scene selection emphasis: `motion-base`.

With reduced motion:

- remove translate/scale choreography;
- preserve immediate opacity/state changes where needed;
- never delay functionality for animation completion.

## 14. Responsive requirements

Mandatory visual QA viewports:

| Viewport | Purpose |
| --- | --- |
| 1440 × 900 | large desktop cinematic composition |
| 1024 × 768 | laptop/tablet-landscape pressure test |
| 768 × 1024 | tablet portrait |
| 390 × 844 | mobile portrait |

At all four sizes:

- no horizontal page overflow;
- no control collision with safe areas;
- search can open without covering its own close action;
- minimap does not cover primary navigation controls;
- hotspot sheet never hides its title/close affordance;
- scene navigation stays operable;
- touch targets are >= 44 px where applicable;
- renderer remains visually dominant.

## 15. Accessibility acceptance criteria

- all interactive controls are reachable by keyboard;
- visible `:focus-visible` treatment on every interactive chrome control;
- Escape closes search and open contextual dialogs/sheets;
- focus returns to the invoker after close;
- dialogs/sheets have labelled semantic structure;
- active/current scene is expressed semantically (`aria-current`) and visually without color-only dependence;
- minimum intended text/control contrast meets WCAG AA for ordinary UI text;
- reduced-motion preference is respected;
- no hover-only required information.

## 16. Performance constraints

- no new heavy runtime dependency for visual polish;
- keep renderer SDKs lazy/dynamic as architecture currently intends;
- collapsed minimap must not mount MapLibre;
- hotspot integration must reuse the mounted Photo Sphere Viewer instance;
- do not add autoplay media or eager high-resolution media downloads;
- existing web bundle-budget gate must remain green;
- animations should stay on opacity/transform where practical and avoid layout thrashing.

## 17. Testing strategy

### Unit/component tests

Cover behavior, not exact CSS pixels:

- search launcher → open → input focus → Escape → focus return;
- mobile/desktop search semantics do not diverge functionally;
- contextual hotspot sheet opens/closes and restores focus;
- scene current-state semantics;
- minimap collapsed lifecycle remains `idle`;
- reduced-motion classes/tokens do not block interaction.

### Adapter tests

For panorama hotspot integration:

- domain hotspot coordinates map to renderer marker coordinates;
- updating hotspots does not recreate viewer;
- renderer hotspot click emits application hotspot ID;
- stale scene-load behavior remains unchanged.

### End-to-end tests

Keep current critical-path coverage and add assertions for:

- icon-first search on desktop;
- full-width mobile search surface;
- hotspot selection through the real panorama adapter when deterministic fixtures permit;
- keyboard Escape/focus restoration for search and hotspot content;
- minimap `idle → ready → idle` lifecycle.

### Visual QA artifact

Add a deterministic Playwright visual-capture step that captures the four mandatory viewports and uploads screenshots as a CI artifact. This milestone requires human visual sign-off; pixel-perfect snapshot diffing is optional and not required unless the fixtures prove stable enough.

## 18. Agent/path ownership

Engineering/orchestration owns:

- panorama domain port changes;
- Photo Sphere Viewer adapter integration;
- renderer lifecycle tests;
- integration/container wiring;
- CI/Playwright visual-capture plumbing.

Presentation/UI agent owns, within `AGENTS.md` boundaries:

- component markup/presentation under `*/ui/**`;
- module CSS;
- shared UI tokens in approved style paths;
- responsive behavior;
- motion and focus visuals;
- screenshot-driven visual refinements.

Merge-sensitive files and shared contracts require engineering coordination before modification.

## 19. Delivery sequence

The implementation should be delivered as independently reviewable vertical slices:

1. **Spatial correctness:** renderer-anchored panorama hotspots + tests.
2. **Interaction correctness:** search focus lifecycle + hotspot-sheet focus lifecycle.
3. **Responsive command surfaces:** mobile search and hotspot-sheet responsive behavior.
4. **Visual system consolidation:** control tokens, CSS ownership, consistent states.
5. **Cinematic polish:** scene rail, minimap treatment, typography, subtle motion.
6. **Visual QA:** deterministic screenshots at 1440/1024/768/390, defects fixed from evidence.
7. **Final verification:** full repository gates, bundle budget, deterministic MapLibre E2E, production smoke, dependency review.

Each slice must keep CI green before proceeding to the next review checkpoint.

## 20. Definition of done

The milestone is complete only when all conditions are true:

- no absolute DOM projection is used for panorama world hotspots;
- renderer hotspot positions remain correct while rotating/zooming panorama;
- desktop search is icon-first and compact;
- mobile search opens as a near-full-width command surface;
- search and contextual sheets restore focus to their invokers;
- minimap remains collapsed/idle by default and tears down on collapse;
- duplicate control CSS ownership is removed;
- all controls have coherent hover/focus/pressed behavior;
- reduced-motion behavior exists;
- all mandatory viewport screenshots have been reviewed;
- no P0/P1 visual or interaction issue remains from the review;
- full CI is green on the final head;
- final UI/UX review scores the experience **>= 9.0/10**.

## 21. Explicitly out of scope

- redesigning backend APIs;
- changing panorama media contracts or tiling strategy;
- replacing Google 3D, Photo Sphere Viewer, or MapLibre;
- a new CMS/admin workflow;
- a new animation framework;
- drag-to-dismiss bottom sheet physics;
- large-scale route/information-architecture changes;
- autoplay cinematic tours;
- pixel-perfect visual regression snapshots if deterministic screenshots are not stable enough.
