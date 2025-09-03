const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('space mirror auto checkbox load', () => {
  test('auto checkbox reflects loaded state', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.projectElements = {};
    ctx.buildings = { spaceMirror: { active: 10 }, hyperionLantern: { active: 0, unlocked: false } };
    ctx.terraforming = {
      calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }),
      calculateZoneSolarFlux: () => 0,
      celestialParameters: { crossSectionArea: 100, surfaceArea: 100 },
      temperature: { zones: { tropical: { value: 0 }, temperate: { value: 0 }, polar: { value: 0 } } }
    };
    ctx.projectManager = { isBooleanFlagSet: () => true };

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const mirrorCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMirrorFacilityProject.js'), 'utf8');
    vm.runInContext(mirrorCode + '; this.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.spaceMirrorFacility;
    const project = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    ctx.mirrorOversightSettings = project.mirrorOversightSettings;

    const state = project.saveState();
    state.mirrorOversightSettings.autoAssign.tropical = true;
    project.loadState(state);
    ctx.mirrorOversightSettings = project.mirrorOversightSettings;

    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    project.updateUI();

    const autoBox = dom.window.document.querySelector('.auto-assign[data-zone="tropical"]');
    expect(autoBox.checked).toBe(true);
  });
});
