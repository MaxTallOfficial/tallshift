# Tallshift design system

Updated 2026-11-05. The user approved the initial system on 2026-10-27 and explicitly authorised a Hallmark refinement on 2026-11-05. Style and component composition may change; the existing colours must stay.

## Locked brand

Use the approved values from `prototype/src/foundations/tokens.ts`, `getSaffronTheme('light')`. Saffron Lighter #EBD183, hover #F0DB9B, pressed #D8BE74. Preserve the dark canvas, panels, raised/inset surfaces, text and status pairs. Do not replace these with a Hallmark theme or inject a second accent.

Manrope is the approved UI family for English, Russian and Vietnamese. Code uses the system monospace slot. Hugeicons Duotone Rounded is the only interface icon source, through SystemIcon/SystemDisclosureIcon. Transferable material uses host-renderer slots.

## Style and hierarchy

The material is the product. Preview first; title and description second; metadata last. Reserve accent for the main action, active choice and meaningful status. Avoid coloured fragments inside headings, uppercase announcing labels, repeated decorative dots and identical containers for unrelated roles.

The component has a surface when it groups an actual task or object. A specimen explaining a component uses a quiet rule and whitespace instead of another card. Keep headings in one colour, one weight and a clear hierarchy. Product remains the featured offer through its border, price and primary action; other offers use the same background.

Shared spacing rhythm is represented by semantic.space tokens in system-tokens.ts. CSS defaults live in system-material.css for scoped theme consumers. Border compensation and centering formulas are optical exceptions, not arbitrary spacing steps.

## Controls

Keep the shared toolbar height (desktop 52px, mobile 48px) so buttons, tabs, fields and adjacent actions align. Standalone utility buttons can be 36px on desktop; coarse pointer targets are 44px. Information affordances can use the inline density. Do not infer size from neighbours.

Focus uses the scoped input-modality tracker. Pointer activation does not leave a focus halo; keyboard activation shows one immediate visible ring. Invalid and selected states remain independent. Preserve read-only, disabled, pending, error and recovery behaviours. Text labels remain usable without icons.

## Behaviour and boundaries

Preserve existing routes, field IDs, handlers, exports, pricing and access logic. The system review includes intentional local demonstrations; those do not imply server persistence or payment readiness. Existing product-screen work is outside this refinement's feature scope.

Use tokens for fonts and colours; no custom SVG or text-symbol icons. Honour reduced motion and forced colours. Verify real rendering on narrow screens and all three locales before claiming a release.
