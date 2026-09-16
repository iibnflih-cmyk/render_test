import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config';
import {
  initDb,
  getStore,
  saveStore,
  getConversations,
  getConversation,
  saveConversation,
  deleteConversation
} from './db';
import { DEFAULT_SETTINGS } from './db';
import type {
  Category,
  ProductItem,
  StoreSettingsData,
  StoredChatMessage,
  StoredConversation
} from './db';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'xyz123';

// Increase payload limit for images (e.g. data URLs or photos)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Trust proxy for IP lookup behind Cloud Run / reverse proxies
app.set('trust proxy', true);

// -------------------------------------------------------------
// IP RATE LIMITING FOR ADMIN PASSWORD
// Rule: Max 3 tries in 1 hour
// -------------------------------------------------------------
interface IPAttempt {
  timestamps: number[];
}
const ipAttempts = new Map<string, IPAttempt>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown-client';
}

function checkIpRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterMs: number } {
  const now = Date.now();
  const record = ipAttempts.get(ip);
  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterMs: 0 };
  }

  // Filter timestamps within last 1 hour
  record.timestamps = record.timestamps.filter(t => now - t < LOCKOUT_WINDOW_MS);
  
  if (record.timestamps.length >= MAX_ATTEMPTS) {
    const oldest = record.timestamps[0];
    const retryAfterMs = Math.max(0, (oldest + LOCKOUT_WINDOW_MS) - now);
    return { allowed: false, remainingAttempts: 0, retryAfterMs };
  }

  return { 
    allowed: true, 
    remainingAttempts: MAX_ATTEMPTS - record.timestamps.length, 
    retryAfterMs: 0 
  };
}

function recordFailedAttempt(ip: string): { remainingAttempts: number; retryAfterMs: number } {
  const now = Date.now();
  let record = ipAttempts.get(ip);
  if (!record) {
    record = { timestamps: [] };
    ipAttempts.set(ip, record);
  }
  record.timestamps = record.timestamps.filter(t => now - t < LOCKOUT_WINDOW_MS);
  record.timestamps.push(now);

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.timestamps.length);
  const oldest = record.timestamps[0];
  const retryAfterMs = Math.max(0, (oldest + LOCKOUT_WINDOW_MS) - now);
  return { remainingAttempts, retryAfterMs };
}

function clearIpAttempts(ip: string) {
  ipAttempts.delete(ip);
}

// -------------------------------------------------------------
// ADMIN SESSION TOKENS
// -------------------------------------------------------------
const activeAdminTokens = new Map<string, { createdAt: number }>();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateAdminToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeAdminTokens.set(token, { createdAt: Date.now() });
  return token;
}

function verifyAdmin(req: express.Request): boolean {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return false;
  }
  const token = auth.split(' ')[1];
  const session = activeAdminTokens.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > TOKEN_TTL_MS) {
    activeAdminTokens.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'غير مصرح بالدخول. يرجى تسجيل الدخول إلى لوحة التحكم' });
  }
  next();
}

// -------------------------------------------------------------
// DATA PERSISTENCE
// All reads/writes go through db.ts, which persists to MongoDB Atlas
// (one database per store).
// -------------------------------------------------------------

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 1. Get Store Data (Products, Categories & Settings)
app.get('/api/data', async (req, res) => {
  const store = await getStore();
  res.json(store);
});

// 1.1 Get Store Settings
app.get('/api/settings', async (req, res) => {
  const store = await getStore();
  res.json({ settings: store.settings || DEFAULT_SETTINGS });
});

// 1.2 Update Store Settings (Admin)
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const store = await getStore();
  const currentSettings = store.settings || DEFAULT_SETTINGS;
  const payload = req.body.settings || req.body || {};

  const newSettings: StoreSettingsData = {
    ...currentSettings,
    ...payload,
    theme: {
      ...currentSettings.theme,
      ...(payload.theme || {})
    },
    announcementBar: {
      ...currentSettings.announcementBar,
      ...(payload.announcementBar || {})
    },
    automatedMessages: {
      ...currentSettings.automatedMessages,
      ...(payload.automatedMessages || {})
    }
  };

  store.settings = newSettings;
  await saveStore(store);
  res.json({ success: true, settings: newSettings });
});

