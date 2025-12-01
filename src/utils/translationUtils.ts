import { Product } from './types';
import { SupportedLanguage } from '../contexts/LanguageContext';

/**
 * Ürün ismini mevcut dile göre çevirir
 */
export const getTranslatedProductName = (product: Product, language: SupportedLanguage): string => {
  if (!product.translations || !product.translations[language]) {
    return product.name;
  }
  
  const translation = product.translations[language];
  return translation.name || product.name;
};

/**
 * Ürün açıklamasını mevcut dile göre çevirir
 */
export const getTranslatedProductDescription = (product: Product, language: SupportedLanguage): string => {
  if (!product.translations || !product.translations[language]) {
    return product.description;
  }
  
  const translation = product.translations[language];
  return translation.description || product.description;
};

/**
 * Ürün kategorisini mevcut dile göre çevirir
 */
export const getTranslatedProductCategory = (product: Product, language: SupportedLanguage): string => {
  if (!product.translations || !product.translations[language]) {
    return product.category;
  }
  
  const translation = product.translations[language];
  return translation.category || product.category;
};

/**
 * Ürün markasını mevcut dile göre çevirir
 */
export const getTranslatedProductBrand = (product: Product, language: SupportedLanguage): string => {
  if (!product.translations || !product.translations[language]) {
    return product.brand;
  }
  
  const translation = product.translations[language];
  return translation.brand || product.brand;
};

/**
 * Ürün varyasyon ismini mevcut dile göre çevirir
 */
export const getTranslatedVariationName = (variationName: string, language: SupportedLanguage): string => {
  // Varyasyon isimleri için çeviri anahtarları
  const variationTranslations: Record<SupportedLanguage, Record<string, string>> = {
    tr: {
      'Size': 'Beden',
      'Color': 'Renk',
      'Material': 'Malzeme',
      'Style': 'Stil',
      'Pattern': 'Desen'
    },
    en: {
      'Size': 'Size',
      'Color': 'Color',
      'Material': 'Material',
      'Style': 'Style',
      'Pattern': 'Pattern'
    },
    fr: {
      'Size': 'Taille',
      'Color': 'Couleur',
      'Material': 'Matériau',
      'Style': 'Style',
      'Pattern': 'Motif'
    },
    es: {
      'Size': 'Talla',
      'Color': 'Color',
      'Material': 'Material',
      'Style': 'Estilo',
      'Pattern': 'Patrón'
    },
    de: {
      'Size': 'Größe',
      'Color': 'Farbe',
      'Material': 'Material',
      'Style': 'Stil',
      'Pattern': 'Muster'
    }
  };

  return variationTranslations[language]?.[variationName] || variationName;
};

/**
 * Kategori ismini mevcut dile göre çevirir
 */
