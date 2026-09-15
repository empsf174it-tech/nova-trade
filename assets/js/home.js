/**
 * NOVATRADE - Homepage interactions
 * Simulated live quotes, sparkline, ticker, fee calculator, testimonial deck.
 * All prices are randomly generated placeholders — no market data is fetched.
 */

document.addEventListener('DOMContentLoaded', () => {
    initHeroTerminal();
    initTicker();
    initShowcase();
    initCalculator();
    initQuoteDeck();
});

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------
   Hero terminal: ticking index price, live sparkline, watchlist rows
   ------------------------------------------------------------------ */
function initHeroTerminal() {
    const pxEl = document.getElementById('heroPx');
    const chgEl = document.getElementById('heroChg');
    const rowsEl = document.getElementById('heroRows');
    const line = document.getElementById('heroSparkLine');
    const fill = document.getElementById('heroSparkFill');
    const dot = document.getElementById('heroSparkDot');
    const halo = document.getElementById('heroSparkHalo');
    const volEl = document.getElementById('heroVolume');
    if (!pxEl) return;

    const open = 22231.40;
    let price = 22418.75;

    // Seed a plausible intraday path.
    const series = [];
    let seed = open;
    for (let i = 0; i < 48; i++) {
        seed += (Math.random() - 0.44) * 38;
        series.push(seed);
    }
    series[series.length - 1] = price;

    const watch = [
        { sym: 'RELIANCE', chg: 2.14 },
        { sym: 'HDFCBANK', chg: -0.62 },
        { sym: 'INFY', chg: 1.05 },
        { sym: 'TATAMOTORS', chg: 3.28 },
        { sym: 'ITC', chg: -0.31 }
    ];

    function drawSpark() {
        if (!line) return;
        const w = 300, h = 130, padY = 10;
        const min = Math.min(...series);
        const max = Math.max(...series);
        const span = (max - min) || 1;

        const xAt = (i) => (i / (series.length - 1)) * w;
        const yAt = (v) => h - padY - ((v - min) / span) * (h - padY * 2);

        const pts = series.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);

        const d = 'M' + pts.join(' L');
        line.setAttribute('d', d);
        if (fill) fill.setAttribute('d', `${d} L${w},${h} L0,${h} Z`);

        // Marker on the most recent point.
        const lx = xAt(series.length - 1);
        const ly = yAt(series[series.length - 1]);
        [dot, halo].forEach(el => {
            if (!el) return;
            el.setAttribute('cx', lx.toFixed(1));
            el.setAttribute('cy', ly.toFixed(1));
        });
    }

    /* Volume histogram beneath the chart; the tallest bars are highlighted. */
    function drawVolume() {
        if (!volEl) return;

        if (!volEl.children.length) {
            volEl.innerHTML = Array.from({ length: 32 }, () => '<i></i>').join('');
        }

        const bars = volEl.children;
        for (let i = 0; i < bars.length; i++) {
            const pct = 18 + Math.random() * 82;
            bars[i].style.height = pct.toFixed(0) + '%';
            bars[i].classList.toggle('hot', pct > 68);
        }
    }

    function renderRows() {
        if (!rowsEl) return;
        const maxAbs = Math.max(...watch.map(w => Math.abs(w.chg))) || 1;

        rowsEl.innerHTML = watch.map(w => {
            const up = w.chg >= 0;
            const width = (Math.abs(w.chg) / maxAbs) * 100;
            return `
                <div class="terminal-row">
                    <span class="r-sym">${w.sym.slice(0, 8)}</span>
                    <span class="r-bar"><i style="width:${width.toFixed(0)}%;background:${up ? 'var(--color-accent)' : 'var(--color-danger)'}"></i></span>
                    <span class="r-chg ${up ? 'text-success' : 'text-danger'}">${up ? '+' : ''}${w.chg.toFixed(2)}%</span>
                </div>`;
        }).join('');
    }

    function tick() {
        const prev = price;
        price += (Math.random() - 0.47) * 26;

        series.push(price);
        series.shift();
        drawSpark();
        drawVolume();

        pxEl.textContent = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        pxEl.classList.remove('flash-up', 'flash-down');
        void pxEl.offsetWidth; // restart the colour transition
        pxEl.classList.add(price >= prev ? 'flash-up' : 'flash-down');

        const pct = ((price - open) / open) * 100;
        chgEl.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        chgEl.className = `num ${pct >= 0 ? 'text-success' : 'text-danger'}`;
        chgEl.style.fontSize = 'var(--text-sm)';

        watch.forEach(w => {
            w.chg = Math.max(-6, Math.min(6, w.chg + (Math.random() - 0.5) * 0.28));
        });
        renderRows();
    }

    drawSpark();
    drawVolume();
    renderRows();
    if (!REDUCED) setInterval(tick, 2200);
}

