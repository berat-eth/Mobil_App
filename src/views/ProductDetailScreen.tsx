import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProductController } from '../controllers/ProductController';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { ReviewController } from '../controllers/ReviewController';
import { Product, Review, ProductVariationOption } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ReviewForm } from '../components/ReviewForm';
import { ReviewList } from '../components/ReviewList';
// VariationSelector removed
import { ProductVariationService } from '../services/ProductVariationService';
import { Colors } from '../theme/colors';
import { ModernButton } from '../components/ui/ModernButton';
import { SocialShareButtons } from '../components/SocialShareButtons';
import { ImageGallery } from '../components/ImageGallery';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslatedProductName, getTranslatedProductDescription, getTranslatedProductBrand, getTranslatedProductCategory, getTranslatedVariationName } from '../utils/translationUtils';
import { PurchaseVerificationService } from '../services/PurchaseVerificationService';
import * as FileSystem from 'expo-file-system';
import { NetworkMonitor } from '../utils/performance-utils';
import { Chatbot } from '../components/Chatbot';
import FlashDealService, { FlashDeal } from '../services/FlashDealService';
import { CampaignController, ProductRecommendation } from '../controllers/CampaignController';

// Fallback colors if Colors import fails
const fallbackColors = {
  error: '#EF4444',
  primary: '#6366F1',
  secondary: '#F59E0B',
  text: '#111827',
};

