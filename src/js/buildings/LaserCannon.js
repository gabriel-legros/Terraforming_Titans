class LaserCannon extends Building {
  constructor(config, name) {
    super(config, name);
    // Hydra resolves hits against its own swarm inventory, not a debris resource.
    if (currentPlanetParameters.specialAttributes.laserCannonTarget === 'hydraAether') {
      this.production = {};
    }
  }
}

try {
  module.exports = { LaserCannon };
} catch (error) {
  window.LaserCannon = LaserCannon;
}
