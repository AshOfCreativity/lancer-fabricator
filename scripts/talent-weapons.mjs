/**
 * Talent Trigger Weapons
 *
 * Creates synthetic mech_weapon items on a pilot's mech for talent trigger
 * abilities (Brawler's Knockout Blow, Stormbringer's Massive Attack).
 *
 * Each weapon has two profiles like the Barbarossa's Apocalypse Rail:
 *   Profile 0: "Uncharged" — no damage, shows current die progress
 *   Profile 1: "Charged"  — full damage and effects, available at die minimum
 *
 * Weapons are flagged with lancer-fabricator.talentWeapon so they can be
 * identified, updated, and cleaned up automatically.
 */

import { getTalentDie, PATTERN } from "./talent-dice-data.mjs";
import { getDieState } from "./talent-dice-tracker.mjs";

const MODULE_ID = "lancer-fabricator";

/**
 * Talent trigger weapon definitions.
 * Only countdown-pattern talents with a trigger ability get weapons.
 */
const TRIGGER_WEAPONS = {
  t_brawler: {
    name: "Knockout Blow",
    img: "icons/svg/sword.svg",
    size: "Auxiliary",
    uncharged: {
      name: "Knockout Blow — Uncharged",
      type: "Melee",
      damage: [],
      range: [{ type: "Threat", val: 1 }],
      tags: [],
      effect: "",
      on_hit: "",
      description: "Brawler Die has not reached 1. Decrement by landing Grapples, Rams, or Improvised Attacks."
    },
    charged: {
      name: "KNOCKOUT BLOW",
      type: "Melee",
      damage: [{ type: "Kinetic", val: "2d6" }],
      range: [{ type: "Threat", val: 1 }],
      tags: [{ id: "tg_ap", val: "" }],
      effect: "Target must pass a Hull save or be Stunned until end of their next turn. Resets Brawler Die to 6.",
      on_hit: "Hull save or Stunned until end of next turn.",
      description: "READY. 2d6 AP Kinetic. Spend to deliver the blow and reset your Brawler Die."
    }
  },

  t_stormbringer: {
    name: "Massive Attack",
    img: "icons/svg/explosion.svg",
    size: "Main",
    uncharged: {
      name: "Massive Attack — Uncharged",
      type: "Launcher",
      damage: [],
      range: [{ type: "Blast", val: 1 }],
      tags: [],
      effect: "",
      on_hit: "",
      description: "Torrent Die has not reached 1. Decrement by hitting with Launcher weapons (1/round)."
    },
    charged: {
      name: "MASSIVE ATTACK",
      type: "Launcher",
      damage: [{ type: "Explosive", val: "2d6" }],
      range: [{ type: "Blast", val: 1 }],
      tags: [],
      effect: "Full Action. 2d6 Explosive in Blast 1. Resets Torrent Die to 6.",
      on_hit: "",
      description: "READY. Full Action — 2d6 Explosive, Blast 1. Spend to unleash and reset your Torrent Die."
    }
  }
};

/**
 * Build a full profile object with all required LANCER fields.
 */
function buildProfile(data) {
  return {
    name: data.name || "",
    type: data.type || "Melee",
    damage: data.damage || [],
    range: data.range || [],
    tags: data.tags || [],
    description: data.description || "",
    effect: data.effect || "",
    on_attack: data.on_attack || "",
    on_hit: data.on_hit || "",
    on_crit: data.on_crit || "",
    cost: 0,
    skirmishable: false,
    barrageable: false,
    actions: [],
    bonuses: [],
    counters: [],
    synergies: []
  };
}

/**
 * Build the uncharged profile with current die progress in the description.
 */
function buildUnchargedProfile(weaponDef, dieState, dieDef) {
  const progress = dieState
    ? `Brawler/Torrent Die: ${dieState.value}/${dieDef.maxValue}`
    : "Die state unknown";
  const profile = buildProfile(weaponDef.uncharged);
  profile.description = `${progress} — ${weaponDef.uncharged.description}`;
  return profile;
}

