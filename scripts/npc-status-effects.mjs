const MODULE_ID = "lancer-fabricator-main";

export const EFFECT_TYPE = Object.freeze({
  EXTRA_ATTACK: "extra_attack",
  BONUS_DAMAGE: "bonus_damage",
  APPLY_CONDITION: "apply_condition",
  GRANT_REACTION: "grant_reaction",
  MODIFY_ATTACK: "modify_attack",
  RESISTANCE: "resistance",
  ZONE_EFFECT: "zone_effect",
  DEFERRED: "deferred",
  STEALTH: "stealth",
  STAT_CHANGE: "stat_change",
  CUSTOM: "custom"
});

export const EFFECT_TARGET = Object.freeze({
  SELF: "self",
  ATTACK_TARGET: "attack_target",
  ALLY: "ally",
  ZONE: "zone",
  ALL_IN_AREA: "all_in_area"
});

export const CONDITION_IDS = Object.freeze([
  "immobilized", "impaired", "jammed", "lockon", "shredded",
  "slow", "stunned", "dangerzone", "downandout", "engaged",
  "exposed", "hidden", "invisible", "prone", "shutdown"
]);

export const DAMAGE_TYPES = Object.freeze([
  "kinetic", "explosive", "energy", "burn", "heat", "ap"
]);

export const EFFECT_PRESETS = Object.freeze({
  [EFFECT_TYPE.EXTRA_ATTACK]: {
    label: "Extra Attack",
    description: "Fire a weapon additional times",
    params: {
      weaponName: { type: "string", label: "Weapon name", required: true },
      count: { type: "number", label: "Extra shots", default: 1 },
      consume: { type: "boolean", label: "Consume status after", default: true }
    }
  },
  [EFFECT_TYPE.BONUS_DAMAGE]: {
    label: "Bonus Damage",
    description: "Add extra damage to attacks",
    params: {
      amount: { type: "string", label: "Amount (number or dice)", required: true },
      damageType: { type: "select", label: "Damage type", options: DAMAGE_TYPES, default: "kinetic" },
      consume: { type: "boolean", label: "Consume on use", default: false },
      condition: { type: "string", label: "Only when (optional)", default: "" }
    }
  },
  [EFFECT_TYPE.APPLY_CONDITION]: {
    label: "Apply Condition",
    description: "Apply a LANCER condition to a target",
    params: {
      condition: { type: "select", label: "Condition", options: CONDITION_IDS, required: true },
      target: { type: "select", label: "Applied to", options: ["self", "attack_target", "ally"], default: "self" }
    }
  },
  [EFFECT_TYPE.GRANT_REACTION]: {
    label: "Grant Reaction",
    description: "Enables a reaction ability while status is active",
    params: {
      reactionName: { type: "string", label: "Reaction name", required: true },
      trigger: { type: "string", label: "Trigger condition", default: "" },
      limit: { type: "string", label: "Use limit", default: "1/round" }
    }
  },
  [EFFECT_TYPE.MODIFY_ATTACK]: {
    label: "Modify Attack",
    description: "Change properties of an attack",
    params: {
      weaponName: { type: "string", label: "Weapon (blank = all)", default: "" },
      ap: { type: "boolean", label: "Becomes AP", default: false },
      accuracy: { type: "number", label: "Accuracy bonus", default: 0 },
      difficulty: { type: "number", label: "Difficulty bonus", default: 0 },
      rangeOverride: { type: "string", label: "Range override (e.g. Line 20)", default: "" }
    }
  },
  [EFFECT_TYPE.RESISTANCE]: {
    label: "Resistance / Immunity",
    description: "Grant damage resistance or immunity",
    params: {
      type: { type: "select", label: "Level", options: ["resistance", "immunity"], default: "resistance" },
      damageType: { type: "string", label: "Damage type (or 'all')", default: "all" },
      target: { type: "select", label: "Applied to", options: ["self", "ally", "self_and_ally"], default: "self" }
    }
  },
  [EFFECT_TYPE.ZONE_EFFECT]: {
    label: "Zone Effect",
    description: "Area with ongoing effects",
    params: {
      area: { type: "string", label: "Area shape (e.g. Burst 3, Line 4)", required: true },
      allyEffect: { type: "string", label: "Effect on allies", default: "" },
      hostileEffect: { type: "string", label: "Effect on hostiles", default: "" },
      attackModifier: { type: "string", label: "Attack modifier through zone", default: "" }
    }
  },
  [EFFECT_TYPE.DEFERRED]: {
    label: "Deferred Effect",
    description: "Something happens on a future turn/round",
    params: {
      timing: { type: "string", label: "When it fires", required: true },
      effect: { type: "string", label: "What happens", required: true },
      area: { type: "string", label: "Area (if any)", default: "" }
    }
  },
  [EFFECT_TYPE.STEALTH]: {
    label: "Stealth State",
    description: "Hidden or Invisible status",
    params: {
      type: { type: "select", label: "Stealth type", options: ["hidden", "invisible"], default: "invisible" },
      target: { type: "select", label: "Applied to", options: ["self", "ally", "self_and_allies_in_area"], default: "self" },
      area: { type: "string", label: "Area (if applicable)", default: "" }
    }
  },
  [EFFECT_TYPE.STAT_CHANGE]: {
    label: "Stat Change",
    description: "Modify a stat while active",
    params: {
      stat: { type: "string", label: "Stat name", required: true },
      value: { type: "string", label: "New value or modifier", required: true },
      target: { type: "select", label: "Applied to", options: ["self", "attack_target", "ally"], default: "self" }
    }
  },
  [EFFECT_TYPE.CUSTOM]: {
    label: "Custom Effect",
    description: "Free-text effect description",
    params: {
      text: { type: "string", label: "Effect description", required: true }
    }
  }
});

