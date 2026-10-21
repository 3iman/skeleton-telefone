# Slenkamos lentelės – užduotis Skeleton frontendui

## Tikslas
Telefone plačios turinio lentelės turi aiškiai rodyti, kad jas galima stumti į šoną, ir neprarasti eilutės konteksto slenkant. Taikoma visoms turinio lentelėms, įskaitant Google Sheets integraciją (`.sheet-table`).

## Failai
- `table-scroll.js` – logika, be priklausomybių, ES5.
- `table-scroll.css` – visa išvaizda. JS tik uždeda klases.

## Įdiegimas
1. Įtrauk abu failus į Skeleton temą, po pagrindinio CSS ir app.js:
   ```html
   <link rel="stylesheet" href="…/table-scroll.css">
   <script src="…/table-scroll.js" defer></script>
   ```
2. Jei turinys įkeliamas dinamiškai (AJAX, modalai), po įkėlimo iškviesk `window.SkTableScroll.init(konteineris)`.
3. Nekeisk TVS lentelių HTML ir Sheets integracijos išvesties – modulis dirba su tuo, kas jau atvaizduota.

## Kaip veikia
- Kiekvieną lentelę iš `.content-school table, .entry table` apgaubia `.ts > .ts__box`. Slenka tik `.ts__box`.
- Esamų apvalkalų (`.table-wrapper`, `.sheet-table`, `.table-responsive`, `.table-scroll`) slinkimas išjungiamas, kad nebūtų dviejų slenkamų dėžių vienoje.
- Apgaubiamas tik apvalkalas, kuriame yra vien lentelė. Sheets pastabų tekstas po lentele lieka nejudantis.
- Lentelės be HTML pakeitimo praleidžiamos: `.documents-table` ir `.ts-skip`.

## Klasės ant `.ts`

| Klasė | Kada uždedama | Ką daro CSS |
|---|---|---|
| `ts--scrollable` | Lentelė netelpa (daugiau nei 4 px) | Rodo užuominą „Slinkite lentelę →“, šešėlius |
| `ts--start` / `ts--end` | Pasiektas kairys / dešinys kraštas | Paslepia to krašto šešėlį |
| `ts--seen` | Vartotojas paslinko daugiau nei 24 px | Užuomina išnyksta |
| `ts--sticky` | Pirmas stulpelis yra eilutės raktas (žr. žemiau) | Pirmas stulpelis prilimpa |

## Kada pirmas stulpelis prilimpa
Prilimpa tik tada, kai tenkinamos **visos** sąlygos (`isKeyColumn()` ir `update()`):
1. Lentelė netelpa bent trečdaliu konteinerio pločio.
2. Pirmas stulpelis užima ne daugiau kaip 45 % konteinerio pločio.
3. Pirmo stulpelio antraštė nėra „Nr.“, „Eil. nr.“, „No.“ ar „#“.
4. Pirmame stulpelyje nėra `rowspan` / `colspan`.
5. Tuščių celių – ne daugiau 30 %.
6. Numerių, datų, laikų, sumų – ne daugiau kaip pusė reikšmių.
7. Vidutinis celės ilgis – iki 40 simbolių.
8. Bent 80 % reikšmių unikalios.

Visi slenksčiai yra `CFG` objekte failo pradžioje. Prilipusios celės foną JS paima iš pirmo nepermatomo protėvio (eilutės juostavimas, kontrasto režimai), todėl turinys po ja nepersišviečia.

## Persiskaičiavimas
- `ResizeObserver` – plotis, šrifto dydis, pasukimas.
- `MutationObserver` ant `body` klasės – prieinamumo režimai (`acc-contrast-*`, `acc-size-*`).
- `document.fonts.ready` – vėliau užsikrovę šriftai.

## Prieinamumas
- Netelpanti lentelė gauna `role="region"`, `tabindex="0"` ir `aria-label` („Lentelė, slenkama į šonus: <artimiausia antraštė>“). Ją galima slinkti klaviatūros rodyklėmis.
- Užuomina turi `aria-hidden` – ekrano skaitytuvui ji nereikalinga.
- `prefers-reduced-motion` išjungia rodyklės judesį.
- Tekstai yra lietuvių, anglų, lenkų ir rusų kalbomis pagal `<html lang>`.

## Patikra (privaloma prieš perduodant)
Patikrink 360 px pločiu:
- `/administracine-informacija/darbo-uzmokestis` (Sheets): užuomina ir šešėlis matomi; pastabų tekstas po lentele neslenka; slenka tik viena dėžė.
- `/struktura-ir-kontaktine-informacija/mokytojai`: pirmas stulpelis „Eil. nr.“ – **neprilimpa**.
- `/vadovu-darbotvarke`: pirmas stulpelis – laikas – **neprilimpa**.
- Lentelė, kuri telpa: jokios užuominos, jokio šešėlio, `tabindex="-1"`.
- Įjunk kontrastą ir didesnį šriftą: klasės persiskaičiuoja be puslapio perkrovimo.
- Desktope (>1024 px) lentelės, kurios telpa, atrodo kaip anksčiau.

## Ne šios užduoties dalis
Paprastų 2–4 stulpelių lentelių su telefonais vertimas kortelėmis (pagalbos kontaktai) – atskiras sprendimas prototipe, ne šiame modulyje.
