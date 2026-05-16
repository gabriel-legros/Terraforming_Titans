const PROMETHEAN_INVASION_FACTION_ID = 'prometheanInvasion';
const PROMETHEAN_INVASION_OPERATION_MS = 10000;
const PROMETHEAN_INVASION_CANCEL_COOLDOWN_MS = 60 * 60 * 1000;
const PROMETHEAN_INVASION_BASE_POWER = 10000000;
const PROMETHEAN_INVASION_MONOLITH_OPERATION_MS = 5 * 60 * 1000;
const PROMETHEAN_INVASION_MONOLITH_COOLDOWN_MS = 5 * 60 * 1000;
const PROMETHEAN_INVASION_RECONSTITUTION_MS = 60 * 60 * 1000;

const GALACTIC_INVASION_TRAIT_DEFINITIONS = {
  assimilationSwarm: {
    nameKey: 'ui.space.invasion.traits.assimilationSwarm.name',
    nameFallback: 'Assimilation Swarm',
    descriptionKey: 'ui.space.invasion.traits.assimilationSwarm.description',
    descriptionFallback: 'Whenever this invasion destroys defending fleet power, it adds that destroyed power to its own fleet.'
  },
  monolithArmada: {
    nameKey: 'ui.space.invasion.traits.monolithArmada.name',
    nameFallback: 'Monolith Armada',
    descriptionKey: 'ui.space.invasion.traits.monolithArmada.description',
    descriptionFallback: 'Does not split up, spends 5 minutes on a single operation, waits 5 minutes after each operation, and conquers the entire sector on victory.'
  },
  quadrantIncursion: {
    nameKey: 'ui.space.invasion.traits.quadrantIncursion.name',
    nameFallback: 'Quadrant Incursion',
    descriptionKey: 'ui.space.invasion.traits.quadrantIncursion.description',
    descriptionFallback: 'Begins with four simultaneous rim attacks from different sectors, each using one quarter of the initial fleet.'
  },
  selfReconstitutingFleet: {
    nameKey: 'ui.space.invasion.traits.selfReconstitutingFleet.name',
    nameFallback: 'Self-Reconstituting Fleet',
    descriptionKey: 'ui.space.invasion.traits.selfReconstitutingFleet.description',
    descriptionFallback: 'Regenerates destroyed fleet power over 1 hour, up to the invasion fleet power it started with.'
  },
  commandBypass: {
    nameKey: 'ui.space.invasion.traits.commandBypass.name',
    nameFallback: 'Command Bypass',
    descriptionKey: 'ui.space.invasion.traits.commandBypass.description',
    descriptionFallback: 'Ignores UHF defensive fleet assignments when attacking, but remaining UHF control still provides proportional sector base defense. UHF operations against INV also take 10 seconds.'
  },
  occupationBastions: {
    nameKey: 'ui.space.invasion.traits.occupationBastions.name',
    nameFallback: 'Occupation Bastions',
    descriptionKey: 'ui.space.invasion.traits.occupationBastions.description',
    descriptionFallback: 'Each fully conquered sector gains INV defenses equal to 10% of the invasion initial fleet power until UHF retakes it.'
  },
  fortifiedBeachhead: {
    nameKey: 'ui.space.invasion.traits.fortifiedBeachhead.name',
    nameFallback: 'Fortified Beachhead',
    descriptionKey: 'ui.space.invasion.traits.fortifiedBeachhead.description',
    descriptionFallback: 'The first fully conquered rim sector gains attritable INV defenses equal to half the initial fleet power and must be retaken or worn down before the invasion is defeated.'
  },
  shieldedCore: {
    nameKey: 'ui.space.invasion.traits.shieldedCore.name',
    nameFallback: 'Shielded Core',
    descriptionKey: 'ui.space.invasion.traits.shieldedCore.description',
    descriptionFallback: 'UHF attacks cannot damage INV fleet power unless their assigned offense is at least 5x the INV sector defense used by the operation.'
  },
  overrunProtocol: {
    nameKey: 'ui.space.invasion.traits.overrunProtocol.name',
    nameFallback: 'Overrun Protocol',
    descriptionKey: 'ui.space.invasion.traits.overrunProtocol.description',
    descriptionFallback: 'Successful INV attacks gain 50% sector control instead of 10%.'
  },
  deepStrike: {
    nameKey: 'ui.space.invasion.traits.deepStrike.name',
    nameFallback: 'Deep Strike',
    descriptionKey: 'ui.space.invasion.traits.deepStrike.description',
    descriptionFallback: 'The opening attack may target any UHF-controlled sector in the galaxy. After that, normal adjacency rules resume.'
  }
};