/* ------------------------------------------------------------------
   Marquee ticker with drifting placeholder prices
   ------------------------------------------------------------------ */
function initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const rows = [
        { s: 'AAPL', p: 173.50, c: 1.20 },
        { s: 'MSFT', p: 338.11, c: -0.40 },
        { s: 'TSLA', p: 214.65, c: 2.80 },
        { s: 'NVDA', p: 460.18, c: 0.90 },
        { s: 'AMZN', p: 132.33, c: -1.10 },
        { s: 'SPY', p: 435.20, c: 0.50 },
        { s: 'GOOGL', p: 138.42, c: 0.74 },
        { s: 'META', p: 312.08, c: -0.28 },
        { s: 'BTC', p: 63120.00, c: 3.42 },
        { s: 'GOLD', p: 2318.60, c: 0.18 }
    ];

    function render() {
        // Rendered twice so the -50% marquee translate loops seamlessly.
        const half = rows.map(r => {
            const up = r.c >= 0;
            const icon = up ? 'ph-trend-up' : 'ph-trend-down';
            return `<span class="ticker-item">
                        <b>${r.s}</b> ${r.p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span class="${up ? 'text-success' : 'text-danger'}">
                            <i class="ph-bold ${icon}"></i> ${up ? '+' : ''}${r.c.toFixed(2)}%
                        </span>
                    </span>`;
        }).join('');
        track.innerHTML = half + half;
    }

    render();

    if (REDUCED) return;
    setInterval(() => {
        rows.forEach(r => {
            const drift = (Math.random() - 0.5) * (r.p * 0.0012);
            r.p += drift;
            r.c = Math.max(-9, Math.min(9, r.c + (drift / r.p) * 100));
        });
        render();
    }, 4000);
}

/* ------------------------------------------------------------------
   Live showcase — one simulated RELIANCE tape drives all three panels.
   Only the visible panel updates; switching tabs moves the ticker.
   ------------------------------------------------------------------ */
