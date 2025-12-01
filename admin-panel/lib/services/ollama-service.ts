// Ollama AI Service
export interface OllamaConfig {
  enabled: boolean;
  apiUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaResponse {
  model?: string;
  created_at?: string;
  message: {
    role: string;
    content: string;
  };
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private static readonly CONFIG_KEY = 'ollama_config';
  private static readonly DEFAULT_CONFIG: OllamaConfig = {
    enabled: true,
    apiUrl: 'http://localhost:11434',
    model: 'gemma3:4b',
    temperature: 0.8,
    maxTokens: 8000
  };

  // Konfigürasyonu al
  static async getConfig(): Promise<OllamaConfig> {
    try {
      if (typeof window === 'undefined') return this.DEFAULT_CONFIG;
      
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
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
      if (typeof window === 'undefined') return;
      
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
      console.log('✅ Ollama config kaydedildi:', newConfig);
    } catch (error) {
      console.error('❌ Ollama config kaydedilemedi:', error);
      throw error;
    }
  }

  // Ollama sunucusunun durumunu kontrol et
  static async checkHealth(): Promise<{ status: 'online' | 'offline'; models?: string[] }> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        return { status: 'offline' };
      }

      // Sadece uzak sunucu üzerinden kontrol et (yerel Ollama'ya gerek yok)
      try {
        const response = await fetch('https://api.huglutekstil.com/api/ollama/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
          },
          signal: AbortSignal.timeout(30000) // 30 saniye timeout
        });

        if (response.ok) {
          const data = await response.json();
          return { 
            status: data.status === 'online' ? 'online' : 'offline', 
            models: data.models || []
          };
        } else {
          console.log('🔄 Uzak Ollama sunucusu yanıt vermiyor:', response.status);
          return { status: 'offline' };
        }
      } catch (error) {
        console.log('🔄 Uzak Ollama sunucusu erişilemiyor:', error);
        return { status: 'offline' };
      }
    } catch (error) {
      console.error('❌ Ollama health check failed:', error);
      return { status: 'offline' };
    }
  }

  // Ollama'ya mesaj gönder
  static async sendMessage(
    messages: OllamaMessage[], 
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<OllamaResponse> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        throw new Error('Ollama is not enabled');
      }

      const model = options?.model || config.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 8000;
      const stream = options?.stream ?? false;

      // Model adını temizle ve kontrol et
      const cleanModel = model.replace('ollama-', '').replace('gemma3:', 'gemma3:');
      
      const requestBody = {
        messages,
        model: cleanModel,
        temperature,
        maxTokens,
        stream
      };

      console.log('🤖 Ollama Request:', { 
        model, 
        temperature, 
        maxTokens 
      });

      // Retry mekanizması ile uzak sunucu üzerinden dene
      let lastError: Error | null = null;
      const MAX_RETRIES = 5;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`🔄 Ollama deneme ${attempt}/${MAX_RETRIES}...`);
          
          const response = await fetch('https://api.huglutekstil.com/api/ollama/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(45000) // 45 saniye timeout
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Ollama Response (Remote):', data);
            
            // Yanıt yapısını normalize et
            if (data.data) {
              return data.data;
            } else if (data.message) {
              return data;
            } else {
              return { message: { role: 'assistant', content: data.response || data.content || JSON.stringify(data) } };
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ Ollama sunucusu hata (${attempt}/${MAX_RETRIES}):`, response.status, errorText);
            
            // Hata tipine göre farklı mesajlar
            let errorMessage = `HTTP ${response.status}: ${errorText}`;
            
            if (response.status === 404) {
              errorMessage = `Model bulunamadı: ${cleanModel}. Lütfen model adını kontrol edin.`;
            } else if (response.status === 500) {
              errorMessage = `Sunucu hatası: ${errorText}`;
            } else if (response.status === 400) {
              errorMessage = `Geçersiz istek: ${errorText}`;
            } else if (response.status === 429) {
              errorMessage = `Rate limit aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.`;
            }
            
            lastError = new Error(errorMessage);
            
            // 429 (Rate Limit) hatası için exponential backoff
            if (response.status === 429) {
              const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s, 32s
              console.log(`⏳ Rate limit nedeniyle ${waitTime}ms (${waitTime/1000}s) bekleniyor...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else if (response.status === 404) {
              // 404 hatası için retry yapma
              break;
            }
          }
        } catch (error) {
          console.error(`❌ Ollama deneme ${attempt}/${MAX_RETRIES} başarısız:`, error);
          lastError = error instanceof Error ? error : new Error('Bilinmeyen hata');
          
          // Son deneme değilse kısa bekle
          if (attempt < MAX_RETRIES) {
            const waitTime = attempt * 1000; // 1s, 2s, 3s, 4s
            console.log(`⏳ ${waitTime}ms bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // Tüm denemeler başarısız
      throw lastError || new Error(`Ollama sunucusu ${MAX_RETRIES} deneme sonrası erişilemiyor`);
      
    } catch (error) {
      console.error('❌ Ollama sendMessage error:', error);
      throw error;
    }
  }

  // Mesajları Ollama formatına çevir
  private static formatMessagesForOllama(messages: OllamaMessage[]): string {
    let prompt = '';
    
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }
    
    prompt += 'Assistant: ';
    return prompt;
  }

  // Streaming yanıt al
  static async sendMessageStream(
    messages: OllamaMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        throw new Error('Ollama is not enabled');
      }

      const model = options?.model || config.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 2000;

      const prompt = this.formatMessagesForOllama(messages);

      const requestBody = {
        model,
        prompt,
        stream: true,
        options: {
          temperature,
          num_predict: maxTokens,
        }
      };

      const response = await fetch(`${config.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                onChunk(data.response);
              }
            } catch (e) {
              // JSON parse hatası, devam et
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Ollama streaming error:', error);
      throw error;
    }
  }

  // Mevcut modelleri listele
  static async getAvailableModels(): Promise<string[]> {
    try {
      const health = await this.checkHealth();
      return health.models || [];
    } catch (error) {
      console.error('❌ Ollama models alınamadı:', error);
      return [];
    }
  }

  // Model indir
  static async pullModel(modelName: string): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled || !config.apiUrl) {
        throw new Error('Ollama is not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Model pull failed: ${response.status}`);
      }

      console.log(`✅ Model ${modelName} indiriliyor...`);
    } catch (error) {
      console.error(`❌ Model ${modelName} indirilemedi:`, error);
      throw error;
    }
  }
}
