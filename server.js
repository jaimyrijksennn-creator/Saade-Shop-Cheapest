const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── File-based DB helpers ───────────────────────────────────
const ORDERS_FILE  = path.join(__dirname, 'data', 'orders.json');
const USERS_FILE   = path.join(__dirname, 'data', 'users.json');
const COUPONS_FILE = path.join(__dirname, 'data', 'coupons.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

function readJSON(file, def = []) {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : def; }
    catch { return def; }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let orders  = readJSON(ORDERS_FILE);
let users   = readJSON(USERS_FILE);
let coupons = readJSON(COUPONS_FILE);

// ── Products ────────────────────────────────────────────────
// Robux pricing tiers ($ per 1K Robux)
const robuxRates = [
    { min: 10000,  max: 24999,  ratePerK: 1.00, method: 'Gamepass' },
    { min: 25000,  max: 49999,  ratePerK: 0.90, method: 'Gamepass' },
    { min: 50000,  max: 99999,  ratePerK: 0.80, method: 'Gamepass' },
    { min: 100000, max: 249999, ratePerK: 0.70, method: 'Gamepass' },
    { min: 250000, max: 499999, ratePerK: 0.60, method: 'Gamepass' },
    { min: 500000, max: 10000000, ratePerK: 0.50, method: 'Gamepass' }
];

const products = {
    robux: [
        { id:'r1',  name:'10,000 Robux',     price:'10.00',   icon:'R$', desc:'Gamepass · $1.00/K. Instant delivery.',           popular:false, tag:'Standard' },
        { id:'r2',  name:'25,000 Robux',      price:'22.50',   icon:'R$', desc:'Gamepass · $0.90/K. Best mid-range value.',       popular:false, tag:'Standard' },
        { id:'r3',  name:'50,000 Robux',      price:'40.00',   icon:'R$', desc:'Bundle deal · Gamepass. Most popular!',           popular:true,  tag:'Bundle'   },
        { id:'r4',  name:'75,000 Robux',      price:'67.50',   icon:'R$', desc:'Gamepass · $0.90/K. Bulk discount.',              popular:false, tag:'Standard' },
        { id:'r5',  name:'100,000 Robux',     price:'70.00',   icon:'R$', desc:'Bundle deal · $0.70/K. Premium package.',         popular:true,  tag:'Bundle'   },
        { id:'r6',  name:'150,000 Robux',     price:'105.00',  icon:'R$', desc:'Bundle deal · $0.70/K.',                          popular:false, tag:'Bundle'   },
        { id:'r7',  name:'200,000 Robux',     price:'140.00',  icon:'R$', desc:'Bundle deal · $0.70/K.',                          popular:false, tag:'Bundle'   },
        { id:'r8',  name:'250,000 Robux',     price:'150.00',  icon:'R$', desc:'Bundle deal · $0.60/K. Huge value!',              popular:false, tag:'Bundle'   },
        { id:'r9',  name:'500,000 Robux',     price:'250.00',  icon:'R$', desc:'Bundle deal · $0.50/K. Pro seller package.',      popular:false, tag:'Bundle'   },
        { id:'r10', name:'750,000 Robux',     price:'375.00',  icon:'R$', desc:'Bundle deal · $0.50/K.',                          popular:false, tag:'Bundle'   },
        { id:'r11', name:'1,000,000 Robux',   price:'500.00',  icon:'R$', desc:'1M Robux · $0.50/K. Elite tier.',                 popular:false, tag:'Bundle'   },
        { id:'r12', name:'3,000,000 Robux',   price:'1500.00', icon:'R$', desc:'3M Robux · $0.50/K. Wholesale.',                  popular:false, tag:'Wholesale'}
    ],
    limiteds: [
        { id:'l1', name:'Super Happy Face', price:'120.00', icon:'🎭', desc:'Rare limited. Immediate trade.', popular:true  },
        { id:'l2', name:'Ice Valkyrie',     price:'85.00',  icon:'❄️', desc:'High demand. Safe trade.',       popular:false },
        { id:'l3', name:'Dominus Empyreus', price:'450.00', icon:'👑', desc:'Holy grail of Limiteds.',        popular:false },
        { id:'l4', name:'Violet Valkyrie',  price:'65.00',  icon:'💜', desc:'Clean history. Fast delivery.',  popular:false }
    ],
    accounts: [
        { id:'a1', name:'Roblox 50K Robux Acc',  price:'30.00',  icon:'🎮', desc:'Account pre-loaded with 50,000 Robux.',   popular:false },
        { id:'a2', name:'Roblox 75K Robux Acc',  price:'40.00',  icon:'🎮', desc:'Account pre-loaded with 75,000 Robux.',   popular:false },
        { id:'a3', name:'Roblox 100K Robux Acc', price:'50.00',  icon:'🎮', desc:'Account pre-loaded with 100,000 Robux.',  popular:true  },
        { id:'a4', name:'Roblox 150K Robux Acc', price:'65.00',  icon:'🎮', desc:'Account pre-loaded with 150,000 Robux.',  popular:false },
        { id:'a5', name:'Roblox 200K Robux Acc', price:'80.00',  icon:'🎮', desc:'Account pre-loaded with 200,000 Robux.',  popular:false },
        { id:'a6', name:'Roblox 250K Robux Acc', price:'100.00', icon:'🎮', desc:'Account pre-loaded with 250,000 Robux.',  popular:true  },
        { id:'a7', name:'Steam Fresh x50',        price:'10.00',  icon:'🖥️', desc:'50 fresh Steam accounts. Instant delivery.', popular:false }
    ],
    executor: [
        { id:'e1', name:'Executor 7 Days',    price:'5.00',   icon:'⚡', desc:'7-day executor license. All features included.', popular:false },
        { id:'e2', name:'Executor 1 Month',   price:'10.00',  icon:'⚡', desc:'1-month executor license. Best value.',           popular:true  },
        { id:'e3', name:'Executor Lifetime',  price:'25.00',  icon:'⚡', desc:'Lifetime executor license. One-time payment.',    popular:false },
        { id:'e4', name:'Resell Panel',       price:'150.00', icon:'🏪', desc:'Full resell panel access. Start your own shop.',  popular:false }
    ]
};

// ── Auth Middleware ─────────────────────────────────────────
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

function adminMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// ══════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ══════════════════════════════════════════════════════════════

// Products
app.get('/api/products', (req, res) => res.json(products));
app.get('/api/products/:category', (req, res) => {
    const cat = products[req.params.category];
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
});

// Config (Discord link etc for frontend)
app.get('/api/config', (req, res) => {
    res.json({
        discordLink: process.env.DISCORD_LINK || 'https://discord.gg/Wk6E9nFZmf',
        g2aLink: process.env.G2A_LINK
    });
});

// ── User Registration ───────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, robloxUsername } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required.' });
    if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered.' });
    if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
        id: 'USR-' + Date.now(),
        username,
        email,
        password: hashed,
        robloxUsername: robloxUsername || '',
        role: 'user',
        createdAt: new Date().toISOString(),
        totalOrders: 0
    };
    users.push(newUser);
    writeJSON(USERS_FILE, users);

    const token = jwt.sign({ id: newUser.id, username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, username, email, robloxUsername, role: 'user' } });
});

