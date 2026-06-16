/* ===================== EVOLVE ===================== */
"use strict";

/* ---------- MACHINE LIBRARY (machines only) ---------- */
function workoutGroupIcon(w){
  const cnt={};
  (w&&w.moves||[]).forEach(ex=>{ if(ex.group && GICON[ex.group]) cnt[ex.group]=(cnt[ex.group]||0)+1; });
  let best=null,bestN=0;
  Object.keys(cnt).forEach(g=>{ if(cnt[g]>bestN){bestN=cnt[g];best=g;} });
  return best?GICON[best]:"🏋️";
}
function machinesIn(g){return MACHINES.filter(m=>m.g===g);}
/* ---------- SUB-MUSCLE GROUPS ---------- */
function subGroupOf(name, g){
  const n=name.toLowerCase();
  if(g==="Arms"){
    if(/wrist|forearm|reverse curl|grip/.test(n))return "Forearms";
    if(/tricep|pushdown|push-down|skull|kickback|overhead extension|close[- ]grip|dip|press-?down|french/.test(n))return "Triceps";
    if(/curl|bicep|chin|preacher|hammer/.test(n))return "Biceps";
    return "Biceps";
  }
  if(g==="Legs"){
    if(/calf|calve|raise.*(toe|seated)|toe press/.test(n))return "Calves";
    if(/glute|hip thrust|bridge|kickback|abduct/.test(n))return "Glutes";
    if(/ham|romanian|rdl|leg curl|good morning|deadlift/.test(n))return "Hamstrings";
    if(/squat|leg press|extension|lunge|hack|step[- ]up|sissy/.test(n))return "Quads";
    return "Quads";
  }
  if(g==="Shoulders"){
    if(/rear|reverse (fly|pec|delt)|face pull/.test(n))return "Rear delts";
    if(/lateral|side raise|side delt|lat raise/.test(n))return "Side delts";
    if(/front|overhead|shoulder press|military|arnold|ohp|upright/.test(n))return "Front delts";
    return "Side delts";
  }
  if(g==="BACK"){
    if(/shrug|trap|upper back|reverse fly/.test(n))return "Traps / upper back";
    if(/hyper|back extension|good morning|lower back|deadlift/.test(n))return "Lower back";
    if(/pulldown|pull-?up|chin|row|lat|pullover/.test(n))return "Lats";
    return "Lats";
  }
  if(g==="Chest"){
    if(/incline/.test(n))return "Upper chest";
    if(/decline/.test(n))return "Lower chest";
    return "Mid chest";
  }
  if(g==="Core"){
    if(/oblique|side|russian|woodchop|twist/.test(n))return "Obliques";
    if(/hyper|back extension|lower back/.test(n))return "Lower back";
    return "Abs";
  }
  return null;
}
/* names of moves in a group filtered by sub (or all) */
function poolBySub(g, sub){
  let names=gymPoolNames(g);
  if(sub && sub!=="all") names=names.filter(n=>subGroupOf(n,g)===sub);
  return names;
}
/* which sub-groups actually have moves available */
function subGroupsAvailable(g){
  const subs=SUBGROUPS[g]||[]; const avail=[];
  const names=gymPoolNames(g);
  subs.forEach(s=>{ if(names.some(n=>subGroupOf(n,g)===s)) avail.push(s); });
  return avail;
}

/* ---------- FREE WEIGHTS (barbell / dumbbell / bodyweight-loaded) ---------- */
function freeBODYWEIGHTsIn(g){return FREEWEIGHTS.filter(m=>m.g===g);}
function fwEnabled(){return (DATA.prefs && DATA.prefs.gymEquip==="all");}
function gymMOVEsIn(g){return fwEnabled()? machinesIn(g).concat(freeBODYWEIGHTsIn(g)) : machinesIn(g);}
function gymPoolNames(g){return gymMOVEsIn(g).map(m=>m.n);}

/* preset day templates (machine names) */

/* ---------- HOME EXERCISES ---------- */
/* eq: array of equipment tags. tags: none,dumbbell,band,pullup,kettlebell,bench */

/* ---------- CARDIO (met = metabolic equivalent for kcal estimate) ---------- */
function cardioBODYWEIGHT(){ return DATA.profile?.weightKg || (DATA.weights.length?DATA.weights[DATA.weights.length-1].kg:75); }
function cardioKcal(met,seconds){ return met*3.5*cardioBODYWEIGHT()/200*(seconds/60); }
function strideCm(){ return DATA.profile?.strideCm || Math.round((DATA.profile?.heightCm||175)*0.415); }
function armCm(){ return DATA.profile?.armCm || Math.round((DATA.profile?.heightCm||175)*0.44); }
/* estimated distance from stride length (steps) or arm length (rowing/ski); null = not distance-based */
function cardioDISTANCEKm(name, seconds){
  const min=seconds/60, st=strideCm()/100, ar=armCm()/100;
  const step=(f,c)=> st*f*c*min/1000;     // stride(m) * factor * cadence(spm) * minutes
  const wheel=(kmh)=> kmh*(min/60);
  const stroke=(rate)=> ar*3.2*rate*min/1000; // arm reach drives handle travel
  const M={
   "Treadmill — walk":[step,1.0,110],"WALKING":[step,1.0,110],
   "Treadmill — brisk walk":[step,1.1,120],"Brisk walking":[step,1.1,120],
   "Treadmill — incline walk":[step,0.95,105],"Hiking":[step,1.0,108],
   "Treadmill — jog":[step,1.45,150],"Treadmill — run":[step,1.75,165],
   "RUNNING (outdoors)":[step,1.75,165],"Treadmill — sprints":[step,2.0,185],
   "Curved manual treadmill":[step,1.6,160],
   "Stair climber / stepmill":[step,0.7,95],"Stair climbing (home)":[step,0.7,95],
   "Stationary bike — light":[wheel,18],"Stationary bike — moderate":[wheel,25],
   "Stationary bike — vigorous":[wheel,32],"Recumbent bike":[wheel,20],
   "Spin bike":[wheel,30],"Assault / air bike":[wheel,22],"CYCLING (outdoors)":[wheel,25],
   "ROWING machine — moderate":[stroke,28],"ROWING machine — vigorous":[stroke,34],
   "ROWING (home machine)":[stroke,28],"Ski erg":[stroke,30]
  };
  const e=M[name]; if(!e)return null;
  const fn=e[0]; return fn(...e.slice(1));
}

/* ---------- FOOD DATABASE (per 100g: kcal, protein, carb, fat) ---------- */

/* ===================== STATE & STORAGE ===================== */
const KEY="evolve_v1";
const PROFILE_PHOTO_KEY="evolve_profile_photo_v1"; /* separate local-only photo; deliberately not included in backup codes */
const PROGRESS_PHOTOS_KEY="evolve_progress_photos_v1"; /* v3.31: local-only progress gallery; never in backups */
const COACH_KEY_KEY="evolve_coach_key_v1"; /* v3.31: OpenRouter API key — local-only, never in any backup, never sent anywhere except OpenRouter */
const COACH_KEY_MODE_KEY="evolve_coach_key_mode_v1"; /* device|session */
const COACH_KEY_SESSION_KEY="evolve_coach_key_session_v1"; /* session-only storage for the COACH key */
const MAX_STATE_BYTES=4.5*1024*1024;
const MAX_IMPORT_BYTES=4*1024*1024;
const MAX_IMAGE_FILE_BYTES=15*1024*1024;
const MAX_PROGRESS_PHOTOS=60;
const SECURITY_NOTICE_VERSION="2026-06-security-test-2";
const DEFAULT_DATA = {
  profile:null, /* {name,sex,age,heightCm,weightKg,activity,goal,goalBODYWEIGHTKg} */
  targets:null, /* {calories,protein,carbs,fat,water} */
  prefs:{energy:"kcal", addMOVE:true, showAchievements:true, showHelpBars:true, liftUnit:"kg", bodyUnit:"kg", gymEquip:"machine_cardio", env:"gym", rmFormula:"epley", theme:"ember", mealTimes:false, targetMode:"auto",
    restDefault:90, restBeep:true, restFlash:true, keepAwake:true, waterUnit:"ml", waterStep:250, startTab:"home", headingFont:"classic",
    coachConsent:false, coachModel:"openrouter/free"},
  customFoods:[], /* {name,kcal,p,c,f} per 100g, user-added */
  favFoods:[],  /* GLOBAL favourite food names */
  favMachines:[], /* legacy machine names (migrated into favMOVEs) */
  favMOVEs:[], /* GLOBAL favourites: any exercise/cardio name */
  favSESSIONS:[], /* {id,name,moves:[{name,group}],cardio:{name,met,ic}|null,cardioPos:"start"|"end"} */
  routines:[], /* v3.31: multi-day programs — {id,name,note,days:[{label,moves:[{name,group}]}]} */
  usualSets:{}, /* v3.31: per-exercise saved "usual" — { "<exercise name>": {kg, reps} } used to pre-fill sets */
  weeklyPlan:null, /* {weekGO, days:{Mon:{type,label,done}|null,...}, cardioPref} */
  cardio:[],     /* {id,date,name,type,seconds,kcal,distanceKm} */
  log:{},       /* date -> {food:[], water:0, burned:[]} */
  workouts:[],  /* {id,date,title,type,moves:[{name,group,sets:[{kg,reps,done}]}],volume,prs:[]} */
  weights:[],   /* {date,kg} */
  ach:{workoutsDONE.:0,totalTOTAL LOAD:0,streak:0,bestSTREAK:0,lastSESSIONDate:null,prs:{},unlocked:[]},
  statRESETs:{}, /* per-stat user resets: key -> {start, since} (prs: {since}) */
  meta:{lastBACKUP:null, created:null, backupReminder:"weekly", backupNotifications:false, backupNotifyLast:null, driveEnabled:false, driveClientId:"", driveFileId:null, lastDriveBACKUP:null}
};
function isPlainObject(v){ return !!v && typeof v==="object" && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype; }
function safeJsonValue(v, depth){
  if(depth>40) throw new Error("Data nesting is too deep");
  if(Array.isArray(v)) return v.slice(0,50000).map(x=>safeJsonValue(x,depth+1));
  if(isPlainObject(v)){
    const out={};
    Object.keys(v).forEach(k=>{
      if(k==="__proto__" || k==="prototype" || k==="constructor") return;
      out[k]=safeJsonValue(v[k],depth+1);
    });
    return out;
  }
  return v;
}
function safeParseJsonText(raw, maxBytes, label){
  if(typeof raw!=="string" || !raw) throw new Error((label||"JSON")+" is empty");
  if(raw.length>maxBytes) throw new Error((label||"JSON")+" is too large");
  return safeJsonValue(JSON.parse(raw),0);
}
function blankData(){ const d=JSON.parse(JSON.stringify(DEFAULT_DATA)); d.meta.created=todayISO(); return d; }
function mergeKnownDataKeys(clean){
  if(!isPlainObject(clean)) throw new Error("Bad data root");
  const out=JSON.parse(JSON.stringify(DEFAULT_DATA));
  Object.keys(out).forEach(k=>{ if(Object.prototype.hasOwnProperty.call(clean,k)) out[k]=clean[k]; });
  return out;
}
function normalizeStoredData(obj){
  const d=mergeKnownDataKeys(safeJsonValue(obj,0));
  migrate(d);
  if(!d.meta.created) d.meta.created=todayISO();
  return d;
}
function safeInlineImageSrc(src, fallback){
  const s=String(src||"").trim();
  if(!s) return fallback||"";
  if(/^(?:\.\/)?(?:icon-192\.png|icon-512\.png|apple-touch-icon\.png)$/i.test(s)) return s.replace(/^\.\//,"");
  if(/^data:image\/(?:png|jpeg|jpg|webp);base64,[a-z0-9+/=\s]+$/i.test(s) && s.length<=2500000) return s;
  return fallback||"";
}
let DATA = load();
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw) return normalizeStoredData(safeParseJsonText(raw,MAX_STATE_BYTES,"Stored app data"));
  }catch(e){}
  return blankData();
}
function migrate(d){
  if(!Array.isArray(d.favMOVEs)) d.favMOVEs=[];
  if(Array.isArray(d.favMachines)) d.favMachines.forEach(n=>{ if(!d.favMOVEs.includes(n)) d.favMOVEs.push(n); });
  if(!Array.isArray(d.favFoods)) d.favFoods=[];
  if(!("weeklyPlan" in d)) d.weeklyPlan=null;
  if(!d.prefs) d.prefs={}; if(!d.prefs.env) d.prefs.env="gym"; if(!d.prefs.rmFormula) d.prefs.rmFormula="epley"; if(!d.prefs.theme) d.prefs.theme="ember";
  if(typeof d.prefs.mealTimes!=="boolean") d.prefs.mealTimes=false; /* default: fast mode (times hidden, device time used) */
  if(d.prefs.targetMode!=="manual") d.prefs.targetMode="auto"; /* auto = formula targets; manual = user-set calories & macros */
  /* v3.22 — new preference defaults (kept here so existing users carry over untouched) */
  if(!(Number(d.prefs.restDefault)>0)) d.prefs.restDefault=90;       /* default rest-timer length (seconds) */
  if(!d.prefs.headingFont) d.prefs.headingFont="classic";            /* v3.31: heading font style (1.0: CLASSIC default) */
  /* 1.0 — adopt CLASSIC (Bebas) as the app's display font globally. Existing
     installs still on the OLD "modern" default are moved to "classic" ONCE
     (guarded by a flag) so the change reaches them; a deliberate later choice
     of any font sticks and is never re-flipped. */
  if(!d.meta || typeof d.meta!=="object") d.meta={};
  if(!d.meta.classicFontApplied){
    if(d.prefs.headingFont==="modern") d.prefs.headingFont="classic";
    d.meta.classicFontApplied=true;
  }
  if(typeof d.prefs.coachConsent!=="boolean") d.prefs.coachConsent=false; /* v3.31: AI COACH privacy consent */
  if(!d.prefs.coachModel) d.prefs.coachModel="openrouter/free";
  /* v3.31: retire model slugs OpenRouter has dropped, and move the old default to the free router */
  const DEAD_COACH_MODELS=["google/gemini-2.0-flash-exp:free","google/gemini-flash-1.5-exp:free","deepseek/deepseek-chat-v3-0324:free"];
  if(DEAD_COACH_MODELS.indexOf(d.prefs.coachModel)>=0) d.prefs.coachModel="openrouter/free";
  if(typeof d.prefs.restBeep!=="boolean") d.prefs.restBeep=true;     /* beep when rest ends */
  if(typeof d.prefs.restFlash!=="boolean") d.prefs.restFlash=true;   /* screen flash when rest ends */
  if(typeof d.prefs.keepAwake!=="boolean") d.prefs.keepAwake=true;   /* keep screen awake during use */
  if(d.prefs.waterUnit!=="floz") d.prefs.waterUnit="ml";             /* water display unit */
  if(!(Number(d.prefs.waterStep)>0)) d.prefs.waterStep=250;          /* +1 tap water amount (ml) */
  if(!["home","train","fuel","stats","more"].includes(d.prefs.startTab)) d.prefs.startTab="home"; /* tab shown on open */
  if(typeof d.prefs.showHelpBars!=="boolean") d.prefs.showHelpBars=true; /* show the per-tab "How this page works" bars by default */
  /* v3.31 */
  if(!Array.isArray(d.routines)) d.routines=[]; /* saved multi-day programs */
  if(!d.usualSets || typeof d.usualSets!=="object" || Array.isArray(d.usualSets)) d.usualSets={}; /* v3.31: per-exercise usual sets */
  if(Array.isArray(d.customFoods)) d.customFoods.forEach(f=>{ if(f && typeof f.cat!=="string") f.cat=""; }); /* optional category tag on custom foods */
  if(!d.statRESETs || typeof d.statRESETs!=="object") d.statRESETs={};
  if(!d.meta || typeof d.meta!=="object") d.meta={};
  if(!["off","daily","weekly","biweekly","monthly"].includes(d.meta.backupReminder)) d.meta.backupReminder="weekly";
  if(typeof d.meta.backupNotifications!=="boolean") d.meta.backupNotifications=false;
  if(typeof d.meta.driveEnabled!=="boolean") d.meta.driveEnabled=false;
  if(typeof d.meta.driveClientId!=="string") d.meta.driveClientId="";
  if(typeof d.meta.driveFileId!=="string") d.meta.driveFileId=null;
  if(typeof d.meta.lastDriveBACKUP!=="string") d.meta.lastDriveBACKUP=null;
  if(typeof d.meta.securityNoticeSeen!=="string") d.meta.securityNoticeSeen="";
}

function save(){
  try{
    DATA=normalizeStoredData(DATA);
    localStorage.setItem(KEY,JSON.stringify(DATA));
  }catch(e){toast("Storage full, blocked, or data was invalid");}
}

/* ===================== THEMES ===================== */
const THEMES={
  ember:  {name:"Ember",   a:"#FF6A2C", a2:"#FF9A3D"},
  ocean:  {name:"Ocean",   a:"#2E8BFF", a2:"#5AA9FF"},
  violet: {name:"Violet",  a:"#A977FF", a2:"#C49BFF"},
  crimson:{name:"Crimson", a:"#FF4D6D", a2:"#FF7A90"},
  gold:   {name:"Gold",    a:"#F5A623", a2:"#FFC857"},
  mint:   {name:"Mint",    a:"#13C39A", a2:"#2FE6A8"},
  slate:  {name:"Slate",   a:"#7C8AA5", a2:"#9AA8C2"}
};
/* Base dark palette (the literal :root values). THEMEs tint THESE — always
   mixed from the originals so switching themes never drifts/compounds. */
const THEME_BASE={ink:"#0C0D11",ink2:"#101218",surface:"#15171F",surface2:"#1C1F2A",surface3:"#232735",line:"#272B38",line2:"#333849"};
function _hex2rgb(h){const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h);return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[255,106,44];}
function _rgb2hex(c){return "#"+c.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padGO(2,"0")).join("");}
/* blend accent into a base colour by amt (0..1) */
function _mix(base,accent,amt){const b=_hex2rgb(base),a=_hex2rgb(accent);return _rgb2hex([0,1,2].map(i=>b[i]+(a[i]-b[i])*amt));}
function applyTHEME(id){
  const t=THEMES[id]||THEMES.ember; const r=document.documentElement.style;
  /* primary accent — overriding --strength/--strength2 re-flows --grad-str & --grad-brand automatically */
  r.setProperty("--strength",t.a); r.setProperty("--strength2",t.a2);
  const a=_hex2rgb(t.a);
  r.setProperty("--strength-soft",`rgba(${a[0]},${a[1]},${a[2]},.22)`);
  /* whole-app wash: tint the dark canvas, every card surface and the borders
     toward the theme hue so the colour is felt on every screen, not just buttons.
     Kept subtle (dark stays dark); semantic colours (fuel/gold/blue) stay put. */
  r.setProperty("--ink",     _mix(THEME_BASE.ink,     t.a,.045));
  r.setProperty("--ink2",    _mix(THEME_BASE.ink2,    t.a,.05));
  r.setProperty("--surface", _mix(THEME_BASE.surface, t.a,.07));
  r.setProperty("--surface2",_mix(THEME_BASE.surface2,t.a,.085));
  r.setProperty("--surface3",_mix(THEME_BASE.surface3,t.a,.10));
  r.setProperty("--line",    _mix(THEME_BASE.line,    t.a,.16));
  r.setProperty("--line2",   _mix(THEME_BASE.line2,   t.a,.18));
  /* keep the iOS status-bar / PWA theme colour in step with the canvas */
  const tc=document.querySelector('meta[name="theme-color"]'); if(tc) tc.setAttribute("content",_mix(THEME_BASE.ink,t.a,.045));
}
applyTHEME((DATA.prefs&&DATA.prefs.theme)||"ember");

/* v3.31 — heading font styles, switchable in SETTINGS → PREFERENCES */
const HEADING_FONTS={
  modern:{label:"MODERN",   stack:'"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', spacing:"-0.01em", sample:"Clean, rounded sans-serif — the most legible option."},
  bold:  {label:"BOLD",     stack:'"Archivo","Inter",sans-serif',                                          spacing:"-0.02em", sample:"Wide, heavy and sporty — strong without shouting."},
  classic:{label:"CLASSIC", stack:'"Bebas Neue","Inter",sans-serif',                                        spacing:"0.02em",  sample:"Tall, condensed gym-poster capitals (default)."}
};
function applyHeadingFont(id){
  const f=HEADING_FONTS[id]||HEADING_FONTS.modern; const r=document.documentElement.style;
  r.setProperty("--font-disp",f.stack);
  r.setProperty("--font-disp-spacing",f.spacing);
}
applyHeadingFont((DATA.prefs&&DATA.prefs.headingFont)||"classic");

/* ===================== DATE HELPERS (device clock) ===================== */
function todayISO(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padGO(2,"0")+"-"+String(d.getDate()).padGO(2,"0");}
function prettyDate(iso){const [y,m,dd]=iso.split("-").map(Number);const dt=new Date(y,m-1,dd);
  return dt.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});}
function shortDate(iso){const [y,m,dd]=iso.split("-").map(Number);const dt=new Date(y,m-1,dd);
  return dt.toLocaleDateString(undefined,{day:"numeric",month:"short"});}
function dayLog(iso){iso=iso||todayISO(); if(!DATA.log[iso])DATA.log[iso]={food:[],water:0,burned:[]}; return DATA.log[iso];}
let viewDate = todayISO();

/* ===================== CALORIE MATH (Mifflin–St Jeor) ===================== */
function computeTargets(p){
  const bmr = 10*p.weightKg + 6.25*p.heightCm - 5*p.age + (p.sex==="male"?5:-161);
  const tdee = bmr * (ACT[p.activity]?.m||1.2);
  const cals = Math.max(1200, Math.round((tdee + (GOALS[p.goal]?.adj||0))/10)*10);
  const protein = Math.round(p.weightKg * (p.goal==="gain"?2.0:1.8));
  const fat = Math.round(cals*0.25/9);
  const carbs = Math.max(0, Math.round((cals - protein*4 - fat*9)/4));
  const water = Math.round(p.weightKg*35); /* ml */
  return {calories:cals, protein, carbs, fat, water, bmr:Math.round(bmr), tdee:Math.round(tdee)};
}
function bmi(p){const m=p.heightCm/100; return p.weightKg/(m*m);}
function bmiCat(v){return v<18.5?"Underweight":v<25?"Healthy":v<30?"Overweight":"Obese";}

/* ===================== ENERGY UNIT ===================== */
function eVal(kcal){return DATA.prefs.energy==="kj"?Math.round(kcal*4.184):Math.round(kcal);}
function eUnit(){return DATA.prefs.energy==="kj"?"kJ":"kcal";}

/* ===================== WEIGHT UNITS (canonical = kg) ===================== */
const LB_PER_KG=2.2046226, KG_PER_ST=6.3502932;
function liftUnit(){return (DATA.prefs&&DATA.prefs.liftUnit)||"kg";}
function bodyUnit(){return (DATA.prefs&&DATA.prefs.bodyUnit)||"kg";}
function liftLbl(){return liftUnit()==="lb"?"LB":"KG";}
function liftStep(){return liftUnit()==="lb"?5:2.5;}
function liftFromKg(kg){return liftUnit()==="lb"?(+kg)*LB_PER_KG:+kg;}
function kgFromLift(v){return liftUnit()==="lb"?(+v)/LB_PER_KG:+v;}
function liftRound(v){return liftUnit()==="lb"?Math.round(v):Math.round(v*10)/10;}
/* display a kg weight in the lift unit, e.g. "60 kg" / "135 lb" */
function liftStr(kg,withUnit){const v=liftRound(liftFromKg(kg));return (withUnit===false?v:v+" "+(liftUnit()==="lb"?"lb":"kg"));}
/* total volume display (raw) */
function volStr(kg){return Math.round(liftFromKg(kg)).toLocaleString()+" "+(liftUnit()==="lb"?"lb":"kg");}
/* big aggregate: tonnes (kg) or thousands of lb */
function tonneVal(kg){return (liftFromKg(kg)/1000).toFixed(1);}
function tonneUnit(){return liftUnit()==="lb"?"k lb":"t";}
/* bodyweight */
function bodyLbl(){const u=bodyUnit();return u==="lb"?"lb":u==="st"?"st/lb":"kg";}
function bodyToUnit(kg){const u=bodyUnit();return u==="lb"?kg*LB_PER_KG:u==="st"?kg/KG_PER_ST:kg;}
function bodyFromUnit(v){const u=bodyUnit();return u==="lb"?v/LB_PER_KG:u==="st"?v*KG_PER_ST:v;}
function bodyStr(kg){
  if(kg==null||kg==="")return "—";
  const u=bodyUnit();
  if(u==="lb")return (kg*LB_PER_KG).toFixed(1)+" lb";
  if(u==="st"){const tot=kg*LB_PER_KG;const st=Math.floor(tot/14);const lb=Math.round(tot-st*14);return st+" st "+lb+" lb";}
  return (Math.round(kg*10)/10)+" kg";
}
/* build a bodyweight input (handles st = two fields); returns HTML. read with readBodyKg(id) */
function bodyInputHTML(id, kg){
  const u=bodyUnit();
  if(u==="st"){
    const tot=kg?kg*LB_PER_KG:0; const st=kg?Math.floor(tot/14):""; const lb=kg?Math.round(tot-Math.floor(tot/14)*14):"";
    return `<div class="row" style="gap:8px">
      <input class="input num" id="${id}_st" type="number" inputmode="numeric" value="${st}" placeholder="st" style="flex:1">
      <input class="input num" id="${id}_lb" type="number" inputmode="decimal" value="${lb}" placeholder="lb" style="flex:1"></div>`;
  }
  const v=kg?(Math.round(bodyToUnit(kg)*10)/10):"";
  return `<input class="input num" id="${id}" type="number" inputmode="decimal" value="${v}" placeholder="${u}">`;
}
function readBodyKg(id){
  const u=bodyUnit();
  if(u==="st"){const st=+($("#"+id+"_st")?.value||0),lb=+($("#"+id+"_lb")?.value||0);const tot=st*14+lb;return tot>0?tot/LB_PER_KG:0;}
  const v=+($("#"+id)?.value||0); return v>0?bodyFromUnit(v):0;
}
function eFull(kcal){return eVal(kcal)+" "+eUnit();}

/* ===================== ACHIEVEMENTS ===================== */
const BADGES=[
 {id:"first",icon:"🔥",t:"First Steps",d:"Complete 1 workout",test:a=>a.workoutsDONE.>=1},
 {id:"w5",icon:"💪",t:"Getting Going",d:"5 workouts done",test:a=>a.workoutsDONE.>=5},
 {id:"w10",icon:"⚡",t:"Committed",d:"10 workouts done",test:a=>a.workoutsDONE.>=10},
 {id:"w25",icon:"🏆",t:"Dedicated",d:"25 workouts done",test:a=>a.workoutsDONE.>=25},
 {id:"w50",icon:"👑",t:"Iron Will",d:"50 workouts done",test:a=>a.workoutsDONE.>=50},
 {id:"w100",icon:"💎",t:"Centurion",d:"100 workouts done",test:a=>a.workoutsDONE.>=100},
 {id:"streak3",icon:"📅",t:"On a Roll",d:"3-day streak",test:a=>a.bestSTREAK>=3},
 {id:"streak7",icon:"🗓️",t:"Week Warrior",d:"7-day streak",test:a=>a.bestSTREAK>=7},
 {id:"streak30",icon:"🌟",t:"Unstoppable",d:"30-day streak",test:a=>a.bestSTREAK>=30},
 {id:"v10k",icon:"🏋️",t:"10 Tonnes",d:"10,000 kg lifted",test:a=>a.totalTOTAL LOAD>=10000},
 {id:"v50k",icon:"🚛",t:"50 Tonnes",d:"50,000 kg lifted",test:a=>a.totalTOTAL LOAD>=50000},
 {id:"v100k",icon:"🦾",t:"100 Tonnes",d:"100,000 kg lifted",test:a=>a.totalTOTAL LOAD>=100000},
 {id:"v250k",icon:"🌋",t:"Quarter Million",d:"250,000 kg lifted",test:a=>a.totalTOTAL LOAD>=250000},
 {id:"pr5",icon:"📈",t:"Record Breaker",d:"Set 5 personal records",test:a=>Object.keys(a.prs).length>=5}
];
function checkBadges(){
  const newly=[];
  BADGES.forEach(b=>{if(b.test(DATA.ach) && !DATA.ach.unlocked.includes(b.id)){DATA.ach.unlocked.push(b.id);newly.push(b);}});
  return newly;
}

/* ===================== UI HELPERS ===================== */
const $=s=>document.querySelector(s);

/* v3.31 — prevent zoom (pinch + double-tap). iOS Safari ignores
   user-scalable=no, so block its gesture events and rapid double-taps.
   Scrolling, single taps and normal interactions are unaffected. */
(function preventZoom(){
  // Safari pinch-zoom gesture events
  ["gesturestart","gesturechange","gestureend"].forEach(ev=>
    document.addEventListener(ev, e=>e.preventDefault(), {passive:false}));
  // multi-touch pinch on touchmove
  document.addEventListener("touchmove", e=>{ if(e.touches && e.touches.length>1) e.preventDefault(); }, {passive:false});
  // double-tap zoom (two taps within 300ms at nearly the same spot)
  let lastTouch=0, lastX=0, lastY=0;
  document.addEventListener("touchend", e=>{
    const now=Date.now();
    const t=(e.changedTouches&&e.changedTouches[0])||null;
    const x=t?t.clientX:0, y=t?t.clientY:0;
    if(now-lastTouch<=300 && Math.abs(x-lastX)<40 && Math.abs(y-lastY)<40){ e.preventDefault(); }
    lastTouch=now; lastX=x; lastY=y;
  }, {passive:false});
  // ctrl/⌘ + wheel zoom on desktop PWA
  document.addEventListener("wheel", e=>{ if(e.ctrlKey) e.preventDefault(); }, {passive:false});
})();
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
function toast(msg){const t=$("#toast");t.classList.remove("has-undo");t.textContent=msg;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),2200);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function getPROFILEPhoto(){
  try{return localStorage.getItem(PROFILE_PHOTO_KEY)||"";}catch(e){return "";}
}
function setPROFILEPhoto(v){
  try{ const safe=safeInlineImageSrc(v,""); if(!safe) return false; localStorage.setItem(PROFILE_PHOTO_KEY,safe); return true; }catch(e){return false;}
}
function clearPROFILEPhoto(){
  try{localStorage.removeItem(PROFILE_PHOTO_KEY);}catch(e){}
}
function profileAvatarHTML(){
  const raw=getPROFILEPhoto();
  const src=safeInlineImageSrc(raw,"icon-192.png")||"icon-192.png";
  return `<img src="${esc(src)}" alt="${raw?"PROFILE photo":"Evolve logo"}">`;
}
function openPROFILEPhotoPrivacy(){
  openModal(`<h3>PROFILE picture privacy</h3>
    <p class="muted" style="line-height:1.55;margin:0 0 12px">Your profile picture stays <b style="color:var(--text)">fully local</b> on this device. It is never uploaded, synced, sent to GitHub, or shared with anyone.</p>
    <p class="muted" style="line-height:1.55;margin:0 0 14px">To keep backup codes small, the photo is <b style="color:var(--text)">not included</b> in backups. If you delete the app, clear browser data, or reset Evolve, the photo is lost and you can choose it again later.</p>
    <button class="btn str block" id="pp_choose">I understand — choose photo</button>
    <button class="btn ghost block" id="pp_cancel" style="margin-top:10px">CANCEL</button>`);
  $("#pp_choose").addEventListener("click",()=>{ choosePROFILEPhoto(); closeModal(); });
  $("#pp_cancel").addEventListener("click",closeModal);
}
function choosePROFILEPhoto(){
  const input=document.createElement("input");
  input.type="file"; input.accept="image/*"; input.style.position="fixed"; input.style.left="-9999px";
  document.body.appendChild(input);
  input.addEventListener("change",()=>{
    const file=input.files&&input.files[0]; input.remove();
    if(!file)return;
    if(!/^image\//.test(file.type||"")){toast("Choose an image file");return;}
    if(file.size && file.size>MAX_IMAGE_FILE_BYTES){toast("That image is too large");return;}
    resizeAndSAVEPROFILEPhoto(file);
  },{once:true});
  input.click();
}
function resizeAndSAVEPROFILEPhoto(file){
  const reader=new FileReader();
  reader.onerror=()=>toast("Couldn't read that photo");
  reader.onload=()=>{
    const img=new Image();
    img.onerror=()=>toast("Couldn't load that photo");
    img.onload=()=>{
      const size=256;
      const canvas=document.createElement("canvas"); canvas.width=size; canvas.height=size;
      const ctx=canvas.getContext("2d");
      const side=Math.min(img.width,img.height);
      const sx=Math.max(0,(img.width-side)/2), sy=Math.max(0,(img.height-side)/2);
      ctx.fillStyle="#0C0D11"; ctx.fillRect(0,0,size,size);
      ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
      const data=canvas.toDataURL("image/jpeg",0.82);
      if(!setPROFILEPhoto(data)){toast("Photo couldn't be saved locally");return;}
      updateHeader();
      if($("#view-more")&&$("#view-more").classList.contains("active")) renderMore();
      toast("PROFILE picture saved locally");
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}

/* v3.31 — progress photos: local-only, never backed up, like the profile photo */
function getPROGRESSPhotos(){
  try{
    const raw=localStorage.getItem(PROGRESS_PHOTOS_KEY);
    const arr=raw?safeParseJsonText(raw,MAX_STATE_BYTES/2,"PROGRESS photos"):[];
    if(!Array.isArray(arr)) return [];
    return arr.map(p=>({
      id:+p.id||Date.now(),
      date:typeof p.date==="string"?p.date:todayISO(),
      img:safeInlineImageSrc(p.img,"")
    })).filter(p=>p.img).slice(0,MAX_PROGRESS_PHOTOS);
  }catch(e){return [];}
}
function setPROGRESSPhotos(arr){
  try{
    const safe=(Array.isArray(arr)?arr:[]).map(p=>({
      id:+(p&&p.id)||Date.now(),
      date:(p&&typeof p.date==="string")?p.date:todayISO(),
      img:safeInlineImageSrc(p&&p.img,"")
    })).filter(p=>p.img).slice(0,MAX_PROGRESS_PHOTOS);
    localStorage.setItem(PROGRESS_PHOTOS_KEY,JSON.stringify(safe));
    return true;
  }catch(e){return false;}
}
function addPROGRESSPhotoFromFile(file, after){
  if(!file || !/^image\//.test(file.type||"")){ toast("Choose an image file"); return; }
  if(file.size && file.size>MAX_IMAGE_FILE_BYTES){ toast("That image is too large"); return; }
  const reader=new FileReader();
  reader.onerror=()=>toast("Couldn't read that photo");
  reader.onload=()=>{
    const img=new Image();
    img.onerror=()=>toast("Couldn't load that photo");
    img.onload=()=>{
      const maxW=640; const scale=Math.min(1,maxW/img.width);
      const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
      const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext("2d"); ctx.fillStyle="#0C0D11"; ctx.fillRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);
      const data=canvas.toDataURL("image/jpeg",0.8);
      const arr=getPROGRESSPhotos();
      arr.unshift({id:Date.now(), date:todayISO(), img:data});
      if(!setPROGRESSPhotos(arr)){toast("Couldn't save photo — storage may be full");return;}
      if(after)after(); toast("PROGRESS photo saved locally");
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}
function deletePROGRESSPhoto(id, after){
  const arr=getPROGRESSPhotos().filter(p=>p.id!==id);
  setPROGRESSPhotos(arr); if(after)after();
}

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* modal system — every modal gets a sticky × close button and is dismissable
   via the × , the dimmed background, or the device/gesture BACK button. */
let _modalOpen=false, _ignorePop=false, _modalLocked=false;
let liveCARDIOStop=null; /* set while a live cardio timer runs; closeModal() calls it so the interval can't be orphaned */
function openModal(html, opts){
  opts=opts||{};
  _modalLocked=!!opts.mandatory;
  const w=$("#modalWrap");
  /* if the splash is still showing, the modal (z-index 180) would open BEHIND
     it (z-index 200) and be invisible until the splash is dismissed. Lift the
     modal above the splash in that case; restored on close. */
  const splash=document.getElementById("splash");
  if(splash && !splash.classList.contains("gone")){ w.style.zIndex="240"; }
  const top=_modalLocked
    ? '<div class="modal-top"><span class="grab"></span></div>'
    : '<div class="modal-top"><span class="grab"></span><button class="modal-x" id="modalX" aria-label="CLOSE">✕</button></div>';
  $("#modal").innerHTML=top+html;
  $("#modal").scrollTop=0;
  w.classList.add("on");
  const x=$("#modalX"); if(x) x.addEventListener("click",()=>closeModal());
  if(!_modalOpen){ _modalOpen=true; try{history.pushState({evolveModal:1},"");}catch(e){} }
}
function closeModal(fromPop, force){
  if(liveCARDIOStop){ const s=liveCARDIOStop; liveCARDIOStop=null; s(); }
  if(_modalLocked && !force){
    /* mandatory modal (e.g. first-run setup): can't be dismissed. If BACK was
       pressed, re-trap the history entry so the app isn't accidentally left. */
    if(fromPop){ try{history.pushState({evolveModal:1},"");}catch(e){} }
    return;
  }
  const w=$("#modalWrap"); if(!w.classList.contains("on") && !_modalOpen) return;
  const wasOpen=_modalOpen; _modalOpen=false; _modalLocked=false;
  w.classList.remove("on");
  w.style.zIndex=""; /* clear any splash-time lift */
  if(wasOpen && !fromPop && history.state && history.state.evolveModal){ _ignorePop=true; try{history.back();}catch(e){ _ignorePop=false; } }
}
$("#modalBg").addEventListener("click",()=>closeModal());
window.addEventListener("popstate",()=>{
  if(_ignorePop){ _ignorePop=false; return; }
  if(_modalOpen) closeModal(true);
});

/* toast with an UNDO action (auto-dismisses after a few seconds) */
function toastUNDO(msg, onUNDO){
  const t=$("#toast");
  t.innerHTML=`<span>${esc(msg)}</span><button class="toast-undo" id="toastUNDO">UNDO</button>`;
  t.classList.add("on","has-undo");
  clearTimeout(t._t);
  const close=()=>{ t.classList.remove("on","has-undo"); t.innerHTML=""; };
  t._t=setTimeout(close,4500);
  const b=$("#toastUNDO");
  if(b) b.addEventListener("click",()=>{ clearTimeout(t._t); close(); if(onUNDO)onUNDO(); });
}

/* ---- input QoL: select-on-focus, iOS "DONE." bar, hold-to-repeat steppers ---- */
function isNumField(t){ return t && t.tagName==="INPUT" && (t.type==="number" || t.inputMode==="decimal" || t.inputMode==="numeric"); }
/* tap a number field → highlight its value so you can just type over it */
document.addEventListener("focusin",e=>{
  if(isNumField(e.target)){ const el=e.target; setTimeout(()=>{ try{el.select();}catch(_){}} ,0); }
});
/* iOS number keypads have no return/done key — float a DONE. bar above the keyboard */
(function(){
  const ua=navigator.userAgent||"";
  const isIOS=/iPhone|iPad|iPod/i.test(ua) || (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  if(!isIOS) return;
  const bar=document.getElementById("kbdDONE."); if(!bar) return;
  const btn=bar.querySelector("button");
  function place(){
    const vv=window.visualViewport;
    if(vv){ bar.style.bottom=Math.max(0,(window.innerHEIGHT-(vv.height+vv.offsetTop)))+"px"; }
    else { bar.style.bottom="0px"; }
  }
  document.addEventListener("focusin",e=>{ if(isNumField(e.target)){ place(); bar.classList.add("on"); } });
  document.addEventListener("focusout",e=>{ if(isNumField(e.target)) setTimeout(()=>{ const a=document.activeElement; if(!isNumField(a)) bar.classList.remove("on"); },120); });
  btn.addEventListener("click",()=>{ const a=document.activeElement; if(a&&a.blur)a.blur(); bar.classList.remove("on"); });
  if(window.visualViewport){ window.visualViewport.addEventListener("resize",()=>{ if(bar.classList.contains("on"))place(); }); window.visualViewport.addEventListener("scroll",()=>{ if(bar.classList.contains("on"))place(); }); }
})();
/* press-and-hold a button to fire repeatedly (used by the +/- steppers) */
function holdRepeat(btn, fn){
  let to=null, iv=null;
  const stop=()=>{ if(to)clearTimeout(to); if(iv)clearInterval(iv); to=null; iv=null; };
  btn.addEventListener("pointerdown",e=>{ e.preventDefault(); fn(); to=setTimeout(()=>{ iv=setInterval(fn,90); },420); });
  ["pointerup","pointerleave","pointercancel"].forEach(ev=>btn.addEventListener(ev,stop));
}

/* in-app confirm (native confirm() is blocked in iOS standalone PWAs) */
function confirmModal(opts){
  openModal(`<h3>${esc(opts.title)}</h3>
    ${opts.body?`<p class="muted" style="margin:2px 0 18px;font-size:14px;line-height:1.5">${esc(opts.body)}</p>`:'<div style="height:10px"></div>'}
    <button class="btn ${opts.danger?"dfill":"str"} block" id="cm_yes">${esc(opts.confirmText||"CONFIRM")}</button>
    <button class="btn ghost block" id="cm_no" style="margin-top:10px">CANCEL</button>`);
  $("#cm_yes").addEventListener("click",()=>{ closeModal(); if(opts.onCONFIRM)opts.onCONFIRM(); });
  $("#cm_no").addEventListener("click",closeModal);
}

/* ---------- workout deletion + stat recompute ---------- */
function dayDiff(a,b){return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000);}
function recomputeAch(){
  const a=DATA.ach;
  a.workoutsDONE.=DATA.workouts.length;
  a.totalTOTAL LOAD=DATA.workouts.reduce((s,w)=>s+(w.volume||0),0);
  const prs={};
  DATA.workouts.forEach(w=>(w.moves||[]).forEach(ex=>(ex.sets||[]).forEach(st=>{
    if(+st.kg>0 && +st.reps>0) prs[ex.name]=Math.max(prs[ex.name]||0,+st.kg);
  })));
  a.prs=prs;
  const dates=[...new Set(DATA.workouts.map(w=>w.date))].sort();
  let best=0,cur=0,prev=null;
  dates.forEach(d=>{ cur = prev && dayDiff(prev,d)===1 ? cur+1 : 1; best=Math.max(best,cur); prev=d; });
  a.bestSTREAK=best;
  if(dates.length){
    const last=dates[dates.length-1];
    a.lastSESSIONDate=last;
    a.streak = dayDiff(last,todayISO())<=1 ? cur : 0;
  } else { a.streak=0; a.lastSESSIONDate=null; }
  a.unlocked = BADGES.filter(b=>b.test(DATA.ach)).map(b=>b.id);
}

/* ---------- user-resettable stat displays ---------- */
function srGet(k){ return (DATA.statRESETs&&DATA.statRESETs[k])||null; }
function workoutSTREAKsSince(since){
  const dates=[...new Set(DATA.workouts.map(w=>w.date))].filter(d=>!since||d>=since).sort();
  let best=0,run=0,prev=null;
  dates.forEach(d=>{ run=prev&&dayDiff(prev,d)===1?run+1:1; best=Math.max(best,run); prev=d; });
  let current=0;
  if(dates.length){ const last=dates[dates.length-1]; current=dayDiff(last,todayISO())<=1?run:0; }
  return {best,current};
}
function dispTOTAL LOAD(){ const r=srGet("volume"); if(!r)return DATA.ach.totalTOTAL LOAD;
  return (r.start||0)+Math.max(0, DATA.ach.totalTOTAL LOAD-(r.snap||0)); }
function dispSESSIONS(){ const r=srGet("workouts"); if(!r)return DATA.ach.workoutsDONE.;
  return (r.start||0)+Math.max(0, DATA.ach.workoutsDONE.-(r.snap||0)); }
function dispBestSTREAK(){ const r=srGet("bestSTREAK"); if(!r)return DATA.ach.bestSTREAK;
  return Math.max(r.start||0, workoutSTREAKsSince(r.since).best); }
function dispSESSIONSTREAK(){ const r=srGet("workoutSTREAK"); if(!r)return DATA.ach.streak;
  return Math.max(r.start||0, workoutSTREAKsSince(r.since).current); }
function dispPROTEINSTREAK(){ const r=srGet("protein"); const live=targetSTREAK("protein", r?r.since:null); return r?Math.max(r.start||0,live):live; }
function dispHydrationSTREAK(){ const r=srGet("hydration"); const live=targetSTREAK("water", r?r.since:null); return r?Math.max(r.start||0,live):live; }

const STAT_DEFS={
  volume:{label:"Total lifted", kind:"workout", manual:true, get:()=>tonneVal(dispTOTAL LOAD())+" "+tonneUnit()},
  workouts:{label:"Total workouts", kind:"workout", manual:true, get:()=>dispSESSIONS()},
  bestSTREAK:{label:"BEST STREAK", kind:"workout", manual:true, get:()=>dispBestSTREAK()+" days"},
  workoutSTREAK:{label:"SESSION streak", kind:"workout", manual:true, get:()=>dispSESSIONSTREAK()+" days"},
  protein:{label:"PROTEIN streak", kind:"food", manual:true, get:()=>dispPROTEINSTREAK()+" days"},
  hydration:{label:"Hydration streak", kind:"water", manual:true, get:()=>dispHydrationSTREAK()+" days"},
  prs:{label:"NEW PRs", kind:"workout", manual:false, get:()=>Object.keys(DATA.ach.prs||{}).length+" records"}
};
function applyStatKeep(key,start){
  if(!DATA.statRESETs)DATA.statRESETs={};
  if(key==="prs"){ DATA.ach.prs={}; DATA.statRESETs.prs={since:todayISO()}; save(); return; }
  if(key==="volume"){ DATA.statRESETs.volume={start:start||0, snap:DATA.ach.totalTOTAL LOAD}; save(); return; }
  if(key==="workouts"){ DATA.statRESETs.workouts={start:start||0, snap:DATA.ach.workoutsDONE.}; save(); return; }
  DATA.statRESETs[key]={start:start||0, since:todayISO()}; save();
}
function doStatDELETE(key){
  const def=STAT_DEFS[key];
  if(def.kind==="workout"){
    const n=DATA.workouts.length;
    confirmModal({title:"WIPE SESSION HISTORY?",danger:true,confirmText:"DELETE "+n+" workout"+(n===1?"":"s"),
      body:"This permanently wipes all "+n+" logged workouts and resets Total lifted, BEST STREAK, SESSION streak, Total workouts and PRs together. Your food, water and bodyweight are kept. THIS CANNOT BE UNDONE.",
      onCONFIRM:()=>{ DATA.workouts=[];
        ["volume","workouts","bestSTREAK","workoutSTREAK","prs"].forEach(k=>{ if(DATA.statRESETs)delete DATA.statRESETs[k]; });
        recomputeAch(); save(); toast("SESSION history cleared"); renderMore(); }});
  } else if(def.kind==="food"){
    confirmModal({title:"WIPE FOOD LOG?",danger:true,confirmText:"DELETE all food",
      body:"This permanently wipes every food entry from your diary — your calorie history and protein streak reset. WATER, workouts and weight are kept. THIS CANNOT BE UNDONE.",
      onCONFIRM:()=>{ Object.keys(DATA.log).forEach(d=>{ if(DATA.log[d])DATA.log[d].food=[]; });
        if(DATA.statRESETs)delete DATA.statRESETs.protein;
        save(); toast("Food history cleared"); renderMore(); }});
  } else {
    confirmModal({title:"DELETE water history?",danger:true,confirmText:"DELETE all water",
      body:"This permanently wipes all logged water — your hydration streak resets. Everything else is kept. THIS CANNOT BE UNDONE.",
      onCONFIRM:()=>{ Object.keys(DATA.log).forEach(d=>{ if(DATA.log[d])DATA.log[d].water=0; });
        if(DATA.statRESETs)delete DATA.statRESETs.hydration;
        save(); toast("WATER history cleared"); renderMore(); }});
  }
}
function openStatRESET(key){
  const def=STAT_DEFS[key];
  openModal(`
    <h3>RESET ${def.label}</h3>
    <p class="muted tiny" style="margin-bottom:14px">Current: <b>${def.get()}</b></p>
    ${def.manual?`
    <div class="field"><label>New value</label>
      <div class="seg" id="sr_mode"><button data-v="zero" class="on">Zero</button><button data-v="custom">Custom number</button></div></div>
    <div class="field" id="sr_customwrap" style="display:none"><label>Custom starting number</label>
      <input class="input num" id="sr_custom" type="number" inputmode="numeric" value="0" placeholder="0"></div>`
    :`<p class="tiny muted" style="margin-bottom:14px">This clears your current PR records so new lifts register as fresh personal bests.</p>`}
    <div class="field"><label>How</label>
      <div class="seg vstack" id="sr_how">
        <button data-v="keep" class="on">GO fresh — keep my history</button>
        <button data-v="delete">DELETE the data behind it</button></div></div>
    <p class="tiny" id="sr_note" style="margin:-4px 0 14px;line-height:1.5;color:var(--muted)"></p>
    <button class="btn str block" id="sr_go">RESET ${def.label}</button>`);
  if($("#sr_mode"))segBind("sr_mode");
  segBind("sr_how");
  const note=$("#sr_note");
  function refresh(){
    const custom = $("#sr_mode") && segVal("sr_mode")==="custom";
    if($("#sr_customwrap")) $("#sr_customwrap").style.display = custom?"block":"none";
    const how=segVal("sr_how");
    if(how==="delete"){
      note.innerHTML = def.kind==="workout"
        ? "⚠️ DELETEs your <b>entire workout history</b> — this also resets Total lifted, BEST STREAK, SESSION streak, Total workouts and PRs together. Can't be undone."
        : def.kind==="food"
        ? "⚠️ DELETEs <b>all logged food</b> from your diary (your calorie history resets too). Can't be undone."
        : "⚠️ DELETEs <b>all logged water</b>. Can't be undone.";
    } else {
      note.textContent = "Keeps everything you've logged — the number just starts counting again from today.";
    }
  }
  refresh();
  if($("#sr_mode")) $("#sr_mode").querySelectorAll("button").forEach(b=>b.addEventListener("click",refresh));
  $("#sr_how").querySelectorAll("button").forEach(b=>b.addEventListener("click",refresh));
  $("#sr_go").addEventListener("click",()=>{
    if(segVal("sr_how")==="delete"){ closeModal(); doStatDELETE(key); return; }
    let start=0;
    if(def.manual && segVal("sr_mode")==="custom"){ start=Math.max(0, Math.round(+$("#sr_custom").value||0)); }
    applyStatKeep(key,start);
    closeModal(); toast(def.label+" reset"); renderMore();
  });
}
function deleteSESSION(id, after){
  const w=DATA.workouts.find(x=>x.id===id);
  confirmModal({title:"DELETE workout?",danger:true,confirmText:"DELETE",
    body:(w?`“${w.title}” (${volStr(w.volume)}) `:"")+"will be removed and your stats updated. THIS CANNOT BE UNDONE.",
    onCONFIRM:()=>{
      DATA.workouts=DATA.workouts.filter(x=>x.id!==id);
      recomputeAch(); save(); toast("SESSION deleted"); if(after)after();
    }});
}

/* ring svg generator */
function ringSVG(pct,color,size,track){
  size=size||170; const sw=size*0.085, r=(size-sw)/2, c=2*Math.PI*r, off=c*(1-Math.max(0,Math.min(1,pct)));
  track=track||"#1C1F2A";
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
   <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
   <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
     stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
     transform="rotate(-90 ${size/2} ${size/2})"/></svg>`;
}

/* simple line chart (SVG) */
function lineChart(points,color,opts){
  opts=opts||{}; const W=opts.w||500,H=opts.h||180,pad=28;
  if(!points.length) return `<div class="empty">No data yet</div>`;
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  let minY=Math.min(...ys),maxY=Math.max(...ys); if(minY===maxY){minY-=1;maxY+=1;}
  const pyer=(maxY-minY)*0.12; minY-=pyer; maxY+=pyer;
  const minX=Math.min(...xs),maxX=Math.max(...xs);
  const sx=x=>maxX===minX?W/2:pad+(x-minX)/(maxX-minX)*(W-pad*2);
  const sy=y=>H-pad-(y-minY)/(maxY-minY)*(H-pad*2);
  let d="",area="";
  points.forEach((p,i)=>{const X=sx(p.x),Y=sy(p.y);d+=(i?"L":"M")+X.toFixed(1)+" "+Y.toFixed(1)+" ";});
  area=`M${sx(points[0].x).toFixed(1)} ${(H-pad).toFixed(1)} `+points.map(p=>"L"+sx(p.x).toFixed(1)+" "+sy(p.y).toFixed(1)).join(" ")+` L${sx(points[points.length-1].x).toFixed(1)} ${(H-pad)} Z`;
  const dots=points.map(p=>`<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="3" fill="${color}"/>`).join("");
  const gid="g"+Math.random().toString(36).slice(2,7);
  const lblMin=`<text x="2" y="${H-pad+4}" fill="#5C6273" font-size="11">${Math.round(minY)}</text>`;
  const lblMax=`<text x="2" y="${pad+4}" fill="#5C6273" font-size="11">${Math.round(maxY)}</text>`;
  return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity="0.28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${lblMin}${lblMax}</svg></div>`;
}

/* ===================== NAVIGATION ===================== */
function switchTab(tab){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const vEl=$("#view-"+tab); if(vEl) vEl.classList.add("active");
  /* COACH lives under More, CARDIO under TRAIN — keep the parent nav button highlighted */
  var navTab = tab==="coach"?"more" : tab==="cardio"?"train" : tab;
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.tab===navTab));
  window.scrollTo(0,0);
  if(tab==="home")renderHOME();
  if(tab==="train")renderTRAIN();
  if(tab==="cardio")renderCARDIO();
  if(tab==="fuel")renderFUEL();
  if(tab==="stats")renderSTATS & DATA();
  if(tab==="more")renderMore();
  if(tab==="coach")renderCOACH();
  const fab=$("#fuelFab"); if(fab) fab.classList.toggle("hidden",tab!=="fuel");
}
document.querySelectorAll("#nav button").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
(function(){ const fab=$("#fuelFab"); if(fab) fab.addEventListener("click",()=>openFoodSearch()); })();

/* ===================== STAY AWAKE (Wake Lock) ===================== */
let wakeLock=null;
async function requestWakeLock(){
  try{
    if(DATA.prefs && DATA.prefs.keepAwake===false) return; /* user opted out */
    if("wakeLock" in navigator){
      wakeLock=await navigator.wakeLock.request("screen");
      wakeLock.addEventListener&&wakeLock.addEventListener("release",()=>{});
    }
  }catch(e){/* unsupported or denied — best effort */}
}
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible" && $("#app").classList.contains("on")) requestWakeLock();
});

/* ===================== DAY ROLLOVER ===================== */
/* Keep the date current if the app is left open across midnight or comes back
   into focus on a new day. Refreshes the header + active tab; if the user was
   viewing "today" in FUEL, advances them to the new today. */
let _dayStamp=todayISO();
function checkDAYRollover(){
  const now=todayISO();
  if(now!==_dayStamp){
    const wasToday = (viewDate===_dayStamp);
    _dayStamp=now;
    if(wasToday) viewDate=now;
    if($("#app").classList.contains("on")){ try{ updateHeader(); refreshCurrentTab(); }catch(e){} }
  }
}
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") checkDAYRollover(); });
window.addEventListener("focus",checkDAYRollover);
setInterval(checkDAYRollover,30000);

/* ===================== SPLASH / BOOT ===================== */
$("#enterBtn").addEventListener("click",()=>{
  unlockAudio();
  requestWakeLock();
  $("#splash").classList.add("gone");
  $("#app").classList.add("on");
  $("#nav").classList.remove("hidden");
  if(!DATA.profile){ openSetup(true); }
  else { switchTab((DATA.prefs&&DATA.prefs.startTab)||"home"); maybeRESUMESESSION(); }
});

/* ===================== SETUP WIZARD ===================== */
let setupDraft=null;
function setupHeader(first){
  return first?`<div class="su-hero"><div class="su-ic">⚡</div>
    <div class="su-t">GET SET UP.</div>
    <div class="su-s">30 seconds. Then we build your first session.</div></div>`:`<h3>YOUR PROFILE</h3>`;
}
function openSetup(first){
  const p=DATA.profile||{sex:"male",activity:"mod",goal:"maintain"};
  const d=setupDraft||{};
  const wKg = d.weightKg!=null ? d.weightKg : p.weightKg;
  const gwKg = d.goalBODYWEIGHTKg!=null ? d.goalBODYWEIGHTKg : p.goalBODYWEIGHTKg;
  openModal(`
   ${setupHeader(first)}
   <p class="muted tiny" style="margin-bottom:16px">${first?"Everything stays on your device. You can change these any time.":"Update your stats — targets recalculate automatically."}</p>
   <div class="field"><label>Name (optional)</label><input class="input" id="su_name" value="${esc(d.name!=null?d.name:(p.name||""))}" placeholder="Your name"></div>
   <div class="field"><label>Sex (for calorie formula)</label>
     <div class="seg" id="su_sex">
       <button data-v="male" class="${(d.sex||p.sex)==="male"?"on":""}">Male</button>
       <button data-v="female" class="${(d.sex||p.sex)==="female"?"on":""}">Female</button></div></div>
   <div class="su-units">
     <div class="field"><label>Lifting weight unit</label>
       <div class="seg" id="su_lift"><button data-v="kg" class="${liftUnit()==="kg"?"on":""}">kg</button><button data-v="lb" class="${liftUnit()==="lb"?"on":""}">lb</button></div></div>
     <div class="field"><label>Bodyweight unit</label>
       <div class="seg" id="su_body"><button data-v="kg" class="${bodyUnit()==="kg"?"on":""}">kg</button><button data-v="lb" class="${bodyUnit()==="lb"?"on":""}">lb</button><button data-v="st" class="${bodyUnit()==="st"?"on":""}">st</button></div></div>
   </div>
   <div class="grid2">
     <div class="field"><label>Age</label><input class="input num" id="su_age" type="number" inputmode="numeric" value="${d.age!=null?d.age:(p.age||"")}" placeholder="25"></div>
     <div class="field"><label>HEIGHT (cm)</label><input class="input num" id="su_h" type="number" inputmode="decimal" value="${d.heightCm!=null?d.heightCm:(p.heightCm||"")}" placeholder="178"></div>
   </div>
   <div class="grid2">
     <div class="field"><label>BODYWEIGHT (${bodyLbl()})</label>${bodyInputHTML("su_w", wKg)}</div>
     <div class="field"><label>TARGET WEIGHT (${bodyLbl()})</label>${bodyInputHTML("su_gw", gwKg)}</div>
   </div>
   <div class="field"><label>ACTIVITY</label>
     <select class="input" id="su_act">${Object.entries(ACT).map(([k,v])=>`<option value="${k}" ${(d.activity||p.activity)===k?"selected":""}>${v.l}</option>`).join("")}</select></div>
   <div class="field"><label>GOAL</label>
     <div class="seg" id="su_goal">${Object.entries(GOALS).map(([k,v])=>`<button data-v="${k}" class="${(d.goal||p.goal)===k?"on":""}">${v.l}</button>`).join("")}</div></div>
   <div class="field"><label>GYM equipment you'll use</label>
     <div class="seg vstack" id="su_equip">
       <button data-v="machine_cardio" class="${DATA.prefs.gymEquip!=="all"?"on":""}">Machines + CARDIO only</button>
       <button data-v="all" class="${DATA.prefs.gymEquip==="all"?"on":""}">Machines + Free BODYWEIGHTs + CARDIO</button></div></div>
   <div class="grid2">
     <div class="field"><label>Stride length (cm) · optional</label><input class="input num" id="su_stride" type="number" inputmode="decimal" value="${d.strideCm!=null?d.strideCm:(p.strideCm||"")}" placeholder="auto"></div>
     <div class="field"><label>Arm length (cm) · optional</label><input class="input num" id="su_arm" type="number" inputmode="decimal" value="${d.armCm!=null?d.armCm:(p.armCm||"")}" placeholder="auto"></div>
   </div>
   <p class="muted tiny" style="margin:-6px 0 14px">Stride & arm length are used to estimate cardio distance — always approximate.</p>
   <button class="btn str block" id="su_save" style="margin-top:4px">${first?"GO training":"SAVE"}</button>
  `, {mandatory:!!first});
  segBind("su_sex"); segBind("su_goal"); segBind("su_lift");
  /* helper: capture current inputs into draft before a unit re-render */
  function capture(){
    setupDraft={
      name:$("#su_name").value, sex:segVal("su_sex"),
      age:+$("#su_age").value||null, heightCm:+$("#su_h").value||null,
      weightKg:readBodyKg("su_w")||null, goalBODYWEIGHTKg:readBodyKg("su_gw")||null,
      activity:$("#su_act").value, goal:segVal("su_goal"),
      strideCm:+$("#su_stride").value||null, armCm:+$("#su_arm").value||null
    };
  }
  $("#su_lift").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{DATA.prefs.liftUnit=btn.dataset.v;save();}));
  $("#su_body").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    capture(); DATA.prefs.bodyUnit=btn.dataset.v; save(); openSetup(first);  /* re-render so weight fields match */
  }));
  $("#su_equip").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    $("#su_equip").querySelectorAll("button").forEach(x=>x.classList.remove("on"));btn.classList.add("on");
    DATA.prefs.gymEquip=btn.dataset.v;}));
  $("#su_save").addEventListener("click",()=>{
    const age=+$("#su_age").value, h=+$("#su_h").value, w=readBodyKg("su_w");
    if(!age||!h||!w){toast("Add age, height and weight");return;}
    const prof={name:$("#su_name").value.trim(),sex:segVal("su_sex"),age,heightCm:h,weightKg:w,
      goalBODYWEIGHTKg:readBodyKg("su_gw")||w, activity:$("#su_act").value, goal:segVal("su_goal"),
      strideCm:+$("#su_stride").value||0, armCm:+$("#su_arm").value||0};
    DATA.profile=prof;
    if(DATA.prefs.targetMode==="manual" && DATA.targets){
      const c=computeTargets(prof); DATA.targets.bmr=c.bmr; DATA.targets.tdee=c.tdee; /* keep manual cals/macros, refresh info only */
    } else {
      DATA.targets=computeTargets(prof);
    }
    save();
    if(!DATA.weights.length || DATA.weights[DATA.weights.length-1].kg!==w){
      DATA.weights.push({date:todayISO(),kg:w});
    }
    setupDraft=null; save(); closeModal(false,true);
    updateHeader();
    if(first){switchTab("home"); toast("You're all set 💪"); setTimeout(()=>openWelcomeFlow(),500);}
    else{renderMore(); toast("SAVED.");}
  });
}
function segBind(id){const seg=$("#"+id);seg.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
  seg.querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");}));}
function segVal(id){const b=$("#"+id).querySelector("button.on");return b?b.dataset.v:null;}

function updateHeader(){
  const name=DATA.profile?.name;
  const h=new Date().getHours();
  const part = h<5?"Late night grind":h<12?"Good morning":h<17?"Good afternoon":h<21?"Good evening":"Night moves";
  $("#helloTxt").textContent = name?`${part}, ${name} 👋`:part+" 👋";
  const av=$("#avInit");
  if(av){
    av.classList.add("brand-av");
    av.innerHTML=profileAvatarHTML();
    av.setAttribute("aria-label","Open settings");
    if(!av._wired){ av._wired=1; av.style.cursor="pointer"; av.addEventListener("click",()=>switchTab("more")); }
  }
  $("#dateTxt").textContent = prettyDate(todayISO());
}

/* ===================== HOME (TODAY) SCREEN ===================== */
/* ===================== PER-TAB HELP ===================== */
const TAB_HELP={
  home:{t:"HOME",b:`<div class="help-body">
    <p class="help-lead">Your day at a glance — start training, check your fuel, and see your numbers.</p>
    <div class="help-row"><b>Today card</b><span>GO your planned session, a quick workout, or plan your week.</span></div>
    <div class="help-row"><b>Week strip</b><span>Tap a day to start it; <b>EDIT</b> opens the planner. (Shown once a week is planned.)</span></div>
    <div class="help-row"><b>Quick actions</b><span>Quick start, STARRED, CARDIO and Log food — one tap each.</span></div>
    <div class="help-row"><b>FUEL today</b><span>KCAL left, protein and water; tap <b>Open</b> for the full FUEL tab.</span></div>
    <div class="help-row"><b>At a glance</b><span>STREAK, workouts and volume — tap to jump to PROGRESS.</span></div>
    <div class="help-row"><b>Bodyweight</b><span>Log today's weight in one tap.</span></div></div>`},
  train:{t:"TRAIN",b:`<div class="help-body">
    <p class="help-lead">YOUR SESSION library — build a session, run a saved program, or pick a ready-made one.</p>
    <div class="help-row"><b>GYM / HOME</b><span>Toggle where you're training; the exercise pool changes to match.</span></div>
    <div class="help-row"><b>Muscle tiles</b><span>Tap one to build a workout — set how many moves, focus a sub-muscle, swap any, then GO.</span></div>
    <div class="help-row"><b>PROGRAMS</b><span>SAVE a multi-day plan (e.g. Push/Pull/Legs). GO from a template or build your own, then start any day with one tap. (STARRED = one workout; PROGRAMS = a whole week.)</span></div>
    <div class="help-row"><b>Mega</b><span>Mixes several muscle groups in one session, with optional cardio.</span></div>
    <div class="help-row"><b>SAVED SESSIONS</b><span>Sessions you've saved as favourites — tap GO to run one again.</span></div>
    <div class="help-row"><b>STARRED ★</b><span>Star any exercise, then the ★ pill builds a session from your favourites.</span></div></div>`},
  cardio:{t:"CARDIO",b:`<div class="help-body">
    <p class="help-lead">Track any cardio and log it to your day.</p>
    <div class="help-row"><b>Activity tiles</b><span>Tap one to set it up; each shows a rough calories &amp; distance estimate per 30 min.</span></div>
    <div class="help-row"><b>READY, then GO</b><span>A fresh cardio opens on a READY screen — the timer doesn't begin until you tap ▶ GO, so you can get set up first.</span></div>
    <div class="help-row"><b>Stopwatch / timer</b><span>Counts up once started; PAUSE and RESUME any time, then END SESSION to log it.</span></div>
    <div class="help-row"><b>Estimates</b><span>KCAL burned, plus distance if you set your stride length in setup.</span></div>
    <div class="help-row"><b>RESUME</b><span>LEAVE mid-session and it picks up where you left off.</span></div>
    <div class="help-row"><b>BACK</b><span>Tap ‹ at the top to return to TRAIN.</span></div></div>`},
  fuel:{t:"FUEL",b:`<div class="help-body">
    <p class="help-lead">Your nutrition for the day — calories, macros and water.</p>
    <div class="help-row"><b>Rings</b><span>Big ring = calories left; smaller rings track <b style="color:#FF6A2C">protein</b>, <b style="color:#5AA9FF">carbs</b> and <b style="color:#FFC857">fat</b>.</span></div>
    <div class="help-row"><b>＋ Add food</b><span>Sits at the top, and a floating <b>＋</b> stays in the corner as you scroll. Pick a meal, search (typo-friendly), and tap ＋ to drop foods onto a <b>plate</b>. Recent &amp; favourite ★ foods sit on top.</span></div>
    <div class="help-row"><b>The plate</b><span>Build a whole meal, then <b>Log all at once</b>. Tap a plate item's name or ⚙ to adjust its portion; ✕ removes it.</span></div>
    <div class="help-row"><b>Portions</b><span>Common foods show a portion (1 egg, 1 slice); everything can also be set in grams.</span></div>
    <div class="help-row"><b>Own food</b><span>Add a custom food with macros and an optional category — it's saved under "My foods" to reuse.</span></div>
    <div class="help-row"><b>EDIT a food</b><span>Tap any logged item to edit, duplicate or remove it.</span></div>
    <div class="help-row"><b>Repeat a meal</b><span>Copy a meal from another day in one tap.</span></div>
    <div class="help-row"><b>🔥 Burned</b><span>Adds exercise calories back to your budget (toggle in More → PREFERENCES).</span></div>
    <div class="help-row"><b>WATER</b><span>Tap to add; set the amount &amp; unit in More → PREFERENCES.</span></div>
    <div class="help-row"><b>‹ ›</b><span>Switch between days. MEAL WINDOWS are optional (More → PREFERENCES).</span></div></div>`},
  stats:{t:"PROGRESS",b:`<div class="help-body">
    <p class="help-lead">Your trends and history, grouped so you can find things fast.</p>
    <div class="help-row"><b>Pinned summary</b><span>Last 30 days plus weight, BMI, best streak and total lifted stay at the top.</span></div>
    <div class="help-row"><b>Expand / Collapse all</b><span>Open or close every section at once.</span></div>
    <div class="help-row"><b>📈 Trends</b><span>Bodyweight, progress photos, lifting volume, strength per exercise (with est. 1RM and training % table), goal weight.</span></div>
    <div class="help-row"><b>📸 PROGRESS photos</b><span>A private photo timeline stored only on this device — never uploaded or backed up.</span></div>
    <div class="help-row"><b>📅 Activity</b><span>Calendar, workout history, cardio and Mega sessions. Expand a workout to repeat it.</span></div>
    <div class="help-row"><b>🎯 GOALs &amp; milestones</b><span>STREAKs, daily targets and achievements.</span></div>
    <div class="help-row"><b>Tap to expand</b><span>Open any section; history lists page 5 at a time.</span></div></div>`},
  more:{t:"SETTINGS",b:`<div class="help-body">
    <p class="help-lead">Make Evolve yours — everything here is stored on this device only.</p>
    <div class="help-row"><b>PROFILE</b><span>Your body stats, goal and activity level (sets your calorie &amp; macro targets), plus an optional <b>profile photo</b> — local only, never uploaded.</span></div>
    <div class="help-row"><b>UNITS</b><span>Energy (kcal/kJ), lifting weight (kg/lb) and bodyweight (kg/lb/stone).</span></div>
    <div class="help-row"><b>PREFERENCES</b><span>THEME, achievements, meal times, gym equipment, <b>rest timer</b> (length + end beep &amp; flash), keep-screen-awake, water unit &amp; tap amount, the tab Evolve opens on, the help bars, and your 1RM formula.</span></div>
    <div class="help-row"><b>STATS & DATA &amp; resets</b><span>RESET a tracked number to zero or a custom value (unlock first).</span></div>
    <div class="help-row"><b>BACKUP &amp; restore</b><span><b>Encrypted backup</b> — locks your data with a password, then opens your phone's SAVE/Share sheet (iCloud, Files, Drive, etc.); restore with the same password. <b>BACKUP reminders</b> (OFF→MONTHLY) with optional notifications. <b>EXPORT CSV</b> of workouts or food for your own records.</span></div>
    <div class="help-row"><b>Help &amp; guide</b><span>This help, the full guide, and the changelog.</span></div>
    <div class="help-row"><b>Danger zone</b><span>Erase everything on this device — two-step, can't be undone.</span></div></div>`},
  coach:{t:"AI COACH",b:`<div class="help-body">
    <p class="help-lead">An optional AI coach for training &amp; nutrition, powered by your own OpenRouter key.</p>
    <div class="help-row"><b>⚠️ SENDs data off device</b><span>This is the only part of Evolve that isn't fully on-device. When you ask something, your question + a summary of your training is sent to OpenRouter to generate a reply. You consent before it's enabled.</span></div>
    <div class="help-row"><b>Your key</b><span>Create a free key at openrouter.ai/keys and paste it in. It's stored only on this device, never in any backup, and never sent anywhere except OpenRouter.</span></div>
    <div class="help-row"><b>CHAT</b><span>Ask anything about your training or nutrition; the coach sees your recent workouts and goals.</span></div>
    <div class="help-row"><b>BUILD A SESSION</b><span>Choose the muscle groups and length you want — or tap “PICK ONE FOR ME” and the COACH picks based on your goal and recent training. Then GO it now or SAVE FOR LATER.</span></div>
    <div class="help-row"><b>ANALYSE MY LOGS</b><span>Reviews your recent workouts &amp; targets and suggests improvements.</span></div>
    <div class="help-row"><b>Models</b><span>Pick from free or paid models in COACH settings. Free ones cost nothing; paid ones use your OpenRouter credit.</span></div>
    <div class="help-row"><b>Not medical advice</b><span>The coach can be wrong — see a professional for pain, injury or medical concerns.</span></div></div>`}
};
function openTabHelp(k){ const h=TAB_HELP[k]; if(!h)return;
  openModal(`<h3>${h.t} — how it works</h3><div style="max-height:62vh;overflow:auto;margin-top:6px">${h.b}</div>
    <button class="btn block" id="th_ok" style="margin-top:6px">GOT IT</button>`);
  const ok=$("#th_ok"); if(ok)ok.addEventListener("click",closeModal); }
function helpBar(k){
  if(DATA.prefs && DATA.prefs.showHelpBars===false) return document.createDocumentFragment();
  const btn=el("button","help-bar");
  btn.innerHTML=`<span class="hb-l"><span class="hb-i">ⓘ</span> How this page works</span><span class="hb-go">›</span>`;
  btn.addEventListener("click",()=>openTabHelp(k)); return btn; }

function renderHOME(){
  updateHeader();
  const b=$("#homeBody"); b.innerHTML="";
  b.appendChild(helpBar("home"));
  maybeBACKUPBanner(b);
  const todayIdx=(new Date().getDAY()+6)%7, todayName=DOW[todayIdx];
  const plan = DATA.weeklyPlan && DATA.weeklyPlan.weekGO===curWeekGO() ? DATA.weeklyPlan : null;
  const td = plan ? plan.days[todayName] : null;
  const doneToday = DATA.workouts.filter(w=>w.date===todayISO());

  /* ---- HERO: what's happening today ---- */
  const hero=el("div","hero");
  let heroTitle, heroSub, heroBtn, heroAct;
  if(td && td.done){ heroTitle="DONE. for today ✅"; heroSub=`${td.label} day complete — nice work. Recover well.`; heroBtn="＋ Bonus session"; heroAct=()=>openBonusDAY(todayName); }
  else if(td && td.type==="strength"){ heroTitle="Today: "+td.label+" day"; heroSub="Your planned session is ready — one tap to start."; heroBtn="▶ GO "+td.label+" day"; heroAct=()=>startPlannedDAY(todayName); }
  else if(td && td.type==="cardio"){ heroTitle="Today: CARDIO 🏃"; heroSub="A scheduled cardio day — pick any activity."; heroBtn="▶ START CARDIO"; heroAct=()=>switchTab("cardio"); }
  else if(plan){ heroTitle="REST DAY 🧘"; heroSub="Recovery is where the growth happens. Hit your protein and water."; heroBtn="＋ Bonus session anyway"; heroAct=()=>openBonusDAY(todayName); }
  else { heroTitle="GET TO WORK."; heroSub="Pick a muscle. Build a session. No thinking required."; heroBtn="START NOW"; heroAct=openQuickGO; }
  hero.innerHTML=`<div class="hero-eyebrow">${prettyDate(todayISO())}</div>
    <div class="hero-title">${heroTitle}</div>
    <div class="hero-sub">${heroSub}</div>`;
  const hb=el("button","btn str block hero-btn",heroBtn); hb.addEventListener("click",heroAct); hero.appendChild(hb);
  if(!plan){ const pb=el("button","btn ghost block","🧠 Plan my week"); pb.style.marginTop="10px"; pb.addEventListener("click",openWeekPlanner); hero.appendChild(pb); }
  b.appendChild(hero);

  /* ---- week strip (if planned) ---- */
  if(plan){
    const wk=el("div","plan-card"); wk.style.marginTop="14px";
    let strip=`<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:2px">
      <div class="eyebrow" style="margin:0">This week</div><button class="btn sm" id="hm_editplan">EDIT</button></div><div class="plan-strip">`;
    DOW.forEach((dn,i)=>{ const d=plan.days[dn]; const cls=["plan-day"];
      if(i===todayIdx)cls.push("today"); if(!d||d.type==="rest")cls.push("rest"); if(d&&d.done)cls.push("done");
      strip+=`<div class="${cls.join(" ")}" data-day="${dn}"><div class="dn">${dn}</div><div class="dl">${d?(d.type==="rest"?"REST":d.type==="cardio"?"CARDIO":d.label):"REST"}</div></div>`; });
    strip+=`</div>`;
    wk.innerHTML=strip; b.appendChild(wk);
    $("#hm_editplan").addEventListener("click",openWeekPlanner);
    wk.querySelectorAll("[data-day]").forEach(c=>c.addEventListener("click",()=>startPlannedDAY(c.getAttribute("data-day"))));
  }

  /* ---- quick actions ---- */
  b.appendChild(el("div","eyebrow","Quick actions")).style.cssText="margin:18px 4px 10px";
  const qa=el("div","qa-grid"); qa.style.marginTop="0";
  const actions=[
    ["⚡","Quick start",openQuickGO,"str"],
    ["★","STARRED",openFavHub,"gold"],
    ["🏃","CARDIO",()=>switchTab("cardio"),"blue"],
    ["🍎","Log food",()=>{viewDate=todayISO();switchTab("fuel");setTimeout(()=>{try{openFoodSearch();}catch(e){}},80);},"fuel"]
  ];
  actions.forEach(([ic,label,fn,ac])=>{ const a=el("button","qa qa-"+ac); a.innerHTML=`<span class="qi">${ic}</span><span class="ql">${label}</span>`; a.addEventListener("click",fn); qa.appendChild(a); });
  b.appendChild(qa);

  /* ---- fuel snapshot ---- */
  if(DATA.targets){
    const L=dayLog(todayISO());
    const eaten=(L.food||[]).reduce((a,f)=>a+(f.kcal||0),0);
    const burned=DATA.prefs.addMOVE?(L.burned||[]).reduce((a,x)=>a+(x.kcal||0),0):0;
    const budget=DATA.targets.calories+burned;
    const left=Math.round(budget-eaten);
    const pct=Math.max(0,Math.min(100,Math.round(eaten/budget*100)));
    const pro=(L.food||[]).reduce((a,f)=>a+(f.p||0),0);
    const water=L.water||0;
    const waterShown=DATA.prefs.waterUnit==="floz"?Math.round(water/29.5735):water;
    const waterLbl=DATA.prefs.waterUnit==="floz"?"fl oz 💧":"ml 💧";
    const fc=el("div","card snap"); 
    fc.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="eyebrow" style="margin:0">FUEL today</div><button class="btn sm" id="hm_fuel">Open</button></div>
      <div class="bar" style="margin-bottom:10px"><i style="width:${pct}%;background:var(--grad-fuel)"></i></div>
      <div class="snap-row">
        <div><div class="sv num" style="color:${left>=0?"var(--fuel)":"var(--danger)"}">${eVal(Math.abs(left))}</div><div class="sk">${eUnit()} ${left>=0?"left":"over"}</div></div>
        <div><div class="sv num">${Math.round(pro)}g</div><div class="sk">protein</div></div>
        <div><div class="sv num">${waterShown}</div><div class="sk">${waterLbl}</div></div>
      </div>`;
    b.appendChild(fc);
    $("#hm_fuel").addEventListener("click",()=>{viewDate=todayISO();switchTab("fuel");});
  }

  /* ---- streak / totals strip ---- */
  b.appendChild(el("div","eyebrow","At a glance")).style.cssText="margin:20px 4px 10px";
  const strip=el("div","grid3 home-glance");
  strip.innerHTML=`
   <div class="stat"><div class="k">STREAK</div><div class="v">${dispSESSIONSTREAK()}<small> days</small></div></div>
   <div class="stat"><div class="k">SESSIONS</div><div class="v">${dispSESSIONS()}</div></div>
   <div class="stat"><div class="k">TOTAL LOAD</div><div class="v">${tonneVal(dispTOTAL LOAD())}<small> ${tonneUnit()}</small></div></div>`;
  strip.style.marginTop="0";
  strip.addEventListener("click",()=>switchTab("stats"));
  b.appendChild(strip);

  /* ---- quick bodyweight log ---- */
  if(DATA.profile){
    const lastW=DATA.weights.length?DATA.weights[DATA.weights.length-1]:null;
    const loggedToday=lastW&&lastW.date===todayISO();
    const wc=el("div","card"); wc.style.marginTop="14px";
    wc.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center">
        <div class="lrow" style="padding:0;border:none;gap:12px"><div class="ico">⚖️</div>
          <div class="main"><div class="t">Bodyweight</div>
          <div class="s num">${lastW?bodyStr(lastW.kg)+(loggedToday?" · today":" · "+shortDate(lastW.date)):"Not logged yet"}</div></div></div>
        <button class="btn sm ${loggedToday?"":"fuel"}" id="hm_weight">${loggedToday?"Update":"＋ Log"}</button></div>`;
    wc.querySelector("#hm_weight").addEventListener("click",openLogBODYWEIGHT);
    b.appendChild(wc);
  }

  /* ---- today's completed activity ---- */
  const cardioToday=DATA.cardio.filter(c=>c.date===todayISO());
  if(doneToday.length||cardioToday.length){
    b.appendChild(el("div","sect-h",`<h3>Completed today</h3>`));
    const card=el("div","card");
    doneToday.forEach(w=>{
      const r=el("div","lrow");
      r.innerHTML=`<div class="ico">✅</div><div class="main"><div class="t">${esc(w.title)}</div>
        <div class="s">${w.moves.length} exercise${w.moves.length===1?"":"s"} · ${volStr(w.volume)}${w.prs&&w.prs.length?` · ${w.prs.length} PR${w.prs.length>1?"s":""} 🏅`:""}</div></div>`;
      const del=el("button","del","×"); del.addEventListener("click",()=>deleteSESSION(w.id,renderHOME));
      r.appendChild(del); card.appendChild(r);
    });
    cardioToday.forEach(c=>{
      const r=el("div","lrow");
      r.innerHTML=`<div class="ico">${(CARDIO.find(x=>x.n===c.name)||{}).ic||"🏃"}</div><div class="main"><div class="t">${esc(c.name)}</div>
        <div class="s">${fmtClock(c.seconds*1000)} · ${eVal(c.kcal)} ${eUnit()}</div></div>`;
      card.appendChild(r);
    });
    b.appendChild(card);
  }
}

/* ===================== TRAIN SCREEN (library) ===================== */
function renderTRAIN(){
  const b=$("#trainBody"); b.innerHTML="";
  b.appendChild(helpBar("train"));
  if(!DATA.prefs.env)DATA.prefs.env="gym";

  /* environment toggle + favourites pill */
  const envRow=el("div","env-row");
  envRow.innerHTML=`<div class="env-seg" id="envSeg">
      <button data-v="gym" class="${DATA.prefs.env==="gym"?"on":""}">🏋️ GYM</button>
      <button data-v="home" class="${DATA.prefs.env==="home"?"on":""}">🏠 HOME</button></div>
    <button class="fav-pill" id="favPill">★ Favs</button>`;
  b.appendChild(envRow);
  $("#envSeg").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    DATA.prefs.env=btn.dataset.v;save();renderTRAIN();}));
  $("#favPill").addEventListener("click",openFavHub);

  if(DATA.prefs.env==="gym") renderGYMZone(b); else renderHOMEZone(b);

  /* routines — multi-day programs */
  const rtSect=el("div","sect-h",`<h3>📋 Routines</h3>`); b.appendChild(rtSect);
  const rtCard=el("button","mega-card");
  const rtCount=(DATA.routines||[]).length;
  rtCard.innerHTML=`<div class="mega-glow" style="background:radial-gradient(120% 120% at 0% 0%,rgba(169,119,255,.28),transparent 50%),radial-gradient(120% 120% at 100% 100%,rgba(90,169,255,.2),transparent 50%)"></div>
    <div style="position:relative;z-index:2"><div class="nm disp">PROGRAMS 📋</div>
    <div class="ct">${rtCount?`${rtCount} saved · tap to open or start a day`:"Build a multi-day plan (e.g. PUSH / PULL / LEGS)"}</div></div>`;
  rtCard.addEventListener("click",openRoutinesHub);
  b.appendChild(rtCard);

  /* saved workouts — always shown so it's discoverable */
  const shF=el("div","sect-h",`<h3>SAVED SESSIONS</h3>`); b.appendChild(shF);
  if(DATA.favSESSIONS&&DATA.favSESSIONS.length){
    const fwCard=el("div","card");
    DATA.favSESSIONS.forEach(f=>{
      const wrap=el("div","fav-wrap");
      const r=el("div","lrow");
      const cardioTxt=f.cardio?` + ${f.cardio.ic} cardio`:"";
      const src=f.source==="coach"?`<span class="fav-src">🤖 COACH</span>`:"";
      r.innerHTML=`<div class="ico">★</div><div class="main"><div class="t">${esc(f.name)}${src}</div>
        <div class="s">${f.moves.length} exercise${f.moves.length===1?"":"s"}${cardioTxt} <span class="fav-caret">▾</span></div></div>`;
      const go=el("button","btn sm str","GO"); go.addEventListener("click",e=>{e.stopPropagation();startFavSESSION(f);});
      const del=el("button","del","×"); del.addEventListener("click",e=>{e.stopPropagation();deleteFavSESSION(f.id);});
      const end=el("div","row"); end.style.gap="6px"; end.append(go,del);
      r.appendChild(end); wrap.appendChild(r);
      const names=f.moves.map(e=>esc(e.name)); if(f.cardio)names.push(`${f.cardio.ic} ${esc(f.cardio.name)}`);
      const exl=el("div","fav-exlist");
      exl.innerHTML=names.map((n,i)=>`<div class="fav-exrow"><span class="fav-exn">${i+1}</span><span>${n}</span></div>`).join("");
      wrap.appendChild(exl);
      const main=r.querySelector(".main"); main.style.cursor="pointer";
      main.addEventListener("click",()=>wrap.classList.toggle("open"));
      fwCard.appendChild(wrap);
    });
    b.appendChild(fwCard);
  } else {
    const empty=el("div","card");
    empty.innerHTML=`<div class="saved-empty">
      <div class="saved-empty-ic">★</div>
      <div class="saved-empty-t">NOTHING SAVED YET.</div>
      <div class="saved-empty-s">During any workout, tap the ★ at the top to save it here to reuse any time. The AI COACH can also generate workouts you can save straight to this list.</div>
    </div>`;
    b.appendChild(empty);
  }
}
function cardioEntryCard(){
  const cc=el("button","mega-card cardio-card");
  cc.innerHTML=`<div class="mega-glow" style="background:radial-gradient(120% 120% at 0% 0%,rgba(47,230,168,.3),transparent 50%),radial-gradient(120% 120% at 100% 100%,rgba(90,169,255,.22),transparent 50%)"></div>
    <div style="position:relative;z-index:2"><div class="nm disp">CARDIO 🏃</div>
    <div class="ct">${CARDIO.length} activities · timers, calories & distance</div></div>`;
  cc.addEventListener("click",()=>switchTab("cardio"));
  return cc;
}
function renderGYMZone(b){
  const sh=el("div","sect-h",`<h3>Target a muscle group</h3>`); b.appendChild(sh);
  const grid=el("div","mg-grid");
  GROUPS.forEach(g=>{
    const card=el("button","mg");
    const n=gymMOVEsIn(g).length;
    card.innerHTML=`<div class="glow" style="background:radial-gradient(135% 120% at 82% 8%, ${GROUP_GLOW[g]}, transparent 62%)"></div>
      <div class="go">›</div><div class="gi">${GICON[g]||"🏋️"}</div>
      <div class="ct">${n} ${fwEnabled()?"moves":"machines"}</div><div class="nm">${g}</div>`;
    card.addEventListener("click",()=>openGroupBuilder(g));
    grid.appendChild(card);
  });
  b.appendChild(grid);
  const mega=el("button","mega-card");
  mega.innerHTML=`<div class="mega-glow"></div><div style="position:relative;z-index:2"><div class="nm disp">MEGA WORKOUT 💥</div>
    <div class="ct">TARGET A MUSCLE + cardio in one — random or your choice</div></div>`;
  mega.addEventListener("click",openMegaBuilder); b.appendChild(mega);
  b.appendChild(cardioEntryCard());
  const sh2=el("div","sect-h",`<h3>Preset days</h3>`); b.appendChild(sh2);
  b.appendChild(el("div","muted tiny","READY-made one-tap sessions — tap one to start straight away.")).style.cssText="margin:-6px 0 10px";
  const PICON={Push:"🫷",Pull:"🪢",Legs:"🦵",Upper:"🙆",["FULL BODY"]:"🔥"};
  const days=el("div","preset-scroll");
  Object.keys(PRESET_DAYS).forEach(d=>{
    const list=PRESET_DAYS[d];
    const groups=[...new Set(list.map(n=>EX_BY_NAME[n]?.g).filter(Boolean))];
    const c=el("button","preset-card");
    c.innerHTML=`<div class="pi">${PICON[d]||"🏋️"}</div><div class="pn">${d}</div>
      <div class="ps">${list.length} exercise${list.length===1?"":"s"}</div><div class="pg">${groups.slice(0,3).join(" · ")}</div>`;
    c.addEventListener("click",()=>startSession(d+" DAY","preset",PRESET_DAYS[d].map(n=>mkMOVE(n))));
    days.appendChild(c);
  });
  b.appendChild(days);
}
function renderHOMEZone(b){
  const sh3=el("div","sect-h",`<h3>At home</h3>`); b.appendChild(sh3);
  const home=el("div","card");
  home.innerHTML=`<div class="lrow" style="padding-top:0"><div class="ico">🏠</div>
    <div class="main"><div class="t">No machines? No problem.</div><div class="s">Pick your equipment — we'll build the routine.</div></div></div>`;
  const hb=el("button","btn block","Build a home routine"); hb.style.marginTop="6px";
  hb.addEventListener("click",openHOMEBuilder); home.appendChild(hb); b.appendChild(home);
  /* quick bodyweight */
  const qc=el("div","card");
  qc.innerHTML=`<div class="lrow" style="padding-top:0"><div class="ico">⚡</div>
    <div class="main"><div class="t">Quick bodyweight circuit</div><div class="s">A fast no-equipment session, built instantly.</div></div></div>`;
  const qb=el("button","btn str block","GO 15-min circuit"); qb.style.marginTop="6px";
  qb.addEventListener("click",()=>{
    const pool=HOME.filter(h=>h.eq.includes("none"));
    const ex=shuffle(pool.slice()).slice(0,6).map(h=>({name:h.n,group:h.t,home:h,sets:[prefilledSet(h.n)]}));
    if(!ex.length){toast("No bodyweight moves found");return;}
    startSession("Quick circuit","home",ex);
  });
  qc.appendChild(qb); b.appendChild(qc);
  /* home mega */
  const mega=el("button","mega-card");
  mega.innerHTML=`<div class="mega-glow"></div><div style="position:relative;z-index:2"><div class="nm disp">HOME MEGA 💥</div>
    <div class="ct">Full body + cardio. No equipment.</div></div>`;
  mega.addEventListener("click",()=>{DATA.prefs.env="home";openMegaBuilder();}); b.appendChild(mega);
  b.appendChild(cardioEntryCard());
}

/* ===================== WEEKLY PLANNER ===================== */
const DOW=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SPLIT_TEMPLATES={
  1:["FULL BODY"],
  2:["Upper","Lower"],
  3:["Push","Pull","Legs"],
  4:["Upper","Lower","Upper","Lower"],
  5:["Upper","Lower","Push","Pull","Legs"],
  6:["Push","Pull","Legs","Push","Pull","Legs"],
  7:["Push","Pull","Legs","Upper","Lower","Active Recovery","Active Recovery"]
};
const COACH={
  1:"🧠 One focused session. We'll make it full-body (or target your most neglected muscle) so nothing gets missed.",
  2:"⚖️ Two days — we'll run an Upper/Lower split so you still hit everything across the week.",
  3:"🔥 The classic PUSH / PULL / LEGS. Hits every muscle once with great recovery.",
  4:"💪 The hypertrophy sweet spot: Upper/Lower twice each — every muscle trained twice a week.",
  5:"🏋️ Advanced 5-day split with two built-in rest days for recovery.",
  6:"⚡ High volume (PPL ×2). We've kept one rest day — listen to your joints.",
  7:"⚠️ Seven days is a lot. We've turned two days into Active Recovery (mobility / light cardio) to prevent burnout."
};
function curWeekGO(){ const d=new Date(); const day=(d.getDAY()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function neglectedGroup(){
  const since=Date.now()-28*86400000; const cnt={};
  GROUPS.forEach(g=>cnt[g]=0);
  DATA.workouts.forEach(w=>{ if(new Date(w.date).getTime()>=since)(w.moves||[]).forEach(e=>{ if(cnt[e.group]!=null)cnt[e.group]++; }); });
  let min=null,minG=null; GROUPS.forEach(g=>{ if(min===null||cnt[g]<min){min=cnt[g];minG=g;} });
  return {group:minG,count:min};
}
function activeTabId(){ const s=document.querySelector(".screen.active"); return s?s.id.replace("view-",""):"home"; }
function refreshCurrentTab(){ const t=activeTabId();
  if(t==="home")renderHOME(); else if(t==="train")renderTRAIN(); else if(t==="cardio")renderCARDIO();
  else if(t==="fuel")renderFUEL(); else if(t==="stats")renderSTATS & DATA(); else if(t==="more")renderMore(); }
function refreshActive(){ if($("#view-home").classList.contains("active"))renderHOME(); else if($("#view-train").classList.contains("active"))renderTRAIN(); }
function renderPlanCard(b){
  const card=el("div","plan-card");
  const plan=DATA.weeklyPlan && DATA.weeklyPlan.weekGO===curWeekGO() ? DATA.weeklyPlan : null;
  const todayIdx=(new Date().getDAY()+6)%7, todayName=DOW[todayIdx];
  if(plan){
    const td=plan.days[todayName];
    const head=`<div class="row" style="justify-content:space-between;align-items:center">
      <div><div class="eyebrow" style="margin:0">This week ${infoBtn("planner")}</div>
      <div style="font-weight:700;margin-top:2px">${td?(td.type==="rest"?"🧘 REST DAY today":td.type==="cardio"?"🏃 CARDIO today":"Today: "+td.label+" day"):"No session today"}</div></div>
      <button class="btn sm" id="plan_edit">EDIT</button></div>`;
    let strip=`<div class="plan-strip">`;
    DOW.forEach((dn,i)=>{ const d=plan.days[dn]; const cls=["plan-day"];
      if(i===todayIdx)cls.push("today"); if(!d||d.type==="rest")cls.push("rest"); if(d&&d.done)cls.push("done");
      strip+=`<div class="${cls.join(" ")}" data-day="${dn}"><div class="dn">${dn}</div><div class="dl">${d?(d.type==="rest"?"REST":d.type==="cardio"?"CARDIO":d.label):"REST"}</div></div>`; });
    strip+=`</div>`;
    card.innerHTML=head+strip;
    b.appendChild(card);
    $("#plan_edit").addEventListener("click",openWeekPlanner);
    card.querySelectorAll("[data-day]").forEach(c=>c.addEventListener("click",()=>startPlannedDAY(c.getAttribute("data-day"))));
  } else {
    card.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center">
      <div><div class="eyebrow" style="margin:0">Plan your week ${infoBtn("planner")}</div>
      <div class="muted tiny" style="margin-top:3px">Build a balanced routine around the days you can train.</div></div></div>
      <button class="btn str block" id="plan_make" style="margin-top:12px">🧠 Plan my week</button>`;
    b.appendChild(card);
    $("#plan_make").addEventListener("click",openWeekPlanner);
  }
  bindInfo(card);
}
function openWeekPlanner(){
  const picked=new Set();
  if(DATA.weeklyPlan&&DATA.weeklyPlan.weekGO===curWeekGO()){
    DOW.forEach(dn=>{const d=DATA.weeklyPlan.days[dn]; if(d&&d.type!=="rest")picked.add(dn);});
  } else { ["Mon","Wed","Fri"].forEach(d=>picked.add(d)); }
  let cardioPref=(DATA.weeklyPlan&&DATA.weeklyPlan.cardioPref)||"after";
  function paint(){
    const nb=picked.size;
    const neglect=neglectedGroup();
    let coach=COACH[nb]||"Pick the days you can train.";
    if(nb===1 && DATA.workouts.length) coach=`🧠 Neglect detector: over the last 4 weeks your least-trained area is <b style="color:var(--text)">${neglect.group}</b>. We'll make your one day a ${neglect.group}-focused or full-body session.`;
    if(nb===0) coach="Tap the days you can train this week.";
    openModal(`<h3>Plan my week ${infoBtn("planner")}</h3>
      <p class="muted tiny" style="margin-bottom:12px">Tap the days you can train. We'll build a balanced split and slot in rest & cardio.</p>
      <div class="day-pick" id="wp_days">${DOW.map(d=>`<button data-d="${d}" class="${picked.has(d)?"on":""}">${d}</button>`).join("")}</div>
      <div class="coach" id="wp_coach">${coach}</div>
      <div class="mg-sub" style="margin-top:14px">CARDIO</div>
      <div class="seg" id="wp_cardio">
        <button data-v="after" class="${cardioPref==="after"?"on":""}">After lifting</button>
        <button data-v="rest" class="${cardioPref==="rest"?"on":""}">REST DAYs</button>
        <button data-v="skip" class="${cardioPref==="skip"?"on":""}">SKIP REST</button></div>
      <button class="btn str block" id="wp_build" style="margin-top:16px">Build my week</button>
      ${(DATA.weeklyPlan&&DATA.weeklyPlan.weekGO===curWeekGO())?`<button class="btn ghost block" id="wp_clear" style="margin-top:10px">CLEAR this week's plan</button>`:""}`);
    bindInfo($("#modal"));
    const clr=$("#wp_clear"); if(clr)clr.addEventListener("click",()=>{
      confirmModal({title:"CLEAR weekly plan?",danger:true,confirmText:"CLEAR it",body:"This removes this week's plan. You can build a new one any time.",
        onCONFIRM:()=>{DATA.weeklyPlan=null;save();closeModal();switchTab("home");toast("Plan cleared");}});
    });
    $("#wp_days").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      const d=btn.dataset.d; if(picked.has(d))picked.delete(d); else picked.add(d); paint();}));
    $("#wp_cardio").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{cardioPref=btn.dataset.v;
      $("#wp_cardio").querySelectorAll("button").forEach(x=>x.classList.remove("on"));btn.classList.add("on");}));
    $("#wp_build").addEventListener("click",()=>buildWeek([...picked].sort((a,b)=>DOW.indexOf(a)-DOW.indexOf(b)),cardioPref));
  }
  paint();
}
function buildWeek(trainDAYs, cardioPref){
  if(!trainDAYs.length){toast("Pick at least one day");return;}
  const tmpl=SPLIT_TEMPLATES[Math.min(trainDAYs.length,7)].slice();
  if(trainDAYs.length===1 && DATA.workouts.length){ const ng=neglectedGroup().group; tmpl[0]=["Chest","Shoulders","Arms"].includes(ng)?"Push":["BACK"].includes(ng)?"Pull":["Legs","Glutes"].includes(ng)?"Legs":"FULL BODY"; }
  const days={}; DOW.forEach(d=>days[d]=null);
  trainDAYs.forEach((d,i)=>{ const label=tmpl[i%tmpl.length];
    days[d]= label==="Active Recovery" ? {type:"cardio",label:"CARDIO",done:false} : {type:"strength",label,done:false}; });
  if(cardioPref==="after"){ trainDAYs.forEach(d=>{ if(days[d]&&days[d].type==="strength")days[d].cardio=true; }); }
  else if(cardioPref==="rest"){ DOW.forEach(d=>{ if(!days[d]) {/* leave some rest as cardio */} }); 
    const rest=DOW.filter(d=>!days[d]); if(rest.length){ days[rest[Math.floor(rest.length/2)]]={type:"cardio",label:"CARDIO",done:false}; } }
  DATA.weeklyPlan={weekGO:curWeekGO(),days,cardioPref};
  save(); closeModal(); switchTab("home"); toast("Week planned 🗓️");
}
function dayMOVEs(label){
  const map={Push:["Chest","Shoulders","Arms"],Pull:["BACK","Arms"],Legs:["Legs","Core"],
    Upper:["Chest","BACK","Shoulders","Arms"],Lower:["Legs","Core"],"FULL BODY":GROUPS.slice()};
  const groups=map[label]||GROUPS.slice();
  const favs=favList("gym").filter(x=>x.kind!=="cardio").map(x=>x.n);
  let ex=[];
  groups.forEach(g=>{
    const favInG=favs.filter(n=>EX_BY_NAME[n]&&EX_BY_NAME[n].g===g);
    let picks=favInG.slice(0,2);
    if(picks.length<2){ const pool=shuffle(gymPoolNames(g)).filter(n=>!picks.includes(n)); picks=picks.concat(pool.slice(0,2-picks.length)); }
    picks.forEach(n=>ex.push(mkMOVE(n)));
  });
  return ex;
}
function startPlannedDAY(dn){
  const plan=DATA.weeklyPlan; if(!plan){toast("No plan yet");return;}
  const d=plan.days[dn];
  if(!d || d.type==="rest"){ openBonusDAY(dn); return; }
  if(d.type==="cardio"){ switchTab("cardio"); toast("CARDIO day — pick an activity"); return; }
  let ex=dayMOVEs(d.label);
  if(d.cardio){ const c=CARDIO.filter(x=>x.t==="machine"); ex.push(mkCARDIOCard(c[Math.floor(Math.random()*c.length)])); }
  plannedDAYRef={dn}; startSession(d.label+" day","planned",ex);
}
function suggestedLabelFor(group){
  return ["Chest","Shoulders","Arms"].includes(group)?"Push":group==="BACK"?"Pull":["Legs","Glutes","Core"].includes(group)?"Legs":"FULL BODY";
}
function openBonusDAY(dn){
  const plan=DATA.weeklyPlan;
  const ng=neglectedGroup(); const label=DATA.workouts.length?suggestedLabelFor(ng.group):"FULL BODY";
  const todayIdx=(new Date().getDAY()+6)%7;
  const future=DOW.slice(DOW.indexOf(dn)+1).filter(x=>plan&&plan.days[x]&&plan.days[x].type==="strength");
  const clash=future.find(x=>plan.days[x].label===label);
  openModal(`<h3>Bonus workout 💪 ${infoBtn("planner")}</h3>
    <p style="line-height:1.55;color:var(--text)">Got extra time on <b>${dn}</b>? ${DATA.workouts.length?`Over the last 4 weeks your least-trained area is <b style="color:var(--strength)">${ng.group}</b>, so a <b>${label}</b> session would balance you out.`:`A <b>${label}</b> session is a solid choice.`}</p>
    ${clash?`<div class="coach" style="margin-top:12px">⚠️ You already have <b>${label}</b> planned for ${clash}. Rebalancing will reshuffle the rest of the week so you don't double up.</div>`:""}
    <button class="btn str block" id="bn_add" style="margin-top:16px">Add ${label} today — keep the rest</button>
    <button class="btn block" id="bn_bal" style="margin-top:10px">Add it & rebalance my week 🔄</button>
    <button class="btn ghost block" id="bn_cancel" style="margin-top:10px">Not now</button>`);
  bindInfo($("#modal"));
  $("#bn_cancel").addEventListener("click",closeModal);
  $("#bn_add").addEventListener("click",()=>{
    plan.days[dn]={type:"strength",label,done:false,bonus:true};
    if(plan.cardioPref==="after")plan.days[dn].cardio=true;
    save(); closeModal();
    let ex=dayMOVEs(label); if(plan.days[dn].cardio){const c=CARDIO.filter(x=>x.t==="machine");ex.push(mkCARDIOCard(c[Math.floor(Math.random()*c.length)]));}
    plannedDAYRef={dn}; startSession(label+" day","planned",ex);
  });
  $("#bn_bal").addEventListener("click",()=>{
    /* gather all training days incl the bonus, preserve completed days, rebalance the rest */
    const doneDAYs={}; DOW.forEach(x=>{ if(plan.days[x]&&plan.days[x].done)doneDAYs[x]=plan.days[x]; });
    const train=DOW.filter(x=>x===dn || (plan.days[x]&&plan.days[x].type!=="rest")).sort((a,b)=>DOW.indexOf(a)-DOW.indexOf(b));
    const tmpl=SPLIT_TEMPLATES[Math.min(train.length,7)].slice();
    const newDAYs={}; DOW.forEach(x=>newDAYs[x]=null);
    train.forEach((x,i)=>{ const lab=tmpl[i%tmpl.length];
      newDAYs[x]= doneDAYs[x] ? doneDAYs[x] : (lab==="Active Recovery"?{type:"cardio",label:"CARDIO",done:false}:{type:"strength",label:lab,done:false}); });
    if(plan.cardioPref==="after")train.forEach(x=>{ if(newDAYs[x]&&newDAYs[x].type==="strength"&&!newDAYs[x].done)newDAYs[x].cardio=true; });
    plan.days=newDAYs; save(); closeModal(); refreshActive(); toast("Week rebalanced 🔄");
    const td=plan.days[dn]; if(td&&td.type==="strength"){ let ex=dayMOVEs(td.label); if(td.cardio){const c=CARDIO.filter(y=>y.t==="machine");ex.push(mkCARDIOCard(c[Math.floor(Math.random()*c.length)]));} plannedDAYRef={dn}; startSession(td.label+" day","planned",ex); }
  });
}
let plannedDAYRef=null;

function mkMOVE(name){const m=EX_BY_NAME[name]; return {name, group:m?m.g:"", sets:[prefilledSet(name)]};}
function mkCARDIOCard(act, suggestMin){
  const name=act.name||act.n;
  return {cardio:true, name, group:"CARDIO", activity:{name, met:act.met, ic:act.ic}, suggestMin:suggestMin||15, done:false, result:null, sets:[]};
}
function openLiveCARDIOTimer(ex, onDONE.){
  if(liveCARDIOStop)liveCARDIOStop(); /* kill any timer left running from a sheet closed via ✕/BACK */
  const act=ex.activity;
  const fresh=(+ex.progressMs||0)===0; /* fresh start vs reopening mid-session */
  const st={elapsedMs:+ex.progressMs||0, running:false, lastTs:Date.now(), tick:null};
  function savePROGRESS(){ ex.progressMs=st.elapsedMs; persistLive(); } /* keep elapsed time on the exercise so closing & reopening resumes instead of restarting from zero */
  function startTick(){ if(!st.tick)st.tick=setInterval(()=>{ if(st.running){const n=Date.now();st.elapsedMs+=n-st.lastTs;st.lastTs=n;ex.progressMs=st.elapsedMs;upd();} },250); }
  function stop(){ if(st.tick){clearInterval(st.tick);st.tick=null;} if(liveCARDIOStop===stop)liveCARDIOStop=null; savePROGRESS(); if(onDONE.)onDONE.(); }
  liveCARDIOStop=stop; /* so closeModal() can stop the timer if the sheet is dismissed any way */
  function upd(){
    const secs=st.elapsedMs/1000, kcal=cardioKcal(act.met,secs), dist=cardioDISTANCEKm(act.name,secs);
    const clk=$("#lct_clock"); if(clk)clk.textContent=fmtClock(st.elapsedMs);
    const burn=$("#lct_burn"); if(burn)burn.innerHTML=`~${eVal(kcal)} ${eUnit()}${dist!=null?` · ~${dist.toFixed(2)} km <span class="muted" style="font-weight:400">(est.)</span>`:""}`;
  }
  function doEND SESSION(){
    stop(); const secs=Math.max(0,Math.round(st.elapsedMs/1000));
    const kcal=Math.round(cardioKcal(act.met,secs)), dist=cardioDISTANCEKm(act.name,secs);
    DATA.cardio.push({id:Date.now(),date:todayISO(),name:act.name,type:act.met>=8?"intense":"steady",seconds:secs,kcal,distanceKm:dist!=null?+dist.toFixed(2):null});
    if(DATA.prefs.addMOVE) dayLog(todayISO()).burned.push({name:act.name+" ("+fmtClock(secs*1000)+")",kcal,time:Date.now()});
    ex.done=true; ex.result={seconds:secs,kcal,dist:dist!=null?+dist.toFixed(2):null}; ex.progressMs=0;
    save(); persistLive(); closeModal(); toast("CARDIO logged 🔥"); if(onDONE.)onDONE.();
  }

  /* ── READY screen (fresh start only) — nothing counts until the user taps GO ── */
  function showREADY(){
    openModal(`<div class="center"><div style="font-size:46px;margin-bottom:4px">${act.ic}</div>
      <div class="disp" style="font-size:28px;line-height:1.05">${esc(act.name)}</div>
      <p class="muted" style="margin:10px 0 4px">READY when you are.</p>
      <p class="tiny muted" style="margin:0 0 22px">The timer won't start until you tap GO.</p>
      <button class="btn fuel block" id="lct_start" style="font-size:18px;padding:16px">▶ GO</button>
      <button class="btn ghost block" id="lct_back" style="margin-top:10px">Discard</button></div>`);
    $("#lct_start").addEventListener("click",()=>{ st.running=true; st.lastTs=Date.now(); showTimer(); startTick(); upd(); });
    $("#lct_back").addEventListener("click",()=>{ st.elapsedMs=0; ex.progressMs=0; stop(); closeModal(); });
  }

  /* ── RUNNING timer ── */
  function showTimer(){
    openModal(`<div class="center"><div style="font-size:40px">${act.ic}</div>
      <div class="eyebrow" style="margin:6px 0 12px">${esc(act.name)}</div>
      <div class="disp" id="lct_clock" style="font-size:64px;line-height:1">${fmtClock(st.elapsedMs)}</div>
      <div class="num" id="lct_burn" style="color:var(--fuel);font-weight:700;margin-top:6px"></div>
      <div class="row" style="gap:10px;margin-top:18px">
        <button class="btn" id="lct_toggle" style="flex:1">${st.running?"PAUSE":"RESUME"}</button>
        <button class="btn fuel" id="lct_done" style="flex:1">END SESSION</button></div>
      <button class="btn ghost block" id="lct_cancel" style="margin-top:10px">Discard</button></div>`);
    $("#lct_toggle").addEventListener("click",()=>{
      st.running=!st.running; st.lastTs=Date.now(); if(st.running)startTick();
      const t=$("#lct_toggle"); t.textContent=st.running?"PAUSE":"RESUME"; t.className="btn"+(st.running?"":" str"); t.style.flex="1";
    });
    $("#lct_done").addEventListener("click",doEND SESSION);
    $("#lct_cancel").addEventListener("click",()=>{ st.elapsedMs=0; ex.progressMs=0; stop(); closeModal(); });
    upd();
  }

  if(fresh){ showREADY(); }
  else { st.running=true; showTimer(); startTick(); upd(); } /* reopening mid-session → straight back into the live timer */
}
function buildCARDIOLiveCard(ex,xi){
  const c=el("div","ex-card"); c.style.borderColor="rgba(47,230,168,.4)";
  const head=el("div","eh");
  head.innerHTML=`<div class="nm">${ex.activity.ic} ${esc(ex.name)} <span class="tiny" style="color:var(--fuel)">· cardio</span></div>`;
  const rm=el("button","del","×"); rm.addEventListener("click",()=>removeLiveMOVE(xi));
  head.appendChild(rm); c.appendChild(head);
  if(ex.done && ex.result){
    const r=ex.result;
    const done=el("div","set-block done"); done.style.cursor="default";
    done.innerHTML=`<div class="sb-top"><span class="sl" style="color:var(--fuel)">DONE · ${fmtClock(r.seconds*1000)}</span>
      <div class="sb-done">✓</div></div>
      <div class="num" style="color:var(--fuel);font-weight:700">${eVal(r.kcal)} ${eUnit()}${r.dist!=null?` · ${r.dist} km`:""}</div>`;
    c.appendChild(done);
  } else {
    const tip=el("div","ex-tip"); tip.textContent="Suggested: ~"+ex.suggestMin+" min · time, calories & distance tracked";
    c.appendChild(tip);
    const start=el("button","btn fuel block", (+ex.progressMs>0)?("▶ RESUME cardio · "+fmtClock(ex.progressMs)):"▶ START CARDIO");
    start.addEventListener("click",()=>openLiveCARDIOTimer(ex,renderLive));
    c.appendChild(start);
  }
  return c;
}
function blankSet(prev){return {kg:prev?prev.kg:"", reps:prev?prev.reps:"", done:false};}

function openQuickGO(){
  const favCount=(DATA.favMOVEs||[]).filter(n=>{const k=favKind(n);return k.kind!=="cardio";}).length;
  openModal(`<h3>GO a workout</h3>
   ${favCount>=3?`<button class="btn gold block" id="qs_randfav" style="margin-bottom:14px">🎲 Randomise from favourites (${favCount})</button>`:""}
   <div class="eyebrow" style="margin-bottom:8px">Target a muscle group</div>
   <div class="row wrap" style="gap:8px">
     ${GROUPS.map(g=>`<button class="chip" data-g="${g}">${g}</button>`).join("")}
   </div>
   <div class="divider"></div>
   <div class="eyebrow" style="margin-bottom:8px">Preset days</div>
   <div class="row wrap" style="gap:8px">
     ${Object.keys(PRESET_DAYS).map(d=>`<button class="chip str" data-d="${d}">${d}</button>`).join("")}
   </div>
   <button class="btn block" id="qs_home" style="margin-top:16px">HOME workout builder</button>`);
  if(favCount>=3) $("#qs_randfav").addEventListener("click",()=>{closeModal();randomizeFavSESSION();});
  $("#modal").querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>{closeModal();openGroupBuilder(b.dataset.g);}));
  $("#modal").querySelectorAll("[data-d]").forEach(b=>b.addEventListener("click",()=>{closeModal();
    startSession(b.dataset.d+" DAY","preset",PRESET_DAYS[b.dataset.d].map(n=>mkMOVE(n)));}));
  $("#qs_home").addEventListener("click",()=>{closeModal();openHOMEBuilder();});
}

/* ===================== FAVOURITES ===================== */
function isFav(n){return (DATA.favMOVEs||[]).includes(n);}
function toggleFav(n){
  if(!DATA.favMOVEs)DATA.favMOVEs=[];
  const i=DATA.favMOVEs.indexOf(n);
  if(i>=0){DATA.favMOVEs.splice(i,1);toast("REMOVEd from favourites");}
  else{DATA.favMOVEs.push(n);toast("★ Favourited "+n);}
  save();
}
/* legacy aliases */
function isFavMachine(n){return isFav(n);}
function toggleFavMachine(n){toggleFav(n);}
/* classify a favourite name into its kind for the hub */
function favKind(n){
  if(MACHINE_BY_NAME[n]) return {kind:"machine", group:MACHINE_BY_NAME[n].g, env:"gym", ic:"🏋️"};
  if(FW_BY_NAME[n]) return {kind:"freeweight", group:FW_BY_NAME[n].g, env:"gym", ic:"🏋️"};
  const h=(typeof HOME!=='undefined')?HOME.find(x=>x.n===n):null;
  if(h) return {kind:"home", group:h.t, env:"home", ic:"🏠"};
  const c=(typeof CARDIO!=='undefined')?CARDIO.find(x=>x.n===n):null;
  if(c) return {kind:"cardio", group:"CARDIO", env:c.t==="home"?"home":"gym", ic:c.ic};
  return {kind:"other", group:"", env:"gym", ic:"⭐"};
}
function saveFavSESSION(moves, cardio, cardioPos, defaultName){
  openModal(`<h3>SAVE SESSION</h3>
    <p class="muted tiny" style="margin-bottom:6px">${moves.filter(e=>!e.cardio).length} exercise${moves.filter(e=>!e.cardio).length===1?"":"s"}${cardio?` + ${cardio.name}`:""} — give it a name to reuse any time.</p>
    <div class="tiny muted" style="margin-bottom:12px;line-height:1.55">${moves.filter(e=>!e.cardio).map(e=>esc(e.name)).join(" · ")}${cardio?` · <span style="color:var(--fuel)">${esc(cardio.name)}</span>`:""}</div>
    <div class="field"><label>Name</label><input class="input" id="fw_n" value="${esc(defaultName||"")}" placeholder="e.g. My push day"></div>
    <button class="btn str block" id="fw_save">SAVE favourite</button>`);
  $("#fw_save").addEventListener("click",()=>{
    const name=$("#fw_n").value.trim(); if(!name){toast("Give it a name");return;}
    if(!DATA.favSESSIONS)DATA.favSESSIONS=[];
    DATA.favSESSIONS.unshift({id:Date.now(),name,
      moves:moves.filter(e=>!e.cardio).map(e=>({name:e.name,group:e.group,home:e.home||null})),
      cardio:cardio||null, cardioPos:cardioPos||"end"});
    save(); closeModal(); toast("★ SAVED. “"+name+"”");
    refreshActive();
  });
}
function startFavSESSION(fav){
  const strength=fav.moves.map(e=>e.home?{name:e.name,group:e.group,home:e.home,sets:[prefilledSet(e.name)]}:mkMOVE(e.name));
  let ex=strength.slice();
  if(fav.cardio){ const cc=mkCARDIOCard(fav.cardio);
    if(fav.cardioPos==="start")ex=[cc,...ex]; else ex=[...ex,cc]; }
  startSession(fav.name,"favourite",ex);
}
function deleteFavSESSION(id){
  confirmModal({title:"DELETE favourite?",danger:true,confirmText:"DELETE",
    onCONFIRM:()=>{DATA.favSESSIONS=DATA.favSESSIONS.filter(f=>f.id!==id);save();renderTRAIN();toast("DELETED.");}});
}

/* ---------- 1RM ESTIMATION ---------- */
const RM_FORMULAS={
  epley:{l:"Epley",f:(w,r)=>w*(1+r/30)},
  brzycki:{l:"Brzycki",f:(w,r)=>r>=37?w:w*36/(37-r)},
  lander:{l:"Lander",f:(w,r)=>r>=20?w:(100*w)/(101.3-2.67123*r)},
  lombardi:{l:"Lombardi",f:(w,r)=>w*Math.pow(r,0.10)}
};
function rmFormula(){return (DATA.prefs&&DATA.prefs.rmFormula)||"epley";}
function est1RMkg(kg,reps){ if(!kg||!reps)return 0; if(reps<=1)return kg;
  const f=(RM_FORMULAS[rmFormula()]||RM_FORMULAS.epley).f; return f(+kg,+reps); }

/* ---------- PROGRESSIVE-OVERLOAD GHOST TEXT ---------- */
function lastSetFor(name){
  const ws=DATA.workouts.slice().sort((a,b)=>b.id-a.id);
  for(const w of ws){ const ex=(w.moves||[]).find(e=>e.name===name);
    if(ex){ const good=(ex.sets||[]).filter(s=>!s.warmup && +s.kg>0); const s=good.length?good[good.length-1]:(ex.sets||[])[ (ex.sets||[]).length-1 ];
      if(s) return s; } }
  return null;
}
/* v3.31 — per-exercise "usual" weight & reps, used to pre-fill sets */
function usualFor(name){ const u=DATA.usualSets&&DATA.usualSets[name]; return (u&&(+u.kg>0||+u.reps>0))?u:null; }
function setUsual(name,kg,reps){
  if(!DATA.usualSets)DATA.usualSets={};
  if((+kg>0)||(+reps>0)) DATA.usualSets[name]={kg:(kg===""||kg==null)?"":+kg, reps:(reps===""||reps==null)?"":+reps};
  else delete DATA.usualSets[name];
  save();
}
/* a fresh set, pre-filled from your usual, overridden by your last actual session if there is one */
function prefillValues(name){
  const u=usualFor(name); const last=lastSetFor(name);
  let kg=u?u.kg:"", reps=u?u.reps:"";
  if(last && (+last.kg>0||+last.reps>0)){ if(+last.kg>0)kg=+last.kg; if(+last.reps>0)reps=+last.reps; }
  return {kg, reps};
}
function prefilledSet(name){ const v=prefillValues(name); return {kg:v.kg, reps:v.reps, done:false}; }

/* ---------- INFO ⓘ POPOVERS ---------- */
const INFO_TEXT={
  ghost:"The faint text in the KG/REPS boxes shows what you lifted here last session. Try to beat it!",
  rir:"RIR = RIR = Reps In Reserve. 0 means failure. 2 means 2 reps left in the tank. Log your true effort.",
  SUPERSET:"Link two moves to do them back-to-back with no rest in between. The rest timer starts only after you finish both.",
  plates:"Shows exactly which plates to load on each side of a standard 20kg Olympic barbell to hit your target weight.",
  warmup:"Adds 2–3 lighter prep sets before your working weight to warm the muscle up. WARM-UPs don't count toward PRs, volume or 1RM.",
  oneRM:"Your estimated max for a single rep, worked out from your best set. Change the formula in More → PREFERENCES.",
  randfav:"Instantly builds a workout using only the moves you've starred — no scrolling.",
  planner:"Tick the days you can train and we'll build a balanced week that hits every muscle group and schedules cardio. Tap today's block to start it.",
  swap:"Machine busy? Swap for a same-muscle alternative without losing your place.",
  exrest:"Set a custom rest time for this exercise — heavy lifts may want longer than your default.",
  streak:"Hit your daily target several days in a row to build a streak. Keeps you accountable even on rest days."
};
function infoBtn(key){return `<button class="iconbtn info ihelp" data-info-key="${key}" title="What's this?">ⓘ</button>`;}
function openRMInfo(){
  const row=(name,desc)=>`<div style="margin-bottom:12px"><div style="font-weight:700;color:var(--strength);margin-bottom:2px">${name}</div><div class="muted" style="font-size:13.5px;line-height:1.55">${desc}</div></div>`;
  openModal(`<h3>Estimated 1-rep max</h3>
    <div style="max-height:64vh;overflow:auto;margin-top:6px">
    <p class="muted" style="font-size:14px;line-height:1.6;margin:0 0 14px">Your <b>1RM</b> is the heaviest weight you could lift for a single rep. Rather than asking you to actually test a true max (which is hard and risky), Evolve <b>estimates</b> it from a normal set — the weight and the reps you did. More reps means a rougher estimate, so these are guides, not gospel. You choose which maths to use:</p>
    ${row("Epley","The most common one. Simple and reliable across most rep ranges — a safe default if you're unsure.")}
    ${row("Brzycki","Tends to read slightly lower than Epley, and is often considered more accurate for low reps (around 1–10).")}
    ${row("Lander","A scientific formula that sits close to Brzycki; a good alternative for lower-rep, heavier sets.")}
    ${row("Lombardi","Uses a gentler curve, so it usually gives the highest estimate of the four — especially as reps climb higher.")}
    <p class="muted" style="font-size:13px;line-height:1.55;margin:6px 0 0">Tip: pick one and stick with it, so your numbers stay comparable over time. They all agree closely at low reps and spread apart as reps get high.</p>
    </div>
    <button class="btn block" id="rm_ok" style="margin-top:14px">GOT IT</button>`);
  $("#rm_ok").addEventListener("click",closeModal);
}
function bindInfo(scope){ (scope||document).querySelectorAll("[data-info-key]").forEach(b=>{
  if(b._ib)return; b._ib=1; b.addEventListener("click",e=>{e.stopPropagation();
    const k=b.getAttribute("data-info-key");
    if(k==="oneRM"){ openRMInfo(); return; }
    openModal(`<h3>Quick tip</h3><p style="line-height:1.6;color:var(--text)">${esc(INFO_TEXT[k]||"")}</p><button class="btn block" id="ib_ok" style="margin-top:16px">GOT IT</button>`);
    $("#ib_ok").addEventListener("click",closeModal); }); }); }

/* ---------- GLOBAL FAVOURITES HUB ---------- */
function favList(env){ return (DATA.favMOVEs||[]).map(n=>({n,...favKind(n)})).filter(x=>env?x.env===env:true); }
function openFavHub(){
  const gym=favList("gym"), home=favList("home");
  const section=(title,arr)=>`<div class="eyebrow" style="margin:14px 0 8px">${title} <span class="muted">(${arr.length})</span></div>`+
    (arr.length? `<div class="fav-grid">`+arr.map(x=>`<div class="fav-chip"><span>${x.ic} ${esc(x.n)}</span><button class="iconbtn star on" data-unfav="${esc(x.n)}">★</button></div>`).join("")+`</div>` 
      : `<p class="muted tiny" style="margin:0 0 4px">Nothing yet — tap the ☆ on any exercise, machine or cardio to add it.</p>`);
  openModal(`<h3>★ STARRED <span style="font-size:13px">${infoBtn("randfav")}</span></h3>
    <p class="muted tiny" style="margin-bottom:6px">Your starred moves. Build a workout from just these.</p>
    ${(gym.length+home.length)>=2?`<button class="btn gold block" id="fh_rand" style="margin:10px 0 4px">🎲 Build from favourites</button>`:""}
    ${section("🏋️ GYM",gym)}
    ${section("🏠 HOME",home)}`);
  bindInfo($("#modal"));
  const fhr=$("#fh_rand"); if(fhr)fhr.addEventListener("click",()=>{closeModal();randomizeFavSESSION();});
  $("#modal").querySelectorAll("[data-unfav]").forEach(b=>b.addEventListener("click",()=>{toggleFav(b.getAttribute("data-unfav"));openFavHub();}));
}
function randomizeFavSESSION(){
  const pool=favList().filter(x=>x.kind!=="cardio");
  if(pool.length<1){toast("Star a few moves first");return;}
  openModal(`<h3>🎲 Build from favourites</h3>
    <p class="muted tiny" style="margin-bottom:12px">How many moves today? We'll pull them at random from your ${pool.length} starred move${pool.length===1?"":"s"}.</p>
    <div class="seg" id="rf_n">${[4,6,8].map((n,i)=>`<button data-v="${n}" class="${i===1?"on":""}">${n}</button>`).join("")}</div>
    <label style="display:flex;align-items:center;gap:10px;margin:14px 0;font-size:14px">
      <input type="checkbox" id="rf_cardio" style="width:20px;height:20px"> Add a cardio finisher from favourites</label>
    <button class="btn str block" id="rf_go">Build it</button>`);
  let n=6; $("#rf_n").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    $("#rf_n").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");n=+b.dataset.v;}));
  $("#rf_go").addEventListener("click",()=>{
    const chosen=shuffle(pool.slice()).slice(0,Math.min(n,pool.length));
    const ex=chosen.map(x=>{ if(x.kind==="home"){const h=HOME.find(z=>z.n===x.n);return {name:x.n,group:h?h.t:"",home:h,sets:[prefilledSet(x.n)]};} return mkMOVE(x.n); });
    if($("#rf_cardio").checked){ const cfav=favList().filter(x=>x.kind==="cardio"); const cardios=cfav.length?cfav:CARDIO.map(c=>({n:c.n}));
      const pick=CARDIO.find(c=>c.n===shuffle(cardios.slice())[0].n); if(pick)ex.push(mkCARDIOCard(pick)); }
    if(!ex.length){toast("Nothing to build");return;}
    closeModal(); startSession("STARRED mix","fav",ex);
  });
}

/* ===================== ROUTINES — multi-day programs (v3.31) ===================== */
function openRoutinesHub(){
  /* one-time walkthrough the first time PROGRAMS is opened */
  if(!DATA.meta) DATA.meta={};
  if(!DATA.meta.routinesIntroSeen){
    openModal(`<h3>PROGRAMS — how they work</h3>
      <div class="rt-intro">
        <div class="rt-intro-step"><span class="rt-intro-n">1</span><div><b>A program is a multi-day plan</b><div class="muted tiny">e.g. PUSH / PULL / LEGS. Each day holds its own moves.</div></div></div>
        <div class="rt-intro-step"><span class="rt-intro-n">2</span><div><b>Build it once</b><div class="muted tiny">GO from a ready-made template (then tweak it) or build your own. Add moves to each day.</div></div></div>
        <div class="rt-intro-step"><span class="rt-intro-n">3</span><div><b>GO any day with a tap</b><div class="muted tiny">On gym day, open your program and tap “▶ GO” on the day you're doing. It launches that session ready to log.</div></div></div>
      </div>
      <p class="muted tiny" style="line-height:1.5;margin:4px 0 14px">Think of it as saved <b>multi-day</b> plans — STARRED save a single workout; PROGRAMS save a whole week.</p>
      <button class="btn str block" id="rt_intro_go">GOT IT — show PROGRAMS</button>`);
    $("#rt_intro_go").addEventListener("click",()=>{ DATA.meta.routinesIntroSeen=true; save(); openRoutinesHub(); });
    return;
  }
  const routines=DATA.routines||[];
  const list = routines.length
    ? routines.map(r=>{
        const dayCount=(r.days||[]).length;
        return `<div class="rt-card" data-open="${r.id}">
          <div class="rt-main"><div class="rt-name">${esc(r.name)}</div>
            <div class="rt-sub">${dayCount} day${dayCount===1?"":"s"}${r.note?` · ${esc(r.note)}`:""}</div></div>
          <button class="iconbtn" data-del="${r.id}" title="DELETE">✕</button></div>`;
      }).join("")
    : `<p class="muted tiny" style="margin:4px 0 12px;line-height:1.55">NO PROGRAMS YET.. A routine is a multi-day plan (e.g. PUSH / PULL / LEGS) — build one, then start any day with a tap.</p>`;
  openModal(`<h3>📋 Routines</h3>
    <p class="muted tiny" style="margin-bottom:12px">SAVED. multi-day programs. Tap one to view its days and start a session.</p>
    ${list}
    <button class="btn str block" id="rt_new" style="margin-top:12px">＋ New routine</button>`);
  $("#rt_new").addEventListener("click",()=>openRoutineEDITor(null));
  $("#modal").querySelectorAll("[data-open]").forEach(c=>c.addEventListener("click",e=>{
    if(e.target.closest("[data-del]"))return;
    const r=(DATA.routines||[]).find(x=>x.id==c.dataset.open); if(r)openRoutineView(r);
  }));
  $("#modal").querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{
    confirmModal({title:"DELETE routine?",danger:true,confirmText:"DELETE",body:"This removes the whole program. It can't be undone.",
      onCONFIRM:()=>{DATA.routines=(DATA.routines||[]).filter(x=>x.id!=b.dataset.del);save();openRoutinesHub();toast("Routine deleted");}});
  }));
}
function openRoutineView(r){
  const days=(r.days||[]);
  const dayHTML=days.length?days.map((d,i)=>`<div class="rt-day">
      <div class="rt-day-head"><div class="rt-day-name">${esc(d.label||("DAY "+(i+1)))}</div>
        <div class="tiny muted">${(d.moves||[]).length} exercise${(d.moves||[]).length===1?"":"s"}</div></div>
      <div class="tiny muted" style="line-height:1.5;margin:2px 0 8px">${(d.moves||[]).map(e=>esc(e.name)).join(" · ")||"No moves"}</div>
      ${(d.moves||[]).length?`<button class="btn fuel block sm" data-start="${i}">▶ GO ${esc(d.label||("DAY "+(i+1)))}</button>`:""}
    </div>`).join(""):`<p class="muted tiny">This routine has no days yet — tap EDIT to add some.</p>`;
  openModal(`<h3>${esc(r.name)}</h3>
    ${r.note?`<p class="muted tiny" style="margin-bottom:12px">${esc(r.note)}</p>`:""}
    ${dayHTML}
    <button class="btn block" id="rt_edit" style="margin-top:12px">✏️ EDIT routine</button>
    <button class="btn ghost block" id="rt_back" style="margin-top:10px">‹ All routines</button>`);
  $("#rt_edit").addEventListener("click",()=>openRoutineEDITor(r));
  $("#rt_back").addEventListener("click",openRoutinesHub);
  $("#modal").querySelectorAll("[data-start]").forEach(b=>b.addEventListener("click",()=>{
    closeModal(); startRoutineDAY(r,+b.dataset.start);
  }));
}
function startRoutineDAY(r,i){
  const d=(r.days||[])[i]; if(!d||!(d.moves||[]).length){toast("That day has no moves");return;}
  const ex=d.moves.map(e=>{ const m=EX_BY_NAME[e.name]; return m?mkMOVE(e.name):{name:e.name,group:e.group||"",sets:[prefilledSet(e.name)]}; });
  startSession(r.name+" · "+(d.label||("DAY "+(i+1))),"routine",ex);
}
/* working draft while editing a routine */
let routineDraft=null;

/* v3.31 — starter templates (real machine names; map cleanly via EX_BY_NAME) */
const ROUTINE_TEMPLATES=[
  {key:"ppl", name:"PUSH / PULL / LEGS", note:"CLASSIC 3-day split", days:[
    {label:"Push", moves:["Chest Press Machine","Incline Chest Press Machine","Shoulder Press Machine","Lateral Raise Machine","Tricep Pushdown (Bar)"]},
    {label:"Pull", moves:["Lat Pulldown","Seated Cable Row","Reverse Pec Deck (Rear Delt)","Cable Bicep Curl (Bar)","Cable Rope Hammer Curl"]},
    {label:"Legs", moves:["Leg Press","Hack Squat Machine","Leg Extension","Lying Leg Curl","Standing Calf Raise Machine"]}
  ]},
  {key:"ul", name:"UPPER / LOWER", note:"4-day, alternate U/L", days:[
    {label:"Upper", moves:["Chest Press Machine","Lat Pulldown","Shoulder Press Machine","Seated Cable Row","Cable Bicep Curl (Bar)","Tricep Pushdown (Bar)"]},
    {label:"Lower", moves:["Leg Press","Leg Extension","Lying Leg Curl","Standing Calf Raise Machine","Cable Crunch"]}
  ]},
  {key:"fb", name:"FULL BODY × 3", note:"3 full-body days a week", days:[
    {label:"DAY A", moves:["Chest Press Machine","Lat Pulldown","Leg Press","Lateral Raise Machine","Cable Crunch"]},
    {label:"DAY B", moves:["Incline Chest Press Machine","Seated Cable Row","Hack Squat Machine","Cable Bicep Curl (Bar)","Tricep Pushdown (Bar)"]},
    {label:"DAY C", moves:["Pec Deck (Butterfly)","Assisted Pull-Up Machine","Leg Extension","Lying Leg Curl","Shoulder Press Machine"]}
  ]}
];
function newRoutineFromTemplate(tpl){
  return {id:Date.now(), name:tpl.name, note:tpl.note,
    days:tpl.days.map(d=>({label:d.label, moves:d.moves.map(n=>({name:n, group:(EX_BY_NAME[n]||{}).g||""}))}))};
}
function openRoutineEDITor(existing){
  if(existing){
    routineDraft = JSON.parse(JSON.stringify(existing));
    paintRoutineEDITor(); return;
  }
  /* new routine → offer a starter template or blank */
  openModal(`<h3>New routine</h3>
    <p class="muted tiny" style="margin-bottom:14px;line-height:1.5">GO from a ready-made program (you can tweak everything after), or build your own from scratch.</p>
    <div class="v04-choice-grid" id="rt_tpl">
      ${ROUTINE_TEMPLATES.map(t=>`<button class="rt-tpl-choice" data-tpl="${t.key}">
        <b>${esc(t.name)}</b><span>${esc(t.note)} · ${t.days.length} days · ${t.days.reduce((s,d)=>s+d.moves.length,0)} moves</span></button>`).join("")}
      <button class="rt-tpl-choice blank" data-tpl="__blank"><b>GO blank</b><span>Build your own day by day</span></button>
    </div>`);
  $("#rt_tpl").querySelectorAll("[data-tpl]").forEach(btn=>btn.addEventListener("click",()=>{
    const k=btn.dataset.tpl;
    if(k==="__blank"){ routineDraft={id:Date.now(), name:"", note:"", days:[{label:"DAY 1", moves:[]}]}; }
    else { const tpl=ROUTINE_TEMPLATES.find(t=>t.key===k); routineDraft=newRoutineFromTemplate(tpl); }
    paintRoutineEDITor();
  }));
}
function paintRoutineEDITor(){
  const r=routineDraft;
  const daysHTML=(r.days||[]).map((d,i)=>{
    const exs=d.moves||[];
    const exHTML = exs.length
      ? `<div class="rt-ex-chips">${exs.map((e,j)=>`<span class="rt-ex-chip">${esc(e.name)}<button class="rt-ex-x" data-exrm="${i}:${j}" title="REMOVE">✕</button></span>`).join("")}</div>`
      : `<div class="rt-ex-empty">No moves yet — tap “＋ Add moves” below.</div>`;
    return `<div class="rt-edit-day">
      <div class="row" style="gap:8px;align-items:center;margin-bottom:8px">
        <input class="input" data-dayname="${i}" value="${esc(d.label||"")}" placeholder="DAY ${i+1} name (e.g. Push)" style="flex:1">
        <button class="iconbtn" data-dayrm="${i}" title="REMOVE day">✕</button>
      </div>
      <div class="rt-ex-head">${exs.length} exercise${exs.length===1?"":"s"}</div>
      ${exHTML}
      <button class="btn sm fuel block" data-dayex="${i}" style="margin-top:8px">＋ Add moves</button>
    </div>`;
  }).join("");
  openModal(`<h3>${(DATA.routines||[]).some(x=>x.id===r.id)?"EDIT routine":"New routine"}</h3>
    <div class="field"><label>Program name</label><input class="input" id="rt_name" value="${esc(r.name||"")}" placeholder="e.g. PUSH / PULL / LEGS"></div>
    <div class="field"><label>Note (optional)</label><input class="input" id="rt_note" value="${esc(r.note||"")}" placeholder="e.g. 6 weeks, then deload"></div>
    <div class="eyebrow" style="margin:6px 0 8px">TRAINing days</div>
    <div id="rt_days">${daysHTML||'<p class="muted tiny" style="margin:0 0 8px">No days yet — add your first below.</p>'}</div>
    <button class="btn block" id="rt_addday" style="margin-top:4px">＋ Add a day</button>
    <button class="btn str block" id="rt_save" style="margin-top:14px">SAVE routine</button>`);
  const syncFields=()=>{ routineDraft.name=$("#rt_name").value; routineDraft.note=$("#rt_note").value;
    (routineDraft.days||[]).forEach((d,i)=>{ const inp=$("#modal").querySelector(`[data-dayname="${i}"]`); if(inp)d.label=inp.value; }); };
  $("#rt_addday").addEventListener("click",()=>{ syncFields(); routineDraft.days.push({label:"",moves:[]}); paintRoutineEDITor(); });
  $("#modal").querySelectorAll("[data-dayrm]").forEach(b=>b.addEventListener("click",()=>{ syncFields(); routineDraft.days.splice(+b.dataset.dayrm,1); paintRoutineEDITor(); }));
  $("#modal").querySelectorAll("[data-dayex]").forEach(b=>b.addEventListener("click",()=>{ syncFields(); openRoutineDAYMOVEs(+b.dataset.dayex); }));
  $("#modal").querySelectorAll("[data-exrm]").forEach(b=>b.addEventListener("click",()=>{
    syncFields(); const [di,ei]=b.dataset.exrm.split(":").map(Number);
    if(routineDraft.days[di]&&routineDraft.days[di].moves){ routineDraft.days[di].moves.splice(ei,1); paintRoutineEDITor(); }
  }));
  $("#rt_save").addEventListener("click",()=>{
    syncFields();
    if(!routineDraft.name.trim()){toast("Give your routine a name");return;}
    if(!routineDraft.days.length){toast("Add at least one day");return;}
    if(!routineDraft.days.some(d=>(d.moves||[]).length)){toast("Add at least one exercise to a day");return;}
    routineDraft.days.forEach((d,i)=>{ if(!d.label||!d.label.trim()) d.label="DAY "+(i+1); });
    if(!DATA.routines)DATA.routines=[];
    const ix=DATA.routines.findIndex(x=>x.id===routineDraft.id);
    const clean={id:routineDraft.id,name:routineDraft.name.trim(),note:(routineDraft.note||"").trim(),days:routineDraft.days};
    if(ix>=0)DATA.routines[ix]=clean; else DATA.routines.unshift(clean);
    save(); routineDraft=null; closeModal(); openRoutinesHub(); toast("Routine saved");
  });
}
/* pick moves for a routine day — reuses the muscle-group pools */
function openRoutineDAYMOVEs(dayIdx){
  const day=routineDraft.days[dayIdx]; if(!day)return;
  if(!day.moves)day.moves=[];
  const allNames=(typeof gymPoolNames==="function")?gymPoolNames():Object.keys(EX_BY_NAME||{});
  function paint(){
    const chosen=day.moves.map(e=>e.name);
    openModal(`<h3>${esc(day.label||("DAY "+(dayIdx+1)))} — moves</h3>
      <p class="muted tiny" style="margin-bottom:10px">${chosen.length} selected. Search and tap to add or remove.</p>
      <input class="input" id="rde_q" placeholder="Search moves…" style="margin-bottom:10px" autocomplete="off">
      <div id="rde_sel" class="row wrap" style="gap:6px;margin-bottom:10px">${chosen.map(n=>`<button class="chip sm on" data-rm="${esc(n)}">${esc(n)} ✕</button>`).join("")}</div>
      <div class="search-list" id="rde_list"></div>
      <button class="btn str block" id="rde_done" style="margin-top:12px">DONE.</button>`);
    function paintList(){
      const q=$("#rde_q").value.trim().toLowerCase();
      const pool=(allNames.length?allNames:Object.keys(EX_BY_NAME||{}));
      const list=(q?pool.filter(n=>n.toLowerCase().includes(q)):pool).slice(0,120);
      $("#rde_list").innerHTML=list.map(n=>{ const on=day.moves.some(e=>e.name===n);
        return `<div class="food-opt"><div style="flex:1;min-width:0"><div class="fn">${esc(n)}</div><div class="fm tiny muted">${esc((EX_BY_NAME[n]||{}).g||"")}</div></div>
          <button class="btn sm ${on?"":"fuel"}" data-tog="${esc(n)}">${on?"REMOVE":"＋"}</button></div>`;}).join("")||`<div class="empty">No matches.</div>`;
      $("#rde_list").querySelectorAll("[data-tog]").forEach(btn=>btn.addEventListener("click",()=>{
        const n=btn.getAttribute("data-tog"); const i=day.moves.findIndex(e=>e.name===n);
        if(i>=0)day.moves.splice(i,1); else day.moves.push({name:n,group:(EX_BY_NAME[n]||{}).g||""});
        paint();
      }));
    }
    $("#rde_q").addEventListener("input",paintList);
    $("#rde_sel").querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{
      const n=b.getAttribute("data-rm"); const i=day.moves.findIndex(e=>e.name===n); if(i>=0)day.moves.splice(i,1); paint();
    }));
    $("#rde_done").addEventListener("click",()=>paintRoutineEDITor());
    paintList();
  }
  paint();
}

/* ===================== AI COACH (OpenRouter, user's own key) — v3.31 =====================
   Privacy: the API key can be kept for this session only or remembered on this device,
   is never written to any backup (encrypted or CSV) and is never sent anywhere except
   OpenRouter. A summary of the user's training/nutrition is sent to OpenRouter ONLY when
   the user actively asks the COACH something, and only after they've given consent. */
const COACH_MODELS=[
  {id:"openrouter/free", name:"Free router — auto-picks a free model (recommended)"},
  {id:"deepseek/deepseek-chat-v3-0324:free", name:"DeepSeek V3 (free)"},
  {id:"deepseek/deepseek-r1:free", name:"DeepSeek R1 (free)"},
  {id:"meta-llama/llama-3.3-70b-instruct:free", name:"Llama 3.3 70B (free)"},
  {id:"google/gemma-3-27b-it:free", name:"Gemma 3 27B (free)"},
  {id:"openrouter/auto", name:"Auto — best model (uses a little credit)"},
  {id:"openai/gpt-4o-mini", name:"GPT-4o mini (paid)"},
  {id:"anthropic/claude-3.5-haiku", name:"Claude 3.5 Haiku (paid)"}
];
/* the live list changes often; this lets the user pull current free models */
let coachLiveModels=null;
async function fetchCOACHModels(){
  try{
    const res=await fetch("https://openrouter.ai/api/v1/models",{cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer"});
    if(!res.ok) throw new Error("models fetch failed");
    const data=await res.json();
    const free=(data.data||[]).filter(m=>{
      const pr=m.pricing||{}; return (+pr.prompt===0 && +pr.completion===0);
    }).map(m=>{ let nm=m.name||m.id; if(!/\(free\)\s*$/i.test(nm)) nm+=" (free)"; return {id:m.id, name:nm}; });
    /* drop entries we add ourselves so they don't appear twice */
    const STAPLES=["openrouter/free","openrouter/auto","openai/gpt-4o-mini","anthropic/claude-3.5-haiku"];
    const freeClean=free.filter(m=>STAPLES.indexOf(m.id)<0);
    /* free router first, then the live free list, then auto + paid staples */
    coachLiveModels=[
      {id:"openrouter/free", name:"Free router — auto-picks a free model (recommended)"},
      ...freeClean.sort((a,b)=>a.name.localeCompare(b.name)),
      {id:"openrouter/auto", name:"Auto — best model (uses a little credit)"},
      {id:"openai/gpt-4o-mini", name:"GPT-4o mini (paid)"},
      {id:"anthropic/claude-3.5-haiku", name:"Claude 3.5 Haiku (paid)"}
    ];
    return coachLiveModels;
  }catch(e){ return null; }
}
function coachModelList(){ return coachLiveModels||COACH_MODELS; }
function getCOACHKeyMode(){
  try{
    const mode=localStorage.getItem(COACH_KEY_MODE_KEY);
    if(mode==="device" || mode==="session") return mode;
    if(localStorage.getItem(COACH_KEY_KEY)) return "device";
  }catch(e){}
  return "session";
}
function setCOACHKeyMode(mode){
  try{ localStorage.setItem(COACH_KEY_MODE_KEY, mode==="device"?"device":"session"); return true; }catch(e){ return false; }
}
function getCOACHKey(){
  try{
    if(getCOACHKeyMode()==="device") return localStorage.getItem(COACH_KEY_KEY)||"";
    return sessionStorage.getItem(COACH_KEY_SESSION_KEY)||"";
  }catch(e){
    try{return localStorage.getItem(COACH_KEY_KEY)||"";}catch(_){return "";}
  }
}
function setCOACHKey(k, mode){
  try{
    const m=(mode||getCOACHKeyMode())==="device"?"device":"session";
    if(m==="device"){
      if(k)localStorage.setItem(COACH_KEY_KEY,k); else localStorage.removeItem(COACH_KEY_KEY);
      try{sessionStorage.removeItem(COACH_KEY_SESSION_KEY);}catch(e){}
    }else{
      if(k)sessionStorage.setItem(COACH_KEY_SESSION_KEY,k); else sessionStorage.removeItem(COACH_KEY_SESSION_KEY);
      try{localStorage.removeItem(COACH_KEY_KEY);}catch(e){}
    }
    setCOACHKeyMode(m);
    return true;
  }catch(e){return false;}
}
function clearCOACHKeyEverywhere(){
  try{localStorage.removeItem(COACH_KEY_KEY);}catch(e){}
  try{sessionStorage.removeItem(COACH_KEY_SESSION_KEY);}catch(e){}
}
function coachREADY(){ return DATA.prefs.coachConsent===true && !!getCOACHKey(); }

/* build a compact, on-device summary of the user's training to give the model context */
function coachContext(){
  const p=DATA.profile||{}, t=DATA.targets||{};
  const lines=[];
  lines.push(`PROFILE: ${p.sex||"?"}, age ${p.age||"?"}, ${p.heightCm||"?"}cm, ${p.weightKg||"?"}kg. GOAL: ${p.goal||"maintain"}. Activity: ${p.activity||"mod"}.`);
  if(t.calories) lines.push(`DAILY targets: ${t.calories} kcal, ${t.protein||"?"}g protein, ${t.carbs||"?"}g carbs, ${t.fat||"?"}g fat.`);
  lines.push(`TRAINing environment: ${DATA.prefs.env==="home"?"home":"gym"} (${DATA.prefs.gymEquip==="all"?"free weights + machines":"machines + cardio"}).`);
  const ws=(DATA.workouts||[]).slice(-6).reverse();
  if(ws.length){
    lines.push("Recent workouts (most recent first):");
    ws.forEach(w=>{
      const exs=(w.moves||[]).filter(e=>!e.activity).map(e=>{
        const top=(e.sets||[]).filter(s=>s.done&&s.kg).sort((a,b)=>b.kg-a.kg)[0];
        return top?`${e.name} ${liftStr(top.kg)}×${top.reps}`:e.name;
      });
      lines.push(`- ${w.date} ${w.title||"SESSION"}: ${exs.join(", ")||"(no sets)"}`);
    });
  } else lines.push("No workouts logged yet.");
  const routines=(DATA.routines||[]);
  if(routines.length) lines.push(`SAVED. programs: ${routines.map(r=>r.name+" ("+(r.days||[]).length+" days)").join("; ")}.`);
  return lines.join("\n");
}

async function coachAsk(messages){
  const key=getCOACHKey(); if(!key) throw new Error("No API key set");
  const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    cache:"no-store",
    credentials:"omit",
    referrerPolicy:"no-referrer",
    headers:{ "Authorization":"Bearer "+key, "Content-Type":"application/json",
      "HTTP-Referer":"https://wigglez-sudo.github.io/", "X-Title":"Evolve" },
    body:JSON.stringify({ model:DATA.prefs.coachModel||"deepseek/deepseek-chat-v3-0324:free", messages })
  });
  if(!res.ok){
    let msg="Request failed ("+res.status+")";
    try{ const e=await res.json(); if(e.error&&e.error.message)msg=e.error.message; }catch(_){}
    if(res.status===401) msg="Invalid API key — check it in COACH settings.";
    if(res.status===402) msg="This model needs credit on your OpenRouter account. Pick a free model or “Auto”.";
    if(res.status===429) msg="Rate limited (free models are busy). Wait a moment, or switch model in COACH settings.";
    if(res.status===404 || /no endpoints|unavailable|not.*found/i.test(msg))
      msg="That model isn't available right now. Open COACH settings → “↻ Load current free models” and pick another (or use “Auto”).";
    throw new Error(msg);
  }
  const data=await res.json();
  return (data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content)||"(no response)";
}

const COACH_SYSTEM="You are a concise, practical strength & nutrition coach inside a private fitness app called Evolve. Give specific, actionable advice using the user's data when relevant. Keep responses focused and not too long. You are not a medical professional; suggest seeing a doctor for pain, injury or medical concerns.";

/* ---- consent gate: shown before the COACH can be used ---- */
function openCOACHConsent(onAgree){
  openModal(`<h3>Before you use AI COACH</h3>
    <div class="coach-privacy">
      <p><b>This is the one part of Evolve that sends data off your device.</b></p>
      <p>When you ask the COACH something, Evolve sends your <b>question</b> and a <b>summary of your training</b> (profile, goals, recent workouts, programs) to <b>OpenRouter</b>, the AI provider, to generate a reply.</p>
      <ul class="coach-priv-list">
        <li>Your <b>API key is stored only on this device</b> — never in any backup (encrypted or CSV), and never sent anywhere except OpenRouter.</li>
        <li>Evolve has <b>no server</b> — requests go straight from your phone to OpenRouter. We never see your data or your key.</li>
        <li>OpenRouter and the model provider you choose process what you send under <b>their</b> privacy policies — review them at openrouter.ai.</li>
        <li>Don't include anything you wouldn't want a third-party AI service to process.</li>
        <li>The COACH can be wrong. It is not medical advice.</li>
      </ul>
      <p class="tiny muted">You can revoke consent and delete your key any time in COACH settings.</p>
    </div>
    <button class="btn str block" id="coach_agree">I understand — enable AI COACH</button>
    <button class="btn ghost block" id="coach_decline" style="margin-top:10px">Not now</button>`);
  $("#coach_agree").addEventListener("click",()=>{ DATA.prefs.coachConsent=true; save(); closeModal(); if(onAgree)onAgree(); });
  $("#coach_decline").addEventListener("click",()=>closeModal());
}
function openCOACHKeySetup(onDONE.){
  function modelOptions(){
    const list=coachModelList().slice();
    if(!list.some(m=>m.id===DATA.prefs.coachModel)) list.unshift({id:DATA.prefs.coachModel,name:DATA.prefs.coachModel});
    return list.map(m=>`<option value="${esc(m.id)}" ${DATA.prefs.coachModel===m.id?"selected":""}>${esc(m.name)}</option>`).join("");
  }
  function modeNote(mode){
    return mode==="device"
      ? "Convenient, but less strict: the key stays in browser storage on this device until you delete it."
      : "Safer: the key lives only for this browser session and is cleared when the session ends.";
  }
  function paint(){
    const mode=getCOACHKeyMode();
    openModal(`<h3>Connect OpenRouter</h3>
      <p class="muted tiny" style="line-height:1.5;margin-bottom:12px">The COACH uses <b>OpenRouter</b>, which gives access to many AI models with one key — including free ones. Create a free key at <b>openrouter.ai/keys</b>, then paste it below.</p>
      <div class="notice-card notice-amber" style="margin-bottom:12px"><div class="notice-title">🔐 Test-build privacy hardening</div><div class="notice-body">Choose whether your key is kept <b>for this session only</b> or remembered <b>on this device</b>. Session-only is the safer option.</div></div>
      <div class="field"><label>OpenRouter API key</label><input class="input" id="coach_key" type="password" placeholder="sk-or-..." value="${esc(getCOACHKey())}" autocomplete="off"></div>
      <div class="field"><label>Key storage</label>
        <div class="seg scroll" id="coach_key_mode">
          <button data-v="session" class="${mode==="session"?"on":""}">This session only</button>
          <button data-v="device" class="${mode==="device"?"on":""}">Remember on this device</button>
        </div>
        <div class="tiny muted" id="coach_key_mode_note" style="margin-top:8px;line-height:1.5">${modeNote(mode)}</div>
      </div>
      <div class="field"><label>Model</label><select class="input" id="coach_model">${modelOptions()}</select>
        <div class="tiny muted" style="margin-top:6px">Free models change often. <button class="linklike" id="coach_refresh" style="font-size:12px">↻ Load current free models</button></div>
        <div class="tiny muted" style="margin-top:4px">Tip: “Auto” always works but uses a little credit. If a free model says it's unavailable, refresh and pick another.</div></div>
      <button class="btn str block" id="coach_savekey">SAVE</button>
      ${getCOACHKey()?`<button class="btn ghost block" id="coach_delkey" style="margin-top:10px">DELETE key</button>`:""}`);
    $("#coach_key_mode").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      $("#coach_key_mode").querySelectorAll("button").forEach(b=>b.classList.toggle("on", b===btn));
      $("#coach_key_mode_note").textContent=modeNote(btn.dataset.v);
    }));
    $("#coach_refresh").addEventListener("click",async ()=>{
      const r=$("#coach_refresh"); r.textContent="Loading…";
      DATA.prefs.coachModel=$("#coach_model").value;
      const got=await fetchCOACHModels();
      if(got){ paint(); toast("Loaded "+(got.length)+" models"); } else { r.textContent="Couldn't load — try again"; }
    });
    $("#coach_savekey").addEventListener("click",()=>{
      const k=$("#coach_key").value.trim();
      const modeBtn=$("#coach_key_mode .on");
      const mode=modeBtn?modeBtn.dataset.v:"session";
      DATA.prefs.coachModel=$("#coach_model").value; save();
      if(!setCOACHKey(k, mode)){toast("Couldn't save key");return;}
      closeModal();
      toast(k?(mode==="device"?"COACH key saved on this device":"COACH key saved for this session"):"Key cleared");
      if(onDONE.)onDONE.();
    });
    const del=$("#coach_delkey"); if(del)del.addEventListener("click",()=>{ clearCOACHKeyEverywhere(); closeModal(); toast("Key deleted"); if(onDONE.)onDONE.(); });
  }
  paint();
}

/* ---- the COACH tab ---- */
let coachCHAT=[]; /* {role, content} visible conversation (excludes system) */
function renderCOACH(){
  const b=$("#coachBody"); if(!b)return; b.innerHTML="";
  const back=el("button","tiny muted","← BACK to More"); back.style.cssText="margin-bottom:8px;cursor:pointer;font-weight:600";
  back.addEventListener("click",()=>switchTab("more")); b.appendChild(back);
  b.appendChild(helpBar("coach"));

  if(!DATA.prefs.coachConsent){
    const intro=el("div","v04-card");
    intro.innerHTML=`<div class="disp" style="font-size:22px;margin-bottom:6px">🤖 AI COACH</div>
      <p class="muted" style="line-height:1.5;font-size:14px">Ask an AI coach about your training and nutrition, generate workouts, or get your recent logs analysed — using your own free OpenRouter key.</p>
      <p class="tiny muted" style="line-height:1.5;margin-top:10px">This is the only feature that sends data off your device. You'll see exactly what's shared before enabling it.</p>`;
    const go=el("button","btn str block","Learn more & enable"); go.style.marginTop="12px";
    go.addEventListener("click",()=>openCOACHConsent(renderCOACH));
    b.append(intro,go); return;
  }
  if(!getCOACHKey()){
    const card=el("div","v04-card");
    card.innerHTML=`<div class="disp" style="font-size:20px;margin-bottom:6px">Connect OpenRouter</div>
      <p class="muted" style="font-size:14px;line-height:1.5">Add your free OpenRouter API key to start. It stays on this device.</p>`;
    const go=el("button","btn str block","Add API key"); go.style.marginTop="12px";
    go.addEventListener("click",()=>openCOACHKeySetup(renderCOACH));
    b.append(card,go); return;
  }

  /* action buttons */
  const acts=el("div","coach-acts");
  const aGen=el("button","btn fuel","🏋️ BUILD A SESSION");
  const aAnalyse=el("button","btn","📊 Analyse my recent logs");
  aGen.addEventListener("click",()=>coachAction("generate"));
  aAnalyse.addEventListener("click",()=>coachAction("analyse"));
  acts.append(aGen,aAnalyse); b.appendChild(acts);

  /* conversation */
  const log=el("div","coach-log"); log.id="coachLog";
  if(!coachCHAT.length){
    log.innerHTML=`<div class="coach-empty muted">Ask anything about your training or nutrition — e.g. "how do I bring up my shoulders?" or "is my protein high enough?"</div>`;
  } else {
    log.innerHTML=coachCHAT.map((m,idx)=>{
      if(m.role==="assistant" && typeof m.content==="string" && m.content.indexOf("__GENRETRY__")===0){
        let o={}; try{ o=JSON.parse(m.content.slice(12)); }catch(e){}
        return `<div class="coach-msg assistant"><div class="coach-bubble cw-retry">
          <div class="cw-retry-t">Hmm, the model didn't return a usable workout.</div>
          <div class="cw-retry-s">This happens sometimes with free models — they can reply with extra text or get busy. It's not an app issue. Just try again, or switch model in COACH settings.</div>
          <button class="btn str sm" data-gen-retry='${esc(JSON.stringify(o))}'>↻ RETRY</button>
        </div></div></div>`;
      }
      if(m.role==="assistant" && typeof m.content==="string" && m.content.indexOf("__WORKOUT__")===0){
        let wk=null; try{ wk=JSON.parse(m.content.slice(11)); }catch(e){}
        if(wk && wk.moves){
          const rows=wk.moves.map(e=>`<div class="cw-ex"><span class="cw-exn">${esc(e.name)}</span><span class="cw-exs">${e.sets}×${esc(e.reps||"—")}</span></div>`).join("");
          return `<div class="coach-msg assistant"><div class="coach-bubble cw-card">
            <div class="cw-title">🏋️ ${esc(wk.title||"COACH workout")}</div>
            <div class="cw-list">${rows}</div>
            <div class="cw-acts">
              <button class="btn str sm" data-cw-start="${idx}">▶ START NOW</button>
              <button class="btn sm" data-cw-save="${idx}">★ SAVE FOR LATER</button>
            </div></div></div>`;
        }
      }
      return `<div class="coach-msg ${m.role}"><div class="coach-bubble">${m.role==="assistant"?coachFormat(m.content):esc(m.content)}</div></div>`;
    }).join("");
  }
  b.appendChild(log);
  /* wire any generated-workout cards */
  log.querySelectorAll("[data-gen-retry]").forEach(btn=>btn.addEventListener("click",()=>{
    let o={}; try{ o=JSON.parse(btn.dataset.genRetry); }catch(e){}
    /* drop the failed message before retrying so the log stays tidy */
    if(coachCHAT.length && typeof coachCHAT[coachCHAT.length-1].content==="string" && coachCHAT[coachCHAT.length-1].content.indexOf("__GENRETRY__")===0){ coachCHAT.pop(); }
    coachGenerateSESSION(o);
  }));
  log.querySelectorAll("[data-cw-start]").forEach(btn=>btn.addEventListener("click",()=>{
    const m=coachCHAT[+btn.dataset.cwGO]; if(!m)return; let wk=null; try{wk=JSON.parse(m.content.slice(11));}catch(e){}
    if(wk) coachGOSESSION(wk);
  }));
  log.querySelectorAll("[data-cw-save]").forEach(btn=>btn.addEventListener("click",()=>{
    const m=coachCHAT[+btn.dataset.cwSAVE]; if(!m)return; let wk=null; try{wk=JSON.parse(m.content.slice(11));}catch(e){}
    if(wk) coachSAVESESSION(wk);
  }));
  const inRow=el("div","coach-input");
  inRow.innerHTML=`<input class="input" id="coach_q" placeholder="Ask your coach…" autocomplete="off"><button class="btn str" id="coach_send">SEND</button>`;
  b.appendChild(inRow);

  /* footer: privacy + settings */
  const foot=el("div","coach-foot");
  foot.innerHTML=`<span class="tiny muted">🔒 SENDs your data to OpenRouter when you ask. Key stays on device.</span>`;
  const set=el("button","linklike tiny","COACH settings"); set.addEventListener("click",()=>openCOACHKeySetup(renderCOACH));
  foot.appendChild(set); b.appendChild(foot);

  const send=()=>{ const q=$("#coach_q").value.trim(); if(!q)return; $("#coach_q").value=""; coachSEND(q); };
  $("#coach_send").addEventListener("click",send);
  $("#coach_q").addEventListener("keydown",e=>{ if(e.key==="Enter")send(); });
  const lg=$("#coachLog"); if(lg){ const toBottom=()=>{ lg.scrollTop=lg.scrollHEIGHT; }; requestAnimationFrame(toBottom); setTimeout(toBottom,60); }
}
function coachFormat(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>"); }
function coachBusy(on){ const s=$("#coach_send"); if(s){s.disabled=on;s.textContent=on?"…":"SEND";} }

async function coachSEND(q){
  coachCHAT.push({role:"user",content:q});
  coachCHAT.push({role:"assistant",content:"…thinking"});
  renderCOACH(); coachBusy(true);
  try{
    const msgs=[{role:"system",content:COACH_SYSTEM+"\n\nUser's training data:\n"+coachContext()},
      ...coachCHAT.filter(m=>m.content!=="…thinking")];
    const reply=await coachAsk(msgs);
    coachCHAT[coachCHAT.length-1]={role:"assistant",content:reply};
  }catch(e){
    coachCHAT[coachCHAT.length-1]={role:"assistant",content:"⚠️ "+(e.message||"Something went wrong.")};
  }
  coachBusy(false); renderCOACH();
}
async function coachAction(kind){
  if(kind==="generate"){ return openCOACHGenSheet(); }
  const prompt = "Analyse my recent workouts and nutrition context. Point out 2-3 specific things going well and 2-3 things to improve, with concrete next steps.";
  coachSEND(prompt);
}

/* ---- structured workout generation: AI returns JSON the app can turn into a real workout ---- */
function coachMOVEPool(){
  /* the names the AI is allowed to choose from, matched to what's in the app */
  try{ return (typeof gymPoolNames==="function")?gymPoolNames():Object.keys(EX_BY_NAME||{}); }
  catch(e){ return Object.keys(EX_BY_NAME||{}); }
}
function coachMatchMOVE(name){
  if(!name) return null;
  const pool=Object.keys(EX_BY_NAME||{});
  const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const target=norm(name);
  /* exact, then case-insensitive, then contains, then token-overlap */
  if(EX_BY_NAME[name]) return name;
  let hit=pool.find(n=>norm(n)===target); if(hit) return hit;
  hit=pool.find(n=>norm(n).includes(target)||target.includes(norm(n))); if(hit) return hit;
  const tw=target.split(" ").filter(Boolean);
  let best=null,bestScore=0;
  pool.forEach(n=>{ const nw=norm(n).split(" "); const ov=tw.filter(t=>nw.includes(t)).length; if(ov>bestScore){bestScore=ov;best=n;} });
  return bestScore>=2?best:null; /* need a decent overlap to avoid nonsense matches */
}
async function coachGenerateSESSION(opts){
  opts=opts||{};
  const pool=coachMOVEPool();
  /* cap the list we send so the prompt isn't huge, but include a good spread */
  const allowed=pool.slice(0,180);
  /* translate the user's choices into prompt instructions */
  const groups=(opts.groups&&opts.groups.length)?opts.groups:null;
  const sizeMap={quick:"3 to 4 moves (a short, quick session)",standard:"5 to 6 moves (a standard session)",full:"7 to 8 moves (a long, full session)"};
  const sizeText=sizeMap[opts.size]||"4 to 7 moves";
  let focusText;
  if(groups){
    focusText=`Focus the workout on these muscle groups ONLY: ${groups.join(", ")}. Pick moves that train those groups.`;
  } else {
    focusText="Pick the most useful muscle groups for the user based on their goal and recent training (a sensible recommended session).";
  }
  const sys=`You are a strength coach. Generate ONE workout session for the user.
Respond with ONLY valid JSON (no markdown, no prose, no code fences) in EXACTLY this shape:
{"title":"string","moves":[{"name":"string","sets":number,"reps":"string"}]}
Rules:
- Choose "name" values ONLY from this allowed list (copy the exact spelling): ${JSON.stringify(allowed)}
- ${focusText}
- Include ${sizeText}. "reps" can be a range like "8-12". "sets" is a whole number.
- Make the "title" reflect the focus (e.g. the muscle groups or session type).
- Output the JSON object and nothing else.`;
  const label = groups ? `🏋️ Generate: ${groups.join(", ")}` : "🏋️ Generate a recommended workout";
  coachCHAT.push({role:"user",content:label});
  coachCHAT.push({role:"assistant",content:"…building your workout"});
  renderCOACH(); coachBusy(true);
  try{
    const msgs=[{role:"system",content:sys+"\n\nUser's training data:\n"+coachContext()},
      {role:"user",content:"Generate my workout now as JSON only."}];
    const reply=await coachAsk(msgs);
    const wk=parseCOACHSESSION(reply);
    if(!wk || !wk.moves.length){
      coachCHAT[coachCHAT.length-1]={role:"assistant",content:"__GENRETRY__"+JSON.stringify(opts||{})};
    } else {
      coachCHAT[coachCHAT.length-1]={role:"assistant",content:"__WORKOUT__"+JSON.stringify(wk)};
    }
  }catch(e){
    coachCHAT[coachCHAT.length-1]={role:"assistant",content:"⚠️ "+(e.message||"Something went wrong.")};
  }
  coachBusy(false); renderCOACH();
}
/* options sheet shown when the user taps "BUILD A SESSION" */
function openCOACHGenSheet(){
  const picked=new Set();
  openModal(`<h3>Build a workout</h3>
    <p class="muted tiny" style="line-height:1.5;margin-bottom:16px">Let the COACH pick a recommended session, or choose the muscle groups and length yourself.</p>
    <button class="btn str block" id="cg_rec" style="margin-bottom:18px">✨ PICK ONE FOR ME</button>
    <div class="eyebrow" style="margin-bottom:10px">Or build your own</div>
    <div class="cg-label">TARGET A MUSCLE</div>
    <div class="cg-groups" id="cg_groups">
      ${GROUPS.map(g=>`<button class="cg-chip" data-g="${esc(g)}">${esc(g)}</button>`).join("")}
    </div>
    <div class="cg-label">Length</div>
    <div class="cg-size" id="cg_size">
      <button class="cg-seg" data-s="quick">Quick<small>3–4</small></button>
      <button class="cg-seg on" data-s="standard">Standard<small>5–6</small></button>
      <button class="cg-seg" data-s="full">Full<small>7–8</small></button>
    </div>
    <button class="btn fuel block" id="cg_build" style="margin-top:18px">Build my workout</button>`);
  let size="standard";
  $("#cg_groups").querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>{
    const g=b.dataset.g; if(picked.has(g)){picked.delete(g);b.classList.remove("on");} else {picked.add(g);b.classList.add("on");}
  }));
  $("#cg_size").querySelectorAll("[data-s]").forEach(b=>b.addEventListener("click",()=>{
    size=b.dataset.s; $("#cg_size").querySelectorAll("[data-s]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
  }));
  $("#cg_rec").addEventListener("click",()=>{ closeModal(); coachGenerateSESSION({size}); });
  $("#cg_build").addEventListener("click",()=>{
    if(!picked.size){ toast("Pick at least one muscle group, or tap Recommend"); return; }
    closeModal(); coachGenerateSESSION({groups:[...picked], size});
  });
}
function parseCOACHSESSION(text){
  if(!text) return null;
  let raw=String(text).trim();
  /* strip code fences anywhere */
  raw=raw.replace(/```(json)?/gi,"").trim();
  /* some models prepend a safety/classifier line (e.g. "User Safety: safe");
     drop everything before the first "{" so that preamble doesn't break parsing */
  const firstBrace=raw.indexOf("{");
  if(firstBrace>0) raw=raw.slice(firstBrace);
  /* try the whole {...} span first, then progressively shorter candidates */
  const candidates=[];
  const span=raw.match(/\{[\s\S]*\}/); if(span) candidates.push(span[0]);
  /* also try each balanced object we can find */
  let depth=0,start=-1;
  for(let i=0;i<raw.length;i++){
    const c=raw[i];
    if(c==="{"){ if(depth===0)start=i; depth++; }
    else if(c==="}"){ depth--; if(depth===0&&start>=0){ candidates.push(raw.slice(start,i+1)); start=-1; } }
  }
  let obj=null;
  for(const cand of candidates){
    try{ const o=JSON.parse(cand); if(o&&Array.isArray(o.moves)){ obj=o; break; } }catch(e){}
  }
  if(!obj || !Array.isArray(obj.moves)) return null;
  const moves=[];
  obj.moves.forEach(e=>{
    const matched=coachMatchMOVE(e&&e.name);
    if(matched){
      const sets=Math.max(1,Math.min(10, parseInt(e.sets,10)||3));
      const reps=(e.reps!=null?String(e.reps):"").slice(0,12);
      moves.push({name:matched, group:(EX_BY_NAME[matched]||{}).g||"", sets, reps});
    }
  });
  if(!moves.length) return null;
  return {title:(obj.title?String(obj.title):"COACH workout").slice(0,40), moves};
}
/* turn a parsed coach workout into a live session and start it */
function coachGOSESSION(wk){
  const ex=wk.moves.map(e=>{
    const m=mkMOVE(e.name); /* prefilled first set */
    /* add the suggested number of sets */
    const target=Math.max(1,e.sets||3);
    while(m.sets.length<target){ m.sets.push(blankSet(m.sets[m.sets.length-1])); }
    return m;
  });
  startSession(wk.title||"COACH workout","coach",ex);
}
/* save a coach workout into the user's SAVED. workouts (favSESSIONS) */
function coachSAVESESSION(wk){
  if(!DATA.favSESSIONS)DATA.favSESSIONS=[];
  DATA.favSESSIONS.unshift({id:Date.now(), name:wk.title||"COACH workout", source:"coach",
    moves:wk.moves.map(e=>({name:e.name, group:e.group, home:null})),
    cardio:null, cardioPos:"end"});
  save(); toast("★ SAVED. to your workouts");
  renderCOACH();
}

/* ===================== GROUP BUILDER ===================== */
let buildState=null; /* {group, picked:[names], rest} */
function openGroupBuilder(group){
  buildState={group, picked:[], count:5, sub:"all"};
  rollMachines();
  renderBuilder();
}
function rollMachines(){
  const pool=poolBySub(buildState.group, buildState.sub);
  buildState.picked = shuffle(pool).slice(0, Math.min(buildState.count,pool.length));
}
function renderBuilder(){
  const g=buildState.group;
  const subs=subGroupsAvailable(g);
  const counts=[3,5,7];
  openModal(`
   <h3>${g} session</h3>
   <p class="muted tiny" style="margin-bottom:12px">Pick a focus and how many moves — we'll randomise them. Add, remove or re-roll before you start.</p>
   ${subs.length>1?`<label class="mg-sub">Focus</label>
   <div class="row wrap" style="gap:6px;margin-bottom:12px" id="gb_sub">
     <button class="chip sm ${buildState.sub==="all"?"str on":""}" data-s="all">All ${g.toLowerCase()}</button>
     ${subs.map(s=>`<button class="chip sm ${buildState.sub===s?"str on":""}" data-s="${esc(s)}">${esc(s)}</button>`).join("")}
   </div>`:""}
   <div class="seg" id="gb_count">
     ${counts.map(c=>`<button data-v="${c}" class="${buildState.count===c?"on":""}">${c}</button>`).join("")}
     <button data-v="manual" class="${buildState.count==="manual"?"on":""}">Manual</button>
   </div>
   <div class="row" style="gap:8px;margin:12px 0">
     <button class="btn sm" id="gb_roll" style="flex:1">🎲 Re-roll</button>
     <button class="btn sm" id="gb_add" style="flex:1">＋ ADD MOVE</button>
   </div>
   <div id="gb_list"></div>
   <button class="btn str block" id="gb_start" style="margin-top:14px">GO ${g} workout</button>
   <button class="btn ghost block" id="gb_fav" style="margin-top:10px">★ SAVE SESSION</button>
  `);
  paintBuilderList();
  if(subs.length>1) $("#gb_sub").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    buildState.sub=btn.dataset.s;
    $("#gb_sub").querySelectorAll("button").forEach(x=>x.classList.remove("str","on"));btn.classList.add("str","on");
    if(buildState.count!=="manual")rollMachines(); paintBuilderList();
  }));
  $("#gb_count").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    const v=btn.dataset.v;
    $("#gb_count").querySelectorAll("button").forEach(x=>x.classList.remove("on"));btn.classList.add("on");
    if(v==="manual"){buildState.count="manual"; buildState.picked=[];}
    else{buildState.count=+v; rollMachines();}
    paintBuilderList();
  }));
  $("#gb_roll").addEventListener("click",()=>{
    if(buildState.count==="manual"){toast("Manual mode — add moves below");return;}
    rollMachines(); paintBuilderList(); toast("Re-rolled");
  });
  $("#gb_add").addEventListener("click",()=>openMachinePicker(g));
  $("#gb_start").addEventListener("click",()=>{
    if(!buildState.picked.length){toast("Add at least one exercise");return;}
    const ex=buildState.picked.map(n=>mkMOVE(n));
    const title = buildState.sub&&buildState.sub!=="all" ? buildState.sub+" day" : g+" DAY";
    closeModal(); startSession(title,"group",ex);
  });
  $("#gb_fav").addEventListener("click",()=>{
    if(!buildState.picked.length){toast("Add at least one exercise first");return;}
    saveFavSESSION(buildState.picked.map(n=>mkMOVE(n)),null,"end",g+" DAY");
  });
}
function paintBuilderList(){
  const wrap=$("#gb_list"); if(!wrap)return;
  if(!buildState.picked.length){wrap.innerHTML=`<div class="empty">No moves yet — hit “ADD MOVE”.</div>`;return;}
  wrap.innerHTML="";
  buildState.picked.forEach((n,i)=>{
    const r=el("div","lrow");
    const sg=subGroupOf(n,EX_BY_NAME[n]?.g||buildState.group);
    r.innerHTML=`<div class="ico">${i+1}</div>
      <div class="main"><div class="t">${esc(n)}</div><div class="s">${EX_BY_NAME[n]?.g||""}${sg?" · "+sg:""}</div></div>`;
    const info=el("button","iconbtn info","ⓘ"); info.addEventListener("click",()=>showHowTo(n));
    const swap=el("button","iconbtn","⇄"); swap.title="SWAP"; swap.addEventListener("click",()=>{
      const pool=poolBySub(buildState.group,buildState.sub).filter(x=>!buildState.picked.includes(x));
      if(!pool.length){toast("No other moves left");return;}
      buildState.picked[i]=shuffle(pool)[0]; paintBuilderList();
    });
    const del=el("button","del","×"); del.addEventListener("click",()=>{buildState.picked.splice(i,1);paintBuilderList();});
    const end=el("div","row"); end.style.gap="6px"; end.append(info,swap,del);
    r.appendChild(end); wrap.appendChild(r);
  });
}
function openMachinePicker(group){
  const inLive = !!liveSession && !buildState;
  const showFW = fwEnabled();
  openModal(`<h3>ADD MOVE</h3>
    <input class="input" id="mp_search" placeholder="Search…" style="margin:8px 0 4px">
    <div class="row wrap" style="gap:6px;margin-bottom:8px">
      <button class="chip sm gold-chip" data-g="FAV">★ STARRED</button>
      ${showFW?`<button class="chip sm" data-g="FW">🏋️ Free weights</button>`:""}
      ${inLive?`<button class="chip sm" data-g="CARDIO">🏃 CARDIO</button>`:""}
      ${GROUPS.map(g=>`<button class="chip sm ${g===group?"on":""}" data-g="${g}">${g}</button>`).join("")}
    </div>
    <div class="search-list" id="mp_list"></div>`);
  let curG=group;
  function addStrength(n){
    if(buildState){ if(!buildState.picked.includes(n))buildState.picked.push(n); if($("#gb_list"))paintBuilderList(); toast("ADDED. "+n); }
    else if(liveSession){ liveSession.moves.push(mkMOVE(n)); renderLive(); toast("ADDED. "+n); }
  }
  function paint(){
    const q=$("#mp_search").value.toLowerCase();
    if(curG==="CARDIO"){
      const list=CARDIO.filter(c=>c.n.toLowerCase().includes(q));
      $("#mp_list").innerHTML=list.map(c=>`<div class="food-opt"><div><div class="fn">${c.ic} ${esc(c.n)}</div><div class="fm">${c.t==="machine"?"Machine cardio":"At-home cardio"}</div></div>
        <button class="btn sm fuel" data-cardio="${esc(c.n)}">Add</button></div>`).join("")||`<div class="empty">No matches</div>`;
      $("#mp_list").querySelectorAll("[data-cardio]").forEach(btn=>btn.addEventListener("click",()=>{
        const c=CARDIO.find(x=>x.n===btn.getAttribute("data-cardio"));
        if(liveSession){ liveSession.moves.push(mkCARDIOCard(c)); renderLive(); toast("ADDED. "+c.n); }
      }));
      return;
    }
    let pool;
    if(curG==="FAV") pool=MACHINES.filter(m=>isFavMachine(m.n));
    else if(curG==="FW") pool=FREEWEIGHTS;
    else pool=(showFW?gymMOVEsIn(curG):machinesIn(curG));
    const list=pool.filter(m=>m.n.toLowerCase().includes(q));
    $("#mp_list").innerHTML=list.map(m=>`<div class="food-opt" data-n="${esc(m.n)}">
      <div><div class="fn">${esc(m.n)}${m.fw?' <span class="tiny" style="color:var(--gold)">· free weight</span>':''}</div><div class="fm">${m.g}</div></div>
      <div class="row" style="gap:6px">
        <button class="iconbtn info" data-info="${esc(m.n)}">ⓘ</button>
        <button class="iconbtn star ${isFavMachine(m.n)?"on":""}" data-fav="${esc(m.n)}">${isFavMachine(m.n)?"★":"☆"}</button>
        <button class="btn sm str" data-add="${esc(m.n)}">Add</button></div></div>`).join("")||`<div class="empty">${curG==="FAV"?"No favourites yet — tap ☆ to add some.":"No matches"}</div>`;
    $("#mp_list").querySelectorAll("[data-add]").forEach(btn=>btn.addEventListener("click",()=>addStrength(btn.getAttribute("data-add"))));
    $("#mp_list").querySelectorAll("[data-fav]").forEach(btn=>btn.addEventListener("click",()=>{toggleFavMachine(btn.getAttribute("data-fav"));paint();}));
    $("#mp_list").querySelectorAll("[data-info]").forEach(btn=>btn.addEventListener("click",()=>showHowTo(btn.getAttribute("data-info"))));
  }
  $("#mp_search").addEventListener("input",paint);
  $("#modal").querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>{
    $("#modal").querySelectorAll("[data-g]").forEach(x=>x.classList.remove("on"));b.classList.add("on");curG=b.dataset.g;paint();}));
  paint();
}

/* ===================== HOW-TO ===================== */
function showHowTo(name){
  const m=EX_BY_NAME[name]; if(!m){toast("No guide for this one");return;}
  const h=m.h;
  openModal(`<h3>${esc(m.n)}</h3><div class="eyebrow">${m.g} · ${m.fw?"free weights":"how to use"}</div>
    <div class="howto-block setup"><div class="lab">Set up</div><p>${esc(h.setup)}</p></div>
    <div class="howto-block move"><div class="lab">The movement</div><p>${esc(h.move)}</p></div>
    <div class="howto-block cue"><div class="lab">Form cue</div><p>${esc(h.cue)}</p></div>
    <div class="howto-block avoid"><div class="lab">Avoid</div><p>${esc(h.avoid)}</p></div>
    <button class="btn ${isFavMachine(name)?"gold":"ghost"} block" id="ht_fav" style="margin-top:16px">${isFavMachine(name)?"★ Favourited":"☆ STAR THIS"}</button>
    <button class="btn block" id="ht_close" style="margin-top:10px">GOT IT</button>`);
  $("#ht_fav").addEventListener("click",()=>{toggleFavMachine(name);showHowTo(name);});
  $("#ht_close").addEventListener("click",closeModal);
}

/* ===================== HOME BUILDER ===================== */
function openHOMEBuilder(){
  const sel=new Set(["none"]);
  openModal(`<h3>HOME workout</h3>
    <p class="muted tiny" style="margin-bottom:12px">Tick what you've got. We'll pick the best moves for it.</p>
    <div class="field"><label>Available equipment</label>
      <div class="row wrap" style="gap:8px" id="hb_eq">
       ${HOME_EQUIP.map(e=>`<button class="chip ${e.id==="none"?"on":""}" data-id="${e.id}">${e.label}</button>`).join("")}
      </div></div>
    <div class="field"><label>Focus</label>
      <select class="input" id="hb_focus">
        <option value="Full">Full body</option><option value="Upper">Upper body</option>
        <option value="Lower">Lower body</option><option value="Core">Core</option></select></div>
    <div class="field"><label>How many moves</label>
      <div class="seg" id="hb_count"><button data-v="4" class="on">4</button><button data-v="6">6</button><button data-v="8">8</button></div></div>
    <button class="btn fuel block" id="hb_go" style="margin-top:6px">Build routine</button>`);
  $("#hb_eq").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.id;
    if(id==="none"){sel.clear();sel.add("none");$("#hb_eq").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x.dataset.id==="none"));return;}
    if(sel.has(id)){sel.delete(id);b.classList.remove("on");}else{sel.add(id);b.classList.add("on");}
    sel.delete("none"); $("#hb_eq").querySelector('[data-id="none"]').classList.remove("on");
    if(!sel.size){sel.add("none");$("#hb_eq").querySelector('[data-id="none"]').classList.add("on");}
  }));
  segBind("hb_count");
  $("#hb_go").addEventListener("click",()=>{
    const focus=$("#hb_focus").value, count=+segVal("hb_count");
    const upper=["Chest","Shoulders","BACK","Arms","Triceps","Biceps"];
    const lower=["Legs","Glutes","Hamstrings","Calves"];
    let pool=HOME.filter(h=>h.eq.some(e=>sel.has(e)));
    if(focus==="Upper")pool=pool.filter(h=>upper.includes(h.t)||h.t==="FULL BODY");
    if(focus==="Lower")pool=pool.filter(h=>lower.includes(h.t)||h.t==="FULL BODY");
    if(focus==="Core")pool=pool.filter(h=>h.t==="Core");
    /* Full body: no muscle filter (keep all matching equipment) */
    if(!pool.length){toast("No moves match — add equipment or change focus");return;}
    const chosen=shuffle(pool).slice(0,Math.min(count,pool.length));
    const ex=chosen.map(h=>({name:h.n,group:h.t,home:h,sets:[prefilledSet(h.n)]}));
    closeModal(); startSession("HOME · "+focus,"home",ex);
    if(chosen.length<count) toast(`Built ${chosen.length} — that's all that fit your equipment & focus`);
  });
}

/* ===================== MEGA WORKOUT ===================== */
function openMegaBuilder(){
  const st={place:(DATA.prefs.env==="home"?"home":"gym"), mode:"random", groups:new Set(["Chest","BACK","Legs"]), perGroup:3,
            homeFocus:"Full", homeCount:6, homeEq:new Set(["none"]),
            doCARDIO:true, cardioName:"", cardioPos:"end"};
  function cardioPool(){return CARDIO.filter(c=>c.t===(st.place==="gym"?"machine":"home"));}
  function render(){
    const cp=cardioPool();
    if(!st.cardioName && cp.length) st.cardioName=cp[Math.floor(cp.length/3)].n;
    openModal(`<h3>MEGA SESSION 💥</h3>
      <p class="muted tiny" style="margin-bottom:16px">TRAIN several muscle groups and finish with cardio — all in one session.</p>
      <div class="mg-step"><div class="mg-lab">1 · Where are you?</div>
        <div class="seg" id="mg_place"><button data-v="gym" class="${st.place==="gym"?"on":""}">🏋️ GYM</button><button data-v="home" class="${st.place==="home"?"on":""}">🏠 HOME</button></div></div>
      <div class="mg-step"><div class="mg-lab">2 · How to pick moves</div>
        <div class="seg" id="mg_mode"><button data-v="random" class="${st.mode==="random"?"on":""}">🎲 Surprise me</button><button data-v="choose" class="${st.mode==="choose"?"on":""}">✋ I'll choose</button></div>
        <div id="mg_choose" style="margin-top:12px"></div></div>
      <div class="mg-step"><div class="mg-lab">3 · CARDIO</div>
        <div class="seg" id="mg_docardio"><button data-v="yes" class="${st.doCARDIO?"on":""}">Include cardio</button><button data-v="no" class="${!st.doCARDIO?"on":""}">SKIP REST it</button></div>
        <div id="mg_cardiocfg" style="margin-top:12px"></div></div>
      <div class="mg-preview" id="mg_preview"></div>
      <button class="btn str block" id="mg_build" style="margin-top:8px">Build mega workout</button>`);
    paintChoose(); paintCARDIOCfg(); paintPreview();
    $("#mg_place").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{st.place=b.dataset.v;st.cardioName="";render();}));
    $("#mg_mode").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{st.mode=b.dataset.v;render();}));
    $("#mg_docardio").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{st.doCARDIO=b.dataset.v==="yes";render();}));
    $("#mg_build").addEventListener("click",buildMega);
  }
  function paintCARDIOCfg(){
    const wrap=$("#mg_cardiocfg"); if(!wrap)return;
    if(!st.doCARDIO){ wrap.innerHTML=""; return; }
    const cp=cardioPool();
    wrap.innerHTML=`<div class="field"><label>${st.mode==="random"?"CARDIO (randomised — or pick one)":"Which cardio?"}</label>
        <select class="input" id="mg_cardio">
          ${st.mode==="random"?`<option value="">🎲 Randomised</option>`:""}
          ${cp.map(c=>`<option value="${esc(c.n)}" ${st.cardioName===c.n?"selected":""}>${c.ic} ${esc(c.n)}</option>`).join("")}
        </select></div>
      <div class="field" style="margin-bottom:0"><label>When?</label>
        <div class="seg" id="mg_pos"><button data-v="start" class="${st.cardioPos==="start"?"on":""}">WARM-UP (start)</button><button data-v="end" class="${st.cardioPos==="end"?"on":""}">END SESSIONer (end)</button></div></div>`;
    $("#mg_cardio").addEventListener("change",e=>{st.cardioName=e.target.value;paintPreview();});
    $("#mg_pos").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
      $("#mg_pos").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");st.cardioPos=b.dataset.v;paintPreview();}));
  }
  function paintPreview(){
    const pv=$("#mg_preview"); if(!pv)return;
    let n=0, desc="";
    if(st.place==="gym"){
      const groups = st.mode==="random" ? ["random groups"] : [...st.groups];
      const per = st.perGroup;
      n = st.mode==="random" ? "~6–9" : (st.groups.size*per);
      desc = st.mode==="random" ? "random muscle groups" : (st.groups.size?[...st.groups].join(", "):"no groups yet");
    } else {
      n = st.mode==="random" ? 6 : st.homeCount;
      desc = st.mode==="random" ? "a random home mix" : ("home "+st.homeFocus.toLowerCase());
    }
    const cardioBit = st.doCARDIO ? ` + ${st.cardioName?st.cardioName:"cardio"} as a ${st.cardioPos==="start"?"warm-up":"finisher"}` : "";
    pv.innerHTML=`<b style="color:var(--text)">${n} exercise${n===1?"":"s"}</b> · ${esc(desc)}${esc(cardioBit)}`;
  }
  function paintChoose(){
    const wrap=$("#mg_choose"); if(!wrap)return;
    if(st.mode==="random"){ wrap.innerHTML=`<p class="muted tiny" style="margin:0">We'll randomly pick the muscle groups${st.place==="gym"?(fwEnabled()?", machines & free weights":" & machines"):" & moves"}.</p>`; return; }
    if(st.place==="gym"){
      wrap.innerHTML=`<label class="mg-sub">Tap the muscle groups to include</label>
        <div class="row wrap" style="gap:7px;margin-bottom:12px" id="mg_groups">
          ${GROUPS.map(g=>`<button class="chip sm ${st.groups.has(g)?"str on":""}" data-g="${g}">${g}</button>`).join("")}</div>
        <label class="mg-sub">MOVEs per group</label>
        <div class="seg" id="mg_per">${[2,3,4,5].map(n=>`<button data-v="${n}" class="${st.perGroup===n?"on":""}">${n}</button>`).join("")}</div>
        ${fwEnabled()?`<p class="muted tiny" style="margin:8px 0 0">Free weights are included with machines (your gym setting).</p>`:""}`;
      $("#mg_groups").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
        const g=b.dataset.g; if(st.groups.has(g)){st.groups.delete(g);b.classList.remove("str","on");}else{st.groups.add(g);b.classList.add("str","on");} paintPreview();}));
      $("#mg_per").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
        $("#mg_per").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");st.perGroup=+b.dataset.v;paintPreview();}));
    } else {
      wrap.innerHTML=`<label class="mg-sub">Equipment you have</label>
        <div class="row wrap" style="gap:7px;margin-bottom:12px" id="mg_eq">${HOME_EQUIP.map(e=>`<button class="chip sm ${st.homeEq.has(e.id)?"on":""}" data-id="${e.id}">${e.label}</button>`).join("")}</div>
        <label class="mg-sub">Focus</label>
        <div class="seg" id="mg_focus2" style="margin-bottom:12px">${["Full","Upper","Lower","Core"].map(f=>`<button data-v="${f}" class="${st.homeFocus===f?"on":""}">${f}</button>`).join("")}</div>
        <label class="mg-sub">How many moves</label>
        <div class="seg" id="mg_hc">${[4,6,8,10].map(n=>`<button data-v="${n}" class="${st.homeCount===n?"on":""}">${n}</button>`).join("")}</div>`;
      $("#mg_eq").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
        const id=b.dataset.id;
        if(id==="none"){st.homeEq.clear();st.homeEq.add("none");}
        else{if(st.homeEq.has(id))st.homeEq.delete(id);else st.homeEq.add(id);st.homeEq.delete("none");}
        if(!st.homeEq.size)st.homeEq.add("none"); paintChoose();}));
      $("#mg_focus2").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
        $("#mg_focus2").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");st.homeFocus=b.dataset.v;paintPreview();}));
      $("#mg_hc").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
        $("#mg_hc").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");st.homeCount=+b.dataset.v;paintPreview();}));
    }
  }
  function buildMega(){
    let moves=[], title="";
    if(st.place==="gym"){
      let groups = st.mode==="random" ? shuffle(GROUPS).slice(0,2+Math.floor(Math.random()*2)) : [...st.groups];
      if(!groups.length){toast("Pick at least one muscle group");return;}
      const per = st.mode==="random" ? 2+Math.floor(Math.random()*2) : st.perGroup;
      groups.forEach(g=>{ shuffle(gymPoolNames(g)).slice(0,per).forEach(n=>moves.push(mkMOVE(n))); });
      title="Mega · "+groups.join("/");
    } else {
      const upper=["Chest","Shoulders","BACK","Arms","Triceps","Biceps"], lower=["Legs","Glutes","Hamstrings","Calves"];
      let pool=HOME.filter(h=>h.eq.some(e=>st.homeEq.has(e)));
      const focus = st.mode==="random" ? "Full" : st.homeFocus;
      if(focus==="Upper")pool=pool.filter(h=>upper.includes(h.t)||h.t==="FULL BODY");
      if(focus==="Lower")pool=pool.filter(h=>lower.includes(h.t)||h.t==="FULL BODY");
      if(focus==="Core")pool=pool.filter(h=>h.t==="Core");
      if(!pool.length){toast("No moves match — add equipment");return;}
      const cnt = st.mode==="random" ? 6 : st.homeCount;
      shuffle(pool).slice(0,Math.min(cnt,pool.length)).forEach(h=>moves.push({name:h.n,group:h.t,home:h,sets:[prefilledSet(h.n)]}));
      title="Mega · HOME "+focus;
    }
    if(st.doCARDIO){
      let act=null; const cp=cardioPool();
      if(st.mode==="random" && !st.cardioName) act=cp[Math.floor(Math.random()*cp.length)];
      else if(st.cardioName) act=CARDIO.find(c=>c.n===st.cardioName);
      if(act){ const cc=mkCARDIOCard(act); if(st.cardioPos==="start")moves=[cc,...moves]; else moves=[...moves,cc]; }
    }
    if(!moves.length){toast("Nothing to build — check your choices");return;}
    closeModal(); startSession(title,"mega",moves);
  }
  render();
}

/* ===================== LIVE TRACKER ===================== */
let liveSession=null; /* {title,type,moves,restSec,startedAt} */
const LIVE_KEY="evolve_live_v1";
function persistLive(){ try{ if(liveSession&&liveSession.moves&&liveSession.moves.length){ localStorage.setItem(LIVE_KEY, JSON.stringify(safeJsonValue(liveSession,0))); } }catch(e){} }
function clearLive(){ try{ localStorage.removeItem(LIVE_KEY); }catch(e){} }
function loadLive(){ try{ const s=localStorage.getItem(LIVE_KEY); return s?safeJsonValue(safeParseJsonText(s,MAX_STATE_BYTES/3,"Live session"),0):null; }catch(e){ return null; } }
function resumeLive(saved){
  buildState=null; liveSession=saved; stopREST();
  $("#live").classList.add("on");
  $("#liveTitle").textContent=saved.title||"SESSION";
  renderLive();
}
/* offered on app open if a workout was left unfinished */
function maybeRESUMESESSION(){
  const saved=loadLive();
  if(!saved || !saved.moves || !saved.moves.length){ clearLive(); return; }
  const mins = saved.startedAt ? Math.round((Date.now()-saved.startedAt)/60000) : 0;
  const done = saved.moves.reduce((a,ex)=>a+((ex.sets||[]).filter(s=>s.done).length),0);
  openModal(`<h3>RESUME your workout?</h3>
    <p class="muted" style="margin:2px 0 16px;font-size:14px;line-height:1.5">You left <b style="color:var(--text)">${esc(saved.title||"a workout")}</b> unfinished${mins>0&&mins<1440?` about ${mins} min ago`:""}${done?` — ${done} set${done===1?"":"s"} logged`:""}. Pick up where you left off, or discard it.</p>
    <button class="btn str block" id="rw_resume">RESUME workout</button>
    <button class="btn block" id="rw_discard" style="margin-top:10px">Discard it</button>`);
  $("#rw_resume").addEventListener("click",()=>{ closeModal(); resumeLive(saved); });
  $("#rw_discard").addEventListener("click",()=>{ clearLive(); closeModal(); toast("Discarded"); });
}
function startSession(title,type,moves){
  buildState=null; /* clear any leftover builder so Add-exercise targets the live session */
  liveSession={title,type,moves,restSec:(Number(DATA.prefs.restDefault)>0?Number(DATA.prefs.restDefault):90),startedAt:Date.now(),notes:""};
  stopREST();
  $("#live").classList.add("on");
  $("#liveTitle").textContent=title;
  renderLive();
  persistLive();
}
$("#liveCLOSE").addEventListener("click",()=>{
  if(!liveSession){ stopREST(); $("#live").classList.remove("on"); return; }
  const hasData = liveSession.moves.some(ex=>ex.cardio || (ex.sets||[]).some(s=>s.done||+s.kg>0||+s.reps>0));
  confirmModal({title:"LEAVE SESSION?",danger:true,confirmText:"LEAVE",
    body:hasData?"ALLthing you've logged won't be saved. Tap “END SESSION” instead to keep it.":"You'll lose this session. Tap “END SESSION” to save it instead.",
    onCONFIRM:()=>{ stopREST(); $("#live").classList.remove("on"); liveSession=null; clearLive(); }});
});
$("#liveEND SESSION").addEventListener("click",finishSESSION);
$("#liveFav").addEventListener("click",()=>{
  if(!liveSession){return;}
  const cardioCard=liveSession.moves.find(e=>e.cardio);
  const cardio=cardioCard?cardioCard.activity:null;
  const pos=cardioCard&&liveSession.moves[0]&&liveSession.moves[0].cardio?"start":"end";
  saveFavSESSION(liveSession.moves, cardio, pos, liveSession.title);
});

function updateLiveProg(){
  if(!liveSession)return;
  let tot=0,done=0;
  liveSession.moves.forEach(e=>{ if(e.cardio)return; (e.sets||[]).forEach(st=>{tot++; if(st.done)done++;}); });
  const n=$("#lp_num"), bar=$("#lp_bar"), lbl=$("#lp_exname");
  if(n) n.textContent=`${done} / ${tot} sets`;
  if(bar) bar.style.width=(tot?Math.round(done/tot*100):0)+"%";
  if(lbl){
    const cur=liveSession.moves.find(e=>!e.cardio&&(e.sets||[]).some(s=>!s.done));
    lbl.textContent=cur?esc(cur.name):(liveSession.title||"SESSION");
  }
}
function ssMembers(xi){
  const ex=liveSession.moves[xi]; if(!ex||!ex.ss)return null;
  const idx=liveSession.moves.map((e,i)=>e.ss===ex.ss?i:-1).filter(i=>i>=0);
  return {group:ex.ss, idx, isFirst:idx[0]===xi, isLast:idx[idx.length-1]===xi};
}
function toggleSUPERSET(xi){
  const a=liveSession.moves[xi], b2=liveSession.moves[xi+1];
  if(!a||!b2||a.cardio||b2.cardio)return;
  if(a.ss && a.ss===b2.ss){ /* unlink: clear both (and any wider group stays only if 3+, keep simple) */
    const g=a.ss; liveSession.moves.forEach(e=>{if(e.ss===g)delete e.ss;});
  } else {
    const g=a.ss||b2.ss||("ss"+Date.now()); a.ss=g; b2.ss=g;
  }
  renderLive();
}
function swapMOVE(xi){
  const ex=liveSession.moves[xi]; if(!ex||ex.cardio)return;
  const g=ex.group;
  const alts=(fwEnabled()?gymPoolNames(g):machinesIn(g).map(m=>m.n)).filter(n=>n!==ex.name);
  if(!alts.length){toast("No alternatives for this muscle");return;}
  const list=shuffle(alts).slice(0,6);
  openModal(`<h3>SWAP exercise ${infoBtn("swap")}</h3>
    <p class="muted tiny" style="margin-bottom:12px">Machine taken? Pick a ${g} alternative — your sets so far stay.</p>
    <div class="search-list">${list.map(n=>`<div class="food-opt"><div><div class="fn">${esc(n)}</div><div class="fm">${EX_BY_NAME[n]?.g||g}</div></div><button class="btn sm str" data-sw="${esc(n)}">SWAP in</button></div>`).join("")}</div>`);
  bindInfo($("#modal"));
  $("#modal").querySelectorAll("[data-sw]").forEach(btn=>btn.addEventListener("click",()=>{
    const n=btn.getAttribute("data-sw"); const m=EX_BY_NAME[n];
    ex.name=n; ex.group=m?m.g:g; delete ex.home; closeModal(); renderLive(); toast("SWAPped to "+n);
  }));
}
function openMOVEREST(ex){
  openModal(`<h3>REST TIMER ${infoBtn("exrest")}</h3>
    <p class="muted tiny" style="margin-bottom:12px">Override your default rest just for ${esc(ex.name)}.</p>
    <div class="seg" id="er_seg" style="flex-wrap:wrap">${[0,45,60,90,120,150,180,240].map(s=>`<button data-v="${s}" class="${(ex.restSec!=null?ex.restSec:'')===s?'on':''}">${s===0?"OFF":s+"s"}</button>`).join("")}</div>
    <button class="btn ghost block" id="er_clear" style="margin-top:12px">USE SESSION DEFAULT (${liveSession.restSec}s)</button>`);
  bindInfo($("#modal"));
  $("#er_seg").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ex.restSec=+b.dataset.v;save();closeModal();toast("REST set to "+(+b.dataset.v===0?"off":b.dataset.v+"s")+" for "+ex.name);}));
  $("#er_clear").addEventListener("click",()=>{delete ex.restSec;closeModal();toast("Using default rest");});
}
function openPlateCalc(ex){
  const bar=20, plates=[25,20,15,10,5,2.5,1.25];
  let target = ex.sets.map(s=>+s.kg||0).filter(Boolean).pop() || 60;
  function paint(){
    let perSide=(target-bar)/2; const used=[];
    if(perSide<0)perSide=0;
    let rem=perSide; plates.forEach(p=>{ while(rem>=p-1e-9){used.push(p);rem=Math.round((rem-p)*100)/100;} });
    const colors={25:"#e23b3b",20:"#2f7de2",15:"#e2a52f",10:"#2fb84a","5":"#dcdce2","2.5":"#9aa0ad","1.25":"#6b7280"};
    const vis=used.length?used.map(p=>`<span class="plate" style="background:${colors[p]||'#888'};height:${34+p*1.4}px">${p}</span>`).join(""):`<span class="muted tiny">Just the bar</span>`;
    openModal(`<h3>PLATES ${infoBtn("plates")}</h3>
      <div class="field"><label>Target weight (total, kg)</label>
        <input class="input num" id="pc_t" type="number" inputmode="decimal" value="${target}"></div>
      <div class="muted tiny">Olympic bar ${bar}kg · load each side:</div>
      <div class="plate-vis">${vis}</div>
      <div class="center" style="font-weight:700">Each side: ${used.length?used.join(" + ")+" kg":"—"}</div>
      ${rem>0.01?`<div class="center tiny" style="color:var(--gold);margin-top:6px">CLOSEst with standard plates (${Math.round(rem*100)/100}kg short)</div>`:""}
      <button class="btn block" id="pc_ok" style="margin-top:16px">DONE.</button>`);
    bindInfo($("#modal"));
    $("#pc_t").addEventListener("change",e=>{target=+e.target.value||bar;paint();});
    $("#pc_ok").addEventListener("click",closeModal);
  }
  paint();
}
function openSessionNotes(){
  if(!liveSession)return;
  openModal(`<h3>SESSION notes</h3>
    <p class="muted tiny" style="margin-bottom:10px">Add anything useful for next time — niggles, form cues, what to try next, or how the session felt.</p>
    <textarea class="input" id="sn_text" rows="6" placeholder="Felt strong. Push harder next session." style="resize:none">${esc(liveSession.notes||"")}</textarea>
    <button class="btn str block" id="sn_save" style="margin-top:12px">SAVE NOTES</button>`);
  $("#sn_save").addEventListener("click",()=>{ liveSession.notes=$("#sn_text").value.trim(); persistLive(); closeModal(); renderLive(); toast(liveSession.notes?"NOTES SAVED.":"NOTES CLEARED."); });
}
function exerciseHistoryFor(name){
  const hist=[];
  DATA.workouts.slice().sort((a,b)=>a.id-b.id).forEach(w=>{
    const ex=(w.moves||[]).find(e=>e.name===name); if(!ex)return;
    let best=null;
    (ex.sets||[]).forEach(st=>{ if(!st.warmup && +st.kg>0 && +st.reps>0){ if(!best || est1RMkg(+st.kg,+st.reps)>est1RMkg(best.kg,best.reps)) best={kg:+st.kg,reps:+st.reps}; } });
    if(best) hist.push({date:w.date,kg:best.kg,reps:best.reps,title:w.title});
  });
  return hist;
}
function openMOVEHistory(name){
  const hist=exerciseHistoryFor(name);
  if(!hist.length){ toast("No history for "+name+" yet"); return; }
  const best=hist.slice().sort((a,b)=>est1RMkg(b.kg,b.reps)-est1RMkg(a.kg,a.reps))[0];
  const last=hist[hist.length-1];
  const pts=hist.map((h,i)=>({x:i,y:Math.round(liftFromKg(est1RMkg(h.kg,h.reps))*10)/10}));
  const rm=est1RMkg(best.kg,best.reps);
  const pctRows=[60,70,80,90,95].map(p=>`<div class="rm-row"><span class="rm-p">${p}%</span><span class="rm-w num">${liftStr(rm*p/100)}</span></div>`).join("");
  openModal(`<h3>${esc(name)}</h3>
    <p class="muted tiny" style="margin-bottom:12px">Mid-workout history, pulled from your saved sessions.</p>
    <div class="grid2" style="margin-bottom:12px">
      <div class="stat"><div class="k">Last best set</div><div class="v num">${liftStr(last.kg)}<small> × ${last.reps}</small></div></div>
      <div class="stat"><div class="k">Best est. 1RM</div><div class="v num">${liftStr(rm)}</div></div>
    </div>
    <div class="card">${hist.length>=2?lineChart(pts,"#5AA9FF",{h:150}):`<div class="empty">Best so far: <b style="color:var(--text)">${liftStr(best.kg)} × ${best.reps}</b></div>`}</div>
    <div class="eyebrow" style="margin:12px 0 8px">TRAINing percentages <span style="text-transform:none;font-weight:500">· of est. 1RM</span></div>
    <div class="card rm-table">${pctRows}</div>
    <div class="eyebrow" style="margin:12px 0 8px">Recent sets</div>
    <div class="search-list">${hist.slice(-6).reverse().map(h=>`<div class="hist-ex"><div class="hx-n">${shortDate(h.date)} · ${esc(h.title||"SESSION")}</div><div class="hx-s">${liftStr(h.kg)} × ${h.reps} · est. 1RM ${liftStr(est1RMkg(h.kg,h.reps))}</div></div>`).join("")}</div>`);
}
function genWarmups(ex){
  const work=ex.sets.find(s=>!s.warmup && +s.kg>0);
  if(!work){toast("Enter your first working weight first");return;}
  const top=+work.kg;
  const scheme=[[0.5,8],[0.7,5],[0.85,3]];
  const warm=scheme.map(([pct,reps])=>({kg:Math.round((top*pct)/2.5)*2.5, reps, done:false, warmup:true}));
  ex.sets=warm.concat(ex.sets.filter(s=>!s.warmup));
  renderLive(); toast("ADDED. "+warm.length+" warm-up sets");
}
function renderLive(){
  const body=$("#liveBody"); body.innerHTML="";

  /* sticky header: slim progress + current exercise name */
  const sticky=el("div","live-sticky");
  const prog=el("div","lp-bar-wrap");
  prog.innerHTML=`<div class="lp-row"><span class="lp-label" id="lp_exname"></span><span class="lp-count" id="lp_num"></span></div>
    <div class="lp-track"><i id="lp_bar"></i></div>`;
  sticky.appendChild(prog);
  body.appendChild(sticky);
  updateLiveProg();

  const strengthN=liveSession.moves.filter(e=>!e.cardio).length;
  let strengthI=0;
  liveSession.moves.forEach((ex,xi)=>{
    if(ex.cardio){ body.appendChild(buildCARDIOLiveCard(ex,xi)); return; }
    const ss=ssMembers(xi);
    const nx=liveSession.moves[xi+1], pv=liveSession.moves[xi-1];
    const linkedNEXT=nx&&!nx.cardio&&ex.ss&&ex.ss===nx.ss;
    const linkedPrev=pv&&!pv.cardio&&ex.ss&&ex.ss===pv.ss;
    const wrap=el("div","ex-wrap"+(ss?" linked":"")+(linkedPrev?" linked-prev":""));
    const c=el("div","ex-card"+(ss?" ss":""));
    strengthI++;

    c.appendChild(el("div","exi",`MOVE ${strengthI} of ${strengthN}${ex.group?" · "+esc(ex.group):""}`));

    const head=el("div","eh");
    const nm=el("div","nm tap-history");
    nm.textContent=esc(ex.name);
    if(ss){ const b=el("span","ss-badge"); b.textContent="SUPERSET"; nm.appendChild(b); }
    nm.addEventListener("click",()=>openMOVEHistory(ex.name));
    head.appendChild(nm);

    const hact=el("div","eh-actions");
    const nb=el("button","live-note-btn"+(liveSession.notes?" has-notes":""));
    nb.textContent="📝";
    nb.title=liveSession.notes?"EDIT NOTES":"ADD NOTES";
    nb.addEventListener("click",openSessionNotes);
    hact.appendChild(nb);
    const more=el("button","more","⋯"); more.title="More";
    more.addEventListener("click",()=>openMOVEMenu(ex,xi));
    hact.appendChild(more);
    head.appendChild(hact);
    c.appendChild(head);

    const last=lastSetFor(ex.name);
    if(last&&(+last.kg>0||+last.reps>0)){
      const gh=el("div","ghost-hint");
      gh.textContent=`👻 LAST TIME: ${last.kg?liftStr(+last.kg):"—"} × ${last.reps||"—"} reps`;
      c.appendChild(gh);
    }
    if(ex.home){ const tip=el("div","ex-tip"); tip.textContent="Suggested: "+ex.home.reps; c.appendChild(tip); }

    c.appendChild(buildSetList(ex,xi));

    const add=el("button","btn ghost add-set","＋ ADD SET");
    add.addEventListener("click",()=>{
      const ns=blankSet(ex.sets[ex.sets.length-1]); ex.sets.push(ns); ex._active=ex.sets.length-1;
      renderLive();
    });
    c.appendChild(add);

    if(nx&&!nx.cardio){
      const foot=el("div","ss-foot");
      const lb=el("button","",linkedNEXT?"🔗 LINKED WITH NEXT · UNLINK":"🔗 SUPERSET with next exercise");
      lb.addEventListener("click",()=>toggleSUPERSET(xi));
      foot.appendChild(lb); c.appendChild(foot);
    }
    wrap.appendChild(c); body.appendChild(wrap);
    if(linkedNEXT){
      const conn=el("div","ss-connector");
      conn.innerHTML=`<span class="ln"></span>🔗 SUPERSET — NO REST<span class="ln"></span>`;
      body.appendChild(conn);
    }
  });

  const addEx=el("button","btn block add-ex","＋ ADD MOVE");
  addEx.addEventListener("click",()=>{
    const g=liveSession.moves.find(e=>!e.cardio)?.group||"Chest";
    openMachinePicker(GROUPS.includes(g)?g:"Chest");
  });
  body.appendChild(addEx);
  persistLive();
}

function buildSetList(ex,xi){
  const wrap=el("div","setlist");
  function activeIdx(){
    if(ex._active!=null&&ex.sets[ex._active]&&!ex.sets[ex._active].done) return ex._active;
    return ex.sets.findIndex(s=>!s.done);
  }
  function paint(){
    wrap.innerHTML="";
    const act=activeIdx();
    const last=lastSetFor(ex.name);
    ex.sets.forEach((st,si)=>{

      if(st.done){
        const r=el("div","sl-row done");
        const kg=(+st.kg>0)?liftStr(+st.kg):"—";
        const reps=st.reps||"—";
        const rirBadge=(st.rir&&!st.warmup)?`<span class="sl-rir-badge">RIR ${st.rir==="F"?"Fail":st.rir}</span>`:"";
        r.innerHTML=`<span class="sl-sn">${st.warmup?"W":si+1}</span><span class="sl-val">${kg} × ${reps}</span>${rirBadge}<span class="sl-chk">✓</span>`;
        r.addEventListener("click",()=>{ st.done=false; ex._active=si; paint(); updateLiveProg(); persistLive(); });
        wrap.appendChild(r);

      } else if(si===act){
        const r=el("div","sl-active");

        const lbl=el("div","sla-label");
        lbl.innerHTML=`<span class="sla-num">${st.warmup?"WARM-UP":"Set "+(si+1)}</span><span class="sla-now">Now</span>`;
        r.appendChild(lbl);

        if(last&&(+last.kg>0||+last.reps>0)){
          const g=el("div","sla-ghost");
          g.textContent=`👻 ${last.kg?liftStr(+last.kg):"—"} × ${last.reps||"—"} last session`;
          r.appendChild(g);
        }

        const kgDisp=(st.kg===""||st.kg==null)?"":liftRound(liftFromKg(+st.kg));
        const kgPh=last&&+last.kg>0?String(liftRound(liftFromKg(+last.kg))):"0";
        const repPh=last&&+last.reps>0?String(last.reps):"0";
        const stepRow=el("div","sla-steps");
        stepRow.appendChild(stepper(liftLbl(),kgDisp,liftStep(),v=>{ st.kg=(v===""||v==null)?"":kgFromLift(+v); },kgPh));
        stepRow.appendChild(stepper("Reps",st.reps,1,v=>st.reps=v,repPh));
        r.appendChild(stepRow);

        if(!st.warmup){
          const rirWrap=el("div","sla-rir-wrap");
          const rirToggle=el("button","sla-rir-toggle"+(st.rir?" active":""),
            "EFFORT"+(st.rir?` — ${st.rir==="F"?"Fail":st.rir+" left"}`:" ›"));
          rirWrap.appendChild(rirToggle);
          const rirRow=el("div","sla-rir-row"+(st.rir?" open":""));
          [[" ⓘ ","info"],["0","0"],["1","1"],["2","2"],["3+","3+"],["Fail","F"]].forEach(([lbl,v])=>{
            if(v==="info"){
              const info=el("button","rir-info-btn",lbl);
              info.dataset.info="rir"; if(typeof bindInfo==="function")bindInfo(info);
              rirRow.appendChild(info); return;
            }
            const chip=el("button","rir-chip"+(st.rir===v?" on":""),lbl);
            chip.addEventListener("click",()=>{
              st.rir=(st.rir===v?null:v);
              rirRow.querySelectorAll(".rir-chip").forEach(x=>x.classList.remove("on"));
              if(st.rir===v)chip.classList.add("on");
              rirToggle.textContent="EFFORT"+(st.rir?` — ${st.rir==="F"?"Fail":st.rir+" left"}`:" ›");
              rirToggle.classList.toggle("active",!!st.rir);
              persistLive();
            });
            rirRow.appendChild(chip);
          });
          rirToggle.addEventListener("click",()=>rirRow.classList.toggle("open"));
          rirWrap.appendChild(rirRow);
          r.appendChild(rirWrap);
        }

        const comp=el("button","sla-complete","✓  LOG SET "+(si+1));
        comp.addEventListener("click",()=>{
          const hasKg=!(st.kg===""||st.kg==null)&&+st.kg>0;
          const hasReps=!(st.reps===""||st.reps==null)&&+st.reps>0;
          if(!hasKg&&!hasReps){ toast("ENTER WEIGHT OR REPS FIRST."); return; }
          if(st.reps===""||st.reps==null||+st.reps===0){ st.reps=last&&last.reps?last.reps:(+st.reps||0); }
          st.done=true;
          const ssm=ssMembers(xi); const rsec=(ex.restSec!=null?ex.restSec:liveSession.restSec);
          const skip=ssm&&!ssm.isLast;
          if(!skip&&rsec>0) startREST(rsec);
          if(navigator.vibrate) try{navigator.vibrate(12);}catch(e){}
          const nxt=ex.sets.findIndex((s,i)=>i>si&&!s.done); ex._active=nxt>=0?nxt:null;
          paint(); updateLiveProg(); persistLive();
        });
        r.appendChild(comp);
        wrap.appendChild(r);

      } else {
        const r=el("div","sl-row todo");
        const kg=(+st.kg>0)?liftStr(+st.kg):"—";
        const tgt=(st.reps&&+st.reps>0)?st.reps:(last&&last.reps?last.reps:"—");
        r.innerHTML=`<span class="sl-sn">${st.warmup?"W":si+1}</span><span class="sl-val">${kg} × ${tgt}</span><span class="sl-chk"></span>`;
        r.addEventListener("click",()=>{ ex._active=si; paint(); });
        wrap.appendChild(r);
      }
    });
  }
  paint();
  return wrap;
}

/* ⋯ menu — rest + notes now inside */
function openMOVEMenu(ex,xi){
  const isFW=FW_BY_NAME[ex.name];
  openModal(`<h3 style="margin-bottom:14px">${esc(ex.name)}</h3>
    <div class="menu-list">
      <button class="menu-item" data-a="fav">${isFav(ex.name)?"★ REMOVE from favourites":"☆ SAVE SESSION"}</button>
      <button class="menu-item" data-a="info">ⓘ FORM GUIDE</button>
      ${!ex.home?`<button class="menu-item" data-a="swap">🔄 SWAP exercise</button>`:""}
      <button class="menu-item" data-a="warm">🔥 ADD WARM-UP</button>
      <button class="menu-item" data-a="usual">📌 Set usual weight &amp; reps${usualFor(ex.name)?" · SET":""}</button>
      ${isFW?`<button class="menu-item" data-a="plates">⚖️ PLATES</button>`:""}
      <button class="menu-item" data-a="rest">⏱️ REST TIMER${ex.restSec!=null?` · ${ex.restSec===0?"off":ex.restSec+"s"}`:` · ${liveSession.restSec===0?"off":liveSession.restSec+"s"} (session)`}</button>
      <button class="menu-item" data-a="notes">📝 SESSION notes${liveSession.notes?" · added":""}</button>
      <button class="menu-item danger" data-a="remove">× REMOVE MOVE</button>
    </div>`);
  const act=(a)=>{
    if(a==="fav"){ toggleFav(ex.name); closeModal(); renderLive(); return; }
    if(a==="info"){ closeModal(); ex.home?showHOMEHowTo(ex.home):showHowTo(ex.name); return; }
    if(a==="swap"){ closeModal(); swapMOVE(xi); return; }
    if(a==="warm"){ closeModal(); genWarmups(ex); return; }
    if(a==="usual"){ closeModal(); openSetUsual(ex); return; }
    if(a==="plates"){ closeModal(); openPlateCalc(ex); return; }
    if(a==="rest"){ closeModal(); openMOVEREST(ex); return; }
    if(a==="notes"){ closeModal(); openSessionNotes(); return; }
    if(a==="remove"){ closeModal(); removeLiveMOVE(xi); return; }
  };
  $("#modal").querySelectorAll("[data-a]").forEach(btn=>btn.addEventListener("click",()=>act(btn.dataset.a)));
}

function openSetUsual(ex){
  const u=usualFor(ex.name)||{kg:"",reps:""};
  const unit=(typeof liftUnit==="function"&&liftUnit()==="lb")?"lb":"kg";
  const kgShown=(u.kg!==""&&u.kg!=null)?(typeof liftFromKg==="function"?liftRound(liftFromKg(+u.kg)):u.kg):"";
  openModal(`<h3>DEFAULTS FOR ${esc(ex.name)}</h3>
    <p class="muted tiny" style="line-height:1.5;margin-bottom:14px">Set the weight &amp; reps you usually aim for. Future workouts pre-fill from these.</p>
    <div class="row" style="gap:10px">
      <div class="field" style="flex:1"><label>DEFAULT WEIGHT (${unit})</label><input class="input" id="usual_kg" type="number" inputmode="decimal" placeholder="—" value="${kgShown}"></div>
      <div class="field" style="flex:1"><label>DEFAULT REPS</label><input class="input" id="usual_reps" type="number" inputmode="numeric" placeholder="—" value="${(u.reps!==""&&u.reps!=null)?u.reps:""}"></div>
    </div>
    <button class="btn str block" id="usual_save">SAVE DEFAULTS</button>
    ${usualFor(ex.name)?`<button class="btn ghost block" id="usual_clear" style="margin-top:10px">CLEAR DEFAULTS</button>`:""}`);
  $("#usual_save").addEventListener("click",()=>{
    const rawKg=$("#usual_kg").value.trim(), reps=$("#usual_reps").value.trim();
    let kg=rawKg;
    if(rawKg!==""&&typeof kgFromLift==="function") kg=kgFromLift(+rawKg);
    setUsual(ex.name,kg===""?"":kg,reps===""?"":reps);
    (ex.sets||[]).forEach(s=>{ if(!s.done){ const v=prefillValues(ex.name); if(s.kg===""||s.kg==null)s.kg=v.kg; if(s.reps===""||s.reps==null)s.reps=v.reps; } });
    persistLive(); closeModal(); toast("DEFAULTS SAVED."); renderLive();
  });
  const clr=$("#usual_clear"); if(clr)clr.addEventListener("click",()=>{ setUsual(ex.name,"",""); closeModal(); toast("DEFAULTS CLEARED."); renderLive(); });
}

function removeLiveMOVE(xi){
  const ex=liveSession.moves[xi]; if(!ex)return;
  const nm=ex.cardio?(ex.name||"this cardio"):(ex.name||"this exercise");
  const logged=!ex.cardio&&(ex.sets||[]).some(s=>s.done);
  confirmModal({title:"REMOVE MOVE?",danger:true,confirmText:"REMOVE",
    body:`REMOVE ${nm} from this workout?${logged?" ALL sets you've ticked off for it will be lost.":""}`,
    onCONFIRM:()=>{ liveSession.moves.splice(xi,1); renderLive(); toast("REMOVEd"); }});
}

function setSummary(ex,st){
  const kg=(st.kg!==""&&st.kg!=null)?liftStr(+st.kg):"";
  const reps=(st.reps!==""&&st.reps!=null&&+st.reps>0)?(+st.reps):"";
  if(kg&&reps!=="") return `${kg} × ${reps}`;
  if(kg) return kg;
  if(reps!=="") return `${reps} reps`;
  return "";
}
function buildSetBlock(ex,st,si){
  const block=el("div","set-block");
  function paint(){
    block.className="set-block"+(st.done?" done":"")+(st.warmup?" warmup":"");
    block.innerHTML="";
    const head=el("div","sb-top");
    head.innerHTML=`<span class="sl">${st.warmup?"WARM-UP":"SET "+(si+1)}${st.warmup?'<span class="warm-tag">prep</span>':""}</span>`;
    block.appendChild(head);

    if(st.done){
      const sum=el("div","sb-summary");
      const s=setSummary(ex,st);
      sum.innerHTML=`<span class="sv">${s||"Completed ✓"}</span>${(st.rir&&!st.warmup)?`<span class="sb-rir">RIR ${st.rir==="F"?"Failure":st.rir}</span>`:""}`;
      block.appendChild(sum);
      const btn=el("button","sb-complete done","✓  DONE — TAP TO UNDO");
      btn.addEventListener("click",()=>{ st.done=false; paint(); updateLiveProg(); persistLive(); });
      block.appendChild(btn);
      return;
    }

    const grid=el("div","sb-grid");
    const kgDisp=(st.kg===""||st.kg==null)?"":liftRound(liftFromKg(+st.kg));
    const last=lastSetFor(ex.name);
    const kgPh=last&&+last.kg>0?String(liftRound(liftFromKg(+last.kg))):"0";
    const repPh=last&&+last.reps>0?String(last.reps):"0";
    grid.appendChild(stepper(liftLbl(),kgDisp,liftStep(),v=>{ st.kg=(v===""||v==null||v==="")?"":kgFromLift(+v); },kgPh));
    grid.appendChild(stepper("REPS",st.reps,1,v=>st.reps=v,repPh));
    block.appendChild(grid);

    if(!st.warmup){
      const rir=el("div","rir-row");
      rir.innerHTML=`<span class="rl">EFFORT ${infoBtn("rir")}</span>`;
      [["0","0"],["1","1"],["2","2"],["3","3+"],["F","Fail"]].forEach(([v,lbl])=>{
        const chip=el("button","rir-chip"+(st.rir===v?" on":""),lbl);
        chip.addEventListener("click",()=>{ st.rir=(st.rir===v?null:v); rir.querySelectorAll(".rir-chip").forEach(x=>x.classList.remove("on")); if(st.rir===v)chip.classList.add("on"); });
        rir.appendChild(chip);
      });
      block.appendChild(rir); bindInfo(rir);
    }

    const btn=el("button","sb-complete","◯  LOG SET");
    btn.addEventListener("click",()=>{
      const hasKg=!(st.kg===""||st.kg==null)&&+st.kg>0;
      const hasReps=!(st.reps===""||st.reps==null)&&+st.reps>0;
      if(!hasKg&&!hasReps){ toast("ENTER WEIGHT OR REPS FIRST."); return; }
      st.done=true;
      const ss=ssMembers(liveSession.moves.indexOf(ex));
      const rsec=(ex.restSec!=null?ex.restSec:liveSession.restSec);
      const skip=ss&&!ss.isLast;
      if(!skip&&rsec>0) startREST(rsec);
      if(navigator.vibrate) try{navigator.vibrate(12);}catch(e){}
      paint(); updateLiveProg(); persistLive();
    });
    block.appendChild(btn);
  }
  paint();
  return block;
}

function stepper(cap,val,step,onset,ph){
  const wrap=el("div","stepper");
  wrap.innerHTML=`<div class="cap">${cap}</div>`;
  const ctl=el("div","ctl");
  const minus=el("button","",""); minus.textContent="–";
  const inp=el("input"); inp.type="number"; inp.inputMode="decimal"; inp.value=val; inp.placeholder=ph||"0";
  const plus=el("button","",""); plus.textContent="+";
  const setv=v=>{ if(v<0)v=0; v=Math.round(v*100)/100; inp.value=v===0?"":v; onset(inp.value); };
  holdRepeat(minus,()=>setv((+inp.value||0)-step));
  holdRepeat(plus,()=>setv((+inp.value||0)+step));
  inp.addEventListener("input",()=>onset(inp.value));
  ctl.append(minus,inp,plus); wrap.appendChild(ctl);
  return wrap;
}
function showHOMEHowTo(h){
  openModal(`<h3>${esc(h.n)}</h3><div class="eyebrow">${h.t} · how to</div>
    <div class="howto-block move"><div class="lab">How to do it</div><p>${esc(h.d)}</p></div>
    <div class="howto-block cue"><div class="lab">Suggested</div><p>${esc(h.reps)}</p></div>
    <button class="btn block" id="ht_close" style="margin-top:16px">GOT IT</button>`);
  $("#ht_close").addEventListener("click",closeModal);
}

/* ---------- REST TIMER ---------- */
let restState=null, restTick=null, audioCtx=null;
function unlockAudio(){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended")audioCtx.resume();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    g.gain.value=0; o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+0.01);
  }catch(e){}
}
function startREST(sec){
  stopREST();
  restState={total:sec,left:sec};
  $("#restBar").classList.remove("hidden");
  paintREST();
  restTick=setInterval(()=>{
    restState.left--; 
    if(restState.left<=0){ stopREST(); restAlert(); }
    else paintREST();
  },1000);
}
function paintREST(){
  const s=restState; if(!s)return;
  const pct=s.left/s.total;
  $("#restBar").innerHTML=`<div class="rest-card">
     <div class="rest-ring">${ringSVG(pct,"#FF6A2C",62)}<div class="t">${s.left}</div></div>
     <div class="ri"><div class="l">REST</div><div class="b">${s.left}s of ${s.total}s</div></div>
     <button class="btn sm" id="rest_add">+15s</button>
     <button class="btn sm str" id="rest_skip">SKIP REST</button></div>`;
  $("#rest_add").addEventListener("click",()=>{restState.left+=15;restState.total+=15;paintREST();});
  $("#rest_skip").addEventListener("click",stopREST);
}
function stopREST(){ if(restTick)clearInterval(restTick); restTick=null; restState=null; const rb=$("#restBar"); if(rb){rb.classList.add("hidden");rb.innerHTML="";} }
function restAlert(){
  if(DATA.prefs.restFlash!==false) flashScreen();
  if(DATA.prefs.restBeep!==false) beep();
  toast("REST DONE. MOVE.");
}
function flashScreen(){const f=$("#flash");f.classList.remove("go");void f.offsetWidth;f.classList.add("go");}
function beep(){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended")audioCtx.resume();
    const now=audioCtx.currentTime;
    [0,0.28,0.56].forEach(t=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type="sine"; o.frequency.value=880;
      g.gain.setValueAtTime(0.0001,now+t);
      g.gain.exponentialRampToValueAtTime(0.4,now+t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,now+t+0.22);
      o.connect(g).connect(audioCtx.destination); o.start(now+t); o.stop(now+t+0.24);
    });
  }catch(e){}
}

/* ---------- FINISH & SAVE ---------- */
function finishSESSION(){
  const s=liveSession; if(!s)return;
  let doneSets=0;
  s.moves.forEach(ex=>ex.sets.forEach(st=>{ if(st.done && !st.warmup && +st.kg>0 && +st.reps>0) doneSets++; }));
  if(doneSets===0){
    confirmModal({title:"END SESSION with no sets?",confirmText:"END SESSION anyway",
      body:"You haven't ticked any sets as done, so this won't count volume or PRs.",
      onCONFIRM:()=>saveSESSION(s)});
    return;
  }
  saveSESSION(s);
}
function saveSESSION(s){
  let volume=0; const prs=[];
  s.moves.forEach(ex=>{
    let best=0;
    ex.sets.forEach(st=>{ if(st.done && !st.warmup && +st.kg>0 && +st.reps>0){ volume+=(+st.kg)*(+st.reps); best=Math.max(best,+st.kg);} });
    if(best>0){
      const prev=DATA.ach.prs[ex.name]||0;
      if(best>prev){ DATA.ach.prs[ex.name]=best; if(prev>0)prs.push({name:ex.name,kg:best,prev}); }
      else if(!(ex.name in DATA.ach.prs)){ DATA.ach.prs[ex.name]=best; }
    }
  });
  let topKg=0, topName="";
  s.moves.forEach(ex=>ex.sets.forEach(st=>{ if(st.done&&!st.warmup&&+st.kg>topKg){topKg=+st.kg;topName=ex.name;} }));
  const wk={id:Date.now(),date:todayISO(),title:s.title,type:s.type,
    durationMin: s.startedAt?Math.max(1,Math.round((Date.now()-s.startedAt)/60000)):null,
    notes:(s.notes||"").trim(),
    topKg, topName,
    moves:s.moves.filter(e=>!e.cardio).map(e=>({name:e.name,group:e.group,sets:e.sets.filter(x=>x.done).map(x=>({kg:+x.kg||0,reps:+x.reps||0,warmup:!!x.warmup,rir:x.rir||null}))})),
    volume,prs};
  DATA.workouts.push(wk);
  DATA.ach.workoutsDONE.++;
  DATA.ach.totalTOTAL LOAD+=volume;
  updateSTREAK(wk.date);
  /* mark planned day complete */
  if(plannedDAYRef && DATA.weeklyPlan && DATA.weeklyPlan.days[plannedDAYRef.dn]){
    DATA.weeklyPlan.days[plannedDAYRef.dn].done=true;
  }
  plannedDAYRef=null;
  const newBadges=checkBadges();
  save();
  stopREST(); $("#live").classList.remove("on"); liveSession=null; clearLive();
  switchTab("home");
  showEND SESSIONSummary(wk,prs,newBadges);
}
function updateSTREAK(date){
  const last=DATA.ach.lastSESSIONDate;
  if(last===date){/* same day, keep streak */}
  else{
    const y=new Date(date); y.setDate(y.getDate()-1); const yISO=todayISO(y);
    if(last===yISO) DATA.ach.streak++;
    else DATA.ach.streak=1;
    DATA.ach.lastSESSIONDate=date;
  }
  DATA.ach.bestSTREAK=Math.max(DATA.ach.bestSTREAK,DATA.ach.streak);
}
function showEND SESSIONSummary(wk,prs,badges){
  const showAch=DATA.prefs.showAchievements!==false;
  openModal(`<div class="fin-hero"><div class="fin-check">✓</div>
      <div class="fin-t">SESSION complete</div>
      <div class="fin-s">${esc(wk.title)}${wk.durationMin?` · ${wk.durationMin} min`:""}</div></div>
    <div class="grid2" style="margin:14px 0 12px">
      <div class="stat"><div class="k">TOTAL LOAD</div><div class="v num">${volStr(wk.volume)}</div></div>
      <div class="stat"><div class="k">MOVEs</div><div class="v">${wk.moves.length}</div></div>
    </div>
    ${showAch&&prs.length?`<div class="banner"><div class="bx">🏅 <b>${prs.length} new personal record${prs.length>1?"s":""}!</b><br>${prs.map(p=>esc(p.name)+" — "+liftStr(p.kg)).join("<br>")}</div></div>`:""}
    ${showAch&&badges.length?`<div class="banner"><div class="bx">${badges.map(b=>b.icon+" <b>"+b.t+"</b> unlocked").join("<br>")}</div></div>`:""}
    <p class="muted tiny" style="margin:6px 0 14px">${showAch?`Current streak: ${dispSESSIONSTREAK()} day${dispSESSIONSTREAK()===1?"":"s"} · ${dispSESSIONS()} total workouts`:`${dispSESSIONS()} total workouts logged`}</p>
    <button class="btn str block" id="fs_close">DONE.</button>
    <button class="btn ghost block" id="fs_share" style="margin-top:10px">📸 Share summary card</button>`);
  $("#fs_close").addEventListener("click",closeModal);
  $("#fs_share").addEventListener("click",()=>makeFlexCard(wk,prs,badges));
}
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}
function makeFlexCard(wk,prs,badges){
  const draw=()=>{
  const W=1080,H=1350; const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const x=cv.getContext("2d");
  const BEBAS=`"Bebas Neue", Impact, sans-serif`, INTER=`"Inter", system-ui, sans-serif`;
  const g=x.createLinearGradient(0,0,W,H); g.addColorStop(0,"#15100b"); g.addColorStop(.55,"#0c0f17"); g.addColorStop(1,"#0a1411");
  x.fillStyle=g; x.fillRect(0,0,W,H);
  const rg=x.createRadialGradient(160,180,0,160,180,560); rg.addColorStop(0,"rgba(255,106,44,.55)"); rg.addColorStop(1,"rgba(255,106,44,0)");
  x.fillStyle=rg; x.fillRect(0,0,W,H);
  const rg2=x.createRadialGradient(W-120,H-180,0,W-120,H-180,620); rg2.addColorStop(0,"rgba(47,230,168,.42)"); rg2.addColorStop(1,"rgba(47,230,168,0)");
  x.fillStyle=rg2; x.fillRect(0,0,W,H);
  x.textAlign="left";
  /* brand wordmark in Bebas to match the app */
  x.fillStyle="#fff"; x.font=`96px ${BEBAS}`; x.fillText("EVOLVE", 78, 158);
  x.fillStyle="rgba(255,255,255,.6)"; x.font=`600 28px ${INTER}`; x.fillText("NO EXCUSES. NO SHORTCUTS.", 82, 202);
  x.fillStyle="#fff";
  const title=(wk.title||"SESSION").toUpperCase();
  let tsize=108; x.font=`${tsize}px ${BEBAS}`;
  while(x.measureText(title).width > W-156 && tsize>52){ tsize-=4; x.font=`${tsize}px ${BEBAS}`; }
  x.fillText(title, 78, 350);
  x.fillStyle="rgba(255,255,255,.55)"; x.font=`600 34px ${INTER}`; x.fillText(prettyDate(wk.date), 82, 404);
  /* 2x2 stat grid */
  const pad=78, gap=28, cardW=(W-pad*2-gap)/2, cardH=210, top=470;
  function cell(cx,cy,label,val,accent){
    x.fillStyle="rgba(255,255,255,.06)"; rr(x,cx,cy,cardW,cardH,30); x.fill();
    x.fillStyle="rgba(255,255,255,.55)"; x.font=`700 28px ${INTER}`; x.textAlign="left"; x.fillText(label,cx+34,cy+62);
    x.fillStyle=accent||"#FF6A2C"; x.font=`96px ${BEBAS}`; x.fillText(val,cx+32,cy+162);
  }
  cell(pad,        top,          "TOTAL VOLUME", volStr(wk.volume), "#FF6A2C");
  cell(pad+cardW+gap, top,       "EXERCISES", String(wk.moves.length), "#5AA9FF");
  cell(pad,        top+cardH+gap,"TOP LIFT", wk.topKg?liftStr(wk.topKg):"—", "#2FE6A8");
  cell(pad+cardW+gap, top+cardH+gap, wk.durationMin?"DURATION":"PRS", wk.durationMin?wk.durationMin+" MIN":String(prs.length), "#FFC857");
  /* PR / streak ribbon */
  let ry=top+cardH*2+gap*2+30;
  x.fillStyle="rgba(255,255,255,.06)"; rr(x,pad,ry,W-pad*2,150,30); x.fill();
  x.textAlign="left"; x.fillStyle="rgba(255,255,255,.55)"; x.font=`700 28px ${INTER}`; x.fillText("THIS SESSION",pad+34,ry+58);
  x.fillStyle="#fff"; x.font=`600 34px ${INTER}`;
  const ribbon = (prs.length?`🏅 ${prs.length} PR${prs.length>1?"s":""}   `:"")+`🔥 ${dispSESSIONSTREAK()} day streak   💪 ${dispSESSIONS()} total`;
  x.fillText(ribbon, pad+34, ry+112);
  x.fillStyle="rgba(255,255,255,.4)"; x.font=`600 28px ${INTER}`; x.textAlign="center";
  x.fillText("Created with Evolve", W/2, H-64);
  const url=cv.toDataURL("image/png");
  openModal(`<h3>Your summary card 📸</h3>
    <img src="${url}" style="width:100%;border-radius:14px;margin:8px 0 12px">
    <button class="btn str block" id="fc_share">⬇️ SAVE / share image</button>
    <p class="muted tiny center" style="margin:10px 2px 0">Tip: tap above to add it to Photos or share it — or just screenshot this card.</p>
    <button class="btn ghost block" id="fc_close" style="margin-top:12px">CLOSE</button>`);
  $("#fc_close").addEventListener("click",()=>showEND SESSIONSummary(wk,prs,badges||[]));
  $("#fc_share").addEventListener("click",async()=>{
    try{
      const blob=await (await fetch(url)).blob();
      const file=new File([blob],`evolve-${wk.date}.png`,{type:"image/png"});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title:"My Evolve workout"});
        return;
      }
    }catch(e){ if(e&&e.name==="AbortError") return; }
    /* fallback: open the image full-screen so it can be long-pressed → SAVE to Photos */
    try{ const w=window.open(); if(w){ w.document.write(`<img src="${url}" style="width:100%">`); w.document.title="Evolve card"; return; } }catch(e){}
    /* last resort (desktop): direct download */
    try{ const a=document.createElement("a"); a.href=url; a.download=`evolve-${wk.date}.png`; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ toast("Screenshot this card to save it"); }
  });
  };
  /* wait for web fonts so the card text renders in the brand fonts, not a fallback */
  if(document.fonts && document.fonts.ready){
    Promise.race([document.fonts.ready, new Promise(r=>setTimeout(r,800))]).then(draw);
  } else draw();
}

/* ===================== FUEL SCREEN ===================== */
/* Meals: each logged food carries a `meal` (breakfast/lunch/dinner/snack) and a
   `time` timestamp. Legacy items (no meal) are sorted by their timestamp. */
const MEALS=[
  {id:"breakfast",name:"BREAKFAST",ic:"🌅"},
  {id:"lunch",    name:"LUNCH",    ic:"☀️"},
  {id:"dinner",   name:"DINNER",   ic:"🌙"},
  {id:"snack",    name:"SNACKs",   ic:"🍿"}
];
function mealById(id){return MEALS.find(m=>m.id===id)||MEALS[3];}
function suggestMeal(d){const h=(d||new Date()).getHours(); if(h<11)return"breakfast"; if(h<15)return"lunch"; if(h<21)return"dinner"; return"snack";}
function mealOf(f){ if(f && f.meal && MEALS.some(m=>m.id===f.meal)) return f.meal; return suggestMeal(f&&f.time?new Date(f.time):new Date()); }
function mealClock(ts){ if(ts==null)return""; const d=new Date(ts); if(isNaN(d.getTime()))return""; let h=d.getHours(),m=d.getMinutes(); const ap=h<12?"AM":"PM"; let h12=h%12; if(h12===0)h12=12; return h12+":"+String(m).padGO(2,"0")+" "+ap; }
function nowHHMM(){const d=new Date();return String(d.getHours()).padGO(2,"0")+":"+String(d.getMinutes()).padGO(2,"0");}
function clockHHMM(ts){const d=ts?new Date(ts):new Date();return String(d.getHours()).padGO(2,"0")+":"+String(d.getMinutes()).padGO(2,"0");}
function tsFromTime(iso,hhmm){const p=(iso||todayISO()).split("-").map(Number);const t=(hhmm||"12:00").split(":").map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1,t[0]||0,t[1]||0,0,0).getTime();}
/* meal picker (chips) + an OPTIONAL time field, shown only in "meal times On" mode */
function mealPickerHTML(selMeal,timeVal){
  const timeField = DATA.prefs.mealTimes
    ? `<div class="field"><label>Time</label><input class="input num" id="meal_time" type="time" value="${timeVal}"></div>` : "";
  return `<div class="field"><label>Meal</label>
    <div class="row wrap" id="meal_pick" style="gap:7px">${MEALS.map(m=>`<button class="chip sm ${m.id===selMeal?"on":""}" data-m="${m.id}">${m.ic} ${m.name}</button>`).join("")}</div></div>
    ${timeField}`;
}
function wireMealPicker(){ const r=$("#modal"); if(!r)return; r.querySelectorAll("#meal_pick [data-m]").forEach(b=>b.addEventListener("click",()=>{ r.querySelectorAll("#meal_pick [data-m]").forEach(x=>x.classList.remove("on")); b.classList.add("on"); })); }
function readMeal(){ const on=$("#modal")&&$("#modal").querySelector("#meal_pick .on"); return on?on.dataset.m:"snack"; }
/* resolve the timestamp to store: device "now" in fast mode, or the chosen time when meal-times is On */
function readMealTime(fallbackHHMM){
  if(DATA.prefs.mealTimes && $("#meal_time")) return tsFromTime(viewDate,$("#meal_time").value||fallbackHHMM||nowHHMM());
  return tsFromTime(viewDate,fallbackHHMM||nowHHMM());
}

/* favourite foods (★) */
function isFavFood(name){ return (DATA.favFoods||[]).includes(name); }
function toggleFavFood(name){ if(!DATA.favFoods)DATA.favFoods=[]; const i=DATA.favFoods.indexOf(name); if(i>=0)DATA.favFoods.splice(i,1); else DATA.favFoods.unshift(name); save(); }

/* recent & frequent foods — derived from the log, no extra storage.
   score = recency rank + frequency, so regulars and just-eaten items surface. */
function recentFoods(limit){
  const stat={}; /* name -> {last, count} */
  const logs=DATA.log||{};
  Object.keys(logs).forEach(date=>{
    (logs[date].food||[]).forEach(f=>{
      if(!f||!f.name)return;
      const t=f.time||tsFromTime(date,"12:00");
      const s=stat[f.name]||(stat[f.name]={last:0,count:0});
      s.count++; if(t>s.last)s.last=t;
    });
  });
  const known=new Set(allFoods().map(f=>f[0])); /* only re-loggable foods */
  return Object.keys(stat).filter(n=>known.has(n))
    .sort((a,b)=> (stat[b].last-stat[a].last) || (stat[b].count-stat[a].count))
    .slice(0,limit||8);
}

/* "QUICK ADD" — the foods you log most often (ranked by count, then recency).
   Optionally scoped to a meal so each meal section can show its own usuals. */
function usualFoods(limit, mealId){
  const stat={}; const logs=DATA.log||{};
  Object.keys(logs).forEach(date=>{
    (logs[date].food||[]).forEach(f=>{
      if(!f||!f.name)return;
      if(mealId && mealOf(f)!==mealId) return;
      const t=f.time||tsFromTime(date,"12:00");
      const s=stat[f.name]||(stat[f.name]={last:0,count:0});
      s.count++; if(t>s.last)s.last=t;
    });
  });
  const known=new Set(allFoods().map(f=>f[0]));
  return Object.keys(stat).filter(n=>known.has(n))
    .sort((a,b)=> (stat[b].count-stat[a].count) || (stat[b].last-stat[a].last))
    .slice(0,limit||10);
}
/* the grams you last logged for a food (so re-logging defaults to your portion, not 100g) */
function lastPortion(name){
  let best=null, bestT=-1; const logs=DATA.log||{};
  Object.keys(logs).forEach(date=>{
    (logs[date].food||[]).forEach(f=>{
      if(f&&f.name===name){ const t=f.time||tsFromTime(date,"12:00"); if(t>bestT){bestT=t;best=f;} }
    });
  });
  return (best&&best.grams>0)?best.grams:100;
}
/* the meal you most often log a food into (falls back to time-of-day) */
function usualMealFor(name){
  const c={}; const logs=DATA.log||{};
  Object.keys(logs).forEach(date=>{ (logs[date].food||[]).forEach(f=>{ if(f&&f.name===name){ const m=mealOf(f); c[m]=(c[m]||0)+1; } }); });
  let best=null,bn=0; Object.keys(c).forEach(m=>{ if(c[m]>bn){bn=c[m];best=m;} });
  return best||suggestMeal();
}
/* one-tap re-log: add a food at your last-used portion, with an UNDO */
function logFoodQuick(name, meal){
  const f=allFoods().find(x=>x[0]===name); if(!f){toast("Food not found");return;}
  const g=lastPortion(name), r=g/100;
  const mealId=meal||usualMealFor(name);
  const entry={name, grams:g, kcal:f[1]*r, p:f[2]*r, c:f[3]*r, f:f[4]*r, meal:mealId, time:Date.now()};
  const L=dayLog(viewDate); L.food.push(entry); save(); renderFUEL();
  toastUNDO(`ADDED. ${name.split(",")[0]} · ${g}g`, ()=>{ const LL=dayLog(viewDate); const ix=LL.food.lastIndexOf(entry); const jx=ix>=0?ix:LL.food.indexOf(entry); if(jx>=0)LL.food.splice(jx,1); save(); renderFUEL(); });
}

/* coloured macro string — letters match the tracking rings: P orange, C blue, F gold */
function macroHTML(p,c,f){
  return `<span style="color:#FF6A2C;font-weight:700">P${p}</span> <span style="color:#5AA9FF;font-weight:700">C${c}</span> <span style="color:#FFC857;font-weight:700">F${f}</span>`;
}

/* Quick goal + activity editor — recomputes targets without a reset.
   Reachable from the FUEL tab; the full profile editor lives in SETTINGS. */
function openGOALActivity(){
  const p=DATA.profile;
  if(!p){ openSetup(false); return; }
  /* targets can only be calculated with valid height, weight and age —
     without them every goal floors at the 1200 minimum and nothing changes */
  const incomplete = !(p.weightKg>0) || !(p.heightCm>0) || !(p.age>0);
  let mode = DATA.prefs.targetMode==="manual" ? "manual" : "auto";
  openModal(`
    <h3>DAILY targets</h3>
    <div class="seg" id="ga_mode" style="margin-bottom:14px">
      <button data-v="auto" class="${mode==="auto"?"on":""}">Auto</button>
      <button data-v="manual" class="${mode==="manual"?"on":""}">Manual</button>
    </div>
    <div id="ga_modebody"></div>
  `);
  segBind("ga_mode");
  function renderMode(){
    const host=$("#ga_modebody");
    if(mode==="auto"){
      host.innerHTML=`
        ${incomplete?`<div class="card" style="border:1px solid #FFC857;background:rgba(255,200,87,.08);margin-bottom:14px">
           <p class="tiny" style="line-height:1.55">⚠️ Your targets can't be calculated yet — your <b>height, weight or age is missing</b>, so every goal shows the same minimum (${eVal(1200)} ${eUnit()}). Add those details, or switch to <b>Manual</b> to set your own numbers.</p>
           <button class="btn str block" id="ga_fix" style="margin-top:10px">Update my details</button></div>`:``}
        <p class="muted tiny" style="margin-bottom:16px">Evolve works out your calories &amp; macros from your goal. Change these any time — your food log and history are <b>not</b> affected.</p>
        <div class="field"><label>GOAL</label>
          <div class="seg" id="ga_goal">${Object.entries(GOALS).map(([k,v])=>`<button data-v="${k}" class="${p.goal===k?"on":""}">${v.l}</button>`).join("")}</div></div>
        <div class="field"><label>ACTIVITY</label>
          <select class="input" id="ga_act">${Object.entries(ACT).map(([k,v])=>`<option value="${k}" ${p.activity===k?"selected":""}>${v.l}</option>`).join("")}</select></div>
        <div class="card" id="ga_preview" style="margin:4px 0 14px"></div>
        <button class="btn str block" id="ga_save">SAVE &amp; update targets</button>`;
      segBind("ga_goal");
      if(incomplete){ const f=$("#ga_fix"); if(f) f.addEventListener("click",()=>{ closeModal(); openSetup(false); }); }
      function preview(){
        const goal=segVal("ga_goal")||p.goal, activity=$("#ga_act").value||p.activity;
        const t=computeTargets({...p,goal,activity});
        $("#ga_preview").innerHTML=`<div class="tiny muted" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">New daily targets</div>
          <div class="row" style="justify-content:space-around;text-align:center">
            <div><div class="num" style="font-weight:800;font-size:21px">${eVal(t.calories)}</div><div class="tiny muted">${eUnit()}</div></div>
            <div><div class="num" style="font-weight:800;font-size:21px;color:#FF6A2C">${t.protein}<small>g</small></div><div class="tiny muted">protein</div></div>
            <div><div class="num" style="font-weight:800;font-size:21px;color:#5AA9FF">${t.carbs}<small>g</small></div><div class="tiny muted">carbs</div></div>
            <div><div class="num" style="font-weight:800;font-size:21px;color:#FFC857">${t.fat}<small>g</small></div><div class="tiny muted">fat</div></div>
          </div>`;
      }
      preview();
      $("#ga_goal").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",preview));
      $("#ga_act").addEventListener("change",preview);
      $("#ga_save").addEventListener("click",()=>{
        p.goal=segVal("ga_goal")||p.goal;
        p.activity=$("#ga_act").value||p.activity;
        DATA.targets=computeTargets(p);
        DATA.prefs.targetMode="auto";
        save(); closeModal(); renderFUEL();
        toast("Targets updated 🎯");
      });
    } else {
      /* manual — full control of calories + protein/carbs/fat */
      const t=DATA.targets||computeTargets(incomplete?{...p,weightKg:p.weightKg||70,heightCm:p.heightCm||175,age:p.age||30}:p);
      const isKj=DATA.prefs.energy==="kj";
      const calShown = isKj ? Math.round((t.calories||0)*4.184) : Math.round(t.calories||0);
      const FOCI={
        muscle:{l:"BUILD",p:.30,c:.45,f:.25},
        lean:{l:"CUT",p:.40,c:.30,f:.30},
        energy:{l:"More energy",p:.25,c:.55,f:.20},
        balanced:{l:"Balanced",p:.30,c:.40,f:.30}
      };
      host.innerHTML=`
        <p class="muted tiny" style="margin-bottom:16px">Set your own numbers — Evolve won't change them. Switch back to <b>Auto</b> any time to use the calculated targets again.</p>
        <div class="field"><label>DAILY calories (${eUnit()})</label>
          <input class="input num" id="m_cal" type="number" inputmode="numeric" value="${calShown}" placeholder="2200"></div>
        <div class="field"><label>Auto-fill macros for…</label>
          <div class="row wrap" id="m_focus" style="gap:7px">${Object.entries(FOCI).map(([k,v2])=>`<button class="chip sm" data-foc="${k}">${v2.l}</button>`).join("")}</div>
          <div class="tiny muted" style="margin-top:6px">Pick a focus and your protein, carbs &amp; fat fill in from your calories. You can still tweak any number after.</div></div>
        <div class="grid2">
          <div class="field"><label>PROTEIN (g)</label><input class="input num" id="m_p" type="number" inputmode="numeric" value="${Math.round(t.protein||0)}"></div>
          <div class="field"><label>CARBS (g)</label><input class="input num" id="m_c" type="number" inputmode="numeric" value="${Math.round(t.carbs||0)}"></div>
        </div>
        <div class="field"><label>FAT (g)</label><input class="input num" id="m_f" type="number" inputmode="numeric" value="${Math.round(t.fat||0)}"></div>
        <div class="card" id="m_check" style="margin:2px 0 14px"></div>
        <button class="btn str block" id="m_save">SAVE my targets</button>`;
      function kcalFromInput(){ const v=+$("#m_cal").value||0; return isKj? v/4.184 : v; }
      let focus=null;
      function paintFoci(){ $("#modal").querySelectorAll("#m_focus [data-foc]").forEach(b=>b.classList.toggle("on",b.dataset.foc===focus)); }
      function applyFocus(){ if(!focus)return; const cals=kcalFromInput(), F=FOCI[focus]; if(!(cals>0))return;
        /* round protein & fat, then derive carbs from the remainder so the macros sum back to the exact calories */
        const pr=Math.round(cals*F.p/4), ft=Math.round(cals*F.f/9);
        const cb=Math.max(0,Math.round((cals - pr*4 - ft*9)/4));
        $("#m_p").value=pr; $("#m_f").value=ft; $("#m_c").value=cb; }
      function check(){
        const cals=kcalFromInput();
        const pr=+$("#m_p").value||0, cb=+$("#m_c").value||0, ft=+$("#m_f").value||0;
        const macroKcal=pr*4+cb*4+ft*9;
        const diff=Math.round(macroKcal-cals);
        const ok=Math.abs(diff)<=50;
        $("#m_check").innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Your macros add up to</div>
          <div class="row" style="justify-content:space-between;align-items:center">
            <div class="num" style="font-weight:800;font-size:20px">${eVal(macroKcal)} <small style="font-weight:500;color:var(--muted)">${eUnit()}</small></div>
            <div class="tiny" style="color:${ok?"var(--fuel)":(diff>0?"#FFC857":"var(--blue)")};font-weight:700">${ok?"✓ matches your calories":(diff>0?`+${eVal(Math.abs(diff))} over your calorie target`:`${eVal(Math.abs(diff))} ${eUnit()} under your calorie target`)}</div>
          </div>
          <div class="tiny muted" style="margin-top:6px">PROTEIN &amp; carbs = 4 ${eUnit()}/g, fat = 9 ${eUnit()}/g. They don't have to match exactly — it's your call.</div>`;
      }
      check();
      $("#modal").querySelectorAll("#m_focus [data-foc]").forEach(b=>b.addEventListener("click",()=>{ focus=b.dataset.foc; paintFoci(); applyFocus(); check(); }));
      $("#m_cal").addEventListener("input",()=>{ applyFocus(); check(); });
      ["m_p","m_c","m_f"].forEach(id=>$("#"+id).addEventListener("input",()=>{ focus=null; paintFoci(); check(); }));
      $("#m_save").addEventListener("click",()=>{
        const cals=Math.round(kcalFromInput());
        if(!(cals>0)){ toast("Enter your daily calories"); return; }
        const pr=Math.max(0,Math.round(+$("#m_p").value||0));
        const cb=Math.max(0,Math.round(+$("#m_c").value||0));
        const ft=Math.max(0,Math.round(+$("#m_f").value||0));
        const water=(DATA.targets&&DATA.targets.water)|| (p.weightKg?Math.round(p.weightKg*35):2000);
        let extra={}; if(!incomplete){ const c=computeTargets(p); extra={bmr:c.bmr,tdee:c.tdee}; }
        DATA.targets={calories:cals, protein:pr, carbs:cb, fat:ft, water, ...extra};
        DATA.prefs.targetMode="manual";
        save(); closeModal(); renderFUEL();
        toast("Your targets are set 🎯");
      });
    }
  }
  $("#ga_mode").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{ mode=btn.dataset.v; renderMode(); }));
  renderMode();
}

function renderFUEL(){
  const b=$("#fuelBody"); b.innerHTML="";
  if(!DATA.targets){
    b.innerHTML=`<div class="topbar"><div><div class="hello">Nutrition</div><div class="date">FUEL</div></div></div>
      <div class="card center"><p class="muted">Set up your details first to get calorie & macro targets.</p>
      <button class="btn str block" id="f_setup" style="margin-top:10px">Set up now</button></div>`;
    $("#f_setup").addEventListener("click",()=>openSetup(true)); return;
  }
  const t=DATA.targets, log=dayLog(viewDate);
  const eaten=log.food.reduce((s,f)=>({c:s.c+f.kcal,p:s.p+f.p,cb:s.cb+f.c,ft:s.ft+f.f}),{c:0,p:0,cb:0,ft:0});
  const burned=log.burned.reduce((s,x)=>s+x.kcal,0);
  const budget=t.calories + (DATA.prefs.addMOVE?burned:0);
  const remaining=budget-eaten.c;
  const pct=Math.min(1,eaten.c/budget);
  const isToday=viewDate===todayISO();

  /* header with date switcher */
  b.appendChild(helpBar("fuel"));
  b.appendChild(el("div","topbar",`<div><div class="hello">Food &amp; macros</div><div class="date">FUEL</div></div>`));
  const head=el("div","topbar");
  head.innerHTML=`<button class="iconbtn" id="f_prev">‹</button>
    <div class="center"><div class="hello">${isToday?"Today":""}</div><div class="date" style="font-size:24px">${shortDate(viewDate)}</div></div>
    <button class="iconbtn" id="f_next" ${isToday?'style="opacity:.3"':""}>›</button>`;
  b.appendChild(head);
  $("#f_prev").addEventListener("click",()=>{const d=new Date(viewDate);d.setDate(d.getDate()-1);viewDate=todayISO(d);renderFUEL();});
  $("#f_next").addEventListener("click",()=>{if(isToday)return;const d=new Date(viewDate);d.setDate(d.getDate()+1);viewDate=todayISO(d);renderFUEL();});

  /* ───────── PRIMARY ACTION: log food, above the ring so it needs no scroll ───────── */
  const afTop=el("button","btn fuel block","＋ Add food"); afTop.style.marginBottom="14px";
  afTop.addEventListener("click",()=>openFoodSearch());
  b.appendChild(afTop);

  /* ───────── AT A GLANCE: calorie ring + macros ───────── */
  const hasFood = log.food && log.food.length > 0;
  const ringCard=el("div","card center fuel-hero");
  if(!hasFood){
    /* Compact ring on empty state — user can tap to expand */
    ringCard.style.cursor="pointer";
    ringCard.title="Tap to see full breakdown";
    ringCard.innerHTML=`<div style="display:flex;align-items:center;gap:14px;text-align:left;padding:4px 0">
      ${ringSVG(pct,remaining<0?"#FF5470":"#2FE6A8",64)}
      <div style="flex:1">
        <div class="eyebrow" style="margin-bottom:4px">KCAL</div>
        <div style="font-family:var(--font-disp);font-size:26px;line-height:1">${eVal(Math.abs(remaining))} <span style="font-size:14px;color:var(--muted);font-family:Inter">${remaining<0?"over":"left"} · ${eUnit()}</span></div>
        <div class="tiny muted" style="margin-top:4px">Target: ${eVal(budget)} · Log food to see macros</div>
      </div>
      <div class="muted" style="font-size:18px">›</div>
    </div>`;
    ringCard.addEventListener("click",()=>{
      ringCard.dataset.expanded="1";
      ringCard.style.cursor="";
      ringCard.innerHTML=`<div class="ring-wrap">${ringSVG(pct, remaining<0?"#FF5470":"#2FE6A8",170)}
       <div class="lbl"><div class="big num">${eVal(Math.abs(remaining))}</div>
       <div class="sub">${remaining<0?"over":"left"} · ${eUnit()}</div></div></div>
       <div class="row" style="justify-content:space-around;margin-top:14px">
         <div><div class="tiny muted">EATEN</div><div class="num" style="font-weight:700">${eVal(eaten.c)}</div></div>
         <div><div class="tiny muted">TARGET</div><div class="num" style="font-weight:700">${eVal(budget)}</div></div>
         <div><div class="tiny muted">BURNED</div><div class="num" style="font-weight:700">${eVal(burned)}</div></div>
       </div>`;
    });
  } else {
    ringCard.innerHTML=`<div class="ring-wrap">${ringSVG(pct, remaining<0?"#FF5470":"#2FE6A8",170)}
       <div class="lbl"><div class="big num">${eVal(Math.abs(remaining))}</div>
       <div class="sub">${remaining<0?"over":"left"} · ${eUnit()}</div></div></div>
       <div class="row" style="justify-content:space-around;margin-top:14px">
         <div><div class="tiny muted">EATEN</div><div class="num" style="font-weight:700">${eVal(eaten.c)}</div></div>
         <div><div class="tiny muted">TARGET</div><div class="num" style="font-weight:700">${eVal(budget)}</div></div>
         <div><div class="tiny muted">BURNED</div><div class="num" style="font-weight:700">${eVal(burned)}</div></div>
       </div>`;
  }
  b.appendChild(ringCard);

  /* macros — three mini rings (grouped right under the calorie ring) */
  const macros=[["PROTEIN","🥩",eaten.p,t.protein,"#FF6A2C"],["CARBS","🌾",eaten.cb,t.carbs,"#5AA9FF"],["FAT","🥑",eaten.ft,t.fat,"#FFC857"]];
  const mc=el("div","card"); mc.style.marginTop="12px";
  mc.innerHTML=`<div class="eyebrow" style="margin-bottom:12px">Macros</div>`;
  const mr=el("div","macro-rings");
  macros.forEach(([nm,ic,have,goal,col])=>{
    const mpct=Math.min(1,have/goal);
    const d=el("div","mring");
    d.innerHTML=`<div class="mr-wrap">${ringSVG(mpct,col,84)}<div class="mr-ic">${ic}</div></div>
      <div class="mr-v num">${Math.round(have)}<small>/${goal}g</small></div>
      <div class="mr-k">${nm}</div>`;
    mr.appendChild(d);
  });
  mc.appendChild(mr);
  b.appendChild(mc);

  /* ───────── secondary actions: burned & repeat ───────── */
  const actRow=el("div","row"); actRow.style.margin="14px 0 0"; actRow.style.gap="10px";
  const ab=el("button","btn","🔥 Burned"); ab.style.flex="1"; ab.addEventListener("click",openBurned);
  actRow.appendChild(ab);
  const hasPast=Object.keys(DATA.log||{}).some(d=>(DATA.log[d].food||[]).length);
  if(hasPast){
    const rep=el("button","btn","⟳ Repeat a meal"); rep.style.flex="1"; rep.addEventListener("click",openRepeatMeal);
    actRow.appendChild(rep);
  }
  b.appendChild(actRow);

  /* ───────── QUICK ADD: one-tap re-log at your last-used portion ───────── */
  const usuals=usualFoods(10);
  if(usuals.length){
    const sh=el("div","sect-h"); sh.style.marginBottom="8px";
    sh.innerHTML=`<h3>QUICK ADD <span class="muted" style="font-weight:600;font-size:12px">· one tap</span></h3>`;
    b.appendChild(sh);
    const rail=el("div","usuals-rail");
    usuals.forEach(name=>{
      const f=allFoods().find(x=>x[0]===name); if(!f)return;
      const g=lastPortion(name), r=g/100;
      const card=el("button","ucard");
      card.innerHTML=`<div class="uadd">＋</div>
        <div class="un">${esc(name)}</div>
        <div class="um num">${eVal(f[1]*r)} ${eUnit()} · P${Math.round(f[2]*r)}</div>
        <div class="up num">${g} g</div>`;
      card.addEventListener("click",()=>{ card.classList.add("flash"); setTimeout(()=>card.classList.remove("flash"),450); logFoodQuick(name); });
      rail.appendChild(card);
    });
    const more=el("button","ucard add-tile"); more.innerHTML=`<div class="plus">＋</div><div class="tiny">Find a food</div>`;
    more.addEventListener("click",()=>openFoodSearch()); rail.appendChild(more);
    b.appendChild(rail);
  }

  /* ───────── FOOD LOG — grouped by meal ───────── */
  if(log.food.length){
    MEALS.forEach(m=>{
      const items=log.food.filter(f=>mealOf(f)===m.id).sort((a,b)=>(a.time||0)-(b.time||0));
      if(!items.length)return;
      const sub=items.reduce((s,f)=>s+(f.kcal||0),0);
      const sh=el("div","sect-h");
      sh.innerHTML=`<h3>${m.ic} ${m.name} <span class="muted" style="font-weight:600;font-size:13px">· ${eVal(sub)} ${eUnit()}</span></h3>`;
      const addBtn=el("button","iconbtn","＋"); addBtn.title="Add to "+m.name; addBtn.style.alignSelf="center";
      addBtn.addEventListener("click",()=>openFoodSearch(m.id)); sh.appendChild(addBtn);
      b.appendChild(sh);
      const fc=el("div","card");
      items.forEach(f=>{
        const r=el("div","lrow");
        const tm=DATA.prefs.mealTimes?mealClock(f.time):"";
        r.innerHTML=`<div class="ico">🍽️</div><div class="main"><div class="t">${esc(f.name)}</div>
          <div class="s num">${tm?tm+" · ":""}${f.grams}g · ${macroHTML(Math.round(f.p),Math.round(f.c),Math.round(f.f))}</div></div>
          <div class="end"><div class="num" style="font-weight:700">${eVal(f.kcal)}</div><div class="tiny muted">${eUnit()}</div></div>`;
        r.querySelector(".main").style.cursor="pointer";
        r.querySelector(".main").addEventListener("click",()=>editFoodEntry(f));
        const del=el("button","del","×"); del.addEventListener("click",e=>{e.stopPropagation();const ix=log.food.indexOf(f);if(ix>=0){const removed=log.food.splice(ix,1)[0];save();renderFUEL();toastUNDO("REMOVEd "+(removed.name||"food"),()=>{const L=dayLog(viewDate);L.food.splice(Math.min(ix,L.food.length),0,removed);save();renderFUEL();});}});
        r.appendChild(del); fc.appendChild(r);
      });
      /* contextual quick-add: foods you usually eat at this meal */
      const mealUsuals=usualFoods(5,m.id).filter(n=>!items.some(it=>it.name===n));
      if(mealUsuals.length){
        const mini=el("div","mini-add");
        mini.appendChild(el("span","lead","Usual"));
        mealUsuals.forEach(n=>{
          const chip=el("button","mini-chip"); chip.innerHTML=`${esc(n.split(",")[0])}<span class="mc-plus">＋</span>`;
          chip.addEventListener("click",()=>logFoodQuick(n,m.id)); mini.appendChild(chip);
        });
        fc.appendChild(mini);
      }
      b.appendChild(fc);
    });
  } else {
    const empty=el("div","card center"); empty.style.marginTop="6px";
    empty.innerHTML=`<p class="muted tiny" style="line-height:1.5">No food logged ${isToday?"yet today":"on this day"}.<br>Tap <b>＋ Add food</b> above to get started.</p>`;
    b.appendChild(empty);
  }

  /* ───────── WATER ───────── */
  const wc=el("div","card"); wc.style.marginTop="14px";
  const wpct=Math.min(100,log.water/t.water*100);
  const wIsOz=DATA.prefs.waterUnit==="floz";
  const wStep=Number(DATA.prefs.waterStep)>0?Number(DATA.prefs.waterStep):250;
  const wDisp=(ml)=> wIsOz ? (Math.round(ml/29.5735)+" fl oz") : (Math.round(ml)+" ml");
  const wStepLbl=(ml)=> wIsOz ? ("+"+Math.round(ml/29.5735)) : ("+"+ml);
  wc.innerHTML=`<div class="lrow" style="padding:0 0 10px"><div class="ico">💧</div>
    <div class="main"><div class="t">WATER</div><div class="s num">${wDisp(log.water)} / ${wDisp(t.water)}</div></div>
    <div class="num" style="font-family:'Bebas Neue';font-size:30px;color:#5AA9FF">${Math.round(wpct)}%</div></div>
    <div class="bar"><i style="width:${wpct}%;background:#5AA9FF"></i></div>
    <div class="row" style="gap:8px;margin-top:12px">
     <button class="btn sm" data-w="${wStep}" style="flex:1">${wStepLbl(wStep)}</button>
     <button class="btn sm" data-w="${wStep*2}" style="flex:1">${wStepLbl(wStep*2)}</button>
     <button class="btn sm" data-w="${-wStep}" style="flex:1">${wIsOz?"−"+Math.round(wStep/29.5735):"−"+wStep}</button></div>`;
  wc.querySelectorAll("[data-w]").forEach(btn=>btn.addEventListener("click",()=>{
    log.water=Math.max(0,log.water+(+btn.dataset.w));save();renderFUEL();}));
  b.appendChild(wc);

  /* ───────── burned list ───────── */
  if(log.burned.length){
    const sh=el("div","sect-h",`<h3>KCAL burned</h3>`); b.appendChild(sh);
    const bc=el("div","card");
    log.burned.forEach((x,i)=>{
      const r=el("div","lrow");
      r.innerHTML=`<div class="ico">🔥</div><div class="main"><div class="t">${esc(x.name||"MOVE")}</div>
        <div class="s">${DATA.prefs.addMOVE?"ADDED. to budget":"Logged only"}</div></div>
        <div class="end"><div class="num" style="font-weight:700">${eVal(x.kcal)}</div><div class="tiny muted">${eUnit()}</div></div>`;
      const del=el("button","del","×"); del.addEventListener("click",()=>{const removed=log.burned.splice(i,1)[0];save();renderFUEL();toastUNDO("REMOVEd burned entry",()=>{const L=dayLog(viewDate);L.burned.splice(Math.min(i,L.burned.length),0,removed);save();renderFUEL();});});
      r.appendChild(del); bc.appendChild(r);
    });
    b.appendChild(bc);
  }

  /* ───────── GOAL & activity — quiet link near the bottom ───────── */
  const pf=DATA.profile;
  if(pf){
    const manual=DATA.prefs.targetMode==="manual";
    const ga=el("button","btn ghost block"); ga.style.marginTop="16px";
    ga.innerHTML=`🎯 ${manual?"DAILY targets · set manually":`${GOALS[pf.goal]?.l||"—"} · ${ACT[pf.activity]?.l||"—"}`} <span class="muted fuel-edit-link">✏️ edit</span>`;
    ga.addEventListener("click",openGOALActivity);
    b.appendChild(ga);
  }
}

let foodCat="All";
let foodShop="all"; /* food pack shop filter: "all" or a shop id */
function allFoods(){
  const custom=(DATA.customFoods||[]).map(c=>[c.name,c.kcal,c.p,c.c,c.f,"My foods",c.cat||""]);
  let packs=[]; try{ if(window.FoodPacks) packs=FoodPacks.packFoods()||[]; }catch(e){}
  return custom.concat(FOODS).concat(packs);
}
function foodPortionFor(name){
  if(!name)return null;
  try{
    if(typeof FOOD_PORTIONS!=="undefined" && FOOD_PORTIONS[name]) return FOOD_PORTIONS[name];
  }catch(e){}
  return null;
}
function foodPortionLabel(name){ const p=foodPortionFor(name); return p?` · ${esc(p.unit)} ≈ ${Math.round(p.grams)}g`:""; }
function portionOptions(name,last){
  const out=[], seen=new Set();
  const add=(label,g)=>{ g=Math.round((+g||0)*10)/10; if(!g||seen.has(String(g)))return; seen.add(String(g)); out.push({label,g}); };
  const common=foodPortionFor(name);
  if(common) add(common.unit, common.grams);
  if(last && Math.abs(last-100)>0.5) add("Last · "+Math.round(last)+"g", last);
  add("100g",100);
  if(common && common.grams<80) add("2 × "+common.unit.replace(/^1\s*/,""), common.grams*2);
  add("200g",200);
  return out.slice(0,5);
}
function portionChipsHTML(name,last){
  const opts=portionOptions(name,last);
  return opts.length?`<div class="field"><label>Quick portions</label><div class="row wrap portion-chips" id="pf_portions" style="gap:7px">${opts.map(o=>`<button class="chip sm" data-g="${o.g}">${esc(o.label)}</button>`).join("")}</div></div>`:"";
}
function wirePortionChips(){
  const host=$("#pf_portions"), inp=$("#pf_g"); if(!host||!inp)return;
  host.querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>{ host.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); inp.value=b.dataset.g; inp.dispatchEvent(new Event("input")); }));
}
function normFood(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();}
function tinyDISTANCE(a,b){
  if(a===b)return 0; if(Math.abs(a.length-b.length)>1)return 2;
  let i=0,j=0,e=0; while(i<a.length&&j<b.length){ if(a[i]===b[j]){i++;j++;continue;} e++; if(e>1)return 2; if(a.length>b.length)i++; else if(b.length>a.length)j++; else {i++;j++;} }
  if(i<a.length||j<b.length)e++; return e;
}
function foodSearchScore(name,raw){
  const q=normFood(raw); if(!q)return 0;
  const n=normFood(name); const words=n.split(" ").filter(Boolean); const qs=q.split(" ").filter(Boolean);
  if(n===q)return 0; if(n.startsWith(q))return 1;
  if(words.some(w=>w.startsWith(q)))return 2;
  if(n.includes(q))return 5;
  let miss=0; for(const part of qs){
    if(words.some(w=>w.startsWith(part) || tinyDISTANCE(w,part)<=1)) continue;
    if(n.includes(part)) continue;
    miss++;
  }
  if(miss===0)return 8;
  if(q.length>=4 && words.some(w=>tinyDISTANCE(w,q)<=1))return 10;
  return 999;
}
/* ===========================================================================
   v3.30 — Plate-based food logger (overhaul)
   Add many foods to a running "plate", adjust portions inline, then Log all.
   Reuses the existing food DB, fuzzy search, favourites, recents & portions.
   =========================================================================== */
let plate=[];            /* [{name, grams, f:[name,kcal,p,c,f,cat]}] */
let plateMeal="snack";   /* meal the whole plate logs into */
let catsOpen=false;      /* category filter collapsed by default */

function plateTotals(){
  return plate.reduce((t,it)=>{ const r=it.grams/100,f=it.f;
    t.kcal+=f[1]*r; t.p+=f[2]*r; t.c+=f[3]*r; t.f+=f[4]*r; return t; },{kcal:0,p:0,c:0,f:0});
}
function addToPlate(name,grams){
  const f=allFoods().find(x=>x[0]===name); if(!f)return;
  const g=grams||lastPortion(name)||100;
  plate.push({name,grams:g,f}); paintPlate(); paintList&&paintList();
  toast(name+" → plate");
}
function openFoodSearch(presetMeal){
  plate=[]; foodCat="All"; foodShop="all"; catsOpen=false;
  plateMeal=presetMeal||suggestMeal();
  const base=Array.from(new Set(FOODS.map(f=>f[5])));
  const hasFav=(DATA.favFoods&&DATA.favFoods.length);
  const cats=["All",...(hasFav?["★ STARRED"]:[]),...((DATA.customFoods&&DATA.customFoods.length)?["My foods"]:[]),...base];

  openModal(`<div class="logger">
    <div class="lg-top">
      <h3 style="margin:0 0 8px">Add food</h3>
      <div class="lg-meal" id="lg_meal">${MEALS.map(m=>`<button class="chip sm ${m.id===plateMeal?"on":""}" data-m="${m.id}">${m.ic} ${m.name}</button>`).join("")}</div>
      <input class="input" id="fs_q" placeholder="Search ${FOODS.length}+ foods…" style="margin:10px 0 8px" autocomplete="off">
      <div class="lg-actions">
        <button class="chip sm" id="fs_custom">＋ Own food</button>
        <button class="chip sm" id="fs_catsT">▾ Categories</button>
      </div>
      <div id="fs_cats" class="lg-cats" style="display:none">${cats.map(c=>`<button class="chip sm ${c==="All"?"on":""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      ${(function(){ try{ const ip=(window.FoodPacks?FoodPacks.installedPacks():[]); if(!ip.length)return ""; return `<div id="fs_shops" class="lg-cats" style="display:flex;margin-top:6px"><button class="chip sm on" data-shop="all">All shops</button>${ip.map(p=>`<button class="chip sm" data-shop="${esc(p.id)}">🛒 ${esc(p.name)}</button>`).join("")}</div>`; }catch(e){return "";} })()}
    </div>
    <div class="lg-scroll">
      <div id="fs_recent"></div>
      <div class="search-list" id="fs_list"></div>
    </div>
    <div class="lg-plate" id="lg_plate"></div>
  </div>`);

  function paintRecent(){
    const host=$("#fs_recent"); if(!host)return;
    const q=$("#fs_q").value.trim();
    const recents=recentFoods(10);
    if(q||foodCat!=="All"||!recents.length){ host.innerHTML=""; return; }
    host.innerHTML=`<div class="eyebrow" style="margin:2px 0 8px">Recent &amp; frequent</div>
      <div class="row wrap" style="gap:7px;margin-bottom:6px">${recents.map(n=>`<button class="chip sm plus" data-recent="${esc(n)}">${isFavFood(n)?"★ ":""}${esc(n)} <b>＋</b></button>`).join("")}</div>`;
    host.querySelectorAll("[data-recent]").forEach(b=>b.addEventListener("click",()=>addToPlate(b.getAttribute("data-recent"))));
  }
  window.paintList=function(){
    const raw=$("#fs_q").value.trim();
    let pool=allFoods();
    if(foodCat==="★ STARRED") pool=pool.filter(f=>isFavFood(f[0]));
    else if(foodCat!=="All"&&foodCat!=="★ STARRED") pool=pool.filter(f=>f[5]===foodCat || (f[6]&&f[6]===foodCat));
    if(foodShop!=="all") pool=pool.filter(f=>f[6]===foodShop); /* shop pack filter */
    const list=raw
      ? pool.map(f=>({f,score:foodSearchScore(f[0],raw)})).filter(x=>x.score<999)
          .sort((a,b)=>a.score-b.score || a.f[0].localeCompare(b.f[0])).slice(0,150).map(x=>x.f)
      : pool.slice(0,150);
    $("#fs_list").innerHTML=list.map(f=>`<div class="food-opt" data-n="${esc(f[0])}">
      <div style="flex:1;min-width:0"><div class="fn">${esc(f[0])}${f[5]==="My foods"?' <span class="tiny" style="color:var(--fuel)">· custom</span>':''}</div>
        <div class="fm num">${eVal(f[1])} ${eUnit()} · ${macroHTML(f[2],f[3],f[4])} /100g${foodPortionLabel(f[0])}</div></div>
      <button class="iconbtn star ${isFavFood(f[0])?"on":""}" data-fav="${esc(f[0])}" title="Favourite">${isFavFood(f[0])?"★":"☆"}</button>
      <button class="btn sm fuel" data-plus="${esc(f[0])}" style="margin-left:6px">＋</button></div>`).join("")
      ||`<div class="empty">${foodCat==="★ STARRED"?"No favourites yet — tap ☆ on any food to save it.":"No matches — try fewer letters, or add your own food."}</div>`;
    $("#fs_list").querySelectorAll("[data-plus]").forEach(btn=>btn.addEventListener("click",()=>addToPlate(btn.getAttribute("data-plus"))));
    $("#fs_list").querySelectorAll("[data-fav]").forEach(btn=>btn.addEventListener("click",()=>{ const n=btn.getAttribute("data-fav"); toggleFavFood(n); const on=isFavFood(n); btn.classList.toggle("on",on); btn.textContent=on?"★":"☆"; }));
  };

  window.paintPlate=function(){
    const host=$("#lg_plate"); if(!host)return;
    if(!plate.length){ host.innerHTML=`<div class="lg-plate-empty tiny muted">PLATE is empty — tap ＋ on any food to build a meal, then log it all at once.</div>`; return; }
    const t=plateTotals();
    host.innerHTML=`<div class="lg-plate-head"><span>🍽️ Plate · ${plate.length} item${plate.length>1?"s":""}</span><span class="num">${eVal(t.kcal)} ${eUnit()} · P${Math.round(t.p)} C${Math.round(t.c)} F${Math.round(t.f)}</span></div>
      <div class="lg-plate-items">${plate.map((it,i)=>{const r=it.grams/100;return `<div class="lg-pi"><div class="lg-pi-row"><div class="lg-pi-main" data-pe="${i}" style="flex:1;min-width:0"><div class="fn">${esc(it.name)}</div><div class="fm num">${it.grams}g · ${eVal(it.f[1]*r)} ${eUnit()} · tap to adjust</div></div><button class="iconbtn" data-pe="${i}" title="Portion">⚙</button><button class="iconbtn" data-pr="${i}" title="REMOVE">✕</button></div></div>`;}).join("")}</div>
      <button class="btn fuel block" id="lg_logall">Log ${plate.length} item${plate.length>1?"s":""} to ${mealById(plateMeal).name}</button>`;
    host.querySelectorAll("[data-pr]").forEach(b=>b.addEventListener("click",()=>{ plate.splice(+b.dataset.pr,1); paintPlate(); }));
    host.querySelectorAll("[data-pe]").forEach(b=>b.addEventListener("click",()=>editPlatePortion(+b.dataset.pe)));
    $("#lg_logall").addEventListener("click",commitPlate);
  };

  $("#fs_q").addEventListener("input",()=>{paintRecent();paintList();});
  $("#fs_custom").addEventListener("click",()=>openCustomFood(presetMeal));
  $("#fs_catsT").addEventListener("click",()=>{ catsOpen=!catsOpen; $("#fs_cats").style.display=catsOpen?"flex":"none"; $("#fs_catsT").classList.toggle("on",catsOpen); });
  $("#lg_meal").querySelectorAll("[data-m]").forEach(b=>b.addEventListener("click",()=>{ plateMeal=b.dataset.m; $("#lg_meal").querySelectorAll("[data-m]").forEach(x=>x.classList.remove("on")); b.classList.add("on"); paintPlate(); }));
  $("#fs_cats").querySelectorAll("[data-c]").forEach(b=>b.addEventListener("click",()=>{
    $("#fs_cats").querySelectorAll("[data-c]").forEach(x=>x.classList.remove("on"));b.classList.add("on");foodCat=b.dataset.c;paintRecent();paintList();}));
  const shopRow=$("#fs_shops"); if(shopRow){ shopRow.querySelectorAll("[data-shop]").forEach(b=>b.addEventListener("click",()=>{
    shopRow.querySelectorAll("[data-shop]").forEach(x=>x.classList.remove("on")); b.classList.add("on"); foodShop=b.dataset.shop; paintRecent(); paintList(); })); }
  paintRecent(); paintList(); paintPlate();
}

/* adjust a food's portion BEFORE adding to the plate — inline prompt, no nested modal */
function portionToPlate(name){
  const f=allFoods().find(x=>x[0]===name); if(!f)return;
  const def=lastPortion(name);
  const port=foodPortionFor(name);
  const hint=port?` (1 ${port.unit} ≈ ${Math.round(port.grams)}g)`:"";
  const g=parseFloat(prompt(`How many grams of ${name}?${hint}`, def));
  if(g>0) addToPlate(name,g);
}
/* edit the portion of an item already on the plate — inline grams stepper row */
function editPlatePortion(i){
  const it=plate[i]; if(!it)return;
  const host=$("#lg_plate"); if(!host)return;
  const row=host.querySelectorAll(".lg-pi")[i]; if(!row) return;
  if(row.querySelector(".lg-pi-edit")){ row.querySelector(".lg-pi-edit").remove(); return; }
  const port=foodPortionFor(it.name);
  const chips=[];
  if(port) chips.push([port.unit, Math.round(port.grams)]);
  [50,100,150,200,250].forEach(g=>chips.push([g+"g",g]));
  const ed=document.createElement("div"); ed.className="lg-pi-edit";
  ed.innerHTML=`<div class="row wrap" style="gap:6px;margin:6px 0">${chips.map(([l,g])=>`<button class="chip sm" data-g="${g}">${esc(l)}</button>`).join("")}</div>
    <div class="row" style="gap:8px;align-items:center"><input class="input num" id="lg_pg" type="number" inputmode="decimal" value="${it.grams}" style="flex:1"><button class="btn sm fuel" id="lg_pset">Set</button></div>`;
  row.appendChild(ed);
  ed.querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>{ ed.querySelector("#lg_pg").value=b.dataset.g; }));
  ed.querySelector("#lg_pset").addEventListener("click",()=>{ const g=+ed.querySelector("#lg_pg").value; if(g>0){ it.grams=g; paintPlate(); } });
}

/* commit the whole plate to the day's log in one go */
function commitPlate(){
  if(!plate.length){ toast("PLATE IS EMPTY."); return; }
  const meal=plateMeal;
  const log=dayLog(viewDate);
  plate.forEach(it=>{ const r=it.grams/100, f=it.f;
    log.food.push({name:it.name,grams:it.grams,kcal:f[1]*r,p:f[2]*r,c:f[3]*r,f:f[4]*r,meal,time:Date.now()}); });
  const n=plate.length; plate=[]; save(); closeModal(); renderFUEL(); toast(`Logged ${n} item${n>1?"s":""} to ${mealById(meal).name}`);
}

function openCustomFood(presetMeal){
  openModal(`<h3>Add your own food</h3>
    <p class="muted tiny" style="margin-bottom:12px">Enter the values <b>per 100g</b> (check the packet). It's saved so you can reuse it any time.</p>
    <div class="field"><label>FOOD NAME</label><input class="input" id="cf_n" placeholder="e.g. My protein flapjack"></div>
    <div class="grid2">
      <div class="field"><label>KCAL (kcal /100g)</label><input class="input num" id="cf_k" type="number" inputmode="decimal" placeholder="420"></div>
      <div class="field"><label>PROTEIN (g /100g)</label><input class="input num" id="cf_p" type="number" inputmode="decimal" placeholder="25"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>CARBS (g /100g)</label><input class="input num" id="cf_c" type="number" inputmode="decimal" placeholder="45"></div>
      <div class="field"><label>FAT (g /100g)</label><input class="input num" id="cf_f" type="number" inputmode="decimal" placeholder="16"></div>
    </div>
    <div class="field"><label>Category (optional)</label>
      <div class="row wrap" id="cf_cat" style="gap:6px">${["My foods only",...Array.from(new Set(FOODS.map(f=>f[5])))].map((c,i)=>`<button type="button" class="chip sm ${i===0?"on":""}" data-cat="${i===0?"":esc(c)}">${esc(c)}</button>`).join("")}</div></div>
    <button class="btn fuel block" id="cf_save">SAVE &amp; use food</button>`);
  $("#cf_cat").querySelectorAll("[data-cat]").forEach(btn=>btn.addEventListener("click",()=>{
    $("#cf_cat").querySelectorAll("[data-cat]").forEach(x=>x.classList.remove("on")); btn.classList.add("on");
  }));
  $("#cf_save").addEventListener("click",()=>{
    const n=$("#cf_n").value.trim(); if(!n){toast("Give it a name");return;}
    let k=+$("#cf_k").value; if(DATA.prefs.energy==="kj")k=k/4.184;
    const food={name:n,kcal:Math.max(0,k||0),p:+$("#cf_p").value||0,c:+$("#cf_c").value||0,f:+$("#cf_f").value||0};
    const catBtn=$("#cf_cat")?$("#cf_cat").querySelector(".on"):null;
    food.cat=catBtn&&catBtn.dataset.cat?catBtn.dataset.cat:"";
    if(!DATA.customFoods)DATA.customFoods=[];
    const ex=DATA.customFoods.findIndex(x=>x.name.toLowerCase()===n.toLowerCase());
    if(ex>=0)DATA.customFoods[ex]=food; else DATA.customFoods.unshift(food);
    save(); pickFood(n,presetMeal); toast("SAVED. “"+n+"”");
  });
}
function pickFood(name,presetMeal){
  const f=allFoods().find(x=>x[0]===name); if(!f)return;
  const isCustom=f[5]==="My foods";
  const defGrams=lastPortion(name);
  const selMeal=presetMeal||usualMealFor(name);
  openModal(`<h3 style="display:flex;align-items:center;gap:10px"><span style="min-width:0">${esc(name)}</span><button class="iconbtn star ${isFavFood(name)?"on":""}" id="pf_fav" title="Favourite" style="flex:0 0 auto">${isFavFood(name)?"★":"☆"}</button></h3>
    <p class="muted tiny" style="margin-bottom:12px">Per 100g: ${eVal(f[1])} ${eUnit()} · ${macroHTML(f[2],f[3],f[4])}${foodPortionLabel(name)}${isCustom?' · <span style="color:var(--fuel)">custom</span>':''}</p>
    ${portionChipsHTML(name,defGrams)}
    <div class="field"><label>How many grams?</label><input class="input num" id="pf_g" type="number" inputmode="decimal" value="${defGrams}" placeholder="grams"></div>
    ${mealPickerHTML(selMeal,nowHHMM())}
    <div id="pf_preview" class="card" style="margin-bottom:14px"></div>
    <button class="btn fuel block" id="pf_add">Add to ${shortDate(viewDate)}</button>
    ${isCustom?'<button class="btn danger block" id="pf_del" style="margin-top:10px">DELETE this custom food</button>':''}`);
  wireMealPicker();
  wirePortionChips();
  $("#pf_fav").addEventListener("click",()=>{ toggleFavFood(name); const on=isFavFood(name); const btn=$("#pf_fav"); btn.classList.toggle("on",on); btn.textContent=on?"★":"☆"; toast(on?"ADDED. to favourites":"REMOVEd"); });
  function upd(){
    const g=+$("#pf_g").value||0, r=g/100;
    $("#pf_preview").innerHTML=`<div class="row" style="justify-content:space-around">
      <div class="center"><div class="tiny muted">${eUnit()}</div><div class="num" style="font-weight:700">${eVal(f[1]*r)}</div></div>
      <div class="center"><div class="tiny" style="color:#FF6A2C;font-weight:600">PROTEIN</div><div class="num" style="font-weight:700">${(f[2]*r).toFixed(1)}g</div></div>
      <div class="center"><div class="tiny" style="color:#5AA9FF;font-weight:600">CARBS</div><div class="num" style="font-weight:700">${(f[3]*r).toFixed(1)}g</div></div>
      <div class="center"><div class="tiny" style="color:#FFC857;font-weight:600">FAT</div><div class="num" style="font-weight:700">${(f[4]*r).toFixed(1)}g</div></div></div>`;
  }
  $("#pf_g").addEventListener("input",upd); upd();
  $("#pf_add").addEventListener("click",()=>{
    const g=+$("#pf_g").value; if(!g){toast("Enter grams");return;}
    const r=g/100; const meal=readMeal(); const time=readMealTime(nowHHMM());
    dayLog(viewDate).food.push({name,grams:g,kcal:f[1]*r,p:f[2]*r,c:f[3]*r,f:f[4]*r,meal,time});
    save(); closeModal(); renderFUEL(); toast("ADDED. to "+mealById(meal).name);
  });
  if(isCustom)$("#pf_del").addEventListener("click",()=>{
    DATA.customFoods=DATA.customFoods.filter(x=>x.name!==name); save(); closeModal(); openFoodSearch(presetMeal); toast("DELETED.");
  });
}
/* edit an already-logged entry: change its meal, time, grams, duplicate, or remove it */
function editFoodEntry(f){
  const log=dayLog(viewDate); if(log.food.indexOf(f)<0)return;
  const per100=f.grams>0?{k:f.kcal/(f.grams/100),p:f.p/(f.grams/100),c:f.c/(f.grams/100),ft:f.f/(f.grams/100)}:{k:0,p:0,c:0,ft:0};
  openModal(`<h3>${esc(f.name)}</h3>
    <div class="field"><label>Grams</label><input class="input num" id="ef_g" type="number" inputmode="decimal" value="${f.grams}"></div>
    ${mealPickerHTML(mealOf(f),clockHHMM(f.time))}
    <button class="btn fuel block" id="ef_save">SAVE changes</button>
    <button class="btn block" id="ef_dup" style="margin-top:10px">⟳ Duplicate this entry</button>
    <button class="btn danger block" id="ef_del" style="margin-top:10px">REMOVE this entry</button>`);
  wireMealPicker();
  $("#ef_save").addEventListener("click",()=>{
    const g=+$("#ef_g").value; if(!g){toast("Enter grams");return;}
    const r=g/100;
    f.grams=g; f.kcal=per100.k*r; f.p=per100.p*r; f.c=per100.c*r; f.f=per100.ft*r;
    f.meal=readMeal(); f.time=readMealTime(clockHHMM(f.time));
    save(); closeModal(); renderFUEL(); toast("Updated");
  });
  $("#ef_dup").addEventListener("click",()=>{
    log.food.push({name:f.name,grams:f.grams,kcal:f.kcal,p:f.p,c:f.c,f:f.f,meal:mealOf(f),time:Date.now()});
    save(); closeModal(); renderFUEL(); toast("Duplicated");
  });
  $("#ef_del").addEventListener("click",()=>{
    const ix=log.food.indexOf(f); if(ix>=0)log.food.splice(ix,1); save(); closeModal(); renderFUEL(); toast("REMOVEd");
  });
}
function openRepeatMeal(){
  const days=Object.keys(DATA.log||{}).filter(d=>(DATA.log[d].food||[]).length).sort();
  if(!days.length){toast("No meals to copy yet");return;}
  const defaultDAY=days[days.length-1];
  const defMeal=suggestMeal();
  openModal(`<h3>Repeat a meal</h3>
    <p class="muted tiny" style="margin-bottom:12px">Copy a meal you've logged — from any day, including today — into ${shortDate(viewDate)}.</p>
    <div class="field"><label>From day</label><input class="input num" id="rm_day" type="date" value="${defaultDAY}" max="${todayISO()}"></div>
    <div class="field"><label>Copy this meal</label><div class="row wrap" id="rm_from" style="gap:7px">${MEALS.map(m=>`<button class="chip sm ${m.id===defMeal?"on":""}" data-m="${m.id}">${m.ic} ${m.name}</button>`).join("")}</div></div>
    <div class="field"><label>Into (on ${shortDate(viewDate)})</label><div class="row wrap" id="rm_to" style="gap:7px">${MEALS.map(m=>`<button class="chip sm ${m.id===defMeal?"on":""}" data-m="${m.id}">${m.ic} ${m.name}</button>`).join("")}</div></div>
    <div id="rm_preview" class="tiny muted" style="margin:4px 0 12px"></div>
    <button class="btn fuel block" id="rm_go">Copy to ${shortDate(viewDate)}</button>`);
  function pickVal(id){ const on=$("#modal").querySelector("#"+id+" .on"); return on?on.dataset.m:"snack"; }
  function srcItems(){ const L=DATA.log[$("#rm_day").value]; return L?(L.food||[]).filter(f=>mealOf(f)===pickVal("rm_from")):[]; }
  function upd(){ const items=srcItems(); const kcal=items.reduce((a,f)=>a+(f.kcal||0),0);
    if(!items.length){ $("#rm_preview").textContent="Nothing logged for that meal on that day."; return; }
    const names=items.map(f=>esc(f.name)).join(" · ");
    $("#rm_preview").innerHTML=`<div style="color:var(--text);font-weight:600;line-height:1.5;margin-bottom:3px">${names}</div>${items.length} item${items.length>1?"s":""} · ${eVal(kcal)} ${eUnit()} → ${mealById(pickVal("rm_to")).name}`;
  }
  function bindPick(id){ $("#modal").querySelectorAll("#"+id+" [data-m]").forEach(bt=>bt.addEventListener("click",()=>{
    $("#modal").querySelectorAll("#"+id+" [data-m]").forEach(x=>x.classList.remove("on")); bt.classList.add("on"); upd(); })); }
  bindPick("rm_from"); bindPick("rm_to");
  $("#rm_day").addEventListener("input",upd); upd();
  $("#rm_go").addEventListener("click",()=>{
    const items=srcItems(); if(!items.length){toast("Nothing to copy");return;}
    const meal=pickVal("rm_to");
    items.forEach(f=>{ dayLog(viewDate).food.push({name:f.name,grams:f.grams,kcal:f.kcal,p:f.p,c:f.c,f:f.f,meal,time:tsFromTime(viewDate,nowHHMM())}); });
    save(); closeModal(); renderFUEL(); toast("Copied "+items.length+" item"+(items.length>1?"s":"")+" to "+mealById(meal).name);
  });
}
function openBurned(){
  openModal(`<h3>KCAL burned</h3>
    <p class="muted tiny" style="margin-bottom:12px">From your watch, cardio machine, or an estimate. ${DATA.prefs.addMOVE?"<b style='color:var(--fuel)'>Currently added back to your budget.</b>":"Currently logged for info only."}</p>
    <div class="field"><label>Activity (optional)</label><input class="input" id="bn_n" placeholder="e.g. Apple Watch · Run"></div>
    <div class="field"><label>KCAL burned (${eUnit()})</label><input class="input num" id="bn_k" type="number" inputmode="numeric" placeholder="300"></div>
    <button class="btn block" id="bn_add">Log burned ${eUnit()}</button>`);
  $("#bn_add").addEventListener("click",()=>{
    let v=+$("#bn_k").value; if(!v){toast("Enter a number");return;}
    if(DATA.prefs.energy==="kj")v=v/4.184; /* store kcal internally */
    dayLog(viewDate).burned.push({name:$("#bn_n").value.trim(),kcal:v,time:Date.now()});
    save(); closeModal(); renderFUEL(); toast("Logged");
  });
}

/* ===================== CARDIO SCREEN ===================== */
let cardioFilter="machine";
let cardioMode="up"; /* "up" stopwatch | "down" countdown */
let cardioSession=null; /* {name,met,ic,mode,targetMs,elapsedMs,running,tickId,lastTs} */
function renderCARDIO(){
  const b=$("#cardioBody"); b.innerHTML="";
  const tb=el("div","topbar");
  tb.innerHTML=`<div class="row" style="gap:12px;align-items:center"><button class="iconbtn" id="cd_back" style="font-size:18px">‹</button>
    <div><div class="hello">Get the heart going</div><div class="date">CARDIO</div></div></div>`;
  b.appendChild(tb);
  $("#cd_back").addEventListener("click",()=>switchTab("train"));

  if(cardioSession){ renderCARDIOSession(b); return; }
  b.appendChild(helpBar("cardio"));

  /* mode: stopwatch / countdown */
  const modeSeg=el("div","seg"); modeSeg.style.marginBottom="10px";
  [["up","⏱ Stopwatch"],["down","⏳ Countdown"]].forEach(([v,l])=>{
    const x=el("button",cardioMode===v?"on":"",l);
    x.addEventListener("click",()=>{cardioMode=v;renderCARDIO();}); modeSeg.appendChild(x);
  });
  b.appendChild(modeSeg);

  /* machines / home filter */
  const seg=el("div","seg"); seg.style.marginBottom="14px";
  [["machine","Machines"],["home","At home"]].forEach(([v,l])=>{
    const x=el("button",cardioFilter===v?"on":"",l);
    x.addEventListener("click",()=>{cardioFilter=v;renderCARDIO();}); seg.appendChild(x);
  });
  b.appendChild(seg);

  const grid=el("div","cardio-grid");
  CARDIO.filter(c=>c.t===cardioFilter).forEach(c=>{
    const per30=Math.round(cardioKcal(c.met,30*60));
    const dist=cardioDISTANCEKm(c.n,30*60);
    const tile=el("button","cardio-tile");
    tile.innerHTML=`<div class="cti">${c.ic}</div><div class="ctn">${esc(c.n)}</div>
      <div class="cts num">~${eVal(per30)} ${eUnit()}${dist?` · ${dist.toFixed(1)}km`:""}<span class="per"> /30m</span></div>`;
    tile.addEventListener("click",()=>askCARDIOGO(c));
    grid.appendChild(tile);
  });
  b.appendChild(grid);
  b.appendChild(el("div","center muted tiny",`KCAL & distance are estimates from your bodyweight (${cardioBODYWEIGHT()} kg) and height — not measured. EDITable before you log.`)).style.padding="14px 6px 0";
}
function askCARDIOGO(c){
  if(cardioMode==="up"){ startCARDIO(c,0); return; }
  openModal(`<h3>Countdown timer</h3>
    <p class="muted tiny" style="margin-bottom:12px">${c.ic} ${esc(c.n)} — set how long you'll go.</p>
    <div class="field"><label>Minutes</label><input class="input num" id="cd_min" type="number" inputmode="numeric" value="20"></div>
    <button class="btn str block" id="cd_begin">GO countdown</button>`);
  $("#cd_begin").addEventListener("click",()=>{
    const m=+$("#cd_min").value||0; if(m<=0){toast("Enter minutes");return;}
    closeModal(); startCARDIO(c, m*60000);
  });
}
function startCARDIO(c,targetMs){
  cardioSession={name:c.n,met:c.met,ic:c.ic,mode:cardioMode,targetMs:targetMs||0,
    elapsedMs:0,running:true,lastTs:Date.now(),tickId:null};
  cardioSession.tickId=setInterval(cardioTick,250);
  requestWakeLock&&requestWakeLock();
  renderCARDIO();
}
function cardioTick(){
  const s=cardioSession; if(!s||!s.running)return;
  const now=Date.now(); s.elapsedMs+=now-s.lastTs; s.lastTs=now;
  if(s.mode==="down" && s.elapsedMs>=s.targetMs){
    s.elapsedMs=s.targetMs; s.running=false;
    clearInterval(s.tickId); s.tickId=null;
    flashScreen(); beep(); toast("Time's up — nice work 🔥");
    updateCARDIODynamic(); finishCARDIO();
    return;
  }
  updateCARDIODynamic();
}
function fmtClock(ms){
  const t=Math.max(0,Math.floor(ms/1000)), h=Math.floor(t/3600), m=Math.floor((t%3600)/60), sec=t%60;
  const mm=String(m).padGO(2,"0"), ss=String(sec).padGO(2,"0");
  return h>0?`${h}:${mm}:${ss}`:`${mm}:${ss}`;
}
function renderCARDIOSession(b){
  const s=cardioSession;
  const panel=el("div","card center"); panel.id="cardioPanel";
  panel.innerHTML=`
    <div style="font-size:42px;margin-bottom:2px">${s.ic}</div>
    <div class="eyebrow" style="margin-bottom:6px">${esc(s.name)}</div>
    <div class="tiny muted" style="margin-bottom:8px">${s.mode==="down"?`Counting down · ${fmtClock(s.targetMs)} set`:"Stopwatch"}</div>
    <div class="disp" id="cd_clock" style="font-size:74px;line-height:1">${fmtClock(s.mode==="down"?Math.max(0,s.targetMs-s.elapsedMs):s.elapsedMs)}</div>
    <div class="num" id="cd_burn" style="margin-top:8px;color:var(--fuel);font-weight:700;font-size:17px"></div>
    <div class="row" style="gap:10px;margin-top:20px">
      <button class="btn" id="cd_toggle" style="flex:1"></button>
      <button class="btn fuel" id="cd_finish" style="flex:1">END SESSION & log</button>
    </div>
    <button class="btn ghost block" id="cd_cancel" style="margin-top:10px">Discard</button>`;
  b.appendChild(panel);
  /* handlers attached ONCE so taps never land mid-repaint */
  $("#cd_toggle").addEventListener("click",()=>{
    const s=cardioSession; if(!s)return;
    s.running=!s.running; s.lastTs=Date.now();
    if(s.running && !s.tickId) s.tickId=setInterval(cardioTick,250);
    setCARDIOToggleLabel();
  });
  $("#cd_finish").addEventListener("click",finishCARDIO);
  $("#cd_cancel").addEventListener("click",()=>{
    confirmModal({title:"Stop this cardio?",danger:true,confirmText:"Discard it",body:"Are you sure? This session won't be logged.",
      onCONFIRM:()=>{ stopCARDIO(); renderCARDIO(); }});
  });
  setCARDIOToggleLabel(); updateCARDIODynamic();
  const note=el("div","center muted tiny",`Keep this screen open — it stays awake during cardio.`);
  note.style.padding="16px 6px 0"; b.appendChild(note);
}
function setCARDIOToggleLabel(){
  const t=$("#cd_toggle"); const s=cardioSession; if(!t||!s)return;
  t.textContent=s.running?"PAUSE":"RESUME";
  t.className="btn"+(s.running?"":" str"); t.style.flex="1";
}
function updateCARDIODynamic(){
  const s=cardioSession; const clk=$("#cd_clock"); if(!s||!clk)return;
  const secs=s.elapsedMs/1000, kcal=cardioKcal(s.met,secs), dist=cardioDISTANCEKm(s.name,secs);
  const showMs = s.mode==="down" ? Math.max(0,s.targetMs-s.elapsedMs) : s.elapsedMs;
  clk.textContent=fmtClock(showMs);
  const burn=$("#cd_burn"); if(burn)burn.innerHTML=`~${eVal(kcal)} ${eUnit()}${dist!=null?` · ~${dist.toFixed(2)} km <span class="muted" style="font-weight:400">(est.)</span>`:""}`;
}
function stopCARDIO(){ if(cardioSession&&cardioSession.tickId)clearInterval(cardioSession.tickId); cardioSession=null; }
function finishCARDIO(){
  const s=cardioSession; if(!s)return;
  s.running=false; if(s.tickId){clearInterval(s.tickId);s.tickId=null;}
  const secs=Math.max(0,Math.round(s.elapsedMs/1000));
  const estKcal=Math.round(cardioKcal(s.met,secs));
  const dist=cardioDISTANCEKm(s.name,secs);
  openModal(`<h3>Log cardio</h3>
    <p class="muted tiny" style="margin-bottom:14px">${s.ic} ${esc(s.name)} · ${fmtClock(s.elapsedMs)}${dist!=null?` · ~${dist.toFixed(2)} km (est.)`:""}</p>
    <div class="field"><label>KCAL burned (${eUnit()})</label>
      <input class="input num" id="cd_k" type="number" inputmode="numeric" value="${eVal(estKcal)}"></div>
    <label style="display:flex;align-items:center;gap:10px;margin:4px 0 16px;font-size:14px">
      <input type="checkbox" id="cd_budget" ${DATA.prefs.addMOVE?"checked":""} style="width:20px;height:20px">
      Add to today's burned total${DATA.prefs.addMOVE?" (counts toward your calorie budget)":""}</label>
    <button class="btn fuel block" id="cd_log">Log it</button>
    <button class="btn ghost block" id="cd_skip" style="margin-top:10px">Don't log</button>`);
  $("#cd_log").addEventListener("click",()=>{
    let v=+$("#cd_k").value||0; if(DATA.prefs.energy==="kj")v=v/4.184;
    const rec={id:Date.now(),date:todayISO(),name:s.name,type:s.met>=8?"intense":"steady",
      seconds:secs,kcal:Math.round(v),distanceKm:dist!=null?+dist.toFixed(2):null};
    DATA.cardio.push(rec);
    if($("#cd_budget").checked){
      dayLog(todayISO()).burned.push({name:s.name+" ("+fmtClock(s.elapsedMs)+")",kcal:v,time:Date.now()});
    }
    save(); stopCARDIO(); closeModal(); switchTab("fuel"); toast("CARDIO logged 🔥");
  });
  $("#cd_skip").addEventListener("click",()=>{ stopCARDIO(); closeModal(); renderCARDIO(); });
}
function deleteCARDIO(id, after){
  const ix=DATA.cardio.findIndex(c=>c.id===id); if(ix<0)return;
  const removed=DATA.cardio[ix];
  DATA.cardio.splice(ix,1); save(); if(after)after();
  toastUNDO("CARDIO session removed",()=>{ DATA.cardio.splice(Math.min(ix,DATA.cardio.length),0,removed); save(); if(after)after(); });
}

/* ===================== STATS SCREEN ===================== */
let statMachine=null;
let calMonth=null; /* Date of first of viewed month */
function renderCalendar(b, noHeader){
  if(calMonth===null){const d=new Date();calMonth=new Date(d.getFullYear(),d.getMonth(),1);}
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  /* map date -> {str,car,sched} */
  const map={};
  DATA.workouts.forEach(w=>{ (map[w.date]=map[w.date]||{}).str=true; });
  DATA.cardio.forEach(c=>{ (map[c.date]=map[c.date]||{}).car=true; });
  Object.keys(DATA.log||{}).forEach(d=>{ const L=DATA.log[d]; if(L&&L.burned&&L.burned.length){(map[d]=map[d]||{}).car=true;} });
  if(!noHeader) b.appendChild(el("div","sect-h",`<h3>Calendar</h3>`));
  const card=el("div","card");
  const monthName=calMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const head=el("div","cal-head");
  head.innerHTML=`<button class="iconbtn" id="cal_prev">‹</button><div style="font-weight:700">${monthName}</div><button class="iconbtn" id="cal_next">›</button>`;
  card.appendChild(head);
  const grid=el("div","cal-grid");
  ["M","T","W","T","F","S","S"].forEach(d=>{const c=el("div","cal-dow",d);grid.appendChild(c);});
  const firstDow=(new Date(y,m,1).getDAY()+6)%7;
  const days=new Date(y,m+1,0).getDate();
  for(let i=0;i<firstDow;i++) grid.appendChild(el("div","cal-cell"));
  const todayStr=todayISO();
  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(m+1).padGO(2,"0")}-${String(d).padGO(2,"0")}`;
    const info=map[ds];
    const cell=el("div","cal-cell"+(info?" has":"")+(ds===todayStr?" today":""));
    let dot=""; if(info){ const cls=info.str&&info.car?"both":info.str?"str":"car"; dot=`<div class="cal-dot ${cls}"></div>`; }
    cell.innerHTML=`${d}${dot}`;
    if(info) cell.addEventListener("click",()=>showDAYSummary(ds));
    grid.appendChild(cell);
  }
  card.appendChild(grid);
  const legend=el("div","row","" ); legend.style.cssText="gap:14px;margin-top:10px;justify-content:center";
  legend.innerHTML=`<span class="tiny muted"><span class="cal-dot str" style="display:inline-block;vertical-align:middle"></span> Lifting</span>
    <span class="tiny muted"><span class="cal-dot car" style="display:inline-block;vertical-align:middle"></span> CARDIO</span>
    <span class="tiny muted"><span class="cal-dot both" style="display:inline-block;vertical-align:middle"></span> Both</span>`;
  card.appendChild(legend);
  b.appendChild(card);
  $("#cal_prev").addEventListener("click",()=>{calMonth=new Date(y,m-1,1);renderSTATS & DATA();});
  $("#cal_next").addEventListener("click",()=>{calMonth=new Date(y,m+1,1);renderSTATS & DATA();});
}
function showDAYSummary(ds){
  const ws=DATA.workouts.filter(w=>w.date===ds);
  const cs=DATA.cardio.filter(c=>c.date===ds);
  let html=`<h3>${prettyDate(ds)}</h3>`;
  if(!ws.length&&!cs.length){ html+=`<p class="muted">Nothing logged this day.</p>`; }
  ws.forEach(w=>{ html+=`<div class="card" style="margin:10px 0"><div class="t" style="font-weight:700">${esc(w.title)}</div>
    <div class="s muted tiny" style="margin:2px 0 8px">${volStr(w.volume)} · ${w.moves.length} exercise${w.moves.length===1?"":"s"}${w.prs&&w.prs.length?` · ${w.prs.length} PR${w.prs.length>1?"s":""}`:""}</div>
    <div class="tiny">${w.moves.map(e=>esc(e.name)).join(" · ")}</div></div>`; });
  if(cs.length){ const tot=cs.reduce((a,c)=>a+c.seconds,0); const kc=cs.reduce((a,c)=>a+(c.kcal||0),0);
    html+=`<div class="card" style="margin:10px 0"><div class="t" style="font-weight:700">🏃 CARDIO</div>
    <div class="s muted tiny" style="margin-top:2px">${fmtClock(tot*1000)} · ${eVal(kc)} ${eUnit()} · ${cs.map(c=>esc(c.name)).join(", ")}</div></div>`; }
  html+=`<button class="btn block" id="ds_close" style="margin-top:8px">CLOSE</button>`;
  openModal(html); $("#ds_close").addEventListener("click",closeModal);
}
function targetSTREAK(kind, sinceISO){
  /* count consecutive days up to today hitting protein/water target */
  if(!DATA.targets)return 0;
  let streak=0;
  for(let i=0;i<60;i++){
    const d=new Date(); d.setDate(d.getDate()-i); const ds=todayISO(d);
    if(sinceISO && ds<sinceISO) break;
    const L=DATA.log[ds]; if(!L){ if(i===0)continue; else break; }
    let hit=false;
    if(kind==="water"){ hit=(L.water||0)>=(DATA.targets.water||9); }
    else { const pro=(L.food||[]).reduce((a,f)=>a+(f.p||0),0); hit=pro>=(DATA.targets.protein||0)*0.9; }
    if(hit)streak++; else { if(i===0)continue; break; }
  }
  return streak;
}
function renderSTREAKs(b, noHeader){
  if(!DATA.targets)return;
  if(!noHeader) b.appendChild(el("div","sect-h",`<h3>STREAKs ${infoBtn("streak")}</h3>`));
  const ps=dispPROTEINSTREAK(), wsk=dispHydrationSTREAK();
  const card=el("div","streak-grid");
  card.innerHTML=`
    <div class="streak-tile"><div class="big" style="color:var(--strength)">${dispSESSIONSTREAK()}</div><div class="tiny muted">SESSION days</div></div>
    <div class="streak-tile"><div class="big" style="color:#E94f8a">${ps}</div><div class="tiny muted">PROTEIN 🥩</div></div>
    <div class="streak-tile"><div class="big" style="color:#5AA9FF">${wsk}</div><div class="tiny muted">Hydration 💧</div></div>`;
  b.appendChild(card);
  if(noHeader){ const inf=el("div","tiny muted center"); inf.style.marginTop="10px"; inf.innerHTML=`What counts as a streak? ${infoBtn("streak")}`; b.appendChild(inf); bindInfo(inf); }
  else bindInfo(b.lastChild.previousSibling);
}
/* ---------- paginated + expandable history lists ---------- */
let listPages={};
function paginatedList(container, id, items, perPage, rowFn){
  const inner=el("div"); container.appendChild(inner);
  function paint(){
    inner.innerHTML="";
    const total=items.length, pages=Math.max(1, Math.ceil(total/perPage));
    let pg=listPages[id]||0; if(pg>=pages)pg=pages-1; if(pg<0)pg=0; listPages[id]=pg;
    const start=pg*perPage;
    items.slice(start, start+perPage).forEach((it,i)=> inner.appendChild(rowFn(it, start+i)));
    if(pages>1){
      const nav=el("div","pager");
      const prev=el("button","pager-btn","‹ Prev"); prev.disabled=pg===0;
      const lab=el("div","pager-lab",`Page ${pg+1} / ${pages} · ${total} total`);
      const next=el("button","pager-btn","NEXT ›"); next.disabled=pg>=pages-1;
      prev.addEventListener("click",()=>{ listPages[id]=pg-1; paint(); });
      next.addEventListener("click",()=>{ listPages[id]=pg+1; paint(); });
      nav.append(prev,lab,next); inner.appendChild(nav);
    }
  }
  paint();
}
function repeatSESSIONFromHistory(w){
  const moves=(w.moves||[]).map(ex=>{
    const sets=(ex.sets||[]).filter(st=>!st.warmup).map(st=>({kg:+st.kg||"", reps:+st.reps||"", done:false, rir:null}));
    return {name:ex.name,group:ex.group||EX_BY_NAME[ex.name]?.g||"",sets:sets.length?sets:[blankSet()]};
  }).filter(ex=>ex.name);
  if(!moves.length){toast("No saved moves to repeat");return;}
  closeModal();
  startSession((w.title||"SESSION")+" again","repeat",moves);
  toast("Loaded from history");
}
function workoutHistRow(w){
  const wrap=el("div","hist-item");
  const head=el("div","lrow hist-head");
  head.innerHTML=`<div class="ico">${workoutGroupIcon(w)}</div><div class="main"><div class="t">${esc(w.title)}</div>
    <div class="s">${shortDate(w.date)} · ${w.moves.length} exercise${w.moves.length===1?"":"s"} · ${volStr(w.volume)}${w.prs&&w.prs.length?` · ${w.prs.length} PR${w.prs.length>1?"s":""} 🏅`:""}</div></div>
    <span class="hist-x">▾</span>`;
  const del=el("button","del","×"); del.addEventListener("click",(e)=>{ e.stopPropagation(); deleteSESSION(w.id,renderSTATS & DATA); });
  head.appendChild(del);
  const body=el("div","hist-body"); body.style.display="none";
  let html=`<div class="hist-date">${prettyDate(w.date)}${w.durationMin?` · ${w.durationMin} min`:""}</div>`;
  if((w.moves||[]).length){
    (w.moves||[]).forEach(ex=>{
      const work=(ex.sets||[]).filter(s=>!s.warmup && +s.kg>=0 && +s.reps>0);
      const setsStr = work.length ? work.map(s=>`${liftStr(s.kg)} × ${s.reps}`).join(", ") : "—";
      html+=`<div class="hist-ex"><div class="hx-n">${esc(ex.name)}</div><div class="hx-s">${setsStr}</div></div>`;
    });
  } else { html+=`<div class="hist-empty">No exercise detail saved for this session.</div>`; }
  if(w.notes){ html+=`<div class="hist-note">📝 ${esc(w.notes)}</div>`; }
  body.innerHTML=html;
  const again=el("button","btn str block hist-repeat","↻ Do this workout again");
  again.addEventListener("click",e=>{ e.stopPropagation(); repeatSESSIONFromHistory(w); });
  body.appendChild(again);
  head.addEventListener("click",()=>{
    const open=body.style.display==="none";
    body.style.display=open?"block":"none";
    const x=head.querySelector(".hist-x"); if(x)x.style.transform=open?"rotate(180deg)":"";
  });
  wrap.append(head,body); return wrap;
}
function cardioHistRow(c){
  const r=el("div","hist-item");
  const head=el("div","lrow");
  head.innerHTML=`<div class="ico">${(CARDIO.find(x=>x.n===c.name)||{}).ic||"🏃"}</div>
    <div class="main"><div class="t">${esc(c.name)}</div>
    <div class="s num">${shortDate(c.date)} · ${fmtClock(c.seconds*1000)} · ${eVal(c.kcal)} ${eUnit()}${c.distanceKm?` · ~${c.distanceKm} km`:""}</div></div>`;
  const del=el("button","del","×"); del.addEventListener("click",()=>deleteCARDIO(c.id,renderSTATS & DATA));
  head.appendChild(del); r.appendChild(head); return r;
}
function renderSTATS & DATA(){
  const b=$("#statsBody"); b.innerHTML="";
  b.appendChild(helpBar("stats"));
  b.appendChild(el("div","topbar",`<div><div class="hello">Keep the line climbing</div><div class="date">PROGRESS</div></div>`));
  maybeBACKUPBanner(b);

  /* ===== PINNED SUMMARY ===== */
  /* last 30 days summary hero */
  {
    const since=Date.now()-30*86400000;
    const recent=DATA.workouts.filter(w=>new Date(w.date).getTime()>=since);
    const rc=DATA.cardio.filter(c=>new Date(c.date).getTime()>=since);
    const vol=recent.reduce((a,w)=>a+(w.volume||0),0);
    const prs=recent.reduce((a,w)=>a+((w.prs||[]).length),0);
    const mh=el("div","mini-hero");
    mh.innerHTML=`<div class="mh-t">Last 30 days</div><div class="mh-row">
      <div><div class="v" style="color:var(--strength)">${recent.length}</div><div class="k">SESSIONS</div></div>
      <div><div class="v" style="color:var(--blue)">${tonneVal(vol)}${tonneUnit()}</div><div class="k">TOTAL LOAD</div></div>
      <div><div class="v" style="color:var(--gold)">${prs}</div><div class="k">PRs</div></div>
      <div><div class="v" style="color:var(--fuel)">${rc.length}</div><div class="k">CARDIO</div></div></div>`;
    b.appendChild(mh);
  }
  const p=DATA.profile;
  const curW=DATA.weights.length?DATA.weights[DATA.weights.length-1].kg:(p?.weightKg||0);
  const bmiV=p?bmi({heightCm:p.heightCm,weightKg:curW}):0;
  const wTile = !curW ? "—" : (bodyUnit()==="st" ? bodyStr(curW) : `${Math.round(bodyToUnit(curW)*10)/10}<small> ${bodyLbl()}</small>`);
  const ov=el("div","grid2");
  ov.innerHTML=`
   <div class="stat"><div class="k">BODYWEIGHT</div><div class="v num">${wTile}</div></div>
   <div class="stat"><div class="k">BMI</div><div class="v num">${bmiV?bmiV.toFixed(1):"—"}<small> ${bmiV?bmiCat(bmiV):""}</small></div></div>
   <div class="stat"><div class="k">BEST STREAK</div><div class="v">${dispBestSTREAK()}<small> days</small></div></div>
   <div class="stat"><div class="k">Total lifted</div><div class="v num">${tonneVal(dispTOTAL LOAD())}<small> ${tonneUnit()}</small></div></div>`;
  ov.style.marginBottom="6px";
  b.appendChild(ov);
  b.appendChild(el("div","tiny muted center","Grouped below — tap a section to open it, or use Expand all"))
   .style.cssText="margin:4px 0 14px;letter-spacing:.03em";

  /* ===== DROPDOWN SECTIONS ===== */
  function buildGOAL(body){
    const start=DATA.weights[0].kg, goal=p.goalBODYWEIGHTKg, now=curW;
    const totalChange=Math.abs(goal-start)||1, doneChange=Math.abs(now-start);
    const prog=Math.min(100,Math.round(doneChange/totalChange*100));
    const gc=el("div","card");
    gc.innerHTML=`<div class="lrow" style="padding:0 0 10px"><div class="main">
      <div class="t">TARGET WEIGHT</div><div class="s num">${bodyStr(now)} → ${bodyStr(goal)}</div></div>
      <div class="num" style="font-family:'Bebas Neue';font-size:30px;color:var(--fuel)">${prog}%</div></div>
      <div class="bar"><i style="width:${prog}%;background:var(--grad-fuel)"></i></div>`;
    body.appendChild(gc);
  }
  function buildBODYWEIGHT(body){
    const logW=el("button","btn sm","＋ Log weight"); logW.style.marginBottom="12px"; logW.addEventListener("click",openLogBODYWEIGHT); body.appendChild(logW);
    const wc=el("div","card");
    if(DATA.weights.length>=2){
      const pts=DATA.weights.map(w=>({x:new Date(w.date).getTime()/86400000,y:Math.round(bodyToUnit(w.kg)*10)/10}));
      wc.innerHTML=lineChart(pts,"#2FE6A8",{h:170});
      wc.innerHTML+=`<div class="row" style="justify-content:space-between;margin-top:6px"><span class="tiny muted">${shortDate(DATA.weights[0].date)} · ${bodyStr(DATA.weights[0].kg)}</span><span class="tiny muted">${shortDate(DATA.weights[DATA.weights.length-1].date)} · ${bodyStr(DATA.weights[DATA.weights.length-1].kg)}</span></div>`;
    }else if(DATA.weights.length===1){
      const w=DATA.weights[0];
      wc.innerHTML=`<div class="center" style="padding:8px 0"><div class="tiny muted" style="letter-spacing:.1em">LATEST · ${shortDate(w.date)}</div>
        <div class="disp" style="font-size:48px;color:var(--fuel)">${bodyStr(w.kg)}</div>
        <div class="tiny muted" style="margin-top:4px">Log again on another day to see your trend line.</div></div>`;
    }else{ wc.innerHTML=`<div class="empty">Tap ＋ Log weight to record your weight.</div>`; }
    body.appendChild(wc);
  }
  function buildPROGRESSPhotos(body){
    const host=el("div");
    function paint(){
      host.innerHTML="";
      const intro=el("p","tiny muted","Private to this device — progress photos are never uploaded, synced, or included in any backup. They stay only on this phone.");
      intro.style.cssText="margin:0 0 12px;line-height:1.5"; host.appendChild(intro);
      const add=el("button","btn sm","📸 Add progress photo"); add.style.marginBottom="12px";
      const fileIn=el("input"); fileIn.type="file"; fileIn.accept="image/*"; fileIn.style.display="none";
      add.addEventListener("click",()=>fileIn.click());
      fileIn.addEventListener("change",e=>{ const f=e.target.files&&e.target.files[0]; if(f) addPROGRESSPhotoFromFile(f,()=>{ paint(); if(made&&made.pg_photos&&made.pg_photos._setSub) made.pg_photos._setSub(getPROGRESSPhotos().length+" saved · private to this device"); }); });
      host.append(add,fileIn);
      const photos=getPROGRESSPhotos();
      if(!photos.length){ host.appendChild(el("div","empty","NO PHOTOS YET. — add one to start a private visual timeline.")); body.appendChild(host); return; }
      const grid=el("div","photo-grid");
      photos.forEach(p=>{
        const safeSrc=safeInlineImageSrc(p.img,"");
        if(!safeSrc) return;
        const cell=el("div","photo-cell");
        cell.innerHTML=`<img src="${esc(safeSrc)}" alt="PROGRESS ${shortDate(p.date)}"><div class="photo-date">${shortDate(p.date)}</div><button class="photo-del" data-del="${p.id}" title="DELETE">✕</button>`;
        grid.appendChild(cell);
      });
      host.appendChild(grid);
      grid.querySelectorAll("[data-del]").forEach(btn=>btn.addEventListener("click",()=>{
        confirmModal({title:"DELETE this photo?",danger:true,confirmText:"DELETE",body:"This removes the photo from this device. It can't be undone.",onCONFIRM:()=>{ deletePROGRESSPhoto(+btn.dataset.del,paint); toast("Photo deleted"); }});
      }));
      body.appendChild(host);
    }
    paint();
  }
  function buildTOTAL LOAD(body){
    const vc=el("div","card");
    const vw=DATA.workouts.filter(w=>w.volume>0);
    if(vw.length>=2){
      const pts=vw.map((w,i)=>({x:i,y:Math.round(liftFromKg(w.volume))}));
      vc.innerHTML=lineChart(pts,"#FF6A2C",{h:170});
      vc.innerHTML+=`<div class="row" style="justify-content:space-between;margin-top:6px"><span class="tiny muted">${shortDate(vw[0].date)}</span><span class="tiny muted">${shortDate(vw[vw.length-1].date)}</span></div>`;
    }else{ vc.innerHTML=`<div class="empty">END SESSION a couple of workouts to track your lifting trend.</div>`; }
    body.appendChild(vc);
  }
  function buildStrength(body){
    const machineHist={};
    DATA.workouts.slice().sort((a,b2)=>a.id-b2.id).forEach(w=>{
      (w.moves||[]).forEach(ex=>{
        let best=0,bestReps=0; (ex.sets||[]).forEach(st=>{ if(!st.warmup && +st.kg>0){ if(+st.kg>best){best=+st.kg;bestReps=+st.reps||0;} } });
        if(best>0){ (machineHist[ex.name]=machineHist[ex.name]||[]).push({date:w.date,kg:best,reps:bestReps}); }
      });
    });
    const machineNames=Object.keys(machineHist).sort((a,c)=>machineHist[c].length-machineHist[a].length);
    const mc=el("div","card");
    if(machineNames.length){
      if(!statMachine || !machineHist[statMachine]) statMachine=machineNames[0];
      const sel=el("select","input"); sel.style.marginBottom="12px";
      sel.innerHTML=machineNames.map(n=>`<option value="${esc(n)}" ${n===statMachine?"selected":""}>${esc(n)} (${machineHist[n].length})</option>`).join("");
      sel.addEventListener("change",()=>{ statMachine=sel.value; renderSTATS & DATA(); });
      mc.appendChild(sel);
      const hist=machineHist[statMachine];
      const chartHost=el("div");
      if(hist.length>=2){
        const pts=hist.map((h,i)=>({x:i,y:Math.round(liftFromKg(h.kg)*10)/10}));
        chartHost.innerHTML=lineChart(pts,"#5AA9FF",{h:160})
          +`<div class="row" style="justify-content:space-between;margin-top:6px"><span class="tiny muted">${shortDate(hist[0].date)}</span><span class="tiny muted">${shortDate(hist[hist.length-1].date)}</span></div>`;
      } else {
        const top=hist[hist.length-1];
        chartHost.innerHTML=`<div class="empty">Best so far: <b style="color:var(--text)">${liftStr(top.kg)}</b>.<br>Log this again to see the trend.</div>`;
      }
      mc.appendChild(chartHost);
      let bestH=hist[0]; hist.forEach(h=>{ if(h.kg>bestH.kg)bestH=h; });
      const rm=bestH.reps?est1RMkg(bestH.kg,bestH.reps):0;
      const line=el("div","tiny muted");
      line.innerHTML=`Best set: <b style="color:var(--text)">${liftStr(bestH.kg)}${bestH.reps?" × "+bestH.reps:""}</b>`+
        (rm?` · Est. 1RM: <b style="color:var(--strength)">${liftStr(rm)}</b> ${infoBtn("oneRM")}`:"")+
        ` · ${hist.length} session${hist.length>1?"s":""}`;
      line.style.marginTop="8px"; mc.appendChild(line); bindInfo(line);
    } else { mc.innerHTML=`<div class="empty">Log workouts to track weight per exercise here.</div>`; }
    body.appendChild(mc);
  }
  function buildTargets(body){
    const t=DATA.targets;
    const tc=el("div","card");
    tc.innerHTML=`<div class="grid2">
      <div class="stat"><div class="k">KCAL</div><div class="v num">${eVal(t.calories)}<small> ${eUnit()}</small></div></div>
      <div class="stat"><div class="k">PROTEIN</div><div class="v num">${t.protein}<small> g</small></div></div>
      <div class="stat"><div class="k">CARBS</div><div class="v num">${t.carbs}<small> g</small></div></div>
      <div class="stat"><div class="k">FAT</div><div class="v num">${t.fat}<small> g</small></div></div></div>
      <p class="tiny muted" style="margin-top:10px">${DATA.prefs.targetMode==="manual"?"You set these manually (More → PROFILE, or the FUEL tab)":(t.bmr?`BMR ${eVal(t.bmr)} · maintenance ${eVal(t.tdee)} ${eUnit()} (Mifflin–St Jeor)`:"")}</p>`;
    body.appendChild(tc);
  }
  function buildSESSIONS(body){
    const hc=el("div","card");
    if(DATA.workouts.length){
      const sorted=DATA.workouts.slice().sort((a,b2)=>b2.id-a.id);
      paginatedList(hc, "workoutHist", sorted, 5, workoutHistRow);
    } else { hc.innerHTML=`<div class="empty">No workouts logged yet.</div>`; }
    body.appendChild(hc);
  }
  function buildCARDIO(body){
    if(DATA.cardio.length){
      const totSec=DATA.cardio.reduce((s,c)=>s+c.seconds,0);
      const totKcal=DATA.cardio.reduce((s,c)=>s+c.kcal,0);
      const totKm=DATA.cardio.reduce((s,c)=>s+(c.distanceKm||0),0);
      const sum=el("div","grid3");
      sum.innerHTML=`
        <div class="stat"><div class="k">Sessions</div><div class="v">${DATA.cardio.length}</div></div>
        <div class="stat"><div class="k">Time</div><div class="v num">${Math.round(totSec/60)}<small> min</small></div></div>
        <div class="stat"><div class="k">Burned</div><div class="v num">${eVal(totKcal)}<small> ${eUnit()}</small></div></div>`;
      body.appendChild(sum);
      if(totKm>0){
        const km=el("div","card"); km.style.marginTop="12px";
        km.innerHTML=`<div class="lrow" style="padding:0"><div class="ico">📍</div><div class="main"><div class="t">Total distance (estimated)</div><div class="s">across all cardio sessions</div></div><div class="num" style="font-family:'Bebas Neue';font-size:30px;color:var(--blue)">${totKm.toFixed(1)} km</div></div>`;
        body.appendChild(km);
      }
      const cc=el("div","card"); cc.style.marginTop="12px";
      const sortedC=DATA.cardio.slice().sort((a,c)=>c.id-a.id);
      paginatedList(cc, "cardioHist", sortedC, 5, cardioHistRow);
      body.appendChild(cc);
    } else {
      body.appendChild(el("div","empty","No cardio logged yet — start a session on the CARDIO tab."));
    }
  }
  function buildBadges(body){
    const note=el("div","tiny muted");
    note.style.cssText="line-height:1.5;margin-bottom:12px";
    note.innerHTML=`🚧 <b>More badges on the way</b> — achievements are still being added to, so keep an eye out for new ones to unlock.`;
    body.appendChild(note);
    const bg=el("div","badge-grid");
    BADGES.forEach(bd=>{const un=DATA.ach.unlocked.includes(bd.id);
      const c=el("div","badge"+(un?" un":""));
      c.innerHTML=`<div class="bi">${un?bd.icon:"🔒"}</div><div class="bt">${bd.t}</div><div class="bd">${bd.d}</div>`;
      bg.appendChild(c);});
    body.appendChild(bg);
  }
  function buildMega(body){
    const megas=DATA.workouts.filter(w=>w.type==="mega");
    if(!megas.length){ body.appendChild(el("div","empty","No MEGA SESSIONs yet — build one on the TRAIN tab (look for MEGA WORKOUT 💥). It mixes several muscle groups in one session.")); return; }
    const totalVol=megas.reduce((s,w)=>s+(w.volume||0),0);
    /* favourite = most-repeated mega (by title) */
    const titleCount={}; megas.forEach(w=>{ titleCount[w.title]=(titleCount[w.title]||0)+1; });
    let favTitle=null,favN=0; Object.keys(titleCount).forEach(t=>{ if(titleCount[t]>favN){favN=titleCount[t];favTitle=t;} });
    /* most-trained groups across megas */
    const gc={}; megas.forEach(w=>(w.moves||[]).forEach(ex=>{ if(ex.group)gc[ex.group]=(gc[ex.group]||0)+1; }));
    const topGroups=Object.keys(gc).sort((a,c)=>gc[c]-gc[a]).slice(0,3).map(g=>`${GICON[g]||""} ${g}`).join("  ")||"—";
    const sum=el("div","grid2");
    sum.innerHTML=`
      <div class="stat"><div class="k">MEGA SESSIONs</div><div class="v">${megas.length}</div></div>
      <div class="stat"><div class="k">Mega volume</div><div class="v num">${tonneVal(totalVol)}<small> ${tonneUnit()}</small></div></div>`;
    body.appendChild(sum);
    const info=el("div","card"); info.style.marginTop="12px";
    info.innerHTML=`<div class="lrow" style="padding:0 0 9px"><div class="ico">💥</div><div class="main"><div class="t">Favourite mega</div>
      <div class="s">${favN>=2?esc(favTitle)+` · done ${favN}×`:"No repeats yet — do the same mega twice to set a favourite"}</div></div></div>
      <div class="tiny muted">Most-trained in megas: ${topGroups}</div>`;
    body.appendChild(info);
    const lab=el("div","tiny muted"); lab.style.cssText="text-transform:uppercase;letter-spacing:.05em;margin:16px 0 6px"; lab.textContent="Recent mega sessions";
    body.appendChild(lab);
    const hc=el("div","card");
    paginatedList(hc,"megaHist",megas.slice().sort((a,c)=>c.id-a.id),3,workoutHistRow);
    body.appendChild(hc);
  }

  /* build each section once, keyed by id, then lay them out in 3 labelled groups */
  const made={};
  const mk=(id,icon,title,sub,fn)=>{ made[id]=moreAcc(id,icon,title,sub,fn); return made[id]; };
  if(p&&p.goalBODYWEIGHTKg&&DATA.weights.length) mk("pg_goal","🎯","TARGET WEIGHT","How close you are to your goal weight",buildGOAL);
  mk("pg_calendar","🗓️","Calendar","Your training days, month by month",(body)=>renderCalendar(body,true));
  if(DATA.targets) mk("pg_streaks","🔥","STREAKs","DAY runs for workouts, protein & water",(body)=>renderSTREAKs(body,true));
  mk("pg_weight","⚖️","Bodyweight","Your weight trend over time",buildBODYWEIGHT);
  mk("pg_photos","📸","PROGRESS photos",`${getPROGRESSPhotos().length} saved · private to this device`,buildPROGRESSPhotos);
  mk("pg_volume","📊","Lifting volume","Total weight lifted each session",buildTOTAL LOAD);
  mk("pg_strength","💪","Strength per exercise","Best sets & estimated 1-rep-max per lift",buildStrength);
  if(DATA.targets) mk("pg_targets","🍎","DAILY targets","Your calorie & macro goals",buildTargets);
  mk("pg_workouts","🏋️","SESSION history",`${DATA.workouts.length} logged · tap any to see its sets`,buildSESSIONS);
  mk("pg_mega","💥","MEGA SESSIONs",`${DATA.workouts.filter(w=>w.type==="mega").length} done · totals & recent mega sessions`,buildMega);
  mk("pg_cardio","🏃","CARDIO",`${DATA.cardio.length} session${DATA.cardio.length===1?"":"s"} · runs, rides & calories burned`,buildCARDIO);
  if(DATA.prefs.showAchievements!==false) mk("pg_badges","🏅","Achievements",`${DATA.ach.unlocked.length}/${BADGES.length} unlocked · milestones you've earned`,buildBadges);

  /* the 3 groups, in order of how often people check them */
  const groups=[
    ["📈 Trends",            ["pg_weight","pg_photos","pg_volume","pg_strength","pg_goal"]],
    ["📅 Activity",          ["pg_calendar","pg_workouts","pg_cardio","pg_mega"]],
    ["🎯 GOALs & milestones",["pg_streaks","pg_targets","pg_badges"]]
  ];
  const allSecs=[];

  /* Expand / Collapse all */
  const tools=el("div","row"); tools.style.cssText="justify-content:flex-end;gap:8px;margin:2px 2px 12px";
  const expandAll=el("button","btn sm ghost","Expand all");
  const collapseAll=el("button","btn sm ghost","Collapse all");
  expandAll.addEventListener("click",()=>allSecs.forEach(s=>s._open()));
  collapseAll.addEventListener("click",()=>allSecs.forEach(s=>s._close()));
  tools.append(expandAll,collapseAll);
  b.appendChild(tools);

  groups.forEach(([label,ids])=>{
    const present=ids.map(id=>made[id]).filter(Boolean);
    if(!present.length) return;
    const h=el("div","eyebrow",label); h.style.cssText="margin:6px 4px 10px";
    b.appendChild(h);
    present.forEach(s=>{ b.appendChild(s); allSecs.push(s); });
  });
  allSecs.forEach(s=>s._openIfRemembered());
}
function openLogBODYWEIGHT(){
  const cur=DATA.weights.length?DATA.weights[DATA.weights.length-1].kg:(DATA.profile?.weightKg||0);
  openModal(`<h3>Log bodyweight</h3>
    <div class="field"><label>BODYWEIGHT today (${bodyLbl()})</label>${bodyInputHTML("lw", cur)}</div>
    <button class="btn fuel block" id="lw_add">SAVE weight</button>`);
  $("#lw_add").addEventListener("click",()=>{
    const v=readBodyKg("lw"); if(!v){toast("Enter weight");return;}
    const today=todayISO(), last=DATA.weights[DATA.weights.length-1];
    if(last&&last.date===today)last.kg=v; else DATA.weights.push({date:today,kg:v});
    if(DATA.profile){DATA.profile.weightKg=v;
      if(DATA.prefs.targetMode==="manual" && DATA.targets){ const c=computeTargets(DATA.profile); DATA.targets.bmr=c.bmr; DATA.targets.tdee=c.tdee; }
      else { DATA.targets=computeTargets(DATA.profile); }
    }
    save(); closeModal(); updateHeader(); refreshCurrentTab(); toast("BODYWEIGHT logged · "+bodyStr(v));
  });
}

/* ===================== MORE / SETTINGS ===================== */
const BACKUP_REMINDER_DAYS={off:Infinity,daily:1,weekly:7,biweekly:14,monthly:30};
function backupReminderLabel(v){return ({off:"OFF",daily:"DAILY",weekly:"WEEKLY",biweekly:"BIWEEKLY",monthly:"MONTHLY"})[v]||"WEEKLY";}
function backupHasData(){return !!(DATA.workouts.length||Object.keys(DATA.log||{}).length||DATA.weights.length||DATA.cardio.length);}
function daysSinceBACKUP(){
  const last=DATA.meta.lastBACKUP||DATA.meta.created;
  if(!last) return 999;
  const t=new Date(last).getTime(); if(!t) return 999;
  return Math.max(0,Math.floor((Date.now()-t)/86400000));
}
function backupReminderDue(){
  const freq=DATA.meta.backupReminder||"weekly";
  const need=BACKUP_REMINDER_DAYS[freq];
  return backupHasData() && isFinite(need) && daysSinceBACKUP()>=need;
}
function maybeBACKUPBanner(container){
  if(!backupReminderDue()) return;
  const freq=backupReminderLabel(DATA.meta.backupReminder).toLowerCase();
  const ban=el("div","banner");
  ban.innerHTML=`<div style="font-size:22px">🛟</div><div class="bx"><b>BACKUP reminder</b><br>Your ${freq} backup is due. Make a fresh encrypted backup file or backup code so you don't lose progress.</div>`;
  const go=el("button","btn sm gold","BACKUP"); go.addEventListener("click",()=>{moreOpenSections.add("backup"); switchTab("more");});
  ban.appendChild(go); container.appendChild(ban);
}
async function requestBACKUPNotifications(){
  if(!("Notification" in window)){toast("Notifications are not available in this browser");return;}
  let perm=Notification.permission;
  if(perm==="default") perm=await Notification.requestPermission();
  DATA.meta.backupNotifications=(perm==="granted"); save();
  toast(perm==="granted"?"BACKUP notifications enabled":"Notifications not enabled");
  if(perm==="granted") showBACKUPNotification(true);
}
async function showBACKUPNotification(test=false){
  if(!("Notification" in window)){toast("Notifications are not available");return;}
  let perm=Notification.permission;
  if(perm==="default") perm=await Notification.requestPermission();
  if(perm!=="granted"){DATA.meta.backupNotifications=false;save();toast("Notification permission is off");return;}
  const title=test?"Evolve test backup reminder":"Evolve backup reminder";
  const opts={body:test?"This is how your backup reminder will look.":"Your Evolve backup is due. Open BACKUP & RESTORE to save an encrypted copy.",icon:"icon-192.png",badge:"icon-192.png",tag:"evolve-backup-reminder",renotify:true};
  try{
    if(navigator.serviceWorker&&navigator.serviceWorker.ready){const reg=await navigator.serviceWorker.ready; if(reg.showNotification){await reg.showNotification(title,opts); return;}}
  }catch(e){}
  try{new Notification(title,opts);}catch(e){toast("Couldn't show notification here");}
}
function checkBACKUPReminderOnOpen(){
  if(!backupReminderDue()||DATA.meta.backupNotifications!==true) return;
  if(DATA.meta.backupNotifyLast===todayISO()) return;
  DATA.meta.backupNotifyLast=todayISO(); save();
  setTimeout(()=>showBACKUPNotification(false),1200);
}

function detectOS(){
  const ua=navigator.userAgent||"";
  if(/iPhone|iPad|iPod/i.test(ua) || (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)) return "ios";
  if(/Android/i.test(ua)) return "android";
  return "other";
}
function openWelcomeFlow(){
  /* Step 1: install (skip if already installed as a PWA) */
  if(isStandalone()){ backupReminder(); return; }
  const os=detectOS();
  const iosSteps=`<ol class="wf-steps">
      <li>Tap the <b>Share</b> button in Safari <span class="muted">(the square with an ↑ arrow)</span></li>
      <li>Scroll down and tap <b>Add to HOME Screen</b></li>
      <li>Tap <b>Add</b> — done!</li></ol>
      <p class="muted tiny" style="margin-top:10px">iPhone doesn't show an automatic install pop-up — this is how every web app installs on iOS.</p>`;
  const androidSteps=`<ol class="wf-steps">
      <li>Tap <b>Install</b> on Chrome's banner — or tap the <b>⋮</b> menu (top-right)</li>
      <li>Tap <b>Add to HOME screen</b> / <b>INSTALL APP</b></li>
      <li>Tap <b>Install</b> — done!</li></ol>`;
  const generic=`<p style="line-height:1.6;color:var(--text)"><b>iPhone (Safari):</b> Share button → Add to HOME Screen → Add.</p>
      <p style="line-height:1.6;color:var(--text);margin-top:8px"><b>Android (Chrome):</b> ⋮ menu → Add to HOME screen / INSTALL APP → Install.</p>`;
  openModal(`<div class="wf-hero"><div class="wf-ic">📲</div>
      <div class="wf-t">Install Evolve</div>
      <div class="wf-s">Add Evolve to your home screen so it opens like a real app — full screen, and it works offline at the gym.</div></div>
    ${os==="ios"?iosSteps:os==="android"?androidSteps:generic}
    <button class="btn str block" id="wf_next" style="margin-top:16px">NEXT — one important tip</button>
    <button class="btn ghost block" id="wf_skip" style="margin-top:10px">SKIP REST for now</button>`);
  $("#wf_next").addEventListener("click",()=>{closeModal();setTimeout(backupReminder,180);});
  $("#wf_skip").addEventListener("click",()=>{closeModal();setTimeout(backupReminder,180);});
}
function backupReminder(){
  openModal(`<div class="wf-hero"><div class="wf-ic" style="background:var(--grad-fuel)">💾</div>
      <div class="wf-t">Keep your data safe</div>
      <div class="wf-s">Everything you log lives <b>only on this device</b> — there's no cloud and no account. That keeps your data private, but it means:</div></div>
    <div class="wf-warn">
      <div class="wf-warn-row">📤 <span>In <b>More → BACKUP &amp; restore</b>, tap <b>ENCRYPT & BACKUP file</b> or <b>EXPORT backup code</b>, then save it somewhere safe — Files, iCloud, Google Drive, Proton Drive, Notes, email, anywhere you won't lose it.</span></div>
      <div class="wf-warn-row">🔑 <span><b>That backup is the only way to get your data back</b> if you change phone, clear Safari, or delete the app. Don't lose it.</span></div>
      <div class="wf-warn-row">🔁 <span>A backup is a <b>snapshot</b> of right now — it doesn't update itself. After a big session or once a week, export a <b>fresh</b> code so your saved backup isn't out of date.</span></div>
    </div>
    <button class="btn str block" id="wf_backup" style="margin-top:16px">EXPORT my first backup now</button>
    <button class="btn ghost block" id="wf_later" style="margin-top:10px">I'll do it later</button>`);
  $("#wf_backup").addEventListener("click",()=>{closeModal();setTimeout(()=>{try{openEXPORT();}catch(e){switchTab("more");}},180);});
  $("#wf_later").addEventListener("click",closeModal);
}
const LAST_UPDATED="15 June 2026";
const LATEST_NUM="1.0";
const LATEST_TITLE="Evolve 1.0 — the full release";
const LATEST_ITEMS=[
  "<b>🎉 Evolve is 1.0!</b> After a long beta, this is the first full release — a complete, private, offline-first gym &amp; nutrition tracker. Everything below is what's new in 1.0; earlier entries were the beta builds that got us here.",
  "<b>AI COACH can build your workouts</b> — open the COACH from More → Tools, tap “BUILD A SESSION”, pick the muscle groups and length you want (or let it recommend one), and the AI returns a real, ready-to-use session. <b>GO it now</b> or <b>SAVE FOR LATER</b> — saved ones land in your new SAVED. workouts list under TRAIN.",
  "<b>🛒 FOOD PACKS (optional)</b> — add big UK SUPERMARKET DATABASES from SETTINGS → FOOD PACKS. Pick your shops (Tesco, Sainsbury's, Asda, Aldi) and download only those; their foods slot into the normal categories with the shop name, and you can filter your food search by shop. DOWNLOADed packs live on your device and work offline. They only download public food lists — your data is never uploaded.",
  "<b>SAVED. workouts</b> — TRAIN now has a dedicated SAVED. workouts section. SAVE any session (tap the ★ during a workout) or a COACH-generated one, and reuse it any time.",
  "<b>Sets pre-fill themselves</b> — no more typing the same weight &amp; reps every time. New sets start pre-filled with your usual numbers (or your last session if newer); you just tap to confirm each one. Set your usual per exercise from the ⋯ menu. Works for machines, free weights and home moves.",
  "<b>AI COACH (optional)</b> — connect your own free OpenRouter key to chat about training &amp; nutrition or analyse your logs. It's the only feature that sends data off your device, and it explains exactly what's shared before you enable it; your key stays on this device and is never backed up.",
  "<b>In-app updates</b> — Evolve updates itself now. When a new version is live you'll get an “UPDATE READY” banner; one tap and you're on the latest. There's also a “CHECK FOR UPDATE” button in SETTINGS → Help &amp; guide.",
  "<b>Cleaner navigation</b> — HOME now sits on the far left, with a streamlined five-tab layout. AI COACH is accessible from More → Tools.",
  "<b>Routines (multi-day programs)</b> — build a plan like Push/Pull/Legs under TRAIN → PROGRAMS, then start any day with one tap. GOer templates and a quick walkthrough included.",
  "<b>CARDIO READY screen</b> — a fresh cardio waits on a READY screen and only starts timing when you tap ▶ GO.",
  "<b>PROGRESS photos</b> — a private photo timeline in PROGRESS → Trends, stored only on this device and never uploaded or backed up.",
  "<b>EXPORT CSV</b> — save your workouts or food log as a spreadsheet (SETTINGS → BACKUP) for your own records.",
  "<b>1RM training percentages</b> — the strength sheet shows 60–95% of your estimated 1RM for percentage-based programming.",
  "<b>Choose your heading font</b> — MODERN, BOLD or CLASSIC in SETTINGS → PREFERENCES.",
  "<b>Faster food logging</b> — plate-based logging, a floating ＋ Add food button, smarter portions and categorised custom foods.",
  "<b>Polish &amp; fixes throughout</b> — rest-timer labels, zoom disabled for a native feel, and dozens of refinements from the beta."
];
const HISTORY_BETA={num:"3.x beta",title:"The beta series",items:[
  "Everything below is from Evolve's beta builds (versioned 3.x) — the food logger overhaul, encrypted cloud-safe backups, the redesigned live workout screen, SUPERSETs, cardio resume, manual macro targets, MEGA SESSIONs, and much more. 1.0 brings it all together as the first full release."
]};
const HISTORY_330={num:"3.30-test",title:"Rebuilt food logger",items:[
  "<b>Plate-based logger</b> — add several foods to a running plate, then log the whole meal at once.",
  "<b>Results show first</b> — categories tucked behind a ▾ toggle so they don't bury your search results.",
  "<b>Recent &amp; frequent up top</b>, and inline portion editing on the plate."
]};
function openChangelog(){
  const v=(num,name,items)=>`<div style="margin-bottom:20px">
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:7px">
      <span style="font-family:'Bebas Neue';font-size:22px;color:var(--strength)">v${num}</span>
      <span style="font-weight:700;font-size:14px">${name}</span></div>
    <div class="muted" style="font-size:13px;line-height:1.65">${items.map(i=>"• "+i).join("<br>")}</div></div>`;
  openModal(`<h3>Changelog 📜</h3>
    <div class="tiny muted" style="margin:-4px 0 10px">Last updated ${LAST_UPDATED}</div>
    <div style="max-height:62vh;overflow:auto;margin-top:4px">
    ${v(LATEST_NUM,LATEST_TITLE,LATEST_ITEMS)}
    ${v(HISTORY_BETA.num,HISTORY_BETA.title,HISTORY_BETA.items)}
    ${v(HISTORY_330.num,HISTORY_330.title,HISTORY_330.items)}
    ${v("3.29-test","Simple encrypted cloud save",[
      "<b>Simpler cloud-safe backups</b> — Evolve creates an encrypted backup file locally, then opens your phone's SAVE/Share sheet so you choose iCloud, Files, Drive or anywhere.",
      "<b>No Google setup needed</b> — the OAuth / Client ID flow was removed from the main app.",
      "<b>Encrypted restore</b> — restore from the file using your password; wrong passwords fail safely.",
      "<b>BACKUP reminders</b> — OFF / DAILY / WEEKLY / BIWEEKLY / MONTHLY, with an in-app reminder and a test notification."
    ])}
    ${v("3.22","Polish across every tab",[
      "<b>New nav bar</b> — HOME now sits in the centre, raised and bordered in your theme colour, with SETTINGS on the far right",
      "<b>Tidier PROGRESS</b> — sections are grouped into <b>Trends</b>, <b>Activity</b> and <b>GOALs &amp; milestones</b>, with <b>Expand / Collapse all</b>",
      "<b>Richer SETTINGS</b> — a profile header, colour-coded sections, and new options: default rest timer, rest beep/flash, keep screen awake, water unit/tap amount, and which tab opens first",
      "<b>Fixes</b> — splash What's New no longer overlaps the footer, manual macro targets add up correctly, and nav clearance was tightened"
    ])}
    ${v("3.21","FUEL tab, tidied up",[
      "<b>FUEL tab reorganised</b> — <b>Add food</b>, Burned and Repeat a meal now sit right under your calorie ring &amp; macros, and your food log moved up, so logging and reviewing your day takes far less scrolling",
      "<b>Less clutter</b> — GOAL &amp; activity is now a small link at the bottom, and the <b>Show meal times</b> switch moved to <b>More → PREFERENCES</b> instead of sitting on the FUEL tab every day"
    ])}
    ${v("3.20","CARDIO keeps your progress",[
      "<b>CARDIO no longer loses your progress</b> — if you leave a cardio timer mid-workout (✕, BACK, or switching away) and come back, it now <b>resumes from where you left off</b> instead of restarting at zero. The card shows your elapsed time with a <b>RESUME</b> button, and your progress is even kept if the app closes mid-session. END SESSION and Discard work exactly as before"
    ])}
    ${v("3.19","Macro auto-fill, clearer lists & fixes",[
      "<b>Macros that fill themselves in</b> — in DAILY targets → <b>Manual</b>, pick a focus (BUILD, CUT, More energy or Balanced) and your protein, carbs &amp; fat are worked out from your calories. Tweak any number after",
      "<b>Repeat a meal shows the food</b> — the preview now lists exactly what you're copying, not just “1 item”",
      "<b>STARRED show their moves</b> — saving a favourite lists the moves you're about to save, and saved workouts <b>expand</b> to show every exercise",
      "<b>No more empty sets</b> — a set needs a weight or some reps before it ticks off (bodyweight, 0 kg with reps, still works)",
      "<b>BACKUP codes just work</b> — importing now accepts your code <b>with or without</b> the EVOLVE1: tag and ignores stray spaces or line breaks",
      "<b>CARDIO timer fix</b> — closing the cardio timer with ✕ or BACK now stops it properly, so it can't end up running twice"
    ])}
    ${v("3.18","Faster food + a clearer workout screen",[
      "<b>QUICK ADD on FUEL</b> — your most-logged foods sit in a one-tap row at the top, and tap re-logs them at the <b>portion you last used</b> (not a flat 100g). Each meal also shows its own quick-add chips",
      "<b>Repeat a meal — now including today</b> — copy any meal from any day (or earlier today) into another meal, e.g. last night's dinner into tonight",
      "<b>Redesigned workout screen</b> — sets are now a clean checklist: the set you're on opens up with the weight/reps steppers, finished sets tick green, and the next one opens automatically. Your progress bar and rest timer stay pinned on screen as you scroll",
      "<b>SUPERSETs join up</b> — linked moves now connect visually with a clear “no rest between” marker, and each exercise's tools (warm-up, plates, swap, rest, remove) tuck into a single ⋯ menu",
      "<b>Never lose a session</b> — if you close Evolve mid-workout, it offers to pick up exactly where you left off"
    ])}
    ${v("3.17","Quality-of-life polish",[
      "<b>Every pop-up now has a × close button</b> (top-right), and the phone's BACK gesture closes a pop-up instead of leaving Evolve",
      "<b>UNDO deletes</b> — remove a food, burned or cardio entry by mistake and tap <b>UNDO</b> to bring it straight back",
      "<b>Easier typing</b> — tap a number field and it highlights so you can type over it, a <b>DONE.</b> button now sits above the number keypad, and you can <b>hold</b> the +/− buttons to count up fast",
      "<b>BACKUP reminder</b> now also shows on HOME when it's been a while"
    ])}
    ${v("3.16","Your targets, your way",[
      "<b>Set your own targets</b> — the DAILY targets editor now has a <b>Manual</b> mode: type your own calories and your own protein, carbs &amp; fat, with a live check of how they add up. <b>Auto</b> (Lose / MAINTAIN / Gain) still works exactly as before",
      "<b>Colour-coded quick actions</b> on HOME — Quick start, STARRED, CARDIO and Log food each get their own accent",
      "<b>CARDIO moved up</b> on the TRAIN tab — it now sits above the preset days",
      "<b>CLEARer menus</b> — every drop-down on PROGRESS and in SETTINGS now has a one-line description of what it does"
    ])}
    ${v("3.15","Mega summary + WHAT CHANGED on the splash",[
      "<b>MEGA SESSIONs have their own section</b> on PROGRESS — total sessions & volume, your most-repeated (favourite) mega, your most-trained muscle groups, and recent sessions you can tap open",
      "<b>WHAT CHANGED on the splash</b> — see the latest changes the moment you open Evolve, with the full history one tap away",
      "Tidied up — Mega moved out of STREAKs, and the in-app guide & help now cover everything new"
    ])}
    ${v("3.14","A calmer PROGRESS page",[
      "<b>PROGRESS is now drop-downs</b> — your <b>Last 30 days</b> summary and key stats stay pinned at the top, and everything else (calendar, charts, history, cardio, achievements) tucks into tidy sections you tap to open",
      "<b>New Mega streak</b> — a streak tile for back-to-back days doing a Mega multi-group workout, sitting alongside PROTEIN &amp; Hydration (and resettable in SETTINGS)",
      "<b>Smarter history icons</b> — each past workout shows an emoji for the muscle group you trained (arms, chest, legs…), or a dumbbell if it's a mix"
    ])}
    ${v("3.13","Tap to see your sessions",[
      "<b>SESSION history opens up</b> — tap any past workout to see the date, duration and every exercise with the sets &amp; weights you did",
      "<b>Paged history</b> — your most recent 5 show first, with Prev / NEXT to page through the rest (workouts and cardio both), so long lists stay tidy",
      "Every entry clearly shows the date it was completed"
    ])}
    ${v("3.12","Make it yours",[
      "<b>RESET your stats</b> — Total lifted, streaks, total workouts and PRs can each be reset to zero or a custom number from <b>SETTINGS → STATS & DATA &amp; resets</b> (with a lock so it can't happen by accident); choose to keep your history or clear it",
      "<b>1RM formula explained</b> — tap the ⓘ to see what each formula (Epley, Brzycki, Lander, Lombardi) does and when it's most accurate",
      "<b>Tidier SETTINGS</b> — everything's now grouped into neat drop-down sections",
      "<b>Livelier splash</b> — returning to Evolve now shows your day at a glance (calories left, streaks, a workout to try) instead of the intro blurbs",
      "Sharing a workout card now returns you to your <b>workout summary</b> when you close it"
    ])}
    ${v("3.11","Change your goal any time",[
      "New <b>🎯 GOAL &amp; activity</b> card on the FUEL tab — switch between <b>Lose weight</b>, <b>MAINTAIN</b> and <b>Gain muscle</b>, or change your activity level, in a couple of taps",
      "A live preview shows your <b>new calorie &amp; macro targets</b> before you save",
      "Targets recalculate instantly — <b>no reset needed</b>, and your workouts, food log and history are untouched",
      "(The full profile editor still lives in <b>SETTINGS → EDIT details &amp; targets</b>.)"
    ])}
    ${v("3.10","Safer reset",[
      "<b>RESET all data</b> now takes two deliberate steps: unlock it first, then confirm — so it can never be triggered by accident"
    ])}
    ${v("3.9","SETTINGS tidy-up",[
      "BACKUP &amp; restore, import, and Install &amp; backup tips are now grouped together with one consistent button style",
      "<b>RESET all data</b> is now bright red and sits at the very bottom, on its own, so it's harder to hit by accident"
    ])}
    ${v("3.8","Help & clarity",[
      "<b>How this page works:</b> a help button at the top of HOME, TRAIN, CARDIO, FUEL and PROGRESS explains what the page does and how to use everything on it",
      "PROTEIN / carbs / fat letters are now <b style='color:#FF6A2C'>colour</b>-<b style='color:#5AA9FF'>coded</b> <b style='color:#FFC857'>everywhere</b> to match the tracking rings",
      "CLEARer <b>Show meal times</b> switch: OFF hides times for quicker logging, On shows & lets you set a time per food"
    ])}
    ${v("3.7","Faster food logging",[
      "<b>Recent & frequent foods</b> appear at the top of Add Food for one-tap re-logging",
      "<b>Favourite foods:</b> tap ☆ on any food to save it, then filter to ★ STARRED",
      "<b>Repeat a meal:</b> copy a meal from another day, or duplicate a single entry",
      "<b>Show meal times On/OFF:</b> a switch on the FUEL tab — OFF hides times for quicker logging, On lets you set a time on each food",
      "<b>Quick weight log</b> right on the HOME screen",
      "Date now updates itself if the app is left open past midnight",
      "CLEARer splash-screen footer text"
    ])}
    ${v("3.6","Meals & times",[
      "Log food into <b>BREAKFAST, LUNCH, DINNER or SNACKs</b> — the meal is auto-suggested from the time of day",
      "Each entry now records a <b>time</b> you can adjust, shown next to the food",
      "FUEL tab groups your day into meal sections, each with its own calorie total",
      "Tap a logged item to change its meal, time or amount",
      "Older entries are sorted into meals automatically by when they were logged"
    ])}
    ${v("3.5","Full-app themes",[
      "THEMEs now recolour the <b>whole app</b> — the background, every card and the borders pick up your chosen colour, not just the buttons",
      "Seven moods to switch between in More → PREFERENCES → App colour theme",
      "Nutrition (teal), favourites (gold) and info (blue) keep their meaning colours on purpose"
    ])}
    ${v("3.4","Onboarding & safety",[
      "First-run walkthrough: how to install on your phone (auto-detects iPhone vs Android), then a clear backup reminder",
      "Reach it any time from More → “Install & backup tips”",
      "<b>CLEARer backup wording:</b> a code is a snapshot of that moment — it doesn't update itself, so export a fresh one after logging more",
      "BACKUP screen now shows the date the snapshot was taken"
    ])}
    ${v("3.2","Final polish & fixes",[
      "CARDIO redesigned as a grid of activity tiles with calorie & distance estimates",
      "Celebration screen when you finish a workout (animated ✓, title & duration)",
      "Welcome hero on first-time setup",
      "Frosted-glass rest timer to match the floating nav",
      "Cleaner splash screen, nicer empty states, tap your avatar to open SETTINGS",
      "Haptic buzz on set completion (Android)",
      "<b>Fix:</b> logging food from HOME could save to a previously-viewed date — now always logs to today",
      "In-app guide rewritten to match the new layout"
    ])}
    ${v("3.1","Look & feel",[
      "Floating glass bottom navigation with active-tab pill",
      "Time-aware greeting (Good morning / evening, your name)",
      "Emoji icons on muscle tiles · presets became swipeable cards showing the muscles they hit",
      "Macros shown as three progress rings (🥩 🌾 🥑)",
      "SETTINGS grouped into labelled sections"
    ])}
    ${v("3.0","The big redesign",[
      "New <b>HOME</b> tab: an adaptive Today card (your planned session, rest day, or quick start), week strip, quick actions and a fuel snapshot",
      "TRAIN became a clean workout library · CARDIO folded into TRAIN · STATS & DATA renamed PROGRESS",
      "Floating Quick GO button removed — it lives on HOME now",
      "END SESSIONing a workout returns you to HOME with the day marked done"
    ])}
    ${v("2.5","Install anywhere",[
      "Evolve became an installable app on Android & iPhone (home-screen icon, full screen)",
      "Works fully offline once loaded — built for bad gym signal",
      "Custom app icon"
    ])}
    ${v("2.0","The feature pack",[
      "WEEKLY planner: pick your days, get a balanced split, bonus days & auto-rebalance, neglect detector",
      "Live tracker tools: last-time ghost text, RIR effort chips, warm-up generator, plate calculator, per-exercise rest, SUPERSETs, machine swap",
      "Star any exercise · STARRED hub · build a random workout from your stars",
      "Sub-muscle focus (biceps/triceps, quads/hamstrings…) in every builder",
      "EST. 1RM (4 formulas) · training calendar · protein & hydration streaks",
      "Shareable summary card after workouts · 7 colour themes",
      "Safety: confirmations before leaving a workout, removing an exercise, or clearing a plan",
      "Session progress bar and a clearer Complete-set flow"
    ])}
    ${v("1.0","Where it started",[
      "Guided gym & home workouts with a big-button live tracker and rest timer",
      "92 machines · 53 free weights · 58 home moves · 40 cardio activities · 726 foods",
      "Calorie & macro targets from your profile · water tracking · burned-calorie credit",
      "MEGA SESSIONs, preset days, progress charts, PRs & badges",
      "kg / lb / stone everywhere · backup & restore codes · everything stored on your device"
    ])}
    </div>
    <button class="btn str block" id="cl_close" style="margin-top:8px">CLOSE</button>`);
  $("#cl_close").addEventListener("click",closeModal);
}
function openGuide(){
  const sec=(icon,title,body)=>`<div style="margin-bottom:16px"><div style="font-weight:700;margin-bottom:4px">${icon} ${title}</div><div class="muted" style="font-size:13.5px;line-height:1.55">${body}</div></div>`;
  openModal(`<h3>How to use Evolve 📖</h3>
    <div style="max-height:64vh;overflow:auto;margin-top:6px">
    ${sec("🏠","HOME tab","Your day at a glance. The big card tells you what's on — your planned session, a rest day, or a quick start — with one tap to begin. Below it: your week strip, quick actions (<b>START NOW</b>, ★ STARRED, 🏃 CARDIO, 🍎 Log food), today's fuel summary, and what you've completed.")}
    ${sec("🏋️","TRAIN tab","YOUR SESSION library. Switch between <b>GYM</b> and <b>HOME</b> at the top. Tap a muscle group to build a session — pick a focus like Biceps or Quads, choose how many moves, then re-roll, add or remove before starting. <b>Mega SESSION</b> mixes several groups plus cardio, preset days start with one tap, and the green <b>CARDIO</b> card opens all 40 cardio activities.")}
    ${sec("🗓️","Plan my week","Tap the days you can train and Evolve builds a balanced split (Push/Pull/Legs, Upper/Lower…) with rest and cardio slotted in. Tap <b>today's block</b> to start it. Got unexpected free time? Tap a rest day to add a <b>bonus workout</b> and optionally rebalance the rest of the week. EDIT or clear the plan any time.")}
    ${sec("⭐","STARRED","Tap the ☆ on any exercise, machine or cardio to favourite it. Open the <b>★ Favs</b> hub to see them split by GYM/HOME and hit <b>🎲 Build from favourites</b> for an instant session of moves you love.")}
    ${sec("▶️","Live tracker","Log weight & reps with the steppers. New sets come <b>pre-filled</b> with your usual numbers (or your last session if newer) — just tap to confirm each one. Set your <b>📌 usual weight &amp; reps</b> per exercise from the ⋯ menu so future workouts start ready. <b>👻 Last time</b> shows your previous numbers to beat. Tools per exercise: <b>⚖️ Plates</b> (barbell math), <b>🔥 WARM-UP</b> (auto prep sets), <b>🔄 SWAP</b> (busy machine), <b>⏱️ REST</b> (custom timer), and <b>🔗 SUPERSET</b> to pair two moves. Log <b>RIR</b> (reps in reserve) to track effort.")}
    ${sec("🍎","FUEL tab","Set targets in your profile, then log food from the 700+ database (or add your own). Track water and see calories, protein, carbs and fat against your daily goal. Burned calories from cardio can roll into your budget (toggle in PREFERENCES).")}
    ${sec("📊","PROGRESS tab","Your <b>Last 30 days</b> summary and key stats stay pinned at the top; everything else sits in tidy <b>drop-down sections</b> you tap to open — weight trend, lifting volume, strength per exercise with an <b>Est. 1RM</b>, the <b>calendar</b> (orange = lifting, green = cardio), streaks, a <b>MEGA SESSIONs</b> summary, and your full history. Tap any workout in your history to expand its moves &amp; weights; long lists page 5 at a time.")}
    ${sec("📸","After a workout","Get a summary with your volume, PRs and badges, then tap <b>Share summary card</b> for a branded image to save or post.")}
    ${sec("💾","Your data & settings","Everything is stored on your device. <b>MORE</b> is organised into drop-down sections: <b>PROFILE</b>, <b>UNITS</b>, <b>PREFERENCES</b> (incl. your 1RM formula — tap the ⓘ to learn each one), <b>STATS & DATA &amp; resets</b> (reset any stat to zero or a custom number, keeping or clearing its history — unlock it first), <b>BACKUP</b> (export a code to keep safe or restore on another device), <b>Help</b>, and the <b>Danger zone</b>. New here? Tap <b>📜 WHAT CHANGED</b> on the welcome screen any time to see the latest changes.")}
    </div>
    <button class="btn str block" id="gd_close" style="margin-top:8px">GOT IT</button>`);
  $("#gd_close").addEventListener("click",closeModal);
}
let moreOpenSections = new Set();
function moreAcc(id, icon, title, sub, buildFn, danger, opts){
  const wrap=el("div","acc"+(danger?" acc-danger":""));
  const head=el("button","acc-head");
  const icCls=(opts&&opts.iconClass)?(" "+opts.iconClass):"";
  head.innerHTML=`<span><span class="acc-ic${icCls}">${icon}</span>${title}${sub?`<span class="acc-sub">${sub}</span>`:""}</span><span class="acc-x">▾</span>`;
  const body=el("div","acc-body"); body.style.display="none";
  let built=false;
  function open(){ if(!built){ buildFn(body); built=true; } body.style.display="block"; head.classList.add("open"); }
  function close(){ body.style.display="none"; head.classList.remove("open"); }
  head.addEventListener("click",()=>{
    if(body.style.display==="none"){ moreOpenSections.add(id); open(); }
    else { moreOpenSections.delete(id); close(); }
  });
  wrap.append(head,body);
  wrap._id=id;
  wrap._open=()=>{ moreOpenSections.add(id); open(); };
  wrap._close=()=>{ moreOpenSections.delete(id); close(); };
  wrap._openIfRemembered=()=>{ if(moreOpenSections.has(id)) open(); };
  return wrap;
}
function renderMore(){
  const b=$("#moreBody"); b.innerHTML="";
  const p=DATA.profile;
  /* ---- profile header (gives the tab a face + theme colour) ---- */
  const initial=(p&&p.name?p.name.trim().charAt(0):"E").toUpperCase()||"E";
  const ph=el("div","more-prof");
  ph.innerHTML=`<button class="more-av logo profile-photo-btn" id="profile_photo_card" aria-label="Change profile picture">${profileAvatarHTML()}</button>
    <div class="more-prof-main">
      <div class="more-prof-name">${p?esc(p.name||"Your profile"):"Set up profile"}</div>
      <div class="more-prof-sub">${p?`${p.age||"—"}y · ${p.heightCm||"—"}cm · ${bodyStr(p.weightKg)} · ${GOALS[p.goal]?.l||"—"}`:"Tap edit to add your details"}</div>
    </div>
    <button class="btn sm" id="more_edit">EDIT</button>`;
  b.appendChild(ph);
  $("#more_edit").addEventListener("click",()=>openSetup(false));
  const photoBtn=$("#profile_photo_card"); if(photoBtn)photoBtn.addEventListener("click",openPROFILEPhotoPrivacy);
  maybeBACKUPBanner(b);

  const sec=el("div","notice-card notice-amber");
  sec.innerHTML=`<div class="notice-title">🔐 Security hardening test build</div><div class="notice-body">RESTORE/import is stricter in this build, and the AI COACH key can now be kept for this session only.</div>`;
  sec.style.marginBottom="16px";
  b.appendChild(sec);

  /* ---- PROFILE ---- */
  function buildPROFILE(body){
    const pc=el("div");
    pc.innerHTML=`<div class="lrow" style="padding-top:0"><div class="ico">👤</div><div class="main">
      <div class="t">${p?esc(p.name||"Your profile"):"Set up profile"}</div>
      <div class="s">${p?`${p.age||"—"}y · ${p.heightCm||"—"}cm · ${bodyStr(p.weightKg)} · ${GOALS[p.goal]?.l||"—"}`:"Tap to add your details"}</div></div></div>`;
    const pic=el("button","btn block","Choose profile picture"); pic.style.marginTop="4px";
    pic.addEventListener("click",openPROFILEPhotoPrivacy); pc.appendChild(pic);
    if(getPROFILEPhoto()){
      const rm=el("button","btn ghost block","REMOVE profile picture"); rm.style.marginTop="10px";
      rm.addEventListener("click",()=>{clearPROFILEPhoto();updateHeader();renderMore();toast("PROFILE picture removed");}); pc.appendChild(rm);
    }
    const ed=el("button","btn block","EDIT details & targets"); ed.style.marginTop="10px";
    ed.addEventListener("click",()=>openSetup(false)); pc.appendChild(ed); body.appendChild(pc);
  }

  /* ---- UNITS ---- */
  function buildUNITS(body){
    const u=el("div"); u.style.marginBottom="14px";
    u.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Energy unit</div>
      <div class="seg" id="pf_energy"><button data-v="kcal" class="${DATA.prefs.energy==="kcal"?"on":""}">kcal</button><button data-v="kj" class="${DATA.prefs.energy==="kj"?"on":""}">kJ</button></div>`;
    body.appendChild(u);
    const lu=el("div"); lu.style.marginBottom="14px";
    lu.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Lifting weight unit</div>
      <div class="seg" id="pf_lift"><button data-v="kg" class="${liftUnit()==="kg"?"on":""}">kg</button><button data-v="lb" class="${liftUnit()==="lb"?"on":""}">lb</button></div>`;
    body.appendChild(lu);
    const bu=el("div");
    bu.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Bodyweight unit</div>
      <div class="seg" id="pf_body"><button data-v="kg" class="${bodyUnit()==="kg"?"on":""}">kg</button><button data-v="lb" class="${bodyUnit()==="lb"?"on":""}">lb</button><button data-v="st" class="${bodyUnit()==="st"?"on":""}">stone</button></div>`;
    body.appendChild(bu);
    $("#pf_energy").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.energy=btn.dataset.v;save();renderMore();}));
    $("#pf_lift").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.liftUnit=btn.dataset.v;save();renderMore();toast("Lifting unit: "+btn.dataset.v);}));
    $("#pf_body").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.bodyUnit=btn.dataset.v;save();renderMore();toast("Bodyweight unit updated");}));
  }

  /* ---- PREFERENCES ---- */
  function buildPrefs(body){
    const prefHead=t=>{ const h=el("div","pref-subhead",t); body.appendChild(h); };
    prefHead("DAILY logging");
    const ex=el("div"); ex.style.marginBottom="14px";
    ex.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Add burned calories to daily budget</div>
      <div class="seg" id="pf_addex"><button data-v="yes" class="${DATA.prefs.addMOVE?"on":""}">Yes</button><button data-v="no" class="${!DATA.prefs.addMOVE?"on":""}">No</button></div>`;
    body.appendChild(ex);
    const ac=el("div"); ac.style.marginBottom="14px";
    ac.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Show achievements</div>
      <div class="seg" id="pf_ach"><button data-v="yes" class="${DATA.prefs.showAchievements!==false?"on":""}">On</button><button data-v="no" class="${DATA.prefs.showAchievements===false?"on":""}">OFF</button></div>`;
    body.appendChild(ac);
    const mt=el("div"); mt.style.marginBottom="14px";
    mt.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Show meal times</div>
      <div class="seg" id="pf_mt"><button data-v="on" class="${DATA.prefs.mealTimes?"on":""}">On</button><button data-v="off" class="${!DATA.prefs.mealTimes?"on":""}">OFF</button></div>
      <div class="tiny muted" style="margin-top:5px">${DATA.prefs.mealTimes?"A time is set &amp; shown on each food.":"OFF — quicker logging, no times shown."}</div>`;
    body.appendChild(mt);
    prefHead("SESSION");
    const ge=el("div"); ge.style.marginBottom="14px";
    ge.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">GYM equipment</div>
      <div class="seg vstack" id="pf_equip"><button data-v="machine_cardio" class="${DATA.prefs.gymEquip!=="all"?"on":""}">Machines + CARDIO only</button><button data-v="all" class="${DATA.prefs.gymEquip==="all"?"on":""}">Machines + Free BODYWEIGHTs + CARDIO</button></div>`;
    body.appendChild(ge);
    const rm=el("div"); rm.style.marginBottom="16px";
    rm.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">1RM formula <span style="text-transform:none">${infoBtn("oneRM")}</span></div>
      <div class="seg" id="pf_rm">${Object.keys(RM_FORMULAS).map(k=>`<button data-v="${k}" class="${rmFormula()===k?"on":""}">${RM_FORMULAS[k].l}</button>`).join("")}</div>`;
    body.appendChild(rm);
    /* ---- v3.22 new options ---- */
    const restOpts=[60,90,120,150,180];
    const tm=el("div"); tm.style.marginBottom="14px";
    tm.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">DEFAULT REST</div>
      <div class="seg" id="pf_rest">${restOpts.map(s=>`<button data-v="${s}" class="${(+DATA.prefs.restDefault===s)?"on":""}">${s<60?s+"s":Math.floor(s/60)+(s%60?":"+String(s%60).padGO(2,"0"):"m")}</button>`).join("")}</div>
      <div class="tiny muted" style="margin-top:5px">New moves start with this rest length. You can still change it per exercise.</div>`;
    body.appendChild(tm);
    const bp=el("div"); bp.style.marginBottom="14px";
    bp.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">REST-end beep</div>
      <div class="seg" id="pf_beep"><button data-v="on" class="${DATA.prefs.restBeep?"on":""}">On</button><button data-v="off" class="${!DATA.prefs.restBeep?"on":""}">OFF</button></div>`;
    body.appendChild(bp);
    const fl=el("div"); fl.style.marginBottom="14px";
    fl.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">REST-end screen flash</div>
      <div class="seg" id="pf_flash"><button data-v="on" class="${DATA.prefs.restFlash?"on":""}">On</button><button data-v="off" class="${!DATA.prefs.restFlash?"on":""}">OFF</button></div>`;
    body.appendChild(fl);
    const ka=el("div"); ka.style.marginBottom="14px";
    ka.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">KEEP SCREEN ON</div>
      <div class="seg" id="pf_awake"><button data-v="on" class="${DATA.prefs.keepAwake?"on":""}">On</button><button data-v="off" class="${!DATA.prefs.keepAwake?"on":""}">OFF</button></div>
      <div class="tiny muted" style="margin-top:5px">Stops the screen dimming while you train (where supported).</div>`;
    body.appendChild(ka);
    prefHead("Nutrition & hydration");
    const wu=el("div"); wu.style.marginBottom="14px";
    const stepOpts=[200,250,330,500];
    wu.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">WATER unit</div>
      <div class="seg" id="pf_wunit"><button data-v="ml" class="${DATA.prefs.waterUnit!=="floz"?"on":""}">ml</button><button data-v="floz" class="${DATA.prefs.waterUnit==="floz"?"on":""}">fl oz</button></div>
      <div class="tiny muted" style="margin:10px 0 6px;text-transform:uppercase;letter-spacing:.05em">WATER per tap</div>
      <div class="seg" id="pf_wstep">${stepOpts.map(ml=>`<button data-v="${ml}" class="${(+DATA.prefs.waterStep===ml)?"on":""}">${DATA.prefs.waterUnit==="floz"?Math.round(ml/29.5735)+"oz":ml+"ml"}</button>`).join("")}</div>`;
    body.appendChild(wu);
    prefHead("App");
    const dt=el("div"); dt.style.marginBottom="14px";
    const tabOpts=[["home","HOME"],["train","TRAIN"],["fuel","FUEL"],["stats","PROGRESS"]];
    dt.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Tab shown on open</div>
      <div class="seg" id="pf_starttab">${tabOpts.map(([v,l])=>`<button data-v="${v}" class="${(DATA.prefs.startTab||"home")===v?"on":""}">${l}</button>`).join("")}</div>`;
    body.appendChild(dt);
    const hbOpt=el("div"); hbOpt.style.marginBottom="16px";
    hbOpt.innerHTML=`<div class="tiny muted" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Show help bars</div>
      <div class="seg" id="pf_helpbars"><button data-v="on" class="${DATA.prefs.showHelpBars!==false?"on":""}">On</button><button data-v="off" class="${DATA.prefs.showHelpBars===false?"on":""}">OFF</button></div>
      <div class="tiny muted" style="margin-top:5px">Shows or hides the “How this page works” bars on the main tabs.</div>`;
    body.appendChild(hbOpt);
    const th=el("div");
    th.innerHTML=`<div class="tiny muted" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">App colour theme</div>
      <div class="theme-row" id="pf_theme">${Object.keys(THEMES).map(k=>`<button class="theme-sw ${(DATA.prefs.theme||'ember')===k?'on':''}" data-v="${k}" title="${THEMES[k].name}" style="background:linear-gradient(135deg,${THEMES[k].a2},${THEMES[k].a})"></button>`).join("")}</div>
      <div class="tiny muted" id="pf_theme_lab" style="margin-top:8px">${THEMES[DATA.prefs.theme||'ember'].name}</div>`;
    body.appendChild(th);

    const hf=el("div"); hf.style.marginTop="18px";
    const curHF=DATA.prefs.headingFont||"modern";
    hf.innerHTML=`<div class="tiny muted" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">DISPLAY FONT</div>
      <div class="tiny muted" style="margin-bottom:10px;line-height:1.5">The display font used for titles, headers and the logo. Body text stays the same for readability.</div>
      <div class="seg" id="pf_hfont">${Object.keys(HEADING_FONTS).map(k=>`<button data-v="${k}" class="${curHF===k?'on':''}" style="font-family:${HEADING_FONTS[k].stack};font-weight:800;font-size:16px">${HEADING_FONTS[k].label}</button>`).join("")}</div>
      <div class="tiny muted" id="pf_hfont_lab" style="margin-top:8px">${HEADING_FONTS[curHF].sample}</div>`;
    body.appendChild(hf);

    bindInfo(body);
    $("#pf_hfont").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.headingFont=btn.dataset.v; save(); applyHeadingFont(btn.dataset.v);
      $("#pf_hfont").querySelectorAll("button").forEach(x=>x.classList.remove("on")); btn.classList.add("on");
      const lab=$("#pf_hfont_lab"); if(lab)lab.textContent=HEADING_FONTS[btn.dataset.v].sample;
      toast("DISPLAY FONT: "+HEADING_FONTS[btn.dataset.v].label);
    }));
    $("#pf_addex").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.addMOVE=btn.dataset.v==="yes";save();renderMore();toast(DATA.prefs.addMOVE?"Burned calories now add to your budget":"Burned calories logged for info only");}));
    $("#pf_ach").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.showAchievements=btn.dataset.v==="yes";save();renderMore();toast(DATA.prefs.showAchievements?"Achievements on":"Achievements hidden");}));
    $("#pf_mt").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.mealTimes=(btn.dataset.v==="on");save();renderMore();toast(DATA.prefs.mealTimes?"MEAL WINDOWS on":"MEAL WINDOWS off");}));
    $("#pf_equip").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.gymEquip=btn.dataset.v;save();renderMore();toast(btn.dataset.v==="all"?"Free weights enabled at the gym":"Machines + CARDIO only");}));
    $("#pf_rm").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.rmFormula=btn.dataset.v;save();renderMore();toast("1RM formula: "+RM_FORMULAS[btn.dataset.v].l);}));
    $("#pf_rest").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.restDefault=+btn.dataset.v;save();renderMore();toast("Default rest: "+(+btn.dataset.v)+"s");}));
    $("#pf_beep").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.restBeep=(btn.dataset.v==="on");save();renderMore();toast(DATA.prefs.restBeep?"BEEP ON REST END on":"BEEP ON REST END off");}));
    $("#pf_flash").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.restFlash=(btn.dataset.v==="on");save();renderMore();toast(DATA.prefs.restFlash?"Screen flash on":"Screen flash off");}));
    $("#pf_awake").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.keepAwake=(btn.dataset.v==="on");save();renderMore();
      if(DATA.prefs.keepAwake){ requestWakeLock(); toast("Screen will stay awake"); }
      else { try{ if(wakeLock){wakeLock.release();wakeLock=null;} }catch(e){} toast("Screen can dim normally"); }}));
    $("#pf_wunit").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.waterUnit=btn.dataset.v;save();renderMore();toast("WATER unit: "+(btn.dataset.v==="floz"?"fl oz":"ml"));}));
    $("#pf_wstep").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.waterStep=+btn.dataset.v;save();renderMore();toast("WATER per tap updated");}));
    $("#pf_starttab").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.startTab=btn.dataset.v;save();renderMore();toast("Opens on: "+btn.dataset.v.charAt(0).toUpperCase()+btn.dataset.v.slice(1));}));
    $("#pf_helpbars").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.showHelpBars=(btn.dataset.v==="on"); save(); renderMore(); toast(DATA.prefs.showHelpBars?"Help bars shown":"Help bars hidden");}));
    $("#pf_theme").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      DATA.prefs.theme=btn.dataset.v; applyTHEME(btn.dataset.v); save();
      $("#pf_theme").querySelectorAll("button").forEach(x=>x.classList.remove("on")); btn.classList.add("on");
      $("#pf_theme_lab").textContent=THEMES[btn.dataset.v].name; toast(THEMES[btn.dataset.v].name+" theme");}));
  }

  /* ---- STATS & RESETS ---- */
  function buildSTATS & DATARESETs(body){
    const intro=el("div","tiny","RESET a stat to zero or a custom number. “Keep history” restarts the count from today; “delete” removes the entries behind it. Unlock first so nothing resets by accident.");
    intro.style.cssText="line-height:1.55;color:var(--muted);margin-bottom:12px"; body.appendChild(intro);
    let unlocked=false;
    const unlock=el("button","btn block","🔒 Unlock stat resets"); body.appendChild(unlock);
    const list=el("div"); list.style.marginTop="6px"; body.appendChild(list);
    const keys=["volume","workouts","bestSTREAK","workoutSTREAK","protein","hydration","prs"];
    const rowBtns=[];
    keys.forEach(k=>{
      const def=STAT_DEFS[k];
      const row=el("div"); row.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid var(--line)";
      row.innerHTML=`<div style="min-width:0"><div class="t" style="font-size:14.5px;font-weight:600">${def.label}</div><div class="tiny muted">${def.get()}</div></div>`;
      const rb=el("button","btn sm ghost","RESET"); rb.disabled=true; rb.style.flex="0 0 auto";
      rb.addEventListener("click",()=>{ if(!rb.disabled) openStatRESET(k); });
      rowBtns.push(rb); row.appendChild(rb); list.appendChild(row);
    });
    unlock.addEventListener("click",()=>{
      unlocked=!unlocked; rowBtns.forEach(rb=>rb.disabled=!unlocked);
      unlock.textContent=unlocked?"🔓 Unlocked — tap a RESET above":"🔒 Unlock stat resets";
      if(unlocked)toast("Stat resets unlocked");
    });
  }

  /* ---- BACKUP & RESTORE ---- */
  function buildFoodPacks(body){
    body.appendChild(el("p","tiny muted","Add big UK SUPERMARKET DATABASES to your search. Pick your shops below and download only those — they're stored on your device and work offline once downloaded. Foods appear inside the normal categories (Cheese, Dairy, etc.) with the shop's name."));
    body.lastChild.style.margin="0 0 6px";
    const priv=el("p","tiny muted","🔒 FOOD PACKS are public lists downloaded from GitHub. Your personal data is never uploaded.");
    priv.style.cssText="margin:0 0 14px;opacity:.8";
    body.appendChild(priv);

    const list=el("div","fp-list"); body.appendChild(list);
    const status=el("div","tiny muted"); status.style.margin="10px 2px"; body.appendChild(status);

    function sizeStr(bytes){ if(!bytes)return ""; const mb=bytes/1048576; return mb>=1?mb.toFixed(1)+" MB":Math.max(1,Math.round(bytes/1024))+" KB"; }

    function renderRow(shop, installed){
      const row=el("div","fp-row");
      const meta=`${shop.count?shop.count.toLocaleString()+" foods":""}${shop.bytes?` · ${sizeStr(shop.bytes)}`:""}`;
      row.innerHTML=`<div class="fp-main"><div class="fp-name">🛒 ${esc(shop.name||shop.id)}</div>
        <div class="fp-sub">${installed?`INSTALLED${installed.count?` · ${installed.count.toLocaleString()} foods`:""}`:esc(meta||"Tap download to add")}</div></div>`;
      const act=el("div","fp-act");
      if(installed){
        const rm=el("button","btn ghost sm","REMOVE");
        rm.addEventListener("click",()=>{
          rm.disabled=true; rm.textContent="Removing…";
          FoodPacks.removePack(shop.id).then(()=>{ toast(`${shop.name} removed`); refresh(); try{if(typeof paintList==="function"&&document.getElementById("fs_list"))paintList();}catch(e){} })
            .catch(()=>{ rm.disabled=false; rm.textContent="REMOVE"; toast("Couldn't remove"); });
        });
        act.appendChild(rm);
        /* offer update if manifest version differs from installed */
        if(shop.version && installed.version && shop.version!==installed.version){
          const up=el("button","btn fuel sm","Update"); up.style.marginLeft="6px";
          up.addEventListener("click",()=>doDOWNLOAD(shop,up,"Updating…"));
          act.appendChild(up);
        }
      } else {
        const dl=el("button","btn fuel sm","DOWNLOAD");
        dl.addEventListener("click",()=>doDOWNLOAD(shop,dl,"DOWNLOADing…"));
        act.appendChild(dl);
      }
      row.appendChild(act);
      return row;
    }

    function doDOWNLOAD(shop,btn,busyText){
      if(!navigator.onLine){ toast("You're offline — connect to download"); return; }
      btn.disabled=true; const old=btn.textContent; btn.textContent=busyText;
      FoodPacks.downloadPack(shop).then(()=>{
        toast(`${shop.name} added ✓`); refresh();
        try{ if(typeof paintList==="function"&&document.getElementById("fs_list")) paintList(); }catch(e){}
      }).catch(()=>{ btn.disabled=false; btn.textContent=old; toast("DOWNLOAD failed — try again"); });
    }

    function refresh(){
      list.innerHTML=""; status.textContent="Loading available packs…";
      FoodPacks.loadManifest().then(m=>{
        status.textContent="";
        const installedIds=FoodPacks.installedShopIds();
        const installedMap={}; FoodPacks.installedPacks().forEach(p=>installedMap[p.id]=p);
        if(!m.shops.length){ status.textContent="No food packs available yet."; }
        m.shops.forEach(shop=>list.appendChild(renderRow(shop, installedMap[shop.id])));
        /* show any installed packs no longer in the manifest, so they can still be removed */
        installedIds.forEach(id=>{ if(!m.shops.some(s=>s.id===id)){ const p=installedMap[id]; list.appendChild(renderRow({id:id,name:p.name,count:p.count,bytes:p.bytes}, p)); } });
        if(m.version) { const v=el("div","tiny muted"); v.style.margin="8px 2px"; v.textContent="Database version: "+m.version; body.appendChild(v); }
      }).catch(()=>{
        status.textContent="";
        const installed=FoodPacks.installedPacks();
        if(installed.length){
          installed.forEach(p=>list.appendChild(renderRow({id:p.id,name:p.name,count:p.count,bytes:p.bytes}, p)));
          const note=el("div","tiny muted"); note.style.margin="8px 2px"; note.textContent="Couldn't reach the food pack list right now. Your installed packs still work offline.";
          body.appendChild(note);
        } else {
          status.innerHTML=`No food packs available yet.<br>Once the food database has been published, your shops will appear here to download.`;
        }
      });
    }
    refresh();
  }

  function buildBACKUP(body){
    const last=DATA.meta.lastBACKUP?prettyDate(DATA.meta.lastBACKUP):"Never";
    body.appendChild(el("p","tiny muted","Evolve is local-first by default. For cloud safety, create an encrypted backup file first, then use your phone's own SAVE/Share sheet to choose where it goes. Evolve does not upload it automatically and does not know where you store it." )).style.margin="0 0 12px";

    const status=el("div","card"); status.style.marginBottom="12px";
    status.innerHTML=`<div class="t" style="font-size:14.5px;font-weight:700">BACKUP status</div>
      <div class="tiny muted" style="margin-top:6px;line-height:1.55">Last backup made: <b>${last}</b><br>Reminder: <b>${backupReminderLabel(DATA.meta.backupReminder)}</b></div>`;
    body.appendChild(status);

    const enc=el("div","card"); enc.style.marginTop="12px";
    enc.innerHTML=`<div class="t" style="font-size:15px;font-weight:800">🔐 Encrypted cloud-safe backup</div>
      <p class="tiny muted" style="margin:8px 0 12px;line-height:1.55">This is the recommended backup. Evolve locks your data with a password on this device first, then opens the normal SAVE/Share sheet. You choose iCloud, Files, Google Drive, Proton Drive, Dropbox, OneDrive, MEGA, email, USB or anything else your phone offers.</p>`;
    const encMake=el("button","btn str block","ENCRYPT & BACKUP & save/share"); encMake.addEventListener("click",openEncryptedEXPORT);
    const encRESTORE=el("button","btn ghost block","RESTORE encrypted backup file"); encRESTORE.style.marginTop="10px"; encRESTORE.addEventListener("click",openEncryptedFileRESTORE);
    enc.append(encMake,encRESTORE); body.appendChild(enc);

    const plain=el("div","card"); plain.style.marginTop="12px";
    plain.innerHTML=`<div class="t" style="font-size:15px;font-weight:800">💾 BACKUP code</div>
      <p class="tiny muted" style="margin:8px 0 12px;line-height:1.55">Simple copy/paste backup. Useful for quick manual saves, but encrypted backup files are better for cloud storage.</p>`;
    const exb=el("button","btn block","EXPORT backup code"); exb.addEventListener("click",openEXPORT);
    const imb=el("button","btn ghost block","Import / restore from code"); imb.style.marginTop="10px"; imb.addEventListener("click",openImport);
    plain.append(exb,imb); body.appendChild(plain);

    const rem=el("div","card"); rem.style.marginTop="12px";
    rem.innerHTML=`<div class="t" style="font-size:15px;font-weight:800">🔔 BACKUP reminders</div>
      <p class="tiny muted" style="margin:8px 0 12px;line-height:1.55">Set how often Evolve reminds you. Mobile notification support depends on browser/PWA install state, so Evolve also shows an in-app reminder when a backup is due.</p>
      <div class="seg scroll" id="bk_freq" style="margin-bottom:10px">
        ${[["off","OFF"],["daily","DAILY"],["weekly","WEEKLY"],["biweekly","BIWEEKLY"],["monthly","MONTHLY"]].map(([v,l])=>`<button data-v="${v}" class="${(DATA.meta.backupReminder||"weekly")===v?"on":""}">${l}</button>`).join("")}
      </div>`;
    const notif=el("button","btn block",DATA.meta.backupNotifications?"Notifications enabled":"Enable backup notifications"); notif.addEventListener("click",requestBACKUPNotifications);
    const test=el("button","btn ghost block","SEND test notification"); test.style.marginTop="10px"; test.addEventListener("click",()=>showBACKUPNotification(true));
    rem.append(notif,test); body.appendChild(rem);
    rem.querySelectorAll("#bk_freq button").forEach(btn=>btn.addEventListener("click",()=>{DATA.meta.backupReminder=btn.dataset.v;save();renderMore();toast("BACKUP reminder: "+backupReminderLabel(btn.dataset.v));}));

    const csv=el("div","card"); csv.style.marginTop="12px";
    csv.innerHTML=`<div class="t" style="font-size:15px;font-weight:800">📄 EXPORT as CSV</div>
      <p class="tiny muted" style="margin:8px 0 12px;line-height:1.55">SAVE your workouts or food log as a spreadsheet (CSV) you can open in Excel, Numbers or Google Sheets. This is for your own records — it isn't an encrypted backup, so it won't restore the app.</p>`;
    const csvW=el("button","btn block","EXPORT workouts (CSV)"); csvW.addEventListener("click",()=>exportSESSIONSCSV());
    const csvF=el("button","btn block","EXPORT food log (CSV)"); csvF.style.marginTop="10px"; csvF.addEventListener("click",()=>exportFoodCSV());
    csv.append(csvW,csvF); body.appendChild(csv);

    const tipsB=el("button","btn block","📲 Install & backup tips"); tipsB.style.marginTop="12px"; tipsB.addEventListener("click",openWelcomeFlow); body.appendChild(tipsB);
  }

  /* ---- HELP & GUIDE ---- */
  function buildHelp(body){
    const sh=el("div");
    sh.innerHTML=`<div class="lrow" style="padding-top:0"><div class="ico">⚙️</div><div class="main"><div class="t">How SETTINGS works</div><div class="s">What every option on this tab does.</div></div></div>`;
    const shb=el("button","btn block","Open SETTINGS help"); shb.style.marginTop="4px"; shb.addEventListener("click",()=>openTabHelp("more")); sh.appendChild(shb); body.appendChild(sh);
    const g=el("div"); g.style.marginTop="14px";
    g.innerHTML=`<div class="lrow" style="padding-top:0"><div class="ico">📖</div><div class="main"><div class="t">How to use Evolve</div><div class="s">A quick tour of every feature.</div></div></div>`;
    const gb=el("button","btn block","Open the guide"); gb.style.marginTop="4px"; gb.addEventListener("click",openGuide); g.appendChild(gb); body.appendChild(g);
    const c=el("div"); c.style.marginTop="14px";
    c.innerHTML=`<div class="lrow" style="padding-top:0"><div class="ico">📜</div><div class="main"><div class="t">WHAT CHANGED</div><div class="s">Every update, from day one to now.</div></div></div>`;
    const cb=el("button","btn block","View changelog"); cb.style.marginTop="4px"; cb.addEventListener("click",openChangelog); c.appendChild(cb); body.appendChild(c);
    const u=el("div"); u.style.marginTop="14px";
    u.innerHTML=`<div class="lrow" style="padding-top:0"><div class="ico">🔄</div><div class="main"><div class="t">App updates</div><div class="s">Get the newest version. You'll also see a banner automatically when one's ready.</div></div></div>`;
    const ub=el("button","btn block","CHECK FOR UPDATE"); ub.style.marginTop="4px";
    ub.addEventListener("click",()=>{ ub.textContent="Checking…"; ub.disabled=true; checkForUpdate(true); setTimeout(()=>{ub.textContent="CHECK FOR UPDATE";ub.disabled=false;},2500); });
    u.appendChild(ub); body.appendChild(u);
  }

  /* ---- DANGER ZONE ---- */
  function buildDanger(body){
    body.appendChild(el("p","tiny muted","Erasing wipes everything on this device and can't be undone. Unlock first, then confirm — two steps so it can't happen by accident.")).style.margin="0 0 12px";
    let resetUnlocked=false;
    const unlockBtn=el("button","btn block","🔒 Unlock reset");
    const reset=el("button","btn danger-solid block","RESET all data"); reset.style.marginTop="10px"; reset.disabled=true;
    unlockBtn.addEventListener("click",()=>{
      resetUnlocked=!resetUnlocked; reset.disabled=!resetUnlocked;
      unlockBtn.textContent=resetUnlocked?"🔓 Unlocked — tap to re-lock":"🔒 Unlock reset";
      if(resetUnlocked)toast("RESET unlocked — tap the red button to continue");
    });
    reset.addEventListener("click",()=>{
      if(reset.disabled)return;
      confirmModal({title:"Erase all data?",danger:true,confirmText:"Erase everything",
        body:"This wipes all Evolve data on this device — workouts, food, weight and settings — and can't be undone. EXPORT a backup first if you're unsure.",
        onCONFIRM:()=>{
          try{localStorage.removeItem(KEY);}catch(e){}
          try{localStorage.clear();}catch(e){}
          try{sessionStorage.removeItem(COACH_KEY_SESSION_KEY);}catch(e){}
          DATA=blankData();
          location.reload();
        }});
    });
    body.append(unlockBtn,reset);
  }

  const made={};
  made.profile=moreAcc("profile","👤","PROFILE","Your body stats, goal & activity level",buildPROFILE,false,{iconClass:"ic-prof"});
  made.units=moreAcc("units","📏","UNITS","How weights & energy are shown",buildUNITS,false,{iconClass:"ic-units"});
  made.prefs=moreAcc("prefs","⚙️","PREFERENCES","THEME, timers, water, units & more",buildPrefs,false,{iconClass:"ic-prefs"});
  made.stats=moreAcc("stats","📊","STATS & DATA & resets","RESET or adjust your tracked numbers",buildSTATS & DATARESETs,false,{iconClass:"ic-stats"});
  made.backup=moreAcc("backup","💾","BACKUP & RESTORE","EXPORT or import your data as a code",buildBACKUP,false,{iconClass:"ic-backup"});
  made.foodpacks=moreAcc("foodpacks","🛒","FOOD PACKS","Add UK supermarket foods (optional download)",buildFoodPacks,false,{iconClass:"ic-backup"});
  made.coach=moreAcc("coach","🤖","AI COACH","Generate workouts & get coaching tips",function(body){
    const intro=el("div","tiny muted","The AI COACH generates ready-to-use workouts and answers training questions using your own free OpenRouter key.");
    intro.style.cssText="line-height:1.55;margin-bottom:14px"; body.appendChild(intro);
    const go=el("button","btn str block","🤖 Open AI COACH"); go.style.marginTop="4px";
    go.addEventListener("click",()=>switchTab("coach"));
    body.appendChild(go);
  },false,{iconClass:"ic-help"});
  made.help=moreAcc("help","📖","GUIDE","How every part of Evolve works",buildHelp,false,{iconClass:"ic-help"});
  made.danger=moreAcc("danger","⚠️","Danger zone","Erase all data — handle with care",buildDanger,true);

  const groups=[
    ["You",            ["profile","units","prefs"]],
    ["Your data",      ["stats","backup"]],
    ["Food",           ["foodpacks"]],
    ["Tools",          ["coach"]],
    ["ABOUT",          ["help"]]
  ];
  groups.forEach(([label,ids])=>{
    const present=ids.map(id=>made[id]).filter(Boolean);
    if(!present.length) return;
    const h=el("div","eyebrow",label); h.style.cssText="margin:6px 4px 10px";
    b.appendChild(h);
    present.forEach(s=>b.appendChild(s));
  });
  b.appendChild(made.danger);
  Object.values(made).forEach(s=>s._openIfRemembered());

  b.appendChild(el("div","center muted tiny",`Evolve · EVOLVE · V1.0 · NO MERCY`));
  b.lastChild.style.padding="18px 0 4px";
}

function cleanBACKUPData(){
  const copy=normalizeStoredData(JSON.parse(JSON.stringify(DATA)));
  if(copy.meta){
    delete copy.meta.driveClientId; delete copy.meta.driveFileId; delete copy.meta.driveEnabled; delete copy.meta.lastDriveBACKUP; delete copy.meta.backupNotifyLast; delete copy.meta.backupNotifications;
  }
  return copy;
}
function decodeB64Utf8(raw){ return new TextDecoder().decode(b64ToBytes(raw)); }
function backupCode(){ return "EVOLVE1:"+bytesToB64(new TextEncoder().encode(JSON.stringify(cleanBACKUPData()))); }
function bytesToB64(bytes){let bin=""; const chunk=0x8000; for(let i=0;i<bytes.length;i+=chunk){bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));} return btoa(bin);}
function b64ToBytes(b64){const bin=atob(b64); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i); return out;}
function backupCryptoREADY(){return !!(window.crypto&&crypto.subtle&&window.TextEncoder&&window.TextDecoder);}
async function deriveBACKUPKey(password,salt){
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:210000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function makeEncryptedBACKUPText(password){
  if(!backupCryptoREADY()) throw new Error("Encryption is not available in this browser");
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveBACKUPKey(password,salt);
  const plain=new TextEncoder().encode(JSON.stringify(cleanBACKUPData()));
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain));
  return JSON.stringify({type:"EVOLVE_ENCRYPTED_BACKUP",version:1,app:"Evolve",created:new Date().toISOString(),kdf:"PBKDF2-SHA256",iterations:210000,cipher:"AES-GCM",salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(cipher)},null,2);
}
async function decryptEncryptedBACKUPText(text,password){
  const box=safeParseJsonText(text,MAX_IMPORT_BYTES,"Encrypted backup");
  if(!box||box.type!=="EVOLVE_ENCRYPTED_BACKUP") throw new Error("not-evolve-encrypted");
  if(typeof box.salt!=="string" || typeof box.iv!=="string" || typeof box.data!=="string") throw new Error("bad-backup");
  const key=await deriveBACKUPKey(password,b64ToBytes(box.salt));
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64ToBytes(box.iv)},key,b64ToBytes(box.data));
  const obj=normalizeStoredData(safeParseJsonText(new TextDecoder().decode(plain),MAX_IMPORT_BYTES,"Decrypted backup"));
  if(!obj||typeof obj!=="object"||!("workouts" in obj)) throw new Error("bad-backup");
  return obj;
}
async function saveOrShareBlob(blob,name,title="Evolve backup",text="Evolve backup file"){
  try{
    if(navigator.share && typeof File!=="undefined"){
      const file=new File([blob],name,{type:blob.type||"application/octet-stream"});
      if(!navigator.canShare || navigator.canShare({files:[file]})){await navigator.share({title,text,files:[file]}); toast("BACKUP shared"); return;}
    }
  }catch(e){}
  try{const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500); toast("BACKUP file saved");}
  catch(e){toast("Couldn't save file here");}
}
/* v3.31 — EXPORT CSVs (records only; not an encrypted/restorable backup) */
function _csvCell(v){ const s=String(v==null?"":v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function _csvRows(rows){ return rows.map(r=>r.map(_csvCell).join(",")).join("\r\n")+"\r\n"; }
function exportSESSIONSCSV(){
  const rows=[["Date","SESSION","Type","MOVE","Set","BODYWEIGHT ("+liftUnit()+")","Reps","WARM-UP","TOTAL LOAD ("+liftUnit()+")"]];
  const ws=(DATA.workouts||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
  if(!ws.length){ toast("No workouts to export yet"); return; }
  ws.forEach(w=>{
    (w.moves||[]).forEach(ex=>{
      const sets=(ex.sets||[]);
      if(!sets.length){ rows.push([w.date,w.title||"",w.type||"",ex.name,"","","","",""]); return; }
      sets.forEach((s,i)=>{
        const wt=liftFromKg(+s.kg||0);
        rows.push([w.date,w.title||"",w.type||"",ex.name,i+1,Math.round(wt*100)/100,+s.reps||0,s.warmup?"yes":"",Math.round(wt*(+s.reps||0)*100)/100]);
      });
    });
    if(!(w.moves||[]).length) rows.push([w.date,w.title||"",w.type||"","(no moves logged)","","","","",""]);
  });
  saveOrShareBlob(new Blob([_csvRows(rows)],{type:"text/csv"}),"evolve-workouts-"+todayISO()+".csv","Evolve workouts","Evolve workout history (CSV)");
}
function exportFoodCSV(){
  const rows=[["Date","Meal","Food","Grams",eUnit(),"PROTEIN (g)","CARBS (g)","FAT (g)"]];
  const days=Object.keys(DATA.log||{}).filter(d=>(DATA.log[d].food||[]).length).sort();
  if(!days.length){ toast("No food logged to export yet"); return; }
  days.forEach(d=>{
    (DATA.log[d].food||[]).forEach(f=>{
      rows.push([d,(mealById(mealOf(f))||{}).name||"",f.name,Math.round(f.grams||0),eVal(f.kcal||0),Math.round((f.p||0)*10)/10,Math.round((f.c||0)*10)/10,Math.round((f.f||0)*10)/10]);
    });
  });
  saveOrShareBlob(new Blob([_csvRows(rows)],{type:"text/csv"}),"evolve-food-"+todayISO()+".csv","Evolve food log","Evolve food log (CSV)");
}
function openEncryptedEXPORT(){
  if(!backupCryptoREADY()){toast("Encryption is not available in this browser");return;}
  openModal(`<h3>Encrypted backup privacy check</h3>
    <p class="tiny muted" style="line-height:1.6;margin-bottom:14px"><b>Evolve will not upload anything by itself.</b><br><br>It will create an encrypted backup file on this device first. If you choose iCloud, Google Drive, Proton Drive, Dropbox, email or another cloud app in the share sheet, that encrypted file leaves this device and is stored by the provider you choose.</p>
    <p class="tiny muted" style="line-height:1.6;margin-bottom:14px">Do not lose your password. Evolve cannot recover encrypted backups without it.</p>
    <button class="btn str block" id="enc_continue">I understand — create encrypted backup</button>
    <button class="btn ghost block" id="enc_cancel" style="margin-top:10px">CANCEL</button>`);
  $("#enc_cancel").addEventListener("click",closeModal);
  $("#enc_continue").addEventListener("click",openEncryptedEXPORTPassword);
}
function openEncryptedEXPORTPassword(){
  openModal(`<h3>ENCRYPT & BACKUP</h3>
    <p class="tiny muted" style="line-height:1.55;margin-bottom:12px">Choose a password. Evolve encrypts your backup locally, then opens SAVE/Share so you decide where to keep the file.</p>
    <div class="field"><label>Password</label><input class="input" id="enc_pw" type="password" autocomplete="new-password" placeholder="Minimum 8 characters"></div>
    <div class="field"><label>Repeat password</label><input class="input" id="enc_pw2" type="password" autocomplete="new-password"></div>
    <button class="btn str block" id="enc_make">Create encrypted file</button>`);
  $("#enc_make").addEventListener("click",async()=>{
    const p=$("#enc_pw").value, p2=$("#enc_pw2").value;
    if(p.length<8){toast("Use at least 8 characters");return;} if(p!==p2){toast("Passwords do not match");return;}
    try{const text=await makeEncryptedBACKUPText(p); DATA.meta.lastBACKUP=todayISO(); save(); closeModal(); await saveOrShareBlob(new Blob([text],{type:"application/json"}),`evolve-encrypted-backup-${todayISO()}.json`,"Evolve encrypted backup","Encrypted Evolve backup");}
    catch(e){toast("Couldn't create encrypted backup");}
  });
}
function openEncryptedFileRESTORE(){
  const input=document.createElement("input"); input.type="file"; input.accept="application/json,.json,.evolvebackup,.txt";
  input.addEventListener("change",()=>{const f=input.files&&input.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>openEncryptedRESTOREText(String(r.result||"")); r.readAsText(f);});
  input.click();
}
function openEncryptedRESTOREText(text){
  openModal(`<h3>RESTORE encrypted backup</h3>
    <p class="tiny muted" style="line-height:1.55;margin-bottom:12px">Enter the password for this encrypted backup. RESToring replaces all current Evolve data on this device.</p>
    <div class="field"><label>Password</label><input class="input" id="dec_pw" type="password" autocomplete="current-password"></div>
    <button class="btn danger-solid block" id="dec_go">Decrypt & restore</button>`);
  $("#dec_go").addEventListener("click",async()=>{
    try{const obj=await decryptEncryptedBACKUPText(text,$("#dec_pw").value); DATA=normalizeStoredData(obj); save(); closeModal(); updateHeader(); switchTab("stats"); toast("Encrypted backup restored ✓");}
    catch(e){toast("Couldn't decrypt — check the password/file");}
  });
}
function openEXPORT(){
  const code=backupCode();
  DATA.meta.lastBACKUP=todayISO(); save();
  openModal(`<h3>BACKUP code</h3>
    <p class="tiny muted" style="margin-bottom:10px">This is a <b>snapshot of your data right now</b> (${prettyDate(todayISO())}). It won't update on its own — export a fresh backup after you log more. Copy the code, or use <b>SAVE / share file</b> for a safer phone backup.</p>
    <textarea class="input" id="ex_code" rows="6" readonly style="font-family:ui-monospace,monospace;font-size:12px;resize:none">${code}</textarea>
    <button class="btn str block" id="ex_copy" style="margin-top:12px">Copy code</button>
    <button class="btn block" id="ex_file" style="margin-top:10px">💾 SAVE / share backup file</button>`);
  $("#ex_copy").addEventListener("click",()=>{
    const ta=$("#ex_code"); ta.select(); ta.setSelectionRange(0,99999);
    let ok=false; try{ok=document.execCommand("copy");}catch(e){}
    if(navigator.clipboard){navigator.clipboard.writeText(ta.value).then(()=>toast("Copied to clipboard")).catch(()=>toast(ok?"Copied":"Select & copy manually"));}
    else toast(ok?"Copied":"Select & copy manually");
  });
  $("#ex_file").addEventListener("click",()=>saveOrShareBACKUP(code));
}
async function saveOrShareBACKUP(code){
  const name=`evolve-backup-${todayISO()}.txt`;
  const blob=new Blob([code],{type:"text/plain"});
  try{
    if(navigator.share && typeof File!=="undefined"){
      const file=new File([blob],name,{type:"text/plain"});
      if(!navigator.canShare || navigator.canShare({files:[file]})){
        await navigator.share({title:"Evolve backup",text:"Evolve backup code",files:[file]});
        toast("BACKUP shared"); return;
      }
    }
  }catch(e){}
  try{
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500); toast("BACKUP file saved");
  }catch(e){ toast("Couldn't save file — copy the code instead"); }
}
function openImport(){
  openModal(`<h3>Import / restore</h3>
    <p class="tiny muted" style="margin-bottom:10px">Paste a backup code. This replaces all current data on this device.<br><br>Paste the <b>whole code</b> — with or without the <code>EVOLVE1:</code> at the start. If it ever won't import, delete the <code>EVOLVE1:</code> and paste just the part after it.</p>
    <textarea class="input" id="im_code" rows="6" placeholder="EVOLVE1:..." style="font-family:ui-monospace,monospace;font-size:12px;resize:none"></textarea>
    <button class="btn block" id="im_go" style="margin-top:12px">RESTORE data</button>`);
  $("#im_go").addEventListener("click",()=>{
    let raw=$("#im_code").value;
    raw=raw.replace(/^\s*EVOLVE\d*\s*:\s*/i,"").replace(/\s+/g,""); /* drop optional EVOLVE1: tag (any case) + any stray spaces/line breaks */
    try{
      if(!raw || raw.length>MAX_IMPORT_BYTES*1.4) throw new Error("bad-size");
      const decoded=decodeB64Utf8(raw);
      const obj=normalizeStoredData(safeParseJsonText(decoded,MAX_IMPORT_BYTES,"BACKUP code"));
      if(!obj||typeof obj!=="object"||!("workouts" in obj)) throw new Error("bad");
      DATA=obj; save(); closeModal(); updateHeader(); switchTab("stats"); toast("Data restored ✓");
    }catch(e){ toast("That code didn't work — check you copied all of it"); }
  });
}

/* ===================== BOOT ===================== */
/* Dynamic splash tiles for returning users (first-ever run keeps the feature chips). */
function renderSplashFeats(){
  const host=document.querySelector(".splash-feats"); if(!host) return;
  if(!DATA.profile) return; /* first run: keep the "what the app does" chips */
  const dayN=Math.floor((Date.now()-new Date().getTimezoneOFFset()*60000)/86400000);
  const today=todayISO();
  const tiles=[];
  /* always lead with a suggested workout based on the week so far */
  if(DATA.workouts.length){ const ng=neglectedGroup(); tiles.push({ic:"🎯",t:`Try a ${ng.group} session today`}); }
  else { tiles.push({ic:"🎯",t:"GO with a full-body day"}); }
  const pool=[];
  if(DATA.targets){
    const L=DATA.log[today]||{food:[],water:0,burned:[]};
    const eaten=(L.food||[]).reduce((s,f)=>s+(f.kcal||0),0);
    const burned=(L.burned||[]).reduce((s,x)=>s+(x.kcal||0),0);
    const left=(DATA.targets.calories+(DATA.prefs.addMOVE?burned:0))-eaten;
    pool.push({ic:"🍎",t: left>=0?`${eVal(left)} ${eUnit()} left today`:`${eVal(-left)} ${eUnit()} over today`});
    pool.push({ic:"💧",t:`${L.water||0} / ${DATA.targets.water} ml water today`});
    pool.push({ic:"🥩",t:`PROTEIN streak: ${dispPROTEINSTREAK()} day${dispPROTEINSTREAK()===1?"":"s"}`});
  }
  const ws=dispSESSIONSTREAK();
  pool.push({ic:"🔥",t: ws>0?`${ws}-day workout streak`:"READY to start a streak?"});
  pool.push({ic:"🏆",t:`BEST STREAK: ${dispBestSTREAK()} day${dispBestSTREAK()===1?"":"s"}`});
  const thisWeek=DATA.workouts.filter(w=>w.date>=curWeekGO()).length;
  pool.push({ic:"📅",t:`${thisWeek} workout${thisWeek===1?"":"s"} this week`});
  if(DATA.weights.length){ pool.push({ic:"⚖️",t:`Bodyweight: ${bodyStr(DATA.weights[DATA.weights.length-1].kg)}`}); }
  const enc=["TRAIN smarter · become next","Small sessions still count","Consistency beats intensity","Show up for today","One more rep than yesterday","Your only competition is you"];
  pool.push({ic:"✨",t:enc[dayN%enc.length]});
  const off=pool.length?dayN%pool.length:0;
  const rotated=pool.slice(off).concat(pool.slice(0,off));
  tiles.push(...rotated.slice(0,3));
  host.innerHTML=tiles.map(x=>`<div class="sf"><span>${x.ic}</span>${x.t}</div>`).join("");
}
renderSplashFeats();
function renderSplashNews(){
  const nt=document.getElementById("newsToggle"), body=document.getElementById("newsBody");
  if(!nt||!body) return;
  body.innerHTML=`<div style="font-weight:700;color:var(--text);margin-bottom:7px">v${LATEST_NUM} · ${LATEST_TITLE}</div>
    ${LATEST_ITEMS.map(i=>"• "+i).join("<br>")}
    <button class="btn ghost block" id="newsFull" style="margin-top:12px">View full history</button>`;
  nt.addEventListener("click",()=>{ const open=body.classList.toggle("open"); nt.classList.toggle("open",open); });
  document.getElementById("newsFull").addEventListener("click",openChangelog);
}
renderSplashNews();
function maybeShowSecurityNotice(){
  if((DATA.meta&&DATA.meta.securityNoticeSeen)===SECURITY_NOTICE_VERSION) return;
  openModal(`<h3>Security hardening test build</h3>
    <div class="notice-card notice-amber" style="margin-bottom:12px"><div class="notice-title">Heads up</div><div class="notice-body">This test build is intentionally stricter than the 1.0 release.</div></div>
    <ul class="coach-priv-list" style="margin-top:0">
      <li>BACKUP/import/restore validation is stricter. Broken or hand-edited payloads can now be rejected on purpose.</li>
      <li>The AI COACH key can be stored <b>for this session only</b> or remembered on this device.</li>
      <li>Service-worker caching is tighter, so stale cross-origin files are less likely to linger.</li>
    </ul>
    <button class="btn str block" id="sec_notice_ok">GOT IT</button>`, {mandatory:false});
  const btn=$("#sec_notice_ok");
  if(btn) btn.addEventListener("click",()=>{ DATA.meta.securityNoticeSeen=SECURITY_NOTICE_VERSION; save(); closeModal(); });
}
updateHeader();
checkBACKUPReminderOnOpen();
setTimeout(maybeShowSecurityNotice, 900);

/* ---- PWA: install prompt (Android/Chrome) + offline service worker ---- */
let deferredInstall=null;
function isStandalone(){ return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true; }
window.addEventListener("beforeinstallprompt",(e)=>{ e.preventDefault(); deferredInstall=e;
  if($("#view-more") && $("#view-more").classList.contains("active")) renderMore();
  /* if the prompt arrives after the banner is up, upgrade "How" → one-tap "Install" */
  if($("#installBanner") && !installBannerDISMISSed){ $("#installBanner").remove(); showInstallBanner(); } });
window.addEventListener("appinstalled",()=>{ deferredInstall=null; toast("Evolve installed 🎉");
  if($("#installBanner")) $("#installBanner").remove();
  if($("#view-more") && $("#view-more").classList.contains("active")) renderMore(); });
async function tryInstall(){
  if(deferredInstall){ deferredInstall.prompt(); try{await deferredInstall.userChoice;}catch(e){} deferredInstall=null; renderMore(); return; }
  /* no native prompt available (e.g. iOS, or already installable via menu) */
  openModal(`<h3>Add Evolve to your home screen</h3>
    <div style="line-height:1.6;color:var(--text);font-size:14.5px">
      <p style="margin:0 0 10px"><b>Android (Chrome):</b> tap the <b>⋮</b> menu (top-right) → <b>Add to HOME screen</b> / <b>INSTALL APP</b> → <b>Install</b>.</p>
      <p style="margin:0"><b>iPhone/iPad (Safari):</b> tap the <b>Share</b> button → <b>Add to HOME Screen</b> → <b>Add</b>.</p>
    </div>
    <button class="btn str block" id="inst_ok" style="margin-top:16px">GOT IT</button>`);
  $("#inst_ok").addEventListener("click",closeModal);
}

/* ---- "ADD TO HOME SCREEN" prompt banner (browser only, never in the app) ----
   Shown when Evolve is opened in a normal browser tab, NOT when it's already
   running as the installed PWA (isStandalone). Android gets a real one-tap
   Install when Chrome offers the prompt; iPhone gets the manual Safari steps
   (iOS has no programmatic install). DISMISS hides it for this visit; it
   returns next browser visit until the app is installed (once installed, the
   app launches standalone and this never shows again). */
let installBannerDISMISSed=false;
function isiOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1); }
function showInstallBanner(){
  if(isStandalone()) return;            /* already installed & launched from icon */
  if(installBannerDISMISSed) return;    /* dismissed earlier this visit */
  if($("#installBanner")) return;       /* already showing */
  const ios=isiOS();
  const bar=el("div","install-banner"); bar.id="installBanner";
  const action = (!ios && deferredInstall)
    ? `<button class="btn str sm" id="inst_now">Install</button>`
    : `<button class="btn str sm" id="inst_how">How</button>`;
  bar.innerHTML=`<span>📲 Add Evolve to your home screen for the full‑screen, offline app.</span>
    ${action}
    <button class="upd-x" id="inst_x" title="Not now">✕</button>`;
  document.body.appendChild(bar);
  const dismiss=()=>{ installBannerDISMISSed=true; bar.remove(); };
  $("#inst_x").addEventListener("click",dismiss);
  if($("#inst_now")) $("#inst_now").addEventListener("click",async ()=>{
    $("#inst_now").textContent="…"; $("#inst_now").disabled=true;
    await tryInstall();                 /* fires Chrome's prompt; appinstalled removes banner */
    if($("#installBanner")) bar.remove();
  });
  if($("#inst_how")) $("#inst_how").addEventListener("click",()=>{ dismiss(); tryInstall(); });
}
/* ===================== APP UPDATES (in-app, no more close-twice dance) ===================== */
let swReg=null, swRefreshing=false;
function showUpdateBanner(worker){
  if($("#updateBanner"))return; /* already showing */
  const bar=el("div","update-banner"); bar.id="updateBanner";
  bar.innerHTML=`<span>✨ A new version of Evolve is available.</span>
    <button class="btn str sm" id="upd_now">Update</button>
    <button class="upd-x" id="upd_x" title="Later">✕</button>`;
  document.body.appendChild(bar);
  $("#upd_now").addEventListener("click",()=>{
    $("#upd_now").textContent="Updating…"; $("#upd_now").disabled=true;
    if(worker) worker.postMessage("SKIP_WAITING"); else location.reload();
  });
  $("#upd_x").addEventListener("click",()=>bar.remove());
}
async function checkForUpdate(manual){
  try{
    if(!swReg) swReg = await navigator.serviceWorker.getRegistration();
    if(!swReg){ if(manual)toast("Update check unavailable"); return; }
    await swReg.update();
    if(swReg.waiting){ showUpdateBanner(swReg.waiting); }
    else if(manual) toast("You're on the latest version ✓");
  }catch(e){ if(manual)toast("Couldn't check for updates"); }
}
if("serviceWorker" in navigator){
  /* when the controller changes (new SW activated), reload once to load fresh code */
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(swRefreshing)return; swRefreshing=true; window.location.reload();
  });
  window.addEventListener("load",async ()=>{
    try{
      swReg = await navigator.serviceWorker.register("sw.js");
      /* a worker already waiting from a previous load */
      if(swReg.waiting && navigator.serviceWorker.controller) showUpdateBanner(swReg.waiting);
      /* a new worker installing now → show banner once it's ready */
      swReg.addEventListener("updatefound",()=>{
        const nw=swReg.installing; if(!nw)return;
        nw.addEventListener("statechange",()=>{
          if(nw.state==="installed" && navigator.serviceWorker.controller) showUpdateBanner(nw);
        });
      });
    }catch(e){/* registration failed — app still works */}
  });
  /* check again whenever the app is brought back to the foreground */
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") checkForUpdate(false); });
}

/* offer "add to home screen" shortly after load — only in a browser, never in
   the installed app. Delayed a touch so it doesn't fight the splash/first paint. */
window.addEventListener("load",()=>{ if(!isStandalone()) setTimeout(showInstallBanner,2600); });

/* keep number inputs from zooming weirdly handled by viewport; ready. */

/* boot the optional food packs (installed shop databases) so search includes
   them right away. Safe no-op if the module or IndexedDB isn't available. */
(function(){
  try{
    if(window.FoodPacks && FoodPacks.init){
      FoodPacks.init().then(function(){
        /* if the user is already on FUEL with the search open, refresh the list */
        try{ if(typeof paintList==="function" && document.getElementById("fs_list")) paintList(); }catch(e){}
      }).catch(function(){});
    }
  }catch(e){}
})();
