/**
 * NPC <-> Player Transmuter
 *
 * Workshop for converting between NPC features and player items.
 * Pre-fills name and description from source; all mechanical decisions
 * are made by the user. No auto-mapping, no estimates, no suggestions.
 */

import { ITEM_PRESETS, VEHICLE_PRESETS, createFromPreset, showVehicleBuilder } from "./item-presets.mjs";

const MODULE_ID = "lancer-fabricator-main";

const DAMAGE_TYPES = ["Kinetic", "Explosive", "Energy", "Burn", "Heat", "Variable"];
const RANGE_TYPES = ["Range", "Threat", "Blast", "Burst", "Cone", "Line"];
const WEAPON_TYPES = ["Melee", "CQB", "Rifle", "Launcher", "Nexus"];
const MOUNT_SIZES = ["Auxiliary", "Main", "Heavy", "Superheavy"];
const NPC_FEATURE_TYPES = ["Weapon", "Tech", "System", "Trait", "Reaction"];
const ACTIVATION_TYPES = ["", "Free", "Quick", "Full", "Protocol", "Reaction", "Other"];

const NPC_ITEM_TYPES = new Set(["npc_feature"]);
const PLAYER_ITEM_TYPES = new Set(["mech_weapon", "mech_system"]);

const LOG_SETTING = "transmuterLog";
const LOG_MAX_ENTRIES = 200;

