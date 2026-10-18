# shadcn/ui in this repo

The visual base is en-escena's: shadcn/ui style `radix-nova` on the Radix primitives, base colour
`neutral`, the `lucide` icon set, on Tailwind 4. The configuration is `components.json`;
`pnpm exec shadcn info --json` prints what the CLI resolves from it (`base: radix`, preset font
`geist`). The tokens and the font live in `src/styles.css`; what each component should look like
is [style-guide.md](./style-guide.md). This file is about the tooling.

- **Components live in `src/components/ui/`**, imported through the `#/components/ui` alias. None
  is in the tree yet: add a component when a screen needs it, not in advance. The first `add` also
  writes `src/lib/utils.ts` (`cn`).
- **Radix, not Base UI.** Every component imports from `radix-ui`. The one exception, when it
  arrives, is `combobox`: shadcn's Combobox is built on `@base-ui/react` in both bases, since
  Radix has none. That import is not the start of a migration.
- **Read the CLI's output, do not apply it blindly.** `pnpm exec shadcn add <name> --view` (or
  `--diff` for a file already here) shows what it would write. As of CLI 4.21 it rewrites the
  utils import to `import { cn } from "cn"`, and on a real `add` it also installs the unrelated
  `cn` package from npm. Correct the import to `#/lib/utils`, and `pnpm remove cn` if it
  appeared in `package.json`.
- **`font-heading`, not `cn-font-heading`.** Registry files carry `cn-*` tokens (`cn-font-heading`,
  `cn-menu-target`, `cn-menu-translucent`, `cn-rtl-flip`) that the CLI resolves from
  `components.json`'s `iconLibrary`, `menuColor`, `menuAccent` and `rtl`; headings use the
  `font-heading` utility `src/styles.css` defines.
- **Port en-escena's version, not upstream's, when a component already exists there.** Its
  `docs/agents/shadcn.md` lists the deliberate divergences (the `brand` focus ring on fields, the
  `success` / `info` / `warning` variants of `badge` and `alert`, and others); a component brought
  over carries its divergence with it.
- **Local edits are kept.** A component file edited here is the repo's version. Record a
  deliberate divergence in a comment at the top of the file, with its reason, so the next sync
  does not undo it; a blind `--overwrite` discards it.
