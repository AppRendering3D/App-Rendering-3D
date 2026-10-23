/* Guida «?»: spiega come funziona l'app. Si apre dal pulsante «?» nella barra, sul capitolo della scheda in cui sei.
   La prima volta che una persona entra nell'app si apre da sola, poi solo col «?». */
(function () {
  var APP = window.FB3D_APP || '';
  var KEY = 'app3d-guida-' + APP;

  var CAPITOLI = {
    casa: [
      { id: 'inizio', tabs: ['archivio'], t: 'Per iniziare', html:
        '<p>Casa Nuova 3D disegna la pianta di una casa e la mostra in 3D, con arredi e impianti.</p>' +
        '<ol><li>Dall’archivio tocca <b>Nuova casa da planimetria</b>.</li>' +
        '<li>Carica la planimetria: foto, screenshot o PDF.</li>' +
        '<li>L’app ricalca muri, porte, finestre e stanze. Controlla, poi tocca <b>Usa</b>.</li>' +
        '<li>In alto passi da <b>Pianta</b> a <b>3D</b>.</li></ol>' +
        '<p>Tutto si salva da solo: il pallino in alto a destra dice se è salvato.</p>' },
      { id: 'pianta', tabs: ['pianta'], t: 'Partire dalla planimetria', html:
        '<p>Nella scheda <b>Planimetria</b> tocca <b>Crea dalla planimetria</b> e scegli la foto o il PDF. Non serve l’AI.</p>' +
        '<ul><li>Se sulla pianta ci sono nomi e metri quadri delle stanze, l’app li legge da sola.</li>' +
        '<li>Se una misura non torna, tocca <b>Correggi una misura</b>: tocchi un muro di cui conosci la lunghezza, scrivi la misura vera e si sistema tutto.</li>' +
        '<li>Fai la foto dall’alto, dritta, con tutta la pianta dentro: viene meglio.</li></ul>' +
        '<p>Se preferisci disegnare a mano, usa <b>Carica solo come sfondo</b>, imposta la scala su una quota che conosci e disegna sopra.</p>' },
      { id: 'demolire', tabs: ['pianta'], t: 'Muri da demolire e da costruire', html:
        '<p>Sulla pianta i muri <b style="color:#C9A400">gialli</b> sono da demolire, quelli <b style="color:#C62828">rossi</b> da costruire.</p>' +
        '<ul><li><b>Progetto finito</b>: vedi la casa a lavori fatti.</li>' +
        '<li><b>Stato attuale</b>: vedi la casa com’è oggi.</li></ul>' +
        '<p>Per cambiare un muro, toccalo e scegli <b>C’è già</b>, <b>Da demolire</b> o <b>Da costruire</b>.</p>' },
      { id: 'muoversi', t: 'Pianta e 3D', html:
        '<ul><li><b>Pianta</b>: trascina lo sfondo per spostarti, due dita per ingrandire.</li>' +
        '<li><b>3D</b>: un dito ruota, due dita ingrandiscono. <b>Entra in…</b> ti mette dentro una stanza ad altezza occhi.</li>' +
        '<li><b>Metro</b>: tocchi due punti e leggi la misura. Si aggancia ad angoli, muri, prese e mobili.</li>' +
        '<li><b>Livelli</b>: scegli cosa vedere (arredamento, elettricista, idraulico, prima di forare).</li>' +
        '<li>Le frecce in alto annullano o ripristinano l’ultima modifica.</li></ul>' },
      { id: 'stanze', tabs: ['stanze'], t: 'Stanze e muri', html:
        '<ul><li>Tocca una stanza per sceglierla: la trascini o tiri gli angoli. I mobili dentro si spostano con lei.</li>' +
        '<li>Per cambiare nome o misure tocca la stanza e scrivi nel pannello.</li>' +
        '<li>Stanza a L o con un lato storto: selezionala e scegli <b>Forma libera</b>.</li>' +
        '<li><b>Disegna un muro</b>: tocchi l’inizio e la fine, anche storto.</li>' +
        '<li>Con una stanza scelta, <b>Foto delle pareti</b> mette le foto vere sui muri del 3D.</li></ul>' +
        '<p>Usa le misure nette, da muro a muro.</p>' },
      { id: 'arredi', tabs: ['arredi'], t: 'Arredi', html:
        '<ul><li>Nella scheda <b>Arredi</b> tocca un mobile, una porta o una finestra: compare nella pianta.</li>' +
        '<li>Trascinalo dove vuoi. Porte e finestre si agganciano da sole al muro.</li>' +
        '<li>Tocca un mobile per cambiare misure, colore e rotazione.</li>' +
        '<li><b>Aggiungi da una foto</b>: fotografi il mobile in negozio e la foto va sul mobile nel 3D.</li>' +
        '<li>Le quote blu sono lo spazio libero intorno al mobile; diventano arancioni sotto i 60 cm.</li></ul>' },
      { id: 'impianto', tabs: ['impianto'], t: 'Impianto elettrico e idraulico', html:
        '<ul><li>Prese, interruttori, luci e attacchi dell’acqua si aggiungono da <b>Arredi</b>.</li>' +
        '<li>La sigla è il tipo più l’altezza da terra in cm: <b>P40</b> è una presa a 40 cm.</li>' +
        '<li>La scheda <b>Impianto</b> li elenca per stanza e per tipo; tocca una riga per trovarli sulla pianta. <b>Copia l’elenco</b> per mandarlo all’elettricista.</li>' +
        '<li><b>Non forare</b>: se un mobile copre un punto o una traccia, il mobile diventa arancione e il punto ha un cerchio rosso.</li></ul>' },
      { id: 'voce', t: 'Comandi a voce', html:
        '<p>Tocca il <b>microfono</b> sul foglio di lavoro e parla, per esempio:</p>' +
        '<ul><li>«aggiungi una presa a 110 cm sul muro della cucina verso il soggiorno»</li>' +
        '<li>«metti un letto matrimoniale in camera»</li>' +
        '<li>«la camera è larga 3 metri e 40»</li></ul>' +
        '<p>L’app ti dice cosa ha capito e cambia la casa solo quando tocchi <b>Conferma</b>. Se il microfono non va, puoi scrivere.</p>' },
      { id: 'idee', tabs: ['idee'], t: 'Idee', html:
        '<p>Appunti della casa: misure prese col metro, cose da comprare, domande per l’elettricista. <b>Copia tutte le idee</b> per mandarle su WhatsApp.</p>' },
      { id: 'progetto', tabs: ['progetto'], t: 'Archivio, copie e salvataggio', html:
        '<ul><li>Ogni casa è salvata online da sola: chi ha accesso la vede uguale.</li>' +
        '<li>Con la freccia in alto a sinistra torni all’<b>archivio</b> delle case.</li>' +
        '<li>Nella scheda <b>Progetto</b> cambi il nome, esporti o importi una copia, scarichi l’immagine del 3D ed elimini la casa.</li></ul>' }
    ],
    bordo: [
      { id: 'inizio', tabs: ['archivio'], t: 'Per iniziare', html:
        '<p>Bordo 3D è l’archivio delle barche del cantiere: carena in 3D, interni, impianti e preventivi.</p>' +
        '<ol><li>Dall’archivio tocca <b>Nuova barca</b>, oppure apri una barca esistente.</li>' +
        '<li>Nella scheda <b>Scheda</b> metti tipo di carena e misure, oppure usa <b>Compila dal documento</b>.</li>' +
        '<li>In alto passi tra <b>Alto</b>, <b>Fianco</b> e <b>3D</b>.</li></ol>' +
        '<p>Tutto si salva da solo e i colleghi vedono le stesse barche.</p>' },
      { id: 'scheda', tabs: ['scheda'], t: 'Scheda della barca', html:
        '<ul><li><b>Compila dal documento</b>: puoi scegliere tante foto insieme (anche 20-30: fuori da più lati, coperta, interni) e PDF di scheda tecnica o manuale. L’AI le mette insieme e propone misure, carena e interni, tu controlli. Le foto servono solo per la lettura: non restano nella barca.</li>' +
        '<li>Le misure si scrivono in cm. Il 3D cambia mentre scrivi.</li>' +
        '<li>In fondo trovi i dati del manuale del proprietario, le note e i pulsanti per esportare, duplicare o eliminare la barca.</li></ul>' },
      { id: 'immagini', tabs: ['immagini'], t: 'Immagini e ricalco', html:
        '<ul><li><b>Inserisci immagine</b>: un disegno, una pianta o una foto della barca, di un pannello o di un oggetto.</li>' +
        '<li>Per il profilo di fianco e la vista dall’alto: prima <b>Imposta la scala</b> su una misura che conosci, poi <b>Ricalca</b> toccando i punti della linea. La carena 3D segue il disegno.</li>' +
        '<li>Le foto dei pannelli si raddrizzano toccando i 4 angoli.</li></ul>' },
      { id: 'interni', tabs: ['interni'], t: 'Interni', html:
        '<ul><li>Aggiungi paratie, paglioli, pannelli, arredi e attrezzature.</li>' +
        '<li>Trascinali nella vista; toccali per cambiare misure e posizione.</li>' +
        '<li><b>Aggiungi da una foto</b>: fotografi l’oggetto, tocchi i 4 angoli e scrivi le misure.</li></ul>' },
      { id: 'impianti', tabs: ['impianti'], t: 'Impianti', html:
        '<ul><li><b>Elettrico</b> e <b>Idraulico</b>: metti le utenze, poi <b>Disegna un cavo</b> o <b>Disegna un tubo</b> toccando i punti del percorso.</li>' +
        '<li><b>Quadro</b>: circuiti e protezioni. L’app calcola la caduta di tensione e avvisa se una protezione scatta.</li>' +
        '<li><b>Materiali</b>: la lista di cavi, tubi, capicorda e fascette si compila da sola. Puoi copiarla o scaricarla.</li></ul>' },
      { id: 'carena', tabs: ['carena'], t: 'Carena e preventivo', html:
        '<ul><li>Le superfici di opera viva, opera morta e coperta vengono dal modello 3D.</li>' +
        '<li><b>Antivegetativa</b>: litri necessari in base alla resa scritta sulla latta.</li>' +
        '<li><b>Preventivo</b>: aggiungi le voci con i tuoi prezzi, poi <b>Scarica PDF</b> o <b>Copia testo</b>.</li>' +
        '<li>I dati del cantiere per l’intestazione del PDF si mettono nell’archivio.</li></ul>' },
      { id: 'muoversi', t: 'Viste, metro e livelli', html:
        '<ul><li>Trascina per spostarti, due dita per ingrandire. Nel 3D un dito ruota.</li>' +
        '<li><b>Metro</b>: tocchi due punti e leggi la misura.</li>' +
        '<li><b>Livelli</b>: scegli cosa vedere (carena, elettrico, idraulico…).</li>' +
        '<li>Le frecce in alto annullano o ripristinano l’ultima modifica.</li></ul>' },
      { id: 'voce', t: 'Comandi a voce', html:
        '<p>Tocca il <b>microfono</b> e di’ cosa vuoi fare, per esempio «aggiungi una pompa di sentina a poppa». L’app ti dice cosa ha capito e cambia la barca solo quando tocchi <b>Conferma</b>. Se il microfono non va, puoi scrivere.</p>' }
    ]
  };

  var CSS = '' +
    '.gd-back{position:fixed;inset:0;z-index:2147482000;background:rgb(0 0 0 / .42);display:flex;align-items:flex-end;justify-content:center}' +
    '.gd{background:var(--sheet,#fff);color:var(--ink,#1c272c);width:100%;max-width:560px;max-height:min(88vh,760px);display:flex;flex-direction:column;border-radius:16px 16px 0 0;box-shadow:var(--shadow,0 8px 24px rgb(0 0 0 / .2));padding-bottom:env(safe-area-inset-bottom,0px)}' +
    '@media (min-width:640px){.gd-back{align-items:center}.gd{border-radius:16px}}' +
    '.gd-h{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--rule,#ccd)}' +
    '.gd-h h2{flex:1;margin:0;font-size:18px}' +
    '.gd-x{flex:none;width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--rule,#ccd);background:transparent;color:inherit;border-radius:10px;cursor:pointer;padding:0}' +
    '.gd-b{overflow:auto;padding:6px 16px 8px;-webkit-overflow-scrolling:touch}' +
    '.gd details{border-bottom:1px solid var(--rule,#ccd)}' +
    '.gd summary{cursor:pointer;padding:13px 2px;font-weight:600;font-size:15.5px;list-style:none;display:flex;justify-content:space-between;gap:10px}' +
    '.gd summary::-webkit-details-marker{display:none}' +
    '.gd summary::after{content:"+";color:var(--ink-3,#789);font-weight:400}' +
    '.gd details[open] summary::after{content:"\\2212"}' +
    '.gd details[open] summary{color:var(--accent,#2a49c9)}' +
    '.gd-c{padding:0 2px 12px;font-size:14.5px;line-height:1.5;color:var(--ink-2,#536167)}' +
    '.gd-c b{color:var(--ink,#1c272c)}' +
    '.gd-c p{margin:0 0 8px}.gd-c ul,.gd-c ol{margin:0 0 8px;padding-left:20px}.gd-c li{margin-bottom:5px}' +
    '.gd-f{padding:10px 16px 14px;border-top:1px solid var(--rule,#ccd)}' +
    '.gd-ok{width:100%;height:44px;border:0;border-radius:10px;background:var(--accent,#2a49c9);color:var(--accent-ink,#fff);font-weight:600;font-size:15px;cursor:pointer}' +
    '.gd-btn{flex:none;font-weight:700;font-size:17px}';

  var el = null, prima = null;
  function stile() {
    if (document.getElementById('gd-css')) return;
    var s = document.createElement('style'); s.id = 'gd-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function chiudi() {
    if (!el) return;
    el.remove(); el = null; document.removeEventListener('keydown', tasto);
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    if (prima && prima.focus) try { prima.focus(); } catch (e) {}
  }
  function tasto(e) { if (e.key === 'Escape') chiudi(); }
  // scheda: la scheda aperta nell'app ('arredi', 'impianti', 'archivio'…); apre il primo capitolo che la riguarda
  function apri(scheda) {
    var caps = CAPITOLI[APP]; if (!caps) return;
    if (el) chiudi();
    stile(); prima = document.activeElement;
    var cur = null;
    for (var i = 0; i < caps.length && !cur; i++) if (scheda && caps[i].tabs && caps[i].tabs.indexOf(scheda) >= 0) cur = caps[i];
    if (!cur) cur = caps[0];
    el = document.createElement('div'); el.className = 'gd-back';
    el.innerHTML = '<div class="gd" role="dialog" aria-modal="true" aria-labelledby="gd-t">' +
      '<div class="gd-h"><h2 id="gd-t">Come funziona</h2><button class="gd-x" aria-label="Chiudi la guida"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<div class="gd-b">' + caps.map(function (c) { return '<details data-id="' + c.id + '"' + (c === cur ? ' open' : '') + '><summary>' + c.t + '</summary><div class="gd-c">' + c.html + '</div></details>'; }).join('') + '</div>' +
      '<div class="gd-f"><button class="gd-ok">Ho capito</button></div></div>';
    el.addEventListener('click', function (e) { if (e.target === el || e.target.closest('.gd-x,.gd-ok')) chiudi(); });
    document.addEventListener('keydown', tasto);
    document.body.appendChild(el);
    var d = el.querySelector('details[open]');
    if (d && d !== el.querySelector('details')) d.scrollIntoView({ block: 'start' });
    el.querySelector('.gd-ok').focus({ preventScroll: true });
  }
  window.Guida = { apri: apri, chiudi: chiudi };

  // prima volta: si apre da sola appena la persona è dentro l'app
  var vista = false; try { vista = localStorage.getItem(KEY) === '1'; } catch (e) { vista = true; }
  var F = window.__FB3D;
  if (!vista && F && F.ready && typeof F.ready.then === 'function') F.ready.then(function () { setTimeout(function () { if (!el) apri(''); }, 600); });
})();
