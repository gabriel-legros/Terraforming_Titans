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
      "textSpeedMultiplier": 1.5
    },
    objectives: [],
    reward: [],
    rewardDelay: 500
  }
);

try {
  module.exports = progressEarth;
} catch (err) {}
