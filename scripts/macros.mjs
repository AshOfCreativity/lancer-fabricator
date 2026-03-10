/**
 * Macro Generation & Hotbar Support
 *
 * Creates Foundry macros for talent die actions that players can drag to their hotbar.
 * Each macro is self-contained — it finds the actor, checks state, and executes via the module API.
 *
 * Macro types:
 *   - Decrement (countdown talents)
 *   - Increment (countup talents)
 *   - Trigger (use payoff ability when die is at min)
 *   - Spend (spend dice for a specific effect)
 *   - Distribute (give a Leadership Die to an ally)
 *   - Reset (reset one or all dice)
 *   - Open tracker (open the TalentDiceApp)
 */

import { TALENT_DICE, getTalentDie, PATTERN } from "./talent-dice-data.mjs";

const MODULE_ID = "lancer-fabricator";

/**
 * Generate all available macros for a pilot actor's equipped talents.
 * Returns an array of macro descriptors (not yet created in Foundry).
 */
export function getAvailableMacros(actor) {
  if (!actor || actor.type !== "pilot") return [];

  const api = game.modules.get(MODULE_ID)?.api;
  if (!api) return [];

  const states = api.getDieStates(actor);
  const macros = [];

  for (const [talentId, state] of Object.entries(states)) {
    const def = getTalentDie(talentId);
    if (!def) continue;

    // Decrement (countdown)
    if (def.pattern === PATTERN.COUNTDOWN) {
      macros.push({
        name: `${def.dieName}: -1`,
        img: "icons/svg/d6-grey.svg",
        talentId,
        action: "decrement",
        hint: def.decrementOn
      });
      macros.push({
        name: `${def.dieName}: Trigger`,
        img: "icons/svg/lightning.svg",
        talentId,
        action: "trigger",
        hint: def.triggerEffect
      });
    }

    // Increment (countup)
    if (def.pattern === PATTERN.COUNTUP) {
      macros.push({
        name: `${def.dieName}: +${def.incrementAmount || 1}`,
        img: "icons/svg/d6-grey.svg",
        talentId,
        action: "increment",
        hint: def.incrementOn
      });
    }

    // Spend options
    if (def.spendOptions) {
      for (const opt of def.spendOptions) {
        macros.push({
          name: `${def.dieName}: ${opt.name}`,
          img: "icons/svg/arrow-right.svg",
          talentId,
          action: "spend",
          optionName: opt.name,
          cost: opt.cost,
          hint: opt.description
        });
      }
    }

    // Distribute (Leader)
    if (def.distributable) {
      macros.push({
        name: `${def.dieName}: Issue`,
        img: "icons/svg/hand.svg",
        talentId,
        action: "distribute",
        hint: "Give a die to an ally"
      });
    }

    // Reset
    macros.push({
      name: `${def.dieName}: Reset`,
      img: "icons/svg/undo.svg",
      talentId,
      action: "reset",
      hint: def.resetOn
    });
  }

  // Always add the open-tracker macro
  macros.push({
    name: "Open Talent Dice Tracker",
    img: "icons/svg/dice-target.svg",
    talentId: null,
    action: "openTracker",
    hint: "Open the talent dice management window"
  });

  return macros;
}

/**
 * Build the script body for a macro. The macro is self-contained —
 * it resolves the actor from the selected token at runtime.
 */
