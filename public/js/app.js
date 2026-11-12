/* Magic Mirror – telefono programa: kamera, atpažinimas, užduotys, monetos, siuntimas į TV */
(function () {
  'use strict';
  var MM = window.MM;
  var $ = function (s) { return document.querySelector(s); };

  var MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/';
  var POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  var FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  var ROUND_SIZE = 5, ROUND_BONUS = 25, TASK_TIMEOUT = 35;

  var SHOP = [
    { id: 'acc:hat', kind: 'acc', key: 'hat', name: 'Šventinė kepurė', price: 40 },
    { id: 'acc:scarf', kind: 'acc', key: 'scarf', name: 'Šalikėlis', price: 50 },
    { id: 'acc:glasses', kind: 'acc', key: 'glasses', name: 'Saulės akiniai', price: 60 },
    { id: 'acc:crown', kind: 'acc', key: 'crown', name: 'Karūna', price: 120 },
    { id: 'bg:park', kind: 'bg', key: 'park', name: 'Saulėtas parkas', price: 0 },
    { id: 'bg:candy', kind: 'bg', key: 'candy', name: 'Saldainių šalis', price: 80 },
    { id: 'bg:space', kind: 'bg', key: 'space', name: 'Kosmosas', price: 100 }
  ];
  var FRIENDS = [['🐱', 'Katinas'], ['🐰', 'Triušis'], ['🐻', 'Meškiukas'], ['🦖', 'Dinozauras'], ['🦄', 'Vienaragis'], ['🤖', 'Robotukas']];

  /* ---------- Išsaugojimas (tik šiame telefone) ---------- */
  var KEY = 'magicMirror.v1';
  var DEF = { coins: 0, owned: ['bg:park'], equip: { acc: [], bg: 'park' }, done: 0, rounds: 0, settings: { limit: 20, voice: true, sound: true }, today: { d: '', sec: 0 } };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (r && typeof r === 'object') {
        var s = Object.assign(clone(DEF), r);
        s.settings = Object.assign(clone(DEF.settings), r.settings || {});
        s.equip = Object.assign(clone(DEF.equip), r.equip || {});
        s.today = Object.assign(clone(DEF.today), r.today || {});
        return s;
      }
    } catch (e) { }
    return clone(DEF);
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function dayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function usedSec() { if (S.today.d !== dayKey()) { S.today = { d: dayKey(), sec: 0 }; } return S.today.sec; }
  function limitReached() { return S.settings.limit > 0 && usedSec() >= S.settings.limit * 60; }
  function applySettings() { MM.voiceEnabled = !!S.settings.voice; MM.sfx.enabled = !!S.settings.sound; }
  applySettings();

  /* ---------- Ryšys su TV ---------- */
  var room = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  var net = null, tvCount = 0, netUp = false;
  function updateTvChip() {
    var chip = $('#tvChip'), txt = $('#tvText');
    chip.classList.toggle('on', tvCount > 0);
    if (!room) txt.textContent = 'Kaip žaisti televizoriuje?';
    else if (tvCount > 0) txt.textContent = 'Televizorius prijungtas (kambarys ' + room + ')';
    else if (netUp) txt.textContent = 'Laukiama televizoriaus… (kambarys ' + room + ')';
    else txt.textContent = 'Jungiamasi prie serverio…';
  }
  if (room) {
    net = MM.connect(room, 'phone', function (m) {
      if (m.t === 'peers') { tvCount = m.tv || 0; updateTvChip(); }
    }, function (up) { netUp = up; if (!up) tvCount = 0; updateTvChip(); });
  }
  updateTvChip();

  /* ---------- Ekranai ---------- */
  var current = 'home';
  function show(id) {
    ['home', 'shop', 'parents', 'tvhelp', 'play'].forEach(function (s) { $('#' + s).hidden = s !== id; });
    current = id;
    if (id === 'home') refreshHome();
    if (id === 'shop') renderShop();
    if (id === 'parents') renderParents();
    window.scrollTo(0, 0);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.back'), function (b) { b.onclick = function () { MM.sfx.tap(); show('home'); }; });
  function refreshHome() { $('#homeCoins').textContent = S.coins; }
  $('#btnShop').onclick = function () { MM.sfx.unlock(); MM.sfx.tap(); show('shop'); };
  $('#tvChip').onclick = function () { if (!room) show('tvhelp'); };

  // Tėvų vartai: palaikyti 2 s
  (function () {
    var btn = $('#parentBtn'), fill = $('#parentFill'), timer = null, t0 = 0, raf = 0;
    function stop() { clearTimeout(timer); cancelAnimationFrame(raf); fill.style.height = '0'; }
    function anim() { fill.style.height = Math.min(100, (performance.now() - t0) / 20) + '%'; raf = requestAnimationFrame(anim); }
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); t0 = performance.now(); anim(); timer = setTimeout(function () { stop(); show('parents'); }, 2000); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.repeat) show('parents'); });
  })();

  /* ---------- Parduotuvė ---------- */
  function owns(id) { return S.owned.indexOf(id) >= 0; }
  function renderShop() {
    $('#shopCoins').textContent = S.coins;
    var acc = $('#accGrid'), bg = $('#bgGrid'), ch = $('#charGrid');
    acc.innerHTML = ''; bg.innerHTML = ''; ch.innerHTML = '';
    SHOP.forEach(function (it) {
      var card = document.createElement('div'); card.className = 'item';
      var cv = document.createElement('canvas'); cv.width = 240; cv.height = 240;
      var nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = it.name;
      var btn = document.createElement('button');
      var isEq = it.kind === 'acc' ? S.equip.acc.indexOf(it.key) >= 0 : S.equip.bg === it.key;
      if (!owns(it.id)) {
        btn.className = 'buy';
        btn.innerHTML = '<span class="coin"></span> ' + it.price;
        btn.disabled = S.coins < it.price;
        btn.setAttribute('aria-label', 'Pirkti už ' + it.price + ' monetų');
        btn.onclick = function () {
          if (S.coins < it.price) return;
          S.coins -= it.price; S.owned.push(it.id);
          if (it.kind === 'acc') S.equip.acc.push(it.key); else S.equip.bg = it.key;
          save(); MM.sfx.coin(); renderShop();
        };
      } else {
        btn.className = isEq ? 'equipped' : 'equip';
        btn.textContent = isEq ? (it.kind === 'acc' ? 'Nusegti' : 'Pasirinkta') : (it.kind === 'acc' ? 'Užsidėti' : 'Pasirinkti');
        btn.onclick = function () {
          if (it.kind === 'acc') {
            var i = S.equip.acc.indexOf(it.key);
            if (i >= 0) S.equip.acc.splice(i, 1); else S.equip.acc.push(it.key);
          } else S.equip.bg = it.key;
          save(); MM.sfx.tap(); renderShop();
        };
      }
      card.appendChild(cv); card.appendChild(nm); card.appendChild(btn);
      (it.kind === 'acc' ? acc : bg).appendChild(card);
      MM.drawPreview(cv, it.kind === 'acc' ? [it.key] : S.equip.acc, it.kind === 'bg' ? it.key : 'park');
    });
    FRIENDS.forEach(function (f) {
      var card = document.createElement('div'); card.className = 'item locked';
      card.innerHTML = '<div class="lockart" aria-hidden="true"></div><div class="nm"></div><div class="soon">Netrukus</div>';
      card.querySelector('.lockart').textContent = f[0];
      card.querySelector('.nm').textContent = f[1];
      ch.appendChild(card);
    });
  }

  /* ---------- Tėvams ---------- */
  function segBind(id, val, onSet) {
    Array.prototype.forEach.call(document.querySelectorAll('#' + id + ' button'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.v === String(val)));
      b.onclick = function () { onSet(b.dataset.v); save(); applySettings(); renderParents(); };
    });
  }
  function renderParents() {
    segBind('segLimit', S.settings.limit, function (v) { S.settings.limit = +v; });
    segBind('segVoice', S.settings.voice ? 1 : 0, function (v) { S.settings.voice = v === '1'; });
    segBind('segSound', S.settings.sound ? 1 : 0, function (v) { S.settings.sound = v === '1'; });
    var m = Math.floor(usedSec() / 60);
    $('#usedToday').textContent = 'Šiandien žaista: ' + m + ' min.';
    $('#progressText').textContent = 'Monetos: ' + S.coins + ' · Atliktos užduotys: ' + S.done + ' · Įveikti etapai: ' + S.rounds;
    $('#resetConfirm').hidden = true; $('#resetBtn').hidden = false;
  }
  $('#resetBtn').onclick = function () { $('#resetConfirm').hidden = false; $('#resetBtn').hidden = true; };
  $('#resetNo').onclick = renderParents;
  $('#resetYes').onclick = function () { var keep = S.settings; S = clone(DEF); S.settings = keep; save(); renderParents(); };

  /* ---------- Vizija (MediaPipe, veikia telefone) ---------- */
  var visionP = null;
  function loadVision() {
    if (visionP) return visionP;
    visionP = (async function () {
      var V = await import(MP + 'vision_bundle.mjs');
      var files = await V.FilesetResolver.forVisionTasks(MP + 'wasm');
      async function mk(Cls, opts, model) {
        try { return await Cls.createFromOptions(files, Object.assign({}, opts, { baseOptions: { modelAssetPath: model, delegate: 'GPU' } })); }
        catch (e) { return await Cls.createFromOptions(files, Object.assign({}, opts, { baseOptions: { modelAssetPath: model, delegate: 'CPU' } })); }
      }
      var pose = await mk(V.PoseLandmarker, { runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 }, POSE_MODEL);
      var face = null;
      try { face = await mk(V.FaceLandmarker, { runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true }, FACE_MODEL); }
      catch (e) { console.warn('Veido modelis neįkeltas', e); }
      return { pose: pose, face: face };
    })();
    visionP.catch(function () { visionP = null; });
    return visionP;
  }

  /* ---------- Kamera ---------- */
  var video = $('#cam'), stream = null;
  async function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video.srcObject = stream;
    await video.play();
  }
  function stopCam() {
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null; video.srcObject = null;
  }

  /* ---------- Žaidimo būsena ---------- */
  var G = null, vision = null, wakeLock = null;
  var hud = MM.HUD($('#hud'));
  var playScene = MM.Scene($('#playCanvas'));
  var homeScene = MM.Scene($('#homeCanvas'));

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function availableTasks() { return MM.TASKS.filter(function (t) { return !t.needsFace || (vision && vision.face); }); }

  function newGame(mode) {
    return { mode: mode, phase: 'loading', deck: [], round: [], idx: -1, task: null, det: null, tPhase: 0, prog: 0, count: 0, target: 0,
      earned: 0, okCount: 0, lm: null, face: null, aspect: 4 / 3, lastVT: -1, frame: 0, noBody: 0, calib: 0,
      sayId: 0, say: '', celeb: 0, bark: 0, hint: '', banner: null, lastSend: 0, lastBarkT: 0, lastSparkT: 0, freeJump: null };
  }

  function say(text) {
    G.sayId++; G.say = text;
    if (tvCount === 0) MM.speak(text); // jei prijungtas TV, kalba TV
  }

  async function startPlay(mode) {
    MM.sfx.unlock();
    if (limitReached()) { showRest(); return; }
    G = newGame(mode);
    show('play');
    $('#endBtns').hidden = true;
    $('#loading').hidden = false; $('#loadingText').textContent = 'Šuniukas ruošiasi…';
    try {
      await startCam();
      if (!G) { stopCam(); return; }
    } catch (e) {
      $('#loadingText').textContent = location.protocol !== 'https:' && location.hostname !== 'localhost'
        ? 'Kamera veikia tik saugiu (https) adresu. Atidarykite žaidimą per https.'
        : 'Nepavyko įjungti kameros. Leiskite naudoti kamerą ir bandykite dar kartą.';
      return;
    }
    try {
      vision = await loadVision();
    } catch (e) {
      $('#loadingText').textContent = 'Nepavyko įkelti judesių atpažinimo. Patikrinkite interneto ryšį.';
      return;
    }
    if (!G) return; // uždarė kol kraunama
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { }
    $('#loading').hidden = true;
    G.phase = 'calib';
    say(mode === 'free' ? 'Sveikas! Atsistok priešais kamerą ir pajudėk!' : 'Sveikas! Atsistok priešais kamerą, kad šuniukas tave matytų!');
  }

  function endPlay() {
    stopCam();
    if (wakeLock) { try { wakeLock.release(); } catch (e) { } wakeLock = null; }
    G = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (net) net.send({ t: 'f', p: null, ui: { phase: 'idle', coins: S.coins }, eq: S.equip });
    save();
    show('home');
  }

  function showRest() {
    G = newGame('rest');
    show('play');
    $('#loading').hidden = true;
    G.phase = 'rest';
    G.banner = { big: 'Laikas pailsėti!', small: 'Šuniukas irgi pavargo. Pažaiskime rytoj!', kind: 'end' };
    $('#endBtns').hidden = false; $('#againBtn').hidden = true;
    say('Laikas pailsėti! Pažaiskime rytoj.');
  }

  $('#btnTasks').onclick = function () { startPlay('tasks'); };
  $('#btnFree').onclick = function () { startPlay('free'); };
  $('#closePlay').onclick = endPlay;
  $('#doneBtn').onclick = endPlay;
  $('#againBtn').onclick = function () { if (limitReached()) { stopCam(); showRest(); return; } $('#endBtns').hidden = true; G.banner = null; startRound(); };

  function startRound() {
    G.round = [];
    for (var i = 0; i < ROUND_SIZE; i++) {
      if (!G.deck.length) G.deck = shuffle(availableTasks().slice());
      G.round.push(G.deck.pop());
    }
    G.idx = -1; G.earned = 0; G.okCount = 0;
    nextTask();
  }

  function nextTask() {
    G.idx++;
    G.banner = null; G.hint = '';
    if (G.idx >= G.round.length) {
      S.coins += ROUND_BONUS; S.rounds++; G.earned += ROUND_BONUS; save();
      G.phase = 'end'; G.task = null; G.celeb++;
      G.banner = { big: 'Etapas įveiktas!', small: 'Surinkai ' + G.earned + ' monetų (+' + ROUND_BONUS + ' premija)', kind: 'end' };
      var sz = playScene.size(); MM.fx.burst(sz.W, sz.H, 120, true); MM.sfx.fanfare();
      say('Valio! Etapas įveiktas! Gauni premiją!');
      $('#endBtns').hidden = false; $('#againBtn').hidden = false;
      return;
    }
    G.task = G.round[G.idx];
    G.det = G.task.make();
    G.prog = 0; G.count = 0; G.target = G.det.target || 0;
    G.phase = 'intro'; G.tPhase = 0;
    say(G.task.say);
  }

  /* ---------- Kadrų apdorojimas ---------- */
  function readFace(res) {
    var cats = res && res.faceBlendshapes && res.faceBlendshapes[0] && res.faceBlendshapes[0].categories;
    if (!cats) return null;
    var m = {};
    cats.forEach(function (c) { m[c.categoryName] = c.score; });
    return { j: m.jawOpen || 0, bl: m.eyeBlinkLeft || 0, br: m.eyeBlinkRight || 0, s: ((m.mouthSmileLeft || 0) + (m.mouthSmileRight || 0)) / 2,
      tg: m.tongueOut || 0, puff: m.cheekPuff || 0, puck: m.mouthPucker || 0 };
  }

  function processFrame(now) {
    if (!vision || !video.videoWidth || video.readyState < 2) return;
    if (video.currentTime === G.lastVT) return;
    G.lastVT = video.currentTime;
    G.aspect = video.videoWidth / video.videoHeight;
    G.frame++;
    var res = vision.pose.detectForVideo(video, now);
    var raw = res && res.landmarks && res.landmarks[0];
    if (raw) {
      G.noBody = 0;
      if (!G.lm) G.lm = raw.map(function (p) { return [p.x, p.y, p.visibility == null ? 1 : p.visibility]; });
      else for (var i = 0; i < 33; i++) {
        var p = raw[i], q = G.lm[i], v = p.visibility == null ? 1 : p.visibility;
        q[0] += (p.x - q[0]) * 0.6; q[1] += (p.y - q[1]) * 0.6; q[2] += (v - q[2]) * 0.5;
      }
    } else if (G.lm) {
      G.lm.forEach(function (q) { q[2] *= 0.85; });
      if (++G.noBody > 20) G.lm = null;
    }
    if (vision.face && G.frame % 2 === 0) {
      var f = readFace(vision.face.detectForVideo(video, now + 0.5));
      if (f) {
        if (!G.face) G.face = f;
        else for (var k in f) G.face[k] += (f[k] - G.face[k]) * 0.6;
        G.faceSeen = now;
      } else if (G.faceSeen && now - G.faceSeen > 600) G.face = null;
    }
  }

  function detectPts() {
    if (!G.lm) return null;
    var a = G.aspect;
    return G.lm.map(function (q) { return { x: q[0] * a, y: q[1], v: q[2] }; });
  }

  function award(task) {
    S.coins += task.coins; S.done++; G.earned += task.coins; G.okCount++; save();
    G.celeb++;
    var praise = MM.PRAISE[Math.floor(Math.random() * MM.PRAISE.length)];
    G.banner = { big: praise, small: '+' + task.coins + ' monetų', kind: 'yay' };
    var sz = playScene.size(); MM.fx.burst(sz.W, sz.H, 70, true);
    MM.sfx.fanfare(); setTimeout(function () { MM.sfx.coin(); }, 450);
    say(praise);
  }

  function tick(dt, now) {
    processFrame(now);
    var P = detectPts();
    var B = P && MM.body(P);
    if (G.phase !== 'rest' && G.phase !== 'loading') {
      S.today.sec = usedSec() + dt;
      if (S.today.sec - (G.lastSave || 0) > 10) { G.lastSave = S.today.sec; save(); }
      if (limitReached() && G.phase !== 'end') { stopCam(); showRest(); return; }
    }
    G.hint = '';
    switch (G.phase) {
      case 'calib':
        G.banner = { big: 'Atsistok priešais kamerą', small: 'Kad matytųsi galva, rankos ir pilvukas', kind: 'calib' };
        G.calib = B && B.nose ? G.calib + dt : Math.max(0, G.calib - dt);
        if (G.calib > 1.0) {
          G.banner = null; MM.sfx.bark(); G.bark++;
          if (G.mode === 'free') { G.phase = 'free'; G.freeJump = { tr: null, armed: true }; }
          else startRound();
        }
        break;
      case 'intro':
        G.tPhase += dt;
        if (G.tPhase > 2.3) { G.phase = 'go'; G.tPhase = 0; }
        break;
      case 'go':
        G.tPhase += dt;
        var r = G.det.update(P || [], G.face, dt) || {};
        G.prog = r.progress || 0; G.count = r.count || 0;
        G.hint = r.hint || '';
        if (r.beat) MM.sfx.boing();
        if (r.done) { G.phase = 'yay'; G.tPhase = 0; G.prog = 1; award(G.task); }
        else if (G.tPhase > TASK_TIMEOUT) {
          G.phase = 'miss'; G.tPhase = 0;
          G.banner = { big: 'Gerai pasistengei!', small: 'Pabandykime kitą užduotį', kind: '' };
          say('Gerai pasistengei! Pabandykime kitą.');
        }
        break;
      case 'yay': case 'miss':
        G.tPhase += dt;
        if (G.tPhase > 2.4) nextTask();
        break;
      case 'free':
        if (!B) G.hint = 'Atsistok priešais kamerą!';
        if (G.face && G.face.j > 0.55 && now - G.lastBarkT > 1300) { G.lastBarkT = now; MM.sfx.bark(); G.bark++; }
        if (P && B) {
          var lw = P[15], rw = P[16];
          if (B.nose && lw.v > 0.4 && rw.v > 0.4 && lw.y < B.nose.y && rw.y < B.nose.y && now - G.lastSparkT > 1500) {
            G.lastSparkT = now; var sz = playScene.size(); MM.fx.sparkle(sz.W / 2, sz.H * 0.3, 24); MM.sfx.coin();
          }
        }
        break;
    }
  }

  function uiState() {
    var t = G.task;
    return {
      phase: G.phase, mode: G.mode, coins: S.coins,
      task: t && { icon: t.icon, title: t.title, coins: t.coins, levelName: MM.LEVEL_NAME[t.level] },
      prog: G.prog, count: G.count, target: G.target, hint: G.hint, banner: G.banner,
      sayId: G.sayId, say: G.say, celeb: G.celeb, bark: G.bark
    };
  }

  function r3(x) { return Math.round(x * 1000) / 1000; }
  function sendTV(now) {
    if (!net || now - G.lastSend < 50) return;
    G.lastSend = now;
    var f = G.face;
    net.send({
      t: 'f', a: r3(G.aspect),
      p: G.lm ? G.lm.map(function (q) { return [r3(q[0]), r3(q[1]), Math.round(q[2] * 100) / 100]; }) : null,
      f: f ? { j: r3(f.j), bl: r3(f.bl), br: r3(f.br), s: r3(f.s), tg: r3(f.tg) } : null,
      ui: uiState(), eq: S.equip
    });
  }

  /* ---------- Pagrindinis ciklas ---------- */
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    var t = now / 1000;
    if (current === 'play' && G) {
      if (G.phase !== 'loading' && G.phase !== 'rest') tick(dt, now);
      if (G) {
        playScene.draw({ t: t, bg: S.equip.bg, acc: S.equip.acc, lm: G.lm, face: G.face, aspect: G.aspect });
        var ui = uiState(); hud.update(ui);
        sendTV(now);
      }
    } else if (current === 'home') {
      homeScene.draw({ t: t, bg: S.equip.bg, acc: S.equip.acc, lm: null });
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && G && G.phase !== 'rest') endPlay(); // kamera neveikia fone
  });

  // Balsų sąrašas kai kuriose naršyklėse atsiranda vėliau
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  show('home');
})();
