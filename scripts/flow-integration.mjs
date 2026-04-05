/**
 * Flow Integration
 *
 * Hooks into the LANCER system's attack flow pipeline to:
 *   1. Auto-update talent dice after attacks (post-roll step)
 *   2. Inject a pre-roll prompt for spendable dice (Leadership Die, etc.)
 *
 * The LANCER AccDiffHUD plugin system requires io-ts/fp-ts codecs, which
 * aren't practical from a plain JS module. Instead we:
 *   - Insert a custom step BEFORE showAttackHUD to prompt talent die spends
 *   - Insert a custom step AFTER rollAttacks to read hit/miss/crit results
 *     and auto-update the relevant die trackers
 *
 * Entry point: call registerFabricatorFlows() from the lancer.registerFlows hook.
 */

import { TALENT_DICE, PATTERN, getTalentDie } from "./talent-dice-data.mjs";
import {
  getDieState,
  getDieStates,
  decrementDie,
  incrementDie,
  spendDice,
  spendReceivedDie,
  useTriggerAbility
} from "./talent-dice-tracker.mjs";

const MODULE_ID = "lancer-fabricator-main";

/**
 * Register our custom flow steps into the LANCER system.
 * Called from the lancer.registerFlows hook, which passes (flowSteps, flows).
 *
 * @param {Map} flowSteps - LANCER's step registry
 * @param {Map} flows - LANCER's flow class registry
 */