function initShowcase() {
    const group = document.querySelector('[data-tabs]');
    const chartEl = document.getElementById('svLine');
    if (!group || !chartEl) return;

    const OPEN = 2399.75;
    let price = 2450.95;

    // Shared tape, seeded so the chart opens with a plausible shape.
    const series = [];
    let seed = OPEN;
    for (let i = 0; i < 60; i++) {
        seed += (Math.random() - 0.42) * 9;
        series.push(seed);
    }
    series[series.length - 1] = price;

    const holdings = [
        { sym: 'RELIANCE', w: 32, chg: 2.14 },
        { sym: 'INFY', w: 24, chg: 1.05 },
        { sym: 'HDFCBANK', w: 21, chg: -0.62 },
        { sym: 'ITC', w: 13, chg: -0.31 },
        { sym: 'TATASTEEL', w: 10, chg: 1.88 }
    ];

    const fmt = (n, d) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

    /* ---------- Panel 1: chart ---------- */
    const svFill = document.getElementById('svFill');
    const svDot = document.getElementById('svDot');
    const svHalo = document.getElementById('svHalo');
    const svPx = document.getElementById('svPx');
    const svChg = document.getElementById('svChg');

    function drawChart() {
        const w = 400, h = 150, padY = 12;
        const min = Math.min(...series);
        const max = Math.max(...series);
        const span = (max - min) || 1;

        const xAt = (i) => (i / (series.length - 1)) * w;
        const yAt = (v) => h - padY - ((v - min) / span) * (h - padY * 2);

        const d = 'M' + series.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' L');
        chartEl.setAttribute('d', d);
        if (svFill) svFill.setAttribute('d', `${d} L${w},${h} L0,${h} Z`);

        const lx = xAt(series.length - 1);
        const ly = yAt(series[series.length - 1]);
        [svDot, svHalo].forEach(el => {
            if (!el) return;
            el.setAttribute('cx', lx.toFixed(1));
            el.setAttribute('cy', ly.toFixed(1));
        });
    }

    function paintQuote(prev) {
        if (!svPx) return;
        svPx.textContent = fmt(price, 2);
        svPx.classList.remove('up', 'down');
        void svPx.offsetWidth;                     // restart the colour transition
        svPx.classList.add(price >= prev ? 'up' : 'down');

        const pct = ((price - OPEN) / OPEN) * 100;
        const up = pct >= 0;
        svChg.className = 'badge ' + (up ? 'badge-success' : 'badge-danger');
        svChg.innerHTML = `<i class="ph-bold ${up ? 'ph-trend-up' : 'ph-trend-down'}"></i> ${up ? '+' : ''}${pct.toFixed(2)}%`;
    }

    /* ---------- Panel 2: depth of market ---------- */
    const svAsks = document.getElementById('svAsks');
    const svBids = document.getElementById('svBids');
    const svMid = document.getElementById('svMid');
    const svSpread = document.getElementById('svSpread');
    const svLast = document.getElementById('svLast');
    const svImb = document.getElementById('svImb');

    function drawBook() {
        if (!svAsks) return;

        const asks = [], bids = [];
        for (let i = 0; i < 3; i++) {
            asks.push({ p: price + 0.15 + i * 0.28, q: Math.round(400 + Math.random() * 2800) });
            bids.push({ p: price - 0.15 - i * 0.28, q: Math.round(400 + Math.random() * 2800) });
        }

        const maxQ = Math.max(...asks.concat(bids).map(r => r.q));
        const row = (r, cls) => `
            <div class="depth-row ${cls}">
                <div class="depth" style="width:${((r.q / maxQ) * 100).toFixed(0)}%"></div>
                <span class="${cls === 'bid' ? 'text-success' : 'text-danger'}">${fmt(r.p, 2)}</span>
                <span class="q flash">${r.q.toLocaleString('en-US')}</span>
            </div>`;

        // Asks read top-down from the highest price toward the mid.
        svAsks.innerHTML = asks.slice().reverse().map(r => row(r, 'ask')).join('');
        svBids.innerHTML = bids.map(r => row(r, 'bid')).join('');

        svMid.textContent = fmt(price, 2);
        svSpread.textContent = 'spread ' + (asks[0].p - bids[0].p).toFixed(2);
        svLast.textContent = fmt(price, 2);

        const bidVol = bids.reduce((s, r) => s + r.q, 0);
        const askVol = asks.reduce((s, r) => s + r.q, 0);
        const skew = (bidVol / (bidVol + askVol)) * 100;
        svImb.textContent = skew.toFixed(0) + '% bid';
        svImb.className = skew >= 50 ? 'text-success' : 'text-danger';
    }

    /* ---------- Panel 3: portfolio ---------- */
    const svFolio = document.getElementById('svFolio');
    const svPnl = document.getElementById('svPnl');
    const svAlloc = document.getElementById('svAlloc');
    const svLegend = document.getElementById('svLegend');
    const svHoldings = document.getElementById('svHoldings');

    const FOLIO_BASE = 183635.70;
    const alloc = [42, 24, 18, 16];

    function drawFolio() {
        if (!svFolio) return;

        // Portfolio value tracks the shared tape, so all three panels agree.
        const factor = price / OPEN;
        const value = FOLIO_BASE * factor;
        const pnl = value - FOLIO_BASE;
        const pct = (pnl / FOLIO_BASE) * 100;
        const up = pnl >= 0;

        svFolio.textContent = '$' + fmt(value, 0);
        svPnl.textContent = `${up ? '+' : '−'}$${fmt(Math.abs(pnl), 2)} (${up ? '+' : ''}${pct.toFixed(2)}%)`;
        svPnl.className = 'num ' + (up ? 'text-success' : 'text-danger');

        // Allocation drifts slightly, then renormalises to 100%.
        for (let i = 0; i < alloc.length; i++) {
            alloc[i] = Math.max(6, alloc[i] + (Math.random() - 0.5) * 0.7);
        }
        const total = alloc.reduce((s, n) => s + n, 0);
        const pcts = alloc.map(n => (n / total) * 100);

        const bars = svAlloc.children;
        const legend = svLegend.querySelectorAll('.num');
        for (let i = 0; i < bars.length; i++) {
            bars[i].style.width = pcts[i].toFixed(1) + '%';
            if (legend[i]) legend[i].textContent = pcts[i].toFixed(0) + '%';
        }

        holdings.forEach(h => {
            h.chg = Math.max(-5, Math.min(5, h.chg + (Math.random() - 0.5) * 0.22));
        });

        const maxAbs = Math.max(...holdings.map(h => Math.abs(h.chg))) || 1;
        svHoldings.innerHTML = holdings.map(h => {
            const hUp = h.chg >= 0;
            return `
                <div class="sv-hold">
                    <span class="h-sym">${h.sym.slice(0, 8)}</span>
                    <span class="h-bar"><i style="width:${((Math.abs(h.chg) / maxAbs) * 100).toFixed(0)}%"></i></span>
                    <span class="h-chg ${hUp ? 'text-success' : 'text-danger'}">${hUp ? '+' : ''}${h.chg.toFixed(2)}%</span>
                </div>`;
        }).join('');
    }

    /* ---------- Tick loop, scoped to the visible panel ---------- */
    let active = 'chart';
    let timer = null;

    function redraw() {
        if (active === 'chart') drawChart();
        else if (active === 'order') drawBook();
        else drawFolio();
    }

    function tick() {
        const prev = price;
        price += (Math.random() - 0.47) * 3.4;

        series.push(price);
        series.shift();

        // The quote header is part of the chart panel only.
        if (active === 'chart') paintQuote(prev);
        redraw();
    }

    function start() {
        stop();
        if (REDUCED) return;
        timer = setInterval(tick, active === 'order' ? 1400 : 2000);
    }
    function stop() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    group.addEventListener('tabchange', (e) => {
        active = e.detail;
        redraw();
        start();
    });

    // Pause while the tab is in the background — no point animating unseen.
    document.addEventListener('visibilitychange', () => {
        document.hidden ? stop() : start();
    });

    drawChart();
    drawBook();
    drawFolio();
    start();
}

