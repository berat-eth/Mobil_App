import { apiService } from '../utils/api-service';
import { UserController } from '../controllers/UserController';

export interface PurchaseVerification {
  hasPurchased: boolean;
  orderId?: number;
  purchaseDate?: string;
  orderStatus?: string;
  productVariations?: any[];
}

export class PurchaseVerificationService {
  /**
   * Kullanıcının belirli bir ürünü satın alıp almadığını kontrol eder
   */
  static async verifyPurchase(productId: number): Promise<PurchaseVerification> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        console.log('⚠️ Satın alma doğrulaması için kullanıcı ID bulunamadı');
        return { hasPurchased: false };
      }

      console.log(`🔍 Verifying purchase for user ${userId}, product ${productId}`);
      
      // API'den kullanıcının siparişlerini kontrol et
      const response = await apiService.get(`/users/${userId}/purchases/${productId}`);
      
      console.log('📦 Purchase verification response:', {
        success: response?.success,
        hasData: !!response?.data,
        data: response?.data
      });
      
      if (response.success && response.data) {
        return {
          hasPurchased: true,
          orderId: response.data.orderId,
          purchaseDate: response.data.purchaseDate,
          orderStatus: response.data.orderStatus,
          productVariations: response.data.productVariations || []
        };
      }

      console.log('⚠️ Purchase verification: User has not purchased this product');
      return { hasPurchased: false };
    } catch (error: any) {
      console.error('❌ Satın alma doğrulanırken hata:', error?.message || error);
      // Hata durumunda da false döndür, ama log'la
      return { hasPurchased: false };
    }
  }

  /**
   * Kullanıcının tüm satın aldığı ürünleri getirir
   */
  static async getUserPurchases(): Promise<number[]> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        return [];
      }

      const response = await apiService.get(`/users/${userId}/purchases`);
      
      if (response.success && response.data) {
        return response.data.map((purchase: any) => purchase.productId);
      }

      return [];
    } catch (error) {
      console.error('Kullanıcı satın alımları alınırken hata:', error);
      return [];
    }
  }

  /**
   * Kullanıcının belirli bir ürün için yorum yapıp yapamayacağını kontrol eder
   */
  static async canUserReview(productId: number): Promise<{
    canReview: boolean;
    reason?: string;
    purchaseInfo?: PurchaseVerification;
  }> {
    try {
      console.log(`🔍 Checking review eligibility for product ${productId}`);
      
      const purchaseInfo = await this.verifyPurchase(productId);
      
      console.log('📦 Purchase info:', {
        hasPurchased: purchaseInfo.hasPurchased,
        orderStatus: purchaseInfo.orderStatus
      });
      
      // Satın alma kontrolü - eğer satın alınmışsa yorum yapabilir
      if (!purchaseInfo.hasPurchased) {
        console.log('❌ User has not purchased this product');
        return {
          canReview: false,
          reason: 'Bu ürünü satın almadığınız için yorum yapamazsınız.',
          purchaseInfo
        };
      }

      // Sipariş durumu kontrolü - daha esnek hale getirildi
      // 'pending', 'processing', 'shipped' durumlarında da yorum yapılabilir
      // Sadece 'cancelled' veya 'refunded' durumlarında izin verilmez
      const blockedStatuses = ['cancelled', 'refunded'];
      if (purchaseInfo.orderStatus && blockedStatuses.includes(purchaseInfo.orderStatus.toLowerCase())) {
        console.log('❌ Order status blocks review:', purchaseInfo.orderStatus);
        return {
          canReview: false,
          reason: 'Sipariş durumunuz yorum yapmanıza izin vermiyor.',
          purchaseInfo
        };
      }

      console.log('✅ User can review this product');
      return {
        canReview: true,
        purchaseInfo
      };
    } catch (error: any) {
      console.error('❌ Yorum uygunluğu kontrol edilirken hata:', error?.message || error);
      // Hata durumunda da false döndür, ama daha açıklayıcı mesaj ver
      return {
        canReview: false,
        reason: `Yorum yapma yetkinizi kontrol ederken bir hata oluştu: ${error?.message || 'Bilinmeyen hata'}`
      };
    }
  }

  /**
   * Offline modda cache'den satın alma bilgilerini kontrol eder
   */
  static async getCachedPurchases(): Promise<number[]> {
    try {
      // Offline modda basit bir cache sistemi
      // Gerçek implementasyon için AsyncStorage kullanılabilir
      return [];
    } catch (error) {
      console.error('Error getting cached purchases:', error);
      return [];
    }
  }

  /**
   * Satın alma bilgilerini cache'e kaydeder
   */
  static async cachePurchases(productIds: number[]): Promise<void> {
    try {
      // Offline modda basit bir cache sistemi
      // Gerçek implementasyon için AsyncStorage kullanılabilir
      console.log('Caching purchases:', productIds);
    } catch (error) {
      console.error('Error caching purchases:', error);
    }
  }
}
