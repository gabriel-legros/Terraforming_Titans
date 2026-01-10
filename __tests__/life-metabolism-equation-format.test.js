require('../src/js/effectable-entity.js');
const { getTerraformingRequirement } = require('../src/js/terraforming/terraforming-requirements.js');
const { formatMetabolismGrowthEquation } = require('../src/js/life.js');

describe('formatMetabolismGrowthEquation', () => {
  it('formats photosynthesis with light and O2', () => {
    const requirement = getTerraformingRequirement('human');
    const process = requirement.lifeDesign.metabolism.processes.photosynthesis;
    const equation = formatMetabolismGrowthEquation(process);

    expect(equation).toContain('CO₂');
    expect(equation).toContain('H₂O (l)');
    expect(equation).toContain('Light');
    expect(equation).toContain('O₂');
    expect(equation).toContain('→');
  });

  it('formats methanogenesis with CH4 and H2', () => {
    const requirement = getTerraformingRequirement('gabbagian');
    const process = requirement.lifeDesign.metabolism.processes.methanogenesis;
    const equation = formatMetabolismGrowthEquation(process);

    expect(equation).toContain('CO₂');
    expect(equation).toContain('H₂');
    expect(equation).toContain('CH₄');
    expect(equation).toContain('H₂O (l)');
    expect(equation).toContain('H₂O (g)');
    expect(equation).toContain('→');
  });

  it('formats ammonia photosynthesis with NH3 and H2', () => {
    const requirement = getTerraformingRequirement('ammonia');
    const process = requirement.lifeDesign.metabolism.processes.ammoniaPhotosynthesis;
    const equation = formatMetabolismGrowthEquation(process);

    expect(equation).toContain('NH₃');
    expect(equation).toContain('H₂');
    expect(equation).toContain('CO₂');
    expect(equation).toContain('Light');
  });

  it('can include coefficients', () => {
    const requirement = getTerraformingRequirement('gabbagian');
    const process = requirement.lifeDesign.metabolism.processes.methanogenesis;
    const equation = formatMetabolismGrowthEquation(process, { includeCoefficients: true });

    expect(equation).toMatch(/\d/);
  });
});