const GALACTIC_INVASION_TRAIT_ORDER = [
  'assimilationSwarm',
  'monolithArmada',
  'quadrantIncursion',
  'selfReconstitutingFleet',
  'commandBypass',
  'occupationBastions',
  'fortifiedBeachhead',
  'shieldedCore',
  'overrunProtocol',
  'deepStrike'
];

function generateGalacticInvasionTraitSets() {
  const sets = [];
  const rotatingTraits = GALACTIC_INVASION_TRAIT_ORDER.slice();
  for (let round = 0; round < GALACTIC_INVASION_TRAIT_ORDER.length - 1; round += 1) {
    for (let index = 0; index < GALACTIC_INVASION_TRAIT_ORDER.length / 2; index += 1) {
      sets.push([
        rotatingTraits[index],
        rotatingTraits[GALACTIC_INVASION_TRAIT_ORDER.length - 1 - index]
      ]);
    }
    const movedTrait = rotatingTraits.pop();
    rotatingTraits.splice(1, 0, movedTrait);
  }
  sets.push(['quadrantIncursion', 'deepStrike', 'commandBypass']);
  sets.push(['monolithArmada', 'occupationBastions', 'fortifiedBeachhead']);
  sets.push(['assimilationSwarm', 'selfReconstitutingFleet', 'overrunProtocol', 'shieldedCore']);
  return sets;
}

const GALACTIC_INVASION_TRAIT_SETS = generateGalacticInvasionTraitSets();

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
    fleetPower: power,
    traits: GALACTIC_INVASION_TRAIT_SETS[index] || []
  };
});

const GALACTIC_INVASION_REWARDS = {
  alphaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  alphaUpper: [{ target: 'lifters', type: 'superchargeMaxBonus', value: 10, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeMax', labelFallback: '+{value} Lifters supercharge max' }],
  betaLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  betaUpper: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  gammaLower: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  gammaUpper: [{ target: 'spaceManager', targetType: 'spaceManager', type: 'oneillSectorCapMultiplier', value: 1, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.oneillSectorCap', labelFallback: 'O\'Neill Cap Multiplier +{value}' }],
  deltaLower: [{ target: 'hephaestusMegaconstruction', type: 'yardEffectivenessMultiplier', value: 0.25, labelKey: 'ui.space.invasion.rewards.hephaestusYardEffectiveness', labelFallback: '+{value}% Hephaestus yard effectiveness' }],
  deltaUpper: [{ target: 'spaceStorage', type: 'spaceStorageCapacityMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceStorageCapacity', labelFallback: '+{value}% Space storage capacity' }],
  epsilonLower: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  epsilonUpper: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  zetaLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  zetaUpper: [{ target: 'lifters', type: 'superchargeExponentReduction', value: 0.2, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeExponent', labelFallback: 'Lifters supercharge exponent -{value}' }],
  etaLower: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  etaUpper: [{ target: 'spaceStorage', type: 'spaceStorageCapacityMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceStorageCapacity', labelFallback: '+{value}% Space storage capacity' }],
  thetaLower: [{ target: 'hephaestusMegaconstruction', type: 'yardEffectivenessMultiplier', value: 0.25, labelKey: 'ui.space.invasion.rewards.hephaestusYardEffectiveness', labelFallback: '+{value}% Hephaestus yard effectiveness' }],
  thetaUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  iotaLower: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 0.3, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
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
  phiLower: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 0.5, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  phiUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 0.2, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }],
  chiLower: [{ target: 'lifters', type: 'superchargeMaxBonus', value: 10, valueFormat: 'number', labelKey: 'ui.space.invasion.rewards.liftersSuperchargeMax', labelFallback: '+{value} Lifters supercharge max' }],
  chiUpper: [{ target: 'superalloyGigafoundry', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.gigafoundryThroughput', labelFallback: '+{value}% Gigafoundry throughput' }],
  psiLower: [{ target: 'spaceChemistry', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.spaceChemistryThroughput', labelFallback: '+{value}% Space Chemistry throughput' }],
  psiUpper: [{ target: 'manufacturingWorld', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.manufacturingWorldThroughput', labelFallback: '+{value}% Manufacturing World throughput' }],
  omegaLower: [{ target: 'lifters', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.liftersThroughput', labelFallback: '+{value}% Lifters throughput' }],
  omegaUpper: [{ target: 'nuclearAlchemyFurnace', type: 'throughputMultiplier', value: 1, labelKey: 'ui.space.invasion.rewards.nuclearAlchemyThroughput', labelFallback: '+{value}% Nuclear Alchemy throughput' }]
};
