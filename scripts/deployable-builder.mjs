/**
 * Deployable Builder
 *
 * Dialog for creating new deployable actors from scratch with preset defaults,
 * optional template application, and bulk deploy (multiple copies with
 * sequential naming).
 */

import { getTemplates, applyTemplate } from "./deployable-templates.mjs";

const MODULE_ID = "lancer-fabricator";

/**
 * Preset stat blocks for common deployable archetypes.
 */
const PRESETS = {
  drone: {
    label: "Drone",
    stats: { hp: "5", armor: 0, evasion: 10, edef: 10, heatcap: 0, save: 10, size: 0.5, speed: 5 },
    activation: "Quick", detail: "<p>An autonomous mobile drone.</p>", cost: 1, instances: 1
  },
  mine: {
    label: "Mine",
    stats: { hp: "5", armor: 0, evasion: 5, edef: 5, heatcap: 0, save: 10, size: 0.5, speed: 0 },
    activation: "Quick", detail: "<p>A stationary triggered explosive.</p>", cost: 1, instances: 1
  },
  turret: {
    label: "Turret",
    stats: { hp: "5", armor: 0, evasion: 8, edef: 8, heatcap: 0, save: 10, size: 0.5, speed: 0 },
    activation: "Quick", detail: "<p>A stationary automated weapon platform.</p>", cost: 1, instances: 1
  },
  deployable: {
    label: "Deployable",
    stats: { hp: "10", armor: 0, evasion: 5, edef: 5, heatcap: 0, save: 10, size: 1, speed: 0 },
    activation: "Quick", detail: "<p>A generic deployable object.</p>", cost: 1, instances: 1
  },
  custom: {
    label: "Custom (blank)",
    stats: { hp: "5", armor: 0, evasion: 10, edef: 10, heatcap: 0, save: 10, size: 1, speed: 0 },
    activation: "", detail: "", cost: 1, instances: 1
  }
};

/**
 * Open the deployable builder dialog.
 *
 * @param {Object} [options]
 * @param {Actor} [options.deployer] - Pilot/mech actor to set as deployer
 * @returns {Promise<Actor[]>} Created deployable actor(s)
 */
export async function showDeployableBuilder(options = {}) {
  const templates = getTemplates();
  const templateEntries = Object.values(templates).sort((a, b) => b.createdAt - a.createdAt);

  const presetOptions = Object.entries(PRESETS)
    .map(([key, p]) => `<option value="preset:${key}">${p.label}</option>`)
    .join("");
  const templateOptions = templateEntries
    .map(t => `<option value="template:${t.id}">${t.name}</option>`)
    .join("");
  const sourceOptions = presetOptions + (templateOptions ? `<optgroup label="Saved Templates">${templateOptions}</optgroup>` : "");

  return new Promise((resolve) => {
    new Dialog({
      title: "Create Deployable",
      content: `
        <form class="fabricator-builder-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" value="New Deployable" autofocus />
          </div>
          <div class="form-group">
            <label>Base</label>
            <select name="source">${sourceOptions}</select>
          </div>
          <div class="form-group">
            <label>Copies</label>
            <div class="fabricator-copies-row">
              <input type="number" name="copies" value="1" min="1" max="20" />
              <span class="hint">Sequential naming: Name-1, Name-2, ...</span>
            </div>
          </div>
          ${options.deployer ? `<p class="hint">Deployer: <strong>${options.deployer.name}</strong></p>` : ""}
        </form>
      `,
      buttons: {
        create: {
          label: "Create",
          icon: '<i class="fas fa-plus"></i>',
          callback: async (html) => {
            const name = html.find('[name="name"]').val() || "Deployable";
            const source = html.find('[name="source"]').val();
            const copies = Math.max(1, Math.min(20, parseInt(html.find('[name="copies"]').val()) || 1));

            const actors = await createDeployables(name, source, copies, options.deployer);
            resolve(actors);
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve([])
        }
      },
      default: "create",
      close: () => resolve([])
    }).render(true);
  });
}

/**
 * Create one or more deployable actors.
 *
 * @param {string} baseName - Base name for the deployable(s)
 * @param {string} source - "preset:<key>" or "template:<id>"
 * @param {number} copies - Number of copies to create
 * @param {Actor} [deployer] - Optional deployer actor
 * @returns {Promise<Actor[]>}
 */
async function createDeployables(baseName, source, copies, deployer) {
  const [sourceType, sourceId] = source.split(":");
  const actors = [];

  for (let i = 0; i < copies; i++) {
    const name = copies > 1 ? `${baseName}-${i + 1}` : baseName;
    const actorData = buildActorData(name, sourceType, sourceId);

    // Set deployer reference
    if (deployer) {
      actorData.system.deployer = { id: deployer.uuid, value: deployer.name };
    }

    const actor = await Actor.create(actorData);

    // If using a template, apply it after creation (handles complex nested data)
    if (sourceType === "template" && actor) {
      await applyTemplate(actor, sourceId);
    }

    if (actor) actors.push(actor);
  }

  const label = actors.length === 1 ? actors[0].name : `${actors.length} deployables`;
  ui.notifications.info(`Created ${label}`);

  return actors;
}

/**
 * Build the Actor.create() data object from a preset or template base.
 */
function buildActorData(name, sourceType, sourceId) {
  const data = {
    name,
    type: "deployable",
    img: "icons/svg/mechanical-arm.svg",
    system: {
      stats: { hp: "5", armor: 0, evasion: 10, edef: 10, heatcap: 0, save: 10, size: 1, speed: 0 },
      hp_bonus: 0,
      detail: "",
      actions: [],
      activation: "",
      deactivation: "",
      recall: "",
      redeploy: "",
      cost: 1,
      instances: 1,
      tags: [],
      counters: []
    }
  };

  if (sourceType === "preset" && PRESETS[sourceId]) {
    const preset = PRESETS[sourceId];
    data.system.stats = { ...preset.stats };
    data.system.activation = preset.activation;
    data.system.detail = preset.detail;
    data.system.cost = preset.cost;
    data.system.instances = preset.instances;
  }
  // Template data applied post-creation via applyTemplate()

  return data;
}

/**
 * Get available presets for external use.
 */
export function getPresets() {
  return { ...PRESETS };
}
