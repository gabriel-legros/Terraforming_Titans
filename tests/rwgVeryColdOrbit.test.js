const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('RWG very cold orbit preset', () => {
  test('flux falls within 10-100 W/m^2 band', () => {
    const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.console = console;
    vm.createContext(ctx);
    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    vm.runInContext(`
      const defaultPlanetParameters = { name: 'Default', resources: { colony: {}, surface: {}, underground: {}, atmospheric: {}, special: {} }, buildingParameters: {}, populationParameters: {}, celestialParameters: {} };
      ${rwgCode}
    `, ctx);
    const star = { luminositySolar: 1 };
    const result = ctx.generateRandomPlanet(12345, { orbitPreset: 'very-cold', star });
    const SOLAR = 1361;
    const flux = (star.luminositySolar * SOLAR) / (result.orbitAU * result.orbitAU);
    expect(flux).toBeGreaterThanOrEqual(10);
    expect(flux).toBeLessThanOrEqual(100);
  });
});