interface ProductDetailScreenProps {
  navigation: any;
  route: any;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { t, currentLanguage, isLoading: languageLoading } = useLanguage();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canUserReview, setCanUserReview] = useState<boolean | null>(null);
  const [reviewEligibilityReason, setReviewEligibilityReason] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: ProductVariationOption }>({});
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [showViewer, setShowViewer] = useState<boolean>(false);
  const [cachedUserId, setCachedUserId] = useState<number | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(true); // Varsayılan olarak açık
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [flashDealInfo, setFlashDealInfo] = useState<{
    discount: number;
    discountType: 'percentage' | 'fixed';
    originalPrice: number;
    endTime: number;
  } | null>(null);
  const [flashCountdown, setFlashCountdown] = useState<number>(0);
  const [productInteractionStartTime, setProductInteractionStartTime] = useState<number>(0);
  const [lastImageIndex, setLastImageIndex] = useState<number>(0);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const { productId } = route.params;

  useEffect(() => {
    let mounted = true;
    (async () => {
      // ✅ OPTIMIZASYON: User ID'yi önce cache'le
      const userId = await UserController.getCurrentUserId();
      if (mounted) setCachedUserId(userId);

      // ✅ OPTIMIZASYON: Tüm verileri paralel yükle
      const [productResult, userResult, favoritesResult, flashDealsResult] = await Promise.allSettled([
        ProductController.getProductById(productId),
        UserController.getCachedUserQuick(),
        userId > 0 ? UserController.getUserFavorites(userId) : Promise.resolve([]),
        FlashDealService.getActiveFlashDeals()
      ]);
      
      if (!mounted) return;

      // Ürünü işle
      if (productResult.status === 'fulfilled' && productResult.value) {
        setProduct(productResult.value);
        setCurrentPrice(productResult.value?.price || 0);
        setCurrentStock(productResult.value?.stock || 0);
        setLoading(false);
        
        // Yorumları arka planda yükle
        loadReviews().catch(() => {});
        
        // Görselleri arka planda önbelleğe indir
        setTimeout(() => {
          try {
            const isWifi = NetworkMonitor.getConnectionType() === 'wifi';
            const images = (productResult.value?.images || []).slice(0, 3);
            const downloadPromises = images.map(async (uri: string, index: number) => {
              if (!uri) return;
              const optimized = optimizeImageUrl(uri, isWifi ? 'large' : 'medium');
              await new Promise(resolve => setTimeout(resolve, index * 200));
              const filename = encodeURIComponent((optimized || uri).split('/').pop() || `img_${Date.now()}.jpg`);
              const local = `${FileSystem.cacheDirectory}${filename}`;
              try {
                const info = await FileSystem.getInfoAsync(local);
                if (!info.exists) {
                  await FileSystem.downloadAsync(optimized || uri, local, { cache: true });
                }
              } catch {}
            });
            Promise.all(downloadPromises).catch(() => {});
          } catch {}
        }, 0);
      } else {
        // Ürün yüklenemedi - loading'i kapat ve hata durumunu göster
        setLoading(false);
        if (productResult.status === 'rejected') {
          console.error('❌ Ürün yüklenirken hata:', productResult.reason);
        }
        // product null olacak, render kısmında "Ürün bulunamadı" mesajı gösterilecek
      }
      
      // Kullanıcıyı işle
      if (userResult.status === 'fulfilled' && userResult.value) {
        setCurrentUser(userResult.value);
        checkReviewEligibility().catch(() => {});
      }

      // Favorileri işle
      if (favoritesResult.status === 'fulfilled') {
        const favoriteIds = favoritesResult.value.map((fav: any) => parseInt(fav.productId));
        setIsFavorite(favoriteIds.includes(productId));
      }

      // Flash deals'ı işle
      if (flashDealsResult.status === 'fulfilled' && flashDealsResult.value) {
        setFlashDeals(flashDealsResult.value || []);
      }

      // Önerilen ürünleri yükle
      if (userId > 0) {
        loadRecommendedProducts(userId).catch(() => {});
      }
    })();
    
    // GÜVENLİK: Gerçek izleyici sayısı backend'den alınmalı
    // Şimdilik sabit bir değer kullan (güvenlik için Math.random kaldırıldı)
    const count = 5; // Backend entegrasyonu yapılana kadar sabit değer
    setViewerCount(count);
    setShowViewer(true);
    const hideTimer = setTimeout(() => setShowViewer(false), 8000);
    return () => { mounted = false; clearTimeout(hideTimer); };
  }, [productId]);

  useEffect(() => {
    if (product) {
      setProductInteractionStartTime(Date.now());
      
      // Hesaplamaları hafiflet - sadece gerekli durumlarda çalıştır
      const hasVariations = product.variations && product.variations.length > 0;
      const hasSelectedOptions = Object.keys(selectedOptions).length > 0;
      
      // Sadece varyasyon varsa ve seçim yapılmışsa hesapla
      if (hasVariations && hasSelectedOptions) {
        calculateCurrentPrice();
        calculateCurrentStock();
      } else if (!hasVariations) {
        // Varyasyon yoksa sadece temel fiyat ve stok
        setCurrentPrice(product.price);
        setCurrentStock(product.stock);
      }
    }

  }, [product, selectedOptions]);

  // Önerilen ürünleri yükle
  const loadRecommendedProducts = useCallback(async (userId: number) => {
    try {
      setLoadingRecommendations(true);
      console.log('🔄 Loading recommended products for user:', userId);
      
      // Önce önerileri dene
      const recommendations = await CampaignController.getProductRecommendations(userId, { limit: 8 });
      console.log('📦 Recommendations received:', recommendations?.length || 0);
      
      let productIds: number[] = [];
      
      if (recommendations && recommendations.length > 0) {
        // Önerilen ürün ID'lerini al ve mevcut ürünü hariç tut
        productIds = recommendations
          .map(rec => rec.productId)
          .filter(id => id && id !== productId)
          .slice(0, 6); // Maksimum 6 ürün göster
      }
      
      // Eğer öneri yoksa veya yeterli ürün yoksa, popüler ürünlerden göster
      if (productIds.length < 4) {
        console.log('📦 Not enough recommendations, loading popular products...');
        try {
          const popularProducts = await ProductController.getAllProducts(1, 20);
          const popularIds = popularProducts.products
            .filter(p => p.id !== productId && p.stock > 0)
            .map(p => p.id)
            .slice(0, 6 - productIds.length);
          
          productIds = [...productIds, ...popularIds];
        } catch (error) {
          console.error('Error loading popular products:', error);
        }
      }
      
      if (productIds.length > 0) {
        console.log('📦 Loading product details for IDs:', productIds);
        // Her ürünü detaylı olarak yükle
        const productPromises = productIds.map(id => ProductController.getProductById(id));
        const products = await Promise.allSettled(productPromises);
        
        const validProducts = products
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<Product>).value)
          .filter(p => p && p.stock > 0) // Sadece stokta olan ürünler
          .slice(0, 6); // Maksimum 6 ürün
        
        console.log('✅ Valid recommended products:', validProducts.length);
        setRecommendedProducts(validProducts);
      } else {
        console.log('⚠️ No products to show');
        setRecommendedProducts([]);
      }
    } catch (error) {
      console.error('❌ Error loading recommended products:', error);
      setRecommendedProducts([]);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [productId]);

  // Flash deal bilgisini kontrol et ve hesapla
  useEffect(() => {
    if (!product || !flashDeals || flashDeals.length === 0) {
      setFlashDealInfo(null);
      return;
    }

    const nowTs = Date.now();
    let foundDeal: FlashDeal | null = null;
    let foundProduct: any = null;

    // Ürünün hangi flash deal'de olduğunu bul
    for (const deal of flashDeals) {
      if (deal.products && Array.isArray(deal.products)) {
        const dealProduct = deal.products.find((p: any) => p.id === product.id);
        if (dealProduct) {
          foundDeal = deal;
          foundProduct = dealProduct;
          break;
        }
      }
    }

    if (!foundDeal || !foundProduct) {
      setFlashDealInfo(null);
      return;
    }

    // Bitiş zamanını hesapla
    const endDate = foundDeal.end_date ? new Date(foundDeal.end_date).getTime() : 0;
    const remainSec = Math.max(0, Math.floor((endDate - nowTs) / 1000));

    if (remainSec <= 0) {
      setFlashDealInfo(null);
      return;
    }

    // İndirim bilgisini hesapla
    const discountType = foundDeal.discount_type || 'percentage';
    const discountValue = Number(foundDeal.discount_value) || 0;
    let discount = 0;
    let originalPrice = product.price;

    if (discountType === 'percentage') {
      discount = discountValue;
      if (discount > 0 && discount < 100 && product.price > 0) {
        originalPrice = product.price / (1 - discount / 100);
      } else {
        setFlashDealInfo(null);
        return;
      }
    } else if (discountType === 'fixed') {
      if (discountValue > 0 && product.price > 0) {
        discount = (discountValue / product.price) * 100;
        originalPrice = product.price + discountValue;
      } else {
        setFlashDealInfo(null);
        return;
      }
    } else {
      setFlashDealInfo(null);
      return;
    }

    // Discount geçerli bir sayı değilse flash deal bilgisini ayarlama
    if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
      setFlashDealInfo(null);
      return;
    }

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      setFlashDealInfo(null);
      return;
    }

    setFlashDealInfo({
      discount: Math.round(discount * 100) / 100, // 2 ondalık basamağa yuvarla
      discountType,
      originalPrice: Math.round(originalPrice * 100) / 100,
      endTime: remainSec
    });
    setFlashCountdown(remainSec);
  }, [product, flashDeals]);

  // Flash deal countdown timer
  useEffect(() => {
    if (!flashDealInfo) {
      return;
    }

    // Countdown'u flashDealInfo'nun endTime'ına göre güncelle
    setFlashCountdown(flashDealInfo.endTime);

    const interval = setInterval(() => {
      setFlashCountdown((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          setFlashDealInfo(null);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [flashDealInfo]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const prod = await ProductController.getProductById(productId);
      
      if (!prod) {
        // Ürün yüklenemedi
        setLoading(false);
        return;
      }
      
      setProduct(prod);
      setCurrentPrice(prod?.price || 0);
      setCurrentStock(prod?.stock || 0);
      
      // Loading'i hemen kapat - UI'ı bloklamasın
      setLoading(false);
      
      // Yorumları arka planda sadece bu ürün için yükle
      loadReviews().catch(() => {});

      // Görselleri arka planda önbelleğe indir (ağ tipine göre kalite/boyut seç)
      setTimeout(() => {
        try {
          const isWifi = NetworkMonitor.getConnectionType() === 'wifi';
          const images = (prod?.images || []).slice(0, 3);
          // Eşzamanlı indirme sayısını düşür
          const downloadPromises = images.map(async (uri: string, index: number) => {
            if (!uri) return;
            // Basit kalite değişimi: Wi‑Fi değilse medium varyantı iste
            const optimized = optimizeImageUrl(uri, isWifi ? 'large' : 'medium');
            // Staggered download - her 200ms'de bir başlat
            await new Promise(resolve => setTimeout(resolve, index * 200));
            const filename = encodeURIComponent((optimized || uri).split('/').pop() || `img_${Date.now()}.jpg`);
            const local = `${FileSystem.cacheDirectory}${filename}`;
            try {
              const info = await FileSystem.getInfoAsync(local);
              if (!info.exists) {
                await FileSystem.downloadAsync(optimized || uri, local, { cache: true });
              }
            } catch {}
          });
          Promise.all(downloadPromises).catch(() => {});
        } catch {}
      }, 0);
    } catch (error) {
      console.error('Error loading product:', error);
      setLoading(false);
    }
  };

  const calculateCurrentPrice = () => {
    if (!product) return;
    
    // Varyasyonlar ürün fiyatına ek fiyat eklemesin
    setCurrentPrice(product.price);
  };

  const calculateCurrentStock = () => {
    if (!product) return;
    const hasVariationsArray = Array.isArray(product.variations) && product.variations.length > 0;
    
    if (!hasVariationsArray || Object.keys(selectedOptions).length === 0) {
      setCurrentStock(product.stock);
      return;
    }

    // Get minimum stock from selected options using the service
    const minStock = ProductVariationService.getMinimumStock(selectedOptions);
    setCurrentStock(minStock);
  };


  const handleVariationChange = (newSelectedOptions: { [key: string]: ProductVariationOption }) => {
    setSelectedOptions(newSelectedOptions);
    
    // Varyant seçimi tracking
    if (product) {
      // Varyant string'ini yeni seçimlerden hesapla
      const hasVariationsArray = Array.isArray(product.variations) && product.variations.length > 0;
      if (hasVariationsArray) {
        const variantString = ProductVariationService.getSelectedVariationString(
          (product.variations as any[]) || [],
          newSelectedOptions
        );
        if (variantString) {
        }
      }
    }
  };

  const isAllVariationsSelected = () => {
    if (!product) return true;
    const hasVariationsArray = Array.isArray(product.variations) && product.variations.length > 0;
    if (!hasVariationsArray) return true;
    return ProductVariationService.areAllVariationsSelected((product.variations as any[]) || [], selectedOptions);
  };

  const getSelectedVariationString = () => {
    if (!product) return '';
    const hasVariationsArray = Array.isArray(product.variations) && product.variations.length > 0;
    if (!hasVariationsArray) return '';
    return ProductVariationService.getSelectedVariationString((product.variations as any[]) || [], selectedOptions);
  };

  // Beden seçimi için yardımcılar
  const getSizeVariationIds = (): string[] => {
    try {
      const variationsArray: any[] = Array.isArray((product as any)?.variations) ? ((product as any).variations as any[]) : [];
      const ids: string[] = [];
      
      // Geliştirilmiş beden algılama fonksiyonu
      const isSizeVariation = (variation: any): boolean => {
        if (!variation) return false;
        
        // Backend'den gelen isSizeVariation flag'ini kontrol et
        if (variation.isSizeVariation === true) return true;
        
        // Varyasyon ismini normalize et ve kontrol et
        const name = String(variation.name || '').trim().toLowerCase();
        if (!name) return false;
        
        // Daha kapsamlı beden anahtar kelimeleri
        const sizeKeywords = ['beden', 'size', 'numara', 'ölçü', 'boyut', 'bedenler', 'sizes'];
        return sizeKeywords.some(keyword => name.includes(keyword));
      };
      
      variationsArray.forEach((v: any) => {
        // Sadece options'ı olan varyasyonları ekle
        const options = Array.isArray(v.options) ? v.options : [];
        if (options.length > 0 && isSizeVariation(v)) {
          const vid = String(v.id ?? v.name ?? 'var');
          ids.push(vid);
        }
      });
      return ids;
    } catch { return []; }
  };

  const isSizeSelectionRequired = (): boolean => {
    const sizeIds = getSizeVariationIds();
    return sizeIds.length > 0;
  };

  const isSizeSelected = (): boolean => {
    const sizeIds = getSizeVariationIds();
    if (sizeIds.length === 0) return true;
    return sizeIds.every(id => !!selectedOptions[id]);
  };

  // Basit inline varyasyon seçici (beden/renk vs.)
  const renderVariationSelector = () => {
    try {
      const variationsArray: any[] = Array.isArray((product as any)?.variations) ? ((product as any).variations as any[]) : [];
      if (!variationsArray || variationsArray.length === 0) return null;

      return (
        <View>
          {variationsArray.map((variation: any) => {
            const variationId = String(variation.id ?? variation.name ?? 'var');
            const options: any[] = Array.isArray(variation.options) ? variation.options : [];
            return (
              <View key={variationId} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
                  {variation.name || 'Varyasyon'}
                </Text>
                <View style={styles.availableSizes}>
                  {options.map((opt: any, idx: number) => {
                    const isSelected = selectedOptions[variationId]?.value === opt.value;
                    const disabled = (opt.stock ?? 0) <= 0;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.sizeChip, isSelected && { backgroundColor: '#111827', borderColor: '#111827' }, disabled && { opacity: 0.5 }]}
                        onPress={() => {
                          if (disabled) return;
                          const next: any = { ...selectedOptions };
                          next[variationId] = {
                            ...(opt as ProductVariationOption),
                            value: String(opt.value || ''),
                            priceModifier: Number(opt.priceModifier || 0),
                            stock: Number(opt.stock || 0)
                          } as any;
                          setSelectedOptions(next);
                        }}
                        disabled={disabled}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.sizeText, isSelected && { color: '#FFFFFF' }]}>{String(opt.value || '-')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      );
    } catch {
      return null;
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await UserController.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        await loadUserReview(user.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadReviews = async () => {
    try {
      const productReviews = await ReviewController.getReviewsByProductId(productId);
      setReviews(productReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadUserReview = async (userId: number) => {
    try {
      const review = await ReviewController.getUserReview(productId, userId);
      setUserReview(review);
    } catch (error) {
      console.error('Error loading user review:', error);
    }
  };

  const checkReviewEligibility = async () => {
    try {
      const eligibility = await PurchaseVerificationService.canUserReview(productId);
      setCanUserReview(eligibility.canReview);
      setReviewEligibilityReason(eligibility.reason || '');
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanUserReview(false);
      setReviewEligibilityReason(t('reviews.purchaseVerificationError'));
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // ✅ OPTIMIZASYON: Cache'lenmiş userId kullan
    const userId = cachedUserId || await UserController.getCurrentUserId();
    
    if (!userId || userId <= 0) {
      Alert.alert(
        'Üyelik Gerekli', 
        'Alışveriş yapabilmek için lütfen giriş yapın veya üye olun.', 
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap / Üye Ol', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }

    // Sadece beden seçimini zorunlu tut
    if (isSizeSelectionRequired() && !isSizeSelected()) {
      Alert.alert(
        'Beden Seçimi Gerekli', 
        'Bu ürünü sepete eklemek için önce beden seçimi yapmanız gerekiyor. Lütfen istediğiniz bedeni seçin.',
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
      return;
    }

    // Stok kontrolü - stok 0 ise uyarı ver ama butonu devre dışı bırakma
    if (currentStock <= 0) {
      Alert.alert('Stokta Yok', 'Bu ürün şu anda stokta bulunmamaktadır.');
      return;
    }

    if (currentStock < quantity) {
      Alert.alert('Hata', 'Seçilen miktar stoktan fazla.');
      return;
    }

    setAddingToCart(true);
    try {
      const userId = currentUser.id;
      const result = await CartController.addToCart(
        userId,
        product.id,
        quantity,
        selectedOptions
      );

      if (result.success) {
        Alert.alert('Başarılı', result.message, [
          { text: 'Tamam' },
          { 
            text: 'Sepete Git', 
            onPress: () => navigation.navigate('Cart') 
          }
        ]);
        setQuantity(1);
        setSelectedOptions({});
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSubmit = async (rating: number, comment: string, media?: any[]) => {
    if (!currentUser) {
      Alert.alert('Hata', 'Yorum yapmak için giriş yapmanız gerekiyor.');
      return;
    }

    setSubmittingReview(true);
    try {
      let result;
      
      if (userReview) {
        // Update existing review
        result = await ReviewController.updateReview(userReview.id, rating, comment, media);
      } else {
        // Add new review
        result = await ReviewController.addReview(
          productId,
          currentUser.id,
          currentUser.name,
          rating,
          comment,
          media
        );
      }

      if (result.success) {
        Alert.alert('Başarılı', result.message);
        setShowReviewForm(false);
        await loadReviews();
        await loadUserReview(currentUser.id);
        await loadProduct(); // Refresh product rating
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Yorum gönderilirken bir hata oluştu');
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const user = await UserController.getCurrentUser();
      if (!user) {
        setIsFavorite(false);
        return;
      }
      const userId = await UserController.getCurrentUserId();
      const isFav = await UserController.isProductFavorite(userId, productId);
      setIsFavorite(isFav);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const user = await UserController.getCurrentUser();
      if (!user) {
        Alert.alert('Giriş gerekli', 'Favorilere eklemek için lütfen giriş yapın.');
        return;
      }
      // ✅ OPTIMIZASYON: Cache'lenmiş userId kullan
      const userId = cachedUserId || await UserController.getCurrentUserId();
      
      if (isFavorite) {
        const success = await UserController.removeFromFavorites(userId, productId);
        if (success) {
          setIsFavorite(false);
          Alert.alert('Başarılı', 'Ürün favorilerden çıkarıldı');
        } else {
          Alert.alert('Hata', 'Ürün favorilerden çıkarılamadı');
        }
      } else {
        const success = await UserController.addToFavorites(userId, productId, {
          name: product?.name,
          price: product?.price,
          image: product?.image,
          images: product?.images || [],
          brand: product?.brand,
          description: product?.description,
          category: product?.category,
          stock: product?.stock,
          rating: product?.rating,
          reviewCount: product?.reviewCount
        });
        if (success) {
          setIsFavorite(true);
          Alert.alert('Başarılı', 'Ürün favorilere eklendi');
        } else {
          Alert.alert('Hata', 'Ürün favorilere eklenemedi');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Hata', 'Favori işlemi sırasında bir hata oluştu');
    }
  };

  const handleReviewUpdate = async () => {
    await loadReviews();
    if (currentUser) {
      await loadUserReview(currentUser.id);
    }
    await loadProduct(); // Refresh product rating
  };

  const increaseQuantity = () => {
    if (quantity < currentStock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading || languageLoading) {
    return <LoadingIndicator />;
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color={(Colors && Colors.error) || fallbackColors.error} />
          <Text style={styles.errorTitle}>Ürün Bulunamadı</Text>
          <Text style={styles.errorMessage}>
            Ürün detayları yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadProduct();
            }}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Galeri görsellerini ürünle ilişkili olacak şekilde filtrele
  const gatherGalleryImages = (): string[] => {
    // Boşları at, tekrarları kaldır; tüm geçerli görselleri göster
    const candidates: (string | undefined)[] = [
      product.image1,
      product.image2,
      product.image3,
      product.image4,
      product.image5,
    ];
    const arrayImages = Array.isArray(product.images) ? product.images.filter((u: any) => typeof u === 'string') : [];
    const list: string[] = [...candidates.filter((u): u is string => typeof u === 'string'), ...arrayImages]
      .filter((u: string) => u.trim() !== '');

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const u of list) {
      const key = u.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(u);
      }
    }

    // Çok fazlaysa ilk 15 ile sınırla
    return unique.slice(0, 15);
  };

  const galleryImages = gatherGalleryImages();

  // Basit URL optimizasyonu: ticimax cloud için "buyuk" → "orta"/"kucuk" varyantı dene
  function optimizeImageUrl(url: string, quality: 'large' | 'medium' = 'large'): string | null {
    try {
      if (!url) return null;
      if (quality === 'large') return url;
      // Heuristik: /UrunResimleri/buyuk/ → medium için /orta/, düşük için /kucuk/
      const medium = url.replace(/\/UrunResimleri\/buyuk\//i, '/UrunResimleri/orta/');
      if (medium !== url) return medium;
      return url;
    } catch { return null; }
  }

  // Flash deal countdown formatı (Gün:Saat:Dakika:Saniye)
  const formatHMS = (totalSeconds: number) => {
    const sec = Math.max(0, totalSeconds);
    const d = Math.floor(sec / 86400); // Gün
    const h = Math.floor((sec % 86400) / 3600); // Saat
    const m = Math.floor((sec % 3600) / 60); // Dakika
    const s = sec % 60; // Saniye
    return `${d.toString().padStart(3, '0')}:${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showViewer && (
          <View style={styles.viewerToast}>
            <Icon name="visibility" size={16} color="#1A1A1A" />
            <Text style={styles.viewerToastText}>Bu ürünü şu anda {viewerCount} kişi inceliyor</Text>
          </View>
        )}
        {/* Ana Görsel Galerisi */}
        <View style={styles.imageContainer}>
          <ImageGallery
            images={galleryImages?.slice(0, 10) || []} // İlk 10 görseli göster
            mainImage={product.image || galleryImages?.[0] || 'https://via.placeholder.com/400x400?text=No+Image'}
            style={styles.imageGallery}
            showThumbnails={true}
            onImageChange={(index: number) => {
              // Carousel swipe tracking
              if (product && index !== lastImageIndex) {
                setLastImageIndex(index);
              }
            }}
          />
          
          {/* Favori Butonu */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          >
            <Icon
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={24}
              color={isFavorite ? ((Colors && Colors.secondary) || fallbackColors.secondary) : ((Colors && Colors.text) || fallbackColors.text)}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{getTranslatedProductName(product, currentLanguage)}</Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.rating}>{product.rating}</Text>
            <Text style={styles.reviewCount}>
              ({product.reviewCount} değerlendirme)
            </Text>
          </View>

          {/* Flash İndirim Bilgisi */}
          {flashDealInfo && 
           typeof flashDealInfo.discount === 'number' && 
           flashDealInfo.discount > 0 && 
           Number.isFinite(flashDealInfo.discount) && (
            <View style={styles.flashDealContainer}>
              <View style={styles.flashDiscountBadge}>
                <Icon name="flash-on" size={16} color="white" />
                <Text style={styles.flashDiscountText}>
                  %{Math.round(flashDealInfo.discount)} İndirim
                </Text>
              </View>
              <View style={styles.flashTimerBadge}>
                <Icon name="timer" size={14} color="white" />
                <Text style={styles.flashTimerText}>{formatHMS(flashCountdown)}</Text>
              </View>
            </View>
          )}

          <View style={styles.priceContainer}>
            {flashDealInfo && flashDealInfo.originalPrice > currentPrice && (
              <Text style={styles.originalPrice}>
                {ProductController.formatPrice(flashDealInfo.originalPrice)}
              </Text>
            )}
            <Text style={[styles.price, flashDealInfo && styles.flashPrice]}>
              {ProductController.formatPrice(currentPrice)}
            </Text>
          </View>

          {currentStock > 0 && (
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Adet:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={decreaseQuantity}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={increaseQuantity}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mevcut Bedenler (seçim zorunlu, stokta olmayanlar kırmızı çarpı ile) */}
          {Array.isArray(product.variations) && product.variations.length > 0 && (() => {
            // Debug: Varyasyonları logla
            console.log(`🔍 ProductDetail: Toplam ${product.variations.length} varyasyon var`, 
              product.variations.map((v: any) => ({ 
                name: v.name, 
                optionsCount: v.options?.length || 0,
                isSizeVariation: v.isSizeVariation 
              }))
            );
            
            // Geliştirilmiş beden algılama fonksiyonu
            const isSizeVariation = (variation: any): boolean => {
              if (!variation) return false;
              
              // Backend'den gelen isSizeVariation flag'ini kontrol et
              if (variation.isSizeVariation === true) return true;
              
              // Varyasyon ismini normalize et ve kontrol et
              const name = String(variation.name || '').trim().toLowerCase();
              if (!name) return false;
              
              // Daha kapsamlı beden anahtar kelimeleri
              const sizeKeywords = ['beden', 'size', 'numara', 'ölçü', 'boyut', 'bedenler', 'sizes'];
              const isSize = sizeKeywords.some(keyword => name.includes(keyword));
              
              if (isSize) {
                console.log(`✅ Beden varyasyonu bulundu: "${variation.name}"`);
              }
              
              return isSize;
            };
            
            // Beden varyasyonlarını filtrele
            const sizeVariations: any[] = (product.variations as any[])
              .filter(v => {
                const isSize = isSizeVariation(v);
                if (isSize) {
                  console.log(`📏 Beden varyasyonu: "${v.name}", options: ${v.options?.length || 0}`);
                }
                return isSize;
              })
              .filter(v => {
                // Options kontrolü - en az 1 option olmalı
                const options = Array.isArray(v.options) ? v.options : [];
                const hasOptions = options.length > 0;
                if (!hasOptions && isSizeVariation(v)) {
                  console.warn(`⚠️ Beden varyasyonu "${v.name}" options'ı boş!`);
                }
                return hasOptions;
              }) as any[];
            
            console.log(`📊 Beden varyasyonları: ${sizeVariations.length} adet`);
            
            // Eğer beden varyasyonu yoksa, hiçbir şey render etme
            if (!sizeVariations || sizeVariations.length === 0) {
              console.warn(`⚠️ ProductDetail: Beden varyasyonu bulunamadı! Toplam varyasyon: ${product.variations.length}`);
              return null;
            }
            
            return (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.variationLabel}>Mevcut Bedenler</Text>
                {sizeVariations.map((variation: any) => {
                  const variationId = String(variation.id ?? variation.name ?? 'var');
                  const options: any[] = Array.isArray(variation.options) ? variation.options : [];
                  
                  // Options yoksa bu varyasyonu atla
                  if (options.length === 0) return null;
                  
                  return (
                    <View key={variationId} style={styles.availableSizes}>
                      {options.map((opt: any, idx: number) => {
                        // Option değerlerini normalize et
                        const optValue = String(opt?.value || '').trim();
                        if (!optValue) return null;
                        
                        const disabled = Number(opt?.stock || 0) <= 0;
                        const isSelected = String(selectedOptions[variationId]?.value) === optValue;
                        
                        return (
                          <TouchableOpacity
                            key={`${variationId}-${idx}`}
                            style={[
                              styles.sizeChip,
                              isSelected && { backgroundColor: '#111827', borderColor: '#111827' },
                              disabled && { opacity: 0.6 }
                            ]}
                            onPress={() => {
                              if (disabled) return;
                              const next: any = { ...selectedOptions };
                              next[variationId] = {
                                ...(opt as ProductVariationOption),
                                value: optValue,
                                stock: Number(opt.stock || 0)
                              } as any;
                              setSelectedOptions(next);
                            }}
                            disabled={disabled}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.sizeText, isSelected && { color: '#FFFFFF' }]}>
                              {optValue}
                            </Text>
                            {disabled && (
                              <View style={{ position: 'absolute', right: -6, top: -8 }}>
                                <Text style={{ color: '#FF3B30', fontWeight: '800', fontSize: 14 }}>🚫</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                {!isSizeSelected() && (
                  <View style={styles.variationWarning}>
                    <Icon name="warning" size={20} color="#FF6B35" />
                    <Text style={styles.variationWarningText}>Sepete eklemek için beden seçimi yapmanız gerekiyor!</Text>
                  </View>
                )}
              </View>
            );
          })()}

          <View style={styles.stockContainer}>
            {currentStock > 0 ? (
              <>
                <Text style={styles.stockText}>Stok: {currentStock} adet</Text>
                {currentStock < 5 && (
                  <Text style={styles.lowStock}>Son {currentStock} adet!</Text>
                )}
              </>
            ) : (
              <Text style={styles.outOfStock}>Tükendi</Text>
            )}
          </View>

          {/* Varyasyonlar bölümü kaldırıldı */}

          <View style={styles.descriptionContainer}>
            <TouchableOpacity
              style={[styles.descriptionHeader, !isDescriptionExpanded && { marginBottom: 0 }]}
              onPress={() => {
                setIsDescriptionExpanded(!isDescriptionExpanded);
                // Description view tracking
                if (product) {
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>{t('productDetail.description')}</Text>
              <Icon
                name={isDescriptionExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color="#1A1A1A"
              />
            </TouchableOpacity>
            {isDescriptionExpanded && (
              <Text style={styles.description}>{getTranslatedProductDescription(product, currentLanguage)}</Text>
            )}
          </View>

          {/* XML'den gelen ek bilgiler (varsa) */}
          {(product.categoryTree || product.productUrl || product.salesUnit || typeof product.totalImages === 'number') && (
            <View style={styles.extraCard}>
              <View style={styles.extraHeaderRow}>
                <Icon name="info" size={18} color="#1A1A1A" />
                <Text style={styles.extraHeaderText}>Ek Bilgiler</Text>
              </View>

              <View style={styles.extraChipsContainer}>
                {product.categoryTree ? (
                  <View style={styles.extraChip}>
                    <Icon name="category" size={16} color="#6b7280" />
                    <Text style={styles.extraChipLabel}>Kategori</Text>
                    <Text style={styles.extraChipValue} numberOfLines={1}>
                      {product.categoryTree}
                    </Text>
                  </View>
                ) : null}

                {product.salesUnit ? (
                  <View style={styles.extraChip}>
                    <Icon name="sell" size={16} color="#6b7280" />
                    <Text style={styles.extraChipLabel}>Satış Birimi</Text>
                    <Text style={styles.extraChipValue}>{product.salesUnit}</Text>
                  </View>
                ) : null}

                {typeof product.totalImages === 'number' ? (
                  <View style={styles.extraChip}>
                    <Icon name="image" size={16} color="#6b7280" />
                    <Text style={styles.extraChipLabel}>Görseller</Text>
                    <Text style={styles.extraChipValue}>{product.totalImages}</Text>
                  </View>
                ) : null}

                {product.productUrl ? (
                  <TouchableOpacity
                    style={[styles.extraChip, styles.extraLinkChip]}
                    onPress={() => {
                      try {
                        if (product.productUrl) Linking.openURL(product.productUrl);
                      } catch (_) {}
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon name="open-in-new" size={16} color="#1e3c72" />
                    <Text style={[styles.extraChipLabel, { color: '#1e3c72' }]}>Ürün Sayfası</Text>
                    <Text style={[styles.extraChipValue, { color: '#1e3c72' }]} numberOfLines={1}>
                      Aç
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          {/* Size Özel Önerilenler */}
          {recommendedProducts.length > 0 && (
            <View style={styles.recommendedSection}>
              <View style={styles.recommendedHeader}>
                <Icon name="star" size={24} color="#FF6B35" />
                <Text style={styles.recommendedTitle}>Size Özel Önerilenler</Text>
              </View>
              {loadingRecommendations ? (
                <View style={styles.recommendedLoading}>
                  <LoadingIndicator />
                </View>
              ) : (
                <FlatList
                  data={recommendedProducts}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.recommendedList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.recommendedItem}
                      onPress={() => {
                        navigation.push('ProductDetail', { productId: item.id });
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: item.image || 'https://via.placeholder.com/150x150?text=No+Image' }}
                        style={styles.recommendedImage}
                        resizeMode="cover"
                      />
                      <View style={styles.recommendedInfo}>
                        <Text style={styles.recommendedName} numberOfLines={2}>
                          {getTranslatedProductName(item, currentLanguage)}
                        </Text>
                        <Text style={styles.recommendedPrice}>
                          {ProductController.formatPrice(item.price)}
                        </Text>
                        {item.stock <= 5 && item.stock > 0 && (
                          <Text style={styles.recommendedStock}>Son {item.stock} adet!</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          {/* Sosyal Paylaşım Bölümü */}
          <SocialShareButtons
            productId={product.id.toString()}
            productName={getTranslatedProductName(product, currentLanguage)}
            productPrice={currentPrice}
            productImage={product.image}
            productBrand={product.brand}
            productDescription={getTranslatedProductDescription(product, currentLanguage)}
            onShareSuccess={(platform, expGained) => {
              console.log(`Paylaşım başarılı: ${platform}, +${expGained} EXP`);
            }}
          />

          {/* Review Section */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
              {currentUser && (
                <TouchableOpacity
                  style={[
                    styles.addReviewButton,
                    canUserReview === false && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (canUserReview === false) {
                      Alert.alert(
                        t('reviews.cannotReview'),
                        reviewEligibilityReason || t('reviews.purchaseRequired')
                      );
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                  disabled={canUserReview === false}
                >
                  <Text style={[
                    styles.addReviewButtonText,
                    canUserReview === false && styles.disabledButtonText
                  ]}>
                    {userReview ? 'Yorumumu Düzenle' : 'Yorum Yap'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <ReviewList
              reviews={reviews}
              currentUserId={currentUser?.id}
              onReviewUpdate={handleReviewUpdate}
            />
          </View>
        </View>
      </ScrollView>


      <View style={[styles.footer, { bottom: 70 + Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            currentStock <= 0 && styles.outOfStockButton,
            (addingToCart || (isSizeSelectionRequired() && !isSizeSelected())) && styles.disabledButton
          ]}
          onPress={handleAddToCart}
          disabled={addingToCart || (isSizeSelectionRequired() && !isSizeSelected())}
        >
          <Text style={[
            styles.addToCartText,
            currentStock <= 0 && styles.outOfStockText
          ]}>
            {addingToCart 
              ? 'Ekleniyor...' 
              : currentStock <= 0 
                ? 'Stokta Yok' 
                : (isSizeSelectionRequired() && !isSizeSelected() 
                  ? 'Beden Seçin' 
                  : 'Sepete Ekle')}
          </Text>
        </TouchableOpacity>
      </View>

      <ReviewForm
        visible={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        onSubmit={handleReviewSubmit}
        review={userReview}
        loading={submittingReview}
      />
      
      {/* Chatbot */}
      <Chatbot navigation={navigation} productId={productId} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
  },
  imageGallery: {
    height: 400,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  brand: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '400',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 26,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingStar: {
    fontSize: 16,
    marginRight: 6,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginRight: 6,
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -1,
  },
  flashPrice: {
    color: '#ff6b35',
  },
  originalPrice: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  flashDealContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  flashDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  flashDiscountText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  flashTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  flashTimerText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  variationInfo: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  variationLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  variationValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  stockContainer: {
    marginBottom: 24,
  },
  stockText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  lowStock: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 4,
    fontWeight: '500',
  },
  outOfStock: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  variationSection: {
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
  },
  variationSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  selectedVariationSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  selectedVariationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedVariationItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  selectedVariationLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    minWidth: 80,
  },
  selectedVariationValue: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
    fontWeight: '500',
  },
  priceModifier: {
    color: '#000000',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 32,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#48484A',
    lineHeight: 22,
    fontWeight: '400',
  },
  extraInfoContainer: {
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  extraCard: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  extraHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  extraHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  extraChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  extraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  extraLinkChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  extraChipLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extraChipValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  extraInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  extraInfoLabel: {
    minWidth: 120,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  extraInfoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    marginRight: 16,
    fontWeight: '500',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  quantity: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 120, // Footer için alan bırak (artırıldı)
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  addToCartButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  outOfStockButton: {
    backgroundColor: '#9CA3AF',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#CCCCCC',
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outOfStockText: {
    color: '#FFFFFF',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewerToast: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewerToastText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  // Recommended Products Styles
  recommendedSection: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  recommendedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  recommendedLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  recommendedList: {
    paddingRight: 16,
  },
  recommendedItem: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendedImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F0F0',
  },
  recommendedInfo: {
    padding: 12,
  },
  recommendedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    minHeight: 40,
  },
  recommendedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 4,
  },
  recommendedStock: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600',
  },
  availableSizes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  sizeStockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sizeStockItem: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minWidth: 60,
  },
  sizeChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 56,
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
  },
  variationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
    marginBottom: 12,
  },
  variationWarningText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  disabledButtonText: {
    color: '#999999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: (Colors && Colors.primary) || fallbackColors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 200,
  },
  backButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});