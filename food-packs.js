/* ============================================================================
   Evolve — Food Packs (optional, downloadable per-shop UK food databases)
   ----------------------------------------------------------------------------
   - Lists shops from food-db/manifest.json (the only network read, on demand)
   - Downloads a chosen shop's JSON and stores it in IndexedDB (on device)
   - packFoods() returns all installed-pack foods in the app's food format
       [ name, kcal, p, c, f, category ]  (brand folded into the name)
   - Nothing here is precached by the service worker; packs are fetched only
     when the user taps Download, and live entirely on the device thereafter.
   - PRIVACY: this only ever DOWNLOADS public lists. No personal data is sent.
   ========================================================================== */
(function(){
  "use strict";

  /* where the per-shop files live (same origin as the app) */
  var FOOD_DB_BASE = "./food-db/";
  var MANIFEST_URL = FOOD_DB_BASE + "manifest.json";

  /* ---- IndexedDB (packs can be a few MB — too big for localStorage) ------- */
  var DB_NAME = "evolve_food_packs_v1";
  var STORE   = "packs";
  var _dbp = null;
  function idb(){
    if(_dbp) return _dbp;
    _dbp = new Promise(function(res,rej){
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function(){ var db=r.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:"id"}); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror   = function(){ rej(r.error); };
    });
    return _dbp;
  }
  function idbPut(rec){ return idb().then(function(db){ return new Promise(function(res,rej){
    var tx=db.transaction(STORE,"readwrite"); tx.objectStore(STORE).put(rec);
    tx.oncomplete=function(){res(true);}; tx.onerror=function(){rej(tx.error);};
  });}); }
  function idbGet(id){ return idb().then(function(db){ return new Promise(function(res,rej){
    var tx=db.transaction(STORE,"readonly"); var rq=tx.objectStore(STORE).get(id);
    rq.onsuccess=function(){res(rq.result||null);}; rq.onerror=function(){rej(rq.error);};
  });}); }
  function idbDel(id){ return idb().then(function(db){ return new Promise(function(res,rej){
    var tx=db.transaction(STORE,"readwrite"); tx.objectStore(STORE).delete(id);
    tx.oncomplete=function(){res(true);}; tx.onerror=function(){rej(tx.error);};
  });}); }
  function idbAll(){ return idb().then(function(db){ return new Promise(function(res,rej){
    var tx=db.transaction(STORE,"readonly"); var rq=tx.objectStore(STORE).getAll();
    rq.onsuccess=function(){res(rq.result||[]);}; rq.onerror=function(){rej(rq.error);};
  });}); }

  /* ---- in-memory cache of installed pack foods (built once, on boot) ------ */
var _packFoods = [];          /* flat array in app food format */
var _installed = {};          /* id -> {id,name,count,bytes,version} */
var _ready = false;
var MAX_MANIFEST_BYTES = 512 * 1024;
var MAX_PACK_BYTES = 12 * 1024 * 1024;
var MAX_PACK_ITEMS = 12000;

function isPlainObject(v){ return !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype; }
function safeText(v, max){
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max || 120);
}
function safeNumber(v, fallback){
  var n = Number(v);
  return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
}
function validateShop(shop){
  if(!isPlainObject(shop)) return null;
  var id = safeText(shop.id, 40).toLowerCase();
  var file = safeText(shop.file, 80);
  if(!/^[a-z0-9-]+$/.test(id)) return null;
  if(!/^[a-z0-9-]+\.json$/i.test(file)) return null;
  return {
    id: id,
    name: safeText(shop.name || id, 80),
    file: file,
    count: Math.max(0, Math.round(safeNumber(shop.count, 0))),
    bytes: Math.max(0, Math.round(safeNumber(shop.bytes, 0))),
    version: safeText(shop.version || "", 40)
  };
}
function validateItem(it){
  if(!isPlainObject(it)) return null;
  var name = safeText(it.n, 90);
  if(!name) return null;
  var kcal = safeNumber(it.kcal, NaN), p = safeNumber(it.p, NaN), c = safeNumber(it.c, NaN), f = safeNumber(it.f, NaN);
  if(!Number.isFinite(kcal) || kcal < 0 || kcal > 900) return null;
  if(!Number.isFinite(p) || p < 0 || p > 100) return null;
  if(!Number.isFinite(c) || c < 0 || c > 100) return null;
  if(!Number.isFinite(f) || f < 0 || f > 100) return null;
  var out = {
    n: name,
    b: safeText(it.b || "", 60),
    shop: safeText(it.shop || "", 40),
    cat: APP_CATEGORIES[safeText(it.cat || "", 60)] ? safeText(it.cat || "", 60) : "Misc & extras",
    kcal: Math.round(kcal),
    p: Math.round(p * 10) / 10,
    c: Math.round(c * 10) / 10,
    f: Math.round(f * 10) / 10
  };
  if(it.serve && isPlainObject(it.serve)){
    var grams = safeNumber(it.serve.grams, NaN);
    if(Number.isFinite(grams) && grams > 0 && grams <= 2000){
      out.serve = { unit: safeText(it.serve.unit || "", 24), grams: Math.round(grams) };
    }
  }
  return out;
}

  /* category whitelist — shop foods must map onto an existing app category.
     Anything unknown falls back to "Misc & extras". Kept in sync with data.js. */
  var APP_CATEGORIES = {
    "Bread & bakery":1,"Cereal & breakfast":1,"Cheese":1,"Dairy & alternatives":1,
    "Drinks":1,"Fast food & meals":1,"Fish & seafood":1,"Fruit":1,
    "Grains, rice & pasta":1,"Legumes & plant protein":1,"Misc & extras":1,
    "Nuts, seeds & fats":1,"Poultry & egg":1,"Protein & supplements":1,
    "Red meat & pork":1,"Sauces & condiments":1,"Snacks & sweets":1,"Vegetables":1
  };
  function safeCat(c){ return (c && APP_CATEGORIES[c]) ? c : "Misc & extras"; }

  /* turn one stored pack record's items into the app's [name,kcal,p,c,f,cat] rows */
  function recordToRows(rec){
    if(!rec || !rec.items || !rec.items.length) return [];
    var shopName = rec.name || rec.id;
    var rows = [];
    for(var i=0;i<rec.items.length;i++){
      var it = rec.items[i]; if(!it || !it.n) continue;
      var brand = it.b || shopName;
      var name = brand ? (it.n + " (" + brand + ")") : it.n;
      rows.push([ name, +it.kcal||0, +it.p||0, +it.c||0, +it.f||0, safeCat(it.cat), it.shop||rec.id ]);
    }
    return rows;
  }

  /* rebuild the in-memory food list from everything currently in IndexedDB */
  function rebuild(){
    return idbAll().then(function(recs){
      _packFoods = [];
      _installed = {};
      recs.forEach(function(rec){
        _installed[rec.id] = { id:rec.id, name:rec.name||rec.id, count:(rec.items||[]).length, bytes:rec.bytes||0, version:rec.version||"" };
        _packFoods = _packFoods.concat(recordToRows(rec));
      });
      _ready = true;
      return _packFoods;
    }).catch(function(){ _ready = true; return []; });
  }

  /* ---- public API --------------------------------------------------------- */

  /* foods from all installed packs, in the app's food row format.
     allFoods() in app.js concatenates this. Returns [] until rebuild() runs. */
  function packFoods(){ return _packFoods; }

  /* which packs are installed (for the manage screen + the shop filter) */
  function installedPacks(){ return Object.keys(_installed).map(function(k){ return _installed[k]; }); }
  function installedShopIds(){ return Object.keys(_installed); }
  function isPackInstalled(id){ return !!_installed[id]; }

  /* fetch the manifest of available shops (network — only called on the screen) */
