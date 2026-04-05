/**
 * Presets — Predefined homebrew items and vehicle actors that can be
 * created directly from the transmuter without needing a source item.
 */

const MODULE_ID = "lancer-fabricator-main";

// ============================================
// Item Presets (mech weapons, systems, etc.)
// ============================================

export const ITEM_PRESETS = [
  {
    id: "bug_bomb",
    name: "Bug Bomb",
    category: "Mech System",
    description: "Prototype short-cycle lance delivery system. Launches a payload to a chosen point, detonating in a devastating line.",
    itemData: {
      name: "Bug Bomb",
      type: "mech_system",
      img: "icons/svg/explosion.svg",
      system: {
        sp: 0,
        effect: "<p>Choose a point within <b>Range 20</b>. From that point, draw a <b>Line 30</b> in any direction. All characters and objects within the Line must succeed on an <b>Agility save</b> or take <b>1 Structure damage</b> and are reduced to <b>1 HP</b>. On a success, targets are reduced to <b>1 HP</b>. Objects smaller than <b>Size 5</b> in the Line are annihilated.</p>",
        actions: [{
          name: "Bug Bomb",
          activation: "Full",
          detail: "Choose a point within Range 20. From that point, draw a Line 30 in any direction. Agility save or 1 Structure damage (reduced to 1 HP on success). Objects < Size 5 annihilated.",
          trigger: ""
        }],
        tags: [
          { id: "tg_limited", name: "Limited", val: "1" },
          { id: "tg_unique", name: "Unique", val: "" }
        ]
      }
    }
  },
  {
    id: "kavalieros_hardlight_rifle",
    name: "Mobile-Pattern Hardlight Rifle",
    category: "Mech Weapon",
    description: "Aunic Kavalieros standard-issue energy rifle. Fires in a line, applying heat to targets.",
    itemData: {
      name: "Mobile-Pattern Hardlight Rifle",
      type: "mech_weapon",
      img: "icons/svg/sword.svg",
      system: {
        size: "Main",
        sp: 0,
        profiles: [{
          name: "",
          type: "Rifle",
          damage: [
            { type: "Energy", val: "1d6" },
            { type: "Heat", val: "1" }
          ],
          range: [
            { type: "Line", val: 15 }
          ],
          tags: [
            { id: "tg_heat_target", name: "Heat (Self)", val: "1" }
          ],
          effect: "",
          on_hit: "",
          on_crit: "",
          on_attack: "",
          description: "",
          cost: 0,
          skirmishable: true,
          barrageable: true,
          actions: [], bonuses: [], counters: [], synergies: []
        }],
        selected_profile_index: 0
      }
    }
  },
  {
    id: "kavalieros_hardlight_lance",
    name: "Hardlight Lance",
    category: "Mech Weapon",
    description: "Aunic Kavalieros heavy energy lance. Long-range line weapon with heat application.",
    itemData: {
      name: "Hardlight Lance",
      type: "mech_weapon",
      img: "icons/svg/sword.svg",
      system: {
        size: "Heavy",
        sp: 0,
        profiles: [{
          name: "",
          type: "Rifle",
          damage: [
            { type: "Energy", val: "2d6+2" },
            { type: "Heat", val: "1" }
          ],
          range: [
            { type: "Line", val: 20 }
          ],
          tags: [
            { id: "tg_heat_target", name: "Heat (Self)", val: "1" }
          ],
          effect: "",
          on_hit: "",
          on_crit: "",
          on_attack: "",
          description: "",
          cost: 0,
          skirmishable: false,
          barrageable: true,
          actions: [], bonuses: [], counters: [], synergies: []
        }],
        selected_profile_index: 0
      }
    }
  },
  {
    id: "kavalieros_plate_mines",
    name: "Plate Mines",
    category: "Mech Weapon",
    description: "Aunic Kavalieros deployable explosive mines. Thrown or planted, with two fire modes.",
    itemData: {
      name: "Plate Mines",
      type: "mech_weapon",
      img: "icons/svg/explosion.svg",
      system: {
        size: "Auxiliary",
        sp: 0,
        profiles: [
          {
            name: "Thrown",
            type: "Launcher",
            damage: [{ type: "Explosive", val: "1d6+2" }],
            range: [{ type: "Range", val: 7 }],
            tags: [
              { id: "tg_limited", name: "Limited", val: "3" },
              { id: "tg_thrown", name: "Thrown", val: "" }
            ],
            effect: "Single target. Make an attack roll against one target within Range 7.",
            on_hit: "", on_crit: "", on_attack: "",
            description: "", cost: 0, skirmishable: true, barrageable: false,
            actions: [], bonuses: [], counters: [], synergies: []
          },
          {
            name: "Spread",
            type: "Launcher",
            damage: [{ type: "Explosive", val: "1d6+2" }],
            range: [{ type: "Range", val: 7 }, { type: "Blast", val: 4 }],
            tags: [
              { id: "tg_limited", name: "Limited", val: "3" },
              { id: "tg_thrown", name: "Thrown", val: "" }
            ],
            effect: "Scatter mines in Blast 4. No attack roll; all characters in the blast must pass a Systems save or take full damage. On success, half damage.",
            on_hit: "", on_crit: "", on_attack: "",
            description: "", cost: 0, skirmishable: false, barrageable: false,
            actions: [], bonuses: [], counters: [], synergies: []
          }
        ],
        selected_profile_index: 0
      }
    }
  }
];

