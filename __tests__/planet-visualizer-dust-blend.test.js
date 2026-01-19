describe('Planet visualizer dust blend threshold', () => {
  let PlanetVisualizer;

  beforeEach(() => {
    jest.resetModules();
    global.window = global;
    global.currentPlanetParameters = {
      visualization: { baseColor: '#000000' },
      celestialParameters: { surfaceArea: 100 }
    };
    global.terraforming = {
      celestialParameters: { surfaceArea: 100 }
    };
    global.resources = {
      special: { albedoUpgrades: { value: 0 } }
    };
    global.dustFactorySettings = { dustColor: '#ffffff' };
    require('../src/js/planet-visualizer/core.js');
    PlanetVisualizer = global.window.PlanetVisualizer;
    PlanetVisualizer.prototype.applySlidersToGame = function applySlidersToGame() {};
    PlanetVisualizer.prototype.syncSlidersFromGame = function syncSlidersFromGame() {};
    PlanetVisualizer.prototype.updateSliderValueLabels = function updateSliderValueLabels() {};
    PlanetVisualizer.prototype.refreshGameModeSliderDisplays = function refreshGameModeSliderDisplays() {};
  });

  afterEach(() => {
    global.window = null;
    global.currentPlanetParameters = null;
    global.terraforming = null;
    global.resources = null;
    global.dustFactorySettings = null;
  });

  test('does not update base color below threshold', () => {
    const viz = new PlanetVisualizer();
    const initial = viz.getGameBaseColor();
    resources.special.albedoUpgrades.value = 0.4;
    const next = viz.getGameBaseColor();

    expect(initial).toBe('#000000');
    expect(next).toBe(initial);
  });

  test('updates base color at threshold', () => {
    const viz = new PlanetVisualizer();
    viz.getGameBaseColor();
    resources.special.albedoUpgrades.value = 1;
    const next = viz.getGameBaseColor();

    expect(next).toBe(viz.mixHexColors('#000000', '#ffffff', 0.01));
  });
});
