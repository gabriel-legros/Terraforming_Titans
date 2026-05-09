const PROMETHEAN_INVASION_FACTION_ID = 'prometheanInvasion';
const PROMETHEAN_INVASION_OPERATION_MS = 10000;
const PROMETHEAN_INVASION_CANCEL_COOLDOWN_MS = 60 * 60 * 1000;
const PROMETHEAN_INVASION_BASE_POWER = 10000000;

const GALACTIC_INVASION_LETTERS = [
  { key: 'alphaLower', label: 'α', name: 'alpha' },
  { key: 'alphaUpper', label: 'Α', name: 'Alpha' },
  { key: 'betaLower', label: 'β', name: 'beta' },
  { key: 'betaUpper', label: 'Β', name: 'Beta' },
  { key: 'gammaLower', label: 'γ', name: 'gamma' },
  { key: 'gammaUpper', label: 'Γ', name: 'Gamma' },
  { key: 'deltaLower', label: 'δ', name: 'delta' },
  { key: 'deltaUpper', label: 'Δ', name: 'Delta' },
  { key: 'epsilonLower', label: 'ε', name: 'epsilon' },
  { key: 'epsilonUpper', label: 'Ε', name: 'Epsilon' },
  { key: 'zetaLower', label: 'ζ', name: 'zeta' },
  { key: 'zetaUpper', label: 'Ζ', name: 'Zeta' },
  { key: 'etaLower', label: 'η', name: 'eta' },
  { key: 'etaUpper', label: 'Η', name: 'Eta' },
  { key: 'thetaLower', label: 'θ', name: 'theta' },
  { key: 'thetaUpper', label: 'Θ', name: 'Theta' },
  { key: 'iotaLower', label: 'ι', name: 'iota' },
  { key: 'iotaUpper', label: 'Ι', name: 'Iota' },
  { key: 'kappaLower', label: 'κ', name: 'kappa' },
  { key: 'kappaUpper', label: 'Κ', name: 'Kappa' },
  { key: 'lambdaLower', label: 'λ', name: 'lambda' },
  { key: 'lambdaUpper', label: 'Λ', name: 'Lambda' },
  { key: 'muLower', label: 'μ', name: 'mu' },
  { key: 'muUpper', label: 'Μ', name: 'Mu' },
  { key: 'nuLower', label: 'ν', name: 'nu' },
  { key: 'nuUpper', label: 'Ν', name: 'Nu' },
  { key: 'xiLower', label: 'ξ', name: 'xi' },
  { key: 'xiUpper', label: 'Ξ', name: 'Xi' },
  { key: 'omicronLower', label: 'ο', name: 'omicron' },
  { key: 'omicronUpper', label: 'Ο', name: 'Omicron' },
  { key: 'piLower', label: 'π', name: 'pi' },
  { key: 'piUpper', label: 'Π', name: 'Pi' },
  { key: 'rhoLower', label: 'ρ', name: 'rho' },
  { key: 'rhoUpper', label: 'Ρ', name: 'Rho' },
  { key: 'sigmaLower', label: 'σ', name: 'sigma' },
  { key: 'sigmaUpper', label: 'Σ', name: 'Sigma' },
  { key: 'tauLower', label: 'τ', name: 'tau' },
  { key: 'tauUpper', label: 'Τ', name: 'Tau' },
  { key: 'upsilonLower', label: 'υ', name: 'upsilon' },
  { key: 'upsilonUpper', label: 'Υ', name: 'Upsilon' },
  { key: 'phiLower', label: 'φ', name: 'phi' },
  { key: 'phiUpper', label: 'Φ', name: 'Phi' },
  { key: 'chiLower', label: 'χ', name: 'chi' },
  { key: 'chiUpper', label: 'Χ', name: 'Chi' },
  { key: 'psiLower', label: 'ψ', name: 'psi' },
  { key: 'psiUpper', label: 'Ψ', name: 'Psi' },
  { key: 'omegaLower', label: 'ω', name: 'omega' },
  { key: 'omegaUpper', label: 'Ω', name: 'Omega' }
].map((entry, index) => {
  const mantissas = [1, 2, 5];
  let power = PROMETHEAN_INVASION_BASE_POWER * mantissas[index % 3] * Math.pow(10, Math.floor(index / 3));
  if (entry.key === 'omegaLower') {
    power = 1e23;
  } else if (entry.key === 'omegaUpper') {
    power = 1e24;
  }
  return {
    ...entry,
    index,
    fleetPower: power
  };
});