export const getTranslatedCategory = (category: string, language: SupportedLanguage): string => {
  const categoryTranslations: Record<SupportedLanguage, Record<string, string>> = {
    tr: {
      'Ceketler': 'Ceketler',
      'Pantolonlar': 'Pantolonlar',
      'Ayakkabılar': 'Ayakkabılar',
      'Sırt Çantaları': 'Sırt Çantaları',
      'Çadırlar': 'Çadırlar',
      'Uyku Tulumları': 'Uyku Tulumları',
      'Aksesuarlar': 'Aksesuarlar',
      'Giyim': 'Giyim',
      'Ayakkabı': 'Ayakkabı',
      'Aksesuar': 'Aksesuar',
      'Elektronik': 'Elektronik',
      'Ev & Yaşam': 'Ev & Yaşam',
      'Spor': 'Spor',
      'Kitap': 'Kitap',
      'Güzellik': 'Güzellik',
      'Sağlık': 'Sağlık'
    },
    en: {
      'Ceketler': 'Jackets',
      'Pantolonlar': 'Pants',
      'Ayakkabılar': 'Shoes',
      'Sırt Çantaları': 'Backpacks',
      'Çadırlar': 'Tents',
      'Uyku Tulumları': 'Sleeping Bags',
      'Aksesuarlar': 'Accessories',
      'Giyim': 'Clothing',
      'Ayakkabı': 'Shoes',
      'Aksesuar': 'Accessories',
      'Elektronik': 'Electronics',
      'Ev & Yaşam': 'Home & Living',
      'Spor': 'Sports',
      'Kitap': 'Books',
      'Güzellik': 'Beauty',
      'Sağlık': 'Health'
    },
    fr: {
      'Ceketler': 'Vestes',
      'Pantolonlar': 'Pantalons',
      'Ayakkabılar': 'Chaussures',
      'Sırt Çantaları': 'Sacs à dos',
      'Çadırlar': 'Tentes',
      'Uyku Tulumları': 'Sacs de couchage',
      'Aksesuarlar': 'Accessoires',
      'Giyim': 'Vêtements',
      'Ayakkabı': 'Chaussures',
      'Aksesuar': 'Accessoires',
      'Elektronik': 'Électronique',
      'Ev & Yaşam': 'Maison et vie',
      'Spor': 'Sports',
      'Kitap': 'Livres',
      'Güzellik': 'Beauté',
      'Sağlık': 'Santé'
    },
    es: {
      'Ceketler': 'Chaquetas',
      'Pantolonlar': 'Pantalones',
      'Ayakkabılar': 'Zapatos',
      'Sırt Çantaları': 'Mochilas',
      'Çadırlar': 'Tiendas',
      'Uyku Tulumları': 'Sacos de dormir',
      'Aksesuarlar': 'Accesorios',
      'Giyim': 'Ropa',
      'Ayakkabı': 'Zapatos',
      'Aksesuar': 'Accesorios',
      'Elektronik': 'Electrónicos',
      'Ev & Yaşam': 'Hogar y vida',
      'Spor': 'Deportes',
      'Kitap': 'Libros',
      'Güzellik': 'Belleza',
      'Sağlık': 'Salud'
    },
    de: {
      'Ceketler': 'Jacken',
      'Pantolonlar': 'Hosen',
      'Ayakkabılar': 'Schuhe',
      'Sırt Çantaları': 'Rucksäcke',
      'Çadırlar': 'Zelte',
      'Uyku Tulumları': 'Schlafsäcke',
      'Aksesuarlar': 'Accessoires',
      'Giyim': 'Kleidung',
      'Ayakkabı': 'Schuhe',
      'Aksesuar': 'Accessoires',
      'Elektronik': 'Elektronik',
      'Ev & Yaşam': 'Haus & Leben',
      'Spor': 'Sport',
      'Kitap': 'Bücher',
      'Güzellik': 'Schönheit',
      'Sağlık': 'Gesundheit'
    }
  };

  return categoryTranslations[language]?.[category] || category;
};

/**
 * Marka ismini mevcut dile göre çevirir
 */
export const getTranslatedBrand = (brand: string, language: SupportedLanguage): string => {
  const brandTranslations: Record<SupportedLanguage, Record<string, string>> = {
    tr: {
      'Nike': 'Nike',
      'Adidas': 'Adidas',
      'Puma': 'Puma',
      'Under Armour': 'Under Armour',
      'The North Face': 'The North Face',
      'Columbia': 'Columbia',
      'Patagonia': 'Patagonia',
      'Arc\'teryx': 'Arc\'teryx',
      'Salomon': 'Salomon',
      'Merrell': 'Merrell'
    },
    en: {
      'Nike': 'Nike',
      'Adidas': 'Adidas',
      'Puma': 'Puma',
      'Under Armour': 'Under Armour',
      'The North Face': 'The North Face',
      'Columbia': 'Columbia',
      'Patagonia': 'Patagonia',
      'Arc\'teryx': 'Arc\'teryx',
      'Salomon': 'Salomon',
      'Merrell': 'Merrell'
    },
    fr: {
      'Nike': 'Nike',
      'Adidas': 'Adidas',
      'Puma': 'Puma',
      'Under Armour': 'Under Armour',
      'The North Face': 'The North Face',
      'Columbia': 'Columbia',
      'Patagonia': 'Patagonia',
      'Arc\'teryx': 'Arc\'teryx',
      'Salomon': 'Salomon',
      'Merrell': 'Merrell'
    },
    es: {
      'Nike': 'Nike',
      'Adidas': 'Adidas',
      'Puma': 'Puma',
      'Under Armour': 'Under Armour',
      'The North Face': 'The North Face',
      'Columbia': 'Columbia',
      'Patagonia': 'Patagonia',
      'Arc\'teryx': 'Arc\'teryx',
      'Salomon': 'Salomon',
      'Merrell': 'Merrell'
    },
    de: {
      'Nike': 'Nike',
      'Adidas': 'Adidas',
      'Puma': 'Puma',
      'Under Armour': 'Under Armour',
      'The North Face': 'The North Face',
      'Columbia': 'Columbia',
      'Patagonia': 'Patagonia',
      'Arc\'teryx': 'Arc\'teryx',
      'Salomon': 'Salomon',
      'Merrell': 'Merrell'
    }
  };

  return brandTranslations[language]?.[brand] || brand;
};
