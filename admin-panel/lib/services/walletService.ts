import { api, ApiResponse, WalletTransaction } from '../api';

export interface WalletDetails {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

export interface RechargeRequestData {
  userId: number;
  amount: number;
  paymentMethod: 'card' | 'bank_transfer';
  bankInfo?: {
    accountHolder: string;
    transactionId: string;
    bankName: string;
  };
}

export const walletService = {
  // Get wallet balance
  getBalance: async (userId: number) => {
    return api.get<ApiResponse<{ balance: number }>>(`/wallet/balance/${userId}`);
  },

  // Get wallet details
  getWalletDetails: async (userId: number) => {
    return api.get<ApiResponse<WalletDetails>>(`/wallet/${userId}`);
  },

  // Add money to wallet
  addMoney: async (userId: number, amount: number, paymentMethod: string, description?: string) => {
    return api.post<ApiResponse<void>>(`/wallet/${userId}/add-money`, {
      amount,
      paymentMethod,
      description,
    });
  },

  // Create recharge request
  createRechargeRequest: async (data: RechargeRequestData) => {
    return api.post<ApiResponse<any>>('/wallet/recharge-request', data);
  },

  // Get wallet transactions
  getTransactions: async (userId: number, page = 1, limit = 20) => {
    return api.get<ApiResponse<{
      transactions: WalletTransaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>(`/wallet/transactions/${userId}`, { page, limit });
  },

  // Transfer money
  transferMoney: async (fromUserId: number, toUserId: number, amount: number, description?: string) => {
    return api.post<ApiResponse<{ transferId: string }>>('/wallet/transfer', {
      fromUserId,
      toUserId,
      amount,
      description,
    });
  },
};
