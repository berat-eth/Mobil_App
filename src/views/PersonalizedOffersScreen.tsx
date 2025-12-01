import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CampaignController } from '../controllers/CampaignController';
import { PersonalizationController, PersonalizedContent, PersonalizedOffer } from '../controllers/PersonalizationController';
import { Product } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { EmptyState } from '../components/EmptyState';
import { UserController } from '../controllers/UserController';

const { width } = Dimensions.get('window');

// Cache keys
const CACHE_KEY = 'personalized_content_cache';
const CACHE_TIMESTAMP_KEY = 'personalized_content_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
const USER_ID_CACHE_KEY = 'cached_user_id';
const USER_ID_CACHE_DURATION = 60 * 1000; // 1 dakika

export default function PersonalizedOffersScreen() {
  const navigation = useNavigation<any>();
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const lastRequestTimeRef = useRef<number>(0);
  const requestCooldown = 2000; // 2 saniye minimum bekleme

  useEffect(() => {
    loadPersonalizedContent();
  }, []);

  // Cached user ID helper
  const getCachedUserId = async (): Promise<number | null> => {
    try {
      const cached = await AsyncStorage.getItem(USER_ID_CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(`${USER_ID_CACHE_KEY}_timestamp`);
      
      if (cached && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        if (Date.now() - timestamp < USER_ID_CACHE_DURATION) {
          return parseInt(cached, 10);
        }
      }
      
      const userId = await UserController.getCurrentUserId();
      if (userId && userId > 0) {
        await AsyncStorage.setItem(USER_ID_CACHE_KEY, userId.toString());
        await AsyncStorage.setItem(`${USER_ID_CACHE_KEY}_timestamp`, Date.now().toString());
      }
      return userId;
    } catch (error) {
      console.error('Error getting cached user ID:', error);
      return await UserController.getCurrentUserId();
    }
  };

  // Load from cache
  const loadFromCache = async (): Promise<PersonalizedContent | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  };

  // Save to cache
  const saveToCache = async (content: PersonalizedContent) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(content));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Retry with exponential backoff for 429 errors
  // GEVŞETİLDİ: Retry sayısı 3'ten 5'e, base delay 1000ms'den 500ms'ye çıkarıldı
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 500
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // 429 hatası kontrolü
        const is429Error = 
          error?.status === 429 || 
          error?.response?.status === 429 ||
          (error?.message && error.message.includes('429')) ||
          (error?.message && error.message.includes('Too many requests'));
        
        if (is429Error && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
          console.log(`⏳ Rate limit (429) - ${delay}ms bekleniyor (deneme ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 429 değilse veya son denemeyse throw et
        throw error;
      }
    }
    
    throw lastError;
  };

  const loadPersonalizedContent = async (forceRefresh: boolean = false) => {
    // Request deduplication - aynı anda birden fazla istek gönderme
    if (loadingRef.current) {
      console.log('⏸️ Zaten yükleme devam ediyor, istek atlandı');
      return;
    }

    // Cooldown kontrolü
    const now = Date.now();
    if (!forceRefresh && now - lastRequestTimeRef.current < requestCooldown) {
      console.log('⏸️ Cooldown süresi dolmadı, istek atlandı');
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setErrorMessage(null);

      // Önce cache'den yükle (force refresh değilse)
      if (!forceRefresh) {
        const cached = await loadFromCache();
        if (cached) {
          console.log('✅ Cache\'den yüklendi');
          setPersonalizedContent(cached);
          setLoading(false);
          loadingRef.current = false;
          return;
        }
      }

      // User ID'yi cache'den al
      const userId = await getCachedUserId();
      
      if (!userId || userId <= 0) {
        setPersonalizedContent(null);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Retry logic ile API çağrısı
      const content = await retryWithBackoff(
        () => PersonalizationController.generatePersonalizedContent(userId),
        3,
        2000 // 2 saniye base delay
      );

      setPersonalizedContent(content);
      await saveToCache(content);
      lastRequestTimeRef.current = Date.now();
      
    } catch (error: any) {
      console.error('Error loading personalized content:', error);
      
      // 429 hatası için özel mesaj
      const is429Error = 
        error?.status === 429 || 
        error?.response?.status === 429 ||
        (error?.message && error.message.includes('429')) ||
        (error?.message && error.message.includes('Too many requests'));
      
      if (is429Error) {
        setErrorMessage('Çok fazla istek gönderildi. Lütfen birkaç saniye sonra tekrar deneyin.');
        // Cache'den yükle
        const cached = await loadFromCache();
        if (cached) {
          setPersonalizedContent(cached);
        }
      } else {
        setPersonalizedContent(null);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const onRefresh = async () => {
    if (loadingRef.current) return;
    
    setRefreshing(true);
    // Cache'i temizle ve force refresh yap
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
    
    await loadPersonalizedContent(true);
    setRefreshing(false);
  };

  const handleOfferPress = async (offer: PersonalizedOffer) => {
    try {
      // Apply offer logic here
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

  const applyOffer = async (offer: PersonalizedOffer) => {
    // This would apply the offer to the user's cart or account
    Alert.alert('Başarılı', 'Kampanya uygulandı!');
  };

  const handleProductPress = (product: Product) => {
    if (navigation) {
      navigation.navigate('ProductDetail', { productId: product.id });
    } else {
      console.warn('Navigation not available');
    }
  };

  const renderOfferCard = (offer: PersonalizedOffer, index: number) => (
    <TouchableOpacity
      key={offer.id}
      style={[styles.offerCard, { backgroundColor: getOfferColor(offer.type) }]}
      onPress={() => handleOfferPress(offer)}
    >
      <View style={styles.offerHeader}>
        <View style={styles.offerIcon}>
          <Icon name={getOfferIcon(offer.type)} size={24} color="white" />
        </View>
        <View style={styles.offerInfo}>
          <Text style={styles.offerTitle}>{offer.title}</Text>
          <Text style={styles.offerDescription}>{offer.description}</Text>
        </View>
      </View>
      
      {offer.discountAmount && (
        <View style={styles.offerDiscount}>
          <Text style={styles.discountText}>
            {offer.discountType === 'percentage' 
              ? `%${offer.discountAmount} İndirim`
              : `${offer.discountAmount} TL İndirim`
            }
          </Text>
        </View>
      )}
      
      <View style={styles.offerReason}>
        <Text style={styles.reasonText}>💡 {offer.reason}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProductCard = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.productCard}
      onPress={() => handleProductPress(product)}
    >
      <Image 
        source={{ uri: product.image || 'https://via.placeholder.com/300x300?text=No+Image' }} 
        style={styles.productImage} 
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>
          {product.price.toFixed(2)} TL
        </Text>
        {product.category && (
          <Text style={styles.productCategory}>{product.category}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleCategoryPress = (category: string) => {
    if (navigation) {
      navigation.navigate('ProductList', { category });
    }
  };

  const renderCategorySuggestion = (category: string) => (
    <TouchableOpacity 
      key={category} 
      style={styles.categoryChip}
      onPress={() => handleCategoryPress(category)}
    >
      <Text style={styles.categoryText}>{category}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Size Özel Teklifler</Text>
        </View>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (!personalizedContent && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Size Özel Teklifler</Text>
        </View>
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={48} color="#ff6b6b" />
            <Text style={styles.errorTitle}>İstek Limiti Aşıldı</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => loadPersonalizedContent(true)}
            >
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <EmptyState
            title="Teklif Bulunamadı"
            message="Size özel teklifler henüz hazır değil. Giriş yaparak size özel kampanyalardan yararlanabilirsiniz."
            icon="card-giftcard"
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Size Özel Teklifler</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Personalized Greeting */}
        {personalizedContent && personalizedContent.greeting && (
          <View style={styles.greetingCard}>
            <Text style={styles.greetingText}>{personalizedContent.greeting}</Text>
          </View>
        )}

        {/* Personalized Offers */}
        {personalizedContent && personalizedContent.personalizedOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Size Özel Kampanyalar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.offersScroll}
            >
              {personalizedContent.personalizedOffers.map((offer, index) =>
                renderOfferCard(offer, index)
              )}
            </ScrollView>
          </View>
        )}

        {/* Recommended Products */}
        {personalizedContent && personalizedContent.recommendedProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Size Önerilen Ürünler</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.productsScroll}
            >
              {personalizedContent.recommendedProducts.map(renderProductCard)}
            </ScrollView>
          </View>
        )}

        {/* Category Suggestions */}
        {personalizedContent && personalizedContent.categorySuggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ İlginizi Çekebilecek Kategoriler</Text>
            <View style={styles.categoriesContainer}>
              {personalizedContent.categorySuggestions.map(renderCategorySuggestion)}
            </View>
          </View>
        )}

        {/* Brand Suggestions */}
        {personalizedContent && personalizedContent.brandSuggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏪 Önerilen Markalar</Text>
            <View style={styles.categoriesContainer}>
              {personalizedContent.brandSuggestions.map(renderCategorySuggestion)}
            </View>
          </View>
        )}

        {/* Next Best Action */}
        {personalizedContent && personalizedContent.nextBestAction && (
          <View style={styles.nextActionCard}>
            <Text style={styles.nextActionTitle}>💡 Önerilen Aksiyon</Text>
            <Text style={styles.nextActionText}>{personalizedContent.nextBestAction}</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

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

const getOfferIcon = (type: string): string => {
  const icons: Record<string, string> = {
    discount: 'local-offer',
    free_shipping: 'local-shipping',
    bundle: 'inventory',
    loyalty: 'star',
    seasonal: 'eco',
    birthday: 'cake',
  };
  return icons[type] || 'card-giftcard';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  greetingCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greetingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  offersScroll: {
    paddingLeft: 15,
  },
  offerCard: {
    width: width * 0.8,
    marginRight: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  offerDiscount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  offerReason: {
    marginTop: 8,
  },
  reasonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  productsScroll: {
    paddingLeft: 15,
  },
  productCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  categoryChip: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  nextActionCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  nextActionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
