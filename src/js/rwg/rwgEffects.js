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
      descriptionKey: "effects.nitrogenImportDurationAndCaps",
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
        return 1 / (1 + f * count);
      },
    },
    {
      effectId: "rwg-titan-nitrogen-cap",
      target: "warpGateNetworkManager",
      type: "importCapMultiplier",
      resourceKey: "nitrogen",
      factor: 0.2,
      hideInSummary: true,
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
      descriptionKey: "effects.carbonImportDurationAndCaps",
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
        return 1 / (1 + f * count);
      },
    },
    {
      effectId: "rwg-carbon-carbon-cap",
      target: "warpGateNetworkManager",
      type: "importCapMultiplier",
      resourceKey: "carbon",
      factor: 0.2,
      hideInSummary: true,
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
      descriptionKey: "effects.waterImportDurationAndCaps",
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
        return 1 / (1 + f * count);
      },
    },
    {
      effectId: "rwg-icy-water-cap",
      target: "warpGateNetworkManager",
      type: "importCapMultiplier",
      resourceKey: "water",
      factor: 0.2,
      hideInSummary: true,
      computeValue(count, def) {
        const f = def?.factor ?? 0.2;
        return 1 / (1 + f * count);
      },
    },
  ],
  "super-earth": [
    {
      effectId: "rwg-super-earth-duration",
      target: "projectManager",
      type: "projectDurationMultiplier",
      factor: 0.01,
      excludeSpaceships: true,
      description: "Non-spaceship project duration (1% each)",
      computeValue(count, def) {
        const f = def?.factor ?? 0.01;
        return 1 / (1 + f * count);
      },
    },
  ],    
  "chthonian": [
    {
      effectId: "rwg-chthonian-suffering",
      target: "global",
      type: "flavorText",
      description: "Suffering Enjoyment",
      computeValue() {
        return 0;
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
  "molten": [
    {
      effectId: "rwg-molten-geothermal",
      target: "building",
      targetId: "geothermalGenerator",
      type: "resourceProductionMultiplier",
      resourceCategory: "colony",
      resourceTarget: "energy",
      factor: 0.05,
      description: "Geothermal and fusion energy production increased (+5% each)",
      computeValue(count, def) {
        const f = def?.factor ?? 0.05;
        return 1 + f * count;
      },
    },
    {
      effectId: "rwg-molten-fusion",
      target: "building",
      targetId: "fusionPowerPlant",
      type: "resourceProductionMultiplier",
      resourceCategory: "colony",
      resourceTarget: "energy",
      factor: 0.05,
      hideInSummary: true,
      computeValue(count, def) {
        const f = def?.factor ?? 0.05;
        return 1 + f * count;
      },
    },
    {
      effectId: "rwg-molten-superalloy-fusion",
      target: "building",
      targetId: "superalloyFusionReactor",
      type: "resourceProductionMultiplier",
      resourceCategory: "colony",
      resourceTarget: "energy",
      factor: 0.05,
      hideInSummary: true,
      computeValue(count, def) {
        const f = def?.factor ?? 0.05;
        return 1 + f * count;
      },
    },
  ],
  "jupiter-like": [
    {
      effectId: "rwg-jupiter-like-building-cost",
      target: "global",
      type: "globalCostReduction",
      factor: 0.01,
      description: "Building and colony construction cost divided by (1 + 1% × √N)",
      computeValue(count, def) {
        const f = def?.factor ?? 0.01;
        const divisor = 1 + f * Math.sqrt(Math.max(0, count));
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
  "ammonia-rich": [
    {
      effectId: "rwg-ammonia-life-points",
      target: "lifeDesigner",
      type: "lifeDesignPointBonus",
      factor: 2,
      computeValue(count, def) {
        const f = def?.factor ?? 2;
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

function addHazards(hazardKeys, value) {
  if (!value || value === 'none') return;
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (entry && entry !== 'none') hazardKeys.add(String(entry));
    });
    return;
  }
  if (value.constructor === Object) {
    Object.keys(value).forEach((entry) => {
      if (entry && entry !== 'none') hazardKeys.add(String(entry));
    });
    return;
  }
  hazardKeys.add(String(value));
}

function countRandomWorldHazards(status) {
  if (!status) return 0;
  const hazardKeys = new Set(status.cachedHazards?.keys || []);
  addHazards(hazardKeys, status.hazard);
  addHazards(hazardKeys, status.original?.hazard);
  const override = status.override
    || status.merged
    || status.original?.override
    || status.original?.merged
    || null;
  addHazards(hazardKeys, override?.rwgMeta?.selectedHazards);
  addHazards(hazardKeys, override?.rwgMeta?.selectedHazard);
  addHazards(hazardKeys, override?.hazards);
  addHazards(hazardKeys, status.original?.hazards);
  return hazardKeys.size;
}

function applyRWGEffects() {
  if (!spaceManager || !(addEffect instanceof Function)) return;

  let counts = {};
  let hazardBonuses = {};
  if (spaceManager.getRandomWorldEffectCounts instanceof Function) {
    const cached = spaceManager.getRandomWorldEffectCounts();
    counts = cached?.counts || {};
    hazardBonuses = cached?.hazardBonuses || {};
  } else {
    counts = {};
    hazardBonuses = {};
    const statuses = spaceManager.randomWorldStatuses || {};
    for (const seed in statuses) {
      const st = statuses[seed];
      const type = getRandomWorldType(st);
      if (st?.terraformed && type) {
        counts[type] = (counts[type] || 0) + 1;
        const hazardCount = countRandomWorldHazards(st);
        if (hazardCount) hazardBonuses[type] = (hazardBonuses[type] || 0) + hazardCount;
      }
    }
  }

  for (const [type, effects] of Object.entries(RWG_EFFECTS)) {
    const baseCount = counts[type] || 0;
    const bonus = hazardBonuses[type] || 0;
    const effectiveCount = baseCount + bonus;
    for (const eff of effects) {
      if (eff.type === "flavorText") continue;
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
            excludeSpaceships: eff.excludeSpaceships,
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
        resourceCategory: eff.resourceCategory,
        resourceTarget: eff.resourceTarget,
        resourceId: eff.resourceId,
        resourceKey: eff.resourceKey,
        excludeSpaceships: eff.excludeSpaceships,
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
