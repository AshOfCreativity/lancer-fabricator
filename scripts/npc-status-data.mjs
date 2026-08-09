const MODULE_ID = "lancer-fabricator-main";
const ICON_PATH = `modules/${MODULE_ID}/assets/icons/statuses`;

export const STATUS_WHERE = Object.freeze({
  SELF: "self",
  TARGET: "target",
  ALLY: "ally",
  ZONE: "zone"
});

export const STATUS_TYPE = Object.freeze({
  TOGGLE: "toggle",
  CHARGE: "charge",
  ACCUMULATOR: "accumulator",
  STAGED: "staged",
  DEFERRED: "deferred",
  TARGET_REF: "target-ref",
  PASSIVE: "passive"
});

export const NPC_STATUSES = [

  // ── Sentinel ──────────────────────────────────────────────
  {
    id: "fab_eye_of_midnight",
    name: "Eye of Midnight Active",
    lid: "npcf_eye_of_midnight_sentinel",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Slowed; Overwatch fires 1/turn instead of 1/round",
    effects: [
      { type: "apply_condition", params: { condition: "slow", target: "self" } },
      { type: "grant_reaction", params: { reactionName: "Overwatch", trigger: "Hostile moves in line of sight", limit: "1/turn" } }
    ]
  },
  {
    id: "fab_wrath_lock",
    name: "Wrath-Lock Armed",
    lid: "npcf_wrath_lock_sentinel",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Next Combat Shotgun fires twice",
    effects: [
      { type: "extra_attack", params: { weaponName: "Combat Shotgun", count: 1, consume: true } }
    ]
  },
  {
    id: "fab_bodyguard_ward",
    name: "Bodyguard Ward",
    lid: "npcf_bodyguard_sentinel",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Sentinel gains Reflexive Blow reaction for this ward",
    effects: [
      { type: "grant_reaction", params: { reactionName: "Reflexive Blow", trigger: "Ward is attacked; fire Overwatch at attacker", limit: "1/round" } }
    ]
  },

  // ── Archer ────────────────────────────────────────────────
  {
    id: "fab_suppressed",
    name: "Suppressed",
    lid: "npcf_suppress_archer",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target Impaired; Archer gains Moving Target reaction",
    effects: [
      { type: "apply_condition", params: { condition: "impaired", target: "attack_target" } },
      { type: "grant_reaction", params: { reactionName: "Moving Target", trigger: "Suppressed target starts to move", limit: "1/round" } }
    ]
  },
  {
    id: "fab_covering_fire",
    name: "Covering Fire Zone",
    lid: "npcf_covering_fire_archer",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/zone.svg`,
    description: "Blast 3 zone; Archer gains Got Your Back reaction vs attackers in zone",
    effects: [
      { type: "zone_effect", params: { area: "Blast 3", allyEffect: "", hostileEffect: "", attackModifier: "" } },
      { type: "grant_reaction", params: { reactionName: "Got Your Back", trigger: "Character in zone makes an attack", limit: "1/round" } }
    ]
  },

  // ── Assassin ──────────────────────────────────────────────
  {
    id: "fab_assassins_mark",
    name: "Assassin's Mark",
    lid: "npcf_assassins_mark_assassin",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Resistance to target's damage; damage to target can't be reduced",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "all", target: "self" } },
      { type: "custom", params: { text: "Damage dealt to marked target cannot be reduced" } }
    ]
  },

  // ── Assault ───────────────────────────────────────────────
  {
    id: "fab_high_impact_rounds",
    name: "High Impact Rounds Loaded",
    lid: "npcf_high_impact_rounds_assault",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "HAR attacks become AP, +4 kinetic, but gains Loading after",
    effects: [
      { type: "modify_attack", params: { weaponName: "Heavy Assault Rifle", ap: true, accuracy: 0, difficulty: 0, rangeOverride: "" } },
      { type: "bonus_damage", params: { amount: "4", damageType: "kinetic", consume: true, condition: "" } }
    ]
  },

  // ── Aegis ─────────────────────────────────────────────────
  {
    id: "fab_defense_net",
    name: "Defense Net Active",
    lid: "npcf_defense_net_aegis",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/shield.svg`,
    modifierLids: [
      "npcf_adaptive_shielding_aegis",
      "npcf_ring_of_fire_aegis"
    ],
    description: "Burst 3 shield; Aegis Immobilized; attacks into zone +1 Difficulty",
    effects: [
      { type: "apply_condition", params: { condition: "immobilized", target: "self" } },
      { type: "zone_effect", params: { area: "Burst 3", allyEffect: "", hostileEffect: "", attackModifier: "+1 Difficulty on attacks into zone" } }
    ]
  },

  // ── Berserker ─────────────────────────────────────────────
  {
    id: "fab_retribution",
    name: "Retribution Stacks",
    lid: "npcf_retribution_berserker",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.ACCUMULATOR,
    maxStacks: 8,
    icon: `${ICON_PATH}/stack.svg`,
    description: "Stacks bonus damage when hit; consumed on next attack",
    effects: [
      { type: "bonus_damage", params: { amount: "stacks", damageType: "kinetic", consume: true, condition: "On damage taken: +2/3/4 per hit (tier-scaled)" } }
    ]
  },

  // ── Bastion ───────────────────────────────────────────────
  {
    id: "fab_interdiction",
    name: "Interdiction Target",
    lid: "npcf_friendly_interdiction_bastion",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Bastion and chosen adjacent ally have Resistance to this enemy's damage",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "all", target: "self_and_ally" } }
    ]
  },
  {
    id: "fab_pause_engine",
    name: "Pause Engine Active",
    lid: "npcf_pause_engine_bastion",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Bastion and adjacent ally immune to all damage and effects until next turn",
    effects: [
      { type: "resistance", params: { type: "immunity", damageType: "all", target: "self_and_ally" } }
    ]
  },

  // ── Bombard ───────────────────────────────────────────────
  {
    id: "fab_bombard_mods",
    name: "Bombard Cannon Mods",
    lid: "npcf_earthshaker_shells_bombard",
    lids: [
      "npcf_earthshaker_shells_bombard",
      "npcf_high_impact_shells_bombard",
      "npcf_bunker_buster_bombard",
      "npcf_cluster_seeker_bombs_bombard"
    ],
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Passive riders on Bombard Cannon attacks (always on if equipped)",
    effects: [
      { type: "custom", params: { text: "Riders fire on every Bombard Cannon attack — check equipped mods" } }
    ]
  },

  // ── Breacher ──────────────────────────────────────────────
  {
    id: "fab_follower_count",
    name: "Follower Count Mark",
    lid: "npcf_follower_count_breacher",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Breacher gains +Accuracy on attacks vs target and free Boost 1/turn",
    effects: [
      { type: "modify_attack", params: { weaponName: "", ap: false, accuracy: 1, difficulty: 0, rangeOverride: "" } },
      { type: "custom", params: { text: "Free Boost 1/turn as free action" } }
    ]
  },
  {
    id: "fab_painmaker",
    name: "Painmaker Delayed Turn",
    lid: "npcf_painmaker_breacher",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Target's next turn delayed; Breacher attacks 4x with Dual Shotguns",
    effects: [
      { type: "deferred", params: { timing: "Start of Breacher's turn, if target in range", effect: "Attack target 4x with Dual Shotguns", area: "" } },
      { type: "extra_attack", params: { weaponName: "Dual Shotguns", count: 3, consume: true } }
    ]
  },

  // ── Engineer ──────────────────────────────────────────────
  {
    id: "fab_engineers_mark",
    name: "Engineer's Mark",
    lid: "npcf_engineers_mark_engineer",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Deployable Turrets attack marked target instead of nearest hostile",
    effects: [
      { type: "custom", params: { text: "Deployable Turrets retarget to marked character" } }
    ]
  },

  // ── Goliath ───────────────────────────────────────────────
  {
    id: "fab_crush_targeted",
    name: "Crush Targeted",
    lid: "npcf_crush_targeting_goliath",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Target +3 Difficulty to attack anyone other than Goliath",
    effects: [
      { type: "stat_change", params: { stat: "Difficulty vs non-Goliath targets", value: "+3", target: "attack_target" } }
    ]
  },
  {
    id: "fab_pinned",
    name: "Pinned",
    lid: "npcf_pin_goliath",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target Immobilized and Impaired",
    effects: [
      { type: "apply_condition", params: { condition: "immobilized", target: "attack_target" } },
      { type: "apply_condition", params: { condition: "impaired", target: "attack_target" } }
    ]
  },

  // ── Hive ──────────────────────────────────────────────────
  {
    id: "fab_razor_swarm",
    name: "Razor Swarm Deployed",
    lid: "npcf_razor_swarms_hive",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    modifierLids: [
      "npcf_motile_swarm_hive",
      "npcf_driving_swarm_hive"
    ],
    icon: `${ICON_PATH}/zone.svg`,
    description: "Blast 1 area; allies get soft cover; hostiles take Burn",
    effects: [
      { type: "zone_effect", params: { area: "Blast 1", allyEffect: "Soft cover", hostileEffect: "2/4/6 Burn on enter or turn start", attackModifier: "" } }
    ]
  },

  // ── Priest ────────────────────────────────────────────────
  {
    id: "fab_investiture",
    name: "Investiture Link",
    lid: "npcf_investiture_priest",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.TARGET_REF,
    modifierLids: [
      "npcf_greater_investiture_priest",
      "npcf_fractal_assault_priest"
    ],
    icon: `${ICON_PATH}/link.svg`,
    description: "Linked mech gets +Accuracy; Priest uses Systems stat for target",
    effects: [
      { type: "modify_attack", params: { weaponName: "", ap: false, accuracy: 1, difficulty: 0, rangeOverride: "" } },
      { type: "stat_change", params: { stat: "Systems", value: "Use Priest's Systems", target: "ally" } }
    ]
  },

  // ── Pyro ──────────────────────────────────────────────────
  {
    id: "fab_firebreak",
    name: "Firebreak Shield Active",
    lid: "npcf_firebreak_shield_pyro",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Line 4 energy shield; passing through deals Energy; ranged through +1 Difficulty",
    effects: [
      { type: "zone_effect", params: { area: "Line 4", allyEffect: "", hostileEffect: "2/3/4 Energy damage on pass-through", attackModifier: "+1 Difficulty on ranged attacks through shield" } }
    ]
  },

  // ── Rainmaker ─────────────────────────────────────────────
  {
    id: "fab_javelin_rockets",
    name: "Javelin Rocket Spaces",
    lid: "npcf_javelin_rockets_rainmaker",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    modifierLids: ["npcf_endless_rain_rainmaker"],
    icon: `${ICON_PATH}/zone.svg`,
    description: "3 (or 6) chosen spaces; hostiles entering/passing auto-hit by rockets",
    effects: [
      { type: "zone_effect", params: { area: "3 spaces (6 with Endless Rain)", allyEffect: "", hostileEffect: "Auto-hit: 4/6/8 Explosive per rocket", attackModifier: "" } }
    ]
  },
  {
    id: "fab_atlas_missile",
    name: "Atlas Missile Incoming",
    lid: "npcf_atlas_missiles_rainmaker",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Missile lands end of next round — Burst 2 massive Explosive",
    effects: [
      { type: "deferred", params: { timing: "End of next round", effect: "Burst 2, Hull save or 10/15/20 Explosive, half on success", area: "Burst 2" } }
    ]
  },

  // ── Ronin ─────────────────────────────────────────────────
  {
    id: "fab_ronins_mark",
    name: "Ronin's Mark",
    lid: "npcf_echo_edge_ronin",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.ACCUMULATOR,
    maxStacks: 99,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Marks accumulate on damaged targets; all clear at turn start for 1d6 AP Kinetic each",
    effects: [
      { type: "deferred", params: { timing: "Start of Ronin's turn", effect: "All marks clear; each marked target takes 1d6 AP Kinetic", area: "" } }
    ]
  },

  // ── Scourer ───────────────────────────────────────────────
  {
    id: "fab_focus_down",
    name: "Focus Down Tracked",
    lid: "npcf_focus_down_scourer",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    modifierLids: ["npcf_supercharged_scourer"],
    icon: `${ICON_PATH}/mark.svg`,
    description: "If hit by Thermal Lance again next round, target takes bonus Burn",
    effects: [
      { type: "bonus_damage", params: { amount: "5/7/8", damageType: "burn", consume: true, condition: "Hit by Thermal Lance on consecutive rounds" } }
    ]
  },

  // ── Scout ─────────────────────────────────────────────────
  {
    id: "fab_expose_weakness",
    name: "Expose Weakness",
    lid: "npcf_expose_weakness_scout",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Target takes bonus damage on next hit from any attack",
    effects: [
      { type: "bonus_damage", params: { amount: "4/6/8", damageType: "kinetic", consume: true, condition: "Next successful hit from any source" } }
    ]
  },
  {
    id: "fab_cloaking_field",
    name: "Cloaking Field Active",
    lid: "npcf_cloaking_field_scout",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Scout and allies within Burst 3 are Invisible; Scout is Immobilized",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self_and_allies_in_area", area: "Burst 3" } },
      { type: "apply_condition", params: { condition: "immobilized", target: "self" } }
    ]
  },
  {
    id: "fab_dataveil",
    name: "Dataveil Transferred",
    lid: "npcf_dataveil_scout",
    lids: ["npcf_dataveil_scout", "npcf_dataveil_mirage"],
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/link.svg`,
    description: "Chosen character is Invisible; source loses Invisible",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "ally", area: "" } },
      { type: "custom", params: { text: "Source loses Invisible while transferred" } }
    ]
  },

  // ── Sniper ────────────────────────────────────────────────
  {
    id: "fab_snipers_mark",
    name: "Sniper's Mark",
    lid: "npcf_snipers_mark_sniper",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "AMR deals 1 structure damage to marked target; negated by cover",
    effects: [
      { type: "custom", params: { text: "AMR deals 1 structure damage instead of normal damage; target ignores mark while in cover" } }
    ]
  },
  {
    id: "fab_deadmetal_round",
    name: "Deadmetal Round Loaded",
    lid: "npcf_deadmetal_rounds_sniper",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Next AMR attack becomes Line 20",
    effects: [
      { type: "modify_attack", params: { weaponName: "AMR", ap: false, accuracy: 0, difficulty: 0, rangeOverride: "Line 20" } }
    ]
  },

  // ── Specter ───────────────────────────────────────────────
  {
    id: "fab_prowl_hidden",
    name: "Hidden (Prowl)",
    lid: "npcf_prowl_specter",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    modifierLids: ["npcf_weakness_analyzer_specter"],
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Hidden; if Weakness Analyzer equipped, next attack gains +Accuracy and crit bonus",
    effects: [
      { type: "stealth", params: { type: "hidden", target: "self", area: "" } }
    ]
  },

  // ── Witch ─────────────────────────────────────────────────
  {
    id: "fab_tear_down",
    name: "Tear Down Deferred Heat",
    lid: "npcf_tear_down_witch",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    modifierLids: [
      "npcf_dark_cloud_witch",
      "npcf_pain_transference_witch"
    ],
    icon: `${ICON_PATH}/flame.svg`,
    description: "Target takes deferred heat at start of Witch's next turn",
    effects: [
      { type: "bonus_damage", params: { amount: "1/2/3", damageType: "heat", consume: false, condition: "Immediate on tech attack hit" } },
      { type: "deferred", params: { timing: "Start of Witch's next turn", effect: "Target takes 4 heat (7 with Dark Cloud in Danger Zone)", area: "" } }
    ]
  },
  {
    id: "fab_petrify",
    name: "Petrify Stages",
    lid: "npcf_petrify_witch",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.STAGED,
    maxStages: 3,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Turn 1: Slowed → Turn 2: +Immobilized → Turn 3: +Stunned",
    effects: [
      { type: "apply_condition", params: { condition: "slow", target: "attack_target" } },
      { type: "custom", params: { text: "Stage 1: Slowed. Stage 2: +Immobilized. Stage 3: +Stunned" } }
    ]
  },

  // ── Ace ───────────────────────────────────────────────────
  {
    id: "fab_ssc_flight",
    name: "Flying (SSC Flight)",
    lid: "npcf_ssc_flight_system_ace",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    modifierLids: ["npcf_bombing_bay_ace"],
    icon: `${ICON_PATH}/wing.svg`,
    description: "Flying; if Bombing Bay equipped, may drop bombs on flight path",
    effects: [
      { type: "custom", params: { text: "Flying; with Bombing Bay: drop bomb on 1 character along flight path (Blast 1, Agility save, 6/8/10 Explosive + Prone)" } }
    ]
  },

  // ── Mirage ────────────────────────────────────────────────
  {
    id: "fab_dataveil_invisible",
    name: "Dataveil Invisible",
    lid: "npcf_dataveil_mirage",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Mirage starts Invisible; can transfer to another character",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } }
    ]
  },

  // ── MBT (OWS) ────────────────────────────────────────────
  {
    id: "fab_siege_mode",
    name: "Siege Mode Active",
    lid: "npc_mbt_siege_mode",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/lock.svg`,
    description: "MBT Immobilized; gains enhanced firepower",
    effects: [
      { type: "apply_condition", params: { condition: "immobilized", target: "self" } },
      { type: "custom", params: { text: "Enhanced firepower while deployed" } }
    ]
  },
  {
    id: "fab_smokescreen",
    name: "Smokescreen Deployed",
    lid: "npc_mbt_smokescreen",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/zone.svg`,
    description: "Creates obscuring smoke cover area",
    effects: [
      { type: "zone_effect", params: { area: "Burst 2", allyEffect: "Soft cover", hostileEffect: "Obscured", attackModifier: "" } }
    ]
  }
];

Object.freeze(NPC_STATUSES);

const _statusById = new Map(NPC_STATUSES.map(s => [s.id, s]));
const _statusByLid = new Map();
for (const s of NPC_STATUSES) {
  const lids = s.lids ?? [s.lid];
  for (const lid of lids) {
    if (!_statusByLid.has(lid)) _statusByLid.set(lid, []);
    _statusByLid.get(lid).push(s);
  }
}

export function getStatusDef(statusId) {
  return _statusById.get(statusId) ?? null;
}

export function findStatusesForFeature(item) {
  if (item.type !== "npc_feature") return [];
  const lid = item.system?.lid;
  if (!lid) return [];
  return _statusByLid.get(lid) ?? [];
}

export function hasModifiersEquipped(actor, statusDef) {
  if (!statusDef.modifierLids?.length) return [];
  const equipped = [];
  for (const item of actor.items) {
    if (item.type !== "npc_feature") continue;
    const lid = item.system?.lid;
    if (lid && statusDef.modifierLids.includes(lid)) {
      equipped.push({ lid, name: item.name });
    }
  }
  return equipped;
}
