import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AdminPopupService, { AdminPopupItem } from '../services/AdminPopupService';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';

interface PopupManagerProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
  };
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PopupManager: React.FC<PopupManagerProps> = ({ navigation }) => {
  const [popups, setPopups] = useState<AdminPopupItem[]>([]);
  const [currentPopup, setCurrentPopup] = useState<AdminPopupItem | null>(null);
  const [showDelayTimer, setShowDelayTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPopups();
    return () => {
      if (showDelayTimer) clearTimeout(showDelayTimer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, []);

  const loadPopups = async () => {
    try {
      console.log('🔔 PopupManager: Popup\'lar yükleniyor...');
      const data = await AdminPopupService.getPopups();
      console.log('🔔 PopupManager: Yüklenen popup sayısı:', data.length);
      
      // Önceliğe göre sırala ve en yüksek öncelikli popup'ı göster
      const sortedPopups = data.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      setPopups(sortedPopups);
      
      if (sortedPopups.length > 0) {
        const popup = sortedPopups[0];
        console.log('🔔 PopupManager: Popup gösterilecek:', popup.title, 'Show delay:', popup.showDelay);
        
        // Show delay varsa bekle
        if (popup.showDelay && popup.showDelay > 0) {
          console.log(`🔔 PopupManager: ${popup.showDelay} saniye sonra gösterilecek`);
          const timer = setTimeout(() => {
            console.log('🔔 PopupManager: Popup gösteriliyor:', popup.title);
            showPopup(popup);
          }, popup.showDelay * 1000);
          setShowDelayTimer(timer);
        } else {
          console.log('🔔 PopupManager: Popup hemen gösteriliyor:', popup.title);
          // Kısa bir gecikme ekle (uygulama render'ının tamamlanması için)
          setTimeout(() => {
            showPopup(popup);
          }, 500);
        }
      } else {
        console.log('🔔 PopupManager: Gösterilecek popup yok');
      }
    } catch (error) {
      console.error('❌ Popup yükleme hatası:', error);
    }
  };

  const showPopup = (popup: AdminPopupItem) => {
    setCurrentPopup(popup);
    AdminPopupService.trackPopupView(popup.id).catch(() => {});

    // Auto close varsa zamanlayıcı kur
    if (popup.autoClose && popup.autoClose > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, popup.autoClose * 1000);
      setAutoCloseTimer(timer);
    }
  };

  const handleClose = () => {
    if (currentPopup) {
      if (!currentPopup.isRequired) {
        AdminPopupService.trackPopupDismissal(currentPopup.id).catch(() => {});
      }
      setCurrentPopup(null);
    }
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
  };

  const handleAction = () => {
    if (!currentPopup || !currentPopup.clickAction) return;

    const { type, value } = currentPopup.clickAction;
    AdminPopupService.trackPopupClick(currentPopup.id).catch(() => {});

    if (type === 'product' && value) {
      // Ürün detayına git
      navigation?.navigate('ProductDetail', { productId: parseInt(value) });
      handleClose();
    } else if (type === 'category' && value) {
      // Kategori sayfasına git
      navigation?.navigate('ProductList', { category: value });
      handleClose();
    } else if (type === 'url' && value) {
      // URL'yi aç
      Linking.openURL(value).catch(() => {
        Alert.alert('Hata', 'URL açılamadı');
      });
      handleClose();
    }
  };

  if (!currentPopup) return null;

  const getPositionStyle = () => {
    switch (currentPopup.position) {
      case 'top':
        return { top: 0, bottom: undefined };
      case 'bottom':
        return { bottom: 0, top: undefined };
      case 'top-right':
        return { top: 20, right: 20, left: undefined, bottom: undefined };
      case 'bottom-right':
        return { bottom: 20, right: 20, left: undefined, top: undefined };
      default:
        return {}; // center
    }
  };

  const renderPopupContent = () => {
    const isModal = currentPopup.type === 'modal';
    const isBanner = currentPopup.type === 'banner';
    const isToast = currentPopup.type === 'toast';
    const isSlideIn = currentPopup.type === 'slide-in';

    if (isModal) {
      return (
        <View style={[styles.modalContent, { width: currentPopup.width || '90%' }]}>
          {currentPopup.imageUrl && (
            <Image source={{ uri: currentPopup.imageUrl }} style={styles.modalImage} />
          )}
          <View style={styles.modalTextContainer}>
            <Text style={styles.modalTitle}>{currentPopup.title}</Text>
            {currentPopup.content && (
              <Text style={styles.modalText}>{currentPopup.content}</Text>
            )}
            {currentPopup.buttonText && (
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: currentPopup.buttonColor || Colors.primary },
                ]}
                onPress={handleAction}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: currentPopup.textColor || '#FFFFFF' },
                  ]}
                >
                  {currentPopup.buttonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {currentPopup.isDismissible && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (isBanner || isSlideIn) {
      return (
        <View
          style={[
            styles.bannerContent,
            {
              backgroundColor: currentPopup.backgroundColor || Colors.primary,
              width: screenWidth,
            },
            getPositionStyle(),
          ]}
        >
          <View style={styles.bannerInner}>
            {currentPopup.imageUrl && (
              <Image source={{ uri: currentPopup.imageUrl }} style={styles.bannerImage} />
            )}
            <View style={styles.bannerTextContainer}>
              <Text
                style={[
                  styles.bannerTitle,
                  { color: currentPopup.textColor || '#FFFFFF' },
                ]}
              >
                {currentPopup.title}
              </Text>
              {currentPopup.content && (
                <Text
                  style={[
                    styles.bannerText,
                    { color: currentPopup.textColor || '#FFFFFF' },
                  ]}
                >
                  {currentPopup.content}
                </Text>
              )}
            </View>
            {currentPopup.buttonText && (
              <TouchableOpacity
                style={[
                  styles.bannerButton,
                  { backgroundColor: currentPopup.buttonColor || '#FFFFFF' },
                ]}
                onPress={handleAction}
              >
                <Text
                  style={[
                    styles.bannerButtonText,
                    { color: currentPopup.textColor || Colors.primary },
                  ]}
                >
                  {currentPopup.buttonText}
                </Text>
              </TouchableOpacity>
            )}
            {currentPopup.isDismissible && (
              <TouchableOpacity style={styles.bannerCloseButton} onPress={handleClose}>
                <Text style={styles.bannerCloseButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (isToast) {
      return (
        <View
          style={[
            styles.toastContent,
            {
              backgroundColor: currentPopup.backgroundColor || Colors.surface,
              ...getPositionStyle(),
            },
          ]}
        >
          <Text style={[styles.toastText, { color: currentPopup.textColor || Colors.text }]}>
            {currentPopup.title}
          </Text>
          {currentPopup.isDismissible && (
            <TouchableOpacity onPress={handleClose} style={styles.toastCloseButton}>
              <Text style={styles.toastCloseButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={!!currentPopup}
      transparent
      animationType={currentPopup.type === 'modal' ? 'fade' : 'slide'}
      onRequestClose={currentPopup.isDismissible ? handleClose : undefined}
    >
      <View
        style={[
          styles.overlay,
          currentPopup.type !== 'modal' && styles.overlayTransparent,
        ]}
      >
        {currentPopup.type === 'modal' && (
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={currentPopup.isDismissible ? handleClose : undefined}
          />
        )}
        {renderPopupContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTransparent: {
    backgroundColor: 'transparent',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    maxHeight: screenHeight * 0.8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  modalTextContainer: {
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: 'bold',
  },
  bannerContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.primary,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: Spacing.md,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 14,
  },
  bannerButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
    marginLeft: Spacing.md,
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bannerCloseButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  bannerCloseButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  toastContent: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    fontSize: 14,
    flex: 1,
  },
  toastCloseButton: {
    padding: Spacing.xs,
  },
  toastCloseButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

export default PopupManager;