// ─── Natural Language Pattern Matching ──────────────────────

const NL_PATTERNS = [
  {
    type: EFFECT_TYPE.EXTRA_ATTACK,
    patterns: [
      /(?:fires?|attacks?)\s+(?:(\d+)\s+)?(?:additional|extra)\s+times?/i,
      /(?:fires?|attacks?)\s+twice/i,
      /(?:fires?|attacks?)\s+(\d+)x/i,
      /(?:fire|attack)\s+(?:them\s+)?(\d+)\s*(?:times|x)\s+with\s+(.+?)(?:\.|,|$)/i
    ],
    extract: (match) => ({
      count: parseInt(match[1]) || 1,
      weaponName: match[2]?.trim() || "",
      consume: true
    })
  },
  {
    type: EFFECT_TYPE.BONUS_DAMAGE,
    patterns: [
      /\+(\d+(?:d\d+)?)\s+(kinetic|explosive|energy|burn|heat)\s*(?:damage)?/i,
      /deals?\s+(?:an?\s+)?(?:additional|extra|bonus)\s+(\d+(?:d\d+)?)\s+(kinetic|explosive|energy|burn|heat)?/i,
      /bonus\s+damage\s*(?:of\s+)?(\d+(?:d\d+)?)/i
    ],
    extract: (match) => ({
      amount: match[1] || "0",
      damageType: (match[2] || "kinetic").toLowerCase(),
      consume: false
    })
  },
  {
    type: EFFECT_TYPE.APPLY_CONDITION,
    patterns: [
      /(?:target|enemy|hostile)\s+(?:is|becomes?|gains?)\s+(immobilized|impaired|jammed|shredded|slow(?:ed)?|stunned|prone|exposed)/i,
      /(?:is|becomes?|gains?)\s+(immobilized|impaired|jammed|shredded|slow(?:ed)?|stunned|prone|exposed)/i
    ],
    extract: (match) => {
      let condition = match[1].toLowerCase();
      if (condition === "slowed") condition = "slow";
      const text = match.input || "";
      const targetSelf = /(?:self|this|the)\s+(?:npc|mech|unit)/i.test(text) ||
                         !/(?:target|enemy|hostile)/i.test(text);
      return { condition, target: targetSelf ? "self" : "attack_target" };
    }
  },
  {
    type: EFFECT_TYPE.GRANT_REACTION,
    patterns: [
      /gains?\s+(?:the\s+)?(.+?)\s+reaction/i,
      /(?:has|gains?|enables?)\s+(.+?)\s+(?:as\s+a\s+)?reaction/i
    ],
    extract: (match) => ({
      reactionName: match[1].trim(),
      trigger: "",
      limit: "1/round"
    })
  },
  {
    type: EFFECT_TYPE.MODIFY_ATTACK,
    patterns: [
      /(?:attacks?|shots?)\s+(?:becomes?|gains?|are)\s+AP/i,
      /\+(\d+)\s+(?:accuracy|acc)/i
    ],
    extract: (match) => ({
      weaponName: "",
      ap: /AP/i.test(match[0]),
      accuracy: parseInt(match[1]) || 0,
      difficulty: 0,
      rangeOverride: ""
    })
  },
  {
    type: EFFECT_TYPE.RESISTANCE,
    patterns: [
      /(?:resistance|immune|immunity)\s+to\s+(?:all\s+)?(?:(kinetic|explosive|energy|burn|heat)\s+)?damage/i,
      /(?:has|gains?)\s+(?:resistance|immunity)/i
    ],
    extract: (match) => ({
      type: /immun/i.test(match[0]) ? "immunity" : "resistance",
      damageType: (match[1] || "all").toLowerCase(),
      target: "self"
    })
  },
  {
    type: EFFECT_TYPE.ZONE_EFFECT,
    patterns: [
      /(burst|blast|line|cone)\s+(\d+)/i
    ],
    extract: (match) => ({
      area: `${match[1]} ${match[2]}`,
      allyEffect: "",
      hostileEffect: "",
      attackModifier: ""
    })
  },
  {
    type: EFFECT_TYPE.STEALTH,
    patterns: [
      /(?:is|becomes?|gains?)\s+(hidden|invisible)/i
    ],
    extract: (match) => ({
      type: match[1].toLowerCase(),
      target: "self",
      area: ""
    })
  },
  {
    type: EFFECT_TYPE.DEFERRED,
    patterns: [
      /(?:at|on)\s+(?:the\s+)?(?:start|end)\s+of\s+(?:.+?)\s+(?:next\s+)?turn/i,
      /(?:next|following)\s+(?:round|turn)/i
    ],
    extract: (match) => ({
      timing: match[0].trim(),
      effect: "",
      area: ""
    })
  }
];