// ============================================
// Vehicle Presets (mech-type actors)
// ============================================

export const VEHICLE_PRESETS = [
  {
    id: "kavalieros_coil_bike",
    name: "Kavalieros Coil Bike",
    category: "Vehicle",
    description: "Aunic all-terrain reconnaissance bike. Fast, light, and nimble. Captured from Kavalieros scouts.",
    actorData: {
      name: "Kavalieros Coil Bike",
      type: "mech",
      img: "icons/svg/mech.svg"
    },
    // Applied after actor creation via system updates
    stats: {
      hp: 15,
      armor: 1,
      evasion: 12,
      edef: 8,
      speed: 16,
      sensor: 10,
      save: 10,
      size: 1,
      structure: 1,
      stress: 1,
      repairs: 2
    },
    detail: "<h2>Kavalieros Coil Bike</h2>" +
      "<p>A nimble, rugged all-terrain bike captured from Aunic Kavalieros scouts. " +
      "Designed for reconnaissance and fast strike operations far afield from the main force.</p>" +
      "<p><b>Mounted Restrictions:</b> Cannot mount Heavy or Superheavy weapons. " +
      "Speed is halved in difficult terrain. May use Main, Auxiliary, Thrown, or Deployable weapons while riding.</p>" +
      "<p><b>Mount/Dismount:</b> Quick action to mount or dismount. While dismounted, use pilot stats and the bike is an independent object (Size 1, 15 HP, 1 Armor, 12 Evasion).</p>",
    defaultItems: ["kavalieros_hardlight_rifle"]
  }
];

/**
 * Get all available preset items.
 */
export function getPresetItems() {
  return ITEM_PRESETS;
}

/**
 * Get all available vehicle presets.
 */
export function getVehiclePresets() {
  return VEHICLE_PRESETS;
}

/**
 * Create a Foundry Item from a preset definition.
 */