// ── User Login ──────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, robloxUsername: user.robloxUsername, role: user.role } });
});

// ── Admin Login ─────────────────────────────────────────────
app.post('/api/auth/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin credentials.' });
    }
    const token = jwt.sign({ id: 'admin', username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: 'admin', username, role: 'admin' } });
});

// ── Get current user ────────────────────────────────────────
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, username: user.username, email: user.email, robloxUsername: user.robloxUsername, role: user.role });
});

// ── Validate Coupon (public) ────────────────────────────────
app.post('/api/coupon/validate', (req, res) => {
    const { code, price } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required.' });
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
    if (!coupon) return res.status(404).json({ error: 'Invalid or expired coupon code.' });
    if (coupon.usedCount >= coupon.maxUses && coupon.maxUses > 0)
        return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
    const originalPrice = parseFloat(price) || 0;
    const discount = coupon.type === 'percent'
        ? (originalPrice * coupon.value / 100)
        : Math.min(coupon.value, originalPrice);
    const finalPrice = Math.max(0, originalPrice - discount).toFixed(2);
    res.json({ valid: true, coupon: coupon.code, type: coupon.type, value: coupon.value, discount: discount.toFixed(2), finalPrice });
});

// ── Place Order (auth optional) ─────────────────────────────
app.post('/api/order', (req, res) => {
    const { productId, username, paymentMethod, userId, couponCode } = req.body;
    if (!productId || !username) return res.status(400).json({ error: 'productId and username required.' });

    const product = Object.values(products).flat().find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    let finalPrice = product.price;
    let discountApplied = null;
    if (couponCode) {
        const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.active);
        if (coupon && (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses)) {
            const orig = parseFloat(product.price);
            const disc = coupon.type === 'percent' ? (orig * coupon.value / 100) : Math.min(coupon.value, orig);
            finalPrice = Math.max(0, orig - disc).toFixed(2);
            discountApplied = { code: coupon.code, discount: disc.toFixed(2) };
            coupon.usedCount = (coupon.usedCount || 0) + 1;
            writeJSON(COUPONS_FILE, coupons);
        }
    }

    const newOrder = {
        id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        productId, productName: product.name,
        originalPrice: product.price, price: finalPrice,
        username, paymentMethod: paymentMethod || 'Apple Gift Card (G2A)',
        status: 'pending', userId: userId || null,
        coupon: discountApplied,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), notes: ''
    };

    orders.push(newOrder);
    writeJSON(ORDERS_FILE, orders);
    if (userId) {
        const u = users.find(u => u.id === userId);
        if (u) { u.totalOrders = (u.totalOrders || 0) + 1; writeJSON(USERS_FILE, users); }
    }
    console.log(`[ORDER] ${newOrder.id} — ${newOrder.productName} for ${username}`);
    res.status(201).json({ success: true, orderId: newOrder.id, finalPrice, discount: discountApplied, message: 'Order placed! Send the gift card code via Discord.' });
});

