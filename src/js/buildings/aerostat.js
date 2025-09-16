class Aerostat extends Colony {
  constructor(config, colonyName) {
    super(config, colonyName);
    this.buoyancyNotes = 'Aerostats are immune to the pressure and temperature penalties.';
  }

  getBuoyancySummary() {
    return this.buoyancyNotes;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Aerostat };
} else {
  globalThis.Aerostat = Aerostat;
}