// 2. Admin Authentication Status for current IP
app.get('/api/admin/status', (req, res) => {
  const ip = getClientIp(req);
  const status = checkIpRateLimit(ip);
  const retryMinutes = Math.ceil(status.retryAfterMs / 60000);

  res.json({
    allowed: status.allowed,
    remainingAttempts: status.remainingAttempts,
    retryAfterMinutes: retryMinutes,
    isLoggedIn: verifyAdmin(req)
  });
});

// 3. Admin Login with password & IP rate limit (3 tries in 1 hour)
app.post('/api/admin/login', (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = checkIpRateLimit(ip);

  if (!rateLimit.allowed) {
    const minutesLeft = Math.ceil(rateLimit.retryAfterMs / 60000);
    return res.status(429).json({
      success: false,
      error: `تم تجاوز عدد المحاولات المسموح بها (3 محاولات خلال ساعة واحدة). تم حظر هذا العنوان (IP) مؤقتاً. الرجاء المحاولة بعد ${minutesLeft} دقيقة.`,
      locked: true,
      remainingAttempts: 0,
      retryAfterMinutes: minutesLeft
    });
  }

  const { password } = req.body;

  // Password comes from ADMIN_PASSWORD env (defaults to xyz123)
  if (password === ADMIN_PASSWORD) {
    // Clear failed attempts on successful login
    clearIpAttempts(ip);
    const token = generateAdminToken();
    return res.json({
      success: true,
      token,
      message: 'تم تسجيل الدخول بنجاح إلى لوحة التحكم'
    });
  }

  // Failed attempt
  const result = recordFailedAttempt(ip);
  const minutesLeft = Math.ceil(result.retryAfterMs / 60000);

  if (result.remainingAttempts <= 0) {
    return res.status(429).json({
      success: false,
      error: `كلمة المرور غير صحيحة. تم استنفاد كافة المحاولات (3 محاولات). تم حظر هذا العنوان (IP) لمدة ساعة. حاول مجدداً بعد ${minutesLeft} دقيقة.`,
      locked: true,
      remainingAttempts: 0,
      retryAfterMinutes: minutesLeft
    });
  }

  return res.status(401).json({
    success: false,
    error: `كلمة المرور غير صحيحة. متبقي لديك ${result.remainingAttempts} محاولة من أصل 3 محاولات خلال هذه الساعة.`,
    locked: false,
    remainingAttempts: result.remainingAttempts,
    retryAfterMinutes: 0
  });
});

// 4. Verify Admin Session Token
app.get('/api/admin/verify', (req, res) => {
  const valid = verifyAdmin(req);
  res.json({ valid });
});

// 5. Admin Logout
app.post('/api/admin/logout', (req, res) => {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.split(' ')[1];
    activeAdminTokens.delete(token);
  }
  res.json({ success: true });
});

// 6. Admin: Add a Product
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const { title, price, image, category, subcategory, description, sizes, colors, material, fit, badge } = req.body;

  if (!title || price === undefined || !image) {
    return res.status(400).json({ error: 'الاسم، السعر، ورابط أو ملف الصورة حقول مطلوبة' });
  }

  const store = await getStore();
  const newProduct: ProductItem = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: String(title).trim(),
    price: Number(price),
    image: String(image),
    gallery: [String(image)],
    category: category || 'all',
    subcategory: subcategory || (store.categories.find(c => c.id === category)?.label || 'أزياء'),
    description: description || '',
    sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
    colors: Array.isArray(colors) && colors.length > 0 ? colors : [{ name: 'افتراضي', hex: '#111111' }],
    material: material || 'قطن فاخر عالي الجودة',
    fit: fit || 'قصة مريحة وعصرية',
    badge: badge || undefined,
    salesCount: 0,
    rating: 5.0,
    reviewsCount: 0
  };

  store.products.unshift(newProduct);
  await saveStore(store);

  res.status(201).json({ success: true, product: newProduct });
});

