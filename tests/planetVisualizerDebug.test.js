describe('PlanetVisualizer slider presets', () => {
  const { JSDOM } = require('jsdom');
  let planetParameters;

  const loadVisualizer = () => {
    jest.resetModules();

    const dom = new JSDOM('<!doctype html><html><body><div id="planet-visualizer"></div><div id="planet-visualizer-overlay"></div></body></html>', {
      pretendToBeVisual: true,
    });
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.Event = dom.window.Event;
    global.CustomEvent = dom.window.CustomEvent;
    global.navigator = dom.window.navigator;
    global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

    ({ planetParameters } = require('../src/js/planet-parameters.js'));
    global.planetParameters = planetParameters;
    global.currentPlanetParameters = planetParameters.mars;

    require('../src/js/planet-visualizer/core.js');
    require('../src/js/planet-visualizer/debug.js');

    const viz = new window.PlanetVisualizer();
    viz.elements.container = document.getElementById('planet-visualizer');
    viz.elements.overlay = document.getElementById('planet-visualizer-overlay');
    viz.buildDebugControls();
    viz.updateSurfaceTextureFromPressure = jest.fn();
    viz.updateCloudUniforms = jest.fn();
    return viz;
  };

  it('lists planets and applies preset defaults in slider debug mode', () => {
    const viz = loadVisualizer();
    const presetSelect = viz.debug.presetSelect;
    expect(presetSelect).toBeTruthy();

    const expectedOptions = Object.keys(planetParameters).length + 1; // includes placeholder
    expect(presetSelect.options.length).toBe(expectedOptions);
    expect(presetSelect.disabled).toBe(true);

    viz.debug.modeSelect.value = 'debug';
    viz.debug.modeSelect.dispatchEvent(new window.Event('change'));
    expect(presetSelect.disabled).toBe(false);

    presetSelect.value = 'titan';
    presetSelect.dispatchEvent(new window.Event('change'));

    expect(viz.viz.illum).toBeCloseTo(planetParameters.titan.celestialParameters.starLuminosity, 5);
    expect(viz.debug.rows.pop.range.value).toBe('0');
    expect(viz.debug.rows.baseColor.text.value).toBe('#8A6A38');
    expect(Number(viz.debug.rows.ch4.range.value)).toBeGreaterThan(0);
  });
});
