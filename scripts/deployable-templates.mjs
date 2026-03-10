/**
 * Deployable Templates
 *
 * Save and apply deployable stat block presets using world-level module settings.
 * Templates capture the full editable state of a deployable (stats, actions, tags,
 * counters, activation types, detail text) for reuse across actors.
 */

const MODULE_ID = "lancer-fabricator";
const SETTING_KEY = "deployableTemplates";

/**
 * Register the world-level setting that stores templates.
 * Call during module init.
 */
export function registerTemplateSettings() {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "Deployable Templates",
    hint: "Saved deployable stat block presets.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
}

/**
 * Get all saved templates.
 * @returns {Object} Map of templateId -> template data
 */
export function getTemplates() {
  return game.settings.get(MODULE_ID, SETTING_KEY) || {};
}

/**
 * Get a single template by ID.
 */
export function getTemplate(templateId) {
  return getTemplates()[templateId] || null;
}

/**
 * Save the current deployable's editable state as a named template.
 *
 * @param {Actor} actor - The deployable actor to snapshot
 * @param {string} name - Template display name
 * @returns {string} The generated template ID
 */
export async function saveTemplate(actor, name) {
  if (actor.type !== "deployable") return null;

  const templateId = `dtpl_${Date.now()}`;
  const sys = actor.system;

  const template = {
    id: templateId,
    name,
    createdAt: Date.now(),
    data: {
      stats: {
        hp: sys.stats?.hp ?? "5",
        armor: sys.stats?.armor ?? 0,
        evasion: sys.stats?.evasion ?? 10,
        edef: sys.stats?.edef ?? 10,
        heatcap: sys.stats?.heatcap ?? 0,
        save: sys.stats?.save ?? 10,
        size: sys.stats?.size ?? 1,
        speed: sys.stats?.speed ?? 0
      },
      hp_bonus: sys.hp_bonus ?? 0,
      detail: sys.detail ?? "",
      actions: JSON.parse(JSON.stringify(sys.actions || [])),
      activation: sys.activation ?? "",
      deactivation: sys.deactivation ?? "",
      recall: sys.recall ?? "",
      redeploy: sys.redeploy ?? "",
      cost: sys.cost ?? 1,
      instances: sys.instances ?? 1,
      tags: JSON.parse(JSON.stringify(sys.tags || [])),
      counters: JSON.parse(JSON.stringify(sys.counters || []))
    }
  };

  const templates = getTemplates();
  templates[templateId] = template;
  await game.settings.set(MODULE_ID, SETTING_KEY, templates);

  return templateId;
}

/**
 * Apply a template's data to a deployable actor.
 *
 * @param {Actor} actor - Target deployable
 * @param {string} templateId - Template to apply
 * @param {Object} [options] - { fabricatorEdit: true } to bypass sync protection
 */
export async function applyTemplate(actor, templateId, options = {}) {
  if (actor.type !== "deployable") return;

  const template = getTemplate(templateId);
  if (!template) return;

  const update = {
    "system.stats.hp": template.data.stats.hp,
    "system.stats.armor": template.data.stats.armor,
    "system.stats.evasion": template.data.stats.evasion,
    "system.stats.edef": template.data.stats.edef,
    "system.stats.heatcap": template.data.stats.heatcap,
    "system.stats.save": template.data.stats.save,
    "system.stats.size": template.data.stats.size,
    "system.stats.speed": template.data.stats.speed,
    "system.hp_bonus": template.data.hp_bonus,
    "system.detail": template.data.detail,
    "system.actions": template.data.actions,
    "system.activation": template.data.activation,
    "system.deactivation": template.data.deactivation,
    "system.recall": template.data.recall,
    "system.redeploy": template.data.redeploy,
    "system.cost": template.data.cost,
    "system.instances": template.data.instances,
    "system.tags": template.data.tags,
    "system.counters": template.data.counters
  };

  await actor.update(update, { fabricatorEdit: true, ...options });
}

/**
 * Delete a saved template.
 */
export async function deleteTemplate(templateId) {
  const templates = getTemplates();
  delete templates[templateId];
  await game.settings.set(MODULE_ID, SETTING_KEY, templates);
}

/**
 * Show a dialog to pick a template from the saved list.
 * Returns the chosen template ID or null.
 */
export async function showTemplatePicker() {
  const templates = getTemplates();
  const entries = Object.values(templates);

  if (entries.length === 0) {
    ui.notifications.info("No saved deployable templates");
    return null;
  }

  return new Promise((resolve) => {
    const options = entries
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(t => `<option value="${t.id}">${t.name}</option>`)
      .join("");

    new Dialog({
      title: "Apply Deployable Template",
      content: `
        <form>
          <div class="form-group">
            <label>Template:</label>
            <select name="templateId">${options}</select>
          </div>
        </form>
      `,
      buttons: {
        apply: {
          label: "Apply",
          icon: '<i class="fas fa-check"></i>',
          callback: (html) => resolve(html.find('[name="templateId"]').val())
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      close: () => resolve(null)
    }).render(true);
  });
}
