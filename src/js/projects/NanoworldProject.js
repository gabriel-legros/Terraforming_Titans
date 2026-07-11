function getNanoworldText(path, vars, fallback = '') {
  return t(`catalogs.specializations.nanoworld.${path}`, vars, fallback);
}

const NANOWORLD_BASE_DENSITY_MULTIPLIER = 10;
const NANOWORLD_MAX_SHOP_PURCHASES = 900;
const NANOWORLD_POINT_LOG_DIVISOR = 4;
const NANOWORLD_GROUND_COLONY_IDS = [
  't1_colony',
  't2_colony',
  't3_colony',
  't4_colony',
  't5_colony',
  't6_colony',
  't7_colony'
];

const NANOWORLD_SHOP_ITEMS = [
  {
    id: 'density',
    label: getNanoworldText('shopItems.density.label'),
    cost: 1,
    maxPurchases: NANOWORLD_MAX_SHOP_PURCHASES,
    description: getNanoworldText('shopItems.density.description'),
  },
  ...[1, 2, 3, 4].map((stage) => ({
    id: `stage${stage}`,
    label: getNanoworldText(`shopItems.stage${stage}.label`),
    cost: 1,
    maxPurchases: NANOWORLD_MAX_SHOP_PURCHASES,
    description: getNanoworldText(`shopItems.stage${stage}.description`),
  }))
];

const NANOWORLD_SHOP_ITEM_MAP = NANOWORLD_SHOP_ITEMS.reduce((items, item) => {
  items[item.id] = item;
  return items;
}, {});

class NanoworldProject extends SpecializationProject {
  constructor(config, name) {
    super(config, name, {
      pointsKey: 'nanoworldPoints',
      pointsLabel: getNanoworldText('pointsLabel'),
      pointsUnit: 'NP',
      shopTitle: getNanoworldText('shopTitle'),
      shopTooltip: getNanoworldText('shopTooltip'),
      emptyShopText: '',
      shopItems: NANOWORLD_SHOP_ITEMS,
      shopItemMap: NANOWORLD_SHOP_ITEM_MAP,
      specializationSourceId: 'nanoworld',
      otherSpecializationIds: [],
      ecumenopolisEffectPrefix: 'nanoworld',
      hazardPointBonusPerHazard: 0.1,
    });
  }

  isNanobotCapReached() {
    const maxNanobots = nanotechManager.getMaxNanobots();
    return maxNanobots > 1 && nanotechManager.nanobots >= maxNanobots;
  }

  getTravelPointGain() {
    const points = Math.max(1, Math.log10(Math.max(1, nanotechManager.nanobots)) / NANOWORLD_POINT_LOG_DIVISOR);
    return this.applyHazardPointBonus(points);
  }

  getSpecializationRequirements() {
    return [
      {
        id: 'terraformed',
        label: getNanoworldText('requirements.terraformed'),
        met: spaceManager.isCurrentWorldTerraformed(),
      },
      {
        id: 'nanobotCap',
        label: getNanoworldText('requirements.nanobotCap'),
        met: this.isNanobotCapReached(),
      },
      {
        id: 'otherSpecialization',
        label: getNanoworldText('requirements.otherSpecialization'),
        met: !hasOtherWorldSpecialization(this),
      },
    ];
  }

  canStart() {
    return super.canStart() && spaceManager.isCurrentWorldTerraformed() && this.isNanobotCapReached();
  }

  complete() {
    super.complete();
    this.applySpecializationEffects();
  }

  consumeAllBiomass() {
    terraforming.biomassDisabled = true;
    resources.surface.biomass.value = 0;
    terraforming.zoneKeys.forEach((zone) => {
      terraforming.zonalSurface[zone].biomass = 0;
    });
  }

  applyGroundColonyDisable() {
    researchManager.addAndReplace({
      type: 'booleanFlag',
      flagId: 'groundColoniesDisabled',
      value: true,
      effectId: 'nanoworld-ground-colonies-disabled',
      sourceId: 'nanoworld',
    });

    NANOWORLD_GROUND_COLONY_IDS.forEach((id) => {
      const colony = colonies[id];
      if (!colony.unlocked && colony.count === 0n && colony.active === 0n) return;
      if (colony.requiresLand && colony.active > 0n) {
        colony.adjustLand(-colony.activeNumber);
      }
      colony.count = 0n;
      colony.active = 0n;
      colony.unlocked = false;
      colony.updateResourceStorage();
    });
  }

  applySpecializationEffects() {
    const densityMultiplier = 1 + this.getShopPurchaseCount('density') * 0.01;
    nanotechManager.addAndReplace({
      type: 'nanobotDensityMultiplier',
      value: densityMultiplier,
      effectId: 'nanoworld-density-shop',
      sourceId: 'nanoworld',
      name: getNanoworldText('effectName'),
    });

    for (let stage = 1; stage <= 4; stage += 1) {
      nanotechManager.addAndReplace({
        type: 'nanoworldStageMultiplier',
        stage,
        value: 1 + this.getShopPurchaseCount(`stage${stage}`) * 0.01,
        effectId: `nanoworld-stage-${stage}-shop`,
        sourceId: 'nanoworld',
        name: getNanoworldText('effectName'),
      });
    }

    if (this.isCompleted) {
      this.consumeAllBiomass();
      nanotechManager.addAndReplace({
        type: 'nanobotDensityMultiplier',
        value: NANOWORLD_BASE_DENSITY_MULTIPLIER,
        effectId: 'nanoworld-completed-density',
        sourceId: 'nanoworld',
        name: getNanoworldText('effectName'),
      });
      this.applyGroundColonyDisable();
    }
  }

  prepareTravelState() {
    super.prepareTravelState();
    nanotechManager.removeEffect({ sourceId: 'nanoworld' });
  }

  loadState(state = {}) {
    super.loadState(state);
    this.loadSpecializationState(state);
    this.applySpecializationEffects();
  }
}

window.NanoworldProject = NanoworldProject;
