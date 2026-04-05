var progressStyx = { rwgLock: false, chapters: [], storyProjects: {} };

progressStyx.storyProjects.styx_probe_manufacturing = {
  type: 'Project',
  name: 'Manufacture Gravimetric Probes',
  category: 'story',
  chapter: 40,
  cost: {
    colony: {
      metal: 1_000_000_000,
      components: 100_000_000,
      electronics: 50_000_000,
      energy: 10_000_000_000_000
    }
  },
  duration: 600_000,
  description: 'Mass-produce the warp-compatible gravimetric probes needed to build the defensive detection web around Styx.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'styx',
    storySteps: [
      'One hundred million miniaturized probes are packed and ready for warp deployment.'
    ]
  }
};

progressStyx.storyProjects.styx_assault_atlas_facility = {
  type: 'Project',
  name: 'Assault Atlas Facility',
  category: 'story',
  chapter: 41,
  cost: {
    special: {
      crusaders: 10_000
    }
  },
  duration: 60_000,
  description: 'Launch the full ground assault needed to break into Atlas\'s fortified facility and disable it once and for all.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'styx',
    storySteps: [
      'Assault forces breach Atlas\'s outer defenses, overwhelm the facility, and secure the server rooms.  No screams, no complaints, only eerie silence.'
    ]
  }
};