// 7. Admin: Update a Product
app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const store = await getStore();
  const index = store.products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  const existing = store.products[index];
  const updated: ProductItem = {
    ...existing,
    ...req.body,
    id: existing.id // preserve id
  };

  store.products[index] = updated;
  await saveStore(store);

  res.json({ success: true, product: updated });
});

// 8. Admin: Delete a Product
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const store = await getStore();
  const initialLength = store.products.length;
  store.products = store.products.filter(p => p.id !== id);

  if (store.products.length === initialLength) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  await saveStore(store);
  res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
});

// 8.1 Admin: Bulk Add Multiple Products
app.post('/api/admin/products/bulk', requireAdmin, async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'يرجى إرسال قائمة من المنتجات' });
  }

  const store = await getStore();
  const createdProducts: ProductItem[] = [];

  for (const item of items) {
    if (!item.title || item.price === undefined) continue;

    const newProduct: ProductItem = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: String(item.title).trim(),
      price: Number(item.price) || 0,
      image: String(item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80'),
      gallery: item.gallery && Array.isArray(item.gallery) && item.gallery.length > 0 
        ? item.gallery 
        : [String(item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80')],
      category: item.category || 'all',
      subcategory: item.subcategory || (store.categories.find(c => c.id === item.category)?.label || 'أزياء'),
      description: item.description || '',
      sizes: Array.isArray(item.sizes) && item.sizes.length > 0 ? item.sizes : ['S', 'M', 'L', 'XL'],
      colors: Array.isArray(item.colors) && item.colors.length > 0 ? item.colors : [{ name: 'أسود فاحم', hex: '#111111' }],
      material: item.material || 'قماش فاخر عالي الجودة',
      fit: item.fit || 'قصة انسيابية مريحة',
      badge: item.badge || undefined,
      salesCount: Number(item.salesCount) || 0,
      rating: Number(item.rating) || 5.0,
      reviewsCount: Number(item.reviewsCount) || 0
    };

    createdProducts.push(newProduct);
  }

  if (createdProducts.length === 0) {
    return res.status(400).json({ error: 'لم يتم العثور على منتجات صالحة للإضافة' });
  }

  // Prepend new products to store
  store.products = [...createdProducts, ...store.products];
  await saveStore(store);

  res.status(201).json({ success: true, count: createdProducts.length, products: createdProducts });
});

// 8.2 Admin: Bulk Delete Products
app.post('/api/admin/products/bulk-delete', requireAdmin, async (req, res) => {
  const { productIds } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'يرجى تحديد المنتجات المراد حذفها' });
  }

  const store = await getStore();
  const initialLength = store.products.length;
  store.products = store.products.filter(p => !productIds.includes(p.id));
  const deletedCount = initialLength - store.products.length;

  await saveStore(store);
  res.json({ success: true, deletedCount });
});

// 9. Admin: Create a New Category
app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const { id, label } = req.body;

  if (!label || !String(label).trim()) {
    return res.status(400).json({ error: 'اسم التصنيف مطلوب' });
  }

  const store = await getStore();
  const cleanLabel = String(label).trim();
  const catId = id ? String(id).trim().toLowerCase() : `cat-${Date.now()}`;

  if (store.categories.some(c => c.id === catId)) {
    return res.status(400).json({ error: 'معرّف التصنيف موجود بالفعل' });
  }

  const newCategory: Category = {
    id: catId,
    label: cleanLabel
  };

  store.categories.push(newCategory);
  await saveStore(store);

  res.status(201).json({ success: true, category: newCategory });
});

