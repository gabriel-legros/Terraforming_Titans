const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');
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
    expect(project.cost.colony.superalloy).toBe(50);
    expect(project.cost.colony.superconductors).toBe(50);
    expect(project.duration).toBe(600000);
    expect(project.attributes.minimumRadiusEarth).toBe(1);
  });

  test('tracks radius selection, cost scaling, and persistence', () => {
    const ctx = {
      console,
      EffectableEntity,
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      projectElements: {},
      resources: {
        colony: {
          superalloy: { value: Number.POSITIVE_INFINITY, displayName: 'Superalloy' },
          superconductors: { value: Number.POSITIVE_INFINITY, displayName: 'Superconductors' }
        }
      },
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
    project.unlocked = true;
    expect(project.selectedRadiusEarth).toBe(1);

    const earthRadiusMeters = 6_371_000;
    const circumference = 2 * Math.PI * earthRadiusMeters;
    const expectedPerMaterial = circumference * 100 * 0.5;
    const baseCost = project.getScaledCost();
    expect(baseCost.colony.superalloy).toBeCloseTo(expectedPerMaterial, 5);
    expect(baseCost.colony.superconductors).toBeCloseTo(expectedPerMaterial, 5);

    project.setRadiusEarth(2);
    const largerCost = project.getScaledCost();
    expect(largerCost.colony.superalloy).toBeCloseTo(expectedPerMaterial * 2, 5);
    expect(largerCost.colony.superconductors).toBeCloseTo(expectedPerMaterial * 2, 5);

    project.isActive = true;
    project.setRadiusEarth(4);
    expect(project.selectedRadiusEarth).toBe(2);
    project.isActive = false;

    project.setRadiusEarth(5);
    expect(project.canStart()).toBe(true);
    project.complete();
    expect(project.getCompletedCount()).toBe(1);
    expect(project.repeatCount).toBe(1);
    expect(project.bestRadiusEarth).toBe(5);
    expect(project.lastCompletedRadiusEarth).toBe(5);
    expect(project.canStart()).toBe(false);

    project.adjustRadiusEarth(1);
    expect(project.selectedRadiusEarth).toBe(6);
    expect(project.canStart()).toBe(true);

    const savedState = project.saveState();
    expect(savedState.acceleratorCount).toBe(1);
    expect(savedState.bestRadiusEarth).toBe(5);
    expect(savedState.selectedRadiusEarth).toBe(6);

    const restored = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    restored.loadState(savedState);
    expect(restored.getCompletedCount()).toBe(1);
    expect(restored.repeatCount).toBe(1);
    expect(restored.bestRadiusEarth).toBe(5);
    expect(restored.selectedRadiusEarth).toBe(6);

    const travelState = project.saveTravelState();
    expect(travelState.acceleratorCount).toBe(1);
    expect(travelState.repeatCount).toBe(1);
    expect(travelState.bestRadiusEarth).toBe(5);

    const travelled = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    travelled.loadTravelState(travelState);
    expect(travelled.getCompletedCount()).toBe(1);
    expect(travelled.repeatCount).toBe(1);
    expect(travelled.bestRadiusEarth).toBe(5);
    expect(travelled.selectedRadiusEarth).toBe(6);
  });

  test('radius controls update UI and disable during construction', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const { window } = dom;
    const { document } = window;
    const ctx = {
      console,
      EffectableEntity,
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      projectElements: {},
      resources: {
        colony: {
          superalloy: { value: Number.POSITIVE_INFINITY, displayName: 'Superalloy' },
          superconductors: { value: Number.POSITIVE_INFINITY, displayName: 'Superconductors' }
        }
      },
      document,
      window,
      Intl: window.Intl,
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
    const container = document.createElement('div');
    project.renderUI(container);

    const notice = project.uiElements.notice;
    expect(notice.textContent).toBe('');

    project.setRadiusEarth(2);
    project.complete();
    expect(notice.textContent).toContain('Increase the radius');

    project.isActive = true;
    project.updateUI();
    expect(project.uiElements.buttons.every(button => button.disabled)).toBe(true);

    project.isActive = false;
    project.updateUI();
    expect(project.uiElements.buttons.every(button => button.disabled)).toBe(false);
  });
});
