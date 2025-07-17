(function(){
  let paused = false;

  function togglePause(){
    paused = !paused;
    globalThis.manualPause = paused;
    const btn = typeof document !== 'undefined' ? document.getElementById('pause-button') : null;
    const alertBox = typeof document !== 'undefined' ? document.getElementById('pause-container') : null;
    if(typeof setGameSpeed === 'function'){
      setGameSpeed(paused ? 0 : 1);
    }
    if(paused){
      if(globalThis.game && game.scene){
        game.scene.pause('mainScene');
      }
      if(btn){ btn.textContent = 'Resume'; }
      if(alertBox){ alertBox.innerHTML = '<div class="pause-message">PAUSED</div>'; }
    } else {
      if(globalThis.game && game.scene){
        game.scene.resume('mainScene');
      }
      if(btn){ btn.textContent = 'Pause'; }
      if(alertBox){ alertBox.innerHTML = ''; }
    }
  }

  function isGamePaused(){
    return paused;
  }

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { togglePause, isGamePaused };
  } else {
    globalThis.togglePause = togglePause;
    globalThis.isGamePaused = isGamePaused;
  }
})();
