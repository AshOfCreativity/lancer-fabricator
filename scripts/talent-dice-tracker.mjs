/**
 * Talent Dice Tracker
 *
 * Manages runtime state for talent dice — current values, persistence via actor flags,
 * and mutation methods (decrement, increment, spend, reset, distribute).
 */

import { TALENT_DICE, PATTERN, getTalentDie, getAllTrackedTalentIds } from "./talent-dice-data.mjs";

const MODULE_ID = "lancer-fabricator";
const FLAG_KEY = "talentDice";

/**
 * Get the stored die state for an actor
 * @param {Actor} actor
 * @returns {Object} Map of talentId -> { value, distributed?, locked? }
 */
export function getDieStates(actor) {
  return actor.getFlag(MODULE_ID, FLAG_KEY) || {};
}

/**
 * Get a single die state for an actor + talent
 * @param {Actor} actor
 * @param {string} talentId
 * @returns {Object|null} { value, distributed, locked }
 */
export function getDieState(actor, talentId) {
  const states = getDieStates(actor);
  return states[talentId] || null;
}

/**
 * Save die state for an actor + talent.
 * Uses dot-notation path to write only the targeted talent key,
 * avoiding read-modify-write races when multiple talents update concurrently.
 *
 * @param {Actor} actor
 * @param {string} talentId
 * @param {Object} state
 */
async function setDieState(actor, talentId, state) {
  await actor.setFlag(MODULE_ID, `${FLAG_KEY}.${talentId}`, state);
}

/**
 * Initialize die trackers for an actor based on their equipped talents.
 * Reads the actor's talent items and creates state entries for any that
 * match our tracked talent registry.
 *
 * @param {Actor} actor - A LANCER pilot actor
 * @returns {string[]} List of talent IDs that were initialized
 */
export async function initializeTrackers(actor) {
  if (actor.type !== "pilot") return [];

  const trackedIds = getAllTrackedTalentIds();
  const currentStates = getDieStates(actor);
  const initialized = [];

  // Find talents on the actor that match our registry
  const actorTalents = getActorTalentIds(actor);

  for (const talentId of actorTalents) {
    if (!trackedIds.includes(talentId)) continue;

    // Only initialize if no state exists yet
    if (!currentStates[talentId]) {
      const def = getTalentDie(talentId);
      const state = createInitialState(def, actor);
      await setDieState(actor, talentId, state);
      initialized.push(talentId);
    }
  }

  // Clean up trackers for talents the actor no longer has.
  // Uses unsetFlag with dot-notation to delete individual keys
  // without touching sibling talent states.
  for (const talentId of Object.keys(currentStates)) {
    if (!actorTalents.includes(talentId)) {
      await actor.unsetFlag(MODULE_ID, `${FLAG_KEY}.${talentId}`);
    }
  }

  return initialized;
}

/**
 * Extract talent IDs from a LANCER pilot actor.
 * LANCER stores talents as items on the actor with system.lid matching the talent ID.
 */
function getActorTalentIds(actor) {
  const talents = [];
  for (const item of actor.items) {
    if (item.type === "talent") {
      // LANCER uses system.lid for the canonical talent ID
      const lid = item.system?.lid;
      if (lid) talents.push(lid);
    }
  }
  return talents;
}

/**
 * Get the talent rank an actor has for a given talent
 */
function getActorTalentRank(actor, talentId) {
  for (const item of actor.items) {
    if (item.type === "talent" && item.system?.lid === talentId) {
      return item.system?.curr_rank || 1;
    }
  }
  return 0;
}

/**
 * Create initial state for a talent die
 */
function createInitialState(def, actor) {
  const state = {
    value: def.startValue,
    locked: false
  };

  // Pool pattern: set initial pool size based on rank
  if (def.pattern === PATTERN.POOL && def.rankPoolSize) {
    const rank = getActorTalentRank(actor, def.talentId);
    state.poolSize = def.rankPoolSize[rank] || def.rankPoolSize[1] || 0;
    state.value = def.talentId === "t_leader" ? state.poolSize : def.startValue;
    state.distributed = {}; // actorId -> count (for Leader)
  }

  return state;
}

// ============================================
// Mutation Methods
// ============================================

/**
 * Decrement a countdown die by 1
 * @returns {{ newValue: number, triggered: boolean }}
 */
export async function decrementDie(actor, talentId) {
  const def = getTalentDie(talentId);
  if (!def || def.pattern !== PATTERN.COUNTDOWN) return null;

  const state = getDieState(actor, talentId);
  if (!state) return null;

  // Iconoclast special: locked during transcendent state
  if (state.locked) {
    return { newValue: state.value, triggered: false, locked: true };
  }

  const newValue = Math.max(state.value - 1, def.minValue);
  const triggered = newValue === def.minValue;

  state.value = newValue;
  await setDieState(actor, talentId, state);

  await postDieChangeChat(actor, def, newValue, triggered);

  return { newValue, triggered };
}

