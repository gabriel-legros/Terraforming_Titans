(function(){
  function setGameSpeed(speed){
    const value = Number(speed);
    if(isNaN(value) || value < 0){
      console.warn('setGameSpeed expects a non-negative number');
      return;
    }
    if(typeof gameSpeed !== 'undefined'){
      gameSpeed = value;
    }
  }

  function getGameSpeed(){
    return typeof gameSpeed !== 'undefined' ? gameSpeed : 1;
  }

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { setGameSpeed, getGameSpeed };
  } else {
    globalThis.setGameSpeed = setGameSpeed;
    globalThis.getGameSpeed = getGameSpeed;
  }
})();
