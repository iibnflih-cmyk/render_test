import mongoose, { Schema } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

// -------------------------------------------------------------
// SHARED DATA TYPES
// -------------------------------------------------------------
export interface Category {
  id: string;
  label: string;
}

export interface ProductItem {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  price: number;
  image: string;
  gallery?: string[];
  salesCount?: number;
  rating?: number;
  reviewsCount?: number;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  description?: string;
  material?: string;
  fit?: string;
  badge?: string;
}

export interface StoreSettingsData {
  storeName: string;
  storeTagline: string;
  logoUrl?: string;
  logoIcon: string;
  heroTitle: string;
  heroSubtitle: string;
  announcementBar: {
    enabled: boolean;
    text: string;
    badge?: string;
  };
  theme: {
    presetId?: string;
    primary: string;
    primaryHover?: string;
    primaryText?: string;
    accent: string;
    backgroundColor?: string;
    cardBackground?: string;
    textColor?: string;
    navBackground?: string;
    borderColor?: string;
    darkBg?: string;
    lightBg?: string;
    darkCardBg?: string;
    lightCardBg?: string;
  };
  automatedMessages: {
    enabled: boolean;
    welcomeMessage: string;
    starterQuestions: string[];
    instantReply: string;
  };
}

export interface StoreData {
  categories: Category[];
  products: ProductItem[];
  settings?: StoreSettingsData;
}

export interface StoredChatMessage {
  id: string;
  sender: 'client' | 'admin';
  senderName: string;
  text: string;
  createdAt: number;
  productContext?: {
    id: string;
    title: string;
    price: number;
    image: string;
    category?: string;
  };
}

export interface StoredConversation {
  id: string; // clientId
  clientUsername: string;
  createdAt: number;
  updatedAt: number;
  lastMessageText: string;
  unreadByAdmin: number;
  unreadByClient: number;
  product?: {
    id: string;
    title: string;
    price: number;
    image: string;
    category?: string;
  };
  messages: StoredChatMessage[];
}

export const DEFAULT_SETTINGS: StoreSettingsData = {
  storeName: 'أتيليه • ATELIER',
  storeTagline: 'استوديو الأزياء والتصميم الراقي',
  logoIcon: 'zap',
  heroTitle: 'تشكيلة الأزياء الحصرية',
  heroSubtitle: 'تصاميم استثنائية بخامات فاخرة وجودة ملكية مصممة خصيصاً لذوقك الرفيع.',
  announcementBar: {
    enabled: true,
    text: '✨ توصيل متوفر لجميع ولايات الوطن (58 ولاية) • الدفع عند الاستلام مع إمكانية المعاينة قبل الاستلام',
    badge: 'عرض خاص'
  },
  theme: {
    presetId: 'amber-royal',
    primary: '#f59e0b',
    primaryHover: '#d97706',
    primaryText: '#0a0a0a',
    accent: '#fbbf24',
    backgroundColor: '#0d1015',
    cardBackground: '#151921',
    textColor: '#f5f5f5',
    navBackground: '#0f1217',
    borderColor: '#262d38',
    darkBg: '#0d1015',
    lightBg: '#0d1015',
    darkCardBg: '#151921',
    lightCardBg: '#151921'
  },
  automatedMessages: {
    enabled: true,
    welcomeMessage: 'مرحباً بك في متجرنا! يسعدنا تواجدك. كيف يمكننا مساعدتك اليوم بخصوص المنتجات، المقاسات، أو التوصيل؟',
    starterQuestions: [
      'كم سعر ومدة التوصيل لولايتي؟',
      'هل الدفع عند الاستلام بعد المعاينة؟',
      'كيف أختار المقاس المناسب لي؟',
      'هل تتوفر تخفيضات عند طلب أكثر من قطعة؟'
    ],
    instantReply: 'شكراً لتواصلك معنا! لقد استلمنا رسالتك وسيقوم فريق المتجر بالرد عليك في غضون لحظات قليلة.'
  }
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', label: 'جميع التشكيلات' },
  { id: 'outerwear', label: 'السترات والمعاطف' },
  { id: 'hoodies', label: 'الهوديز والكنزات' },
  { id: 'tees', label: 'التيشرتات والقمصان' },
  { id: 'denim', label: 'الجينز والبنطلونات' },
  { id: 'knitwear', label: 'الملابس الصوفية' },
  { id: 'sneakers', label: 'الأحذية الرياضية' },
  { id: 'bags', label: 'الحقائب' },
  { id: 'accessories', label: 'الإكسسوارات' }
];

// -------------------------------------------------------------
// MONGODB BACKEND
// -------------------------------------------------------------
const categorySchema = new Schema({ id: String, label: String }, { _id: false });

const productSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  category: String,
  subcategory: String,
  price: Number,
  image: String,
  gallery: [String],
  salesCount: Number,
  rating: Number,
  reviewsCount: Number,
  sizes: [String],
  colors: [{ name: String, hex: String }],
  description: String,
  material: String,
  fit: String,
  badge: String
});

