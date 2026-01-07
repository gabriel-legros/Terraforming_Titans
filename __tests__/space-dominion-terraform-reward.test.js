describe('SpaceManager dominion terraforming rewards', () => {
  beforeEach(() => {
    jest.resetModules();
    const EffectableEntity = require('../src/js/effectable-entity');
    global.EffectableEntity = EffectableEntity;
    const { planetParameters } = require('../src/js/planet-parameters.js');
    global.planetParameters = planetParameters;
    global.resources = {
      special: {
        alienArtifact: {
          value: 0,
          increase(amount) {
            this.value += amount;
          }
        }
      }
    };
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.planetParameters;
    delete global.resources;
    jest.resetModules();
  });

  const createManager = () => {
    const SpaceManager = require('../src/js/space.js');
    return new SpaceManager({ mars: {}, titan: {} });
  };

  it('awards scaling artifacts once per dominion while skipping human and gabbagian', () => {
    const manager = createManager();

    expect(manager.grantDominionTerraformReward('ammonia')).toBe(500);
    expect(global.resources.special.alienArtifact.value).toBe(500);
    expect(manager.grantDominionTerraformReward('ammonia')).toBe(0);
    expect(global.resources.special.alienArtifact.value).toBe(500);
    expect(manager.grantDominionTerraformReward('custom')).toBe(1000);
    expect(global.resources.special.alienArtifact.value).toBe(1500);
    expect(manager.grantDominionTerraformReward('human')).toBe(0);
    expect(manager.grantDominionTerraformReward('gabbagian')).toBe(0);
    expect(global.resources.special.alienArtifact.value).toBe(1500);
  });
});