export async function createFromPreset(presetId) {
  const preset = ITEM_PRESETS.find(p => p.id === presetId);
  if (!preset) {
    ui.notifications.error(`Unknown preset: ${presetId}`);
    return null;
  }

  const data = foundry.utils.deepClone(preset.itemData);
  data.flags = {
    [MODULE_ID]: {
      transmuted: true,
      preset: presetId
    }
  };

  try {
    const item = await Item.create(data);
    if (item) {
      ui.notifications.info(`Created ${preset.category}: ${item.name}`);

      ChatMessage.create({
        content: `<div class="fabricator-chat-card" style="border-left-color: #9b59b6;">` +
          `<div class="fabricator-die-header"><strong><i class="fas fa-cube"></i> PRESET CREATED</strong></div>` +
          `<div>${preset.category} <strong>"${item.name}"</strong></div>` +
          `<div style="color: #888; font-size: 12px;">${preset.description}</div>` +
          `</div>`,
        speaker: ChatMessage.getSpeaker()
      });
    }
    return item;
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to create preset item`, err);
    ui.notifications.error(`Failed to create item: ${err.message}`);
    return null;
  }
}

/**
 * Create a vehicle (mech-type actor) from a vehicle preset and optionally
 * link it to a pilot. Also creates and embeds any default weapon items.
 *
 * @param {string} presetId - Vehicle preset ID
 * @param {Object} [options]
 * @param {Actor} [options.pilot] - Pilot actor to link as owner
 * @param {string} [options.name] - Override the default name
 * @returns {Promise<Actor|null>} The created mech actor
 */
export async function createVehicle(presetId, options = {}) {
  const preset = VEHICLE_PRESETS.find(p => p.id === presetId);
  if (!preset) {
    ui.notifications.error(`Unknown vehicle preset: ${presetId}`);
    return null;
  }

  const actorData = foundry.utils.deepClone(preset.actorData);
  if (options.name) actorData.name = options.name;

  try {
    const actor = await Actor.create(actorData);
    if (!actor) return null;

    // Apply stats — the Lancer system uses dotted paths under system
    const updates = {};
    const s = preset.stats;
    if (s.hp != null) updates["system.hp.max"] = s.hp;
    if (s.hp != null) updates["system.hp.value"] = s.hp;
    if (s.armor != null) updates["system.armor"] = s.armor;
    if (s.evasion != null) updates["system.evasion"] = s.evasion;
    if (s.edef != null) updates["system.edef"] = s.edef;
    if (s.speed != null) updates["system.speed"] = s.speed;
    if (s.sensor != null) updates["system.sensor_range"] = s.sensor;
    if (s.save != null) updates["system.save"] = s.save;
    if (s.size != null) updates["system.size"] = s.size;
    if (s.structure != null) updates["system.structure.max"] = s.structure;
    if (s.structure != null) updates["system.structure.value"] = s.structure;
    if (s.stress != null) updates["system.stress.max"] = s.stress;
    if (s.stress != null) updates["system.stress.value"] = s.stress;
    if (s.repairs != null) updates["system.repairs.max"] = s.repairs;
    if (s.repairs != null) updates["system.repairs.value"] = s.repairs;
    if (preset.detail) updates["system.detail"] = preset.detail;

    await actor.update(updates);

    // Link to pilot (bidirectional)
    if (options.pilot) {
      await actor.update({ "system.pilot": options.pilot.uuid });
      await options.pilot.update({ "system.active_mech": actor.uuid });
    }

    // Create and embed default weapon items
    if (preset.defaultItems?.length) {
      const itemDocs = [];
      for (const itemPresetId of preset.defaultItems) {
        const itemPreset = ITEM_PRESETS.find(p => p.id === itemPresetId);
        if (itemPreset) {
          const itemData = foundry.utils.deepClone(itemPreset.itemData);
          itemData.flags = { [MODULE_ID]: { preset: itemPresetId } };
          itemDocs.push(itemData);
        }
      }
      if (itemDocs.length) {
        await actor.createEmbeddedDocuments("Item", itemDocs);
      }
    }

    ui.notifications.info(`Created vehicle: ${actor.name}`);

    ChatMessage.create({
      content: `<div class="fabricator-chat-card" style="border-left-color: #2ecc71;">` +
        `<div class="fabricator-die-header"><strong><i class="fas fa-motorcycle"></i> VEHICLE CREATED</strong></div>` +
        `<div>${preset.category} <strong>"${actor.name}"</strong></div>` +
        `<div style="color: #888; font-size: 12px;">${preset.description}</div>` +
        `${options.pilot ? `<div style="color: #2ecc71; font-size: 12px; margin-top: 4px;">Linked to pilot: ${options.pilot.name}</div>` : ""}` +
        `</div>`,
      speaker: ChatMessage.getSpeaker()
    });

    return actor;
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to create vehicle`, err);
    ui.notifications.error(`Failed to create vehicle: ${err.message}`);
    return null;
  }
}

/**
 * Show a dialog for creating a vehicle from presets.
 */
export async function showVehicleBuilder() {
  if (VEHICLE_PRESETS.length === 0) {
    ui.notifications.warn("No vehicle presets available");
    return null;
  }

  const presetOptions = VEHICLE_PRESETS
    .map(p => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  const pilotOptions = game.actors
    .filter(a => a.type === "pilot" && a.isOwner)
    .map(a => `<option value="${a.id}">${a.name}</option>`)
    .join("");

  return new Promise((resolve) => {
    new Dialog({
      title: "Create Vehicle",
      content: `
        <form class="fabricator-builder-form">
          <div class="form-group">
            <label>Vehicle</label>
            <select name="preset">${presetOptions}</select>
          </div>
          <div class="form-group">
            <label>Name (optional override)</label>
            <input type="text" name="name" placeholder="Leave blank for default" />
          </div>
          <div class="form-group">
            <label>Link to Pilot</label>
            <select name="pilot">
              <option value="">(None)</option>
              ${pilotOptions}
            </select>
          </div>
        </form>
      `,
      buttons: {
        create: {
          label: '<i class="fas fa-plus"></i> Create',
          callback: async (html) => {
            const presetId = html.find('[name="preset"]').val();
            const name = html.find('[name="name"]').val()?.trim() || undefined;
            const pilotId = html.find('[name="pilot"]').val();
            const pilot = pilotId ? game.actors.get(pilotId) : undefined;
            const actor = await createVehicle(presetId, { name, pilot });
            resolve(actor);
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "create"
    }).render(true);
  });
}
