const MARKET_PRICING_DEFAULTS = {};
for (const [category, prices] of Object.entries(projectParameters.galactic_market.attributes.resourceChoiceGainCost)) {
  MARKET_PRICING_DEFAULTS[category] = {};
  for (const [resource, buy] of Object.entries(prices)) {
    MARKET_PRICING_DEFAULTS[category][resource] = {
      buy,
      sell: buy * (GalacticMarketProject.SELL_PRICE_MULTIPLIERS[resource] ?? 0.5),
    };
  }
}

let marketPricingElements = null;

function normalizeMarketPricing(pricing) {
  const normalized = {};
  for (const [category, resources] of Object.entries(MARKET_PRICING_DEFAULTS)) {
    for (const [resource, defaults] of Object.entries(resources)) {
      for (const side of ['buy', 'sell']) {
        const value = pricing?.[category]?.[resource]?.[side];
        if (value === undefined || value === null || value === '') continue;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) continue;
        const price = Math.max(0, parsed);
        if (price === defaults[side]) continue;
        normalized[category] ||= {};
        normalized[category][resource] ||= {};
        normalized[category][resource][side] = price;
      }
    }
  }
  return Object.keys(normalized).length ? normalized : null;
}

function updateMarketPricingWindow() {
  if (!marketPricingElements) return;
  const { title, intro, headings, close, done, rows } = marketPricingElements;
  title.textContent = t('ui.settings.marketPricing');
  intro.textContent = t('ui.settings.marketPricingIntro');
  close.setAttribute('aria-label', t('ui.common.close'));
  done.textContent = t('ui.common.close');
  headings.resource.textContent = t('ui.settings.marketPricingResource');
  headings.buy.textContent = t('ui.settings.marketPricingBuy');
  headings.sell.textContent = t('ui.settings.marketPricingSell');
  const locked = isDifficultySettingsLocked();
  for (const row of rows) {
    const name = resources[row.category][row.resource].displayName;
    row.label.textContent = name;
    for (const side of ['buy', 'sell']) {
      const input = row.inputs[side];
      const price = gameSettings.marketPricing?.[row.category]?.[row.resource]?.[side]
        ?? MARKET_PRICING_DEFAULTS[row.category][row.resource][side];
      input.disabled = locked;
      input.dataset.marketPrice = String(price);
      if (locked || document.activeElement !== input) input.value = String(price);
      input.setAttribute('aria-label', t('ui.settings.marketPricingResourcePrice', {
        resource: name,
        price: t(side === 'buy' ? 'ui.settings.marketPricingBuy' : 'ui.settings.marketPricingSell'),
      }));
    }
  }
}

function closeMarketPricingSettings() {
  marketPricingElements.overlay.classList.remove('is-visible');
  cacheSettingsElements().marketPricingSettingsButton.focus();
}

function openMarketPricingSettings() {
  if (isDifficultySettingsLocked()) return;
  if (!marketPricingElements) createMarketPricingWindow();
  updateMarketPricingWindow();
  marketPricingElements.overlay.classList.add('is-visible');
  marketPricingElements.close.focus();
}

function createMarketPricingWindow() {
  const overlay = document.createElement('div');
  overlay.id = 'market-pricing-overlay';
  overlay.className = 'space-storage-settings-overlay';
  const win = document.createElement('div');
  win.className = 'space-storage-settings-window market-pricing-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-modal', 'true');
  win.setAttribute('aria-labelledby', 'market-pricing-title');
  const header = document.createElement('div');
  header.className = 'space-storage-settings-header';
  const title = document.createElement('div');
  title.id = 'market-pricing-title';
  title.className = 'space-storage-settings-title';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'space-storage-settings-close';
  close.textContent = '×';
  close.addEventListener('click', closeMarketPricingSettings);
  header.append(title, close);
  const intro = document.createElement('div');
  const tableContainer = document.createElement('div');
  tableContainer.className = 'market-pricing-table-container';
  const table = document.createElement('table');
  table.className = 'market-pricing-table';
  const thead = document.createElement('thead');
  const headingRow = document.createElement('tr');
  const headings = {};
  for (const key of ['resource', 'buy', 'sell']) {
    const heading = document.createElement('th');
    heading.scope = 'col';
    headings[key] = heading;
    headingRow.appendChild(heading);
  }
  thead.appendChild(headingRow);
  const tbody = document.createElement('tbody');
  const rows = [];
  for (const [category, resourceDefaults] of Object.entries(MARKET_PRICING_DEFAULTS)) {
    for (const [resource, defaults] of Object.entries(resourceDefaults)) {
      const row = document.createElement('tr');
      row.dataset.resource = `${category}:${resource}`;
      const label = document.createElement('th');
      label.scope = 'row';
      row.appendChild(label);
      const inputs = {};
      for (const side of ['buy', 'sell']) {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'space-storage-settings-input';
        input.dataset.priceSide = side;
        inputs[side] = input;
        wireStringNumberInput(input, {
          datasetKey: 'marketPrice',
          parseValue: value => {
            if (isDifficultySettingsLocked()) {
              return gameSettings.marketPricing?.[category]?.[resource]?.[side] ?? defaults[side];
            }
            const parsed = value.trim() === '' ? defaults[side] : parseFlexibleNumber(value);
            return Number.isFinite(parsed) ? Math.max(0, parsed) : defaults[side];
          },
          formatValue: value => String(value),
          onValue: value => {
            if (isDifficultySettingsLocked()) {
              updateMarketPricingWindow();
              return;
            }
            const pricing = gameSettings.marketPricing || {};
            pricing[category] ||= {};
            pricing[category][resource] ||= {};
            pricing[category][resource][side] = value;
            gameSettings.marketPricing = normalizeMarketPricing(pricing);
            projectManager.projects.cargo_rocket.updateUI();
            projectManager.projects.galactic_market.updateUI();
          },
        });
        cell.appendChild(input);
        row.appendChild(cell);
      }
      rows.push({ category, resource, label, inputs });
      tbody.appendChild(row);
    }
  }
  table.append(thead, tbody);
  tableContainer.appendChild(table);
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'space-storage-settings-confirm';
  done.addEventListener('click', closeMarketPricingSettings);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeMarketPricingSettings();
  });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeMarketPricingSettings();
    }
  });
  win.append(header, intro, tableContainer, done);
  overlay.appendChild(win);
  document.body.appendChild(overlay);
  marketPricingElements = { overlay, title, intro, headings, close, done, rows };
}
