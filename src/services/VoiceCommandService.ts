import { Linking } from 'react-native';
import { VoiceService } from './VoiceService';
import { ChatbotService } from './ChatbotService';

export interface VoiceCommand {
  keywords: string[];
  action: string;
  description: string;
  requiresAuth?: boolean;
}

export class VoiceCommandService {
  private static commands: VoiceCommand[] = [
    {
      keywords: ['siparişlerim', 'siparişler', 'sipariş takibi'],
      action: 'navigate_orders',
      description: 'Siparişlerim sayfasına git',
      requiresAuth: true,
    },
    {
      keywords: ['sepetim', 'sepet', 'alışveriş sepeti'],
      action: 'navigate_cart',
      description: 'Sepetim sayfasına git',
      requiresAuth: true,
    },
    {
      keywords: ['ürünler', 'ürün ara', 'katalog'],
      action: 'view_products',
      description: 'Ürünler sayfasına git',
    },
    {
      keywords: ['kampanyalar', 'kampanya', 'indirimler'],
      action: 'view_campaigns',
      description: 'Kampanyalar sayfasına git',
    },
    {
      keywords: ['profil', 'hesabım', 'ayarlar'],
      action: 'navigate_profile',
      description: 'Profil sayfasına git',
      requiresAuth: true,
    },
    {
      keywords: ['yardım', 'destek', 'canlı destek'],
      action: 'live_support',
      description: 'Canlı desteğe bağlan',
    },
    {
      keywords: ['çıkış', 'güvenli çıkış', 'logout'],
      action: 'logout',
      description: 'Hesaptan çıkış yap',
      requiresAuth: true,
    },
    {
      keywords: ['ana sayfa', 'anasayfa', 'home'],
      action: 'navigate_home',
      description: 'Ana sayfaya git',
    },
  ];

  // Recognize command from text
  static recognizeCommand(text: string): VoiceCommand | null {
    const normalizedText = text.toLowerCase().trim();

    for (const command of this.commands) {
      for (const keyword of command.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          return command;
        }
      }
    }

    return null;
  }

  // Execute command
  static async executeCommand(
    command: VoiceCommand,
    navigation?: any,
    userId?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check authentication requirement
      if (command.requiresAuth && (!userId || userId <= 0)) {
        return {
          success: false,
          message: 'Bu işlem için giriş yapmanız gerekiyor.',
        };
      }

      // Execute action
      switch (command.action) {
        case 'navigate_orders':
          if (navigation) {
            navigation.navigate('Orders');
            return { success: true, message: 'Siparişlerim sayfasına yönlendiriliyorsunuz...' };
          }
          break;

        case 'navigate_cart':
          if (navigation) {
            navigation.navigate('Cart');
            return { success: true, message: 'Sepetim sayfasına yönlendiriliyorsunuz...' };
          }
          break;

        case 'view_products':
          if (navigation) {
            navigation.navigate('ProductList');
            return { success: true, message: 'Ürünler sayfasına yönlendiriliyorsunuz...' };
          }
          break;

        case 'view_campaigns':
          if (navigation) {
            navigation.navigate('Campaigns');
            return { success: true, message: 'Kampanyalar sayfasına yönlendiriliyorsunuz...' };
          }
          break;

        case 'navigate_profile':
          if (navigation) {
            navigation.navigate('Profile');
            return { success: true, message: 'Profil sayfasına yönlendiriliyorsunuz...' };
          }
          break;

        case 'live_support':
          // WhatsApp'a yönlendir
          Linking.openURL('https://wa.me/905303125813?text=Merhaba, yardıma ihtiyacım var.');
          return { success: true, message: 'WhatsApp\'a yönlendiriliyorsunuz...' };

        case 'navigate_home':
          if (navigation) {
            navigation.navigate('Home');
            return { success: true, message: 'Ana sayfaya yönlendiriliyorsunuz...' };
          }
          break;

        case 'logout':
          // This should be handled by the component
          return { success: true, message: 'Çıkış yapılıyor...' };

        default:
          // Try to handle via ChatbotService
          try {
            await ChatbotService.handleNavigation(command.action, navigation);
            return { success: true, message: 'İşlem gerçekleştiriliyor...' };
          } catch (error) {
            return { success: false, message: 'Komut işlenemedi.' };
          }
      }

      return { success: false, message: 'Navigasyon bulunamadı.' };
    } catch (error) {
      console.error('Execute Command Error:', error);
      return { success: false, message: 'Komut çalıştırılırken hata oluştu.' };
    }
  }

  // Process voice input (text from speech-to-text)
  static async processVoiceInput(
    text: string,
    navigation?: any,
    userId?: number
  ): Promise<{ success: boolean; message: string; command?: VoiceCommand }> {
    const command = this.recognizeCommand(text);

    if (!command) {
      return {
        success: false,
        message: 'Komut anlaşılamadı. Lütfen tekrar deneyin.',
      };
    }

    const result = await this.executeCommand(command, navigation, userId);

    return {
      ...result,
      command,
    };
  }

  // Get available commands
  static getAvailableCommands(): VoiceCommand[] {
    return this.commands;
  }

  // Add custom command
  static addCommand(command: VoiceCommand): void {
    this.commands.push(command);
  }

  // Remove command
  static removeCommand(action: string): void {
    this.commands = this.commands.filter((cmd) => cmd.action !== action);
  }
}

