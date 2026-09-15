/**
 * NOVATRADE - About page interactions
 * Scroll-driven timeline progress + expandable milestone cards.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTimeline();
});

function initTimeline() {
    const timeline = document.getElementById('timeline');
    const progress = document.getElementById('timelineProgress');
    if (!timeline) return;

    const items = Array.from(timeline.querySelectorAll('.timeline-item'));

    /* --- Expand / collapse a milestone (first one starts open) --- */
    items.forEach(item => {
        const card = item.querySelector('.timeline-card');
        const detail = item.querySelector('.timeline-detail');
        if (!card || !detail) return;

        card.addEventListener('click', () => {
            const wasOpen = card.classList.contains('open');
            timeline.querySelectorAll('.timeline-card.open').forEach(c => c.classList.remove('open'));
            if (!wasOpen) card.classList.add('open');
        });
    });

    /* --- Fill the spine as the section scrolls past, lighting each dot --- */
    if (!progress) return;

    let ticking = false;

    function update() {
        const rect = timeline.getBoundingClientRect();
        const anchor = window.innerHeight * 0.55;

        // 0 → 1 across the height of the timeline.
        const travelled = anchor - rect.top;
        const ratio = Math.max(0, Math.min(1, travelled / rect.height));
        progress.style.height = (ratio * 100) + '%';

        const fillPx = rect.top + rect.height * ratio;
        items.forEach(item => {
            const dot = item.querySelector('.dot');
            if (!dot) return;
            const dotTop = dot.getBoundingClientRect().top;
            item.classList.toggle('reached', dotTop <= fillPx);
        });

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    window.addEventListener('resize', update);
    update();
}
