(function () {
  let SpecializationBase;
  try {
    SpecializationBase = SpecializationProject;
  } catch (error) {}
  try {
    ({ SpecializationProject: SpecializationBase } = require('./SpecializationProject.js'));
  } catch (error) {}

  function getBioworldText(path, vars) {
    try {
      return t(path, vars, '');
    } catch (error) {
      return '';
    }
  }

  const EVOLUTION_POINT_DIVISOR = 1e12;
  const EVOLUTION_POINT_GAIN_MULTIPLIER = 1.5;
  const MAX_EVOLUTION_UPGRADES = 400;
  const MAX_BIOWORKERS_UPGRADES = 200;
  const MAX_LIFE_POINT_GAIN_UPGRADES = 900;
  const LEVIATHAN_ORBITAL_SOURCE_ID = 'bioworld-leviathans';

  const BIOWORLD_SHOP_ITEMS = [
    {
      id: 'lifeDesignerUnlock',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.lifeDesignerUnlock.label'),
      cost: 10,
      maxPurchases: 1,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.lifeDesignerUnlock.description'),
    },
    {
      id: 'lifePointGain',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.lifePointGain.label'),
      cost: 1,
      maxPurchases: MAX_LIFE_POINT_GAIN_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.lifePointGain.description'),
    },
    {
      id: 'temperatureToleranceMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.temperatureToleranceMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.temperatureToleranceMax.description'),
    },
    {
      id: 'growthToleranceMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.growthToleranceMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.growthToleranceMax.description'),
    },
    {
      id: 'invasivenessMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.invasivenessMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.invasivenessMax.description'),
    },
    {
      id: 'spaceEfficiencyMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.spaceEfficiencyMax.label'),
      cost: 1,
      maxPurchases: MAX_EVOLUTION_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.spaceEfficiencyMax.description'),
    },
    {
      id: 'bioworkersMax',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.bioworkersMax.label'),
      cost: 1,
      maxPurchases: MAX_BIOWORKERS_UPGRADES,
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.bioworkersMax.description'),
    },
    {
      id: 'leviathans',
      label: getBioworldText('catalogs.specializations.bioworld.shopItems.leviathans.label'),
      cost: 1,
      costScaling: 'quadratic',
      maxPurchases: Infinity,
      requiresFlag: 'leviathans',
      description: getBioworldText('catalogs.specializations.bioworld.shopItems.leviathans.description'),
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
        pointsLabel: getBioworldText('catalogs.specializations.bioworld.pointsLabel'),
        pointsUnit: 'EP',
        shopTitle: getBioworldText('catalogs.specializations.bioworld.shopTitle'),
        shopTooltip: getBioworldText('catalogs.specializations.bioworld.shopTooltip'),
        emptyShopText: '',
        shopItems: BIOWORLD_SHOP_ITEMS,
        shopItemMap: BIOWORLD_SHOP_ITEM_MAP,
        specializationSourceId: 'bioworld',
        otherSpecializationIds: [],
        ecumenopolisEffectPrefix: 'bioworld',
        hazardPointBonusPerHazard: 0.1,
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
      return ((Math.log10(normalized) * 3) + 1);
    }

    getTravelPointGain() {
      const basePoints = this.getEvolutionPointGain(resources.surface.biomass.value);
      return this.applyHazardPointBonus(basePoints);
    }

    getShopPurchaseCountText(item, purchases, maxPurchases) {
      if (item.id === 'leviathans') {
        return getBioworldText('catalogs.specializations.bioworld.shop.purchases', {
          value: formatNumber(purchases, true),
        });
      }
      return super.getShopPurchaseCountText(item, purchases, maxPurchases);
    }

    getSpecializationRequirements() {
      return [
        {
          id: 'terraformed',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.terraformed'),
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'biomassDensity',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.biomassDensity'),
          met: this.getBiomassDensity() > 1,
        },
        {
          id: 'ecumenopolisCount',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.ecumenopolisCount'),
          met: colonies.t7_colony.count < 1000,
        },
        {
          id: 'otherSpecialization',
          label: getBioworldText('catalogs.specializations.bioworld.requirements.otherSpecialization'),
          met: !hasOtherWorldSpecialization(this),
        },
      ];
    }

    getSpecializationLockedText() {
      return super.getSpecializationLockedText();
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
      return colonies.t7_colony.count < 1000;
    }

    complete() {
      super.complete();
      const ecumenopolis = colonies.t7_colony;
      if (ecumenopolis.active > 0n) {
        ecumenopolis.adjustLand(-ecumenopolis.activeNumber);
      }
      ecumenopolis.count = 0n;
      ecumenopolis.active = 0n;
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

      this.applyLeviathanOrbitalEffect();

      if (this.ecumenopolisDisabled) {
        this.applyEcumenopolisDisable();
      }
    }

    applyLeviathanOrbitalEffect() {
      const purchases = this.getShopPurchaseCount('leviathans');
      if (!this.isBooleanFlagSet('leviathans') || purchases <= 0) {
        removeEffect({ target: 'orbitalManager', sourceId: LEVIATHAN_ORBITAL_SOURCE_ID });
        return;
      }
      addEffect({
        target: 'orbitalManager',
        type: 'availableOrbitalsMultiplier',
        value: 1 + purchases * 0.05,
        effectId: 'bioworld-leviathans-orbitals',
        sourceId: LEVIATHAN_ORBITAL_SOURCE_ID,
      });
    }

    applyEffects() {
      super.applyEffects();
      if (this.isCompleted && this.isBooleanFlagSet('biocortexIntegration')) {
        addEffect({
          target: 'colony',
          targetId: 't6_colony',
          type: 'productionMultiplier',
          value: 10,
          effectId: 'bioworld-biocortex-metropolis',
          sourceId: 'bioworld-biocortex',
          name: getBioworldText('catalogs.specializations.bioworld.biocortexEffectName'),
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