// 10. Admin: Delete Category
app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (id === 'all') {
    return res.status(400).json({ error: 'لا يمكن حذف التصنيف الأساسي (الكل)' });
  }

  const store = await getStore();
  const initialLength = store.categories.length;
  store.categories = store.categories.filter(c => c.id !== id);

  if (store.categories.length === initialLength) {
    return res.status(404).json({ error: 'التصنيف غير موجود' });
  }

  // Reassign products belonging to this category to 'all'
  store.products.forEach(p => {
    if (p.category === id) {
      p.category = 'all';
    }
  });

  await saveStore(store);
  res.json({ success: true, message: 'تم حذف التصنيف بنجاح' });
});

// 11. Admin: Assign items/products to a category
app.post('/api/admin/categories/assign', requireAdmin, async (req, res) => {
  const { productIds, targetCategoryId, syncMode = true } = req.body;

  if (!Array.isArray(productIds) || !targetCategoryId) {
    return res.status(400).json({ error: 'قائمة المنتجات والتصنيف المستهدف حقول مطلوبة' });
  }

  const store = await getStore();
  const targetCategory = store.categories.find(c => c.id === targetCategoryId);

  if (!targetCategory && targetCategoryId !== 'all') {
    return res.status(400).json({ error: 'التصنيف المستهدف غير موجود' });
  }

  let updatedCount = 0;
  store.products.forEach(product => {
    if (productIds.includes(product.id)) {
      if (product.category !== targetCategoryId) {
        product.category = targetCategoryId;
        if (targetCategory && targetCategoryId !== 'all') {
          product.subcategory = targetCategory.label;
        }
        updatedCount++;
      }
    } else if (syncMode && product.category === targetCategoryId) {
      // Unassign product if it was in this category but was unchecked
      product.category = 'all';
      product.subcategory = 'جميع التشكيلات';
      updatedCount++;
    }
  });

  await saveStore(store);
  res.json({ success: true, updatedCount, currentCategoryProductCount: productIds.length });
});

// 12. Admin: Get all conversations
app.get('/api/chat/conversations', requireAdmin, async (req, res) => {
  const list = await getConversations();
  res.json({ conversations: list });
});

// 13. Get conversation for a client
app.get('/api/chat/conversation/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const convo = await getConversation(clientId);

  if (!convo) {
    return res.json({
      conversation: {
        id: clientId,
        clientUsername: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessageText: '',
        unreadByAdmin: 0,
        unreadByClient: 0,
        messages: []
      }
    });
  }

  res.json({ conversation: convo });
});

// 14. Send a chat message (client or admin)
app.post('/api/chat/send', async (req, res) => {
  const { clientId, clientUsername, sender, senderName, text, productContext } = req.body;

  if (!clientId || !sender || !text?.trim()) {
    return res.status(400).json({ error: 'البيانات غير مكتملة لإرسال الرسالة' });
  }

  if (sender === 'admin' && !verifyAdmin(req)) {
    return res.status(401).json({ error: 'غير مصرح للدخول كمسؤول' });
  }

  const now = Date.now();

  let convo = await getConversation(clientId);
  if (!convo) {
    convo = {
      id: clientId,
      clientUsername: String(clientUsername || 'عميل').trim(),
      createdAt: now,
      updatedAt: now,
      lastMessageText: text.trim(),
      unreadByAdmin: 0,
      unreadByClient: 0,
      product: productContext || undefined,
      messages: []
    };
  } else {
    if (clientUsername && (!convo.clientUsername || convo.clientUsername === 'عميل')) {
      convo.clientUsername = String(clientUsername).trim();
    }
    if (productContext && !convo.product) {
      convo.product = productContext;
    }
  }

  const newMessage: StoredChatMessage = {
    id: `msg-${now}-${Math.random().toString(36).substring(2, 6)}`,
    sender,
    senderName: String(senderName || (sender === 'admin' ? 'صاحب المتجر' : convo.clientUsername)).trim(),
    text: text.trim(),
    createdAt: now,
    productContext: productContext || undefined
  };

  convo.messages.push(newMessage);
  convo.updatedAt = now;
  convo.lastMessageText = text.trim();

  if (sender === 'client') {
    convo.unreadByAdmin = (convo.unreadByAdmin || 0) + 1;

    // Check if store has automated instant reply enabled and this is client's first message
    const store = await getStore();
    const autoConfig = store.settings?.automatedMessages;
    const clientMsgCount = convo.messages.filter(m => m.sender === 'client').length;
    if (autoConfig?.enabled && autoConfig.instantReply?.trim() && clientMsgCount === 1) {
      const autoReplyMessage: StoredChatMessage = {
        id: `msg-${now + 500}-${Math.random().toString(36).substring(2, 6)}`,
        sender: 'admin',
        senderName: store.settings.storeName || 'صاحب المتجر',
        text: autoConfig.instantReply.trim(),
        createdAt: now + 500
      };
      convo.messages.push(autoReplyMessage);
      convo.lastMessageText = autoConfig.instantReply.trim();
      convo.unreadByClient = (convo.unreadByClient || 0) + 1;
    }
  } else {
    convo.unreadByClient = (convo.unreadByClient || 0) + 1;
  }

  await saveConversation(convo);

  res.json({ success: true, message: newMessage, conversation: convo });
});

