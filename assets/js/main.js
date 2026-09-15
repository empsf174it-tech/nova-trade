/**
 * NOVATRADE - Main Javascript
 * Theme toggling, navigation drawer, and the shared interaction layer
 * (scroll progress, reveal-on-scroll, card spotlight, counters, tabs, accordions).
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initScrollChrome();
    initReveal();
    initSpotlight();
    initCounters();
    initTabs();
    initAccordions();
    initMagnetic();
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initTheme() {
    const themeToggles = document.querySelectorAll('.theme-toggle');
    const html = document.documentElement;

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        html.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        html.setAttribute('data-theme', 'dark');
    }

    updateToggleIcons(html.getAttribute('data-theme') || 'light');

    themeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateToggleIcons(newTheme);
            document.dispatchEvent(new CustomEvent('themechange', { detail: newTheme }));
        });
    });
}

function updateToggleIcons(theme) {
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(toggle => {
        toggle.innerHTML = theme === 'dark'
            ? '<i class="ph ph-sun"></i>'
            : '<i class="ph ph-moon"></i>';
    });
}

function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const drawer = document.querySelector('.nav-drawer');
    const overlay = document.querySelector('.drawer-overlay');
    const closeBtn = document.querySelector('.drawer-close');

    if (!hamburger || !drawer || !overlay) return;

    function openDrawer() {
        drawer.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}

/**
 * Condenses the navbar and drives the reading-progress bar under it.
 */
function initScrollChrome() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let bar = navbar.querySelector('.scroll-progress');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'scroll-progress';
        navbar.appendChild(bar);
    }

    let ticking = false;
    function update() {
        const y = window.scrollY;
        navbar.classList.toggle('scrolled', y > 20);

        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    update();
}

/**
 * Staggered reveal for anything marked .reveal.
 * data-reveal-delay (ms) offsets an individual element.
 */
function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const delay = parseInt(el.dataset.revealDelay || '0', 10);
            setTimeout(() => el.classList.add('visible'), delay);
            observer.unobserve(el);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach(el => observer.observe(el));
}

/**
 * Cursor-following glow on cards + optional 3D tilt for [data-tilt].
 */
function initSpotlight() {
    const cards = document.querySelectorAll('.card, [data-spotlight]');

    cards.forEach(card => {
        card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            card.style.setProperty('--mx', x + 'px');
            card.style.setProperty('--my', y + 'px');

            if (card.hasAttribute('data-tilt') && !prefersReducedMotion) {
                const rx = ((y / r.height) - 0.5) * -8;
                const ry = ((x / r.width) - 0.5) * 8;
                card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
            }
        });

        card.addEventListener('pointerleave', () => {
            if (card.hasAttribute('data-tilt')) card.style.transform = '';
        });
    });
}

/**
 * Animated number counters. Usage:
 * <span class="counter" data-target="128500" data-decimals="0"
 *       data-prefix="$" data-suffix="+"></span>
 */
function initCounters() {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    function run(el) {
        const target = parseFloat(el.dataset.target || '0');
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = parseInt(el.dataset.duration || '1600', 10);

        if (prefersReducedMotion) {
            el.textContent = prefix + formatNumber(target, decimals) + suffix;
            return;
        }

        const start = performance.now();
        function frame(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + formatNumber(target * eased, decimals) + suffix;
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
        counters.forEach(run);
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            run(entry.target);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.4 });

    counters.forEach(el => observer.observe(el));
}

function formatNumber(value, decimals) {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Generic tab groups.
 * <div data-tabs> <button data-tab="id"> ... <div data-panel="id">
 */
function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(group => {
        const buttons = group.querySelectorAll('[data-tab]');
        const panels = group.querySelectorAll('[data-panel]');
        if (!buttons.length) return;

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.tab;
                buttons.forEach(b => {
                    const on = b === btn;
                    b.classList.toggle('active', on);
                    b.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                panels.forEach(p => {
                    const on = p.dataset.panel === id;
                    p.classList.toggle('active', on);
                    p.hidden = !on;
                });
                group.dispatchEvent(new CustomEvent('tabchange', { detail: id }));
            });
        });
    });
}

