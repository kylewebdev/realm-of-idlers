# Realm of Idlers

## Monorepo

`vp run dev` (or `vp run @realm-of-idlers/game#dev`) starts the game. `vp run test -r` and `vp run build -r` run recursively across all packages.

## Architecture

Processor-based tick system, not ECS. Each 600ms tick dispatches the current action to a processor (`engine/src/processors/`), which returns a `TickResult` (XP, items, next action). `bridge.ts` wires state, renderers, input, and the game loop together.

State uses **Zustand + Immer middleware** — mutate via store action methods and Immer draft patterns, never spread/clone manually. `enableMapSet()` is required (state includes `Set<string>`).

Render loop (RAF) is separate from the tick loop. Offline catch-up runs missed ticks on tab refocus using `timestamps.lastTick`.

## UO Rendering Reference

ClassicUO source at `~/Code/ClassicUO`, UO Forever client at `/mnt/c/Program Files (x86)/UOForever/UO/`.

### Map Data Format (MUL files)

- Maps divided into **8×8 blocks**. Map 0 (Felucca/Britain): 7168×4096 tiles = 896×512 blocks.
- Each terrain cell: `{ tileID: u16, z: i8 }` — graphic ID + signed elevation (-128 to 127).
- Statics per block: `{ graphicID: u16, x: u8, y: u8, z: i8, hue: u16 }`.
- Index files (staidx) store offset+length into statics file per block.
- Key files: map0.mul (86MB), statics0.mul (257MB), tiledata.mul (3.1MB), texmaps.mul (29MB), artLegacyMUL.uop (216MB).

### Isometric Projection (from ClassicUO)

- Screen coords: `screenX = (X - Y) * 22`, `screenY = (X + Y) * 22 - Z * 4`
- Tile diamond: 44×44 pixels. Each Z level = 4px vertical offset.
- Depth sorting: `(X + Y) + (127 + priorityZ) * 0.01`
- Priority adjustments: lands get -2, surfaces/bridges get +1, background flag gets -1.

### Stretched Land (Terrain Deformation)

Each terrain tile samples 4 corner Z values:

- Top-left = own Z, Top-right = east neighbor, Bottom-left = south neighbor, Bottom-right = SE neighbor.
- Per-corner visual offset: `cornerZ * 4` pixels (in 2D) or `cornerZ * ELEV_SCALE` (in our 3D).
- Normal vectors computed via cross products for lighting.
- Tile is "stretched" when corners differ — enables smooth hills and slopes.

### Tile Flags (from tiledata.mul)

Background, Impassable, Surface, Wall, Roof, Foliage, Bridge, Translucent, Animation, Door, Wet.

### Asset Pipeline

- `scripts/extract-uo-map.ts` → reads MUL binaries → GameMapV2 JSON
- `scripts/build-terrain-assets.ts` → UO textures → `apps/game/public/tiles/`
- `scripts/build-sprite-assets.ts` → UO item art → `apps/game/public/sprites/`
- `scripts/build-asset-catalog.ts` → terrain + static catalogs in `packages/world/data/`

### Three.js ↔ UO Mapping

In Three.js we use real 3D: tile grid maps to X/Z plane, elevation maps to Y axis. The orthographic camera at an isometric angle provides the UO look. Three.js depth buffer handles sort order instead of manual priority calculation. Terrain is a heightmap mesh per chunk (9×9 vertices for 8×8 tiles) with per-vertex Y from elevation.

## Gotchas

- Quest system lives in `apps/game` (not a package) — check `quests/registry` and `quests/checker`.
- Three.js scene changes must sync with renderer managers (`TileRenderer`, `SpriteRenderer`, etc.).
- Forgetting to update `timestamps.lastTick` breaks offline catch-up.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->
