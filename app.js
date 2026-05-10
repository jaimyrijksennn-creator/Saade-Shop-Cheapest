document.addEventListener('DOMContentLoaded', () => {

    let currentCategory = 'robux';
    let allProducts = {};

    const navbar       = document.getElementById('navbar');
    const productsGrid = document.getElementById('productsGrid');
    const tabBtns      = document.querySelectorAll('.tab-btn');
    const faqList      = document.getElementById('faqList');
    const reviewsTrack = document.getElementById('reviewsTrack');
    const navToggle    = document.getElementById('navToggle');
    const navLinks     = document.getElementById('navLinks');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose   = document.getElementById('modalClose');
    const modalContent = document.getElementById('modalContent');
    const toast        = document.getElementById('toast');
    const navAuth      = document.getElementById('navAuth');

    // ── Nav Auth Button ───────────────────────────────────────
    function renderNavAuth() {
        const raw = localStorage.getItem('saade_user');
        const user = raw ? JSON.parse(raw) : null;
        if (user) {
            navAuth.innerHTML = `
                <div class="nav-user-btn" id="navUserBtn">
                    <span class="nav-user-dot"></span>
                    <span>${user.username}</span>
                    <span style="font-size:10px;opacity:.6">▼</span>
                    <div class="nav-user-dropdown" id="navUserDropdown">
                        <div class="nav-dd-name">${user.username}</div>
                        <div class="nav-dd-role">${user.role === 'admin' ? '⭐ Admin' : '👤 Member'}</div>
                        <hr class="nav-dd-divider"/>
                        ${user.role === 'admin' ? '<a href="/admin" class="nav-dd-item">🖥️ Admin Panel</a>' : ''}
                        <button class="nav-dd-item nav-dd-logout" onclick="doLogout()">🚪 Logout</button>
                    </div>
                </div>`;
            document.getElementById('navUserBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('navUserDropdown').classList.toggle('open');
            });
            document.addEventListener('click', () => {
                const dd = document.getElementById('navUserDropdown');
                if (dd) dd.classList.remove('open');
            });
        } else {
            navAuth.innerHTML = `<a href="/login" class="btn btn-ghost" id="navLoginBtn">🔐 Login</a>`;
        }
    }

    window.doLogout = function() {
        localStorage.removeItem('saade_token');
        localStorage.removeItem('saade_user');
        window.location.reload();
    };

    renderNavAuth();


    const reviews = [
        { name: 'vXenon',      stars: 5, text: 'Cheapest Robux ever. Delivery in 30 seconds. Absolutely 10/10.' },
        { name: 'RobloxLover', stars: 5, text: 'Bought a Super Happy Face — trade sent instantly. Very trusted!' },
        { name: 'Daan_NL',     stars: 5, text: 'Eerst twijfelde ik, maar het werkt echt perfect. Goede service!' },
        { name: 'Syndicate',   stars: 4, text: 'Best support team. Helped me through the whole process.' },
        { name: 'x_Gaming',    stars: 5, text: 'Super fast, super cheap. Bought 3 times already. No issues.' }
    ];

    const faqs = [
        { q: 'Is it safe for my account?',         a: 'Yes! Legitimate methods only. 5,000+ orders, zero bans.' },
        { q: 'How long does delivery take?',        a: 'Robux: 1-5 minutes. Limiteds: within 10 minutes of payment.' },
        { q: 'What payment methods do you accept?', a: 'We only accept Apple Gift Cards purchased via G2A. The link is for a €10 card — select a higher denomination on the site if you need more.' },
        { q: 'Do I need to give my password?',      a: 'Never. We only need your Roblox username or trade link.' },
        { q: 'What if I have a problem?',           a: 'Open a ticket on Discord. We respond within minutes, 24/7.' }
    ];

    const FALLBACK = {
        robux: [
            { id:'r1', name:'400 Robux',   price:'1.49',  icon:'R$', desc:'Instant transfer via Gamepass/Group.', popular:false },
            { id:'r2', name:'800 Robux',   price:'2.99',  icon:'R$', desc:'Fast delivery. Most popular choice.',  popular:true  },
            { id:'r3', name:'1700 Robux',  price:'5.99',  icon:'R$', desc:'Great value. Always in stock.',        popular:false },
            { id:'r4', name:'4500 Robux',  price:'14.99', icon:'R$', desc:'Bulk pricing. Professional package.',  popular:false },
            { id:'r5', name:'10000 Robux', price:'32.99', icon:'R$', desc:'Ultimate package for big players.',    popular:true  },
            { id:'r6', name:'22500 Robux', price:'69.99', icon:'R$', desc:'Wholesale price. Limited stock.',      popular:false }
        ],
        limiteds: [
            { id:'l1', name:'Super Happy Face', price:'120.00', icon:'🎭', desc:'Rare limited. Immediate trade.', popular:true  },
            { id:'l2', name:'Ice Valkyrie',     price:'85.00',  icon:'❄️', desc:'High demand. Safe trade.',       popular:false },
            { id:'l3', name:'Dominus Empyreus', price:'450.00', icon:'👑', desc:'Holy grail of Limiteds.',        popular:false },
            { id:'l4', name:'Violet Valkyrie',  price:'65.00',  icon:'💜', desc:'Clean history. Fast delivery.',  popular:false }
        ],
        gamepass: [
            { id:'g1', name:'Blox Fruits Perm', price:'12.99', icon:'🍍', desc:'Any permanent fruit of choice.', popular:true  },
            { id:'g2', name:'Pet Sim 99 Huges', price:'8.49',  icon:'🐱', desc:'Random Huge pet delivery.',      popular:false }
        ],
        accounts: [
            { id:'a1', name:'2010 Account',    price:'15.00', icon:'👤', desc:'Old vintage with rare badges.',        popular:false },
            { id:'a2', name:'Stacked Account', price:'45.00', icon:'💰', desc:'50k+ spent & loads of items.',         popular:true  }
        ]
    };

    // ── Toast ─────────────────────────────────────────────
    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.className = `toast toast-${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // ── Fetch products from API (fallback to local data) ──
    async function fetchProducts() {
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error();
            allProducts = await res.json();
        } catch {
            allProducts = FALLBACK;
        }
        renderProducts(currentCategory);
    }

    // ── Render product cards ───────────────────────────────
    function renderProducts(category) {
        const items = allProducts[category] || [];
        productsGrid.style.opacity = '0';
        productsGrid.style.transform = 'translateY(16px)';
        setTimeout(() => {
            productsGrid.innerHTML = '';
            items.forEach((p, i) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.style.animationDelay = `${i * 60}ms`;
                card.innerHTML = `
                    ${p.popular ? '<div class="card-badge">⭐ Best Value</div>' : ''}
                    <div class="product-icon">${p.icon}</div>
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-desc">${p.desc}</p>
                    <div class="product-footer">
                        <div class="product-price"><span class="price-currency">€</span>${p.price}</div>
                        <button class="btn btn-primary buy-btn" id="buy-${p.id}" data-id="${p.id}">Buy Now</button>
                    </div>
                `;
                productsGrid.appendChild(card);
            });
            productsGrid.style.opacity = '1';
            productsGrid.style.transform = 'translateY(0)';
            productsGrid.style.transition = 'all 0.35s ease';
        }, 150);
    }

    // ── Order Modal ───────────────────────────────────────
    function openOrderModal(productId) {
        const product = Object.values(allProducts).flat().find(p => p.id === productId);
        if (!product) return;

        const g2aUrl = 'https://www.g2a.com/nl/apple-gift-card-10-eur-apple-key-netherlands-i10000338397012';

        modalContent.innerHTML = `
            <div class="modal-header">
                <div class="modal-icon">${product.icon}</div>
                <div>
                    <h2 class="modal-title">${product.name}</h2>
                    <div class="modal-price" id="modalDisplayPrice"><span class="price-currency">€</span>${product.price}</div>
                </div>
            </div>
            <div class="modal-body">
                <label class="field-label">Your Roblox Username</label>
                <input class="field-input" id="orderUsername" type="text" placeholder="e.g. Saade123" autocomplete="off" />

                <label class="field-label" style="margin-top:20px;">Payment Method</label>
                <div class="giftcard-method">
                    <div class="giftcard-icon">🎁</div>
                    <div class="giftcard-info">
                        <div class="giftcard-title">Apple Gift Card (G2A)</div>
                        <div class="giftcard-desc">Only payment method accepted</div>
                    </div>
                    <div class="giftcard-check">✓</div>
                </div>

                <div class="giftcard-warning">
                    <span class="warning-icon">⚠️</span>
                    <span>The link below is for a <strong>€10 card</strong>. If you need more, select a higher denomination on G2A before buying.</span>
                </div>

                <a href="${g2aUrl}" target="_blank" class="btn btn-giftcard" id="buyGiftcardBtn">
                    🔗 Buy Gift Card on G2A
                </a>

                <label class="field-label" style="margin-top:20px;">Discount Code <span style="color:var(--text-muted);font-size:11px;text-transform:none;letter-spacing:0">(optional)</span></label>
                <div style="display:flex;gap:8px;">
                    <input class="field-input" id="couponInput" type="text" placeholder="e.g. SUMMER20" style="flex:1;text-transform:uppercase" />
                    <button id="applyCouponBtn" onclick="applyCoupon('${product.price}')" style="padding:14px 18px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:12px;color:#a78bfa;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;">Apply</button>
                </div>
                <div id="couponResult" style="margin-top:8px;font-size:13px;display:none;padding:10px 14px;border-radius:9px;"></div>

                <button class="btn btn-primary btn-lg" id="confirmOrderBtn" style="width:100%;margin-top:16px;">
                    ✅ I Bought the Gift Card — Confirm Order
                </button>
                <p class="modal-note">After confirming, open a ticket on our Discord and send the gift card code to receive your items.</p>
            </div>
        `;

        const selectedPay = 'GiftCard';
        let appliedCoupon = null;

        // Global coupon apply function (called from inline onclick)
        window.applyCoupon = async (originalPrice) => {
            const code = document.getElementById('couponInput').value.trim();
            const resultEl = document.getElementById('couponResult');
            if (!code) return;
            try {
                const r = await fetch('/api/coupon/validate', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ code, price: originalPrice })
                });
                const d = await r.json();
                if (r.ok) {
                    appliedCoupon = code;
                    resultEl.style.display = 'block';
                    resultEl.style.background = 'rgba(34,197,94,0.1)';
                    resultEl.style.border = '1px solid rgba(34,197,94,0.3)';
                    resultEl.style.color = '#4ade80';
                    const disc = d.type==='percent' ? d.value+'% off' : '€'+d.value+' off';
                    resultEl.textContent = `✅ Coupon "${code}" applied! ${disc} → New price: €${d.finalPrice}`;
                    document.getElementById('modalDisplayPrice').innerHTML = `<span style="text-decoration:line-through;color:var(--text-muted);font-size:16px">€${originalPrice}</span> <span style="color:#4ade80">€${d.finalPrice}</span>`;
                } else {
                    appliedCoupon = null;
                    resultEl.style.display = 'block';
                    resultEl.style.background = 'rgba(239,68,68,0.1)';
                    resultEl.style.border = '1px solid rgba(239,68,68,0.3)';
                    resultEl.style.color = '#f87171';
                    resultEl.textContent = '❌ ' + d.error;
                }
            } catch {
                resultEl.style.display = 'block';
                resultEl.textContent = '⚠️ Could not validate coupon';
            }
        };

        document.getElementById('confirmOrderBtn').addEventListener('click', async () => {
            const username = document.getElementById('orderUsername').value.trim();
            if (!username) { showToast('Please enter your Roblox username!', 'error'); return; }
            const btn = document.getElementById('confirmOrderBtn');
            btn.disabled = true;
            btn.textContent = 'Placing order…';
            try {
                const res = await fetch('/api/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, username, paymentMethod: 'Apple Gift Card (G2A)', couponCode: appliedCoupon || undefined })
                });
                const data = await res.json();
                if (res.ok) {
                    closeModal();
                    showToast(`✅ Order ${data.orderId} placed! Check Discord.`, 'success');
                } else {
                    showToast(`❌ ${data.error}`, 'error');
                    btn.disabled = false; btn.textContent = 'Confirm Order';
                }
            } catch {
                showToast('⚠️ Server offline — open a Discord ticket to order.', 'error');
                btn.disabled = false; btn.textContent = 'Confirm Order';
            }
        });

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ── FAQ ───────────────────────────────────────────────
    function renderFAQs() {
        faqs.forEach(faq => {
            const item = document.createElement('div');
            item.className = 'faq-item';
            item.innerHTML = `
                <button class="faq-q"><span>${faq.q}</span><span class="faq-icon">+</span></button>
                <div class="faq-a">${faq.a}</div>
            `;
            item.querySelector('.faq-q').addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                document.querySelectorAll('.faq-item.open').forEach(i => {
                    i.classList.remove('open');
                    i.querySelector('.faq-icon').textContent = '+';
                });
                if (!isOpen) { item.classList.add('open'); item.querySelector('.faq-icon').textContent = '−'; }
            });
            faqList.appendChild(item);
        });
    }

    // ── Reviews ───────────────────────────────────────────
    function renderReviews() {
        reviews.forEach(r => {
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
                <p class="review-text">"${r.text}"</p>
                <div class="review-name">${r.name}</div>
                <div class="review-badge">✅ Verified Buyer</div>
            `;
            reviewsTrack.appendChild(card);
        });
    }

    // ── Scroll & active nav link ──────────────────────────
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
        const sections = ['home','products','reviews','faq','tos'];
        let current = '';
        sections.forEach(id => {
            const sec = document.getElementById(id);
            if (sec && window.scrollY >= sec.offsetTop - 100) current = id;
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    });

    // ── Mobile Nav ────────────────────────────────────────
    navToggle.addEventListener('click', () => navLinks.classList.toggle('nav-open'));

    // ── Tab switching ─────────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.tab;
            renderProducts(currentCategory);
        });
    });

    // ── Buy button (event delegation) ────────────────────
    productsGrid.addEventListener('click', e => {
        const btn = e.target.closest('.buy-btn');
        if (btn) openOrderModal(btn.dataset.id);
    });

    // ── Modal close ───────────────────────────────────────
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ── Scroll animations ─────────────────────────────────
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });

    document.querySelectorAll('.stat-card, .section-header, .hiw-step').forEach(el => {
        el.classList.add('fade-up');
        observer.observe(el);
    });

    // ── Animated counter ──────────────────────────────────
    const counterEl = document.querySelector('[data-count]');
    if (counterEl) {
        const target = parseInt(counterEl.dataset.count);
        const obs2 = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                let c = 0;
                const step = Math.ceil(target / 60);
                const timer = setInterval(() => {
                    c = Math.min(c + step, target);
                    counterEl.textContent = c.toLocaleString() + '+';
                    if (c >= target) clearInterval(timer);
                }, 20);
                obs2.disconnect();
            }
        });
        obs2.observe(counterEl);
    }

    // ── Init ─────────────────────────────────────────────
    fetchProducts();
    renderFAQs();
    renderReviews();
});
