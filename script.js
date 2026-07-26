(function () {
  const zone = document.querySelector('.badge-zone');
  const canvas = document.getElementById('ropeCanvas');
  const ctx = canvas.getContext('2d');
  const badge = document.getElementById('badge');

  const SEGMENTS = 14;
  let SEGMENT_LENGTH = 16;
  const GRAVITY = 0.6;
  const DAMPING = 0.985;
  const CONSTRAINT_ITERATIONS = 8;
  const MAX_REACH_RATIO = 0.62;

  let points = [];
  let anchor = { x: 0, y: 0 };
  let dragging = false;
  let mouse = { x: 0, y: 0 };
  let dprScale = 1;
  let t = 0;
  let zoneW = 0, zoneH = 0;
  let maxReach = 0;

  function computeAnchor() {
    anchor.x = zoneW * 0.5;
    anchor.y = 14;
  }

  function resize() {
    const rect = zone.getBoundingClientRect();
    zoneW = rect.width;
    zoneH = rect.height;
    dprScale = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = zoneW * dprScale;
    canvas.height = zoneH * dprScale;
    canvas.style.width = zoneW + 'px';
    canvas.style.height = zoneH + 'px';
    ctx.setTransform(dprScale, 0, 0, dprScale, 0, 0);

    computeAnchor();

    const badgeH = badge.offsetHeight || 300;
    const available = Math.max(70, zoneH - anchor.y - badgeH - 14);
    SEGMENT_LENGTH = Math.min(18, Math.max(7, available / (SEGMENTS - 1)));
    maxReach = SEGMENT_LENGTH * (SEGMENTS - 1) * MAX_REACH_RATIO;

    if (points.length === 0) {
      for (let i = 0; i < SEGMENTS; i++) {
        const y = anchor.y + i * SEGMENT_LENGTH;
        points.push({
          x: anchor.x, y: y,
          oldx: anchor.x, oldy: y,
          pinned: i === 0
        });
      }
      points[points.length - 1].x += Math.min(70, zoneW * 0.22);
      points[points.length - 2].x += Math.min(38, zoneW * 0.12);
    }
  }

  function getPos(evt) {
    const rect = zone.getBoundingClientRect();
    const src = evt.touches && evt.touches[0] ? evt.touches[0] : evt;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  badge.addEventListener('pointerdown', (e) => {
    dragging = true;
    badge.classList.add('dragging');
    mouse = getPos(e);
    try { badge.setPointerCapture(e.pointerId); } catch (err) {}
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    mouse = getPos(e);
  });

  function endDrag() {
    dragging = false;
    badge.classList.remove('dragging');
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const last = points[points.length - 1];
      last.x += (Math.random() - 0.5) * Math.min(140, zoneW * 0.4);
    }
  });

  function updatePoints() {
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const isLast = i === points.length - 1;

      if (dragging && isLast) {
        p.oldx = p.x;
        p.oldy = p.y;

        let targetX = mouse.x;
        let targetY = mouse.y;
        const ddx = targetX - anchor.x;
        const ddy = targetY - anchor.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist > maxReach) {
          const scale = maxReach / dist;
          targetX = anchor.x + ddx * scale;
          targetY = anchor.y + ddy * scale;
        }

        p.x = targetX;
        p.y = targetY;
        continue;
      }

      const vx = (p.x - p.oldx) * DAMPING;
      const vy = (p.y - p.oldy) * DAMPING;
      p.oldx = p.x;
      p.oldy = p.y;
      p.x += vx;
      p.y += vy + GRAVITY;
    }

    if (!dragging) {
      const last = points[points.length - 1];
      last.x += Math.sin(t * 0.0016) * 0.045;
    }
  }

  function constrainPoints() {
    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      points[0].x = anchor.x;
      points[0].y = anchor.y;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const diff = (SEGMENT_LENGTH - dist) / dist;
        const offX = dx * diff * 0.5;
        const offY = dy * diff * 0.5;

        const lastIndex = points.length - 1;
        if (!p1.pinned) { p1.x -= offX; p1.y -= offY; }
        if (!(dragging && i + 1 === lastIndex)) {
          p2.x += offX;
          p2.y += offY;
        }
      }
    }
  }

  function drawRope() {
    ctx.clearRect(0, 0, zoneW, zoneH);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const next = points[i + 1];
      const midx = (p.x + next.x) / 2;
      const midy = (p.y + next.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midx, midy);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    const grad = ctx.createLinearGradient(anchor.x, anchor.y, anchor.x, anchor.y + 260);
    grad.addColorStop(0, '#3ED598');
    grad.addColorStop(1, '#FFB454');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = 'rgba(11,15,20,0.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(anchor.x - 12, anchor.y - 10, 24, 14, 4);
    ctx.fillStyle = '#4B5A67';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#1A2027';
    ctx.fill();
  }

  function positionBadge() {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const angle = Math.atan2(dx, dy) * (180 / Math.PI);
    
    const velocityX = last.x - last.oldx;
    const dynamicTilt = Math.max(-35, Math.min(35, velocityX * 1.2));
    const clampedAngle = Math.max(-75, Math.min(75, angle + dynamicTilt * 0.3));

    badge.style.transform =
      `translate(${last.x}px, ${last.y}px) translate(-50%, -6px) rotate(${clampedAngle}deg)`;
  }

  function loop(timestamp) {
    t = timestamp || 0;
    updatePoints();
    constrainPoints();
    drawRope();
    positionBadge();
    requestAnimationFrame(loop);
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(zone);
  } else {
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
  }

  resize();
  requestAnimationFrame(loop);

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
})();