export function analyzeFeatureText(text) {
  if (!text) return [];
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const suggestions = [];
  const seen = new Set();

  for (const rule of NL_PATTERNS) {
    for (const pattern of rule.patterns) {
      const match = cleaned.match(pattern);
      if (match && !seen.has(rule.type)) {
        seen.add(rule.type);
        suggestions.push({
          type: rule.type,
          label: EFFECT_PRESETS[rule.type].label,
          params: rule.extract(match),
          matchedText: match[0],
          confidence: match[0].length > 10 ? "high" : "medium"
        });
      }
    }
  }

  return suggestions;
}

export function getEffectSummary(effects) {
  if (!effects?.length) return "";
  return effects.map(e => {
    const preset = EFFECT_PRESETS[e.type];
    if (!preset) return e.type;
    switch (e.type) {
      case EFFECT_TYPE.EXTRA_ATTACK:
        return `${e.params.weaponName || "weapon"} ×${(e.params.count || 1) + 1}`;
      case EFFECT_TYPE.BONUS_DAMAGE:
        return `+${e.params.amount} ${e.params.damageType || ""}`.trim();
      case EFFECT_TYPE.APPLY_CONDITION:
        return `${e.params.condition} (${e.params.target})`;
      case EFFECT_TYPE.GRANT_REACTION:
        return `⚡ ${e.params.reactionName}${e.params.limit ? ` ${e.params.limit}` : ""}`;
      case EFFECT_TYPE.MODIFY_ATTACK: {
        const parts = [];
        if (e.params.ap) parts.push("AP");
        if (e.params.accuracy) parts.push(`+${e.params.accuracy} acc`);
        if (e.params.rangeOverride) parts.push(e.params.rangeOverride);
        return parts.join(", ") || "modified";
      }
      case EFFECT_TYPE.RESISTANCE:
        return `${e.params.type} ${e.params.damageType} (${e.params.target})`;
      case EFFECT_TYPE.ZONE_EFFECT:
        return `zone ${e.params.area}`;
      case EFFECT_TYPE.DEFERRED:
        return `⏳ ${e.params.timing}: ${e.params.effect}`;
      case EFFECT_TYPE.STEALTH:
        return e.params.type;
      case EFFECT_TYPE.STAT_CHANGE:
        return `${e.params.stat} → ${e.params.value}`;
      case EFFECT_TYPE.CUSTOM:
        return e.params.text;
      default:
        return preset.label;
    }
  }).join("; ");
}
