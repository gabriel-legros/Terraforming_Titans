const debrisDiskHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  titleStatus: null,
  summaryDebrisBody: null,
  summaryImpactBody: null,
  summaryAttritionBody: null,
  barCleared: null,
  barRemaining: null,
  barClearedLabel: null,
  barRemainingLabel: null,
  barDetails: null,
  viz: null,
  effectsItems: [],
  clearItem: null
};

function getDebrisDiskHazardText(path, fallback, vars) {
  return t(`ui.terraforming.hazardsUi.debrisDisk.${path}`, vars, fallback);
}

function getDebrisDiskStatusText(isCleared) {
  return t(
    `ui.terraforming.hazardsUi.statusLabels.${isCleared ? 'cleared' : 'active'}`,
    null,
    isCleared ? 'Cleared' : 'Active'
  );
}

function getDebrisDiskDocument() {
  if (debrisDiskHazardUICache.doc !== undefined) {
    return debrisDiskHazardUICache.doc;
  }
  try {
    debrisDiskHazardUICache.doc = document;
  } catch (error) {
    debrisDiskHazardUICache.doc = null;
  }
  return debrisDiskHazardUICache.doc;
}

function getDebrisDiskHazardRoot() {
  if (debrisDiskHazardUICache.rootResolved) {
    return debrisDiskHazardUICache.root;
  }
  debrisDiskHazardUICache.rootResolved = true;
  const doc = getDebrisDiskDocument();
  debrisDiskHazardUICache.root = doc ? doc.getElementById('hazard-terraforming') : null;
  return debrisDiskHazardUICache.root;
}

function attachDebrisDiskCardCollapse(card, title) {
  const doc = getDebrisDiskDocument();
  if (!card || !title || !doc) {
    return;
  }

  const arrow = doc.createElement('span');
  arrow.className = 'hazard-card__collapse-arrow';
  arrow.innerHTML = '&#9660;';
  title.insertBefore(arrow, title.firstChild);

  const syncArrow = () => {
    arrow.innerHTML = card.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
  };
  const toggleCard = () => {
    card.classList.toggle('collapsed');
    syncArrow();
  };
  arrow.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCard();
  });
  title.addEventListener('click', toggleCard);
  syncArrow();
}

function formatDebrisDiskNumber(value, decimals = 2, allowSmall = false) {
  const formatted = formatNumber(value || 0, false, decimals, allowSmall);
  if (formatted === 0 && value !== 0) {
    return formatScientific(value || 0, decimals);
  }
  return formatted;
}

function formatDebrisDiskPercent(value, decimals = 2) {
  return `${formatNumber((value || 0) * 100, false, decimals)}%`;
}

function createDebrisDiskSummary(doc, className, titleText) {
  const summary = doc.createElement('div');
  summary.className = `hazard-summary ${className}`;
  const header = doc.createElement('div');
  header.className = 'hazard-summary__header';
  header.textContent = titleText;
  const body = doc.createElement('div');
  body.className = 'hazard-summary__body';
  summary.append(header, body);
  return { summary, body };
}