const categoryListSchema = new Schema({
  key: { type: String, unique: true },
  list: [categorySchema]
});

const settingsDocSchema = new Schema({
  key: { type: String, unique: true },
  settings: Schema.Types.Mixed
});

const productContextSchema = new Schema(
  { id: String, title: String, price: Number, image: String, category: String },
  { _id: false }
);

const chatMessageSchema = new Schema(
  {
    id: String,
    sender: String,
    senderName: String,
    text: String,
    createdAt: Number,
    productContext: productContextSchema
  },
  { _id: false }
);

const conversationSchema = new Schema({
  _id: { type: String, required: true },
  clientUsername: String,
  createdAt: Number,
  updatedAt: Number,
  lastMessageText: String,
  unreadByAdmin: Number,
  unreadByClient: Number,
  product: productContextSchema,
  messages: [chatMessageSchema]
});

let ProductModel: any;
let CategoryListModel: any;
let SettingsModel: any;
let ConversationModel: any;

function stripDocFields<T>(doc: any): T {
  if (!doc) return doc as T;
  const { _id, __v, ...rest } = doc;
  return rest as T;
}

function conversationToApi(doc: any): StoredConversation {
  if (!doc) return doc;
  const { __v, ...rest } = doc;
  return { id: String(rest._id), ...rest } as StoredConversation;
}

async function ensureSeeded() {
  await CategoryListModel.updateOne(
    { key: 'main' },
    { $setOnInsert: { list: DEFAULT_CATEGORIES } },
    { upsert: true }
  );
  await SettingsModel.updateOne(
    { key: 'main' },
    { $setOnInsert: { settings: DEFAULT_SETTINGS } },
    { upsert: true }
  );
}

async function mongoGetStore(): Promise<StoreData> {
  const [categoriesDoc, settingsDoc] = await Promise.all([
    CategoryListModel.findOne({ key: 'main' }).lean(),
    SettingsModel.findOne({ key: 'main' }).lean()
  ]);
  const productsDocs = await ProductModel.find().sort({ _id: 1 }).lean();
  return {
    categories: categoriesDoc?.list ?? DEFAULT_CATEGORIES,
    products: productsDocs.map((doc: any) => stripDocFields<ProductItem>(doc)),
    settings: (settingsDoc?.settings as StoreSettingsData) ?? DEFAULT_SETTINGS
  };
}

async function mongoSaveStore(data: StoreData) {
  await ProductModel.deleteMany({});
  if (data.products.length > 0) {
    await ProductModel.insertMany(data.products.map((p) => ({ ...p })));
  }
  await CategoryListModel.updateOne(
    { key: 'main' },
    { $set: { list: data.categories } },
    { upsert: true }
  );
  await SettingsModel.updateOne(
    { key: 'main' },
    { $set: { settings: data.settings ?? DEFAULT_SETTINGS } },
    { upsert: true }
  );
}

async function mongoGetConversations(): Promise<StoredConversation[]> {
  const docs = await ConversationModel.find().sort({ updatedAt: -1 }).lean();
  return docs.map(conversationToApi);
}

async function mongoGetConversation(clientId: string): Promise<StoredConversation | null> {
  const doc = await ConversationModel.findById(clientId).lean();
  return conversationToApi(doc);
}

async function mongoSaveConversation(convo: StoredConversation) {
  const { id, ...fields } = convo;
  await ConversationModel.updateOne(
    { _id: id },
    { $set: fields },
    { upsert: true }
  );
}

async function mongoDeleteConversation(clientId: string) {
  await ConversationModel.deleteOne({ _id: clientId });
}

// -------------------------------------------------------------
// PUBLIC DATA LAYER API
// -------------------------------------------------------------
export async function initDb(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Set it in your environment variables.');
  }

  await mongoose.connect(MONGODB_URI);
  ProductModel = mongoose.model('Product', productSchema);
  CategoryListModel = mongoose.model('CategoryList', categoryListSchema);
  SettingsModel = mongoose.model('StoreSettings', settingsDocSchema);
  ConversationModel = mongoose.model('Conversation', conversationSchema);

  await ensureSeeded();
  const host = MONGODB_URI.split('@')[1] || MONGODB_URI;
  console.log(`Connected to MongoDB: ${host}`);
}

export async function getStore(): Promise<StoreData> {
  return mongoGetStore();
}

export async function saveStore(data: StoreData): Promise<void> {
  await mongoSaveStore(data);
}

export async function getConversations(): Promise<StoredConversation[]> {
  return mongoGetConversations();
}

export async function getConversation(clientId: string): Promise<StoredConversation | null> {
  return mongoGetConversation(clientId);
}

export async function saveConversation(convo: StoredConversation): Promise<void> {
  await mongoSaveConversation(convo);
}

export async function deleteConversation(clientId: string): Promise<void> {
  await mongoDeleteConversation(clientId);
}