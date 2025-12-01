import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernCard } from '../components/ui/ModernCard';
import { ModernButton } from '../components/ui/ModernButton';
import { Product, ProductVariationOption } from '../utils/types';
import { ProductController } from '../controllers/ProductController';
import apiService from '../utils/api-service';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { CampaignController, Campaign } from '../controllers/CampaignController';
import { PersonalizationController, PersonalizedContent } from '../controllers/PersonalizationController';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { Chatbot } from '../components/Chatbot';
import { VariationModal } from '../components/VariationModal';
import { InstagramStories } from '../components/InstagramStories';
import { PopupManager } from '../components/PopupManager';
import { useAppContext } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslatedProductName, getTranslatedProductBrand, getTranslatedVariationName } from '../utils/translationUtils';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminSliderService, { AdminSliderItem } from '../services/AdminSliderService';
import FlashDealService, { FlashDeal } from '../services/FlashDealService';

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

const { width, height } = Dimensions.get('window');

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { updateCart } = useAppContext();
  const { t, currentLanguage, isLoading: languageLoading } = useLanguage();
  const { colors, isDark } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [polarProducts, setPolarProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [favoriteProducts, setFavoriteProducts] = useState<number[]>([]);
  const [popularProductsCounter, setPopularProductsCounter] = useState(0);
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [countdownTimer, setCountdownTimer] = useState(20 * 60); // 20 dakika = 1200 saniye
  const [variationModalVisible, setVariationModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<{ [key: string]: ProductVariationOption }>({});
  const [sliderData, setSliderData] = useState<AdminSliderItem[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nowIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const COUNTDOWN_STORAGE_KEY = 'home_popular_countdown_remaining';
  const COUNTDOWN_SAVED_AT_KEY = 'home_popular_countdown_saved_at';
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await UserController.getCurrentUser();
        if (mounted) setIsAuthenticated(!!user);
      } catch {}
    })();
    return () => { mounted = false };
  }, []);

  // Load sliders from API
  const loadSliders = useCallback(async () => {
    try {
      const sliders = await AdminSliderService.getSliders(10);
      if (sliders && sliders.length > 0) {
        setSliderData(sliders);
      }
    } catch (error) {
      console.error('Slider yükleme hatası:', error);
      // Fallback: eğer API'den veri gelmezse boş array kullan
      setSliderData([]);
    }
  }, []);

  // Load flash deals from API
  const loadFlashDeals = useCallback(async () => {
    try {
      console.log('🔄 [HomeScreen] loadFlashDeals called');
      console.log('🔄 [HomeScreen] Calling FlashDealService.getActiveFlashDeals()...');
      const deals = await FlashDealService.getActiveFlashDeals();
      console.log('✅ [HomeScreen] Flash deals received:', deals?.length || 0, 'deals');
      console.log('✅ [HomeScreen] Setting flashDeals state...');
      if (deals && deals.length > 0) {
        console.log('📦 [HomeScreen] First deal sample:', JSON.stringify({
          id: deals[0].id,
          name: deals[0].name,
          productsCount: deals[0].products?.length || 0
        }));
      }
      setFlashDeals(deals || []);
      console.log('✅ [HomeScreen] flashDeals state updated');
    } catch (error) {
      console.error('❌ [HomeScreen] Flash deal yükleme hatası:', error);
      console.error('❌ [HomeScreen] Error stack:', error instanceof Error ? error.stack : 'No stack');
      setFlashDeals([]);
    }
  }, []);

  // Category icons mapping - memoized to prevent re-renders
  const categoryIcons = useMemo(() => ({
    'Mont': require('../../assets/kategori_icon/mont.png'),
    'Pantolon': require('../../assets/kategori_icon/pantolon.png'),
    'Gömlek': require('../../assets/kategori_icon/gömlek.png'),
    'Hırka': require('../../assets/kategori_icon/hırka.png'),
    'Eşofmanlar': require('../../assets/kategori_icon/esofman.png'),
    'Bandana': require('../../assets/kategori_icon/bandana.png'),
    'Battaniye': require('../../assets/kategori_icon/battaniye.png'),
    'Kamp Ürünleri': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Camp Ürünleri': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Polar Bere': require('../../assets/kategori_icon/polar bere.png'),
    'Rüzgarlık': require('../../assets/kategori_icon/rüzgarlık.png'),
    'Şapka': require('../../assets/kategori_icon/şapka.png'),
    'Hoodie': require('../../assets/kategori_icon/hoodie_4696583.png'),
    'Mutfak Ürünleri': require('../../assets/kategori_icon/mutfsk ürünleri.png'),
    'Silah Aksesuar': require('../../assets/kategori_icon/silah aksuar.png'),
    'Silah Aksuar': require('../../assets/kategori_icon/silah aksuar.png'),
    'Silah Aksesuarları': require('../../assets/kategori_icon/silah aksuar.png'),
    'Tişört': require('../../assets/kategori_icon/tişört.png'),
    'T-Shirt': require('../../assets/kategori_icon/tişört.png'),
    'Sweatshirt': require('../../assets/kategori_icon/hoodie_4696583.png'),
    'Yelek': require('../../assets/kategori_icon/waistcoat_6229344.png'),
    'Waistcoat': require('../../assets/kategori_icon/waistcoat_6229344.png'),
    'Yardımcı Giyim Ürünleri': require('../../assets/kategori_icon/aplike.png'),
    'Aplike': require('../../assets/kategori_icon/aplike.png'),
    'Yağmurluk': require('../../assets/kategori_icon/yağmurluk.png'),
    // Fallback iconlar için genel kategoriler
    'Giyim': require('../../assets/kategori_icon/tişört.png'),
    'Aksesuar': require('../../assets/kategori_icon/şapka.png'),
    'Kamp': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Mutfak': require('../../assets/kategori_icon/mutfsk ürünleri.png'),
    'Outdoor': require('../../assets/kategori_icon/mont.png'),
    'Spor': require('../../assets/kategori_icon/esofman.png'),
  }), []);

  useEffect(() => {
    const init = async () => {
      console.log('🚀 HomeScreen init started');
      // ✅ OPTIMIZASYON: Tüm yükleme işlemlerini paralel başlat
      console.log('📊 Calling loadData, loadFavorites, loadSliders, loadFlashDeals in parallel...');
      
      // İlk yükleme - flash deals dahil
      Promise.allSettled([
        loadData(),
        loadFavorites(),
        loadSliders(),
        loadFlashDeals()
      ]).catch(() => {});
      
      restoreCountdownAndStart();
      console.log('✅ HomeScreen init completed');
    };
    const cleanupSlider = setupSliderTimer();
    init();
    
    // Flash deals'ı 4 dakikada bir çek
    const flashDealsInterval = setInterval(() => {
      console.log('⏰ 4 dakika geçti, flash deals yenileniyor...');
      loadFlashDeals();
    }, 4 * 60 * 1000); // 4 dakika
    
    return () => {
      cleanupSlider();
      clearInterval(flashDealsInterval);
      // Persist current countdown on unmount
      AsyncStorage.setItem(COUNTDOWN_STORAGE_KEY, String(countdownTimer)).catch(() => {});
      AsyncStorage.setItem(COUNTDOWN_SAVED_AT_KEY, String(Date.now())).catch(() => {});
      stopCountdownTimer(); // Cleanup'ta timer'ı durdur
      if (nowIntervalRef.current) {
        clearInterval(nowIntervalRef.current);
        nowIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to current slide when currentSlide changes
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        x: currentSlide * width,
        animated: true,
      });
    }
  }, [currentSlide]);

  const setupSliderTimer = () => {
    if (sliderData.length === 0) return () => {};
    const timer = setInterval(() => {
        setCurrentSlide((prev: number) => (prev + 1) % sliderData.length);
    }, 4000);
    return () => clearInterval(timer);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // ✅ OPTIMIZASYON: Kullanıcı kontrolünü önce yap
      const isLoggedIn = await UserController.isLoggedIn();
      const userId = isLoggedIn ? await UserController.getCurrentUserId() : null;

      // ✅ OPTIMIZASYON: Tüm veri çağrılarını paralel yap (flash deals hariç - 4 dakikada bir çekiliyor)
      const [
        homepageResult,
        catsResult,
        allCampaignsResult,
        personalizedResult,
        userCampaignsResult
      ] = await Promise.allSettled([
        // Homepage products (sadece giriş yapılmışsa)
        userId ? apiService.get(`/users/${userId}/homepage-products`) : Promise.resolve(null),
        // Kategoriler
        ProductController.getAllCategories(),
        // Genel kampanyalar
        CampaignController.getCampaigns(),
        // Kişiselleştirilmiş içerik (sadece giriş yapılmışsa)
        userId ? PersonalizationController.generatePersonalizedContent(userId) : Promise.resolve(null),
        // Kullanıcıya özel kampanyalar (sadece giriş yapılmışsa)
        userId ? CampaignController.getAvailableCampaigns(userId) : Promise.resolve(null)
      ]);

      // Homepage products işle
      let homepagePayload: any | null = null;
      if (homepageResult.status === 'fulfilled' && homepageResult.value?.success && homepageResult.value?.data) {
        homepagePayload = homepageResult.value.data;
      }

      if (homepagePayload) {
        setPopularProducts(homepagePayload.popular || []);
        setNewProducts(homepagePayload.newProducts || []);
        setPolarProducts(homepagePayload.polar || []);
      } else {
        // Fallback: az sayıda ürün çekerek hesapla
        const allProductsResponse = await ProductController.getAllProducts(1, 60);
        const allProducts = allProductsResponse?.products || [];
        if (allProducts && allProducts.length > 0) {
          const popularProducts = allProducts
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 6);
          const newProducts = getUniqueProducts(
            allProducts
              .sort((a, b) => {
                const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
                const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
                return dateB - dateA;
              }),
            popularProducts,
            6
          );
          const polarProducts = allProducts
            .filter(product => 
              product.category === 'Polar Bere' || 
              product.name.toLowerCase().includes('polar') ||
              product.name.toLowerCase().includes('hırka')
            )
            .slice(0, 6);
          setPopularProducts(popularProducts);
          setNewProducts(newProducts);
          setPolarProducts(polarProducts);
        } else {
          setPopularProducts([]);
          setNewProducts([]);
          setPolarProducts([]);
        }
      }

      // Kategorileri işle
      if (catsResult.status === 'fulfilled') {
        setCategories(Array.isArray(catsResult.value) ? catsResult.value : []);
      }

      // Kampanyaları işle
      if (allCampaignsResult.status === 'fulfilled') {
        setCampaigns(Array.isArray(allCampaignsResult.value) ? allCampaignsResult.value : []);
        // Sayaç için global bir now ticker başlat
        if (!nowIntervalRef.current) {
          nowIntervalRef.current = setInterval(() => setNowTs(Date.now()), 1000);
        }
      } else {
        setCampaigns([]);
      }

      // Kişiselleştirilmiş içerik işle
      if (personalizedResult.status === 'fulfilled' && personalizedResult.value) {
        setPersonalizedContent(personalizedResult.value);
      } else {
        setPersonalizedContent(null);
      }

      // Kullanıcıya özel kampanyalar işle
      if (userCampaignsResult.status === 'fulfilled' && userCampaignsResult.value) {
        setAvailableCampaigns(Array.isArray(userCampaignsResult.value) ? userCampaignsResult.value : []);
      } else {
        setAvailableCampaigns([]);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPopularProducts = useCallback(async () => {
    try {
      const allProductsResponse = await ProductController.getAllProducts(1, 60);
      const allProducts = allProductsResponse?.products || [];
      if (allProducts && allProducts.length > 0) {
        // GÜVENLİK: Kriptografik olarak güvenli shuffle
        let shuffled: typeof allProducts;
        try {
          const cryptoUtils = require('../utils/crypto-utils');
          if (cryptoUtils && typeof cryptoUtils.secureShuffleArray === 'function') {
            shuffled = cryptoUtils.secureShuffleArray(allProducts);
          } else {
            // Fallback: basit shuffle
            shuffled = [...allProducts].sort(() => Math.random() - 0.5);
          }
        } catch (error) {
          // Fallback: basit shuffle
          shuffled = [...allProducts].sort(() => Math.random() - 0.5);
        }
        const randomProducts = getUniqueProducts(shuffled, newProducts, 6);
        
        setPopularProducts(randomProducts);
        setPopularProductsCounter((prev: number) => prev + 1);
        // Timer'ı sıfırla
        const reset = 20 * 60;
        setCountdownTimer(reset);
        // Persist reset value immediately
        try {
          await AsyncStorage.setItem(COUNTDOWN_STORAGE_KEY, String(reset));
          await AsyncStorage.setItem(COUNTDOWN_SAVED_AT_KEY, String(Date.now()));
        } catch {}
      }
    } catch (error) {
      console.error('Error refreshing popular products:', error);
    }
  }, [newProducts]);

  const restoreCountdownAndStart = async () => {
    try {
      const [savedRemainingStr, savedAtStr] = await Promise.all([
        AsyncStorage.getItem(COUNTDOWN_STORAGE_KEY),
        AsyncStorage.getItem(COUNTDOWN_SAVED_AT_KEY),
      ]);
      const defaultRemaining = 20 * 60;
      if (savedRemainingStr && savedAtStr) {
        const savedRemaining = parseInt(savedRemainingStr, 10);
        const savedAt = parseInt(savedAtStr, 10);
        if (!isNaN(savedRemaining) && !isNaN(savedAt)) {
          const elapsed = Math.floor((Date.now() - savedAt) / 1000);
          const remaining = Math.max(1, savedRemaining - elapsed);
          setCountdownTimer(remaining);
          startCountdownTimer();
          return;
        }
      }
      // Fallback to default
      setCountdownTimer(defaultRemaining);
      startCountdownTimer();
    } catch {
      setCountdownTimer(20 * 60);
      startCountdownTimer();
    }
  };

  const startCountdownTimer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdownTimer((prev: number) => {
        const next = prev <= 1 ? 20 * 60 : prev - 1;
        // Persist on every tick
        AsyncStorage.setItem(COUNTDOWN_STORAGE_KEY, String(next)).catch(() => {});
        AsyncStorage.setItem(COUNTDOWN_SAVED_AT_KEY, String(Date.now())).catch(() => {});
        if (prev <= 1) {
          // Timer bitti, popüler ürünleri yenile
          refreshPopularProducts();
        }
        return next;
      });
    }, 1000);
  };

  const stopCountdownTimer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const formatCountdownTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatHMS = (totalSeconds: number) => {
    const sec = Math.max(0, totalSeconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Çakışmayı önleyen yardımcı fonksiyon
  const getUniqueProducts = (allProducts: Product[], excludeProducts: Product[], count: number): Product[] => {
    const excludeSkus = new Set(excludeProducts.map(p => p.externalId || p.id.toString()));
    const uniqueProducts = allProducts.filter(p => !excludeSkus.has(p.externalId || p.id.toString()));
    return uniqueProducts.slice(0, count);
  };

  const loadFavorites = async () => {
    try {
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      const favorites = await UserController.getUserFavorites(userId);
      const favoriteIds = favorites.map((fav: any) => parseInt(fav.productId));
      setFavoriteProducts(favoriteIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadData(),
      loadFavorites(),
      loadFlashDeals(),
      loadSliders()
    ]);
    setRefreshing(false);
  };

  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  }, [navigation]);

  const handleCategoryPress = useCallback((category: string) => {
    navigation.navigate('ProductList', { category });
  }, [navigation]);

  const handleAddToCart = useCallback(async (product: Product) => {
    try {
      if (product.stock === 0) {
        Alert.alert('Uyarı', 'Bu ürün stokta yok.');
        return;
      }

      // Eğer ürünün varyasyonları varsa modal aç
      if (product.hasVariations && product.variations && product.variations.length > 0) {
        setSelectedProduct(product);
        setSelectedVariations({});
        setVariationModalVisible(true);
        return;
      }

      // Varyasyon yoksa direkt sepete ekle
      const userId = await UserController.getCurrentUserId();
      const result = await CartController.addToCart(userId, product.id, 1);

      if (result.success) {
        // ⚡ OPTIMIZASYON: Optimistik güncelleme - sepeti yeniden çekme
        try {
          const currentCart = (updateCart as any).cart || { items: [], total: 0, itemCount: 0 };
          updateCart({
            items: currentCart.items,
            total: currentCart.total + product.price,
            itemCount: currentCart.itemCount + 1,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error updating cart context:', error);
        }

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
  }, [updateCart, navigation]);

  const handleVariationConfirm = useCallback(async (selectedOptions: { [key: string]: ProductVariationOption }) => {
    if (!selectedProduct) return;

    try {
      const userId = await UserController.getCurrentUserId();
      const result = await CartController.addToCart(userId, selectedProduct.id, 1, selectedOptions);

      if (result.success) {
        // ⚡ OPTIMIZASYON: Optimistik güncelleme
        try {
          const currentCart = (updateCart as any).cart || { items: [], total: 0, itemCount: 0 };
          updateCart({
            items: currentCart.items,
            total: currentCart.total + selectedProduct.price,
            itemCount: currentCart.itemCount + 1,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error updating cart context:', error);
        }

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
      console.error('Error adding to cart with variations:', error);
      Alert.alert('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    }
  }, [updateCart, navigation, selectedProduct]);

  const handleVariationClose = useCallback(() => {
    setVariationModalVisible(false);
    setSelectedProduct(null);
    setSelectedVariations({});
  }, []);

  const handleToggleFavorite = useCallback(async (product: Product) => {
    try {
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      const isFavorite = favoriteProducts.includes(product.id);
      
      if (isFavorite) {
        const success = await UserController.removeFromFavorites(userId, product.id);
        if (success) {
          setFavoriteProducts((prev: number[]) => prev.filter(id => id !== product.id));
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
          setFavoriteProducts((prev: number[]) => [...prev, product.id]);
          Alert.alert('Başarılı', 'Ürün favorilere eklendi');
        } else {
          Alert.alert('Hata', 'Ürün favorilere eklenemedi');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Hata', 'Favori işlemi sırasında bir hata oluştu');
    }
  }, [favoriteProducts]);

  const handleOfferPress = async (offer: any) => {
    try {
      Alert.alert(
        offer.title,
        offer.description,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Uygula', onPress: () => applyOffer(offer) }
        ]
      );
    } catch (error) {
      console.error('Error handling offer press:', error);
    }
  };

  const applyOffer = async (offer: any) => {
    // This would apply the offer to the user's cart or account
    Alert.alert('Başarılı', 'Kampanya uygulandı!');
  };

  const getOfferColor = (type: string): string => {
    const colors: Record<string, string> = {
      discount: '#28a745',
      free_shipping: '#17a2b8',
      bundle: '#6f42c1',
      loyalty: '#fd7e14',
      seasonal: '#20c997',
      birthday: '#e83e8c',
    };
    return colors[type] || '#007bff';
  };

  const getOfferGradient = (type: string): string[] => {
    const gradients: Record<string, string[]> = {
      discount: ['#28a745', '#20c997'],
      free_shipping: ['#17a2b8', '#6f42c1'],
      bundle: ['#6f42c1', '#e83e8c'],
      loyalty: ['#fd7e14', '#ff6b6b'],
      seasonal: ['#20c997', '#28a745'],
      birthday: ['#e83e8c', '#fd7e14'],
    };
    return gradients[type] || ['#007bff', '#6f42c1'];
  };

  const getOfferIcon = (type: string): string => {
    const icons: Record<string, string> = {
      discount: 'local-offer',
      free_shipping: 'local-shipping',
      bundle: 'inventory',
      loyalty: 'star',
      seasonal: 'eco',
      birthday: 'cake',
    };
    return icons[type] || 'gift';
  };

  const renderHeroSlider = () => {
    if (sliderData.length === 0) return null;
    return (
    <View style={styles.sliderContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event: any) => {
          const slide = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentSlide(slide);
        }}
        scrollEventThrottle={16}
      >
        {sliderData.map((slide: AdminSliderItem) => (
          <View key={`slide-${slide.id}`} style={styles.slide}>
            <Image source={{ uri: slide.imageUrl }} style={styles.slideImage} />
            <LinearGradient
              colors={['transparent', `rgba(0,0,0,${slide.overlayOpacity || 0.8})`]}
              style={styles.slideOverlay}
            >
              <View style={styles.slideContent}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                {slide.description && (
                  <Text style={styles.slideDescription}>{slide.description}</Text>
                )}
                {slide.buttonText && (
                  <ModernButton
                    title={slide.buttonText}
                    onPress={() => {
                      
                      if (slide.clickAction?.type === 'product' && slide.clickAction.value) {
                        navigation.navigate('ProductDetail', { productId: parseInt(slide.clickAction.value) });
                      } else if (slide.clickAction?.type === 'category' && slide.clickAction.value) {
                        navigation.navigate('ProductList', { category: slide.clickAction.value });
                      } else if (slide.clickAction?.type === 'url' && slide.clickAction.value) {
                        Linking.openURL(slide.clickAction.value);
                      } else {
                        navigation.navigate('ProductList');
                      }
                    }}
                    variant="gradient"
                    size="medium"
                    style={{ 
                      marginTop: Spacing.md,
                      backgroundColor: slide.buttonColor || undefined,
                    }}
                  />
                )}
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      <View style={styles.pagination}>
        {sliderData.map((_: any, index: number) => (
          <View
            key={`pagination-dot-${index}`}
            style={[
              styles.paginationDot,
              currentSlide === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
    );
  };

  const renderCategories = useMemo(() => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Image 
            source={require('../../assets/categories-icon.png')} 
            style={styles.sectionIcon}
            resizeMode="contain"
          />
          <Text style={styles.sectionTitle}>Kategoriler</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AllCategories')}>
          <Text style={styles.seeAll}>Tümü →</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
        removeClippedSubviews={true}
      >
        {(categories || []).filter((cat: any) => cat && typeof cat === 'string').map((category: string, index: number) => {
          const getCategoryIcon = (cat: string) => {
            // Kategori boş veya undefined ise null döndür
            if (!cat || typeof cat !== 'string') {
              return null;
            }
            
            // Önce tam eşleşme ara
            if (categoryIcons[cat as keyof typeof categoryIcons]) {
              return categoryIcons[cat as keyof typeof categoryIcons];
            }
            
            // Kısmi eşleşme ara
            const lowerCategory = cat.toLowerCase();
            for (const [key, icon] of Object.entries(categoryIcons)) {
              if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
                return icon;
              }
            }
            
            // Kategori türüne göre genel icon seç
            if (lowerCategory.includes('mont') || lowerCategory.includes('ceket') || lowerCategory.includes('jacket')) {
              return categoryIcons['Mont'];
            }
            if (lowerCategory.includes('pantolon') || lowerCategory.includes('pants')) {
              return categoryIcons['Pantolon'];
            }
            if (lowerCategory.includes('tişört') || lowerCategory.includes('t-shirt') || lowerCategory.includes('shirt')) {
              return categoryIcons['Tişört'];
            }
            if (lowerCategory.includes('şapka') || lowerCategory.includes('hat') || lowerCategory.includes('cap')) {
              return categoryIcons['Şapka'];
            }
            if (lowerCategory.includes('kamp') || lowerCategory.includes('camp') || lowerCategory.includes('outdoor')) {
              return categoryIcons['Kamp Ürünleri'];
            }
            if (lowerCategory.includes('mutfak') || lowerCategory.includes('kitchen')) {
              return categoryIcons['Mutfak Ürünleri'];
            }
            if (lowerCategory.includes('aksesuar') || lowerCategory.includes('accessory')) {
              return categoryIcons['Aksesuar'];
            }
            
            return null;
          };

          const iconSource = getCategoryIcon(category);
          return (
            <TouchableOpacity
              key={`category-${index}-${category}`}
              onPress={() => handleCategoryPress(category)}
              style={styles.categoryCard}
            >
              <View style={styles.categoryIconContainer}>
                {iconSource ? (
                  <Image
                    source={iconSource}
                    style={styles.categoryIcon}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon
                    name="category"
                    size={28}
                    color={Colors.primary}
                  />
                )}
              </View>
              <Text style={styles.categoryName}>{category}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [categories, categoryIcons, navigation]);

  const renderProductCard = useCallback(({ item }: { item: Product }) => (
    <ModernCard
      onPress={() => handleProductPress(item)}
      style={styles.productCard}
      noPadding
      variant="outlined"
      gradientBorder={false}
    >
      <View style={styles.productImageContainer}>
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/300x300?text=No+Image' }} 
          style={styles.productImage} 
        />
        {item.stock < 5 && item.stock > 0 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>Son {item.stock} Ürün</Text>
          </View>
        )}
        {isAuthenticated && (
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleToggleFavorite(item)}
          >
            <Icon 
              name={favoriteProducts.includes(item.id) ? "favorite" : "favorite-border"} 
              size={20} 
              color={favoriteProducts.includes(item.id) ? Colors.secondary : Colors.text} 
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.productInfo}>
        <View style={styles.brandContainer}>
          <Text style={styles.productBrand}>{getTranslatedProductBrand(item, currentLanguage)}</Text>
          <Icon name="check-circle" size={12} color="#007AFF" style={styles.verifiedIcon} />
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {getTranslatedProductName(item, currentLanguage)}
        </Text>
        
        {/* Beden bilgisi (varyasyonlu ürünler için) */}
        {item.hasVariations && item.variations && item.variations.length > 0 && (
          <View style={styles.sizeContainer}>
            <Text style={styles.sizeLabel}>{t('productDetail.size')}:</Text>
            <View style={styles.sizeList}>
              {item.variations.slice(0, 3).map((variation, index) => (
                <View key={index} style={styles.sizeChip}>
                  <Text style={styles.sizeText}>
                    {variation.options?.[0]?.value || 'N/A'}
                  </Text>
                </View>
              ))}
              {item.variations.length > 3 && (
                <View style={styles.sizeChip}>
                  <Text style={styles.sizeText}>+{item.variations.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>
              {ProductController.formatPrice(item.price)}
            </Text>
            {item.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Icon name="star" size={14} color={Colors.warning} />
                <Text style={styles.ratingText}>
                  {item.rating.toFixed(1)} ({item.reviewCount})
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.addToCartButton}
            onPress={() => handleAddToCart(item)}
          >
            <Icon name="add-shopping-cart" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </ModernCard>
  ), [favoriteProducts, handleProductPress, handleToggleFavorite, handleAddToCart, currentLanguage, isAuthenticated, t]);

  const renderPopularProducts = useCallback(() => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View>
            <Text style={styles.sectionTitle}>Popüler Ürünler</Text>
            <Text style={styles.sectionSubtitle}>En çok tercih edilenler</Text>
          </View>
          <View style={styles.countdownContainer}>
            <Icon name="timer" size={14} color={Colors.primary} />
            <Text style={styles.countdownText}>
              {formatCountdownTime(countdownTimer)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Products')}>
          <Text style={styles.seeAll}>Tümü →</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={popularProducts}
        renderItem={renderProductCard}
        keyExtractor={(item: Product) => `popular-${item.id}-${popularProductsCounter}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={Math.round(width * 0.4) + Spacing.xl + 15}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={3}
        initialNumToRender={3}
        getItemLayout={(data: any, index: number) => ({
          length: 200,
          offset: 200 * index,
          index,
        })}
      />
    </View>
  ), [popularProducts, popularProductsCounter, favoriteProducts, handleProductPress, handleToggleFavorite, handleAddToCart, currentLanguage, isAuthenticated, t, countdownTimer, navigation, width]);

  const renderNewProducts = useCallback(() => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Yeni Ürünler</Text>
          <Text style={styles.sectionSubtitle}>En son eklenenler</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Products')}>
          <Text style={styles.seeAll}>Tümü →</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={newProducts}
        renderItem={renderProductCard}
        keyExtractor={(item: Product) => `new-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={Math.round(width * 0.4) + Spacing.xl + 15}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={4}
        getItemLayout={(data: any, index: number) => {
          const itemWidth = Math.round(width * 0.42) + Spacing.xl + 15;
          return {
            length: itemWidth,
            offset: itemWidth * index,
            index,
          };
        }}
      />
    </View>
  ), [newProducts, favoriteProducts, handleProductPress, handleToggleFavorite, handleAddToCart, currentLanguage, isAuthenticated, t, navigation, width]);

  const renderCampaigns = useCallback(() => {
    const activeCampaigns = (campaigns || []).filter((c: any) => c.isActive && c.status === 'active');
    if (activeCampaigns.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Özel Teklifler</Text>
            <Text style={styles.sectionSubtitle}>Güncel kampanyalar</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offerList}
        >
          {activeCampaigns.slice(0, 6).map((c: any) => {
            const campaignType = c.type === 'voucher' ? 'voucher' : c.type === 'flash_deal' ? 'flash_deal' : 'banner';
            return (
              <TouchableOpacity
                key={`camp-${c.id}`}
                style={[styles.offerCard, { backgroundColor: getOfferColor(c.type) }]}
                onPress={() => {
                  if (c.actionUrl) {
                    Linking.openURL(c.actionUrl);
                  }
                }}
              >
                <View style={styles.offerHeader}>
                  <View style={styles.offerIcon}>
                    <Icon name={getOfferIcon(c.type)} size={20} color="white" />
                  </View>
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerTitle} numberOfLines={2}>{c.name}</Text>
                    {!!c.description && (
                      <Text style={styles.offerDescription} numberOfLines={2}>{c.description}</Text>
                    )}
                  </View>
                </View>
                {typeof c.discountValue === 'number' && c.discountValue > 0 && (
                  <View style={styles.offerDiscount}>
                    <Text style={styles.discountText}>
                      {c.discountType === 'percentage' ? `%${c.discountValue} İndirim` : `${c.discountValue} TL İndirim`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [campaigns, navigation, nowTs]);

  const renderFlashDeals = useCallback(() => {
    const now = nowTs;
    
    // Flash deals API'sinden gelen tüm ürünleri topla
    const allFlashProducts: Product[] = [];
    
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
              const remainSec = Math.max(0, Math.floor((endDate - now) / 1000));
              
              const productWithDiscount: Product = {
                ...product,
                id: product.id,
                name: product.name || '',
                price: discountedPrice,
                originalPrice: product.price,
                image: product.image || product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
                category: product.category || '',
                brand: product.brand || '',
                description: product.description || '',
                stock: product.stock || 0,
                rating: product.rating || 0,
                reviewCount: product.reviewCount || 0,
                hasVariations: product.hasVariations || false,
                externalId: product.externalId || '',
                flashDiscount: discountType === 'percentage' ? discountValue : (discountValue / product.price * 100),
                flashDiscountFixed: discountType === 'fixed' ? discountValue : 0,
                flashDealEndTime: remainSec,
                flashDealName: deal.name
              } as Product;
              
              allFlashProducts.push(productWithDiscount);
            }
          });
        }
      });
    }
    
    if (allFlashProducts.length === 0) {
      return null;
    }
    
    // İlk 5 ürünü göster
    const displayProducts = allFlashProducts.slice(0, 5);
    
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="flash-on" size={18} color={Colors.secondary} />
            <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Flash İndirimler</Text>
          </View>
          <TouchableOpacity onPress={() => {
            navigation.navigate('ProductList', {
              title: 'Flash İndirimler',
              showFlashDeals: true
            });
          }}>
            <Text style={styles.seeAll}>Tümü →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
        >
          {displayProducts.map((item: Product, index: number) => {
            const flashDiscount = (item as any).flashDiscount;
            const remainSec = (item as any).flashDealEndTime || 0;
            
            // flashDiscount'ı sayıya çevir ve kontrol et
            const discountValue = typeof flashDiscount === 'number' 
              ? flashDiscount 
              : (typeof flashDiscount === 'string' ? parseFloat(flashDiscount) : 0) || 0;
            
            return (
              <ModernCard
                key={`flash-product-${item.id}-${index}`}
                onPress={() => handleProductPress(item)}
                style={[styles.productCard, styles.flashProductCard] as any}
                noPadding
                variant="outlined"
                gradientBorder={false}
              >
                <View style={styles.productImageContainer}>
                  <Image 
                    source={{ uri: item.image || 'https://via.placeholder.com/300x300?text=No+Image' }} 
                    style={styles.productImage} 
                  />
                  {discountValue > 0 && (
                    <View style={styles.flashDiscountBadge}>
                      <Text style={styles.flashDiscountText}>
                        %{discountValue.toFixed(0)} İndirim
                      </Text>
                    </View>
                  )}
                  <View style={styles.flashTimerBadge}>
                    <Icon name="timer" size={12} color="white" />
                    <Text style={styles.flashTimerText}>{formatHMS(remainSec)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.favoriteButton}
                    onPress={() => handleToggleFavorite(item)}
                  >
                    <Icon 
                      name={favoriteProducts.includes(item.id) ? "favorite" : "favorite-border"} 
                      size={20} 
                      color={favoriteProducts.includes(item.id) ? Colors.secondary : Colors.text} 
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.productInfo}>
                  <View style={styles.brandContainer}>
                    <Text style={styles.productBrand}>{item.brand}</Text>
                    <Icon name="check-circle" size={12} color="#007AFF" style={styles.verifiedIcon} />
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.productFooter}>
                    <View>
                      <Text style={styles.flashOriginalPrice}>
                        {ProductController.formatPrice((item as any).originalPrice || item.price)}
                      </Text>
                      <Text style={styles.flashDiscountedPrice}>
                        {ProductController.formatPrice(item.price)}
                      </Text>
                      {item.rating > 0 && (
                        <View style={styles.ratingContainer}>
                          <Icon name="star" size={14} color={Colors.warning} />
                          <Text style={styles.ratingText}>
                            {item.rating.toFixed(1)} ({item.reviewCount || 0})
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.addToCartButton}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Icon name="add-shopping-cart" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ModernCard>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [flashDeals, nowTs, favoriteProducts, handleProductPress, handleToggleFavorite, handleAddToCart, currentLanguage, isAuthenticated, navigation, width]);


  const renderPersonalizedOffers = useCallback(() => {
    if (!personalizedContent || personalizedContent.personalizedOffers.length === 0) {
      return null;
    }

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>🎁 Size Özel Teklifler</Text>
            <Text style={styles.sectionSubtitle}>Kişiselleştirilmiş kampanyalar</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('PersonalizedOffers')}>
            <Text style={styles.seeAll}>Tümü →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offerList}
        >
          {personalizedContent.personalizedOffers.slice(0, 3).map((offer: any, index: number) => (
            <TouchableOpacity
              key={offer.id}
              style={styles.modernOfferCard}
              onPress={() => handleOfferPress(offer)}
            >
              <LinearGradient
                colors={getOfferGradient(offer.type)}
                style={styles.offerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.offerGlow} />
                <View style={styles.offerContent}>
                  <View style={styles.offerHeader}>
                    <View style={styles.modernOfferIcon}>
                      <Icon name={getOfferIcon(offer.type)} size={24} color="white" />
                    </View>
                    <View style={styles.offerInfo}>
                      <Text style={styles.modernOfferTitle} numberOfLines={2}>{offer.title}</Text>
                      <Text style={styles.modernOfferDescription} numberOfLines={2}>{offer.description}</Text>
                    </View>
                  </View>
                  
                  {offer.discountAmount && (
                    <View style={styles.modernOfferDiscount}>
                      <Text style={styles.modernDiscountText}>
                        {offer.discountType === 'percentage' 
                          ? `%${offer.discountAmount} İndirim`
                          : `${offer.discountAmount} TL İndirim`
                        }
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.offerBadge}>
                    <Text style={styles.badgeText}>ÖZEL</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }, [personalizedContent, handleOfferPress, navigation]);




  if (loading || languageLoading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      

      <ScrollView
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <InstagramStories
          limit={5}
          onStoryPress={(story) => {
            console.log('Story tıklandı:', story);
            // Sadece console'a yazdır, otomatik yönlendirme yapma
          }}
        />
        {renderHeroSlider()}
        {renderCategories}
        {renderFlashDeals()}
        {renderCampaigns()}
        {renderPersonalizedOffers()}
        {renderPopularProducts()}
        {renderNewProducts()}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
      
      {/* Popup Manager */}
      <PopupManager navigation={navigation} />
      
      {/* Chatbot */}
      <Chatbot navigation={navigation} />
      
      {/* Varyasyon Modal */}
      <VariationModal
        visible={variationModalVisible}
        product={selectedProduct}
        onClose={handleVariationClose}
        onConfirm={handleVariationConfirm}
        selectedOptions={selectedVariations}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  sliderContainer: {
    height: Math.round(height * 0.32),
    marginBottom: Spacing.xl,
  },
  slide: {
    width,
    height: Math.round(height * 0.32),
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  slideContent: {
    alignItems: 'flex-start',
  },
  slideSubtitle: {
    fontSize: 14,
    color: Colors.textOnPrimary,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textOnPrimary,
    marginBottom: Spacing.xs,
  },
  slideDescription: {
    fontSize: 16,
    color: Colors.textOnPrimary,
    opacity: 0.9,
    marginBottom: Spacing.md,
  },
  pagination: {
    position: 'absolute',
    bottom: Spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    width: 18,
    backgroundColor: Colors.textOnPrimary,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.primary,
    marginRight: Spacing.sm,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: Spacing.md,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  categoryIcon: {
    width: 32,
    height: 32,
  },
  categoryName: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  productList: {
    paddingHorizontal: Spacing.xl,
    paddingRight: Spacing.xxl,
  },
  productCard: {
    width: Math.round(width * 0.42),
    marginRight: Spacing.xl, // Daha dengeli boşluk
  },
  productImageContainer: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  stockBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 10,
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  productInfo: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  productBrand: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  productName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: Spacing.sm,
    minHeight: 38,
    lineHeight: 18,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 4,
  },
  addToCartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  // Flash indirim ürün kartı stilleri
  flashProductCard: {
    width: width * 0.45,
    marginRight: Spacing.md,
  },
  flashDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ff6b35',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  flashDiscountText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  flashTimerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashTimerText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  flashOriginalPrice: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  flashDiscountedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b35',
  },
  offerList: {
    paddingHorizontal: Spacing.xl,
  },
  offerCard: {
    width: width * 0.8,
    marginRight: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    ...Shadows.medium,
  },
  modernOfferCard: {
    width: width * 0.8,
    marginRight: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  offerGradient: {
    padding: Spacing.lg,
    position: 'relative',
  },
  offerGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.6,
  },
  offerContent: {
    position: 'relative',
    zIndex: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  offerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  modernOfferIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    ...Shadows.small,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  offerDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  offerDiscount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: Spacing.sm,
    borderRadius: 6,
    marginTop: Spacing.sm,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modernOfferTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernOfferDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 18,
  },
  modernOfferDiscount: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
  modernDiscountText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  offerBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#333',
    letterSpacing: 0.5,
  },
  sizeContainer: {
    marginBottom: 8,
  },
  sizeLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  sizeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sizeChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sizeText: {
    fontSize: 10,
    color: '#333333',
    fontWeight: '500',
  },
});