function ensureDebrisDiskLayout() {
  if (debrisDiskHazardUICache.card) {
    return debrisDiskHazardUICache.card;
  }

  const root = getDebrisDiskHazardRoot();
  const doc = getDebrisDiskDocument();
  if (!root || !doc) {
    return null;
  }

  const card = doc.createElement('div');
  card.className = 'hazard-card hazard-card--debris-disk';

  const title = doc.createElement('div');
  title.className = 'hazard-card__title';
  const titleLabel = doc.createElement('span');
  titleLabel.textContent = getDebrisDiskHazardText('title', 'Debris Disk');
  const titleStatus = doc.createElement('span');
  titleStatus.className = 'hazard-card__status hazard-card__status--cleared';
  titleStatus.textContent = ` (${getDebrisDiskStatusText(true)})`;
  title.append(titleLabel, titleStatus);
  attachDebrisDiskCardCollapse(card, title);
  card.appendChild(title);

  const summaryRow = doc.createElement('div');
  summaryRow.className = 'hazard-summary-row';
  const debrisSummary = createDebrisDiskSummary(doc, 'hazard-summary--left', getDebrisDiskHazardText('systemDebris', 'System Debris'));
  const impactSummary = createDebrisDiskSummary(doc, 'hazard-summary--growth', getDebrisDiskHazardText('operationalImpact', 'Operational Impact'));
  const attritionSummary = createDebrisDiskSummary(doc, 'hazard-summary--right', getDebrisDiskHazardText('attrition', 'Attrition'));
  summaryRow.append(debrisSummary.summary, impactSummary.summary, attritionSummary.summary);
  card.appendChild(summaryRow);

  const barWrapper = doc.createElement('div');
  barWrapper.className = 'hazard-bar-wrapper hazard-bar-wrapper--debris-disk';
  const bar = doc.createElement('div');
  bar.className = 'hazard-bar';
  const clearedFill = doc.createElement('div');
  clearedFill.className = 'hazard-bar__segment hazard-bar__segment--safe';
  const clearedLabel = doc.createElement('span');
  clearedLabel.className = 'hazard-bar__label hazard-bar__label--safe';
  clearedFill.appendChild(clearedLabel);
  const remainingFill = doc.createElement('div');
  remainingFill.className = 'hazard-bar__segment hazard-bar__segment--hazard';
  const remainingLabel = doc.createElement('span');
  remainingLabel.className = 'hazard-bar__label hazard-bar__label--hazard';
  remainingFill.appendChild(remainingLabel);
  bar.append(clearedFill, remainingFill);
  const barDetails = doc.createElement('div');
  barDetails.className = 'hazard-bar__details';
  barWrapper.append(bar, barDetails);
  card.appendChild(barWrapper);

  const viz = doc.createElement('div');
  viz.className = 'debris-disk-viz';
  for (let i = 0; i < 20; i += 1) {
    const asteroid = doc.createElement('div');
    asteroid.className = `debris-disk-viz__asteroid debris-disk-viz__asteroid--${i + 1}`;
    viz.appendChild(asteroid);
  }
  card.appendChild(viz);

  const effectsSection = doc.createElement('div');
  effectsSection.className = 'hazard-effects';
  const effectsHeader = doc.createElement('div');
  effectsHeader.className = 'hazard-effects__header';
  effectsHeader.textContent = getDebrisDiskHazardText('effects', 'Effects');
  const effectsList = doc.createElement('ul');
  effectsList.className = 'hazard-effects__list';
  const effectItems = [];
  for (let i = 0; i < 4; i += 1) {
    const item = doc.createElement('li');
    item.className = 'hazard-effects__item';
    effectsList.appendChild(item);
    effectItems.push(item);
  }
  effectsSection.append(effectsHeader, effectsList);
  card.appendChild(effectsSection);

  const clearSection = doc.createElement('div');
  clearSection.className = 'hazard-effects';
  const clearHeader = doc.createElement('div');
  clearHeader.className = 'hazard-effects__header';
  clearHeader.textContent = getDebrisDiskHazardText('howToClear', 'How to Clear');
  const clearList = doc.createElement('ul');
  clearList.className = 'hazard-effects__list';
  const clearItem = doc.createElement('li');
  clearItem.className = 'hazard-effects__item';
  clearList.appendChild(clearItem);
  clearSection.append(clearHeader, clearList);
  card.appendChild(clearSection);

  root.appendChild(card);
  debrisDiskHazardUICache.card = card;
  debrisDiskHazardUICache.titleStatus = titleStatus;
  debrisDiskHazardUICache.summaryDebrisBody = debrisSummary.body;
  debrisDiskHazardUICache.summaryImpactBody = impactSummary.body;
  debrisDiskHazardUICache.summaryAttritionBody = attritionSummary.body;
  debrisDiskHazardUICache.barCleared = clearedFill;
  debrisDiskHazardUICache.barRemaining = remainingFill;
  debrisDiskHazardUICache.barClearedLabel = clearedLabel;
  debrisDiskHazardUICache.barRemainingLabel = remainingLabel;
  debrisDiskHazardUICache.barDetails = barDetails;
  debrisDiskHazardUICache.viz = viz;
  debrisDiskHazardUICache.effectsItems = effectItems;
  debrisDiskHazardUICache.clearItem = clearItem;
  return card;
}

function setDebrisDiskTitleStatus(isCleared) {
  debrisDiskHazardUICache.titleStatus.textContent = ` (${getDebrisDiskStatusText(isCleared)})`;
  debrisDiskHazardUICache.titleStatus.className = `hazard-card__status hazard-card__status--${isCleared ? 'cleared' : 'active'}`;
}

function initializeDebrisDiskHazardUI() {
  ensureDebrisDiskLayout();
}