/**
 * Accordion / FAQ. <div data-accordion> with .accordion-item > .accordion-trigger + .accordion-body
 */
function initAccordions() {
    document.querySelectorAll('[data-accordion]').forEach(group => {
        const items = group.querySelectorAll('.accordion-item');

        // Size any item marked open in the markup from its real content.
        group.querySelectorAll('.accordion-item.open .accordion-body').forEach(body => {
            body.style.maxHeight = body.scrollHeight + 'px';
        });

        items.forEach(item => {
            const trigger = item.querySelector('.accordion-trigger');
            const body = item.querySelector('.accordion-body');
            if (!trigger || !body) return;

            trigger.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');

                if (!group.hasAttribute('data-accordion-multi')) {
                    items.forEach(other => {
                        other.classList.remove('open');
                        const ob = other.querySelector('.accordion-body');
                        const ot = other.querySelector('.accordion-trigger');
                        if (ob) ob.style.maxHeight = null;
                        if (ot) ot.setAttribute('aria-expanded', 'false');
                    });
                }

                if (!isOpen) {
                    item.classList.add('open');
                    body.style.maxHeight = body.scrollHeight + 'px';
                    trigger.setAttribute('aria-expanded', 'true');
                } else {
                    item.classList.remove('open');
                    body.style.maxHeight = null;
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Keep an open panel correctly sized when the viewport reflows.
        window.addEventListener('resize', () => {
            group.querySelectorAll('.accordion-item.open .accordion-body').forEach(body => {
                body.style.maxHeight = body.scrollHeight + 'px';
            });
        });
    });
}

/**
 * Subtle magnetic pull on [data-magnetic] buttons.
 */
function initMagnetic() {
    if (prefersReducedMotion) return;

    document.querySelectorAll('[data-magnetic]').forEach(el => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left - r.width / 2) * 0.18;
            const y = (e.clientY - r.top - r.height / 2) * 0.28;
            el.style.transform = `translate(${x}px, ${y}px)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
}

/**
 * Utility for basic form validation
 * Used on Contact, Login, Register
 */
window.validateForm = function (formId, validationRules) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        let isValid = true;

        validationRules.forEach(rule => {
            const field = form.querySelector(`[name="${rule.name}"]`);
            if (!field) return;

            const formGroup = field.closest('.form-group');
            const errorMsg = formGroup.querySelector('.error-msg');
            const value = field.type === 'checkbox' ? field.checked : field.value.trim();

            let fieldValid = true;

            if (rule.required && !value) {
                fieldValid = false;
            } else if (rule.type === 'email' && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
                fieldValid = false;
            } else if (rule.minLength && value.length < rule.minLength) {
                fieldValid = false;
            } else if (rule.match) {
                const matchField = form.querySelector(`[name="${rule.match}"]`);
                if (matchField && value !== matchField.value) {
                    fieldValid = false;
                }
            }

            if (!fieldValid) {
                formGroup.classList.add('has-error');
                field.classList.add('error');
                field.classList.remove('success');
                if (errorMsg) errorMsg.textContent = rule.message || 'Invalid field';
                isValid = false;
            } else {
                formGroup.classList.remove('has-error');
                field.classList.remove('error');
                if (field.type !== 'checkbox') {
                    field.classList.add('success');
                }
            }

            field.addEventListener('input', () => {
                formGroup.classList.remove('has-error');
                field.classList.remove('error');
            }, { once: true });
        });

        if (isValid) {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Success';
            submitBtn.style.backgroundImage = 'none';
            submitBtn.style.backgroundColor = 'var(--color-accent)';

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.backgroundColor = '';
                submitBtn.style.backgroundImage = '';
                form.reset();
                form.querySelectorAll('.success').forEach(el => el.classList.remove('success'));
            }, 3000);
        }
    });
};
