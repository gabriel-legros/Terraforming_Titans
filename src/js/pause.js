(function(){
  let paused = false;
  let pauseKeyHandlerAttached = false;
  const DEFAULT_PAUSE_KEYBIND_CODE = 'Space';
  let pauseKeybindCode = DEFAULT_PAUSE_KEYBIND_CODE;

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    const tagName = target.tagName;
    return tagName === 'INPUT'
      || tagName === 'TEXTAREA'
      || tagName === 'SELECT'
      || target.isContentEditable;
  }

  function formatPauseKeybindFromCode(code) {
    if (!code) {
      return 'Spacebar';
    }
    if (code === 'Space') {
      return 'Spacebar';
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
    return formatPauseKeybindFromCode(getPauseKeybindCode());
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

  function getPauseButtonLabel() {
    return t('ui.settings.pauseButtonLabel', { keybind: getPauseKeybindDisplay() }, `Pause (${getPauseKeybindDisplay()})`);
  }

  function togglePause(){
    paused = !paused;
    if (typeof window !== 'undefined') {
      window.manualPause = paused;
    }
    const btn = typeof document !== 'undefined' ? document.getElementById('pause-button') : null;
    const alertBox = typeof document !== 'undefined' ? document.getElementById('pause-container') : null;
    if(typeof setGameSpeed === 'function'){
      setGameSpeed(paused ? 0 : 1);
    }
    if(paused){
      if(btn){ btn.textContent = 'Resume'; }
      if(alertBox){ alertBox.innerHTML = '<div class="pause-message">PAUSED</div>'; }
      if (typeof updateRender === 'function') {
        updateRender(true);
      }
    } else {
      if(btn){ btn.textContent = getPauseButtonLabel(); }
      if(alertBox){ alertBox.innerHTML = ''; }
      if (typeof updateRender === 'function') {
        updateRender(true);
      }
    }
  }

  function isGamePaused(){
    return paused;
  }

  if (!pauseKeyHandlerAttached) {
    document.addEventListener('keydown', handlePauseHotkey);
    pauseKeyHandlerAttached = true;
  }

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { togglePause, isGamePaused, getPauseKeybindDisplay, getPauseKeybindCode, setPauseKeybindCode, DEFAULT_PAUSE_KEYBIND_CODE };
  } else {
    window.togglePause = togglePause;
    window.isGamePaused = isGamePaused;
    window.getPauseKeybindDisplay = getPauseKeybindDisplay;
    window.getPauseKeybindCode = getPauseKeybindCode;
    window.setPauseKeybindCode = setPauseKeybindCode;
    window.DEFAULT_PAUSE_KEYBIND_CODE = DEFAULT_PAUSE_KEYBIND_CODE;
  }
})();
