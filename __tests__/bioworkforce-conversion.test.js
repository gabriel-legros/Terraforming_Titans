require('../src/js/effectable-entity.js');

const { getTerraformingRequirement } = require('../src/js/terraforming/terraforming-requirements.js');
const { LifeDesign } = require('../src/js/life.js');
const { PopulationModule } = require('../src/js/population.js');

describe('Bioworkforce conversion uses terraforming requirements', () => {
  afterEach(() => {
    delete global.terraforming;
    delete global.lifeDesigner;
    delete global.resources;
  });

  it('exposes bioworkersPerBiomassPerPoint in terraforming requirements', () => {
    const requirement = getTerraformingRequirement('human');
    expect(requirement.lifeDesign.bioworkersPerBiomassPerPoint).toBe(0.00005);
  });

  it('uses the configured bioworkersPerBiomassPerPoint for converted display', () => {
    global.formatNumber = value => String(value);

    global.terraforming = {
      requirements: {
        lifeDesign: {
          bioworkersPerBiomassPerPoint: 0.2,
        },
      },
      temperature: { zones: {} },
    };

    const design = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 3);
    expect(design.bioworkforce.getConvertedValue()).toBe('0.60000 workers per ton biomass');

    delete global.formatNumber;
  });

  it('uses the configured bioworkersPerBiomassPerPoint for worker contribution', () => {
    global.terraforming = {
      requirements: {
        lifeDesign: {
          bioworkersPerBiomassPerPoint: 0.1,
        },
      },
    };

    global.lifeDesigner = {
      currentDesign: {
        bioworkforce: { value: 2 },
      },
    };

    global.resources = {
      surface: {
        biomass: { value: 1000 },
      },
    };

    const module = new PopulationModule({ colony: { colonists: {}, workers: {} } }, { workerRatio: 1 });
    expect(module.getBioworkerContribution()).toBe(200);
  });
});
