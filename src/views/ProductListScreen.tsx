import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernProductCard } from '../components/ModernProductCard';
import { ModernButton } from '../components/ui/ModernButton';
import { Product } from '../utils/types';
import { ProductController } from '../controllers/ProductController';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { FilterModal } from '../components/FilterModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchBar } from '../components/SearchBar';
import { CampaignController, Campaign } from '../controllers/CampaignController';
import { ProductListHeader } from '../components/ProductListHeader';
import { CategoriesSection } from '../components/CategoriesSection';
import { ProductListControls } from '../components/ProductListControls';
import { FlashDealsHeader } from '../components/FlashDealsHeader';
import FlashDealService, { FlashDeal } from '../services/FlashDealService';
import { Chatbot } from '../components/Chatbot';
import { CacheService } from '../services/CacheService';

interface ProductListScreenProps {
  navigation: any;
  route: any;
}

const { width } = Dimensions.get('window');

export const ProductListScreen: React.FC<ProductListScreenProps> = ({ navigation, route }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [cachedUserId, setCachedUserId] = useState<number | null>(null);

  // Behavior tracking removed

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // ✅ OPTIMIZASYON: User ID'yi cache'le
        const userId = await UserController.getCurrentUserId();
        if (mounted) {
          setCachedUserId(userId);
          setIsAuthenticated(userId > 0);
        }
      } catch {}
    })();
    return () => { mounted = false };
  }, []);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(route.params?.category || null);
  const [categories, setCategories] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating' | 'name'>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 10000,
    brands: [] as string[],
    inStock: false,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const nowIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showFlashDeals, setShowFlashDeals] = useState(route.params?.showFlashDeals || false);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [showHeaderSection, setShowHeaderSection] = useState(true);
  // Pagination state
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const ITEMS_PER_PAGE = 50; // Sayfa başına 50 ürün

  const searchInputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);
  
  // ✅ OPTIMIZASYON: Memory cache for products (component-level)
  const memoryCacheRef = useRef<Map<string, { products: Product[], total: number, hasMore: boolean, timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // ✅ İYİLEŞTİRME: Infinite scroll için debouncing ve race condition önleme
  const loadingMoreRef = useRef<boolean>(false);
  const onEndReachedCalledDuringMomentum = useRef<boolean>(false);

  // ✅ OPTIMIZASYON: Generate cache key with all relevant parameters
  const getCacheKey = useCallback((page: number, category: string | null, filtersHash: string, sortBy: string) => {
    return `products:page:${page}:category:${category || 'all'}:filters:${filtersHash}:sort:${sortBy}`;
  }, []);

  // ✅ OPTIMIZASYON: Hash filters for cache key
  const getFiltersHash = useCallback(() => {
    const filterStr = JSON.stringify({
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      brands: filters.brands.sort().join(','),
      inStock: filters.inStock
    });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < filterStr.length; i++) {
      const char = filterStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }, [filters]);

  // ✅ OPTIMIZASYON: Infinite scroll için append-based yükleme + Memory cache
  const loadData = useCallback(async (page: number = 1, append: boolean = false, forceRefresh: boolean = false) => {
    try {
      const effectiveCategory = selectedCategory && selectedCategory !== 'Tümü' ? selectedCategory : null;
      const filtersHash = getFiltersHash();
      const cacheKey = getCacheKey(page, effectiveCategory, filtersHash, sortBy);
      
      // ✅ OPTIMIZASYON: Check memory cache first (only if no search/filters and not forcing refresh)
      // ✅ DÜZELTME: sortBy kontrolü kaldırıldı - sıralama değişse bile cache kullanılsın
      if (!forceRefresh && !searchQuery && filters.minPrice === 0 && filters.maxPrice === 10000 && filters.brands.length === 0 && !filters.inStock) {
        const cached = memoryCacheRef.current.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
          // Cache hit - return immediately
          if (page === 1) {
            setProducts(cached.products);
            setFilteredProducts(cached.products);
          } else if (append) {
            setProducts(prev => [...prev, ...cached.products]);
            setFilteredProducts(prev => [...prev, ...cached.products]);
          }
          setTotalProducts(cached.total);
          // ✅ İYİLEŞTİRME: Cache'den gelen hasMore'u da kontrol et
          const cachedHasMore = cached.hasMore && (page * ITEMS_PER_PAGE < cached.total);
          setHasMore(cachedHasMore);
          setCurrentPageNum(page);
          setLoading(false);
          setLoadingMore(false);
          loadingMoreRef.current = false;
          
          // ✅ OPTIMIZASYON: Stale-while-revalidate - refresh in background
          if (page === 1) {
            loadData(page, false, true).catch(() => {});
          }
          return;
        }
      }
      
      // ✅ İYİLEŞTİRME: Loading state'lerini daha güvenilir yönet
      if (page === 1) {
        setLoading(true);
        loadingMoreRef.current = false;
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }
      
      // Kategorileri sadece ilk yüklemede veya kategori listesi boşsa çek
      const categoriesPromise = (page === 1 && categories.length === 0) 
        ? ProductController.getAllCategories()
        : Promise.resolve(categories);
      
      const [productsResult, allCategories] = await Promise.all([
        effectiveCategory 
          ? ProductController.getProductsByCategory(effectiveCategory)
          : ProductController.getAllProducts(page, ITEMS_PER_PAGE),
        categoriesPromise,
      ]);
      
      if (effectiveCategory) {
        // For category products, use legacy method - tüm ürünleri göster
        const allProducts = Array.isArray(productsResult) ? productsResult : [];
        setProducts(allProducts);
        // Kategori değiştiğinde filtre/sıralama yoksa direkt set et
        if (!searchQuery && sortBy === 'default' && filters.minPrice === 0 && filters.maxPrice === 10000 && filters.brands.length === 0 && !filters.inStock) {
          setFilteredProducts(allProducts);
        } else {
          // Filtre/sıralama varsa applyFiltersAndSort çalışacak (useEffect ile)
          setFilteredProducts(allProducts);
        }
        setTotalProducts(allProducts.length);
        setHasMore(false);
        setCurrentPageNum(1);
      } else {
        // ✅ OPTIMIZASYON: Infinite scroll - append-based yükleme
        const { products: pageItems, total, hasMore: more } = productsResult as any;
        const pageArray = Array.isArray(pageItems) ? pageItems : [];
        
        if (append && page > 1) {
          // Sonraki sayfayı mevcut listeye ekle
          setProducts(prev => [...prev, ...pageArray]);
          setFilteredProducts(prev => {
            const combined = [...prev, ...pageArray];
            // Filtre/sıralama yoksa direkt döndür
            if (!searchQuery && sortBy === 'default' && filters.minPrice === 0 && filters.maxPrice === 10000 && filters.brands.length === 0 && !filters.inStock) {
              return combined;
            }
            // Filtre/sıralama varsa applyFiltersAndSort çalışacak (useEffect ile)
            return combined;
          });
        } else {
          // İlk yükleme veya reset
          setProducts(pageArray);
          if (!searchQuery && sortBy === 'default' && filters.minPrice === 0 && filters.maxPrice === 10000 && filters.brands.length === 0 && !filters.inStock) {
            setFilteredProducts(pageArray);
          } else {
            setFilteredProducts(pageArray);
          }
        }
        
        setTotalProducts(total || 0);
        // ✅ İYİLEŞTİRME: hasMore state'ini daha güvenilir kontrol et
        const hasMoreProducts = Boolean(more) && (page * ITEMS_PER_PAGE < (total || 0));
        setHasMore(hasMoreProducts);
        setCurrentPageNum(page);
        
        // ✅ OPTIMIZASYON: Cache the result in memory (only if no search/filters)
        // ✅ DÜZELTME: sortBy kontrolü kaldırıldı - sıralama değişse bile cache'e yazılsın
        if (!searchQuery && filters.minPrice === 0 && filters.maxPrice === 10000 && filters.brands.length === 0 && !filters.inStock) {
          memoryCacheRef.current.set(cacheKey, {
            products: pageArray,
            total: total || 0,
            hasMore: Boolean(more),
            timestamp: Date.now()
          });
        }
      }
      
      // Kategorileri sadece yeni veri geldiyse güncelle
      if (Array.isArray(allCategories) && allCategories.length > 0 && (categories.length === 0 || page === 1)) {
        setCategories(allCategories);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      // ✅ İYİLEŞTİRME: Loading flag'i temizle
      loadingMoreRef.current = false;
    }
  }, [selectedCategory, categories.length, searchQuery, sortBy, filters, getCacheKey, getFiltersHash]);

  useEffect(() => {
    let mounted = true;
    // Başlangıçta işlemleri paralel başlat, render'ı bekletme
    loadData(1, false);
    loadFavorites();
    loadCampaigns();
    // Flash deals sadece showFlashDeals true ise veya cache'den yüklenecek (4 dakikada bir API'den çekiliyor)
    if (showFlashDeals) {
      loadFlashDeals();
    }
    if (mounted && !nowIntervalRef.current) {
      nowIntervalRef.current = setInterval(() => setNowTs(Date.now()), 1000);
    }

    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (!nowIntervalRef.current) {
        nowIntervalRef.current = setInterval(() => setNowTs(Date.now()), 1000);
      }
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (nowIntervalRef.current) {
        clearInterval(nowIntervalRef.current);
        nowIntervalRef.current = null;
      }
    });

    return () => {
      mounted = false;
      unsubscribeFocus?.();
      unsubscribeBlur?.();
      if (nowIntervalRef.current) {
        clearInterval(nowIntervalRef.current);
        nowIntervalRef.current = null;
      }
    };
  }, [selectedCategory, navigation, showFlashDeals, loadData]);

  // ✅ OPTIMIZASYON: Cache prefetching - Sonraki sayfayı arka planda önceden yükle
  useEffect(() => {
    if (!selectedCategory && !showFlashDeals && !searchQuery && hasMore && currentPageNum === 1 && products.length > 0) {
      // İlk sayfa yüklendikten sonra, sonraki sayfayı arka planda cache'le
      const prefetchPage = currentPageNum + 1;
      ProductController.cacheBatchPages(prefetchPage, prefetchPage, ITEMS_PER_PAGE).catch(() => {});
    }
  }, [currentPageNum, hasMore, selectedCategory, showFlashDeals, searchQuery, products.length]);

  useEffect(() => {
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route.params?.searchQuery]);

  // Route params değiştiğinde selectedCategory'yi güncelle
  useEffect(() => {
    if (route.params?.category !== undefined) {
      setSelectedCategory(route.params.category);
    }
    if (route.params?.showFlashDeals !== undefined) {
      setShowFlashDeals(route.params.showFlashDeals);
    }
  }, [route.params?.category, route.params?.showFlashDeals]);

  // ✅ OPTIMIZASYON: Debounce süresini 500ms'ye çıkar, cache invalidation ve state optimizasyonu
  useEffect(() => {
    const hasSearch = searchQuery && searchQuery.trim().length >= 2; // Minimum 2 karakter
    const hasFilters = filters.brands.length > 0 || filters.inStock || filters.minPrice > 0 || filters.maxPrice < 10000;
    
    // Arama sorgusu 2 karakterden azsa, sonuçları temizle
    if (searchQuery && searchQuery.trim().length > 0 && searchQuery.trim().length < 2) {
      setFilteredProducts([]);
      setTotalProducts(0);
      return;
    }
    
    // ✅ OPTIMIZASYON: Cache invalidation when filters/search change
    if (hasSearch || hasFilters || sortBy !== 'default') {
      // Clear memory cache when filters/search/sort change
      memoryCacheRef.current.clear();
    }
    
    // ✅ OPTIMIZASYON: Debounce timer - 500ms
    const timeoutId = setTimeout(() => {
      if (hasSearch || hasFilters) {
        // Arama veya filtreleme varsa API'den tüm sonuçları çek
        loadFilteredData();
      } else if (products.length > 0) {
        // Arama/filtreleme yoksa sadece sıralama uygula
        applyFiltersAndSort();
      }
    }, 500); // 500ms debounce (300ms'den artırıldı)
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, filters]);

  const loadCampaigns = async () => {
    try {
      const all = await CampaignController.getCampaigns();
      setCampaigns(Array.isArray(all) ? all : []);
    } catch (e) {
      console.error('Error loading campaigns:', e);
      setCampaigns([]);
    }
  };

  const loadFlashDeals = async () => {
    try {
      const deals = await FlashDealService.getActiveFlashDeals();
      setFlashDeals(deals || []);
    } catch (error) {
      console.error('Flash deal yükleme hatası:', error);
      setFlashDeals([]);
    }
  };

  const isFlashCampaign = (c: Campaign) => {
    if (!c.isActive || c.status !== 'active' || !c.endDate) return false;
    const end = new Date(c.endDate).getTime();
    const remainMs = end - nowTs;
    return remainMs > 0 && remainMs <= 7 * 24 * 60 * 60 * 1000; // 1 hafta
  };

  // ✅ OPTIMIZASYON: useMemo ile memoize et
  const getFlashDealProducts = useMemo((): Product[] => {
    const allFlashProducts: Product[] = [];
    
    // Flash deals API'sinden gelen ürünleri topla
    if (flashDeals && flashDeals.length > 0) {
      flashDeals.forEach((deal: FlashDeal) => {
        if (deal.products && Array.isArray(deal.products) && deal.products.length > 0) {
          deal.products.forEach((product: any) => {
            // Duplicate kontrolü
            if (!allFlashProducts.find(p => p.id === product.id)) {
              // İndirim hesapla
              const discountType = deal.discount_type || 'percentage';
              const discountValue = deal.discount_value || 0;
              let discountedPrice = product.price;
              
              if (discountType === 'percentage') {
                discountedPrice = product.price * (1 - discountValue / 100);
              } else if (discountType === 'fixed') {
                discountedPrice = Math.max(0, product.price - discountValue);
              }
              
              // Bitiş zamanını hesapla
              const endDate = deal.end_date ? new Date(deal.end_date).getTime() : 0;
              const remainSec = Math.max(0, Math.floor((endDate - nowTs) / 1000));
              
              const productWithDiscount: Product = {
                ...product,
                image: product.image || product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
                flashDiscount: discountType === 'percentage' ? discountValue : (discountValue / product.price * 100),
                flashDiscountFixed: discountType === 'fixed' ? discountValue : 0,
                originalPrice: product.price,
                price: discountedPrice,
                flashDealEndTime: remainSec,
                flashDealName: deal.name
              };
              
              allFlashProducts.push(productWithDiscount);
            }
          });
        }
      });
    }
    
    return allFlashProducts;
  }, [flashDeals, nowTs]);

  const formatHMS = (totalSeconds: number) => {
    const sec = Math.max(0, totalSeconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ✅ OPTIMIZASYON: useMemo ile memoize et
  const getFlashHeaderData = useMemo(() => {
    // Flash deals API'sinden gelen en yakın bitiş zamanını bul
    const ends = flashDeals
      .filter(deal => deal.end_date)
      .map(deal => new Date(deal.end_date).getTime())
      .sort((a, b) => a - b);
    const soonestEnd = ends[0];
    const remainSec = soonestEnd ? Math.max(0, Math.floor((soonestEnd - nowTs) / 1000)) : 0;
    
    return {
      remainingTime: remainSec,
      campaignCount: flashDeals.length,
    };
  }, [flashDeals, nowTs]);

  // ✅ İYİLEŞTİRME: Infinite scroll için onEndReached handler - Race condition önleme ve debouncing
  const handleLoadMore = useCallback(() => {
    // ✅ İYİLEŞTİRME: Race condition önleme - ref ile kontrol
    if (loadingMoreRef.current || loadingMore || !hasMore) {
      if (__DEV__) {
        console.log('🔄 [InfiniteScroll] Skip - loadingMore:', loadingMore, 'hasMore:', hasMore, 'ref:', loadingMoreRef.current);
      }
      return;
    }
    
    // Kategori veya flash deals aktifse infinite scroll çalışmasın (tüm ürünler zaten yüklü)
    if (selectedCategory || showFlashDeals) {
      if (__DEV__) {
        console.log('🔄 [InfiniteScroll] Skip - category or flash deals active');
      }
      return;
    }
    
    // Arama varsa infinite scroll çalışmasın (tüm sonuçlar zaten yüklü)
    if (searchQuery && searchQuery.trim().length >= 2) {
      if (__DEV__) {
        console.log('🔄 [InfiniteScroll] Skip - search active');
      }
      return;
    }
    
    // Filtreleme varsa infinite scroll çalışmasın (tüm sonuçlar zaten yüklü)
    if (filters.brands.length > 0 || filters.inStock || filters.minPrice > 0 || filters.maxPrice < 10000) {
      if (__DEV__) {
        console.log('🔄 [InfiniteScroll] Skip - filters active');
      }
      return;
    }
    
    // ✅ İYİLEŞTİRME: Loading flag set et
    loadingMoreRef.current = true;
    
    // Sonraki sayfayı yükle
    const nextPage = currentPageNum + 1;
    if (__DEV__) {
      console.log('🔄 [InfiniteScroll] Loading page:', nextPage, 'current:', currentPageNum, 'hasMore:', hasMore);
    }
    
    loadData(nextPage, true, false).finally(() => {
      // ✅ İYİLEŞTİRME: Loading flag'i temizle
      loadingMoreRef.current = false;
      if (__DEV__) {
        console.log('✅ [InfiniteScroll] Page loaded:', nextPage);
      }
    });
  }, [loadingMore, hasMore, selectedCategory, showFlashDeals, searchQuery, filters, currentPageNum, loadData]);
  
  // ✅ İYİLEŞTİRME: onMomentumScrollBegin handler - scroll başladığında flag'i sıfırla
  const handleMomentumScrollBegin = useCallback(() => {
    onEndReachedCalledDuringMomentum.current = false;
  }, []);
  
  // ✅ İYİLEŞTİRME: onEndReached wrapper - debouncing ve momentum kontrolü
  const handleEndReached = useCallback(() => {
    // Momentum scroll sırasında tetiklenmeyi önle
    if (onEndReachedCalledDuringMomentum.current) {
      return;
    }
    onEndReachedCalledDuringMomentum.current = true;
    handleLoadMore();
  }, [handleLoadMore]);

  // ✅ OPTIMIZASYON: Cache invalidation on refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPageNum(1);
    setHasMore(true);
    
    // ✅ OPTIMIZASYON: Clear memory cache on refresh
    memoryCacheRef.current.clear();
    const effectiveCategory = selectedCategory && selectedCategory !== 'Tümü' ? selectedCategory : null;
    if (effectiveCategory) {
      // Clear category cache
      await CacheService.clearPattern('cache:products:category:');
    } else {
      // Clear products cache
      await CacheService.clearPattern('cache:products:page:');
    }
    
    await Promise.all([
      loadData(1, false, true), // append=false, forceRefresh=true ile reset
      loadFlashDeals()
    ]);
    setRefreshing(false);
  }, [loadData, selectedCategory]);


  // API'den filtrelenmiş verileri yükle
  const loadFilteredData = useCallback(async () => {
    try {
      // Arama yapılıyorsa arama loading state'ini kullan
      if (searchQuery && searchQuery.trim().length >= 2) {
        setIsSearching(true);
      } else {
        setLoading(true);
      }
      
      let allFilteredProducts: Product[] = [];
      
      // Arama varsa API'den arama yap (minimum 2 karakter kontrolü)
      if (searchQuery && searchQuery.trim().length >= 2) {
        const searchResults = await ProductController.searchProducts(searchQuery.trim());
        allFilteredProducts = searchResults;
      } else {
        // Arama yoksa API'den filtreleme yap
        const filterOptions: any = {
          minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
          maxPrice: filters.maxPrice < 10000 ? filters.maxPrice : undefined,
          brands: filters.brands.length > 0 ? filters.brands : undefined,
          inStock: filters.inStock ? true : undefined,
        };
        
        // Boş olmayan filtreleri gönder
        const cleanFilters = Object.fromEntries(
          Object.entries(filterOptions).filter(([_, v]) => v !== undefined)
        );
        
        if (Object.keys(cleanFilters).length > 0) {
          // API'den filtreleme yap
          allFilteredProducts = await ProductController.filterProducts(cleanFilters);
        } else {
          // Filtre yoksa tüm ürünleri çek (sayfalama olmadan, limit büyük)
          const allProductsResult = await ProductController.getAllProducts(1, 10000);
          allFilteredProducts = allProductsResult.products || [];
        }
      }
      
      // Client-side filtreleri de uygula (API'de eksik olabilir)
      let filtered = allFilteredProducts;
      
      // Price filter (ek güvenlik için)
      filtered = filtered.filter(
        (product) => product.price >= filters.minPrice && product.price <= filters.maxPrice
      );

      // Brand filter (ek güvenlik için)
      if (filters.brands.length > 0) {
        filtered = filtered.filter((product) => filters.brands.includes(product.brand));
      }

      // Stock filter (ek güvenlik için)
      if (filters.inStock) {
        filtered = filtered.filter((product) => product.stock > 0);
      }

      // Sorting
      switch (sortBy) {
        case 'price-asc':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case 'name':
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'default':
        default:
          // Varsayılan sıralama - değişiklik yok
          break;
      }

      setFilteredProducts(filtered);
      setTotalProducts(filtered.length);
      setHasMore(false); // Filtrelenmiş sonuçlarda sayfalama yok
      setCurrentPageNum(1);
    } catch (error: any) {
      console.error('Error loading filtered data:', error);
      setFilteredProducts([]);
      setTotalProducts(0);
      // Kullanıcıya hata mesajı göster
      Alert.alert(
        'Arama Hatası',
        error?.message || 'Arama yapılırken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  }, [searchQuery, filters, sortBy]);

  // Sadece sıralama için (arama/filtreleme yoksa)
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...products];

    // Price filter (sadece mevcut sayfadaki ürünler için)
    filtered = filtered.filter(
      (product) => product.price >= filters.minPrice && product.price <= filters.maxPrice
    );

    // Brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter((product) => filters.brands.includes(product.brand));
    }

    // Stock filter
    if (filters.inStock) {
      filtered = filtered.filter((product) => product.stock > 0);
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'default':
      default:
        // Varsayılan sıralama - değişiklik yok
        break;
    }

    setFilteredProducts(filtered);
  }, [products, filters, sortBy]);

  // ✅ OPTIMIZASYON: Callback memoization
  const handleProductPress = useCallback((product: Product, event?: any) => {
    // Track heatmap click (product card)
    if (event?.nativeEvent) {
      const { pageX, pageY } = event.nativeEvent;
    }
    navigation.navigate('ProductDetail', { productId: product.id });
  }, [navigation]);

  // ✅ OPTIMIZASYON: Callback memoization
  const handleAddToCart = useCallback(async (product: Product) => {
    try {
      if (product.stock === 0) {
        Alert.alert('Uyarı', 'Bu ürün stokta yok.');
        return;
      }

      // ✅ OPTIMIZASYON: Cache'lenmiş userId kullan
      const userId = cachedUserId || await UserController.getCurrentUserId();
      const result = await CartController.addToCart(userId, product.id, 1);

      if (result.success) {
        Alert.alert('Başarılı', result.message, [
          { text: 'Tamam' },
          { 
            text: 'Sepete Git', 
            onPress: () => navigation.navigate('Cart') 
          }
        ]);
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    }
  }, [cachedUserId, navigation]);

  const loadFavorites = async () => {
    try {
      // ✅ OPTIMIZASYON: Cache'lenmiş userId kullan
      const userId = cachedUserId || await UserController.getCurrentUserId();
      const favorites = await UserController.getUserFavorites(userId);
      const favoriteIds = favorites.map((fav: any) => parseInt(fav.productId));
      setFavoriteProducts(favoriteIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // ✅ OPTIMIZASYON: Callback memoization
  const handleToggleFavorite = useCallback(async (product: Product) => {
    try {
      // ✅ OPTIMIZASYON: Cache'lenmiş userId kullan
      const userId = cachedUserId || await UserController.getCurrentUserId();
      const isFavorite = favoriteProducts.includes(product.id);
      
      if (isFavorite) {
        const success = await UserController.removeFromFavorites(userId, product.id);
        if (success) {
          setFavoriteProducts(prev => prev.filter(id => id !== product.id));
          Alert.alert('Başarılı', 'Ürün favorilerden çıkarıldı');
        } else {
          Alert.alert('Hata', 'Ürün favorilerden çıkarılamadı');
        }
      } else {
        const success = await UserController.addToFavorites(userId, product.id, {
          name: product.name,
          price: product.price,
          image: product.image,
          images: product.images || [],
          brand: product.brand,
          description: product.description,
          category: product.category,
          stock: product.stock,
          rating: product.rating,
          reviewCount: product.reviewCount
        });
        if (success) {
          setFavoriteProducts(prev => [...prev, product.id]);
          Alert.alert('Başarılı', 'Ürün favorilere eklendi');
        } else {
          Alert.alert('Hata', 'Ürün favorilere eklenemedi');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Hata', 'Favori işlemi sırasında bir hata oluştu');
    }
  }, [cachedUserId, favoriteProducts]);

  // ✅ OPTIMIZASYON: Cache invalidation on search
  const handleSearchSubmit = useCallback(() => {
    // Arama veya filtreleme varsa API'den tüm sonuçları çek
    const hasSearch = searchQuery && searchQuery.trim().length > 0;
    const hasFilters = filters.brands.length > 0 || filters.inStock || filters.minPrice > 0 || filters.maxPrice < 10000;
    
    // ✅ OPTIMIZASYON: Clear cache when searching
    if (hasSearch || hasFilters) {
      memoryCacheRef.current.clear();
      loadFilteredData();
    } else {
      // Arama/filtreleme yoksa normal sayfalama moduna dön
      setCurrentPageNum(1);
      loadData(1, false, true); // forceRefresh=true
    }
  }, [searchQuery, filters, loadFilteredData, loadData]);

  const hasActiveFilters = filters.brands.length > 0 || filters.inStock || filters.minPrice > 0 || filters.maxPrice < 10000;

  // ✅ OPTIMIZASYON: Cache invalidation on category change
  const handleCategorySelect = useCallback(async (category: string | null) => {
    setSelectedCategory(category);
    // Kategori değiştiğinde sayfa 1'e dön ve filtreleri sıfırla
    setCurrentPageNum(1);
    setHasMore(true);
    setSearchQuery('');
    setFilters({
      minPrice: 0,
      maxPrice: 10000,
      brands: [],
      inStock: false,
    });
    setSortBy('default');
    
    // ✅ OPTIMIZASYON: Clear cache when category changes
    memoryCacheRef.current.clear();
    if (category) {
      await CacheService.clearPattern('cache:products:category:');
    } else {
      await CacheService.clearPattern('cache:products:page:');
    }
  }, []);

  const handleAllCategoriesPress = () => {
    navigation.navigate('AllCategories');
  };

  const handleFlashToggle = () => {
    setShowFlashDeals(!showFlashDeals);
  };

  const handleSortPress = () => {
            const options = ['default', 'name', 'price-asc', 'price-desc', 'rating'] as const;
            const currentIndex = options.indexOf(sortBy);
            const newSort = options[(currentIndex + 1) % options.length];
            setSortBy(newSort);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };



  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: any } = {
      'Mont': require('../../assets/kategori_icon/mont.png'),
      'Pantolon': require('../../assets/kategori_icon/pantolon.png'),
      'Gömlek': require('../../assets/kategori_icon/gömlek.png'),
      'Hırka': require('../../assets/kategori_icon/hırka.png'),
      'Eşofmanlar': require('../../assets/kategori_icon/esofman.png'),
      'Bandana': require('../../assets/kategori_icon/bandana.png'),
      'Battaniye': require('../../assets/kategori_icon/battaniye.png'),
      'Kamp Ürünleri': require('../../assets/kategori_icon/camp ürünleri.png'),
      'Polar Bere': require('../../assets/kategori_icon/polar bere.png'),
      'Rüzgarlık': require('../../assets/kategori_icon/rüzgarlık.png'),
      'Şapka': require('../../assets/kategori_icon/şapka.png'),
      'Hoodie': require('../../assets/kategori_icon/hoodie_4696583.png'),
      'Mutfak Ürünleri': require('../../assets/kategori_icon/mutfsk ürünleri.png'),
      'Silah Aksesuar': require('../../assets/kategori_icon/silah aksuar.png'),
      'Silah Aksesuarları': require('../../assets/kategori_icon/silah aksuar.png'),
      'Tişört': require('../../assets/kategori_icon/tişört.png'),
      'T-Shirt': require('../../assets/kategori_icon/tişört.png'),
      'Sweatshirt': require('../../assets/kategori_icon/hoodie_4696583.png'),
      'Yelek': require('../../assets/kategori_icon/waistcoat_6229344.png'),
      'Yardımcı Giyim Ürünleri': require('../../assets/kategori_icon/aplike.png'),
      'Yağmurluk': require('../../assets/kategori_icon/yağmurluk.png'),
    };
    return iconMap[category] || null;
  };

  // ✅ OPTIMIZASYON: Callback memoization - renderProduct zaten useCallback ile sarılmış, dependency'leri optimize et
  const renderProduct = useCallback(({ item, index }: { item: Product; index: number }) => {
    if (viewMode === 'list') {
      return (
        <ModernProductCard
          product={item}
          onPress={() => handleProductPress(item)}
          onAddToCart={() => handleAddToCart(item)}
          onToggleFavorite={isAuthenticated ? () => handleToggleFavorite(item) : undefined}
          isFavorite={favoriteProducts.includes(item.id)}
          variant="horizontal"
        />
      );
    }

    // ✅ DÜZELTME: Grid layout için flex-based yaklaşım - boşlukları düzelt
    const itemSpacing = Spacing.sm;
    return (
      <View style={{ 
        flex: 1,
        marginBottom: 15,
        marginLeft: index % 2 === 0 ? 0 : itemSpacing / 2,
        marginRight: index % 2 === 0 ? itemSpacing / 2 : 0,
      }}>
        <ModernProductCard
          product={item}
          onPress={() => handleProductPress(item)}
          onAddToCart={() => handleAddToCart(item)}
          onToggleFavorite={isAuthenticated ? () => handleToggleFavorite(item) : undefined}
          isFavorite={favoriteProducts.includes(item.id)}
          variant="default"
        />
      </View>
    );
  }, [viewMode, favoriteProducts, width, isAuthenticated, handleProductPress, handleAddToCart, handleToggleFavorite]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="search-off" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyStateTitle}>Ürün Bulunamadı</Text>
      <Text style={styles.emptyStateText}>
        Arama kriterlerinizi değiştirmeyi deneyin
      </Text>
      <ModernButton
        title="Filtreleri Temizle"
        onPress={() => {
          setSearchQuery('');
          setFilters({
            minPrice: 0,
            maxPrice: 10000,
            brands: [],
            inStock: false,
          });
          setSortBy('default');
          // Normal sayfalama moduna dön
          setCurrentPageNum(1);
          setHasMore(true);
          // ✅ OPTIMIZASYON: Clear cache when clearing filters
          memoryCacheRef.current.clear();
          loadData(1, false, true); // forceRefresh=true
        }}
        variant="outline"
        size="medium"
        style={{ marginTop: Spacing.lg }}
      />
    </View>
  );

  // ✅ OPTIMIZASYON: renderFooter artık infinite scroll için kullanılmıyor, sadece fallback olarak
  const renderFooter = useMemo(() => {
    if (selectedCategory) return null;
    if (totalProducts <= 0) return null;

    const totalPages = Math.max(1, Math.ceil(totalProducts / ITEMS_PER_PAGE));
    const canPrev = currentPageNum > 1;
    const canNext = currentPageNum < totalPages && hasMore;

    // Infinite scroll aktif olduğu için pagination gösterilmiyor
    // Sadece fallback olarak bırakıldı
    return null;
  }, [selectedCategory, totalProducts, currentPageNum, hasMore]);

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ProductListHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onFilterPress={() => setFilterModalVisible(true)}
        hasActiveFilters={hasActiveFilters}
      />
      
      {/* Kategori & Kontroller - Kapanıp açılabilir */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text }}>Kategoriler</Text>
          <TouchableOpacity
            onPress={() => setShowHeaderSection(v => !v)}
            style={{ paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
          >
            <Text style={{ color: Colors.text }}>{showHeaderSection ? 'Gizle' : 'Göster'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showHeaderSection && (
        <>
          <CategoriesSection
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            onAllCategoriesPress={handleAllCategoriesPress}
            showFlashDeals={showFlashDeals}
            onFlashToggle={handleFlashToggle}
            getCategoryIcon={getCategoryIcon}
          />
          <ProductListControls
            filteredCount={showFlashDeals ? getFlashDealProducts.length : filteredProducts.length}
            totalCount={totalProducts}
            showFlashDeals={showFlashDeals}
            sortBy={sortBy}
            viewMode={viewMode}
            onSortPress={handleSortPress}
            onViewModeChange={handleViewModeChange}
          />
        </>
      )}
      
      {showFlashDeals && (
        <FlashDealsHeader
          remainingTime={getFlashHeaderData.remainingTime}
          campaignCount={getFlashHeaderData.campaignCount}
        />
      )}
      
      {/* Arama loading göstergesi */}
      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.searchingText}>Aranıyor...</Text>
        </View>
      )}
      
      <FlatList
        ref={listRef}
        data={showFlashDeals ? getFlashDealProducts : filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => `product-${item.id}-${item.externalId || ''}`}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={[
          styles.productList,
          (showFlashDeals ? getFlashDealProducts : filteredProducts).length === 0 && styles.emptyList,
        ]}
        // ✅ DÜZELTME: Grid layout için column wrapper style - item'lar arası boşluk
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        // ✅ İYİLEŞTİRME: Infinite scroll - threshold optimize edildi ve momentum kontrolü eklendi
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        ListEmptyComponent={showFlashDeals ? () => (
          <View style={styles.emptyState}>
            <Icon name="bolt" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyStateTitle}>Şu an flash indirim yok</Text>
            <Text style={styles.emptyStateText}>Kısa süre sonra tekrar kontrol edin</Text>
          </View>
        ) : renderEmptyState}
        ListFooterComponent={!showFlashDeals ? (
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.footerLoadingText}>Daha fazla yükleniyor...</Text>
            </View>
          ) : !hasMore && filteredProducts.length > 0 ? (
            <View style={styles.footerEnd}>
              <Text style={styles.footerEndText}>Tüm ürünler gösterildi</Text>
            </View>
          ) : renderFooter
        ) : null}
        removeClippedSubviews={true}
        maxToRenderPerBatch={viewMode === 'grid' ? 8 : 12}
        updateCellsBatchingPeriod={50}
        initialNumToRender={viewMode === 'grid' ? 8 : 12}
        windowSize={viewMode === 'grid' ? 5 : 7}
        // ✅ İYİLEŞTİRME: getItemLayout kaldırıldı - yanlış hesaplama infinite scroll'u bozuyordu
        // getItemLayout kaldırıldı çünkü:
        // 1. Grid layout'ta item yükseklikleri değişken (ürün adı uzunluğuna göre)
        // 2. Yanlış hesaplama infinite scroll'un tetiklenmesini engelliyor
        // 3. FlatList otomatik olarak daha iyi hesaplama yapıyor
      />

      {/* Infinite scroll aktif - sayfalama kaldırıldı */}

      {filterModalVisible && (
        <FilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          onApply={(newFilters) => {
            setFilters({
              minPrice: newFilters.minPrice ?? 0,
              maxPrice: newFilters.maxPrice ?? 10000,
              brands: newFilters.brands ?? [],
              inStock: newFilters.inStock ?? false,
            });
            setFilterModalVisible(false);
          }}
          currentFilters={{
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            brands: filters.brands,
            inStock: filters.inStock,
          }}
          categories={categories}
        />
      )}
      
      {/* Chatbot */}
      <Chatbot navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.sm,
    height: 38,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  filterButton: {
    padding: Spacing.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  categoriesSection: {
    backgroundColor: Colors.background,
    marginBottom: 0,
  },
  categoriesGradient: {
    paddingVertical: 0,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginBottom: 0,
  },
  categoriesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoriesActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  flashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  flashButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  flashButtonText: {
    fontSize: 13,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: '600',
  },
  flashButtonTextActive: {
    color: Colors.textOnPrimary,
  },
  seeAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  categoryChip: {
    marginRight: Spacing.md,
    borderRadius: 25,
    overflow: 'hidden',
    ...Shadows.small,
  },
  categoryChipActive: {
    ...Shadows.medium,
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipIcon: {
    width: 16,
    height: 16,
  },
  categoryChipText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  categoryChipTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  sortViewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultCount: {
    flex: 1,
  },
  resultCountText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '600',
  },
  totalCountText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sortViewButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginRight: Spacing.sm,
  },
  sortButtonText: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: 6,
    fontWeight: '500',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    padding: 6,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.surface,
  },
  productList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  emptyList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  footerLoadingText: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: Spacing.sm,
  },
  footerEnd: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerEndText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  paginationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  pageButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
  },
  pageInfo: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: 6,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: Colors.textOnPrimary,
  },
  flashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  flashTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  flashTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  flashTimerText: {
    marginLeft: 6,
    color: Colors.primary,
    fontWeight: '600',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 8,
  },
  searchingText: {
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});