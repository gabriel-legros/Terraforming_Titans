const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { generateWGCTeamCards } = require('../src/js/wgcUI.js');

describe('WGC class descriptions', () => {
  test('removed from team card', () => {
    global.warpGateCommand = {
      teamNames: ['Alpha', 'Beta', 'Gamma', 'Delta'],
      teams: [
        [WGCTeamMember.create('Bob', '', 'Soldier', {}), null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ],
      operations: Array.from({ length: 4 }, () => ({ active: false, progress: 0, summary: '' })),
      totalOperations: 0,
      stances: Array.from({ length: 4 }, () => ({ hazardousBiomass: 'Neutral', artifact: 'Neutral' }))
    };
    const html = generateWGCTeamCards();
    expect(html).toMatch(/<div class=\"team-member-class\">Soldier<\/div>/);
    expect(html).not.toMatch(/Combat expert whose Power counts double in combat challenges./);
  });
});
