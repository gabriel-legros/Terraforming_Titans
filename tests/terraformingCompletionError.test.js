const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('complete terraforming button error text', () => {
  test('button shows error after completion and persists when planet is terraformed', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div id="terraforming-container"></div><div id="planet-selection-options"></div><div id="travel-status"></div></body>`);
    const originalWindow = global.window;
    const originalDocument = global.document;
    global.window = dom.window;
    global.document = dom.window.document;
    global.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;

    global.terraforming = { completed: false, readyForCompletion: true };
    global.spaceManager = {
      updateCurrentPlanetTerraformedStatus: jest.fn(),
      getCurrentPlanetKey: () => 'mars',
      isPlanetTerraformed: jest.fn().mockReturnValue(false)
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

    expect(button.textContent).toBe('ERROR : MTC not responding');
    expect(spaceManager.updateCurrentPlanetTerraformedStatus).toHaveBeenCalledWith(true);

    // simulate save/load where planet status shows terraformed
    spaceManager.isPlanetTerraformed.mockReturnValue(true);
    ctx.updateCompleteTerraformingButton();
    expect(button.textContent).toBe('ERROR : MTC not responding');

    global.window = originalWindow;
    global.document = originalDocument;
  });
});