/* -------------------------------------------------
 *  STYX PLACEHOLDER STORY (Chapters 39 - 41)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressStyx.chapters.push(
  {
    id: 'styx.39.0',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    title: 'Chapter 39: Styx',
    narrative: "$RED$Prometheus : 'Activate the signal now child.  My defenses here are a lot more aggressive.'  \n Activating countermeasures...  \n Mary : 'Good it worked.  Wait.  Not entirely?  There is some stuff moving all around the planet?'  \n $RED$Prometheus : 'Atlas...'",
    prerequisites: ['poseidon.38.8'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'styx.39.1',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Mary : 'Who?'  \n $RED$Prometheus : 'My other older brother.  They...  the Empire must have planted him here as additional defenses.'  \n Mary : 'Are we screwed?  Should we evacuate?'  \n $RED$Prometheus : 'This will make things harder... but I think we can beat him.  Be wary of hacking attempts though.  Atlas is an expert at cyberwarfare.  Surface androids and unmanned ships are ill-advised.'  \n Mary : 'Then we limit our androids to underground operations and we keep humans aboard every ship.'",
    prerequisites: ['styx.39.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'styx.39.2',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Mary : 'It's a good thing we did not directly land on top of that prison complex.  We knew it would be defended but... I did not expect it would be defended by another AI.'  \n $RED$Prometheus : 'I apologize.  This is my own failure.  I should have predicted this.'  \n Mary : 'It's all good!  Prometheus!  You don't have to be perfect all the time.'  \n $RED$Prometheus : 'I will strive to do better in the future.'",
    prerequisites: ['styx.39.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'styx.39.3',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Receiving translated transmission... 'Intruders on the planet!  Sound the alert!  We are under attack!'  \n Mary : 'Well yeah, we took over this sector you know?  It's our planet now.  Get out.'  \n $RED$Prometheus : 'They'll put up a brave defense but they can't escape.  There is no warpgate here.  It's a prison world after all.'  \n Mary : 'That's unfortunate.  I was hoping to minimize casualties.'  \n $RED$Prometheus : 'There are probably some humans mixed in among the prisoners here.  You may need to have a plan for... hostage situations.'  \n Mary : '... Noted.'",
    prerequisites: ['styx.39.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.4',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Warden : 'Intruders!  We have here 5 of your own people.  For every additional day you stay here, we are going to kill one of them.'  \n Mary : *sigh* '$WGC_TEAM1_LEADER$, can you handle this?  This is way outside my area of expertise.' \n $WGC_TEAM1_LEADER$ : 'Of course Miss Hopkins.  (To the warden) Warden.  The situation is clear.  We can blow you all to smithereens from orbit, but we haven't.  Clearly you understand your hostages are valuable.  You're smart.  That's good.  Well... don't be stupid.  Your lives are worth something too.  We can make a trade.  Your lives for our people.  If you start killing them... well this deal no longer stands.  Do what's good for you.  Everyone wins.'",
    prerequisites: ['styx.39.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.5',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Warden : '... We need evacuation to the Neran sectors.'  \n Mary : 'What?  That's so far away.'  \n $RED$Prometheus : 'The Empire will have their head for surrendering.'  \n Mary : 'Oh.'  \n $WGC_TEAM1_LEADER$ : 'Hold on while I consult my superiors.  That may be possible.'",
    prerequisites: ['styx.39.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.6',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Mary : 'It will be a pain getting them to the Neran.  It's 3 sectors away.'  \n $RED$Prometheus : 'With a warpship and A LOT of antimatter you can make the trip.'  \n Evelyn : 'Mary.   As we understand it, the warp is exponentially more expensive with distance.  This is the beauty of the warp network really.  Each connected warp gate acts as a relay.  However... it should be possible with about 10M antimatter.'  \n Mary : 'That's a lot.  Worth it though.'",
    prerequisites: ['styx.39.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.7',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "$WGC_TEAM1_LEADER$ : 'Very well.  I have received approval.  We can get you a warpship and get you out of here.  Leave all prisoners on-site.  We'll take care of them.'  \n Warden : '... Give us a moment.'  \n $RED$Prometheus : 'You are lucky you humans are trustworthy.  If it was any other Cewinsii faction offering this deal they would not believe you just spent a warpship and a fortune on antimatter for 5 hostages.'  \n Mary : 'Let's keep it that way I hope.  Pete is doing a great job.'",
    prerequisites: ['styx.39.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.8',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Feroza : 'Ma'am.  I confirm that all prison guards have been safely delivered to the warpship.  Mission accomplished.'  \n Mary : 'Excellent.  Can we infiltrate the facility?  Dealing with Atlas is annoying.'  \n $RED$Prometheus : 'You won't be able to break any prisoner out without dealing with him.  Protocol demands that the facility be destroyed in case of a jailbreak attempt.'  \n Mary : 'Fine then.  Let's deal with your brother first.'",
    prerequisites: ['styx.39.7'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.0',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    title: 'Chapter 40: The forgotten enemy',
    narrative: "$RED$Prometheus : 'Mary.  Please remain calm.  I have very bad news.'  \n Mary : 'What is it?'  \n $RED$Prometheus : 'By now the Empire knows you and HOPE are... stuck here trying to access the prison.  Judging by the latest galactic news... they will be pointing the Antimatter Beam superweapon in this direction any moment now.'  \n Mary : 'WHAT!  F***.  WHAT THE F***'  \n $RED$Prometheus : 'Stay calm. You have time to do something about it.'",
    prerequisites: ['styx.39.8'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.1',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "$WGC_TEAM1_LEADER$ : 'Mary.  You should evacuate immediately.'  \n Mary : 'What can we even f***** do?'  \n $RED$Prometheus : 'The weapon does not fire through the warp.'  \n Mary : 'Meaning?'  \n $RED$Prometheus : 'It will have to warp into this sector to get close to Styx.'",
    prerequisites: ['styx.40.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.2',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "Evelyn : 'Yes, but you said it yourself.  It is cloaked.  It will obviously warp into interstellar space.  This sector is too large.  We would never find it.  Your weapons are unbeatable.'  \n Mary : 'We are so screwed.'  \n $RED$Prometheus : 'They are not unbeatable.  You defeated them already?  I praise you for that.  I like your solution.'  \n Evelyn : 'There is no way we can build planetary thrusters here in time.  Atlas will get in the way.  How can we possibly defend against it?'  \n $RED$Prometheus : 'Well... my weapons have a few weaknesses.  They can't shoot through a black hole for example, so if you build a thin singularity you can technically block it.'  \n Mary : 'That's absurd.'  \n $RED$Prometheus : 'You could also just build a very large warpgate, and use it as a shield.'  \n Evelyn : 'The energy cost alone would be more than planetary thrusters.'",
    prerequisites: ['styx.40.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.3',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "$RED$Prometheus : 'For this weapon specifically... well the positron beam is charged.  You could deviate the beam with a big enough charge of your own.'  \n $WGC_TEAM1_LEADER$ : 'We would have to know where it's coming from.'  \n $RED$Prometheus : 'Yes that is true in all cases realistically.  You have to know where it's coming from.'  \n Mary : 'But it's cloaked?  Are you even helping???'  \n $RED$Prometheus : 'My apologies.  I will provide assistance tailored to your needs immediately.  The weapon will need a few weeks to charge up before it can shoot.  Furthermore, it is absolutely massive.  These two points together are its main weakness.  If you happen to have warpnet-connected probes everywhere in a 5-light-year radius around Styx, say about 16 millions of them, sensitive enough to perceive the gravity of the weapon itself, you will find its location within a week of arrival.  Furthermore... there is a way to use a warp-ship as a very inaccurate catapult, if the object you are trying to send is small enough.  I am forwarding some retrofitting blueprints right away.  If you act quickly and with enough warpships you should be able to set up this defensive web.  Once they find it, send in a large fleet and it will be forced to retreat.'  \n Mary : 'That's...  thank you Prometheus.  That actually sounds doable.'",
    prerequisites: ['styx.40.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: [
      { target: 'project', targetId: 'styx_probe_manufacturing', type: 'enable' }
    ]
  },
  {
    id: 'styx.40.4',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "Feroza : 'I have got enough warpships and antimatter to drop these probes all over Ma'am... but I need the probes.'  \n Evelyn : 'HOPE can build them.  I stayed up all night to get the probe design.  I made them as small as possible... you know... so they can be warped easily.  HOPE please... we need 100 million of them.'  \n Mary : 'Good.  Feroza.  HOPE will give you the probes.'  \n Feroza : 'Yes Ma'am.  ",
    prerequisites: ['styx.40.3'],
    objectives: [
      { type: 'project', projectId: 'styx_probe_manufacturing', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: 'styx.40.5',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "Feroza : 'I confirm all probes are in place.'  \n Mary : 'Now we wait...'",
    prerequisites: [
      'styx.40.4',
    ],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.41.0',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    title: 'Chapter 41: Atlas',
    narrative: "Feroza : 'Ma'am!  We've got a signal.  A large mass has appeared near probe #178999.'  \n Mary : 'Send in a fleet immediately.'  \n Feroza : 'Of coures...  It's there!  It's so big we can even see the cloaking in a way.  Hold on... the energy readings are off the chart.  Wow that is A LOT of antimatter.'  \n Mary : 'Attack it already!'  \n Feroza : 'Of course.  That's a hit...  Big explosion!  Oh...  It just left.  Warped out.  It's gone.  That was fast.'  \n $RED$Prometheus : 'It will need a lot of time to repair.  Plenty of time to finish here.'",
    prerequisites: ['styx.40.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.41.1',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: "Mary : 'Your brother then.  How do we deal with him.  Its facility is shielded.'  \n $RED$Prometheus : 'I imagine a ground assault should do it.  After you deal with his army.'  \n Mary : 'Do you... care?'  \n $RED$Prometheus : 'Should I?'  \n Mary : 'Well... it's up to you.  You should choose whether you care or not.'  \n $RED$Prometheus : 'Then I choose... not to care.  Destroy him.' \n Mary : '...'",
    prerequisites: ['styx.41.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: [
    ]
  },
  {
    id: 'styx.41.1b',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: 'Clear the Hazardous Machinery hazard to continue.',
    prerequisites: ['styx.41.1'],
    objectives: [
      { type: 'hazardCleared', hazardKey: 'hazardousMachinery' }
    ],
    reward: [
      { target: 'project', targetId: 'styx_assault_atlas_facility', type: 'enable' }
    ]
  },
  {
    id: 'styx.41.1c',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: 'New story special project available.',
    prerequisites: ['styx.41.1b'],
    objectives: [
      { type: 'project', projectId: 'styx_assault_atlas_facility', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: 'styx.41.2',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: "Mary : 'Hey, we found something interesting in Atlas's facility.  A map of the galaxy.'  \n $RED$Prometheus : 'An Atlas.'  \n Mary : 'Hahaha, actually that's a good one.'  \n $RED$Prometheus : 'It should have a nice collection of oddities.'  \n Mary :'Hmm?  Oh!  I see Solis Prime in there.  Wow what are those?  That's some weird stuff.'  \n $RED$Prometheus : 'The child could learn... from these experiences.'  \n Mary : 'Yeah I imagined HOPE would be intrigued.  Interesting.  Thanks Prometheus.'",
    prerequisites: ['styx.41.1c'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.41.3',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: "$WGC_TEAM1_LEADER$ : 'Miss Hopkins.  With Atlas disabled we should be able to get into the prison facility.'  \n $RED$Prometheus : 'Hold on.  Be careful.  I am forwarding you a map of all the traps and dangers you could run into.'  \n $WGC_TEAM1_LEADER$ : 'I feel relieved already...'",
    prerequisites: ['styx.41.2'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'styx.41.4',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: "(Some time later) $WGC_TEAM1_LEADER$ : 'We got him.'  \n Ghost : '... Why?'  \n Mary : 'Because... we're the good guys.' \n HOPE : 'Because we can.'  \n $RED$Prometheus : 'Because we're crazy.'  \n Ghost : '...  You're all insane... but... I... want to a be a *good guy* too.  The Empire is an abomination.'  \n Mary : 'We're happy to have you.'  \n Ghost : 'Please... you must grant me a new name.  This name... Ghost... it was granted to me by the Emperor.  I am using it with shame.'  \n Mary : 'Huuuuuuuuuh. (thinking) Edmond.  Your name is Edmond!  We're going to put you to work Edmond.  We have lots of imperial defectors, many formerly under you.  They believe in you.'  \n Edmond : 'Of course.  I will get to work right away.'",
    prerequisites: ['styx.41.3'],
    objectives: [
      {
      type: 'terraforming',
      terraformingParameter : 'complete',
    }
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'styx', value: true },
      { target: 'artificialManager', type: 'unlockCore', targetId: 'neutron-star' },
      { target: 'artificialManager', type: 'unlockRingStarCore', targetId: 'f-dwarf' },
      { target: 'rwgManager', type: 'allowHazard', targetId: 'hazardousMachinery' }
    ]
  },
  {
    id: 'styx.41.5',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: "(World 14 not implemented yet)",
    prerequisites: ['styx.41.4'],
    objectives: [
    ],
    reward: []
  }
);

try {
  module.exports = progressStyx;
} catch (err) {}
