# Style guide

The judgement calls of the product's interface, one decision each with its reason. The interface
is not built here yet: these are the product decisions carried over from en-escena (its
`docs/agents/style-guide.md`), and each section grows with the first screen that needs it.

## Theme

- **Operational, not showcase**: light surfaces, sharp hierarchy, medium density, for screens
  read and filled in all day.
- **The base is shadcn/ui `radix-nova` on Tailwind 4** (see [shadcn.md](./shadcn.md)): base
  colour `neutral`, the Geist typeface (`@fontsource-variable/geist`) for body and headings alike,
  radius `0.625rem`. The tokens are en-escena's, in `src/styles.css`, light and `.dark`.
- **The brand colour is En Escena's green (`brand`, `#55c594`)**, an accent, not the primary:
  focus rings on fields, `link` buttons, progress.
- **Semantic colours are tokens**: `success`, `info`, `warning` beside `destructive`, for badges,
  alerts and toasts; a toast is coloured like its alert.
- **Tokens and variants before classes.** A colour, radius or state comes from a token or a
  component variant; `className` is for layout (grid, flex, gap, width, margin). A case with no
  token gets a one-off class; a second case gets a variant or a component. A new token, variant
  or typeface is a product decision, not a fix.
- **A state is a `Badge`**: a semantic variant (`success`, `info`, `warning`, `destructive`) when
  its meaning is stable, a neutral one otherwise.
- **A shadcn component before custom markup**, added when the case fits it, never installed
  without a use.

## Motion

- **A record's name morphs from its row in a list into its detail page's title**, and back on
  `Volver`: a 160 ms view transition of the name alone, while the rest of the page swaps at once,
  with no crossfade. Reduced motion makes it instant. It comes from en-escena (its record title and
  the `[data-record-title]` rules in `app/app.css`) and arrives with the first list and detail
  screens.

## Viewports

- **Design at 1440 px; everything works down to 1280 px.** At 1280 the admin sidebar leaves about
  1000 px: that is the budget of a table or a form row. Filters and actions sit above the list,
  never in a side panel.
- **Below 1280, nothing breaks**: content may scroll sideways, never overlap. No page
  `min-width`.
- **Phones:** the public program and the vote, and the portal screen by screen: one built or
  changed works at 390 px. The admin panel is desktop-only.

## Interface text

- **Spanish, Rioplatense, neutral and operational**: `Ingresá`, `Revisá`, `Completá`; no
  marketing tone.
- **A button names a verb and, where it helps, its object**: `Registrar pago`,
  `Publicar resultados`.
- **An empty state says why and what to do next; an error says what to correct**, with a generic
  message only as a fallback.
- **The admin uses [GLOSSARY.md](../../GLOSSARY.md)'s terms** (the `ui:` values), the portal no
  jargon that does not help; inside a sentence they are lowercase (`Nuevo bailarín`).
