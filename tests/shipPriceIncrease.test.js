const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Spaceship price increase and decay', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console };
    vm.createContext(ctx);
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
    vm.runInContext(spaceCode + '; this.SpaceManager = SpaceManager;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
  });

  test('buying multiple ships raises and decays price', () => {
    ctx.resources = {
      colony: { funding: { value: 1_000_000, decrease(amount){ this.value -= amount; } } },
      special: { spaceships: { value: 0, displayName: 'Spaceships', unlocked: true } }
    };
    ctx.spaceManager = new ctx.SpaceManager({ mars: {}, titan: {} });
    ctx.spaceManager.planetStatuses.mars.terraformed = true;
    ctx.spaceManager.planetStatuses.titan.terraformed = true;

    const project = new ctx.CargoRocketProject(ctx.projectParameters.cargo_rocket, 'test');
    const basePrice = project.attributes.resourceChoiceGainCost.special.spaceships;
    project.selectedResources = [{ category: 'special', resource: 'spaceships', quantity: 3 }];

    const initialCost = project.getResourceChoiceGainCost();
    expect(initialCost).toBeCloseTo(75_003);

    project.deductResources(ctx.resources);
    expect(ctx.resources.colony.funding.value).toBeCloseTo(924_997);
    expect(project.spaceshipPriceIncrease).toBeCloseTo(3);

    project.selectedResources = [{ category: 'special', resource: 'spaceships', quantity: 1 }];
    const costAfter = project.getResourceChoiceGainCost();
    expect(costAfter).toBeCloseTo(25_003);

    project.update(1000);
    const decayedCost = project.getResourceChoiceGainCost();
    expect(decayedCost).toBeCloseTo(25_003, 0);
  });

  test('spaceship price increase persists through save/load', () => {
    ctx.resources = {
      colony: { funding: { value: 1_000_000, decrease(amount){ this.value -= amount; } } },
      special: { spaceships: { value: 0, displayName: 'Spaceships', unlocked: true } }
    };
    ctx.spaceManager = new ctx.SpaceManager({ mars: {}, titan: {} });
    ctx.spaceManager.planetStatuses.mars.terraformed = true;
    ctx.spaceManager.planetStatuses.titan.terraformed = true;

    const project = new ctx.CargoRocketProject(ctx.projectParameters.cargo_rocket, 'test');
    project.selectedResources = [{ category: 'special', resource: 'spaceships', quantity: 2 }];
    project.deductResources(ctx.resources);
    expect(project.spaceshipPriceIncrease).toBeCloseTo(2);

    const saved = project.saveState();
    const reloaded = new ctx.CargoRocketProject(ctx.projectParameters.cargo_rocket, 'test');
    reloaded.loadState(saved);
    expect(reloaded.spaceshipPriceIncrease).toBeCloseTo(2);
  });

  test('spaceship price increase persists through travel state', () => {
    ctx.resources = {
      colony: { funding: { value: 1_000_000, decrease(amount){ this.value -= amount; } } },
      special: { spaceships: { value: 0, displayName: 'Spaceships', unlocked: true } }
    };
    ctx.spaceManager = new ctx.SpaceManager({ mars: {}, titan: {} });
    ctx.spaceManager.planetStatuses.mars.terraformed = true;
    ctx.spaceManager.planetStatuses.titan.terraformed = true;

    const project = new ctx.CargoRocketProject(ctx.projectParameters.cargo_rocket, 'test');
    project.selectedResources = [{ category: 'special', resource: 'spaceships', quantity: 4 }];
    project.deductResources(ctx.resources);
    expect(project.spaceshipPriceIncrease).toBeCloseTo(4);

    const travel = project.saveTravelState();
    const arriving = new ctx.CargoRocketProject(ctx.projectParameters.cargo_rocket, 'test');
    arriving.loadTravelState(travel);
    expect(arriving.spaceshipPriceIncrease).toBeCloseTo(4);
  });
});

