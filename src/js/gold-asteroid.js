const goldenEffectPrefix = 'goldenAsteroid';
function getGlobalGoldenAsteroidDurationBonusMs() {
  if (!globalEffects || !globalEffects.activeEffects) {
    return 0;
  }
  let bonus = 0;
  for (let i = 0; i < globalEffects.activeEffects.length; i += 1) {
    const effect = globalEffects.activeEffects[i];
    if (effect.type === 'goldenAsteroidDurationBonusMs') {
      bonus += effect.value || 0;
    }
  }
  return bonus;
}

const goldenEffects = [
  {
    effectId: `${goldenEffectPrefix}-fundingModuleMultiplier`,
    target: 'fundingModule',
    type: 'productionMultiplier',
    value: 5,
    name: t('ui.goldAsteroid.effectName', {}, 'Golden Asteroid')
  },
  {
    effectId: `${goldenEffectPrefix}-oreMineMultiplier`,
    target: 'building',
    targetId: 'oreMine',
    type: 'productionMultiplier',
    value: 5,
    name: t('ui.goldAsteroid.effectName', {}, 'Golden Asteroid')
  },
  {
    effectId: `${goldenEffectPrefix}-foundryMultiplier`,
    target: 'building',
    targetId: 'foundry',
    type: 'resourceProductionMultiplier',
    resourceCategory: 'colony',
    resourceTarget: 'metal',
    value: 5,
    name: t('ui.goldAsteroid.effectName', {}, 'Golden Asteroid')
  },
  {
    effectId: `${goldenEffectPrefix}-componentFactoryMultiplier`,
    target: 'building',
    targetId: 'componentFactory',
    type: 'productionMultiplier',
    value: 5,
    name: t('ui.goldAsteroid.effectName', {}, 'Golden Asteroid')
  },
  {
    effectId: `${goldenEffectPrefix}-electronicsFactoryMultiplier`,
    target: 'building',
    targetId: 'electronicsFactory',
    type: 'productionMultiplier',
    value: 5,
    name: t('ui.goldAsteroid.effectName', {}, 'Golden Asteroid')
  },
  {
    effectId: `${goldenEffectPrefix}-populationGrowth`,
    target: 'population',
    type: 'growthMultiplier',
    value: 5
  },
  ...createResourceFlagEffects('colony', ['funding', 'metal', 'components', 'electronics', 'colonists'], 'golden', goldenEffectPrefix)
]

class GoldenAsteroid {
    constructor() {
        this.buttonElement = null;
        this.imageElement = null;
        this.clickHandler = this.onClick.bind(this);
        this.pendingImagePosition = false;
        this.active = false;
        this.duration = 0;
        this.spawnTime = 0;
        this.minSpawnInterval = 300000; // Minimum spawn interval in milliseconds (5 minutes)
        this.maxSpawnInterval = 900000; // Maximum spawn interval in milliseconds (15 minutes)
        this.lastSpawnTime = 0;
        this.nextSpawnTime = 0;
        this.generateNextSpawnTime();
        this.countdownElement = null;
        this.countdownContainer = null;
        this.gameContainer = null;
        this.countdownDuration = 30000; // 30 seconds in milliseconds
        this.countdownStartTime = 0;
        this.countdownActive = false; // New flag to track countdown state
        this.celebrationActive = false;
        this.celebrationRemainingTime = 0;
        this.confettiContainer = null;
        this.confettiSpawnCarry = 0;
        this.cacheContainers();
        this.cacheElements();
        }

    cacheContainers() {
      if (!this.gameContainer || !this.gameContainer.isConnected) {
        this.gameContainer = document.getElementById('game-container');
      }
      if (!this.countdownContainer || !this.countdownContainer.isConnected) {
        this.countdownContainer = document.getElementById('gold-asteroid-container');
      }
    }

    cacheElements() {
      this.imageElement = this.imageElement?.isConnected ? this.imageElement : document.getElementById('golden-asteroid-image');
      this.buttonElement = this.buttonElement?.isConnected ? this.buttonElement : document.getElementById('golden-asteroid-button');
      this.countdownElement = this.countdownElement?.isConnected ? this.countdownElement : document.getElementById('gold-asteroid-countdown');
    }

    ensureButtonElement() {
      this.cacheElements();
      this.buttonElement ??= document.createElement('button');
      this.buttonElement.id = 'golden-asteroid-button';
      this.buttonElement.className = 'golden-asteroid-button';
      this.buttonElement.textContent = t('ui.goldAsteroid.button', {}, 'Golden Asteroid!');
      this.buttonElement.onmousedown = this.clickHandler;
      this.buttonElement.ontouchstart = this.clickHandler;
      if (this.buttonElement.parentElement !== this.countdownContainer) {
        this.countdownContainer.appendChild(this.buttonElement);
      }
      this.buttonElement.style.display = 'inline-block';
    }

