/* ==========================================================================
   Planetary Thrusters – continuous‑burn, moon‑escape, live Energy display
   ========================================================================== */

const G  = 6.67430e-11;
const SOLAR_MASS   = 1.989e30;
const AU_IN_METERS = 1.496e11;
const FUSION_VE    = 1.0e5;               // 100 km s‑1

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

function spinEnergyRemaining(p, Rkm, targetDays){
  const k = p.kInertia || 0.4;                 // allow parameter override
  const curH = getRotHours(p);
  const dvEq = Math.abs(
        2*Math.PI/(targetDays*24*3600) - 2*Math.PI/(curH*3600)) * (Rkm*1e3);
  return 0.5 * k * p.mass * FUSION_VE * dvEq;  // propellant energy
}

function spiralDeltaV(curAU,tgtAU,mu=G*SOLAR_MASS){
  const r1=curAU*AU_IN_METERS,r2=tgtAU*AU_IN_METERS;
  return Math.abs(Math.sqrt(mu/r1)-Math.sqrt(mu/r2));
}
function translationalEnergyRemaining(p,dvRem){
  return 0.5*p.mass*FUSION_VE*dvRem;                 // ideal fusion rocket
}

function escapeDeltaV(parentM,orbitRkm){
  const r=orbitRkm*1e3; const vo=Math.sqrt(G*parentM/r);
  return (Math.SQRT2-1)*vo;
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
    this.escapePhase=false;
    this.startAU=null;

    this.el={};
  }

/* -----------------------  U I  --------------------------------------- */
  renderUI(c){
    /* spin */
    const spinHTML=`<div class="card-header"><span class="card-title">Spin</span></div>
    <div class="card-body">
      <div class="stats-grid four-col">
        <div><span class="stat-label">Rotation:</span><span id="rotNow" class="stat-value">—</span></div>
        <div><span class="stat-label">Target:</span>
             <input id="rotTarget" type="number" min="0.1" step="0.1" value="1"><span>day</span></div>
        <div><span class="stat-label">Equiv. Δv:</span><span id="rotDv" class="stat-value">—</span></div>
        <div><span class="stat-label">Energy Cost:</span><span id="rotE" class="stat-value">—</span></div>
      </div>
      <div class="invest-container left"><label><input id="rotInvest" type="checkbox"> Invest</label></div>
    </div>`;
    const spinCard=document.createElement('div');spinCard.className="info-card";spinCard.innerHTML=spinHTML;c.appendChild(spinCard);
    spinCard.style.display=this.unlocked?"block":"none";

    /* motion */
    const motHTML=`<div class="card-header"><span class="card-title">Motion</span></div>
    <div class="card-body">
      <div class="stats-grid four-col">
        <div><span class="stat-label">Distance:</span><span id="distNow" class="stat-value">—</span></div>
        <div id="parentRow" style="display:none;">
           <span class="stat-label">Around:</span><span id="parentName" class="stat-value">—</span>
           <span>&nbsp;at</span><span id="parentRad" class="stat-value">—</span>
        </div>
        <div><span class="stat-label">Target:</span>
             <input id="distTarget" type="number" min="0.1" step="0.1" value="1"><span>AU</span></div>
        <div><span class="stat-label">Spiral Δv:</span><span id="distDv" class="stat-value">—</span></div>
        <div id="escapeRow" style="display:none;">
             <span class="stat-label">Escape Δv:</span><span id="escDv" class="stat-value">—</span>
        </div>
        <div><span class="stat-label">Energy Cost:</span><span id="distE" class="stat-value">—</span></div>
      </div>
      <div class="invest-container left"><label><input id="distInvest" type="checkbox"> Invest</label></div>
      <div id="moonWarn" class="moon-warning" style="display:none;">⚠ Escape parent first</div>
    </div>`;
    const motCard=document.createElement('div');motCard.className="info-card";motCard.innerHTML=motHTML;c.appendChild(motCard);
    motCard.style.display=this.unlocked?"block":"none";

    /* power */
    const pwrHTML=`<div class="card-header"><span class="card-title">Thruster Power</span></div>
    <div class="card-body">
      <div class="power-controls-wrapper">
        <div class="invested-container">
          <span class="stat-label">Continuous:</span>
          <span id="pwrVal" class="stat-value">0</span>
        </div>
        <div class="thruster-power-controls">
          <div class="main-buttons">
            <button id="p0">0</button><button id="pMinus">-</button><button id="pPlus">+</button>
          </div>
          <div class="multiplier-container">
            <button id="pDiv">/10</button><button id="pMul">x10</button>
          </div>
        </div>
      </div>
    </div>`;
    const pwrCard=document.createElement('div');pwrCard.className="info-card";pwrCard.innerHTML=pwrHTML;c.appendChild(pwrCard);
    pwrCard.style.display=this.unlocked?"block":"none";

    /* refs */
    const g=(sel,r)=>r.querySelector(sel);
    this.el={spinCard, motCard, pwrCard,
      rotNow:g('#rotNow',spinCard),rotTarget:g('#rotTarget',spinCard),
      rotDv:g('#rotDv',spinCard),rotE:g('#rotE',spinCard),rotCb:g('#rotInvest',spinCard),
      distNow:g('#distNow',motCard),distTarget:g('#distTarget',motCard),
      distDv:g('#distDv',motCard),distE:g('#distE',motCard),distCb:g('#distInvest',motCard),
      escRow:g('#escapeRow',motCard),escDv:g('#escDv',motCard),
      parentRow:g('#parentRow',motCard),parentName:g('#parentName',motCard),
      parentRad:g('#parentRad',motCard),moonWarn:g('#moonWarn',motCard),
      pwrVal:g('#pwrVal',pwrCard),pPlus:g('#pPlus',pwrCard),pMinus:g('#pMinus',pwrCard),
      pDiv:g('#pDiv',pwrCard),pMul:g('#pMul',pwrCard),p0:g('#p0',pwrCard)};

    /* listeners */
    this.el.rotTarget.oninput = ()=>this.calcSpinCost();
    this.el.distTarget.oninput= ()=>this.calcMotionCost();

    this.el.rotCb.onchange = ()=>{this.spinInvest=this.el.rotCb.checked;
      if(this.spinInvest){this.motionInvest=false;this.el.distCb.checked=false;}this.prepareJob();};
    this.el.distCb.onchange= ()=>{this.motionInvest=this.el.distCb.checked;
      if(this.motionInvest){this.spinInvest=false;this.el.rotCb.checked=false;}this.prepareJob();};

    const up=()=>this.updateUI();
    this.el.pPlus.onclick =()=>{this.adjustPower(+this.step);up();};
    this.el.pMinus.onclick=()=>{this.adjustPower(-this.step);up();};
    this.el.pMul.onclick  =()=>{this.step*=10;up();};
    this.el.pDiv.onclick  =()=>{this.step=Math.max(1,this.step/10);up();};
    this.el.p0.onclick    =()=>{this.setPower(0);up();};

    this.updateUI();
  }

