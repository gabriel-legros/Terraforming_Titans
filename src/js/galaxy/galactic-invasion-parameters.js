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
  const power = PROMETHEAN_INVASION_BASE_POWER * mantissas[index % 3] * Math.pow(10, Math.floor(index / 3));
  return {
    ...entry,
    index,
    fleetPower: power
  };
});

const GALACTIC_INVASION_REWARDS = {
  alphaLower: [
    {
      target: 'nuclearAlchemyFurnace',
      type: 'nuclearAlchemyThroughputMultiplier',
      value: 0.1,
      labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput',
      labelFallback: '+{value}% Nuclear Alchemy throughput'
    }
  ]
};
