const path = require('path');

const EffectableEntity = require(path.join('..', 'src/js/effectable-entity.js'));
const { Project } = require(path.join('..', 'src/js/projects.js'));

global.EffectableEntity = EffectableEntity;
global.Project = Project;

require(path.join('..', 'src/js/projects/GalacticMarketProject.js'));
const CargoRocketProject = require(path.join('..', 'src/js/projects/CargoRocketProject.js'));

describe('Kessler trade caps', () => {
  beforeEach(() => {
    global.hazardManager = {
      getKesslerTradeLimitPerSecond: () => 100,
      getKesslerCargoLimit: () => 6000
    };
    global.spaceManager = {
      getTerraformedPlanetCountExcludingCurrent: () => 1
    };
    global.projectElements = {};
    global.formatNumber = (value) => String(value);
    global.parseFlexibleNumber = (value) => Number(value);
  });

  test('galactic market caps combined buy + sell totals', () => {
    const config = {
      name: 'Galactic Market',
      duration: 0,
      attributes: {
        resourceChoiceGainCost: {
          colony: {
            metal: 2,
            food: 1
          }
        }
      }
    };

    const GalacticMarketProject = global.GalacticMarketProject;
    const project = new GalacticMarketProject(config, 'galactic_market');
    project.isActive = true;
    project.autoStart = true;
    project.buySelections = [{ category: 'colony', resource: 'metal', quantity: 80 }];
    project.sellSelections = [{ category: 'colony', resource: 'food', quantity: 40 }];

    const totals = project.estimateCostAndGain(1000, false, 1);

    expect(totals.gain.colony.metal).toBeCloseTo(66.6667, 4);
    expect(totals.cost.colony.food).toBeCloseTo(33.3333, 4);
  });

  test('galactic market clamps over-limit selections in the UI', () => {
    const config = {
      name: 'Galactic Market',
      duration: 0,
      attributes: {
        resourceChoiceGainCost: {
          colony: {
            metal: 2,
            food: 1
          }
        }
      }
    };

    const GalacticMarketProject = global.GalacticMarketProject;
    const project = new GalacticMarketProject(config, 'galactic_market');
    const buyMetal = { value: '80', dataset: { quantity: '80' } };
    const sellMetal = { value: '0', dataset: { quantity: '0' } };
    const buyFood = { value: '0', dataset: { quantity: '0' } };
    const sellFood = { value: '40', dataset: { quantity: '40' } };
    const setInputQuantity = (input, quantity) => {
      const normalized = Math.max(0, Math.floor(quantity));
      input.dataset.quantity = String(normalized);
      input.value = String(normalized);
      return normalized;
    };
    const getInputQuantity = (input) => Number(input.dataset.quantity) || 0;

    projectElements[project.name] = {
      buyInputs: [buyMetal, buyFood],
      sellInputs: [sellMetal, sellFood],
      rowMeta: [
        { category: 'colony', resource: 'metal' },
        { category: 'colony', resource: 'food' }
      ],
      sellPriceSpans: [{ textContent: '' }, { textContent: '' }],
      buyPriceSpans: [],
      selectionInputs: [],
      priceSpans: [],
      getInputQuantity,
      setInputQuantity,
      kesslerWarning: { style: { display: '' } }
    };

    project.updateSelectedResources();

    expect(project.kesslerCapped).toBe(true);
    expect(buyMetal.value).toBe('66');
    expect(sellFood.value).toBe('33');
    expect(projectElements[project.name].kesslerWarning.style.display).toBe('flex');
  });

  test('cargo rockets cap total payload by duration', () => {
    const config = {
      name: 'Cargo Rocket',
      duration: 60000,
      attributes: {
        resourceChoiceGainCost: {
          colony: {
            metal: 2,
            water: 1
          }
        }
      }
    };

    const project = new CargoRocketProject(config, 'cargo_rocket');
    project.selectedResources = [
      { category: 'colony', resource: 'metal', quantity: 4000 },
      { category: 'colony', resource: 'water', quantity: 4000 }
    ];

    project.getResourceChoiceGainCost(true);

    const pending = project.pendingResourceGains;
    const total = pending.reduce((sum, entry) => sum + entry.quantity, 0);
    expect(total).toBeCloseTo(6000, 4);
    expect(pending[0].quantity).toBeCloseTo(3000, 4);
    expect(pending[1].quantity).toBeCloseTo(3000, 4);
  });

  test('cargo rockets clamp over-limit selections in the UI', () => {
    const config = {
      name: 'Cargo Rocket',
      duration: 60000,
      attributes: {
        resourceChoiceGainCost: {
          colony: {
            metal: 2,
            water: 1
          }
        }
      }
    };

    const project = new CargoRocketProject(config, 'cargo_rocket');
    const inputMetal = { value: '4000', dataset: { category: 'colony', resource: 'metal' } };
    const inputWater = { value: '4000', dataset: { category: 'colony', resource: 'water' } };

    projectElements[project.name] = {
      selectionInputs: [inputMetal, inputWater],
      kesslerWarning: { style: { display: '' } }
    };

    project.clampKesslerCargoInputs();

    expect(project.kesslerCapped).toBe(true);
    expect(inputMetal.value).toBe('3000');
    expect(inputWater.value).toBe('3000');
    expect(projectElements[project.name].kesslerWarning.style.display).toBe('flex');
  });
});
