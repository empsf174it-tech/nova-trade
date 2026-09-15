/**
 * NOVATRADE - Instrument detail interactions
 *
 * Everything here runs on locally generated pseudo-random series.
 * No market data is fetched and no order is ever transmitted.
 */

(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const SYMBOL = 'AAPL';
    const BASE_PRICE = 173.50;
    const PREV_CLOSE = 171.43;
    const WEEK52_LOW = 124.17;
    const WEEK52_HIGH = 198.23;
    const FLAT_FEE = 0.99;

    let livePrice = BASE_PRICE;

    /* ==============================================================
       Helpers
       ============================================================== */
    const usd = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fix2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    /* A small seeded PRNG so a given range always redraws the same shape. */
    function makeRandom(seed) {
        let s = seed >>> 0;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    document.addEventListener('DOMContentLoaded', () => {
        const chart = initChart();
        initLivePrice(chart);
        initRangeMeter();
        initTradePanel();
        initWatchlist();
        initOrderBook();
        initFinancialBars();
        initRelated();
    });

    /* ==============================================================
       Interactive price chart (canvas + hover crosshair)
       ============================================================== */
    function initChart() {
        const canvas = document.getElementById('priceChart');
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        const tooltip = document.getElementById('chartTooltip');
        const returnEl = document.getElementById('rangeReturn');
        const buttons = document.querySelectorAll('.range-btn');

        const RANGES = {
            '1D': { points: 78,  stepMin: 5,    vol: 0.0016, drift: 0.00014, seed: 11 },
            '1W': { points: 70,  stepMin: 60,   vol: 0.0035, drift: 0.00022, seed: 23 },
            '1M': { points: 66,  stepMin: 480,  vol: 0.0060, drift: 0.00075, seed: 37 },
            '6M': { points: 130, stepMin: 1440, vol: 0.0110, drift: 0.00110, seed: 53 },
            '1Y': { points: 180, stepMin: 2880, vol: 0.0140, drift: 0.00120, seed: 71 },
            '5Y': { points: 220, stepMin: 8640, vol: 0.0240, drift: 0.00260, seed: 97 }
        };

        let range = '1M';
        let series = [];
        let hover = -1;
        let geom = null;

        /* --- Build a plausible walk that always ENDS at the live price --- */
        function buildSeries(key) {
            const cfg = RANGES[key];
            const rand = makeRandom(cfg.seed);
            const now = Date.now();
            const out = [];

            let v = 1;
            for (let i = 0; i < cfg.points; i++) {
                v *= 1 + (rand() - 0.5) * cfg.vol * 2 + cfg.drift;
                out.push(v);
            }

            // Normalise so the final point lands exactly on the live price.
            const last = out[out.length - 1];
            for (let i = 0; i < out.length; i++) {
                const t = now - (cfg.points - 1 - i) * cfg.stepMin * 60000;
                out[i] = { t: t, p: (out[i] / last) * livePrice };
            }
            return out;
        }

        function labelFor(ts) {
            const d = new Date(ts);
            if (range === '1D') {
                return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
            if (range === '1W') {
                return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
                       d.toLocaleTimeString('en-US', { hour: '2-digit' });
            }
            if (range === '5Y' || range === '1Y') {
                return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        function draw() {
            if (!series.length) return;

            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (!w || !h) return;

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            const padL = 10, padR = 58, padT = 14, padB = 24;
            const plotW = w - padL - padR;
            const plotH = h - padT - padB;

            const prices = series.map(d => d.p);
            let min = Math.min(...prices);
            let max = Math.max(...prices);
            const pad = (max - min) * 0.12 || 1;
            min -= pad;
            max += pad;

            const xAt = (i) => padL + (i / (series.length - 1)) * plotW;
            const yAt = (p) => padT + (1 - (p - min) / (max - min)) * plotH;

            geom = { padL, padR, padT, padB, plotW, plotH, min, max, xAt, yAt, w, h };

            const border = cssVar('--color-border') || '#23232f';
            const faint = cssVar('--color-text-faint') || '#6b7385';
            const up = series[series.length - 1].p >= series[0].p;
            const stroke = up ? (cssVar('--color-accent') || '#10b981') : (cssVar('--color-danger') || '#f43f5e');

            /* Horizontal grid + price axis */
            ctx.font = '500 10px "JetBrains Mono", monospace';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';

            const GRID = 4;
            for (let i = 0; i <= GRID; i++) {
                const p = min + ((max - min) / GRID) * i;
                const y = yAt(p);

                ctx.beginPath();
                ctx.strokeStyle = border;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 4]);
                ctx.moveTo(padL, y);
                ctx.lineTo(padL + plotW, y);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = faint;
                ctx.fillText(fix2(p), padL + plotW + 8, y);
            }

            /* Time axis */
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const TICKS = Math.min(5, series.length);
            for (let i = 0; i < TICKS; i++) {
                const idx = Math.round((i / (TICKS - 1)) * (series.length - 1));
                ctx.fillStyle = faint;
                ctx.fillText(labelFor(series[idx].t), Math.min(Math.max(xAt(idx), 26), padL + plotW - 26), padT + plotH + 8);
            }

            /* Area fill */
            const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
            grad.addColorStop(0, hexToRgba(stroke, 0.28));
            grad.addColorStop(1, hexToRgba(stroke, 0));

            ctx.beginPath();
            ctx.moveTo(xAt(0), yAt(series[0].p));
            series.forEach((d, i) => ctx.lineTo(xAt(i), yAt(d.p)));
            ctx.lineTo(xAt(series.length - 1), padT + plotH);
            ctx.lineTo(xAt(0), padT + plotH);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            /* Price line */
            ctx.beginPath();
            series.forEach((d, i) => {
                const x = xAt(i), y = yAt(d.p);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();

            /* Last-price marker */
            const lx = xAt(series.length - 1);
            const ly = yAt(series[series.length - 1].p);
            ctx.beginPath();
            ctx.arc(lx, ly, 8, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(stroke, 0.18);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = stroke;
            ctx.fill();

            /* Crosshair */
            if (hover >= 0 && hover < series.length) {
                const hx = xAt(hover), hy = yAt(series[hover].p);

                ctx.beginPath();
                ctx.strokeStyle = border;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.moveTo(hx, padT);
                ctx.lineTo(hx, padT + plotH);
                ctx.moveTo(padL, hy);
                ctx.lineTo(padL + plotW, hy);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.beginPath();
                ctx.arc(hx, hy, 5, 0, Math.PI * 2);
                ctx.fillStyle = cssVar('--color-surface') || '#101019';
                ctx.fill();
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            /* Period return */
            if (returnEl) {
                const pct = ((series[series.length - 1].p - series[0].p) / series[0].p) * 100;
                returnEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
                returnEl.className = 'num ' + (pct >= 0 ? 'text-success' : 'text-danger');
                returnEl.style.fontSize = 'var(--text-sm)';
                returnEl.style.fontWeight = '600';
            }
        }

        function hexToRgba(color, alpha) {
            const hex = color.replace('#', '').trim();
            if (hex.length !== 6) return `rgba(99,102,241,${alpha})`;
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }

        /* --- Hover / touch crosshair --- */
        function pointAt(clientX) {
            if (!geom) return -1;
            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const ratio = (x - geom.padL) / geom.plotW;
            return Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1))));
        }

        function moveCrosshair(clientX) {
            const idx = pointAt(clientX);
            if (idx === hover) return;
            hover = idx;
            draw();

            if (tooltip && geom && series[idx]) {
                tooltip.querySelector('.tt-price').textContent = usd(series[idx].p);
                tooltip.querySelector('.tt-date').textContent = labelFor(series[idx].t);
                tooltip.classList.add('show');

                // geom coords are canvas-relative; the tooltip is positioned
                // against .chart-canvas-wrap, so offset by the canvas's own box.
                const x = Math.min(Math.max(geom.xAt(idx), 70), geom.w - 70);
                tooltip.style.left = (x + canvas.offsetLeft) + 'px';
                tooltip.style.top = (geom.yAt(series[idx].p) + canvas.offsetTop) + 'px';
            }
        }

        function clearCrosshair() {
            hover = -1;
            if (tooltip) tooltip.classList.remove('show');
            draw();
        }

        canvas.addEventListener('pointermove', e => moveCrosshair(e.clientX));
        canvas.addEventListener('pointerleave', clearCrosshair);
        canvas.addEventListener('touchmove', e => {
            if (e.touches[0]) moveCrosshair(e.touches[0].clientX);
        }, { passive: true });
        canvas.addEventListener('touchend', clearCrosshair);

        /* --- Range switcher --- */
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                range = btn.dataset.range;
                series = buildSeries(range);
                hover = -1;
                if (tooltip) tooltip.classList.remove('show');
                draw();
            });
        });

        window.addEventListener('resize', draw);
        document.addEventListener('themechange', () => setTimeout(draw, 60));

        series = buildSeries(range);
        draw();

        /* Let the live-price loop nudge the last candle. */
        return {
            pushPrice: function (p) {
                if (!series.length) return;
                series[series.length - 1] = { t: Date.now(), p: p };
                if (hover < 0) draw();
            }
        };
    }

    /* ==============================================================
       Live price ticking in the header
       ============================================================== */
    function initLivePrice(chart) {
        const priceEl = document.getElementById('livePrice');
        const changeEl = document.getElementById('liveChange');
        const dayRangeEl = document.getElementById('statDayRange');
        const volEl = document.getElementById('statVolume');
        if (!priceEl) return;

        let dayLow = 171.10;
        let dayHigh = 174.82;
        let volume = 54.2;

        function paint() {
            priceEl.textContent = fix2(livePrice);

            const diff = livePrice - PREV_CLOSE;
            const pct = (diff / PREV_CLOSE) * 100;
            const up = diff >= 0;

            changeEl.innerHTML =
                `<i class="ph-bold ${up ? 'ph-trend-up' : 'ph-trend-down'}"></i> ` +
                `${up ? '+' : ''}${pct.toFixed(2)}% (${up ? '+' : '−'}$${Math.abs(diff).toFixed(2)})`;
            changeEl.className = 'num ' + (up ? 'text-success' : 'text-danger');
            changeEl.style.cssText =
                'font-weight:500;display:flex;align-items:center;gap:4px;justify-content:flex-end;margin-top:4px;font-size:var(--text-sm)';

            document.dispatchEvent(new CustomEvent('pricetick', { detail: livePrice }));
        }

        function tick() {
            const prev = livePrice;
            livePrice = Math.max(1, livePrice + (Math.random() - 0.49) * 0.42);

            dayLow = Math.min(dayLow, livePrice);
            dayHigh = Math.max(dayHigh, livePrice);
            volume += Math.random() * 0.06;

            paint();

            priceEl.classList.remove('up', 'down');
            void priceEl.offsetWidth;
            priceEl.classList.add(livePrice >= prev ? 'up' : 'down');
            setTimeout(() => priceEl.classList.remove('up', 'down'), 700);

            if (dayRangeEl) dayRangeEl.textContent = `${fix2(dayLow)} – ${fix2(dayHigh)}`;
            if (volEl) volEl.textContent = volume.toFixed(1) + 'M';
            if (chart) chart.pushPrice(livePrice);
        }

        paint();
        if (!REDUCED) setInterval(tick, 2500);
    }

    /* ==============================================================
       52-week range meter
       ============================================================== */
    function initRangeMeter() {
        const thumb = document.getElementById('rangeThumb');
        const badge = document.getElementById('rangePosBadge');
        if (!thumb) return;

        function update(price) {
            const pct = ((price - WEEK52_LOW) / (WEEK52_HIGH - WEEK52_LOW)) * 100;
            const clamped = Math.max(0, Math.min(100, pct));
            thumb.style.left = clamped + '%';

            if (badge) {
                badge.textContent = clamped.toFixed(0) + '% of range';
                badge.className = 'badge ' + (clamped > 66 ? 'badge-success' : clamped < 33 ? 'badge-danger' : 'badge-primary');
            }
        }

        update(livePrice);
        document.addEventListener('pricetick', e => update(e.detail));
    }

    /* ==============================================================
       Trade ticket
       ============================================================== */
    function initTradePanel() {
        const qty = document.getElementById('qty');
        if (!qty) return;

        const sideSwitch = document.getElementById('sideSwitch');
        const orderType = document.getElementById('orderType');
        const limitGroup = document.getElementById('limitGroup');
        const limitPrice = document.getElementById('limitPrice');
        const minus = document.getElementById('qtyMinus');
        const plus = document.getElementById('qtyPlus');
        const presets = document.getElementById('qtyPresets');
        const placeBtn = document.getElementById('placeOrder');
        const placeLabel = document.getElementById('placeLabel');

        const sumPrice = document.getElementById('sumPrice');
        const sumGross = document.getElementById('sumGross');
        const sumFee = document.getElementById('sumFee');
        const sumTotal = document.getElementById('sumTotal');
        const sumTotalLabel = document.getElementById('sumTotalLabel');

        let side = 'buy';

        function refPrice() {
            if (orderType.value === 'market') return livePrice;
            const v = parseFloat(limitPrice.value);
            return isFinite(v) && v > 0 ? v : livePrice;
        }

        function update() {
            const n = Math.max(1, parseInt(qty.value, 10) || 1);
            const p = refPrice();
            const gross = n * p;
            const total = side === 'buy' ? gross + FLAT_FEE : gross - FLAT_FEE;

            sumPrice.textContent = usd(p);
            sumGross.textContent = usd(gross);
            sumFee.textContent = usd(FLAT_FEE);
            sumTotal.textContent = usd(total);
            sumTotalLabel.textContent = side === 'buy' ? 'Estimated cost' : 'Estimated proceeds';
            placeLabel.textContent = `Login to ${side}`;
        }

        sideSwitch.querySelectorAll('.side-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                sideSwitch.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                side = btn.dataset.side;
                update();
            });
        });

        orderType.addEventListener('change', () => {
            const needsPrice = orderType.value !== 'market';
            limitGroup.hidden = !needsPrice;
            if (needsPrice && limitPrice) limitPrice.value = livePrice.toFixed(2);
            update();
        });

        limitPrice.addEventListener('input', update);
        qty.addEventListener('input', update);

        minus.addEventListener('click', () => {
            qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) - 1);
            update();
        });
        plus.addEventListener('click', () => {
            qty.value = (parseInt(qty.value, 10) || 0) + 1;
            update();
        });

        presets.querySelectorAll('.qty-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                qty.value = btn.dataset.qty;
                update();
            });
        });

        placeBtn.addEventListener('click', () => {
            const n = Math.max(1, parseInt(qty.value, 10) || 1);
            toast(
                `Simulated ${side} ticket: ${n} ${SYMBOL} @ ${usd(refPrice())}. Sign in to place a real order.`,
                side === 'buy' ? 'ph-check-circle' : 'ph-arrow-circle-up'
            );
        });

        // Market orders track the live price.
        document.addEventListener('pricetick', () => {
            if (orderType.value === 'market') update();
        });

        update();
    }

    /* ==============================================================
       Watchlist toggle (persisted locally)
       ============================================================== */
    function initWatchlist() {
        const btn = document.getElementById('watchBtn');
        if (!btn) return;

        const key = 'nova:watchlist';
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            list = [];
        }

        function paint() {
            const on = list.includes(SYMBOL);
            btn.classList.toggle('on', on);
            btn.querySelector('i').className = on ? 'ph-fill ph-star' : 'ph ph-star';
            btn.querySelector('span').textContent = on ? 'In watchlist' : 'Watchlist';
        }

        btn.addEventListener('click', () => {
            const on = list.includes(SYMBOL);
            list = on ? list.filter(s => s !== SYMBOL) : list.concat(SYMBOL);
            try {
                localStorage.setItem(key, JSON.stringify(list));
            } catch (e) { /* storage unavailable — keep the in-memory state */ }
            paint();
            toast(on ? `${SYMBOL} removed from watchlist` : `${SYMBOL} added to watchlist`, on ? 'ph-star' : 'ph-fill ph-star');
        });

        paint();
    }

    /* ==============================================================
       Simulated level-2 order book
       ============================================================== */
    function initOrderBook() {
        const bidWrap = document.getElementById('bidRows');
        const askWrap = document.getElementById('askRows');
        if (!bidWrap || !askWrap) return;

        const spreadEl = document.getElementById('bookSpread');
        const imbalanceEl = document.getElementById('bookImbalance');

        function render() {
            const bids = [];
            const asks = [];
            for (let i = 0; i < 6; i++) {
                bids.push({ p: livePrice - 0.02 - i * 0.03, q: Math.round(200 + Math.random() * 2600) });
                asks.push({ p: livePrice + 0.02 + i * 0.03, q: Math.round(200 + Math.random() * 2600) });
            }

            const maxQ = Math.max(...bids.concat(asks).map(r => r.q));
            const row = (r, cls) => `
                <div class="book-row ${cls}">
                    <div class="depth" style="width:${((r.q / maxQ) * 100).toFixed(0)}%"></div>
                    <span class="${cls === 'bid' ? 'text-success' : 'text-danger'}">${fix2(r.p)}</span>
                    <span>${r.q.toLocaleString('en-US')}</span>
                </div>`;

            bidWrap.innerHTML = bids.map(r => row(r, 'bid')).join('');
            askWrap.innerHTML = asks.map(r => row(r, 'ask')).join('');

            if (spreadEl) spreadEl.textContent = (asks[0].p - bids[0].p).toFixed(2);

            if (imbalanceEl) {
                const bidVol = bids.reduce((s, r) => s + r.q, 0);
                const askVol = asks.reduce((s, r) => s + r.q, 0);
                const skew = (bidVol / (bidVol + askVol)) * 100;
                imbalanceEl.textContent = skew.toFixed(0) + '% bid';
                imbalanceEl.className = skew >= 50 ? 'text-success' : 'text-danger';
            }
        }

        render();
        if (!REDUCED) setInterval(render, 3000);
    }

    /* ==============================================================
       Financial bars animate when their tab is first shown
       ============================================================== */
    function initFinancialBars() {
        const wrap = document.getElementById('finBars');
        if (!wrap) return;

        function fill() {
            wrap.querySelectorAll('.fin-row').forEach((row, i) => {
                const bar = row.querySelector('.fin-fill');
                if (!bar) return;
                setTimeout(() => { bar.style.width = row.dataset.pct + '%'; }, i * 90);
            });
        }

        const group = wrap.closest('[data-tabs]');
        if (group) {
            group.addEventListener('tabchange', e => {
                if (e.detail === 'financials') fill();
            });
        }
    }

    /* ==============================================================
       Related instruments
       ============================================================== */
    function initRelated() {
        const wrap = document.getElementById('relatedList');
        if (!wrap) return;

        const rows = [
            { s: 'MSFT', n: 'Microsoft Corp.', p: 338.11, c: -0.40 },
            { s: 'NVDA', n: 'NVIDIA Corp.', p: 460.18, c: 0.90 },
            { s: 'GOOGL', n: 'Alphabet Inc.', p: 138.42, c: 0.74 },
            { s: 'META', n: 'Meta Platforms', p: 312.08, c: -0.28 }
        ];

        wrap.innerHTML = rows.map(r => {
            const up = r.c >= 0;
            return `
                <a href="instrument-detail.html" class="instrument-card" style="flex-direction:row;align-items:center;justify-content:space-between;padding:0.7rem 0.9rem">
                    <div>
                        <div class="instrument-symbol" style="font-size:var(--text-base)">${r.s}</div>
                        <div class="instrument-name" style="font-size:var(--text-xs)">${r.n}</div>
                    </div>
                    <div style="text-align:right">
                        <div class="num" style="font-weight:500">${fix2(r.p)}</div>
                        <div class="num ${up ? 'text-success' : 'text-danger'}" style="font-size:var(--text-xs)">
                            ${up ? '+' : ''}${r.c.toFixed(2)}%
                        </div>
                    </div>
                </a>`;
        }).join('');
    }

    /* ==============================================================
       Toasts
       ============================================================== */
    function toast(message, icon) {
        const stack = document.getElementById('toastStack');
        if (!stack) return;

        const el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = `<i class="${icon && icon.startsWith('ph-fill') ? icon : 'ph-bold ' + (icon || 'ph-info')}"></i><span>${message}</span>`;
        stack.appendChild(el);

        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 320);
        }, 3600);
    }
})();
