const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');
const { multiplyByTen, divideByTen } = require('../src/js/buildCount.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceMirrorFacility quick build buttons', () => {
  test('mirror quick build reflects affordability and builds', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.multiplyByTen = multiplyByTen;
    ctx.divideByTen = divideByTen;
    ctx.resources = { colony: { metal: { value: 0, decrease(v){ this.value -= v; }, updateStorageCap(){} } } };
    ctx.buildings = {
      spaceMirror: {
        displayName: 'Space Mirror',
        active: 0,
        canAfford(count){ return ctx.resources.colony.metal.value >= 10 * count; },
        buildStructure(count){ ctx.resources.colony.metal.value -= 10 * count; this.active += count; }
      },
      hyperionLantern: {
        displayName: 'Hyperion Lantern',
        active: 0,
        powerPerBuilding: 0,
        productivity: 1,
        unlocked: false,
        canAfford(){ return true; },
        buildStructure(){}
      }
    };
    ctx.terraforming = {
      calculateMirrorEffect: () => ({ interceptedPower: 1, powerPerUnitArea: 0.1 }),
      calculateZoneSolarFlux: () => 0,
      celestialParameters: { crossSectionArea: 1, surfaceArea: 1 },
      temperature: { zones: { tropical: { value: 0 }, temperate: { value: 0 }, polar: { value: 0 } } }
    };

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const mirrorCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects/SpaceMirrorFacilityProject.js'), 'utf8');
    vm.runInContext(mirrorCode + '; this.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.spaceMirrorFacility;
    const project = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();
    const qbContainer = ctx.projectElements.spaceMirrorFacility.quickBuild.mirror.container;
    expect(qbContainer.style.display).toBe('none');

    project.isCompleted = true;
    project.updateUI();
    const mirrorBtn = ctx.projectElements.spaceMirrorFacility.quickBuild.mirror.button;
    expect(qbContainer.style.display).toBe('grid');
    expect(mirrorBtn.classList.contains('cant-afford')).toBe(true);

    ctx.resources.colony.metal.value = 1000;
    project.updateUI();
    expect(mirrorBtn.classList.contains('cant-afford')).toBe(false);

    mirrorBtn.dispatchEvent(new dom.window.Event('click'));
    expect(ctx.resources.colony.metal.value).toBe(990);
  });

  test('lantern quick build visibility follows unlock', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.multiplyByTen = multiplyByTen;
    ctx.divideByTen = divideByTen;
    ctx.resources = { colony: { metal: { value: 1000, decrease(){}, updateStorageCap(){} } } };
    ctx.buildings = {
      spaceMirror: { displayName: 'Space Mirror', active: 0, canAfford(){ return true; }, buildStructure(){} },
      hyperionLantern: {
        displayName: 'Hyperion Lantern',
        active: 0,
        powerPerBuilding: 0,
        productivity: 1,
        unlocked: false,
        canAfford(){ return true; },
        buildStructure(){}
      }
    };
    ctx.terraforming = {
      calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }),
      calculateZoneSolarFlux: () => 0,
      celestialParameters: { crossSectionArea: 1, surfaceArea: 1 },
      temperature: { zones: { tropical: { value: 0 }, temperate: { value: 0 }, polar: { value: 0 } } }
    };

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const mirrorCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects/SpaceMirrorFacilityProject.js'), 'utf8');
    vm.runInContext(mirrorCode + '; this.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.spaceMirrorFacility;
    const project = new ctx.SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();
    const qbContainer = ctx.projectElements.spaceMirrorFacility.quickBuild.lantern.container;
    expect(qbContainer.style.display).toBe('none');

    project.isCompleted = true;
    project.updateUI();
    expect(qbContainer.style.display).toBe('none');

    ctx.buildings.hyperionLantern.unlocked = true;
    project.updateUI();
    expect(qbContainer.style.display).toBe('grid');
  });
});
