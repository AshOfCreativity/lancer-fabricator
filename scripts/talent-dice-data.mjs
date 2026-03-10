/**
 * Talent Dice Registry
 *
 * Defines all official LANCER talents that use die-tracking mechanics.
 * Data sourced from massif-press lancer-data repos:
 *   Core:         massif-press/lancer-data
 *   Dustgrave:    massif-press/dustgrave-data
 *   Siren's Song: massif-press/ssmr-data
 *
 * Three mechanic patterns:
 *   A) Countdown  - starts high, decrements on action, triggers at min
 *   B) Countup    - starts low, increments on event, spent for effects
 *   C) Pool       - distributable dice given to self/allies, spent for tiered effects
 */

export const PATTERN = {
  COUNTDOWN: "countdown",
  COUNTUP: "countup",
  POOL: "pool"
};

/**
 * @typedef {Object} TalentDieDefinition
 * @property {string} talentId - lancer-data talent ID
 * @property {string} talentName - Display name
 * @property {string} source - Which book/supplement
 * @property {string} dieName - Counter display name
 * @property {string} pattern - PATTERN enum value
 * @property {number} dieSize - Max die value (6 for d6, 3 for d3)
 * @property {number} startValue - Initial value at combat/scene start
 * @property {number} minValue - Minimum value
 * @property {number} maxValue - Maximum value
 * @property {string} decrementOn - Description of decrement trigger
 * @property {string} incrementOn - Description of increment trigger
 * @property {number} incrementAmount - How much to change per trigger (default 1)
 * @property {string} triggerEffect - What happens at threshold
 * @property {string} resetOn - When the die resets
 * @property {boolean} distributable - Whether dice can be given to allies
 * @property {Object[]} spendOptions - Available spend effects with costs
 * @property {number|null} rankPoolSize - Pool sizes by rank (Pattern C only)
 */

