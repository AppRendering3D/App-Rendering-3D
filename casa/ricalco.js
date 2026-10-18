/* Ricalco della pianta da un'immagine, tutto nel telefono (niente AI).
   Trova muri pieni o disegnati a contorno, finestre, vani porta e stanze.
   Restituisce misure in pixel dell'immagine: la scala la mette l'app. */
(function () {
  'use strict';

  function label(mask, W, H, conn8) {
    const N = W * H, lab = new Int32Array(N), st = new Int32Array(N);
    const area = [], bx0 = [], bx1 = [], by0 = [], by1 = [], edge = [];
    let n = 0;
    for (let i = 0; i < N; i++) {
      if (!mask[i] || lab[i]) continue;
      n++; let sp = 0; st[sp++] = i; lab[i] = n;
      let a = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
      while (sp) {
        const j = st[--sp], x = j % W, y = (j - x) / W; a++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const L = x > 0, R = x < W - 1, U = y > 0, D = y < H - 1;
        if (L && mask[j - 1] && !lab[j - 1]) { lab[j - 1] = n; st[sp++] = j - 1; }
        if (R && mask[j + 1] && !lab[j + 1]) { lab[j + 1] = n; st[sp++] = j + 1; }
        if (U && mask[j - W] && !lab[j - W]) { lab[j - W] = n; st[sp++] = j - W; }
        if (D && mask[j + W] && !lab[j + W]) { lab[j + W] = n; st[sp++] = j + W; }
        if (conn8) {
          if (L && U && mask[j - W - 1] && !lab[j - W - 1]) { lab[j - W - 1] = n; st[sp++] = j - W - 1; }
          if (R && U && mask[j - W + 1] && !lab[j - W + 1]) { lab[j - W + 1] = n; st[sp++] = j - W + 1; }
          if (L && D && mask[j + W - 1] && !lab[j + W - 1]) { lab[j + W - 1] = n; st[sp++] = j + W - 1; }
          if (R && D && mask[j + W + 1] && !lab[j + W + 1]) { lab[j + W + 1] = n; st[sp++] = j + W + 1; }
        }
      }
      area.push(a); bx0.push(x0); bx1.push(x1); by0.push(y0); by1.push(y1); edge.push(x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1);
    }
    return { lab, n, area, x0: bx0, x1: bx1, y0: by0, y1: by1, edge };
  }

  // erosione / dilatazione con un quadrato di lato 2r+1 (immagine integrale)
  function boxCount(m, W, H, r) {
    const S = new Int32Array((W + 1) * (H + 1)), W1 = W + 1;
    for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += m[y * W + x]; S[(y + 1) * W1 + x + 1] = S[y * W1 + x + 1] + row; } }
    const out = new Int32Array(W * H), full = new Int32Array(W * H);
    for (let y = 0; y < H; y++) {
      const ya = Math.max(0, y - r), yb = Math.min(H, y + r + 1);
      for (let x = 0; x < W; x++) {
        const xa = Math.max(0, x - r), xb = Math.min(W, x + r + 1);
        out[y * W + x] = S[yb * W1 + xb] - S[ya * W1 + xb] - S[yb * W1 + xa] + S[ya * W1 + xa];
        full[y * W + x] = (yb - ya) * (xb - xa);
      }
    }
    return { out, full };
  }
  function erode(m, W, H, r) { const { out, full } = boxCount(m, W, H, r), o = new Uint8Array(W * H); for (let i = 0; i < o.length; i++) o[i] = out[i] === full[i] ? 1 : 0; return o; }
  function dilate(m, W, H, r) { const { out } = boxCount(m, W, H, r), o = new Uint8Array(W * H); for (let i = 0; i < o.length; i++) o[i] = out[i] > 0 ? 1 : 0; return o; }

  // distanza (chamfer 3-4, in pixel) dal tratto più vicino
  function distance(free, W, H) {
    const D = new Float32Array(W * H), BIG = 1e9;
    for (let i = 0; i < D.length; i++) D[i] = free[i] ? BIG : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!D[i]) continue; let v = D[i];
      if (x > 0) v = Math.min(v, D[i - 1] + 3);
      if (y > 0) { v = Math.min(v, D[i - W] + 3); if (x > 0) v = Math.min(v, D[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, D[i - W + 1] + 4); }
      D[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; if (!D[i]) continue; let v = D[i];
      if (x < W - 1) v = Math.min(v, D[i + 1] + 3);
      if (y < H - 1) { v = Math.min(v, D[i + W] + 3); if (x < W - 1) v = Math.min(v, D[i + W + 1] + 4); if (x > 0) v = Math.min(v, D[i + W - 1] + 4); }
      D[i] = v;
    }
    for (let i = 0; i < D.length; i++) D[i] /= 3;
    return D;
  }

  function runs(m, W, H) {
    const hr = new Uint16Array(W * H), vr = new Uint16Array(W * H);
    for (let y = 0; y < H; y++) { let x = 0; while (x < W) { if (!m[y * W + x]) { x++; continue; } let e = x; while (e < W && m[y * W + e]) e++; for (let k = x; k < e; k++) hr[y * W + k] = e - x; x = e; } }
    for (let x = 0; x < W; x++) { let y = 0; while (y < H) { if (!m[y * W + x]) { y++; continue; } let e = y; while (e < H && m[e * W + x]) e++; for (let k = y; k < e; k++) vr[k * W + x] = e - y; y = e; } }
    return { hr, vr };
  }
  const median = a => { if (!a.length) return 0; const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };

  // contorno di una regione (quadratini di lato c) › poligono semplificato
  function regionPoly(lab, id, W, H, b, c) {
    const gx0 = Math.floor(b.x0 / c) - 1, gy0 = Math.floor(b.y0 / c) - 1, gw = Math.ceil((b.x1 + 1) / c) - gx0 + 1, gh = Math.ceil((b.y1 + 1) / c) - gy0 + 1;
    const g = new Uint8Array(gw * gh);
    for (let gy = 1; gy < gh - 1; gy++) for (let gx = 1; gx < gw - 1; gx++) {
      let k = 0, t = 0;
      for (let y = (gy + gy0) * c; y < (gy + gy0 + 1) * c && y < H; y++) for (let x = (gx + gx0) * c; x < (gx + gx0 + 1) * c && x < W; x++) { t++; if (lab[y * W + x] === id) k++; }
      g[gy * gw + gx] = t && k * 2 >= t ? 1 : 0;
    }
    // tieni solo il pezzo più grande
    const L = label(g, gw, gh, false); if (!L.n) return null;
    let best = 0; for (let i = 1; i < L.n; i++) if (L.area[i] > L.area[best]) best = i;
    for (let i = 0; i < g.length; i++) g[i] = L.lab[i] === best + 1 ? 1 : 0;
    // segui il bordo (lati dei quadratini, la regione resta a destra)
    const on = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh && g[y * gw + x] === 1;
    let sx = -1, sy = -1;
    for (let i = 0; i < g.length && sx < 0; i++) if (g[i]) { sx = i % gw; sy = (i - sx) / gw; }
    const pts = []; let x = sx, y = sy, dir = 0; // 0 destra, 1 giù, 2 sinistra, 3 su (vertici della griglia)
    const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
    for (let guard = 0; guard < 4 * g.length + 8; guard++) {
      pts.push([x, y]);
      // celle davanti a sinistra / destra rispetto alla direzione
      for (const nd of [(dir + 3) % 4, dir, (dir + 1) % 4, (dir + 2) % 4]) {
        const cx = x + (nd === 0 ? 0 : nd === 1 ? -1 : nd === 2 ? -1 : 0), cy = y + (nd === 0 ? 0 : nd === 1 ? 0 : nd === 2 ? -1 : -1);
        const lx = x + (nd === 0 ? 0 : nd === 1 ? 0 : nd === 2 ? -1 : -1), ly = y + (nd === 0 ? -1 : nd === 1 ? 0 : nd === 2 ? 0 : -1);
        // passo valido se a destra del lato c'è regione e a sinistra no
        const right = on(cx, cy), left = on(lx, ly);
        if (right && !left) { dir = nd; break; }
      }
      x += DX[dir]; y += DY[dir];
      if (x === sx && y === sy) break;
    }
    const P = pts.map(([px, py]) => [(px + gx0) * c, (py + gy0) * c]);
    return P;
  }
  function simplify(pts, tol) {
    if (pts.length < 4) return pts;
    // Douglas-Peucker su anello: parti dai due punti più lontani
    let a = 0, b = 0, dm = -1;
    for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > dm) { dm = d; b = i; } }
    const keep = new Uint8Array(pts.length); keep[a] = keep[b] = 1;
    const rec = (i, j) => { // da i a j in avanti sull'anello
      const n = pts.length, len = (j - i + n) % n; if (len < 2) return;
      const [x1, y1] = pts[i], [x2, y2] = pts[j], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      let best = -1, bd = -1;
      for (let k = 1; k < len; k++) { const q = pts[(i + k) % n], d = Math.abs((q[0] - x1) * dy - (q[1] - y1) * dx) / L; if (d > bd) { bd = d; best = (i + k) % n; } }
      if (bd > tol) { keep[best] = 1; rec(i, best); rec(best, j); }
    };
    rec(a, b); rec(b, a);
    return pts.filter((_, i) => keep[i]);
  }
  // lati quasi dritti › dritti
  function squareUp(P) {
    const n = P.length, out = P.map(p => p.slice());
    for (let i = 0; i < n; i++) {
      const a = out[i], b = out[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI) % 180;
      if (ang < 8 || ang > 172) { const m = (a[1] + b[1]) / 2; a[1] = b[1] = m; }
      else if (Math.abs(ang - 90) < 8) { const m = (a[0] + b[0]) / 2; a[0] = b[0] = m; }
    }
    // togli punti doppi o allineati
    const res = [];
    for (let i = 0; i < n; i++) {
      const p = out[(i + n - 1) % n], q = out[i], r = out[(i + 1) % n];
      const cr = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < .5) continue;
      if (Math.abs(cr) < 1e-6 * (1 + Math.abs(q[0]) + Math.abs(q[1]))) continue;
      res.push(q);
    }
    return res.length >= 3 ? res : out;
  }

  function ricalca(img, opt) {
    opt = opt || {};
    const W = img.width, H = img.height, N = W * H, d = img.data;
    const lum = new Uint8Array(N), col = new Uint8Array(N), ink = new Uint8Array(N);
    for (let i = 0, k = 0; i < N; i++, k += 4) {
      const r = d[k], g = d[k + 1], b = d[k + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      lum[i] = (r * 77 + g * 151 + b * 28) >> 8;
      if (mx - mn > 70 && mx > 140) col[i] = r > 170 && g > 150 && b < g * .6 ? 1 : r > 170 && g < r * .75 && b < r * .75 ? 2 : b > r + 50 && b >= g ? 4 : 3;
    }
    // soglia che segue la luce: nelle foto la carta non è bianca e ci sono ombre
    const mean = boxCount(lum, W, H, 15);
    for (let i = 0; i < N; i++) { const m = mean.out[i] / mean.full[i]; ink[i] = lum[i] < 110 || (lum[i] < Math.min(200, m - 28)) || col[i] ? 1 : 0; }
    // via le grandi zone scure (bordi neri dello screenshot, ombre)
    let L = label(ink, W, H, true);
    for (let c = 0; c < L.n; c++) {
      const ba = (L.x1[c] - L.x0[c] + 1) * (L.y1[c] - L.y0[c] + 1);
      if (L.area[c] > N * .04 && L.area[c] > ba * .6) for (let i = 0; i < N; i++) if (L.lab[i] === c + 1) ink[i] = 0;
    }
    // riquadro del contenuto
    let cx0 = W, cx1 = 0, cy0 = H, cy1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink[y * W + x]) { if (x < cx0) cx0 = x; if (x > cx1) cx1 = x; if (y < cy0) cy0 = y; if (y > cy1) cy1 = y; }
    if (cx1 <= cx0) return { muri: [], aperture: [], stanze: [], w: W, h: H };
    const Dm = Math.max(cx1 - cx0, cy1 - cy0);

    // 1) muri pieni (neri o colorati): tratti spessi almeno 5 px
    const filled = dilate(erode(ink, W, H, 2), W, H, 2);
    for (let i = 0; i < N; i++) filled[i] &= ink[i];

    // 2) muri a contorno: corridoi bianchi stretti fra due linee parallele
    const free = new Uint8Array(N); for (let i = 0; i < N; i++) free[i] = ink[i] ? 0 : 1;
    const FR = runs(free, W, H), BIGR = 65535;
    // un corridoio che arriva al bordo dell'immagine non è chiuso
    for (let y = 0; y < H; y++) { let x = 0; while (x < W && free[y * W + x]) { FR.hr[y * W + x] = BIGR; x++; } x = W - 1; while (x >= 0 && free[y * W + x]) { FR.hr[y * W + x] = BIGR; x--; } }
    for (let x = 0; x < W; x++) { let y = 0; while (y < H && free[y * W + x]) { FR.vr[y * W + x] = BIGR; y++; } y = H - 1; while (y >= 0 && free[y * W + x]) { FR.vr[y * W + x] = BIGR; y--; } }
    const Tthin = Math.max(4, Math.min(60, Dm * .022));
    const pieces = Wc => {
      const chH = new Uint8Array(N), chV = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        if (!free[i]) continue; const h = FR.hr[i], v = FR.vr[i], mn = Math.min(h, v), mx = Math.max(h, v);
        if (mn > Wc || mx < mn * 1.3) continue;
        if (v <= h) chH[i] = 1; else chV[i] = 1;
      }
      const PL = new Int32Array(N), pc = [];
      for (const [m, o] of [[chH, 'h'], [chV, 'v']]) {
        const C = label(m, W, H, false), acc = Array.from({ length: C.n }, () => ({ n: 0, s: 0 })), map = new Int32Array(C.n + 1);
        for (let i = 0; i < N; i++) { const c = C.lab[i]; if (!c) continue; const x = i % W, y = (i - x) / W; acc[c - 1].n++; acc[c - 1].s += o === 'h' ? y : x; }
        for (let c = 0; c < C.n; c++) {
          const a0 = o === 'h' ? C.x0[c] : C.y0[c], a1 = o === 'h' ? C.x1[c] : C.y1[c], long = a1 - a0 + 1, t = acc[c].n / long;
          if (long < Math.max(6, .9 * t) || acc[c].n < 15) continue;
          map[c + 1] = pc.length + 1; pc.push({ o, t, cc: acc[c].s / acc[c].n, a0, a1, n: acc[c].n });
        }
        for (let i = 0; i < N; i++) { const c = C.lab[i]; if (c && map[c]) PL[i] = map[c]; }
      }
      // scale (gradini affiancati) e vetri (linee più chiare)
      for (let k = 0; k < pc.length; k++) {
        const P = pc[k], hz = P.o === 'h', cc = Math.round(P.cc);
        let same = [0, 0], tot = 0, dark = 0, nd = 0, cross = 0;
        for (let a = P.a0 + 2; a <= P.a1 - 2; a += 2) {
          tot++;
          for (let s = 0; s < 2; s++) {
            const sg = s ? 1 : -1; let p = cc, st = 0, mn = 255, other = 0, inkn = 0, prev = 0, far = 0;
            const lim = Math.round(P.t * 2.4 + 8);
            for (let q = 0; q < lim + P.t; q++) {
              const x = hz ? a : p, y = hz ? p : a; if (x < 0 || y < 0 || x >= W || y >= H) break;
              const i = y * W + x;
              if (st === 0) { if (PL[i] !== k + 1) st = free[i] ? 3 : 1; }
              if (st === 1) { if (ink[i]) { inkn++; if (lum[i] < mn) mn = lum[i]; if (inkn > 8) st = 3; } else { other = PL[i]; st = 2; far = 1; } }
              else if (st === 2) { if (q > lim) break; if (ink[i] && !prev) far++; }
              if (st === 3) break;
              prev = ink[i]; p += sg;
            }
            cross += far;
            if (mn < 255) { dark += mn; nd++; }
            if (other) { const o = pc[other - 1]; if (o.o === P.o && Math.max(o.t, P.t) < 1.7 * Math.min(o.t, P.t)) same[s]++; }
          }
        }
        P.ladder = tot > 0 && (Math.max(same[0], same[1]) > tot * .5 || cross >= tot * 3.2);
        P.bd = nd ? dark / nd : 0;
      }
      return { PL, pc };
    };
    // prima passata larga, poi la larghezza vera dei muri (così un ripostiglio stretto non diventa muro)
    let Wc = Tthin * 2, PS = pieces(Wc);
    { const ts = []; for (const P of PS.pc) if (!P.ladder) for (let k = 0; k < (P.a1 - P.a0) / 4; k++) ts.push(P.t); ts.sort((p, q) => p - q);
      const t90 = ts.length ? ts[Math.floor(ts.length * .9)] : 0; if (t90 && t90 * 1.35 < Wc) { Wc = Math.max(6, t90 * 1.35); PS = pieces(Wc); } }
    const { PL, pc } = PS;
    const darks = [];
    for (const P of pc) if (!P.ladder) for (let k = 0; k < Math.min(50, P.n / 20); k++) darks.push(P.bd);
    const refDark = median(darks);
    for (const P of pc) P.glass = !P.ladder && P.bd > refDark + 28;

    // maschera dei muri: pieni + corridoi con le loro linee
    const thinI = new Uint8Array(N), glassI = new Uint8Array(N);
    for (let i = 0; i < N; i++) { const k = PL[i]; if (k && !pc[k - 1].ladder) (pc[k - 1].glass ? glassI : thinI)[i] = 1; }
    { // pilastri disegnati vuoti: celle bianche piccole e quasi quadrate
      const F = label(free, W, H, false);
      for (let c = 0; c < F.n; c++) {
        const w = F.x1[c] - F.x0[c] + 1, h = F.y1[c] - F.y0[c] + 1;
        F.pil = F.pil || new Uint8Array(F.n);
        if (!F.edge[c] && Math.max(w, h) <= Wc * .85 && Math.max(w, h) < 1.4 * Math.min(w, h) && F.area[c] > w * h * .6) F.pil[c] = 1;
      }
      if (F.pil) for (let i = 0; i < N; i++) { const c = F.lab[i]; if (c && F.pil[c - 1] && !glassI[i]) thinI[i] = 1; }
    }
    const dT = dilate(thinI, W, H, 3), dG = dilate(glassI, W, H, 3);
    const M = new Uint8Array(N), glassM = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const w = thinI[i] || (dT[i] && ink[i]), g = glassI[i] || (dG[i] && ink[i] && !w && !filled[i]);
      M[i] = filled[i] || w || g ? 1 : 0; glassM[i] = g || (filled[i] && col[i] === 4) ? 1 : 0; // azzurro pieno = vetro
    }
    const ladderP = pc.filter(P => P.ladder);

    // via scritte e pezzetti lontani dall'edificio
    L = label(M, W, H, true);
    const tw = []; { const R = runs(M, W, H); for (let i = 0; i < N; i += 7) if (M[i]) tw.push(Math.min(R.hr[i], R.vr[i])); }
    const Tw = Math.max(3, median(tw));
    const bb = { x0: W, x1: 0, y0: H, y1: 0 }, longC = c => Math.max(L.x1[c] - L.x0[c], L.y1[c] - L.y0[c]) + 1;
    const frame = c => { const w = L.x1[c] - L.x0[c], h = L.y1[c] - L.y0[c]; return (w >= (cx1 - cx0) * .85 && h < Tw * 3) || (h >= (cy1 - cy0) * .85 && w < Tw * 3); }; // righe del cartiglio e bordi del foglio
    for (let c = 0; c < L.n; c++) if (longC(c) >= Tw * 4 && !frame(c)) { bb.x0 = Math.min(bb.x0, L.x0[c]); bb.x1 = Math.max(bb.x1, L.x1[c]); bb.y0 = Math.min(bb.y0, L.y0[c]); bb.y1 = Math.max(bb.y1, L.y1[c]); }
    for (let c = 0; c < L.n; c++) {
      const w = L.x1[c] - L.x0[c] + 1, h = L.y1[c] - L.y0[c] + 1, long = Math.max(w, h), short = Math.min(w, h);
      if (long >= Tw * 4 && !frame(c)) continue;
      const m = Tw * .5, inside = L.x0[c] >= bb.x0 - m && L.x1[c] <= bb.x1 + m && L.y0[c] >= bb.y0 - m && L.y1[c] <= bb.y1 + m;
      if (frame(c) || !inside || long < Tw * 1.6 || (long < Tw * 3 && long < short * 3)) for (let i = 0; i < N; i++) if (L.lab[i] === c + 1) { M[i] = 0; glassM[i] = 0; }
    }


    // 3) segmenti: orizzontali, verticali, storti
    const R = runs(M, W, H), cls = new Uint8Array(N); // 1 h, 2 v, 3 storto
    for (let i = 0; i < N; i++) if (M[i]) { const h = R.hr[i], v = R.vr[i]; cls[i] = Math.max(h, v) < Tw * 2.6 && Math.max(h, v) < 1.9 * Math.min(h, v) && Math.min(h, v) > Tw * .5 ? 3 : h >= v ? 1 : 2; }
    const segs = [];
    for (const k of [1, 2, 3]) {
     for (const gl of [0, 1]) {
      const m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = cls[i] === k && glassM[i] === gl ? 1 : 0;
      const C = label(m, W, H, k === 3);
      const acc = Array.from({ length: C.n }, () => ({ n: 0, sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0, y: 0, r: 0, g: 0, ink: 0 }));
      for (let i = 0; i < N; i++) {
        const c = C.lab[i]; if (!c) continue; const A = acc[c - 1], x = i % W, y = (i - x) / W;
        A.n++; A.sx += x; A.sy += y; A.sxx += x * x; A.syy += y * y; A.sxy += x * y;
        if (glassM[i]) A.g++; if (ink[i]) { A.ink++; if (col[i] === 1) A.y++; else if (col[i] === 2) A.r++; }
      }
      for (let c = 0; c < C.n; c++) {
        const A = acc[c]; if (A.n < 12) continue;
        const mx = A.sx / A.n, my = A.sy / A.n;
        let ax, ay, len, t;
        if (k === 1) { len = C.x1[c] - C.x0[c] + 1; t = A.n / len; ax = 1; ay = 0; }
        else if (k === 2) { len = C.y1[c] - C.y0[c] + 1; t = A.n / len; ax = 0; ay = 1; }
        else {
          const cxx = A.sxx / A.n - mx * mx, cyy = A.syy / A.n - my * my, cxy = A.sxy / A.n - mx * my;
          const th = .5 * Math.atan2(2 * cxy, cxx - cyy); ax = Math.cos(th); ay = Math.sin(th);
          const l1 = (cxx + cyy) / 2 + Math.sqrt(((cxx - cyy) / 2) ** 2 + cxy * cxy); len = Math.sqrt(12 * l1); t = A.n / Math.max(1, len);
        }
        if (len < Math.max(4, t * (k === 3 ? 1.6 : .6))) continue;
        if (t > Tw * 1.8 && len < t * 2.2) continue; // blocchi pieni (legenda, campiture)
        let cx = mx, cy = my;
        if (k === 1) cx = (C.x0[c] + C.x1[c] + 1) / 2; else if (k === 2) cy = (C.y0[c] + C.y1[c] + 1) / 2;
        const tipo = gl ? 'vetro' : 'muro';
        const stato = A.ink && A.y > A.ink * .3 ? 'dem' : A.ink && A.r > A.ink * .3 ? 'cos' : '';
        segs.push({ tipo, stato, a: [cx - ax * len / 2, cy - ay * len / 2], b: [cx + ax * len / 2, cy + ay * len / 2], t, o: k === 1 ? 'h' : k === 2 ? 'v' : 'o' });
      }
     }
    }
    // i vetri dentro un muro: il muro passa sopra, il vetro diventa finestra
    const muri = segs.filter(s => s.tipo === 'muro'), vetri = segs.filter(s => s.tipo === 'vetro');
    // unisci pezzi di muro allineati e attaccati (stesso stato e spessore simile)
    const merged = [];
    for (const o of ['h', 'v']) {
      const list = muri.filter(s => s.o === o).map(s => ({ ...s, c: o === 'h' ? s.a[1] : s.a[0], a0: o === 'h' ? s.a[0] : s.a[1], a1: o === 'h' ? s.b[0] : s.b[1] }));
      list.sort((p, q) => p.c - q.c || p.a0 - q.a0);
      const used = new Uint8Array(list.length);
      for (let i = 0; i < list.length; i++) {
        if (used[i]) continue; const s = list[i]; used[i] = 1;
        let grow = true;
        while (grow) {
          grow = false;
          for (let j = 0; j < list.length; j++) {
            if (used[j]) continue; const q = list[j];
            if (q.stato !== s.stato || Math.abs(q.c - s.c) > Math.max(2, Math.min(q.t, s.t) * .25) || Math.max(q.t, s.t) > 1.35 * Math.min(q.t, s.t)) continue;
            if (q.a0 > s.a1 + 2 || q.a1 < s.a0 - 2) continue;
            const L0 = s.a1 - s.a0, L1 = q.a1 - q.a0; s.c = (s.c * L0 + q.c * L1) / (L0 + L1); s.t = (s.t * L0 + q.t * L1) / (L0 + L1);
            s.a0 = Math.min(s.a0, q.a0); s.a1 = Math.max(s.a1, q.a1); used[j] = 1; grow = true;
          }
        }
        merged.push(o === 'h' ? { tipo: 'muro', stato: s.stato, o, t: s.t, a: [s.a0, s.c], b: [s.a1, s.c] } : { tipo: 'muro', stato: s.stato, o, t: s.t, a: [s.c, s.a0], b: [s.c, s.a1] });
      }
    }
    for (const s of muri) if (s.o === 'o') merged.push(s);

    // finestre: un vetro fra due pezzi di muro allineati diventa muro con un'apertura;
    // un vetro sottile staccato dai muri è un parapetto (balcone), il resto si ignora (scale, ascensore)
    const aperture = [];
    const walls0 = merged.slice();
    const inLine = (v, end) => walls0.some(w => {
      if (w.o !== v.o || w.o === 'o') return false;
      const hz = v.o === 'h', c = hz ? v.a[1] : v.a[0], wc = hz ? w.a[1] : w.a[0];
      if (Math.abs(c - wc) > Math.max(v.t, w.t) * .6 + 2) return false;
      const e = hz ? end[0] : end[1], w0 = hz ? w.a[0] : w.a[1], w1 = hz ? w.b[0] : w.b[1], tol = Math.max(v.t, w.t) * 1.2 + 4;
      return e >= w0 - tol && e <= w1 + tol;
    });
    for (const v of vetri) {
      const L0 = Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]);
      if (L0 < Tw * 1.2 || v.o === 'o') continue;
      if (v.t >= Tw * .4 && (inLine(v, v.a) || inLine(v, v.b))) {
        merged.push({ tipo: 'muro', stato: '', o: v.o, t: v.t, a: v.a, b: v.b, vetro: true });
        aperture.push({ tipo: 'finestra', x: (v.a[0] + v.b[0]) / 2, y: (v.a[1] + v.b[1]) / 2, w: L0, t: v.t, o: v.o, rot: v.o === 'h' ? 0 : 90 });
      } else if (v.t < Tw * .5) merged.push({ tipo: 'muro', stato: '', o: v.o, t: v.t, a: v.a, b: v.b, parapetto: true });
    }

    // angoli: ogni muro arriva fino alla faccia esterna del muro di traverso
    const HS = merged.filter(m => m.o === 'h'), VS = merged.filter(m => m.o === 'v');
    const stretch = (list, cross, hz) => {
      for (const s of list) {
        const c = hz ? s.a[1] : s.a[0];
        for (const end of [0, 1]) {
          const p = end ? s.b : s.a, e = hz ? p[0] : p[1], dir = end ? 1 : -1;
          let best = null;
          for (const q of cross) {
            const qc = hz ? q.a[0] : q.a[1], q0 = Math.min(hz ? q.a[1] : q.a[0], hz ? q.b[1] : q.b[0]), q1 = Math.max(hz ? q.a[1] : q.a[0], hz ? q.b[1] : q.b[0]);
            if (c < q0 - s.t || c > q1 + s.t) continue;
            const dx = (qc - e) * dir, reach = q.t / 2 + Math.max(s.t, q.t) * 1.2 + 4;
            if (dx < -q.t / 2 - 2 || dx > reach) continue;
            const ne = qc + dir * q.t / 2;
            if ((ne - e) * dir > 0 && (!best || Math.abs(ne - e) < Math.abs(best - e))) best = ne;
          }
          if (best != null) { if (hz) p[0] = best; else p[1] = best; }
        }
      }
    };
    stretch(HS, VS, true); stretch(VS, HS, false);

    // 4) vani porta: due muri allineati, uno di fronte all'altro, con un buco libero in mezzo
    const ends = [];
    merged.forEach((s, i) => { if (s.o === 'o') return; ends.push({ i, p: s.a, side: -1, s }, { i, p: s.b, side: 1, s }); });
    const occ = (x0, y0, x1, y1) => { let k = 0, t = 0; for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, x1); x++) { t++; if (M[y * W + x]) k++; } return t ? k / t : 1; };
    const gaps = [], usedE = new Set();
    const cand = [];
    for (const e of ends) for (const f of ends) {
      if (e.side !== 1 || f.side !== -1 || e.s.o !== f.s.o || e.i === f.i) continue;
      const hz = e.s.o === 'h', ga = hz ? f.p[0] - e.p[0] : f.p[1] - e.p[1], dc = hz ? f.p[1] - e.p[1] : f.p[0] - e.p[0];
      const t = Math.min(e.s.t, f.s.t);
      if (t < Math.max(5, Tw * .18) || ga < Tw * 1.5 || ga > Dm * .3 || Math.abs(dc) > Math.max(e.s.t, f.s.t) * .6) continue;
      const c = hz ? (e.p[1] + f.p[1]) / 2 : (e.p[0] + f.p[0]) / 2, h2 = t / 2;
      const o = hz ? occ(e.p[0] + 1, c - h2, f.p[0] - 1, c + h2) : occ(c - h2, e.p[1] + 1, c + h2, f.p[1] - 1);
      if (o > .2) continue;
      cand.push({ e, f, ga, c, t: (e.s.t + f.s.t) / 2, hz });
    }
    cand.sort((p, q) => p.ga - q.ga);
    for (const g of cand) {
      const ke = g.e.i + ':1', kf = g.f.i + ':-1'; if (usedE.has(ke) || usedE.has(kf)) continue;
      usedE.add(ke); usedE.add(kf); gaps.push(g);
    }
    // la scala: le porte interne di solito sono da 80
    const gw = gaps.map(g => g.ga);
    const thick = merged.filter(s => !s.stato && !s.vetro).map(s => s.t).sort((p, q) => p - q), extT = thick.length ? thick[Math.floor(thick.length * .85)] : 0;
    const near = dilate(M, W, H, Math.max(2, Math.round(Tw * .8)));
    const barrier = extra => { // zone libere chiuse da muri, vani e linee vicine ai muri
      const B = new Uint8Array(N);
      for (let i = 0; i < N; i++) B[i] = M[i] || (near[i] && ink[i]) ? 1 : 0;
      for (const s of merged.concat(extra)) {
        const h2 = Math.max(1.5, s.t / 2), dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], L = Math.hypot(dx, dy) || 1;
        for (let k = 0; k <= L; k += .7) for (let q = -h2; q <= h2; q += .7) {
          const x = Math.round(s.a[0] + dx * k / L - dy / L * q), y = Math.round(s.a[1] + dy * k / L + dx / L * q);
          if (x >= 0 && y >= 0 && x < W && y < H) B[y * W + x] = 1;
        }
      }
      const r = Math.max(2, Math.round(Tw / 3)), Bc = erode(dilate(B, W, H, r), W, H, r);
      for (let i = 0; i < N; i++) B[i] = B[i] || Bc[i] ? 0 : 1;
      return label(B, W, H, false);
    };
    const gapSeg = g => ({ t: g.t, a: g.hz ? [g.e.p[0], g.c] : [g.c, g.e.p[1]], b: g.hz ? [g.f.p[0], g.c] : [g.c, g.f.p[1]] });
    let cmPx = 0, scalaDa = '';
    const doorish = gw.filter(x => x > extT * 1.6 && x < extT * 5);
    if (doorish.length >= 2) { cmPx = 85 / median(doorish); scalaDa = 'porte'; }
    else { // senza porte: le stanze più grandi di una casa stanno sui 14 m²
      const R0 = barrier(gaps.map(gapSeg)), areas = [];
      for (let c = 0; c < R0.n; c++) if (!R0.edge[c] && R0.area[c] >= (Tw * 5) ** 2 && !(R0.x0[c] <= cx0 && R0.x1[c] >= cx1)) areas.push(R0.area[c]);
      areas.sort((p, q) => q - p);
      if (areas.length >= 2) { cmPx = Math.sqrt(14e4 / median(areas.slice(0, Math.max(2, Math.ceil(areas.length / 2))))); scalaDa = 'stanze'; }
      else if (extT) { cmPx = 30 / extT; scalaDa = 'muri'; }
      else { cmPx = 1000 / Dm; scalaDa = 'stima'; }
    }
    const wide = 160 / cmPx; // oltre 1,6 m è un passaggio aperto, non una porta
    for (const g of gaps) {
      const a = g.hz ? [g.e.p[0], g.c] : [g.c, g.e.p[1]], b = g.hz ? [g.f.p[0], g.c] : [g.c, g.f.p[1]];
      g.porta = g.ga <= wide;
      if (!g.porta && g.ga * cmPx <= 320) merged.push({ tipo: 'sep', stato: '', o: g.hz ? 'h' : 'v', t: g.t, a, b });
      if (g.porta) {
        merged.push({ tipo: 'muro', stato: g.e.s.stato === g.f.s.stato ? g.e.s.stato : '', o: g.hz ? 'h' : 'v', t: g.t, a, b, vano: true });
        aperture.push({ tipo: 'porta', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w: g.ga, t: g.t, o: g.hz ? 'h' : 'v', rot: g.hz ? 0 : 90 });
      }
    }

    // 5) stanze: zone chiuse dai muri (e dai vani porta)
    const Rg = barrier([]), minA = 1.2e4 / (cmPx * cmPx), cell = Math.max(2, Math.round(Tw / 3));
    const isRoom = c => c > 0 && !Rg.edge[c - 1] && Rg.area[c - 1] >= minA;
    const side = (x, y, nx, ny, d) => { const X = Math.round(x + nx * d), Y = Math.round(y + ny * d); return X >= 0 && Y >= 0 && X < W && Y < H ? Rg.lab[Y * W + X] : 0; };
    // balconi: le stanze toccate da un parapetto
    const balc = new Set();
    for (const s of merged) {
      if (!s.parapetto) continue;
      const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], L = Math.hypot(dx, dy) || 1; if (L < Tw * 4) continue;
      const mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
      const c1 = side(mx, my, -dy / L, dx / L, s.t / 2 + Tw * .6), c2 = side(mx, my, dy / L, -dx / L, s.t / 2 + Tw * .6);
      if (isRoom(c1) !== isRoom(c2)) balc.add(isRoom(c1) ? c1 : c2); // parapetto con il fuori da una parte
    }
    // vetro con una stanza da entrambe le parti (di solito verso il balcone) = portafinestra
    for (const a of aperture) {
      if (a.tipo !== 'finestra') continue;
      const nx = a.o === 'h' ? 0 : 1, ny = a.o === 'h' ? 1 : 0, d = a.t / 2 + Tw * .6;
      if (isRoom(side(a.x, a.y, nx, ny, d)) && isRoom(side(a.x, a.y, -nx, -ny, d))) a.tipo = 'portafinestra';
    }
    // varco largo verso un balcone = portafinestra grande
    for (const g of merged.slice()) {
      if (g.tipo !== 'sep') continue;
      const hz = g.o === 'h', mx = (g.a[0] + g.b[0]) / 2, my = (g.a[1] + g.b[1]) / 2, nx = hz ? 0 : 1, ny = hz ? 1 : 0, d = g.t / 2 + Tw * .6;
      const c1 = side(mx, my, nx, ny, d), c2 = side(mx, my, -nx, -ny, d);
      if (isRoom(c1) && isRoom(c2) && (balc.has(c1) || balc.has(c2))) {
        g.tipo = 'muro'; g.vano = true;
        aperture.push({ tipo: 'portafinestra', x: mx, y: my, w: Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]), t: g.t, o: g.o, rot: hz ? 0 : 90 });
      }
    }
    const stanze = [];
    for (let c = 0; c < Rg.n; c++) {
      if (!isRoom(c + 1)) continue;
      const b = { x0: Rg.x0[c], x1: Rg.x1[c], y0: Rg.y0[c], y1: Rg.y1[c] };
      if (b.x0 <= cx0 && b.x1 >= cx1) continue; // fuori dal disegno
      let P = regionPoly(Rg.lab, c + 1, W, H, b, cell); if (!P || P.length < 4) continue;
      let tol = Math.max(2, Tw * .6); let Q = squareUp(simplify(P, tol));
      while (Q.length > 40 && tol < Dm) { tol *= 1.5; Q = squareUp(simplify(P, tol)); }
      const steps = ladderP.filter(P => P.a1 - P.a0 >= Tw * 1.5 && Rg.lab[(P.o === 'h' ? Math.round(P.cc) * W + ((P.a0 + P.a1) >> 1) : ((P.a0 + P.a1) >> 1) * W + Math.round(P.cc))] === c + 1);
      const scale = steps.length >= 3 && steps.reduce((a, P) => a + P.n, 0) > Rg.area[c] * .04;
      stanze.push({ pts: Q, area: Rg.area[c], scale, balcone: !scale && balc.has(c + 1) });
    }
    return { muri: merged, aperture, stanze, cmPx, scalaDa, Tw, w: W, h: H, box: { x0: cx0, y0: cy0, x1: cx1, y1: cy1 }, debug: opt.debug ? { M, glassM, PL, pc, Wc } : null };
  }

  // inclinazione della pianta (foto storta): direzione dominante dei bordi, fra -20° e 20°
  function angolo(img) {
    const W = img.width, H = img.height, d = img.data, st = Math.max(1, Math.round(Math.max(W, H) / 700));
    const w = Math.floor(W / st), h = Math.floor(H / st), g = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = ((y * st) * W + x * st) * 4; g[y * w + x] = d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11; }
    const bins = new Float64Array(180);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, gx = g[i + 1] - g[i - 1], gy = g[i + w] - g[i - w], m = gx * gx + gy * gy; if (m < 900) continue;
      let a = Math.atan2(gy, gx) * 180 / Math.PI; a = ((a % 90) + 90) % 90; // 0..90
      const b = Math.round(a * 2) % 180; bins[b] += Math.sqrt(m);
    }
    let best = 0; for (let b = 1; b < 180; b++) if (bins[b] > bins[best]) best = b;
    let a = best / 2; if (a > 45) a -= 90;
    return Math.abs(a) <= 20 ? a : 0;
  }

  if (typeof window !== 'undefined') { window.ricalcaPianta = ricalca; window.angoloPianta = angolo; }
  else self.onmessage = e => { // anche in un worker, così il telefono non si blocca
    try { const r = ricalca(e.data); r.debug = null; self.postMessage({ ok: true, r }); }
    catch (err) { self.postMessage({ ok: false, msg: String(err && err.message || err) }); }
  };
})();
