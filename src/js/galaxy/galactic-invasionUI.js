let galacticInvasionUICache = null;

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

  const grid = document.createElement('div');
  grid.className = 'galactic-invasion-grid';
  training.body.appendChild(grid);

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
    grid,
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

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'galactic-invasion-card__button';
  button.dataset.letterKey = letter.key;
  button.addEventListener('click', () => {
    galaxyInvasionManager.startOrCancel(letter.key);
    updateGalacticInvasionUI({ force: true });
  });

  element.append(top, power, reward, button);
  return { element, status, power, reward, button };
}

function updateGalacticInvasionUI() {
  if (!galaxyInvasionManager?.enabled) {
    return;
  }
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
    card.status.textContent = completed
      ? getGalacticInvasionText('complete', 'Complete')
      : active
        ? getGalacticInvasionText('active', 'Active')
        : '';
    card.power.textContent = getGalacticInvasionText('fleetPower', 'Fleet Power: {value}', {
      value: formatGalacticInvasionPower(letter.fleetPower)
    });
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
  updateGalacticInvasionRewardSummary(refreshedCache.rewardSummary);
}

function getGalacticInvasionRewardText(letterKey) {
  const rewards = galaxyInvasionManager.getRewardEntries(letterKey);
  if (!rewards.length) {
    return getGalacticInvasionText('rewardNone', 'Reward: none configured');
  }
  return rewards.map((reward) => formatGalacticInvasionReward(reward)).join('\n');
}

function formatGalacticInvasionReward(reward) {
  return t(reward.labelKey, { value: formatGalacticInvasionPercent(reward.value) }, reward.labelFallback);
}

function updateGalacticInvasionRewardSummary(container) {
  const summary = galaxyInvasionManager.getCompletedRewardSummary();
  container.textContent = '';
  const title = document.createElement('div');
  title.className = 'galactic-invasion-summary__title';
  title.textContent = getGalacticInvasionText('summaryTitle', 'Compiled Rewards');
  container.appendChild(title);
  if (!summary.length) {
    const empty = document.createElement('div');
    empty.className = 'galactic-invasion-summary__empty';
    empty.textContent = getGalacticInvasionText('summaryEmpty', 'No invasion rewards completed.');
    container.appendChild(empty);
    return;
  }
  const list = document.createElement('div');
  list.className = 'galactic-invasion-summary__list';
  summary.forEach((reward) => {
    const item = document.createElement('div');
    item.className = 'galactic-invasion-summary__item';
    item.textContent = formatGalacticInvasionReward(reward);
    list.appendChild(item);
  });
  container.appendChild(list);
}
