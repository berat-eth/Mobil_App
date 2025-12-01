import { apiService } from '../utils/api-service';

export interface User {
  id: number;
  name: string;
  email: string;
  user_id: string;
}

export interface TransferData {
  fromUserId: number;
  toUserId: number;
  amount: number;
  description?: string;
}

export interface TransferHistory {
  id: number;
  type: 'transfer_in' | 'transfer_out';
  amount: number;
  description: string;
  referenceId: string;
  otherUserName?: string;
  transferDirection: 'sent' | 'received';
  createdAt: string;
}

export class TransferService {
  static async searchUsers(query: string, excludeUserId?: number): Promise<User[]> {
    try {
      const params = new URLSearchParams({ query });
      if (excludeUserId) {
        params.append('excludeUserId', excludeUserId.toString());
      }
      
      const response = await apiService.get(`/users/search?${params.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  static async transferMoney(transferData: TransferData): Promise<{
    success: boolean;
    message: string;
    data?: {
      transferId: string;
      amount: number;
      fromUser: string;
      toUser: string;
    };
  }> {
    try {
      console.log('🔄 Transferring money:', transferData);
      const response = await apiService.post<{ success: boolean; message?: string; data?: any }>('/wallet/transfer', transferData);
      console.log('✅ Transfer response:', response);
      return { success: !!response.success, message: response.message || 'Transfer tamamlandı', data: response.data as any };
    } catch (error: any) {
      console.error('❌ Error transferring money:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      
      // API'den gelen hata mesajını kullan
      if (error.response?.data?.message) {
        return { 
          success: false, 
          message: error.response.data.message 
        };
      }
      
      // Genel hata mesajı
      return { 
        success: false, 
        message: 'Transfer işlemi sırasında bir hata oluştu' 
      };
    }
  }

  static async getTransferHistory(
    userId: number, 
    type?: 'sent' | 'received'
  ): Promise<TransferHistory[]> {
    try {
      const params = new URLSearchParams({ userId: userId.toString() });
      if (type) {
        params.append('type', type);
      }
      
      const response = await apiService.get(`/wallet/transfers?${params.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      throw error;
    }
  }

  static formatTransferAmount(amount: number, type: 'transfer_in' | 'transfer_out'): string {
    const formattedAmount = Math.abs(amount).toFixed(2);
    return type === 'transfer_in' ? `+₺${formattedAmount}` : `-₺${formattedAmount}`;
  }

  static getTransferIcon(type: 'transfer_in' | 'transfer_out'): string {
    return type === 'transfer_in' ? 'arrow-downward' : 'arrow-upward';
  }

  static getTransferColor(type: 'transfer_in' | 'transfer_out'): string {
    return type === 'transfer_in' ? '#10b981' : '#ef4444'; // Yeşil: gelen, Kırmızı: giden
  }

  static getTransferDescription(transfer: TransferHistory): string {
    if (transfer.type === 'transfer_in') {
      return transfer.otherUserName 
        ? `${transfer.otherUserName} tarafından gönderildi`
        : 'Para transferi alındı';
    } else {
      return transfer.otherUserName 
        ? `${transfer.otherUserName} kullanıcısına gönderildi`
        : 'Para transferi gönderildi';
    }
  }
}
