let galacticInvasionUICache = null;
let completedInvasionsHidden = gameSettings.hideCompletedInvasions !== false;

function getGalacticInvasionText(path, fallback, vars) {
  return t(`ui.space.invasion.${path}`, vars, fallback);
}

function formatGalacticInvasionPower(value) {
  return formatNumber(value, true, 2);
}

function formatGalacticInvasionPercent(value) {
  const numeric = Number(value) || 0;
  const percent = numeric * 100;
  const normalizedPercent = Math.abs(percent - Math.round(percent)) < 1e-9
    ? Math.round(percent)
    : percent;
  return formatNumber(normalizedPercent, true, 2);
}

function formatGalacticInvasionDuration(milliseconds) {
  const seconds = Math.ceil(Math.max(0, Number(milliseconds) || 0) / 1000);
  return formatDuration(seconds);
}

function showSpaceInvasionTab() {
  if (isCurrentWorldSubtabDisabled('space-invasion')) {
    hideSpaceInvasionTab();
    return;
  }
  const button = document.querySelector('[data-subtab="space-invasion"]');
  const content = document.getElementById('space-invasion');
  if (spaceSubtabManager) {
    spaceSubtabManager.show('space-invasion');
  } else {
    button?.classList.remove('hidden');
    content?.classList.remove('hidden');
  }
}

function hideSpaceInvasionTab() {
  if (spaceSubtabManager) {
    spaceSubtabManager.hide('space-invasion');
  } else {
    document.querySelector('[data-subtab="space-invasion"]')?.classList.add('hidden');
    document.getElementById('space-invasion')?.classList.add('hidden');
  }
}

function resetGalacticInvasionUI() {
  galacticInvasionUICache = null;
}

function isGalacticInvasionUICacheValid(root) {
  const cache = galacticInvasionUICache;
  if (!cache || cache.root !== root || !root.isConnected) {
    return false;
  }
  if (!cache.content?.isConnected || !cache.overlay?.isConnected) {
    return false;
  }
  if (!root.contains(cache.content) || !root.contains(cache.overlay)) {
    return false;
  }
  if (!(cache.cards instanceof Map) || cache.cards.size !== GALACTIC_INVASION_LETTERS.length) {
    return false;
  }
  for (let index = 0; index < GALACTIC_INVASION_LETTERS.length; index += 1) {
    const letter = GALACTIC_INVASION_LETTERS[index];
    const card = cache.cards.get(letter.key);
    if (!card?.element?.isConnected || !root.contains(card.element)) {
      return false;
    }
  }
  return true;
}

function reconcileGalacticInvasionOverlays(root, primaryOverlay, conquered) {
  const overlays = Array.from(root.querySelectorAll('.galactic-invasion__overlay'));
  overlays.forEach((overlay) => {
    if (overlay !== primaryOverlay) {
      overlay.remove();
      return;
    }
    overlay.classList.toggle('hidden', conquered);
  });
  if (!overlays.includes(primaryOverlay)) {
    root.appendChild(primaryOverlay);
    primaryOverlay.classList.toggle('hidden', conquered);
  }
}