    ensureImageElement() {
      this.cacheElements();
      this.imageElement ??= document.createElement('img');
      this.imageElement.id = 'golden-asteroid-image';
      this.imageElement.className = 'golden-asteroid';
      this.imageElement.src.includes('assets/images/asteroid.png') || (this.imageElement.src = 'assets/images/asteroid.png');
      this.imageElement.draggable = false;
      this.imageElement.onmousedown = this.clickHandler;
      this.imageElement.ontouchstart = this.clickHandler;
      this.imageElement.ondragstart = this.clickHandler;
      this.imageElement.onload = this.handleImageLoad.bind(this);
      if (this.imageElement.parentElement !== this.gameContainer) {
        this.gameContainer.appendChild(this.imageElement);
      }
      this.imageElement.style.display = 'block';
      if (this.pendingImagePosition && this.imageElement.complete) {
        this.positionImage();
        this.pendingImagePosition = false;
      }
    }

    handleImageLoad() {
      if (this.pendingImagePosition) {
        this.positionImage();
        this.pendingImagePosition = false;
      }
    }

    positionImage() {
      const width = this.imageElement.width;
      const height = this.imageElement.height;
      const containerWidth = this.gameContainer.clientWidth;
      const containerHeight = Math.min(this.gameContainer.clientHeight, 800);
      const maxX = Math.max(0, containerWidth - width);
      const maxY = Math.max(0, containerHeight - height);
      const x = Math.random() * maxX;
      const y = Math.random() * maxY;
      this.imageElement.style.left = `${x}px`;
      this.imageElement.style.top = `${y}px`;
    }

    hideAsteroidElements() {
      this.buttonElement?.style && (this.buttonElement.style.display = 'none');
      this.imageElement?.style && (this.imageElement.style.display = 'none');
    }

    ensureConfettiContainer() {
      if (!this.confettiContainer || !this.confettiContainer.isConnected) {
        this.confettiContainer = document.getElementById('golden-asteroid-confetti');
      }
      if (!this.confettiContainer) {
        this.confettiContainer = document.createElement('div');
        this.confettiContainer.id = 'golden-asteroid-confetti';
        this.confettiContainer.className = 'golden-asteroid-confetti';
        document.body.appendChild(this.confettiContainer);
      }
    }

    spawnConfettiBurst(count) {
      this.ensureConfettiContainer();
      const fragment = document.createDocumentFragment();
      const colors = ['#ffd700', '#ff4d6d', '#2ec4b6', '#3a86ff', '#fb8500', '#7bd88f', '#f72585', '#ffffff'];
      for (let i = 0; i < count; i += 1) {
        const piece = document.createElement('span');
        const size = 6 + Math.random() * 9;
        const duration = 3000 + Math.random() * 3500;
        piece.className = 'golden-asteroid-confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.width = `${size}px`;
        piece.style.height = `${size * (0.5 + Math.random())}px`;
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = `${duration}ms`;
        piece.style.animationDelay = `${Math.random() * 250}ms`;
        piece.style.setProperty('--confetti-drift', `${(Math.random() - 0.5) * 260}px`);
        piece.style.setProperty('--confetti-spin', `${360 + Math.random() * 1080}deg`);
        fragment.appendChild(piece);
        window.setTimeout(() => {
          piece.remove();
        }, duration + 500);
      }
      this.confettiContainer.appendChild(fragment);
    }

    updateConfetti(delta) {
      this.confettiSpawnCarry += delta;
      while (this.confettiSpawnCarry >= 100) {
        this.confettiSpawnCarry -= 100;
        this.spawnConfettiBurst(12);
      }
    }

    stopConfetti() {
      this.confettiSpawnCarry = 0;
      if (this.confettiContainer) {
        this.confettiContainer.remove();
        this.confettiContainer = null;
      }
    }

    startBirchWorldCelebration(duration = 30000) {
      this.celebrationActive = true;
      this.celebrationRemainingTime = duration;
      this.confettiSpawnCarry = 0;
      this.spawnConfettiBurst(180);
      this.despawn();
      this.spawn(duration);
    }
  
    spawn(duration = 5000) {
        if (!this.active) {
          this.active = true;
          this.duration = duration;
          this.spawnTime = Date.now();
          this.cacheContainers();
          this.cacheElements();
          
          if (gameSettings.simplifyGoldenAsteroid) {
            // Create a button in the countdown container
            if (!this.countdownContainer) {
              this.active = false;
              return;
            }
            this.imageElement?.style && (this.imageElement.style.display = 'none');
            this.ensureButtonElement();
          } else {
            // Original image-based asteroid
            if (!this.gameContainer) {
              this.active = false;
              return;
            }
            this.buttonElement?.style && (this.buttonElement.style.display = 'none');
            this.pendingImagePosition = true;
            this.ensureImageElement();
          }
    }
  }

    onClick(event) {
    if (event) {
        event.preventDefault();
    }
    if (this.active) {
        console.log('Clicked golden asteroid!');
        this.addEffects();
        this.startCountdown(this.countdownDuration + getGlobalGoldenAsteroidDurationBonusMs());
        this.despawn();
        if (this.celebrationActive && this.celebrationRemainingTime > 0) {
          this.spawn(this.celebrationRemainingTime);
        }
        }
    }

