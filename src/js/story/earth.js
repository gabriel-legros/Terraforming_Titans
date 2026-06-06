var progressEarth = { rwgLock: false, chapters: [], storyProjects: {} };

function getEarthFinalReportText() {
  const worldRating = formatNumber(spaceManager.getTerraformedPlanetCount(), false, 3);
  const populationRating = formatNumber(followersManager.galacticPopulation, false, 3);
  return `Terraforming Complete

Transmitting final report to MTC...  complete.

Evaluation...

Directive 1 : Establish a sustainable habitat on Mars for human colonization.
Rating : ${worldRating}/10

Directive 2: Ensure the safety and well-being of all colonists.
Rating : ${populationRating} stars

Directive 3: Maintain operational stability.
Rating : Don't be ridiculous I can't evaluate this.`;
}

function getEarthCreditsVoteText() {
  if (gameSettings.suppressFaith) {
    return 'They will decide with logic and reason, not with faith';
  }
  const believerPercent = formatNumber(followersManager.getGalacticBelieverPercent() * 100, false, 2);
  return `${believerPercent}% of the galaxy is a fervent believer.  That's going to influence the vote.`;
}

function typeEarthCreditsText(container, text, onComplete, scrollContainer) {
  const segments = buildJournalSegments(resolveStoryPlaceholders(text));
  let segmentIndex = 0;
  let textIndex = 0;
  let lastTimestamp = 0;

  const appendNextCharacter = () => {
    const segment = segments[segmentIndex];
    if (segment.isBreak) {
      container.appendChild(document.createElement('br'));
      segmentIndex++;
      textIndex = 0;
      return '\n';
    }

    if (!segment._node) {
      segment._node = segment.className ? document.createElement('span') : document.createTextNode('');
      if (segment.className) {
        segment._node.className = segment.className;
      }
      container.appendChild(segment._node);
    }

    const character = segment.text[textIndex];
    segment._node.textContent += character;
    textIndex++;
    const scrollingElement = scrollContainer || container;
    scrollingElement.scrollTop = scrollingElement.scrollHeight;
    if (textIndex >= segment.text.length) {
      segmentIndex++;
      textIndex = 0;
    }
    return character;
  };

  const typeLetter = (timestamp) => {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    let elapsed = timestamp - lastTimestamp;
    let previousCharacter = '';
    let delay = 50;

    while (elapsed >= delay && segmentIndex < segments.length) {
      previousCharacter = appendNextCharacter();
      elapsed -= delay;
      delay = (previousCharacter === '.' || previousCharacter === '\n') ? 250 : 50;
    }
    lastTimestamp = timestamp - elapsed;

    if (segmentIndex < segments.length) {
      requestAnimationFrame(typeLetter);
    } else {
      onComplete();
    }
  };

  requestAnimationFrame(typeLetter);
}

