const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceDisposalProject temperature control', () => {
  test('input value respects Celsius setting', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectElements = {};
    const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
    vm.runInContext(numbersCode + '; this.toDisplayTemperature = toDisplayTemperature; this.getTemperatureUnit = getTemperatureUnit;', ctx);
    ctx.EffectableEntity = EffectableEntity;
    ctx.gameSettings = { useCelsius: true };

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const disposalSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalSubclass + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);

    const config = { name:'Dispose', category:'resources', cost:{}, duration:1, description:'', repeatable:true, maxRepeatCount:Infinity, unlocked:true, attributes:{ spaceExport:true, disposalAmount:1 } };
    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    const control = project.createTemperatureControl();
    const input = control.querySelector('.temperature-input');
    expect(parseFloat(input.value)).toBeCloseTo(30);
  });
});
