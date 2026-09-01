# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A FoundryVTT **module** (not a system) that adds GM/player tooling on top of the third-party
`lancer` game system. Five loosely coupled features share one entry point:

1. **Talent Dice Tracker** — die-tracking automation for LANCER talents
2. **Talent Trigger Weapons** — synthetic `mech_weapon` items that mirror die state
3. **Deployable Workshop** — alternate deployable sheet, builder, templates, Comp/Con sync protection
4. **NPC ↔ Player Transmuter** — manual converter between `npc_feature` and `mech_weapon`/`mech_system`, plus homebrew presets
5. **Save Prompts** and **NPC Feature Status Tracking**

## Build / test / lint

**There is no build step, no package manager, no test suite, and no linter.** Verified: no
`package.json`, no bundler config, no CI workflows, no `.md` docs, no `node_modules`. Foundry loads
`scripts/main.mjs` directly as an ES module (`module.json` → `esmodules`), and every other file is
imported from there with relative `./*.mjs` paths. Do not introduce a build step or transpilation —
the source files *are* the shipped artifact.

Consequences:
- Only browser/Foundry globals are available (`game`, `ui`, `canvas`, `Hooks`, `foundry.utils`,
  `Dialog`, `Application`, `ChatMessage`, jQuery `$`). No npm imports, no TypeScript.
- Syntax errors surface only at runtime in the Foundry console.
- "Testing" means loading the module in a real Foundry world (see below).

### Running it in Foundry

Foundry data on this machine: `C:\Users\delta\AppData\Local\FoundryVTT\Data`
(`systems/lancer` is installed at v2.11.1; `modules/` holds the other LANCER modules).

The module folder in `Data/modules/` **must be named `lancer-fabricator-main`**, not
`lancer-fabricator`. The `module.json` id was deliberately changed to `lancer-fabricator-main`
(commit `8ba2a1c`) because GitHub archives extract as `<repo>-<branch>`, and Foundry requires the
folder name to equal the module id. All runtime asset/template paths are built as
`modules/lancer-fabricator-main/...`, so a mismatched folder name produces silent 404s on templates
and status icons.

To iterate: symlink/junction (or copy) this repo into `Data/modules/lancer-fabricator-main`, then
reload the world. Editing `.mjs` requires a full page reload (F5); Foundry hot-reloads `.css` and
`.hbs` in place. Watch the console for lines prefixed `lancer-fabricator-main |` — the module logs
its init, flow registration, talent-weapon sync, and status registration.

Version bumps go in `module.json` only. Commit subjects follow `vX.Y.Z: <summary>` for releases.

## Entry point and hook flow

`scripts/main.mjs` is the only file Foundry loads. It imports everything else and wires up:

- **`init`** — registers the deployable sheet (`Actors.registerSheet`), three world settings, the
  `preUpdateActor` sync-protection hook, NPC status hooks, then publishes the **public API**.
- **`lancer.registerFlows`** (LANCER-specific) — injects custom attack-flow steps.
- **`ready`** — chat listeners for save cards, custom status registration, and a pass over every
  owned `mech` actor to initialize die trackers and sync talent weapons. Also opens the module
  socket (`module.lancer-fabricator-main`) used to re-render open apps on other clients.
- **`getSceneControlButtons`** — adds three buttons to the token control group.
- **`updateActor` / `createItem` / `deleteItem`** — re-run `initializeTrackers` + `syncTalentWeapons`
  when a mech's effects/pilot/loadout change, or when a talent item is added/removed from a pilot
  (which then fans out to every mech linked to that pilot).

### The public API is load-bearing

Everything is re-exported onto `game.modules.get("lancer-fabricator-main").api`. This is not just a
convenience: `scripts/macros.mjs` generates Foundry Macro documents whose script bodies are
**strings** that call `fab.decrementDie(...)`, `fab.getTalentDie(...)`, etc. Those macros are saved
in the user's world, so **renaming or removing an API function silently breaks macros players
already created**. Add to the API rather than reshaping it.

`MODULE_ID = "lancer-fabricator-main"` is redeclared as a local const in all 13 script files. There
is no shared constants module — a rename means editing every file (see commit `8ba2a1c`).

## Persistence model

No custom data models or database tables. State lives in exactly two places:

**Actor/Item flags** (namespace `lancer-fabricator-main`):
| Flag | On | Written by |
| --- | --- | --- |
| `talentDice.<talentId>` | mech actor | `talent-dice-tracker.mjs` |
| `receivedLeadershipDice` | mech actor | Leader die distribution |
| `stormbringerUsedRound` | mech actor | flow integration (1/round guard) |
| `overrides` | deployable actor | `deployable-sync.mjs` |
| `talentWeapon` | `mech_weapon` item | `talent-weapons.mjs` (marks synthetic weapons) |
| `status` | `npc_feature` item | `npc-status-tracker.mjs` |
| `transmuted` / `preset` / `sourceUuid` | created items | transmuter & presets |
| `savePrompt` | ChatMessage | `save-prompts.mjs` (card state) |

