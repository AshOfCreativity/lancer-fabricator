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
import { getAvailableMacros, createMacro, showMacroCreationDialog } from "./macros.mjs";

// Deployable Workshop
import { registerDeployableSheet, FabricatorDeployableSheet } from "./deployable-sheet.mjs";
import { registerSyncProtectionHook, getOverrides, hasOverrides, saveOverride, clearOverrides } from "./deployable-sync.mjs";
import { registerTemplateSettings, saveTemplate, applyTemplate, getTemplates, deleteTemplate, showTemplatePicker } from "./deployable-templates.mjs";
import { showDeployableBuilder, getPresets } from "./deployable-builder.mjs";
import { syncTalentWeapons, cleanupTalentWeapons } from "./talent-weapons.mjs";

// Transmuter
import { TransmuterApp, showTransmuter, registerTransmuterSettings, getTransmuterLog, clearTransmuterLog, showTransmuterLog } from "./transmuter-app.mjs";

const MODULE_ID = "lancer-fabricator";

// Track open apps per actor
const openApps = new Map();

/**
 * Open the Talent Dice Tracker for a pilot actor
 */
function openTalentDiceApp(actor) {
  if (!actor || actor.type !== "pilot") {
    ui.notifications.warn("Select a pilot actor to open the Talent Dice Tracker");
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

  // If it's a mech, find its pilot
  const pilot = actor.type === "mech"
    ? game.actors.get(actor.system?.pilot?.id)
    : actor;

  openTalentDiceApp(pilot || actor);
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
    showTransmuterLog
  };
});

// Hook into LANCER's flow system for attack integration
Hooks.on("lancer.registerFlows", (flowSteps, flows) => {
  registerFabricatorFlows(flowSteps, flows);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);

  // Auto-initialize trackers and sync talent weapons for all owned pilot actors
  for (const actor of game.actors) {
    if (actor.type === "pilot" && actor.isOwner) {
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

// Re-initialize trackers when a pilot's items change, sync weapons on die state changes
Hooks.on("updateActor", async (actor, changes) => {
  if (actor.type !== "pilot") return;

  // Talent equipped/unequipped
  if (changes.items) {
    await initializeTrackers(actor);
    await syncTalentWeapons(actor);
    const app = openApps.get(actor.id);
    if (app) app.render(false);
  }

  // Die state changed (any setFlag on talentDice triggers this)
  if (changes.flags?.[MODULE_ID]?.talentDice) {
    await syncTalentWeapons(actor);
  }
});

// Initialize trackers + sync weapons when a new talent is added
Hooks.on("createItem", async (item) => {
  if (item.type !== "talent") return;
  const actor = item.parent;
  if (actor?.type === "pilot") {
    await initializeTrackers(actor);
    await syncTalentWeapons(actor);
    const app = openApps.get(actor.id);
    if (app) app.render(false);
  }
});

// Clean up trackers + sync weapons when a talent is removed
Hooks.on("deleteItem", async (item) => {
  if (item.type !== "talent") return;
  const actor = item.parent;
  if (actor?.type === "pilot") {
    await initializeTrackers(actor);
    await syncTalentWeapons(actor);
    const app = openApps.get(actor.id);
    if (app) app.render(false);
  }
});
