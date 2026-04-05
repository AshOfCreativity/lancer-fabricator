/**
 * Fabricator Deployable Sheet
 *
 * Enhanced ActorSheet for LANCER deployable actors. Provides full stat editing,
 * action management, tag/counter editors, activation type config, rich text
 * detail editing, sync protection indicators, and template save/load.
 *
 * Registered as an alternate sheet — players can switch between this and the
 * default LancerDeployableSheet.
 */

import { getOverrides, hasOverrides, saveOverride, clearOverrides, getOverriddenPaths } from "./deployable-sync.mjs";
import { saveTemplate, applyTemplate, showTemplatePicker, getTemplates, deleteTemplate } from "./deployable-templates.mjs";
import { showDeployableBuilder } from "./deployable-builder.mjs";

const MODULE_ID = "lancer-fabricator-main";

/**
 * Activation type options for select dropdowns.
 * Matches LANCER's ActivationType enum.
 */
const ACTIVATION_TYPES = [
  { value: "", label: "None" },
  { value: "Free", label: "Free" },
  { value: "Quick", label: "Quick" },
  { value: "Full", label: "Full" },
  { value: "Protocol", label: "Protocol" },
  { value: "Reaction", label: "Reaction" },
  { value: "Other", label: "Other" }
];

/**
 * Action type options for the action editor.
 */
const ACTION_TYPES = [
  { value: "Free", label: "Free Action" },
  { value: "Quick", label: "Quick Action" },
  { value: "Full", label: "Full Action" },
  { value: "Reaction", label: "Reaction" },
  { value: "Protocol", label: "Protocol" }
];