/**
 * Increment a countup die
 * @returns {{ newValue: number, capped: boolean }}
 */
export async function incrementDie(actor, talentId, amount = null) {
  const def = getTalentDie(talentId);
  if (!def) return null;

  const state = getDieState(actor, talentId);
  if (!state) return null;

  const inc = amount ?? def.incrementAmount ?? 1;
  const newValue = Math.min(state.value + inc, def.maxValue);
  const capped = newValue === def.maxValue;

  state.value = newValue;
  await setDieState(actor, talentId, state);

  await postDieChangeChat(actor, def, newValue, false);

  return { newValue, capped };
}

/**
 * Spend dice from a pool or countup talent
 * @param {number|string} cost - Number of dice to spend, or "all"
 * @param {string} optionName - Name of the spend option used
 * @returns {{ newValue: number, spent: number }|null}
 */
export async function spendDice(actor, talentId, cost, optionName) {
  const def = getTalentDie(talentId);
  if (!def) return null;

  const state = getDieState(actor, talentId);
  if (!state) return null;

  const actualCost = cost === "all" ? state.value : cost;
  if (state.value < actualCost) return null;

  state.value -= actualCost;
  await setDieState(actor, talentId, state);

  await postSpendChat(actor, def, optionName, actualCost, state.value);

  return { newValue: state.value, spent: actualCost };
}

/**
 * Reset a die to its start value
 */
export async function resetDie(actor, talentId) {
  const def = getTalentDie(talentId);
  if (!def) return null;

  const state = getDieState(actor, talentId) || {};

  if (def.pattern === PATTERN.POOL && def.rankPoolSize) {
    const rank = getActorTalentRank(actor, def.talentId);
    state.poolSize = def.rankPoolSize[rank] || 0;
    state.value = def.talentId === "t_leader" ? state.poolSize : def.startValue;
    state.distributed = {};
  } else {
    state.value = def.startValue;
  }

  state.locked = false;
  await setDieState(actor, talentId, state);

  return state;
}

/**
 * Reset ALL dice for an actor (rest/Full Repair)
 */
export async function resetAllDice(actor) {
  const states = getDieStates(actor);
  for (const talentId of Object.keys(states)) {
    await resetDie(actor, talentId);
  }
}

/**
 * Use a countdown die's trigger ability (reset die after)
 */
export async function useTriggerAbility(actor, talentId) {
  const def = getTalentDie(talentId);
  if (!def || def.pattern !== PATTERN.COUNTDOWN) return null;

  const state = getDieState(actor, talentId);
  if (!state || state.value !== def.minValue) return null;

  // Roll trigger damage if applicable
  let rollResult = null;
  if (def.triggerDamage) {
    const roll = new Roll(def.triggerDamage);
    await roll.evaluate();
    rollResult = roll;
  }

  // Handle Iconoclast transcendent lock
  if (def.special === "transcendent_lock") {
    state.locked = true;
    state.value = def.startValue;
    await setDieState(actor, talentId, state);
    await postTriggerChat(actor, def, rollResult);
    return { rollResult, locked: true };
  }

  // Reset die to max
  state.value = def.startValue;
  await setDieState(actor, talentId, state);

  await postTriggerChat(actor, def, rollResult);
  return { rollResult, locked: false };
}

/**
 * Distribute a Leadership Die to an ally (Pattern C, Leader only)
 * @param {Actor} owner - The Leader actor
 * @param {Actor} target - The ally receiving the die
 */
export async function distributeDie(owner, targetActorId) {
  const def = getTalentDie("t_leader");
  if (!def) return null;

  const state = getDieState(owner, "t_leader");
  if (!state || state.value <= 0) return null;

  state.value -= 1;
  if (!state.distributed) state.distributed = {};
  state.distributed[targetActorId] = (state.distributed[targetActorId] || 0) + 1;
  await setDieState(owner, "t_leader", state);

  // Store the received die on the target actor's flags
  const targetActor = game.actors.get(targetActorId);
  if (targetActor) {
    const received = targetActor.getFlag(MODULE_ID, "receivedLeadershipDice") || 0;
    await targetActor.setFlag(MODULE_ID, "receivedLeadershipDice", received + 1);
  }

  await postDistributeChat(owner, targetActorId);

  return { remaining: state.value };
}

/**
 * Return a Leadership Die from an ally to the Leader
 */
