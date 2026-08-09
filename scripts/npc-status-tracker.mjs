import {
  NPC_STATUSES,
  STATUS_TYPE,
  getStatusDef,
  hasModifiersEquipped
} from "./npc-status-data.mjs";
import { getCustomStatuses, findStatusForFeatureMerged } from "./npc-status-config.mjs";

const MODULE_ID = "lancer-fabricator-main";

let _syncing = false;

// ─── Registration ───────────────────────────────────────────

export function registerNpcStatuses() {
  for (const status of NPC_STATUSES) {
    if (!CONFIG.statusEffects.find(s => s.id === status.id)) {
      CONFIG.statusEffects.push({
        id: status.id,
        name: `[F] ${status.name}`,
        img: status.icon
      });
    }
  }
  console.log(`${MODULE_ID} | Registered ${NPC_STATUSES.length} NPC feature statuses`);
}

export function registerCustomNpcStatuses() {
  let count = 0;
  try {
    const customs = getCustomStatuses();
    for (const [lid, statusDef] of Object.entries(customs)) {
      if (!CONFIG.statusEffects.find(s => s.id === statusDef.id)) {
        CONFIG.statusEffects.push({
          id: statusDef.id,
          name: `[F] ${statusDef.name}`,
          img: statusDef.icon
        });
        count++;
      }
    }
  } catch {
    // Settings not yet available
  }
  if (count > 0) {
    console.log(`${MODULE_ID} | Registered ${count} custom NPC feature statuses`);
  }
}

function getStatusDefMerged(statusId) {
  const builtIn = getStatusDef(statusId);
  if (builtIn) return builtIn;
  const customs = getCustomStatuses();
  for (const def of Object.values(customs)) {
    if (def.id === statusId) return def;
  }
  return null;
}

// ─── Flag Read/Write ────────────────────────────────────────

export function getFeatureStatus(item) {
  return item.getFlag(MODULE_ID, "status") ?? null;
}

export async function setFeatureStatus(item, state) {
  await item.setFlag(MODULE_ID, "status", state);
  const actor = item.parent;
  if (actor) await syncTokenStatuses(actor);
}

export async function clearFeatureStatus(item) {
  const current = getFeatureStatus(item);
  if (current?.target) await removeTargetStatusIcon(item, current.target);
  await item.unsetFlag(MODULE_ID, "status");
  const actor = item.parent;
  if (actor) await syncTokenStatuses(actor);
}

// ─── Toggle ─────────────────────────────────────────────────

export async function toggleFeatureStatus(item) {
  const current = getFeatureStatus(item);
  if (current?.active) {
    await clearFeatureStatus(item);
    return null;
  }

  const statusDefs = findStatusForFeatureMerged(item);
  if (statusDefs.length === 0) return null;
  const def = statusDefs[0];
  const state = buildDefaultState(def);
  await setFeatureStatus(item, state);

  if (def.statusType === STATUS_TYPE.TARGET_REF) {
    await promptTargetSelection(item);
  }

  return getFeatureStatus(item);
}

function buildDefaultState(statusDef) {
  const base = { active: true, statusId: statusDef.id };
  switch (statusDef.statusType) {
    case STATUS_TYPE.CHARGE:
      return { ...base, charges: 1 };
    case STATUS_TYPE.ACCUMULATOR:
      return { ...base, stacks: 0, max: statusDef.maxStacks ?? 8 };
    case STATUS_TYPE.STAGED:
      return { ...base, stage: 1, max: statusDef.maxStages ?? 3 };
    case STATUS_TYPE.DEFERRED:
      return { ...base, round: game.combat?.round ?? 0 };
    case STATUS_TYPE.TARGET_REF:
      return { ...base, target: null };
    default:
      return base;
  }
}

// ─── Status Modification ────────────────────────────────────

export async function setStatusStacks(item, stacks) {
  const current = getFeatureStatus(item);
  if (!current?.active) return;
  await item.setFlag(MODULE_ID, "status", { ...current, stacks });
}

export async function setStatusStage(item, stage) {
  const current = getFeatureStatus(item);
  if (!current?.active) return;
  const max = current.max ?? 3;
  if (stage > max) {
    await clearFeatureStatus(item);
    return;
  }
  await item.setFlag(MODULE_ID, "status", { ...current, stage });
}