    startCountdown(duration, { extendExisting = true } = {}) {
      if (this.countdownActive && extendExisting) {
        this.countdownRemainingTime += duration;
      } else {
        this.countdownRemainingTime = duration;
      }
      this.cacheContainers();
      if (!this.countdownContainer) {
        return;
      }
      if (!this.countdownElement) {
        this.countdownElement = document.createElement('div');
        this.countdownElement.id = 'gold-asteroid-countdown';
        this.countdownElement.className = 'gold-asteroid-countdown';
        this.countdownContainer.appendChild(this.countdownElement);
      } else if (this.countdownElement.parentElement !== this.countdownContainer) {
        this.countdownContainer.appendChild(this.countdownElement);
      }
      this.countdownActive = true;
    }
  
    despawn() {
      this.active = false;
      this.hideAsteroidElements();
    }

    removeCountdownDisplay() {
      this.cacheElements();
      if (this.countdownElement && this.countdownElement.parentElement) {
        this.countdownElement.remove();
      }
      if (this.countdownElement) {
        this.countdownElement.textContent = '';
      }
    }

    resetForTravel() {
      this.removeEffects();
      this.despawn();
      this.countdownActive = false;
      this.countdownRemainingTime = 0;
      this.celebrationActive = false;
      this.celebrationRemainingTime = 0;
      this.stopConfetti();
      this.removeCountdownDisplay();
      this.lastSpawnTime = 0;
      this.generateNextSpawnTime();
    }
  
    update(delta, realDelta = delta) {
        updateResortVacationGoldButton();
        if (this.celebrationActive) {
          this.celebrationRemainingTime -= realDelta;
          if (this.celebrationRemainingTime > 0) {
            this.updateConfetti(realDelta);
            if (!this.active) {
              this.spawn(this.celebrationRemainingTime);
            }
          } else {
            this.celebrationActive = false;
            this.celebrationRemainingTime = 0;
            this.stopConfetti();
          }
        }

        if (this.active) {
          this.duration -= realDelta;
          if (this.duration <= 0) {
            this.despawn();
          }
        } else if (!this.celebrationActive) {
          this.lastSpawnTime += realDelta;
    
          if (this.lastSpawnTime >= this.nextSpawnTime) {
            const duration = 5000; // 5 seconds
            this.spawn(duration);
            this.lastSpawnTime = 0;
            this.generateNextSpawnTime();
          }
        }
    
        if (this.countdownActive) {
          this.countdownRemainingTime -= delta;
    
          if (this.countdownRemainingTime > 0) {
            const seconds = Math.ceil(this.countdownRemainingTime / 1000);
            this.countdownElement.textContent = t(
              'ui.goldAsteroid.countdown',
              { seconds },
              'Gold asteroid 5x multiplier! {seconds}s'
            );
          } else {
            this.removeEffects();
            this.countdownActive = false;
            this.removeCountdownDisplay();
          }
        }
      }

    generateNextSpawnTime() {
        const spawnInterval = Math.random() * (this.maxSpawnInterval - this.minSpawnInterval) + this.minSpawnInterval;
        this.nextSpawnTime = spawnInterval;
    }

    addEffects(){
        goldenEffects.forEach((effect) => {
            addEffect({...effect, sourceId: 'goldenAsteroid'})
          });
    }

    removeEffects(){
        goldenEffects.forEach((effect) => {
            removeEffect({...effect, sourceId: 'goldenAsteroid'})
          });
    }
  
    saveState() {
        return {
          active: this.active,
          duration: this.duration,
          spawnTime: this.spawnTime,
          countdownActive: this.countdownActive,
          countdownRemainingTime: this.countdownRemainingTime,
          celebrationActive: this.celebrationActive,
          celebrationRemainingTime: this.celebrationRemainingTime,
        };
      }
    
    loadState(data) {
      this.despawn();
      this.removeEffects();
      this.countdownActive = false;
      this.countdownRemainingTime = 0;
      this.celebrationActive = false;
      this.celebrationRemainingTime = 0;
      this.stopConfetti();
      this.cacheElements();
      this.removeCountdownDisplay();

      // Remove any leftover DOM elements from previous instances
      this.cacheContainers();
      this.cacheElements();
      this.hideAsteroidElements();

      this.active = data.active;
      this.duration = data.duration;
      this.spawnTime = data.spawnTime;
      this.countdownActive = data.countdownActive;
      this.countdownRemainingTime = data.countdownRemainingTime;
      this.celebrationActive = data.celebrationActive === true;
      this.celebrationRemainingTime = data.celebrationRemainingTime || 0;
      this.lastSpawnTime = 0;
      this.generateNextSpawnTime();

      if (this.countdownActive) {
        this.addEffects();
        this.startCountdown(this.countdownRemainingTime, { extendExisting: false });
      }
      if (this.celebrationActive && this.celebrationRemainingTime > 0) {
        this.active = false;
        this.spawnConfettiBurst(180);
        this.spawn(this.celebrationRemainingTime);
      }
    }
  }
