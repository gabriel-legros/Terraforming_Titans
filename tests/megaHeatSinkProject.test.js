const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const EffectableEntity = require('../src/js/effectable-entity.js');
const { formatNumber: formatNumberHelper } = require('../src/js/numbers.js');

const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');

describe('Mega Heat Sink project', () => {
  test('parameter uses the MegaHeatSinkProject type', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const project = ctx.projectParameters.megaHeatSink;
    expect(project).toBeDefined();
    expect(project.type).toBe('MegaHeatSinkProject');
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(Infinity);
  });

  test('calculates cooling per second with repeat count fallback', () => {
    const ctx = {
      console,
      EffectableEntity,
      addEffect: () => {},
      removeEffect: () => {},
      globalGameIsLoadingFromSave: false,
      projectElements: {},
      resources: {},
      projectManager: { projects: {} },
      formatNumber: formatNumberHelper,
      getZonePercentage: () => 1 / 3,
      calculateZonalSurfaceFractions: () => ({})
    };
    ctx.globalThis = ctx;

    vm.createContext(ctx);
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber;', ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);

    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'MegaHeatSinkProject.js'), 'utf8');
    vm.runInContext(projectCode + '; this.MegaHeatSinkProject = MegaHeatSinkProject;', ctx);

    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.megaHeatSink;
    const project = new ctx.MegaHeatSinkProject(config, 'megaHeatSink');

    ctx.autoSlabHeatCapacity = jest.fn(() => 2000);
    ctx.calculateAtmosphericPressure = jest.fn(() => 0);
    ctx.calculateEffectiveAtmosphericHeatCapacity = jest.fn(() => 0);

    ctx.terraforming = {
      celestialParameters: {
        surfaceArea: 2,
        gravity: 9.81,
        radius: 1000,
        rotationPeriod: 24
      },
      resources: { atmospheric: {} },
      zonalWater: {
        tropical: { liquid: 0 },
        temperate: { liquid: 0 },
        polar: { liquid: 0 }
      },
      calculateAtmosphericComposition: () => ({ totalMass: 0 })
    };

    project.repeatCount = 3;
    const cooling = project.calculateCoolingPerSecond();
    expect(cooling).toBeCloseTo(6.48e16, 2);

    project.repeatCount = 0;
    const fallbackCooling = project.calculateCoolingPerSecond();
    expect(fallbackCooling).toBeCloseTo(2.16e16, 2);
  });

  test('renders summary card with formatted values', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const { window } = dom;
    const { document } = window;

    const ctx = {
      console,
      EffectableEntity,
      addEffect: () => {},
      removeEffect: () => {},
      globalGameIsLoadingFromSave: false,
      projectElements: {},
      resources: {},
      projectManager: { projects: {} },
      formatNumber: (value) => String(value),
      document,
      window,
      Intl: window.Intl,
      getZonePercentage: () => 1 / 3,
      calculateZonalSurfaceFractions: () => ({})
    };
    ctx.globalThis = ctx;

    vm.createContext(ctx);
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber;', ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);

    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'MegaHeatSinkProject.js'), 'utf8');
    vm.runInContext(projectCode + '; this.MegaHeatSinkProject = MegaHeatSinkProject;', ctx);

    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.autoSlabHeatCapacity = () => 1000;
    ctx.calculateAtmosphericPressure = () => 0;
    ctx.calculateEffectiveAtmosphericHeatCapacity = () => 0;

    ctx.terraforming = {
      celestialParameters: {
        surfaceArea: 1,
        gravity: 9.81,
        radius: 1000,
        rotationPeriod: 24
      },
      resources: { atmospheric: {} },
      zonalWater: {
        tropical: { liquid: 0 },
        temperate: { liquid: 0 },
        polar: { liquid: 0 }
      },
      calculateAtmosphericComposition: () => ({ totalMass: 0 })
    };

    const config = ctx.projectParameters.megaHeatSink;
    const project = new ctx.MegaHeatSinkProject(config, 'megaHeatSink');
    project.repeatCount = 0;

    const container = document.createElement('div');
    project.renderUI(container);

    const { countValue, coolingValue } = project.uiElements;
    expect(countValue.textContent).toBe('0');
    expect(coolingValue.textContent.endsWith('K/s') || coolingValue.textContent === '—').toBe(true);
  });
});
