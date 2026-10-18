/* App 3D · sito proprio
   I dati stanno su Firebase (Google) invece che su Claude. Offre alle app la stessa interfaccia
   di Claude (db, user, downloads) e aggiunge: accesso con email e password, approvazione delle
   persone nuove e, per ognuna, a quali app può entrare (Casa Nuova 3D, Bordo 3D).
   Ogni pagina dichiara prima di caricare questo file:
     window.FB3D_APP  = 'casa' | 'bordo'   (la home lo lascia vuoto)
     window.FB3D_HOME = '../'              (dove sta la home rispetto alla pagina) */
(function () {
  'use strict';
  var CFG = window.APP3D_FIREBASE_CONFIG || null;
  var APP = window.FB3D_APP || '';
  var HOME = window.FB3D_HOME || './';
  var APPS = { casa: 'Casa Nuova 3D', bordo: 'Bordo 3D' };
  var RUOLI = { base: 'Collega', admin: 'Amministratore' };
  // app di libero accesso (config.js): si aprono senza email e password
  var LIBERE = (window.APP3D_LIBERE || []).filter(function (a) { return APPS[a]; });
  var LIBERA = APP ? LIBERE.indexOf(APP) >= 0 : LIBERE.length === Object.keys(APPS).length;

  /* ---------- piccoli aiuti ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function nowISO() { return new Date().toISOString(); }
  // Firestore non accetta liste dentro liste: le avvolgo e le srotolo in lettura
  function enc(v) {
    if (Array.isArray(v)) return v.map(function (x) { return Array.isArray(x) ? { _a: enc(x) } : enc(x); });
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { if (v[k] !== undefined) o[k] = enc(v[k]); }); return o; }
    return v;
  }
  function dec(v) {
    if (Array.isArray(v)) return v.map(dec);
    if (v && typeof v === 'object') {
      var ks = Object.keys(v);
      if (ks.length === 1 && ks[0] === '_a' && Array.isArray(v._a)) return dec(v._a);
      var o = {}; ks.forEach(function (k) { o[k] = dec(v[k]); }); return o;
    }
    return v;
  }
  function errOf(e) {
    var c = (e && e.code) || 'unknown';
    var m = { 'permission-denied': 'permission_denied', 'unavailable': 'unavailable', 'resource-exhausted': 'quota_exceeded', 'invalid-argument': 'invalid_argument', 'not-found': 'not_found' };
    return { code: m[c] || String(c).replace(/^firestore\//, '').replace(/-/g, '_'), message: (e && e.message) || '' };
  }

  /* ---------- schermate sopra la pagina ---------- */
  var CSS = '#fb3d,#fb3dpan{--b:#F6F4EF;--s:#FFFFFF;--t:#1F2328;--t2:#5B6270;--l:#DCD8CF;--a:#1D6FD8;--r:#C0362C;--g:#2E7D4F}' +
    '@media (prefers-color-scheme:dark){#fb3d,#fb3dpan{--b:#141619;--s:#1E2126;--t:#EEF0F3;--t2:#A3AAB6;--l:#30343B;--a:#6FA8FF;--r:#FF8A80;--g:#7FD6A0}}' +
    '#fb3d{position:fixed;inset:0;z-index:99999;background:var(--b);color:var(--t);font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;overflow-y:auto;padding:calc(env(safe-area-inset-top) + 40px) 16px 32px}' +
    '#fb3d .box{width:100%;max-width:400px}#fb3d .brand{font-size:1.6rem;font-weight:700;margin:0 0 22px;letter-spacing:-.01em}' +
    '#fb3d h2{font-size:1.3rem;margin:0 0 6px}#fb3d p{color:var(--t2);margin:0 0 14px}#fb3d label{display:block;font-size:.9rem;color:var(--t2);margin:12px 0 6px}' +
    '#fb3d input{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:13px 14px;border-radius:12px;border:1px solid var(--l);background:var(--s);color:var(--t);outline:none}' +
    '#fb3d input:focus{border-color:var(--a)}#fb3d .btn{display:block;width:100%;margin-top:18px;padding:14px;border:0;border-radius:12px;background:var(--a);color:#fff;font:inherit;font-weight:600;font-size:17px;cursor:pointer;text-align:center;text-decoration:none;box-sizing:border-box}' +
    '#fb3d .btn[disabled]{opacity:.6}#fb3d .lnk{display:block;width:100%;margin-top:12px;background:none;border:0;color:var(--a);font:inherit;padding:8px;cursor:pointer;text-align:center;text-decoration:none}' +
    '#fb3d .err{color:var(--r);min-height:1.3em;margin-top:10px;font-size:.95rem}#fb3d .ok{color:var(--g)}#fb3d .card{background:var(--s);border:1px solid var(--l);border-radius:14px;padding:16px;margin-top:6px}' +
    '#fb3d .spin{width:34px;height:34px;border-radius:50%;border:3px solid var(--l);border-top-color:var(--a);margin:30px auto;animation:fb3dspin 1s linear infinite}@keyframes fb3dspin{to{transform:rotate(360deg)}}' +
    '#fb3dpan{position:fixed;inset:0;z-index:99998;background:var(--b);color:var(--t);overflow-y:auto;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;padding:calc(env(safe-area-inset-top) + 8px) 16px 40px}' +
    '#fb3dpan .in{max-width:560px;margin:0 auto}#fb3dpan .top{display:flex;align-items:center;gap:8px;height:52px;position:sticky;top:0;background:var(--b);z-index:2}#fb3dpan .top h3{flex:1;text-align:center;margin:0;font-size:1.05rem}' +
    '#fb3dpan .back{background:none;border:0;color:var(--a);font:inherit;padding:8px 4px;cursor:pointer;min-width:72px;text-align:left}' +
    '#fb3dpan h4{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--t2);margin:22px 4px 8px}' +
    '#fb3dpan .grp{background:var(--s);border:1px solid var(--l);border-radius:14px;overflow:hidden}#fb3dpan .u{padding:14px;border-top:1px solid var(--l)}#fb3dpan .u:first-child{border-top:0}' +
    '#fb3dpan .nm{font-weight:600}#fb3dpan .em{color:var(--t2);font-size:.9rem;word-break:break-all}#fb3dpan .acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}' +
    '#fb3dpan button.b{border:1px solid var(--l);background:var(--b);color:var(--t);border-radius:10px;padding:9px 12px;font:inherit;font-size:.92rem;cursor:pointer}' +
    '#fb3dpan button.b.pri{background:var(--a);border-color:var(--a);color:#fff}#fb3dpan button.b.red{color:var(--r)}#fb3dpan select{font:inherit;font-size:.92rem;padding:8px 10px;border-radius:10px;background:var(--b);color:var(--t);border:1px solid var(--l)}' +
    '#fb3dpan .chk{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--l);border-radius:10px;font-size:.92rem;cursor:pointer}#fb3dpan .chk input{width:18px;height:18px;margin:0;accent-color:var(--a)}' +
    '#fb3dpan .note{color:var(--t2);font-size:.9rem;margin:10px 4px}' +
    '#fb3dtoast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 90px);transform:translateX(-50%);z-index:100000;background:#2b2c33;color:#fff;padding:10px 16px;border-radius:12px;font:15px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;max-width:90vw;box-shadow:0 6px 20px rgba(0,0,0,.4)}';
  function ensureCss() { if (!$('#fb3d-css')) { var st = document.createElement('style'); st.id = 'fb3d-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function overlay(html) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { overlay(html); }, { once: true }); return null; }
    ensureCss();
    var o = $('#fb3d'); if (!o) { o = document.createElement('div'); o.id = 'fb3d'; document.body.appendChild(o); }
    o.innerHTML = '<div class="box"><div class="brand">' + esc(APPS[APP] || 'App 3D') + '</div>' + html + '</div>';
    return o;
  }
  function hideOverlay() { var o = $('#fb3d'); if (o) o.remove(); }
  function toast(t) {
    ensureCss(); var d = $('#fb3dtoast'); if (d) d.remove();
    d = document.createElement('div'); d.id = 'fb3dtoast'; d.textContent = t; document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, 3800);
  }
  var NEVER = new Promise(function () { });

  if (!CFG || !CFG.apiKey || /INSERISCI/.test(CFG.apiKey) || typeof firebase === 'undefined') {
    window.claude = { use: function () { return NEVER; } };
    window.__FB3D = { ready: NEVER, me: function () { return null; }, open: function () { }, home: HOME, apps: APPS };
    var showCfg = function () {
      overlay(typeof firebase === 'undefined'
        ? '<h2>Nessuna connessione</h2><p>Per aprire l’app serve internet. Controlla la connessione e riprova.</p><button class="btn" onclick="location.reload()">Riprova</button>'
        : '<h2>Quasi pronta</h2><p>Manca il collegamento al database Firebase. Va inserito una sola volta nel file <b>config.js</b> del sito.</p>');
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showCfg); else showCfg();
    return;
  }

  /* ---------- Firebase ---------- */
  firebase.initializeApp(CFG);
  var auth = firebase.auth(); auth.languageCode = 'it';
  var fs = firebase.firestore();
  try { fs.settings({ cacheSizeBytes: 100 * 1024 * 1024, ignoreUndefinedProperties: true, merge: true }); } catch (e) { }
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () { }); } catch (e) { }

  var READY_RES, READY = new Promise(function (r) { READY_RES = r; });
  // chi apre senza account: un codice per dispositivo, solo per riconoscere le proprie modifiche
  function ospite() {
    var id = ''; try { id = localStorage.getItem('app3d-ospite') || ''; if (!id) { id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('app3d-ospite', id); } } catch (e) { id = 'ospite'; }
    return { uid: id, nome: '', email: '', ruolo: 'base', stato: 'attivo', app: LIBERE, ospite: true };
  }
  var ME = null, UT = {}, UT_UNSUB = null, ME_UNSUB = null, registering = false, started = false, MISSING_T = 0;
  // valori scritti a mano nella console di Firebase possono avere spazi o un a capo in fondo
  function pulito(x) { x = x || {}; ['stato', 'ruolo'].forEach(function (k) { if (typeof x[k] === 'string') x[k] = x[k].trim(); }); return x; }
  function isAdmin() { return !!ME && ME.ruolo === 'admin'; }
  function canApp(u, a) { return !!u && u.stato === 'attivo' && (u.ruolo === 'admin' || (u.app || []).indexOf(a) >= 0); }

  /* ---------- database con la stessa interfaccia di Claude ---------- */
  // la scrittura parte subito sul dispositivo; il server conferma dopo (anche senza campo)
  function settle(p) {
    return new Promise(function (res, rej) {
      var done = false;
      p.then(function () { if (!done) { done = true; res(); } }, function (e) {
        var x = errOf(e);
        if (!done) { done = true; rej(x); } else toast('Una modifica non è stata salvata (' + x.code + '). Riapri la pagina.');
      });
      setTimeout(function () { if (!done) { done = true; res(); } }, 1500);
    });
  }
  function wrapDoc(d) {
    var x = d.exists ? d.data() : null;
    return { id: d.id, exists: !!x, data: function () { return x ? dec(clone(x)) : undefined; }, metadata: d.metadata };
  }
  function wrapQuery(s) { var docs = s.docs.map(wrapDoc); return { docs: docs, size: docs.length, empty: !docs.length, metadata: s.metadata }; }
  function ref(path) {
    var r = fs.doc(path);
    return {
      id: r.id,
      get: function () { return r.get().then(wrapDoc, function (e) { throw errOf(e); }); },
      set: function (data) { return settle(r.set(enc(clone(data || {})))); },
      update: function (data) { return settle(r.update(enc(clone(data || {})))); },
      delete: function () { return settle(r.delete()); },
      onSnapshot: function (next, err) { return r.onSnapshot(function (s) { next(wrapDoc(s)); }, function (e) { if (err) err(errOf(e)); }); }
    };
  }
  function query(q, name) {
    return {
      where: function (f, op, v) { return query(q.where(f, op, v), name); },
      orderBy: function (f, d) { return query(q.orderBy(f, d), name); },
      limit: function (n) { return query(q.limit(n), name); },
      get: function () { return q.get().then(wrapQuery, function (e) { throw errOf(e); }); },
      onSnapshot: function (next, err) { return q.onSnapshot(function (s) { next(wrapQuery(s)); }, function (e) { if (err) err(errOf(e)); }); },
      doc: function (id) { return ref(name + '/' + (id || fs.collection(name).doc().id)); }
    };
  }
  var DB = {
    collection: function (name) { return query(fs.collection(name), name); },
    doc: function (path) { return ref(path); }
  };

  /* ---------- persone ---------- */
  var USER = {
    id: function () { return Promise.resolve(ME && ME.uid); },
    me: function () { return Promise.resolve({ id: ME.uid, name: ME.nome || '', isOwner: isAdmin() }); },
    isOwner: function () { return isAdmin(); },
    canEdit: function () { return Promise.resolve(!!ME); },
    can: function (n) { return Promise.resolve(n === 'data.write' ? true : null); },
    profiles: function (ids) {
      var o = {}; (ids || []).forEach(function (id) { var u = UT[id]; o[id] = { id: id, name: u ? (u.nome || '') : '', avatarUrl: '' }; });
      return Promise.resolve(o);
    }
  };

  /* ---------- file da salvare (copie, PDF, immagini) ---------- */
  var DL = {
    save: function (o) {
      return (async function () {
        var name = o.filename || 'file', data = o.data;
        var type = /\.json$/i.test(name) ? 'application/json' : /\.csv$/i.test(name) ? 'text/csv' : /\.txt$/i.test(name) ? 'text/plain' : /\.pdf$/i.test(name) ? 'application/pdf' : /\.png$/i.test(name) ? 'image/png' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : 'application/octet-stream';
        var blob = data instanceof Blob ? data : new Blob([data], { type: type });
        var mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (mobile && navigator.canShare) {
          try {
            var file = new File([blob], name, { type: blob.type || type });
            if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return { status: 'saved' }; }
          } catch (e) { if (e && e.name === 'AbortError') throw { code: 'declined', message: 'Annullato' }; }
        }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
        return { status: 'saved' };
      })();
    }
  };

  /* ---------- App Check: solo questo sito può usare l'AI (se la chiave reCAPTCHA è in config.js) ---------- */
  var APPCHECK = null;
  function appCheck() {
    if (!window.APP3D_RECAPTCHA) return Promise.resolve(null);
    if (!APPCHECK) APPCHECK = new Promise(function (res) {
      var sc = document.createElement('script'); sc.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check-compat.js';
      sc.onload = function () { try { var ac = firebase.appCheck(); ac.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(window.APP3D_RECAPTCHA), true); res(ac); } catch (e) { res(null); } };
      sc.onerror = function () { res(null); }; document.head.appendChild(sc);
    });
    return APPCHECK;
  }
  /* ---------- AI: Gemini tramite Firebase AI Logic ---------- */
  function blobB64(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = function () { rej(r.error); }; r.readAsDataURL(b); }); }
  async function gemini(prompt, o, asJson) {
    o = o || {};
    var parts = [{ text: prompt }];
    for (var i = 0; i < (o.images || []).length; i++) { var b = o.images[i]; parts.push({ inline_data: { mime_type: b.type || 'image/jpeg', data: await blobB64(b) } }); }
    var body = { contents: [{ role: 'user', parts: parts }] };
    if (asJson) body.generationConfig = { responseMimeType: 'application/json' };
    var model = window.APP3D_AI_MODEL || 'gemini-3.8-flash', r, h = { 'Content-Type': 'application/json', 'x-goog-api-key': CFG.apiKey };
    var ac = await appCheck(); if (ac) { try { h['X-Firebase-AppCheck'] = (await ac.getToken()).token; } catch (e) { } }
    try {
      r = await fetch('https://firebasevertexai.googleapis.com/v1beta/projects/' + CFG.projectId + '/models/' + model + ':generateContent', {
        method: 'POST', headers: h, body: JSON.stringify(body), signal: o.signal });
    } catch (e) { if (e && e.name === 'AbortError') throw { code: 'cancelled', message: 'Annullato' }; throw { code: 'network', message: 'Nessuna connessione' }; }
    if (r.status === 401) throw { code: 'error', message: 'App Check ha rifiutato la richiesta' };
    if (r.status === 429) throw { code: 'rate_limited', message: 'Troppe richieste' };
    if (!r.ok) throw { code: 'error', message: 'Gemini ha risposto ' + r.status };
    var d = await r.json(), c = d.candidates && d.candidates[0], txt = ((c && c.content && c.content.parts) || []).map(function (p) { return p.thought ? '' : (p.text || ''); }).join('');
    if (!asJson) return txt;
    try { return JSON.parse(txt.replace(/^```(json)?|```$/g, '').trim()); } catch (e) { throw { code: 'error', message: 'Risposta non leggibile' }; }
  }
  var SAMPLE = {
    limits: function () { return Promise.resolve({ images: true }); },
    text: function (prompt, o) { return gemini(prompt, o, false); },
    json: function (prompt, o) { return gemini(prompt, o, true); }
  };

  // le app chiedono le capacità come su Claude; qui rispondono dopo l'accesso
  window.claude = {
    use: function (name) {
      return READY.then(function () {
        if (name === 'db') return DB;
        if (name === 'user') return USER;
        if (name === 'downloads') return DL;
        if (name === 'sample' && window.APP3D_AI !== false) return SAMPLE;
        throw { code: 'not_declared', message: 'Non disponibile sul sito' };
      });
    }
  };

  /* ---------- accesso, registrazione, attesa ---------- */
  var AUTH_MSG = {
    'auth/invalid-credential': 'Email o password sbagliate.', 'auth/wrong-password': 'Email o password sbagliate.', 'auth/user-not-found': 'Nessun account con questa email: registrati.',
    'auth/invalid-login-credentials': 'Email o password sbagliate.', 'auth/email-already-in-use': 'Esiste già un account con questa email: accedi.',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri.', 'auth/invalid-email': 'Email non valida.', 'auth/missing-password': 'Scrivi la password.',
    'auth/network-request-failed': 'Nessuna connessione. Riprova quando hai campo.', 'auth/too-many-requests': 'Troppi tentativi: riprova tra qualche minuto.',
    'auth/configuration-not-found': 'In Firebase l’accesso con email non è ancora attivo (Authentication › Metodo di accesso › Email/password).',
    'auth/operation-not-allowed': 'In Firebase l’accesso con email non è ancora attivo (Authentication › Metodo di accesso › Email/password).',
    'auth/unauthorized-domain': 'Questo indirizzo non è ancora autorizzato in Firebase (Authentication › Impostazioni › Domini autorizzati).'
  };
  function authErr(e) { return AUTH_MSG[e && e.code] || ('Non è andata: ' + ((e && (e.code || e.message)) || 'errore')); }
  function busy(form, on) { form.querySelectorAll('button').forEach(function (b) { b.disabled = on; }); }
  function showLogin(msg) {
    var o = overlay('<h2>Accedi</h2><p>Entra con la tua email e la tua password.</p>' +
      '<form id="fb-login"><label for="fb-em">Email</label><input id="fb-em" type="email" autocomplete="username" inputmode="email" required>' +
      '<label for="fb-pw">Password</label><input id="fb-pw" type="password" autocomplete="current-password" required>' +
      '<button class="btn" type="submit">Accedi</button><div class="err" id="fb-err">' + esc(msg || '') + '</div></form>' +
      '<button class="lnk" id="fb-goreg">Prima volta? Crea il tuo account</button><button class="lnk" id="fb-goreset">Password dimenticata</button>');
    var f = $('#fb-login', o);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); busy(f, true); $('#fb-err').textContent = '';
      auth.signInWithEmailAndPassword($('#fb-em').value.trim(), $('#fb-pw').value).catch(function (er) { busy(f, false); $('#fb-err').textContent = authErr(er); });
    });
    $('#fb-goreg', o).onclick = showRegister; $('#fb-goreset', o).onclick = showReset;
  }
  function showRegister() {
    var o = overlay('<h2>Crea il tuo account</h2><p>Dopo la registrazione un amministratore deve approvarti e scegliere a quali app puoi entrare.</p>' +
      '<form id="fb-reg"><label for="fb-nm">Nome e cognome</label><input id="fb-nm" type="text" autocomplete="name" required maxlength="60">' +
      '<label for="fb-em">Email</label><input id="fb-em" type="email" autocomplete="username" inputmode="email" required>' +
      '<label for="fb-pw">Password (almeno 6 caratteri)</label><input id="fb-pw" type="password" autocomplete="new-password" minlength="6" required>' +
      '<button class="btn" type="submit">Crea account</button><div class="err" id="fb-err"></div></form><button class="lnk" id="fb-gologin">Ho già un account: accedi</button>');
    var f = $('#fb-reg', o);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); busy(f, true); $('#fb-err').textContent = '';
      var nome = $('#fb-nm').value.trim(), email = $('#fb-em').value.trim(), pw = $('#fb-pw').value;
      registering = true;
      auth.createUserWithEmailAndPassword(email, pw).then(function (cr) { return createProfile(cr.user, nome, email); })
        .then(function () { registering = false; watchMe(auth.currentUser); }, function (er) { registering = false; busy(f, false); $('#fb-err').textContent = authErr(er); });
    });
    $('#fb-gologin', o).onclick = function () { showLogin(); };
  }
  // il primo che si registra diventa amministratore, con tutte e due le app
  function createProfile(u, nome, email) {
    var cfg = fs.collection('config').doc('inizializzato'), me = fs.collection('utenti').doc(u.uid);
    var base = { nome: nome, email: email, creato: nowISO(), modificato: nowISO() };
    var wait = function () {
      return me.get({ source: 'server' }).then(function (d) { if (!d.exists) return me.set(Object.assign({}, base, { stato: 'in_attesa', ruolo: 'base', app: [] })); });
    };
    return cfg.get({ source: 'server' }).then(function (c) {
      if (c.exists) return wait();
      var b = fs.batch();
      b.set(me, Object.assign({}, base, { stato: 'attivo', ruolo: 'admin', app: ['casa', 'bordo'] }));
      b.set(cfg, { da: u.uid, il: nowISO() });
      return b.commit().catch(wait);
    });
  }
  function showReset() {
    var o = overlay('<h2>Password dimenticata</h2><p>Ti mandiamo un’email con il link per sceglierne una nuova.</p>' +
      '<form id="fb-rs"><label for="fb-em">Email</label><input id="fb-em" type="email" autocomplete="username" inputmode="email" required>' +
      '<button class="btn" type="submit">Mandami il link</button><div class="err" id="fb-err"></div></form><button class="lnk" id="fb-gologin">Torna all’accesso</button>');
    var f = $('#fb-rs', o);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); busy(f, true);
      auth.sendPasswordResetEmail($('#fb-em').value.trim()).then(function () { $('#fb-err').innerHTML = '<span class="ok">Fatto: controlla la posta (anche lo spam).</span>'; busy(f, false); },
        function (er) { busy(f, false); $('#fb-err').textContent = authErr(er); });
    });
    $('#fb-gologin', o).onclick = function () { showLogin(); };
  }
  function showWait(u) {
    var o = overlay('<h2>Richiesta inviata</h2><div class="card"><p style="margin:0">Ciao <b>' + esc(u.nome || '') + '</b>, il tuo account è in attesa. Un amministratore deve approvarlo: appena lo fa, l’app si apre da sola.</p></div>' +
      '<button class="lnk" id="fb-out">Esci</button>');
    $('#fb-out', o).onclick = logout;
  }
  function showBlocked() {
    var o = overlay('<h2>Accesso sospeso</h2><p>Il tuo account non è attivo. Parla con un amministratore.</p><button class="lnk" id="fb-out">Esci</button>');
    $('#fb-out', o).onclick = logout;
  }
  function showNoApp() {
    var o = overlay('<h2>Non hai accesso a questa app</h2><p>Il tuo account è attivo, ma un amministratore non ti ha ancora dato ' + esc(APPS[APP]) + '. Appena lo fa, la pagina si apre da sola.</p>' +
      '<a class="btn" href="' + esc(HOME) + '">Vai alla home</a><button class="lnk" id="fb-out">Esci</button>');
    $('#fb-out', o).onclick = logout;
  }
  function logout() {
    auth.signOut().then(function () {
      try { fs.terminate().then(function () { return fs.clearPersistence(); }).finally(function () { location.href = HOME; }); } catch (e) { location.href = HOME; }
    });
  }
  function watchMe(u) {
    if (ME_UNSUB) { ME_UNSUB(); ME_UNSUB = null; }
    overlay('<div class="spin"></div>');
    ME_UNSUB = fs.collection('utenti').doc(u.uid).onSnapshot(function (d) {
      // profilo mancante: aspetto un attimo, potrebbe crearlo un'altra scheda che sta registrando
      if (!d.exists) {
        if (registering || MISSING_T) return;
        MISSING_T = setTimeout(function () {
          fs.collection('utenti').doc(u.uid).get({ source: 'server' }).then(function (s2) {
            if (!s2.exists && !registering) return createProfile(u, (u.email || '').split('@')[0], u.email || '');
          }).catch(function () { }).finally(function () { MISSING_T = 0; });
        }, 5000);
        return;
      }
      var x = pulito(d.data()); x.uid = u.uid; x.email = x.email || u.email;
      var ok = x.stato === 'attivo' && (!APP || canApp(x, APP));
      if (started) {
        var was = ME; ME = x;
        if (!ok || (was && (was.ruolo !== x.ruolo || String(was.app) !== String(x.app)))) location.reload();
        return;
      }
      ME = x;
      if (ok) { started = true; hideOverlay(); READY_RES(); afterStart(); }
      else if (x.stato === 'attivo') showNoApp();
      else if (x.stato === 'bloccato') showBlocked();
      else showWait(x);
    }, function (e) {
      if (!started) showLogin('Non riesco a leggere il tuo account (' + errOf(e).code + '). Se hai appena incollato le regole, riprova tra un minuto.');
    });
  }
  var DOM = new Promise(function (r) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', r, { once: true }); else r(); });
  if (LIBERA) { ME = ospite(); started = true; READY_RES(); }
  else auth.onAuthStateChanged(function (u) {
    DOM.then(function () {
      if (!u) { if (started) { location.href = HOME; return; } showLogin(); return; }
      if (!registering) watchMe(u);
    });
  });
  if (!LIBERA) DOM.then(function () { if (!started && !$('#fb3d')) overlay('<div class="spin"></div>'); });

  function afterStart() {
    UT_UNSUB = fs.collection('utenti').onSnapshot(function (s) {
      var m = {}; s.docs.forEach(function (d) { m[d.id] = pulito(d.data()); }); UT = m; if ($('#fb3dpan')) renderPanel(); emitUsers();
    }, function () { });
  }
  var USUBS = [];
  function emitUsers() { USUBS.forEach(function (f) { try { f(); } catch (e) { } }); }

  /* ---------- pannelli: persone e permessi, il mio account ---------- */
  var PAN = null;
  function open(k) { PAN = k; renderPanel(); }
  function closePanel() { PAN = null; var p = $('#fb3dpan'); if (p) p.remove(); }
  function pending() { return Object.keys(UT).filter(function (id) { return UT[id].stato === 'in_attesa'; }).length; }
  function appChecks(id, u) {
    return Object.keys(APPS).map(function (a) {
      return '<label class="chk"><input type="checkbox" data-fb="app" data-id="' + id + '" data-a="' + a + '"' + ((u.app || []).indexOf(a) >= 0 ? ' checked' : '') + '> ' + esc(APPS[a]) + '</label>';
    }).join('');
  }
  function renderPanel() {
    if (!PAN || !ME) return;
    ensureCss();
    var p = $('#fb3dpan'); if (!p) { p = document.createElement('div'); p.id = 'fb3dpan'; document.body.appendChild(p); }
    var h = '';
    if (PAN === 'account') {
      h = '<div class="top"><button class="back" data-fb="close">‹ Indietro</button><h3>Il mio account</h3><span style="min-width:72px"></span></div>' +
        '<div class="grp"><div class="u"><div class="nm">' + esc(ME.nome || '') + '</div><div class="em">' + esc(ME.email || '') + '</div><div class="note" style="margin:6px 0 0">Ruolo: ' + esc(RUOLI[ME.ruolo] || ME.ruolo) + '</div>' +
        '<div class="acts"><button class="b" data-fb="pw">Cambia password</button><button class="b red" data-fb="out">Esci</button></div></div></div>' +
        '<p class="note">«Cambia password» ti manda un’email con il link.</p>';
    } else if (PAN === 'utenti' && isAdmin()) {
      var ids = Object.keys(UT), by = function (st) { return ids.filter(function (id) { return (UT[id].stato || '') === st; }).sort(function (a, b) { return String(UT[a].nome || '').localeCompare(String(UT[b].nome || ''), 'it'); }); };
      var row = function (id) {
        var u = UT[id], self = id === ME.uid, a = '';
        if (u.stato === 'in_attesa') a = appChecks(id, u) + '<button class="b pri" data-fb="ok" data-id="' + id + '">Approva</button><button class="b red" data-fb="no" data-id="' + id + '">Rifiuta</button>';
        else if (u.stato === 'attivo') a = self ? '<span class="note" style="margin:0">Sei tu: vedi tutte le app</span>' :
          (u.ruolo === 'admin' ? '' : appChecks(id, u)) +
          '<select data-fb="ruolo" data-id="' + id + '">' + ['base', 'admin'].map(function (r) { return '<option value="' + r + '"' + (u.ruolo === r ? ' selected' : '') + '>' + RUOLI[r] + '</option>'; }).join('') + '</select>' +
          '<button class="b red" data-fb="block" data-id="' + id + '">Sospendi</button>';
        else a = '<button class="b" data-fb="ok" data-id="' + id + '">Riattiva</button>';
        return '<div class="u"><div class="nm">' + esc(u.nome || 'Senza nome') + '</div><div class="em">' + esc(u.email || '') + '</div><div class="acts">' + a + '</div></div>';
      };
      var sec = function (t, list, empty) { return '<h4>' + t + '</h4>' + (list.length ? '<div class="grp">' + list.map(row).join('') + '</div>' : '<p class="note">' + empty + '</p>'); };
      h = '<div class="top"><button class="back" data-fb="close">‹ Indietro</button><h3>Persone e permessi</h3><span style="min-width:72px"></span></div>' +
        sec('In attesa', by('in_attesa'), 'Nessuna richiesta.') + sec('Attivi', by('attivo'), 'Nessuno.') + (by('bloccato').length ? sec('Sospesi', by('bloccato'), '') : '') +
        '<p class="note">Spunta le app che ognuno può aprire. Gli amministratori le vedono tutte e possono approvare le persone nuove.</p>';
    } else { closePanel(); return; }
    p.innerHTML = '<div class="in">' + h + '</div>';
  }
  function setUser(id, data) {
    data.modificato = nowISO();
    return settle(fs.collection('utenti').doc(id).update(data)).catch(function (e) { toast('Non riuscito (' + e.code + ')'); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('#fb3dpan [data-fb]'); if (!t || t.tagName === 'SELECT' || t.tagName === 'INPUT') return;
    var k = t.getAttribute('data-fb'), id = t.getAttribute('data-id');
    if (k === 'close') closePanel();
    else if (k === 'out') { if (confirm('Vuoi uscire?')) logout(); }
    else if (k === 'pw') auth.sendPasswordResetEmail(ME.email).then(function () { toast('Ti ho mandato l’email per cambiare la password'); }, function (er) { toast(authErr(er)); });
    else if (k === 'ok') setUser(id, { stato: 'attivo' });
    else if (k === 'no') { if (confirm('Rifiuti la richiesta di ' + (UT[id] && UT[id].nome || 'questa persona') + '?')) setUser(id, { stato: 'bloccato' }); }
    else if (k === 'block') { if (confirm('Sospendi ' + (UT[id] && UT[id].nome || 'questa persona') + '? Non potrà più entrare finché non la riattivi.')) setUser(id, { stato: 'bloccato' }); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#fb3dpan')) return;
    var k = t.getAttribute('data-fb'), id = t.getAttribute('data-id'); if (!id || !UT[id]) return;
    if (k === 'ruolo') setUser(id, { ruolo: t.value === 'admin' ? 'admin' : 'base' });
    else if (k === 'app') {
      var cur = (UT[id].app || []).filter(function (a) { return a !== t.getAttribute('data-a'); });
      if (t.checked) cur.push(t.getAttribute('data-a'));
      setUser(id, { app: cur });
    }
  });

  window.__FB3D = {
    ready: READY,
    home: HOME,
    apps: APPS,
    libera: LIBERA,
    libere: LIBERE,
    me: function () { return ME ? { id: ME.uid, nome: ME.nome || '', email: ME.email || '', admin: isAdmin(), app: isAdmin() ? Object.keys(APPS) : (ME.app || []) } : null; },
    pending: function () { return isAdmin() ? pending() : 0; },
    onUsers: function (f) { USUBS.push(f); },
    open: open,
    toast: toast
  };
})();
