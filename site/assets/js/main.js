/* Perla Homes — one-page behaviour */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const LANGS = ['en', 'es', 'ru'];
  const OG_LOCALE = { en: 'en_GB', es: 'es_ES', ru: 'ru_RU' };
  const WHATSAPP = '34627986515';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let dict = {};
  let lang = 'en';
  let properties = null;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };
  const t = (key) => (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || '';

  /* ---------- Logo: single source in assets/img/logo.svg ---------- */
  fetch('assets/img/logo.svg')
    .then((r) => (r.ok ? r.text() : Promise.reject()))
    .then((svg) => {
      const clean = svg.replace(/<!--[\s\S]*?-->/g, '').trim();
      document.querySelectorAll('[data-logo]').forEach((el) => {
        el.innerHTML = clean;
        el.querySelector('svg').setAttribute('aria-hidden', 'true');
      });
    })
    .catch(() => { /* text fallback stays */ });

  /* ---------- i18n ---------- */
  function applyLang(next) {
    lang = LANGS.includes(next) ? next : 'en';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const v = t(el.dataset.i18n);
      // glue the last two words of longer texts so no word sits alone on the last line
      const glue = v && !/^H[1-3]$/.test(el.tagName) && v.split(' ').length >= 4;
      if (v) el.textContent = glue ? v.replace(/ (\S+)$/,' $1') : v;
    });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('.lang__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));

    document.title = t('meta.title');
    document.querySelector('meta[name="description"]').content = t('meta.description');
    document.querySelector('meta[property="og:description"]').content = t('hero.line');
    document.querySelector('meta[property="og:locale"]').content = OG_LOCALE[lang];

    renderProperties();
    store.set('perla-lang', lang);
    const url = new URL(location.href);
    if (lang === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  }

  document.querySelectorAll('.lang__btn').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  /* ---------- Properties (assets/data/properties.json) ---------- */
  // A field may be null (placeholder), a string, or {en, es, ru}.
  const local = (v) => (v && typeof v === 'object' ? v[lang] || v.en : v);
  const field = (p, key) => {
    const v = local(p[key]);
    const has = v !== null && v !== undefined && v !== '';
    switch (key) {
      case 'name': return has ? v : `${t('props.name')} ${typeof p.id === 'number' ? p.id : ''}`.trim();
      case 'district': return has ? v : t('props.district');
      case 'price': return has ? v : t('props.price');
      case 'area': return has ? `${v} m²` : t('props.area');
      case 'bedrooms': return has ? `${v} ${t('props.beds').replace(/^—\s*/, '')}` : t('props.beds');
      case 'bathrooms': return has ? `${v} ${t('props.baths').replace(/^—\s*/, '')}` : t('props.baths');
      case 'description': return has ? v : t('props.desc');
      default: return v || '';
    }
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function cardHTML(p) {
    const img = `assets/img/${p.image}`;
    return `<li class="card">
      <article class="card__inner">
        <picture class="card__media">
          <source type="image/webp" srcset="${img}-640.webp 640w, ${img}-1280.webp 1280w" sizes="(min-width: 900px) 320px, 80vw">
          <img src="${img}-640.jpg" srcset="${img}-640.jpg 640w, ${img}-1280.jpg 1280w" sizes="(min-width: 900px) 320px, 80vw" alt="${esc(t(p.alt))}" loading="lazy" width="640" height="478">
        </picture>
        <span class="card__badge">${esc(t('props.illustrative'))}</span>
        <div class="card__info">
          <h3 class="card__name">${esc(field(p, 'name'))}</h3>
          <p class="card__price">${esc(field(p, 'price'))}</p>
          <div class="card__details">
            <p class="card__district"><span class="pearl-dot" aria-hidden="true"></span>${esc(field(p, 'district'))}</p>
            <p class="card__specs"><span>${esc(field(p, 'area'))}</span><span>${esc(field(p, 'bedrooms'))}</span><span>${esc(field(p, 'bathrooms'))}</span></p>
            <a class="btn btn--light" href="#contact" data-request="${p.id}">${esc(t('props.request'))}</a>
          </div>
        </div>
      </article>
    </li>`;
  }

  function renderProperties() {
    if (!properties) return;
    const list = document.getElementById('property-list');
    list.innerHTML = properties.properties.map(cardHTML).join('');
    const f = properties.featured;
    document.querySelectorAll('#featured [data-field]').forEach((el) => { el.textContent = field(f, el.dataset.field); });
    updateArrows();
  }

  /* Request details -> prefill the contact form */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-request]');
    if (!btn || !properties) return;
    const id = btn.dataset.request;
    const p = id === 'featured' ? properties.featured : properties.properties.find((x) => String(x.id) === id);
    if (!p) return;
    const msg = document.getElementById('f-message');
    msg.value = `${t('form.requestFor')} ${field(p, 'name')}, ${field(p, 'district')}`;
  });

  /* ---------- Carousel ---------- */
  const track = document.getElementById('property-list');
  const prev = document.querySelector('[data-carousel-prev]');
  const next = document.querySelector('[data-carousel-next]');
  function step() {
    const card = track.querySelector('.card');
    return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24) : 400;
  }
  function updateArrows() {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  }
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  track.addEventListener('scroll', () => requestAnimationFrame(updateArrows), { passive: true });
  window.addEventListener('resize', updateArrows);

  /* ---------- Header ---------- */
  const header = document.getElementById('header');
  const burger = header.querySelector('.burger');
  const menu = document.getElementById('mobile-menu');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.menu'));
    menu.hidden = !open;
    header.classList.toggle('is-open', open);
  }
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

  /* ---------- Contact form -> WhatsApp (TODO: real backend from client) ---------- */
  const form = document.getElementById('contact-form');
  const status = form.querySelector('.form__status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const consent = form.consent.checked;
    form.name.parentElement.classList.toggle('is-invalid', !name);
    form.email.parentElement.classList.toggle('is-invalid', !okEmail);
    form.querySelector('.check').classList.toggle('is-invalid', !consent);
    if (!name || !okEmail || !consent) {
      status.textContent = t('form.error');
      status.classList.add('is-error');
      return;
    }
    status.textContent = t('form.sending');
    status.classList.remove('is-error');
    const lines = [
      `${t('form.name')}: ${name}`,
      `${t('form.email')}: ${email}`,
      form.phone.value.trim() && `${t('form.phone')}: ${form.phone.value.trim()}`,
      form.message.value.trim(),
    ].filter(Boolean);
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });

  /* ---------- Cookie banner (TODO: legal text + categories from client) ---------- */
  const cookie = document.getElementById('cookie');
  if (!store.get('perla-cookies')) cookie.hidden = false;
  cookie.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cookie]');
    if (!b) return;
    store.set('perla-cookies', b.dataset.cookie);
    cookie.hidden = true;
  });
  document.querySelector('[data-cookie-open]').addEventListener('click', () => { cookie.hidden = false; });

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Motion: one calm sequence per section ---------- */
  // One sequence per section: label → heading → text → button → content.
  // Text: opacity + 16px rise. Photos: opacity + scale 1.04 → 1. Played once.
  const MOTION = { y: 16, duration: 0.7, ease: 'power2.out', stagger: 0.08 };
  const PHOTOS = '.photo img, .card__media img, .band__media img';

  function sequence(section) {
    const items = [];
    const take = (el) => { if (el && !items.includes(el)) items.push(el); };
    const head = section.querySelector('.section-head, .band__content > *:not(.contact-banner), .contact-banner');
    if (head && head.classList.contains('contact-banner')) [...head.children].forEach(take);
    else if (head && head.classList.contains('section-head')) [...head.children].forEach(take);
    else section.querySelectorAll('.band__content > *').forEach(take);
    section.querySelectorAll('[data-reveal-items]').forEach((g) => [...g.children].forEach(take));
    return items;
  }

  function animate() {
    const gsap = window.gsap;
    if (!gsap || reduceMotion) {
      document.querySelectorAll('[data-anim="hero"]').forEach((el) => { el.style.opacity = 1; });
      return;
    }
    gsap.registerPlugin(window.ScrollTrigger);
    // Hero photo is the LCP image: it is never hidden, only the text sequence plays.
    gsap.fromTo('[data-anim="hero"]', { opacity: 0, y: MOTION.y }, {
      opacity: 1, y: 0, duration: MOTION.duration, ease: MOTION.ease, stagger: MOTION.stagger, delay: 0.1, clearProps: 'transform',
    });

    document.querySelectorAll('[data-reveal]').forEach((section) => {
      const items = sequence(section);
      const photos = [...section.querySelectorAll(PHOTOS)].filter((img) => !img.closest('[data-wipe]'));
      const trigger = { trigger: section, start: 'top 82%', once: true };
      if (items.length) {
        gsap.fromTo(items, { opacity: 0, y: MOTION.y }, {
          opacity: 1, y: 0, duration: MOTION.duration, ease: MOTION.ease, stagger: MOTION.stagger,
          clearProps: 'transform', scrollTrigger: trigger,
        });
      }
      if (photos.length) {
        gsap.fromTo(photos, { opacity: 0, scale: 1.04 }, {
          opacity: 1, scale: 1, duration: MOTION.duration + 0.3, ease: MOTION.ease, stagger: MOTION.stagger,
          clearProps: 'transform', scrollTrigger: trigger,
        });
      }
    });

    // Photo cards: clip-path wipe left → right with the image settling 1.08 → 1,
    // then the gold line draws, then title and text rise.
    // data-wipe="stagger": one trigger, cards 0.15s apart. data-wipe="each": every row on its own.
    function wipe(item) {
      const photo = item.querySelector('.photo');
      const img = photo.querySelector('img');
      const line = item.querySelector('.gold-line');
      const text = [...item.querySelectorAll('.gold-line ~ *')];
      return gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(photo, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power3.inOut', clearProps: 'clipPath' })
        .fromTo(img, { scale: 1.08 }, { scale: 1, duration: 1.6, clearProps: 'transform' }, 0)
        .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.6, clearProps: 'transform' }, 0.65)
        .fromTo(text, { opacity: 0, y: MOTION.y }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, clearProps: 'transform' }, 0.8);
    }
    document.querySelectorAll('[data-wipe]').forEach((group) => {
      const items = [...group.children];
      if (group.dataset.wipe === 'stagger') {
        const tl = gsap.timeline({ paused: true });
        items.forEach((item, i) => tl.add(wipe(item), i * 0.15));
        window.ScrollTrigger.create({ trigger: group, start: 'top 80%', once: true, onEnter: () => tl.play() });
      } else {
        items.forEach((item) => {
          const tl = wipe(item).pause();
          window.ScrollTrigger.create({ trigger: item, start: 'top 80%', once: true, onEnter: () => tl.play() });
        });
      }
    });
  }

  /* ---------- Boot ---------- */
  const params = new URLSearchParams(location.search).get('lang');
  const initial = params || store.get('perla-lang') || 'en';
  Promise.all([
    fetch('assets/data/i18n.json').then((r) => r.json()),
    fetch('assets/data/properties.json').then((r) => r.json()),
  ]).then(([d, p]) => {
    dict = d;
    properties = p;
    applyLang(initial);
    animate();
  }).catch(() => {
    document.querySelectorAll('[data-anim="hero"]').forEach((el) => { el.style.opacity = 1; });
  });
})();
