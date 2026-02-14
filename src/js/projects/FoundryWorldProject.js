(function () {
  let SpecializationBase;
  try {
    SpecializationBase = SpecializationProject;
  } catch (error) {}
  try {
    ({ SpecializationProject: SpecializationBase } = require('./SpecializationProject.js'));
  } catch (error) {}

  const FOUNDRY_SHOP_ITEMS = [
    {
      id: 'galacticMetalMiningCap',
      label: 'Galactic Metal Mining Expertise',
      cost: 1,
      maxPurchases: 800,
      description: 'Increases the galactic metal mining cap by 5%.',
    },
    {
      id: 'galacticSilicaMiningCap',
      label: 'Galactic Silica Mining Expertise',
      cost: 1,
      maxPurchases: 800,
      description: 'Increases the galactic silica mining cap by 5%.',
    },
    {
      id: 'galacticEverythingElseCap',
      label: 'Galactic Everything Else',
      cost: 1,
      maxPurchases: 800,
      description: 'Increases the galactic water, carbon, and nitrogen import caps by 5%.',
    },
    {
      id: 'oreMiningOutput',
      label: 'Planetary Ore Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases ore mine output by 1%.',
    },
    {
      id: 'silicaMiningOutput',
      label: 'Planetary Silica Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases silica mining output by 1%.',
    },
    {
      id: 'deeperMiningSpeed',
      label: 'Deeper Mining Expertise',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases deeper mining speed by 1%.',
    },
  ];

  const FOUNDRY_SHOP_ITEM_MAP = FOUNDRY_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  class FoundryWorldProject extends SpecializationBase {
    constructor(config, name) {
      super(config, name, {
        pointsKey: 'foundryPoints',
        pointsLabel: 'Metallurgy Points:',
        pointsUnit: 'MP',
        shopTitle: 'Metallurgy Shop',
        shopTooltip: 'You gain 10 metallurgy points times sqrt(initial land / 50B) when travelling after completing this project, then +10% per hazard on this world.',
        emptyShopText: 'No foundry upgrades available yet.',
        shopItems: FOUNDRY_SHOP_ITEMS,
        shopItemMap: FOUNDRY_SHOP_ITEM_MAP,
        specializationSourceId: 'foundryWorld',
        otherSpecializationId: 'bioworld',
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
      const basePoints = this.getFoundryPointGain(terraforming.initialLand);
      return this.applyHazardPointBonus(basePoints);
    }

    getDeepMiningDepth() {
      return projectManager.projects.deeperMining.averageDepth;
    }

    getSpecializationRequirements() {
      const otherSpecialization = projectManager.projects.bioworld;
      return [
        {
          id: 'terraformed',
          label: 'World is fully terraformed',
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'deepMining',
          label: 'Deeper mining depth at least 50,000',
          met: this.getDeepMiningDepth() >= 50000,
        },
        {
          id: 'otherSpecialization',
          label: 'No other specialization started or completed',
          met: !otherSpecialization.isActive && !otherSpecialization.isCompleted,
        },
      ];
    }

    getSpecializationLockedText() {
      if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) {
        return 'Blocked by Holy World';
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
      if (this.getDeepMiningDepth() < 50000) {
        return false;
      }
      if (projectManager.projects.bioworld.isActive || projectManager.projects.bioworld.isCompleted) {
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
      if (activeCount > 0) {
        ecumenopolis.adjustLand(-activeCount);
        metropolis.adjustLand(activeCount);
      }
      metropolis.count += totalCount;
      metropolis.active += activeCount;
      metropolis.isHidden = false;
      ecumenopolis.count = 0;
      ecumenopolis.active = 0;
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

      const speedBonus = 1 + (this.getShopPurchaseCount('deeperMiningSpeed') * 0.01);
      addEffect({
        target: 'project',
        targetId: 'deeperMining',
        type: 'projectDurationMultiplier',
        effectId: 'foundry-deeper-mining-speed',
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
