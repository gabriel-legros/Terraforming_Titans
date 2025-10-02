const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

function setupContext() {
  const dom = new JSDOM(`<!DOCTYPE html><body><div id="container"></div></body>`, { runScripts: 'outside-only' });
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
  ctx.formatBuildingCount = () => '';
  ctx.terraforming = {
    calculateZoneSolarFlux: () => 0,
    temperature: { zones: { tropical: { value: 0 }, temperate: { value: 0 }, polar: { value: 0 } } },
    celestialParameters: { crossSectionArea: 1, surfaceArea: 1 },
    calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 })
  };

  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects/SpaceMirrorFacilityProject.js'), 'utf8');
  vm.runInContext(code + '; this.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject; this.updateMirrorOversightUI = updateMirrorOversightUI; this.initializeMirrorOversightUI = initializeMirrorOversightUI;', ctx);

  const project = new ctx.SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
  ctx.mirrorOversightSettings = project.mirrorOversightSettings;
  const container = dom.window.document.getElementById('container');
  ctx.initializeMirrorOversightUI(container);
  return { dom, ctx };
}

describe('advanced oversight target inputs', () => {
  test('values are not overwritten while focused', () => {
    const { dom, ctx } = setupContext();

    ctx.mirrorOversightSettings.advancedOversight = true;
    ctx.mirrorOversightSettings.targets.tropical = 300;
    ctx.updateMirrorOversightUI();

    const input = dom.window.document.getElementById('adv-target-tropical');
    expect(input.value).toBe('300.00');
    input.focus();
    input.value = '310.00';
    ctx.updateMirrorOversightUI();
    expect(input.value).toBe('310.00');

    const timing = dom.window.document.getElementById('adv-timing-tropical');
    expect(timing.value).toBe('average');
    timing.focus();
    timing.value = 'night';
    ctx.updateMirrorOversightUI();
    expect(timing.value).toBe('night');
  });

  test('input events update targets immediately', () => {
    const { dom, ctx } = setupContext();

    ctx.mirrorOversightSettings.advancedOversight = true;
    ctx.mirrorOversightSettings.targets.tropical = 300;
    ctx.mirrorOversightSettings.targets.water = 1000;
    ctx.mirrorOversightSettings.waterMultiplier = 1000;
    ctx.updateMirrorOversightUI();

    const tempInput = dom.window.document.getElementById('adv-target-tropical');
    tempInput.value = '305.5';
    tempInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(ctx.mirrorOversightSettings.targets.tropical).toBeCloseTo(305.5);

    const waterInput = dom.window.document.getElementById('adv-target-water');
    waterInput.value = '2';
    waterInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(ctx.mirrorOversightSettings.targets.water).toBe(2000);
  });
});
