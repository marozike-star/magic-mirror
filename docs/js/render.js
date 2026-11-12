/* Magic Mirror – šuniuko piešimas, fonai ir efektai (bendra telefonui ir TV) */
(function (g) {
  'use strict';
  var MM = g.MM = g.MM || {};

  var C = {
    fur: '#F2B066', furD: '#C27A3E', furL: '#FFE8C7', ink: '#2A2140',
    pink: '#FF8FA3', tongue: '#FF6F91', mouth: '#7A2338', white: '#FFFFFF'
  };

  // Ramybės poza (žaliavinės kameros koordinatės, x neveidrodinis)
  var IDLE = (function () {
    var a = [], i;
    for (i = 0; i < 33; i++) a.push([0.5, 0.5, 0]);
    function s(k, x, y) { a[k] = [x, y, 1]; }
    s(0, .5, .27); s(2, .53, .245); s(5, .47, .245); s(7, .565, .265); s(8, .435, .265);
    s(11, .6, .42); s(12, .4, .42); s(13, .63, .56); s(14, .37, .56); s(15, .64, .69); s(16, .36, .69);
    s(23, .565, .68); s(24, .435, .68); s(25, .57, .82); s(26, .43, .82); s(27, .57, .95); s(28, .43, .95);
    return a;
  })();

  MM.idlePose = function (t) {
    var b = Math.sin(t * 2.2) * 0.006;
    var w = Math.sin(t * 5) * 0.035;
    return IDLE.map(function (p, i) {
      var x = p[0], y = p[1];
      if (i <= 12) y += b;
      if (i === 15) { x = 0.70 + w; y = 0.30; } // mojuoja letenėle
      if (i === 13) { x = 0.68; y = 0.40; }
      return [x, y, p[2]];
    });
  };

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function ellipse(ctx, x, y, rx, ry, rot, fill, stroke, lw) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), rot || 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 3; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  /* ---------- Fonai ---------- */
  function bgPark(ctx, W, H, t) {
    var gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#7FD0FF'); gr.addColorStop(0.7, '#D6F2FF');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // saulė
    var sx = W * 0.12, sy = H * 0.16, sr = Math.min(W, H) * 0.08;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.2);
    ctx.fillStyle = 'rgba(255,201,60,.45)';
    for (var i = 0; i < 10; i++) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath(); ctx.moveTo(sr * 1.15, -sr * 0.12); ctx.lineTo(sr * 1.7, 0); ctx.lineTo(sr * 1.15, sr * 0.12); ctx.fill();
    }
    ctx.restore();
    ellipse(ctx, sx, sy, sr, sr, 0, '#FFC93C');
    // debesys
    for (var k = 0; k < 3; k++) {
      var cx = ((t * 12 * (k + 1) + k * W * 0.4) % (W * 1.3)) - W * 0.15, cy = H * (0.12 + k * 0.08), r = H * 0.045;
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.arc(cx + r, cy - r * 0.5, r * 1.2, 0, 7); ctx.arc(cx + r * 2.1, cy, r, 0, 7); ctx.fill();
    }
    // kalvos
    ctx.fillStyle = '#7ED957';
    ctx.beginPath(); ctx.moveTo(0, H * 0.72);
    ctx.quadraticCurveTo(W * 0.25, H * 0.56, W * 0.5, H * 0.7);
    ctx.quadraticCurveTo(W * 0.78, H * 0.58, W, H * 0.68); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#35B86B';
    ctx.beginPath(); ctx.moveTo(0, H * 0.82);
    ctx.quadraticCurveTo(W * 0.5, H * 0.74, W, H * 0.84); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // gėlytės
    for (var f = 0; f < 9; f++) {
      var fx = W * (0.05 + f * 0.112), fy = H * (0.9 + (f % 2) * 0.04), fr = H * 0.012;
      ctx.fillStyle = ['#FF6B4A', '#FFC93C', '#FF8FA3'][f % 3];
      for (var p = 0; p < 5; p++) { var a = p * 1.2566; ellipse(ctx, fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr, fr); }
      ellipse(ctx, fx, fy, fr * 0.8, fr * 0.8, 0, '#FFF3C4');
    }
  }

  function bgSpace(ctx, W, H, t) {
    var gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#16123A'); gr.addColorStop(1, '#2E2A6E');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 70; i++) {
      var x = (i * 977) % W, y = (i * 613) % (H * 0.9), a = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
      ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
    }
    var pr = Math.min(W, H) * 0.11, px = W * 0.85, py = H * 0.2;
    ellipse(ctx, px, py, pr, pr, 0, '#FF8A5B');
    ellipse(ctx, px - pr * 0.3, py - pr * 0.2, pr * 0.25, pr * 0.18, 0, 'rgba(255,255,255,.25)');
    ctx.save(); ctx.translate(px, py); ctx.rotate(-0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.7, pr * 0.35, 0, 0, 7); ctx.lineWidth = pr * 0.12; ctx.strokeStyle = '#FFC93C'; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#5A55A8';
    ctx.beginPath(); ctx.ellipse(W / 2, H * 1.25, W * 0.9, H * 0.42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4A4596';
    [[.3, 1.0], [.62, .95], [.8, 1.02]].forEach(function (c) { ellipse(ctx, W * c[0], H * c[1], W * 0.05, H * 0.02); });
  }

  function bgCandy(ctx, W, H, t) {
    var gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#FFD1E3'); gr.addColorStop(1, '#FFE9C7');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    var cols = ['#FF6FA8', '#FFC93C', '#6FD3FF', '#8BE38B'];
    for (var i = 0; i < 6; i++) {
      var x = W * (0.08 + i * 0.17), y = H * (0.25 + (i % 2) * 0.12) + Math.sin(t + i) * 6, r = H * 0.06;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.18;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, H * 0.9); ctx.stroke();
      ellipse(ctx, x, y, r, r, 0, cols[i % 4]);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = r * 0.16;
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, t + i, t + i + 4.2); ctx.stroke();
    }
    ctx.fillStyle = '#FF9EC4';
    ctx.beginPath(); ctx.moveTo(0, H * 0.86);
    for (var k = 0; k <= 12; k++) ctx.quadraticCurveTo(W * (k - 0.5) / 12, H * 0.8, W * k / 12, H * 0.86);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  }

  MM.drawBackground = function (ctx, W, H, bg, t) {
    if (bg === 'space') bgSpace(ctx, W, H, t);
    else if (bg === 'candy') bgCandy(ctx, W, H, t);
    else bgPark(ctx, W, H, t);
  };

  /* ---------- Šuniukas ---------- */
  function limb(ctx, pts, w) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = C.furD; ctx.lineWidth = w + Math.max(4, w * 0.16); ctx.stroke();
    ctx.strokeStyle = C.fur; ctx.lineWidth = w; ctx.stroke();
    var e = pts[pts.length - 1], pr = w * 0.62;
    ellipse(ctx, e.x, e.y, pr, pr, 0, C.furL, C.furD, Math.max(3, w * 0.1));
    ctx.fillStyle = C.pink;
    ellipse(ctx, e.x, e.y + pr * 0.15, pr * 0.38, pr * 0.3, 0, C.pink);
  }

  function drawPuppy(ctx, P, face, acc, t) {
    var ls = P(11, 0.3), rs = P(12, 0.3);
    if (!ls || !rs) return;
    var u = Math.max(dist(ls, rs), 30);
    var sm = mid(ls, rs);
    var down = { x: 0, y: 1 };
    var lh = P(23, 0.35), rh = P(24, 0.35);
    if (!lh || !rh) { lh = { x: ls.x - u * 0.1 * Math.sign(ls.x - rs.x || 1), y: ls.y + u * 1.4 }; rh = { x: rs.x + u * 0.1 * Math.sign(ls.x - rs.x || 1), y: rs.y + u * 1.4 }; }
    var hm = mid(lh, rh);
    function leg(h, ki, ai) {
      var k = P(ki, 0.35), a = P(ai, 0.35);
      if (!k) k = { x: h.x, y: h.y + u * 0.75 };
      if (!a) a = { x: k.x, y: k.y + u * 0.75 };
      return [h, k, a];
    }
    function arm(s, ei, wi, side) {
      var e = P(ei, 0.3), w = P(wi, 0.3);
      if (!e) e = { x: s.x + side * u * 0.15, y: s.y + u * 0.6 };
      if (!w) w = { x: e.x, y: e.y + u * 0.6 };
      return [s, e, w];
    }
    var side = ls.x < rs.x ? -1 : 1; // ls ekrane kairėje?
    var limbW = u * 0.36;

    // šešėlis
    var footY = Math.max(lh.y, rh.y) + u * 1.6;
    ellipse(ctx, hm.x, footY, u * 1.1, u * 0.18, 0, 'rgba(30,20,60,.18)');

    // uodega
    var wag = Math.sin(t * 9) * 0.6;
    ctx.save(); ctx.translate(hm.x, hm.y - u * 0.1); ctx.rotate(-0.4 + wag);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.furD; ctx.lineWidth = u * 0.22;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(u * 0.5, -u * 0.2, u * 0.75, -u * 0.75); ctx.stroke();
    ctx.strokeStyle = C.fur; ctx.lineWidth = u * 0.14; ctx.stroke();
    ctx.restore();

    // kojos
    limb(ctx, leg(lh, 25, 27), limbW * 1.1);
    limb(ctx, leg(rh, 26, 28), limbW * 1.1);

    // kūnas
    var ang = Math.atan2(hm.y - sm.y, hm.x - sm.x) - Math.PI / 2;
    var bc = mid(sm, hm), tl = dist(sm, hm);
    ellipse(ctx, bc.x, bc.y, u * 0.68, tl / 2 + u * 0.38, ang, C.fur, C.furD, Math.max(4, u * 0.05));
    ellipse(ctx, bc.x, bc.y + tl * 0.08, u * 0.42, tl / 2 + u * 0.12, ang, C.furL);

    // šalikėlis
    if (acc.indexOf('scarf') >= 0) {
      ellipse(ctx, sm.x, sm.y - u * 0.05, u * 0.62, u * 0.2, ang, '#FF6B4A', '#C9402A', 4);
      ctx.save(); ctx.translate(sm.x + u * 0.3, sm.y); ctx.rotate(ang + 0.25 + Math.sin(t * 4) * 0.08);
      ctx.fillStyle = '#FF6B4A'; ctx.fillRect(0, 0, u * 0.2, u * 0.6);
      ctx.fillStyle = '#FFC93C'; ctx.fillRect(0, u * 0.2, u * 0.2, u * 0.08); ctx.fillRect(0, u * 0.4, u * 0.2, u * 0.08);
      ctx.restore();
    }

    // rankos
    limb(ctx, arm(ls, 13, 15, side), limbW);
    limb(ctx, arm(rs, 14, 16, -side), limbW);

    // galva
    var N = P(0, 0.3), e2 = P(2, 0.3), e5 = P(5, 0.3), le = P(7, 0.25), re = P(8, 0.25);
    var R = u * 0.62;
    if (le && re) R = Math.max(R, dist(le, re) * 0.9);
    R = Math.min(R, u * 1.1);
    var hc = N ? { x: N.x, y: N.y - R * 0.15 } : { x: sm.x, y: sm.y - u * 0.95 };
    var ha = 0;
    if (e2 && e5) {
      var a1 = Math.atan2(e5.y - e2.y, e5.x - e2.x);
      if (Math.abs(a1) > Math.PI / 2) a1 = Math.atan2(e2.y - e5.y, e2.x - e5.x);
      ha = Math.max(-0.6, Math.min(0.6, a1));
    }
    // kaklas
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.furD; ctx.lineWidth = u * 0.5; ctx.beginPath(); ctx.moveTo(sm.x, sm.y); ctx.lineTo(hc.x, hc.y); ctx.stroke();
    ctx.strokeStyle = C.fur; ctx.lineWidth = u * 0.42; ctx.stroke();

    ctx.save(); ctx.translate(hc.x, hc.y); ctx.rotate(ha);
    var sway = Math.sin(t * 3) * 0.08;
    ellipse(ctx, 0, 0, R, R * 0.95, 0, C.fur, C.furD, Math.max(4, R * 0.06));
    ellipse(ctx, -R * 0.05, -R * 0.55, R * 0.28, R * 0.2, 0.3, C.furL); // dėmė
    // ausys
    ellipse(ctx, -R * 0.92, R * 0.05, R * 0.3, R * 0.68, 0.32 + sway, C.furD);
    ellipse(ctx, R * 0.92, R * 0.05, R * 0.3, R * 0.68, -0.32 - sway, C.furD);
    // snukis
    ellipse(ctx, 0, R * 0.38, R * 0.5, R * 0.36, 0, C.furL);
    // akys
    var f = face || {};
    var bl = f.bl || 0, br = f.br || 0;
    [[-0.36, bl], [0.36, br]].forEach(function (e) {
      var ex = e[0] * R, ey = -R * 0.1, er = R * 0.14;
      if (e[1] > 0.5) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(3, R * 0.06); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey - er * 0.3, er, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      } else {
        ellipse(ctx, ex, ey, er, er * 1.12, 0, C.ink);
        ellipse(ctx, ex - er * 0.35, ey - er * 0.4, er * 0.35, er * 0.35, 0, C.white);
      }
    });
    // skruostai
    var sm2 = Math.min(1, 0.35 + (f.s || 0));
    ctx.globalAlpha = sm2 * 0.7;
    ellipse(ctx, -R * 0.6, R * 0.32, R * 0.13, R * 0.09, 0, C.pink);
    ellipse(ctx, R * 0.6, R * 0.32, R * 0.13, R * 0.09, 0, C.pink);
    ctx.globalAlpha = 1;
    // nosis
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.moveTo(-R * 0.14, R * 0.2); ctx.quadraticCurveTo(0, R * 0.12, R * 0.14, R * 0.2);
    ctx.quadraticCurveTo(0, R * 0.42, -R * 0.14, R * 0.2); ctx.fill();
    // burna
    var jaw = f.j || 0;
    if (jaw > 0.22) {
      var mo = R * (0.07 + Math.min(1, jaw) * 0.22);
      ellipse(ctx, 0, R * 0.5 + mo * 0.4, R * 0.2, mo, 0, C.mouth);
      ellipse(ctx, 0, R * 0.5 + mo * 0.9, R * 0.13, mo * 0.55, 0, C.tongue);
    } else {
      ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(3, R * 0.05); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-R * 0.1, R * 0.38, R * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(R * 0.1, R * 0.38, R * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      if ((f.tg || 0) > 0.3) ellipse(ctx, 0, R * 0.55, R * 0.1, R * 0.12, 0, C.tongue);
    }
    // aksesuarai
    if (acc.indexOf('glasses') >= 0) {
      ctx.lineWidth = Math.max(3, R * 0.05); ctx.strokeStyle = '#23204A';
      ellipse(ctx, -R * 0.36, -R * 0.1, R * 0.24, R * 0.2, 0, 'rgba(35,32,74,.85)', '#23204A');
      ellipse(ctx, R * 0.36, -R * 0.1, R * 0.24, R * 0.2, 0, 'rgba(35,32,74,.85)', '#23204A');
      ctx.beginPath(); ctx.moveTo(-R * 0.12, -R * 0.12); ctx.lineTo(R * 0.12, -R * 0.12); ctx.stroke();
      ellipse(ctx, -R * 0.44, -R * 0.17, R * 0.07, R * 0.04, -0.4, 'rgba(255,255,255,.7)');
      ellipse(ctx, R * 0.28, -R * 0.17, R * 0.07, R * 0.04, -0.4, 'rgba(255,255,255,.7)');
    }
    if (acc.indexOf('hat') >= 0) {
      ctx.save(); ctx.translate(R * 0.15, -R * 0.82); ctx.rotate(0.18);
      ctx.fillStyle = '#6FD3FF';
      ctx.beginPath(); ctx.moveTo(-R * 0.36, 0); ctx.lineTo(0, -R * 0.95); ctx.lineTo(R * 0.36, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath(); ctx.moveTo(-R * 0.24, -R * 0.32); ctx.lineTo(R * 0.24, -R * 0.32); ctx.lineTo(R * 0.17, -R * 0.5); ctx.lineTo(-R * 0.17, -R * 0.5); ctx.fill();
      ellipse(ctx, 0, -R * 0.98, R * 0.11, R * 0.11, 0, '#FF6B4A');
      ctx.restore();
    }
    if (acc.indexOf('crown') >= 0) {
      ctx.save(); ctx.translate(0, -R * 0.82);
      ctx.fillStyle = '#FFC93C'; ctx.strokeStyle = '#D99A12'; ctx.lineWidth = Math.max(3, R * 0.04);
      ctx.beginPath(); ctx.moveTo(-R * 0.45, 0); ctx.lineTo(-R * 0.5, -R * 0.42); ctx.lineTo(-R * 0.22, -R * 0.2);
      ctx.lineTo(0, -R * 0.5); ctx.lineTo(R * 0.22, -R * 0.2); ctx.lineTo(R * 0.5, -R * 0.42); ctx.lineTo(R * 0.45, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ellipse(ctx, 0, -R * 0.14, R * 0.07, R * 0.07, 0, '#FF6B4A');
      ellipse(ctx, -R * 0.28, -R * 0.1, R * 0.05, R * 0.05, 0, '#6FD3FF');
      ellipse(ctx, R * 0.28, -R * 0.1, R * 0.05, R * 0.05, 0, '#8BE38B');
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- Scena su švelniu priartinimu ---------- */
  MM.Scene = function (canvas) {
    var ctx = canvas.getContext('2d');
    var cam = { z: 1, cx: null, cy: null };
    var last = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      return dpr;
    }
    return {
      draw: function (st) {
        var dpr = resize();
        var W = canvas.width / dpr, H = canvas.height / dpr;
        var t = st.t, dt = last ? Math.min(0.1, t - last) : 0.016; last = t;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        MM.drawBackground(ctx, W, H, st.bg, t);
        var lm = st.lm || MM.idlePose(t);
        var aspect = st.lm ? (st.aspect || 4 / 3) : 4 / 3;
        var vw = W, vh = W / aspect;
        if (vh > H) { vh = H; vw = H * aspect; }
        var ox = (W - vw) / 2, oy = (H - vh) / 2;
        function P(i, minV) {
          var p = lm[i];
          if (!p || p[2] < (minV == null ? 0.35 : minV)) return null;
          return { x: ox + (1 - p[0]) * vw, y: oy + p[1] * vh };
        }
        // priartinimas pagal kūno dydį
        var ids = [0, 11, 12, 23, 24, 27, 28], minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, n = 0;
        ids.forEach(function (i) { var q = P(i, 0.4); if (q) { n++; minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); } });
        var tz = 1, tcx = W / 2, tcy = H / 2;
        if (n >= 3) {
          var bh = Math.max(40, (maxY - minY) * 1.35);
          tz = Math.max(1, Math.min(1.8, (0.8 * H) / bh));
          var bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2 + bh * 0.05;
          var tx = W / 2 + (bcx - W / 2) * 0.5;
          tcx = bcx - (tx - W / 2) / tz; tcy = bcy;
        }
        if (cam.cx === null) { cam.cx = tcx; cam.cy = tcy; cam.z = tz; }
        var k = Math.min(1, dt * 2.5);
        cam.z = lerp(cam.z, tz, k); cam.cx = lerp(cam.cx, tcx, k); cam.cy = lerp(cam.cy, tcy, k);
        ctx.save();
        ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
        drawPuppy(ctx, P, st.face, st.acc || [], t);
        ctx.restore();
        MM.fx.draw(ctx, W, H, dt);
      },
      size: function () { var d = resize(); return { W: canvas.width / d, H: canvas.height / d }; }
    };
  };

  /* ---------- Konfeti ir monetos ---------- */
  var parts = [];
  var COLS = ['#FF6B4A', '#FFC93C', '#35B86B', '#6FD3FF', '#FF8FA3'];
  MM.fx = {
    burst: function (W, H, n, coins) {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) n = Math.round(n / 4);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, s = 200 + Math.random() * 420;
        parts.push({ x: W / 2, y: H * 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 300, r: 5 + Math.random() * 7,
          c: COLS[i % COLS.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, life: 2.2, coin: coins && i % 3 === 0 });
      }
    },
    sparkle: function (x, y, n) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 160;
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 4 + Math.random() * 4, c: '#FFC93C', rot: 0, vr: 3, life: 1, star: true });
      }
    },
    draw: function (ctx, W, H, dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 0.99;
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.coin) { ellipse(ctx, 0, 0, p.r * 1.6, p.r * 1.6, 0, '#FFC93C', '#D99A12', 3); }
        else if (p.star) { ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); }
        else { ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); }
        ctx.restore();
      }
    }
  };

  /* Mažas statinis paveikslėlis (parduotuvės kortelėms) */
  MM.drawPreview = function (canvas, acc, bg) {
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    MM.drawBackground(ctx, W, H, bg, 0.5);
    var lm = MM.IDLE_POSE;
    var vw = H * 4 / 3, ox = (W - vw) / 2, z = 1.55;
    function P(i) { var p = lm[i]; if (!p || p[2] < 0.5) return null; return { x: ox + (1 - p[0]) * vw, y: p[1] * H }; }
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.42);
    drawPuppy(ctx, P, {}, acc, 0.3);
    ctx.restore();
  };
  MM.IDLE_POSE = IDLE;
})(window);
