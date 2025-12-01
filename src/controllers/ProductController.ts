import { ProductModel, FilterOptions } from '../models/Product';
import { Product, ProductVariationOption, ProductVariation } from '../utils/types';
import { XmlProductService, XmlProduct } from '../services/XmlProductService';
import { apiService } from '../utils/api-service';
import { CacheService, CacheTTL } from '../services/CacheService';
import { detailedActivityLogger } from '../services/DetailedActivityLogger';

export class ProductController {
  // Enhanced product fetching with pagination and better offline support
  static async getAllProducts(page: number = 1, limit: number = 50): Promise<{ products: Product[], total: number, hasMore: boolean }> {
    try {
      // Cache key - her sayfa için ayrı cache
      const cacheKey = `cache:products:page:${page}:limit:${limit}`;
      const totalCacheKey = 'cache:products:total';
      
      // Tüm sayfalar için cache kontrolü
      const [cachedProducts, cachedTotal] = await Promise.all([
        CacheService.get<Product[]>(cacheKey),
        CacheService.get<number>(totalCacheKey)
      ]);
      
      if (cachedProducts && cachedProducts.length > 0) {
        // Cache'den döndür
        return {
          products: cachedProducts,
          total: cachedTotal || cachedProducts.length,
          hasMore: cachedTotal ? (page * limit < cachedTotal) : false
        };
      }

      // Try API with pagination
      const response = await apiService.getProducts(page, limit);
      if (response.success && response.data && Array.isArray(response.data.products)) {
        const products = response.data.products.map((apiProduct: any) => this.mapApiProductToAppProduct(apiProduct));
        const total = response.data.total || 0;
        
        // Tüm sayfalar için cache'le (daha uzun TTL)
        Promise.all([
          CacheService.set(cacheKey, products, CacheTTL.LONG).catch(() => {}),
          total > 0 ? CacheService.set(totalCacheKey, total, CacheTTL.XLONG).catch(() => {}) : Promise.resolve()
        ]).catch(() => {});
        
        return {
          products,
          total,
          hasMore: response.data.hasMore || false
        };
      }
      
      // Fallback to XML service (only for first page)
      if (page === 1) {
        const xmlProducts = await XmlProductService.fetchProducts();
        const products = xmlProducts.map(xmlProduct => 
          XmlProductService.convertXmlProductToAppProduct(xmlProduct)
        );
        
        // XML'den gelen tüm ürünleri cache'le
        const paginatedProducts = products.slice(0, limit);
        Promise.all([
          CacheService.set(cacheKey, paginatedProducts, CacheTTL.SHORT).catch(() => {}),
          CacheService.set('cache:products:all', products, CacheTTL.SHORT).catch(() => {}),
          CacheService.set(totalCacheKey, products.length, CacheTTL.SHORT).catch(() => {})
        ]).catch(() => {});
        
        return {
          products: paginatedProducts,
          total: products.length,
          hasMore: products.length > limit
        };
      }
      
      return { products: [], total: 0, hasMore: false };
    } catch (error) {
      console.error('❌ ProductController - getAllProducts error:', error);
      return { products: [], total: 0, hasMore: false };
    }
  }

  // Batch cache'leme - birden fazla sayfayı aynı anda cache'le
  static async cacheBatchPages(startPage: number, endPage: number, limit: number = 20): Promise<void> {
    try {
      const pagesToCache = [];
      for (let page = startPage; page <= endPage; page++) {
        pagesToCache.push(
          this.getAllProducts(page, limit).then(result => {
            // Cache zaten getAllProducts içinde yapılıyor, burada sadece prefetch yapıyoruz
            return result;
          }).catch(error => {
            console.error(`Error caching page ${page}:`, error);
            return null;
          })
        );
      }
      
      // Tüm sayfaları paralel yükle ve cache'le
      await Promise.allSettled(pagesToCache);
      console.log(`✅ Batch cached pages ${startPage}-${endPage}`);
    } catch (error) {
      console.error('❌ Batch cache error:', error);
    }
  }

  // Legacy method for backward compatibility
  static async getAllProductsLegacy(): Promise<Product[]> {
    const result = await this.getAllProducts(1, 1000);
    return result.products;
  }

