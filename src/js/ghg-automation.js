function enforceGhgFactoryTempGap(changed){
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

globalThis.enforceGhgFactoryTempGap = enforceGhgFactoryTempGap;
