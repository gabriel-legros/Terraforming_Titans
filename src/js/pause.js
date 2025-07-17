(function(){
  let paused = false;

  function togglePause(){
    paused = !paused;
    globalThis.manualPause = paused;
    const btn = typeof document !== 'undefined' ? document.getElementById('pause-button') : null;
    if(typeof setGameSpeed === 'function'){
      setGameSpeed(paused ? 0 : 1);
    }
    if(paused){
      if(globalThis.game && game.scene){
        game.scene.pause('mainScene');
      }
      if(btn){ btn.textContent = 'Resume'; }
    } else {
      if(globalThis.game && game.scene){
        game.scene.resume('mainScene');
      }
      if(btn){ btn.textContent = 'Pause'; }
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
