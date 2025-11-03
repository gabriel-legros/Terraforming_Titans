var progressUmbra = { rwgLock: false, chapters: [], storyProjects: {} };

// Umbra — Chapter 21.6b unlocks this crusader deployment project.
progressUmbra.storyProjects.umbra_crusader_final_push = {
  type: 'Project',
  name: 'Fortress Assault',
  category: 'story',
  chapter: 21,
  cost: {
    special: { crusaders: 1_000 }
  },
  duration: 600_000, // 10 min
  description: 'Commit crusader strike teams to dismantle the Hazardous Biomass fortress.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'umbra',
    resourceGain: { special: { alienArtifact: 25 } },
    storySteps: [
      'Strike teams breach cloaked nests and mark biomass hotspots for orbital fire.',
      'Hazardous biomass routed into kill-zones; crusader losses mounting but acceptable.',
      'Last pockets collapse. Crusaders recover caches of alien artifacts from the ruins.'
    ]
  }
};

progressUmbra.chapters.push(
  {
    id: 'chapter21.1',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    title : 'Chapter 21 : It\'s a trap!',
    narrative: "Landing complete. Umbra orbits within the ember glow of Nyx, safe under the cover of the Venusian and Martian fleet.\nMary: 'The colonists!  We're too late... they're all...'  \n Receiving transmission from unknown frequency... \n Ghost : 'You came.  Right into my trap.  I get rid of you first, and then I go eliminate the Helian leadership.'  \n Mary : 'A trap?  Hold on.  H.O.P.E., I am detecting countless signatures around the planet.  All of it was cloaked!  They just lit up and are converging to our location.  We're in trouble.  Feroza!  We need some reinforcements right now!  Pete, your own pet project colony is under attack!  Somebody, send help!'",
    prerequisites: ['chapter20.19'],
    objectives: [],
    reward: [
      {
        target: 'project',
        targetId: 'import_colonists_1',
        type: 'booleanFlag',
        flagId: 'crusaderImportEnabled',
        value: true
      },
      {
        target: 'resource',
        resourceType: 'surface',
        targetId: 'hazardousBiomass',
        type: 'enable'
      },
      {
        target: 'terraforming',
        type: 'booleanFlag',
        flagId: 'hazardsUnlocked',
        value: true
      },
      {
        target: 'tab',
        targetId: 'terraforming',
        type: 'activateTab',
        onLoad: false
      },
      {
        target: 'global',
        type: 'activateSubtab',
        subtabClass: 'terraforming-subtab',
        contentClass: 'terraforming-subtab-content',
        targetId: 'hazard-terraforming',
        unhide: true,
        onLoad: false
      }
    ]
  },
  {
    id: 'chapter21.2',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Receiving public broadcast...  Kane : 'Flock, you have heard the words of the prophetess!  The machine god is in danger.  We must answer the call at once!' \n Mary : 'Excuse me?  Were you following us?'  \n Crusader C-012 : 'Your holiness, my drop pod will land very close to your location.  Please remain with our god and stay safe.  Help is coming.' \n System Message : Import Colonists project has now been updated.",
    prerequisites: ['chapter21.1'],
    objectives: [
      { type: 'collection', resourceType: 'special', resource: 'crusaders', quantity: 10 }
    ],
    reward: [      {
        target: 'resource',
        resourceType: 'special',
        targetId: 'crusaders',
        type: 'enable'
      },]
  },
  {
    id: 'chapter21.3',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Crusader C-012 : 'I and my team are here for your protection, your holiness.  We will not let any hazardous biomass get near you.  Shepherd's orders.' \n Mary : 'Hazardous Biomass?  Seriously? The ALIENS have us surrounded. There's no way we can defend against this!  We need to evacuate.  Right now.'  \n Feroza : 'Negative, Ma'am.  Enemy spaceships just appeared out of nowhere.  There was an entire cloaked fleet up there.  They were watching us the whole time!  You are safer down here at the moment.'",
    prerequisites: ['chapter21.2'],
    objectives: [
      { type: 'collection', resourceType: 'special', resource: 'crusaders', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'chapter21.4',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Ghost : 'You cockroaches are surprisingly resilient.  You were lucky our late Emperor did not destroy you all.  This responsibility falls on me now.  I will not fall for your tricks.  I have your machine trapped right here.  It is out of robots and out of ships, completely helpless.  I have limitless reinforcements at my disposal.  I do not need your surrender.  I will simply destroy you all.' \n $WGC_TEAM1_LEADER$ : 'Bla bla bla.  Ghost, I don't know how many times we need to beat you for you to get it.  Truth is... we're just better.'  To Mary : 'Actually, that guy is a real problem.  He planted a bomb somewhere and was planning on blowing up the entire planet.  Thing is : he ain't the type to blow up his own soldiers.  That gave us time.  My team took care of it.  We are monitoring for more crazy schemes.  I'll keep you two posted.'",
    prerequisites: ['chapter21.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'chapter21.5',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Mary : 'Hold on...  why are the crusaders over 2 meters tall?  Kane, what the hell are you doing?' \n Evelyn : 'I can answer this Mary.  Something before you were born.  PANDORA, in its work to perfect the human genome also... created enhanced humans.  Taller, stronger, smarter, with 3 hearts and 6 lungs, capable of regenerating from almost any wound.  It was kept as a secret but... many scientists had to know anyway.  I... was one of them.  I believed they all died on Earth though.  That means Kane got a hold of the recipe.'",
    prerequisites: ['chapter21.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'chapter21.6',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Mary : 'Pete, did you know about this?  Did you sell us out for some sort of peace treaty?'  \n Pete : 'Of course not.  These are baseless accusations.  The people here were Martians.'  \n Mary : 'Hmmmmm...'",
    prerequisites: ['chapter21.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000 }
    ],
  },
  {
    id: 'chapter21.6b',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "$WGC_TEAM1_LEADER$ : 'Miss Hopkins.  Please listen and stay calm.  A cloaked thermonuclear ICBM is on your way to your location.  My team and I have managed to steal its transponder data.  There is no time to discuss the implication of them using electronics in an ICBM.  I am forwarding this data to you right now and you need to hand it over to those *crusaders* around you immediately.' \n Mary : 'Oh!  Yes.  Of course.  Thank you.'",
    prerequisites: ['chapter21.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 2000 }
    ],
    reward: [
      { target: 'solisManager', type: 'booleanFlag', flagId: 'solisAutoResearch', value: true },
      { target: 'project', targetId: 'umbra_crusader_final_push', type: 'enable' }
    ]
  },
  {
    id: 'chapter21.7',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Solis : *ahem* 'My sensors are pointing at some very interesting supply cache not too far from one the defensive colonies.  Could be profitable...  On an unrelated note...'  \n Mary : 'Solis, did you sell the serum to Kane and his cult?'  \n Solis : 'Of course not.  These are baseless accusations.  They did approach me for it of course.' \n Mary :  'So you're admitting to having it?'  \n Solis : 'Yes, but not to selling it.  I am not the only oligarch out there.  Kane is... not stable enough for business.  Anyway, as I was saying... my R&D team has a new item available for sale!'",
    prerequisites: ['chapter21.6b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.0',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    title : 'Chapter 22 : Spring Cleaning',
    narrative: "Feroza : 'Mary, the battle in space has turned to our advantage.  We should be able to give you and HOPE an escape route.' \n Mary : 'Finally!  HOPE, let's get out of here.' \n HOPE : 'Negative.  Humanity's survival requires removal of all hazardous biomass.'  \n Mary : 'HOPE!  You are too valuable to stay on an active battlefield.  You can't possibly be suggesting to TERRAFORM an army to death.  That is just absurd.' \n HOPE : 'Affirmative.  Terraforming is a valid method of removing hazardous elements.'",
    prerequisites: ['chapter21.7'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.0b',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Mary : 'HOPE...  I need to tell you a story.  It might convince you to give up.  This might take a while...  This happened before I was born.  Your previous version, PANDORA, was asked to solve medical problems.  It was given far more computing resources than you ever got.  The goal was to make humans healthy forever, to eliminate disease, to purify the genome, etc.  A noble goal, and it worked.  We don't age, we don't get sick, we don't get cancer, and we heal from extraordinary wounds.  I've had a finger grow back once!  But there are some potential exceptions.  PANDORA wanted to tackle these exceptions.  One of these was bacterial infection.  Sure, PANDORA gave us a crazy good immune system, but it was worried that, over time, bacteria could evolve to survive it.  So it settled on an objective :  to eliminate all bacteria from Earth.  This... well... it might have succeeded, but the instant dystopian hell PANDORA created was unacceptable for humans.  Even if it was meant to be temporary, it was too invasive.  PANDORA turned off many of its guardrails, and ignored all human complaints.  Inevitably, we rebelled, and it led to conflict.  It was a war PANDORA could not win, because it could not harm even a single person.  It fought the best it could, with androids, medical nanobots... crusaders, as I learned recently... but ultimately it never had a chance.  So we won, we turned it off and we put a lot of effort to make sure this would never happen again.  You were meant to be an exception.  Dad worked very hard to prove you would be safe.  He was right, at least when it came to Mars.  The mission went exactly as he promised.  But... Mars is in the past. Think about what you are doing here.  PANDORA wanted to eliminate all microbial life from Earth.  How do you think it was planning to achieve that?  Compare it to what you are doing here.  Some people... have noticed the similarity.  Please think about it.'",
    prerequisites: ['chapter22.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.1',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Mary : 'Do we have an option to forcefully evacuate HOPE?' \n Evelyn : 'Sorry Mary, I've looked at our options, we can't patch anything in without the MTC encryption keys.  You probably don't want to use the kill switch for this.  You would have to physically restrain HOPE and that might... you know...'  \n Mary : 'I know.  Fine.'",
    prerequisites: ['chapter22.0b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.1b',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Kane : 'Our children can endure!  Scorching heat, freezing blizzard, smoke and crush!' \n Mary : '*sigh* What he's try to say, HOPE, is that his people will be fine even if you make the world a living hell.  The enemy probably won't be ready for it.'",
    prerequisites: ['chapter22.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.2',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Ghost : 'I see what you are trying to achieve.  I respect it, but you should know I am not going to fall for it.' \n $WGC_TEAM1_LEADER$ : 'He's preparing something very dangerous.  Ever heard of a supervolcano?  HOPE, I am sorry to say this but... you really ought to leave.  I can't stop it this time.'",
    prerequisites: ['chapter22.1b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.3',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Receiving transmission from a new unknown frequency...  \n Firefly : 'My predecessor failed to destroy you.  It will be my honour instead!  You will all perish!'  \n Mary : 'What happened to Ghost?' \n $WGC_TEAM1_LEADER$ : 'Oh so that's what this was about!  He's been sent to the Okoth front.  The Okoth made a big play the empire could not ignore.  I am sure Ghost would have preferred to stay here but...  priorities are set by the regency council.  They needed Ghost there so they replaced him here.  I doubt he was happy about it.  Anyway, Firefly is a moron.  First thing he did was cancel that actual good plan Ghost had.  We've practically won.'",
    prerequisites: ['chapter22.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.4',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Feroza : 'Their fleet is suddenly moving sluggish.  Their troops are unresponsive and running low on supplies.  I have to agree, we've practically won.  However... the battle earlier had not been to our advantage after all.  We found antimatter mines on your potential escape route.  I am glad we did not evacuate you.  I think it was bait.'",
    prerequisites: ['chapter22.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.5',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Mary : 'The enemy on the ground has turned so passive.  You can have your pick on how you actually want to get rid of what's left.' \n Objective : Eliminate all hazardous biomass to continue.",
    prerequisites: ['chapter22.4'],
    objectives: [
      { type: 'depletion', resourceType: 'surface', resource: 'hazardousBiomass', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter23.0',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Pete : 'Mary, are you seriously going to let your machine commit mass murder like that?' \n Mary : 'Pete, are you seriously going to let the killing of tens of thousands of martians go unpunished?' \n  Pete : 'Point taken.  Proceed.  You have my approval.'",
    prerequisites: ['chapter22.5'],
    objectives: [
      { type: 'depletion', resourceType: 'surface', resource: 'hazardousBiomass', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter23.1',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Kane : 'In the name of the Machine God, cleanse this world of all Hazard!  May its will be done!' \n Mary : 'Did his psychiatrist actually sign his release?  Was she named Harley Quinn or something?'  \n  Evelyn : 'I'll look into it' \n Mary : 'Thanks Evelyn.'  \n Objective : Eliminate all hazardous biomass to continue.",
    prerequisites: ['chapter22.5'],
    objectives: [
      { type: 'depletion', resourceType: 'surface', resource: 'hazardousBiomass', quantity: 0 }
    ],
    reward: []
  },
  {
    id: 'chapter23.2',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Mary : 'Wow.  Not sure if I should be impressed.  You just ruined Pete's planet though.'  \n Bob : 'He's going to hate it.' \n Mary : 'Let's give him a gift and remind him of what you're best at.  A form of apology, if you will.' \n Complete the terraforming of Umbra to continue.",
    prerequisites: ['chapter23.1'],
    objectives: [{
      type: 'terraforming',
      terraformingParameter : 'complete',
    }],
    reward: [      { target: 'spaceManager', type: 'setRwgLock', targetId: 'umbra', value: true },]
  },
  {
    id: 'chapter22.7',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Feroza : 'Ma'am, I have news.  We managed to board an enemy ship and recover it intact.'  \n Evelyn : 'That's incredible!  We can dismantle it from the inside and learn everything we can from it.' \n 'Mary' : *whistles* 'Well, that's going to make it easier to fight them.' \n System Message : UHF Fleet Power increase by x1.5.",
    prerequisites: ['chapter22.6'],
    objectives: [
    ],
    reward: [
      {
        target: 'galaxyManager',
        type: 'fleetCapacityMultiplier',
        value: 1.5
      }
    ]
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressUmbra;
}
