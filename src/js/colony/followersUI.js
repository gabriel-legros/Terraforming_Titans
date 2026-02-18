const followersUICache = {
  host: null,
  initialized: false,
  root: null,
  summary: null,
  kesslerWarning: null,
  modeToggle: null,
  stepValue: null,
  divideStepButton: null,
  multiplyStepButton: null,
  artPopulation: null,
  artBasePower: null,
  artArtifactMultiplier: null,
  artFundingMultiplier: null,
  artTotalPower: null,
  artHappinessBonus: null,
  artWorkerMultiplier: null,
  artArtifactAvailable: null,
  artFundingAvailable: null,
  artArtifactStepValue: null,
  artFundingStepValue: null,
  artArtifactInput: null,
  artFundingInput: null,
  artArtifactInvestButton: null,
  artFundingInvestButton: null,
  artArtifactInvestStepButton: null,
  artFundingInvestStepButton: null,
  artArtifactMaxButton: null,
  artFundingMaxButton: null,
  faithWorldProgressValue: null,
  faithWorldProgressFill: null,
  faithWorldBaseCapMarker: null,
  faithWorldHolyCapMarker: null,
  faithWorldBelievers: null,
  faithGalacticProgressValue: null,
  faithGalacticProgressFill: null,
  faithGalacticBelievers: null,
  faithWorldCap: null,
  faithWorldRate: null,
  faithGalacticRate: null,
  faithGalacticAbsoluteRate: null,
  faithPilgrimBonus: null,
  faithZealBonus: null,
  faithApostlesBonus: null,
  faithMissionariesBonus: null,
  holyWorldStatus: null,
  holyWorldRequirements: {},
  holyWorldCostRows: {},
  holyWorldConsecrateButton: null,
  holyWorldConsecratePoints: null,
  holyWorldShopRows: {},
  holyWorldRespecButton: null,
  rowsById: {},
};

function cacheFollowersUIElements() {
  if (!followersUICache.host || !followersUICache.host.isConnected) {
    followersUICache.host = document.getElementById('followers-colonies-content');
  }
}

function createFollowersCard(titleText, cardClass, tooltipText) {
  const card = document.createElement('div');
  card.classList.add('project-card', 'followers-card');
  if (cardClass) {
    card.classList.add(cardClass);
  }

  const header = document.createElement('div');
  header.classList.add('card-header', 'followers-card-header');

  const title = document.createElement('span');
  title.classList.add('card-title', 'followers-card-title');
  title.textContent = titleText;

  header.appendChild(title);
  if (tooltipText) {
    const icon = document.createElement('span');
    icon.classList.add('info-tooltip-icon');
    icon.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(icon, tooltipText);
    header.appendChild(icon);
  }
  card.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('card-body', 'followers-card-body');
  card.appendChild(body);

  return { card, body };
}

function buildFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  followersUICache.host.innerHTML = '';
  followersUICache.rowsById = {};

  const root = document.createElement('div');
  root.id = 'followers-layout';
  root.classList.add('followers-layout');

  const orbitalsTooltipText = [
    'With orbitals, humanity can now help HOPE with its project directly.',
    'Assign orbitals to produce resources automatically.',
    'You can assign up to your effective terraformed world count.',
    'Manual mode sets exact assignments with the current step size.',
    'Weight mode distributes assignments by integer weights among unlocked resources.',
    'Each orbital produces the mapped source output with its multiplier, without consumption or productivity scaling.',
    'Orbitals only produce if the target resource is unlocked.'
  ].join('\n');
  const orbitals = createFollowersCard('Orbitals', 'followers-orbitals-card', orbitalsTooltipText);

  const orbitalKesslerWarning = document.createElement('div');
  orbitalKesslerWarning.classList.add('project-kessler-warning', 'followers-orbitals-kessler-warning');
  orbitalKesslerWarning.style.display = 'none';
  const orbitalWarningIconLeft = document.createElement('span');
  orbitalWarningIconLeft.classList.add('project-kessler-warning__icon');
  orbitalWarningIconLeft.textContent = '⚠';
  const orbitalWarningText = document.createElement('span');
  orbitalWarningText.textContent = 'Orbitals cannot approach due to Kessler Skies. Limited to research.';
  const orbitalWarningIconRight = document.createElement('span');
  orbitalWarningIconRight.classList.add('project-kessler-warning__icon');
  orbitalWarningIconRight.textContent = '⚠';
  orbitalKesslerWarning.append(orbitalWarningIconLeft, orbitalWarningText, orbitalWarningIconRight);
  orbitals.body.appendChild(orbitalKesslerWarning);

  const summary = document.createElement('div');
  summary.id = 'followers-orbitals-summary';
  summary.classList.add('followers-orbitals-summary');
  summary.textContent = 'Orbitals Assigned: 0 / 0 | Unassigned: 0';
  orbitals.body.appendChild(summary);

  const modeRow = document.createElement('div');
  modeRow.classList.add('followers-mode-row');

  const modeLabel = document.createElement('span');
  modeLabel.classList.add('followers-inline-label');
  modeLabel.textContent = 'Mode';

  const modeToggle = createToggleButton({ onLabel: 'Weight', offLabel: 'Manual', isOn: false });
  modeToggle.classList.add('followers-mode-toggle');

  const stepControls = document.createElement('div');
  stepControls.classList.add('followers-step-controls');

  const stepLabel = document.createElement('span');
  stepLabel.classList.add('followers-inline-label');
  stepLabel.textContent = 'Step';

  const stepValue = document.createElement('span');
  stepValue.id = 'followers-assignment-step';
  stepValue.classList.add('followers-step-value');
  stepValue.textContent = '1';

  const divideStepButton = document.createElement('button');
  divideStepButton.type = 'button';
  divideStepButton.classList.add('followers-action-button', 'followers-step-button');
  divideStepButton.textContent = '/10';

  const multiplyStepButton = document.createElement('button');
  multiplyStepButton.type = 'button';
  multiplyStepButton.classList.add('followers-action-button', 'followers-step-button');
  multiplyStepButton.textContent = 'x10';

  stepControls.append(stepLabel, stepValue, divideStepButton, multiplyStepButton);
  modeRow.append(modeLabel, modeToggle, stepControls);
  orbitals.body.appendChild(modeRow);

  const rowsContainer = document.createElement('div');
  rowsContainer.classList.add('followers-orbitals-grid');

  const configs = followersOrbitalParameters.orbitals;
  for (let i = 0; i < configs.length; i += 1) {
    const config = configs[i];

    const row = document.createElement('div');
    row.classList.add('followers-orbital-card');

    const top = document.createElement('div');
    top.classList.add('followers-orbital-top');

    const title = document.createElement('span');
    title.classList.add('followers-orbital-title');
    title.textContent = config.label;

    const assigned = document.createElement('span');
    assigned.classList.add('followers-orbital-assigned');
    assigned.textContent = 'Assigned: 0';

    const assignedBlock = document.createElement('div');
    assignedBlock.classList.add('followers-orbital-assigned-block');

    const autoAssignRow = document.createElement('label');
    autoAssignRow.classList.add('followers-auto-assign-row');

    const autoAssignCheckbox = document.createElement('input');
    autoAssignCheckbox.type = 'checkbox';
    autoAssignCheckbox.classList.add('followers-auto-assign-checkbox');

    const autoAssignText = document.createElement('span');
    autoAssignText.classList.add('followers-auto-assign-text');
    autoAssignText.textContent = 'Auto assign';

    autoAssignRow.append(autoAssignCheckbox, autoAssignText);
    assignedBlock.append(assigned, autoAssignRow);

    top.append(title, assignedBlock);

    const stats = document.createElement('div');
    stats.classList.add('followers-orbital-stats');

    const perOrbitalRate = document.createElement('span');
    perOrbitalRate.classList.add('followers-orbital-rate');
    perOrbitalRate.textContent = 'Per orbital: +0/s';

    const totalRate = document.createElement('span');
    totalRate.classList.add('followers-orbital-rate', 'followers-orbital-rate-total');
    totalRate.textContent = 'Total: +0/s';

    stats.append(perOrbitalRate, totalRate);

    const manualControls = document.createElement('div');
    manualControls.classList.add('followers-manual-controls');

    const manualZero = document.createElement('button');
    manualZero.type = 'button';
    manualZero.classList.add('followers-action-button', 'followers-manual-button');
    manualZero.textContent = '0';

    const manualMinus = document.createElement('button');
    manualMinus.type = 'button';
    manualMinus.classList.add('followers-action-button', 'followers-manual-button');
    manualMinus.textContent = '-1';

    const manualPlus = document.createElement('button');
    manualPlus.type = 'button';
    manualPlus.classList.add('followers-action-button', 'followers-manual-button');
    manualPlus.textContent = '+1';

    const manualMax = document.createElement('button');
    manualMax.type = 'button';
    manualMax.classList.add('followers-action-button', 'followers-manual-button', 'followers-manual-button-max');
    manualMax.textContent = 'Max';

    manualControls.append(manualZero, manualMinus, manualPlus, manualMax);

    const weightControls = document.createElement('div');
    weightControls.classList.add('followers-weight-controls');
    weightControls.style.display = 'none';

    const weightLabel = document.createElement('span');
    weightLabel.classList.add('followers-inline-label');
    weightLabel.textContent = 'Weight';

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.min = '0';
    weightInput.step = '1';
    weightInput.value = '0';
    weightInput.classList.add('followers-weight-input');

    weightControls.append(weightLabel, weightInput);

    row.append(top, stats, manualControls, weightControls);
    rowsContainer.appendChild(row);

    followersUICache.rowsById[config.id] = {
      assigned,
      perOrbitalRate,
      totalRate,
      manualControls,
      manualZero,
      manualMinus,
      manualPlus,
      manualMax,
      autoAssignRow,
      autoAssignCheckbox,
      weightControls,
      weightInput,
      weightWire: null,
    };

    manualZero.addEventListener('click', () => {
      followersManager.setManualAssignment(config.id, 0);
    });
    manualMinus.addEventListener('click', () => {
      followersManager.adjustManualAssignment(config.id, -followersManager.getAssignmentStep());
    });
    manualPlus.addEventListener('click', () => {
      followersManager.adjustManualAssignment(config.id, followersManager.getAssignmentStep());
    });
    manualMax.addEventListener('click', () => {
      followersManager.setManualAssignmentToMax(config.id);
    });
    autoAssignCheckbox.addEventListener('change', () => {
      followersManager.setAutoAssign(config.id, autoAssignCheckbox.checked);
    });

    const wire = wireStringNumberInput(weightInput, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        if (!Number.isFinite(parsed)) {
          return 0;
        }
        return Math.max(0, Math.floor(parsed));
      },
      formatValue: (value) => String(Math.max(0, Math.floor(value))),
      datasetKey: 'weight',
      onValue: (parsed) => {
        followersManager.setWeight(config.id, parsed);
      }
    });
    followersUICache.rowsById[config.id].weightWire = wire;
  }

  orbitals.body.appendChild(rowsContainer);

  const artGalleryTooltipText = [
    'Galactic population generates Art Power through cultural output.  HOPE has been chosen as custodian via a special orbital facility.  This has multiple effects on the population.',
    'Base Art Power is sqrt(galactic population).',
    'Artifact factor is sqrt(artifacts invested).',
    'Funding factor is sqrt(funding invested).',
    'Total Art Power = sqrt(population) * sqrt(artifacts invested) * sqrt(funding invested).',
    'Happiness bonus is 0.5 * log10(Art Power)% and worker-per-colonist is multiplied by 1 + 5 * happiness bonus.'
  ].join('\n');
  const artGallery = document.createElement('div');
  artGallery.classList.add('followers-art-gallery');

  const artHeader = document.createElement('div');
  artHeader.classList.add('followers-art-header');

  const artTitle = document.createElement('span');
  artTitle.classList.add('followers-art-title');
  artTitle.textContent = 'Art Gallery';

  const artInfo = document.createElement('span');
  artInfo.classList.add('info-tooltip-icon');
  artInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(artInfo, artGalleryTooltipText);
  artHeader.append(artTitle, artInfo);
  artGallery.appendChild(artHeader);

  const artStats = document.createElement('div');
  artStats.classList.add('followers-art-stats-grid');

  const createArtStat = (labelText, valueText) => {
    const stat = document.createElement('div');
    stat.classList.add('followers-art-stat');

    const label = document.createElement('span');
    label.classList.add('followers-art-stat-label');
    label.textContent = labelText;

    const value = document.createElement('span');
    value.classList.add('followers-art-stat-value');
    value.textContent = valueText;

    stat.append(label, value);
    return { stat, value };
  };

  const artPopulationStat = createArtStat('Galactic Population', '0');
  const artBasePowerStat = createArtStat('Base Power', '0');
  const artArtifactMultiplierStat = createArtStat('Artifact Factor', 'x0');
  const artFundingMultiplierStat = createArtStat('Funding Factor', 'x0');
  const artTotalPowerStat = createArtStat('Art Power', '0');
  const artHappinessBonusStat = createArtStat('Happiness Bonus', '+0.00%');
  const artWorkerMultiplierStat = createArtStat('Worker/Colonist', 'x1.00');
  artStats.append(
    artPopulationStat.stat,
    artBasePowerStat.stat,
    artArtifactMultiplierStat.stat,
    artFundingMultiplierStat.stat,
    artTotalPowerStat.stat,
    artHappinessBonusStat.stat,
    artWorkerMultiplierStat.stat
  );
  artGallery.appendChild(artStats);

  const artControls = document.createElement('div');
  artControls.classList.add('followers-art-controls-grid');

  const createInvestmentPanel = (titleText) => {
    const panel = document.createElement('div');
    panel.classList.add('followers-art-invest-panel');

    const label = document.createElement('div');
    label.classList.add('followers-art-invest-title');
    label.textContent = titleText;

    const available = document.createElement('div');
    available.classList.add('followers-art-invest-available');
    available.textContent = 'Available: 0';

    const amountRow = document.createElement('div');
    amountRow.classList.add('followers-art-invest-row');

    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.classList.add('followers-art-invest-input');
    amountInput.value = '1';

    const investButton = document.createElement('button');
    investButton.type = 'button';
    investButton.classList.add('followers-action-button');
    investButton.textContent = 'Invest';

    const maxButton = document.createElement('button');
    maxButton.type = 'button';
    maxButton.classList.add('followers-action-button');
    maxButton.textContent = 'Max';
    amountRow.append(amountInput, investButton, maxButton);

    const stepRow = document.createElement('div');
    stepRow.classList.add('followers-art-step-row');

    const stepLabel = document.createElement('span');
    stepLabel.classList.add('followers-inline-label');
    stepLabel.textContent = 'Step';

    const stepValue = document.createElement('span');
    stepValue.classList.add('followers-step-value');
    stepValue.textContent = '1';

    const stepDown = document.createElement('button');
    stepDown.type = 'button';
    stepDown.classList.add('followers-action-button', 'followers-step-button');
    stepDown.textContent = '/10';

    const stepUp = document.createElement('button');
    stepUp.type = 'button';
    stepUp.classList.add('followers-action-button', 'followers-step-button');
    stepUp.textContent = 'x10';

    const investStep = document.createElement('button');
    investStep.type = 'button';
    investStep.classList.add('followers-action-button');
    investStep.textContent = 'Invest Step';

    stepRow.append(stepLabel, stepValue, stepDown, stepUp, investStep);
    panel.append(label, available, amountRow, stepRow);

    return {
      panel,
      available,
      amountInput,
      investButton,
      maxButton,
      stepValue,
      stepDown,
      stepUp,
      investStep
    };
  };

  const artifactPanel = createInvestmentPanel('Artifacts');
  const fundingPanel = createInvestmentPanel('Funding');
  artControls.append(artifactPanel.panel, fundingPanel.panel);
  artGallery.appendChild(artControls);
  orbitals.body.appendChild(artGallery);

  const parseInvestAmount = (value) => {
    const parsed = parseFlexibleNumber(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(0, parsed);
  };

  const artifactWire = wireStringNumberInput(artifactPanel.amountInput, {
    parseValue: parseInvestAmount,
    formatValue: (value) => formatNumber(Math.max(0, value), false, 2),
    datasetKey: 'investAmount'
  });
  const fundingWire = wireStringNumberInput(fundingPanel.amountInput, {
    parseValue: parseInvestAmount,
    formatValue: (value) => formatNumber(Math.max(0, value), false, 2),
    datasetKey: 'investAmount'
  });
  followersUICache.artArtifactWire = artifactWire;
  followersUICache.artFundingWire = fundingWire;

  artifactPanel.investButton.addEventListener('click', () => {
    const value = parseInvestAmount(artifactPanel.amountInput.dataset.investAmount || artifactPanel.amountInput.value);
    followersManager.investArtifacts(value);
  });
  artifactPanel.maxButton.addEventListener('click', () => {
    followersManager.investArtifactsMax();
  });
  artifactPanel.stepDown.addEventListener('click', () => {
    followersManager.divideArtifactInvestmentStep();
  });
  artifactPanel.stepUp.addEventListener('click', () => {
    followersManager.multiplyArtifactInvestmentStep();
  });
  artifactPanel.investStep.addEventListener('click', () => {
    followersManager.investArtifactsStep();
  });

  fundingPanel.investButton.addEventListener('click', () => {
    const value = parseInvestAmount(fundingPanel.amountInput.dataset.investAmount || fundingPanel.amountInput.value);
    followersManager.investFunding(value);
  });
  fundingPanel.maxButton.addEventListener('click', () => {
    followersManager.investFundingMax();
  });
  fundingPanel.stepDown.addEventListener('click', () => {
    followersManager.divideFundingInvestmentStep();
  });
  fundingPanel.stepUp.addEventListener('click', () => {
    followersManager.multiplyFundingInvestmentStep();
  });
  fundingPanel.investStep.addEventListener('click', () => {
    followersManager.investFundingStep();
  });

  const bottomRow = document.createElement('div');
  bottomRow.classList.add('followers-secondary-row');

  const faithTooltipText = [
    'Believers in the Church of HOPE convert the current population exponentially.',
    'All colonists import bring population that respect the galactic believers %',
    'World believers cannot exceed Galactic believers + 5 percentage points (+15 on a Holy World).',
    'Once world believers reaches Galactic + 5 percentage points, galactic faith also rises at 1/1000 speed.',
    'On a Holy World, world faith can continue up to Galactic + 15 percentage points.',
    'After travelling, world count will join the galactic count.'
  ].join('\n');
  const faith = createFollowersCard('Faith', 'followers-feature-card', faithTooltipText);
  faith.body.classList.add('followers-faith-body');

  const faithProgress = document.createElement('div');
  faithProgress.classList.add('followers-faith-progress');

  const createFaithProgress = (labelText, valueText) => {
    const row = document.createElement('div');
    row.classList.add('followers-faith-progress-row');

    const top = document.createElement('div');
    top.classList.add('followers-faith-progress-top');

    const label = document.createElement('span');
    label.classList.add('followers-faith-progress-label');
    label.textContent = labelText;

    const value = document.createElement('span');
    value.classList.add('followers-faith-progress-value');
    value.textContent = valueText;

    top.append(label, value);

    const track = document.createElement('div');
    track.classList.add('followers-faith-progress-track');

    const fill = document.createElement('div');
    fill.classList.add('followers-faith-progress-fill');
    track.appendChild(fill);

    row.append(top, track);
    return { row, value, track, fill };
  };

  const worldProgress = createFaithProgress('World Believers', '0.00%');
  const worldBaseCapMarker = document.createElement('div');
  worldBaseCapMarker.classList.add('followers-faith-progress-marker', 'followers-faith-progress-marker-base');
  worldProgress.track.appendChild(worldBaseCapMarker);
  const worldHolyCapMarker = document.createElement('div');
  worldHolyCapMarker.classList.add('followers-faith-progress-marker', 'followers-faith-progress-marker-holy');
  worldHolyCapMarker.style.display = 'none';
  worldProgress.track.appendChild(worldHolyCapMarker);

  const galacticProgress = createFaithProgress('Galactic Believers', '10.00%');
  faithProgress.append(worldProgress.row, galacticProgress.row);
  faith.body.appendChild(faithProgress);

  const faithStatsGrid = document.createElement('div');
  faithStatsGrid.classList.add('followers-faith-stats-grid');

  const createFaithStat = (labelText, valueText) => {
    const stat = document.createElement('div');
    stat.classList.add('followers-faith-stat');

    const label = document.createElement('span');
    label.classList.add('followers-faith-stat-label');
    label.textContent = labelText;

    const value = document.createElement('span');
    value.classList.add('followers-faith-stat-value');
    value.textContent = valueText;

    stat.append(label, value);
    return { stat, value };
  };

  const worldBelieversStat = createFaithStat('World Count', '0');
  const galacticBelieversStat = createFaithStat('Galactic Count', '0');
  const worldCapStat = createFaithStat('World Cap', '15.00%');
  const worldRateStat = createFaithStat('World Conversion', '+0.0000%/s');
  const galacticRateStat = createFaithStat('Galactic Conversion (%)', '+0.0000%/s');
  const galacticAbsoluteRateStat = createFaithStat('Galactic Conversion', '+0/s');

  faithStatsGrid.append(
    worldBelieversStat.stat,
    galacticBelieversStat.stat,
    worldCapStat.stat,
    worldRateStat.stat,
    galacticRateStat.stat,
    galacticAbsoluteRateStat.stat
  );
  faith.body.appendChild(faithStatsGrid);

  const faithBonuses = document.createElement('div');
  faithBonuses.classList.add('followers-faith-bonuses');

  const effectsTooltipText = [
    'Pilgrims: increases population growth by galactic believer %.',
    'Zeal: increases colonist worker efficiency by 2x world believer % (max x3 total).',
    'Apostles: increases available orbitals by 10 * (galactic believer % - 10%), up to +900%.',
    'Missionaries: increases galactic conversion power (active above Galactic + 5 percentage points) by world believer %.'
  ].join('\n');
  const faithBonusesHeader = document.createElement('div');
  faithBonusesHeader.classList.add('followers-faith-bonuses-header');
  const faithBonusesHeaderLabel = document.createElement('span');
  faithBonusesHeaderLabel.textContent = 'Effects';
  const faithBonusesHeaderInfo = document.createElement('span');
  faithBonusesHeaderInfo.classList.add('info-tooltip-icon');
  faithBonusesHeaderInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(faithBonusesHeaderInfo, effectsTooltipText);
  faithBonusesHeader.append(faithBonusesHeaderLabel, faithBonusesHeaderInfo);
  faithBonuses.appendChild(faithBonusesHeader);

  const createFaithBonus = (name, valueText) => {
    const row = document.createElement('div');
    row.classList.add('followers-faith-bonus-row');

    const label = document.createElement('span');
    label.classList.add('followers-faith-bonus-label');
    label.textContent = name;

    const value = document.createElement('span');
    value.classList.add('followers-faith-bonus-value');
    value.textContent = valueText;

    row.append(label, value);
    faithBonuses.appendChild(row);
    return value;
  };

  const pilgrimBonus = createFaithBonus('Pilgrims (Growth)', '+0.00%');
  const zealBonus = createFaithBonus('Zeal (Worker Efficiency)', '+0.00%');
  const apostlesBonus = createFaithBonus('Apostles (Orbitals)', '+0.00%');
  const missionariesBonus = createFaithBonus('Missionaries (Galactic Conversion)', '+0.00%');

  faith.body.appendChild(faithBonuses);

  const holyWorldTooltipText = [
    'Consecrate this world into a Holy World once requirements and scaled costs are met.',
    'Consecrated worlds block other world specializations on that world.',
    'Each departure from a consecrated world grants 1 Holy Point.',
    'Spend Holy Points on persistent upgrades. Use Respec to refund spent Holy Points.'
  ].join('\n');
  const holyWorld = createFollowersCard('Holy World', 'followers-feature-card', holyWorldTooltipText);
  holyWorld.body.classList.add('followers-holy-world-body');

  const holyStatus = document.createElement('div');
  holyStatus.classList.add('followers-holy-status');
  holyStatus.textContent = 'Not consecrated';
  holyWorld.body.appendChild(holyStatus);

  const holyRequirements = document.createElement('div');
  holyRequirements.classList.add('followers-holy-requirements');

  const requirementRows = {};
  const requirementKeys = [
    'noOtherSpecialization',
    'ecumenopolisCoverage',
    'occupancy'
  ];
  for (let i = 0; i < requirementKeys.length; i += 1) {
    const id = requirementKeys[i];
    const row = document.createElement('div');
    row.classList.add('followers-holy-requirement');
    row.textContent = '';
    holyRequirements.appendChild(row);
    requirementRows[id] = row;
  }
  holyWorld.body.appendChild(holyRequirements);

  const costContainer = document.createElement('div');
  costContainer.classList.add('followers-holy-costs');
  const costHeader = document.createElement('div');
  costHeader.classList.add('followers-holy-cost-header');
  const costHeaderLabel = document.createElement('span');
  costHeaderLabel.textContent = 'Consecration Cost';
  const costHeaderInfo = document.createElement('span');
  costHeaderInfo.classList.add('info-tooltip-icon');
  costHeaderInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(costHeaderInfo, 'Consecration costs double after each successful consecration.');
  costHeader.append(costHeaderLabel, costHeaderInfo);
  costContainer.appendChild(costHeader);

  const costRows = {};
  const costOrder = ['metal', 'glass', 'superalloys', 'components', 'electronics'];
  for (let i = 0; i < costOrder.length; i += 1) {
    const key = costOrder[i];
    const row = document.createElement('div');
    row.classList.add('followers-holy-cost-row');

    const label = document.createElement('span');
    label.classList.add('followers-holy-cost-label');
    label.textContent = key === 'superalloys' ? 'Superalloys' : key.charAt(0).toUpperCase() + key.slice(1);

    const value = document.createElement('span');
    value.classList.add('followers-holy-cost-value');
    value.textContent = '0';

    row.append(label, value);
    costContainer.appendChild(row);
    costRows[key] = { row, value };
  }
  holyWorld.body.appendChild(costContainer);

  const holyActions = document.createElement('div');
  holyActions.classList.add('followers-holy-actions');

  const consecrateButton = document.createElement('button');
  consecrateButton.type = 'button';
  consecrateButton.classList.add('followers-action-button', 'followers-holy-consecrate');
  consecrateButton.textContent = 'Consecrate';
  consecrateButton.addEventListener('click', () => {
    followersManager.consecrateHolyWorld();
  });
  const consecratePoints = document.createElement('div');
  consecratePoints.classList.add('followers-holy-consecrate-points');
  consecratePoints.textContent = 'Holy Points: 0';
  holyActions.append(consecrateButton, consecratePoints);
  holyWorld.body.appendChild(holyActions);

  const holyShop = document.createElement('div');
  holyShop.classList.add('followers-holy-shop');
  const holyShopHeader = document.createElement('div');
  holyShopHeader.classList.add('followers-holy-shop-header');
  const holyShopTitle = document.createElement('span');
  holyShopTitle.textContent = 'Holy Shop';
  const respecButton = document.createElement('button');
  respecButton.type = 'button';
  respecButton.classList.add('followers-action-button', 'followers-holy-respec-button');
  respecButton.textContent = 'Respec';
  respecButton.addEventListener('click', () => {
    followersManager.respecHolyWorldShop();
  });
  holyShopHeader.append(holyShopTitle, respecButton);
  holyShop.appendChild(holyShopHeader);

  const holyShopRows = {};
  const shopItems = followersManager.getHolyWorldShopItems();
  for (let i = 0; i < shopItems.length; i += 1) {
    const item = shopItems[i];
    const row = document.createElement('div');
    row.classList.add('followers-holy-shop-row');

    const labelRow = document.createElement('div');
    labelRow.classList.add('followers-holy-shop-label');
    const label = document.createElement('span');
    label.textContent = item.label;
    const icon = document.createElement('span');
    icon.classList.add('info-tooltip-icon');
    icon.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(icon, item.description);
    labelRow.append(label, icon);

    const count = document.createElement('span');
    count.classList.add('followers-holy-shop-count');
    count.textContent = '0/0';

    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('followers-action-button', 'followers-holy-shop-button');
    button.textContent = 'Buy';
    button.addEventListener('click', (event) => {
      const purchaseCount = event.shiftKey ? item.maxPurchases : 1;
      followersManager.purchaseHolyWorldUpgrade(item.id, purchaseCount);
    });

    row.append(labelRow, count, button);
    holyShop.appendChild(row);
    holyShopRows[item.id] = { count, button, item };
  }

  holyWorld.body.appendChild(holyShop);

  bottomRow.append(faith.card, holyWorld.card);

  root.append(orbitals.card, bottomRow);
  followersUICache.host.appendChild(root);

  modeToggle.addEventListener('click', () => {
    const next = followersManager.getAssignmentMode() === 'manual' ? 'weight' : 'manual';
    followersManager.setAssignmentMode(next);
  });

  divideStepButton.addEventListener('click', () => {
    followersManager.divideAssignmentStep();
  });

  multiplyStepButton.addEventListener('click', () => {
    followersManager.multiplyAssignmentStep();
  });

  followersUICache.initialized = true;
  followersUICache.root = root;
  followersUICache.summary = summary;
  followersUICache.kesslerWarning = orbitalKesslerWarning;
  followersUICache.modeToggle = modeToggle;
  followersUICache.stepValue = stepValue;
  followersUICache.divideStepButton = divideStepButton;
  followersUICache.multiplyStepButton = multiplyStepButton;
  followersUICache.artPopulation = artPopulationStat.value;
  followersUICache.artBasePower = artBasePowerStat.value;
  followersUICache.artArtifactMultiplier = artArtifactMultiplierStat.value;
  followersUICache.artFundingMultiplier = artFundingMultiplierStat.value;
  followersUICache.artTotalPower = artTotalPowerStat.value;
  followersUICache.artHappinessBonus = artHappinessBonusStat.value;
  followersUICache.artWorkerMultiplier = artWorkerMultiplierStat.value;
  followersUICache.artArtifactAvailable = artifactPanel.available;
  followersUICache.artFundingAvailable = fundingPanel.available;
  followersUICache.artArtifactStepValue = artifactPanel.stepValue;
  followersUICache.artFundingStepValue = fundingPanel.stepValue;
  followersUICache.artArtifactInput = artifactPanel.amountInput;
  followersUICache.artFundingInput = fundingPanel.amountInput;
  followersUICache.artArtifactInvestButton = artifactPanel.investButton;
  followersUICache.artFundingInvestButton = fundingPanel.investButton;
  followersUICache.artArtifactInvestStepButton = artifactPanel.investStep;
  followersUICache.artFundingInvestStepButton = fundingPanel.investStep;
  followersUICache.artArtifactMaxButton = artifactPanel.maxButton;
  followersUICache.artFundingMaxButton = fundingPanel.maxButton;
  followersUICache.faithWorldProgressValue = worldProgress.value;
  followersUICache.faithWorldProgressFill = worldProgress.fill;
  followersUICache.faithWorldBaseCapMarker = worldBaseCapMarker;
  followersUICache.faithWorldHolyCapMarker = worldHolyCapMarker;
  followersUICache.faithWorldBelievers = worldBelieversStat.value;
  followersUICache.faithGalacticProgressValue = galacticProgress.value;
  followersUICache.faithGalacticProgressFill = galacticProgress.fill;
  followersUICache.faithGalacticBelievers = galacticBelieversStat.value;
  followersUICache.faithWorldCap = worldCapStat.value;
  followersUICache.faithWorldRate = worldRateStat.value;
  followersUICache.faithGalacticRate = galacticRateStat.value;
  followersUICache.faithGalacticAbsoluteRate = galacticAbsoluteRateStat.value;
  followersUICache.faithPilgrimBonus = pilgrimBonus;
  followersUICache.faithZealBonus = zealBonus;
  followersUICache.faithApostlesBonus = apostlesBonus;
  followersUICache.faithMissionariesBonus = missionariesBonus;
  followersUICache.holyWorldStatus = holyStatus;
  followersUICache.holyWorldRequirements = requirementRows;
  followersUICache.holyWorldCostRows = costRows;
  followersUICache.holyWorldConsecrateButton = consecrateButton;
  followersUICache.holyWorldConsecratePoints = consecratePoints;
  followersUICache.holyWorldShopRows = holyShopRows;
  followersUICache.holyWorldRespecButton = respecButton;
}

function initializeFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  if (!followersUICache.initialized || !followersUICache.root || !followersUICache.root.isConnected) {
    buildFollowersUI();
  }

  updateFollowersUI();
}

function updateFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  if (!followersUICache.initialized || !followersUICache.root || !followersUICache.root.isConnected) {
    buildFollowersUI();
    if (!followersUICache.initialized) {
      return;
    }
  }

  const snapshot = followersManager.getAssignmentsSnapshot();
  const mode = snapshot.mode;
  const step = followersManager.getAssignmentStep();
  const manualMode = mode === 'manual';
  const autoAssignId = followersManager.getAutoAssignId();
  const kesslerRestricted = followersManager.isKesslerOrbitalsRestricted();

  followersUICache.root.dataset.mode = mode;
  followersUICache.kesslerWarning.style.display = kesslerRestricted ? 'flex' : 'none';

  setToggleButtonState(followersUICache.modeToggle, mode === 'weight');

  followersUICache.summary.textContent = `Orbitals Assigned: ${formatNumber(snapshot.assigned, true)} / ${formatNumber(snapshot.availableOrbitals, true)} | Unassigned: ${formatNumber(snapshot.unassigned, true)}`;
  followersUICache.stepValue.textContent = formatNumber(step, true);
  followersUICache.divideStepButton.disabled = !manualMode;
  followersUICache.multiplyStepButton.disabled = !manualMode;

  const configs = followersOrbitalParameters.orbitals;
  for (let i = 0; i < configs.length; i += 1) {
    const config = configs[i];
    const row = followersUICache.rowsById[config.id];
    if (!row) {
      continue;
    }

    const assigned = snapshot.assignments[config.id] || 0;
    const perOrbital = followersManager.getPerOrbitalRateById(config.id);
    const totalRate = perOrbital * assigned;
    const weight = followersManager.getWeight(config.id);
    const isAutoAssignTarget = autoAssignId === config.id;
    const isKesslerLocked = kesslerRestricted && config.id !== 'research';

    row.assigned.textContent = `Assigned: ${formatNumber(assigned, true)}`;
    row.perOrbitalRate.textContent = `Per orbital: +${formatNumber(perOrbital, false, 2)}/s`;
    row.totalRate.textContent = `Total: +${formatNumber(totalRate, false, 2)}/s`;

    row.manualMinus.textContent = `-${formatNumber(step, true)}`;
    row.manualPlus.textContent = `+${formatNumber(step, true)}`;

    row.manualControls.style.display = manualMode ? 'grid' : 'none';
    row.weightControls.style.display = manualMode ? 'none' : 'flex';
    row.autoAssignRow.style.display = manualMode ? 'inline-flex' : 'none';

    const maxForThis = followersManager.getManualMaxFor(config.id);
    row.manualZero.disabled = isKesslerLocked || isAutoAssignTarget || assigned <= 0;
    row.manualMinus.disabled = isKesslerLocked || isAutoAssignTarget || assigned <= 0;
    row.manualPlus.disabled = isKesslerLocked || isAutoAssignTarget || assigned >= maxForThis;
    row.manualMax.disabled = isKesslerLocked || isAutoAssignTarget || assigned >= maxForThis;
    row.autoAssignCheckbox.disabled = !manualMode || isKesslerLocked;
    row.autoAssignCheckbox.checked = isAutoAssignTarget;

    const weightInput = row.weightInput;
    if (weightInput) {
      weightInput.disabled = isKesslerLocked;
      weightInput.dataset.weight = String(weight);
      if (document.activeElement !== weightInput) {
        weightInput.value = String(weight);
      }
    }
  }

  const art = followersManager.getArtPowerSnapshot();
  const artifactAvailable = resources.special.alienArtifact.value;
  const fundingAvailable = resources.colony.funding.value;
  followersUICache.artPopulation.textContent = formatNumber(art.population, true);
  followersUICache.artBasePower.textContent = formatNumber(art.basePower, true);
  followersUICache.artArtifactMultiplier.textContent = `x${formatNumber(art.artifactMultiplier, false, 3)}`;
  followersUICache.artFundingMultiplier.textContent = `x${formatNumber(art.fundingMultiplier, false, 3)}`;
  followersUICache.artTotalPower.textContent = formatNumber(art.artPower, true);
  followersUICache.artHappinessBonus.textContent = `+${formatNumber(art.happinessBonus * 100, false, 2)}%`;
  followersUICache.artWorkerMultiplier.textContent = `x${formatNumber(art.workerMultiplier, false, 3)}`;
  followersUICache.artArtifactAvailable.textContent = `Available: ${formatNumber(artifactAvailable, true)} | Invested: ${formatNumber(art.artifactsInvested, true)}`;
  followersUICache.artFundingAvailable.textContent = `Available: ${formatNumber(fundingAvailable, true)} | Invested: ${formatNumber(art.fundingInvested, true)}`;
  followersUICache.artArtifactStepValue.textContent = formatNumber(art.artifactStep, true);
  followersUICache.artFundingStepValue.textContent = formatNumber(art.fundingStep, true);
  followersUICache.artArtifactInvestButton.disabled = artifactAvailable <= 0;
  followersUICache.artFundingInvestButton.disabled = fundingAvailable <= 0;
  followersUICache.artArtifactInvestStepButton.disabled = artifactAvailable <= 0;
  followersUICache.artFundingInvestStepButton.disabled = fundingAvailable <= 0;
  followersUICache.artArtifactMaxButton.disabled = artifactAvailable <= 0;
  followersUICache.artFundingMaxButton.disabled = fundingAvailable <= 0;

  const faith = followersManager.getFaithSnapshot();
  const consecrated = followersManager.isCurrentWorldHolyConsecrated();
  const baseWorldCapPercent = Math.max(0, Math.min(1, faith.galacticPercent + 0.05));
  const holyWorldCapPercent = Math.max(0, Math.min(1, faith.galacticPercent + 0.15));
  followersUICache.faithWorldProgressValue.textContent = `${formatNumber(faith.worldPercent * 100, false, 2)}% (${formatNumber(faith.worldBelievers, true)} / ${formatNumber(faith.worldPopulation, true)})`;
  followersUICache.faithWorldProgressFill.style.width = `${Math.max(0, Math.min(100, faith.worldPercent * 100))}%`;
  followersUICache.faithWorldBaseCapMarker.style.left = `${baseWorldCapPercent * 100}%`;
  followersUICache.faithWorldHolyCapMarker.style.left = `${holyWorldCapPercent * 100}%`;
  followersUICache.faithWorldHolyCapMarker.style.display = consecrated ? 'block' : 'none';
  followersUICache.faithWorldBelievers.textContent = `${formatNumber(faith.worldBelievers, true)} / ${formatNumber(faith.worldPopulation, true)}`;
  followersUICache.faithGalacticProgressValue.textContent = `${formatNumber(faith.galacticPercent * 100, false, 2)}% (${formatNumber(faith.galacticBelievers, true)} / ${formatNumber(faith.galacticPopulation, true)})`;
  followersUICache.faithGalacticProgressFill.style.width = `${Math.max(0, Math.min(100, faith.galacticPercent * 100))}%`;
  followersUICache.faithGalacticBelievers.textContent = `${formatNumber(faith.galacticBelievers, true)} / ${formatNumber(faith.galacticPopulation, true)}`;
  const worldCapText = `${formatNumber(faith.worldCapPercent * 100, false, 2)}%`;
  const syncThresholdText = `${formatNumber(baseWorldCapPercent * 100, false, 2)}%`;
  followersUICache.faithWorldCap.textContent = consecrated ? `${worldCapText} (sync at ${syncThresholdText})` : worldCapText;
  followersUICache.faithWorldRate.textContent = `+${formatNumber(faith.rates.worldPerSecond * faith.worldPopulation, false, 2)}/s`;
  followersUICache.faithGalacticRate.textContent = `+${formatNumber(faith.rates.galacticPerSecond * 100, false, 4)}%/s`;
  followersUICache.faithGalacticAbsoluteRate.textContent = `+${formatNumber(faith.rates.galacticPerSecond * faith.galacticPopulation, false, 2)}/s`;
  followersUICache.faithPilgrimBonus.textContent = `+${formatNumber(faith.bonuses.pilgrim * 100, false, 2)}%`;
  followersUICache.faithZealBonus.textContent = `+${formatNumber(faith.bonuses.zeal * 100, false, 2)}%`;
  followersUICache.faithApostlesBonus.textContent = `+${formatNumber(faith.bonuses.apostles * 100, false, 2)}%`;
  followersUICache.faithMissionariesBonus.textContent = `+${formatNumber(faith.bonuses.missionaries * 100, false, 2)}%`;

  const holyRequirements = followersManager.getHolyWorldRequirements();
  for (let i = 0; i < holyRequirements.length; i += 1) {
    const requirement = holyRequirements[i];
    const row = followersUICache.holyWorldRequirements[requirement.id];
    if (!row) {
      continue;
    }
    row.textContent = requirement.label;
    row.classList.toggle('is-unmet', !requirement.met);
  }

  const holyCost = followersManager.getHolyWorldCost();
  const holyCostEntries = holyCost.colony;
  for (const key in followersUICache.holyWorldCostRows) {
    const row = followersUICache.holyWorldCostRows[key];
    const required = holyCostEntries[key] || 0;
    const available = resources.colony[key].value;
    row.value.textContent = formatNumber(required, true);
    row.row.classList.toggle('is-unmet', available < required);
  }

  followersUICache.holyWorldStatus.textContent = consecrated ? 'Consecrated' : 'Not consecrated';
  followersUICache.holyWorldStatus.classList.toggle('is-consecrated', consecrated);
  followersUICache.holyWorldConsecrateButton.disabled = !followersManager.canConsecrateHolyWorld();
  followersUICache.holyWorldConsecrateButton.textContent = consecrated ? 'Consecrated' : 'Consecrate';
  followersUICache.holyWorldConsecratePoints.textContent = `Holy Points: ${formatNumber(followersManager.getHolyWorldPointBalance(), true)}`;

  const holyShopRows = followersUICache.holyWorldShopRows;
  for (const id in holyShopRows) {
    const shopRow = holyShopRows[id];
    const purchases = followersManager.getHolyWorldShopPurchaseCount(id);
    const canBuy = followersManager.canPurchaseHolyWorldUpgrade(shopRow.item);
    shopRow.count.textContent = `${purchases}/${shopRow.item.maxPurchases}`;
    shopRow.button.disabled = !canBuy;
    shopRow.button.textContent = purchases >= shopRow.item.maxPurchases ? 'Maxed' : 'Buy';
  }
  const shopItems = followersManager.getHolyWorldShopItems();
  let hasPurchases = false;
  for (let i = 0; i < shopItems.length; i += 1) {
    if (followersManager.getHolyWorldShopPurchaseCount(shopItems[i].id) > 0) {
      hasPurchases = true;
      break;
    }
  }
  followersUICache.holyWorldRespecButton.disabled = !hasPurchases;
}