function buildMacroScript(descriptor) {
  const { talentId, action, optionName, cost } = descriptor;

  // Common preamble: find the pilot from selected token
  const preamble = `
const fab = game.modules.get("${MODULE_ID}")?.api;
if (!fab) return ui.notifications.error("LANCER Fabricator not active");
const token = canvas.tokens.controlled[0];
if (!token) return ui.notifications.warn("Select a token first");
const actor = token.actor;
const pilot = actor?.type === "mech"
  ? game.actors.get(actor.system?.pilot?.id)
  : actor?.type === "pilot" ? actor : null;
if (!pilot) return ui.notifications.warn("No pilot found for selected token");
`.trim();

  switch (action) {
    case "decrement":
      return `${preamble}
const result = await fab.decrementDie(pilot, "${talentId}");
if (result?.locked) ui.notifications.warn("Die is locked");
`;

    case "increment":
      return `${preamble}
await fab.incrementDie(pilot, "${talentId}");
`;

    case "trigger":
      return `${preamble}
const state = fab.getDieState(pilot, "${talentId}");
const def = fab.getTalentDie("${talentId}");
if (!state || state.value !== def.minValue) {
  return ui.notifications.warn(def.dieName + " is not ready to trigger (value: " + (state?.value ?? "?") + ", needs: " + def.minValue + ")");
}
await fab.useTriggerAbility(pilot, "${talentId}");
`;

    case "spend":
      return `${preamble}
const result = await fab.spendDice(pilot, "${talentId}", ${JSON.stringify(cost)}, ${JSON.stringify(optionName)});
if (!result) ui.notifications.warn("Not enough dice to spend");
`;

    case "distribute":
      return `${preamble}
const allies = game.actors.filter(a => a.type === "pilot" && a.id !== pilot.id);
if (allies.length === 0) return ui.notifications.warn("No allies to distribute to");
const options = allies.map(a => \`<option value="\${a.id}">\${a.name}</option>\`).join("");
new Dialog({
  title: "Issue Leadership Die",
  content: \`<form><div class="form-group"><label>Give die to:</label><select name="target">\${options}</select></div></form>\`,
  buttons: {
    give: {
      label: "Issue Order",
      callback: async (html) => {
        const id = html.find('[name="target"]').val();
        const result = await fab.distributeDie(pilot, id);
        if (!result) ui.notifications.warn("No dice available to distribute");
      }
    },
    cancel: { label: "Cancel" }
  }
}).render(true);
`;

    case "reset":
      return `${preamble}
await fab.resetDie(pilot, "${talentId}");
const def = fab.getTalentDie("${talentId}");
ui.notifications.info(def.dieName + " reset");
`;

    case "openTracker":
      return `
const fab = game.modules.get("${MODULE_ID}")?.api;
if (!fab) return ui.notifications.error("LANCER Fabricator not active");
const token = canvas.tokens.controlled[0];
if (token) {
  const actor = token.actor;
  const pilot = actor?.type === "mech"
    ? game.actors.get(actor.system?.pilot?.id)
    : actor?.type === "pilot" ? actor : null;
  if (pilot) return fab.openTalentDiceApp(pilot);
}
fab.openTalentDiceForSelected();
`.trim();

    default:
      return `ui.notifications.error("Unknown macro action: ${action}");`;
  }
}

/**
 * Create a Foundry Macro from a descriptor and optionally assign it to a hotbar slot.
 */
export async function createMacro(descriptor, slot = null) {
  const script = buildMacroScript(descriptor);

  const macroData = {
    name: `[Fab] ${descriptor.name}`,
    type: "script",
    img: descriptor.img || "icons/svg/d6-grey.svg",
    command: script,
    flags: {
      [MODULE_ID]: {
        talentId: descriptor.talentId,
        action: descriptor.action
      }
    }
  };

  // Check if macro already exists (by name)
  let macro = game.macros.find(m =>
    m.name === macroData.name &&
    m.getFlag(MODULE_ID, "action") === descriptor.action &&
    m.getFlag(MODULE_ID, "talentId") === descriptor.talentId
  );

  if (!macro) {
    macro = await Macro.create(macroData);
  }

  if (slot !== null && macro) {
    await game.user.assignHotbarMacro(macro, slot);
  }

  return macro;
}

/**
 * Show a dialog letting the player pick which macros to create and
 * optionally assign to hotbar slots.
 */
export async function showMacroCreationDialog(actor) {
  const available = getAvailableMacros(actor);
  if (available.length === 0) {
    ui.notifications.warn("No talent dice macros available for this actor");
    return;
  }

  const rows = available.map((m, i) => `
    <div class="form-group fabricator-macro-row">
      <label>
        <input type="checkbox" name="macro_${i}" checked />
        <strong>${m.name}</strong>
        <span class="fabricator-macro-hint">${m.hint || ""}</span>
      </label>
    </div>
  `).join("");

  new Dialog({
    title: "Create Talent Dice Macros",
    content: `
      <form class="fabricator-macro-form">
        <p>Select macros to create. They'll appear in your macro directory and can be dragged to the hotbar.</p>
        ${rows}
      </form>
    `,
    buttons: {
      create: {
        label: "Create Selected",
        icon: '<i class="fas fa-plus"></i>',
        callback: async (html) => {
          let created = 0;
          for (let i = 0; i < available.length; i++) {
            if (html.find(`[name="macro_${i}"]`).is(":checked")) {
              await createMacro(available[i]);
              created++;
            }
          }
          ui.notifications.info(`Created ${created} macro${created !== 1 ? "s" : ""}`);
        }
      },
      cancel: { label: "Cancel" }
    }
  }).render(true);
}
