const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceMirrorFacilityProject', () => {
  test('renders and updates mirror details', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.buildings = { spaceMirror: { active: 5 }, hyperionLantern: { active: 2, powerPerBuilding: 100, productivity: 0.5, unlocked: false } };
    ctx.terraforming = {
      calculateMirrorEffect: () => ({ interceptedPower: 10, powerPerUnitArea: 0.5 }),
      calculateZoneSolarFlux: zone => ({ tropical: 100, temperate: 50, polar: 25 })[zone],
      celestialParameters: { crossSectionArea: 100, surfaceArea: 100 }
    };

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const mirrorCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMirrorFacilityProject.js'), 'utf8');
    vm.runInContext(mirrorCode + '; this.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.spaceMirrorFacility;
    expect(config.type).toBe('SpaceMirrorFacilityProject');

    const project = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();

    const details = ctx.projectElements.spaceMirrorFacility.mirrorDetails;
    expect(details.numMirrors.textContent).toBe('5.00');
    expect(details.totalPower.textContent).toBe('50.00');

    const oversight = dom.window.document.getElementById('mirror-oversight-container');
    const lanternRow = dom.window.document.getElementById('mirror-oversight-lantern-div');
    expect(oversight).not.toBeNull();
    expect(oversight.style.display).toBe('none');

    ctx.projectManager = { isBooleanFlagSet: () => true };
    project.updateUI();
    expect(oversight.style.display).toBe('block');
    expect(lanternRow.style.display).toBe('none');

    ctx.buildings.hyperionLantern.unlocked = true;
    project.updateUI();
    expect(lanternRow.style.display).toBe('flex');

    const fluxCell = dom.window.document.getElementById('mirror-flux-tropical');
    expect(fluxCell.textContent).toBe('100.00');
  });

  test('shows lantern details when unlocked', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { active: 2, powerPerBuilding: 100, productivity: 0.5, unlocked: false } };
    ctx.terraforming = {
      calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }),
      calculateZoneSolarFlux: () => 0,
      celestialParameters: { crossSectionArea: 100, surfaceArea: 100 }
    };

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
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();
    const lanternCard = ctx.projectElements.spaceMirrorFacility.lanternDetails.container;
    expect(lanternCard.style.display).toBe('none');

    ctx.buildings.hyperionLantern.unlocked = true;
    project.updateUI();
    expect(lanternCard.style.display).toBe('block');
    expect(ctx.projectElements.spaceMirrorFacility.lanternDetails.numLanterns.textContent).toBe('2.00');
    expect(ctx.projectElements.spaceMirrorFacility.lanternDetails.totalPower.textContent).toBe('100.00');
  });
});
