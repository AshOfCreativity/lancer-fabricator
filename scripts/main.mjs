/**
 * LANCER Fabricator - Main Entry Point
 *
 * v0.3.0 — Talent Dice Tracker + Deployable Workshop + NPC/Player Transmuter
 */

import { TALENT_DICE, PATTERN, getTalentDie, getAllTrackedTalentIds } from "./talent-dice-data.mjs";
import {
  getDieStates,
  getDieState,
  initializeTrackers,
  decrementDie,
  incrementDie,
  spendDice,
  resetDie,
  resetAllDice,
  useTriggerAbility,
  distributeDie,
  returnDie,
  spendReceivedDie,
  toggleTranscendentLock,
  renderDiePips
} from "./talent-dice-tracker.mjs";
import { TalentDiceApp } from "./talent-dice-app.mjs";
import { registerFabricatorFlows } from "./flow-integration.mjs";
import { getAvailableMacros, createMacro, showMacroCreationDialog, createActiveMechMacro } from "./macros.mjs";

// Deployable Workshop
import { registerDeployableSheet, FabricatorDeployableSheet } from "./deployable-sheet.mjs";
import { registerSyncProtectionHook, getOverrides, hasOverrides, saveOverride, clearOverrides } from "./deployable-sync.mjs";
import { registerTemplateSettings, saveTemplate, applyTemplate, getTemplates, deleteTemplate, showTemplatePicker } from "./deployable-templates.mjs";
import { showDeployableBuilder, getPresets } from "./deployable-builder.mjs";
import { syncTalentWeapons, cleanupTalentWeapons } from "./talent-weapons.mjs";

// Transmuter
import { TransmuterApp, showTransmuter, registerTransmuterSettings, getTransmuterLog, clearTransmuterLog, showTransmuterLog } from "./transmuter-app.mjs";
import { getPresetItems, getVehiclePresets, createFromPreset, createVehicle, showVehicleBuilder } from "./item-presets.mjs";

const MODULE_ID = "lancer-fabricator-main";

// Track open apps per actor
const openApps = new Map();

/**
 * Open the Talent Dice Tracker for a pilot actor
 */
function openTalentDiceApp(actor) {
  if (!actor || actor.type !== "mech") {
    ui.notifications.warn("Select a mech to open the Talent Dice Tracker");
    return;
  }

  if (openApps.has(actor.id)) {
    const app = openApps.get(actor.id);
    app.render(true);
    return;
  }

  const app = new TalentDiceApp(actor);
  openApps.set(actor.id, app);

  // Clean up on close
  const originalClose = app.close.bind(app);
  app.close = async (...args) => {
    openApps.delete(actor.id);
    return originalClose(...args);
  };

  app.render(true);
}

/**
 * Open tracker for the currently selected token's actor
 */
function openTalentDiceForSelected() {
  const token = canvas.tokens.controlled[0];
  if (!token) {
    ui.notifications.warn("Select a token first");
    return;
  }
  const actor = token.actor;
  if (!actor) return;

  if (actor.type === "mech") {
    openTalentDiceApp(actor);
  } else {
    ui.notifications.warn("Select a mech token");
  }
}

