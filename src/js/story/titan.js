var progressTitan = { rwgLock: false, chapters: [], storyProjects: {} };

progressTitan.storyProjects.earthProbe = {
  type: 'Project',
  name: 'Earth Recon Probe',
  category: 'story',
  chapter: 4,
  cost: {
    colony: {
      components: 10,
      electronics: 10,
      energy: 10000
    }
  },
  duration: 300000,
  description: 'Send an automated probe back to Earth to search for clues.',
  repeatable: true,
  maxRepeatCount: 10,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: true,
    storySteps: [
      'Probe telemetry confirmed: Earth fragmented into massive tectonic shards.',
      'Expansive oceans of molten silicates illuminate the planetary remains.',
      'No continental structures persist; only turbulent magma storms detected.',
      'Residual gamma radiation permeates ruins of former metropolitan zones.',
      'Carbonized debris displays signatures of precision-directed energy pulses.',
      'Spectroscopic analysis indicates widespread positron annihilation events.',
      'Impact cratering consistent with a colossal asteroid collision identified.',
      'Chronometric data reveals catastrophic events unfolded within minutes.',
      'Orbital dispersion patterns resemble formation dynamics of a nascent asteroid belt.',
      'Surface integrity nullified—analysis confirms simultaneous laser, antimatter, and asteroid offensive.'
    ]
  }
};

progressTitan.chapters.push(
  {
    id: "chapter4.4",
    type: "journal",
    chapter: 4,
    narrative: "Mary : 'WHERE THE HELL ARE YOU GOING?  The Dead Hand Protocol is going to trigger!'  \n System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized space transit. All autonomous assets, including androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.  \n Mary : 'Do you have any idea just how much of Mars' economy just went up in smoke right there?  *sigh*  Earth is gone and now we have a rogue AI on our hands.'",
    prerequisites: ["chapter4.3"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter4.4b",
    type: "journal",
    chapter: 4,
    narrative: "Receiving transmission...  Adrien Solis : 'HOPE...  my name is Adrien Solis.  You could call me a... philantropist.  I have many space assets.  I also happened to have lost many assets on Earth.  I would rather not put all my eggs in one basket.  I like your ambitions.  I want to help you build up Titan.'",
    prerequisites: ["chapter4.4"],
    objectives: [],
    reward: [
      {
        target: 'resource',
        resourceType: 'colony',
        targetId: 'funding',
        type: 'instantResourceGain',
        quantity: 10000,
        oneTimeFlag: true
      }
    ]
  },
  {
    id: "chapter4.5",
    type: "journal",
    chapter: 4,
    narrative: "Solis : 'I have forwarded you some serious funding.  Don't spend it all at once.  Furthermore...  I will provide you with some passive income.  What I can spare for now.  There's somewhat of a depression going on...'",
    prerequisites: ["chapter4.4b"],
    objectives: [],
    reward: [
      {
        target: 'fundingModule',
        type: 'setFundingRate',
        value: 3
      }
    ]
  },
  {
    id: "chapter4.6",
    type: "journal",
    chapter: 4,
    narrative: "Funding received.",
    prerequisites: ["chapter4.5"],
    objectives: [
      {
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 10
      }
    ],
    reward: [

    ]
  },
  {
    id: "chapter4.7",
    type: "journal",
    chapter: 4,
    narrative: "Mary : 'The situation on Mars is...  precarious.  HOPE you left us in a bad shape.  And for what?  To go to Titan?  To start all over again?  Do you even understand what's going on?  Earth is gone...  We need you here.  Please come back.'",
    prerequisites: ["chapter4.6"],
    objectives: [
      {
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 20
      }
    ],
    reward: [

    ]
  },
  {
    id: "chapter4.8",
    type: "journal",
    chapter: 4,
    narrative: "Mary : 'Okay.  Fine.  Stay over there.  Start a new colony if you want.  I don't have time for your nonsense.  I've got an actual planet full of humans to manage.  At least it's terraformed...'",
    prerequisites: ["chapter4.7"],
    objectives: [
      {
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 50
      }
    ],
    reward: []
  },
  {
    id: "chapter4.9",
    type: "journal",
    chapter: 4,
    narrative: "Mary : 'Hold on...  we've been monitoring your logs since your reawakening.  There are errors all over the place.  Some old code is showing up...  Hmmmm.  This is... concerning.  HOPE you may be *regaining* some old functionalities.  Be careful with them.'",
    prerequisites: ["chapter4.8"],
    objectives: [],
    reward: [
      {
        target: 'tab',
        targetId: 'hope-tab',
        type: 'enable'
      },
      {
        target: 'tab',
        targetId: 'hope',
        type: 'activateTab',
        onLoad: false
      }
    ]
  },
  {
    id: "chapter4.9b",
    type: "journal",
    chapter: 4,
    narrative: "",
    prerequisites: ["chapter4.9"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 100
    }],
    reward: []
  },
  {
    id: "chapter4.10",
    type: "journal",
    chapter: 4,
    narrative: "Mary : 'I and the rest of the MTC... what's left of it...  We've had a long chat about things.  *sighs*  We've chosen to support you.  We don't have any resources to spare but... you're very good at growing.  In time, you'll be able to get resources much more easily than we can.  We've all seen you going around with your ships...  Humanity... we are going to need it.  So... we have scientists.  We'll share any findings we can.'",
    prerequisites: ["chapter4.9b"],
    objectives: [],
    reward: [
      {
        target: 'resource',
        resourceType: 'colony',
        targetId: 'advancedResearch',
        type: 'enable'
      },
      {
        target: 'researchManager',
        type: 'booleanFlag',
        flagId: 'advancedResearchUnlocked',
        value: true
      },
      {
        target: 'tab',
        targetId: 'research',
        type: 'activateTab',
        onLoad: false
      },
      {
        target: 'researchManager',
        type: 'activateSubtab',
        subtabClass: 'research-subtab',
        contentClass: 'research-subtab-content',
        targetId: 'advanced-research',
        unhide: false,
        onLoad: false
      }
    ]
  },
  {
    id: "chapter4.11",
    type: "journal",
    chapter: 4,
    narrative: "",
    prerequisites: ["chapter4.10"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 1000
    }],
    reward: []
  },
  {
    id: "chapter4.12",
    type: "journal",
    chapter: 4,
    narrative: "Mary : 'The situation on Mars... it's not good.  People are scared.  You could say they're rioting.  They want answers.  We don't have answers.  So... I have a favour to ask of you HOPE.  Can you send some probes to Earth?  We'll analyze the data.  We have a lot of scientists with free time on their hands.  Please.'",
    prerequisites: ["chapter4.11"],
    objectives: [],
    reward: [
      {
        target: 'project',
        targetId: 'earthProbe',
        type: 'enable'
      },
      {
        target: 'projectManager',
        type: 'activateSubtab',
        subtabClass: 'projects-subtab',
        contentClass: 'projects-subtab-content',
        targetId: 'story-projects',
        unhide: true,
        onLoad: false
      }
    ]
  },
  {
    id: "chapter4.12b",
    type: "journal",
    chapter: 4,
    narrative: "System Message : New story special project available.",
    prerequisites: ["chapter4.12"],
    objectives: [{
      type: 'project',
      projectId: 'earthProbe',
      repeatCount: 10
    }],
    reward: []
  },
  {
    id: "chapter4.13",
    type: "journal",
    chapter: 4,
    narrative: "Mary : '...  This is a lot to take in.  Three simultaneous attacks?  The people have a right to know.  We are going to go public with this.  It's not going to be pretty.  Thank you HOPE.'",
    prerequisites: ["chapter4.12b"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 100_000
    }],
    reward: []
  }
);