**World settings** (all `config: false`, GM-only, no settings UI):
`deployableTemplates`, `transmuterLog`, `customNpcStatuses`.

Note the dot-notation write in `setDieState`: `actor.setFlag(MODULE_ID, "talentDice.<id>", state)`
targets one talent key to avoid read-modify-write races between concurrent talent updates.

## App / sheet class hierarchy

All classes use the **v1 Application API** (`getData` + `activateListeners` + jQuery), not
ApplicationV2:

- `Application` → `TalentDiceApp` (`talent-dice-app.mjs`), `TransmuterApp` (`transmuter-app.mjs`)
- `ActorSheet` → `FabricatorDeployableSheet` (`deployable-sheet.mjs`), registered via
  `Actors.registerSheet(..., { types: ["deployable"], makeDefault: false })` so it coexists with the
  system's own deployable sheet
- `FormApplication` → `NpcStatusConfigDialog` (`npc-status-config.mjs`)

`TalentDiceApp` is one-per-actor, tracked in an `openApps` Map in `main.mjs`; `TransmuterApp` is a
module-level singleton. Both patch `close()` to remove themselves from the registry. Everything else
is an ad-hoc `new Dialog({...})` with an HTML string — this codebase builds most of its UI as
template literals in JS, not as `.hbs` files.

## Templates and Handlebars

Four `.hbs` files, each referenced directly by absolute path in a class's `defaultOptions.template`:

```js
template: `modules/${MODULE_ID}/templates/talent-dice-app.hbs`
```

There is **no `loadTemplates()` call, no `Handlebars.registerPartial`, and no
`Handlebars.registerHelper`** anywhere in this repo. Consequences:

- No partials — do not write `{{> ...}}`, it will not resolve.
- `templates/talent-dice-app.hbs` uses `{{#if (eq def.special "transcendent_lock")}}`. The `eq`
  helper comes from the **LANCER system**, which registers it. Any helper you use must already be
  registered by Foundry core or by LANCER; register your own in the `init` hook if you need more.
- `transmuter.hbs` uses native `<template id="transmuter-template-*">` elements cloned at runtime by
  `TransmuterApp._addEntry()` for dynamically added damage/range/tag/action rows. That is the
  established pattern for repeatable form rows — not re-rendering the Application.

## Localization

`lang/en.json` exists and is registered in `module.json`, but **it is entirely dead code**: there are
zero calls to `game.i18n.localize`/`format` and zero `{{localize}}` invocations across `scripts/` and
`templates/`. Every user-facing string is hardcoded English in JS template literals and `.hbs`.

If you touch UI strings, match the surrounding code (hardcode) unless you are deliberately migrating
the module to i18n — in which case migrate a whole feature at once and backfill `en.json`, which is
already partially populated with the `FABRICATOR.*` key tree.

## Building LANCER documents (the fabrication path)

The LANCER system rejects or mis-renders partially populated `system` objects, so this module keeps
**full skeletons** rather than relying on system defaults.

- **`buildMechSystemData(overrides)`** in `scripts/item-presets.mjs` is the single source of truth
  for a `mech_system` `system` block. It `mergeObject`s overrides onto a skeleton containing every
  field LANCER expects (`profiles`, `size`, `counters`, `bonuses`, `synergies`, `integrated`,
  `deployables`, …). Both `ITEM_PRESETS` and `TransmuterApp._readMechSystemData()` go through it.
  If LANCER adds a required field, add it here once.
- **`buildProfile(data)`** in `scripts/talent-weapons.mjs` and `_emptyProfile()` in
  `transmuter-app.mjs` play the same role for `mech_weapon` profiles. Weapon type lives on the
  *profile* (`system.profiles[system.selected_profile_index].type`), never on the item root;
  weapon size lives on the item root (`system.size`). `flow-integration.mjs` documents both paths.
- **Vehicles** (`createVehicle`): mech stats come from a **Frame item**, not the mech actor. The
  order matters — create the world Frame item → `Actor.create({type: "mech"})` →
  `createEmbeddedDocuments("Item", [frame.toObject()])` → `actor.update({"system.loadout.frame":
  embeddedFrame.uuid})`. Setting stats on the actor does nothing (commit `fc5c58a`).
- **Actor links** are written as UUID strings (`actor.update({"system.pilot": pilot.uuid})`) but read
  back as resolved documents via `.value` (`mech.system.pilot.value`). Do not mix the two.
- Every creation path also posts a `.fabricator-chat-card` ChatMessage; the transmuter additionally
  appends to the `transmuterLog` world setting (capped at 200 entries).

## Talent dice subsystem

Everything is **mech-centric** (rewritten in `6f86be6`; the old pilot-centric version was broken).

