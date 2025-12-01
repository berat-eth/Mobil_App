// Product Types
// Varyasyon tipleri (opsiyonel) geri eklendi

export interface ProductVariationOption {
  id: number | string;
  variationId?: number | string;
  value: string;
  priceModifier?: number;
  stock?: number;
  sku?: string;
  image?: string;
  isActive?: boolean;
}

export interface ProductVariation {
  id: number | string;
  productId?: number;
  name: string;
  displayOrder?: number;
  options: ProductVariationOption[];
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[]; // Additional product images
  image1?: string; // Ayrı sütunlarda saklanan görseller
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
  stock: number;
  brand: string;
  rating: number;
  reviewCount: number;
  // Opsiyonel varyasyon bilgisi (bazı ekranlar kullanıyor)
  variations?: ProductVariation[];
  hasVariations?: boolean;
  lastUpdated?: string; // API'den gelen son güncelleme tarihi
  externalId?: string; // Dış sistem ID'si
  source?: string; // Veri kaynağı
  sku?: string; // Stok kodu
  discountAmount?: number; // İndirim miktarı
  originalPrice?: number; // Orijinal fiyat
  finalPrice?: number; // İndirimli fiyat
  variationString?: string; // Varyasyon string'i
  // XML kaynaklı ek alanlar (varsa API döner)
  categoryTree?: string;
  productUrl?: string;
  salesUnit?: string;
  totalImages?: number;
  // Çeviri desteği
  translations?: {
    [key: string]: {
      name?: string;
      description?: string;
      category?: string;
      brand?: string;
    };
  };
}

// Review Types
export interface Review {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  images?: ReviewImage[];
  media?: ReviewMedia[]; // Yeni medya desteği (görsel + video)
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  isHelpful?: boolean;
}

export interface ReviewImage {
  id: number;
  reviewId: number;
  imageUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  order?: number;
}

export interface ReviewMedia {
  id: number;
  reviewId: number;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  displayOrder?: number;
}

// User Types
export interface User {
  id: number;
  user_id?: string; // 8 basamaklı kullanıcı ID'si
  name: string;
  email: string;
  password: string;
  phone: string;
  gender?: 'male' | 'female' | 'unspecified';
  address: string;
  birthDate?: string; // DD-MM-YYYY formatında doğum tarihi
  createdAt: string;
}

// Cart Types
export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  userId: number;
  product?: Product;
  // variations removed
  variationString?: string; // Human readable variation string
  selectedVariations?: Record<string, string>;
}

// Order Types
export interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  shippingAddress: string;
  paymentMethod: string;
  city?: string;
  district?: string;
  fullAddress?: string;
  updatedAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  productName?: string;
  productDescription?: string;
  productCategory?: string;
  productBrand?: string;
  productImage?: string;
  product?: Product;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// Category Types
export const Categories = {
  JACKETS: 'Ceketler',
  PANTS: 'Pantolonlar',
  SHOES: 'Ayakkabılar',
  BACKPACKS: 'Sırt Çantaları',
  TENTS: 'Çadırlar',
  SLEEPING_BAGS: 'Uyku Tulumları',
  ACCESSORIES: 'Aksesuarlar'
} as const;