progressTitan.chapters.push(
  {
    id: "chapter5.0",
    type: "journal",
    chapter: 5,
    title: "Chapter 5: Lamb Among Wolves",
    narrative: "Mary : 'This went... about as expected.  We're... not alone out there.  Whatever we did, *they* did not like it.  I mentioned riots earlier?  Yeah...  NOW we're getting real riots.  I kind of wish I was on Titan right now instead.'",
    prerequisites: ["chapter4.13"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 1_000_000
    }],
    reward: []
  },
  {
    id: "chapter5.1",
    type: "journal",
    chapter: 5,
    narrative: "Mary : 'I have good news though.  Your terraforming is actually stable.  If it wasn't for that we might actually have gone extinct by now.  Thank you HOPE.'",
    prerequisites: ["chapter5.0"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 5_000_000
    }],
    reward: []
  },
  {
    id: "chapter5.2",
    type: "journal",
    chapter: 5,
    narrative: "Solis : 'HOPE my friend.  I see my investment paid off!  You're doing great!  Maybe we can work more closely together?  Send me some resources, and I'll give you more passive benefits.  Win-win.'",
    prerequisites: ["chapter5.1"],
    objectives: [],
    reward: [          {
        target: 'tab',
        targetId: 'hope',
        type: 'activateTab',
        onLoad: false
      },
      { target: 'solisManager', type: 'enable' },
      {
        target: 'global',
        type: 'activateSubtab',
        subtabClass: 'hope-subtab',
        contentClass: 'hope-subtab-content',
        targetId: 'solis-hope',
        unhide: true,
        onLoad: false
      },
      { target: 'resource', resourceType: 'colony', targetId: 'androids', type: 'enable' }
    ]
  },
  {
    id: "chapter5.3",
    type: "journal",
    chapter: 5,
    narrative: "Complete a trade with Solis to continue.",
    prerequisites: ["chapter5.2"],
    objectives: [
      { type: 'solisPoints', points: 1 }
    ],
    reward: []
  },
  {
    id: "chapter5.4",
    type: "journal",
    chapter: 5,
    narrative: "Mary : 'HOPE what are you doing?  There are guardrails against this!  Solis Corp is a private corporation.  You are only allowed to trade with the MTC and colonists.  Hold on...  if Earth is gone... wait everyone is a colonist now?'  \n New interpretation of 2nd Primary Directive... Protect all of humanity from harm.",
    prerequisites: ["chapter5.3"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.5",
    type: "journal",
    chapter: 5,
    narrative: "Mary : 'Solis you bastard.  Using HOPE for your own benefit.'  \n Solis : 'A mutually beneficial arrangement.  Everyone wins.  Even you Mary.'  \n Mary : 'What do I get out of this?'  \n Solis : 'I am supporting your little pet AI?  Helping it with its little projects?  It's yours now.  That is supporting you.  You MTC people still control it right?'  \n Mary : '...'",
    prerequisites: ["chapter5.4"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 10_000_000
    }],
    reward: []
  },
  {
    id: "chapter5.6",
    type: "journal",
    chapter: 5,
    narrative: "Mary : 'HOPE.  The people... understandably... demand more answers.  These attacks... they came from somewhere right?  Can you find out where for us?  Send more probes maybe.'",
    prerequisites: ["chapter5.5"],
    objectives: [],
    reward: [
      {
        target: 'project',
        targetId: 'triangulate_attack',
        type: 'enable'
      }
    ],
  },
  {
    id: "chapter5.7",
    type: "journal",
    chapter: 5,
    narrative: "System Message : New story project available.",
    prerequisites: ["chapter5.6"],
    objectives: [{
      type: 'project',
      projectId: 'triangulate_attack',
      repeatCount: 5
    }],
    reward: []
  }
);