export class FabricatorDeployableSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "fabricator-app", "fabricator-deployable-sheet"],
      template: `modules/${MODULE_ID}/templates/deployable-sheet.hbs`,
      width: 520,
      height: 640,
      resizable: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  get title() {
    return `${this.actor.name} — Fabricator`;
  }

  async getData() {
    const data = await super.getData();
    const sys = this.actor.system;

    // Stat values with defaults
    data.stats = {
      hp: sys.stats?.hp ?? "5",
      armor: sys.stats?.armor ?? 0,
      evasion: sys.stats?.evasion ?? 10,
      edef: sys.stats?.edef ?? 10,
      heatcap: sys.stats?.heatcap ?? 0,
      save: sys.stats?.save ?? 10,
      size: sys.stats?.size ?? 1,
      speed: sys.stats?.speed ?? 0
    };
    data.hp_bonus = sys.hp_bonus ?? 0;
    data.cost = sys.cost ?? 1;
    data.instances = sys.instances ?? 1;

    // Actions with index for editing
    data.actions = (sys.actions || []).map((action, index) => ({
      ...action,
      index,
      activationOptions: ACTION_TYPES.map(t => ({
        ...t,
        selected: t.value === (action.activation || "Quick")
      }))
    }));

    // Detail HTML
    data.detail = sys.detail || "";

    // Activation types with selected state
    data.activation = buildSelectOptions(sys.activation);
    data.deactivation = buildSelectOptions(sys.deactivation);
    data.recall = buildSelectOptions(sys.recall);
    data.redeploy = buildSelectOptions(sys.redeploy);

    // Tags and counters
    data.tags = sys.tags || [];
    data.counters = sys.counters || [];

    // Sync protection
    data.syncProtected = hasOverrides(this.actor);
    data.overriddenPaths = getOverriddenPaths(this.actor);

    // Deployer info
    data.deployerName = sys.deployer?.value || null;

    // Templates available
    data.hasTemplates = Object.keys(getTemplates()).length > 0;

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Stat inputs — track overrides on change
    html.find(".fabricator-stat-input").change(this._onStatChange.bind(this));

    // Action management
    html.find(".fabricator-add-action").click(this._onAddAction.bind(this));
    html.find(".fabricator-delete-action").click(this._onDeleteAction.bind(this));
    html.find(".fabricator-action-field").change(this._onActionFieldChange.bind(this));

    // Tag management
    html.find(".fabricator-add-tag").click(this._onAddTag.bind(this));
    html.find(".fabricator-delete-tag").click(this._onDeleteTag.bind(this));

    // Counter management
    html.find(".fabricator-add-counter").click(this._onAddCounter.bind(this));
    html.find(".fabricator-delete-counter").click(this._onDeleteCounter.bind(this));

    // Sync protection
    html.find(".fabricator-clear-overrides").click(this._onClearOverrides.bind(this));

    // Templates
    html.find(".fabricator-save-template").click(this._onSaveTemplate.bind(this));
    html.find(".fabricator-apply-template").click(this._onApplyTemplate.bind(this));
    html.find(".fabricator-manage-templates").click(this._onManageTemplates.bind(this));

    // Builder
    html.find(".fabricator-new-deployable").click(this._onNewDeployable.bind(this));
  }

  /**
   * Override _updateObject to pass fabricatorEdit flag and track overrides.
   */
  async _updateObject(event, formData) {
    // Track which stat fields changed for sync protection
    const currentData = this.actor.system;
    for (const [key, value] of Object.entries(formData)) {
      if (key.startsWith("system.stats.") || key === "system.hp_bonus" ||
          key === "system.detail" || key === "system.cost" || key === "system.instances" ||
          key === "system.activation" || key === "system.deactivation" ||
          key === "system.recall" || key === "system.redeploy") {
        const currentValue = foundry.utils.getProperty(this.actor, key);
        if (value !== currentValue) {
          await saveOverride(this.actor, key, value);
        }
      }
    }

    return this.actor.update(formData, { fabricatorEdit: true });
  }

  // ---- Stat Changes ----

  async _onStatChange(event) {
    // Handled by _updateObject via form submission
    // This handler is for immediate visual feedback if needed
  }

  // ---- Action Management ----

  async _onAddAction(event) {
    event.preventDefault();
    const actions = JSON.parse(JSON.stringify(this.actor.system.actions || []));
    actions.push({
      name: "New Action",
      activation: "Quick",
      detail: "",
      trigger: "",
      cost: 0,
      pilot: false,
      tech_attack: false,
      damage: [],
      range: []
    });
    await this.actor.update({ "system.actions": actions }, { fabricatorEdit: true });
    await saveOverride(this.actor, "system.actions", actions);
  }

  async _onDeleteAction(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const actions = JSON.parse(JSON.stringify(this.actor.system.actions || []));
    actions.splice(index, 1);
    await this.actor.update({ "system.actions": actions }, { fabricatorEdit: true });
    await saveOverride(this.actor, "system.actions", actions);
  }

  async _onActionFieldChange(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    const field = event.currentTarget.dataset.field;
    const value = event.currentTarget.value;

    const actions = JSON.parse(JSON.stringify(this.actor.system.actions || []));
    if (!actions[index]) return;

    actions[index][field] = value;
    await this.actor.update({ "system.actions": actions }, { fabricatorEdit: true });
    await saveOverride(this.actor, "system.actions", actions);
  }

  // ---- Tag Management ----

  async _onAddTag(event) {
    event.preventDefault();
    const tags = JSON.parse(JSON.stringify(this.actor.system.tags || []));
    tags.push({ name: "New Tag", val: "" });
    await this.actor.update({ "system.tags": tags }, { fabricatorEdit: true });
    await saveOverride(this.actor, "system.tags", tags);
  }

  async _onDeleteTag(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const tags = JSON.parse(JSON.stringify(this.actor.system.tags || []));
    tags.splice(index, 1);
    await this.actor.update({ "system.tags": tags }, { fabricatorEdit: true });
    await saveOverride(this.actor, "system.tags", tags);
  }

  // ---- Counter Management ----

  async _onAddCounter(event) {
    event.preventDefault();
    const counters = JSON.parse(JSON.stringify(this.actor.system.counters || []));
    counters.push({ id: `ctr_${Date.now()}`, name: "New Counter", min: 0, max: 6, default_value: 0, val: 0 });
    await this.actor.update({ "system.counters": counters }, { fabricatorEdit: true });
    await saveOverride(this.actor, "system.counters", counters);
  }

  async _onDeleteCounter(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const counters = JSON.parse(JSON.stringify(this.actor.system.counters || []));
    counters.splice(index, 1);
    await this.actor.update({ "system.counters": counters }, { fabricatorEdit: true });
    await saveOverride(this.actor, "system.counters", counters);
  }

  // ---- Sync Protection ----

  async _onClearOverrides(event) {
    event.preventDefault();
    const confirmed = await Dialog.confirm({
      title: "Reset to Synced",
      content: "<p>Clear all manual overrides? The next Comp/Con sync will overwrite your customizations.</p>"
    });
    if (confirmed) {
      await clearOverrides(this.actor);
      ui.notifications.info("Overrides cleared");
      this.render(false);
    }
  }

  // ---- Templates ----

  async _onSaveTemplate(event) {
    event.preventDefault();
    const name = await promptTemplateName(this.actor.name);
    if (!name) return;
    await saveTemplate(this.actor, name);
    ui.notifications.info(`Template "${name}" saved`);
  }

  async _onApplyTemplate(event) {
    event.preventDefault();
    const templateId = await showTemplatePicker();
    if (!templateId) return;
    await applyTemplate(this.actor, templateId);
    ui.notifications.info("Template applied");
    this.render(false);
  }

  async _onManageTemplates(event) {
    event.preventDefault();
    await showTemplateManager();
  }

  // ---- Builder ----

  async _onNewDeployable(event) {
    event.preventDefault();
    // Try to find the deployer from the current actor's deployer ref
    const deployerUuid = this.actor.system?.deployer?.id;
    const deployer = deployerUuid ? await fromUuid(deployerUuid) : null;
    await showDeployableBuilder({ deployer });
  }
}

