/* Magic Mirror – garsai, balsas, ryšys ir ekrano informacija (HUD) */
(function (g) {
  'use strict';
  var MM = g.MM = g.MM || {};

  /* ---------- Garsai (sintezuojami, be failų) ---------- */
  var ac = null;
  function A() {
    if (!ac) { var Ctx = g.AudioContext || g.webkitAudioContext; if (!Ctx) return null; ac = new Ctx(); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, start, dur, type, vol, slide) {
    var a = A(); if (!a) return;
    var o = a.createOscillator(), gn = a.createGain(), t0 = a.currentTime + start;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol || 0.25, t0 + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  MM.sfx = {
    enabled: true,
    unlock: function () { A(); },
    coin: function () { if (!this.enabled) return; tone(988, 0, 0.12, 'square', 0.12); tone(1319, 0.09, 0.3, 'square', 0.12); },
    boing: function () { if (!this.enabled) return; tone(260, 0, 0.22, 'sine', 0.3, 620); },
    bark: function () {
      if (!this.enabled) return;
      tone(520, 0, 0.09, 'sawtooth', 0.18, 330); tone(560, 0.16, 0.1, 'sawtooth', 0.18, 340);
    },
    fanfare: function () {
      if (!this.enabled) return;
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.35, 'triangle', 0.2); });
    },
    tap: function () { if (!this.enabled) return; tone(660, 0, 0.06, 'sine', 0.15); }
  };

  /* ---------- Balsas ---------- */
  MM.voiceEnabled = true;
  MM.speak = function (text) {
    if (!MM.voiceEnabled || !text || !('speechSynthesis' in g)) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var vs = speechSynthesis.getVoices() || [];
      var v = vs.filter(function (x) { return /^lt/i.test(x.lang); })[0];
      if (v) u.voice = v;
      u.lang = 'lt-LT'; u.rate = 0.95; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) { /* balsas neprivalomas */ }
  };

  /* ---------- Ryšys su serveriu (WebSocket) ---------- */
  MM.connect = function (room, role, onMsg, onState) {
    var ws = null, closed = false, delay = 1000;
    var url = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws?room=' + encodeURIComponent(room) + '&role=' + role;
    function open() {
      try { ws = new WebSocket(url); } catch (e) { retry(); return; }
      ws.onopen = function () { delay = 1000; onState && onState(true); };
      ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (_) { return; } onMsg && onMsg(m); };
      ws.onclose = function () { onState && onState(false); retry(); };
      ws.onerror = function () { try { ws.close(); } catch (_) { } };
    }
    function retry() { if (!closed) setTimeout(open, delay = Math.min(delay * 1.5, 8000)); }
    open();
    return {
      send: function (o) { if (ws && ws.readyState === 1 && ws.bufferedAmount < 65536) ws.send(JSON.stringify(o)); },
      close: function () { closed = true; if (ws) ws.close(); }
    };
  };

  /* ---------- HUD (užduoties kortelė, monetos, pranešimai) ---------- */
  MM.HUD = function (root) {
    root.innerHTML =
      '<div class="hud-coins" aria-label="Monetos"><span class="coin" aria-hidden="true"></span><b>0</b></div>' +
      '<div class="taskcard" hidden><div class="ticon"></div><div class="tbody">' +
      '<div class="tlevel"></div><div class="ttitle"></div>' +
      '<div class="tbar"><i></i></div><div class="tdots"></div></div></div>' +
      '<div class="hint" hidden></div>' +
      '<div class="banner" hidden><div class="big"></div><div class="small"></div></div>';
    var q = function (s) { return root.querySelector(s); };
    var el = { coins: q('.hud-coins b'), coinBox: q('.hud-coins'), card: q('.taskcard'), icon: q('.ticon'), level: q('.tlevel'),
      title: q('.ttitle'), bar: q('.tbar i'), dots: q('.tdots'), hint: q('.hint'), banner: q('.banner'), big: q('.banner .big'), small: q('.banner .small') };
    var prev = {};
    function set(node, key, val) { if (prev[key] !== val) { prev[key] = val; node.textContent = val; } }
    return {
      update: function (ui) {
        if (!ui) return;
        if (prev.coinsN !== ui.coins) {
          if (prev.coinsN != null) { el.coinBox.classList.remove('bump'); void el.coinBox.offsetWidth; el.coinBox.classList.add('bump'); }
          prev.coinsN = ui.coins; el.coins.textContent = ui.coins;
        }
        var showCard = !!ui.task && (ui.phase === 'intro' || ui.phase === 'go');
        el.card.hidden = !showCard;
        if (showCard) {
          set(el.icon, 'icon', ui.task.icon);
          set(el.title, 'title', ui.task.title);
          set(el.level, 'level', ui.task.levelName + ' · ' + ui.task.coins + ' monetų');
          el.card.classList.toggle('intro', ui.phase === 'intro');
          el.bar.style.width = Math.round((ui.prog || 0) * 100) + '%';
          var tg = ui.target || 0, dk = tg + ':' + (ui.count || 0);
          if (prev.dots !== dk) {
            prev.dots = dk; el.dots.innerHTML = '';
            for (var i = 0; i < tg; i++) { var d = document.createElement('span'); if (i < (ui.count || 0)) d.className = 'on'; el.dots.appendChild(d); }
          }
        }
        el.hint.hidden = !ui.hint;
        if (ui.hint) set(el.hint, 'hint', ui.hint);
        el.banner.hidden = !ui.banner;
        if (ui.banner) {
          set(el.big, 'big', ui.banner.big || '');
          set(el.small, 'small', ui.banner.small || '');
          el.banner.className = 'banner ' + (ui.banner.kind || '');
        }
      }
    };
  };
})(window);
