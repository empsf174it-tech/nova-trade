/**
 * NOVATRADE - Markets Logic
 * Handles filtering and rendering of the instrument grid.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Placeholder Data
    const instruments = [
        { symbol: 'AAPL', name: 'Apple Inc.', price: '173.50', change: '+1.2%', type: 'equity', isUp: true },
        { symbol: 'MSFT', name: 'Microsoft Corp.', price: '338.11', change: '-0.4%', type: 'equity', isUp: false },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: '214.65', change: '+2.8%', type: 'equity', isUp: true },
        { symbol: 'NVDA', name: 'NVIDIA Corp.', price: '460.18', change: '+0.9%', type: 'equity', isUp: true },
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: '435.20', change: '+0.5%', type: 'mutual-fund', isUp: true },
        { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: '366.12', change: '-0.2%', type: 'mutual-fund', isUp: false },
        { symbol: 'ES1!', name: 'S&P 500 E-mini Futures', price: '4390.25', change: '+0.1%', type: 'derivative', isUp: true },
        { symbol: 'NQ1!', name: 'Nasdaq 100 E-mini', price: '14820.50', change: '-0.3%', type: 'derivative', isUp: false },
        { symbol: 'VIX', name: 'CBOE Volatility Index', price: '14.25', change: '-2.1%', type: 'derivative', isUp: false },
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: '145.30', change: '+0.6%', type: 'equity', isUp: true },
        { symbol: 'ARKK', name: 'ARK Innovation ETF', price: '41.15', change: '+1.5%', type: 'mutual-fund', isUp: true },
        { symbol: 'VTI', name: 'Vanguard Total Stock', price: '218.40', change: '+0.4%', type: 'mutual-fund', isUp: true }
    ];

    const grid = document.getElementById('marketGrid');
    const filterBtns = document.querySelectorAll('.filter-btn');

    if (!grid) return;

    function renderGrid(filterType) {
        grid.innerHTML = '';
        
        const filtered = filterType === 'all' 
            ? instruments 
            : instruments.filter(item => item.type === filterType);

        filtered.forEach(item => {
            const card = document.createElement('a');
            card.href = 'instrument-detail.html';
            card.className = 'instrument-card';
            
            const colorClass = item.isUp ? 'text-success' : 'text-danger';
            const iconClass = item.isUp ? 'ph-trend-up' : 'ph-trend-down';
            
            // Format type badge text
            const typeLabel = item.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

            card.innerHTML = `
                <div class="instrument-header">
                    <span class="instrument-symbol">${item.symbol}</span>
                    <span class="badge" style="font-size: 0.65rem;">${typeLabel}</span>
                </div>
                <div class="instrument-name">${item.name}</div>
                <div class="instrument-price-row">
                    <span class="instrument-price">$${item.price}</span>
                    <span class="instrument-change ${colorClass}">
                        <i class="ph-bold ${iconClass}"></i> ${item.change}
                    </span>
                </div>
            `;
            
            grid.appendChild(card);
        });
    }

    // Initial render
    renderGrid('all');

    // Filter Listeners
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Render specific type
            const filter = e.target.getAttribute('data-filter');
            renderGrid(filter);
        });
    });
});
