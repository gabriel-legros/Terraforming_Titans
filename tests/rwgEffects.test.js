const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('rwgEffects titan-like nitrogen bonus', () => {
  let context;
  beforeEach(() => {
    context = { console };
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
    context.projectManager.initializeProjects({
      nitrogenSpaceMining: {
        name: 'Nitrogen harvesting',
        duration: 100,
        description: '',
        cost: {},
        category: 'resources',
        unlocked: true,
      },
    });

    context.spaceManager = {
      randomWorldStatuses: {
        a: { terraformed: true, original: { override: { classification: 'titan-like' } } },
        b: { terraformed: true, original: { override: { classification: 'titan-like' } } },
        c: { terraformed: true, original: { override: { classification: 'rocky' } } },
      },
    };
  });

  test('applies duration multiplier based on titan-like count', () => {
    const project = context.projectManager.projects.nitrogenSpaceMining;
    expect(project.getEffectiveDuration()).toBeCloseTo(100);
    context.applyRWGEffects();
    expect(project.getEffectiveDuration()).toBeCloseTo(100 / (1 + 0.1 * 2));
  });
});
