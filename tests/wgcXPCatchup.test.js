const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC XP catch-up bonus', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { increase: jest.fn(), value: 0 } } };
  });

  test('lowest member gains 1.5x XP until caught up', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A'+i, '', 'Soldier', {}));
    }
    wgc.teams[0][0].xp = 10;
    wgc.teams[0][1].xp = 30;
    wgc.teams[0][2].xp = 30;
    wgc.teams[0][3].xp = 30;

    const op = wgc.operations[0];
    op.successes = 50;
    op.difficulty = 0;
    op.artifacts = 0;

    wgc.finishOperation(0);

    wgc.teams[0].forEach(m => expect(m.xp).toBe(80));
  });
});
