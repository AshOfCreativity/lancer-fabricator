import { STATUS_WHERE, STATUS_TYPE, findStatusesForFeature } from "./npc-status-data.mjs";
import { EFFECT_TYPE, EFFECT_PRESETS, analyzeFeatureText, getEffectSummary } from "./npc-status-effects.mjs";

const MODULE_ID = "lancer-fabricator-main";
const SETTING_KEY = "customNpcStatuses";

const ICON_OPTIONS = [
  { value: "eye", label: "Eye (overwatch, surveillance)" },
  { value: "mark", label: "Crosshair (marks, targeting)" },
  { value: "shield", label: "Shield (defense, wards)" },
  { value: "armed", label: "Bolt (armed, loaded, charged)" },
  { value: "flame", label: "Flame (heat, fire effects)" },
  { value: "link", label: "Link (bonds, transfers)" },
  { value: "timer", label: "Timer (deferred, staged)" },
  { value: "stack", label: "Stack (accumulators)" },
  { value: "zone", label: "Zone (area effects)" },
  { value: "cloak", label: "Cloak (stealth, hidden)" },
  { value: "lock", label: "Lock (pinned, suppressed)" },
  { value: "wing", label: "Wing (flight, movement)" }
];

const ICON_PATH = `modules/${MODULE_ID}/assets/icons/statuses`;

// ─── World-Level Setting ────────────────────────────────────

export function registerCustomStatusSettings() {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "Custom NPC Feature Statuses",
    hint: "GM-defined status tracking for NPC features not in the built-in registry",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
}

export function getCustomStatuses() {
  return game.settings.get(MODULE_ID, SETTING_KEY) ?? {};
}

export async function saveCustomStatus(lid, statusDef) {
  const current = getCustomStatuses();
  current[lid] = statusDef;
  await game.settings.set(MODULE_ID, SETTING_KEY, current);
}

export async function deleteCustomStatus(lid) {
  const current = getCustomStatuses();
  delete current[lid];
  await game.settings.set(MODULE_ID, SETTING_KEY, current);
}

export function getCustomStatusForLid(lid) {
  const customs = getCustomStatuses();
  return customs[lid] ?? null;
}

// ─── Merged Registry ────────────────────────────────────────

export function findStatusForFeatureMerged(item) {
  const builtIn = findStatusesForFeature(item);
  if (builtIn.length > 0) return builtIn;

  const lid = item.system?.lid;
  if (!lid) return [];

  const custom = getCustomStatusForLid(lid);
  if (custom) return [custom];

  return [];
}

// ─── Status Config Dialog ───────────────────────────────────

export class NpcStatusConfigDialog extends FormApplication {
  constructor(item, options = {}) {
    super(item, options);
    this.item = item;
    this.nlSuggestions = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fab-npc-status-config",
      title: "Configure NPC Feature Status",
      template: `modules/${MODULE_ID}/templates/npc-status-config.hbs`,
      classes: ["lancer", "fabricator", "fab-status-config"],
      width: 520,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData() {
    const item = this.item;
    const lid = item.system?.lid ?? "";
    const existing = getCustomStatusForLid(lid);
    const builtIn = findStatusesForFeature(item);
    const isBuiltIn = builtIn.length > 0;

    const effectText = item.system?.effect ?? item.system?.description ?? "";
    this.nlSuggestions = analyzeFeatureText(effectText);

    const statusWhereOptions = Object.entries(STATUS_WHERE).map(([key, value]) => ({
      value, label: key.charAt(0) + key.slice(1).toLowerCase()
    }));
    const statusTypeOptions = Object.entries(STATUS_TYPE).map(([key, value]) => ({
      value, label: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, " ")
    }));
    const effectTypeOptions = Object.entries(EFFECT_PRESETS).map(([key, preset]) => ({
      value: key, label: preset.label, description: preset.description
    }));

    return {
      item,
      lid,
      isBuiltIn,
      builtInDef: builtIn[0] ?? null,
      existing,
      effectText: effectText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      nlSuggestions: this.nlSuggestions,
      hasNlSuggestions: this.nlSuggestions.length > 0,
      iconOptions: ICON_OPTIONS,
      statusWhereOptions,
      statusTypeOptions,
      effectTypeOptions,
      effectPresets: EFFECT_PRESETS,
      currentEffects: existing?.effects ?? [],
      currentName: existing?.name ?? item.name,
      currentIcon: existing?.iconKey ?? "mark",
      currentWhere: existing?.where ?? STATUS_WHERE.SELF,
      currentStatusType: existing?.statusType ?? STATUS_TYPE.TOGGLE,
      currentDescription: existing?.description ?? ""
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".fab-add-effect").on("click", this._onAddEffect.bind(this));
    html.find(".fab-remove-effect").on("click", this._onRemoveEffect.bind(this));
    html.find(".fab-apply-suggestion").on("click", this._onApplySuggestion.bind(this));
    html.find(".fab-delete-custom").on("click", this._onDeleteCustom.bind(this));
  }

