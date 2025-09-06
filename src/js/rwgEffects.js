"use strict";

// Random World Generator Effects
const RWG_EFFECTS = {
  "titan-like": [
    {
      effectId: "rwg-titan-nitrogen",
      target: "project",
      targetId: "nitrogenSpaceMining",
      type: "projectDurationMultiplier",
      factor: 0.1,
      computeValue(count, def) {
        const f = typeof def.factor === "number" ? def.factor : 0.1;
        return 1 / (1 + f * count);
      },
    },
  ],
  "carbon-planet": [
    {
      effectId: "rwg-carbon-carbon",
      target: "project",
      targetId: "carbonSpaceMining",
      type: "projectDurationMultiplier",
      factor: 0.1,
      computeValue(count, def) {
        const f = typeof def.factor === "number" ? def.factor : 0.1;
        return 1 / (1 + f * count);
      },
    },
  ],
  "icy-moon": [
    {
      effectId: "rwg-icy-water",
      target: "project",
      targetId: "waterSpaceMining",
      type: "projectDurationMultiplier",
      factor: 0.1,
      computeValue(count, def) {
        const f = typeof def.factor === "number" ? def.factor : 0.1;
        return 1 / (1 + f * count);
      },
    },
  ],
  "mars-like": [
    {
      effectId: "rwg-mars-pop",
      target: "population",
      type: "globalPopulationGrowth",
      factor: 0.01,
      computeValue(count, def) {
        const f = typeof def.factor === "number" ? def.factor : 0.01;
        return f * count;
      },
    },
  ],
};

function applyRWGEffects() {
  if (typeof spaceManager === "undefined" || typeof addEffect !== "function") return;

  const counts = {};
  const statuses = spaceManager.randomWorldStatuses || {};
  for (const seed in statuses) {
    const st = statuses[seed];
    const type = st?.original?.override?.classification.archetype;
    if (st?.terraformed && type) {
      counts[type] = (counts[type] || 0) + 1;
    }
  }

  for (const [type, effects] of Object.entries(RWG_EFFECTS)) {
    const count = counts[type] || 0;
    for (const eff of effects) {
      const value = typeof eff.computeValue === "function" ? eff.computeValue(count, eff) : eff.value;
      addEffect({
        effectId: eff.effectId,
        sourceId: `rwg-${type}`,
        type: eff.type,
        target: eff.target,
        targetId: eff.targetId,
        value,
      });
    }
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.applyRWGEffects = applyRWGEffects;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { applyRWGEffects, RWG_EFFECTS };
}
