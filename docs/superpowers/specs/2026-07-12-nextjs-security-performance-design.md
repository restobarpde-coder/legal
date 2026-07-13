# Next.js Security and Platform Performance Design

## Objective

Remove the known Next.js vulnerability warning and make navigation, dialogs, sheets, and page loading feel substantially faster across the authenticated platform without changing product behavior or data flows.

## Scope

- Upgrade Next.js from 15.2.4 to the patched 15.5.18 release.
- Preserve React 19 and the current App Router architecture.
- Improve navigation feedback and route prefetching across every dashboard destination.
- Avoid immediately stale data prefetches and redundant network work.
- Add consistent route-level loading feedback where it is missing.
- Reduce dialog, sheet, button, and navigation animation durations while preserving accessibility.
- Defer expensive modal content where doing so reduces initial page bundles without delaying the first visual response.
- Validate with TypeScript and a production build, and inspect all remaining warnings.

## Out of Scope

- Migrating to Next.js 16.
- Changing application workflows, authorization rules, database schema, or API response shapes.
- Broad Supabase query and index optimization before measurements show a remaining backend bottleneck.
- Redesigning the visual language of the platform.

## Approach

### Framework security

Pin `next` to `15.5.18` and regenerate the npm lockfile. This is the first Next.js 15 release patched against the May 2026 App Router middleware bypass follow-up. Dependency installation must not overwrite unrelated working-tree changes.

### Navigation

Keep Next.js `Link` navigation as the primary mechanism. Expand deliberate route prefetching to all main dashboard destinations, deduplicate requests, and retain hover/focus prefetch for less common routes. Navigation must give immediate visual feedback while the destination streams or loads.

Data prefetches will use a nonzero freshness interval so prefetched responses can be reused instead of being considered stale immediately. Failed prefetches must not prevent navigation.

### Loading states

Every main dashboard destination should have an immediate, layout-stable loading state. Shared loading UI should avoid large content shifts and should respect the existing shell so sidebar and header remain interactive during page transitions.

### Modals and motion

Dialog content should appear within roughly 100–150 ms, with overlays and transforms using compositor-friendly opacity and transform properties. Sheets should open and close in roughly 150–200 ms instead of the current 300–500 ms. General controls should avoid `transition-all` where a narrower transition is sufficient.

Motion will respect `prefers-reduced-motion`; users requesting reduced motion should receive effectively immediate state changes.

Heavy modal implementations may be dynamically imported, but their trigger must respond instantly and display a lightweight fallback until the content is ready. Small shared primitives remain eager to avoid creating unnecessary request boundaries.

## Error Handling

- Route and data prefetch failures remain non-blocking.
- Existing route error behavior remains unchanged.
- Build warnings are treated separately from errors: each warning will be identified and either corrected in scope or reported with its cause.
- If Next.js 15.5.18 introduces an incompatible configuration option, remove or replace only that option and document the adjustment.

## Verification

1. Confirm the installed and locked Next.js version is 15.5.18.
2. Run the TypeScript typecheck.
3. Run a production build and capture any warnings.
4. Verify dashboard navigation preserves the shell and displays immediate progress/loading feedback.
5. Verify representative dialogs and the mobile sheet open and close promptly.
6. Confirm reduced-motion behavior.
7. Ensure the pre-existing working-tree changes remain intact.

## Success Criteria

- The vulnerable Next.js version warning is removed.
- Production build completes successfully or any unrelated pre-existing blocker is clearly identified.
- Clicking a dashboard destination produces visible feedback immediately.
- Main routes no longer present an unexplained blank wait.
- Dialogs feel immediate and sheets no longer spend half a second opening.
- No authorization, persistence, or business workflow behavior changes.
