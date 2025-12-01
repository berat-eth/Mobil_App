import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';
import { ShareUtils, CartShareData } from '../utils/shareUtils';

interface CartShareButtonsProps {
  cartItems: Array<{
    id: number;
    productName: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  totalAmount: number;
  onShareSuccess?: (platform: string, expGained: number) => void;
}

export const CartShareButtons: React.FC<CartShareButtonsProps> = ({
  cartItems,
  totalAmount,
  onShareSuccess,
}) => {
  const [sharing, setSharing] = useState<string | null>(null);

  const socialPlatforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'logo-instagram',
      iconType: 'ionicons',
      color: '#E4405F',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'logo-facebook',
      iconType: 'ionicons',
      color: '#1877F2',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'logo-whatsapp',
      iconType: 'ionicons',
      color: '#25D366',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'logo-twitter',
      iconType: 'ionicons',
      color: '#1DA1F2',
    },
  ];

  const generateCartShareText = () => {
    const itemCount = cartItems.length;
    const itemNames = cartItems.slice(0, 3).map(item => item.productName).join(', ');
    const moreItems = itemCount > 3 ? ` ve ${itemCount - 3} ürün daha` : '';
    
    return `🛒 Sepetimi paylaşıyorum!\n\n${itemNames}${moreItems}\n\nToplam: ${totalAmount} TL\n\nKamp malzemeleri için Huğlu Outdoor! 🏕️\n\n#Kamp #Outdoor #HuğluOutdoor #Sepet`;
  };

  const handleCartShare = async (platform: string) => {
    try {
      setSharing(platform);
      
      const cartData: CartShareData = {
        cartItems,
        totalAmount,
      };

      await ShareUtils.shareCart(
        cartData,
        platform,
        onShareSuccess
      );
    } catch (error) {
      console.error('Error sharing cart:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu.');
    } finally {
      setSharing(null);
    }
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="share" size={16} color="#666" />
        <Text style={styles.title}>Sepetini Paylaş</Text>
        <View style={styles.expBadge}>
          <Text style={styles.expText}>+25 EXP</Text>
        </View>
      </View>
      
      <View style={styles.buttonsContainer}>
        {socialPlatforms.map((platform) => (
          <TouchableOpacity
            key={platform.id}
            style={[
              styles.shareButton,
              { backgroundColor: platform.color },
              sharing === platform.id && styles.sharingButton,
            ]}
            onPress={() => handleCartShare(platform.id)}
            disabled={sharing !== null}
          >
            {platform.iconType === 'ionicons' ? (
              <Ionicons
                name={platform.icon as any}
                size={18}
                color="#FFFFFF"
              />
            ) : (
              <Icon
                name={platform.icon}
                size={18}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 6,
    flex: 1,
  },
  expBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a855f7',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shareButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sharingButton: {
    opacity: 0.6,
  },
});
