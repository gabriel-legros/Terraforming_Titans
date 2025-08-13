/* ==========================================================================
   Planetary Thrusters – continuous‑burn, moon‑escape, live Energy display
   ========================================================================== */

const G  = 6.67430e-11;
const SOLAR_MASS   = 1.989e30;
const AU_IN_METERS = 1.496e11;
const FUSION_VE    = 1.0e5;               // 100 km s‑1
const BASE_TP_RATIO = 2 / FUSION_VE;
const ESCAPE_L1_FACTOR = 1.0;             // scale of Hill-radius target for escape

// rotationPeriodToDuration is defined globally in the browser but must be
// required explicitly when running under Node.js for tests
let rotationPeriodToDurationFunc = (typeof globalThis !== 'undefined' &&
  globalThis.rotationPeriodToDuration) ? globalThis.rotationPeriodToDuration : null;
try {
  if (typeof require === 'function') {
    ({ rotationPeriodToDuration: rotationPeriodToDurationFunc } = require('../day-night-cycle.js'));
  }
} catch (e) {}

/* ---------- helpers ---------------------------------------------------- */
const fmt=(n,int=false,d=0)=>isNaN(n)?"–":
  n.toLocaleString(undefined,int?{maximumFractionDigits:0}:
                             {minimumFractionDigits:d,maximumFractionDigits:d});

function formatEnergy(J){
  return formatNumber(J / 86400);
}

function getRotHours(p){ return p && p.rotationPeriod>0?p.rotationPeriod:24; }

function spinDeltaV(Rkm,curH,tgtH){
  const R=Rkm*1e3,w1=2*Math.PI/(curH*3600),w2=2*Math.PI/(tgtH*3600);
  return Math.abs((w2-w1)*R);
}

function spinEnergyRemaining(p, Rkm, targetDays, tpRatio){
  const k = p.kInertia || 0.4;                 // allow parameter override
  const curH = getRotHours(p);
  const dvEq = Math.abs(
        2*Math.PI/(targetDays*24*3600) - 2*Math.PI/(curH*3600)) * (Rkm*1e3);
  return k * p.mass * dvEq / tpRatio;
}

function spiralDeltaV(curAU,tgtAU,mu=G*SOLAR_MASS){
  const r1=curAU*AU_IN_METERS,r2=tgtAU*AU_IN_METERS;
  return Math.abs(Math.sqrt(mu/r1)-Math.sqrt(mu/r2));
}
function translationalEnergyRemaining(p,dvRem,tpRatio){
  return p.mass * dvRem / tpRatio;
}

// Hill radius in **meters** – uses the planet's heliocentric distance (per data model)
function hillRadiusMeters(p, parent, starMass = SOLAR_MASS) {
  const a = (p.distanceFromSun ?? 1) * AU_IN_METERS; // heliocentric a lives on the planet
  return a * Math.cbrt(parent.mass / (3 * starMass));
}

// Δv to raise **apoapsis** from r0 -> rA (tangential burn at r0), two-body about parent
function dvRaiseApoapsis(mu, r0, rA) {
  const v0 = Math.sqrt(mu / r0);
  return v0 * (Math.sqrt((2 * rA) / (r0 + rA)) - 1);
}

// Δv to send the moon onto an ellipse with apogee ~ L1/Hill (injection)
function escapeDeltaVToHill(p, parent, orbitRkm, starMass = SOLAR_MASS, factor = ESCAPE_L1_FACTOR) {
  const mu = G * parent.mass;
  const r0 = orbitRkm * 1e3;
  const rA = hillRadiusMeters(p, parent, starMass) * factor;
  if (rA <= r0) return 0;
  return dvRaiseApoapsis(mu, r0, rA);
}

// Δv to **arrive** at L1/Hill by slowly spiraling (circular→circular approximation)
function dvToCircularAtRadius(mu, r0, rTarget) {
  if (rTarget <= r0) return 0;
  return Math.sqrt(mu / r0) - Math.sqrt(mu / rTarget);
}

