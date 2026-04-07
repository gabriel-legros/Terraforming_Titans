(function () {
  let SpecializationBase;
  try {
    SpecializationBase = SpecializationProject;
  } catch (error) {}
  try {
    ({ SpecializationProject: SpecializationBase } = require('./SpecializationProject.js'));
  } catch (error) {}

  function getFoundryText(path) {
    try {
      return t(path, null, '');
    } catch (error) {
      return '';
    }
  }

  const FOUNDRY_SHOP_ITEMS = [
    {
      id: 'galacticMetalMiningCap',
      label: getFoundryText('catalogs.specializations.foundry.shopItems.galacticMetalMiningCap.label'),
      cost: 1,
      maxPurchases: 800,
      description: getFoundryText('catalogs.specializations.foundry.shopItems.galacticMetalMiningCap.description'),
    },
    {
      id: 'galacticSilicaMiningCap',
      label: getFoundryText('catalogs.specializations.foundry.shopItems.galacticSilicaMiningCap.label'),
      cost: 1,
      maxPurchases: 800,
      description: getFoundryText('catalogs.specializations.foundry.shopItems.galacticSilicaMiningCap.description'),
    },
    {
      id: 'galacticEverythingElseCap',
      label: getFoundryText('catalogs.specializations.foundry.shopItems.galacticEverythingElseCap.label'),
      cost: 1,
      maxPurchases: 800,
      description: getFoundryText('catalogs.specializations.foundry.shopItems.galacticEverythingElseCap.description'),
    },
    {
      id: 'oreMiningOutput',
      label: getFoundryText('catalogs.specializations.foundry.shopItems.oreMiningOutput.label'),
      cost: 1,
      maxPurchases: 900,
      description: getFoundryText('catalogs.specializations.foundry.shopItems.oreMiningOutput.description'),
    },
    {
      id: 'silicaMiningOutput',
      label: getFoundryText('catalogs.specializations.foundry.shopItems.silicaMiningOutput.label'),
      cost: 1,
      maxPurchases: 900,
      description: getFoundryText('catalogs.specializations.foundry.shopItems.silicaMiningOutput.description'),
    },
    {
      id: 'glassSmelterOptimization',
      label: getFoundryText('catalogs.specializations.foundry.shopItems.glassSmelterOptimization.label'),
      cost: 1,
      maxPurchases: 400,
      description: getFoundryText('catalogs.specializations.foundry.shopItems.glassSmelterOptimization.description'),
    },
    {
      id: 'deeperMiningSpeed',
      label: getFoundryText('catalogs.specializations.foundry.shopItems.deeperMiningSpeed.label'),
      cost: 1,
      maxPurchases: 900,
      description: getFoundryText('catalogs.specializations.foundry.shopItems.deeperMiningSpeed.description'),
    },
  ];

  const FOUNDRY_SHOP_ITEM_MAP = FOUNDRY_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  class FoundryWorldProject extends SpecializationBase {
    static THIN_CRUST_CORE_HEAT_FLUX = 5000;

    constructor(config, name) {
      super(config, name, {
        pointsKey: 'foundryPoints',
        pointsLabel: getFoundryText('catalogs.specializations.foundry.pointsLabel'),
        pointsUnit: 'MP',
        shopTitle: getFoundryText('catalogs.specializations.foundry.shopTitle'),
        shopTooltip: getFoundryText('catalogs.specializations.foundry.shopTooltip'),
        emptyShopText: getFoundryText('catalogs.specializations.foundry.emptyShopText'),
        shopItems: FOUNDRY_SHOP_ITEMS,
        shopItemMap: FOUNDRY_SHOP_ITEM_MAP,
        specializationSourceId: 'foundryWorld',
        otherSpecializationIds: ['bioworld', 'manufacturingWorld'],
        ecumenopolisEffectPrefix: 'foundry',
        hazardPointBonusPerHazard: 0.1,
      });
    }

    getFoundryPointGain(initialLand) {
      const normalized = Math.max(initialLand, 0);
      return Math.sqrt(normalized / 50000000000) * 10;
    }

    getTravelPointGain() {
      if (spaceManager.currentArtificialKey !== null) {
        return 0;
      }
      const basePoints = this.getFoundryPointGain(resolveWorldBaseLand(terraforming));
      return this.applyHazardPointBonus(basePoints);
    }

    getDeepMiningDepth() {
      return projectManager.projects.deeperMining.averageDepth;
    }

    hasThinCrust() {
      return Math.max(0, terraforming.celestialParameters.coreHeatFlux || 0) > FoundryWorldProject.THIN_CRUST_CORE_HEAT_FLUX;
    }

    meetsMiningRequirement() {
      return this.getDeepMiningDepth() >= 50000 || this.hasThinCrust();
    }

    getSpecializationRequirements() {
      const bioworld = projectManager.projects.bioworld;
      const manufacturing = projectManager.projects.manufacturingWorld;
      const holyWorldBlocked = followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated();
      return [
        {
          id: 'terraformed',
          label: getFoundryText('catalogs.specializations.foundry.requirements.terraformed'),
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'deepMining',
          label: getFoundryText('catalogs.specializations.foundry.requirements.deepMining'),
          met: this.meetsMiningRequirement(),
        },
        {
          id: 'otherSpecialization',
          label: getFoundryText('catalogs.specializations.foundry.requirements.otherSpecialization'),
          met: !holyWorldBlocked
            && !bioworld.isActive
            && !bioworld.isCompleted
            && !manufacturing.isActive
            && !manufacturing.isCompleted,
        },
      ];
    }

    getSpecializationLockedText() {
      if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) {
        return getFoundryText('catalogs.specializations.foundry.lockedByHolyWorld');
      }
      return super.getSpecializationLockedText();
    }

    canStart() {
      if (!super.canStart()) {
        return false;
      }
      if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) {
        return false;
      }
      if (!spaceManager.isCurrentWorldTerraformed()) {
        return false;
      }
      if (!this.meetsMiningRequirement()) {
        return false;
      }
      const bioworld = projectManager.projects.bioworld;
      const manufacturing = projectManager.projects.manufacturingWorld;
      if (bioworld.isActive || bioworld.isCompleted) {
        return false;
      }
      if (manufacturing.isActive || manufacturing.isCompleted) {
        return false;
      }
      return true;
    }

    complete() {
      super.complete();
      this.convertEcumenopolisToMetropolises();
      this.ecumenopolisDisabled = true;
      this.applyEcumenopolisDisable();
    }

    convertEcumenopolisToMetropolises() {
      const ecumenopolis = colonies.t7_colony;
      const metropolis = colonies.t6_colony;
      const totalCount = ecumenopolis.count;
      const activeCount = ecumenopolis.active;
      if (activeCount > 0n) {
        ecumenopolis.adjustLand(-ecumenopolis.activeNumber);
        metropolis.adjustLand(ecumenopolis.activeNumber);
      }
      metropolis.count += totalCount;
      metropolis.active += activeCount;
      metropolis.isHidden = false;
      ecumenopolis.count = 0n;
      ecumenopolis.active = 0n;
      ecumenopolis.updateResourceStorage();
      metropolis.updateResourceStorage();
    }

    applySpecializationEffects() {
      const capBonus = 1 + (this.getShopPurchaseCount('galacticMetalMiningCap') * 0.05);
      warpGateNetworkManager.addAndReplace({
        type: 'importCapMultiplier',
        resourceKey: 'metal',
        value: capBonus,
        effectId: 'foundry-metal-cap',
        sourceId: 'foundryWorld',
      });
      const silicaCapBonus = 1 + (this.getShopPurchaseCount('galacticSilicaMiningCap') * 0.05);
      warpGateNetworkManager.addAndReplace({
        type: 'importCapMultiplier',
        resourceKey: 'silicon',
        value: silicaCapBonus,
        effectId: 'foundry-silica-cap',
        sourceId: 'foundryWorld',
      });
      const everythingElseCapBonus = 1 + (this.getShopPurchaseCount('galacticEverythingElseCap') * 0.05);
      warpGateNetworkManager.addAndReplace({
        type: 'importCapMultiplier',
        resourceKey: 'water',
        value: everythingElseCapBonus,
        effectId: 'foundry-water-cap',
        sourceId: 'foundryWorld',
      });
      warpGateNetworkManager.addAndReplace({
        type: 'importCapMultiplier',
        resourceKey: 'carbon',
        value: everythingElseCapBonus,
        effectId: 'foundry-carbon-cap',
        sourceId: 'foundryWorld',
      });
      warpGateNetworkManager.addAndReplace({
        type: 'importCapMultiplier',
        resourceKey: 'nitrogen',
        value: everythingElseCapBonus,
        effectId: 'foundry-nitrogen-cap',
        sourceId: 'foundryWorld',
      });

      const oreMineMultiplier = 1 + (this.getShopPurchaseCount('oreMiningOutput') * 0.01);
      addEffect({
        target: 'building',
        targetId: 'oreMine',
        type: 'productionMultiplier',
        effectId: 'foundry-ore-mine-output',
        value: oreMineMultiplier,
        sourceId: 'foundryWorld',
      });
      const silicaMultiplier = 1 + (this.getShopPurchaseCount('silicaMiningOutput') * 0.01);
      addEffect({
        target: 'building',
        targetId: 'sandQuarry',
        type: 'productionMultiplier',
        effectId: 'foundry-silica-output',
        value: silicaMultiplier,
        sourceId: 'foundryWorld',
      });
      const glassSmelterMultiplier = 1 + (this.getShopPurchaseCount('glassSmelterOptimization') * 0.01);
      addEffect({
        target: 'building',
        targetId: 'glassSmelter',
        type: 'productionMultiplier',
        effectId: 'foundry-glass-smelter-output',
        value: glassSmelterMultiplier,
        sourceId: 'foundryWorld',
      });
      addEffect({
        target: 'building',
        targetId: 'glassSmelter',
        type: 'consumptionMultiplier',
        effectId: 'foundry-glass-smelter-consumption',
        value: glassSmelterMultiplier,
        sourceId: 'foundryWorld',
      });

      const speedBonus = 1 + (this.getShopPurchaseCount('deeperMiningSpeed') * 0.01);
      addEffect({
        target: 'project',
        targetId: 'deeperMining',
        type: 'projectDurationMultiplier',
        effectId: 'foundry-deeper-mining-speed',
        value: 1 / speedBonus,
        sourceId: 'foundryWorld',
      });
      addEffect({
        target: 'project',
        targetId: 'undergroundExpansion',
        type: 'projectDurationMultiplier',
        effectId: 'foundry-underground-expansion-speed',
        value: 1 / speedBonus,
        sourceId: 'foundryWorld',
      });

      if (this.ecumenopolisDisabled) {
        this.applyEcumenopolisDisable();
      }
    }

    loadState(state = {}) {
      super.loadState(state);
      this.ecumenopolisDisabled = this.isCompleted || false;
      if (state.ecumenopolisDisabled) {
        this.ecumenopolisDisabled = true;
      }
      this.loadSpecializationState(state);
      this.applySpecializationEffects();
    }
  }

  try {
    window.FoundryWorldProject = FoundryWorldProject;
  } catch (error) {}

  try {
    module.exports = FoundryWorldProject;
  } catch (error) {}
})();