function initializeGalacticInvasionUI() {
  const root = document.getElementById('space-invasion');
  if (!root) {
    resetGalacticInvasionUI();
    return;
  }
  if (isGalacticInvasionUICacheValid(root)) {
    return;
  }
  resetGalacticInvasionUI();
  root.textContent = '';
  root.classList.add('galactic-invasion');

  const content = document.createElement('div');
  content.className = 'galactic-invasion__content';

  const training = createGalacticInvasionSection('training', getGalacticInvasionText('trainingTitle', 'Invasion Training'));
  const trainingDescription = document.createElement('p');
  trainingDescription.className = 'galactic-invasion-section__description';
  trainingDescription.textContent = getGalacticInvasionText(
    'trainingDescription',
    'Invasion Training lets you deploy your available Fleet Power against the Promethean lettered formations in controlled operations. Each operation commits the selected fleet until the timer completes, and that committed force cannot be used elsewhere during the run. Stronger fleet assignments generally improve operation success and reduce expected losses, while weaker assignments are riskier but cheaper to field. Every completed letter grants a permanent campaign reward, and those rewards are shown in Compiled Rewards below. Progress is cumulative across worlds and persists like other galactic systems. Important rule: clearing an invasion tier also clears every lower tier automatically, so pushing into higher letters is the fastest way to secure earlier ranks.'
  );
  training.body.appendChild(trainingDescription);

  const hideCompletedButton = document.createElement('button');
  hideCompletedButton.type = 'button';
  hideCompletedButton.className = 'toggle-completed-button galactic-invasion-hide-toggle';
  hideCompletedButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCompletedInvasionsVisibility();
  });
  training.header.appendChild(hideCompletedButton);

  const grid = document.createElement('div');
  grid.className = 'galactic-invasion-grid';
  training.body.appendChild(grid);

  const traits = createGalacticInvasionSection('traits', getGalacticInvasionText('traitSummaryTitle', 'Special Traits'));
  traits.section.classList.add('galactic-invasion-subsection');
  traits.body.classList.add('galactic-invasion-traits');
  training.body.appendChild(traits.section);

  const rewardSummary = document.createElement('div');
  rewardSummary.className = 'galactic-invasion-summary';
  training.body.appendChild(rewardSummary);

  const mystery = createGalacticInvasionSection('mystery', getGalacticInvasionText('mysteryTitle', '????'));

  const overlay = document.createElement('div');
  overlay.className = 'galactic-invasion__overlay hidden';
  overlay.textContent = getGalacticInvasionText(
    'conquestRequired',
    'To avoid unnecessary casualties as a result of confusion from these training exercises, you must conquer the Galaxy first.'
  );

  content.append(training.section, mystery.section);
  root.append(content, overlay);

  galacticInvasionUICache = {
    root,
    content,
    overlay,
    training,
    hideCompletedButton,
    grid,
    traits,
    traitSummary: traits.body,
    rewardSummary,
    mystery,
    cards: new Map()
  };

  GALACTIC_INVASION_LETTERS.forEach((letter) => {
    const card = createGalacticInvasionCard(letter);
    grid.appendChild(card.element);
    galacticInvasionUICache.cards.set(letter.key, card);
  });
}

function createGalacticInvasionSection(key, titleText) {
  const section = document.createElement('section');
  section.className = 'galactic-invasion-section';
  section.dataset.section = key;

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'galactic-invasion-section__header';
  const arrow = document.createElement('span');
  arrow.className = 'galactic-invasion-section__arrow';
  arrow.textContent = '▼';
  const title = document.createElement('span');
  title.className = 'galactic-invasion-section__title';
  title.textContent = titleText;
  header.append(arrow, title);

  const body = document.createElement('div');
  body.className = 'galactic-invasion-section__body';
  header.addEventListener('click', () => {
    const collapsed = section.classList.toggle('collapsed');
    arrow.textContent = collapsed ? '▶' : '▼';
    if (key === 'training') {
      updateCompletedInvasionVisibilityToggle(galacticInvasionUICache?.hideCompletedButton);
    }
  });

  section.append(header, body);
  return { section, header, arrow, title, body };
}

function createGalacticInvasionCard(letter) {
  const element = document.createElement('div');
  element.className = 'galactic-invasion-card';

  const top = document.createElement('div');
  top.className = 'galactic-invasion-card__top';
  const name = document.createElement('div');
  name.className = 'galactic-invasion-card__name';
  const glyph = document.createElement('span');
  glyph.className = 'galactic-invasion-card__glyph';
  glyph.textContent = letter.label;
  const label = document.createElement('span');
  label.textContent = letter.name;
  name.append(glyph, label);
  const status = document.createElement('span');
  status.className = 'galactic-invasion-card__status';
  top.append(name, status);

  const power = document.createElement('div');
  power.className = 'galactic-invasion-card__power';

  const reward = document.createElement('div');
  reward.className = 'galactic-invasion-card__reward';

  const traits = document.createElement('div');
  traits.className = 'galactic-invasion-card__traits';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'galactic-invasion-card__button';
  button.dataset.letterKey = letter.key;
  button.addEventListener('click', () => {
    galaxyInvasionManager.startOrCancel(letter.key);
    updateGalacticInvasionUI({ force: true });
  });

  element.append(top, power, traits, reward, button);
  return { element, status, power, traits, reward, button };
}

