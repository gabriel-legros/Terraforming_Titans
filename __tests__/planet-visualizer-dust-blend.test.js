describe('Planet visualizer dust tint', () => {
  let PlanetVisualizer;
  let setRGB;

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
    setRGB = jest.fn();
  });

  afterEach(() => {
    global.window = null;
    global.currentPlanetParameters = null;
    global.terraforming = null;
    global.resources = null;
    global.dustFactorySettings = null;
  });

  test('tints toward the dust color based on coverage', () => {
    const viz = new PlanetVisualizer();
    viz.sphere = { material: { color: { setRGB } } };
    currentPlanetParameters.visualization.baseColor = '#202020';
    resources.special.albedoUpgrades.value = 50;
    dustFactorySettings.dustColor = '#ffffff';

    viz.updateDustTint();

    expect(setRGB).toHaveBeenCalledTimes(1);
    expect(setRGB.mock.calls[0][0]).toBeCloseTo(4.5, 3);
    expect(setRGB.mock.calls[0][1]).toBeCloseTo(4.5, 3);
    expect(setRGB.mock.calls[0][2]).toBeCloseTo(4.5, 3);
  });
});