export const TALENT_DICE = {
  // ============================================
  // Pattern A: Countdown (starts high, triggers at min)
  // ============================================

  t_brawler: {
    talentId: "t_brawler",
    talentName: "Brawler",
    source: "Core",
    dieName: "Brawler Die",
    pattern: PATTERN.COUNTDOWN,
    dieSize: 6,
    startValue: 6,
    minValue: 1,
    maxValue: 6,
    decrementOn: "Grapple, Ram, or Improvised Attack (BasicAttackFlow)",
    decrementFlowType: "basic", // auto-detect: BasicAttackFlow with no weapon item
    incrementOn: null,
    incrementAmount: 1,
    triggerEffect: "Knockout Blow — 2d6 AP kinetic damage, target must pass Hull check or be Stunned until end of next turn",
    triggerDamage: "2d6",
    triggerDamageType: "kinetic",
    triggerTags: ["ap"],
    resetOn: "rest/Full Repair, or after Knockout Blow"
  },

  t_gunslinger: {
    talentId: "t_gunslinger",
    talentName: "Gunslinger",
    source: "Core",
    dieName: "Gunslinger Die",
    pattern: PATTERN.COUNTDOWN,
    dieSize: 6,
    startValue: 6,
    minValue: 1,
    maxValue: 6,
    decrementOn: "Hit with Auxiliary ranged weapon",
    incrementOn: null,
    incrementAmount: 1,
    triggerEffect: "+2d6 AP bonus damage on next attack, then reset",
    triggerDamage: "2d6",
    triggerDamageType: null,
    triggerTags: ["ap"],
    resetOn: "rest/Full Repair, or after bonus damage applied"
  },

  t_stormbringer: {
    talentId: "t_stormbringer",
    talentName: "Stormbringer",
    source: "Core",
    dieName: "Torrent Die",
    pattern: PATTERN.COUNTDOWN,
    dieSize: 6,
    startValue: 6,
    minValue: 1,
    maxValue: 6,
    decrementOn: "Hit with a Launcher weapon (Stormbending, 1/round)",
    decrementWeaponType: "Launcher", // auto-detect: weapon.system.type === "Launcher"
    incrementOn: null,
    incrementAmount: 1,
    triggerEffect: "Massive Attack — 2d6 Explosive damage (full action)",
    triggerDamage: "2d6",
    triggerDamageType: "explosive",
    triggerTags: [],
    resetOn: "rest/Full Repair, or after Massive Attack"
  },

  t_iconoclast: {
    talentId: "t_iconoclast",
    talentName: "Iconoclast",
    source: "Dustgrave",
    dieName: "Transcendence Die",
    pattern: PATTERN.COUNTDOWN,
    dieSize: 3,
    startValue: 3,
    minValue: 1,
    maxValue: 3,
    decrementOn: "Use Transmuting Spark",
    incrementOn: null,
    incrementAmount: 1,
    triggerEffect: "Enter Transcendent state — die cannot decrease while active",
    triggerDamage: null,
    triggerDamageType: null,
    triggerTags: [],
    resetOn: "scene end, or after Transcendent state ends",
    special: "transcendent_lock" // die locked during transcendent state
  },

  // ============================================
  // Pattern B: Countup (starts low, accumulates)
  // ============================================

  t_brutal: {
    talentId: "t_brutal",
    talentName: "Brutal",
    source: "Core",
    dieName: "Brutal Die",
    pattern: PATTERN.COUNTUP,
    dieSize: null, // uncapped
    startValue: 0,
    minValue: 0,
    maxValue: 100,
    decrementOn: null,
    incrementOn: "Miss with any attack",
    incrementAmount: 1,
    spendOptions: [
      { name: "Bonus on hit", cost: "all", description: "Add accumulated value as bonus on next hit" }
    ],
    resetOn: "On hit (spent), rest/Full Repair"
  },

  t_duelist: {
    talentId: "t_duelist",
    talentName: "Duelist",
    source: "Core",
    dieName: "Blademaster Dice",
    pattern: PATTERN.COUNTUP,
    dieSize: 6,
    startValue: 0,
    minValue: 0,
    maxValue: 3,
    decrementOn: null,
    incrementOn: "Hit with Main Melee weapon",
    incrementAmount: 1,
    spendOptions: [
      { name: "Parry", cost: 1, description: "Reaction — reduce incoming damage" },
      { name: "Deflect", cost: 1, description: "Reaction — deflect attack to adjacent target" },
      { name: "Feint", cost: 1, description: "Reaction — gain +1 Accuracy on next attack" },
      { name: "Trip", cost: 1, description: "Reaction — knock target Prone" }
    ],
    resetOn: "rest/Full Repair"
  },

  t_field_analyst: {
    talentId: "t_field_analyst",
    talentName: "Field Analyst",
    source: "Dustgrave",
    dieName: "Intel Die",
    pattern: PATTERN.COUNTUP,
    dieSize: 6,
    startValue: 1,
    minValue: 1,
    maxValue: 6,
    decrementOn: null,
    incrementOn: "End turn without taking hostile actions",
    incrementAmount: 2,
    spendOptions: [
      { name: "Superior Intelligence", cost: "all", description: "Substitute die value instead of flat +1 bonus" }
    ],
    resetOn: "After use, scene end"
  },

  // ============================================
  // Pattern C: Distributable Pool
  // ============================================

  t_leader: {
    talentId: "t_leader",
    talentName: "Leader",
    source: "Core",
    dieName: "Leadership Dice",
    pattern: PATTERN.POOL,
    dieSize: 6,
    startValue: 0,
    minValue: 0,
    maxValue: 6,
    distributable: true,
    rankPoolSize: { 1: 3, 2: 5, 3: 6 },
    incrementOn: "Start of combat (full pool)",
    spendOptions: [
      { name: "+1 Accuracy", cost: 1, description: "Ally gains +1 Accuracy on action following order", user: "ally" },
      { name: "+1d6 Bonus Damage", cost: 1, description: "Ally deals +1d6 bonus damage on hit", user: "ally" },
      { name: "-1d6 Damage Taken", cost: 1, description: "Ally reduces incoming damage by 1d6", user: "ally" }
    ],
    resetOn: "rest/Full Repair"
  },

  mf_orator: {
    talentId: "mf_orator",
    talentName: "Orator",
    source: "Siren's Song",
    dieName: "Orator Die",
    pattern: PATTERN.POOL,
    dieSize: 6,
    startValue: 1,
    minValue: 0,
    maxValue: 3,
    distributable: false,
    rankPoolSize: { 1: 0, 2: 1, 3: 2 }, // starting dice at combat start
    incrementOn: "End turn without attacking or forcing saves",
    incrementAmount: 1,
    spendOptions: [
      { name: "Encourage", cost: 1, description: "Ally makes Systems check against conditions", user: "ally" },
      { name: "Investigate", cost: 2, description: "Next allied attack rolls twice, takes higher", user: "ally" },
      { name: "Cast Doubt", cost: 2, description: "Target blocked from ally support until end of next turn", user: "enemy" },
      { name: "Demoralize", cost: 3, description: "Target cannot move, attack, force saves, or take tech actions until end of next turn (1/scene per target)", user: "enemy", limit: "1/scene" }
    ],
    resetOn: "scene end"
  }
};

/**
 * Get all talent die definitions matching a pattern
 */
export function getTalentsByPattern(pattern) {
  return Object.values(TALENT_DICE).filter(t => t.pattern === pattern);
}

/**
 * Get a talent die definition by talent ID
 */
export function getTalentDie(talentId) {
  return TALENT_DICE[talentId] || null;
}

/**
 * Get all talent IDs that have die tracking
 */
export function getAllTrackedTalentIds() {
  return Object.keys(TALENT_DICE);
}
