const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('advanced oversight target inputs', () => {
  test('values are not overwritten while focused', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="mirror-oversight-container">
        <div id="mirror-advanced-oversight-div"></div>
        <div id="advanced-oversight-controls">
          <input id="adv-target-tropical" />
          <select id="adv-priority-tropical"></select>
          <div id="adv-water-row"></div>
          <input id="adv-target-water" />
        </div>
      </div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectManager = { isBooleanFlagSet: () => true };
    ctx.buildings = {};
    ctx.projectElements = {};
    ctx.Project = class {};
    ctx.toDisplayTemperature = v => v;
    ctx.getTemperatureUnit = () => 'K';
    ctx.formatNumber = () => '';
    ctx.terraforming = {
      calculateZoneSolarFlux: () => 0,
      temperature: { zones: { tropical: { value: 0 }, temperate: { value: 0 }, polar: { value: 0 } } },
      celestialParameters: { crossSectionArea: 1, surfaceArea: 1 },
      calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 })
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects/SpaceMirrorFacilityProject.js'), 'utf8');
    vm.runInContext(code + '; this.updateMirrorOversightUI = updateMirrorOversightUI; this.mirrorOversightSettings = mirrorOversightSettings;', ctx);

    ctx.mirrorOversightSettings.advancedOversight = true;
    ctx.mirrorOversightSettings.targets.tropical = 300;
    ctx.updateMirrorOversightUI();

    const input = dom.window.document.getElementById('adv-target-tropical');
    expect(input.value).toBe('300.00');
    input.focus();
    input.value = '310.00';
    ctx.updateMirrorOversightUI();
    expect(input.value).toBe('310.00');
  });
});
