const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Particle Accelerator project', () => {
  test('defined in parameters with expected configuration', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const project = ctx.projectParameters.particleAccelerator;
    expect(project).toBeDefined();
    expect(project.type).toBe('ParticleAcceleratorProject');
    expect(project.category).toBe('mega');
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(Infinity);
    expect(project.cost.colony.metal).toBe(5_000_000_000);
    expect(project.cost.colony.components).toBe(2_000_000_000);
    expect(project.cost.colony.electronics).toBe(500_000_000);
    expect(project.cost.colony.superconductors).toBe(100_000_000);
    expect(project.duration).toBe(420000);
  });

  test('tracks completion count through save and travel', () => {
    const ctx = {
      console,
      EffectableEntity,
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      projectElements: {},
      resources: {},
    };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);

    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ParticleAcceleratorProject.js'), 'utf8');
    vm.runInContext(projectCode + '; this.ParticleAcceleratorProject = ParticleAcceleratorProject;', ctx);

    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.particleAccelerator;
    const project = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    expect(project.getCompletedCount()).toBe(0);

    project.complete();
    project.complete();
    expect(project.getCompletedCount()).toBe(2);
    expect(project.repeatCount).toBe(2);

    const savedState = project.saveState();
    expect(savedState.acceleratorCount).toBe(2);

    const restored = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    restored.loadState(savedState);
    expect(restored.getCompletedCount()).toBe(2);
    expect(restored.repeatCount).toBe(2);

    const travelState = project.saveTravelState();
    expect(travelState.acceleratorCount).toBe(2);
    expect(travelState.repeatCount).toBe(2);

    const travelled = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    travelled.loadTravelState(travelState);
    expect(travelled.getCompletedCount()).toBe(2);
    expect(travelled.repeatCount).toBe(2);
  });
});
