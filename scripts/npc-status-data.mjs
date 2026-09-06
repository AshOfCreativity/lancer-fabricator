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
  {
    id: "fab_chaff_launchers_ace",
    name: "Chaff Cover (Ace)",
    lid: "npcf_chaff_launchers_ace",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Soft cover until end of next turn after Barrel Roll",
    effects: [
      { type: "custom", params: { text: "Soft cover until end of next turn; Barrel Roll also works vs tech attacks" } }
    ]
  },
  {
    id: "fab_missile_swarm_ace",
    name: "Missile Swarm Lock",
    lid: "npcf_missile_swarm_ace",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Deals double damage to targets with Lock On; doesn't hit allies",
    effects: [
      { type: "bonus_damage", params: { amount: "double", damageType: "explosive", consume: false, condition: "Target has Lock On" } }
    ]
  },

  // ── Aegis ─────────────────────────────────────────────────
  {
    id: "fab_defense_net",
    name: "Defense Net Active",
    lid: "npcf_defense_net_aegis",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    modifierLids: [
      "npcf_adaptive_shielding_aegis",
      "npcf_ring_of_fire_aegis"
    ],
    icon: `${ICON_PATH}/shield.svg`,
    description: "Burst 3 shield; Aegis Immobilized; attacks into zone +1 Difficulty",
    effects: [
      { type: "apply_condition", params: { condition: "immobilized", target: "self" } },
      { type: "zone_effect", params: { area: "Burst 3", allyEffect: "", hostileEffect: "", attackModifier: "+1 Difficulty on attacks into zone" } }
    ]
  },
  {
    id: "fab_hardlight_cover",
    name: "Hardlight Wall",
    lid: "npcf_hardlight_cover_system_aegis",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Line 3 indestructible wall; hard cover + Resistance to AoE",
    effects: [
      { type: "zone_effect", params: { area: "Line 3", allyEffect: "Hard cover, Resistance to Line/Blast/Burst/Cone damage", hostileEffect: "", attackModifier: "" } }
    ]
  },
  {
    id: "fab_blackwall",
    name: "Blackwall Deployed",
    lid: "npcf_ha_blackwall_system_aegis",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/zone.svg`,
    description: "Line 10 blinkspace wall; blocks LoS/effects/attacks; damages characters inside",
    effects: [
      { type: "zone_effect", params: { area: "Line 10, 5 spaces high", allyEffect: "", hostileEffect: "Characters in wall take 4/6/8 Energy + teleported to nearest free space", attackModifier: "Blocks all LoS, effects, attacks" } }
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
  {
    id: "fab_blinding_shells",
    name: "Blinding Shells (Blinded)",
    lid: "npcf_blinding_shells_archer",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Target only has LoS to adjacent spaces until next turn ends",
    effects: [
      { type: "custom", params: { text: "Engineering save on hit; fail = LoS limited to adjacent spaces until next turn ends" } }
    ]
  },
  {
    id: "fab_hail_of_fire",
    name: "Hail of Fire Lock",
    lid: "npcf_hail_of_fire_archer",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target Immobilized + Impaired; ends if Archer is Stunned/Jammed or target accepts a free attack",
    effects: [
      { type: "apply_condition", params: { condition: "immobilized", target: "attack_target" } },
      { type: "apply_condition", params: { condition: "impaired", target: "attack_target" } },
      { type: "custom", params: { text: "Ends if Archer Stunned/Jammed, or target allows Archer to attack as reaction" } }
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
  {
    id: "fab_cloud_projector",
    name: "Smoke Cloud (Assassin)",
    lid: "npcf_cloud_projector_assassin",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/zone.svg`,
    description: "Burst 3 concealment; Assassin gains soft cover; blocks LoS into/out of area",
    effects: [
      { type: "zone_effect", params: { area: "Burst 3", allyEffect: "Soft cover for Assassin", hostileEffect: "Cannot draw LoS into/out of area if fully inside/outside", attackModifier: "" } }
    ]
  },
  {
    id: "fab_explosive_knives",
    name: "Embedded Knife",
    lid: "npcf_explosive_knives_assassin",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Knife explodes end of target's next turn: Burst 1, 6/8/10 Explosive",
    effects: [
      { type: "deferred", params: { timing: "End of target's next turn", effect: "Burst 1, 6/8/10 Explosive damage", area: "Burst 1" } }
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
  {
    id: "fab_rank_discipline",
    name: "Rank Discipline Active",
    lid: "npcf_rank_discipline_assault",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "+1 Accuracy on all attacks/checks/saves while adjacent to allied Mech",
    effects: [
      { type: "modify_attack", params: { weaponName: "", ap: false, accuracy: 1, difficulty: 0, rangeOverride: "" } },
      { type: "custom", params: { text: "Requires adjacency to allied character with Mech tag" } }
    ]
  },

  // ── Barricade ─────────────────────────────────────────────
  {
    id: "fab_drag_down",
    name: "Drag Down Tether",
    lid: "npcf_drag_down_barricade",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target takes 2 AP Energy per space moved voluntarily until next turn ends",
    effects: [
      { type: "custom", params: { text: "2 AP Energy damage per space of voluntary movement until end of next turn" } }
    ]
  },
  {
    id: "fab_hunger_limpets",
    name: "Limpet Minefield",
    lid: "npcf_hunger_pursuit_limpets_barricade",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/zone.svg`,
    description: "Size 4 difficult terrain; hostiles entering/starting save or Slowed + 2/3/4 Explosive",
    effects: [
      { type: "zone_effect", params: { area: "Size 4", allyEffect: "", hostileEffect: "Systems save or Slowed + 2/3/4 Explosive; difficult terrain", attackModifier: "" } }
    ]
  },
  {
    id: "fab_titan_snare",
    name: "Titan-Snare Active",
    lid: "npcf_titan_snare_drone_barricade",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Drone; hostiles moving into/starting within Range 3 become Immobilized",
    effects: [
      { type: "zone_effect", params: { area: "Range 3 from drone", allyEffect: "", hostileEffect: "Immobilized until drone destroyed or turn starts outside range", attackModifier: "" } }
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
  {
    id: "fab_siege_guardian",
    name: "Siege Guardian Aura",
    lid: "npcf_siege_guardian_bastion",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Adjacent allies gain Resistance to Blast/Burst/Line/Cone damage",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "aoe", target: "ally" } }
    ]
  },
  {
    id: "fab_near_threat_denial",
    name: "Near-Threat Denial",
    lid: "npcf_near_threat_denial_system_bastion",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Characters within Range 3 take 2/3/4 AP Explosive before attacking Bastion",
    effects: [
      { type: "custom", params: { text: "Attackers within Range 3 take 2/3/4 AP Explosive damage before rolling" } }
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
  {
    id: "fab_harpoon_grapple",
    name: "Harpoon Grapple",
    lid: "npcf_harpoon_cannon_berserker",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "On hit: target pulled adjacent and Grappled (or Berserker pulled to larger target)",
    effects: [
      { type: "custom", params: { text: "Target pulled adjacent and auto-Grappled; if larger, Berserker pulled instead" } }
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
  {
    id: "fab_flare_drone",
    name: "Flare Drone Deployed",
    lid: "npcf_flare_drone_bombard",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Burst 2 bright light; characters lose Hidden/Invisible and can't gain them",
    effects: [
      { type: "zone_effect", params: { area: "Burst 2", allyEffect: "", hostileEffect: "Lose Hidden/Invisible; can't gain them", attackModifier: "" } }
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
  {
    id: "fab_break_armor",
    name: "Break Armor (Shredded)",
    lid: "npcf_break_armor_breacher",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Target hit 2+ times by Dual Shotguns in one turn becomes Shredded for scene",
    effects: [
      { type: "apply_condition", params: { condition: "shredded", target: "attack_target" } },
      { type: "custom", params: { text: "Permanent for scene; triggered by 2+ Dual Shotgun hits in same turn" } }
    ]
  },

  // ── Cataphract ────────────────────────────────────────────
  {
    id: "fab_impale_grapple",
    name: "Impaled (Cataphract)",
    lid: "npcf_impale_cataphract",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target grappled by Cataphract and dragged along movement",
    effects: [
      { type: "custom", params: { text: "Hull save +1 Difficulty; fail = grappled and pulled along Cataphract's movement" } }
    ]
  },
  {
    id: "fab_crushing_lasso",
    name: "Electrified Lasso Grapple",
    lid: "npcf_electrified_lasso_cataphract",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target pulled adjacent and auto-grappled on Hull save fail",
    effects: [
      { type: "custom", params: { text: "Hull save; fail = pulled adjacent and auto-grappled" } }
    ]
  },
  {
    id: "fab_capacitor_discharge",
    name: "Capacitor Discharge Aura",
    lid: "npcf_capacitor_discharge_cataphract",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Resistance to Energy + heat; adjacent characters take 2/3/4 Heat at end of turn",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "energy", target: "self" } },
      { type: "zone_effect", params: { area: "Adjacent", allyEffect: "", hostileEffect: "2/3/4 Heat at end of Cataphract's turn", attackModifier: "" } },
      { type: "custom", params: { text: "Disabled while Slowed or Immobilized" } }
    ]
  },
  {
    id: "fab_point_defense_shield",
    name: "Point-Defense Shield",
    lid: "npcf_point_defense_shield_cataphract",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Resistance to all damage from the closest hostile; off if tie",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "all", target: "self" } },
      { type: "custom", params: { text: "Only applies from the single closest hostile; no effect if multiple equidistant" } }
    ]
  },

  // ── Commander ─────────────────────────────────────────────
  {
    id: "fab_bolster_network",
    name: "Bolster Network Active",
    lid: "npcf_bolster_network_commander",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/link.svg`,
    description: "Allies in LoS get +1 Accuracy on Systems saves; tech attacks vs them +1 Difficulty",
    effects: [
      { type: "custom", params: { text: "All allied characters in LoS (not Commander): +1 Accuracy Systems saves, +1 Difficulty on hostile tech attacks" } }
    ]
  },
  {
    id: "fab_military_discipline",
    name: "Military Discipline Aura",
    lid: "npcf_military_discipline_commander",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Adjacent allies gain +1 Accuracy on all attacks, saves, and checks",
    effects: [
      { type: "modify_attack", params: { weaponName: "", ap: false, accuracy: 1, difficulty: 0, rangeOverride: "" } },
      { type: "custom", params: { text: "Aura: adjacent allied characters only" } }
    ]
  },
  {
    id: "fab_voice_of_authority",
    name: "Voice of Authority",
    lid: "npcf_voice_of_authority_commander",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/link.svg`,
    description: "Reaction: ally in LoS can reroll a failed check or save",
    effects: [
      { type: "grant_reaction", params: { reactionName: "Voice of Authority", trigger: "An allied character in LoS fails a check or save", limit: "1/round" } }
    ]
  },
  {
    id: "fab_press_the_attack",
    name: "Press the Attack",
    lid: "npcf_press_the_attack_commander",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Reaction: when ally hits, Commander attacks same target for half damage",
    effects: [
      { type: "grant_reaction", params: { reactionName: "Press the Attack", trigger: "An allied character hits a hostile target in LoS/range", limit: "1/round" } },
      { type: "bonus_damage", params: { amount: "half", damageType: "kinetic", consume: false, condition: "On successful follow-up attack" } }
    ]
  },
  {
    id: "fab_press_on",
    name: "Press On!",
    lid: "npcf_press_on_commander",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Clears Stunned or Jammed from an ally in LoS",
    effects: [
      { type: "custom", params: { text: "Quick action: clear Stunned or Jammed from one allied character in LoS" } }
    ]
  },
  {
    id: "fab_quick_march",
    name: "Quick March",
    lid: "npcf_quick_march_commander",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/wing.svg`,
    description: "One ally in LoS may Boost",
    effects: [
      { type: "custom", params: { text: "Quick action: one allied character in LoS may Boost" } }
    ]
  },

  // ── Demolisher ────────────────────────────────────────────
  {
    id: "fab_kinetic_compensation",
    name: "Kinetic Compensation Stacks",
    lid: "npcf_kinetic_compensation_demolisher",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.ACCUMULATOR,
    maxStacks: 10,
    icon: `${ICON_PATH}/stack.svg`,
    description: "+1 Accuracy per miss with Demolition Hammer; resets on hit",
    effects: [
      { type: "modify_attack", params: { weaponName: "Demolition Hammer", ap: false, accuracy: 1, difficulty: 0, rangeOverride: "" } },
      { type: "custom", params: { text: "Stacks on each miss; cleared on next hit" } }
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
  {
    id: "fab_deployable_turret",
    name: "Turret Deployed",
    lid: "npcf_deployable_turret_engineer",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    modifierLids: [
      "npcf_arsenal_engineer",
      "npcf_skyshield_protocol_engineer",
      "npcf_mobile_turrets_engineer",
      "npcf_power_deployer_engineer"
    ],
    icon: `${ICON_PATH}/armed.svg`,
    description: "Turret attacks nearest hostile each turn; Arsenal mods change weapon type",
    effects: [
      { type: "custom", params: { text: "Turret auto-attacks nearest hostile (or Engineer's Mark target) on Engineer's turn" } }
    ]
  },
  {
    id: "fab_shepherd_field",
    name: "Shepherd Field Aura",
    lid: "npcf_shepherd_field_engineer",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Drones/objects/cover adjacent to Engineer gain Resistance to all damage",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "all", target: "ally" } },
      { type: "custom", params: { text: "Applies to drones, objects, and cover pieces only" } }
    ]
  },

  // ── Exotic ────────────────────────────────────────────────
  {
    id: "fab_realspace_extrusion",
    name: "Realspace Extrusion",
    lid: "npcf_realspace_extrusion_exotic",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Resistance to all damage; deals half damage; passable",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "all", target: "self" } },
      { type: "custom", params: { text: "Deals only half damage; characters can pass through and stop in its spaces" } }
    ]
  },
  {
    id: "fab_paracausal_weapon",
    name: "Paracausal Weapon",
    lid: "npcf_paracausal_weapon_exotic",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Chosen weapon's damage can't be reduced by Armor, Resistance, or anything",
    effects: [
      { type: "custom", params: { text: "Damage from chosen weapon ignores ALL reduction (Armor, Resistance, etc.)" } }
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
  {
    id: "fab_crushing_embrace",
    name: "Crushing Embrace",
    lid: "npcf_crushing_embrace_goliath",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target auto-grappled + Jammed until released; only one at a time",
    effects: [
      { type: "apply_condition", params: { condition: "jammed", target: "attack_target" } },
      { type: "custom", params: { text: "Auto-grapple on failed Agility save; Jammed until released; limit 1 target" } }
    ]
  },
  {
    id: "fab_retribution_goliath",
    name: "Retribution Stacks (Goliath)",
    lid: "npcf_retribution_goliath",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.ACCUMULATOR,
    maxStacks: 8,
    icon: `${ICON_PATH}/stack.svg`,
    description: "+2/3/4 bonus damage per hit taken; stacks to +8; consumed on attack or end of next turn",
    effects: [
      { type: "bonus_damage", params: { amount: "stacks", damageType: "kinetic", consume: true, condition: "On damage taken: +2/3/4 per hit; stacks to +8; lost on attack or turn end" } }
    ]
  },
  {
    id: "fab_watchful_guardian",
    name: "Watchful Guardian Cover",
    lid: "npcf_watchful_guardian_goliath",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Allies using Goliath's cover gain Resistance to all damage",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "all", target: "ally" } }
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
  {
    id: "fab_electro_nanite",
    name: "Electro-Nanite Cloud",
    lid: "npcf_electro_nanite_cloud_hive",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Hostiles within Range 3: 2 Burn at turn start + 1/2/3 Difficulty on System checks/saves/tech attacks",
    effects: [
      { type: "zone_effect", params: { area: "Range 3", allyEffect: "", hostileEffect: "2 Burn at turn start; +1/2/3 Difficulty on Systems checks/saves and tech attacks", attackModifier: "" } }
    ]
  },
  {
    id: "fab_grind_maniple",
    name: "Grind Maniple Clamped",
    lid: "npcf_grind_maniple_hive",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target takes 2 Burn per action/reaction until end of next turn",
    effects: [
      { type: "custom", params: { text: "Drones clamped on; 2 Burn per action/reaction until end of next turn" } }
    ]
  },

  // ── Hornet ────────────────────────────────────────────────
  {
    id: "fab_lock_hold_javelins",
    name: "Javelin Impaled",
    lid: "npcf_lock_hold_javelins_hornet",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target Immobilized + Shredded; must be pulled free (Engineering save as full action)",
    effects: [
      { type: "apply_condition", params: { condition: "immobilized", target: "attack_target" } },
      { type: "apply_condition", params: { condition: "shredded", target: "attack_target" } },
      { type: "custom", params: { text: "Tethered to surface; target or adjacent ally: full action Engineering save to free" } }
    ]
  },

  // ── Mercenary ─────────────────────────────────────────────
  {
    id: "fab_bounty_hunter",
    name: "Bounty Target",
    lid: "npcf_bounty_hunter_mercenary",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "All Mercenaries gain +1 Accuracy on attacks/checks/saves vs this PC",
    effects: [
      { type: "modify_attack", params: { weaponName: "", ap: false, accuracy: 1, difficulty: 0, rangeOverride: "" } },
      { type: "custom", params: { text: "Applies to all Mercenaries in combat, pilot and mech" } }
    ]
  },
  {
    id: "fab_scout_drone_merc",
    name: "Scout Drone Perimeter",
    lid: "npcf_scout_drone_mercenary",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Burst 2 zone; characters can't become Invisible/Hidden; Mercenary +1 Accuracy in zone",
    effects: [
      { type: "zone_effect", params: { area: "Burst 2", allyEffect: "+1 Accuracy for Mercenary", hostileEffect: "Can't become Invisible or Hidden; lose those conditions", attackModifier: "" } }
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
  {
    id: "fab_illusory_subroutines",
    name: "Illusory Subroutines",
    lid: "npcf_illusory_subroutines_mirage",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Target treats all Mirage allies as Invisible until start of their next turn",
    effects: [
      { type: "custom", params: { text: "Tech attack hit; target treats all Mirage-allied characters as Invisible until start of their next turn" } }
    ]
  },
  {
    id: "fab_warp_sensors",
    name: "Warp Sensors Debuff",
    lid: "npcf_warp_sensors_mirage",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Target's attacks treat all targets as having soft cover until end of next turn",
    effects: [
      { type: "custom", params: { text: "2/3/4 Heat; target's attacks treat their targets as having soft cover until end of next turn" } }
    ]
  },
  {
    id: "fab_warp_targeting",
    name: "Warp Targeting Field",
    lid: "npcf_warp_targeting_mirage",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "All allies within Range 50 have soft cover; lost until next turn if Mirage takes damage",
    effects: [
      { type: "custom", params: { text: "All allied characters within Range 50 benefit from soft cover; drops until start of next turn if Mirage takes damage" } }
    ]
  },
  {
    id: "fab_manifest_false_idols",
    name: "False Idols Deployed",
    lid: "npcf_manifest_false_idols_mirage",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/zone.svg`,
    description: "3 data constructs: soft cover; passing through = Systems save or 2 heat + Jammed",
    effects: [
      { type: "zone_effect", params: { area: "3 Size 1 constructs", allyEffect: "Soft cover", hostileEffect: "On pass-through: Systems save or 2 heat + Jammed until end of next turn", attackModifier: "" } }
    ]
  },

  // ── Monstrosity ───────────────────────────────────────────
  {
    id: "fab_burrower",
    name: "Burrowed",
    lid: "npcf_burrower_monstrosity",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Invisible while burrowed; can pass through characters; must surface to act",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } },
      { type: "custom", params: { text: "Can pass through characters/obstructions; quick action to emerge; adjacent chars on emerge: Hull save or Prone" } }
    ]
  },
  {
    id: "fab_natural_camouflage",
    name: "Natural Camouflage",
    lid: "npcf_natural_camouflage_monstrosity",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Invisible while adjacent to terrain/cover; soft cover counts as hard",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } },
      { type: "custom", params: { text: "Requires adjacency to terrain or cover; soft cover treated as hard cover" } }
    ]
  },
  {
    id: "fab_adhesive_secretions",
    name: "Adhesive Secretions",
    lid: "npcf_adhesive_secretions_monstrosity",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "First damaged target each turn: Slowed until healed or scene end",
    effects: [
      { type: "apply_condition", params: { condition: "slow", target: "attack_target" } },
      { type: "custom", params: { text: "Engineering save; fail = Slowed until HP regained or scene ends; 1/turn" } }
    ]
  },
  {
    id: "fab_corrosive_bite",
    name: "Corrosive Bite Residue",
    lid: "npcf_corrosive_bite_monstrosity",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Target Shredded until HP regained (regardless of save)",
    effects: [
      { type: "apply_condition", params: { condition: "shredded", target: "attack_target" } },
      { type: "custom", params: { text: "4/5/6 Burn on Hull save fail; Shredded regardless of save, until HP regained" } }
    ]
  },
  {
    id: "fab_regenerator",
    name: "Regenerating",
    lid: "npcf_regenerator_monstrosity",
    lids: ["npcf_regenerator_monstrosity", "npcf_regenerator_exotic"],
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/link.svg`,
    description: "Regain 1/4 HP at end of turn; disabled if took Energy damage this round",
    effects: [
      { type: "custom", params: { text: "End of turn: regain 1/4 total HP; no regen if Energy damage received this round" } }
    ]
  },
  {
    id: "fab_tempered_hide",
    name: "Tempered Hide",
    lid: "npcf_tempered_hide_monstrosity",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Resistance to 2 of Kinetic/Energy/Explosive; lost below half HP, regained at full",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "chosen two of three", target: "self" } },
      { type: "custom", params: { text: "Lost below half HP; regained when HP returns to full (if has Structure)" } }
    ]
  },

  // ── Operator ──────────────────────────────────────────────
  {
    id: "fab_fade_generator",
    name: "Fade Generator Active",
    lid: "npcf_fade_generator_operator",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Invisible end of turn until start of next; breaks on damage or reaction",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } },
      { type: "custom", params: { text: "Activates end of turn; breaks immediately on damage or reaction" } }
    ]
  },
  {
    id: "fab_telefrag",
    name: "Telefrag Impact",
    lid: "npcf_telefrag_operator",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Teleport into target's space; Agility save or 4/8/12 AP Energy + Jammed",
    effects: [
      { type: "custom", params: { text: "Agility save; fail = 4/8/12 AP Energy + Jammed until end of next turn; success = half damage, pushed adjacent" } }
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
  {
    id: "fab_abjure",
    name: "Abjure Hex",
    lid: "npcf_abjure_priest",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Target takes 2/3/4 Heat per attack until end of next turn",
    effects: [
      { type: "custom", params: { text: "Tech attack; success = target takes 2/3/4 Heat each time they attack until end of next turn" } }
    ]
  },
  {
    id: "fab_sanctuary",
    name: "Sanctuary Shield",
    lid: "npcf_sanctuary_priest",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Attackers must pass Systems save before attacking protected ally",
    effects: [
      { type: "custom", params: { text: "Attackers must pass Systems save; fail = can't target the protected character until attacker's next turn start" } }
    ]
  },
  {
    id: "fab_dispersal_shield",
    name: "Dispersal Shield Charges",
    lid: "npcf_dispersal_shield_priest",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Protected character gains Resistance to damage/heat from next 1d3 attacks",
    effects: [
      { type: "resistance", params: { type: "resistance", damageType: "all", target: "ally" } },
      { type: "custom", params: { text: "1d3 charges; each incoming attack consumes one; non-cumulative" } }
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
  {
    id: "fab_huntsman",
    name: "Huntsman Targeting",
    lid: "npcf_huntsman_rainmaker",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Weapons gain Smart, Seeking, AP vs targets with Lock On",
    effects: [
      { type: "modify_attack", params: { weaponName: "", ap: true, accuracy: 0, difficulty: 0, rangeOverride: "" } },
      { type: "custom", params: { text: "Vs Lock On targets: weapons gain Smart + Seeking + AP" } }
    ]
  },
  {
    id: "fab_hound_missile",
    name: "Hound Missile Tracking",
    lid: "npcf_hound_missiles_rainmaker",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Deployed drone; pursues target and detonates on arrival (Burst 1, 6/8/10 Explosive)",
    effects: [
      { type: "deferred", params: { timing: "Start of Rainmaker's turns; missile flies 3 spaces toward target", effect: "On arrival: Burst 1, Agility save or 6/8/10 Explosive, half on success", area: "Burst 1" } }
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
  {
    id: "fab_instinct_mode",
    name: "Instinct Mode Active",
    lid: "npcf_instinct_mode_ronin",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Until next turn end: first time targeted each turn, react with Carbon Fiber Sword",
    effects: [
      { type: "grant_reaction", params: { reactionName: "Carbon Fiber Sword counter", trigger: "First time targeted by attack each turn", limit: "1/turn until end of next turn" } }
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
  {
    id: "fab_emergency_vent",
    name: "Emergency Vent Invisible",
    lid: "npcf_emergency_vent_scourer",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Invisible until start of next turn when Heat Cap exceeded or Stunned",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } },
      { type: "custom", params: { text: "Triggered by exceeding Heat Cap or becoming Stunned" } }
    ]
  },
  {
    id: "fab_flash_lens",
    name: "Flash Lens Fired",
    lid: "npcf_flash_lens_scourer",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Cone 5: Systems save or Jammed until start of Scourer's next turn",
    effects: [
      { type: "zone_effect", params: { area: "Cone 5", allyEffect: "", hostileEffect: "Systems save or Jammed until start of Scourer's next turn", attackModifier: "" } }
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
    id: "fab_marker_rifle_lock",
    name: "Marker Rifle Lock",
    lid: "npcf_marker_rifle_scout",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "Target has Lock On + Shredded + can't Hide/become Invisible while locked",
    effects: [
      { type: "apply_condition", params: { condition: "shredded", target: "attack_target" } },
      { type: "custom", params: { text: "Lock On applied; while locked: also Shredded, can't Hide or become Invisible" } }
    ]
  },
  {
    id: "fab_rebound_scan",
    name: "Rebound Scan Revealed",
    lid: "npcf_rebound_scan_scout",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Range 5: Systems save or lose Hidden/Invisible and can't regain or use cover until Scout's next turn",
    effects: [
      { type: "zone_effect", params: { area: "Range 5", allyEffect: "", hostileEffect: "Lose Hidden/Invisible; no cover until start of Scout's next turn", attackModifier: "" } }
    ]
  },
  {
    id: "fab_orbital_strike",
    name: "Orbital Strike Incoming",
    lid: "npcf_orbital_strike_scout",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/timer.svg`,
    description: "End of next round: Burst 2 bombardment at chosen space",
    effects: [
      { type: "deferred", params: { timing: "End of next round", effect: "Burst 2: Agility save or 8/10/12 Explosive + Prone, half on success", area: "Burst 2" } }
    ]
  },

  // ── Seeder ────────────────────────────────────────────────
  {
    id: "fab_lay_mines",
    name: "Mines Deployed",
    lid: "npcf_lay_mines_seeder",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    modifierLids: ["npcf_tripwires_seeder"],
    icon: `${ICON_PATH}/zone.svg`,
    description: "Deployed mines (various types); detonate when hostile moves over them",
    effects: [
      { type: "zone_effect", params: { area: "1 space each (Line 3 with Tripwires)", allyEffect: "", hostileEffect: "Blast 1 detonation on movement; type-dependent effect", attackModifier: "" } },
      { type: "custom", params: { text: "Stun Mine: Stunned. Flak: 4/6/8 Explosive. Rattle: Impaired + Slowed. Corrosion: Shredded + 2 Burn" } }
    ]
  },
  {
    id: "fab_grav_spike",
    name: "Grav Spike Attached",
    lid: "npcf_grav_spike_seeder",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Detonated as protocol: 4/6/8 AP Explosive + pulled 3 spaces toward Seeder",
    effects: [
      { type: "deferred", params: { timing: "Seeder's protocol", effect: "Auto-hit: 4/6/8 AP Explosive + pulled 3 spaces toward Seeder", area: "" } }
    ]
  },
  {
    id: "fab_det_spike",
    name: "Det Spike Attached",
    lid: "npcf_det_spike_seeder",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Detonates start of Seeder's next turn: Burst 1, 3/5/7 Explosive",
    effects: [
      { type: "deferred", params: { timing: "Start of Seeder's next turn", effect: "Burst 1 detonation: 3/5/7 Explosive + 2/3/4 Burn", area: "Burst 1" } }
    ]
  },

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
  {
    id: "fab_punisher_ammo",
    name: "Punisher Ammunition",
    lid: "npcf_punisher_ammunition_sentinel",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Overwatch targets also become Slowed until end of next turn",
    effects: [
      { type: "apply_condition", params: { condition: "slow", target: "attack_target" } },
      { type: "custom", params: { text: "Rider on Overwatch damage; Slowed until end of target's next turn" } }
    ]
  },
  {
    id: "fab_impaler",
    name: "Impaler Lock",
    lid: "npcf_impaler_sentinel",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "On Overwatch hit: Hull save or Immobilized + Jammed until end of next turn",
    effects: [
      { type: "apply_condition", params: { condition: "immobilized", target: "attack_target" } },
      { type: "apply_condition", params: { condition: "jammed", target: "attack_target" } },
      { type: "custom", params: { text: "Triggered by Overwatch hit; Hull save; until end of target's next turn" } }
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
  {
    id: "fab_selective_loader",
    name: "Special Ammo Selected",
    lid: "npcf_selective_loader_sniper",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Choose ammo type: Electromagnetic (Jammed), Thumper (Prone + pushed), Sabot (1 struct dmg to objects), Tracker (Lock On + can't Hide/Invisible)",
    effects: [
      { type: "custom", params: { text: "Electromagnetic: Jammed. Thumper: Prone + pushed 3. Sabot: 1 struct to objects. Tracker: Lock On + can't Hide/Invisible" } }
    ]
  },
  {
    id: "fab_shroud_charge_sniper",
    name: "Smoke Cloud (Sniper)",
    lid: "npcf_shroud_charge_sniper",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/zone.svg`,
    description: "Burst 3 concealment; Sniper gains soft cover; blocks LoS into/out of area",
    effects: [
      { type: "zone_effect", params: { area: "Burst 3", allyEffect: "Soft cover for Sniper", hostileEffect: "Cannot draw LoS into/out of area if fully inside/outside", attackModifier: "" } }
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
  {
    id: "fab_tactical_cloak",
    name: "Tactical Cloak (Permanent)",
    lid: "npcf_tactical_cloak_specter",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Permanently Invisible",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } }
    ]
  },

  // ── Support ───────────────────────────────────────────────
  {
    id: "fab_sealant_gun",
    name: "Sealant Applied",
    lid: "npcf_sealant_gun_support",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/link.svg`,
    description: "Allied: clears Burn but Slowed. Hostile: Slowed until end of next turn",
    effects: [
      { type: "apply_condition", params: { condition: "slow", target: "attack_target" } },
      { type: "custom", params: { text: "Allied target: clear all Burn + Slowed. Hostile: Agility save or Slowed until end of next turn" } }
    ]
  },
  {
    id: "fab_remote_cloud",
    name: "Healing Cloud Deployed",
    lid: "npcf_remote_cloud_support",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/zone.svg`,
    description: "Blast 2: allies starting/entering regain 2/4/6 HP; disperses at Support's next turn start",
    effects: [
      { type: "zone_effect", params: { area: "Blast 2", allyEffect: "Regain 2/4/6 HP on turn start or first entry", hostileEffect: "", attackModifier: "" } },
      { type: "deferred", params: { timing: "Start of Support's next turn", effect: "Cloud disperses", area: "" } }
    ]
  },
  {
    id: "fab_latch_drone",
    name: "Latch Drone Attached",
    lid: "npcf_latch_drone_support",
    where: STATUS_WHERE.ALLY,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/link.svg`,
    description: "Target regains 5/8/10 HP at end of each turn; detaches if target healed to full or after 3 turns",
    effects: [
      { type: "custom", params: { text: "Self-deploying drone clamps onto target; 5/8/10 HP regen at end of each turn; detaches at full HP or after 3 turns" } }
    ]
  },
  {
    id: "fab_restock_drone",
    name: "Restock Drone Deployed",
    lid: "npcf_restock_drone_support",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/link.svg`,
    description: "Drone; first ally passing through/adjacent gets ammo reload + Overshield",
    effects: [
      { type: "custom", params: { text: "First allied character to move through/adjacent: reload one Loading weapon + gain Overshield 2/4/6" } }
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
  {
    id: "fab_blind_witch",
    name: "Blinded (Witch)",
    lid: "npcf_blind_witch",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Target only has LoS to adjacent spaces until end of next turn",
    effects: [
      { type: "custom", params: { text: "Tech attack; success = LoS limited to adjacent spaces until end of next turn" } }
    ]
  },
  {
    id: "fab_predatory_logic",
    name: "Predatory Logic",
    lid: "npcf_predatory_logic_witch",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/link.svg`,
    description: "Target forced to attack Witch's chosen target with Witch's chosen weapon as reaction",
    effects: [
      { type: "custom", params: { text: "Tech attack; success = target uses Witch-chosen weapon to attack Witch-chosen character as reaction" } }
    ]
  },
  {
    id: "fab_blur_witch",
    name: "Blur Active",
    lid: "npcf_blur_witch",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Invisible during Witch's own turn only",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } },
      { type: "custom", params: { text: "Only active during the Witch's turn; not between turns" } }
    ]
  },
  {
    id: "fab_chain_witch",
    name: "Chain Tether",
    lid: "npcf_chain_witch",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Target tethered to a point; moving >3 spaces away deals 4/6/8 AP Energy",
    effects: [
      { type: "custom", params: { text: "Tech attack; target chained to a space within Range 3 of them; moving >3 spaces from point = 4/6/8 AP Energy damage" } }
    ]
  },

  // ── Ultra ─────────────────────────────────────────────────
  {
    id: "fab_repulsion_field",
    name: "Repulsion Field",
    lid: "npcf_repulsion_field_ultra",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Hostiles starting/becoming adjacent: 2/4/6 Energy + 2 heat + Systems save or Impaired",
    effects: [
      { type: "zone_effect", params: { area: "Adjacent", allyEffect: "", hostileEffect: "2/4/6 Energy + 2 heat; Systems save or Impaired until end of next turn", attackModifier: "" } }
    ]
  },
  {
    id: "fab_volley_module",
    name: "Volley Module Prepared",
    lid: "npcf_volley_module_ultra",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/armed.svg`,
    description: "Prepared weapon fires at any number of targets in Range (not in cover/Prone) next turn",
    effects: [
      { type: "custom", params: { text: "Protocol next turn: prepared weapon attacks any number of characters in Range not in cover or Prone" } }
    ]
  },
  {
    id: "fab_wolfhound_missile",
    name: "Wolfhound Missile Tracking",
    lid: "npcf_wolfhound_missile_ultra",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/timer.svg`,
    description: "Missile drone pursues target; detonates on arrival (Burst 1, 10/15/20 Explosive + Prone)",
    effects: [
      { type: "deferred", params: { timing: "Start of Ultra's turns; missile flies toward target", effect: "On reaching target: Burst 1, Agility save or 10/15/20 Explosive + Prone, half on success", area: "Burst 1" } }
    ]
  },
  {
    id: "fab_argus_armor",
    name: "Argus Armor Degrading",
    lid: "npcf_argus_armor_ultra",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.ACCUMULATOR,
    maxStacks: 6,
    icon: `${ICON_PATH}/shield.svg`,
    description: "6 Armor; loses 2 per structure/overheat check; min 0",
    effects: [
      { type: "custom", params: { text: "Starts at 6 Armor; -2 per structure damage or overheating check; minimum 0" } }
    ]
  },
  {
    id: "fab_slivershielding",
    name: "Slivershielding (Permanent Invisible)",
    lid: "npcf_slivershielding_ultra",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "Permanently Invisible; replaces Resilient",
    effects: [
      { type: "stealth", params: { type: "invisible", target: "self", area: "" } }
    ]
  },

  // ── Pirate ────────────────────────────────────────────────
  {
    id: "fab_coreworm_rockets",
    name: "Coreworm Rockets Attached",
    lid: "npcf_coreworm_rockets_pirate",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.STAGED,
    maxStages: 4,
    icon: `${ICON_PATH}/timer.svg`,
    description: "1d3 drones drilling; in 1d3+2 rounds reach cockpit and savage pilot",
    effects: [
      { type: "deferred", params: { timing: "After 1d3+2 rounds if any coreworms remain", effect: "Reach cockpit: pilot reduced to 0 HP; Full action Systems save to remove 1 worm", area: "" } }
    ]
  },

  // ── Spacer ────────────────────────────────────────────────
  {
    id: "fab_sealant_trap",
    name: "Sealant Trap Deployed",
    lid: "npcf_sealant_trap_spacer",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/lock.svg`,
    description: "Mine; Burst 1 on proximity: targets Immobilized until sealant destroyed (10 HP, Evasion 5)",
    effects: [
      { type: "zone_effect", params: { area: "Burst 1 on trigger", allyEffect: "", hostileEffect: "Immobilized until sealant destroyed (10 HP, Evasion 5)", attackModifier: "" } }
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
  },

  // ── RPV (Template) ───────────────────────────────────────
  {
    id: "fab_no_pilot",
    name: "No Pilot (RPV)",
    lid: "npcf_no_pilot_rpv",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/link.svg`,
    description: "Permanently Impaired; Immune to pilot-targeting effects",
    effects: [
      { type: "apply_condition", params: { condition: "impaired", target: "self" } },
      { type: "resistance", params: { damageType: "pilot-targeting", notes: "Immune to systems/actions that affect a pilot directly" } }
    ]
  },

  // ── Veteran (Template) ───────────────────────────────────
  {
    id: "fab_feign_death",
    name: "Feign Death Available",
    lid: "npcf_feign_death_veteran",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/cloak.svg`,
    description: "First destruction is faked; appears destroyed at 1 HP until revealed",
    effects: [
      { type: "deferred", params: { trigger: "First time destroyed this combat", text: "Feigns destruction at 1 HP. Adjacent characters can reveal with Systems/pilot skill check." } }
    ]
  },
  {
    id: "fab_headshot",
    name: "Headshot Ready",
    lid: "npcf_headshot_veteran",
    where: STATUS_WHERE.TARGET,
    statusType: STATUS_TYPE.TARGET_REF,
    icon: `${ICON_PATH}/mark.svg`,
    description: "1/round on crit: target must Hull save or lose LoS beyond adjacent",
    effects: [
      { type: "custom", params: { text: "On critical hit (1/round): target Hull save or only draws LoS to adjacent spaces until end of their next turn" } }
    ]
  },
  {
    id: "fab_lesser_sight",
    name: "Lesser Sight Active",
    lid: "npcf_lesser_sight_veteran",
    where: STATUS_WHERE.ZONE,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/eye.svg`,
    description: "Ignores Invisible within Range 3; hostiles can't Hide within Range 3",
    effects: [
      { type: "custom", params: { text: "Negates Invisible within Range 3; hostile characters in Range 3 cannot successfully Hide" } }
    ]
  },
  {
    id: "fab_lightning_reflexes",
    name: "Lightning Reflexes",
    lid: "npcf_lightning_reflexes_veteran",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/wing.svg`,
    description: "Heavy/Superheavy attacks auto-miss on 5+ (1d6)",
    effects: [
      { type: "custom", params: { text: "When attacked by Heavy or Superheavy weapon: roll 1d6, on 5+ the attack automatically misses" } }
    ]
  },
  {
    id: "fab_self_repair",
    name: "Self Repair Available",
    lid: "npcf_self_repair_veteran",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.CHARGE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "1/scene Full Action: regain all HP and clear all conditions",
    effects: [
      { type: "custom", params: { text: "Full Action (1/scene): regain all HP, clear all conditions" } }
    ]
  },
  {
    id: "fab_limitless",
    name: "Limitless (Overcharge)",
    lid: "npcf_limitless_veteran",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Can Overcharge; always costs 1d6 heat",
    effects: [
      { type: "custom", params: { text: "Grants Overcharge capability; cost is always 1d6 heat (flat)" } }
    ]
  },
  {
    id: "fab_nhp_co_pilot",
    name: "NHP Co-Pilot Active",
    lid: "npcf_nhp_co_pilot_veteran",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.TOGGLE,
    icon: `${ICON_PATH}/link.svg`,
    description: "Gains AI tag; autonomous operation; can cascade",
    effects: [
      { type: "custom", params: { text: "Mech gains AI tag, operates without pilot. NHP can enter cascade per PC AI rules." } }
    ]
  },
  {
    id: "fab_parting_gift",
    name: "Parting Gift (Self-Destruct)",
    lid: "npcf_parting_gift_veteran",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.DEFERRED,
    icon: `${ICON_PATH}/flame.svg`,
    description: "Veteran can Self-Destruct",
    effects: [
      { type: "deferred", params: { trigger: "Quick action when destroyed or voluntarily", text: "Self-Destruct: Burst 2, 4d6 explosive damage" } }
    ]
  },
  {
    id: "fab_shock_armor",
    name: "Shock Armor",
    lid: "npcf_shock_armor_veteran",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/shield.svg`,
    description: "Resistance to damage from Main weapons",
    effects: [
      { type: "resistance", params: { damageType: "kinetic", notes: "Resistance to all damage from Main-sized weapons" } }
    ]
  },

  // ── Ship (Template) ──────────────────────────────────────
  {
    id: "fab_ship_flier",
    name: "Ship Flier",
    lid: "npcf_flier_ship",
    where: STATUS_WHERE.SELF,
    statusType: STATUS_TYPE.PASSIVE,
    icon: `${ICON_PATH}/wing.svg`,
    description: "Hovers in atmosphere; Immune to Immobilized, Stunned, Prone",
    effects: [
      { type: "custom", params: { text: "Immunity to Immobilized, Stunned, and Prone. Hovers in atmosphere, normal movement in zero-g." } }
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

export function getStatusesForActor(actor) {
  if (!actor || actor.type !== "npc") return [];
  const result = [];
  for (const item of actor.items) {
    if (item.type !== "npc_feature") continue;
    const lid = item.system?.lid;
    if (!lid) continue;
    const defs = _statusByLid.get(lid);
    if (defs) result.push(...defs);
  }
  return result;
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
