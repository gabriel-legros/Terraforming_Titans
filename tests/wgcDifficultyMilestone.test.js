const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC difficulty milestone rewards', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { value: 0, increase: jest.fn() } } };
  });

  test('artifacts granted for new highest difficulty', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }

    wgc.operations[0].difficulty = 0;
    wgc.finishOperation(0);
    expect(wgc.highestDifficulty).toBe(0);
    expect(global.resources.special.alienArtifact.increase).toHaveBeenLastCalledWith(1);

    wgc.operations[0].difficulty = 4;
    wgc.finishOperation(0);
    expect(wgc.highestDifficulty).toBe(4);
    expect(global.resources.special.alienArtifact.increase).toHaveBeenLastCalledWith(10);
    expect(wgc.totalArtifacts).toBe(11);
    const hasLog = wgc.logs[0].some(l => l.includes('Highest difficulty 4'));
    expect(hasLog).toBe(true);
  });
});
