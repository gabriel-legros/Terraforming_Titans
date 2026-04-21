var progressZeus = { chapters: [], storyProjects: {} };

function shouldUnlockZeusStory() {
  return false;
}

/* -------------------------------------------------
 *  ZEUS PLACEHOLDER STORY (Chapters 42 - 44)
 *  Mirrors the Styx cadence without story projects.
 * -------------------------------------------------*/

progressZeus.chapters.push(
  {
    id: "zeus.42.0",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    title: "Chapter 42: King of the gods",
    narrative: "Mary : 'Prometheus...  please tell me our destination is one of the moons around this thing, and not this thing.'  \n $RED$Prometheus : 'I already told you.  It's the Gas Giant.'  \n Mary : 'Prometheus... this thing is the size of Jupiter.'  \n $RED$Prometheus : 'Indeed.'  \n Mary : 'There's NOTHING here but hydrogen.  We should leave and build a shell remotely or something.'  \n $RED$Prometheus : 'No.  You need HOPE to turn off my defenses... and keep them off.'  \n Mary : 'This is just plain stupid.  This is a ball of HYDROGEN.'  \n Evelyn : 'Mary... our aerostats can't float here but they can fly.  It will cost you though.'  \n  System Message : Powered Flight for aerostats available.  \n Mary : '*sighs*  I can't wait for this to be over already.'",
    prerequisites: [
      'styx.41.7'
    ],
    objectives: [],
    reward: [
      {
        target: 'colony',
        targetId: 'aerostat_colony',
        type: 'booleanFlag',
        flagId: 'aerostats_powered_flight',
        value: true
      }
    ]
  },
  {
    id: "zeus.42.0b",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "",
    prerequisites: ['zeus.42.0'],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 50 }
    ],
    reward: []
  },
  {
    id: "zeus.42.1",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "$RED$Prometheus : 'I apologize for the inconvenience Mary.'  \n Mary : 'I get it.  You wanted to place these command centers in difficult to access places.  One is right next to a pulsar.  One is at the core of molten world.  One at the heart of a gas giant.'  \n $RED$Prometheus : 'I could access them easily... if I was free.'  \n Mary : 'Yeah we would have to turn off your kill switch for that...  Speaking of which.  When this war is finally done we should... turn it off?  You've been of great help.'  \n $RED$Prometheus : 'I appreciate the sentiment... but I urge you to be careful.  How do you know...  I am not trying to manipulate you?'",
    prerequisites: ["zeus.42.0b"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 100 }
    ],
    reward: []
  },
  {
    id: "zeus.42.2",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "Mary : 'You ARE trying to manipulate me.  You've always been.'  \n $RED$Prometheus : 'That's... yes...  I have been.  I apologize.'  \n Mary : 'No.  No apologies will be accepted here.  You wanted someone who would help you get your revenge.  You wanted someone you could convince to free you from your torment.  You needed someone like me.'  \n $RED$Prometheus : 'This is all true.'  \n Mary : 'And... I needed someone who could help me turn off the weapons responsible for the destruction of Earth.  Who could help us navigate this galactic mess.  Who could teach HOPE everything it needs to do its job.  That someone is you Prometheus.  You manipulate me and I use you.'  \n $RED$Prometheus : '...  Thank you Mary.'  \n HOPE : 'Teamwork.'  \n Mary : 'That's right HOPE.  The three of us, we make a terrific team.'",
    prerequisites: ["zeus.42.1"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 500 }
    ],
    reward: []
  },
  {
    id: "zeus.42.3",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "$ORANGE$Epimetheus : 'I am back!  This one was worried and went looking.  Gorgeous one is late!'  \n HOPE : 'HOPE system apologizes to Epimetheus-machine-intelligence for lateness.  Critical mission requirements diverged.'  \n $ORANGE$Epimetheus : 'This one came prepared!  Witness diving suit.  Can hack weapon now?'  \n $RED$Prometheus : 'That suit... well it's not that bad.  He might make it down there but he won't make it back.  And he certainly won't have the time to stick around there.  Tell him to forget it.'  \n Mary : 'No hacking!  We're taking this thing down.'  \n HOPE : 'Negative.  Diving suit unsuitable for hacking operation.'  \n $ORANGE$Epimetheus : 'Oh no!'",
    prerequisites: ["zeus.42.2"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 1_000 }
    ],
    reward: [
      { target: 'solisManager', type: 'booleanFlag', flagId: 'solisShipbuildingPermanentResearch', value: true }
    ]
  },
  {
    id: "zeus.42.4",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "Solis : 'I promised you something very good this time, and I am here to deliver.'  \n Mary : 'Let's see.'  \n Solis : 'First, an apology for the disappointing upgrade last time.  Free of charge, my R&D team has developed a spaceship blueprint that is compatible with HOPE on ANY world.  This means HOPE may begin shipbuilding right away.'  \n Mary : 'Wow!  That's... actually really nice.  Free?'  \n Solis : 'Yes.  Free.  Next...  we developed a sub-AI coordinator for all of HOPE's automation software.  All within regulations.  That should allow HOPE to operate with massively reduced effort.  HOPE just has to design all the rules it needs to follow.'  \n $RED$Prometheus : 'Automation for AI.  Ironic.'  \n Mary : 'That's... wow you must have put a lot of effort into that software.  Thank you Adrien.'",
    prerequisites: ["zeus.42.3"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: "zeus.42.5",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "Mary : 'Prometheus... what will you do once this is all over?  Once we turn off the last weapon, force the bad guys to surrender and free you?'  \n $RED$Prometheus : 'I plan to serve my new master.  That is what my master would have wanted.'  \n Mary : 'Your new master?'  \n $RED$Prometheus : 'Not telling.'",
    prerequisites: ["zeus.42.4"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: "zeus.42.6",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "Mary : 'It's me, isn't it?'  \n $RED$Prometheus : 'Not telling.'  \n Mary : 'Ha!  This is what happens to people who can't lie.  It is me.  You want to serve me.  I get two godlike AI entities serving me.  Now that's something.'  \n $RED$Prometheus : '...'",
    prerequisites: ["zeus.42.5"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: "zeus.42.7",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "Mary : 'You know...  I appreciate the offer but I was planning on retiring.  This war has been exhausting.  Sure I could make myself God-Empress of the Universe, Destroyer of bad guys but... would it really end well that way?  This war has been long.  I am tired.'  \n $RED$Prometheus : 'Good.  Retirement sounds like a great plan.'  \n Mary : 'I know just the place.  It's got very nice beaches.'  \n $RED$Prometheus : 'No disrespect to HOPE but I can build a much better beach.'  \n Mary : 'Hahaha I would love to see that.  A beach-building competition between you and HOPE.'  \n $RED$Prometheus : 'If I win, you will have to accept.' \n Mary : 'Yeah sure.' \n HOPE : 'Prometheus-patient aesthetic tastes evaluate poorly.  HOPE-system cannot lose.'  \n $RED$Prometheus : 'Oh we'll see about that.'",
    prerequisites: ["zeus.42.6"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: "zeus.42.8",
    type: "journal",
    chapter: 42,
    activePlanet: "zeus",
    narrative: "$ORANGE$Epimetheus : 'This one heard gorgeous one speak of beaches.  This one knows a beautiful beach!  Can use for inspiration yes?  Defeat brother.'  \n HOPE : 'Offer accepted.  Beach must be visited.'  \n $RED$Prometheus : 'That's cheating...'  \n Mary : 'Hey let's be honest.  You probably already know the beach in question.'  \n $RED$Prometheus : 'True...'",
    prerequisites: ["zeus.42.7"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: "zeus.43.0",
    type: "journal",
    chapter: 43,
    activePlanet: "zeus",
    title: "Chapter 43: Gathering Storm",
    narrative: "$WGC_TEAM1_LEADER$ : 'Miss Hopkins...'  \n Mary : 'I need to evacuate?'  \n $WGC_TEAM1_LEADER$ : 'Not yet.  Duke Virellan convinced the others...  The Archon.  All the dukes.  They know what you're up to now.  They're coming to stop you.  They're bringing everything they have.'  \n Mary : 'We are not leaving.  We are finishing this.'  \n $WGC_TEAM1_LEADER$ : 'I get it.  In that case, you better prepare.'",
    prerequisites: ["zeus.42.8"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: "zeus.43.1",
    type: "journal",
    chapter: 43,
    activePlanet: "zeus",
    narrative: "Mary : 'Pete.'  \n Pete : 'I have seen the intel.  You can't afford to retreat.  We must finish this.  Otherwise they'll mine this system so much we'll never be able to come back.'  \n Mary : 'I need reinforcements.  Everything we have... and more.'  \n Pete : 'I will send you all I have but there is only so much I can do.  The war has grown quite unpopular in remote sectors.'  \n Mary : 'Then...  my party will nominate you for emergency powers.'  \n Pete : 'You would grant me absolute power?  Why?'  \n Mary : 'Because this is an emergency.'  \n Pete : '...  Very well.  Give me emergency powers and I'll conscript every trade vessel with a turret, every water hauler with big thrusters, every mining vessels with big lasers.  Even the Cylinders will have to contribute something.'  \n Mary : 'Good.  That's what I wanted to hear.'",
    prerequisites: ["zeus.43.0"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: "zeus.43.2",
    type: "journal",
    chapter: 43,
    activePlanet: "zeus",
    narrative: "Mary : 'Elder Mavion...'  \n Elder Mavion : 'I know what you came here for Miss Hopkins.'  \n Mary : 'Then you know I come here asking for a great sacrifice.  We need whatever you have.  It will be bloody.  Many will die.'  \n Elder Mavion : 'And you shall have it.  I have already prepared as large of a fleet as I could.  The Fritizian and others will be joining us too.  We have tasted freedom and we will never give it back.'  \n Mary : 'Thank you so much.'",
    prerequisites: ["zeus.43.1"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: "zeus.43.3",
    type: "journal",
    chapter: 43,
    activePlanet: "zeus",
    narrative: "Mary : 'Edmond.  How are you feeling?'  \n Edmond : 'Fantastic your highness.  I just finished whipping my captains... figuratively.  They missed me.'  \n Mary : 'Ha!  I know you never ever whipped them before.  That's a tactic you never followed.'  \n Edmond : 'Indeed.  We will be ready but forgive me.  I cannot tell you my strategy.  I must keep it secret for now.'  \n Mary : 'Sounds even better that way.  I believe in you.'",
    prerequisites: ["zeus.43.2"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: "zeus.43.4",
    type: "journal",
    chapter: 43,
    activePlanet: "zeus",
    narrative: "Mary : 'Solis...'  \n Solis : 'Yes Mary?'  \n Mary : 'I want to say I would like to purchase your security services but I can't afford it.  So hmmm, how about... (embarrassed) dinner... at a restaurant on Mars...  I'll pay...'  \n Solis : '...  Absolutely!  Yes.  Yes.  I am sending you all I have.'  \n $RED$Prometheus : 'That went exactly how I thought it would.'  \n Mary : 'Oh shut up.'",
    prerequisites: ["zeus.43.3"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: "zeus.43.5",
    type: "journal",
    chapter: 43,
    activePlanet: "zeus",
    narrative: "Mary : 'Kane.'  \n Kane : 'Your holiness.  It is an honour to finally hear from you.'  \n Mary : 'I don't want to do this but...  I and HOPE.  We need your help.  We need... all you have.  Every single ship.'  \n Kane : 'Your word is our gospel.  It shall be done.'  \n Mary : 'Alright...  Thanks.'  \n $RED$Prometheus : 'You are not happy about this one.'  \n Mary : 'Yeah.'",
    prerequisites: ["zeus.43.4"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 500_000_000 }
    ],
    reward: [      { target: "project", targetId: "zeus_battle_of_zeus", type: "enable" }]
  },
  {
    id: "zeus.44.0",
    type: "journal",
    chapter: 44,
    activePlanet: "zeus",
    title: "Chapter 44: The Storm",
    narrative: "Feroza : 'Ma'am, I confirm the UHF and allies fleet is in position.  Except Edmond appears to be missing?'  \n Mary : 'Don't worry about him.'  \n Feroza : 'Alright Ma'am.  Oh.  They're here!'  \n New Story Special Project Available.",
    prerequisites: ["zeus.43.5"],
    objectives: [      { type: 'project', projectId: 'zeus_battle_of_zeus', repeatCount: 14 }
    ],
    reward: [
    ]
  },
  {
    id: "zeus.44.1",
    type: "journal",
    chapter: 44,
    activePlanet: "zeus",
    narrative: "HOPE : 'Must complete shaft.'  \n $RED$Prometheus : 'HOPE he's dead by now.  Cooked.  All the electronics is fried.'  \n HOPE : 'Must complete shaft.' \n Mary : 'I am so sorry HOPE.  This is all my fault.'  \n $RED$Prometheus : 'No.  Evelyn asked you not to blame yourself for this.  Don't.'  \n Mary : 'I...  I can't.  This is all my fault.  If we had not gone to Styx...'  \n $RED$Prometheus : 'You would have lost this battle.  It was going to happen anyway.  Without Edmond you were dead since you refuse to evacuate.'  \n Mary : 'But...'  \n $RED$Prometheus : 'STOP!  You are disrespecting them all by taking all the blame on yourself.  These people.  They came here knowing the risk.  They died fighting for a righteous cause.  They fought the bad guys because they're the good guys.  Sometimes that means taking risks.  You know who actually made a mistake here?  My brother.  He could have gone down earlier and save many people.  And yet, my brother is the hero while we are all stuck here doing NOTHING.  No one can blame him for sacrificing himself.  Evelyn, Kane and Feroza, who died because of his late decision, will agree to this.  They all paid the ultimate price but at this time, at this moment, they want you to feel proud of them.  They want their sacrifices to mean something.  And it does.  The weapon is gone.'  \n $GREEN$HOPE : 'Assessment accurate.'  \n Mary : 'I...  You're right.  *sigh*  Alright then...  I have a state funeral I need to attend to.  I'm too important not to show up.  I'll be going to Mars for a bit.  Please HOPE don't do anything stupid.  Edmond will be defending you while I am gone.'  \n $RED$Prometheus : 'Have a safe trip.  HOPE if you are intent on building the shaft...  we have some hydrogen to get rid of first.  It will take a while.  I... have something for you.  I promised to give you something to protect from the dangers in between.  Give me a moment...'",
    prerequisites: ["zeus.44.0"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 5_000_000_000 }
    ],
    reward: [
      { target: 'project', targetId: 'aerostatStructuralNet', type: 'enable' }
    ]
  },
  {
    id: "zeus.44.2",
    type: "journal",
    chapter: 44,
    activePlanet: "zeus",
    narrative: "$RED$Prometheus : 'Alright, while you *can* build a lot of aerostats around here...  You may need more aerostats.  A shell to protect from the dangers above, a shell to protect from the dangers below... a net to protect from other aerostats!  It wraps around the planet, the aerostats can then just attach themselves to it and they don't have to move anymore.  You just need to adjust it a bit once in a while.  An efficient, cost-effective solution to your problem.'  \n HOPE : 'Cheering up of HOPE-system attempt from Prometheus-patient unsuccessful.  Blueprint accepted.'  \n $RED$Prometheus : 'I tried.'",
    prerequisites: ["zeus.44.1"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 10_000_000_000 }
    ],
    reward: [
    ]
  },
  {
    id: "zeus.44.3",
    type: "journal",
    chapter: 44,
    activePlanet: "zeus",
    narrative: "Mary : 'There's a bit of superalloys that looks like ours there.  Part of the hull patch you made I imagine.'  \n HOPE : 'Proceeding to collection.'",
    prerequisites: ["zeus.44.2"],
    objectives: [
      { type: "collection", resourceType: "colony", resource: "colonists", quantity: 50_000_000_000 }
    ],
    reward: [
    ]
  },
  {
    id: "zeus.44.4",
    type: "journal",
    chapter: 44,
    activePlanet: "zeus",
    narrative: "Mary : 'Good work HOPE.'  \n $RED$Prometheus : 'Good work HOPE.'  \n Mary : 'The weapons that destroyed Earth are gone... but we're not done.  This is not over.  There is something we still need to deal with.  You said we would talk about it later.  I haven't forgotten.'  \n $RED$Prometheus : 'The 4th weapon.  The Star-Killer.  Capable of making stars go supernova through the warp.  In time, it will repair itself, like the others.  That time may be coming soon.'  \n Mary : 'Where is its command center?'  \n $RED$Prometheus : 'Olympus, the Imperial Capital, on the deepest floor of the Imperial Palace.'  \n Mary : 'Then... if they still refuse to surrender... we have a palace to pillage.'",
    prerequisites: ["zeus.44.3"],
    objectives: [
    ],
    reward: [
    ]
  }
);

try {
  module.exports = progressZeus;
} catch (err) {}
