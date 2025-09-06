const fs = require('fs');
const path = require('path');
const vm = require('vm');

function initContext(projectKey, classification) {
  const context = { console };
  vm.createContext(context);

  context.globalEffects = {};
  const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
  vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity; this.addEffect = addEffect;', context);

  const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
  vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', context);

  const rwgEffectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgEffects.js'), 'utf8');
  vm.runInContext(rwgEffectsCode + '; this.applyRWGEffects = applyRWGEffects;', context);

  context.resources = { colony: {}, special: {} };
  context.buildings = {};
  context.colonies = {};
  context.populationModule = {};
  context.tabManager = {};
  context.fundingModule = {};
  context.terraforming = {};
  context.lifeDesigner = {};
  context.lifeManager = {};
  context.oreScanner = {};
  context.researchManager = {};
  context.solisManager = {};
  context.warpGateCommand = {};
  context.nanotechManager = {};
  context.colonySliderSettings = {};

  context.projectManager = new context.ProjectManager();
  const projectDefs = {
    nitrogenSpaceMining: {
      name: 'Nitrogen harvesting',
      duration: 100,
      description: '',
      cost: {},
      category: 'resources',
      unlocked: true,
    },
    carbonSpaceMining: {
      name: 'Carbon Asteroid Mining',
      duration: 100,
      description: '',
      cost: {},
      category: 'resources',
      unlocked: true,
    },
    waterSpaceMining: {
      name: 'Ice and Water importation',
      duration: 100,
      description: '',
      cost: {},
      category: 'resources',
      unlocked: true,
    },
  };
  context.projectManager.initializeProjects({ [projectKey]: projectDefs[projectKey] });

  const archetype =
    typeof classification === 'string'
      ? classification
      : classification.archetype;

  context.spaceManager = {
    randomWorldStatuses: {
      a: { terraformed: true, original: { archetype, override: { classification: { archetype } } } },
      b: { terraformed: true, original: { archetype, override: { classification: { archetype } } } },
      c: {
        terraformed: true,
        original: { archetype: 'rocky', override: { classification: { archetype: 'rocky' } } },
      },
    },
  };

  return context;
}

describe('rwgEffects titan-like nitrogen bonus', () => {
  let context;
  beforeEach(() => {
    context = initContext('nitrogenSpaceMining', 'titan-like');
  });

  test('applies duration multiplier based on titan-like count', () => {
    const project = context.projectManager.projects.nitrogenSpaceMining;
    expect(project.getEffectiveDuration()).toBeCloseTo(100);
    context.applyRWGEffects();
    expect(project.getEffectiveDuration()).toBeCloseTo(100 / (1 + 0.1 * 2));
  });
});

describe('rwgEffects carbon-planet carbon bonus', () => {
  let context;
  beforeEach(() => {
    context = initContext('carbonSpaceMining', 'carbon-planet');
  });

  test('applies duration multiplier based on carbon-planet count', () => {
    const project = context.projectManager.projects.carbonSpaceMining;
    expect(project.getEffectiveDuration()).toBeCloseTo(100);
    context.applyRWGEffects();
    expect(project.getEffectiveDuration()).toBeCloseTo(100 / (1 + 0.1 * 2));
  });
});

describe('rwgEffects icy-moon water bonus', () => {
  let context;
  beforeEach(() => {
    context = initContext('waterSpaceMining', 'icy-moon');
  });

  test('applies duration multiplier based on icy-moon count', () => {
    const project = context.projectManager.projects.waterSpaceMining;
    expect(project.getEffectiveDuration()).toBeCloseTo(100);
    context.applyRWGEffects();
    expect(project.getEffectiveDuration()).toBeCloseTo(100 / (1 + 0.1 * 2));
  });
});

describe('rwgEffects mars-like population bonus', () => {
  let context;
  beforeEach(() => {
    context = initContext('nitrogenSpaceMining', 'mars-like');
    context.populationModule = new context.EffectableEntity({ description: 'pop' });
    context.populationModule.getEffectiveGrowthMultiplier = function () {
      let m = 1;
      this.activeEffects.forEach((e) => {
        if (e.type === 'growthMultiplier') m *= e.value;
      });
      return m;
    };
  });

  test('applies population growth bonus based on mars-like count', () => {
    expect(context.populationModule.getEffectiveGrowthMultiplier()).toBeCloseTo(1);
    context.applyRWGEffects();
    expect(context.populationModule.getEffectiveGrowthMultiplier()).toBeCloseTo(
      1 + 0.01 * 2
    );
  });
});