function updateGalacticInvasionUI() {
  if (!galaxyInvasionManager?.enabled) {
    return;
  }
  completedInvasionsHidden = gameSettings.hideCompletedInvasions !== false;
  initializeGalacticInvasionUI();
  const cache = galacticInvasionUICache;
  const root = document.getElementById('space-invasion');
  if (!cache || !root || !isGalacticInvasionUICacheValid(root)) {
    resetGalacticInvasionUI();
    initializeGalacticInvasionUI();
  }
  const refreshedCache = galacticInvasionUICache;
  if (!refreshedCache) {
    return;
  }
  const conquered = galaxyInvasionManager.hasGalaxyConquest();
  reconcileGalacticInvasionOverlays(root, refreshedCache.overlay, conquered);

  GALACTIC_INVASION_LETTERS.forEach((letter) => {
    const card = refreshedCache.cards.get(letter.key);
    const completed = galaxyInvasionManager.completedLetters.has(letter.key);
    const active = galaxyInvasionManager.currentLetterKey === letter.key;
    const blockedByActive = galaxyInvasionManager.currentLetterKey && !active;
    const blockedByCooldown = galaxyInvasionManager.cooldownRemainingMs > 0 && !active;
    card.element.classList.toggle('completed', completed);
    card.element.classList.toggle('active', active);
    card.element.style.display = completed && completedInvasionsHidden ? 'none' : '';
    card.status.textContent = completed
      ? getGalacticInvasionText('complete', 'Complete')
      : active
        ? getGalacticInvasionText('active', 'Active')
        : '';
    card.power.textContent = getGalacticInvasionText('fleetPower', 'Fleet Power: {value}', {
      value: formatGalacticInvasionPower(letter.fleetPower)
    });
    card.traits.textContent = getGalacticInvasionTraitListText(letter.traits);
    card.reward.textContent = getGalacticInvasionRewardText(letter.key);
    card.button.disabled = completed || blockedByActive || blockedByCooldown || !conquered;
    if (active) {
      card.button.textContent = getGalacticInvasionText('cancelButton', 'Cancel Invasion');
      card.button.disabled = !conquered;
    } else if (blockedByCooldown) {
      card.button.textContent = getGalacticInvasionText('cooldownButton', 'Cooldown: {value}', {
        value: formatGalacticInvasionDuration(galaxyInvasionManager.cooldownRemainingMs)
      });
    } else if (completed) {
      card.button.textContent = getGalacticInvasionText('completedButton', 'Completed');
    } else {
      card.button.textContent = getGalacticInvasionText('startButton', 'Start Invasion');
    }
  });
  updateCompletedInvasionVisibilityToggle(refreshedCache.hideCompletedButton);
  updateGalacticInvasionTraitSummary(refreshedCache.traitSummary);
  updateGalacticInvasionRewardSummary(refreshedCache.rewardSummary);
}

function toggleCompletedInvasionsVisibility() {
  completedInvasionsHidden = !completedInvasionsHidden;
  gameSettings.hideCompletedInvasions = completedInvasionsHidden;
  updateGalacticInvasionUI({ force: true });
}

function updateCompletedInvasionVisibilityToggle(toggleButton) {
  if (!toggleButton) {
    return;
  }
  const cache = galacticInvasionUICache;
  const trainingCollapsed = cache && cache.training && cache.training.section.classList.contains('collapsed');
  if (trainingCollapsed) {
    toggleButton.style.display = 'none';
    return;
  }
  const hasCompletedInvasions = GALACTIC_INVASION_LETTERS.some((letter) => galaxyInvasionManager.completedLetters.has(letter.key));
  toggleButton.style.display = hasCompletedInvasions ? 'inline-block' : 'none';
  if (!hasCompletedInvasions) {
    return;
  }
  toggleButton.textContent = completedInvasionsHidden
    ? getGalacticInvasionText('showHiddenButton', 'Show Hidden')
    : getGalacticInvasionText('hideHiddenButton', 'Hide Hidden');
}

function getGalacticInvasionTraitName(traitKey) {
  const definition = GALACTIC_INVASION_TRAIT_DEFINITIONS[traitKey];
  return t(definition.nameKey, {}, definition.nameFallback);
}

function getGalacticInvasionTraitDescription(traitKey) {
  const definition = GALACTIC_INVASION_TRAIT_DEFINITIONS[traitKey];
  return t(definition.descriptionKey, {}, definition.descriptionFallback);
}

