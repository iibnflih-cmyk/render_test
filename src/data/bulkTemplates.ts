export interface BulkItemDraft {
  title: string;
  price: number;
  category: string;
  image: string;
  description?: string;
  badge?: string;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
}

export const NIQAB_TEMPLATES: BulkItemDraft[] = [
  {
    title: 'نقاب ملكي فاخر طبقتين مع رباط حريري',
    price: 2800,
    category: 'niqab',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
    description: 'نقاب ساتر بخامة شيفون كوري فاخر غير شفاف، خفيف وبارد للارتداء اليومي والمناسبات.',
    badge: 'الأكثر طلباً',
    sizes: ['قياسي'],
    colors: [{ name: 'أسود ليلي', hex: '#0a0a0a' }]
  },
  {
    title: 'نقاب فرنسي واسع ساتر قماش كريب دبي',
    price: 3200,
    category: 'niqab',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80',
    description: 'تصميم فرنسي أصيل يوفر تغطية كاملة ومريحة مع فتحة عين متناسقة وشريط مقوى.',
    badge: 'تشكيلة حصرية',
    sizes: ['قياسي'],
    colors: [{ name: 'أسود فاحم', hex: '#111111' }, { name: 'كحلي داكن', hex: '#1a2436' }]
  },
  {
    title: 'نقاب ماليزي قصير برباط خلفي مطاطي',
    price: 2200,
    category: 'niqab',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    description: 'نقاب عملي خفيف الوزن بتصميم ماليزي مريح جداً أثناء السفر والعمل اليومي.',
    sizes: ['قياسي'],
    colors: [{ name: 'أسود', hex: '#111111' }]
  },
  {
    title: 'خمار إسلامي طويل مع نقاب متصل ساتر',
    price: 4500,
    category: 'niqab',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop&q=80',
    description: 'طقم خمار كامل ممتد للركبتين مع طبقة نقاب مدمجة قابلة للتعديل والرفع.',
    badge: 'الأعلى تقييماً',
    sizes: ['M', 'L', 'XL'],
    colors: [{ name: 'أسود داكن', hex: '#0f0f0f' }, { name: 'زيتي ملكي', hex: '#2b3329' }]
  },
  {
    title: 'نقاب شيفون ناعم بفتحة عيون ليزر دقيقة',
    price: 2500,
    category: 'niqab',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    description: 'حياكة دقيقة بالليزر لحواف ناعمة لا تسبب أي حساسية، مريح لساعات طويلة.',
    sizes: ['قياسي'],
    colors: [{ name: 'أسود فاحم', hex: '#111111' }]
  }
];

export const ABAYA_TEMPLATES: BulkItemDraft[] = [
  {
    title: 'عباية كريب صالونة ملكي بتطريز يدوي فاخر',
    price: 9800,
    category: 'abayas',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    description: 'عباية كلاسيكية راقية بقماش صالونة ياباني درجة أولى مع أكمام مطرزة بخيوط الحرير.',
    badge: 'حصري وجديد',
    sizes: ['52', '54', '56', '58'],
    colors: [{ name: 'أسود ملكي', hex: '#0d0d0d' }]
  },
  {
    title: 'عباية بشت خليجي مفتوحة مع طرحة مطابقة',
    price: 11500,
    category: 'abayas',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
    description: 'قصة بشت انسيابية واسعة تمنحك إطلالة مهيبة وراقية للمناسبات الخاصة والزيارات.',
    badge: 'الأكثر مبيعاً',
    sizes: ['54', '56', '58'],
    colors: [{ name: 'أسود فحمي', hex: '#151515' }, { name: 'رمادي لؤلؤي', hex: '#8a8d91' }]
  },
  {
    title: 'عباية كاجوال عملية بأزرار مخفية وجيوب جانبية',
    price: 7900,
    category: 'abayas',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
    description: 'مثالية للدوام والجامعة، قماش خفيف مقاوم للتجعد وسهل الغسيل والكي.',
    sizes: ['52', '54', '56', '58'],
    colors: [{ name: 'أسود', hex: '#111111' }, { name: 'بيج كلاسيك', hex: '#d2b48c' }]
  },
  {
    title: 'عباية شتوية مخمل راقية مع بطانة حريرية',
    price: 13500,
    category: 'abayas',
    image: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800&auto=format&fit=crop&q=80',
    description: 'مخمل ألماني ناعم ودافئ يعكس الفخامة والرقي، مناسبة للأمسيات الشتوية الباردة.',
    badge: 'مجموعة الشتاء',
    sizes: ['54', '56', '58'],
    colors: [{ name: 'أسود مخملي', hex: '#080808' }, { name: 'عنابي دافئ', hex: '#4a0e17' }]
  },
  {
    title: 'عباية كيمونو عصرية واسعة بقماش لينن طبيعي',
    price: 8600,
    category: 'abayas',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80',
    description: 'إطلالة عصرية أنيقة تجمع بين الاحتشام والبساطة بقماش كتان نقي ومريح.',
    sizes: ['52', '54', '56'],
    colors: [{ name: 'أوف وايت', hex: '#f8f6f0' }, { name: 'زيتي هادئ', hex: '#4a5342' }]
  }
];

