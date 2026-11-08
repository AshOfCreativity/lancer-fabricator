/**
 * Actor Refresh - re-pull compendium items onto existing actors.
 *
 * The LANCER system's LCP Manager refreshes compendium entries on re-import
 * but never touches actors already built from the old data. This module
 * closes that gap: for each item on the actor whose source compendium entry
 * has changed, offer a per-item opt-in to overwrite the actor's copy while
 * preserving per-instance state (destroyed, loaded, uses, counters, module
 * flags).
 */

const MODULE_ID = "lancer-fabricator-main";

/**
 * Paths inside item.system that are per-instance state and must NOT be
 * overwritten by the compendium pull.
 */
const PRESERVE_SYSTEM_PATHS = [
  "destroyed",
  "cascading",
  "loaded",
  "uses",
  "charged",
  "equipped",
  "destroyed_counter"
];

/**
 * Return the source compendium UUID of an item, or null.
 * Supports v10/v11 (flags.core.sourceId) and v12 (_stats.compendiumSource).
 */
function getSourceUuid(item) {
  return item?._stats?.compendiumSource
    ?? item?.flags?.core?.sourceId
    ?? null;
}

/**
 * Collect every item on the actor that has a compendium source, with its
 * current and source data.
 */
export async function collectRefreshable(actor) {
  const rows = [];
  for (const item of actor.items) {
    const sourceUuid = getSourceUuid(item);
    if (!sourceUuid) {
      rows.push({
        itemId: item.id,
        name: item.name,
        type: item.type,
        sourceUuid: null,
        status: "no-source",
        source: null,
        changed: false
      });
      continue;
    }

    let source = null;
    try {
      source = await fromUuid(sourceUuid);
    } catch (err) {
      console.warn(`${MODULE_ID} | source fetch failed for ${item.name}`, err);
    }

    if (!source) {
      rows.push({
        itemId: item.id,
        name: item.name,
        type: item.type,
        sourceUuid,
        status: "source-missing",
        source: null,
        changed: false
      });
      continue;
    }

    const changed = itemDiffersFromSource(item, source);
    rows.push({
      itemId: item.id,
      name: item.name,
      type: item.type,
      sourceUuid,
      status: changed ? "stale" : "up-to-date",
      source,
      changed
    });
  }
  return rows;
}

/**
 * Compare an actor's item to its compendium source, ignoring fields we would
 * preserve on refresh (per-instance state) and fields that are structurally
 * noise (_id, ownership, folder). Returns true if the source has meaningful
 * differences.
 */
function itemDiffersFromSource(item, source) {
  const a = stripInstanceFields(item.toObject());
  const b = stripInstanceFields(source.toObject());
  return !foundry.utils.objectsEqual(a, b);
}

function stripInstanceFields(obj) {
  const copy = foundry.utils.deepClone(obj);
  delete copy._id;
  delete copy.ownership;
  delete copy.folder;
  delete copy.sort;
  delete copy._stats;
  delete copy.flags;
  for (const p of PRESERVE_SYSTEM_PATHS) {
    if (copy.system) delete copy.system[p];
  }
  return copy;
}

/**
 * Build the update payload for a single item, taking fresh data from the
 * compendium source but preserving per-instance state + flags from the
 * actor's current copy.
 */
function buildItemUpdate(current, source) {
  const fresh = source.toObject();
  const cur = current.toObject();

  // Take compendium data wholesale
  const update = foundry.utils.deepClone(fresh);

  // Keep the actor's _id, ownership, folder, sort position, and flag bag
  update._id = cur._id;
  delete update.ownership;
  delete update.folder;
  delete update.sort;
  update.flags = cur.flags ?? {};

  // Re-stamp the compendium source so the refresh link is preserved
  if (cur._stats?.compendiumSource) {
    update._stats = { ...(update._stats ?? {}), compendiumSource: cur._stats.compendiumSource };
  }

  // Preserve per-instance system state
  if (cur.system && update.system) {
    for (const p of PRESERVE_SYSTEM_PATHS) {
      if (p in cur.system) update.system[p] = cur.system[p];
    }
  }

  return update;
}

