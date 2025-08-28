const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('complete terraforming button', () => {
  test('updates space manager and refreshes UI', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div id="terraforming-container"></div><div id="planet-selection-options"></div><div id="travel-status"></div></body>`);
    const originalWindow = global.window;
    const originalDocument = global.document;
    global.window = dom.window;
    global.document = dom.window.document;
    global.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;

    global.terraforming = { completed: false, readyForCompletion: true };
    global.spaceManager = {
      updateCurrentPlanetTerraformedStatus: jest.fn(),
    };
    global.updateSpaceUI = jest.fn();

    const ctx = vm.createContext(global);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const container = document.getElementById('terraforming-container');
    ctx.createCompleteTerraformingButton(container);
    const button = document.getElementById('complete-terraforming-button');
    button.disabled = false;
    button.click();

    global.window = originalWindow;
    global.document = originalDocument;

    expect(terraforming.completed).toBe(true);
    expect(spaceManager.updateCurrentPlanetTerraformedStatus).toHaveBeenCalledWith(true);
    expect(updateSpaceUI).toHaveBeenCalled();
  });
});
