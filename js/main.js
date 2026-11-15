// Gavigruplloret Reformas · interacción de la página
(() => {
  const html = document.documentElement;
  html.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) html.classList.add('motion');
  const S = window.SITE || {};
  const T = (m) => (window.I18N ? I18N.t(m) : m.es);
  const lang = () => html.lang || 'es';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mqMobile = matchMedia('(max-width: 980px)');

  /* ---------- abierto / cerrado con la hora de Lloret */
  const DAY = {
    es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    ca: ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  };
  function nowLocal() {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: S.tz || 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t)?.value;
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      return { day, h: +get('hour') + +get('minute') / 60 };
    } catch (_) { const d = new Date(); return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60 }; }
  }
  const hh = (h) => (lang() === 'fr' ? `${h} h` : `${h}:00`);
  function status() {
    const H = S.hours || {};
    const { day, h } = nowLocal();
    const today = H[day];
    const open = !!(today && h >= today[0] && h < today[1]);
    let text;
    if (open) {
      text = T({ es: `Abierto ahora · hasta las ${hh(today[1])}`, ca: `Obert ara · fins a les ${hh(today[1])}`, en: `Open now · until ${hh(today[1])}`, fr: `Ouvert · jusqu’à ${hh(today[1])}` });
    } else if (today && h < today[0]) {
      text = T({ es: `Cerrado · abrimos hoy a las ${hh(today[0])}`, ca: `Tancat · obrim avui a les ${hh(today[0])}`, en: `Closed · we open today at ${hh(today[0])}`, fr: `Fermé · ouverture aujourd’hui à ${hh(today[0])}` });
    } else {
      let d = day, add = 0;
      do { d = (d + 1) % 7; add++; } while (!H[d] && add < 8);
      const at = H[d] ? H[d][0] : 9;
      const L = lang(), name = (DAY[L] || DAY.es)[d];
      text = add === 1
        ? T({ es: `Cerrado · abrimos mañana a las ${hh(at)}`, ca: `Tancat · obrim demà a les ${hh(at)}`, en: `Closed · we open tomorrow at ${hh(at)}`, fr: `Fermé · ouverture demain à ${hh(at)}` })
        : T({ es: `Cerrado · abrimos el ${name} a las ${hh(at)}`, ca: `Tancat · obrim ${name} a les ${hh(at)}`, en: `Closed · we open on ${name} at ${hh(at)}`, fr: `Fermé · ouverture ${name} à ${hh(at)}` });
    }
    $$('[data-status]').forEach((el) => { el.textContent = text; el.parentElement.classList.toggle('is-open', open); });
    $$('.hours tr').forEach((tr) => {
      const on = +tr.dataset.day === day;
      tr.classList.toggle('today', on);
      const th = tr.querySelector('th');
      if (on) th.dataset.today = T({ es: 'Hoy', ca: 'Avui', en: 'Today', fr: 'Aujourd’hui' }); else delete th.dataset.today;
    });
  }
  status();
  setInterval(status, 60000);
  document.addEventListener('langchange', status);

  /* ---------- cabecera y menú */
  const hd = $('.hd'), menuBtn = $('.hd-menu'), menu = $('#menu');
  let lenis = null;
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', T(open ? { es: 'Cerrar el menú', ca: 'Tanca el menú', en: 'Close the menu', fr: 'Fermer le menu' } : { es: 'Abrir el menú', ca: 'Obre el menú', en: 'Open the menu', fr: 'Ouvrir le menu' }));
    menu.hidden = !open;
    html.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  mqMobile.addEventListener('change', () => { if (!mqMobile.matches) setMenu(false); });

  /* ---------- desplazamiento suave y anclas */
  const hdH = () => hd.getBoundingClientRect().height;
  function goTo(target, extra = 0) {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY - hdH() + extra;
    if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    if (a.dataset.need) pickNeed(a.dataset.need);
    goTo(id === 'top' ? 0 : el);
    history.replaceState(null, '', '#' + id);
    if (id === 'presupuesto') setTimeout(() => $('#qf .chips input')?.focus({ preventScroll: true }), lenis ? 1100 : 400);
  });
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .11, smoothWheel: true, wheelMultiplier: .95 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- titular palabra a palabra */
  function split(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
  }
  let introDone = false;
  // i18n.js reescribe los [data-i18n] al aplicar el idioma: el titular se parte en palabras después, nunca antes
  // sin traducciones: el texto ya es el definitivo al cargar
  const langReady = window.I18N ? new Promise((res) => document.addEventListener('langchange', res, { once: true })) : Promise.resolve();
  document.addEventListener('langchange', () => {
    if (introDone) $('[data-split]').removeAttribute('aria-label');
    fitFooter();
  });

  /* ---------- entrada de la portada */
  async function intro() {
    try { await Promise.race([langReady, new Promise((r) => setTimeout(r, 2500))]); } catch (_) { /* sin idioma */ }
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (_) { /* sin fuentes */ }
    const h1 = $('[data-split]');
    const items = $$('.hero [data-in]');
    if (reduce || !window.gsap) { items.forEach((el) => el.classList.add('is-in')); introDone = true; return; }
    split(h1);
    const inner = $$('.w > span', h1);
    gsap.ticker.lagSmoothing(0);   // si el navegador va a saltos, la entrada no se queda a medias
    gsap.set(inner, { yPercent: 108 });
    const tw = gsap.to(inner, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: .055, delay: .1, onComplete: () => { introDone = true; } });
    setTimeout(() => { if (!introDone) { tw.progress(1); introDone = true; } }, 3200);
    items.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), 420 + i * 110));
  }

  /* ---------- barra fija en móvil */
  const mbar = $('.mbar');
  const ctaHero = $('.hero .cta'), quote = $('#presupuesto'), foot = $('.ft');
  let pastCta = false, inQuote = false, inTodo = false;
  const updBar = () => { const on = pastCta && !inQuote && !inTodo; mbar.classList.toggle('show', on); mbar.setAttribute('aria-hidden', String(!on)); $$('a', mbar).forEach((a) => (on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1'))); };
  new IntersectionObserver(([e]) => { pastCta = !e.isIntersecting && e.boundingClientRect.top < 0; updBar(); }).observe(ctaHero);
  const ioQ = new IntersectionObserver((es) => { inQuote = es.some((e) => e.isIntersecting); updBar(); }, { rootMargin: '0px 0px -30% 0px' });
  ioQ.observe(quote); ioQ.observe(foot);

  /* ---------- pie: la marca ocupa todo el ancho */
  function fitFooter() {
    const word = $('.ft-word'), brand = $('.ft-brand'), g = $('.ft-g');
    if (!word) return;
    word.style.fontSize = '100px';
    const w100 = word.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(brand).columnGap) || 0;
    const avail = brand.getBoundingClientRect().width - g.getBoundingClientRect().width - gap - 2;
    word.style.fontSize = Math.min(240, Math.max(28, 100 * avail / w100)) + 'px';
  }
  addEventListener('resize', fitFooter);
  (document.fonts?.ready || Promise.resolve()).then(fitFooter);

  /* ---------- formulario de presupuesto */
  const form = $('#qf');
  const NEED_MAP = { kitchen: ['kitchen'], bath: ['bath'], plumbing: ['plumbing', 'gas'], electric: ['electric', 'clima'], interior: ['interior', 'damp'], facade: ['facade', 'vertical'], build: ['build'] };
  function pickNeed(k) { (NEED_MAP[k] || []).forEach((v) => { const i = form.querySelector(`input[name="need"][value="${v}"]`); if (i) i.checked = true; }); }
  const field = (n) => form.elements[n];
  function setErr(input, errEl, bad) { if (input) input.setAttribute('aria-invalid', String(bad)); if (errEl) errEl.hidden = !bad; }
  function compose() {
    const needs = $$('input[name="need"]:checked', form).map((i) => i.nextElementSibling.textContent.trim());
    const when = field('when'); const whenTxt = when.options[when.selectedIndex].textContent.trim();
    const L = (m) => T(m);
    const lines = [
      L({ es: 'Hola, quiero pedir un presupuesto.', ca: 'Hola, vull demanar un pressupost.', en: 'Hello, I would like a quote.', fr: 'Bonjour, je souhaite un devis.' }),
      needs.length ? `${L({ es: 'Necesito', ca: 'Necessito', en: 'I need', fr: 'Besoin' })}: ${needs.join(', ')}` : '',
      `${L({ es: 'Nombre', ca: 'Nom', en: 'Name', fr: 'Nom' })}: ${field('name').value.trim()}`,
      `${L({ es: 'Teléfono', ca: 'Telèfon', en: 'Phone', fr: 'Téléphone' })}: ${field('tel').value.trim()}`,
      field('town').value.trim() ? `${L({ es: 'Población', ca: 'Població', en: 'Town', fr: 'Commune' })}: ${field('town').value.trim()}` : '',
      `${L({ es: 'Cuándo llamar', ca: 'Quan trucar', en: 'Best time to call', fr: 'Quand appeler' })}: ${whenTxt}`,
      field('msg').value.trim() ? `\n${field('msg').value.trim()}` : ''
    ];
    return lines.filter(Boolean).join('\n');
  }
  const out = $('#qf-out'), msgBox = $('#qf-msg'), copied = $('.qf-copied');
  let lastMsg = '';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nm = field('name'), tl = field('tel'), pv = field('privacy');
    const badName = nm.value.trim().length < 2;
    const badTel = tl.value.replace(/\D/g, '').length < 6;
    const badPriv = !pv.checked;
    setErr(nm, nm.parentElement.querySelector('.err'), badName);
    setErr(tl, tl.parentElement.querySelector('.err'), badTel);
    setErr(pv, $('.err-priv', form), badPriv);
    if (badName || badTel || badPriv) { (badName ? nm : badTel ? tl : pv).focus(); return; }
    lastMsg = compose();
    msgBox.textContent = lastMsg;
    const subj = T({ es: 'Petición de presupuesto', ca: 'Petició de pressupost', en: 'Quote request', fr: 'Demande de devis' });
    const mail = $('[data-send="mail"]', out), wa = $('[data-send="wa"]', out);
    if (S.email) { mail.href = `mailto:${S.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(lastMsg)}`; mail.hidden = false; } else mail.hidden = true;
    if (S.whatsapp) { wa.href = `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(lastMsg)}`; wa.hidden = false; } else wa.hidden = true;
    out.hidden = false; copied.textContent = '';
    $('.qf-ok', out).focus({ preventScroll: true });
    goTo(out, -24);
  });
  ['name', 'tel'].forEach((n) => field(n).addEventListener('input', () => { const i = field(n); if (i.getAttribute('aria-invalid') === 'true') setErr(i, i.parentElement.querySelector('.err'), false); }));
  field('privacy').addEventListener('change', () => { if (field('privacy').checked) setErr(field('privacy'), $('.err-priv', form), false); });
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (_) {
      const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (__) { ok = false; } ta.remove(); return ok;
    }
  }
  out.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-send]'); if (!b) return;
    if (b.dataset.send === 'copy' || b.dataset.send === 'ig') {
      if (b.dataset.send === 'copy') e.preventDefault();
      const ok = await copyText(lastMsg);
      copied.textContent = ok
        ? (b.dataset.send === 'ig' ? T({ es: 'Texto copiado. Pégalo en el chat de Instagram.', ca: 'Text copiat. Enganxa’l al xat d’Instagram.', en: 'Text copied. Paste it into the Instagram chat.', fr: 'Texte copié. Collez-le dans la discussion Instagram.' })
          : T({ es: 'Texto copiado.', ca: 'Text copiat.', en: 'Text copied.', fr: 'Texte copié.' }))
        : T({ es: 'No se ha podido copiar: selecciona el texto y cópialo.', ca: 'No s’ha pogut copiar: selecciona el text i copia’l.', en: 'Could not copy: select the text and copy it.', fr: 'Copie impossible : sélectionnez le texte et copiez-le.' });
    }
  });

  /* ---------- maqueta ligada al scroll */
  const canvas = $('#maqueta');
  const heroStage = $('[data-stage="hero"]'), todoStage = $('[data-stage="todo"]');
  const todo = $('#todo'), pin = $('.todo-pin'), leaders = $('.leaders');
  const lys = $$('.ly'), steps = $$('.todo-steps span');
  const TAGS = ['roof', 'facade', 'floor', 'inst', 'base'];
  let maq = null, explodeP = 0, focusIdx = -2, labelsOn = false;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const lerp = (a, b, t) => a + (b - a) * t;
  let mix = 0;

  function scrollState() {
    const vh = innerHeight;
    const r = todo.getBoundingClientRect();
    mix = smooth(0, 1, 1 - r.top / vh);
    const total = r.height - vh;
    const p = clamp(-r.top / total, 0, 1);
    // con movimiento reducido el despiece no se anima: salta de montada a despiezada
    const e = reduce ? (p > .03 ? 1 : 0) : smooth(.03, .2, p);
    explodeP = e;
    const show = p > .04 && r.bottom > vh * .4;
    const idx = p < .2 ? -1 : Math.min(4, Math.floor((p - .2) / .158));
    if (idx !== focusIdx) {
      focusIdx = idx;
      lys.forEach((li, i) => li.classList.toggle('on', i === idx));
      steps.forEach((s, i) => s.classList.toggle('on', i <= idx));
      if (maq) maq.setFocus(idx >= 0 ? TAGS[idx] : null);
    }
    if (show !== labelsOn) { labelsOn = show; pin.classList.toggle('labels', show); }
    const pinned = r.top <= 2 && r.bottom >= vh - 2;
    if (pinned !== inTodo) { inTodo = pinned; pin.classList.toggle('pinned', pinned); updBar(); }
    if (maq) { maq.setExplode(e); maq.invalidate(); }
  }

  function drawLeaders() {
    if (!maq || mqMobile.matches) { leaders.innerHTML = ''; return; }
    const pr = pin.getBoundingClientRect();
    if (pr.bottom < 0 || pr.top > innerHeight) return;
    let s = '';
    lys.forEach((li, i) => {
      const tag = li.dataset.tag;
      const a = maq.project(tag);
      const t = li.querySelector('.ly-n').getBoundingClientRect();
      const left = li.dataset.side === 'l';
      const x0 = left ? t.right + 6 + li.querySelector('.ly-t').getBoundingClientRect().width + 14 : t.left - 6 - li.querySelector('.ly-t').getBoundingClientRect().width - 14;
      const y0 = t.top + t.height / 2 - pr.top;
      const ax = a.x - pr.left, ay = a.y - pr.top;
      const ex = ax + (left ? -28 : 28);
      const on = li.classList.contains('on') ? ' class="on"' : '';
      const op = labelsOn ? 1 : 0;
      const lc = `--lc:var(--c-${{ roof: 'roof', facade: 'fac', floor: 'floor', inst: 'inst', base: 'base' }[tag]})`;
      s += `<path${on} style="${lc};opacity:${op ? '' : 0}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} H${ex.toFixed(1)} L${ax.toFixed(1)} ${ay.toFixed(1)}"/><circle${on} style="${lc};opacity:${op}" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="5"/>`;
    });
    leaders.innerHTML = s;
  }

  // las capas: clic para ir a su paso
  lys.forEach((li, i) => li.querySelector('.ly-btn').addEventListener('click', () => {
    const r = todo.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = .2 + (i + .5) * .158;
    goTo(scrollY + r.top + total * p);
  }));

  async function bootMaqueta() {
    const ok = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { return false; } })();
    if (!ok) { html.classList.add('no-gl'); return; }
    try {
      const mod = await import('./maqueta.js?v=4');
      maq = await mod.createMaqueta(canvas, { onFrame: drawLeaders });
    } catch (err) { console.warn('Maqueta no disponible', err); html.classList.add('no-gl'); return; }
    maq.setRect(() => {
      const a = rectOf(heroStage), b = rectOf(todoStage);
      const t = mix;
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
    }, true);
    scrollState();
    maq.setFocus(focusIdx >= 0 ? TAGS[focusIdx] : null);   // por si la página se abrió ya dentro del despiece
    if (reduce) maq.skipIntro(); else maq.intro();
    // solo se dibuja mientras la portada o el despiece están a la vista
    let vis = new Set();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
      const on = vis.size > 0;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      on ? maq.start() : maq.stop();
    }, { rootMargin: '10% 0px' });
    io.observe($('.hero')); io.observe(todo);
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
      addEventListener('pointermove', (e) => maq.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1), { passive: true });
    }
    addEventListener('resize', () => { maq.resize(); scrollState(); });
    // si cambia el tamaño de la portada (fuentes, idioma, menú), se vuelve a encuadrar
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => maq.invalidate()); ro.observe(heroStage); ro.observe(todoStage); ro.observe($('.hero-txt')); }
    document.addEventListener('langchange', () => maq.invalidate());
  }

  const onScroll = () => {
    hd.classList.toggle('is-scrolled', scrollY > 8);
    scrollState();
  };
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  intro();
  bootMaqueta();
})();