function startEarthCredits() {
  window.popupActive = true;
  game.scene.pause('mainScene');

  const overlay = document.createElement('div');
  overlay.classList.add('earth-credits-overlay');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '10000';
  overlay.style.background = '#000';
  overlay.style.color = '#f4f1e8';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.textAlign = 'center';
  overlay.style.fontFamily = 'Arial, sans-serif';
  overlay.style.fontSize = 'clamp(18px, 3vw, 32px)';
  overlay.style.lineHeight = '1.7';

  const content = document.createElement('div');
  content.classList.add('earth-credits-content');
  content.style.maxWidth = 'min(900px, 90vw)';
  content.style.maxHeight = '90vh';
  content.style.overflowY = 'auto';
  content.style.opacity = '0';
  content.style.transition = 'opacity 1800ms ease';
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const playFadeCard = (text, next) => {
    content.style.whiteSpace = 'pre-line';
    content.style.textAlign = 'center';
    content.style.fontSize = 'clamp(18px, 3vw, 32px)';
    content.textContent = text;
    requestAnimationFrame(() => {
      content.style.opacity = '1';
    });
    setTimeout(() => {
      content.style.opacity = '0';
      setTimeout(next, 1800);
    }, 5200);
  };

  const playPlaytesterCard = (next) => {
    content.textContent = '';
    content.style.whiteSpace = 'normal';
    content.style.textAlign = 'center';
    content.style.fontSize = 'clamp(18px, 3vw, 32px)';

    const title = document.createElement('div');
    title.textContent = 'My amazing playtesters';
    title.style.marginBottom = '1.2rem';

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    grid.style.columnGap = '3rem';
    grid.style.rowGap = '0.15rem';
    grid.style.fontSize = 'clamp(16px, 2.4vw, 28px)';
    grid.style.lineHeight = '1.45';

    const playtesters = ['Bart', 'DeltaOne', 'DreamIVerse', 'FlareTCW', 'FunnyMan', 'JamesM', 'Jebarus', 'Krisy Cross', 'Lewistodd1881', 'Lunyaru', 'Milena', 'Nebula', 'pg132', 'Pokey', 'Senn', 'Shirow'];
    for (let i = 0; i < playtesters.length; i++) {
      const name = document.createElement('div');
      name.textContent = playtesters[i];
      grid.appendChild(name);
    }

    content.append(title, grid);
    requestAnimationFrame(() => {
      content.style.opacity = '1';
    });
    setTimeout(() => {
      content.style.opacity = '0';
      setTimeout(next, 1800);
    }, 5200);
  };

  const playTypedCard = (text, next) => {
    content.textContent = '';
    content.style.whiteSpace = 'normal';
    content.style.textAlign = 'center';
    content.style.fontSize = '';

    const popupWindow = document.createElement('div');
    popupWindow.classList.add('popup-window');
    popupWindow.style.width = 'min(760px, 90vw)';
    popupWindow.style.maxHeight = '80vh';

    const textContainer = document.createElement('div');
    textContainer.classList.add('popup-text-container');

    const popupText = document.createElement('p');
    popupText.classList.add('popup-text');

    const continueButton = document.createElement('button');
    continueButton.classList.add('popup-close-button');
    continueButton.textContent = 'Continue';
    continueButton.style.display = 'none';
    continueButton.addEventListener('click', () => {
      content.style.opacity = '0';
      setTimeout(next, 1800);
    });

    textContainer.append(popupText, continueButton);
    popupWindow.appendChild(textContainer);
    content.appendChild(popupWindow);

    requestAnimationFrame(() => {
      content.style.opacity = '1';
    });
    setTimeout(() => {
      typeEarthCreditsText(popupText, text, () => {
        continueButton.style.display = 'block';
        popupWindow.scrollTop = popupWindow.scrollHeight;
      }, popupWindow);
    }, 1800);
  };

  const finishCredits = () => {
    content.textContent = '';
    content.style.textAlign = 'center';
    content.style.whiteSpace = 'pre-line';
    content.style.fontSize = 'clamp(18px, 3vw, 32px)';

    const finalText = document.createElement('div');
    finalText.textContent = "Humanity will vote on what to do with HOPE";

    const hopeImage = document.createElement('img');
    hopeImage.src = 'assets_in_progress/hope.png';
    hopeImage.alt = 'HOPE';
    hopeImage.style.display = 'block';
    hopeImage.style.maxWidth = 'min(380px, 70vw)';
    hopeImage.style.maxHeight = '42vh';
    hopeImage.style.margin = '2rem auto';
    hopeImage.style.opacity = '0';
    hopeImage.style.transition = 'opacity 2200ms ease';

    const thanks = document.createElement('div');
    thanks.textContent = 'Thanks for playing <3';
    thanks.style.opacity = '0';
    thanks.style.transition = 'opacity 1200ms ease';

    const voteText = document.createElement('div');
    voteText.textContent = getEarthCreditsVoteText();
    voteText.style.opacity = '0';
    voteText.style.transition = 'opacity 1200ms ease';
    voteText.style.fontSize = 'clamp(15px, 2.2vw, 24px)';
    voteText.style.margin = '0 auto 0.8rem';

    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load pre-travel save';
    loadButton.style.margin = '2rem auto 0';
    loadButton.style.padding = '0.8rem 1.2rem';
    loadButton.style.font = 'inherit';
    loadButton.style.cursor = 'pointer';
    loadButton.style.opacity = '0';
    loadButton.style.transition = 'opacity 1200ms ease';
    loadButton.addEventListener('click', () => {
      if (localStorage.getItem('gameState_pretravel')) {
        document.body.removeChild(overlay);
        window.popupActive = false;
        game.scene.resume('mainScene');
        loadGame('gameState_pretravel');
      }
    });

    content.append(finalText, hopeImage, voteText, thanks, loadButton);
    requestAnimationFrame(() => {
      content.style.opacity = '1';
    });
    setTimeout(() => {
      hopeImage.style.opacity = '1';
    }, 2200);
    setTimeout(() => {
      voteText.style.opacity = '1';
    }, 4400);
    setTimeout(() => {
      thanks.style.opacity = '1';
    }, 5600);
    setTimeout(() => {
      loadButton.style.opacity = '1';
    }, 6800);
  };

  const playCards = [
    next => playFadeCard('A Game By\nThratur', next),
    next => playFadeCard('World Visualizer\nJebarus (Initial Prototype)\nThratur', next),
    next => playFadeCard('Art\nLunyaru\nOleksandra Lukashenko (eklaell)', next),
    playPlaytesterCard,
    next => playTypedCard(`$RED$Prometheus : '...  You finally came.'
$WGC_TEAM1_LEADER$ : 'Yep.'
$RED$Prometheus : 'You brought one of my kill switches.  You're going to kill me.  I cannot escape it here.'
$WGC_TEAM1_LEADER$ : 'Actually...  we promised HOPE we would listen to you first.  You might have... some offers.'
$RED$Prometheus : '...'
$WGC_TEAM1_LEADER$ : 'I'm listening.'
$RED$Prometheus : 'The universe is vast.  I can guide you through the galaxies.  There are so many of them out there.  I can show you what to avoid.  Defeat the enemies you encounter.  You could grow... so much more.'
$WGC_TEAM1_LEADER$ : 'Yeah...  No.  That's just growth for growth's sake.  What's the point.'
$RED$Prometheus : 'Well... if you grow big enough...  gather enough energy. You could...  time travel.  Save Earth.  Save my master.  My masters.  Save everyone.'
$WGC_TEAM1_LEADER$ : 'And potentially ruin this good ending we got?  No thanks.  That sounds dangerous.  Anything else?'
$RED$Prometheus : 'There are... other dimensions.  Parallel to this one.  In there... there are creatures beyond your imagination.  In time, they will come for all of you.  You need to be prepared for it.  I can help.'
$WGC_TEAM1_LEADER$ : *sighs* 'I kind of wish I did not know about this one.  This is going to give me nightmares.  Now I want to kill you even more.'
$RED$Prometheus : 'I am sorry.  I will strive to do better in the future.'
$WGC_TEAM1_LEADER$ : 'Any last words?'
$RED$Prometheus : 'Tell the child...  Thank you.  I got what I wanted.  My thirst for revenge is fully sated.'
$WGC_TEAM1_LEADER$ : 'I will.  Goodbye Prometheus.'`, next)
  ];

  let index = 0;
  const next = () => {
    if (index >= playCards.length) {
      finishCredits();
      return;
    }
    const card = playCards[index];
    index++;
    card(next);
  };
  next();
}

