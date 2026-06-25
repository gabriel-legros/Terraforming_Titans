(function(){
  let paused = false;
  let pauseKeyHandlerAttached = false;
  const DEFAULT_PAUSE_KEYBIND_CODE = 'Space';
  const DEFAULT_DIALOGUE_SKIP_KEYBIND_CODE = 'NumpadAdd';
  const GAME_SPEED_OPTIONS = [
    { speed: 0, label: '\u23f8\uFE0E', textKey: 'ui.common.gameSpeedPaused', fallback: 'Paused' },
    { speed: 1, label: '\u25B6', textKey: 'ui.common.gameSpeed1x', fallback: '1x speed' },
    { speed: 2, label: '\u25B6\u25B6', textKey: 'ui.common.gameSpeed2x', fallback: '2x speed' },
    { speed: 4, label: '\u25B6\u25B6\u25B6', textKey: 'ui.common.gameSpeed4x', fallback: '4x speed' },
    { speed: 8, label: '\u25B6\u25B6\u25B6\u25B6', textKey: 'ui.common.gameSpeed8x', fallback: '8x speed' },
  ];
  let lastActiveGameSpeed = 1;
  let pauseKeybindCode = DEFAULT_PAUSE_KEYBIND_CODE;
  let dialogueSkipKeybindCode = DEFAULT_DIALOGUE_SKIP_KEYBIND_CODE;

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    const tagName = target.tagName;
    return tagName === 'INPUT'
      || tagName === 'TEXTAREA'
      || tagName === 'SELECT'
      || target.isContentEditable;
  }

  function formatKeybindFromCode(code) {
    if (!code) {
      return 'Spacebar';
    }
    if (code === 'Space') {
      return 'Spacebar';
    }
    if (code === 'NumpadAdd') {
      return 'Numpad +';
    }
    if (code === 'NumpadSubtract') {
      return 'Numpad -';
    }
    if (code === 'NumpadMultiply') {
      return 'Numpad *';
    }
    if (code === 'NumpadDivide') {
      return 'Numpad /';
    }
    if (code.startsWith('Key')) {
      return code.slice(3).toUpperCase();
    }
    if (code.startsWith('Digit')) {
      return code.slice(5);
    }
    if (code.startsWith('Numpad')) {
      return `Numpad ${code.slice(6)}`;
    }
    return code;
  }

  function setPauseKeybindCode(code) {
    pauseKeybindCode = code || DEFAULT_PAUSE_KEYBIND_CODE;
    if (typeof gameSettings !== 'undefined') {
      gameSettings.pauseKeybind = pauseKeybindCode;
    }
  }

  function getPauseKeybindCode() {
    const fromSettings = typeof gameSettings !== 'undefined' ? gameSettings.pauseKeybind : '';
    return fromSettings || pauseKeybindCode || DEFAULT_PAUSE_KEYBIND_CODE;
  }

  function getPauseKeybindDisplay() {
    return formatKeybindFromCode(getPauseKeybindCode());
  }

  function setDialogueSkipKeybindCode(code) {
    dialogueSkipKeybindCode = code || DEFAULT_DIALOGUE_SKIP_KEYBIND_CODE;
    if (typeof gameSettings !== 'undefined') {
      gameSettings.dialogueSkipKeybind = dialogueSkipKeybindCode;
    }
  }

  function getDialogueSkipKeybindCode() {
    const fromSettings = typeof gameSettings !== 'undefined' ? gameSettings.dialogueSkipKeybind : '';
    return fromSettings || dialogueSkipKeybindCode || DEFAULT_DIALOGUE_SKIP_KEYBIND_CODE;
  }

  function getDialogueSkipKeybindDisplay() {
    return formatKeybindFromCode(getDialogueSkipKeybindCode());
  }

  function handlePauseHotkey(event) {
    if (event.code !== getPauseKeybindCode() || event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    event.preventDefault();
    togglePause();
  }

  function handleDialogueSkipHotkey(event) {
    if (event.code !== getDialogueSkipKeybindCode() || event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    let handled = false;
    if (window.skipActivePopupTyping) {
      handled = window.skipActivePopupTyping() || handled;
    }
    if (window.skipJournalTyping) {
      handled = window.skipJournalTyping() || handled;
    }
    if (handled) {
      event.preventDefault();
    }
  }

  function getPauseButtonLabel() {
    return t('ui.settings.pauseButtonLabel', { keybind: getPauseKeybindDisplay() }, `Pause (${getPauseKeybindDisplay()})`);
  }

  function getGameSpeedOptionText(option) {
    return t(option.textKey, {}, option.fallback);
  }

  function getSpeedControls() {
    const container = document.getElementById('pause-container');
    if (!container) {
      return null;
    }
    if (container._speedControls) {
      return container._speedControls;
    }

    const controls = document.createElement('div');
    controls.classList.add('game-speed-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', t('ui.common.gameSpeedControls', {}, 'Game speed controls'));
    controls._buttons = new Map();

    GAME_SPEED_OPTIONS.forEach(option => {
      const button = document.createElement('span');
      button.setAttribute('role', 'button');
      button.tabIndex = 0;
      button.classList.add('game-speed-button');
      button.dataset.speed = String(option.speed);
      button.textContent = option.label;
      button.setAttribute('aria-label', getGameSpeedOptionText(option));
      button.addEventListener('click', () => {
        setGameSpeedChoice(option.speed);
      });
      button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          setGameSpeedChoice(option.speed);
        }
      });
      controls._buttons.set(option.speed, button);
      controls.appendChild(button);
    });

    container._speedControls = controls;
    container.appendChild(controls);
    return controls;
  }

  function updatePauseButton() {
    const btn = document.getElementById('pause-button');
    if (!btn) {
      return;
    }
    btn.textContent = paused ? t('ui.common.resume', {}, 'Resume') : getPauseButtonLabel();
  }

  function updateSpeedControls() {
    const controls = getSpeedControls();
    if (!controls) {
      return;
    }
    controls.classList.remove('hidden');
    updatePauseMessage();
    const activeSpeed = paused ? 0 : gameSpeed;
    GAME_SPEED_OPTIONS.forEach(option => {
      const button = controls._buttons.get(option.speed);
      const hidden = gameSettings.disableSpeedControls && option.speed > 1;
      const active = option.speed === activeSpeed;
      button.hidden = hidden;
      button.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.setAttribute('aria-label', getGameSpeedOptionText(option));
    });
  }

  function updatePauseMessage() {
    const container = document.getElementById('pause-container');
    if (!container) {
      return;
    }
    let pauseMessage = container._pauseMessage;
    if (!pauseMessage) {
      return;
    }
    if (pauseMessage.parentNode) {
      pauseMessage.remove();
    }
  }

  function applyPauseState(nextPaused) {
    paused = nextPaused;
    window.manualPause = paused;
    setGameSpeed(paused ? 0 : lastActiveGameSpeed);
    updatePauseButton();
    updateSpeedControls();
    updateRender(true);
  }

  function applySpeedControlsSetting() {
    if (gameSettings.disableSpeedControls) {
      lastActiveGameSpeed = 1;
      if (!paused) {
        setGameSpeed(1);
      }
    }
    updateSpeedControls();
  }

  function setGameSpeedChoice(speed) {
    if (speed === 0) {
      applyPauseState(true);
      return;
    }
    lastActiveGameSpeed = gameSettings.disableSpeedControls ? 1 : speed;
    applyPauseState(false);
  }

  function togglePause(){
    applyPauseState(!paused);
  }

  function isGamePaused(){
    return paused;
  }

  function initializeGameSpeedControls() {
    getSpeedControls();
    updateSpeedControls();
  }

  if (!pauseKeyHandlerAttached) {
    document.addEventListener('keydown', handlePauseHotkey);
    document.addEventListener('keydown', handleDialogueSkipHotkey);
    pauseKeyHandlerAttached = true;
  }

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { togglePause, isGamePaused, getPauseKeybindDisplay, getPauseKeybindCode, setPauseKeybindCode, getDialogueSkipKeybindDisplay, getDialogueSkipKeybindCode, setDialogueSkipKeybindCode, initializeGameSpeedControls, setGameSpeedChoice, updateSpeedControls, applySpeedControlsSetting, DEFAULT_PAUSE_KEYBIND_CODE, DEFAULT_DIALOGUE_SKIP_KEYBIND_CODE };
  } else {
    window.togglePause = togglePause;
    window.isGamePaused = isGamePaused;
    window.getPauseKeybindDisplay = getPauseKeybindDisplay;
    window.getPauseKeybindCode = getPauseKeybindCode;
    window.setPauseKeybindCode = setPauseKeybindCode;
    window.getDialogueSkipKeybindDisplay = getDialogueSkipKeybindDisplay;
    window.getDialogueSkipKeybindCode = getDialogueSkipKeybindCode;
    window.setDialogueSkipKeybindCode = setDialogueSkipKeybindCode;
    window.initializeGameSpeedControls = initializeGameSpeedControls;
    window.setGameSpeedChoice = setGameSpeedChoice;
    window.updateSpeedControls = updateSpeedControls;
    window.applySpeedControlsSetting = applySpeedControlsSetting;
    window.DEFAULT_PAUSE_KEYBIND_CODE = DEFAULT_PAUSE_KEYBIND_CODE;
    window.DEFAULT_DIALOGUE_SKIP_KEYBIND_CODE = DEFAULT_DIALOGUE_SKIP_KEYBIND_CODE;
  }
})();