- `talent-dice-data.mjs` — the registry. Each entry declares one of three `PATTERN`s:
  `COUNTDOWN` (starts high, fires a trigger ability at min), `COUNTUP` (accumulates, spent for
  effects), `POOL` (Leader/Orator; distributable, size derived from talent rank).
- **Detection**: `detectMechTalents()` reads the mech's **Active Effects** — the LANCER system
  propagates pilot talent bonuses onto the mech as inherited effects whose names contain the talent
  display name — with a fallback that walks `mech.system.pilot.value.items` for `talent` items
  matching by `system.lid`. Die state is stored on the **mech**, never the pilot.
- `initializeTrackers()` is idempotent and also *prunes* flags for talents no longer detected.
- `talent-weapons.mjs` creates synthetic dual-profile `mech_weapon` items (Knockout Blow, Massive
  Attack) on the mech, modeled on the Barbarossa's Apocalypse Rail: profile 0 "Uncharged" (no
  damage, description shows die progress), profile 1 "Charged". `selected_profile_index` flips when
  the die hits its minimum. These are flagged `talentWeapon: <talentId>` for identification and
  cleanup; anything with that flag is module-owned and will be overwritten or deleted on sync.

### Flow integration

`flow-integration.mjs` hooks `lancer.registerFlows(flowSteps, flows)` and inserts two steps:
`fabricatorPreAttack` before `showAttackHUD`, `fabricatorPostAttack` after `rollAttacks`, into
`WeaponAttackFlow` and `BasicAttackFlow`.

The header comment explains why this route was chosen: LANCER's AccDiffHUD plugin system needs
io-ts/fp-ts codecs, which are impractical from plain JS, so the module reads `state.data.hit_results`
after the roll instead. Post-attack it never mutates dice silently — it builds a list of
*suggestions* with pre-checked boxes and a confirmation dialog, since weapon-type detection is
heuristic.

**Every step is wrapped in try/catch and returns `true` on failure.** Preserve this: returning false
or throwing would abort the user's attack flow. Failures degrade to manual dice management.

The `console.log` noise throughout `talent-weapons.mjs` and `flow-integration.mjs` was added
deliberately (commit `82156e0`) to diagnose sync/registration problems; leave it unless asked.

## NPC feature status subsystem

Three-file split: `npc-status-data.mjs` (34 frozen built-in definitions + lookup maps by id and
`lid`), `npc-status-effects.mjs` (structured `EFFECT_PRESETS` schema plus `analyzeFeatureText()`, a
regex pattern-matcher that *suggests* effects from a feature's prose), `npc-status-tracker.mjs`
(runtime), `npc-status-config.mjs` (GM dialog + `customNpcStatuses` setting and merged lookup).

Mechanics worth knowing before editing:
- Statuses are pushed into **`CONFIG.statusEffects`** with `id` prefixed `fab_` and name prefixed
  `[F] `, so they appear in the token HUD. Registration is re-run on LANCER's
  `lancer.statusInitComplete` / `lancer.statusesReady` hooks *and* on `ready` for custom ones,
  because LANCER rebuilds the array. Registration always checks for an existing id first.
- Truth lives on the **item flag**; the ActiveEffect is a mirror. `createActiveEffect` /
  `deleteActiveEffect` hooks map a token-HUD toggle back onto the owning `npc_feature` item, and
  `syncTokenStatuses(actor)` pushes item flags back out to effects. A module-level `_syncing`
  boolean guards against the resulting re-entrancy — set it around every programmatic
  `toggleStatusEffect`/`setFlag` inside these paths or you will get infinite loops.
- `TARGET_REF` statuses additionally register a per-source `fab_applied_<statusId>_<actorId>` status
  on the *target* actor so the mark is visible on the target's token.
- `registerStatusHooks()` also emits into an `actionQueue.buildMetaPills` hook. Nothing installed
  provides that hook — it is an integration point for a separate action-queue consumer, so pill code
  is currently inert.
- `NpcStatusConfigDialog` (`openStatusConfig`) has **no in-app entry point**; it is reachable only
  through the module API or a macro. Statuses without a `system.lid` cannot be tracked.

## Deployable sync protection

`deployable-sync.mjs` implements the Comp/Con-overwrite guard: edits made through the Fabricator
sheet call `saveOverride(actor, path, value)` (restricted to a `PROTECTABLE_PATHS` allowlist), and a
`preUpdateActor` hook re-injects those values into any incoming update that touches them. The escape
hatch is `options.fabricatorEdit` — **every write the module makes to a deployable must pass
`{ fabricatorEdit: true }`**, or it will be reverted by its own hook. `applyTemplate()` and every
`_on*` handler in `FabricatorDeployableSheet` already do this.

## CSS

One 2000-line `styles/fabricator.css`. Two class prefixes coexist by vintage: `fabricator-*` in the
older features and `fab-*` in the NPC status code. Match whichever prefix the surrounding feature
uses. Chat card markup is generated in JS, so its class names must stay in sync with this file.
