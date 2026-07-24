const streamedSelectMenuState = {
  initialized: false,
  menu: null,
  source: null,
  optionButtons: [],
  activeIndex: -1,
  originalAriaExpanded: null,
  activePressSelect: null
};

function canUseStreamedSelectMenu(select) {
  return !select.disabled && !select.multiple && select.size <= 1;
}

function buildStreamedSelectMenu() {
  const menu = document.createElement('div');
  menu.className = 'streamed-select-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');
  menu.addEventListener('pointerdown', (event) => {
    event.preventDefault();
  });
  menu.addEventListener('click', (event) => {
    const button = event.target.closest('.streamed-select-menu-option');
    if (!button || button.disabled) return;
    selectStreamedSelectOption(Number(button.dataset.optionIndex));
  });
  document.body.appendChild(menu);
  streamedSelectMenuState.menu = menu;
  return menu;
}

function getStreamedSelectMenuLabel(select) {
  const ariaLabel = select.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  if (select.labels.length) {
    return select.labels[0].textContent.trim();
  }
  return select.name || select.id || 'Options';
}

function appendStreamedSelectOption(menu, option, optionIndex, groupDisabled) {
  if (option.hidden || option.style.display === 'none') return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'streamed-select-menu-option';
  button.dataset.optionIndex = String(optionIndex);
  button.disabled = option.disabled || groupDisabled;
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', option.selected ? 'true' : 'false');

  const label = document.createElement('span');
  label.textContent = option.text;
  button.appendChild(label);
  menu.appendChild(button);
  streamedSelectMenuState.optionButtons[optionIndex] = button;
}

function renderStreamedSelectOptions(select, menu) {
  while (menu.firstChild) {
    menu.firstChild.remove();
  }
  streamedSelectMenuState.optionButtons = [];
  const optionIndexes = new Map();
  for (let i = 0; i < select.options.length; i += 1) {
    optionIndexes.set(select.options[i], i);
  }

  for (let i = 0; i < select.children.length; i += 1) {
    const child = select.children[i];
    if (child.tagName === 'OPTGROUP') {
      const group = document.createElement('div');
      group.className = 'streamed-select-menu-group';
      group.textContent = child.label;
      menu.appendChild(group);
      for (let optionIndex = 0; optionIndex < child.children.length; optionIndex += 1) {
        const option = child.children[optionIndex];
        appendStreamedSelectOption(menu, option, optionIndexes.get(option), child.disabled);
      }
    } else if (child.tagName === 'OPTION') {
      appendStreamedSelectOption(menu, child, optionIndexes.get(child), false);
    }
  }
}

function positionStreamedSelectMenu(select, menu) {
  const margin = 8;
  const gap = 4;
  const rect = select.getBoundingClientRect();
  const availableWidth = window.innerWidth - margin * 2;
  menu.classList.add('streamed-select-menu-measuring');
  menu.style.width = 'max-content';
  menu.style.maxWidth = `${availableWidth}px`;
  const contentWidth = menu.scrollWidth + 24;
  menu.classList.remove('streamed-select-menu-measuring');
  const width = Math.min(Math.max(rect.width, contentWidth, 180), availableWidth);
  const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - width));
  const spaceBelow = window.innerHeight - rect.bottom - margin - gap;
  const spaceAbove = rect.top - margin - gap;
  const placeBelow = spaceBelow >= Math.min(menu.scrollHeight, 240) || spaceBelow >= spaceAbove;
  const availableHeight = Math.max(placeBelow ? spaceBelow : spaceAbove, 80);
  const maxHeight = Math.min(420, availableHeight);

  menu.style.width = `${width}px`;
  menu.style.maxHeight = `${maxHeight}px`;
  menu.style.left = `${left}px`;
  if (placeBelow) {
    menu.style.top = `${Math.min(rect.bottom + gap, window.innerHeight - margin - maxHeight)}px`;
    menu.style.bottom = '';
  } else {
    menu.style.top = '';
    menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
  }
}

function setStreamedSelectActiveIndex(optionIndex, scrollIntoView = true) {
  const state = streamedSelectMenuState;
  const previous = state.optionButtons[state.activeIndex];
  if (previous) previous.classList.remove('is-active');
  state.activeIndex = optionIndex;
  const current = state.optionButtons[optionIndex];
  if (!current) return;
  current.classList.add('is-active');
  if (scrollIntoView) current.scrollIntoView({ block: 'nearest' });
}

function findStreamedSelectOption(startIndex, direction) {
  const buttons = streamedSelectMenuState.optionButtons;
  for (let index = startIndex; index >= 0 && index < buttons.length; index += direction) {
    if (buttons[index] && !buttons[index].disabled) return index;
  }
  return -1;
}

function openStreamedSelectMenu(select) {
  if (!canUseStreamedSelectMenu(select)) return;
  const state = streamedSelectMenuState;
  const menu = state.menu || buildStreamedSelectMenu();
  if (state.source === select && !menu.hidden) return;
  if (state.source) closeStreamedSelectMenu();
  state.source = select;
  state.originalAriaExpanded = select.getAttribute('aria-expanded');
  renderStreamedSelectOptions(select, menu);
  menu.setAttribute('aria-label', getStreamedSelectMenuLabel(select));
  menu.hidden = false;
  select.setAttribute('aria-expanded', 'true');
  select.focus({ preventScroll: true });
  positionStreamedSelectMenu(select, menu);

  let activeIndex = select.selectedIndex;
  const selectedButton = state.optionButtons[activeIndex];
  if (!selectedButton || selectedButton.disabled) {
    activeIndex = findStreamedSelectOption(0, 1);
  }
  setStreamedSelectActiveIndex(activeIndex);
}