export class TransmuterApp extends Application {
  constructor(options = {}) {
    super(options);
    this.sourceItem = null;
    this.sourceData = null;
    this.direction = null;
    this.targetType = null;
    this.queue = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fabricator-transmuter",
      template: `modules/${MODULE_ID}/templates/transmuter.hbs`,
      classes: ["lancer", "fabricator-app", "fabricator-transmuter"],
      width: 740,
      height: 660,
      resizable: true,
      title: "NPC \u2194 Player Transmuter",
      dragDrop: [{ dropSelector: null }]
    });
  }

  getData() {
    let targetTypes = [];
    if (this.direction === "npc-to-player") {
      targetTypes = [
        { value: "mech_weapon", label: "Mech Weapon", selected: this.targetType === "mech_weapon" },
        { value: "mech_system", label: "Mech System", selected: this.targetType === "mech_system" }
      ];
    } else if (this.direction === "player-to-npc") {
      targetTypes = [
        { value: "npc_feature", label: "NPC Feature", selected: true }
      ];
    }

    return {
      hasSource: !!this.sourceItem,
      source: this.sourceData,
      direction: this.direction,
      targetType: this.targetType,
      targetTypes,
      queueLength: this.queue.length,
      damageTypes: DAMAGE_TYPES,
      rangeTypes: RANGE_TYPES,
      weaponTypes: WEAPON_TYPES,
      mountSizes: MOUNT_SIZES,
      npcFeatureTypes: NPC_FEATURE_TYPES,
      activationTypes: ACTIVATION_TYPES,
      presets: ITEM_PRESETS,
      vehiclePresets: VEHICLE_PRESETS
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];

    // Set initial data-target-type for CSS toggling
    const workspace = el.querySelector(".fabricator-transmuter-workspace");
    if (workspace && this.targetType) {
      workspace.dataset.targetType = this.targetType;
    }

    // Target type change — CSS toggle, no re-render
    el.querySelector(".transmuter-target-type")?.addEventListener("change", (e) => {
      this.targetType = e.target.value;
      workspace.dataset.targetType = this.targetType;
    });

    // Delegated click handler for add/delete buttons
    el.addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        const type = addBtn.dataset.add;
        const scope = addBtn.closest("fieldset, .transmuter-profile-card, .target-section");
        this._addEntry(el, type, scope);
        return;
      }

      const delBtn = e.target.closest("[data-delete]");
      if (delBtn) {
        const target = delBtn.closest(delBtn.dataset.delete);
        if (target) target.remove();
        return;
      }
    });

    // Create button
    el.querySelector(".transmuter-create")?.addEventListener("click", () => this._onCreate(el));

    // Skip button — skip current source, load next from queue
    el.querySelector(".transmuter-skip")?.addEventListener("click", () => {
      this._loadNextFromQueue();
    });

    // Clear queue
    el.querySelector(".transmuter-clear-queue")?.addEventListener("click", () => {
      this.queue = [];
      this.render(false);
    });

    // Reset button
    el.querySelector(".transmuter-reset")?.addEventListener("click", () => {
      this.sourceItem = null;
      this.sourceData = null;
      this.direction = null;
      this.targetType = null;
      this.queue = [];
      this.render(false);
    });

    // Preset buttons
    el.querySelectorAll(".transmuter-preset-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await createFromPreset(btn.dataset.presetId);
      });
    });

    // Vehicle preset buttons
    el.querySelectorAll(".transmuter-vehicle-btn").forEach(btn => {
      btn.addEventListener("click", () => showVehicleBuilder());
    });

    // View log button
    el.querySelector(".transmuter-view-log")?.addEventListener("click", () => {
      showTransmuterLog();
    });
  }

  // ---- Drag-Drop ----

  _canDragDrop() {
    return true;
  }

  async _onDrop(event) {
    let data;
    try {
      data = TextEditor.getDragEventData(event);
    } catch {
      try {
        data = JSON.parse(event.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }
    }

    if (data.type !== "Item") {
      ui.notifications.warn("Drop an Item to transmute");
      return;
    }

    const item = await fromUuid(data.uuid);
    if (!item) {
      ui.notifications.error("Could not resolve item");
      return;
    }

    if (!NPC_ITEM_TYPES.has(item.type) && !PLAYER_ITEM_TYPES.has(item.type)) {
      ui.notifications.warn(`Cannot transmute "${item.type}". Drop an NPC feature, mech weapon, or mech system.`);
      return;
    }

    // If already working on an item, queue this one
    if (this.sourceItem) {
      this.queue.push(item);
      ui.notifications.info(`Queued "${item.name}" for transmutation (${this.queue.length} in queue)`);
      this.render(false);
      return;
    }

    this._loadSource(item);
  }

  _loadSource(item) {
    if (NPC_ITEM_TYPES.has(item.type)) {
      this.direction = "npc-to-player";
      this.targetType = "mech_weapon";
    } else {
      this.direction = "player-to-npc";
      this.targetType = "npc_feature";
    }
    this.sourceItem = item;
    this.sourceData = this._extractSourceData(item);
    this.render(false);
  }

  _loadNextFromQueue() {
    if (this.queue.length === 0) {
      this.sourceItem = null;
      this.sourceData = null;
      this.direction = null;
      this.targetType = null;
      this.render(false);
      return;
    }
    const next = this.queue.shift();
    this._loadSource(next);
    if (this.queue.length > 0) {
      ui.notifications.info(`Loaded "${next.name}" \u2014 ${this.queue.length} remaining in queue`);
    }
  }

  // ---- Source Data Extraction ----

  _extractSourceData(item) {
    const sys = item.system;
    const data = {
      name: item.name,
      img: item.img,
      type: item.type,
      typeName: this._getTypeName(item),
      effect: "",
      plainEffect: "",
      on_hit: "",
      tags: [],
      actions: [],
      extraInfo: []
    };

    if (item.type === "npc_feature") {
      data.featureType = sys.type || "System";
      data.effect = sys.effect || "";
      data.on_hit = sys.on_hit || "";
      data.tags = this._extractTags(sys.tags);
      data.actions = this._extractActions(sys.actions);
      if (sys.type === "Weapon") {
        if (sys.weapon_type) data.extraInfo.push(`Weapon Type: ${sys.weapon_type}`);
        if (sys.damage) data.extraInfo.push(`Damage (raw): ${JSON.stringify(sys.damage)}`);
        if (sys.range) data.extraInfo.push(`Range (raw): ${JSON.stringify(sys.range)}`);
      }
    } else if (item.type === "mech_weapon") {
      data.extraInfo.push(`Mount: ${sys.size || "Main"}`);
      data.extraInfo.push(`SP: ${sys.sp || 0}`);
      const profiles = sys.profiles || [];
      profiles.forEach((p, i) => {
        const label = profiles.length > 1 ? ` [${p.name || `Profile ${i + 1}`}]` : "";
        if (p.effect) data.effect += (data.effect ? "\n\n" : "") + p.effect;
        const dmg = (p.damage || []).map(d => `${d.val} ${d.type}`).join(", ");
        const rng = (p.range || []).map(r => `${r.type} ${r.val}`).join(", ");
        if (dmg) data.extraInfo.push(`Damage${label}: ${dmg}`);
        if (rng) data.extraInfo.push(`Range${label}: ${rng}`);
        if (p.on_hit) data.extraInfo.push(`On Hit${label}: ${p.on_hit}`);
      });
      data.tags = profiles.flatMap(p => this._extractTags(p.tags));
    } else if (item.type === "mech_system") {
      data.effect = sys.effect || "";
      data.extraInfo.push(`SP: ${sys.sp || 0}`);
      data.tags = this._extractTags(sys.tags);
      data.actions = this._extractActions(sys.actions);
    }

    // Strip HTML for textarea pre-fill
    data.plainEffect = data.effect.replace(/<\/?[^>]+(>|$)/g, "").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

    return data;
  }

  _extractTags(tags) {
    if (!tags || !Array.isArray(tags)) return [];
    return tags.map(t => {
      if (typeof t === "string") return { name: t, val: "" };
      return {
        name: t.name || t.tag?.name || t.id || "Tag",
        val: t.val ?? ""
      };
    });
  }

  _extractActions(actions) {
    if (!actions || !Array.isArray(actions)) return [];
    return actions.map(a => ({
      name: a.name || "",
      activation: a.activation || "",
      detail: a.detail || "",
      trigger: a.trigger || ""
    }));
  }

  _getTypeName(item) {
    if (item.type === "npc_feature") return `NPC ${item.system?.type || "Feature"}`;
    if (item.type === "mech_weapon") return "Mech Weapon";
    if (item.type === "mech_system") return "Mech System";
    return item.type;
  }

  // ---- Dynamic Entry Management ----

  _addEntry(el, type, scope) {
    const tmpl = el.querySelector(`#transmuter-template-${type}`);
    if (!tmpl) return;
    const clone = document.importNode(tmpl.content, true);
    const searchIn = scope || el;
    const target = searchIn.querySelector(`.transmuter-${type}-list`);
    if (target) target.appendChild(clone);
  }

  // ---- Item Creation ----

  async _onCreate(el) {
    const itemData = this._readFormData(el);
    if (!itemData) return;

    try {
      const item = await Item.create(itemData);
      if (item) {
        const targetLabel = this._getTargetLabel();
        ui.notifications.info(`Created ${targetLabel}: ${item.name}`);

        // Chat message
        ChatMessage.create({
          content: `<div class="fabricator-chat-card" style="border-left-color: #9b59b6;">` +
            `<div class="fabricator-die-header"><strong><i class="fas fa-exchange-alt"></i> TRANSMUTED</strong></div>` +
            `<div>${this.sourceData?.typeName} <strong>"${this.sourceData?.name}"</strong></div>` +
            `<div style="text-align:center; color: #9b59b6; font-size: 14px;">\u2193</div>` +
            `<div>${targetLabel} <strong>"${item.name}"</strong></div>` +
            `</div>`,
          speaker: ChatMessage.getSpeaker()
        });

        // Log the transmutation
        await logTransmutation({
          timestamp: Date.now(),
          sourceName: this.sourceData?.name || "Unknown",
          sourceType: this.sourceData?.typeName || this.sourceItem?.type || "Unknown",
          sourceUuid: this.sourceItem?.uuid || null,
          resultName: item.name,
          resultType: targetLabel,
          resultUuid: item.uuid,
          user: game.user.name
        });

        // Auto-load next from queue
        this._loadNextFromQueue();
      }
    } catch (err) {
      console.error(`${MODULE_ID} | Failed to create transmuted item`, err);
      ui.notifications.error(`Failed to create item: ${err.message}`);
    }
  }

  _readFormData(el) {
    const name = el.querySelector('[name="target-name"]')?.value?.trim() || "Transmuted Item";

    if (this.targetType === "mech_weapon") return this._readMechWeaponData(el, name);
    if (this.targetType === "mech_system") return this._readMechSystemData(el, name);
    if (this.targetType === "npc_feature") return this._readNpcFeatureData(el, name);
    return null;
  }

  _readMechWeaponData(el, name) {
    const section = el.querySelector(".target-mech-weapon");
    const mount = section.querySelector('[name="weapon-mount"]')?.value || "Main";
    const sp = parseInt(section.querySelector('[name="weapon-sp"]')?.value) || 0;

    const profiles = [];
    section.querySelectorAll(".transmuter-profile-card").forEach(card => {
      profiles.push({
        name: card.querySelector('[name="profile-name"]')?.value || "",
        type: card.querySelector('[name="profile-type"]')?.value || "Rifle",
        damage: this._readEntries(card, "damage", (e) => ({
          type: e.querySelector('[name="damage-type"]')?.value || "Kinetic",
          val: e.querySelector('[name="damage-val"]')?.value || "0"
        })),
        range: this._readEntries(card, "range", (e) => ({
          type: e.querySelector('[name="range-type"]')?.value || "Range",
          val: parseInt(e.querySelector('[name="range-val"]')?.value) || 0
        })),
        tags: this._readTagEntries(card),
        effect: card.querySelector('[name="profile-effect"]')?.value || "",
        on_hit: card.querySelector('[name="profile-on-hit"]')?.value || "",
        on_crit: card.querySelector('[name="profile-on-crit"]')?.value || "",
        on_attack: "",
        description: "",
        cost: 0,
        skirmishable: false,
        barrageable: false,
        actions: [],
        bonuses: [],
        counters: [],
        synergies: []
      });
    });

    if (profiles.length === 0) {
      profiles.push(this._emptyProfile());
    }

    return this._wrapItemData(name, "mech_weapon", "icons/svg/sword.svg", {
      size: mount,
      sp,
      profiles,
      selected_profile_index: 0
    });
  }

  _readMechSystemData(el, name) {
    const section = el.querySelector(".target-mech-system");
    return this._wrapItemData(name, "mech_system", "icons/svg/cog.svg", {
      sp: parseInt(section.querySelector('[name="system-sp"]')?.value) || 0,
      effect: section.querySelector('[name="system-effect"]')?.value || "",
      actions: this._readActionEntries(section),
      tags: this._readTagEntries(section)
    });
  }

  _readNpcFeatureData(el, name) {
    const section = el.querySelector(".target-npc-feature");
    return this._wrapItemData(name, "npc_feature", "icons/svg/hazard.svg", {
      type: section.querySelector('[name="feature-type"]')?.value || "System",
      effect: section.querySelector('[name="feature-effect"]')?.value || "",
      on_hit: section.querySelector('[name="feature-on-hit"]')?.value || "",
      actions: this._readActionEntries(section),
      tags: this._readTagEntries(section),
      origin: { type: "custom", name: "Transmuted" }
    });
  }

  _readEntries(container, type, mapFn) {
    const entries = [];
    container.querySelectorAll(`.transmuter-${type}-entry`).forEach(e => {
      const result = mapFn(e);
      if (result) entries.push(result);
    });
    return entries;
  }

  _readTagEntries(container) {
    const tags = [];
    container.querySelectorAll(".transmuter-tag-entry").forEach(e => {
      const name = e.querySelector('[name="tag-name"]')?.value?.trim();
      const val = e.querySelector('[name="tag-val"]')?.value?.trim();
      if (name) tags.push({ id: name.toLowerCase().replace(/\s+/g, "_"), name, val: val || "" });
    });
    return tags;
  }

  _readActionEntries(container) {
    const actions = [];
    container.querySelectorAll(".transmuter-action-entry").forEach(e => {
      const name = e.querySelector('[name="action-name"]')?.value?.trim();
      const detail = e.querySelector('[name="action-detail"]')?.value?.trim();
      if (name || detail) {
        actions.push({
          name: name || "",
          activation: e.querySelector('[name="action-activation"]')?.value || "",
          detail: detail || "",
          trigger: e.querySelector('[name="action-trigger"]')?.value?.trim() || ""
        });
      }
    });
    return actions;
  }

  _wrapItemData(name, type, img, system) {
    return {
      name,
      type,
      img,
      system,
      flags: {
        [MODULE_ID]: {
          transmuted: true,
          sourceUuid: this.sourceItem?.uuid || null,
          sourceName: this.sourceItem?.name || null
        }
      }
    };
  }

  _emptyProfile() {
    return {
      name: "", type: "Rifle", damage: [], range: [], tags: [],
      effect: "", on_hit: "", on_crit: "", on_attack: "",
      description: "", cost: 0, skirmishable: false, barrageable: false,
      actions: [], bonuses: [], counters: [], synergies: []
    };
  }

  _getTargetLabel() {
    if (this.targetType === "mech_weapon") return "Mech Weapon";
    if (this.targetType === "mech_system") return "Mech System";
    if (this.targetType === "npc_feature") return "NPC Feature";
    return this.targetType;
  }
}

