import { apiService } from '../utils/api-service';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiscountWheelResult {
  spinResult: '1' | '3' | '5' | '7' | '10' | '20';
  discountCode: string;
  expiresAt: string;
  discountType: 'percentage';
  discountValue: string;
}

export interface DiscountCode {
  id: number;
  discountCode: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isUsed: boolean;
  usedAt?: string;
  orderId?: number;
  expiresAt: string;
  createdAt: string;
}

export interface WheelCheckResult {
  canSpin: boolean;
  alreadySpun: boolean;
  existingCode?: string;
  spinResult?: string;
  expiresAt?: string;
  isUsed?: boolean;
}

export class DiscountWheelController {
  // Generate unique device ID
  static async getDeviceId(): Promise<string> {
    try {
      // Try to get existing device ID from storage
      let deviceId = await AsyncStorage.getItem('device_id');
      
      if (!deviceId) {
        // GÜVENLİK: Kriptografik olarak güvenli device ID üretimi
        const { generateSecureDeviceId } = await import('../utils/crypto-utils');
        deviceId = generateSecureDeviceId(Platform.OS);
        
        // Save to storage
        await AsyncStorage.setItem('device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Error generating device ID:', error);
      // GÜVENLİK: Fallback için de güvenli random kullan
      const { generateSecureDeviceId } = await import('../utils/crypto-utils');
      return generateSecureDeviceId(Platform.OS);
    }
  }

  // Check if device can spin the wheel
  static async checkWheelStatus(): Promise<WheelCheckResult> {
    try {
      console.log('🎰 Checking wheel status...');
      
      const deviceId = await this.getDeviceId();
      const response = await apiService.get(`/discount-wheel/check/${deviceId}`);
      
      if (response.success && response.data) {
        console.log('✅ Wheel status checked:', response.data);
        return response.data;
      }
      
      return {
        canSpin: true,
        alreadySpun: false
      };
    } catch (error) {
      console.error('❌ DiscountWheelController - checkWheelStatus error:', error);
      return {
        canSpin: true,
        alreadySpun: false
      };
    }
  }

  // Spin the discount wheel
  static async spinWheel(userId?: number): Promise<{ success: boolean; message: string; data?: DiscountWheelResult }> {
    try {
      console.log('🎰 Spinning discount wheel...');
      
      const deviceId = await this.getDeviceId();
      
      const requestData: any = {
        deviceId,
        ipAddress: '', // Will be filled by server
        userAgent: Platform.OS
      };
      
      if (userId) {
        requestData.userId = userId;
      }
      
      const response = await apiService.post('/discount-wheel/spin', requestData);
      
      if (response.success) {
        console.log('✅ Wheel spun successfully:', response.data);
        return {
          success: true,
          message: response.message || 'Çark başarıyla çevrildi!',
          data: response.data
        };
      } else {
        console.log('❌ Wheel spin failed:', response.message);
        return {
          success: false,
          message: response.message || 'Çark çevrilirken hata oluştu'
        };
      }
    } catch (error) {
      console.error('❌ DiscountWheelController - spinWheel error:', error);
      return {
        success: false,
        message: 'Çark çevrilirken hata oluştu'
      };
    }
  }

  // Get user discount codes
  static async getUserDiscountCodes(userId: number): Promise<DiscountCode[]> {
    try {
      console.log('🔄 Fetching user discount codes for user:', userId);
      
      const response = await apiService.get(`/discount-codes/${userId}`);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log(`✅ Retrieved ${response.data.length} discount codes`);
        return response.data;
      }
      
      console.log('⚠️ No discount codes found or invalid response format');
      return [];
    } catch (error) {
      console.error('❌ DiscountWheelController - getUserDiscountCodes error:', error);
      // Hata durumunda boş array döndür, çökme olmasın
      return [];
    }
  }

  // Validate discount code
  static async validateDiscountCode(
    discountCode: string, 
    userId: number, 
    orderAmount: number
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔄 Validating discount code:', discountCode);
      
      const response = await apiService.post('/discount-codes/validate', {
        discountCode,
        userId,
        orderAmount
      });
      
      if (response.success) {
        console.log('✅ Discount code validated:', response.data);
        return {
          success: true,
          message: 'İndirim kodu geçerli',
          data: response.data
        };
      } else {
        console.log('❌ Discount code validation failed:', response.message);
        return {
          success: false,
          message: response.message || 'Geçersiz indirim kodu'
        };
      }
    } catch (error) {
      console.error('❌ DiscountWheelController - validateDiscountCode error:', error);
      return {
        success: false,
        message: 'İndirim kodu doğrulanırken hata oluştu'
      };
    }
  }

  // Use discount code
  static async useDiscountCode(
    discountCode: string, 
    userId: number, 
    orderId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Using discount code:', discountCode);
      
      const response = await apiService.post('/discount-codes/use', {
        discountCode,
        userId,
        orderId
      });
      
      if (response.success) {
        console.log('✅ Discount code used successfully');
        return {
          success: true,
          message: response.message || 'İndirim kodu başarıyla kullanıldı'
        };
      } else {
        console.log('❌ Discount code usage failed:', response.message);
        return {
          success: false,
          message: response.message || 'İndirim kodu kullanılamadı'
        };
      }
    } catch (error) {
      console.error('❌ DiscountWheelController - useDiscountCode error:', error);
      return {
        success: false,
        message: 'İndirim kodu kullanılırken hata oluştu'
      };
    }
  }

  // Get discount percentage display
  static getDiscountDisplay(discountValue: number, discountType: string): string {
    if (discountType === 'percentage') {
      return `%${discountValue} İndirim`;
    } else {
      return `${discountValue} TL İndirim`;
    }
  }

  // Check if discount code is expired
  static isDiscountCodeExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  // Get time remaining until expiration
  static getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Süresi doldu';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} gün ${hours} saat`;
    } else if (hours > 0) {
      return `${hours} saat ${minutes} dakika`;
    } else {
      return `${minutes} dakika`;
    }
  }

  // Format discount code for display
  static formatDiscountCode(code: string): string {
    // Add spaces every 4 characters for better readability
    return code.replace(/(.{4})/g, '$1 ').trim();
  }
}