function closeStreamedSelectMenu(restoreFocus = false) {
  const state = streamedSelectMenuState;
  if (!state.source) return;
  const source = state.source;
  if (state.originalAriaExpanded === null) source.removeAttribute('aria-expanded');
  else source.setAttribute('aria-expanded', state.originalAriaExpanded);
  state.source = null;
  state.activeIndex = -1;
  state.originalAriaExpanded = null;
  if (state.menu) state.menu.hidden = true;
  if (restoreFocus && source.isConnected) source.focus({ preventScroll: true });
}

function selectStreamedSelectOption(optionIndex) {
  const state = streamedSelectMenuState;
  const select = state.source;
  const button = state.optionButtons[optionIndex];
  if (!select || !button || button.disabled) return;
  const changed = select.selectedIndex !== optionIndex;
  select.selectedIndex = optionIndex;
  closeStreamedSelectMenu(true);
  if (!changed) return;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function moveStreamedSelectActiveIndex(direction) {
  const state = streamedSelectMenuState;
  const nextIndex = findStreamedSelectOption(state.activeIndex + direction, direction);
  if (nextIndex !== -1) setStreamedSelectActiveIndex(nextIndex);
}

function handleStreamedSelectKeydown(event) {
  const state = streamedSelectMenuState;
  if (state.source && (event.target === state.source || state.menu.contains(event.target))) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeStreamedSelectMenu(true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveStreamedSelectActiveIndex(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveStreamedSelectActiveIndex(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setStreamedSelectActiveIndex(findStreamedSelectOption(0, 1));
    } else if (event.key === 'End') {
      event.preventDefault();
      setStreamedSelectActiveIndex(findStreamedSelectOption(state.optionButtons.length - 1, -1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectStreamedSelectOption(state.activeIndex);
    } else if (event.key === 'Tab') {
      closeStreamedSelectMenu();
    }
    return;
  }
  if (state.source) closeStreamedSelectMenu();

  const select = event.target.closest('select');
  if (!select || !canUseStreamedSelectMenu(select)) return;
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'F4' || (event.altKey && event.key === 'ArrowDown')) {
    event.preventDefault();
    openStreamedSelectMenu(select);
  }
}

function handleStreamedSelectPointerDown(event) {
  const state = streamedSelectMenuState;
  const select = event.target.closest('select');
  if (select && canUseStreamedSelectMenu(select)) {
    event.preventDefault();
    state.activePressSelect = select;
    if (state.source === select) closeStreamedSelectMenu();
    else openStreamedSelectMenu(select);
    return;
  }
  if (state.source && state.menu && !state.menu.contains(event.target)) {
    closeStreamedSelectMenu();
  }
}

function handleStreamedSelectMouseDown(event) {
  const state = streamedSelectMenuState;
  const select = event.target.closest('select');
  if (!select || !canUseStreamedSelectMenu(select)) return;
  event.preventDefault();
  if (state.activePressSelect === select) return;
  state.activePressSelect = select;
  if (state.source === select) closeStreamedSelectMenu();
  else openStreamedSelectMenu(select);
}

function handleStreamedSelectClick(event) {
  const state = streamedSelectMenuState;
  const select = event.target.closest('select');
  if (!select || !canUseStreamedSelectMenu(select)) return;
  event.preventDefault();
  if (state.activePressSelect === select) {
    state.activePressSelect = null;
    return;
  }
  if (state.source === select) closeStreamedSelectMenu();
  else openStreamedSelectMenu(select);
}

function clearStreamedSelectActivePress() {
  const select = streamedSelectMenuState.activePressSelect;
  setTimeout(() => {
    if (streamedSelectMenuState.activePressSelect === select) {
      streamedSelectMenuState.activePressSelect = null;
    }
  }, 0);
}

function initializeStreamedSelectMenus() {
  const state = streamedSelectMenuState;
  if (!GAME_FEATURES.streamedSelectMenus || state.initialized) return;
  state.initialized = true;
  document.addEventListener('pointerdown', handleStreamedSelectPointerDown, true);
  document.addEventListener('mousedown', handleStreamedSelectMouseDown, true);
  document.addEventListener('pointerup', clearStreamedSelectActivePress, true);
  document.addEventListener('pointercancel', clearStreamedSelectActivePress, true);
  document.addEventListener('mouseup', clearStreamedSelectActivePress, true);
  document.addEventListener('click', handleStreamedSelectClick, true);
  document.addEventListener('keydown', handleStreamedSelectKeydown, true);
  document.addEventListener('scroll', (event) => {
    if (state.source && state.menu && !state.menu.contains(event.target)) {
      closeStreamedSelectMenu();
    }
  }, true);
  window.addEventListener('blur', () => closeStreamedSelectMenu());
  window.addEventListener('resize', () => closeStreamedSelectMenu());
}

initializeStreamedSelectMenus();
