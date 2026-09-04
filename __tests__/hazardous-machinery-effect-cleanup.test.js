const { HazardManager } = require('../src/js/terraforming/hazard.js');

describe('Hazardous Machinery effect cleanup', () => {
  afterEach(() => {
    delete global.researchManager;
  });

  test('removes persistent research penalties when leaving the world', () => {
    global.researchManager = { removeEffect: jest.fn() };
    const manager = new HazardManager();

    manager.hazardousMachineryHazard.clearEffectsOnTravel();

    expect(global.researchManager.removeEffect).toHaveBeenCalledWith({
      sourceId: 'hazardPenalties'
    });
  });

  test('removes persistent research penalties when machinery is cleared', () => {
    global.researchManager = { removeEffect: jest.fn() };
    const manager = new HazardManager();

    manager.clearHazardPenaltyEffects();

    expect(global.researchManager.removeEffect).toHaveBeenCalledWith({
      sourceId: 'hazardPenalties'
    });
  });
});
