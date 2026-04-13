(function(){
  let paused = false;
  let pauseKeyHandlerAttached = false;

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    const tagName = target.tagName;
    return tagName === 'INPUT'
      || tagName === 'TEXTAREA'
      || tagName === 'SELECT'
      || target.isContentEditable;
  }

  function handlePauseHotkey(event) {
    if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    event.preventDefault();
    togglePause();
  }

  function getPauseButtonLabel() {
    return t('ui.common.pause', {}, 'Pause (Spacebar)');
  }

  function togglePause(){
    paused = !paused;
    globalThis.manualPause = paused;
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
    module.exports = { togglePause, isGamePaused };
  } else {
    globalThis.togglePause = togglePause;
    globalThis.isGamePaused = isGamePaused;
  }
})();