export const GENERAL_FASHION_TEMPLATES: BulkItemDraft[] = [
  {
    title: 'فستان صوف ماكسي محتشم بياقة عريضة',
    price: 8900,
    category: 'dresses',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80',
    description: 'فستان طويل أنيق من الصوف الناعم يمنح دفئاً وأناقة متناهية.',
    badge: 'شتاء 2026',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'بيج دافئ', hex: '#c5a880' }, { name: 'رمادي فحمي', hex: '#333333' }]
  },
  {
    title: 'معطف كشمير فاخر طويل مزدوج الأزرار',
    price: 18500,
    category: 'outerwear',
    image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&auto=format&fit=crop&q=80',
    description: 'صناعة متقنة من صوف الكشمير المعالج، مقاوم للرياح مع قصة كلاسيكية راقية.',
    badge: 'فاخر حصري',
    sizes: ['M', 'L', 'XL'],
    colors: [{ name: 'جملي كلاسيكي', hex: '#b87333' }, { name: 'أسود ملكي', hex: '#111111' }]
  },
  {
    title: 'سترة كارديجان طويلة محبوكة بحزام خصر',
    price: 6400,
    category: 'outerwear',
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80',
    description: 'كارديجان ناعم يمنحك طبقة دافئة وخفيفة فوق الإطلالات اليومية.',
    sizes: ['S', 'M', 'L'],
    colors: [{ name: 'كريمي', hex: '#fdfbf7' }, { name: 'بني شوكولا', hex: '#3b2219' }]
  },
  {
    title: 'تنورة بليسيه ماكسي مكسرة بقماش حرير مطفي',
    price: 5200,
    category: 'skirts',
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop&q=80',
    description: 'ثنيات متناسقة وثابتة تعطي حركة انسيابية ساحرة مع خصر مطاطي مريح.',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'أسود', hex: '#111111' }, { name: 'رمادي فضي', hex: '#999999' }]
  },
  {
    title: 'قميص حرير أوفرسايز بياقة رسمية أنيقة',
    price: 4800,
    category: 'tops',
    image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&auto=format&fit=crop&q=80',
    description: 'حرير ستان ناعم الملمس، أكمام طويلة مع أساور عريضة وزر أمامي مخفي.',
    sizes: ['S', 'M', 'L'],
    colors: [{ name: 'أبيض عاجي', hex: '#faf9f6' }, { name: 'زمردي داكن', hex: '#0f382c' }]
  },
  {
    title: 'حقيبة يد جلد طبيعي مبطنة بقفل ذهبي',
    price: 9200,
    category: 'accessories',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
    description: 'جلد إيطالي أصلي مقاوم للخدش مع حزام كتف قابل للتعديل والإزالة.',
    badge: 'الأكثر طلباً',
    sizes: ['قياسي'],
    colors: [{ name: 'أسود مع ذهبي', hex: '#111111' }, { name: 'هافان', hex: '#8b4513' }]
  },
  {
    title: 'حذاء كعب مريح متوسط الارتفاع بتصميم كلاسيكي',
    price: 7800,
    category: 'shoes',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=80',
    description: 'بطانة طبية مريحة للمشي الطويل، يجمع بين الفخامة والراحة طوال اليوم.',
    sizes: ['37', '38', '39', '40', '41'],
    colors: [{ name: 'أسود جلد', hex: '#111111' }, { name: 'نيود بيج', hex: '#d8b597' }]
  },
  {
    title: 'خمار حرير شيفون تركي ساتر متعدد الألوان',
    price: 3600,
    category: 'hijabs',
    image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&auto=format&fit=crop&q=80',
    description: 'قماش شيفون تركي غير قابل للانزلاق، ثابت على الرأس بألوان راقية وهادئة.',
    badge: 'جديد',
    sizes: ['120x120 سم'],
    colors: [{ name: 'رمادي دخاني', hex: '#5f6368' }, { name: 'وردي ناعم', hex: '#d4a5a5' }]
  }
];

export const CURATED_IMAGES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&auto=format&fit=crop&q=80'
];

/**
 * Generate N random test products for specified or all categories
 */
export function generateRandomProductsBatch(count: number, targetCategoryId: string = 'all', existingCategoryIds: string[] = []): BulkItemDraft[] {
  const titlesPrefix = ['طقم', 'عباية', 'نقاب', 'فستان', 'خمار', 'معطف', 'كارديجان', 'تنورة', 'بشت', 'سترة'];
  const titlesAdjective = ['ملكي فاخر', 'ساتر راقي', 'حريري كلاسيك', 'شتوي دافئ', 'مطرز يدوي', 'عصري مريح', 'انسيابي ناعم', 'أصلي دبي', 'شيفون كوري', 'كريب ياباني'];
  const badges = ['جديد', 'الأكثر طلباً', 'مجموعة حصرية', 'تخفيض خاص', 'الأعلى تقييماً', undefined];

  const availableCategories = existingCategoryIds.filter(c => c !== 'all');
  const items: BulkItemDraft[] = [];

  for (let i = 0; i < count; i++) {
    const pIndex = i % titlesPrefix.length;
    const aIndex = (i * 3 + 1) % titlesAdjective.length;
    const imgIndex = i % CURATED_IMAGES.length;
    
    let cat = targetCategoryId;
    if (cat === 'all' || !cat) {
      if (availableCategories.length > 0) {
        cat = availableCategories[i % availableCategories.length];
      } else {
        cat = 'outerwear';
      }
    }

    const price = Math.round((2000 + Math.random() * 12000) / 100) * 100;
    const badge = badges[i % badges.length];

    items.push({
      title: `${titlesPrefix[pIndex]} ${titlesAdjective[aIndex]} - إصدار #${i + 1}`,
      price,
      category: cat,
      image: CURATED_IMAGES[imgIndex],
      description: `منتج عالي الجودة بخامات فاخرة وتفاصيل دقيقة تلائم كافة الإطلالات والمناسبات (عنصر تجريبي #${i + 1}).`,
      badge,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [
        { name: 'أسود كلاسيك', hex: '#111111' },
        { name: 'بيج رملي', hex: '#c5a880' },
        { name: 'كحلي داكن', hex: '#1a2436' }
      ]
    });
  }

  return items;
}
