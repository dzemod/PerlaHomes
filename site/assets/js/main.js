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

  const policy = document.getElementById('policy');
  const policyHTML = {};
  if (policy) {
    policyHTML.en = policy.innerHTML;
    document.querySelectorAll('template[data-policy]').forEach((tpl) => { policyHTML[tpl.dataset.policy] = tpl.innerHTML; });
  }

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

    const page = document.body.dataset.page || 'home';
    document.title = t(page === 'home' ? 'meta.title' : `${page}.meta.title`);
    const meta = (sel, v) => { const m = document.querySelector(sel); if (m) m.content = v; };
    meta('meta[name="description"]', t(page === 'home' ? 'meta.description' : `${page}.meta.description`));
    meta('meta[property="og:description"]', t('hero.line'));
    meta('meta[property="og:locale"]', OG_LOCALE[lang]);
    // links between pages carry the language (works even when localStorage is blocked)
    document.querySelectorAll('a[href^="privacy.html"], a[href^="index.html"]').forEach((a) => {
      const [file, hash] = a.getAttribute('href').replace(/\?[^#]*/, '').split('#');
      a.setAttribute('href', `${file}${lang === 'en' ? '' : `?lang=${lang}`}${hash ? `#${hash}` : ''}`);
    });
    // privacy.html: the policy text is a full document per language (<template data-policy="es|ru">, EN inline)
    if (policy) {
      policy.innerHTML = policyHTML[lang] || policyHTML.en;
      policy.lang = lang;
    }

    renderProperties();
    if (faqItems.length) faqSchema();
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
    const alt = name;
    const missing = ['status', 'bedrooms', 'bathrooms', 'area', 'description'].filter((k) => p[k] === null || p[k] === undefined);
    const tag = p.status ? `<span class="pcard__tag">${esc(t(`props.status.${p.status}`))}</span>` : '';
    return `<li class="pcard">${p.internal ? `<!-- internal: ${esc(p.internal)} -->` : ''}${missing.length ? todo(missing.join(', ')) : ''}
      <div class="pcard__media">
        <img src="${img}-800.webp" srcset="${img}-800.webp 800w, ${img}.webp 1600w" sizes="(min-width: 1200px) 420px, (min-width: 600px) 46vw, 100vw" alt="${esc(alt)}" loading="lazy" width="800" height="600">
        ${tag}
      </div>
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
      msg.dispatchEvent(new Event('change'));
      return;
    }
    const p = properties.properties.find((x) => String(x.id) === id);
    if (p) {
      msg.value = t('props.interested').replace('{name}', local(p.name)).replace('{price}', p.price ? price(p.price) : t('props.price'));
      msg.dispatchEvent(new Event('change'));
    }
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

  /* ---------- Contact form -> WhatsApp (TODO: real backend from client) ----------
     Validation (inline errors on blur and on submit) + anti-spam without captcha:
     honeypot, 3-second time trap, max 3 requests per browser per 10 minutes. */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) initForm(contactForm);
  function initForm(form) {
    const success = form.querySelector('.form__success');
    const notice = form.querySelector('.form__notice');
    const sendBtn = form.querySelector('.form__send');
    const counter = form.querySelector('[data-count]');
    const MSG_MAX = 1000;
    const RATE = { key: 'perla-form-sends', max: 3, window: 10 * 60 * 1000 };
    const MIN_FILL_MS = 3000;

    const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} '’\-]*$/u;
    const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@(?:[^\s@<>()[\]\\,;:".]+\.)+[^\s@<>()[\]\\,;:".\d]{2,}$/u;
    const PHONE_CHARS = /[^\d\s+()\-]/g; // for replace()
    const PHONE_BAD = /[^\d\s+()\-]/;    // for test()
    // links: a scheme, "www." or a word followed by a common domain ending (.com, .ru, .xyz …)
    const LINK_RE = /(?:https?:\/\/|www\.|[\p{L}\d-]+\.(?:com|net|org|info|biz|xyz|top|online|site|club|shop|store|live|pro|app|dev|link|click|io|ru|su|рф|es|eu|uk|de|fr|nl|pl|ua|by|kz|cn|tk|ml|ga|cf|gq|cc|ws|ly|gl)(?![\p{L}\d]))/iu;

    // Each check returns an i18n error key, or '' when the value is valid
    const rules = {
      name: (v) => (!v ? 'form.err.name' : v.length < 2 || v.length > 60 ? 'form.err.name.length' : !NAME_RE.test(v) ? 'form.err.name.chars' : ''),
      email: (v) => (!v ? 'form.err.email.required' : v.length > 100 ? 'form.err.email.length' : !EMAIL_RE.test(v) ? 'form.err.email' : ''),
      phone: (v) => {
        if (!v) return '';
        const digits = v.replace(/\D/g, '').length;
        return PHONE_BAD.test(v) || digits < 7 || digits > 15 ? 'form.err.phone' : '';
      },
      language: (v) => (LANGS.includes(v) ? '' : 'form.err.lang'),
      message: (v) => (v.length > MSG_MAX ? 'form.err.message.length' : LINK_RE.test(v) ? 'form.err.message.links' : ''),
      consent: (_, el) => (el.checked ? '' : 'form.err.consent'),
    };
    const clean = (el) => {
      if (el.type === 'checkbox' || el.tagName === 'SELECT') return el.value;
      let v = el.value.trim();
      if (el.name === 'name' || el.name === 'phone') v = v.replace(/\s+/g, ' ');
      if (v !== el.value) el.value = v;
      return v;
    };
    function check(el) {
      const key = rules[el.name](clean(el), el);
      const field = el.closest('.field');
      const err = field.querySelector('.field__error');
      field.classList.toggle('is-invalid', !!key);
      el.setAttribute('aria-invalid', String(!!key));
      if (key) { err.dataset.i18n = key; err.textContent = t(key); }
      return !key;
    }
    const fields = Object.keys(rules).map((n) => form.elements[n]);

    // Phone: block anything but digits, spaces, + ( ) - while typing; strip it from pastes and autofill
    const phone = form.elements.phone;
    phone.addEventListener('beforeinput', (e) => {
      if (e.data && /^insert/.test(e.inputType) && !/^insertFrom/.test(e.inputType) && PHONE_BAD.test(e.data)) e.preventDefault();
    });
    phone.addEventListener('input', () => {
      const v = phone.value.replace(PHONE_CHARS, '');
      if (v !== phone.value) phone.value = v;
    });

    const updateCount = () => { counter.textContent = form.elements.message.value.length; };
    form.elements.message.addEventListener('input', updateCount);
    form.elements.message.addEventListener('change', updateCount);

    // Errors appear on blur (once the field was touched) and on submit; a shown error updates live while typing
    fields.forEach((el) => {
      el.addEventListener('blur', () => { if (el.dataset.touched || el.closest('.field.is-invalid')) check(el); });
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
        el.dataset.touched = '1';
        if (el.closest('.field.is-invalid')) check(el);
      });
    });
    form.addEventListener('input', () => { success.hidden = true; notice.hidden = true; });

    // Time trap: the clock starts when the form first becomes visible
    let shownAt = 0;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) { shownAt = Date.now(); io.disconnect(); }
      });
      io.observe(form);
    } else shownAt = Date.now();

    const recentSends = () => {
      let list = [];
      try { list = JSON.parse(store.get(RATE.key) || '[]'); } catch { list = []; }
      const now = Date.now();
      return (Array.isArray(list) ? list : []).filter((ts) => typeof ts === 'number' && now - ts < RATE.window && ts <= now);
    };

    let busy = false;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (busy) return;
      if (form.elements.website.value) return;                    // honeypot filled: silently ignore
      if (!shownAt || Date.now() - shownAt < MIN_FILL_MS) return; // faster than a person: ignore

      const ok = fields.map(check).every(Boolean);
      success.hidden = true;
      notice.hidden = true;
      if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }

      const sends = recentSends();
      if (sends.length >= RATE.max) { notice.hidden = false; return; }

      busy = true;
      sendBtn.disabled = true;
      sendBtn.setAttribute('aria-busy', 'true');
      const v = (n) => form.elements[n].value.trim();
      const lines = [
        `${t('form.name')}: ${v('name')}`,
        `${t('form.email')}: ${v('email')}`,
        v('phone') && `${t('form.phone')}: ${v('phone')}`,
        `${t('form.lang')}: ${form.elements.language.selectedOptions[0].text}`,
        v('message'),
      ].filter(Boolean);
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      store.set(RATE.key, JSON.stringify([...sends, Date.now()]));
      success.hidden = false;
      form.reset();
      form.elements.language.value = lang;
      fields.forEach((el) => { delete el.dataset.touched; });
      updateCount();
      setTimeout(() => { busy = false; sendBtn.disabled = false; sendBtn.removeAttribute('aria-busy'); }, 2000);
    });
  }

  /* ---------- Cookie consent ----------
     Choice is stored in localStorage "perla-consent" = { version, date, necessary, analytics, marketing }
     for 12 months; the banner returns after that or when CONSENT_VERSION changes (bump it when the policy changes).
     Non-essential scripts are written as <script type="text/plain" data-consent="analytics|marketing" data-src="…">
     and only run after that category is accepted. Today the site has none. */
  const CONSENT_KEY = 'perla-consent';
  const CONSENT_VERSION = 1;
  const OPTIONAL = ['analytics', 'marketing'];
  const banner = document.getElementById('consent');
  const panel = document.getElementById('consent-panel');
  const usedCats = OPTIONAL.filter((c) => document.querySelector(`script[data-consent="${c}"]`));
  try { localStorage.removeItem('perla-cookies'); } catch { /* old banner key */ }

  function readConsent() {
    let c = null;
    try { c = JSON.parse(store.get(CONSENT_KEY)); } catch { c = null; }
    if (!c || c.version !== CONSENT_VERSION || !c.date) return null;
    const expires = new Date(c.date);
    expires.setMonth(expires.getMonth() + 12);
    return Number.isNaN(expires.getTime()) || expires < new Date() ? null : c;
  }
  let consent = readConsent();

  function runConsented() {
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach((s) => {
      if (!consent || !consent[s.dataset.consent] || s.dataset.ran) return;
      s.dataset.ran = '1';
      const n = document.createElement('script');
      [...s.attributes].forEach((a) => { if (!['type', 'data-consent', 'data-src', 'data-ran'].includes(a.name)) n.setAttribute(a.name, a.value); });
      if (s.dataset.src) n.src = s.dataset.src; else n.textContent = s.textContent;
      s.after(n);
    });
  }

  // While the banner is visible the WhatsApp button rides above it (--consent-h, see .wa)
  const setConsentH = () => document.documentElement.style.setProperty('--consent-h', `${banner.offsetHeight}px`);
  if ('ResizeObserver' in window) new ResizeObserver(setConsentH).observe(banner);
  function showBanner(show) {
    banner.hidden = !show;
    document.documentElement.classList.toggle('consent-open', show);
    if (show) setConsentH();
  }

  function saveConsent(choice) {
    const before = consent;
    consent = { version: CONSENT_VERSION, date: new Date().toISOString(), necessary: true, analytics: !!choice.analytics, marketing: !!choice.marketing };
    store.set(CONSENT_KEY, JSON.stringify(consent));
    const hadFocus = banner.contains(document.activeElement);
    showBanner(false);
    if (hadFocus) { const m = document.getElementById('main'); m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
    // A withdrawn category whose scripts already ran can only be switched off by reloading the page
    const withdrawn = before && OPTIONAL.some((c) => before[c] && !consent[c] && document.querySelector(`script[data-consent="${c}"][data-ran]`));
    if (withdrawn) location.reload(); else runConsented();
  }

  function openPanel() {
    OPTIONAL.forEach((c) => {
      const row = panel.querySelector(`[data-consent-row="${c}"]`);
      row.hidden = !usedCats.includes(c);
      row.querySelector('input').checked = !!(consent && consent[c]);
    });
    panel.querySelector('[data-consent-none]').hidden = usedCats.length > 0;
    if (typeof panel.showModal === 'function') panel.showModal(); else panel.setAttribute('open', '');
  }
  const closePanel = () => { if (typeof panel.close === 'function') panel.close(); else panel.removeAttribute('open'); };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-consent-action]');
    if (b) {
      const all = Object.fromEntries(OPTIONAL.map((c) => [c, usedCats.includes(c)]));
      switch (b.dataset.consentAction) {
        case 'accept': saveConsent(all); closePanel(); break;
        case 'reject': saveConsent({}); break;
        case 'save': saveConsent(Object.fromEntries(OPTIONAL.map((c) => [c, panel.querySelector(`input[name="${c}"]`).checked]))); closePanel(); break;
        case 'settings': openPanel(); break;
        default:
      }
      return;
    }
    if (e.target.closest('[data-cookie-open]')) openPanel();
    else if (e.target === panel) closePanel(); // click on the backdrop
  });

  runConsented();
  const consentInit = () => { if (!consent) showBanner(true); };

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
    document.getElementById('property-list') ? fetch('assets/data/properties.json').then((r) => r.json()) : null,
  ]).then(([d, p]) => {
    dict = d;
    properties = p;
    applyLang(initial);
    consentInit();
    animate();
    // The property cards render after load and push later sections down: re-run a /#section jump
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }));
  }).catch(() => {
    consentInit();
    document.querySelectorAll('[data-anim="hero"]').forEach((el) => { el.style.opacity = 1; });
  });
})();