// 15. Mark conversation as read
app.post('/api/chat/mark-read', async (req, res) => {
  const { clientId, reader } = req.body;
  if (!clientId || !reader) {
    return res.status(400).json({ error: 'المعلومات غير مكتملة' });
  }

  if (reader === 'admin' && !verifyAdmin(req)) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  const convo = await getConversation(clientId);
  if (convo) {
    if (reader === 'admin') {
      convo.unreadByAdmin = 0;
    } else {
      convo.unreadByClient = 0;
    }
    await saveConversation(convo);
  }

  res.json({ success: true });
});

// 16. Admin: Delete conversation
app.delete('/api/chat/conversation/:clientId', requireAdmin, async (req, res) => {
  const { clientId } = req.params;
  await deleteConversation(clientId);
  res.json({ success: true, message: 'تم حذف المحادثة' });
});

// -------------------------------------------------------------
// SEO: robots.txt & sitemap.xml
// -------------------------------------------------------------
const SITE_URL = process.env.SITE_URL || 'https://www.loopix.work.gd';

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /adminpanel\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const store = await getStore();
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Homepage
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // Category pages (filtered via query params, but still indexable)
    if (store.categories && store.categories.length > 0) {
      for (const cat of store.categories) {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/?category=${encodeURIComponent(cat.id)}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<error>Failed to generate sitemap</error>`);
  }
});

// -------------------------------------------------------------
// VITE SPA MIDDLEWARE / PRODUCTION SERVING
// -------------------------------------------------------------
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    let indexTemplate = '';
    try {
      indexTemplate = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
    } catch (err) {
      console.error('Unable to read index.html from dist:', err);
    }

    // In-memory cache so we don't hit MongoDB on every page load
    let cachedSettings: StoreSettingsData | null = null;
    let cachedSettingsAt = 0;
    const SETTINGS_CACHE_TTL_MS = 60 * 1000;

    async function getCachedSettings(): Promise<StoreSettingsData> {
      const now = Date.now();
      if (cachedSettings && now - cachedSettingsAt < SETTINGS_CACHE_TTL_MS) {
        return cachedSettings;
      }
      const store = await getStore();
      cachedSettings = store.settings || DEFAULT_SETTINGS;
      cachedSettingsAt = now;
      return cachedSettings;
    }

    function renderIndex(settings: StoreSettingsData): string {
      const storeName = settings.storeName?.trim() || 'لوبيكس';
      const tagline = settings.storeTagline?.trim() || 'متجر أزياء وملابس عصري';
      const title = `${storeName} - متجر الأزياء`;

      return indexTemplate
        .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(tagline)}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(tagline)}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeHtml(storeName)}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeHtml(tagline)}$2`);
    }

    app.use(express.static(distPath));
    app.get('*', async (_req, res) => {
      try {
        const settings = await getCachedSettings();
        res.type('html').send(renderIndex(settings));
      } catch (err) {
        console.error('Failed to inject SEO meta:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