function loadManifest(){
  return fetch(MANIFEST_URL, {cache:"no-store", credentials:"same-origin"}).then(function(r){
    if(!r.ok) throw new Error("manifest "+r.status);
    var len = +(r.headers.get("content-length") || 0);
    if(len && len > MAX_MANIFEST_BYTES) throw new Error("manifest too large");
    return r.json();
  }).then(function(m){
    if(!m || !Array.isArray(m.shops)) throw new Error("bad manifest");
    var shops = m.shops.map(validateShop).filter(Boolean);
    if(!shops.length) throw new Error("empty manifest");
    return {
      version: safeText(m.version || "", 40),
      generated: safeText(m.generated || "", 64),
      total: Math.max(0, Math.round(safeNumber(m.total, 0))),
      attribution: safeText(m.attribution || "", 240),
      shops: shops
    };
  });
}

  /* download one shop's pack and store it; resolves with the installed summary */
function downloadPack(shop){
  shop = validateShop(shop);
  if(!shop) return Promise.reject(new Error("bad shop"));
  var url = FOOD_DB_BASE + shop.file;
  return fetch(url, {cache:"no-store", credentials:"same-origin"}).then(function(r){
    if(!r.ok) throw new Error("download "+r.status);
    var len = +(r.headers.get("content-length") || 0);
    if(len && len > MAX_PACK_BYTES) throw new Error("pack too large");
    return r.json();
  }).then(function(items){
    if(!Array.isArray(items)) throw new Error("bad pack file");
    if(items.length > MAX_PACK_ITEMS) throw new Error("pack too large");
    var clean = items.map(validateItem).filter(Boolean);
    if(!clean.length) throw new Error("pack had no valid foods");
    var rec = { id:shop.id, name:shop.name||shop.id, version:shop.version||"", bytes:shop.bytes||0, items:clean };
    return idbPut(rec).then(function(){ return rebuild(); }).then(function(){ return _installed[shop.id]; });
  });
}

  /* remove an installed pack */
  function removePack(id){ return idbDel(id).then(function(){ return rebuild(); }); }

  /* boot: load whatever is already installed so search has it immediately */
  function init(){ return rebuild(); }

  window.FoodPacks = {
    init: init,
    packFoods: packFoods,
    installedPacks: installedPacks,
    installedShopIds: installedShopIds,
    isPackInstalled: isPackInstalled,
    loadManifest: loadManifest,
    downloadPack: downloadPack,
    removePack: removePack,
    ready: function(){ return _ready; }
  };
})();
