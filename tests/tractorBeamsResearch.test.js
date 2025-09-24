const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const researchParameters = require('../src/js/research-parameters.js');

describe('Tractor Beams advanced research', () => {
  test('defines research with tractor beam flag on planetary thrusters', () => {
    const research = researchParameters.advanced.find(r => r.id === 'tractor_beams');
    expect(research).toBeDefined();
    expect(research.cost).toEqual({ advancedResearch: 10000000 });
    const flag = research.effects.find(e => e.target === 'project' && e.targetId === 'planetaryThruster' && e.type === 'booleanFlag' && e.flagId === 'tractorBeams' && e.value === true);
    expect(flag).toBeDefined();
  });

  test('sets thrust to power ratio to one and reduces energy cost', () => {
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    const thrusterCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');

    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const celestial = { mass: 6e24, radius: 6000, rotationPeriod: 24, distanceFromSun: 1, starMass: 1.989e30 };
    ctx.currentPlanetParameters = { celestialParameters: celestial, star: { massSolar: 1 } };
    ctx.terraforming = { celestialParameters: celestial };
    ctx.resources = { colony: { energy: { value: 0, decrease() {}, updateStorageCap() {} } } };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
    global.terraforming = ctx.terraforming;
    global.resources = ctx.resources;
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(thrusterCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const project = new ctx.PlanetaryThrustersProject(ctx.projectParameters.planetaryThruster, 'thruster');
    project.renderUI(dom.window.document.getElementById('container'));
    project.updateUI();

    const defaultTP = project.el.tpVal.textContent;
    const defaultVE = project.el.veVal.textContent;
    const defaultEnergy = ctx.translationalEnergyRemaining({ mass: 1 }, 10, project.getThrustPowerRatio());

    project.addEffect({ type: 'booleanFlag', flagId: 'tractorBeams', value: true });
    project.updateUI();
    const tractorTP = project.el.tpVal.textContent;
    const tractorVE = project.el.veVal.textContent;
    const tractorEnergy = ctx.translationalEnergyRemaining({ mass: 1 }, 10, project.getThrustPowerRatio());

    const expectedTP = (1).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }) + '\u202FN/W';
    expect(tractorTP).toBe(expectedTP);
    expect(defaultTP).not.toBe(expectedTP);
    expect(defaultVE).not.toBe('N/A');
    expect(tractorVE).toBe('N/A');
    expect(tractorEnergy).toBeCloseTo(10);
    expect(tractorEnergy).toBeLessThan(defaultEnergy);
  });
  afterEach(() => {
    delete global.resources;
    delete global.currentPlanetParameters;
    delete global.terraforming;
  });
});
