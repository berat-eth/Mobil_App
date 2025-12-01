import { Product, ProductVariation, ProductVariationOption } from '../utils/types';

export interface XmlProduct {
  UrunKartiID: string;
  UrunAdi: string;
  OnYazi: string;
  Aciklama: string;
  Marka: string;
  SatisBirimi: string;
  KategoriID: string;
  Kategori: string;
  KategoriTree: string;
  UrunUrl: string;
  Resimler: string[];
  UrunSecenek: {
    Secenek: XmlProductVariation[];
  };
  TeknikDetaylar: string;
}

export interface XmlProductVariation {
  VaryasyonID: string;
  StokKodu: string;
  Barkod: string;
  StokAdedi: string;
  AlisFiyati: string;
  SatisFiyati: string;
  IndirimliFiyat: string;
  KDVDahil: string;
  KdvOrani: string;
  ParaBirimi: string;
  ParaBirimiKodu: string;
  Desi: string;
  EkSecenekOzellik: {
    Ozellik: {
      Tanim: string;
      Deger: string;
    };
  };
}

export interface XmlResponse {
  Root: {
    Urunler: {
      Urun: XmlProduct[];
    };
  };
}

export interface CategoryTree {
  mainCategory: string;
  subCategories: string[];
  fullPath: string;
}

export class XmlProductService {
  private static readonly XML_URL = 'https://www.hugluoutdoor.com/TicimaxXml/2AF3B156D82546DCA5F28C2012E64724/';

