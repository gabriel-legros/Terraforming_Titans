const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceMiningProject pressure unit control', () => {
  test('defaults to kPa and converts when switched', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectElements = {};
    ctx.EffectableEntity = EffectableEntity;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);

    const config = {
      name: 'Mine',
      category: 'resources',
      cost: {},
      duration: 1,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { spaceMining: true }
    };
    const project = new ctx.SpaceMiningProject(config, 'mine');
    project.disablePressureThreshold = 2;
    const control = project.createPressureControl();
    const select = control.querySelector('.pressure-unit');
    const input = control.querySelector('.pressure-input');
    expect(select.value).toBe('kPa');
    select.value = 'Pa';
    select.dispatchEvent(new dom.window.Event('change'));
    expect(input.value).toBe('2000');
    input.value = '4000';
    input.dispatchEvent(new dom.window.Event('input'));
    expect(project.disablePressureThreshold).toBeCloseTo(4);
  });
});
