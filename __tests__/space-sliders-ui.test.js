const {
  getCylindersHopeManufacturingPopulationBonus
} = require('../src/js/advanced-research/space-sliders.js');
const {
  setSpaceSliderElements,
  updateSpaceSlidersUI
} = require('../src/js/advanced-research/space-slidersUI.js');

describe('space slider UI', () => {
  const originalGlobals = {};

  function setGlobal(name, value) {
    if (!(name in originalGlobals)) {
      originalGlobals[name] = global[name];
    }
    global[name] = value;
  }

  beforeEach(() => {
    setGlobal('CYLINDERS_HOPE_MANUFACTURING_POP_PER_CYLINDER', 1e13);
    setGlobal('galaxyManager', {});
    setGlobal('getAnySpaceSliderEnabled', () => true);
    setGlobal('isCylindersHopeUnlocked', () => true);
    setGlobal('isCylindersHopeMiningRightsUnlocked', () => false);
    setGlobal('isMegaprojectsCoordinationUnlocked', () => false);
    setGlobal('getCylindersHopeTick', space => space.getSpaceSliderTick('cylindersHope'));
    setGlobal('getCylindersHopeEnergyPerCylinderPerSecond', () => 1e24);
    setGlobal('getCylindersHopeTotalDesiredEnergyPerSecond', () => 1.25e29);
    setGlobal('getCylindersHopeWarpGateWorldBonusPerSector', () => 0);
    setGlobal('getCylindersHopeMiningRightsManufacturingMultiplier', () => 1);
    setGlobal('getCylindersHopeManufacturingPopulationBonus', getCylindersHopeManufacturingPopulationBonus);
    setGlobal('formatNumber', value => String(value));
  });

  afterEach(() => {
    Object.assign(global, originalGlobals);
  });

  it('displays the capacity-limited manufacturing population bonus', () => {
    const rendered = {};
    const energyValue = { textContent: '' };
    setGlobal('t', (key, vars, fallback) => {
      if (key === 'ui.space.spaceSliders.cylindersHope.combinedLine') {
        Object.assign(rendered, vars);
      }
      return fallback;
    });
    setSpaceSliderElements({ energyValue });

    const space = {
      isBooleanFlagSet(flagId) {
        return flagId === 'cylindersHopeCollaborationAgreement';
      },
      getSpaceSliderTick(sliderId) {
        return sliderId === 'cylindersHope' ? 10 : 0;
      },
      getSpaceSliderRuntimeProductivity() {
        return 0.4;
      },
      getOneillCylinderCount() {
        return 425000;
      },
      getOneillCylinderEffectiveWorldCount() {
        return 125000;
      }
    };

    updateSpaceSlidersUI({ space });

    expect(Number(rendered.manufacturingTotal)).toBe(5e17);
  });
});