  static async fetchProducts(): Promise<XmlProduct[]> {
    try {
      const response = await fetch(this.XML_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const xmlText = await response.text();
      const products = this.parseXmlProducts(xmlText);
      return products;
    } catch (error) {
      console.error('Error fetching XML products:', error);
      throw error;
    }
  }

  static async fetchCategories(): Promise<CategoryTree[]> {
    try {
      const products = await this.fetchProducts();
      const categoryMap = new Map<string, Set<string>>();
      
      products.forEach(product => {
        const categoryTree = this.parseCategoryTree(product.KategoriTree);
        if (categoryTree.mainCategory) {
          if (!categoryMap.has(categoryTree.mainCategory)) {
            categoryMap.set(categoryTree.mainCategory, new Set());
          }
          if (categoryTree.subCategories.length > 0) {
            categoryTree.subCategories.forEach(subCat => {
              categoryMap.get(categoryTree.mainCategory)!.add(subCat);
            });
          }
        }
      });

      const categories: CategoryTree[] = [];
      categoryMap.forEach((subCats, mainCat) => {
        categories.push({
          mainCategory: mainCat,
          subCategories: Array.from(subCats),
          fullPath: mainCat
        });
      });

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  static async fetchProductsByCategory(category: string): Promise<XmlProduct[]> {
    try {
      const products = await this.fetchProducts();
      return products.filter(product => {
        const categoryTree = this.parseCategoryTree(product.KategoriTree);
        return categoryTree.mainCategory === category || 
               categoryTree.subCategories.includes(category);
      });
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  static async searchProducts(query: string): Promise<XmlProduct[]> {
    try {
      const products = await this.fetchProducts();
      const lowerQuery = query.toLowerCase();
      
      return products.filter(product => 
        product.UrunAdi.toLowerCase().includes(lowerQuery) ||
        product.Marka.toLowerCase().includes(lowerQuery) ||
        product.Kategori.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  static parseCategoryTree(categoryTree: string): { mainCategory: string; subCategories: string[] } {
    const parts = categoryTree.split('/').filter(part => part.trim());
    
    if (parts.length === 0) {
      return { mainCategory: '', subCategories: [] };
    }
    
    const mainCategory = parts[0].trim();
    const subCategories = parts.slice(1).map(part => part.trim());
    
    return { mainCategory, subCategories };
  }

  static convertXmlProductToAppProduct(xmlProduct: XmlProduct): Product {
    const variations: ProductVariation[] = [];
    
    if (xmlProduct.UrunSecenek?.Secenek && xmlProduct.UrunSecenek.Secenek.length > 0) {
      const variationMap = new Map<string, ProductVariationOption[]>();
      
      xmlProduct.UrunSecenek.Secenek.forEach(secenek => {
        const variationName = secenek.EkSecenekOzellik?.Ozellik?.Tanim || 'Beden';
        const variationValue = secenek.EkSecenekOzellik?.Ozellik?.Deger || '';
        
        // Skip if variation value is empty
        if (!variationValue.trim()) {
          return;
        }
        
        if (!variationMap.has(variationName)) {
          variationMap.set(variationName, []);
        }
        
        // Fiyat hesaplama - IndirimliFiyat 0 ise SatisFiyati kullan
        const discountedPrice = parseFloat(secenek.IndirimliFiyat?.replace(',', '.')) || 0;
        const regularPrice = parseFloat(secenek.SatisFiyati?.replace(',', '.')) || 0;
        const finalPrice = discountedPrice > 0 ? discountedPrice : regularPrice;

        const option: ProductVariationOption = {
          id: parseInt(secenek.VaryasyonID),
          variationId: 0, // Will be set later
          name: variationName,
          value: variationValue,
          priceModifier: finalPrice,
          stock: parseInt(secenek.StokAdedi) || 0,
          sku: secenek.StokKodu
        };
        
        variationMap.get(variationName)!.push(option);
      });
      
      // Create variations even if there is only a single option value
      let variationId = 1;
      variationMap.forEach((options, name) => {
        if (options.length === 0) return;
        const currentVariationId = variationId++;
        variations.push({
          id: currentVariationId,
          productId: parseInt(xmlProduct.UrunKartiID),
          name,
          options: options.map(option => ({
            ...option,
            variationId: currentVariationId
          }))
        });
      });
    }

    const categoryTree = this.parseCategoryTree(xmlProduct.KategoriTree);
    
    // Fiyat hesaplama - IndirimliFiyat 0 ise SatisFiyati kullan
    const firstVariation = xmlProduct.UrunSecenek?.Secenek?.[0];
    let price = 0;
    
    if (firstVariation) {
      const discountedPrice = parseFloat(firstVariation.IndirimliFiyat?.replace(',', '.')) || 0;
      const regularPrice = parseFloat(firstVariation.SatisFiyati?.replace(',', '.')) || 0;
      price = discountedPrice > 0 ? discountedPrice : regularPrice;
    }

    // Görselleri ayrı sütunlara böl
    const images = xmlProduct.Resimler || [];
    const image1 = images.length > 0 ? images[0] : '';
    const image2 = images.length > 1 ? images[1] : '';
    const image3 = images.length > 2 ? images[2] : '';
    const image4 = images.length > 3 ? images[3] : '';
    const image5 = images.length > 4 ? images[4] : '';

    return {
      id: parseInt(xmlProduct.UrunKartiID),
      name: xmlProduct.UrunAdi,
      description: this.cleanHtml(xmlProduct.Aciklama),
      price: price,
      category: categoryTree.mainCategory,
      image: image1,
      images: images,
      image1: image1,
      image2: image2,
      image3: image3,
      image4: image4,
      image5: image5,
      stock: xmlProduct.UrunSecenek?.Secenek?.reduce((total, secenek) => 
        total + (parseInt(secenek.StokAdedi) || 0), 0) || 0,
      brand: xmlProduct.Marka,
      rating: 0, // XML'de rating bilgisi yok
      reviewCount: 0, // XML'de review bilgisi yok
      variations,
      hasVariations: variations.length > 0,
      sku: xmlProduct.UrunSecenek?.Secenek?.[0]?.StokKodu || '',
      source: 'XML'
    };
  }

  private static cleanHtml(html: string): string {
    // HTML taglarını temizle
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private static parseXmlProducts(xmlText: string): XmlProduct[] {
    try {
      // React Native'de DOMParser bulunmadığı için regex ile parse ediyoruz
      const products: XmlProduct[] = [];
      
      // Urun taglarını bul
      const urunRegex = /<Urun>([\s\S]*?)<\/Urun>/g;
      let urunMatch;
      
      while ((urunMatch = urunRegex.exec(xmlText)) !== null) {
        const urunContent = urunMatch[1];
        const product = this.parseProductNodeRegex(urunContent);
        if (product) {
          products.push(product);
        }
      }
      
      return products;
    } catch (error) {
      console.error('Error parsing XML:', error);
      return [];
    }
  }

  private static parseProductNodeRegex(urunContent: string): XmlProduct | null {
    try {
      const getTextContent = (tagName: string): string => {
        const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
        const match = urunContent.match(regex);
        return match ? match[1].trim() : '';
      };

      const getTextContentWithCdata = (tagName: string): string => {
        const regex = new RegExp(`<${tagName}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tagName}>`, 'i');
        const match = urunContent.match(regex);
        if (match) return match[1].trim();
        
        // CDATA olmadan da dene
        return getTextContent(tagName);
      };

      const getImages = (): string[] => {
        const resimRegex = /<Resim>([^<]+)<\/Resim>/gi;
        const images: string[] = [];
        let resimMatch;
        
        while ((resimMatch = resimRegex.exec(urunContent)) !== null) {
          images.push(resimMatch[1].trim());
        }
        
        return images;
      };

      const getVariations = (): XmlProductVariation[] => {
        const secenekRegex = /<Secenek>([\s\S]*?)<\/Secenek>/g;
        const variations: XmlProductVariation[] = [];
        let secenekMatch;
        
        while ((secenekMatch = secenekRegex.exec(urunContent)) !== null) {
          const secenekContent = secenekMatch[1];
          
          const getSecenekText = (tagName: string): string => {
            const regex = new RegExp(`<${tagName}>([^<]+)<\\/${tagName}>`, 'i');
            const match = secenekContent.match(regex);
            return match ? match[1].trim() : '';
          };

          const getOzellik = () => {
            // Önce attribute'leri yakala: <Ozellik Tanim="Beden" Deger="S">
            let ozellikRegex = /<Ozellik\s+Tanim="([^"]+)"\s+Deger="([^"]+)"/i;
            let match = secenekContent.match(ozellikRegex);
            
            let tanim = match ? match[1] : '';
            let deger = match ? match[2] : '';
            
            // Eğer attribute'lerde deger yoksa, içeriği oku: <Ozellik ...>S</Ozellik>
            if (!deger) {
              const contentRegex = /<Ozellik[^>]*>([^<]+)<\/Ozellik>/i;
              const contentMatch = secenekContent.match(contentRegex);
              if (contentMatch) {
                deger = contentMatch[1].trim();
              }
            }
            
            // Eğer tanim yoksa ama deger bir beden formatındaysa, "Beden" olarak ayarla
            if (!tanim && deger) {
              const sizePattern = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|\d+)$/i;
              if (sizePattern.test(deger.trim())) {
                tanim = 'Beden';
              }
            }
            
            // Alternatif format: Tanim ve Deger farklı sırada olabilir
            if (!tanim || !deger) {
              const altRegex = /<Ozellik\s+Deger="([^"]+)"\s+Tanim="([^"]+)"/i;
              const altMatch = secenekContent.match(altRegex);
              if (altMatch && (!tanim || !deger)) {
                if (!deger) deger = altMatch[1];
                if (!tanim) tanim = altMatch[2];
              }
            }
            
            return {
              Tanim: tanim.trim(),
              Deger: deger.trim()
            };
          };

          const variation: XmlProductVariation = {
            VaryasyonID: getSecenekText('VaryasyonID'),
            StokKodu: getSecenekText('StokKodu'),
            Barkod: getSecenekText('Barkod'),
            StokAdedi: getSecenekText('StokAdedi'),
            AlisFiyati: getSecenekText('AlisFiyati'),
            SatisFiyati: getSecenekText('SatisFiyati'),
            IndirimliFiyat: getSecenekText('IndirimliFiyat'),
            KDVDahil: getSecenekText('KDVDahil'),
            KdvOrani: getSecenekText('KdvOrani'),
            ParaBirimi: getSecenekText('ParaBirimi'),
            ParaBirimiKodu: getSecenekText('ParaBirimiKodu'),
            Desi: getSecenekText('Desi'),
            EkSecenekOzellik: {
              Ozellik: getOzellik()
            }
          };

          variations.push(variation);
        }
        
        return variations;
      };

      return {
        UrunKartiID: getTextContent('UrunKartiID'),
        UrunAdi: getTextContent('UrunAdi'),
        OnYazi: getTextContentWithCdata('OnYazi'),
        Aciklama: getTextContentWithCdata('Aciklama'),
        Marka: getTextContent('Marka'),
        SatisBirimi: getTextContent('SatisBirimi'),
        KategoriID: getTextContent('KategoriID'),
        Kategori: getTextContent('Kategori'),
        KategoriTree: getTextContent('KategoriTree'),
        UrunUrl: getTextContent('UrunUrl'),
        Resimler: getImages(),
        UrunSecenek: {
          Secenek: getVariations()
        },
        TeknikDetaylar: getTextContent('TeknikDetaylar')
      };
    } catch (error) {
      console.error('Error parsing product node:', error);
      return null;
    }
  }
}