/* ------------------------------------------------------------------
   Fee calculator
   ------------------------------------------------------------------ */
function initCalculator() {
    const trades = document.getElementById('calcTrades');
    const size = document.getElementById('calcSize');
    if (!trades || !size) return;

    const tradesOut = document.getElementById('calcTradesOut');
    const sizeOut = document.getElementById('calcSizeOut');
    const novaOut = document.getElementById('calcNova');
    const otherOut = document.getElementById('calcOther');
    const saveOut = document.getElementById('calcSave');
    const yearOut = document.getElementById('calcYear');
    const pctOut = document.getElementById('calcPct');
    const pctBadge = pctOut ? pctOut.closest('.badge') : null;
    const pctIcon = pctBadge ? pctBadge.querySelector('i') : null;

    const FLAT_FEE = 0.99;   // per executed order
    const RIVAL_RATE = 0.0005; // 0.05% of turnover

    const usd = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function paintTrack(el) {
        const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
        el.style.background =
            `linear-gradient(to right, var(--color-primary) 0%, var(--color-violet) ${pct}%, var(--color-surface-2) ${pct}%)`;
    }

    function update() {
        const n = parseInt(trades.value, 10);
        const s = parseInt(size.value, 10);

        const nova = n * FLAT_FEE;
        const rival = n * s * RIVAL_RATE;
        const saving = rival - nova;

        tradesOut.textContent = n;
        sizeOut.textContent = '$' + s.toLocaleString('en-US');
        novaOut.textContent = usd(nova);
        otherOut.textContent = usd(rival);
        yearOut.textContent = usd(Math.abs(saving) * 12);

        const ratio = rival ? Math.round((Math.abs(saving) / rival) * 100) : 0;

        if (saving >= 0) {
            saveOut.textContent = usd(saving);
            saveOut.className = 'big gradient-text';
            if (pctBadge) pctBadge.className = 'badge badge-success';
            if (pctIcon) pctIcon.className = 'ph-bold ph-trend-down';
            pctOut.textContent = ratio + '% lower cost';
        } else {
            saveOut.textContent = usd(Math.abs(saving));
            saveOut.className = 'big text-danger';
            if (pctBadge) pctBadge.className = 'badge badge-danger';
            if (pctIcon) pctIcon.className = 'ph-bold ph-trend-up';
            pctOut.textContent = ratio + '% more at this size';
        }

        paintTrack(trades);
        paintTrack(size);
    }

    trades.addEventListener('input', update);
    size.addEventListener('input', update);
    document.addEventListener('themechange', update);
    update();
}

/* ------------------------------------------------------------------
   Testimonial deck — dots, autoplay, pause on hover, swipe
   ------------------------------------------------------------------ */
function initQuoteDeck() {
    const deck = document.getElementById('quoteDeck');
    const dotsWrap = document.getElementById('quoteDots');
    if (!deck || !dotsWrap) return;

    const slides = deck.querySelectorAll('.quote-slide');
    if (!slides.length) return;

    let index = 0;
    let timer = null;

    dotsWrap.innerHTML = Array.from(slides)
        .map((_, i) => `<button class="quote-dot${i === 0 ? ' active' : ''}" aria-label="Show testimonial ${i + 1}"></button>`)
        .join('');
    const dots = dotsWrap.querySelectorAll('.quote-dot');

    function show(i) {
        index = (i + slides.length) % slides.length;
        slides.forEach((s, n) => s.classList.toggle('active', n === index));
        dots.forEach((d, n) => d.classList.toggle('active', n === index));
    }

    function start() {
        if (REDUCED) return;
        stop();
        timer = setInterval(() => show(index + 1), 6000);
    }
    function stop() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); start(); }));
    deck.addEventListener('mouseenter', stop);
    deck.addEventListener('mouseleave', start);

    // Touch swipe
    let startX = null;
    deck.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    deck.addEventListener('touchend', e => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 45) show(index + (dx < 0 ? 1 : -1));
        startX = null;
    });

    start();
}