// ============================================
// Registration
// ============================================

/**
 * Register the sheet with Foundry's sheet registry.
 * Call during module init.
 */
export function registerDeployableSheet() {
  Actors.registerSheet(MODULE_ID, FabricatorDeployableSheet, {
    types: ["deployable"],
    makeDefault: false,
    label: "Fabricator Deployable Sheet"
  });
}

// ============================================
// Helpers
// ============================================

function buildSelectOptions(currentValue) {
  return ACTIVATION_TYPES.map(t => ({
    ...t,
    selected: t.value === (currentValue || "")
  }));
}

async function promptTemplateName(defaultName) {
  return new Promise((resolve) => {
    new Dialog({
      title: "Save as Template",
      content: `
        <form>
          <div class="form-group">
            <label>Template Name</label>
            <input type="text" name="name" value="${defaultName} Template" autofocus />
          </div>
        </form>
      `,
      buttons: {
        save: {
          label: "Save",
          icon: '<i class="fas fa-save"></i>',
          callback: (html) => resolve(html.find('[name="name"]').val())
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "save",
      close: () => resolve(null)
    }).render(true);
  });
}

async function showTemplateManager() {
  const templates = getTemplates();
  const entries = Object.values(templates).sort((a, b) => b.createdAt - a.createdAt);

  if (entries.length === 0) {
    ui.notifications.info("No saved templates");
    return;
  }

  const rows = entries.map(t => {
    const date = new Date(t.createdAt).toLocaleDateString();
    return `<div class="form-group fabricator-template-row" data-id="${t.id}">
      <span class="fabricator-template-name">${t.name}</span>
      <span class="fabricator-template-date">${date}</span>
      <button type="button" class="fabricator-delete-template" data-id="${t.id}">
        <i class="fas fa-trash"></i>
      </button>
    </div>`;
  }).join("");

  new Dialog({
    title: "Manage Templates",
    content: `<div class="fabricator-template-manager">${rows}</div>`,
    buttons: {
      close: { label: "Close" }
    },
    render: (html) => {
      html.find(".fabricator-delete-template").click(async (event) => {
        const id = event.currentTarget.dataset.id;
        const template = templates[id];
        const confirmed = await Dialog.confirm({
          title: "Delete Template",
          content: `<p>Delete template "${template?.name}"?</p>`
        });
        if (confirmed) {
          await deleteTemplate(id);
          event.currentTarget.closest(".fabricator-template-row").remove();
          ui.notifications.info("Template deleted");
        }
      });
    }
  }).render(true);
}
