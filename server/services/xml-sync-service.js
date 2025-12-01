const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');

class XmlSyncService {
  constructor(pool) {
    this.pool = pool;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncStats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      errors: 0,
      processedProducts: 0,
      currentProduct: null
    };
    this.message = null;
  }

  /**
   * Retry mekanizması ile pool.execute çağrısı
   * ECONNRESET ve diğer bağlantı hatalarını otomatik olarak yeniden dener
   */
  async executeWithRetry(sql, params, maxRetries = 3, retryDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.pool.execute(sql, params);
      } catch (error) {
        lastError = error;
        
        // ECONNRESET, ETIMEDOUT, PROTOCOL_CONNECTION_LOST gibi bağlantı hataları
        const isConnectionError = 
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'PROTOCOL_CONNECTION_LOST' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.message?.includes('Connection lost') ||
          error.message?.includes('read ECONNRESET') ||
          error.message?.includes('timeout');
        
        if (isConnectionError && attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.warn(`⚠️ Database connection error (${error.code || error.message}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Bağlantı hatası değilse veya son denemeyse throw et
        throw error;
      }
    }
    
    // Tüm denemeler başarısız
    throw lastError;
  }

  // XML kaynakları konfigürasyonu
  getXmlSources() {
    return [
      {
        name: 'Huglu Outdoor',
        url: 'https://www.hugluoutdoor.com/TicimaxXml/2AF3B156D82546DCA5F28C2012E64724/',
        category: 'outdoor',
        priority: 1,
        type: 'ticimax' // XML tipini belirt
      }
    ];
  }

  // XML veriyi çek ve parse et
  async fetchAndParseXml(xmlSource) {
    try {
      console.log(`📡 Fetching XML from: ${xmlSource.name} (${xmlSource.url})`);
      
      const response = await axios.get(xmlSource.url, {
        timeout: 30000, // 30 saniye timeout
        headers: {
          'User-Agent': 'Huglu-Backend-Sync/1.0'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlData = response.data;
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false, // ✅ Attribute'leri koru (Tanim, Deger gibi)
        attrkey: '$', // Attribute'leri $ objesine koy
        charkey: '_', // Text içeriği _ property'sine koy
        trim: true
      });

      const result = await parser.parseStringPromise(xmlData);
      console.log(`✅ XML parsed successfully from ${xmlSource.name}`);
      
      // Debug: XML yapısını kontrol et
      console.log('🔍 XML Structure Debug:');
      console.log('Root exists:', !!result.Root);
      if (result.Root) {
        console.log('Root keys:', Object.keys(result.Root));
        console.log('Urunler exists:', !!result.Root.Urunler);
        if (result.Root.Urunler) {
          console.log('Urunler keys:', Object.keys(result.Root.Urunler));
          console.log('Urun exists:', !!result.Root.Urunler.Urun);
          if (result.Root.Urunler.Urun) {
            console.log('Urun type:', typeof result.Root.Urunler.Urun);
            console.log('Urun length:', Array.isArray(result.Root.Urunler.Urun) ? result.Root.Urunler.Urun.length : 'Not array');
          }
        }
      }
      
      // Tüm XML yapısını göster (ilk 1000 karakter)
      console.log('📄 Full XML structure preview:');
      console.log(JSON.stringify(result, null, 2).substring(0, 1000));
      
      // Hata kontrolü
      if (result.Root && result.Root.ErrorMessage) {
        throw new Error(`XML Error: ${result.Root.ErrorMessage}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error fetching XML from ${xmlSource.name}:`, error.message);
      throw error;
    }
  }

  // XML veriyi ürün formatına dönüştür
  parseXmlToProducts(xmlData, source) {
    try {
      const products = [];
      
      // Ticimax XML formatı için
      if (source.type === 'ticimax' && xmlData.Root && xmlData.Root.Urunler && xmlData.Root.Urunler.Urun) {
        const items = Array.isArray(xmlData.Root.Urunler.Urun) 
          ? xmlData.Root.Urunler.Urun 
          : [xmlData.Root.Urunler.Urun];

        console.log(`🔍 Found ${items.length} products in Ticimax XML`);
        
        items.forEach((item, index) => {
          try {
            const product = this.mapTicimaxProduct(item, source);
            if (product) {
              products.push(product);
            }
          } catch (itemError) {
            console.warn(`⚠️ Error parsing Ticimax item ${index}:`, itemError.message);
          }
        });
      }
      // RSS formatı için (eski kod)
      else if (xmlData.rss && xmlData.rss.channel && xmlData.rss.channel.item) {
        const items = Array.isArray(xmlData.rss.channel.item) 
          ? xmlData.rss.channel.item 
          : [xmlData.rss.channel.item];

        items.forEach((item, index) => {
          try {
            const product = this.mapXmlItemToProduct(item, source);
            if (product) {
              products.push(product);
            }
          } catch (itemError) {
            console.warn(`⚠️ Error parsing RSS item ${index} from ${source.name}:`, itemError.message);
          }
        });
      }

      console.log(`📦 Parsed ${products.length} products from ${source.name}`);
      return products;
    } catch (error) {
      console.error(`❌ Error parsing XML to products from ${source.name}:`, error.message);
      throw error;
    }
  }

  // Ticimax XML item'ını ürün objesine dönüştür
  mapTicimaxProduct(item, source) {
    try {
      // Resimleri al ve ayrı sütunlara böl
      let images = [];
      if (item.Resimler && item.Resimler.Resim) {
        images = Array.isArray(item.Resimler.Resim) 
          ? item.Resimler.Resim 
          : [item.Resimler.Resim];
      }

      // Görselleri ayrı sütunlara böl
      const image1 = images.length > 0 ? images[0] : '';
      const image2 = images.length > 1 ? images[1] : '';
      const image3 = images.length > 2 ? images[2] : '';
      const image4 = images.length > 3 ? images[3] : '';
      const image5 = images.length > 4 ? images[4] : '';

      // Varyasyonları al ve detaylı işle (çoklu özellik desteği: Beden, Renk, vb.)
      let variations = [];
      let variationDetails = [];
      if (item.UrunSecenek && item.UrunSecenek.Secenek) {
        variations = Array.isArray(item.UrunSecenek.Secenek) 
          ? item.UrunSecenek.Secenek 
          : [item.UrunSecenek.Secenek];

        // Her varyasyon için detaylı bilgi topla
        variations.forEach(variation => {
          const stok = parseInt(variation.StokAdedi) || 0;
          const indirimli = this.extractPrice(variation.IndirimliFiyat);
          const satis = this.extractPrice(variation.SatisFiyati);
          const fiyat = indirimli > 0 ? indirimli : satis;

          // EkSecenekOzellik > Ozellik alanlarını topla (array olabilir)
          const attributes = {};
          let hasVariationAttributes = false;
          
          try {
            const ozellik = variation.EkSecenekOzellik?.Ozellik;
            
            // Eğer EkSecenekOzellik boş veya null ise varyasyonsuz ürün
            if (!ozellik || (typeof ozellik === 'object' && Object.keys(ozellik).length === 0)) {
              hasVariationAttributes = false;
            } else {
              const attrs = Array.isArray(ozellik) ? ozellik : (ozellik ? [ozellik] : []);
              
              // Debug: Ozellik yapısını logla
              if (attrs.length > 0) {
                console.log(`🔍 Parsing Ozellik for variation ${variation.VaryasyonID}:`, JSON.stringify(attrs[0], null, 2));
              }
              
              attrs.forEach(entry => {
                // XML yapısı: <Ozellik Tanim="Beden" Deger="S">S</Ozellik>
                // XML2JS parser farklı formatlarda döndürebilir:
                // 1. { $: { Tanim: "Beden", Deger: "S" }, _: "S" } (ignoreAttrs: false, attrkey: '$')
                // 2. String: "S" (eğer parser attribute'leri yok sayıyorsa veya sadece içeriği alıyorsa)
                // 3. Object: { Tanim: "Beden", Deger: "S" } (eski format)
                let name = '';
                let value = '';
                
                // Eğer entry bir string ise (parser sadece içeriği almışsa)
                if (typeof entry === 'string') {
                  value = entry.trim();
                  // Eğer value bir beden gibi görünüyorsa, "Beden" olarak ayarla
                  const sizePattern = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|4XL|\d+)$/i;
                  if (sizePattern.test(value)) {
                    name = 'Beden';
                    console.log(`✅ String entry'den beden bulundu: "${value}" -> name="Beden"`);
                  } else {
                    // Beden değilse, value'yu hem name hem value olarak kullan (genel özellik)
                    name = value;
                    console.log(`✅ String entry'den özellik bulundu: "${value}"`);
                  }
                }
                // Eğer entry bir obje ise
                else if (entry && typeof entry === 'object') {
                  // Önce attribute objesi ($) kontrolü - ignoreAttrs: false ile attribute'ler $ objesinde olur
                  if (entry.$ && typeof entry.$ === 'object') {
                    name = (entry.$.Tanim || entry.$['@Tanim'] || '').toString().trim();
                    value = (entry.$.Deger || entry.$['@Deger'] || '').toString().trim();
                    
                    if (name || value) {
                      console.log(`✅ Attribute objesinden bulundu: name="${name}", value="${value}"`);
                    }
                  }
                  
                  // Eğer $ objesinde bulamadıysak direkt property'leri kontrol et (eski format uyumluluğu için)
                  if (!name || !value) {
                    name = (entry?.Tanim || entry?.['@Tanim'] || entry?.$?.Tanim || '').toString().trim();
                    value = (entry?.Deger || entry?.['@Deger'] || entry?.$?.Deger || '').toString().trim();
                    
                    if (name || value) {
                      console.log(`✅ Property'lerden bulundu: name="${name}", value="${value}"`);
                    }
                  }
                  
                  // Eğer hala bulamadıysak içeriği (_) kontrol et (fallback)
                  if (name && !value && entry?._) {
                    value = entry._.toString().trim();
                    if (value) {
                      console.log(`✅ İçerikten bulundu: value="${value}"`);
                    }
                  }
                  
                  // Değer yoksa ama içerik varsa, içeriği kullan (XML'de sadece içerik olabilir)
                  if (!value && entry?._) {
                    value = entry._.toString().trim();
                    if (value) {
                      console.log(`✅ İçerikten (fallback) bulundu: value="${value}"`);
                    }
                  }
                  
                  // Name yoksa ama value varsa, value'yu name olarak da kullanabiliriz (bazı XML formatlarında)
                  if (!name && value) {
                    // Eğer value bir beden gibi görünüyorsa, "Beden" olarak ayarla
                    const sizePattern = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|\d+)$/i;
                    if (sizePattern.test(value)) {
                      name = 'Beden';
                      console.log(`✅ Beden pattern match: "${value}" -> name="Beden"`);
                    }
                  }
                }
                
                // Son kontrol: eğer hala name yoksa ama value varsa, value'yu name olarak kullan
                if (!name && value) {
                  name = value;
                }
                
                if (name && value) {
                  attributes[name] = value;
                  hasVariationAttributes = true;
                  
                  // Beden bilgisini özel olarak işle
                  if (name.toLowerCase() === 'beden' || name.toLowerCase() === 'size') {
                    console.log(`📏 ✅ Beden bilgisi bulundu ve kaydedildi: ${name}="${value}" (Varyasyon ID: ${variation.VaryasyonID})`);
                  } else {
                    console.log(`📋 Özellik bulundu: ${name}="${value}" (Varyasyon ID: ${variation.VaryasyonID})`);
                  }
                } else {
                  console.warn(`⚠️ ⚠️ Ozellik parse edilemedi - entry type: ${typeof entry}, entry:`, JSON.stringify(entry, null, 2));
                  if (entry && typeof entry === 'object') {
                    console.warn(`   Entry keys:`, Object.keys(entry || {}));
                    console.warn(`   Entry.$:`, entry?.$);
                    console.warn(`   Entry._:`, entry?._);
                  }
                }
              });
            }
          } catch(error) {
            console.error('XML attributes parse hatası:', error, 'Variation:', variation.VaryasyonID);
            hasVariationAttributes = false;
          }

          // Varyasyonsuz ürünler için attributes null yap
          if (!hasVariationAttributes) {
            variationDetails.push({
              varyasyonId: variation.VaryasyonID,
              attributes: null, // varyasyonsuz ürünler için null
              stok: stok,
              fiyat: fiyat,
              stokKodu: variation.StokKodu,
              barkod: variation.Barkod || null,
              alisFiyati: this.extractPrice(variation.AlisFiyati),
              satisFiyati: this.extractPrice(variation.SatisFiyati),
              indirimliFiyat: this.extractPrice(variation.IndirimliFiyat),
              kdvDahil: String(variation.KDVDahil || '').toLowerCase() === 'true',
              kdvOrani: parseInt(variation.KdvOrani) || 0,
              paraBirimi: variation.ParaBirimi || 'TL',
              paraBirimiKodu: variation.ParaBirimiKodu || 'TRY',
              desi: parseInt(variation.Desi) || 1
            });
          } else {
            variationDetails.push({
              varyasyonId: variation.VaryasyonID,
              attributes, // çoklu özellikler
              stok: stok,
              fiyat: fiyat,
              stokKodu: variation.StokKodu,
              barkod: variation.Barkod,
              alisFiyati: this.extractPrice(variation.AlisFiyati),
              satisFiyati: this.extractPrice(variation.SatisFiyati),
              indirimliFiyat: this.extractPrice(variation.IndirimliFiyat),
              kdvDahil: String(variation.KDVDahil || '').toLowerCase() === 'true',
              kdvOrani: parseInt(variation.KdvOrani) || 0,
              paraBirimi: variation.ParaBirimi || 'TL',
              paraBirimiKodu: variation.ParaBirimiKodu || 'TRY',
              desi: parseInt(variation.Desi) || 1
            });
          }
        });
      }

      // Toplam stok hesapla
      const totalStock = variations.reduce((total, variation) => {
        return total + (parseInt(variation.StokAdedi) || 0);
      }, 0);

      // En düşük fiyatı al - IndirimliFiyat 0 ise SatisFiyati kullan
      const minPrice = variations.reduce((min, variation) => {
        const discountedPrice = this.extractPrice(variation.IndirimliFiyat);
        const regularPrice = this.extractPrice(variation.SatisFiyati);
        const price = discountedPrice > 0 ? discountedPrice : regularPrice;
        return price < min ? price : min;
      }, Number.MAX_VALUE);

      const product = {
        name: item.UrunAdi || 'Unknown Product',
        description: this.cleanHtml(item.Aciklama || ''),
        price: minPrice === Number.MAX_VALUE ? 0 : minPrice,
        category: this.extractMainCategory(item.KategoriTree || item.Kategori),
        brand: item.Marka || 'Huğlu Outdoor',
        image: image1, // Ana görsel (ilk görsel)
        images: JSON.stringify(images), // Tüm görseller JSON olarak
        image1: image1,
        image2: image2,
        image3: image3,
        image4: image4,
        image5: image5,
        stock: totalStock,
        rating: 0, // Ticimax'te rating yok
        reviewCount: 0, // Ticimax'te review yok
        externalId: item.UrunKartiID || `ext_${Date.now()}_${Math.random()}`,
        source: source.name,
        lastUpdated: new Date(),
        // Ek bilgiler
        variations: variations.length,
        variationDetails: JSON.stringify(variationDetails), // Varyasyon detayları
        categoryTree: item.KategoriTree || '',
        productUrl: item.UrunUrl || '',
        salesUnit: item.SatisBirimi || 'ADET',
        totalImages: images.length, // Toplam görsel sayısı
        hasVariations: variations.length > 0,
        sku: variations.length > 0 ? variations[0].StokKodu : '', // İlk varyasyonun stok kodu
        // Yeni tek tablo alanları
        xmlOptions: JSON.stringify({ options: variationDetails }),
        xmlRaw: JSON.stringify(item)
      };

      // Gerekli alanları kontrol et
      if (!product.name || product.name === 'Unknown Product') {
        return null;
      }

      return product;
    } catch (error) {
      console.warn(`⚠️ Error mapping Ticimax item:`, error.message);
      return null;
    }
  }

  // HTML taglarını temizle
  cleanHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Ana kategoriyi çıkar
  extractMainCategory(categoryTree) {
    if (!categoryTree) return 'Genel';
    const parts = categoryTree.split('/');
    return parts[0] || 'Genel';
  }

  // XML item'ı ürün objesine dönüştür (RSS için)
  mapXmlItemToProduct(item, source) {
    try {
      // XML yapısına göre mapping (örnek)
      const product = {
        name: item.title || item.name || 'Unknown Product',
        description: item.description || item.summary || '',
        price: this.extractPrice(item.price || item.cost || '0'),
        category: source.category,
        brand: 'Huglu',
        image: item.image || item.thumbnail || '',
        stock: this.extractStock(item.stock || item.availability || '0'),
        rating: this.extractRating(item.rating || '0'),
        reviewCount: parseInt(item.reviewCount || '0') || 0,
        externalId: item.id || item.guid || `ext_${Date.now()}_${Math.random()}`,
        source: source.name,
        lastUpdated: new Date()
      };

      // Gerekli alanları kontrol et
      if (!product.name || product.name === 'Unknown Product') {
        return null;
      }

      return product;
    } catch (error) {
      console.warn(`⚠️ Error mapping XML item:`, error.message);
      return null;
    }
  }

  // Fiyat çıkarma
  extractPrice(priceStr) {
    try {
      if (typeof priceStr === 'number') return priceStr;
      
      const price = parseFloat(priceStr.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
      return isNaN(price) ? 0 : price;
    } catch {
      return 0;
    }
  }

  // Stok çıkarma
  extractStock(stockStr) {
    try {
      if (typeof stockStr === 'number') return stockStr;
      
      const stock = parseInt(stockStr.toString().replace(/[^\d]/g, ''));
      return isNaN(stock) ? 0 : stock;
    } catch {
      return 0;
    }
  }

  // Rating çıkarma
  extractRating(ratingStr) {
    try {
      if (typeof ratingStr === 'number') return ratingStr;
      
      const rating = parseFloat(ratingStr.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
      return isNaN(rating) ? 0 : Math.min(Math.max(rating, 0), 5); // 0-5 arası
    } catch {
      return 0;
    }
  }

  // Ürünü veritabanına ekle veya güncelle
  async upsertProduct(product, tenantId) {
    try {
      let productId;
              // Önce external ID ile mevcut ürünü kontrol et
        const [existing] = await this.executeWithRetry(
          'SELECT id, name, description, price, stock, image, images, image1, image2, image3, image4, image5, category, brand, hasVariations, sku, categoryTree, productUrl, salesUnit, totalImages, xmlOptions, variationDetails FROM products WHERE externalId = ? AND tenantId = ?',
          [product.externalId, tenantId]
        );

      if (existing.length > 0) {
        // Mevcut ürünü güncelle
        const existingProduct = existing[0];
        productId = existingProduct.id;
        let hasChanges = false;
        const updates = [];

        // Değişiklikleri kontrol et
        if (existingProduct.name !== product.name) {
          updates.push('name = ?');
          hasChanges = true;
        }
        if (existingProduct.description !== product.description) {
          updates.push('description = ?');
          hasChanges = true;
        }
        if (existingProduct.category !== product.category) {
          updates.push('category = ?');
          hasChanges = true;
        }
        if (existingProduct.brand !== product.brand) {
          updates.push('brand = ?');
          hasChanges = true;
        }
        if (existingProduct.price !== product.price) {
          updates.push('price = ?');
          hasChanges = true;
        }
        if (existingProduct.stock !== product.stock) {
          updates.push('stock = ?');
          hasChanges = true;
        }
        if (existingProduct.image !== product.image) {
          updates.push('image = ?');
          hasChanges = true;
        }
        if (existingProduct.images !== product.images) {
          updates.push('images = ?');
          hasChanges = true;
        }
        if (existingProduct.image1 !== product.image1) {
          updates.push('image1 = ?');
          hasChanges = true;
        }
        if (existingProduct.image2 !== product.image2) {
          updates.push('image2 = ?');
          hasChanges = true;
        }
        if (existingProduct.image3 !== product.image3) {
          updates.push('image3 = ?');
          hasChanges = true;
        }
        if (existingProduct.image4 !== product.image4) {
          updates.push('image4 = ?');
          hasChanges = true;
        }
        if (existingProduct.image5 !== product.image5) {
          updates.push('image5 = ?');
          hasChanges = true;
        }
        if (existingProduct.hasVariations !== product.hasVariations) {
          updates.push('hasVariations = ?');
          hasChanges = true;
        }
        if (existingProduct.sku !== product.sku) {
          updates.push('sku = ?');
          hasChanges = true;
        }
        if (existingProduct.categoryTree !== product.categoryTree) {
          updates.push('categoryTree = ?');
          hasChanges = true;
        }
        if (existingProduct.productUrl !== product.productUrl) {
          updates.push('productUrl = ?');
          hasChanges = true;
        }
        if (existingProduct.salesUnit !== product.salesUnit) {
          updates.push('salesUnit = ?');
          hasChanges = true;
        }
        if (existingProduct.totalImages !== product.totalImages) {
          updates.push('totalImages = ?');
          hasChanges = true;
        }
        if (existingProduct.xmlOptions !== product.xmlOptions) {
          updates.push('xmlOptions = ?');
          hasChanges = true;
        }
        
        // variationDetails her zaman güncellenmeli (XML'den gelen yeni veriler için)
        const existingVariationDetails = existingProduct.variationDetails || null;
        const newVariationDetails = product.variationDetails || null;
        let variationDetailsChanged = false;
        
        if (existingVariationDetails !== newVariationDetails) {
          updates.push('variationDetails = ?');
          hasChanges = true;
          variationDetailsChanged = true;
          
          try {
            const details = typeof newVariationDetails === 'string' ? JSON.parse(newVariationDetails || '[]') : (newVariationDetails || []);
            const count = Array.isArray(details) ? details.length : 0;
            console.log(`📦 Product ${product.name}: variationDetails güncelleniyor (${count} varyasyon)`);
          } catch (e) {
            console.log(`📦 Product ${product.name}: variationDetails güncelleniyor`);
          }
        }

        // Eğer sadece variationDetails değiştiyse bile UPDATE yap
        if (hasChanges || variationDetailsChanged) {
          await this.executeWithRetry(
            `UPDATE products SET ${updates.join(', ')}, lastUpdated = ? WHERE id = ?`,
            [
              ...(updates.includes('name = ?') ? [product.name] : []),
              ...(updates.includes('description = ?') ? [product.description] : []),
              ...(updates.includes('category = ?') ? [product.category] : []),
              ...(updates.includes('brand = ?') ? [product.brand] : []),
              ...(updates.includes('price = ?') ? [product.price] : []),
              ...(updates.includes('stock = ?') ? [product.stock] : []),
              ...(updates.includes('image = ?') ? [product.image] : []),
              ...(updates.includes('images = ?') ? [product.images] : []),
              ...(updates.includes('image1 = ?') ? [product.image1] : []),
              ...(updates.includes('image2 = ?') ? [product.image2] : []),
              ...(updates.includes('image3 = ?') ? [product.image3] : []),
              ...(updates.includes('image4 = ?') ? [product.image4] : []),
              ...(updates.includes('image5 = ?') ? [product.image5] : []),
              ...(updates.includes('hasVariations = ?') ? [product.hasVariations] : []),
              ...(updates.includes('sku = ?') ? [product.sku] : []),
              ...(updates.includes('categoryTree = ?') ? [product.categoryTree] : []),
              ...(updates.includes('productUrl = ?') ? [product.productUrl] : []),
              ...(updates.includes('salesUnit = ?') ? [product.salesUnit] : []),
              ...(updates.includes('totalImages = ?') ? [product.totalImages] : []),
              ...(updates.includes('xmlOptions = ?') ? [product.xmlOptions] : []),
              ...(updates.includes('variationDetails = ?') ? [product.variationDetails] : []),
              product.lastUpdated,
              existingProduct.id
            ]
          );
          
          this.syncStats.updatedProducts++;
          console.log(`🔄 Updated product: ${product.name}`);
        }
      } else {
        // Yeni ürün ekle
        const [insertResult] = await this.executeWithRetry(
          `INSERT INTO products (tenantId, name, description, price, category, image, images, image1, image2, image3, image4, image5, stock, brand, rating, reviewCount, externalId, source, hasVariations, sku, lastUpdated, categoryTree, productUrl, salesUnit, totalImages, xmlOptions, xmlRaw, variationDetails) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId,
            product.name,
            product.description,
            product.price,
            product.category,
            product.image,
            product.images,
            product.image1,
            product.image2,
            product.image3,
            product.image4,
            product.image5,
            product.stock,
            product.brand,
            product.rating,
            product.reviewCount,
            product.externalId,
            product.source,
            product.hasVariations,
            product.sku,
            product.lastUpdated,
            product.categoryTree,
            product.productUrl,
            product.salesUnit,
            product.totalImages,
            product.xmlOptions,
            product.xmlRaw,
            product.variationDetails
          ]
        );
        
        if (product.variationDetails) {
          const details = typeof product.variationDetails === 'string' ? JSON.parse(product.variationDetails) : product.variationDetails;
          console.log(`📦 Yeni ürün ${product.name}: variationDetails kaydedildi (${Array.isArray(details) ? details.length : 0} varyasyon)`);
        }
        productId = insertResult.insertId;
        
        this.syncStats.newProducts++;
        console.log(`🆕 Added new product: ${product.name}`);
      }

      // Varyasyonları kaydet
      if (product.hasVariations && product.variationDetails && productId) {
        let details = product.variationDetails;
        try {
          if (typeof details === 'string') {
            details = JSON.parse(details);
          }
        } catch (e) {
          console.warn('⚠️ variationDetails JSON parse failed, skipping variations for', product.name);
          details = [];
        }
        if (Array.isArray(details) && details.length > 0) {
          await this.upsertProductVariations(tenantId, productId, details);
        }
      }

      this.syncStats.totalProducts++;
      return true;
    } catch (error) {
      console.error(`❌ Error upserting product ${product.name}:`, error.message);
      this.syncStats.errors++;
      return false;
    }
  }

  // Ürün varyasyonlarını veritabanına kaydet
  async upsertProductVariations(tenantId, productId, variationDetails) {
    try {
      if (!variationDetails || variationDetails.length === 0) {
        return;
      }

      // Önce mevcut varyasyonları sil
      await this.executeWithRetry(
        'DELETE FROM product_variation_options WHERE variationId IN (SELECT id FROM product_variations WHERE productId = ? AND tenantId = ?)',
        [productId, tenantId]
      );
      await this.executeWithRetry(
        'DELETE FROM product_variations WHERE productId = ? AND tenantId = ?',
        [productId, tenantId]
      );

      // Varyasyonları grupla (çoklu özellik desteği: attributes objesini aç)
      const variationMap = new Map(); // name -> options[]
      
      variationDetails.forEach(variation => {
        // Eğer attributes null ise (varyasyonsuz ürün), genel varyasyon olarak kaydet
        if (variation.attributes === null) {
          const generalVariationName = 'Genel';
          if (!variationMap.has(generalVariationName)) {
            variationMap.set(generalVariationName, []);
          }
          variationMap.get(generalVariationName).push({
            value: 'Tek Seçenek',
            priceModifier: variation.fiyat || 0,
            stock: variation.stok || 0,
            sku: variation.stokKodu || '',
            barkod: variation.barkod || null,
            alisFiyati: variation.alisFiyati || 0,
            satisFiyati: variation.satisFiyati || 0,
            indirimliFiyat: variation.indirimliFiyat || 0,
            kdvDahil: variation.kdvDahil || false,
            kdvOrani: variation.kdvOrani || 0,
            paraBirimi: variation.paraBirimi || 'TL',
            paraBirimiKodu: variation.paraBirimiKodu || 'TRY',
            desi: variation.desi || 1,
            externalId: variation.varyasyonId
          });
        } else {
          // Varyasyonlu ürün için normal işlem
          const attrs = variation.attributes || {};
          const names = Object.keys(attrs);
          if (names.length === 0) return;
          names.forEach(name => {
            const value = (attrs[name] || '').toString();
            if (!value) return;
            if (!variationMap.has(name)) {
              variationMap.set(name, []);
            }
            variationMap.get(name).push({
              value,
              priceModifier: variation.fiyat || 0,
              stock: variation.stok || 0,
              sku: variation.stokKodu || '',
              barkod: variation.barkod || '',
              alisFiyati: variation.alisFiyati || 0,
              satisFiyati: variation.satisFiyati || 0,
              indirimliFiyat: variation.indirimliFiyat || 0,
              kdvDahil: variation.kdvDahil || false,
              kdvOrani: variation.kdvOrani || 0,
              paraBirimi: variation.paraBirimi || 'TL',
              paraBirimiKodu: variation.paraBirimiKodu || 'TRY',
              desi: variation.desi || 1,
              externalId: variation.varyasyonId
            });
          });
        }
      });

      // Her varyasyon türü için kayıt oluştur
      for (const [variationName, options] of variationMap) {
        // Varyasyon türünü kaydet
        const [variationResult] = await this.executeWithRetry(
          `INSERT INTO product_variations (tenantId, productId, name, displayOrder, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [tenantId, productId, variationName, 0, new Date()]
        );

        const variationId = variationResult.insertId;

        // Aynı değerli seçenekleri tekilleştir ve stokları birleştir
        const mergedByValue = new Map(); // key: normalized value -> merged option
        for (const rawOption of options) {
          const normalizedValue = (rawOption.value || '').toString().trim();
          if (!normalizedValue) continue;
          const key = normalizedValue.toLowerCase();
          const existing = mergedByValue.get(key);
          if (!existing) {
            mergedByValue.set(key, {
              ...rawOption,
              value: normalizedValue,
              stock: parseInt(rawOption.stock || 0) || 0,
              priceModifier: Number(rawOption.priceModifier || 0)
            });
          } else {
            existing.stock = (parseInt(existing.stock || 0) || 0) + (parseInt(rawOption.stock || 0) || 0);
            // Fiyat çakışmasında daha düşük olanı kullan
            const candidatePrice = Number(rawOption.priceModifier || 0);
            if (candidatePrice > 0 && (existing.priceModifier === 0 || candidatePrice < Number(existing.priceModifier))) {
              existing.priceModifier = candidatePrice;
            }
            // Boş alanları doldur (sku, barkod vb.)
            existing.sku = existing.sku || rawOption.sku || '';
            existing.barkod = existing.barkod || rawOption.barkod || null;
            existing.alisFiyati = existing.alisFiyati || rawOption.alisFiyati || 0;
            existing.satisFiyati = existing.satisFiyati || rawOption.satisFiyati || 0;
            existing.indirimliFiyat = existing.indirimliFiyat || rawOption.indirimliFiyat || 0;
            existing.kdvDahil = typeof existing.kdvDahil === 'boolean' ? existing.kdvDahil : (rawOption.kdvDahil || false);
            existing.kdvOrani = existing.kdvOrani || rawOption.kdvOrani || 0;
            existing.paraBirimi = existing.paraBirimi || rawOption.paraBirimi || 'TL';
            existing.paraBirimiKodu = existing.paraBirimiKodu || rawOption.paraBirimiKodu || 'TRY';
            existing.desi = existing.desi || rawOption.desi || 1;
            existing.externalId = existing.externalId || rawOption.externalId;
          }
        }

        const dedupedOptions = Array.from(mergedByValue.values());

        // Varyasyon seçeneklerini kaydet (tekilleştirilmiş) - upsert ile güvenli
        for (let i = 0; i < dedupedOptions.length; i++) {
          const option = dedupedOptions[i];
          await this.executeWithRetry(
            `INSERT INTO product_variation_options 
             (tenantId, variationId, value, priceModifier, stock, sku, barkod, alisFiyati, satisFiyati, 
              indirimliFiyat, kdvDahil, kdvOrani, paraBirimi, paraBirimiKodu, desi, externalId, 
              displayOrder, isActive, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               priceModifier = VALUES(priceModifier),
               stock = VALUES(stock),
               sku = VALUES(sku),
               barkod = VALUES(barkod),
               alisFiyati = VALUES(alisFiyati),
               satisFiyati = VALUES(satisFiyati),
               indirimliFiyat = VALUES(indirimliFiyat),
               kdvDahil = VALUES(kdvDahil),
               kdvOrani = VALUES(kdvOrani),
               paraBirimi = VALUES(paraBirimi),
               paraBirimiKodu = VALUES(paraBirimiKodu),
               desi = VALUES(desi),
               externalId = VALUES(externalId),
               displayOrder = VALUES(displayOrder),
               isActive = VALUES(isActive)`,
            [
              tenantId,
              variationId,
              option.value,
              option.priceModifier,
              option.stock,
              option.sku,
              option.barkod,
              option.alisFiyati,
              option.satisFiyati,
              option.indirimliFiyat,
              option.kdvDahil,
              option.kdvOrani,
              option.paraBirimi,
              option.paraBirimiKodu,
              option.desi,
              option.externalId,
              i,
              true,
              new Date()
            ]
          );
        }

        console.log(`✅ Saved ${dedupedOptions.length} options for variation: ${variationName}`);
      }

      console.log(`✅ Saved variations for product ID: ${productId}`);
    } catch (error) {
      console.error(`❌ Error saving product variations:`, error.message);
      throw error;
    }
  }

  // Kategorileri veritabanına kaydet
  async upsertCategories(categories, tenantId) {
    try {
      for (const category of categories) {
        // Mevcut kategoriyi kontrol et
        const [existing] = await this.executeWithRetry(
          'SELECT id FROM categories WHERE name = ? AND tenantId = ?',
          [category.name, tenantId]
        );

        if (existing.length > 0) {
          // Mevcut kategoriyi güncelle
          await this.executeWithRetry(
            `UPDATE categories SET 
             description = ?, 
             categoryTree = ?, 
             externalId = ?, 
             updatedAt = ? 
             WHERE id = ?`,
            [
              category.description,
              category.categoryTree,
              category.externalId,
              new Date(),
              existing[0].id
            ]
          );
          console.log(`🔄 Updated category: ${category.name}`);
        } else {
          // Yeni kategori ekle
          await this.executeWithRetry(
            `INSERT INTO categories (tenantId, name, description, categoryTree, externalId, source) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              tenantId,
              category.name,
              category.description,
              category.categoryTree,
              category.externalId,
              'XML'
            ]
          );
          console.log(`🆕 Added new category: ${category.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error upserting categories:`, error.message);
      throw error;
    }
  }

  // XML'den kategorileri çıkar
  extractCategoriesFromProducts(products) {
    const categoryMap = new Map();
    
    products.forEach(product => {
      const categoryName = product.category;
      const categoryTree = product.categoryTree || '';
      
      if (categoryName && !categoryMap.has(categoryName)) {
        // Kategori ağacını parse et
        const treeParts = categoryTree.split('/').filter(part => part.trim());
        const mainCategory = treeParts[0] || categoryName;
        const subCategories = treeParts.slice(1);
        
        categoryMap.set(categoryName, {
          name: categoryName,
          description: `${categoryName} kategorisi`,
          categoryTree: categoryTree,
          externalId: `cat_${categoryName.replace(/\s+/g, '_').toLowerCase()}`,
          mainCategory: mainCategory,
          subCategories: subCategories
        });
      }
    });
    
    return Array.from(categoryMap.values());
  }

  // Tüm XML kaynaklarından veri çek ve senkronize et
  async syncAllSources(tenantId = null) {
    if (this.isRunning) {
      console.log('⏳ Sync already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('\n🚀 Starting XML sync process...');
      
      // Stats'ı sıfırla
      this.syncStats = {
        totalProducts: 0,
        newProducts: 0,
        updatedProducts: 0,
        errors: 0,
        processedProducts: 0,
        currentProduct: null
      };
      this.message = 'Senkron başlatılıyor...';

      // Eğer tenantId belirtilmemişse, tüm aktif tenant'ları al
      let tenants = [];
      if (tenantId) {
        tenants = [{ id: tenantId }];
      } else {
        const [tenantRows] = await this.executeWithRetry('SELECT id, name FROM tenants WHERE isActive = true');
        tenants = tenantRows;
      }

      const sources = this.getXmlSources();
      
      for (const tenant of tenants) {
        console.log(`\n🏢 Processing tenant: ${tenant.name || `ID: ${tenant.id}`}`);
        
        for (const source of sources) {
          try {
            console.log(`\n📡 Processing source: ${source.name} for tenant ${tenant.id}`);
            
            // XML veriyi çek ve parse et
            const xmlData = await this.fetchAndParseXml(source);
            
            // Ürünlere dönüştür
            const products = this.parseXmlToProducts(xmlData, source);
            
            // Kategorileri çıkar ve kaydet
            console.log(`\n📂 Extracting categories from products...`);
            const categories = this.extractCategoriesFromProducts(products);
            await this.upsertCategories(categories, tenant.id);
            console.log(`✅ Processed ${categories.length} categories`);
            
            // Her ürünü veritabanına ekle/güncelle
            this.message = `Ürünler işleniyor... (${products.length} ürün)`;
            for (let i = 0; i < products.length; i++) {
              const product = products[i];
              this.syncStats.currentProduct = product.name;
              this.syncStats.processedProducts = i + 1;
              
              await this.upsertProduct(product, tenant.id);
              
              // Her 10 üründe bir progress güncelle
              if ((i + 1) % 10 === 0 || i === products.length - 1) {
                this.message = `${i + 1}/${products.length} ürün işlendi`;
              }
            }
            
            console.log(`✅ Completed processing ${source.name} for tenant ${tenant.id}`);
            
          } catch (sourceError) {
            const errorMsg = sourceError && sourceError.message ? sourceError.message : 'Unknown error';
            console.error(`❌ Error processing source ${source.name} for tenant ${tenant.id}:`, errorMsg);
            console.error('   Stack trace:', sourceError.stack || 'No stack trace available');
            this.syncStats.errors++;
            this.message = `Hata: ${source.name} - ${errorMsg}`;
          }
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();
      this.message = 'Senkron tamamlandı';
      this.syncStats.currentProduct = null;
      
      console.log(`\n🎉 XML sync completed in ${duration}ms`);
      console.log('📊 Sync Statistics:');
      console.log(`   Total Products: ${this.syncStats.totalProducts}`);
      console.log(`   New Products: ${this.syncStats.newProducts}`);
      console.log(`   Updated Products: ${this.syncStats.updatedProducts}`);
      console.log(`   Errors: ${this.syncStats.errors}`);
      console.log(`   Last Sync: ${this.lastSyncTime.toLocaleString()}\n`);

    } catch (error) {
      const errorMsg = error && error.message ? error.message : 'Unknown fatal error';
      console.error('❌ Fatal error during XML sync:', errorMsg);
      console.error('   Stack trace:', error.stack || 'No stack trace available');
      this.syncStats.errors++;
      this.message = `Kritik hata: ${errorMsg}`;
    } finally {
      this.isRunning = false;
    }
  }

  // Cron job başlat
  startScheduledSync() {
    console.log('⏰ Starting scheduled XML sync (every 7 hours)...');
    
    // Her 7 saatte bir çalıştır
    cron.schedule('0 */7 * * *', async () => {
      console.log(`\n🕐 Scheduled sync triggered at ${new Date().toLocaleString()}`);
      
      // Server load kontrolü
      const currentHour = new Date().getHours();
      if (currentHour >= 9 && currentHour <= 18) {
        console.log('⏳ Business hours detected, delaying sync by 30 minutes...');
        setTimeout(async () => {
          await this.syncAllSources();
        }, 30 * 60 * 1000); // 30 dakika gecikme
      } else {
        await this.syncAllSources();
      }
    });

    // İlk çalıştırma (2 dakika sonra)
    setTimeout(async () => {
      console.log('🚀 Initial sync starting in 2 minutes...');
      await this.syncAllSources();
    }, 2 * 60 * 1000); // 2 dakika
  }

  // Manuel sync tetikle
  async triggerManualSync() {
    console.log('👆 Manual sync triggered');
    await this.syncAllSources();
  }

  // Sync durumunu getir
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats,
      message: this.message
    };
  }

  // Test XML parsing with sample data
  async testXmlParsing() {
    try {
      console.log('🧪 Testing XML parsing with sample data...');
      
      const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Root>
<Urunler>
<Urun>
<UrunKartiID>17</UrunKartiID>
<UrunAdi>Gri Basic T-Shirt </UrunAdi>
<OnYazi>
<![CDATA[ Gri Basic T-Shirt ]]>
</OnYazi>
<Aciklama>
<![CDATA[ <p>&nbsp;</p> <p>&nbsp;</p> <p><span style="font-size:16px;"><strong>Huğlu Outdoor tişörtler esnek,hafif ve yüksek seviyede nefes alabilen kumaşları sayesinde terlemeyi minimum seviyeye indirir. Gün içinde üst düzey rahatlık ve nem kontrolü sağlar. Bisiklet yaka ve polo yaka stillerde birçok renk çeşiti bulunan Huğlu Outdoor tişörtler yaz aylarının vazgeçilmez ürünleridir.</strong></span></p> <span style="font-size:16px;"> <p>&nbsp;</p> <strong> <p>&nbsp;</p> <p>Cinsiyet: Unisex&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p> <p>Kullanım Alanı: Yürüyüş, Günlük kullanım</p> <p>Kumaş :%95 Pamuk %5 Elastan</p> <p>Malzeme Gramajı : 180 gr/m²</p> <p>Kumaş Özellikleri: Nefes Alabilen,Esnek,Solmaya Karşı dayanıklı,Işık Koruma</p> <p>Yaka Tipi : Bisiklet Yaka</p> <p>Kalıp:Slim Fit</p> <p>Ekstra: Esnek, solmayan ve nefes alabilen kumaş ile üretilmiştir.Bisiklet yakalıdır.Göğsünde kartal logo detayı vardır. Nefes alabilen ve esnek kumaş özelliği terlemeyi azaltır, hareket özgürlüğünüzü kısıtlamaz.Işık koruma özelliği sayesinde güneş ışınlarından dolayı solmaz.</p> <p>&nbsp;</p> <p>&nbsp;</p> <p>Detaylı bakım ve yıkama talimatları için lütfen ürün etiketini kontrol ediniz.</p> <p>&nbsp;</p> <p>&nbsp;</p> <p>&nbsp;</p> <p>Teslimat:</p> <p>Siparişleriniz 1-5 iş günü içerisinde hazırlanarak kargoya teslim edilmektedir.</p> <p>&nbsp;</p> <p>&nbsp;</p> <p>İade ve Değişim:</p> <p>İade işlemlerinizi, yeniden satılabilirlik özelliğini kaybetmemiş olan ürünleri siparişinizle birlikte gönderilen fatura iade formunu doldurarak 14 gün içerisinde iade edebilirsiniz.</p> </strong></span> <p>&nbsp;</p> <p>&nbsp;</p> <p><img alt="" src="https://static.ticimax.cloud/52071/uploads/editoruploads/basic-beden-tablosu.jpg" /></p> ]]>
</Aciklama>
<Marka>Huğlu Outdoor</Marka>
<SatisBirimi>ADET</SatisBirimi>
<KategoriID>39</KategoriID>
<Kategori>Sıfır Yaka T-Shirt</Kategori>
<KategoriTree>T-Shirt/Sıfır Yaka T-Shirt</KategoriTree>
<UrunUrl>https://www.hugluoutdoor.com/gri-basic-t-shirt-</UrunUrl>
<Resimler>
<Resim>https://static.ticimax.cloud/52071/Uploads/UrunResimleri/buyuk/basicgri1gri-basic-t-shirt-hugluoutdoo-6-1607.jpg</Resim>
<Resim>https://static.ticimax.cloud/52071/Uploads/UrunResimleri/buyuk/basicgri1gri-basic-t-shirt-hugluoutdoo-361-91.jpg</Resim>
<Resim>https://static.ticimax.cloud/52071/Uploads/UrunResimleri/buyuk/basicgri1gri-basic-t-shirt-hugluoutdoo--4517-.jpg</Resim>
</Resimler>
<UrunSecenek>
<Secenek>
<VaryasyonID>52</VaryasyonID>
<StokKodu>Basicgri1</StokKodu>
<Barkod>Basicgri1</Barkod>
<StokAdedi>3</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>600,00</SatisFiyati>
<IndirimliFiyat>600,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>10</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik>
<Ozellik Tanim="Beden" Deger="S">S</Ozellik>
</EkSecenekOzellik>
</Secenek>
<Secenek>
<VaryasyonID>53</VaryasyonID>
<StokKodu>Basicgri1</StokKodu>
<Barkod>Basicgri1</Barkod>
<StokAdedi>2</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>600,00</SatisFiyati>
<IndirimliFiyat>540,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>10</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik>
<Ozellik Tanim="Beden" Deger="M">M</Ozellik>
</EkSecenekOzellik>
</Secenek>
<Secenek>
<VaryasyonID>54</VaryasyonID>
<StokKodu>Basicgri1</StokKodu>
<Barkod>Basicgri1</Barkod>
<StokAdedi>2</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>600,00</SatisFiyati>
<IndirimliFiyat>540,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>10</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik>
<Ozellik Tanim="Beden" Deger="L">L</Ozellik>
</EkSecenekOzellik>
</Secenek>
<Secenek>
<VaryasyonID>55</VaryasyonID>
<StokKodu>Basicgri1</StokKodu>
<Barkod>Basicgri1</Barkod>
<StokAdedi>2</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>600,00</SatisFiyati>
<IndirimliFiyat>540,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>10</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik>
<Ozellik Tanim="Beden" Deger="XL">XL</Ozellik>
</EkSecenekOzellik>
</Secenek>
<Secenek>
<VaryasyonID>694</VaryasyonID>
<StokKodu>Basicgri1</StokKodu>
<Barkod>Basicgri1</Barkod>
<StokAdedi>3</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>600,00</SatisFiyati>
<IndirimliFiyat>540,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>10</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik>
<Ozellik Tanim="Beden" Deger="XS">XS</Ozellik>
</EkSecenekOzellik>
</Secenek>
<Secenek>
<VaryasyonID>695</VaryasyonID>
<StokKodu>Basicgri1</StokKodu>
<Barkod>Basicgri1</Barkod>
<StokAdedi>3</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>600,00</SatisFiyati>
<IndirimliFiyat>540,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>10</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik>
<Ozellik Tanim="Beden" Deger="XXL">XXL</Ozellik>
</EkSecenekOzellik>
</Secenek>
<Secenek>
<VaryasyonID>696</VaryasyonID>
<StokKodu>Basicgri1</StokKodu>
<Barkod>Basicgri1</Barkod>
<StokAdedi>3</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>600,00</SatisFiyati>
<IndirimliFiyat>540,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>10</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik>
<Ozellik Tanim="Beden" Deger="XXXL">XXXL</Ozellik>
</EkSecenekOzellik>
</Secenek>
</UrunSecenek>
<TeknikDetaylar/>
</Urun>
<Urun>
<UrunKartiID>232</UrunKartiID>
<UrunAdi>Edc Ekonomik model Ergonomik Hafif Özel Tasarım Bıçak</UrunAdi>
<OnYazi>
<![CDATA[ ]]>
</OnYazi>
<Aciklama>
<![CDATA[ <p data-end="134" data-start="56"><strong data-end="134" data-start="56">EDC Ekonomik Model Bıçak – Hafif, Ergonomik ve Paslanmaz Çelik Özel Üretim</strong></p> <p data-end="428" data-start="136">EDC (Everyday Carry) kategorisinde yer alan <strong data-end="204" data-start="180">Ekonomik Model Bıçak</strong>, günlük kullanım için özel olarak tasarlanmıştır. <strong data-end="274" data-start="255">Paslanmaz çelik</strong> gövdesi, yüksek dayanıklılık sunarken uzun ömürlü kullanım imkânı sağlar. <strong data-end="364" data-start="349">Özel üretim</strong> olan bu model, hem işlevselliği hem de şıklığı bir arada sunar.</p> <p data-end="668" data-start="430"><strong data-end="461" data-start="430">Hafif ve ergonomik tasarımı</strong>, elinizde mükemmel denge ve kavrama sağlar. Kamp, doğa yürüyüşleri, avcılık veya günlük taşıma için ideal bir seçimdir. Kompakt yapısıyla cebinizde, çantanızda ya da kemerinizde rahatlıkla taşıyabilirsiniz.</p> <p data-end="831" data-start="670">Bu <strong data-end="686" data-start="673">EDC bıçak</strong>, sağlam yapısı, modern tasarımı ve ekonomik fiyatıyla hem profesyonellerin hem de hobi amaçlı kullanıcıların beklentilerini fazlasıyla karşılar.</p> ]]>
</Aciklama>
<Marka>Huğlu Outdoor</Marka>
<SatisBirimi>ADET</SatisBirimi>
<KategoriID>64</KategoriID>
<Kategori>Bıçaklar ve Bıçak Aksesuarları</Kategori>
<KategoriTree>Kamp Ürünleri/Bıçaklar ve Bıçak Aksesuarları</KategoriTree>
<UrunUrl>https://www.hugluoutdoor.com/edc-ekonomik-model-ergonomik-hafif-ozel-tasarim-bicak</UrunUrl>
<Resimler>
<Resim>https://static.ticimax.cloud/52071/Uploads/UrunResimleri/buyuk/t.01.--422c-9946.jpg</Resim>
<Resim>https://static.ticimax.cloud/52071/Uploads/UrunResimleri/buyuk/t.01.-c79eaae253.jpg</Resim>
</Resimler>
<UrunSecenek>
<Secenek>
<VaryasyonID>1163</VaryasyonID>
<StokKodu>T.01.1842</StokKodu>
<Barkod/>
<StokAdedi>1</StokAdedi>
<AlisFiyati>0,00</AlisFiyati>
<SatisFiyati>2450,00</SatisFiyati>
<IndirimliFiyat>2250,00</IndirimliFiyat>
<KDVDahil>true</KDVDahil>
<KdvOrani>20</KdvOrani>
<ParaBirimi>TL</ParaBirimi>
<ParaBirimiKodu>TRY</ParaBirimiKodu>
<Desi>1</Desi>
<EkSecenekOzellik/>
</Secenek>
</UrunSecenek>
<TeknikDetaylar/>
</Urun>
</Urunler>
</Root>`;

      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false, // ✅ Attribute'leri koru (Tanim, Deger gibi)
        attrkey: '$', // Attribute'leri $ objesine koy
        charkey: '_', // Text içeriği _ property'sine koy
        trim: true
      });

      const result = await parser.parseStringPromise(sampleXml);
      console.log('✅ Sample XML parsed successfully');
      
      const source = this.getXmlSources()[0];
      const products = this.parseXmlToProducts(result, source);
      
      console.log(`📦 Parsed ${products.length} products from sample XML`);
      
      if (products.length > 0) {
        const product = products[0];
        console.log('🔍 Sample product details:');
        console.log(`   Name: ${product.name}`);
        console.log(`   Price: ${product.price}`);
        console.log(`   Stock: ${product.stock}`);
        console.log(`   Has Variations: ${product.hasVariations}`);
        console.log(`   Variations Count: ${product.variations}`);
        console.log(`   Images Count: ${product.totalImages}`);
        
        if (product.variationDetails) {
          const details = JSON.parse(product.variationDetails);
          console.log(`   Variation Details: ${details.length} variations`);
          details.forEach((variation, index) => {
            console.log(`     Variation ${index + 1}:`);
            console.log(`       Attributes: ${JSON.stringify(variation.attributes)}`);
            console.log(`       Stock: ${variation.stok}`);
            console.log(`       Price: ${variation.fiyat}`);
            console.log(`       SKU: ${variation.stokKodu}`);
            console.log(`       Barcode: ${variation.barkod}`);
            console.log(`       KDV Dahil: ${variation.kdvDahil}`);
            console.log(`       KDV Oranı: ${variation.kdvOrani}%`);
          });
        }
      }
      
      return products;
    } catch (error) {
      console.error('❌ Error testing XML parsing:', error.message);
      throw error;
    }
  }
}

module.exports = XmlSyncService;
