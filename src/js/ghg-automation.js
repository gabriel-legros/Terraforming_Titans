const ghgFactorySettings = {
  autoDisableAboveTemp: false,
  disableTempThreshold: 283.15, // Kelvin
  reverseTempThreshold: 283.15,
};

const oxygenFactorySettings = {
  autoDisableAbovePressure: false,
  disablePressureThreshold: 15, // kPa
};

function enforceGhgFactoryTempGap(changed) {
  const minGap = 1;
  const A = ghgFactorySettings.disableTempThreshold;
  let B = ghgFactorySettings.reverseTempThreshold;
  if (B === undefined || isNaN(B)) {
    B = A + minGap;
  }
  if (B - A < minGap) {
    if (changed === 'B') {
      ghgFactorySettings.disableTempThreshold = B - minGap;
    } else {
      B = A + minGap;
    }
  }
  ghgFactorySettings.reverseTempThreshold = B;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ghgFactorySettings,
    oxygenFactorySettings,
    enforceGhgFactoryTempGap,
  };
} else {
  globalThis.ghgFactorySettings = ghgFactorySettings;
  globalThis.oxygenFactorySettings = oxygenFactorySettings;
  globalThis.enforceGhgFactoryTempGap = enforceGhgFactoryTempGap;
}
