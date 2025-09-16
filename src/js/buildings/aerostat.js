class Aerostat extends Colony {
  constructor(config, colonyName) {
    super(config, colonyName);
    this.buoyancyNotes = 'Envelope lift systems nominal.';
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