// Helper: treat as bound only if a parent exists **and** we haven't marked escape
function isBoundToParent(p){
  return !!(p && p.parentBody && !p.hasEscapedParent);
}

/* ========================================================================= */
class PlanetaryThrustersProject extends Project{

  constructor(cfg,name){
    super(cfg,name);
    this.power=0;this.step=1;
    this.spinInvest=false;this.motionInvest=false;

    this.tgtDays=1;this.tgtAU=1;

    this.dVreq=0;this.dVdone=0;
    this.spinStartDays=null;
    this.escapePhase=false;          // transient state while spiraling out
    this.startAU=null;

    this.energySpentSpin=0;this.energySpentMotion=0;
    this.activeMode=null;
    this.escapeTargetRkm = null;
    this.escapeComplete = false;     // persisted fallback if planet flag unavailable on load
    this.el={};
  }

  hasTractorBeams(){
    return this.isBooleanFlagSet && this.isBooleanFlagSet('tractorBeams');
  }

  getThrustPowerRatio(){
    return this.hasTractorBeams() ? 1 : BASE_TP_RATIO;
  }

/* -----------------------  U I  --------------------------------------- */
  renderUI(c){
    /* spin */
    const spinHTML=`<div class="card-header"><span class="card-title">Spin <span class="info-tooltip-icon" title="Use planetary thrusters to change the world's rotation period. When you check Invest, continuous thruster power is applied toward the target day length, consuming colony Energy per second. Progress is measured in equivalent Δv; when the target is reached, investment stops automatically.">&#9432;</span></span></div>
    <div class="card-body">
      <div class="stats-grid five-col">
        <div><span class="stat-label">Rotation:</span><span id="rotNow" class="stat-value">—</span></div>
        <div><span class="stat-label">Target:</span>
             <input id="rotTarget" type="number" min="0.1" step="0.1" value="1"><span>day</span></div>
        <div><span class="stat-label">Equiv. Δv:</span><span id="rotDv" class="stat-value">—</span></div>
        <div><span class="stat-label">Energy Cost:</span><span id="rotE" class="stat-value">—</span></div>
        <div><span class="stat-label">Energy Spent:</span><span id="rotSpent" class="stat-value">0</span></div>
      </div>
      <div class="invest-container left"><label><input id="rotInvest" type="checkbox"> Invest</label></div>
    </div>`;
    const spinCard=document.createElement('div');spinCard.className="info-card";spinCard.innerHTML=spinHTML;c.appendChild(spinCard);
    spinCard.style.display=this.isCompleted?"block":"none";

    /* motion */
    const motHTML=`<div class="card-header"><span class="card-title">Motion <span class="info-tooltip-icon" title="Use planetary thrusters to change the world's orbit. If bound to a parent body (moon), investment first drives a slow spiral to the Hill radius (escape). After escape, investment changes heliocentric distance toward the target AU. Investment consumes Energy continuously; only one mode (Spin or Motion) can be active at a time.">&#9432;</span></span></div>
    <div class="card-body">
      <div class="stats-grid five-col">
        <div><span class="stat-label">Distance:</span><span id="distNow" class="stat-value">—</span></div>
        <div id="parentRow" style="display:none;">
           <span class="stat-label">Around:</span><span id="parentName" class="stat-value">—</span>
           <span>&nbsp;at </span><span id="parentRad" class="stat-value">—</span>
        </div>
        <div><span class="stat-label">Target:</span>
             <input id="distTarget" type="number" min="0.1" step="0.1" value="1"><span>AU</span></div>
        <div><span class="stat-label">Spiral Δv:</span><span id="distDv" class="stat-value">—</span></div>
        <div id="escapeRow" style="display:none;">
             <span class="stat-label">Escape Δv:</span><span id="escDv" class="stat-value">—</span>
        </div>
        <div id="hillRow" style="display:none;">
            <span class="stat-label">Hill Radius:</span><span id="hillVal" class="stat-value">—</span>
        </div>
        <div><span class="stat-label">Energy Cost:</span><span id="distE" class="stat-value">—</span></div>
        <div><span class="stat-label">Energy Spent:</span><span id="distSpent" class="stat-value">0</span></div>
      </div>
      <div class="invest-container left"><label><input id="distInvest" type="checkbox"> Invest</label></div>
      <div id="moonWarn" class="moon-warning" style="display:none;">⚠ Escape parent first</div>
    </div>`;
    const motCard=document.createElement('div');motCard.className="info-card";motCard.innerHTML=motHTML;c.appendChild(motCard);
    motCard.style.display=this.isCompleted?"block":"none";

    /* power */
    const veDisplay = this.hasTractorBeams()
      ? 'N/A'
      : `${fmt(FUSION_VE,false,0)} m/s`;
    const pwrHTML=`<div class="card-header"><span class="card-title">Thruster Power</span></div>
    <div class="card-body">
      <div class="stats-grid four-col">
        <div><span class="stat-label">Continuous:</span><span id="pwrVal" class="stat-value">0</span></div>
        <div class="thruster-power-controls">
          <div class="main-buttons">
            <button id="p0">0</button><button id="pMinus">-</button><button id="pPlus">+</button>
          </div>
          <div class="multiplier-container">
            <button id="pDiv">/10</button><button id="pMul">x10</button>
          </div>
        </div>
      <div><span class="stat-label">Exhaust Velocity:<span class="info-tooltip-icon" title="Exhaust velocity (Ve) measures how fast propellant is ejected. A higher Ve provides more thrust per unit of propellant, increasing mass efficiency. It is directly related to Specific Impulse (Isp), a standard measure of engine performance, via the formula Isp = Ve / g₀ (where g₀ is standard gravity). While you must supply the energy, the required propellant is sourced locally and does not have a resource cost.">&#9432;</span></span><span id="veVal" class="stat-value">${fmt(FUSION_VE,false,0)} m/s</span></div>
      <div><span class="stat-label">Thrust / Power:<span class="info-tooltip-icon" title="This ratio measures how efficiently thrusters convert input energy (Power) into motive force (Thrust). For an ideal engine, this value is T/P = 2 / Ve. Fusion drives have very high exhaust velocity, making them extremely propellant-efficient, but this comes at the cost of a lower thrust-to-power ratio.">&#9432;</span></span><span id="tpVal" class="stat-value">${fmt(this.getThrustPowerRatio(),false,6)} N/W</span></div>
      </div>
    </div>`;
    const pwrCard=document.createElement('div');pwrCard.className="info-card";pwrCard.innerHTML=pwrHTML;c.appendChild(pwrCard);
    pwrCard.style.display=this.isCompleted?"block":"none";

    /* refs */
    const g=(sel,r)=>r.querySelector(sel);
    const distTargetEl = g('#distTarget', motCard);
    const distDvEl = g('#distDv', motCard);
    this.el={spinCard, motCard, pwrCard,
      rotNow:g('#rotNow',spinCard),rotTarget:g('#rotTarget',spinCard),
      rotDv:g('#rotDv',spinCard),rotE:g('#rotE',spinCard),rotCb:g('#rotInvest',spinCard),rotSpent:g('#rotSpent',spinCard),
      distNow:g('#distNow',motCard),distTarget:distTargetEl,
      distTargetRow:distTargetEl.parentElement,
      distDv:distDvEl,distDvRow:distDvEl.parentElement,
      distE:g('#distE',motCard),distCb:g('#distInvest',motCard),distSpent:g('#distSpent',motCard),
      escRow:g('#escapeRow',motCard),escDv:g('#escDv',motCard),
      hillRow:g('#hillRow',motCard),hillVal:g('#hillVal',motCard),
      parentRow:g('#parentRow',motCard),parentName:g('#parentName',motCard),
      parentRad:g('#parentRad',motCard),moonWarn:g('#moonWarn',motCard),
      pwrVal:g('#pwrVal',pwrCard),veVal:g('#veVal',pwrCard),tpVal:g('#tpVal',pwrCard),
      pPlus:g('#pPlus',pwrCard),pMinus:g('#pMinus',pwrCard),
      pDiv:g('#pDiv',pwrCard),pMul:g('#pMul',pwrCard),p0:g('#p0',pwrCard)};

    /* restore saved values */
    this.el.rotCb.checked = this.spinInvest;
    this.el.distCb.checked = this.motionInvest;
    this.el.rotTarget.value = this.tgtDays;
    this.el.distTarget.value = this.tgtAU;

    /* listeners */
    this.el.rotTarget.oninput = ()=>this.calcSpinCost();
    this.el.distTarget.oninput= ()=>this.calcMotionCost();

    this.el.rotCb.onchange = ()=>{
      this.spinInvest = this.el.rotCb.checked;
      if(this.spinInvest){
        this.motionInvest=false;this.el.distCb.checked=false;
        if(this.dVreq===0 || this.activeMode!=='spin') this.prepareJob(true,false);
        this.activeMode='spin';
      }
    };
    this.el.distCb.onchange= ()=>{
      this.motionInvest = this.el.distCb.checked;
      if(this.motionInvest){
        this.spinInvest=false;this.el.rotCb.checked=false;
        if(this.dVreq===0 || this.activeMode!=='motion') this.prepareJob(true,false);
        this.activeMode='motion';
      }
    };

    const up=()=>this.updateUI();
    this.el.pPlus.onclick =()=>{this.adjustPower(+this.step);up();};
    this.el.pMinus.onclick=()=>{this.adjustPower(-this.step);up();};
    this.el.pMul.onclick  =()=>{this.step*=10;up();};
    this.el.pDiv.onclick  =()=>{this.step=Math.max(1,this.step/10);up();};
    this.el.p0.onclick    =()=>{this.setPower(0);up();};

    // Pre-populate preview costs before first update
    this.calcSpinCost();
    this.calcMotionCost();

    this.updateUI();
  }

/* ---------- cost calculations ---------------------------------------- */
  calcSpinCost(){
    const p=terraforming.celestialParameters;if(!p)return;
    let tgt=1;
    try{
      const v=this.el.rotTarget&&this.el.rotTarget.value;
      const n=parseFloat(v);
      if(!isNaN(n)) tgt=n;
    }catch(e){ tgt=1; }
    const changed = tgt !== this.tgtDays;
    this.tgtDays=tgt;
    const dv=spinDeltaV(p.radius,getRotHours(p),this.tgtDays*24);
    this.el.rotDv.textContent=fmt(dv,false,3)+" m/s";
    this.el.rotE.textContent =formatEnergy(spinEnergyRemaining(p,p.radius,this.tgtDays,this.getThrustPowerRatio()));
    if(changed){
      this.energySpentSpin=0;
      this.spinStartDays=null;
    }
    if(this.spinInvest && (changed || this.dVreq===0)) { this.prepareJob(true,false); this.activeMode='spin'; }
  }

