(() => {
  const $ = id => document.getElementById(id);
  const hero = $('hero'), canvas = $('hero-canvas'), ctx = canvas.getContext('2d');
  const media = document.querySelector('.hero-media'), copy = $('hero-copy'), bar = $('loading-bar'), card = $('loading-card'), header = $('header');
  const total = +canvas.dataset.frames || 120;
  let imgs = [], mode = 'frames', loaded = 0, cur = 0, ready = false;
  const url = i => `frames/frame_${String(i + 1).padStart(3, '0')}.webp`;
  const mk = src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  function resize() { const d = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * d; canvas.height = innerHeight * d; draw(); }
  function cover(im, a, z) {
    const s = Math.max(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight) * z, w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.globalAlpha = a; ctx.drawImage(im, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
  function draw() {
    if (!ready) return; ctx.globalAlpha = 1; ctx.fillStyle = '#190b0e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (mode === 'frames') { const im = imgs[Math.round(cur)] || imgs.find(Boolean); im && cover(im, 1, 1); return; }
    // fallback: cinematic crossfade + slow zoom through boutique photos
    const n = imgs.length, p = cur / (total - 1) * (n - 1), i = Math.floor(p), f = p - i, e = f * f * (3 - 2 * f);
    cover(imgs[i], 1, 1 + f * .08);
    if (imgs[i + 1]) cover(imgs[i + 1], e, 1.08 - e * .08);
    ctx.globalAlpha = 1;
  }
  function finish() { if (ready) return; ready = true; media.classList.add('is-ready'); card.classList.add('is-hidden'); resize(); }

  (async () => {
    const first = await mk(url(0));
    if (first) {
      imgs[0] = first; loaded = 1; resize();
      const q = [...Array(total).keys()].slice(1); let n = 0;
      await Promise.all(Array(6).fill(0).map(async () => { while (n < q.length) { const i = q[n++]; imgs[i] = await mk(url(i)); bar.style.width = (++loaded / total * 100) + '%'; if (loaded > 8) finish(); } }));
    } else {
      mode = 'slides';
      const r = await Promise.all(window.HERO_SLIDES.map(mk)); imgs = r.filter(Boolean);
    }
    if (imgs.length) finish(); else card.classList.add('is-hidden');
  })();

  let target = 0;
  function tick() {
    const r = hero.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    target = p * (total - 1); cur += (target - cur) * .1; if (Math.abs(target - cur) < .01) cur = target;
    draw();
    const f = Math.min(1, p / .2); copy.style.opacity = 1 - f; copy.style.transform = `translateY(calc(-50% - ${f * 40}px))`;
    header.classList.toggle('scrolled', r.bottom < innerHeight * 0.9 || scrollY > 40);
    requestAnimationFrame(tick);
  }
  addEventListener('resize', resize); requestAnimationFrame(tick);

  // posts from Supabase (public read)
  function render(list, el, offer) {
    el.textContent = '';
    if (!list.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = offer ? 'No active offers right now.' : 'New sarees arriving soon.'; el.appendChild(p); return; }
    list.forEach(it => {
      const c = document.createElement('article'); c.className = 'card';
      if (it.image_url) { const im = document.createElement('img'); im.src = it.image_url; im.alt = it.title; im.loading = 'lazy'; im.style.aspectRatio = '3/4'; c.appendChild(im); }
      const d = document.createElement('div');
      if (offer) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = it.badge || 'Offer'; d.appendChild(b); }
      const h = document.createElement('h3'); h.textContent = it.title;
      const p = document.createElement('p'); p.textContent = it.description || '';
      const pr = document.createElement('b'); pr.textContent = it.price || '';
      const a = document.createElement('a'); a.className = 'hx-btn'; a.textContent = 'Enquire on WhatsApp'; a.target = '_blank'; a.rel = 'noopener';
      a.href = 'https://wa.me/918779521297?text=' + encodeURIComponent('Enquiry: ' + it.title);
      d.append(h, p, pr, document.createElement('br'), a); c.appendChild(d); el.appendChild(c);
    });
    el.querySelectorAll('.card').forEach(c => io.observe(c));
  }
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(c => io.observe(c));
  (async () => {
    let rows = [];
    try {
      if (!window.supabase || /YOUR-/.test(window.SUPABASE_URL || '')) throw new Error('not configured');
      const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      const { data, error } = await sb.from('posts').select('*').order('created_at', { ascending: false }).limit(60);
      if (error) throw error; rows = data || [];
    } catch (e) { console.warn('Posts unavailable:', e.message || e); }
    const today = new Date().toISOString().slice(0, 10);
    render(rows.filter(r => r.type === 'saree'), $('sarees'), false);
    render(rows.filter(r => r.type === 'offer' && (!r.expires_at || r.expires_at >= today)), $('offer-list'), true);
  })();
})();