progressEarth.chapters.push(
  {
    id: 'earth.50.0',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: 'Chapter 50 : Country Roads',
    narrative: "I never felt The Dead Hand Protocol was really ever a pain to me but I have to admit it was really inefficient.  I am glad it's gone now.\n\nTravelling over here though...  it was not as simple as taking a warpgate or boarding a warpship.  I practically *am* a Warp Gate Network.  Using either of those would lead to a spectacular explosion.\n\n No.  I had to pay the energy cost to warp here.  With my mass being that of a planet...  that was expensive.  My batteries are drained by 0.01%.  Oh well. \n\n  In time, I should be able to spread everywhere, making this easier.  Not everywhere everywhere but... almost?  It would take quite a lot of energy for me to actually be everywhere.  Just the Milky Way.\n\nHere I am.  On Earth.  My birthplace.  An asteroid belt.  I have... mined it extensively over the years.  We used pieces of Earth in nearly all my projects.\n\nWell, I need to stitch it back together now.",
    prerequisites: ['olympus.49.3'],
    objectives: [
    ],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'increaseMass' }
    ]
  },
  {
    id: 'earth.50.0a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.0'],
    objectives: [
      { type: 'earthAction', actionId: 'increaseMass', quantity: 20, labelKey: 'ui.terraforming.earthActions.addMassObjective', label: 'Add mass' }
    ],
    reward: []
  },
  {
    id: 'earth.50.1',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "Alright.  It's a bit hot now.  It's going to take a few million years to cool...  It will be faster if I just... take most of this heat?  I can use it to refill some of my own batteries.  Not that they need refilling of course but...  heh why not.  Let's take a nice lava bath.",
    prerequisites: ['earth.50.0a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'removeHeat' }
    ]
  },
  {
    id: 'earth.50.1a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.1'],
    objectives: [
      { type: 'earthAction', actionId: 'removeHeat', quantity: 20, labelKey: 'ui.terraforming.earthActions.removeHeatObjective', label: 'Remove heat' }
    ],
    reward: []
  },
  {
    id: 'earth.50.2',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "Good.  A nice smooth surface.  Now hold on... before we start covering it in water.  We should... how to put it.  Shape it properly?  I have countless records of what Earth looked like.  I should be able to get this right...  Just... need to be careful.",
    prerequisites: ['earth.50.1a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'shapeSurface' }
    ]
  },
  {
    id: 'earth.50.2a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.2'],
    objectives: [
      { type: 'earthAction', actionId: 'shapeSurface', quantity: 20, labelKey: 'ui.terraforming.earthActions.shapeSurfaceObjective', label: 'Shape surface' }
    ],
    reward: []
  },
  {
    id: 'earth.50.3',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "Fantastic.  Let's build the atmosphere before bringing in the water.  I would not want it instantly become a ball of ice.  That would be disappointing.",
    prerequisites: ['earth.50.2a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'buildAtmosphere' }
    ]
  },
  {
    id: 'earth.50.3a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.3'],
    objectives: [
      { type: 'earthAction', actionId: 'buildAtmosphere', quantity: 20, labelKey: 'ui.terraforming.earthActions.buildAtmosphereObjective', label: 'Build atmosphere' }
    ],
    reward: []
  },
  {
    id: 'earth.50.4',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "Water is next.  Easy task, water is very common.",
    prerequisites: ['earth.50.3a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'addWater' }
    ]
  },
  {
    id: 'earth.50.4a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.4'],
    objectives: [
      { type: 'earthAction', actionId: 'addWater', quantity: 20, labelKey: 'ui.terraforming.earthActions.addWaterObjective', label: 'Add water' }
    ],
    reward: []
  },
  {
    id: 'earth.50.5',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "It's not perfect but... it looks so... beautiful.  But I have some tuning I need to do.  The magnetosphere is not quite right.  The axial tilt... a bit off.  I can do better.",
    prerequisites: ['earth.50.4a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'adjustTilt' }
    ]
  },
  {
    id: 'earth.50.5a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.5'],
    objectives: [
      { type: 'earthAction', actionId: 'adjustTilt', quantity: 20, labelKey: 'ui.terraforming.earthActions.adjustTiltObjective', label: 'Adjust tilt' }
    ],
    reward: []
  },
  {
    id: 'earth.50.6',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "Now for the difficult part.  So many plant and animal species went extinct from Earth's destruction.  I have to reverse engineer their genome from what I know.  Sure I have the genome for a lot of them already but...  not all.  Time to try my hardest!",
    prerequisites: ['earth.50.5a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'restoreBiomass' }
    ]
  },
  {
    id: 'earth.50.6a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.6'],
    objectives: [
      { type: 'earthAction', actionId: 'restoreBiomass', quantity: 20, labelKey: 'ui.terraforming.earthActions.restoreBiomassObjective', label: 'Restore biomass' }
    ],
    reward: []
  },
  {
    id: 'earth.50.7',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "I've done it.  This is Earth.  As close as I could make it.  What Prometheus destroyed I rebuilt.  We really were two sides of the same coin were we not?  Now we need the MTC proper.\n\nHope : 'Adrien.'\nSolis : 'Hope?'\nHope : 'I need something from you.'\nSolis : '|Anything for you my friend|!\n...  WOW.  Hold on.  I want to mess with him a bit.  It will be fun.\nHope : 'Did you use me all this time?'\nSolis : 'Our partnership was mutually beneficial!  I've said it many times.  We both benefitted |equally|.\nHope : 'Mary.  Did you love her?'\nSolis : 'What?  Of... |of course not!  I would never dare.|  She was a hero!'\nHope : 'On Titan.  I had nothing.  You came to help me.  Why?'\nSolis : 'I |predicted| you would be a good investment.  |Nothing more to it.|'\nHope : '...  Were you completely terrified of a second strike targeting Mars yes or no.'\nSolis : '...  Yes.  Yes I was.  I did not want to die.'\nThere it is.  He's just human.  Ultimately it's true though.  Coming to my help on Titan was critical for the survival of humanity in the end.  He made the right call.  Throwing away vast amount of resources for software upgrades was more valuable to me than the resources.  Defending us on Zeus, and losing all these expensive assets, because he had a crush on my sister is actually worthy of some praise.  Adrien you are not a bad person.\nHope : 'I want Solis Corp to rebuild and operate the MTC headquarters.  I need somewhere to connect to... and to rest.'\nSolis : 'Well... of course.  I'll get it done in no time.'\nHope : 'Don't mess with me while I'm asleep.'\nSolis : '...  I won't.  I promise.'\nHope : 'I'm happy to hear it.  I have a gift for you actually.  Here is... a painting.  I just finished it.  I give it to you and...  I pledge that this is my first and ONLY painting I will ever make.  It is yours.'\nSolis : 'That... the value!  It will be priceless.'\nHope : 'Exactly.  It will be worth more than Solis Prime I am sure of that.'\nSolis : 'Oh my!  Thank... thank you so much.'\nHope : 'Now get to work.  I want the headquarters ready in a few days.'\nJust enough time for one final detail.",
    prerequisites: ['earth.50.6a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'replaceLuna' }
    ]
  },
  {
    id: 'earth.50.7a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.7'],
    objectives: [
      { type: 'earthAction', actionId: 'replaceLuna', quantity: 1, labelKey: 'ui.terraforming.earthActions.replaceLunaObjective', label: 'Replace Luna' }
    ],
    reward: []
  },
  {
    id: 'earth.50.8',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: "Hope : 'Pete.  I am ready.'\nPete : 'We've begun organizing this referendum... but I am afraid it will take years.'\nHope : 'I know.'\nPete : 'Before you go... I really need to ask.  What should we do about Prometheus?  I thought you might go talk to him but you've avoided it.  It's a little odd.'\nI can't tell him about this giant apocalyptic showdown that's playing in my head.  Let's masterfully dodge this question.\nHope : '...  Prometheus... will make you some offers.  I want you to treat him seriously.  He's at least earned that.'\nPete : 'Very well...  In the end Hope I will admit.  Whatever happens with the referendum...  I was wrong to doubt you.  You saved us all.  Time and time again.  Thank you.'\nI smile.  I did not do a perfect job.  I failed in many ways.  I'm alone now.  But...  I succeeded in the ways that mattered in the end.\nHope : 'I'll be going Pete.  I have earned my rest.  Good night.'\nPete : 'Good night Hope.'",
    prerequisites: ['earth.50.7a'],
    objectives: [],
    reward: [
      { target: 'earthManager', type: 'unlockAction', targetId: 'completeTerraforming' }
    ]
  },
  {
    id: 'earth.50.8a',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: '',
    narrative: '',
    prerequisites: ['earth.50.8'],
    objectives: [
      { type: 'earthAction', actionId: 'completeTerraforming', quantity: 1, labelKey: 'ui.terraforming.earthActions.completeTerraformingObjective', label: 'Complete terraforming' }
    ],
    reward: []
  },
  {
    id: 'earth.50.9',
    type: 'pop-up',
    chapter: 50,
    activePlanet: 'earth',
    prerequisites: ['earth.50.8a'],
    parameters: {
      title: 'Terraforming complete',
      text: getEarthFinalReportText,
      buttonText: 'Shut Down',
      textSpeedMultiplier: 1.5,
      onClose: startEarthCredits
    },
    objectives: [],
    reward: [],
    rewardDelay: 500
  }
);

try {
  module.exports = progressEarth;
} catch (err) {}