/**
 * Apply refresh for the given item ids. Returns the count actually updated.
 */
export async function applyRefresh(actor, itemIds, rowsCache) {
  const rows = rowsCache ?? await collectRefreshable(actor);
  const byId = new Map(rows.map(r => [r.itemId, r]));

  const updates = [];
  for (const id of itemIds) {
    const row = byId.get(id);
    if (!row?.source) continue;
    const current = actor.items.get(id);
    if (!current) continue;
    updates.push(buildItemUpdate(current, row.source));
  }

  if (updates.length === 0) return 0;
  await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

/**
 * Open the refresh dialog for an actor.
 */
export async function showRefreshDialog(actor) {
  const rows = await collectRefreshable(actor);
  const stale = rows.filter(r => r.status === "stale");
  const upToDate = rows.filter(r => r.status === "up-to-date");
  const sourceMissing = rows.filter(r => r.status === "source-missing");
  const noSource = rows.filter(r => r.status === "no-source");

  const row = r => `
    <tr>
      <td><input type="checkbox" name="refresh" value="${r.itemId}" ${r.status === "stale" ? "checked" : ""} ${r.status !== "stale" ? "disabled" : ""} /></td>
      <td>${escHtml(r.name)}</td>
      <td class="fab-ar-type">${escHtml(r.type)}</td>
      <td class="fab-ar-status fab-ar-${r.status}">${statusLabel(r.status)}</td>
    </tr>
  `;

  const content = `
    <div class="fab-actor-refresh">
      <p class="fab-ar-intro">Select items to overwrite with current compendium data. Per-instance state (destroyed, loaded, uses, counters, module flags) is preserved.</p>
      <table class="fab-ar-table">
        <thead>
          <tr><th></th><th>Item</th><th>Type</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${stale.map(row).join("")}
          ${upToDate.map(row).join("")}
          ${sourceMissing.map(row).join("")}
          ${noSource.map(row).join("")}
        </tbody>
      </table>
      <div class="fab-ar-summary">
        <span>${stale.length} stale</span>
        <span>${upToDate.length} up-to-date</span>
        ${sourceMissing.length ? `<span>${sourceMissing.length} source missing</span>` : ""}
        ${noSource.length ? `<span>${noSource.length} no source</span>` : ""}
      </div>
    </div>
  `;

  return new Promise(resolve => {
    new Dialog({
      title: `Refresh Items from Compendium — ${actor.name}`,
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-sync"></i>',
          label: "Apply",
          callback: async html => {
            const ids = Array.from(html.find('input[name="refresh"]:checked')).map(el => el.value);
            const n = await applyRefresh(actor, ids, rows);
            ui.notifications.info(`Refreshed ${n} item${n === 1 ? "" : "s"} on ${actor.name}.`);
            resolve(n);
          }
        },
        selectAllStale: {
          label: "Select all stale",
          callback: html => {
            html.find('input[name="refresh"]:not(:disabled)').prop("checked", true);
            return false;
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(0)
        }
      },
      default: "apply",
      close: () => resolve(0)
    }, {
      width: 560,
      classes: ["lancer", "fab-actor-refresh-dialog"]
    }).render(true);
  });
}

function statusLabel(s) {
  switch (s) {
    case "stale":          return "Stale (refresh available)";
    case "up-to-date":     return "Up to date";
    case "source-missing": return "Source compendium entry missing";
    case "no-source":      return "No source link";
    default:               return s;
  }
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Register the sheet header button hook. Call once from main.mjs on init.
 */
export function registerActorRefreshHooks() {
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    const actor = sheet.actor;
    if (!actor) return;
    if (!["pilot", "mech", "npc", "deployable"].includes(actor.type)) return;

    buttons.unshift({
      label: "Refresh",
      class: "fab-actor-refresh-btn",
      icon: "fas fa-sync",
      onclick: () => showRefreshDialog(actor)
    });
  });
}
