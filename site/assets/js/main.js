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

  /* ---------- i18n ---------- */
  function applyLang(next) {
    lang = LANGS.includes(next) ? next : 'en';
    document.documentElement.lang = lang;
    const prefLang = document.getElementById('f-lang');
    if (prefLang) prefLang.value = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const v = t(el.dataset.i18n);
      // glue the last two words of longer texts so no word sits alone on the last line
      const glue = v && !/^H[1-3]$/.test(el.tagName) && v.split(' ').length >= 4;
      if (v) el.textContent = glue ? v.replace(/ (\S+)$/,' $1') : v;
    });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('.lang__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.querySelectorAll('.lang__opt').forEach((b) => {
      if (b.dataset.lang === lang) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-lang-dd]').forEach((dd) => {
      dd.querySelector('.lang__code').textContent = lang.toUpperCase();
      const name = dd.querySelector(`.lang__opt[data-lang="${lang}"]`).textContent;
      dd.querySelector('.lang__toggle').setAttribute('aria-label', `${t('lang.label')}: ${name}`);
    });

    document.title = t('meta.title');
    document.querySelector('meta[name="description"]').content = t('meta.description');
    document.querySelector('meta[property="og:description"]').content = t('hero.line');
    document.querySelector('meta[property="og:locale"]').content = OG_LOCALE[lang];

    renderProperties();
    faqSchema();
    store.set('perla-lang', lang);
    const url = new URL(location.href);
    if (lang === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  }

  document.querySelectorAll('.lang__btn').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  /* Language dropdown: current code + chevron; keyboard: arrows, Home/End, Escape, Tab */
  document.querySelectorAll('[data-lang-dd]').forEach((dd) => {
    const toggle = dd.querySelector('.lang__toggle');
    const opts = [...dd.querySelectorAll('.lang__opt')];
    const isOpen = () => dd.classList.contains('is-open');
    const setOpen = (open, focus) => {
      dd.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open && focus) (opts.find((o) => o.dataset.lang === lang) || opts[0]).focus();
      if (!open && focus) toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(!isOpen(), false));
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true, true); }
    });
    opts.forEach((o) => o.addEventListener('click', () => { applyLang(o.dataset.lang); setOpen(false, true); }));
    dd.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      const i = opts.indexOf(document.activeElement);
      const go = (n) => { e.preventDefault(); opts[(n + opts.length) % opts.length].focus(); };
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false, true); }
      else if (e.key === 'ArrowDown') go(i + 1);
      else if (e.key === 'ArrowUp') go(i < 0 ? -1 : i - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(-1);
    });
    dd.addEventListener('focusout', (e) => { if (!dd.contains(e.relatedTarget)) setOpen(false, false); });
    document.addEventListener('click', (e) => { if (isOpen() && !dd.contains(e.target)) setOpen(false, false); });
  });

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

  // Selected properties: real developments. Missing fields are not shown — a TODO comment marks them in the markup.
  const LOCALES = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };
  const price = (n) => new Intl.NumberFormat(LOCALES[lang] || 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const todo = (what) => `<!-- TODO: from client — ${what} -->`;

  function cardHTML(p) {
    const img = `assets/img/properties/${p.id}/${p.id}-1`;
    const name = local(p.name);
    const loc = local(p.location);
    const alt = loc ? `${name}, ${loc}` : name;
    const missing = ['location', 'status', 'bedrooms', 'bathrooms', 'area', 'description'].filter((k) => p[k] === null || p[k] === undefined);
    const tag = p.status ? `<span class="pcard__tag">${esc(t(`props.status.${p.status}`))}</span>` : '';
    return `<li class="pcard">${missing.length ? todo(missing.join(', ')) : ''}
      <div class="pcard__media">
        <img src="${img}-800.webp" srcset="${img}-800.webp 800w, ${img}.webp 1600w" sizes="(min-width: 1200px) 420px, (min-width: 600px) 46vw, 100vw" alt="${esc(alt)}" loading="lazy" width="800" height="600">
        ${tag}
      </div>
      <p class="pcard__loc">${loc ? esc(loc) : ''}</p>
      <h3 class="pcard__name">${esc(name)}</h3>
      <p class="pcard__price">${p.price ? esc(price(p.price)) : ''}</p>
      <a class="btn btn--outline pcard__btn" href="#contact" data-request="${esc(p.id)}">${esc(t('props.request'))}</a>
    </li>`;
  }

  function renderProperties() {
    if (!properties) return;
    const list = document.getElementById('property-list');
    list.innerHTML = properties.properties.map(cardHTML).join('');
    const f = properties.featured;
    document.querySelectorAll('#featured [data-field]').forEach((el) => { el.textContent = field(f, el.dataset.field); });
  }

  /* Request details -> prefill the contact form */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-request]');
    if (!btn || !properties) return;
    const id = btn.dataset.request;
    const msg = document.getElementById('f-message');
    if (id === 'featured') {
      const f = properties.featured;
      msg.value = `${t('form.requestFor')} ${field(f, 'name')}, ${field(f, 'district')}`;
      return;
    }
    const p = properties.properties.find((x) => String(x.id) === id);
    if (p) msg.value = t('props.interested').replace('{name}', local(p.name));
  });


  /* Keyboard vs pointer: text fields match :focus-visible even on click, so their ring is keyed to this class */
  const root = document.documentElement;
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab') root.classList.add('is-keyboard'); });
  document.addEventListener('pointerdown', () => root.classList.remove('is-keyboard'));

  /* ---------- Header ---------- */
  const header = document.getElementById('header');
  const burger = header.querySelector('.burger');
  const menu = document.getElementById('mobile-menu');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  // --header-h = real height of the header bar (not the open mobile menu); follows resizes and any shrink on scroll
  const headerBar = header.querySelector('.header__inner');
  const setHeaderH = () => document.documentElement.style.setProperty('--header-h', `${headerBar.getBoundingClientRect().height}px`);
  setHeaderH();
  if ('ResizeObserver' in window) new ResizeObserver(setHeaderH).observe(headerBar);
  else window.addEventListener('resize', setHeaderH);
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.menu'));
    menu.hidden = !open;
    header.classList.toggle('is-open', open);
  }
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

  /* ---------- FAQ accordion: one open at a time, height + fade ---------- */
  const faqItems = [...document.querySelectorAll('[data-faq] .faq__item')];
  function setFaq(item, open) {
    const btn = item.querySelector('.faq__q');
    const panel = item.querySelector('.faq__a');
    if (btn.getAttribute('aria-expanded') === String(open)) return;
    btn.setAttribute('aria-expanded', String(open));
    item.classList.toggle('is-open', open);
    const gsap = window.gsap;
    if (!gsap || reduceMotion) { panel.hidden = !open; return; }
    gsap.killTweensOf(panel);
    if (open) {
      panel.hidden = false;
      gsap.fromTo(panel, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'height,opacity' });
    } else {
      gsap.to(panel, { height: 0, opacity: 0, duration: 0.4, ease: 'power2.out', onComplete: () => { panel.hidden = true; gsap.set(panel, { clearProps: 'height,opacity' }); } });
    }
  }
  faqItems.forEach((item) => {
    item.querySelector('.faq__q').addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      faqItems.forEach((other) => { if (other !== item) setFaq(other, false); });
      setFaq(item, open);
    });
  });

  /* FAQPage structured data in the current language */
  function faqSchema() {
    let el = document.getElementById('faq-ld');
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'faq-ld';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: lang,
      mainEntity: faqItems.map((_, i) => ({
        '@type': 'Question',
        name: t(`faq.${i + 1}.q`),
        acceptedAnswer: { '@type': 'Answer', text: t(`faq.${i + 1}.a`) },
      })),
    });
  }

  /* ---------- Contact form -> WhatsApp (TODO: real backend from client) ---------- */
  const form = document.getElementById('contact-form');
  const success = form.querySelector('.form__success');
  const invalid = (el, bad) => {
    el.closest('.field').classList.toggle('is-invalid', bad);
    el.setAttribute('aria-invalid', String(bad));
  };
  form.addEventListener('input', (e) => {
    if (e.target.closest('.field.is-invalid')) invalid(e.target, false);
    success.hidden = true;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const consent = form.consent.checked;
    invalid(form.name, !name);
    invalid(form.email, !okEmail);
    invalid(form.consent, !consent);
    if (!name || !okEmail || !consent) {
      success.hidden = true;
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    const lines = [
      `${t('form.name')}: ${name}`,
      `${t('form.email')}: ${email}`,
      form.phone.value.trim() && `${t('form.phone')}: ${form.phone.value.trim()}`,
      `${t('form.lang')}: ${form.language.selectedOptions[0].text}`,
      form.message.value.trim(),
    ].filter(Boolean);
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
    success.hidden = false;
    form.reset();
    form.language.value = lang;
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
    // then title and text rise.
    // data-wipe="stagger": one trigger, cards 0.15s apart. data-wipe="each": every row on its own.
    function wipe(item) {
      const photo = item.querySelector('.photo');
      const img = photo.querySelector('img');
      const text = [...item.querySelectorAll('h3, p')];
      return gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(photo, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power3.inOut', clearProps: 'clipPath' })
        .fromTo(img, { scale: 1.08 }, { scale: 1, duration: 1.6, clearProps: 'transform' }, 0)
        .fromTo(text, { opacity: 0, y: MOTION.y }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, clearProps: 'transform' }, 0.6);
    }
    // Footer: columns rise one by one.
    const footer = document.querySelector('[data-footer]');
    if (footer) {
      gsap.timeline({ scrollTrigger: { trigger: footer, start: 'top 85%', once: true }, defaults: { ease: MOTION.ease } })
        .fromTo(footer.querySelectorAll('[data-footer-item]'), { opacity: 0, y: MOTION.y }, { opacity: 1, y: 0, duration: MOTION.duration, stagger: 0.12, clearProps: 'transform' }, 0);
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
    // The property cards render after load and push later sections down: re-run a /#section jump
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }));
  }).catch(() => {
    document.querySelectorAll('[data-anim="hero"]').forEach((el) => { el.style.opacity = 1; });
  });
})();
