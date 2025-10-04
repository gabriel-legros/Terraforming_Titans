const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { planetParameters, planetOverrides } = require('../src/js/planet-parameters.js');
const SpaceManager = require('../src/js/space.js');

describe('story world details omit seed and type', () => {
  test('Space UI hides seed and type for story world', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="current-world-name"></div>
      <div id="current-world-details"></div>
      <div id="planet-selection-options"></div>
      <div id="travel-status"></div>
      <div class="space-subtab" data-subtab="space-random"></div>
      <div id="space-random" class="space-subtab-content"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = n => n;
    ctx.dayNightTemperaturesModel = () => ({ mean: 0, day: 0, night: 0 });
    ctx.calculateAtmosphericPressure = () => 0;
    ctx.planetParameters = planetParameters;
    ctx.planetOverrides = planetOverrides;

    const spaceUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'spaceUI.js'), 'utf8');
    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(spaceUICode, ctx);
    vm.runInContext(rwgUICode, ctx);
    ctx.SpaceManager = SpaceManager;
    vm.runInContext('initializeSpaceUI(new SpaceManager(planetParameters));', ctx);

    const labels = Array.from(dom.window.document.querySelectorAll('#current-world-details .rwg-chip .label')).map(el => el.textContent);
    expect(labels).not.toContain('Seed');
    expect(labels).not.toContain('Type');
  });
});

