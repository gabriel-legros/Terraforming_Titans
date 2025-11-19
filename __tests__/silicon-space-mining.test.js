const ImportResourcesProjectUI = require('../src/js/projects/ImportResourcesProjectUI');
const researchParameters = require('../src/js/research-parameters.js');
const EffectableEntity = require('../src/js/effectable-entity');

global.EffectableEntity = global.EffectableEntity || EffectableEntity;

const { ResearchManager } = require('../src/js/research');

describe('Silicon space mining project', () => {
  it('is listed in the import resources UI project group', () => {
    const ui = new ImportResourcesProjectUI();
    expect(ui.projectNames).toContain('siliconSpaceMining');
    expect(ui.projectSet.has('siliconSpaceMining')).toBe(true);
  });

  it('is unlocked and upgraded alongside metal asteroid mining', () => {
    const shipyardResearch = researchParameters.industry.find((entry) => entry.id === 'shipyard');
    expect(shipyardResearch.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: 'siliconSpaceMining', type: 'enable', requiredResearchFlags: ['siliconMiningUnlocked'] }),
    ]));

    const smeltingResearch = researchParameters.advanced.find((entry) => entry.id === 'ship_smelting');
    expect(smeltingResearch.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: 'siliconSpaceMining', type: 'shipCapacityMultiplier', value: 2 }),
    ]));
  });

  it('waits for the silicon mining story flag before applying shipyard effects', () => {
    const previousAddEffect = global.addEffect;
    const previousRemoveEffect = global.removeEffect;
    const addEffectMock = jest.fn();
    global.addEffect = addEffectMock;
    global.removeEffect = global.removeEffect || (() => {});

    const manager = new ResearchManager({
      industry: [
        {
          id: 'shipyard',
          name: 'Shipbuilding',
          description: 'Test entry',
          cost: {},
          prerequisites: [],
          effects: [
            {
              target: 'project',
              targetId: 'siliconSpaceMining',
              type: 'enable',
              requiredResearchFlags: ['siliconMiningUnlocked'],
            },
          ],
        },
      ],
    });

    const shipyardResearch = manager.getResearchById('shipyard');
    manager.applyResearchEffects(shipyardResearch);

    expect(addEffectMock).not.toHaveBeenCalled();

    manager.addAndReplace({ type: 'booleanFlag', flagId: 'siliconMiningUnlocked', value: true });

    expect(addEffectMock).toHaveBeenCalledWith(expect.objectContaining({
      targetId: 'siliconSpaceMining',
      type: 'enable',
      sourceId: 'shipyard',
      effectId: 'shipyard_0',
    }));

    if (previousAddEffect === undefined) {
      delete global.addEffect;
    } else {
      global.addEffect = previousAddEffect;
    }

    if (previousRemoveEffect === undefined) {
      delete global.removeEffect;
    } else {
      global.removeEffect = previousRemoveEffect;
    }
  });
});
