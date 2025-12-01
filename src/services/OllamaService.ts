import apiService from '../utils/api-service';

export interface OllamaConfig {
  enabled: boolean;
  apiUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaService {
  private static readonly CONFIG_KEY = 'ollama_config';
  private static readonly DEFAULT_CONFIG: OllamaConfig = {
    enabled: true,
    model: 'gemma3:4b',
    temperature: 0.7,
    maxTokens: 2000,
  };

  // Konfigürasyonu al
  static async getConfig(): Promise<OllamaConfig> {
    try {
      const stored = await import('@react-native-async-storage/async-storage').then(
        m => m.default.getItem(this.CONFIG_KEY)
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.DEFAULT_CONFIG, ...parsed };
      }
      return this.DEFAULT_CONFIG;
    } catch (error) {
      console.error('❌ Ollama config alınamadı:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  // Konfigürasyonu kaydet
  static async saveConfig(config: Partial<OllamaConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('❌ Ollama config kaydedilemedi:', error);
    }
  }

  // Ollama API'ye mesaj gönder
  static async sendMessage(
    messages: OllamaMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const config = await this.getConfig();

      if (!config.enabled) {
        throw new Error('Ollama is not enabled');
      }

      const model = options?.model || config.model || this.DEFAULT_CONFIG.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 2000;

      // Backend API'ye istek gönder
      const response = await apiService.post('/ollama/generate', {
        messages,
        model,
        temperature,
        maxTokens,
      });

      if (response.success && response.data) {
        // Ollama response format'ını kontrol et
        const data = response.data;
        
        // Farklı response formatlarını destekle
        if (typeof data.response === 'string') {
          return data.response;
        }
        if (typeof data === 'string') {
          return data;
        }
        if (data.text) {
          return data.text;
        }
        if (data.message?.content) {
          return data.message.content;
        }
        if (data.content) {
          return data.content;
        }
        // Fallback: JSON stringify
        return JSON.stringify(data);
      }

      // Daha açıklayıcı hata mesajı
      const errorMsg = response.message || response.error || 'Invalid Ollama response';
      throw new Error(`Ollama API hatası: ${errorMsg}`);
    } catch (error: any) {
      console.error('❌ Ollama send message error:', error);
      throw error;
    }
  }

  // Ollama durumunu kontrol et (hafif health check)
  static async checkStatus(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config.enabled) {
        return false;
      }

      // Hafif health check: sadece API'nin erişilebilir olduğunu kontrol et
      // Gerçek mesaj göndermek yerine, sadece endpoint'in çalıştığını doğrula
      // Timeout kontrolü için Promise.race kullan (10 saniye)
      const responsePromise = apiService.post('/ollama/generate', {
        messages: [{ role: 'user', content: 'test' }],
        model: config.model || this.DEFAULT_CONFIG.model,
        maxTokens: 5, // Çok kısa yanıt
        temperature: 0.1
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Status check timeout')), 10000)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);

      return response.success === true;
    } catch (error: any) {
      // Timeout veya network hatalarını sessizce geç
      if (error?.message?.includes('timeout') || error?.message?.includes('TIMEOUT_ERROR')) {
        console.log('⚠️ Ollama status check timeout (service may be slow)');
        return false; // Timeout durumunda false döndür
      }
      console.error('❌ Ollama status check error:', error);
      return false;
    }
  }
}