// ============================================
// Transmutation Log
// ============================================

export function registerTransmuterSettings() {
  game.settings.register(MODULE_ID, LOG_SETTING, {
    name: "Transmuter Log",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
}

export function getTransmuterLog() {
  return game.settings.get(MODULE_ID, LOG_SETTING) || [];
}

async function logTransmutation(entry) {
  const log = getTransmuterLog();
  log.unshift(entry);
  if (log.length > LOG_MAX_ENTRIES) log.length = LOG_MAX_ENTRIES;
  await game.settings.set(MODULE_ID, LOG_SETTING, log);
}

export async function clearTransmuterLog() {
  await game.settings.set(MODULE_ID, LOG_SETTING, []);
  ui.notifications.info("Transmuter log cleared");
}

export function showTransmuterLog() {
  const log = getTransmuterLog();

  if (log.length === 0) {
    new Dialog({
      title: "Transmutation Log",
      content: `<p style="text-align:center; color:#888; padding:20px;">No transmutations recorded yet.</p>`,
      buttons: { ok: { label: "Close" } }
    }).render(true);
    return;
  }

  const rows = log.map(entry => {
    const date = new Date(entry.timestamp);
    const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return `<tr class="transmuter-log-row">
      <td class="transmuter-log-date">${dateStr}</td>
      <td class="transmuter-log-source">${entry.sourceType}<br><strong>${entry.sourceName}</strong></td>
      <td class="transmuter-log-arrow">\u2192</td>
      <td class="transmuter-log-result">${entry.resultType}<br><strong>${entry.resultName}</strong></td>
      <td class="transmuter-log-user">${entry.user}</td>
    </tr>`;
  }).join("");

  new Dialog({
    title: "Transmutation Log",
    content: `
      <div class="transmuter-log-container">
        <table class="transmuter-log-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Source</th>
              <th></th>
              <th>Result</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
    buttons: {
      clear: {
        label: '<i class="fas fa-trash"></i> Clear Log',
        callback: async () => {
          await clearTransmuterLog();
        }
      },
      close: {
        label: "Close"
      }
    },
    default: "close"
  }, { width: 600, height: 400, resizable: true }).render(true);
}

// ---- Singleton ----

let transmuterInstance = null;

export function showTransmuter() {
  if (transmuterInstance) {
    transmuterInstance.render(true);
    return transmuterInstance;
  }
  transmuterInstance = new TransmuterApp();
  const originalClose = transmuterInstance.close.bind(transmuterInstance);
  transmuterInstance.close = async (...args) => {
    transmuterInstance = null;
    return originalClose(...args);
  };
  transmuterInstance.render(true);
  return transmuterInstance;
}