function getGalacticInvasionTraitListText(traits) {
  const names = traits.map((traitKey) => getGalacticInvasionTraitName(traitKey));
  return getGalacticInvasionText('traitList', 'Traits: {value}', {
    value: names.join(', ')
  });
}

function getGalacticInvasionRewardText(letterKey) {
  const rewards = galaxyInvasionManager.getRewardEntries(letterKey);
  if (!rewards.length) {
    return getGalacticInvasionText('rewardNone', 'Reward: none configured');
  }
  return rewards.map((reward) => formatGalacticInvasionReward(reward)).join('\n');
}

function formatGalacticInvasionReward(reward) {
  const valueFormat = reward?.valueFormat || 'percent';
  let formattedValue = formatGalacticInvasionPercent(reward.value);
  if (valueFormat === 'number') {
    formattedValue = formatNumber(reward.value, true, 2);
  }
  return t(reward.labelKey, { value: formattedValue }, reward.labelFallback);
}

function updateGalacticInvasionTraitSummary(container) {
  const activeTraits = new Set();
  GALACTIC_INVASION_LETTERS.forEach((letter) => {
    letter.traits.forEach((traitKey) => activeTraits.add(traitKey));
  });

  let list = container._traitList;
  if (!list) {
    list = document.createElement('div');
    list.className = 'galactic-invasion-traits__list';
    container._traitList = list;
    container.appendChild(list);
  }
  list._traitItems ||= new Map();
  const usedItems = new Set();
  GALACTIC_INVASION_TRAIT_ORDER.forEach((traitKey) => {
    if (!activeTraits.has(traitKey)) {
      return;
    }
    let item = list._traitItems.get(traitKey);
    if (!item) {
      item = document.createElement('div');
      item.className = 'galactic-invasion-traits__item';
      const name = document.createElement('span');
      name.className = 'galactic-invasion-traits__name';
      const description = document.createElement('span');
      description.className = 'galactic-invasion-traits__description';
      item.append(name, description);
      item._name = name;
      item._description = description;
      list._traitItems.set(traitKey, item);
    }
    const nameText = getGalacticInvasionTraitName(traitKey);
    const descriptionText = getGalacticInvasionTraitDescription(traitKey);
    if (item._name.textContent !== nameText) item._name.textContent = nameText;
    if (item._description.textContent !== descriptionText) item._description.textContent = descriptionText;
    item.style.display = '';
    usedItems.add(item);
    list.appendChild(item);
  });
  list._traitItems.forEach((item) => {
    if (!usedItems.has(item)) {
      item.style.display = 'none';
    }
  });
}

function updateGalacticInvasionRewardSummary(container) {
  const summary = galaxyInvasionManager.getCompletedRewardSummary();
  let title = container._summaryTitle;
  if (!title) {
    title = document.createElement('div');
    title.className = 'galactic-invasion-summary__title';
    container._summaryTitle = title;
    container.appendChild(title);
  }
  const titleText = getGalacticInvasionText('summaryTitle', 'Compiled Rewards');
  if (title.textContent !== titleText) title.textContent = titleText;
  let empty = container._summaryEmpty;
  if (!empty) {
    empty = document.createElement('div');
    empty.className = 'galactic-invasion-summary__empty';
    container._summaryEmpty = empty;
    container.appendChild(empty);
  }
  let list = container._summaryList;
  if (!list) {
    list = document.createElement('div');
    list.className = 'galactic-invasion-summary__list';
    list._rewardItems = [];
    container._summaryList = list;
    container.appendChild(list);
  }
  if (!summary.length) {
    const emptyText = getGalacticInvasionText('summaryEmpty', 'No invasion rewards completed.');
    if (empty.textContent !== emptyText) empty.textContent = emptyText;
    empty.style.display = '';
    list.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  list.style.display = '';
  while (list._rewardItems.length < summary.length) {
    const item = document.createElement('div');
    item.className = 'galactic-invasion-summary__item';
    list._rewardItems.push(item);
    list.appendChild(item);
  }
  summary.forEach((reward, index) => {
    const item = list._rewardItems[index];
    const text = formatGalacticInvasionReward(reward);
    if (item.textContent !== text) item.textContent = text;
    item.style.display = '';
  });
  for (let index = summary.length; index < list._rewardItems.length; index += 1) {
    list._rewardItems[index].style.display = 'none';
  }
}