// ============================================
// Hooks
// ============================================

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing LANCER Fabricator`);

  // Register deployable sheet and settings
  registerDeployableSheet();
  registerTemplateSettings();
  registerSyncProtectionHook();
  registerTransmuterSettings();

  // Expose public API
  game.modules.get(MODULE_ID).api = {
    // App
    openTalentDiceApp,
    openTalentDiceForSelected,

    // Tracker
    initializeTrackers,
    getDieStates,
    getDieState,
    decrementDie,
    incrementDie,
    spendDice,
    resetDie,
    resetAllDice,
    useTriggerAbility,
    distributeDie,
    returnDie,
    spendReceivedDie,
    toggleTranscendentLock,
    renderDiePips,

    // Macros
    getAvailableMacros,
    createMacro,
    showMacroCreationDialog,
    createActiveMechMacro,

    // Data
    TALENT_DICE,
    PATTERN,
    getTalentDie,
    getAllTrackedTalentIds,

    // Talent Weapons
    syncTalentWeapons,
    cleanupTalentWeapons,

    // Deployable Workshop
    FabricatorDeployableSheet,
    showDeployableBuilder,
    getPresets,
    saveTemplate,
    applyTemplate,
    getTemplates,
    deleteTemplate,
    showTemplatePicker,
    getOverrides,
    hasOverrides,
    saveOverride,
    clearOverrides,

    // Transmuter
    TransmuterApp,
    showTransmuter,
    getTransmuterLog,
    clearTransmuterLog,
    showTransmuterLog,

    // Presets
    getPresetItems,
    getVehiclePresets,
    createFromPreset,
    createVehicle,
    showVehicleBuilder
  };
});

// Hook into LANCER's flow system for attack integration
Hooks.on("lancer.registerFlows", (flowSteps, flows) => {
  registerFabricatorFlows(flowSteps, flows);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);

  // Auto-initialize trackers and sync talent weapons for all mech actors
  for (const actor of game.actors) {
    if (actor.type === "mech" && actor.isOwner) {
      initializeTrackers(actor).then(async (initialized) => {
        if (initialized.length > 0) {
          console.log(`${MODULE_ID} | Initialized trackers for ${actor.name}: ${initialized.join(", ")}`);
        }
        await syncTalentWeapons(actor);
      });
    }
  }

  // Socket handler for cross-client sync (Leadership Die distribution)
  game.socket.on(`module.${MODULE_ID}`, async (data) => {
    if (data.type === "dieDistributed") {
      // Refresh any open apps for the target actor
      const app = openApps.get(data.targetActorId);
      if (app) app.render(false);
    }
    if (data.type === "dieStateChanged") {
      // Refresh any open apps for this actor
      const app = openApps.get(data.actorId);
      if (app) app.render(false);
    }
  });
});

// Add button to scene controls
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControl = controls.find(c => c.name === "token");
  if (tokenControl) {
    tokenControl.tools.push({
      name: "talent-dice",
      title: "Talent Dice Tracker",
      icon: "fas fa-dice-d6",
      button: true,
      onClick: () => openTalentDiceForSelected()
    });
    tokenControl.tools.push({
      name: "transmuter",
      title: "NPC \u2194 Player Transmuter",
      icon: "fas fa-exchange-alt",
      button: true,
      onClick: () => showTransmuter()
    });
  }
});

// Re-initialize trackers on mech updates (effects changed, pilot linked, etc.)
Hooks.on("updateActor", async (actor, changes) => {
  if (actor.type === "mech") {
    // Effects changed (pilot linked/unlinked, talents changed)
    if (changes.effects || changes.system?.pilot || changes.system?.loadout) {
      await initializeTrackers(actor);
      await syncTalentWeapons(actor);
      const app = openApps.get(actor.id);
      if (app) app.render(false);
    }
    // Die state changed
    if (changes.flags?.[MODULE_ID]?.talentDice) {
      await syncTalentWeapons(actor);
      const app = openApps.get(actor.id);
      if (app) app.render(false);
    }
  }

  // When a pilot's talents change, re-initialize all their linked mechs
  if (actor.type === "pilot" && changes.items) {
    for (const mech of game.actors) {
      if (mech.type === "mech" && mech.system?.pilot?.value === actor) {
        await initializeTrackers(mech);
        await syncTalentWeapons(mech);
        const app = openApps.get(mech.id);
        if (app) app.render(false);
      }
    }
  }
});

// When a talent is added to a pilot, re-initialize their mechs
Hooks.on("createItem", async (item) => {
  if (item.type !== "talent") return;
  const pilot = item.parent;
  if (pilot?.type !== "pilot") return;
  for (const mech of game.actors) {
    if (mech.type === "mech" && mech.system?.pilot?.value === pilot) {
      await initializeTrackers(mech);
      await syncTalentWeapons(mech);
      const app = openApps.get(mech.id);
      if (app) app.render(false);
    }
  }
});

// When a talent is removed from a pilot, re-initialize their mechs
Hooks.on("deleteItem", async (item) => {
  if (item.type !== "talent") return;
  const pilot = item.parent;
  if (pilot?.type !== "pilot") return;
  for (const mech of game.actors) {
    if (mech.type === "mech" && mech.system?.pilot?.value === pilot) {
      await initializeTrackers(mech);
      await syncTalentWeapons(mech);
      const app = openApps.get(mech.id);
      if (app) app.render(false);
    }
  }
});