function updateDebrisDiskHazardUI(debrisDiskParameters) {
  const card = ensureDebrisDiskLayout();
  if (!card) {
    return;
  }

  const hasHazard = !!debrisDiskParameters;
  card.style.display = hasHazard ? '' : 'none';
  if (!hasHazard) {
    return;
  }

  const hazard = hazardManager && hazardManager.debrisDiskHazard ? hazardManager.debrisDiskHazard : null;
  const resource = resources.special.systemDebris;
  const isCleared = hazard ? hazard.isCleared(terraforming, debrisDiskParameters) : true;
  const remainingRatio = hazard ? hazard.getRemainingRatio(terraforming) : 0;
  const clearanceRatio = 1 - remainingRatio;
  const attritionRate = hazard ? hazard.getCurrentAttritionRate(terraforming, debrisDiskParameters) : 0;
  const growthMultiplier = hazard ? hazard.getCurrentGrowthMultiplier(terraforming, debrisDiskParameters) : 1;
  const current = resource.value || 0;
  const initial = Math.max(resource.initialValue || 0, current);
  const clearedPercent = clearanceRatio * 100;
  const remainingPercent = remainingRatio * 100;

  card.classList.toggle('hazard-card--active', !isCleared);
  setDebrisDiskTitleStatus(isCleared);
  debrisDiskHazardUICache.viz.classList.toggle('debris-disk-viz--active', !isCleared);

  debrisDiskHazardUICache.summaryDebrisBody.textContent = getDebrisDiskHazardText(
    'summary.debris',
    'Debris: {current} / {initial} t\nCleared: {clearance}',
    {
      current: formatDebrisDiskNumber(current, 2),
      initial: formatDebrisDiskNumber(initial, 2),
      clearance: formatDebrisDiskPercent(clearanceRatio, 2),
    }
  );
  debrisDiskHazardUICache.summaryImpactBody.textContent = getDebrisDiskHazardText(
    'summary.impact',
    'Colonist Growth: x{growth}',
    { growth: formatNumber(growthMultiplier, false, 3) }
  );
  debrisDiskHazardUICache.summaryAttritionBody.textContent = getDebrisDiskHazardText(
    'summary.attrition',
    'Attrition: {attrition}%/s\nColony stockpiles: -{resources}/s\nSalvage: {scrap}/s scrap, {junk}/s junk',
    {
      attrition: formatNumber(attritionRate * 100, false, 3),
      resources: formatDebrisDiskNumber(hazard ? hazard.lastColonyResourceLossPerSecond : 0, 2, true),
      scrap: formatDebrisDiskNumber(hazard ? hazard.lastScrapMetalPerSecond : 0, 2, true),
      junk: formatDebrisDiskNumber(hazard ? hazard.lastJunkPerSecond : 0, 2, true),
    }
  );

  const clearedWidth = `${clearedPercent}%`;
  const remainingWidth = `${remainingPercent}%`;
  debrisDiskHazardUICache.barCleared.style.width = clearedWidth;
  debrisDiskHazardUICache.barCleared.style.flexBasis = clearedWidth;
  debrisDiskHazardUICache.barRemaining.style.width = remainingWidth;
  debrisDiskHazardUICache.barRemaining.style.flexBasis = remainingWidth;
  debrisDiskHazardUICache.barClearedLabel.textContent = clearedPercent > 10
    ? getDebrisDiskHazardText('bar.cleared', '{value}% Cleared', { value: formatNumber(clearedPercent, false, 1) })
    : '';
  debrisDiskHazardUICache.barRemainingLabel.textContent = remainingPercent > 10
    ? getDebrisDiskHazardText('bar.remaining', '{value}% Remaining', { value: formatNumber(remainingPercent, false, 1) })
    : '';
  debrisDiskHazardUICache.barDetails.textContent = isCleared
    ? getDebrisDiskHazardText('bar.clearedDetails', 'Debris Disk cleared.')
    : getDebrisDiskHazardText(
      'bar.details',
      'System Debris remaining: {remaining}%',
      { remaining: formatNumber(remainingPercent, false, 2) }
    );

  const effects = [
    getDebrisDiskHazardText('effectsList.orbitals', 'Orbitals are capped at 0 while system debris remains.'),
    getDebrisDiskHazardText('effectsList.disabledSystems', 'Lifters atmospheric stripping, Mega Heat Sink, Dyson Receivers, and Space Mirror Facility are disabled while active. The companion mirror is too afraid to come.'),
    getDebrisDiskHazardText('effectsList.kesslerRegeneration', 'If Kessler Skies is also active, Debris Disk regenerates orbital debris by {value}% of each Kessler bin per second.', { value: formatNumber((debrisDiskParameters.kesslerRegenerationRatePerBinPerSecond || 0.01) * 100, false, 2) }),
    getDebrisDiskHazardText('effectsList.attrition', 'Buildings, colonies, and colony stockpiles lose up to {value}%/s. Constructed structures do not drop below 10 and colony stockpiles do not drop below 1,000 from this hazard. Lost materials convert into scrap metal and junk.', { value: formatNumber((debrisDiskParameters.attritionRatePerSecond || 0.01) * 100, false, 2) }),
  ];
  for (let i = 0; i < debrisDiskHazardUICache.effectsItems.length; i += 1) {
    debrisDiskHazardUICache.effectsItems[i].textContent = effects[i] || '';
  }
  debrisDiskHazardUICache.clearItem.textContent = getDebrisDiskHazardText(
    'clearText',
    'Remove all system debris or go rogue.'
  );
}

try {
  window.initializeDebrisDiskHazardUI = initializeDebrisDiskHazardUI;
  window.updateDebrisDiskHazardUI = updateDebrisDiskHazardUI;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = {
    initializeDebrisDiskHazardUI,
    updateDebrisDiskHazardUI
  };
} catch (error) {
  // Module system not available in browser
}