export async function setStatusTarget(item, targetData) {
  const current = getFeatureStatus(item);
  if (!current?.active) return;
  await item.setFlag(MODULE_ID, "status", { ...current, target: targetData });
  if (targetData) await applyTargetStatusIcon(item, targetData);
}

export async function promptTargetSelection(item) {
  const status = getFeatureStatus(item);
  if (!status?.active) return;
  const def = getStatusDefMerged(status.statusId);
  if (!def || def.statusType !== STATUS_TYPE.TARGET_REF) return;

  const targets = game.user.targets;
  if (targets.size === 1) {
    const target = targets.first();
    await setStatusTarget(item, {
      actorId: target.actor?.id ?? null,
      tokenId: target.id,
      name: target.name
    });
    return;
  }

  if (!canvas?.tokens) return;

  const sourceActorId = item.parent?.id;
  const sceneTokens = canvas.tokens.placeables
    .filter(t => t.actor && t.actor.id !== sourceActorId)
    .map(t => ({ tokenId: t.id, actorId: t.actor?.id, name: t.name }));

  if (sceneTokens.length === 0) {
    ui.notifications.warn("No valid targets on the scene");
    return;
  }

  const options = sceneTokens.map(t =>
    `<option value="${t.tokenId}">${t.name}</option>`
  ).join("");

  return new Promise((resolve) => {
    new Dialog({
      title: `Select Target: ${def.name}`,
      content: `
        <form>
          <div class="form-group">
            <label>Target for ${def.name}</label>
            <select name="targetToken">${options}</select>
          </div>
          <p class="notes">Or target a token first, then toggle the status — it will auto-select.</p>
        </form>`,
      buttons: {
        select: {
          icon: '<i class="fas fa-crosshairs"></i>',
          label: "Set Target",
          callback: async (html) => {
            const tokenId = html.find('[name="targetToken"]').val();
            const token = canvas.tokens.get(tokenId);
            if (token) {
              await setStatusTarget(item, {
                actorId: token.actor?.id ?? null,
                tokenId: token.id,
                name: token.name
              });
            }
            resolve();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Skip",
          callback: () => resolve()
        }
      },
      default: "select"
    }).render(true);
  });
}

// ─── Target Applied Icons ──────────────────────────────────

const APPLIED_PREFIX = "fab_applied_";

function getAppliedStatusId(sourceStatusId, sourceActorId) {
  return `${APPLIED_PREFIX}${sourceStatusId}_${sourceActorId}`;
}

async function applyTargetStatusIcon(item, targetData) {
  const status = getFeatureStatus(item);
  if (!status?.active) return;
  const def = getStatusDefMerged(status.statusId);
  if (!def) return;

  const targetActor = game.actors.get(targetData.actorId);
  if (!targetActor) return;

  const appliedId = getAppliedStatusId(def.id, item.parent?.id);
  const sourceName = item.parent?.name ?? "NPC";

  if (!CONFIG.statusEffects.find(s => s.id === appliedId)) {
    CONFIG.statusEffects.push({
      id: appliedId,
      name: `[F] ${def.name} (by ${sourceName})`,
      img: def.icon
    });
  }

  _syncing = true;
  try {
    const existing = targetActor.effects.find(e => e.statuses.has(appliedId));
    if (!existing) {
      await targetActor.toggleStatusEffect(appliedId, { active: true });
    }
  } finally {
    _syncing = false;
  }
}

async function removeTargetStatusIcon(item, targetData) {
  if (!targetData?.actorId) return;
  const status = getFeatureStatus(item);
  const statusId = status?.statusId;
  if (!statusId) return;

  const targetActor = game.actors.get(targetData.actorId);
  if (!targetActor) return;

  const appliedId = getAppliedStatusId(statusId, item.parent?.id);
  _syncing = true;
  try {
    const existing = targetActor.effects.find(e => e.statuses.has(appliedId));
    if (existing) {
      await targetActor.toggleStatusEffect(appliedId, { active: false });
    }
  } finally {
    _syncing = false;
  }
}

// ─── Token Status Sync ─────────────────────────────────────

export async function syncTokenStatuses(actor) {
  if (_syncing || !actor || actor.type !== "npc") return;
  _syncing = true;
  try {
    const activeStatusIds = new Set();
    for (const item of actor.items) {
      if (item.type !== "npc_feature") continue;
      const status = getFeatureStatus(item);
      if (status?.active && status.statusId) {
        activeStatusIds.add(status.statusId);
      }
    }

    const allDefs = [...NPC_STATUSES];
    try {
      for (const def of Object.values(getCustomStatuses())) {
        if (!allDefs.find(d => d.id === def.id)) allDefs.push(def);
      }
    } catch { /* settings not ready */ }

    for (const statusDef of allDefs) {
      const shouldBeActive = activeStatusIds.has(statusDef.id);
      const currentEffect = actor.effects.find(e => e.statuses.has(statusDef.id));
      const isActive = !!currentEffect;

      if (shouldBeActive && !isActive) {
        await actor.toggleStatusEffect(statusDef.id, { active: true });
      } else if (!shouldBeActive && isActive) {
        await actor.toggleStatusEffect(statusDef.id, { active: false });
      }
    }
  } finally {
    _syncing = false;
  }
}

// ─── Query ──────────────────────────────────────────────────

export function getActiveStatuses(actor) {
  if (!actor) return [];
  const results = [];
  for (const item of actor.items) {
    if (item.type !== "npc_feature") continue;
    const status = getFeatureStatus(item);
    if (!status?.active) continue;
    const def = getStatusDefMerged(status.statusId);
    if (!def) continue;
    results.push({
      item,
      status,
      def,
      modifiers: def.modifierLids ? hasModifiersEquipped(actor, def) : []
    });
  }
  return results;
}

export function getActiveStatusesForAction(actor, actionItem) {
  if (!actor || !actionItem) return [];
  return getActiveStatuses(actor);
}

export function buildStatusPill(activeStatus) {
  const { def, status, modifiers } = activeStatus;
  let label = def.name;

  if (status.stacks != null && status.stacks > 0) {
    label += ` (${status.stacks})`;
  }
  if (status.stage != null) {
    label += ` [${status.stage}/${status.max}]`;
  }
  if (status.target?.name) {
    label += ` → ${status.target.name}`;
  }
  if (modifiers.length > 0) {
    label += ` +${modifiers.map(m => m.name).join(", +")}`;
  }

  return { label, statusId: def.id, where: def.where };
}

// ─── Hook Registration ─────────────────────────────────────

export function registerStatusHooks() {
  Hooks.on("lancer.statusInitComplete", registerNpcStatuses);
  Hooks.on("lancer.statusesReady", registerNpcStatuses);

  Hooks.on("createActiveEffect", async (effect, options, userId) => {
    if (_syncing || game.user.id !== userId) return;
    const actor = effect.parent;
    if (!actor || actor.type !== "npc") return;
    for (const statusId of effect.statuses) {
      if (!statusId.startsWith("fab_")) continue;
      const def = getStatusDefMerged(statusId);
      if (!def) continue;
      const feature = findFeatureForStatus(actor, def);
      if (!feature) continue;
      const current = getFeatureStatus(feature);
      if (!current?.active) {
        _syncing = true;
        try {
          await feature.setFlag(MODULE_ID, "status", buildDefaultState(def));
        } finally {
          _syncing = false;
        }
      }
    }
  });

  Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
    if (_syncing || game.user.id !== userId) return;
    const actor = effect.parent;
    if (!actor || actor.type !== "npc") return;
    for (const statusId of effect.statuses) {
      if (!statusId.startsWith("fab_")) continue;
      const def = getStatusDefMerged(statusId);
      if (!def) continue;
      const feature = findFeatureForStatus(actor, def);
      if (!feature) continue;
      const current = getFeatureStatus(feature);
      if (current?.active) {
        _syncing = true;
        try {
          await feature.unsetFlag(MODULE_ID, "status");
        } finally {
          _syncing = false;
        }
      }
    }
  });

  Hooks.on("actionQueue.buildMetaPills", (pills, item, holder) => {
    const actor = holder?.actor;
    if (!actor || actor.type !== "npc") return;
    const activeStatuses = getActiveStatuses(actor);
    for (const activeStatus of activeStatuses) {
      pills.push(buildStatusPill(activeStatus));
    }
  });
}

function findFeatureForStatus(actor, statusDef) {
  const lids = statusDef.lids ?? (statusDef.lid ? [statusDef.lid] : []);
  return actor.items.find(i =>
    i.type === "npc_feature" && lids.includes(i.system?.lid)
  ) ?? null;
}
