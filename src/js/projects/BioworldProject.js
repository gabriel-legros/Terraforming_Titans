(function () {
  let SpecializationBase;
  try {
    SpecializationBase = SpecializationProject;
  } catch (error) {}
  try {
    ({ SpecializationProject: SpecializationBase } = require('./SpecializationProject.js'));
  } catch (error) {}

  const EVOLUTION_POINT_DIVISOR = 1e12;
  const MAX_EVOLUTION_UPGRADES = 400;
  const MAX_BIOWORKERS_UPGRADES = 200;
  const MAX_LIFE_POINT_GAIN_UPGRADES = 900;

  const BIOWORLD_SHOP_ITEMS = [
    {
      id: 'lifeDesignerUnlock',
      label: 'Unlock Life Designer',
      cost: 100,
      maxPurchases: 1,
      description: 'Permanently completes the Life Designing and Production Research.',
    },
    {
      id: 'lifePointGain',
      label: 'Life Points Gain +1%',
      cost: 1,
      maxPurchases: MAX_LIFE_POINT_GAIN_UPGRADES,
      description: 'Boosts life design point gains by 1%.',
    },
    {
      id: 'temperatureToleranceMax',
      label: 'Temperature Tolerance Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for minimum and maximum temperature tolerance by 1.',
    },
    {
      id: 'growthToleranceMax',
      label: 'Growth Tolerance Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for optimal growth temperature and growth tolerance by 1.',
    },
    {
      id: 'invasivenessMax',
      label: 'Invasiveness Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for invasiveness by 1.',
    },
    {
      id: 'spaceEfficiencyMax',
      label: 'Space Efficiency Max +1',
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: 'Raises the max investments for space efficiency by 1.',
    },
    {
      id: 'bioworkersMax',
      label: 'Bioworkers Max +1',
      cost: 1,
      maxPurchases: MAX_BIOWORKERS_UPGRADES,
      description: 'Raises the max investments for bioworkers by 1.',
    },
  ];

  const BIOWORLD_SHOP_ITEM_MAP = BIOWORLD_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  class BioworldProject extends SpecializationBase {
    constructor(config, name) {
      super(config, name, {
        pointsKey: 'evolutionPoints',
        pointsLabel: 'Evolution Points:',
        pointsUnit: 'EP',
        shopTitle: 'Evolution Shop',
        shopTooltip: 'You gain evolution points when travelling after completing this project: 2*log10(total biomass / 1T) + 1.',
        emptyShopText: '',
        shopItems: BIOWORLD_SHOP_ITEMS,
        shopItemMap: BIOWORLD_SHOP_ITEM_MAP,
        specializationSourceId: 'bioworld',
        otherSpecializationId: 'foundryWorld',
        ecumenopolisEffectPrefix: 'bioworld',
      });
      this.biocortexIntegration = false;
    }

    getBiomassDensity() {
      const landFraction = 1 - getEcumenopolisLandFraction(terraforming);
      const landArea = terraforming.celestialParameters.surfaceArea * Math.max(0, landFraction);
      if (landArea <= 0) {
        return 0;
      }
      return resources.surface.biomass.value / landArea;
    }

    getEvolutionPointGain(totalBiomass) {
      const normalized = Math.max(totalBiomass / EVOLUTION_POINT_DIVISOR, 1);
      return (Math.log10(normalized) * 2) + 1;
    }

    getTravelPointGain() {
      return this.getEvolutionPointGain(resources.surface.biomass.value);
    }

    canStart() {
      if (!super.canStart()) {
        return false;
      }
      if (!spaceManager.isCurrentWorldTerraformed()) {
        return false;
      }
      if (this.getBiomassDensity() <= 1) {
        return false;
      }
      if (projectManager.projects.foundryWorld.isActive || projectManager.projects.foundryWorld.isCompleted) {
        return false;
      }
      return colonies.t7_colony.count < 1000;
    }

    complete() {
      super.complete();
      const ecumenopolis = colonies.t7_colony;
      if (ecumenopolis.active > 0) {
        ecumenopolis.adjustLand(-ecumenopolis.active);
      }
      ecumenopolis.count = 0;
      ecumenopolis.active = 0;
      ecumenopolis.updateResourceStorage();
      this.ecumenopolisDisabled = true;
      this.applyEcumenopolisDisable();
    }

    applySpecializationEffects() {
      const lifePointBonus = this.getShopPurchaseCount('lifePointGain') * 0.01;
      lifeDesigner.addAndReplace({
        type: 'lifeDesignPointShopMultiplier',
        value: lifePointBonus,
        effectId: 'bioworld-life-points-shop',
        sourceId: 'bioworld',
      });
      lifeDesigner.addAndReplace({
        type: 'lifeDesignPointBiodomeMultiplier',
        value: lifePointBonus,
        effectId: 'bioworld-life-points-biodome',
        sourceId: 'bioworld',
      });
      lifeDesigner.addAndReplace({
        type: 'lifeDesignAttributeMaxBonus',
        bonuses: {
          minTemperatureTolerance: this.getShopPurchaseCount('temperatureToleranceMax'),
          maxTemperatureTolerance: this.getShopPurchaseCount('temperatureToleranceMax'),
          optimalGrowthTemperature: this.getShopPurchaseCount('growthToleranceMax'),
          growthTemperatureTolerance: this.getShopPurchaseCount('growthToleranceMax'),
          invasiveness: this.getShopPurchaseCount('invasivenessMax'),
          spaceEfficiency: this.getShopPurchaseCount('spaceEfficiencyMax'),
          bioworkforce: this.getShopPurchaseCount('bioworkersMax'),
        },
        effectId: 'bioworld-attribute-max',
        sourceId: 'bioworld',
      });

      if (this.getShopPurchaseCount('lifeDesignerUnlock') > 0) {
        researchManager.completeResearchInstant('life');
      }

      if (this.ecumenopolisDisabled) {
        this.applyEcumenopolisDisable();
      }
    }

    applyEffects() {
      super.applyEffects();
      if (this.isCompleted && this.isBooleanFlagSet('biocortexIntegration')) {
        addEffect({
          target: 'global',
          type: 'globalResearchBoost',
          value: 9,
          effectId: 'bioworld-biocortex-research',
          sourceId: 'bioworld-biocortex',
        });
      }
    }

    update(deltaTime) {
      super.update(deltaTime);
      this.applyEffects();
    }

    loadState(state = {}) {
      super.loadState(state);
      this.ecumenopolisDisabled = this.isCompleted || false;
      this.loadSpecializationState(state);
      this.applySpecializationEffects();
    }
  }

  try {
    window.BioworldProject = BioworldProject;
  } catch (error) {}

  try {
    module.exports = BioworldProject;
  } catch (error) {}
})();