export async function returnDie(owner, targetActorId) {
  const state = getDieState(owner, "t_leader");
  if (!state) return null;

  if (!state.distributed?.[targetActorId] || state.distributed[targetActorId] <= 0) return null;

  state.distributed[targetActorId] -= 1;
  state.value += 1;
  await setDieState(owner, "t_leader", state);

  const targetActor = game.actors.get(targetActorId);
  if (targetActor) {
    const received = targetActor.getFlag(MODULE_ID, "receivedLeadershipDice") || 0;
    await targetActor.setFlag(MODULE_ID, "receivedLeadershipDice", Math.max(0, received - 1));
  }

  return { remaining: state.value };
}

/**
 * Spend a received Leadership Die (called by the ally)
 */
export async function spendReceivedDie(allyActor, optionName) {
  const received = allyActor.getFlag(MODULE_ID, "receivedLeadershipDice") || 0;
  if (received <= 0) return null;

  await allyActor.setFlag(MODULE_ID, "receivedLeadershipDice", received - 1);

  const def = getTalentDie("t_leader");
  await postSpendChat(allyActor, def, optionName, 1, received - 1);

  return { remaining: received - 1 };
}

/**
 * Toggle Iconoclast transcendent lock
 */
export async function toggleTranscendentLock(actor, locked) {
  const state = getDieState(actor, "t_iconoclast");
  if (!state) return null;

  state.locked = locked;
  if (!locked) {
    // Exiting transcendent state resets die
    state.value = TALENT_DICE.t_iconoclast.startValue;
  }
  await setDieState(actor, "t_iconoclast", state);
  return state;
}

// ============================================
// Chat Messages
// ============================================

async function postDieChangeChat(actor, def, newValue, triggered) {
  const triggerText = triggered
    ? `<div class="fabricator-trigger-alert"><strong>${def.triggerEffect}</strong></div>`
    : "";

  const content = `
    <div class="fabricator-chat-card">
      <div class="fabricator-die-header">
        <strong>${def.dieName}</strong> — ${def.talentName}
      </div>
      <div class="fabricator-die-value">
        ${renderDiePips(newValue, def.maxValue, def.pattern)}
      </div>
      ${triggerText}
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [MODULE_ID]: { type: "dieChange", talentId: def.talentId } }
  });
}

async function postSpendChat(actor, def, optionName, cost, remaining) {
  const content = `
    <div class="fabricator-chat-card">
      <div class="fabricator-die-header">
        <strong>${def.dieName}</strong> — ${def.talentName}
      </div>
      <div class="fabricator-spend-info">
        <strong>${optionName}</strong> (spent ${cost} ${cost === 1 ? "die" : "dice"})
      </div>
      <div class="fabricator-die-value">
        ${remaining} remaining
      </div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [MODULE_ID]: { type: "dieSpend", talentId: def.talentId } }
  });
}

async function postTriggerChat(actor, def, rollResult) {
  let damageHtml = "";
  if (rollResult) {
    damageHtml = `
      <div class="fabricator-trigger-damage">
        Damage: <strong>${rollResult.total}</strong>
        ${def.triggerDamageType ? `(${def.triggerDamageType})` : ""}
        ${def.triggerTags?.length ? `[${def.triggerTags.join(", ")}]` : ""}
      </div>
    `;
  }

  const content = `
    <div class="fabricator-chat-card fabricator-trigger-card">
      <div class="fabricator-die-header">
        <strong>${def.dieName}</strong> — ${def.talentName}
      </div>
      <div class="fabricator-trigger-alert">
        <strong>${def.triggerEffect}</strong>
      </div>
      ${damageHtml}
      <div class="fabricator-die-value">
        Die reset to ${def.startValue}
      </div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [MODULE_ID]: { type: "dieTrigger", talentId: def.talentId } }
  });
}

async function postDistributeChat(owner, targetActorId) {
  const target = game.actors.get(targetActorId);
  const content = `
    <div class="fabricator-chat-card">
      <div class="fabricator-die-header">
        <strong>Leadership Dice</strong> — Leader
      </div>
      <div class="fabricator-spend-info">
        Issued die to <strong>${target?.name || "Unknown"}</strong>
      </div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: owner }),
    content,
    flags: { [MODULE_ID]: { type: "dieDistribute" } }
  });
}

// ============================================
// Rendering Helpers
// ============================================

/**
 * Render die pips as HTML for chat cards and UI
 */
export function renderDiePips(value, maxValue, pattern) {
  const pips = [];
  const displayMax = Math.min(maxValue, 10); // cap visual pips at 10
  for (let i = 1; i <= displayMax; i++) {
    const filled = i <= value;
    pips.push(`<span class="fabricator-pip ${filled ? "filled" : "empty"}"></span>`);
  }
  // For uncapped counters (Brutal), show numeric
  if (maxValue > 10) {
    return `<span class="fabricator-die-numeric">${value}</span>`;
  }
  return `<span class="fabricator-pips">${pips.join("")}</span> <span class="fabricator-die-label">${value}/${displayMax}</span>`;
}
