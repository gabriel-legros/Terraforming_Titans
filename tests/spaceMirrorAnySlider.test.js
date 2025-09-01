const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('space mirror any zone slider', () => {
  test('increasing any zone pulls from largest sliders first', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.projectElements = {};
    ctx.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { active: 0, unlocked: false } };
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
    vm.runInContext(mirrorCode + '; this.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject; this.setMirrorDistribution = setMirrorDistribution;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.spaceMirrorFacility;
    const project = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    project.updateUI();

    ctx.setMirrorDistribution('tropical', 60);
    ctx.setMirrorDistribution('temperate', 25);
    ctx.setMirrorDistribution('polar', 10);
    ctx.setMirrorDistribution('any', 70);

    const getVal = z => Number(dom.window.document.getElementById(`mirror-oversight-${z}`).value);
    expect(getVal('any')).toBe(70);
    expect(getVal('tropical')).toBe(0);
    expect(getVal('temperate')).toBe(20);
    expect(getVal('polar')).toBe(10);
    expect(getVal('unassigned')).toBe(0);
    const total = ['tropical', 'temperate', 'polar', 'focus', 'any', 'unassigned'].reduce((s, z) => s + getVal(z), 0);
    expect(total).toBe(100);
  });
});
