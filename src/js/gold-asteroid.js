const goldenEffects = [
    {
        target: 'fundingModule',
        type: 'productionMultiplier',
        value : 5
    },
    {
        target: 'building',
        targetId: 'oreMine',
        type: 'productionMultiplier',
        value: 5
    },
    {
        target: 'building',
        targetId: 'componentFactory',
        type: 'productionMultiplier',
        value: 5
    },
    {
        target: 'building',
        targetId: 'electronicsFactory',
        type: 'productionMultiplier',
        value: 5
    },
    {
      target: 'population',
      type: 'growthMultiplier',
      value: 5
  },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'funding',
        flagId: 'golden',
        value: true
    },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'metal',
        flagId: 'golden',
        value: true
    },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'components',
        flagId: 'golden',
        value: true
    },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'electronics',
        flagId: 'golden',
        value: true
    },   
    {
      type: 'booleanFlag',
      target: 'resource',
      resourceType: 'colony',
      targetId: 'colonists',
      flagId: 'golden',
      value: true
  }
]

class GoldenAsteroid {
    constructor() {
        this.element = null;
        this.active = false;
        this.duration = 0;
        this.spawnTime = 0;
        this.minSpawnInterval = 300000; // Minimum spawn interval in milliseconds (5 minutes)
        this.maxSpawnInterval = 900000; // Maximum spawn interval in milliseconds (15 minutes)
        this.lastSpawnTime = 0;
        this.nextSpawnTime = 0;
        this.generateNextSpawnTime();
        this.countdownElement = null;
        this.countdownDuration = 30000; // 30 seconds in milliseconds
        this.countdownStartTime = 0;
        this.countdownActive = false; // New flag to track countdown state
        }
  
    spawn(duration) {
        if (!this.active) {
          this.active = true;
          this.duration = duration;
          this.spawnTime = Date.now();

          this.element = document.createElement('img');
          this.element.className = 'golden-asteroid';
          this.element.src = 'assets/images/asteroid.png';
          this.element.draggable = false;

          const clickHandler = this.onClick.bind(this);
          this.element.addEventListener('mousedown', clickHandler);
          this.element.addEventListener('touchstart', clickHandler);
          this.element.addEventListener('dragstart', clickHandler);

          const gameContainer = document.getElementById('game-container');

        this.element.onload = () => {
            if (!this.element) return; // Element may have been removed before load
            const width = this.element.width;
            const height = this.element.height;
            const containerWidth = gameContainer.clientWidth;
            const containerHeight = Math.min(gameContainer.clientHeight, 800);
            const x = Math.random() * (containerWidth - width);
            const y = Math.random() * (containerHeight - height);
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
          };

          gameContainer.appendChild(this.element);
    }
  }

    onClick(event) {
    if (event) {
        event.preventDefault();
    }
    if (this.active) {
        console.log('Clicked golden asteroid!');
        this.addEffects();
        this.startCountdown(this.countdownDuration);
        this.despawn();
        }
    }

    startCountdown(duration) {
      this.countdownRemainingTime = duration;
      if(!this.countdownElement){
        this.countdownElement = document.createElement('div');
        this.countdownElement.className = 'gold-asteroid-countdown';
        document.getElementById('gold-asteroid-container').appendChild(this.countdownElement);
      }
      this.countdownActive = true;
    }
  
    despawn() {
      this.active = false;
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
    }
  
    update(delta) {
        if (this.active) {
          this.duration -= delta;
          if (this.duration <= 0) {
            this.despawn();
          }
        } else {
          this.lastSpawnTime += delta;
    
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
            this.countdownElement.textContent = `Gold asteroid 5x multiplier! ${seconds}s`;
          } else {
            this.removeEffects();
            this.countdownActive = false;
            if (this.countdownElement) {
              this.countdownElement.remove();
              this.countdownElement = null;
            }
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
        };
      }
    
    loadState(data) {
      this.despawn();
      this.removeEffects();

      // Remove any leftover DOM elements from previous instances
      const container = document.getElementById('gold-asteroid-container');
      if (container) {
        const staleCountdown = container.querySelector('.gold-asteroid-countdown');
        if (staleCountdown) {
          staleCountdown.remove();
        }
      }
      this.countdownElement = null;

      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        const staleAsteroid = gameContainer.querySelector('.golden-asteroid');
        if (staleAsteroid) {
          staleAsteroid.remove();
        }
      }

      this.active = data.active;
      this.duration = data.duration;
      this.spawnTime = data.spawnTime;
      this.countdownActive = data.countdownActive;
      this.countdownRemainingTime = data.countdownRemainingTime;
      this.lastSpawnTime = 0;
      this.generateNextSpawnTime();

      if (this.countdownActive) {
        this.addEffects();
        this.startCountdown(this.countdownRemainingTime);
      }
    }
  }