// ── User orders ─────────────────────────────────────────────
app.get('/api/orders/my', authMiddleware, (req, res) => {
    const myOrders = orders.filter(o => o.userId === req.user.id);
    res.json(myOrders);
});

// ══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/admin/stats', adminMiddleware, (req, res) => {
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.price || 0), 0);
    const pending   = orders.filter(o => o.status === 'pending').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    res.json({
        totalOrders: orders.length,
        totalUsers: users.length,
        totalRevenue: totalRevenue.toFixed(2),
        pendingOrders: pending,
        completedOrders: completed
    });
});

app.get('/api/admin/orders', adminMiddleware, (req, res) => {
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
});

app.put('/api/admin/orders/:id', adminMiddleware, (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const { status, notes } = req.body;
    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;
    order.updatedAt = new Date().toISOString();
    writeJSON(ORDERS_FILE, orders);
    res.json(order);
});

app.delete('/api/admin/orders/:id', adminMiddleware, (req, res) => {
    const idx = orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    orders.splice(idx, 1);
    writeJSON(ORDERS_FILE, orders);
    res.json({ success: true });
});

app.get('/api/admin/users', adminMiddleware, (req, res) => {
    const safe = users.map(({ password, ...u }) => u);
    res.json(safe);
});

app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    users.splice(idx, 1);
    writeJSON(USERS_FILE, users);
    res.json({ success: true });
});

// ── Admin Coupon CRUD ──────────────────────────────────────
app.get('/api/admin/coupons', adminMiddleware, (req, res) => res.json(coupons));

app.post('/api/admin/coupons', adminMiddleware, (req, res) => {
    const { code, type, value, maxUses, description } = req.body;
    if (!code || !type || value === undefined) return res.status(400).json({ error: 'code, type and value required.' });
    if (coupons.find(c => c.code.toUpperCase() === code.toUpperCase()))
        return res.status(400).json({ error: 'Coupon code already exists.' });
    const coupon = {
        id: 'CPN-' + Date.now(), code: code.toUpperCase(), type, value: parseFloat(value),
        maxUses: parseInt(maxUses) || 0, usedCount: 0,
        description: description || '', active: true,
        createdAt: new Date().toISOString()
    };
    coupons.push(coupon); writeJSON(COUPONS_FILE, coupons);
    res.status(201).json(coupon);
});

app.put('/api/admin/coupons/:id', adminMiddleware, (req, res) => {
    const c = coupons.find(c => c.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Coupon not found' });
    Object.assign(c, req.body);
    writeJSON(COUPONS_FILE, coupons); res.json(c);
});

app.delete('/api/admin/coupons/:id', adminMiddleware, (req, res) => {
    const idx = coupons.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Coupon not found' });
    coupons.splice(idx, 1); writeJSON(COUPONS_FILE, coupons); res.json({ success: true });
});

// ── Serve specific pages ────────────────────────────────────
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ── Fallback ────────────────────────────────────────────────
app.use((req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Saade Shop™ running at http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
    console.log(`📦 ${Object.values(products).flat().length} products across ${Object.keys(products).length} categories\n`);
});
