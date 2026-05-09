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
  alphaLower: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  alphaUpper: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  betaLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  betaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  gammaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],

  gammaUpper: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  deltaLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  deltaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  epsilonLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  epsilonUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],

  zetaLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  zetaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  etaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  etaUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  thetaLower: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],

  thetaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  iotaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  iotaUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  kappaLower: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  kappaUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],

  lambdaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  lambdaUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  muLower: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  muUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  nuLower: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],

  nuUpper: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  xiLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  xiUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  omicronLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  omicronUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],

  piLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  piUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  rhoLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  rhoUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  sigmaLower: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],

  sigmaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  tauLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  tauUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  upsilonLower: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  upsilonUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],

  phiLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  phiUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  chiLower: [{ target: 'lifters', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  chiUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  psiLower: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  psiUpper: [{ target: 'lifters', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  omegaLower: [
    { target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' },
    { target: 'manufacturingWorld', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }
  ],
  omegaUpper: [
    { target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' },
    { target: 'spaceChemistry', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }
  ]
};
