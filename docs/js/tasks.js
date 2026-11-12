/* Magic Mirror – 10 užduočių ir judesių atpažinimas.
   P: 33 taškų masyvas {x, y, v}; x jau padaugintas iš kadro proporcijos, todėl atstumai tolygūs.
   F: veido išraiškos {j, bl, br, s, tg, puff, puck} arba null. */
(function (g) {
  'use strict';
  var MM = g.MM = g.MM || {};

  function pt(P, i, minV) { var p = P[i]; return p && p.v >= (minV == null ? 0.5 : minV) ? p : null; }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function body(P) {
    var ls = pt(P, 11), rs = pt(P, 12);
    if (!ls || !rs) return null;
    var sm = mid(ls, rs), sw = Math.max(0.02, dist(ls, rs));
    var lh = pt(P, 23, 0.4), rh = pt(P, 24, 0.4);
    var hm = lh && rh ? mid(lh, rh) : null;
    var torso = hm ? dist(sm, hm) : sw * 1.6;
    return { ls: ls, rs: rs, sm: sm, sw: sw, lh: lh, rh: rh, hm: hm, torso: Math.max(torso, sw * 0.8), nose: pt(P, 0, 0.4) };
  }
  MM.body = body;

  // Vertikalaus judesio sekimas su lėtai prisitaikančia baze (šuoliai, pritūpimai)
  function VTrack() { this.base = null; }
  VTrack.prototype.update = function (y, scale) {
    if (this.base === null) { this.base = y; return 0; }
    var d = (y - this.base) / scale; // + žemyn, – aukštyn
    var a = Math.abs(d) < 0.08 ? 0.05 : 0.002;
    this.base += (y - this.base) * a;
    return d;
  };

  function Counter() { this.n = 0; this.armed = true; }
  Counter.prototype.feed = function (on, off) {
    if (this.armed && on) { this.n++; this.armed = false; return true; }
    if (!this.armed && off) this.armed = true;
    return false;
  };

  function Hold(sec) { this.acc = 0; this.sec = sec; }
  Hold.prototype.feed = function (ok, dt) {
    this.acc = ok ? this.acc + dt : Math.max(0, this.acc - dt * 0.6);
    return Math.min(1, this.acc / this.sec);
  };

  var NO_BODY = 'Atsistok priešais kamerą!';

  function holdTask(sec, check) {
    return function () {
      var h = new Hold(sec);
      return {
        update: function (P, F, dt) {
          var b = body(P);
          if (!b) return { progress: h.feed(false, dt), hint: NO_BODY };
          var r = check(P, b, F);
          var pr = h.feed(r === true, dt);
          return { progress: pr, done: pr >= 1, hint: typeof r === 'string' ? r : '' };
        }
      };
    };
  }

  function jumpCounter(target, extra) {
    return function () {
      var tr = new VTrack(), c = new Counter();
      return {
        target: target,
        update: function (P, F, dt) {
          var b = body(P);
          if (!b) return { progress: c.n / target, count: c.n, hint: NO_BODY };
          var d = tr.update(b.sm.y, b.torso);
          var hint = '';
          var allowed = true;
          if (extra) { var e = extra(P, b); if (e !== true) { allowed = false; hint = e; } }
          var beat = c.feed(allowed && d < -0.15, d > -0.05);
          return { progress: c.n / target, count: c.n, beat: beat, done: c.n >= target, hint: hint };
        }
      };
    };
  }

  MM.TASKS = [
    {
      id: 'arms_up', icon: '🙌', level: 'easy', coins: 10,
      title: 'Pakelk abi rankas!', say: 'Pakelk abi rankas aukštai į viršų!',
      make: holdTask(1.0, function (P, b) {
        var lw = pt(P, 15, 0.35), rw = pt(P, 16, 0.35);
        if (!lw || !rw) return 'Rankos turi matytis';
        var top = b.nose ? b.nose.y : b.sm.y - b.sw * 0.6;
        return lw.y < top && rw.y < top;
      })
    },
    {
      id: 'wave', icon: '👋', level: 'easy', coins: 10,
      title: 'Pamojuok ranka!', say: 'Pamojuok šuniukui viena ranka!',
      make: function () {
        var target = 4, arms = [{ s: 11, e: 13, w: 15, side: 0, n: 0 }, { s: 12, e: 14, w: 16, side: 0, n: 0 }];
        return {
          target: target,
          update: function (P) {
            var b = body(P), best = 0, beat = false;
            if (!b) return { progress: 0, hint: NO_BODY };
            arms.forEach(function (a) {
              var s = pt(P, a.s), e = pt(P, a.e, 0.35), w = pt(P, a.w, 0.35);
              if (!s || !e || !w || w.y > s.y) return;
              var rel = (w.x - e.x) / b.sw, sd = rel > 0.12 ? 1 : rel < -0.12 ? -1 : 0;
              if (sd && sd !== a.side) { if (a.side) { a.n++; beat = true; } a.side = sd; }
              best = Math.max(best, a.n);
            });
            arms.forEach(function (a) { best = Math.max(best, a.n); });
            return { progress: best / target, count: best, beat: beat, done: best >= target, hint: best === 0 ? 'Pakelk ranką ir mojuok' : '' };
          }
        };
      }
    },
    {
      id: 'clap', icon: '👏', level: 'easy', coins: 10,
      title: 'Suplok 3 kartus!', say: 'Suplok rankomis tris kartus!',
      make: function () {
        var c = new Counter(), target = 3;
        return {
          target: target,
          update: function (P) {
            var b = body(P);
            if (!b) return { progress: c.n / target, count: c.n, hint: NO_BODY };
            var lw = pt(P, 15, 0.25), rw = pt(P, 16, 0.25);
            if (!lw || !rw) return { progress: c.n / target, count: c.n, hint: 'Rankos turi matytis' };
            var d = dist(lw, rw) / b.sw;
            var beat = c.feed(d < 0.55, d > 0.95);
            return { progress: c.n / target, count: c.n, beat: beat, done: c.n >= target };
          }
        };
      }
    },
    {
      id: 'jump5', icon: '⬆️', level: 'medium', coins: 20,
      title: 'Pašok 5 kartus!', say: 'Pašokinėk! Pašok penkis kartus!',
      make: jumpCounter(5)
    },
    {
      id: 'squat3', icon: '⬇️', level: 'medium', coins: 20,
      title: 'Pritūpk 3 kartus!', say: 'Pritūpk ir atsistok. Tris kartus!',
      make: function () {
        var tr = new VTrack(), c = new Counter(), target = 3;
        return {
          target: target,
          update: function (P) {
            var b = body(P);
            if (!b) return { progress: c.n / target, count: c.n, hint: NO_BODY };
            var d = tr.update(b.sm.y, b.torso);
            var beat = c.feed(d > 0.35, d < 0.12);
            return { progress: c.n / target, count: c.n, beat: beat, done: c.n >= target };
          }
        };
      }
    },
    {
      id: 'turn', icon: '↔️', level: 'medium', coins: 20,
      title: 'Pasisuk į kairę ir į dešinę!', say: 'Pasisuk į vieną pusę, o paskui į kitą!',
      make: function () {
        var a = false, bb = false;
        return {
          update: function (P) {
            var b = body(P);
            if (!b || !b.nose) return { progress: (a + bb) / 2, hint: NO_BODY };
            var r = (b.nose.x - b.sm.x) / b.sw;
            var beat = false;
            if (r > 0.22 && !a) { a = true; beat = true; }
            if (r < -0.22 && !bb) { bb = true; beat = true; }
            return { progress: (a + bb) / 2, beat: beat, done: a && bb, count: a + bb };
          },
          target: 2
        };
      }
    },
    {
      id: 'one_leg', icon: '🦩', level: 'medium', coins: 20,
      title: 'Pastovėk ant vienos kojos!', say: 'Pakelk vieną koją ir pastovėk kaip gandras!',
      make: holdTask(2.0, function (P, b) {
        var k1 = pt(P, 25, 0.45), k2 = pt(P, 26, 0.45), a1 = pt(P, 27, 0.45), a2 = pt(P, 28, 0.45);
        if (!(k1 && k2) && !(a1 && a2)) return 'Atsitrauk toliau, kad matytųsi kojos';
        if (a1 && a2 && Math.abs(a1.y - a2.y) > b.torso * 0.18) return true;
        if (k1 && k2 && Math.abs(k1.y - k2.y) > b.torso * 0.2) return true;
        return false;
      })
    },
    {
      id: 'funny_face', icon: '😜', level: 'special', coins: 30, needsFace: true,
      title: 'Padaryk juokingą veidą!', say: 'Padaryk patį juokingiausią veidą!',
      make: function () {
        var h = new Hold(1.0);
        return {
          update: function (P, F, dt) {
            if (!F) return { progress: h.feed(false, dt), hint: 'Prieik arčiau, kad matyčiau veidą' };
            var wink = Math.abs((F.bl || 0) - (F.br || 0));
            var sc = Math.max(F.j || 0, (F.tg || 0) * 1.3, (F.puff || 0) * 1.3, F.puck || 0, wink);
            var pr = h.feed(sc > 0.5, dt);
            return { progress: pr, done: pr >= 1, hint: pr < 0.1 ? 'Išsižiok, išpūsk žandus ar primerk akį!' : '' };
          }
        };
      }
    },
    {
      id: 'bunny', icon: '🐰', level: 'special', coins: 30,
      title: 'Pašok kaip zuikutis!', say: 'Uždėk rankas ant galvos kaip zuikio ausytes ir pašok tris kartus!',
      make: jumpCounter(3, function (P, b) {
        var lw = pt(P, 15, 0.3), rw = pt(P, 16, 0.3);
        var top = b.nose ? b.nose.y : b.sm.y - b.sw * 0.6;
        if (lw && rw && lw.y < top && rw.y < top) return true;
        return 'Rankas ant galvos – zuikio ausytės!';
      })
    },
    {
      id: 'superhero', icon: '🦸', level: 'special', coins: 30,
      title: 'Superherojaus poza!', say: 'Rankos ant klubų, krūtinė į priekį. Tu superherojus!',
      make: holdTask(1.5, function (P, b) {
        if (!b.lh || !b.rh) return 'Atsitrauk, kad matytųsi klubai';
        var lw = pt(P, 15, 0.3), rw = pt(P, 16, 0.3), le = pt(P, 13, 0.35), re = pt(P, 14, 0.35);
        if (!lw || !rw || !le || !re) return 'Rankos ant klubų!';
        var near = dist(lw, b.lh) < b.torso * 0.5 && dist(rw, b.rh) < b.torso * 0.5;
        var wide = Math.abs(le.x - b.sm.x) > b.sw * 0.72 && Math.abs(re.x - b.sm.x) > b.sw * 0.72;
        return near && wide ? true : 'Rankos ant klubų, alkūnės į šonus!';
      })
    }
  ];

  MM.PRAISE = ['Šaunuolis!', 'Puiku!', 'Nuostabu!', 'Valio!', 'Tu čempionas!', 'Super!'];
  MM.LEVEL_NAME = { easy: 'Lengva', medium: 'Vidutinė', special: 'Speciali' };
})(window);