/**
 * Sync talent trigger weapons on a pilot's mech(s).
 *
 * Creates weapons that don't exist, updates profiles based on die state,
 * and removes weapons for unequipped talents.
 *
 * @param {Actor} pilot - LANCER pilot actor
 */
export async function syncTalentWeapons(pilot) {
  if (pilot?.type !== "pilot") return;

  const mechs = findMechsForPilot(pilot);
  if (mechs.length === 0) return;

  for (const mech of mechs) {
    for (const [talentId, weaponDef] of Object.entries(TRIGGER_WEAPONS)) {
      const dieDef = getTalentDie(talentId);
      if (!dieDef) continue;

      const dieState = getDieState(pilot, talentId);
      const existingWeapon = findTalentWeapon(mech, talentId);

      if (!dieState) {
        // Talent not equipped — remove weapon if it exists
        if (existingWeapon) {
          await mech.deleteEmbeddedDocuments("Item", [existingWeapon.id]);
        }
        continue;
      }

      const isCharged = dieState.value === dieDef.minValue && !dieState.locked;

      if (!existingWeapon) {
        // Create the weapon with both profiles
        await createTalentWeapon(mech, talentId, weaponDef, dieState, dieDef, isCharged);
      } else {
        // Update the existing weapon's profiles and selected index
        await updateTalentWeapon(existingWeapon, weaponDef, dieState, dieDef, isCharged);
      }
    }
  }
}

/**
 * Create a new talent weapon on the mech with dual profiles.
 */
async function createTalentWeapon(mech, talentId, weaponDef, dieState, dieDef, isCharged) {
  const itemData = {
    name: weaponDef.name,
    type: "mech_weapon",
    img: weaponDef.img,
    system: {
      size: weaponDef.size,
      profiles: [
        buildUnchargedProfile(weaponDef, dieState, dieDef),
        buildProfile(weaponDef.charged)
      ],
      selected_profile_index: isCharged ? 1 : 0
    },
    flags: {
      [MODULE_ID]: { talentWeapon: talentId }
    }
  };

  try {
    await mech.createEmbeddedDocuments("Item", [itemData]);
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to create talent weapon "${weaponDef.name}" on ${mech.name}`, err);
  }
}

/**
 * Update an existing talent weapon's profiles and selected index.
 */
async function updateTalentWeapon(weapon, weaponDef, dieState, dieDef, isCharged) {
  const uncharged = buildUnchargedProfile(weaponDef, dieState, dieDef);

  try {
    await weapon.update({
      "system.profiles": [
        uncharged,
        buildProfile(weaponDef.charged)
      ],
      "system.selected_profile_index": isCharged ? 1 : 0
    });
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to update talent weapon "${weapon.name}"`, err);
  }
}

/**
 * Find a fabricator-managed talent weapon on a mech.
 */
function findTalentWeapon(mech, talentId) {
  return mech.items.find(i =>
    i.type === "mech_weapon" &&
    i.getFlag(MODULE_ID, "talentWeapon") === talentId
  );
}

/**
 * Find all mech actors linked to a pilot.
 * LANCER stores the pilot reference as a SyncUUIDRefField with .id (UUID string).
 */
function findMechsForPilot(pilot) {
  const pilotUuid = pilot.uuid;
  const pilotId = pilot.id;
  return game.actors.filter(a => {
    if (a.type !== "mech") return false;
    const ref = a.system?.pilot;
    if (!ref) return false;
    // SyncUUIDRefField: .id is the UUID, .value is the resolved actor
    return ref.id === pilotUuid || ref.value?.id === pilotId;
  });
}

/**
 * Remove all fabricator-managed weapons from a mech.
 */
export async function cleanupTalentWeapons(mech) {
  const weapons = mech.items.filter(i =>
    i.type === "mech_weapon" && i.getFlag(MODULE_ID, "talentWeapon")
  );
  if (weapons.length > 0) {
    await mech.deleteEmbeddedDocuments("Item", weapons.map(w => w.id));
  }
}

/**
 * Get available trigger weapon talent IDs (for external use).
 */
export function getTriggerWeaponTalentIds() {
  return Object.keys(TRIGGER_WEAPONS);
}
