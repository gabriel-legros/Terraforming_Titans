const skillParams = require('../skills-parameters.js');

describe('new skill parameter definitions', () => {
  test('project_speed skill exists with correct config', () => {
    const skill = skillParams.project_speed;
    expect(skill).toBeDefined();
    expect(skill.maxRank).toBe(5);
    expect(skill.requires).toContain('maintenance_reduction');
  });

  test('life_design_points skill exists with correct config', () => {
    const skill = skillParams.life_design_points;
    expect(skill).toBeDefined();
    expect(skill.maxRank).toBe(5);
    expect(skill.requires).toContain('scanning_speed');
  });

  test('pop_growth requires research_boost after swap', () => {
    const skill = skillParams.pop_growth;
    expect(skill.requires).toContain('research_boost');
  });

  test('scanning_speed requires maintenance_reduction after swap', () => {
    const skill = skillParams.scanning_speed;
    expect(skill.requires).toContain('maintenance_reduction');
  });
});