  async _onAddEffect(event) {
    event.preventDefault();
    const typeSelect = this.element.find('[name="newEffectType"]');
    const type = typeSelect.val();
    if (!type) return;

    const preset = EFFECT_PRESETS[type];
    if (!preset) return;

    const params = {};
    for (const [key, spec] of Object.entries(preset.params)) {
      params[key] = spec.default ?? "";
    }

    const effectsList = this.element.find(".fab-effects-list");
    const index = effectsList.children().length;
    const html = this._renderEffectRow({ type, params }, index);
    effectsList.append(html);
    this.setPosition({ height: "auto" });
  }

  _onRemoveEffect(event) {
    event.preventDefault();
    $(event.currentTarget).closest(".fab-effect-row").remove();
    this.setPosition({ height: "auto" });
  }

  async _onApplySuggestion(event) {
    event.preventDefault();
    const idx = parseInt(event.currentTarget.dataset.index);
    const suggestion = this.nlSuggestions[idx];
    if (!suggestion) return;

    const effectsList = this.element.find(".fab-effects-list");
    const rowIndex = effectsList.children().length;
    const html = this._renderEffectRow({ type: suggestion.type, params: suggestion.params }, rowIndex);
    effectsList.append(html);
    this.setPosition({ height: "auto" });
  }

  async _onDeleteCustom(event) {
    event.preventDefault();
    const lid = this.item.system?.lid;
    if (!lid) return;
    await deleteCustomStatus(lid);
    ui.notifications.info(`Removed custom status tracking for ${this.item.name}`);
    this.close();
  }

  _renderEffectRow(effect, index) {
    const preset = EFFECT_PRESETS[effect.type];
    if (!preset) return "";

    let paramsHtml = "";
    for (const [key, spec] of Object.entries(preset.params)) {
      const value = effect.params[key] ?? spec.default ?? "";
      const fieldName = `effects.${index}.params.${key}`;

      if (spec.type === "select") {
        const options = (spec.options || []).map(o =>
          `<option value="${o}" ${value === o ? "selected" : ""}>${o}</option>`
        ).join("");
        paramsHtml += `<div class="form-group"><label>${spec.label}</label><select name="${fieldName}">${options}</select></div>`;
      } else if (spec.type === "boolean") {
        paramsHtml += `<div class="form-group"><label>${spec.label}</label><input type="checkbox" name="${fieldName}" ${value ? "checked" : ""} /></div>`;
      } else if (spec.type === "number") {
        paramsHtml += `<div class="form-group"><label>${spec.label}</label><input type="number" name="${fieldName}" value="${value}" /></div>`;
      } else {
        paramsHtml += `<div class="form-group"><label>${spec.label}</label><input type="text" name="${fieldName}" value="${value}" /></div>`;
      }
    }

    return `
      <div class="fab-effect-row" data-index="${index}">
        <div class="fab-effect-header">
          <strong>${preset.label}</strong>
          <input type="hidden" name="effects.${index}.type" value="${effect.type}" />
          <button type="button" class="fab-remove-effect" title="Remove"><i class="fas fa-times"></i></button>
        </div>
        <div class="fab-effect-params">${paramsHtml}</div>
      </div>
    `;
  }

  async _updateObject(event, formData) {
    const lid = this.item.system?.lid;
    if (!lid) {
      ui.notifications.warn("Cannot track a feature without a content ID (LID)");
      return;
    }

    const effects = [];
    const effectEntries = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!key.startsWith("effects.")) continue;
      const parts = key.split(".");
      const idx = parseInt(parts[1]);
      const field = parts.slice(2).join(".");
      if (!effectEntries[idx]) effectEntries[idx] = {};
      foundry.utils.setProperty(effectEntries[idx], field, value);
    }
    for (const idx of Object.keys(effectEntries).sort((a, b) => a - b)) {
      const entry = effectEntries[idx];
      if (entry.type) {
        effects.push({ type: entry.type, params: entry.params || {} });
      }
    }

    const iconKey = formData.iconKey || "mark";
    const statusDef = {
      id: `fab_custom_${lid}`,
      name: formData.name || this.item.name,
      lid,
      where: formData.where || STATUS_WHERE.SELF,
      statusType: formData.statusType || STATUS_TYPE.TOGGLE,
      icon: `${ICON_PATH}/${iconKey}.svg`,
      iconKey,
      description: formData.description || "",
      effects,
      custom: true
    };

    if (statusDef.statusType === STATUS_TYPE.ACCUMULATOR) {
      statusDef.maxStacks = parseInt(formData.maxStacks) || 8;
    }
    if (statusDef.statusType === STATUS_TYPE.STAGED) {
      statusDef.maxStages = parseInt(formData.maxStages) || 3;
    }

    await saveCustomStatus(lid, statusDef);
    ui.notifications.info(`Status tracking configured for ${statusDef.name}`);
  }
}

export function openStatusConfig(item) {
  new NpcStatusConfigDialog(item).render(true);
}