  static async getProductById(id: number): Promise<Product | null> {
    try {
      console.log(`🔍 [ProductController] getProductById called for ID: ${id}`);
      
      // ✅ OPTIMIZASYON: Ürün ve varyasyonları paralel çek
      const [productResponse, variationsResponse] = await Promise.allSettled([
        apiService.getProductById(id),
        // Varyasyonları da paralel çek - API'den gelecek
        apiService.getProductVariations(id)
      ]);
      
      // Log API response
      if (productResponse.status === 'fulfilled') {
        console.log(`🔍 [ProductController] Product API response for ID ${id}:`, {
          success: productResponse.value.success,
          hasData: !!productResponse.value.data,
          message: productResponse.value.message,
          error: productResponse.value.error
        });
      } else {
        console.error(`❌ [ProductController] Product API promise rejected for ID ${id}:`, productResponse.reason);
      }
      
      // Try API first
      if (productResponse.status === 'fulfilled' && productResponse.value.success && productResponse.value.data) {
        let product = this.mapApiProductToAppProduct(productResponse.value.data);
        
        // Varyasyonları başlangıçta boş array olarak set et
        product.variations = [];
        
        // Varyasyonları paralel çekilen response'tan al
        if (variationsResponse.status === 'fulfilled' && variationsResponse.value.success && variationsResponse.value.data) {
          // API response zaten normalizeVariationsResponse ile normalize edilmiş olmalı
          // Ama yine de kontrol edelim
          let variations: any[] = [];
          
          if (Array.isArray(variationsResponse.value.data)) {
            variations = variationsResponse.value.data;
          } else if (variationsResponse.value.data && typeof variationsResponse.value.data === 'object') {
            // Eğer object ise variations property'sini kontrol et
            if (Array.isArray(variationsResponse.value.data.variations)) {
              variations = variationsResponse.value.data.variations;
            }
          }
          
          // Varyasyonları her zaman set et (boş bile olsa)
          product.variations = variations as any;
          
          if (variations.length > 0) {
            product.hasVariations = true;
            console.log(`✅ Product ${id}: ${variations.length} varyasyon yüklendi`, variations.map(v => ({ name: v.name, options: v.options?.length || 0 })));
          } else {
            product.hasVariations = false;
            console.log(`⚠️ Product ${id}: Varyasyon yok veya boş`);
          }
        } else {
          // Varyasyonlar yüklenemedi, detaylı hata loglama
          if (variationsResponse.status === 'rejected') {
            console.error(`❌ Product ${id}: Variations API promise rejected:`, variationsResponse.reason);
            console.error(`❌ Product ${id}: Error details:`, {
              message: variationsResponse.reason?.message,
              stack: variationsResponse.reason?.stack?.substring(0, 500),
              error: String(variationsResponse.reason)
            });
          } else if (variationsResponse.status === 'fulfilled') {
            // Promise başarılı ama response.success false veya data yok
            console.error(`❌ Product ${id}: Variations API response failed:`, {
              success: variationsResponse.value.success,
              hasData: !!variationsResponse.value.data,
              dataType: typeof variationsResponse.value.data,
              message: variationsResponse.value.message,
              error: variationsResponse.value.error
            });
          }
          
          // Varyasyonlar yüklenemedi, boş array olarak set et
          product.variations = [];
          product.hasVariations = false;
          console.log(`⚠️ Product ${id}: Varyasyon yüklenemedi, boş array set edildi`);
        }
        
        // ✅ XML Enrichment KALDIRILDI - Performans sorunu yaratıyordu (tüm ürünleri çekiyordu)
        // Varyasyonlar artık API'den geliyor, XML'e gerek yok
        
        // Detaylı ürün görüntüleme logu - async (non-blocking)
        detailedActivityLogger.logProductDetailViewed({
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          productCategory: product.category || 'Bilinmeyen',
          productBrand: product.brand || 'Bilinmeyen',
          productImage: product.images?.[0] || '',
          variations: product.variations ? this.extractVariationsFromProduct(product.variations) : undefined,
          variationString: product.variationString,
          discountAmount: product.discountAmount,
          originalPrice: product.originalPrice,
          finalPrice: product.finalPrice || product.price
        });
        
        return product;
      }
      
      // ✅ OPTIMIZASYON: XML fallback'i de kaldır veya sadece tek ürünü çek (çok yavaş)
      // XML fallback artık kullanılmıyor - API başarısız olursa null döndür
      // Eğer XML gerekirse, XmlProductService'e tek ürün çekme metodu eklenebilir
      
      console.log(`❌ [ProductController] Product not found for ID ${id} - API response was not successful`);
      return null;
    } catch (error) {
      console.error(`❌ [ProductController] getProductById error for ID ${id}:`, error);
      console.error(`❌ [ProductController] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
      });
      
      return null;
    }
  }

  static async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      
      // Try API first
      const response = await apiService.getProductsByCategory(category);
      if (response.success && response.data) {
        const rawList = Array.isArray((response as any).data)
          ? (response as any).data
          : ((response as any).data?.products || []);
        const products = (rawList as any[]).map((apiProduct: any) => this.mapApiProductToAppProduct(apiProduct));
        
        return products;
      }
      
      // Fallback to XML service
      const xmlProducts = await XmlProductService.fetchProductsByCategory(category);
      const products = xmlProducts.map(xmlProduct => 
        XmlProductService.convertXmlProductToAppProduct(xmlProduct)
      );
      
      return products;
    } catch (error) {
      console.error(`❌ ProductController - getProductsByCategory error for category ${category}:`, error);
      
      // Return empty array as fallback
      return [];
    }
  }

  static async searchProducts(query: string): Promise<Product[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }
      
      const trimmedQuery = query.trim().toLowerCase();
      const cacheKey = `cache:search:${trimmedQuery}`;
      
      // Cache kontrolü (1-2 dakika TTL)
      const cachedResults = await CacheService.get<Product[]>(cacheKey);
      if (cachedResults !== null && Array.isArray(cachedResults)) {
        // console.log(`✅ Cache hit for search query: "${trimmedQuery}"`);
        return cachedResults;
      }
      
      // console.log(`🔍 Searching products with query: "${trimmedQuery}"`);
      
      // Try API first
      const response = await apiService.searchProducts(trimmedQuery);
      if (response.success && response.data) {
        // console.log(`✅ API returned ${response.data.length} search results for: "${trimmedQuery}"`);
        const products = response.data.map((apiProduct: any) => this.mapApiProductToAppProduct(apiProduct));
        
        // Ek: Eğer sonuç yoksa ve sorgu stok kodu/sku'ya benziyorsa, local filtre uygula
        if (products.length === 0) {
          const looksLikeSku = /[a-z0-9\-_/]{3,}/i.test(trimmedQuery);
          if (looksLikeSku) {
            const allResult = await this.getAllProducts();
            const all = allResult.products;
            const q = trimmedQuery.toLowerCase();
            const skuFiltered = all.filter(p => {
              const inExternalId = p.externalId?.toLowerCase().includes(q);
              const inVariationsSku = Array.isArray(p.variations)
                ? p.variations.some(v => Array.isArray(v.options) && v.options.some(opt => (opt.sku || '').toLowerCase().includes(q)))
                : false;
              return inExternalId || inVariationsSku;
            });
            // SKU sonuçlarını cache'le
            CacheService.set(cacheKey, skuFiltered, CacheTTL.SHORT).catch(() => {});
            return skuFiltered;
          }
        }
        
        // API sonuçlarını cache'le (1-2 dakika)
        CacheService.set(cacheKey, products, CacheTTL.SHORT).catch(() => {});
        return products;
      }
      
      // Fallback to XML service
      // console.log('🔄 API fallback to XML service for search');
      const xmlProducts = await XmlProductService.searchProducts(trimmedQuery);
      const products = xmlProducts.map(xmlProduct => 
        XmlProductService.convertXmlProductToAppProduct(xmlProduct)
      );
      // XML sonucunda da stok kodu eşleşmesi ek filtre
      if (products.length === 0) {
        const allResult = await this.getAllProducts();
        const all = allResult.products;
        const q = trimmedQuery.toLowerCase();
        const skuFiltered = all.filter(p => {
          const inExternalId = p.externalId?.toLowerCase().includes(q);
          const inVariationsSku = Array.isArray(p.variations)
            ? p.variations.some(v => Array.isArray(v.options) && v.options.some(opt => (opt.sku || '').toLowerCase().includes(q)))
            : false;
          return inExternalId || inVariationsSku;
        });
        // SKU sonuçlarını cache'le
        CacheService.set(cacheKey, skuFiltered, CacheTTL.SHORT).catch(() => {});
        return skuFiltered;
      }
      
      // XML sonuçlarını cache'le
      CacheService.set(cacheKey, products, CacheTTL.SHORT).catch(() => {});
      return products;
    } catch (error) {
      console.error(`❌ ProductController - searchProducts error for query "${query}":`, error);
      
      // Return empty array as fallback
      return [];
    }
  }

  static async filterProducts(filters: FilterOptions): Promise<Product[]> {
    try {
      // console.log('🔍 Filtering products with filters:', filters);
      
      // Try API first
      const response = await apiService.filterProducts(filters);
      if (response.success && Array.isArray(response.data)) {
        // console.log(`✅ API returned ${response.data.length} filtered products`);
        const products = response.data.map((apiProduct: any) => this.mapApiProductToAppProduct(apiProduct));
        return products;
      }
      
      // Fallback: get all products and filter locally
      // console.log('🔄 API fallback to local filtering');
      const allProductsResult = await this.getAllProducts();
      const allProducts = allProductsResult.products;
      
      let filteredProducts = allProducts;
      
      // Apply filters locally
      if (filters.category) {
        filteredProducts = filteredProducts.filter(p => p.category === filters.category);
      }
      
      if (filters.minPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.price >= filters.minPrice!);
      }
      
      if (filters.maxPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.price <= filters.maxPrice!);
      }
      
      if (filters.brands && filters.brands.length > 0) {
        filteredProducts = filteredProducts.filter(p => p.brand && filters.brands!.includes(p.brand));
      }
      
      if (filters.minRating !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.rating >= filters.minRating!);
      }
      
      if (filters.inStock) {
        filteredProducts = filteredProducts.filter(p => p.stock > 0);
      }
      
      // Apply sorting
      if (filters.sortBy) {
        filteredProducts = this.sortProducts(filteredProducts, filters.sortBy);
      }
      
      // console.log(`✅ Local filtering returned ${filteredProducts.length} products`);
      return filteredProducts;
    } catch (error) {
      console.error('❌ ProductController - filterProducts error:', error);
      return [];
    }
  }

  // Veritabanından ürün varyasyonlarını çek
  static async getProductVariationsFromDB(productId: number): Promise<ProductVariation[]> {
    try {
      const response = await apiService.getProductVariations(productId);
      if (response.success && response.data) {
        // API response format: { success: true, data: { variations: [...], sizeStocks: {} } }
        // veya direkt variations array
        const variations = Array.isArray(response.data) 
          ? response.data 
          : (response.data.variations || []);
        return variations as ProductVariation[];
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting product variations from DB:', error);
      return [];
    }
  }

  static async getAllCategories(): Promise<string[]> {
    try {
      // console.log('🔄 Fetching categories...');
      
      // Try cache first
      const cached = await CacheService.get<string[]>('cache:categories:all');
      if (cached && cached.length) {
        // console.log(`🧠 Cache hit: ${cached.length} categories`);
        return cached;
      }

      // Try API
      const response = await apiService.getCategories();
      if (response.success && Array.isArray(response.data)) {
        // console.log(`✅ API returned ${response.data.length} categories`);
        CacheService.set('cache:categories:all', response.data, CacheTTL.LONG).catch(() => {});
        return response.data;
      }
      
      // Fallback: get unique categories from all products
      // console.log('🔄 API fallback to local category extraction');
      const allProductsResult = await this.getAllProducts();
      const allProducts = allProductsResult.products;
      const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))] as string[];
      
      // console.log(`✅ Found ${categories.length} unique categories`);
      const sorted = categories.sort();
      CacheService.set('cache:categories:all', sorted, CacheTTL.MEDIUM).catch(() => {});
      return sorted;
    } catch (error) {
      console.error('❌ ProductController - getAllCategories error:', error);
      return [];
    }
  }


  static async getCategories(): Promise<string[]> {
    try {
      // console.log('🔄 Fetching categories...');
      
      // Try API first
      const response = await apiService.getCategories();
      if (response.success && Array.isArray(response.data)) {
        // console.log(`✅ API returned ${response.data.length} categories`);
        return response.data;
      }
      
      // Fallback to XML service
      // console.log('🔄 API fallback to XML service for categories');
      const categoryTrees = await XmlProductService.fetchCategories();
      const categories = Array.isArray(categoryTrees)
        ? categoryTrees.map(cat => cat.mainCategory)
        : [];
      return categories;
    } catch (error) {
      console.error('❌ ProductController - getCategories error:', error);
      
      // Return empty array as fallback
      return [];
    }
  }

  static async getCategoryTree(): Promise<{ mainCategory: string; subCategories: string[] }[]> {
    try {
      // console.log('🔄 Fetching category tree...');
      
      // Try API first
      const response = await apiService.getCategories();
      if (response.success && response.data) {
        // console.log(`✅ API returned ${response.data.length} categories for tree`);
        
        // Convert flat categories to tree structure
        const categoryMap = new Map<string, Set<string>>();
        
        // This is a simplified tree structure - you might want to enhance this
        // based on your actual category hierarchy
        response.data.forEach(category => {
          const parts = category.split('/');
          const mainCategory = parts[0] || category;
          const subCategory = parts[1] || '';
          
          if (!categoryMap.has(mainCategory)) {
            categoryMap.set(mainCategory, new Set());
          }
          
          if (subCategory) {
            categoryMap.get(mainCategory)!.add(subCategory);
          }
        });
        
        const tree = Array.from(categoryMap.entries()).map(([main, subs]) => ({
          mainCategory: main,
          subCategories: Array.from(subs)
        }));
        
        return tree;
      }
      
      // Fallback to XML service
      // console.log('🔄 API fallback to XML service for category tree');
      return await XmlProductService.fetchCategories();
    } catch (error) {
      console.error('❌ ProductController - getCategoryTree error:', error);
      
      // Return empty array as fallback
      return [];
    }
  }

  static async getSubCategories(mainCategory: string): Promise<string[]> {
    try {
      const categoryTrees = await this.getCategoryTree();
      const category = categoryTrees.find(cat => cat.mainCategory === mainCategory);
      return category?.subCategories || [];
    } catch (error) {
      console.error(`❌ ProductController - getSubCategories error for category ${mainCategory}:`, error);
      return [];
    }
  }

  static async getBrands(): Promise<string[]> {
    try {
      // console.log('🔄 Fetching brands...');
      
      // Try API first
      const response = await apiService.getBrands();
      if (response.success && response.data) {
        // console.log(`✅ API returned ${response.data.length} brands`);
        
        return response.data;
      }
      
      // Fallback: extract brands from cached products
      // console.log('🔄 API fallback to extracting brands from cached products');
      const allProductsResult = await this.getAllProducts();
      const allProducts = allProductsResult.products;
      const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))] as string[];
      
      return brands;
    } catch (error) {
      console.error('❌ ProductController - getBrands error:', error);
      
      // Return empty array as fallback
      return [];
    }
  }

  static async getPriceRange(): Promise<{ min: number; max: number }> {
    try {
      // console.log('🔄 Fetching price range...');
      
      // Try API first
      const response = await apiService.getPriceRange();
      if (response.success && response.data) {
        // console.log(`✅ API returned price range: ${response.data.min} - ${response.data.max}`);
        
        return response.data;
      }
      
      // Fallback: calculate from cached products
      // console.log('🔄 API fallback to calculating price range from cached products');
      const allProductsResult = await this.getAllProducts();
      const allProducts = allProductsResult.products;
      
      if (allProducts.length === 0) {
        return { min: 0, max: 0 };
      }
      
      const prices = allProducts.map(p => p.price).filter(p => p > 0);
      const priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
      
      // console.log(`✅ Calculated price range: ${priceRange.min} - ${priceRange.max}`);
      
      return priceRange;
    } catch (error) {
      console.error('❌ ProductController - getPriceRange error:', error);
      
      // Return default price range as fallback
      return { min: 0, max: 0 };
    }
  }

  static async checkStock(
    productId: number, 
    quantity: number, 
    selectedVariations?: { [key: string]: ProductVariationOption }
  ): Promise<boolean> {
    try {
      const product = await this.getProductById(productId);
      if (!product) return false;

      if (selectedVariations && Object.keys(selectedVariations).length > 0) {
        // Check stock for specific variations
        const optionIds = Object.values(selectedVariations).map(option => option.id);
        const minStock = Math.min(...Object.values(selectedVariations).map(option => Number(option.stock || 0)));
        return minStock >= quantity;
      } else {
        // Check base product stock
        return product.stock >= quantity;
      }
    } catch (error) {
      console.error(`❌ ProductController - checkStock error for product ${productId}:`, error);
      return false;
    }
  }

  static async getPopularProducts(): Promise<Product[]> {
    try {
      // console.log('🔄 Fetching popular products...');
      
      const productsResult = await this.getAllProducts();
      const products = productsResult.products;
      // Popüler ürünleri rating'e göre sırala ve ilk 6 tanesini al
      const popularProducts = products
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6);
      
      // console.log(`✅ Found ${popularProducts.length} popular products`);
      return popularProducts;
    } catch (error) {
      console.error('❌ ProductController - getPopularProducts error:', error);
      return [];
    }
  }

  static async getNewProducts(): Promise<Product[]> {
    try {
      // console.log('🔄 Fetching new products...');
      
      const productsResult = await this.getAllProducts();
      const products = productsResult.products;
      // En yeni ürünleri lastUpdated'a göre sırala
      const newProducts = products
        .sort((a, b) => {
          const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 6);
      
      // console.log(`✅ Found ${newProducts.length} new products`);
      return newProducts;
    } catch (error) {
      console.error('❌ ProductController - getNewProducts error:', error);
      return [];
    }
  }

  // Helper method for sorting products
  private static sortProducts(products: Product[], sortBy: string): Product[] {
    switch (sortBy) {
      case 'price_asc':
        return [...products].sort((a, b) => a.price - b.price);
      case 'price_desc':
        return [...products].sort((a, b) => b.price - a.price);
      case 'rating_desc':
        return [...products].sort((a, b) => b.rating - a.rating);
      case 'name_asc':
        return [...products].sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return [...products].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return products;
    }
  }

  static formatPrice(price: number): string {
    const safe = Number(price);
    const value = Number.isFinite(safe) ? safe : 0;
    return `₺${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }

  // Enhanced API product mapping with better error handling
  private static mapApiProductToAppProduct(apiProduct: any): Product {
    try {
      // Check if product has variations from API
      const hasVariations = apiProduct.hasVariations === true || 
                           (apiProduct.variations && Array.isArray(apiProduct.variations) && apiProduct.variations.length > 0);
      // Normalize images (handle JSON string)
      let normalizedImages: string[] = [];
      try {
        if (Array.isArray(apiProduct.images)) normalizedImages = apiProduct.images as string[];
        else if (typeof apiProduct.images === 'string') normalizedImages = JSON.parse(apiProduct.images);
      } catch { normalizedImages = []; }

      const mapped: Product = {
        id: parseInt(apiProduct.id) || 0,
        name: apiProduct.name || 'Unknown Product',
        description: apiProduct.description || '',
        price: parseFloat(apiProduct.price) || 0,
        category: apiProduct.category || '',
        image: apiProduct.image || 'https://via.placeholder.com/300x300?text=No+Image',
        images: normalizedImages || [],
        stock: parseInt(apiProduct.stock) || 0,
        brand: apiProduct.brand || '',
        rating: parseFloat(apiProduct.rating) || 0,
        reviewCount: parseInt(apiProduct.reviewCount) || 0,
        // Only include variations if they exist and have multiple options
        variations: hasVariations ? (apiProduct.variations || []) : [],
        hasVariations: hasVariations,
        lastUpdated: apiProduct.lastUpdated || new Date().toISOString(),
        externalId: apiProduct.externalId || apiProduct.id?.toString(),
        source: apiProduct.source || 'API'
      };

      // If no variations provided but xmlOptions exist in single-table schema, derive variations
      if ((!mapped.hasVariations || !Array.isArray(mapped.variations) || mapped.variations.length === 0) && apiProduct.xmlOptions) {
        try {
          const parsed = typeof apiProduct.xmlOptions === 'string' ? JSON.parse(apiProduct.xmlOptions) : apiProduct.xmlOptions;
          const opts: any[] = Array.isArray(parsed?.options) ? parsed.options : [];
          if (opts.length > 0) {
            const attrNameToValues: Map<string, { value: string; stock?: number; priceModifier?: number }[]> = new Map();
            for (const o of opts) {
              const attributes = o?.attributes || null;
              const stock = typeof o?.stok === 'number' ? o.stok : (typeof o?.stock === 'number' ? o.stock : undefined);
              const price = typeof o?.fiyat === 'number' ? o.fiyat : (typeof o?.price === 'number' ? o.price : undefined);
              if (attributes && typeof attributes === 'object') {
                for (const key of Object.keys(attributes)) {
                  const val = String(attributes[key] ?? '').trim();
                  if (!val) continue;
                  if (!attrNameToValues.has(key)) attrNameToValues.set(key, []);
                  attrNameToValues.get(key)!.push({ value: val, stock, priceModifier: price });
                }
              }
            }
            // Build ProductVariation[]
            const derived: any[] = [];
            let displayOrder = 0;
            for (const [name, values] of attrNameToValues.entries()) {
              const merged = new Map<string, { value: string; stock?: number; priceModifier?: number }>();
              values.forEach(v => {
                if (!merged.has(v.value)) merged.set(v.value, { ...v });
                else {
                  const m = merged.get(v.value)!;
                  m.stock = (m.stock || 0) + (v.stock || 0);
                  if (typeof v.priceModifier === 'number') m.priceModifier = typeof m.priceModifier === 'number' ? Math.min(m.priceModifier, v.priceModifier) : v.priceModifier;
                }
              });
              derived.push({
                id: `${mapped.id}-${name}`,
                productId: mapped.id,
                name,
                displayOrder: displayOrder++,
                options: Array.from(merged.values()).map(m => ({
                  id: `${mapped.id}-${name}-${m.value}`,
                  variationId: `${mapped.id}-${name}`,
                  value: m.value,
                  priceModifier: typeof m.priceModifier === 'number' ? m.priceModifier : 0,
                  stock: typeof m.stock === 'number' ? m.stock : 0,
                }))
              });
            }
            if (derived.length > 0) {
              mapped.variations = derived as any;
              mapped.hasVariations = true;
            }
          }
        } catch {}
      }

      return mapped;
    } catch (error) {
      console.error('❌ Error mapping API product:', error, apiProduct);
      // Return a safe fallback product
      return {
        id: 0,
        name: 'Error Loading Product',
        description: 'This product could not be loaded properly',
        price: 0,
        category: 'Unknown',
        image: 'https://via.placeholder.com/300x300?text=Error',
        images: [],
        stock: 0,
        brand: 'Unknown',
        rating: 0,
        reviewCount: 0,
        variations: [],
        hasVariations: false,
        lastUpdated: new Date().toISOString(),
        externalId: 'error',
        source: 'Error'
      };
    }
  }

  // Helper function to extract variations from product variations
  private static extractVariations(variations: ProductVariationOption[]): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    
    if (!variations || !Array.isArray(variations)) {
      return result;
    }

    variations.forEach(variation => {
      // ProductVariationOption doesn't have 'name'; this utility is legacy and unused in new flow
    });

    return result;
  }

  // Helper function to extract variations from ProductVariation[]
  private static extractVariationsFromProduct(variations: any[]): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    
    if (!variations || !Array.isArray(variations)) {
      return result;
    }

    variations.forEach(variation => {
      // New structure: each variation has name and options[]; summary not required
    });

    return result;
  }
}