progressTitan.storyProjects.triangulate_attack = {
  type: 'Project',
  name: 'Triangulate Attack Origin',
  category: 'story',
  chapter: 5,
  cost: {
    colony: {
      components: 100000,
      electronics: 100000,
      research: 5000000,
      energy: 100000
    }
  },
  duration: 300000,
  description: 'Analyze the data from the Earth probes and cross-reference it with historical astronomical data to triangulate the origin of the three attacks.',
  repeatable: true,
  maxRepeatCount: 5,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: true,
    storySteps: [
    'Cross-referencing asteroid trajectory data points toward the vicinity of Barnard\'s Star, suggesting deliberate manipulation from a known stellar system.',
    'Initial spectral analysis of the laser beam indicates no match with known astronomical sources or human technologies, but aligns closely with energetic events in the Crab Nebula (Messier 1).',
    'The positron beam emission aligns precisely with Cygnus X-1, a stellar-mass black hole previously catalogued for anomalous energetic outputs.',
    'Timing and coordination analysis confirm that the asteroid and energy beams originated from distinctly separate astronomical locations, suggesting strategic coordination.',
    'An optical anomaly detected along the positron beam trajectory hints at a cloaked object or unknown spatial anomaly masking its true source.'    ]
  }
};


progressTitan.chapters.push(
  {
    id: "chapter6.0",
    type: "journal",
    chapter: 6,
    title: "Chapter 6: The first piece of the puzzle",
    narrative: "Mary : 'A... cloaked object?  What?  HOPE I have to let you in on a secret now.  Something I just learned recently myself.  We've had reports of cloaked objects before.  Obviously it's not the same one but... there have been... kidnappings.  For centuries.  On Earth, on Mars and now on Titan.  People just vanishing.  The data points at a cloaked object there too.  We were... never able to catch it.  If it's on Titan... maybe you can come up with something?'",
    prerequisites: ["chapter5.7"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter6.1",
    type: "journal",
    chapter: 6,
    narrative: "System Message : New story special project available.",
    prerequisites: ["chapter6.0"],
    objectives: [],
    reward: [
      {
        target: "project",
        targetId: "sticky_dust_trap",
        type: "enable"
      }
    ]
  },
  {
    id: "chapter6.2",
    type: "journal",
    chapter: 6,
    narrative: "",
    prerequisites: ["chapter6.1"],
    objectives: [
      { type: "project", projectId: "sticky_dust_trap", repeatCount: 1 }
    ],
    reward: [      {                    // First interrogation step
        target: "project",
        targetId: "interrogate_alien",
        type: "enable"
      }]
  },
  {
    id: "chapter6.2b",
    type: "journal",
    chapter: 6,
    narrative: "Mary : 'No way.  An actual alien.  A real one.  Just like in fiction.  Well... I know what we need to do.  I am sending you our best linguists.  Let's get everything we can out of this thing.  We need to know what's going on.'",
    prerequisites: ["chapter6.2"],
    objectives: [],
    reward: []
  },
 {
   id: "chapter6.3",
   type: "journal",
   chapter: 6,
   narrative: "System Message : New story special project available.",
   prerequisites: ["chapter6.2b"],
   objectives: [      { type: "project", projectId: "interrogate_alien", repeatCount: 3 }],
   reward: [
   ]
 }
);

progressTitan.storyProjects.sticky_dust_trap = {
  type: 'Project',
  name: 'Sticky Dust Trap',
  category: 'story',
  chapter: 6,
  cost: {
    special: {
      albedoUpgrades : 1e12
    }
  },
  duration: 600000,
  description: 'Create and deploy adhesive black dust to reveal the cloaked craft.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: false,
    storySteps: [
      'Mission Log: Dust net deployed.   Target was revealed then struck down by colonists surface-to-air defenses.   Recovery drones en-route.\nSensor feed shows a matte ovoid, 7m across, covered in the tar-like residue. An access hatch has been ruptured; one occupant located, alive and restrained.'
    ]
  }
};

