var progressEarth = { rwgLock: false, chapters: [], storyProjects: {} };

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
    narrative: "Alright.  It's a bit hot now.  It's going to take a few million years to cool...  It will be faster if I just... take most of this heat?  I can use it to refill it some of my own batteries.  Not that they need refilling of course but...  heh why not.  Let's take a nice lava bath.",
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
  }
);

try {
  module.exports = progressEarth;
} catch (err) {}
