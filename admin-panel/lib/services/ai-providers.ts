import { api } from '@/lib/api'

export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIProviderConfig {
  enabled: boolean
  provider: AIProvider
  model: string
  temperature?: number
  maxTokens?: number
  // API anahtarları UI'den alınır; localStorage'a kaydedilmez
}

export interface TestProviderPayload {
  provider: AIProvider
  apiKey: string
  model?: string
}

export interface SaveProviderPayload extends AIProviderConfig {
  // Sunucu tarafında güvenli saklama için anahtar pas geçilebilir veya ayrı endpoint ile gönderilebilir
  apiKey?: string
}

export const aiProvidersService = {
  async getConfig(): Promise<AIProviderConfig> {
    return await api.get<AIProviderConfig>('/ai/providers/config')
  },

  async saveConfig(payload: SaveProviderPayload): Promise<{ success: boolean }> {
    return await api.post<{ success: boolean }>('/ai/providers/config', payload)
  },

  async testProvider(payload: TestProviderPayload): Promise<{ success: boolean; message?: string }>{
    return await api.post<{ success: boolean; message?: string }>(
      '/ai/providers/test',
      payload
    )
  },

  async listModels(provider: AIProvider, apiKey?: string): Promise<{ models: string[] }>{
    return await api.get<{ models: string[] }>('/ai/providers/models', {
      provider,
      apiKey: apiKey || ''
    })
  },

  async fetchInsights(params?: { category?: string; impact?: string; timeframe?: string }) {
    return await api.get<any>('/ai/insights', params as any)
  }
}


