/**
 * Deployable Sync Protection
 *
 * Preserves manual customizations across Comp/Con imports by storing
 * overrides in actor flags and re-applying them when external updates
 * (non-Fabricator) attempt to overwrite protected fields.
 *
 * Flow:
 *   1. User edits stat via Fabricator sheet → saveOverride() stores path+value in flags
 *   2. Comp/Con sync fires updateActor → preUpdateActor hook intercepts
 *   3. Hook checks if update touches overridden paths → re-injects override values
 *   4. User clicks "Reset to Synced" → clearOverrides() removes all flags
 */

const MODULE_ID = "lancer-fabricator-main";
const OVERRIDES_KEY = "overrides";

/**
 * Paths that can be protected from sync overwrites.
 * Only stat/config paths — not name, img, or ownership.
 */
const PROTECTABLE_PATHS = [
  "system.stats.hp",
  "system.stats.armor",
  "system.stats.evasion",
  "system.stats.edef",
  "system.stats.heatcap",
  "system.stats.save",
  "system.stats.size",
  "system.stats.speed",
  "system.hp_bonus",
  "system.detail",
  "system.actions",
  "system.activation",
  "system.deactivation",
  "system.recall",
  "system.redeploy",
  "system.cost",
  "system.instances",
  "system.tags",
  "system.counters"
];

/**
 * Get all stored overrides for a deployable actor.
 * @param {Actor} actor
 * @returns {Object} Map of path -> value
 */
export function getOverrides(actor) {
  return actor.getFlag(MODULE_ID, OVERRIDES_KEY) || {};
}

/**
 * Check whether an actor has any active overrides.
 */
export function hasOverrides(actor) {
  const overrides = getOverrides(actor);
  return Object.keys(overrides).length > 0;
}

/**
 * Save an override for a specific data path.
 * Called when the user edits a field through the Fabricator sheet.
 *
 * @param {Actor} actor
 * @param {string} path - Dot-notation path (e.g. "system.stats.hp")
 * @param {*} value - The user's custom value
 */
export async function saveOverride(actor, path, value) {
  if (!PROTECTABLE_PATHS.includes(path)) return;
  const overrides = getOverrides(actor);
  overrides[path] = value;
  await actor.setFlag(MODULE_ID, OVERRIDES_KEY, overrides);
}

/**
 * Remove a single override, allowing the synced value to take effect.
 */
export async function removeOverride(actor, path) {
  const overrides = getOverrides(actor);
  delete overrides[path];
  await actor.setFlag(MODULE_ID, OVERRIDES_KEY, overrides);
}

/**
 * Clear all overrides — next Comp/Con sync will apply cleanly.
 */
export async function clearOverrides(actor) {
  await actor.unsetFlag(MODULE_ID, OVERRIDES_KEY);
}

/**
 * Get the list of overridden field paths for display.
 */
export function getOverriddenPaths(actor) {
  return Object.keys(getOverrides(actor));
}

/**
 * Register the preUpdateActor hook that enforces sync protection.
 * Call once during module init.
 */
export function registerSyncProtectionHook() {
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    // Only protect deployables
    if (actor.type !== "deployable") return;

    // Don't intercept edits from our own sheet
    if (options.fabricatorEdit) return;

    const overrides = getOverrides(actor);
    if (Object.keys(overrides).length === 0) return;

    let blocked = false;
    for (const [path, value] of Object.entries(overrides)) {
      if (foundry.utils.hasProperty(changes, path)) {
        foundry.utils.setProperty(changes, path, value);
        blocked = true;
      }
    }

    if (blocked) {
      console.log(`${MODULE_ID} | Sync protection: re-applied overrides for ${actor.name}`);
    }
  });
}
