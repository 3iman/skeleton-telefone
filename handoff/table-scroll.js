/*!
 * Skeleton – slenkamos lentelės (table-scroll)
 *
 * Ką daro:
 *  1. Turinio lenteles apgaubia vienu slinkimo konteineriu (.ts).
 *  2. Jei lentelė netelpa – rodo užuominą „Slinkite lentelę →“ ir šešėlį tame krašte,
 *     kur dar yra turinio.
 *  3. Pirmą stulpelį prilipdo TIK tada, kai jis yra eilutės raktas (taisyklės – isKeyColumn()).
 *  4. Persiskaičiuoja keičiantis pločiui, šrifto dydžiui (prieinamumo nustatymai),
 *     kontrastui ir pasukus įrenginį.
 *
 * Veikia su paprastomis TVS lentelėmis ir su Google Sheets integracija (.sheet-table),
 * nes abi atvaizduojamos kaip HTML <table>.
 * Be priklausomybių. Kelis kartus kviesti saugu.
 *
 * Naudojimas:  <script src="table-scroll.js" defer></script>
 *              Dinamiškai įkeltam turiniui: window.SkTableScroll.init(elementas)
 */
(function () {
  'use strict';

  var CFG = {
    // Kur ieškoti lentelių
    tables: '.content-school table, .entry table',
    // Kurių neliesti (dokumentų bankas turi savo išdėstymą)
    skip: '.documents-table, .ts-skip',
    // Esami apvalkalai, kurių slinkimą „užgesiname“ (kad nebūtų dviejų slenkamų dėžių)
    wrappers: '.table-wrapper, .sheet-table, .table-responsive, .table-scroll',
    overflowMin: 4,          // px – mažiau laikome „telpa“
    stickyMinOverflow: 1 / 3, // prilipdyti tik jei netelpa bent trečdaliu konteinerio pločio
    stickyMaxWidth: 0.45,    // pirmas stulpelis negali užimti daugiau nei 45 % konteinerio
    keyMaxAvgLen: 40,        // vidutinis pirmo stulpelio celės ilgis (simboliais)
    keyMinUnique: 0.8,       // bent 80 % reikšmių unikalios
    keyMaxEmpty: 0.3,        // ne daugiau 30 % tuščių celių
    keyMaxNumeric: 0.5,      // jei daugiau nei pusė – numeriai/datos, raktas ne čia
    seenAfter: 24            // px – po tiek paslinkus užuomina paslepiama
  };

  var TEXT = {
    lt: { hint: 'Slinkite lentelę', label: 'Lentelė, slenkama į šonus' },
    en: { hint: 'Scroll the table', label: 'Table, scrolls sideways' },
    pl: { hint: 'Przewiń tabelę', label: 'Tabela przewijana w bok' },
    ru: { hint: 'Прокрутите таблицу', label: 'Таблица прокручивается вбок' }
  };
  var lang = (document.documentElement.lang || 'lt').slice(0, 2).toLowerCase();
  var T = TEXT[lang] || TEXT.lt;

  // Numeris, eil. nr., data, metai, ketvirtis, suma
  var NUMERIC = /^(?:nr\.?\s*)?[\d\s.,:\/–\-]+(?:\s*(?:m\.?|d\.?|val\.?|eur|€|%))*$|^\d{4}\s*m\.?\s+\S+\s+\d{1,2}\s*d\.?$/i;
  var NR_HEAD = /^(eil\.?\s*)?nr\.?$|^no\.?$|^#$/i;

  var items = [];
  var ro = 'ResizeObserver' in window ? new ResizeObserver(function (es) {
    es.forEach(function (e) { var it = find(e.target); if (it) update(it); });
  }) : null;

  function find(el) {
    for (var i = 0; i < items.length; i++) if (items[i].box === el || items[i].table === el) return items[i];
    return null;
  }

  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function cellsOf(tr) {
    var out = [];
    for (var i = 0; i < tr.children.length; i++) {
      var c = tr.children[i];
      if (c.tagName === 'TD' || c.tagName === 'TH') out.push(c);
    }
    return out;
  }

  // Antraštės eilutės: thead arba eilutės, kurių visos celės TH
  function isHeadRow(tr) {
    if (tr.parentNode && tr.parentNode.tagName === 'THEAD') return true;
    var cs = cellsOf(tr);
    return cs.length > 0 && cs.every(function (c) { return c.tagName === 'TH'; });
  }

  // ---- Taisyklės: ar pirmas stulpelis yra eilutės raktas ----
  function isKeyColumn(table) {
    var rows = Array.prototype.slice.call(table.rows);
    var head = rows.filter(isHeadRow);
    var body = rows.filter(function (r) { return !isHeadRow(r); });
    if (body.length < 2) return false;

    // Antraštė „Nr.“ – raktas ne pirmame stulpelyje
    for (var h = 0; h < head.length; h++) {
      var hc = cellsOf(head[h])[0];
      if (hc && NR_HEAD.test(clean(hc.textContent))) return false;
    }

    var vals = [], empty = 0, numeric = 0, len = 0;
    for (var i = 0; i < body.length; i++) {
      var c = cellsOf(body[i])[0];
      if (!c) return false;
      if (c.rowSpan > 1 || c.colSpan > 1) return false; // grupuojančios celės
      var v = clean(c.textContent);
      if (!v) { empty++; continue; }
      vals.push(v.toLowerCase());
      len += v.length;
      if (NUMERIC.test(v)) numeric++;
    }
    var n = body.length;
    if (empty / n > CFG.keyMaxEmpty) return false;
    if (!vals.length) return false;
    if (numeric / vals.length > CFG.keyMaxNumeric) return false;
    if (len / vals.length > CFG.keyMaxAvgLen) return false;
    var uniq = {}; vals.forEach(function (v) { uniq[v] = 1; });
    if (Object.keys(uniq).length / vals.length < CFG.keyMinUnique) return false;
    return true;
  }

  // Pirmos celės fonas: pirmas nepermatomas protėvis (celė → eilutė → lentelė → …)
  function solidBg(el) {
    while (el && el !== document.documentElement) {
      var bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || '#fff';
  }

  function paintSticky(it, on) {
    Array.prototype.forEach.call(it.table.rows, function (tr) {
      var c = cellsOf(tr)[0];
      if (!c) return;
      c.style.backgroundColor = '';
      if (on) c.style.backgroundColor = solidBg(c);
    });
  }

  function update(it) {
    var box = it.box, w = box.clientWidth;
    var max = box.scrollWidth - w;
    var over = max > CFG.overflowMin;
    var root = it.root;

    root.classList.toggle('ts--scrollable', over);
    root.classList.toggle('ts--start', box.scrollLeft <= CFG.overflowMin);
    root.classList.toggle('ts--end', box.scrollLeft >= max - CFG.overflowMin);
    box.tabIndex = over ? 0 : -1;
    if (over) box.setAttribute('role', 'region'); else box.removeAttribute('role');

    var sticky = false;
    if (over && max >= w * CFG.stickyMinOverflow && it.key) {
      var first = it.table.rows[0] && cellsOf(it.table.rows[0])[0];
      sticky = !!first && first.getBoundingClientRect().width <= w * CFG.stickyMaxWidth;
    }
    if (sticky !== it.sticky) { it.sticky = sticky; root.classList.toggle('ts--sticky', sticky); }
    if (sticky) paintSticky(it, true); else if (it.painted) paintSticky(it, false);
    it.painted = sticky;
  }

  function label(table) {
    var cap = table.querySelector('caption');
    if (cap) return clean(cap.textContent);
    // Artimiausia ankstesnė antraštė
    var el = table.closest('.ts') || table;
    while (el) {
      var p = el.previousElementSibling;
      while (p) {
        if (/^H[2-4]$/.test(p.tagName)) return clean(p.textContent);
        var h = p.querySelector && p.querySelector('h2, h3, h4');
        if (h) return clean(h.textContent);
        p = p.previousElementSibling;
      }
      el = el.parentElement;
      if (!el || el.matches('.content-school, .entry, body')) break;
    }
    return '';
  }

  function setup(table) {
    if (table.closest(CFG.skip) || table.closest('.ts') || table.closest('table') !== table) return;

    // Apgaubiame išoriniausią esamą apvalkalą, kuriame yra TIK ši lentelė
    // (Sheets .table-wrapper gali turėti ir pastabų tekstą – jo neįtraukiame į slinkimą)
    var host = table, w = table.parentElement;
    while (w && w.matches && w.matches(CFG.wrappers) && w.children.length === 1) { host = w; w = w.parentElement; }

    // Aukštesni apvalkalai (su kitu turiniu) lieka, bet be savo slinkimo
    for (var a = w; a && a.matches && a.matches(CFG.wrappers); a = a.parentElement) a.classList.add('ts-host');

    var root = document.createElement('div');
    root.className = 'ts';
    root.innerHTML =
      '<div class="ts__hint" aria-hidden="true">' + T.hint + ' <span class="ts__arrow">→</span></div>' +
      '<div class="ts__box"></div>';
    host.parentNode.insertBefore(root, host);
    var box = root.lastChild;
    box.appendChild(host);

    var name = label(table);
    box.setAttribute('aria-label', T.label + (name ? ': ' + name : ''));

    var it = { root: root, box: box, table: table, key: isKeyColumn(table), sticky: false, painted: false };
    items.push(it);

    box.addEventListener('scroll', function () {
      if (box.scrollLeft > CFG.seenAfter) root.classList.add('ts--seen');
      update(it);
    }, { passive: true });

    if (ro) { ro.observe(box); ro.observe(table); }
    update(it);
  }

  function init(scope) {
    var list = (scope || document).querySelectorAll(CFG.tables);
    Array.prototype.forEach.call(list, setup);
  }

  function refreshAll() { items.forEach(update); }

  if (!ro) window.addEventListener('resize', refreshAll);
  window.addEventListener('orientationchange', refreshAll);
  // Kontrastas / šrifto dydis keičiami body klasėmis (acc-*-activated)
  if ('MutationObserver' in window) {
    new MutationObserver(function () { requestAnimationFrame(refreshAll); })
      .observe(document.body || document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  // Šriftai gali užsikrauti vėliau ir pakeisti plotį
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshAll);

  window.SkTableScroll = { init: init, refresh: refreshAll, isKeyColumn: isKeyColumn, config: CFG };

  // window.SkTableScrollManual = true prieš įkeliant – automatinis paleidimas išjungiamas (kviesk init() pats)
  if (!window.SkTableScrollManual) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
    else init();
  }
})();
