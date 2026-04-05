/**
 * Talent Dice Application
 *
 * Foundry Application window that shows all active talent dice for a pilot,
 * with buttons to decrement/increment/spend/distribute/reset.
 */

import { TALENT_DICE, PATTERN, getTalentDie } from "./talent-dice-data.mjs";
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
import { showMacroCreationDialog } from "./macros.mjs";

const MODULE_ID = "lancer-fabricator-main";

export class TalentDiceApp extends Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "lancer-fabricator-talent-dice",
      title: "Talent Dice Tracker",
      template: `modules/${MODULE_ID}/templates/talent-dice-app.hbs`,
      classes: ["lancer", "fabricator-app"],
      width: 400,
      height: "auto",
      resizable: true
    });
  }

  async getData() {
    const states = getDieStates(this.actor);
    const trackers = [];

    for (const [talentId, state] of Object.entries(states)) {
      const def = getTalentDie(talentId);
      if (!def) continue;

      const tracker = {
        talentId,
        def,
        state,
        pipsHtml: renderDiePips(state.value, def.maxValue, def.pattern),
        isCountdown: def.pattern === PATTERN.COUNTDOWN,
        isCountup: def.pattern === PATTERN.COUNTUP,
        isPool: def.pattern === PATTERN.POOL,
        canTrigger: def.pattern === PATTERN.COUNTDOWN && state.value === def.minValue,
        canDecrement: def.pattern === PATTERN.COUNTDOWN && state.value > def.minValue && !state.locked,
        canIncrement: (def.pattern === PATTERN.COUNTUP || def.pattern === PATTERN.POOL) && state.value < def.maxValue,
        isLocked: state.locked || false,
        spendOptions: def.spendOptions?.map(opt => ({
          ...opt,
          canAfford: opt.cost === "all" ? state.value > 0 : state.value >= opt.cost
        })) || []
      };

      // Pool: distribution info (Leader)
      if (def.distributable && state.distributed) {
        tracker.distributed = Object.entries(state.distributed)
          .filter(([, count]) => count > 0)
          .map(([actorId, count]) => ({
            actorId,
            name: game.actors.get(actorId)?.name || "Unknown",
            count
          }));
        tracker.availableAllies = game.actors
          .filter(a => a.type === "pilot" && a.id !== this.actor.id)
          .map(a => ({ id: a.id, name: a.name }));
      }

      trackers.push(tracker);
    }

    // Check for received Leadership Dice
    const receivedDice = this.actor.getFlag(MODULE_ID, "receivedLeadershipDice") || 0;
    const leaderDef = getTalentDie("t_leader");

    return {
      actor: this.actor,
      trackers,
      hasTrackers: trackers.length > 0,
      receivedDice,
      leaderSpendOptions: receivedDice > 0 ? leaderDef.spendOptions : [],
      isGM: game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Countdown controls
    html.find(".fabricator-decrement").click(this._onDecrement.bind(this));
    html.find(".fabricator-trigger").click(this._onTrigger.bind(this));

    // Countup controls
    html.find(".fabricator-increment").click(this._onIncrement.bind(this));

    // Spend controls
    html.find(".fabricator-spend").click(this._onSpend.bind(this));

    // Pool distribution controls
    html.find(".fabricator-distribute").click(this._onDistribute.bind(this));
    html.find(".fabricator-return").click(this._onReturn.bind(this));

    // Received dice controls
    html.find(".fabricator-spend-received").click(this._onSpendReceived.bind(this));

    // Iconoclast lock toggle
    html.find(".fabricator-toggle-lock").click(this._onToggleLock.bind(this));

    // Reset controls
    html.find(".fabricator-reset-one").click(this._onResetOne.bind(this));
    html.find(".fabricator-reset-all").click(this._onResetAll.bind(this));

    // Refresh
    html.find(".fabricator-refresh").click(this._onRefresh.bind(this));

    // Create macros
    html.find(".fabricator-create-macros").click(this._onCreateMacros.bind(this));
  }

  async _onDecrement(event) {
    event.preventDefault();
    const talentId = event.currentTarget.dataset.talentId;
    const result = await decrementDie(this.actor, talentId);
    if (result?.locked) {
      ui.notifications.warn("Die is locked (Transcendent state active)");
    }
    this.render(false);
  }

  async _onTrigger(event) {
    event.preventDefault();
    const talentId = event.currentTarget.dataset.talentId;
    const def = getTalentDie(talentId);

    const confirmed = await Dialog.confirm({
      title: `${def.dieName} — Trigger Ability`,
      content: `<p><strong>${def.triggerEffect}</strong></p><p>Use this ability and reset the die?</p>`
    });

    if (confirmed) {
      await useTriggerAbility(this.actor, talentId);
      this.render(false);
    }
  }

  async _onIncrement(event) {
    event.preventDefault();
    const talentId = event.currentTarget.dataset.talentId;
    await incrementDie(this.actor, talentId);
    this.render(false);
  }

  async _onSpend(event) {
    event.preventDefault();
    const talentId = event.currentTarget.dataset.talentId;
    const optionName = event.currentTarget.dataset.option;
    const cost = event.currentTarget.dataset.cost;

    const parsedCost = cost === "all" ? "all" : parseInt(cost);
    await spendDice(this.actor, talentId, parsedCost, optionName);
    this.render(false);
  }

  async _onDistribute(event) {
    event.preventDefault();
    const targetId = event.currentTarget.dataset.targetId;

    if (!targetId) {
      // Show ally picker dialog
      const allies = game.actors.filter(a => a.type === "pilot" && a.id !== this.actor.id);
      if (allies.length === 0) {
        ui.notifications.warn("No allies to distribute dice to");
        return;
      }

      const options = allies.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
      new Dialog({
        title: "Issue Leadership Die",
        content: `
          <form>
            <div class="form-group">
              <label>Give die to:</label>
              <select name="target">${options}</select>
            </div>
          </form>
        `,
        buttons: {
          give: {
            label: "Issue Order",
            callback: async (html) => {
              const id = html.find('[name="target"]').val();
              await distributeDie(this.actor, id);
              this.render(false);
            }
          },
          cancel: { label: "Cancel" }
        }
      }).render(true);
      return;
    }

    await distributeDie(this.actor, targetId);
    this.render(false);
  }

  async _onReturn(event) {
    event.preventDefault();
    const targetId = event.currentTarget.dataset.targetId;
    // Find the Leader actor who distributed to this actor
    const leaders = game.actors.filter(a => {
      const state = getDieState(a, "t_leader");
      return state?.distributed?.[targetId] > 0;
    });

    if (leaders.length > 0) {
      await returnDie(leaders[0], targetId);
      this.render(false);
    }
  }

  async _onSpendReceived(event) {
    event.preventDefault();
    const optionName = event.currentTarget.dataset.option;
    await spendReceivedDie(this.actor, optionName);
    this.render(false);
  }

  async _onToggleLock(event) {
    event.preventDefault();
    const state = getDieState(this.actor, "t_iconoclast");
    await toggleTranscendentLock(this.actor, !state.locked);
    this.render(false);
  }

  async _onResetOne(event) {
    event.preventDefault();
    const talentId = event.currentTarget.dataset.talentId;
    await resetDie(this.actor, talentId);
    ui.notifications.info(`${getTalentDie(talentId)?.dieName} reset`);
    this.render(false);
  }

  async _onResetAll(event) {
    event.preventDefault();
    const confirmed = await Dialog.confirm({
      title: "Reset All Dice",
      content: "<p>Reset all talent dice to starting values? (Use after rest/Full Repair)</p>"
    });
    if (confirmed) {
      await resetAllDice(this.actor);
      ui.notifications.info("All talent dice reset");
      this.render(false);
    }
  }

  async _onRefresh(event) {
    event.preventDefault();
    await initializeTrackers(this.actor);
    this.render(false);
  }

  _onCreateMacros(event) {
    event.preventDefault();
    showMacroCreationDialog(this.actor);
  }
}