export function registerFabricatorFlows(flowSteps, flows) {
  try {
    // Register our step implementations
    flowSteps.set("fabricatorPreAttack", fabricatorPreAttackStep);
    flowSteps.set("fabricatorPostAttack", fabricatorPostAttackStep);

    // Insert into WeaponAttackFlow
    const WeaponAttackFlow = flows.get("WeaponAttackFlow");
    if (WeaponAttackFlow?.insertStepBefore && WeaponAttackFlow?.insertStepAfter) {
      WeaponAttackFlow.insertStepBefore("showAttackHUD", "fabricatorPreAttack");
      WeaponAttackFlow.insertStepAfter("rollAttacks", "fabricatorPostAttack");
      console.log(`${MODULE_ID} | Registered steps in WeaponAttackFlow`);
    } else {
      console.warn(`${MODULE_ID} | WeaponAttackFlow not found or missing step methods — skipping weapon attack integration`);
    }

    // Insert into BasicAttackFlow (grapple, ram, improvised)
    const BasicAttackFlow = flows.get("BasicAttackFlow");
    if (BasicAttackFlow?.insertStepAfter) {
      BasicAttackFlow.insertStepAfter("rollAttacks", "fabricatorPostAttack");
      console.log(`${MODULE_ID} | Registered steps in BasicAttackFlow`);
    } else {
      console.warn(`${MODULE_ID} | BasicAttackFlow not found — skipping basic attack integration`);
    }

    console.log(`${MODULE_ID} | Flow integration registered`);
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to register flow steps — talent dice will work in manual mode only`, err);
  }
}

// ============================================
// Pre-Attack Step: Offer talent die spends
// ============================================

/**
 * Before the attack HUD opens, check if the pilot has spendable dice
 * that affect accuracy and prompt the player.
 */
async function fabricatorPreAttackStep(state, options) {
  try {
    const actor = state.actor;
    if (!actor) return true;

    // Find the pilot (could be mech actor attacking)
    const pilot = actor.type === "mech"
      ? game.actors.get(actor.system?.pilot?.id)
      : actor.type === "pilot" ? actor : null;

    if (!pilot) return true;

    const offers = [];

    // Check for received Leadership Dice (this pilot has dice from a Leader)
    const receivedDice = pilot.getFlag(MODULE_ID, "receivedLeadershipDice") || 0;
    if (receivedDice > 0) {
      offers.push({
        id: "leadership_accuracy",
        label: `Spend Leadership Die for +1 Accuracy (${receivedDice} available)`,
        talentName: "Leader",
        type: "accuracy",
        execute: async () => {
          await spendReceivedDie(pilot, "+1 Accuracy");
          // Inject +1 accuracy into the attack state
          state.data.acc_diff = state.data.acc_diff || {};
          const currentAcc = state.data.acc_diff.accuracy || 0;
          state.data.acc_diff.accuracy = currentAcc + 1;
        }
      });
    }

    // Check for Orator dice (self-spend for Investigate: +1 Accuracy equivalent)
    const oratorState = getDieState(pilot, "mf_orator");
    if (oratorState && oratorState.value >= 2) {
      offers.push({
        id: "orator_investigate",
        label: `Spend 2 Orator Dice: Investigate (roll twice, take higher) — ${oratorState.value} available`,
        talentName: "Orator",
        type: "reroll",
        execute: async () => {
          await spendDice(pilot, "mf_orator", 2, "Investigate");
          // Flag the state so post-attack knows to apply "roll twice" logic
          state[MODULE_ID] = state[MODULE_ID] || {};
          state[MODULE_ID].oratorInvestigate = true;
        }
      });
    }

    if (offers.length === 0) return true;

    // Show prompt dialog
    const chosen = await showPreAttackPrompt(offers);
    for (const offer of chosen) {
      await offer.execute();
    }

    return true;
  } catch (err) {
    console.error(`${MODULE_ID} | Pre-attack step failed, continuing without talent dice prompt`, err);
    return true;
  }
}

/**
 * Dialog prompting the player to optionally spend talent dice before attacking.
 * Returns array of selected offers.
 */
async function showPreAttackPrompt(offers) {
  return new Promise((resolve) => {
    const checkboxes = offers.map(o =>
      `<div class="form-group fabricator-preattack-option">
        <label>
          <input type="checkbox" name="${o.id}" />
          <strong>${o.talentName}:</strong> ${o.label}
        </label>
      </div>`
    ).join("");

    new Dialog({
      title: "Talent Dice — Pre-Attack",
      content: `
        <form class="fabricator-preattack-form">
          <p class="fabricator-preattack-hint">Spend talent dice on this attack?</p>
          ${checkboxes}
        </form>
      `,
      buttons: {
        confirm: {
          label: "Attack",
          icon: '<i class="fas fa-crosshairs"></i>',
          callback: (html) => {
            const selected = offers.filter(o =>
              html.find(`[name="${o.id}"]`).is(":checked")
            );
            resolve(selected);
          }
        },
        skip: {
          label: "Skip",
          callback: () => resolve([])
        }
      },
      default: "confirm",
      close: () => resolve([])
    }).render(true);
  });
}

// ============================================
// Post-Attack Step: Auto-update dice on results
// ============================================

/**
 * After attack rolls resolve, read hit/miss/crit results
 * and auto-update relevant talent dice.
 */
async function fabricatorPostAttackStep(state, options) {
  try {
    const actor = state.actor;
    if (!actor) return true;

    const pilot = actor.type === "mech"
      ? game.actors.get(actor.system?.pilot?.id)
      : actor.type === "pilot" ? actor : null;

    if (!pilot) return true;

    const hitResults = state.data?.hit_results || [];
    if (hitResults.length === 0) return true;

    const states = getDieStates(pilot);
    const anyHit = hitResults.some(r => r.hit);
    const anyMiss = hitResults.some(r => !r.hit);

    const weaponType = getWeaponType(state);
    const weaponSize = getWeaponSize(state);

    // Collect suggested die updates — player confirms all at once
    const suggestions = [];

    // --- Brutal: increment on miss ---
    if (states.t_brutal && anyMiss) {
      const missCount = hitResults.filter(r => !r.hit).length;
      suggestions.push({
        id: "brutal_miss",
        talentId: "t_brutal",
        label: `Brutal Die: +${missCount} (missed ${missCount} attack${missCount > 1 ? "s" : ""})`,
        action: "increment",
        amount: missCount,
        checked: true
      });
    }

    // --- Brutal: spend on hit ---
    if (states.t_brutal && anyHit) {
      const brutalState = getDieState(pilot, "t_brutal");
      if (brutalState?.value > 0) {
        suggestions.push({
          id: "brutal_spend",
          talentId: "t_brutal",
          label: `Brutal Die: spend ${brutalState.value} accumulated for bonus on this hit`,
          action: "spend",
          cost: "all",
          optionName: "Bonus on hit",
          checked: false
        });
      }
    }

    // --- Gunslinger: decrement on hit with Auxiliary Ranged ---
    if (states.t_gunslinger && anyHit) {
      const gsState = getDieState(pilot, "t_gunslinger");
      const looksAuxRanged = weaponSize === "aux" && weaponType !== "Melee";
      suggestions.push({
        id: "gunslinger_hit",
        talentId: "t_gunslinger",
        label: `Gunslinger Die: -1 (hit with Auxiliary Ranged) — currently ${gsState?.value || "?"}`,
        hint: !looksAuxRanged ? `Detected: ${weaponSize || "?"} ${weaponType || "?"}` : null,
        action: "decrement",
        checked: looksAuxRanged
      });
    }

    // --- Duelist: increment on hit with Main Melee ---
    if (states.t_duelist && anyHit) {
      const dState = getDieState(pilot, "t_duelist");
      const looksMainMelee = weaponSize === "main" && weaponType === "Melee";
      suggestions.push({
        id: "duelist_hit",
        talentId: "t_duelist",
        label: `Blademaster Dice: +1 (hit with Main Melee) — currently ${dState?.value || "?"}/${TALENT_DICE.t_duelist.maxValue}`,
        hint: !looksMainMelee ? `Detected: ${weaponSize || "?"} ${weaponType || "?"}` : null,
        action: "increment",
        amount: 1,
        checked: looksMainMelee
      });
    }

    // --- Stormbringer: decrement on hit with Launcher ---
    if (states.t_stormbringer && anyHit) {
      const stState = getDieState(pilot, "t_stormbringer");
      const looksLauncher = weaponType === "Launcher";
      const usedThisRound = pilot.getFlag(MODULE_ID, "stormbringerUsedRound") === game.combat?.round;
      const hint = usedThisRound
        ? "Already used Stormbending this round"
        : (!looksLauncher ? `Detected: ${weaponType || "?"}` : null);
      suggestions.push({
        id: "stormbringer_hit",
        talentId: "t_stormbringer",
        label: `Torrent Die: -1 (Stormbending, hit with Launcher) — currently ${stState?.value || "?"}`,
        hint,
        action: "decrement",
        checked: looksLauncher && !usedThisRound
      });
    }

    // --- Trigger weapon used: offer to fire the trigger ability and reset die ---
    const talentWeaponId = state.item?.getFlag?.(MODULE_ID, "talentWeapon");
    if (talentWeaponId && states[talentWeaponId]) {
      const twDef = getTalentDie(talentWeaponId);
      const twState = getDieState(pilot, talentWeaponId);
      if (twDef && twState && twState.value === twDef.minValue) {
        suggestions.push({
          id: "trigger_weapon_" + talentWeaponId,
          talentId: talentWeaponId,
          label: `${twDef.dieName}: Use ${twDef.triggerEffect.split("—")[0].trim()} and reset die`,
          action: "trigger",
          checked: true
        });
      }
    }

    // --- Brawler: decrement on basic attack (grapple/ram/improvised) ---
    if (states.t_brawler && !state.item && anyHit) {
      const brState = getDieState(pilot, "t_brawler");
      suggestions.push({
        id: "brawler_basic",
        talentId: "t_brawler",
        label: `Brawler Die: -1 (Grapple/Ram/Improvised Attack) — currently ${brState?.value || "?"}`,
        hint: "Detected basic attack — uncheck if this wasn't a grapple, ram, or improvised attack",
        action: "decrement",
        checked: true
      });
    }

    if (suggestions.length === 0) return true;

    const confirmed = await showPostAttackConfirmation(suggestions);

    for (const item of confirmed) {
      if (item.action === "increment") {
        const times = item.amount || 1;
        for (let i = 0; i < times; i++) {
          await incrementDie(pilot, item.talentId);
        }
      } else if (item.action === "decrement") {
        await decrementDie(pilot, item.talentId);
        if (item.talentId === "t_stormbringer" && game.combat) {
          await pilot.setFlag(MODULE_ID, "stormbringerUsedRound", game.combat.round);
        }
      } else if (item.action === "spend") {
        await spendDice(pilot, item.talentId, item.cost, item.optionName);
      } else if (item.action === "trigger") {
        await useTriggerAbility(pilot, item.talentId);
      }
    }

    return true;
  } catch (err) {
    console.error(`${MODULE_ID} | Post-attack step failed, continuing without talent dice update`, err);
    return true;
  }
}

/**
 * Show post-attack confirmation with checkboxes for each suggested die update.
 * Player can uncheck any they don't want, or check ones they do.
 * Returns only the confirmed (checked) suggestions.
 */
async function showPostAttackConfirmation(suggestions) {
  return new Promise((resolve) => {
    const rows = suggestions.map(s => {
      const hintHtml = s.hint
        ? `<span class="fabricator-suggestion-hint">${s.hint}</span>`
        : "";
      return `<div class="form-group fabricator-suggestion">
        <label>
          <input type="checkbox" name="${s.id}" ${s.checked ? "checked" : ""} />
          ${s.label}
        </label>
        ${hintHtml}
      </div>`;
    }).join("");

    new Dialog({
      title: "Talent Dice — Post-Attack",
      content: `
        <form class="fabricator-postattack-form">
          <p class="fabricator-postattack-hint">Detected talent die triggers. Confirm or adjust:</p>
          ${rows}
        </form>
      `,
      buttons: {
        confirm: {
          label: "Apply",
          icon: '<i class="fas fa-check"></i>',
          callback: (html) => {
            const confirmed = suggestions.filter(s =>
              html.find(`[name="${s.id}"]`).is(":checked")
            );
            resolve(confirmed);
          }
        },
        skip: {
          label: "Skip All",
          callback: () => resolve([])
        }
      },
      default: "confirm",
      close: () => resolve([])
    }).render(true);
  });
}

// ============================================
// Weapon Identification Helpers
// ============================================

/**
 * Extract weapon type from flow state.
 *
 * LANCER stores weapon type on the active profile, not the root item.
 * Path: item.system.profiles[item.system.selected_profile_index].type
 *
 * WeaponType enum values: "Rifle", "Cannon", "Launcher", "CQB", "Nexus", "Melee"
 * Note: there is no "Ranged" — non-melee types are Rifle/Cannon/Launcher/CQB/Nexus.
 *
 * Returns null if detection fails (caller should still offer the suggestion).
 */
function getWeaponType(state) {
  const item = state.item;
  if (!item) return null;

  const weaponData = item.system;
  if (!weaponData) return null;

  // Primary path: active profile
  const profiles = weaponData.profiles;
  const profileIndex = weaponData.selected_profile_index ?? 0;
  if (Array.isArray(profiles) && profiles[profileIndex]?.type) {
    return profiles[profileIndex].type;
  }

  // Fallback: flow state may carry attack_type from WeaponRollData
  if (state.data?.attack_type) return state.data.attack_type;

  return null;
}

/**
 * Extract weapon size from flow state.
 *
 * LANCER stores size at item.system.size as a string.
 * WeaponSize enum values: "Auxiliary", "Main", "Heavy", "Superheavy"
 *
 * Normalized to lowercase short forms for comparison: "aux", "main", "heavy", "superheavy".
 * Returns null if detection fails.
 */
function getWeaponSize(state) {
  const item = state.item;
  if (!item) return null;

  const weaponData = item.system;
  if (!weaponData) return null;

  const size = weaponData.size;
  if (!size) return null;

  const normalized = size.toLowerCase();
  if (normalized.includes("aux")) return "aux";
  if (normalized.includes("main")) return "main";
  if (normalized.includes("superheavy")) return "superheavy";
  if (normalized.includes("heavy")) return "heavy";
  return normalized;
}
