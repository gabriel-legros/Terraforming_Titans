const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const EffectableEntity = require('../src/js/effectable-entity.js');
const { formatNumber: formatNumberHelper } = require('../src/js/numbers.js');

const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
const EARTH_RADIUS_METERS = 6_371_000;

describe('Particle Accelerator project', () => {
  test('defined in parameters with expected configuration', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const project = ctx.projectParameters.particleAccelerator;
    expect(project).toBeDefined();
    expect(project.type).toBe('ParticleAcceleratorProject');
    expect(project.category).toBe('mega');
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(Infinity);
    expect(project.cost.colony.superalloys).toBe(50);
    expect(project.cost.colony.superconductors).toBe(50);
    expect(project.duration).toBe(600000);
    expect(project.attributes.minimumRadiusMeters).toBe(1);
    expect(project.attributes.defaultRadiusMeters).toBe(EARTH_RADIUS_METERS);
    expect(project.attributes.defaultStepMeters).toBe(1);
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
          superalloys: { value: Number.POSITIVE_INFINITY, displayName: 'Superalloys' },
          superconductors: { value: Number.POSITIVE_INFINITY, displayName: 'Superconductors' }
        }
      },
      projectManager: { projects: {} },
    };
    vm.createContext(ctx);
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber;', ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);

    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ParticleAcceleratorProject.js'), 'utf8');
    vm.runInContext(projectCode + '; this.ParticleAcceleratorProject = ParticleAcceleratorProject;', ctx);

    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.particleAccelerator;
    const project = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    project.unlocked = true;
    expect(project.selectedRadiusMeters).toBe(EARTH_RADIUS_METERS);
    expect(project.radiusStepMeters).toBe(1);

    const initialBoostNew = project.calculateResearchBoost(EARTH_RADIUS_METERS);
    expect(initialBoostNew).toBeCloseTo(5 * Math.log10(EARTH_RADIUS_METERS), 6);

    const circumference = 2 * Math.PI * EARTH_RADIUS_METERS;
    const expectedPerMaterial = circumference * 100 * 0.5;
    const baseCost = project.getScaledCost();
    expect(baseCost.colony.superalloys).toBeCloseTo(expectedPerMaterial, 5);
    expect(baseCost.colony.superconductors).toBeCloseTo(expectedPerMaterial, 5);

    const minTest = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    minTest.unlocked = true;
    minTest.scaleStepMeters(10);
    minTest.setRadiusMeters(minTest.minimumRadiusMeters);
    minTest.adjustRadiusBySteps(1);
    expect(minTest.selectedRadiusMeters).toBe(10);

    project.setRadiusMeters(EARTH_RADIUS_METERS * 2);
    const largerCost = project.getScaledCost();
    expect(largerCost.colony.superalloys).toBeCloseTo(expectedPerMaterial * 2, 5);
    expect(largerCost.colony.superconductors).toBeCloseTo(expectedPerMaterial * 2, 5);

    project.isActive = true;
    project.setRadiusMeters(EARTH_RADIUS_METERS * 4);
    expect(project.selectedRadiusMeters).toBe(EARTH_RADIUS_METERS * 2);
    project.isActive = false;

    project.setRadiusMeters(EARTH_RADIUS_METERS * 5);
    expect(project.canStart()).toBe(true);
    project.complete();
    expect(project.getCompletedCount()).toBe(1);
    expect(project.repeatCount).toBe(1);
    expect(project.bestRadiusMeters).toBe(EARTH_RADIUS_METERS * 5);
    expect(project.canStart()).toBe(false);

    project.adjustRadiusBySteps(1);
    expect(project.selectedRadiusMeters).toBe(EARTH_RADIUS_METERS * 5 + 1);
    expect(project.canStart()).toBe(true);

    project.scaleStepMeters(10);
    expect(project.radiusStepMeters).toBe(10);
    project.adjustRadiusBySteps(2);
    const expectedRadiusAfterStep = EARTH_RADIUS_METERS * 5 + 1 + 20;
    expect(project.selectedRadiusMeters).toBeCloseTo(expectedRadiusAfterStep, 6);
    expect(project.canStart()).toBe(true);

    const savedState = project.saveState();
    expect(savedState.acceleratorCount).toBe(1);
    expect(savedState.bestRadiusMeters).toBe(EARTH_RADIUS_METERS * 5);
    expect(savedState.selectedRadiusMeters).toBeCloseTo(expectedRadiusAfterStep, 6);
    expect(savedState.radiusStepMeters).toBe(10);

    const restored = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    restored.loadState(savedState);
    expect(restored.getCompletedCount()).toBe(1);
    expect(restored.repeatCount).toBe(1);
    expect(restored.bestRadiusMeters).toBe(EARTH_RADIUS_METERS * 5);
    expect(restored.selectedRadiusMeters).toBeCloseTo(expectedRadiusAfterStep, 6);
    expect(restored.radiusStepMeters).toBe(10);
    expect(restored.calculateResearchBoost(EARTH_RADIUS_METERS * 5)).toBeCloseTo(5 * Math.log10(EARTH_RADIUS_METERS * 5), 6);

    const travelState = project.saveTravelState();
    expect(travelState.acceleratorCount).toBe(1);
    expect(travelState.repeatCount).toBe(1);
    expect(travelState.bestRadiusMeters).toBe(EARTH_RADIUS_METERS * 5);
    expect(travelState.selectedRadiusMeters).toBeCloseTo(expectedRadiusAfterStep, 6);
    expect(travelState.radiusStepMeters).toBe(10);

    const travelled = new ctx.ParticleAcceleratorProject(config, 'particleAccelerator');
    travelled.loadTravelState(travelState);
    expect(travelled.getCompletedCount()).toBe(1);
    expect(travelled.repeatCount).toBe(1);
    expect(travelled.bestRadiusMeters).toBe(EARTH_RADIUS_METERS * 5);
    expect(travelled.selectedRadiusMeters).toBeCloseTo(expectedRadiusAfterStep, 6);
    expect(travelled.radiusStepMeters).toBe(10);

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
          superalloys: { value: Number.POSITIVE_INFINITY, displayName: 'Superalloys' },
          superconductors: { value: Number.POSITIVE_INFINITY, displayName: 'Superconductors' }
        }
      },
      projectManager: { projects: {} },
      document,
      window,
      Intl: window.Intl,
    };
    vm.createContext(ctx);
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber;', ctx);

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

    const { notice, minusButton, plusButton, researchBoostValue } = project.uiElements;
    expect(notice.textContent).toBe('');
    const initialStep = formatNumberHelper(1, true);
    expect(minusButton.textContent).toBe(`-${initialStep}`);
    expect(plusButton.textContent).toBe(`+${initialStep}`);
    const initialResearchBoost = `${formatNumberHelper(5 * Math.log10(EARTH_RADIUS_METERS), false, 2)}% / -`;
    expect(researchBoostValue.textContent).toBe(initialResearchBoost);

    project.setRadiusEarth(2);
    project.complete();
    expect(notice.textContent).toContain('Increase the radius');

    project.scaleStepEarth(10);
    project.updateUI();
    const increasedStep = formatNumberHelper(10, true);
    expect(minusButton.textContent).toBe(`-${increasedStep}`);
    expect(plusButton.textContent).toBe(`+${increasedStep}`);

    project.scaleStepEarth(1 / 10);
    project.updateUI();
    const reducedStep = formatNumberHelper(1, true);
    expect(minusButton.textContent).toBe(`-${reducedStep}`);
    expect(plusButton.textContent).toBe(`+${reducedStep}`);

    const expectedNewBoost = `${formatNumberHelper(5 * Math.log10(project.getSelectedRadiusMeters()), false, 2)}%`;
    const expectedCurrentBoost = `${formatNumberHelper(5 * Math.log10(project.bestRadiusMeters), false, 2)}%`;
    expect(project.uiElements.researchBoostValue.textContent).toBe(`${expectedNewBoost} / ${expectedCurrentBoost}`);

    project.isActive = true;
    project.updateUI();
    expect(project.uiElements.buttons.every(button => button.disabled)).toBe(true);

    project.isActive = false;
    project.updateUI();
    expect(project.uiElements.buttons.every(button => button.disabled)).toBe(false);
  });
});
