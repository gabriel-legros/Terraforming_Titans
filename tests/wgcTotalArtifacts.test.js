const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC total artifacts', () => {
  test('finishOperation adds to totalArtifacts', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    wgc.operations[0].artifacts = 3;
    wgc.finishOperation(0);
    expect(wgc.totalArtifacts).toBe(3);
    wgc.operations[0].artifacts = 2;
    wgc.finishOperation(0);
    expect(wgc.totalArtifacts).toBe(5);
  });
});
