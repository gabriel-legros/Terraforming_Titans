describe('SpaceManager random world key', () => {
  let SpaceManager;
  let originals = {};

  beforeEach(() => {
    originals = {
      saveGameToSlot: global.saveGameToSlot,
      projectManager: global.projectManager,
      initializeGameState: global.initializeGameState,
      updateProjectUI: global.updateProjectUI,
      updateSpaceUI: global.updateSpaceUI,
      skillManager: global.skillManager,
      EffectableEntity: global.EffectableEntity,
    };
    global.saveGameToSlot = () => {};
    global.projectManager = { projects: { spaceStorage: { saveTravelState: () => null, loadTravelState: () => {} } } };
    global.initializeGameState = () => {};
    global.updateProjectUI = () => {};
    global.updateSpaceUI = () => {};
    global.skillManager = { skillPoints: 0 };
    global.EffectableEntity = class {};
    SpaceManager = require('../src/js/space.js');
  });

  afterEach(() => {
    Object.entries(originals).forEach(([key, value]) => {
      if (value === undefined) {
        delete global[key];
      } else {
      global[key] = value;
      }
    });
    jest.resetModules();
  });

  test('current planet key tracks story and random worlds', () => {
    const sm = new SpaceManager({ mars: { name: 'Mars' }, titan: { name: 'Titan' } });
    sm.setRwgLock('mars', true);
    expect(sm.getCurrentPlanetKey()).toBe('mars');
    const result = { merged: { name: 'Randomia' } };
    const seed = 42;
    sm.travelToRandomWorld(result, seed);
    expect(sm.getCurrentPlanetKey()).toBe(String(seed));
    sm.changeCurrentPlanet('titan');
    expect(sm.getCurrentPlanetKey()).toBe('titan');
  });
});
