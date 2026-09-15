export type ProductCategory = string;

export interface CategoryItem {
  id: string;
  label: string;
  count?: number;
}

export interface Product {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  salesCount?: number;
  rating?: number;
  reviewsCount?: number;
  image: string;
  gallery?: string[];
  seller?: {
    name?: string;
    avatar?: string;
    verified?: boolean;
    location?: string;
  };
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  description?: string;
  material?: string;
  fit?: string;
  badge?: string;
}

export type ThemeMode = 'light' | 'dark' | 'split';

export interface ProductInquiryContext {
  id: string;
  title: string;
  price: number;
  image: string;
  category?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'client' | 'admin';
  senderName: string;
  text: string;
  createdAt: number;
  productContext?: ProductInquiryContext;
}

export interface Conversation {
  id: string;
  clientUsername: string;
  createdAt: number;
  updatedAt: number;
  lastMessageText: string;
  unreadByAdmin: number;
  unreadByClient: number;
  product?: ProductInquiryContext;
  messages: ChatMessage[];
}

export interface ClientChatUser {
  id: string;
  username: string;
}

// -------------------------------------------------------------
// STORE BRANDING, THEME & CUSTOMIZATION TYPES
// -------------------------------------------------------------
export interface ColorPalettePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  accent: string;
  backgroundColor: string; // The customizable page background ("that white color thing")
  cardBackground: string;  // The customizable product cards / containers background
  textColor: string;        // Text & titles color
  navBackground?: string;  // Header / Navbar background
  borderColor?: string;    // Subtle border outlines
  darkBg?: string;         // Legacy fallback
  lightBg?: string;        // Legacy fallback
  darkCardBg?: string;     // Legacy fallback
  lightCardBg?: string;    // Legacy fallback
  isDarkDefault?: boolean;
}

export interface ThemeCustomization {
  presetId: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  accent: string;
  backgroundColor: string; // Page Canvas Background
  cardBackground: string;  // Product Cards & Surfaces Background
  textColor: string;        // Main Text & Headings Color
  navBackground?: string;  // Navbar background
  borderColor?: string;    // Border color
  darkBg?: string;
  lightBg?: string;
  darkCardBg?: string;
  lightCardBg?: string;
}

export interface AnnouncementBarConfig {
  enabled: boolean;
  text: string;
  badge?: string;
}

export interface AutomatedMessagesConfig {
  enabled: boolean;
  welcomeMessage: string;
  starterQuestions: string[];
  instantReply: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  logoUrl?: string;
  logoIcon: string;
  heroTitle: string;
  heroSubtitle: string;
  announcementBar: AnnouncementBarConfig;
  theme: ThemeCustomization;
  automatedMessages: AutomatedMessagesConfig;
}
