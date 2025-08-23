const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

function loadScript(file, ctx) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', file), 'utf8');
  vm.runInContext(code, ctx);
}

describe('space UI current world equilibrate tooltip', () => {
  test('does not show equilibrate tooltip', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="planet-selection-options"></div><div id="travel-status"></div><span id="current-world-name"></span><div id="current-world-details"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.window = dom.window;
    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAtmosphericPressure = () => 0;
    ctx.dayNightTemperaturesModel = () => ({ mean: 0, day: 0, night: 0 });
    ctx.getGameSpeed = () => 1;
    ctx.setGameSpeed = () => {};
    ctx.runEquilibration = async (override) => ({ override });
    ctx.deepMerge = (a, b) => ({ ...a, ...b });
    ctx.defaultPlanetParameters = {};
    ctx.initializeGameState = () => {};
    ctx.planetParameters = {
      mars: {
        name: 'Mars',
        celestialParameters: { distanceFromSun: 1, radius: 6000, gravity: 9.8, albedo: 0.3, rotationPeriod: 24 }
      }
    };

    loadScript('spaceUI.js', ctx);
    loadScript('rwgUI.js', ctx);

    ctx.spaceManager = {
      randomTabEnabled: false,
      getCurrentPlanetKey: () => 'mars',
      getCurrentRandomSeed: () => 'seed',
      isPlanetTerraformed: () => false,
      isPlanetEnabled: () => true,
      getCurrentWorldName: () => 'Mars',
      getCurrentWorldOriginal: () => ({
        star: { name: 'Sun', spectralType: 'G', luminositySolar: 1, massSolar: 1, temperatureK: 5800 },
        merged: {
          celestialParameters: { distanceFromSun: 1, radius: 6000, gravity: 9.8, albedo: 0.3, rotationPeriod: 24 },
          resources: {
            atmospheric: {
              carbonDioxide: { initialValue: 1 },
              inertGas: { initialValue: 1 },
              oxygen: { initialValue: 0 },
              atmosphericWater: { initialValue: 0 },
              atmosphericMethane: { initialValue: 0 }
            },
            surface: {}
          },
          classification: { archetype: 'mars-like' }
        },
        override: { resources: { atmospheric: {} } }
      })
    };

    ctx.initializeSpaceUI(ctx.spaceManager);

    const tooltip = dom.window.document.querySelector('.info-tooltip-icon[title^="The weather model"]');
    expect(tooltip).toBeNull();
  });
});