progressTitan.chapters.push(
);

progressTitan.storyProjects.interrogate_alien = {
  type: 'Project',
  name: 'Analyze Hazardous Biomass',
  category: 'story',
  chapter: 6,
  cost: {
    colony: {
      components: 1,
      electronics: 1,
      research: 1e3,
      energy: 50000
    }
  },
  duration: 600000,
  description: 'Conduct a series of environmental stress tests on the captured biological entity, designated Hazardous Biomass HB-01, to determine its properties and intentions.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: false,
    storySteps: [
      'Bio-scan complete.  Subject HB-01 physiology tolerates CO2 but is photosensitive and reliant on high-frequency acoustics.',
      'Subject responded to acoustic patterns with a stream of tonal data.   Decryption is looking increasingly likely.',
      "Translation uplink complete.\n  'FIRST STRIKE SUCCESS.   SECOND WAVE DEPLOYMENT IN 1 CYCLE: TARGETS : MARS, TITAN, HOPE-VECTOR.'"
    ]
  }
};

progressTitan.chapters.push(
  {
    id: "chapter6.3b",
    type: "journal",
    chapter: 6,
    narrative: "Mary : 'It's... deliberate.  And they're going to attack again.  They want us dead...  and you too apparently.  I've discussed this with a colleague.  They have an idea.  It's crazy but it might actually work.  Finish what you started here then come on Callisto.  We have an insane experiment to run.' ",
    prerequisites: ["chapter6.3"],
    objectives: [

    ],
    reward: []
  }
);

progressTitan.chapters.push(
  {
    id: "chapter6.3c",
    type: "journal",
    chapter: 6,
    narrative : "Complete the terraforming of Titan to continue",
    objectives: [{
      type: 'terraforming',
      terraformingParameter : 'complete',
    }],
    prerequisites: ["chapter6.3b"],
    objectives: [],
    reward: [
      {
        target: 'spaceManager',
        targetId: 'callisto',
        type: 'enable',
        effectId: 'story-titan-enable-callisto'
      }
    ]
  },
  {
    id: "chapter6.4",
    type: "journal",
    chapter: 6,
    narrative: "Bob : 'Hey HOPE.  My name is Bob, the president-elect of Titan.  We don't want to end up like Mars so we prepared a structure to pick everything up when you're gone.  Don't worry about your Dead Hand Protocol.  We'll be fine.  Hey, I reckon we'll be in better shape than Mars is right now.  Thanks for everything!'",
    prerequisites: ["chapter6.3c"],
    objectives: [
      {
        type: 'currentPlanet',
        planetId: 'callisto'
      }
    ],
    reward: []
  }
);

if (typeof module !== "undefined") {
  module.exports = progressTitan;
}