/* ---------- cost calculations ---------------------------------------- */
  calcSpinCost(){
    const p=terraforming.celestialParameters;if(!p)return;
    const tgt=parseFloat(this.el.rotTarget.value)||1;
    this.tgtDays=tgt;
    const dv=spinDeltaV(p.radius,getRotHours(p),this.tgtDays*24);
    this.el.rotDv.textContent=fmt(dv,false,3)+" m/s";
    this.el.rotE.textContent =formatEnergy(spinEnergyRemaining(p,p.radius,this.tgtDays));
    if(this.spinInvest) this.prepareJob();
  }

  calcMotionCost(){
    const p=terraforming.celestialParameters;if(!p)return;
    const tgt=parseFloat(this.el.distTarget.value)||1;
    this.tgtAU=tgt;

    const parent=p.parentBody;
    if(parent){
      const esc=escapeDeltaV(parent.mass,parent.orbitRadius);
      this.el.escDv.textContent=fmt(esc,false,3)+" m/s";
      this.el.escRow.style.display="block";
      this.el.parentRow.style.display="block";this.el.moonWarn.style.display="block";
      this.el.parentName.textContent=parent.name||"Parent";
      this.el.parentRad.textContent=fmt(parent.orbitRadius,false,0)+" km";
      this.el.distDv.textContent="—";
      this.el.distE.textContent=formatEnergy(0.5*p.mass*FUSION_VE*esc);
    }else{
      this.el.escRow.style.display=this.el.parentRow.style.display=this.el.moonWarn.style.display="none";
      const dv=spiralDeltaV(p.distanceFromSun||this.tgtAU,this.tgtAU);
      this.el.distDv.textContent=fmt(dv,false,3)+" m/s";
      this.el.distE.textContent=formatEnergy(translationalEnergyRemaining(p,dv));
    }
    if(this.motionInvest) this.prepareJob();
  }