  calcMotionCost(){
    const p=terraforming.celestialParameters;if(!p)return;
    // If we've escaped previously, ignore parent for preview and show heliocentric costs
    if(!isBoundToParent(p)){
      let tgt=1;
      try{
        const v=this.el.distTarget&&this.el.distTarget.value;
        const n=parseFloat(v);
        if(!isNaN(n)) tgt=n;
      }catch(e){ tgt=1; }
      const changed = tgt !== this.tgtAU;
      this.tgtAU=tgt;
      this.el.distTargetRow.style.display="block";
      this.el.distDvRow.style.display="block";
      this.el.escRow.style.display=this.el.parentRow.style.display=this.el.moonWarn.style.display=this.el.hillRow.style.display="none";
      const starM = (p.starMass || SOLAR_MASS);
      const dv=spiralDeltaV(p.distanceFromSun||this.tgtAU,this.tgtAU, G*starM);
      this.el.distDv.textContent=fmt(dv,false,3)+" m/s";
      this.el.distE.textContent=formatEnergy(translationalEnergyRemaining(p,dv,this.getThrustPowerRatio()));
      if(changed){
        this.energySpentMotion=0;
        this.startAU=null;
      }
      if(this.motionInvest && (changed || this.dVreq===0)) { this.prepareJob(true,false); this.activeMode='motion'; }
      return;
    }

    const parent=p.parentBody;
    this.tgtAU=1;
    this.el.distTargetRow.style.display = "none";
    this.el.distDvRow.style.display = "none"; // preview via Escape row for moons
    const starM = (p.starMass || SOLAR_MASS);
    const r_hill_m = hillRadiusMeters(p, parent, starM);
    // Show **arrival** cost (spiral to L1), not just injection
    const escArrival = dvToCircularAtRadius(G*parent.mass, parent.orbitRadius*1e3, r_hill_m);
    this.el.escDv.textContent = fmt(escArrival, false, 3) + " m/s";
    this.el.escRow.style.display = "block"; // Show escape row
    this.el.parentRow.style.display = "block";
    this.el.moonWarn.style.display = "block";
    this.el.hillRow.style.display = "block";
    this.el.hillVal.textContent = fmt(r_hill_m / 1e3, false, 0) + " km";
    this.el.parentName.textContent = parent.name || "Parent";
    this.el.parentRad.textContent = fmt(parent.orbitRadius, false, 0) + " km";
    this.el.distE.textContent = formatEnergy(p.mass * escArrival / this.getThrustPowerRatio());
    if(this.motionInvest && this.dVreq===0) { this.prepareJob(true,false); this.activeMode='motion'; }
  }

/* ---------- job preparation ------------------------------------------ */
  prepareJob(resetDV=false, resetEnergy=false){
    const p=terraforming.celestialParameters;if(!p)return;
    if(resetDV) this.dVdone=0;

    if(this.spinInvest){
      if(resetEnergy || this.spinStartDays===null){
        this.energySpentSpin=0;
        this.spinStartDays=getRotHours(p)/24;
      }
      this.dVreq=spinDeltaV(p.radius,this.spinStartDays*24,this.tgtDays*24);
      return;
    }

    if(this.motionInvest){
      if(resetEnergy) this.energySpentMotion=0;
      if (isBoundToParent(p)) {
        this.escapePhase = true;
        const starM = (p.starMass || SOLAR_MASS);
        const r_hill_m = hillRadiusMeters(p, p.parentBody, starM);
        this.escapeTargetRkm = r_hill_m / 1e3; // store km
        // Use **arrival** cost so UI and threshold match; keep for progress bars if desired
        this.dVreq = dvToCircularAtRadius(G*p.parentBody.mass, p.parentBody.orbitRadius*1e3, r_hill_m);
      }else{
        this.escapePhase=false;
        if(resetDV || this.startAU===null) this.startAU=p.distanceFromSun;
        const starM = (p.starMass || SOLAR_MASS);
        this.dVreq=spiralDeltaV(this.startAU,this.tgtAU, G*starM);
      }
    }
  }

/* ---------- UI refresh ------------------------------------------------ */
  updateUI(){
    if(this.el.spinCard){
      const vis = this.isCompleted ? 'block' : 'none';
      this.el.spinCard.style.display = vis;
      this.el.motCard.style.display = vis;
      this.el.pwrCard.style.display = vis;
    }
    if(this.el.rotCb) this.el.rotCb.checked = this.spinInvest;
    if(this.el.distCb) this.el.distCb.checked = this.motionInvest;
    const p=terraforming.celestialParameters||{};

    // If the project state says we escaped, mirror that onto the planet on load
    if(this.escapeComplete && p && !p.hasEscapedParent){ p.hasEscapedParent = true; }

    this.el.rotNow.textContent = fmt(getRotHours(p)/24,false,3)+" days";
    // Show parent-centric radius when truly bound; heliocentric AU otherwise
    this.el.distNow.textContent = isBoundToParent(p)
      ? fmt(p.parentBody.orbitRadius||0,false,0)+" km"
      : fmt(p.distanceFromSun||0,false,3)+" AU";
    this.el.pwrVal.textContent = formatNumber(this.power, true)+" W";
    if(this.el.veVal) this.el.veVal.textContent = this.hasTractorBeams()
      ? 'N/A'
      : fmt(FUSION_VE,false,0)+" m/s";
    if(this.el.tpVal) this.el.tpVal.textContent = fmt(this.getThrustPowerRatio(),false,6)+" N/W";
    this.el.pPlus.textContent="+"+formatNumber(this.step,true);
    this.el.pMinus.textContent="-"+formatNumber(this.step,true);

    /* delta v and energy refresh */
    if(this.el.rotTarget){
      let tgtDays = 1;
      try{
        const v=this.el.rotTarget.value;
        const n=parseFloat(v);
        if(!isNaN(n)) tgtDays=n;
      }catch(e){ tgtDays=1; }
      this.tgtDays = tgtDays;
      if(p && p.radius){
        const dv=spinDeltaV(p.radius,getRotHours(p),tgtDays*24);
        this.el.rotDv.textContent=fmt(dv,false,3)+" m/s";
        this.el.rotE.textContent=formatEnergy(spinEnergyRemaining(p,p.radius,tgtDays,this.getThrustPowerRatio()));
      }
    }

    if(this.el.distTarget){
      if(isBoundToParent(p)){
        this.tgtAU = 1;
        this.el.distTargetRow.style.display="none";
        this.el.distDvRow.style.display="none"; // use Escape row when bound to parent
        const parent=p.parentBody;
        const starM = (p.starMass || SOLAR_MASS);
        const r_hill_m = hillRadiusMeters(p, parent, starM);

        // Compute **remaining** Δv from current parent radius to Hill/L1
        const mu = G*parent.mass;
        const r_now_m = parent.orbitRadius*1e3;
        const dvRemaining = dvToCircularAtRadius(mu, r_now_m, r_hill_m);

        this.el.escRow.style.display = "block";
        this.el.escDv.textContent = fmt(dvRemaining, false, 3) + " m/s";
        this.el.parentRow.style.display = "block";
        this.el.moonWarn.style.display = "block";
        this.el.hillRow.style.display = "block";
        this.el.hillVal.textContent = fmt(r_hill_m / 1e3, false, 0) + " km";
        this.el.parentName.textContent = parent.name || "Parent";
        this.el.parentRad.textContent = fmt(parent.orbitRadius, false, 0) + " km";

        // Energy cost reflects **remaining** Δv (not job bookkeeping)
        this.el.distE.textContent = formatEnergy(p.mass * dvRemaining / this.getThrustPowerRatio());
      }else if(p){
        let tgtAU = 1;
        try{
          const v=this.el.distTarget.value;
          const n=parseFloat(v);
          if(!isNaN(n)) tgtAU=n;
        }catch(e){ tgtAU=1; }
        this.tgtAU = tgtAU;
        this.el.distTargetRow.style.display="block";
        this.el.distDvRow.style.display="block";
        this.el.escRow.style.display=this.el.parentRow.style.display=this.el.moonWarn.style.display=this.el.hillRow.style.display="none";
        const curAU=p.distanceFromSun||tgtAU;
        const starM = (p.starMass || SOLAR_MASS);
        const dvPreview=spiralDeltaV(curAU,tgtAU, G*starM);
        this.el.distDv.textContent=fmt(dvPreview,false,3)+" m/s";
        // For heliocentric moves, show remaining dv based on job when active
        const usingJob  = this.motionInvest && this.dVreq > 0;
        const dvRem     = usingJob ? Math.max(0,this.dVreq-this.dVdone) : dvPreview;
        this.el.distE.textContent=formatEnergy(translationalEnergyRemaining(p,dvRem,this.getThrustPowerRatio()));
      }
    }

    if(this.el.rotSpent){
      this.el.rotSpent.textContent = formatEnergy(this.energySpentSpin);
    }
    if(this.el.distSpent){
      this.el.distSpent.textContent = formatEnergy(this.energySpentMotion);
    }
  }

/* ---------- power controls ------------------------------------------- */
  adjustPower(d){this.power=Math.max(0,this.power+d);}  
  setPower(v){this.power=Math.max(0,v);}  

/* ------------------  T I C K  ---------------------------------------- */
  update(dtMs){
    super.update(dtMs);
    if(!this.isCompleted) return;
    if((!this.spinInvest && !this.motionInvest) || this.power<=0) return;

    const p=terraforming.celestialParameters;if(!p)return;

    // If project says we escaped earlier, mirror that onto the planet (handles load-order)
    if(this.escapeComplete && !p.hasEscapedParent){ p.hasEscapedParent = true; }

    const dt=dtMs/1000;
    const need=this.power*dt;
    if(resources.colony && resources.colony.energy && resources.colony.energy.value<need) return;
    resources.colony.energy.decrease(need);

    const energySpent=need*86400;

    if(this.spinInvest){ this.energySpentSpin += energySpent; }
    else if(this.motionInvest){ this.energySpentMotion += energySpent; }

    const a=this.power*this.getThrustPowerRatio()/p.mass*86400;
    const dvTick=a*dt; this.dVdone+=dvTick;

    /* ------ spin -------- */
    if(this.spinInvest){
      const sign=this.tgtDays<this.spinStartDays?1:-1;
        const dΩ=sign*dvTick/(p.radius*1e3);
        const ω=2*Math.PI/(getRotHours(p)*3600)+dΩ;
        p.rotationPeriod=2*Math.PI/ω/3600;
        if(typeof dayNightCycle !== 'undefined' && rotationPeriodToDurationFunc){
          dayNightCycle.dayDuration = rotationPeriodToDurationFunc(p.rotationPeriod);
        }
        if(this.dVdone>=this.dVreq){this.spinInvest=false;this.dVreq=this.dVdone=0;this.activeMode=null;}
        this.updateUI(); return;
      }

    /* ------ motion ------- */
    if(this.motionInvest){
      if (isBoundToParent(p)) { // escape phase while truly bound to a parent
        const parent = p.parentBody;
        const mu = G * parent.mass;
        const starM = (p.starMass || SOLAR_MASS);

        // Current circular orbit about parent
        let r = parent.orbitRadius * 1e3;
        const v = Math.sqrt(mu / r);

        // Energy after this tick (tangential thrust)
        let E = -mu / (2 * r) + v * a * dt;  // a is your tangential accel

        // Threshold: **arrive** at L1/Hill radius (not just injection)
        const rL1 = (this.escapeTargetRkm ?? (hillRadiusMeters(p, parent, starM) / 1e3)) * 1e3;

        // Advance to new (circularized) radius from the updated energy
        const a_new = -mu / (2 * E);
        parent.orbitRadius = a_new / 1e3;
        r = a_new; // update local meters value

        if (r >= rL1) {
          // Mark escaped without deleting parent to avoid save/load regeneration issues
          p.hasEscapedParent = true;
          this.escapeComplete = true;
          this.escapePhase = false;
          this.startAU = p.distanceFromSun; // stays on the planet per your model
          this.dVdone = 0;
          this.energySpentMotion = 0;    // optional reset for clarity
          const starM = (p.starMass || SOLAR_MASS);
          this.dVreq = spiralDeltaV(this.startAU, this.tgtAU, G*starM);
          this.calcMotionCost();
          this.updateUI();
          return;
        }
      } else {
        const mu=G*(p.starMass || SOLAR_MASS);
        let a_sma=p.distanceFromSun*AU_IN_METERS;
        const v=Math.sqrt(mu/a_sma);
        let E=-mu/(2*a_sma)+v*a*dt*(this.tgtAU>this.startAU?+1:-1);
        a_sma=-mu/(2*E);
        p.distanceFromSun=a_sma/AU_IN_METERS;
        if((this.tgtAU>this.startAU&&p.distanceFromSun>=this.tgtAU)||
           (this.tgtAU<this.startAU&&p.distanceFromSun<=this.tgtAU)||
           this.dVdone>=this.dVreq){
          p.distanceFromSun=this.tgtAU;
          this.motionInvest=false;this.dVreq=this.dVdone=0;this.activeMode=null;
        }
      }
      this.updateUI();
    }
  }