const GALACTIC_INVASION_REWARDS = {
  alphaLower: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.4, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  alphaUpper: [{ target: 'lifters', type: 'superchargeMaxBonus', value: 10, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeMax', labelFallback: '+{value} Lifters supercharge max' }],
  betaLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  betaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  gammaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  gammaUpper: [{ target: 'spaceManager', targetType: 'spaceManager', type: 'oneillSectorCapMultiplier', value: 1, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.oneillSectorCap', labelFallback: 'O\'Neill Cap Multiplier +{value}' }],
  deltaLower: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  deltaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  epsilonLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  epsilonUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  zetaLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  zetaUpper: [{ target: 'lifters', type: 'superchargeExponentReduction', value: 0.2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeExponent', labelFallback: 'Lifters supercharge exponent -{value}' }],
  etaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  etaUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  thetaLower: [{ target: 'hephaestusMegaconstruction', type: 'yardEffectivenessMultiplier', value: 0.25, labelKey: 'ui.space.invasion.rewards.hephaestusYardEffectiveness', labelFallback: '+{value}% Hephaestus yard effectiveness' }],
  thetaUpper: [{ target: 'spaceStorage', type: 'spaceStorageCapacityMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceStorageCapacity', labelFallback: '+{value}% Space storage capacity' }],
  iotaLower: [{ target: 'spaceStorage', type: 'spaceStorageCapacityMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceStorageCapacity', labelFallback: '+{value}% Space storage capacity' }],
  iotaUpper: [{ target: 'spaceManager', targetType: 'spaceManager', type: 'oneillSectorCapMultiplier', value: 2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.oneillSectorCap', labelFallback: 'O\'Neill Cap Multiplier +{value}' }],
  kappaLower: [{ target: 'lifters', type: 'superchargeExponentReduction', value: 0.2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeExponent', labelFallback: 'Lifters supercharge exponent -{value}' }],
  kappaUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  lambdaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  lambdaUpper: [{ target: 'spaceStorage', type: 'spaceStorageCapacityMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceStorageCapacity', labelFallback: '+{value}% Space storage capacity' }],
  muLower: [{ target: 'spaceManager', targetType: 'spaceManager', type: 'oneillSectorCapMultiplier', value: 2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.oneillSectorCap', labelFallback: 'O\'Neill Cap Multiplier +{value}' }],
  muUpper: [{ target: 'hephaestusMegaconstruction', type: 'yardEffectivenessMultiplier', value: 0.25, labelKey: 'ui.space.invasion.rewards.hephaestusYardEffectiveness', labelFallback: '+{value}% Hephaestus yard effectiveness' }],
  nuLower: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  nuUpper: [{ target: 'lifters', type: 'superchargeExponentReduction', value: 0.2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeExponent', labelFallback: 'Lifters supercharge exponent -{value}' }],
  xiLower: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  xiUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  omicronLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  omicronUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  piLower: [{ target: 'spaceStorage', type: 'spaceStorageCapacityMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceStorageCapacity', labelFallback: '+{value}% Space storage capacity' }],
  piUpper: [{ target: 'spaceManager', targetType: 'spaceManager', type: 'oneillSectorCapMultiplier', value: 2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.oneillSectorCap', labelFallback: 'O\'Neill Cap Multiplier +{value}' }],
  rhoLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  rhoUpper: [{ target: 'lifters', type: 'superchargeExponentReduction', value: 0.2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeExponent', labelFallback: 'Lifters supercharge exponent -{value}' }],
  sigmaLower: [{ target: 'hephaestusMegaconstruction', type: 'yardEffectivenessMultiplier', value: 0.25, labelKey: 'ui.space.invasion.rewards.hephaestusYardEffectiveness', labelFallback: '+{value}% Hephaestus yard effectiveness' }],
  sigmaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  tauLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  tauUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.6, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  upsilonLower: [{ target: 'spaceManager', targetType: 'spaceManager', type: 'oneillSectorCapMultiplier', value: 2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.oneillSectorCap', labelFallback: 'O\'Neill Cap Multiplier +{value}' }],
  upsilonUpper: [{ target: 'lifters', type: 'superchargeExponentReduction', value: 0.2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeExponent', labelFallback: 'Lifters supercharge exponent -{value}' }],
  phiLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  phiUpper: [{ target: 'hephaestusMegaconstruction', type: 'yardEffectivenessMultiplier', value: 0.25, labelKey: 'ui.space.invasion.rewards.hephaestusYardEffectiveness', labelFallback: '+{value}% Hephaestus yard effectiveness' }],
  chiLower: [{ target: 'lifters', type: 'superchargeMaxBonus', value: 10, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeMax', labelFallback: '+{value} Lifters supercharge max' }],
  chiUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  psiLower: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  psiUpper: [{ target: 'lifters', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  omegaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.9999999999999998, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  omegaUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }]
};
