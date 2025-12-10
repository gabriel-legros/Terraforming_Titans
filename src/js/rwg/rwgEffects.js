"use strict";

// Random World Generator Effects
const RWG_EFFECTS = {
  "titan-like": [
    {
      effectId: "rwg-titan-nitrogen",
      target: "project",
      targetId: "nitrogenSpaceMining",
      type: "projectDurationMultiplier",
      factor: 0.2,
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
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
      factor: 0.2,
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
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
      factor: 0.2,
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
        return 1 / (1 + f * count);
      },
    },
  ],
  "super-earth": [
    {
      effectId: "rwg-super-earth-bonus",
      target: "spaceManager",
      type: "extraTerraformedWorlds",
      description: "Counts as two extra worlds each",
      computeValue(count) {
        return count * 2;
      },
    },
  ],    
  "rogue": [
    {
      effectId: "rwg-rogue-maintenance",
      target: "global",
      type: "globalMaintenanceReduction",
      factor: 0.02,
      description: "Maintenance divided by (1 + 2% each)",
      computeValue(count, def) {
        const f = def?.factor ?? 0.02;
        const divisor = 1 + f * count;
        return 1 - 1 / divisor;
      },
    }
  ],
  "cold-desert": [
    {
      effectId: "rwg-desert-ore",
      target: "building",
      targetId: "oreMine",
      type: "productionMultiplier",
      factor: 0.2,
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
        return 1 + f * count;
      },
    },
  ],
  "desiccated-desert": [
    {
      effectId: "rwg-desiccated-sand",
      target: "building",
      targetId: "sandQuarry",
      type: "productionMultiplier",
      factor: 0.2,
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
        return 1 + f * count;
      }
    }],
  "venus-like": [
    {
      effectId: "rwg-venus-workers",
      target: "global",
      type: "globalWorkerReduction",
      factor: 0.02,
      computeValue(count, def) {
        const f = def?.factor ?? 0.02;
        const divisor = 1 + f * count;
        return 1 - 1 / divisor;
      },
    },
  ],
  "mars-like": [
    {
      effectId: "rwg-mars-pop",
      target: "population",
      type: "globalPopulationGrowth",
      factor: 0.02,
      computeValue(count, def) {
        const f = def?.factor ?? 0.02;
        return f * count;
      },
    },
  ],
};

function getRandomWorldType(status) {
  if (!status) return null;
  return status.cachedArchetype
    || status.archetype
    || status.classification?.archetype
    || status.original?.archetype
    || status.original?.classification?.archetype
    || status.original?.merged?.classification?.archetype
    || status.original?.override?.classification?.archetype
    || null;
}

function hasRandomWorldHazard(status) {
  if (!status) return false;
  const summary = status.cachedHazards;
  if (summary && summary.keys && summary.keys.length) return true;
  const hazardValue = status.hazard ?? status.original?.hazard;
  if (hazardValue && hazardValue !== 'none') return true;
  const override = status.override
    || status.merged
    || status.original?.override
    || status.original?.merged
    || null;
  if (override?.rwgMeta?.selectedHazard && override.rwgMeta.selectedHazard !== 'none') return true;
  const hazards = override?.hazards || status.original?.hazards || null;
  return hazards ? Object.keys(hazards).length > 0 : false;
}

function applyRWGEffects() {
  if (!spaceManager || !(addEffect instanceof Function)) return;

  const counts = {};
  const hazardBonuses = {};
  const statuses = spaceManager.randomWorldStatuses || {};
  for (const seed in statuses) {
    const st = statuses[seed];
    const type = getRandomWorldType(st);
    if (st?.terraformed && type) {
      counts[type] = (counts[type] || 0) + 1;
      if (hasRandomWorldHazard(st)) hazardBonuses[type] = (hazardBonuses[type] || 0) + 1;
    }
  }

  for (const [type, effects] of Object.entries(RWG_EFFECTS)) {
    const baseCount = counts[type] || 0;
    const bonus = hazardBonuses[type] || 0;
    const effectiveCount = baseCount + bonus;
    for (const eff of effects) {
      const value = eff.computeValue instanceof Function ? eff.computeValue(effectiveCount, eff) : eff.value;
      if (eff.type === "resourceCostMultiplier" && Array.isArray(eff.resourceId)) {
        for (const resourceId of eff.resourceId) {
          addEffect({
            effectId: `${eff.effectId}-${resourceId}`,
            sourceId: `rwg-${type}`,
            type: eff.type,
            target: eff.target,
            targetId: eff.targetId,
            resourceCategory: eff.resourceCategory,
            resourceId,
            value,
          });
        }
        continue;
      }

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