  estimateCostAndGain(){
    if(!this.isCompleted) return;
    if((!this.spinInvest && !this.motionInvest) || this.power<=0) return;
    if(resources && resources.colony && resources.colony.energy &&
       typeof resources.colony.energy.modifyRate === 'function'){
      resources.colony.energy.modifyRate(-this.power, 'Planetary Thrusters', 'project');
    }
  }

  saveState(){
    const state = super.saveState();
    state.power = this.power;
    state.step = this.step;
    state.spinInvest = this.spinInvest;
    state.motionInvest = this.motionInvest;
    state.tgtDays = this.tgtDays;
    state.tgtAU = this.tgtAU;
    state.dVreq = this.dVreq;
    state.dVdone = this.dVdone;
    state.spinStartDays = this.spinStartDays;
    state.escapePhase = this.escapePhase;
    state.startAU = this.startAU;
    state.energySpentSpin = this.energySpentSpin;
    state.energySpentMotion = this.energySpentMotion;
    state.escapeComplete = this.escapeComplete; // persist the logical escape flag
    return state;
  }

  loadState(state){
    super.loadState(state);
    this.power = state.power || 0;
    this.step = state.step || 1;
    this.spinInvest = state.spinInvest || false;
    this.motionInvest = state.motionInvest || false;
    this.tgtDays = state.tgtDays || 1;
    this.tgtAU = state.tgtAU || 1;
    this.dVreq = state.dVreq || 0;
    this.dVdone = state.dVdone || 0;
    this.spinStartDays = state.spinStartDays ?? null;
    this.escapePhase = state.escapePhase || false;
    this.startAU = state.startAU ?? null;
    this.energySpentSpin = state.energySpentSpin || 0;
    this.energySpentMotion = state.energySpentMotion || 0;
    this.escapeComplete = !!state.escapeComplete;

    // If the planet exists already and we previously escaped, mirror the flag onto it
    const p = (typeof terraforming!=='undefined') ? terraforming.celestialParameters : null;
    if(p && this.escapeComplete){ p.hasEscapedParent = true; }

    if(this.el && Object.keys(this.el).length){
      if(this.el.rotCb) this.el.rotCb.checked = this.spinInvest;
      if(this.el.distCb) this.el.distCb.checked = this.motionInvest;
      if(this.el.rotTarget) this.el.rotTarget.value = this.tgtDays;
      if(this.el.distTarget) this.el.distTarget.value = this.tgtAU;
      this.updateUI();
    }
  }
}

/* expose */
if(typeof globalThis!=="undefined")globalThis.PlanetaryThrustersProject=PlanetaryThrustersProject;
if(typeof module!=="undefined")module.exports=PlanetaryThrustersProject;