/* ---------- job preparation ------------------------------------------ */
  prepareJob(){
    const p=terraforming.celestialParameters;if(!p)return;
    this.dVdone=0;

    if(this.spinInvest){
      this.spinStartDays=getRotHours(p)/24;
      this.dVreq=spinDeltaV(p.radius,this.spinStartDays*24,this.tgtDays*24);
      return;
    }

    if(this.motionInvest){
      if(p.parentBody){
        this.escapePhase=true;
        this.dVreq=escapeDeltaV(p.parentBody.mass,p.parentBody.orbitRadius);
      }else{
        this.escapePhase=false;
        this.startAU=p.distanceFromSun;
        this.dVreq=spiralDeltaV(this.startAU,this.tgtAU);
      }
    }
  }

/* ---------- UI refresh ------------------------------------------------ */
  updateUI(){
    if(this.el.spinCard){
      const vis = this.unlocked ? 'block' : 'none';
      this.el.spinCard.style.display = vis;
      this.el.motCard.style.display = vis;
      this.el.pwrCard.style.display = vis;
    }
    const p=terraforming.celestialParameters||{};
    this.el.rotNow.textContent = fmt(getRotHours(p)/24,false,3)+" days";
    this.el.distNow.textContent = p.parentBody?
        fmt(p.parentBody.orbitRadius,false,0)+" km" :
        fmt(p.distanceFromSun||0,false,3)+" AU";
    this.el.pwrVal.textContent = formatNumber(this.power, true)+" W";
    this.el.pPlus.textContent="+"+formatNumber(this.step,true);
    this.el.pMinus.textContent="-"+formatNumber(this.step,true);

    /* live energy cost refresh */
    if(p && !p.parentBody){
      const dvRem=Math.max(0,this.dVreq-this.dVdone);
      this.el.distE.textContent=formatEnergy(translationalEnergyRemaining(p,dvRem));
    }
    if(p && this.spinInvest){
      this.el.rotE.textContent=formatEnergy(spinEnergyRemaining(p,p.radius,this.tgtDays));
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
    const dt=dtMs/1000;
    const need=this.power*dt;
    if(resources.colony.energy.value<need) return;
    resources.colony.energy.decrease(need);

    const a=2*this.power/(FUSION_VE*p.mass);
    const dvTick=a*dt; this.dVdone+=dvTick;

    /* ------ spin -------- */
    if(this.spinInvest){
      const sign=this.tgtDays<this.spinStartDays?-1:+1;
      const dΩ=sign*dvTick/(p.radius*1e3);
      const ω=2*Math.PI/(getRotHours(p)*3600)+dΩ;
      p.rotationPeriod=2*Math.PI/ω/3600;
      if(this.dVdone>=this.dVreq){this.spinInvest=false;this.dVreq=this.dVdone=0;}
      this.updateUI(); return;
    }

    /* ------ motion ------- */
    if(this.motionInvest){
      if(this.escapePhase && p.parentBody){
        const mu=G*p.parentBody.mass;
        let r=p.parentBody.orbitRadius*1e3;
        const v=Math.sqrt(mu/r);
        let E=-mu/(2*r)+v*a*dt;
        if(E>=0){
          p.distanceFromSun=p.parentBody.distanceFromSun;
          delete p.parentBody;
          this.escapePhase=false;this.startAU=p.distanceFromSun;
          this.dVdone=0;
          this.dVreq=spiralDeltaV(this.startAU,this.tgtAU);
          this.calcMotionCost();this.updateUI();return;
        }else{
          r=-mu/(2*E);p.parentBody.orbitRadius=r/1e3;
        }
      }else{
        const mu=G*SOLAR_MASS;
        let a_sma=p.distanceFromSun*AU_IN_METERS;
        const v=Math.sqrt(mu/a_sma);
        let E=-mu/(2*a_sma)+v*a*dt*(this.tgtAU>this.startAU?+1:-1);
        a_sma=-mu/(2*E);
        p.distanceFromSun=a_sma/AU_IN_METERS;
        if((this.tgtAU>this.startAU&&p.distanceFromSun>=this.tgtAU)||
           (this.tgtAU<this.startAU&&p.distanceFromSun<=this.tgtAU)||
           this.dVdone>=this.dVreq){
          p.distanceFromSun=this.tgtAU;
          this.motionInvest=false;this.dVreq=this.dVdone=0;
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
  }
}

/* expose */
if(typeof globalThis!=="undefined")globalThis.PlanetaryThrustersProject=PlanetaryThrustersProject;
if(typeof module!=="undefined")module.exports=PlanetaryThrustersProject;
