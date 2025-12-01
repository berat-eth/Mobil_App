import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { CartController } from '../controllers/CartController';
import { OrderController } from '../controllers/OrderController';
import { ProductController } from '../controllers/ProductController';
import { UserController } from '../controllers/UserController';
import { apiService } from '../utils/api-service';
import { CartItem } from '../utils/types';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { useAppContext } from '../contexts/AppContext';
import { StatusBar } from 'expo-status-bar';
import PaymentService from '../services/PaymentService';
import EFT_DETAILS from '../utils/payment-config';
import NfcCardService, { NfcCardData } from '../services/NfcCardService';
import * as Clipboard from 'expo-clipboard';

interface OrderScreenProps {
  navigation: any;
  route: {
    params: {
      cartItems: CartItem[];
      subtotal: number;
      shipping: number;
      total: number;
      checkoutStartTime?: number; // Opsiyonel: checkout başlangıç zamanı
    };
  };
}

export const OrderScreen: React.FC<OrderScreenProps> = ({ navigation, route }) => {
  const { cartItems, subtotal, shipping, total } = route.params;
  const { updateCart, dispatch } = useAppContext();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form states
  const [deliveryInfo, setDeliveryInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'eft' | 'nfc' | 'wallet'>('credit_card');
  
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
  });
  const [nfcCardData, setNfcCardData] = useState<NfcCardData | null>(null);
  const [nfcSupported, setNfcSupported] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const steps = [
    { title: 'Teslimat Bilgileri', icon: 'location-on' },
    { title: 'Ödeme Yöntemi', icon: 'payment' },
    { title: 'Sipariş Özeti', icon: 'receipt' },
  ];

  const handleNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  // Sepet terk tracking - component unmount veya navigation leave
  // NFC desteğini kontrol et
  React.useEffect(() => {
    (async () => {
      try {
        console.log('🔍 OrderScreen: NFC desteği kontrol ediliyor...');
        const supported = await NfcCardService.isSupported();
        console.log('📱 OrderScreen: NFC desteği sonucu:', supported);
        setNfcSupported(supported);
        
        if (supported) {
          console.log('🔧 OrderScreen: NFC Manager başlatılıyor...');
          const initResult = await NfcCardService.init();
          console.log('✅ OrderScreen: NFC Manager başlatma sonucu:', initResult);
        } else {
          console.log('⚠️ OrderScreen: NFC desteklenmiyor veya etkin değil');
        }
      } catch (error) {
        console.error('❌ OrderScreen: NFC kontrol hatası:', error);
        setNfcSupported(false);
      }
    })();
  }, []);

  // Kullanıcı bilgileri varsa teslimat formunu otomatik doldur
  React.useEffect(() => {
    (async () => {
      try {
        const user = await UserController.getCurrentUser();
        if (!user) return;
        setDeliveryInfo(prev => ({
          ...prev,
          firstName: prev.firstName?.trim() ? prev.firstName : (user.name || '').split(' ')[0] || '',
          lastName: prev.lastName?.trim() ? prev.lastName : (user.name || '').split(' ').slice(1).join(' ') || '',
          email: prev.email?.trim() ? prev.email : (user.email || ''),
          phone: prev.phone?.trim() ? prev.phone : (user.phone || ''),
          address: prev.address,
          city: prev.city,
          district: prev.district,
          postalCode: prev.postalCode,
        }));
      } catch {}
    })();
  }, []);

  // Cüzdan bakiyesi yükle (Ödeme Yöntemi adımında gösterilecek)
  React.useEffect(() => {
    (async () => {
      try {
        setLoadingWallet(true);
        const id = await UserController.getCurrentUserId();
        const res = await apiService.getWallet(id);
        if (res.success && res.data) {
          setWalletBalance(res.data.balance ?? 0);
        } else {
          setWalletBalance(0);
        }
      } catch (e) {
        setWalletBalance(0);
      } finally {
        setLoadingWallet(false);
      }
    })();
  }, []);

  const handleReadCardViaNfc = useCallback(async () => {
    try {
      console.log('📱 NFC kart okuma ekranına gidiliyor...');
      navigation.navigate('NfcScan', {
        onResult: (data: NfcCardData | null) => {
          if (!data || !data.pan) {
            Alert.alert('Hata', 'Kart okunamadı. Lütfen tekrar deneyin.');
            return;
          }
          // NFC ile okunan kart bilgilerini kaydet
          setNfcCardData(data);
          const formattedPan = data.pan.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
          const expiry = data.expiryMonth && data.expiryYear
            ? `${data.expiryMonth}/${data.expiryYear.slice(-2)}`
            : undefined;
          setCardInfo(prev => ({
            ...prev,
            cardNumber: formattedPan || prev.cardNumber,
            expiryDate: expiry || prev.expiryDate,
          }));
          // NFC ödeme yöntemine geç
          setPaymentMethod('nfc');
          Alert.alert(
            'Kart Okundu',
            'Kart bilgileri okundu. Ödeme için CVC kodunu girmeniz gerekiyor.',
            [{ text: 'Tamam' }]
          );
        }
      });
    } catch (error) {
      console.error('❌ NFC okuma navigasyon hatası:', error);
      Alert.alert('Hata', 'NFC okuma başlatılamadı.');
    }
  }, [navigation]);

  const handleCopy = useCallback(async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert('Kopyalandı', `${label} kopyalandı.`);
    } catch {}
  }, []);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const validateDeliveryInfo = useCallback(() => {
    const { firstName, lastName, phone, address, city, district } = deliveryInfo;
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !address.trim() || !city.trim() || !district.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun.');
      return false;
    }
    if (phone.length < 10) {
      Alert.alert('Geçersiz Telefon', 'Lütfen geçerli bir telefon numarası girin.');
      return false;
    }
    return true;
  }, [deliveryInfo]);

  const validatePaymentInfo = useCallback(() => {
    if (paymentMethod === 'credit_card') {
      const { cardNumber, expiryDate, cvv, cardHolder } = cardInfo;
      if (!cardNumber.trim() || !expiryDate.trim() || !cvv.trim() || !cardHolder.trim()) {
        Alert.alert('Eksik Bilgi', 'Lütfen tüm kart bilgilerini doldurun.');
        return false;
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        Alert.alert('Geçersiz Kart', 'Lütfen geçerli bir kart numarası girin.');
        return false;
      }
    } else if (paymentMethod === 'nfc') {
      // NFC ödeme için kontrol
      if (!nfcCardData || !nfcCardData.pan) {
        Alert.alert('Eksik Bilgi', 'Lütfen NFC ile kartınızı okutun.');
        return false;
      }
      if (!cardInfo.cvv || cardInfo.cvv.length < 3) {
        Alert.alert('Eksik Bilgi', 'Lütfen CVC kodunu girin.');
        return false;
      }
      if (!cardInfo.cardHolder || cardInfo.cardHolder.trim().length < 3) {
        Alert.alert('Eksik Bilgi', 'Lütfen kart sahibi adını girin.');
        return false;
      }
    }
    return true;
  }, [paymentMethod, cardInfo, nfcCardData]);

  const handleCompleteOrder = useCallback(async () => {
    setLoading(true);
    try {
      const fullAddress = `${deliveryInfo.address}, ${deliveryInfo.district}, ${deliveryInfo.city} ${deliveryInfo.postalCode}`;
      const shippingAddress = `${deliveryInfo.firstName} ${deliveryInfo.lastName}\n${deliveryInfo.phone}\n${fullAddress}`;
      
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      
      // Creating order with data
      
      const result = await OrderController.createOrder(
        userId,
        shippingAddress,
        paymentMethod,
        deliveryInfo.city,
        deliveryInfo.district,
        fullAddress
      );

      if (result.success) {
        // Order created successfully
        if (paymentMethod === 'credit_card' || paymentMethod === 'nfc') {
          // Process payment via İyzico
          // NFC ile okunan kart bilgilerini kullan
          let expireMonth = '';
          let expireYear = '';
          
          if (paymentMethod === 'nfc' && nfcCardData) {
            // NFC'den okunan tarih bilgilerini kullan
            expireMonth = (nfcCardData.expiryMonth || '').padStart(2, '0');
            expireYear = nfcCardData.expiryYear || '';
          } else {
            // Manuel girilen tarih bilgilerini kullan
            const [expMonthRaw, expYearRaw] = (cardInfo.expiryDate || '').split('/')
              .map(part => (part || '').replace(/\D/g, ''));
            expireMonth = (expMonthRaw || '').padStart(2, '0');
            expireYear = (expYearRaw && expYearRaw.length === 2) ? `20${expYearRaw}` : (expYearRaw || '');
          }
          
          // CVC kontrolü
          if (!cardInfo.cvv || cardInfo.cvv.length < 3) {
            Alert.alert('Eksik Bilgi', 'Lütfen CVC kodunu girin.');
            setLoading(false);
            return;
          }
          
          // Kart sahibi adı kontrolü
          if (!cardInfo.cardHolder || cardInfo.cardHolder.trim().length < 3) {
            Alert.alert('Eksik Bilgi', 'Lütfen kart sahibi adını girin.');
            setLoading(false);
            return;
          }

          // NFC ile okunan kart numarasını kullan
          const cardNumber = paymentMethod === 'nfc' && nfcCardData?.pan 
            ? nfcCardData.pan.replace(/\s/g, '')
            : cardInfo.cardNumber.replace(/\s/g, '');

          const paymentResponse = await PaymentService.processPayment({
            orderId: result.orderId!,
            paymentCard: {
              cardHolderName: cardInfo.cardHolder.trim(),
              cardNumber: cardNumber,
              expireMonth,
              expireYear,
              cvc: cardInfo.cvv
            },
            buyer: {
              id: userId,
              name: deliveryInfo.firstName || 'Müşteri',
              surname: deliveryInfo.lastName || 'Müşteri',
              gsmNumber: deliveryInfo.phone || '',
              email: deliveryInfo.email || '',
              registrationAddress: fullAddress,
              city: deliveryInfo.city || '',
              country: 'Turkey',
              zipCode: deliveryInfo.postalCode || '34000'
            },
            shippingAddress: {
              contactName: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`.trim(),
              city: deliveryInfo.city || '',
              country: 'Turkey',
              address: fullAddress,
              zipCode: deliveryInfo.postalCode || '34000'
            },
            billingAddress: {
              contactName: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`.trim(),
              city: deliveryInfo.city || '',
              country: 'Turkey',
              address: fullAddress,
              zipCode: deliveryInfo.postalCode || '34000'
            }
          });

          if (!paymentResponse.success) {
            Alert.alert('Ödeme Hatası', paymentResponse.message || 'Kart ödemesi başarısız. Lütfen tekrar deneyin.');
            return; // Sepeti temizleme ve yönlendirme yapma
          }
        }

        // Clear cart after successful order (and payment if credit card)
        await CartController.clearCart(userId);
        // Context'i temizle (CLEAR_CART action ile)
        dispatch({ type: 'CLEAR_CART' });
        // Ayrıca updateCart ile de güncelle (backward compatibility)
        updateCart({
          items: [],
          total: 0,
          itemCount: 0,
          lastUpdated: new Date().toISOString(),
        });

        // Sipariş başarılı modalını göster
        setOrderId(result.orderId || null);
        setShowSuccessModal(true);
      } else {
        // Order creation failed
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('❌ Order creation error:', error);
      Alert.alert('Hata', 'Sipariş oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [deliveryInfo, paymentMethod, navigation, updateCart]);

  const renderHeader = useCallback(() => null, []);

  // Tab bar yüksekliğini hesapla (butonun tab bar'ın üstünde görünmesi için)
  const tabBarHeight = React.useMemo(() => {
    // Tab bar yüksekliği: 70px (tabBar height) + 8px (paddingTop) + 8px (paddingBottom) + safe area
    const tabBarBaseHeight = 70 + 8 + 8; // 86px
    const safeAreaBottom = Math.max(insets.bottom, 8);
    return tabBarBaseHeight + safeAreaBottom;
  }, [insets.bottom]);

  // Bottom actions yüksekliğini hesapla (dinamik padding için)
  const bottomActionsHeight = React.useMemo(() => {
    const buttonHeight = 50; // paddingVertical + text height
    const padding = Spacing.md * 2; // top + bottom padding
    const safeAreaBottom = Math.max(insets.bottom, Spacing.md) + Spacing.md;
    return buttonHeight + padding + safeAreaBottom + 40; // ekstra güvenlik marjı artırıldı
  }, [insets.bottom]);

  const renderDeliveryStep = useCallback(() => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: bottomActionsHeight }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Modern Header Section */}
      <View style={styles.deliveryHeader}>
        <View style={styles.headerIconContainer}>
          <Icon name="local-shipping" size={28} color={Colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.deliveryTitle}>Teslimat Bilgileri</Text>
          <Text style={styles.deliverySubtitle}>Siparişinizin teslim edileceği adresi girin</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        {/* Kişisel Bilgiler Bölümü */}
        <View style={styles.sectionHeader}>
          <Icon name="person" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
        </View>
        
        <View style={styles.inputRow}>
          <View style={[styles.modernInputContainer, { flex: 1, marginRight: 8 }]}>
            <View style={styles.inputLabelContainer}>
              <Icon name="badge" size={16} color="#6B7280" />
              <Text style={styles.modernInputLabel}>Ad *</Text>
            </View>
            <TextInput
              style={styles.modernTextInput}
              value={deliveryInfo.firstName}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, firstName: text }))}
              placeholder="Adınız"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[styles.modernInputContainer, { flex: 1, marginLeft: 8 }]}>
            <View style={styles.inputLabelContainer}>
              <Icon name="badge" size={16} color="#6B7280" />
              <Text style={styles.modernInputLabel}>Soyad *</Text>
            </View>
            <TextInput
              style={styles.modernTextInput}
              value={deliveryInfo.lastName}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, lastName: text }))}
              placeholder="Soyadınız"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.modernInputContainer}>
          <View style={styles.inputLabelContainer}>
            <Icon name="phone" size={16} color="#6B7280" />
            <Text style={styles.modernInputLabel}>Telefon *</Text>
          </View>
          <TextInput
            style={styles.modernTextInput}
            value={deliveryInfo.phone}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, phone: text }))}
            placeholder="0555 123 45 67"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.modernInputContainer}>
          <View style={styles.inputLabelContainer}>
            <Icon name="email" size={16} color="#6B7280" />
            <Text style={styles.modernInputLabel}>E-posta</Text>
          </View>
          <TextInput
            style={styles.modernTextInput}
            value={deliveryInfo.email}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, email: text }))}
            placeholder="ornek@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Adres Bilgileri Bölümü */}
        <View style={styles.sectionDivider} />
        <View style={styles.sectionHeader}>
          <Icon name="location-on" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Adres Bilgileri</Text>
        </View>

        <View style={styles.modernInputContainer}>
          <View style={styles.inputLabelContainer}>
            <Icon name="home" size={16} color="#6B7280" />
            <Text style={styles.modernInputLabel}>Adres *</Text>
          </View>
          <TextInput
            style={[styles.modernTextInput, styles.modernTextArea]}
            value={deliveryInfo.address}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, address: text }))}
            placeholder="Mahalle, sokak, bina no, daire no"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.modernInputContainer, { flex: 1, marginRight: 8 }]}>
            <View style={styles.inputLabelContainer}>
              <Icon name="location-city" size={16} color="#6B7280" />
              <Text style={styles.modernInputLabel}>Şehir *</Text>
            </View>
            <TextInput
              style={styles.modernTextInput}
              value={deliveryInfo.city}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, city: text }))}
              placeholder="İstanbul"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[styles.modernInputContainer, { flex: 1, marginLeft: 8 }]}>
            <View style={styles.inputLabelContainer}>
              <Icon name="place" size={16} color="#6B7280" />
              <Text style={styles.modernInputLabel}>İlçe *</Text>
            </View>
            <TextInput
              style={styles.modernTextInput}
              value={deliveryInfo.district}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, district: text }))}
              placeholder="Kadıköy"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.modernInputContainer}>
          <View style={styles.inputLabelContainer}>
            <Icon name="markunread-mailbox" size={16} color="#6B7280" />
            <Text style={styles.modernInputLabel}>Posta Kodu</Text>
          </View>
          <TextInput
            style={styles.modernTextInput}
            value={deliveryInfo.postalCode}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, postalCode: text }))}
            placeholder="34000"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>
      </View>
    </ScrollView>
  ), [deliveryInfo, bottomActionsHeight]);

  const renderPaymentStep = useCallback(() => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: bottomActionsHeight }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Modern Header Section */}
      <View style={styles.paymentHeader}>
        <View style={styles.headerIconContainer}>
          <Icon name="payment" size={28} color={Colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.paymentTitle}>Ödeme Yöntemi</Text>
          <Text style={styles.paymentSubtitle}>Siparişiniz için ödeme yöntemi seçin</Text>
        </View>
      </View>

      {/* Cüzdan Bakiyesi Kartı */}
      <View style={styles.walletBalanceCard}>
        <View style={styles.walletBalanceHeader}>
          <View style={styles.walletIconContainer}>
            <Icon name="account-balance-wallet" size={24} color={Colors.primary} />
          </View>
          <View style={styles.walletBalanceInfo}>
            <Text style={styles.walletBalanceLabel}>Cüzdan Bakiyesi</Text>
            {loadingWallet ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.walletBalanceAmount}>
                {ProductController.formatPrice((walletBalance ?? 0))}
              </Text>
            )}
          </View>
        </View>
        {walletBalance != null && walletBalance < total && (
          <View style={styles.walletWarning}>
            <Icon name="warning" size={16} color="#DC2626" />
            <Text style={styles.walletWarningText}>
              Yetersiz bakiye. {ProductController.formatPrice(total - (walletBalance || 0))} daha gerekli.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.formCard}>
        {/* Ödeme Yöntemleri Bölümü */}
        <View style={styles.sectionHeader}>
          <Icon name="payment" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Ödeme Yöntemleri</Text>
        </View>

        <View style={styles.paymentMethods}>
          <TouchableOpacity
            style={[
              styles.modernPaymentOption,
              paymentMethod === 'credit_card' && styles.modernPaymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('credit_card')}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={[
                styles.paymentIconContainer,
                paymentMethod === 'credit_card' && styles.paymentIconContainerActive
              ]}>
                <Icon name="credit-card" size={24} color={paymentMethod === 'credit_card' ? '#FFFFFF' : Colors.primary} />
              </View>
              <View style={styles.paymentOptionTextContainer}>
                <Text style={[
                  styles.modernPaymentOptionText,
                  paymentMethod === 'credit_card' && styles.modernPaymentOptionTextActive
                ]}>
                  Kredi/Banka Kartı
                </Text>
                <Text style={styles.paymentOptionSubtext}>Visa, Mastercard, Troy</Text>
              </View>
            </View>
            <View style={[
              styles.paymentRadioButton,
              paymentMethod === 'credit_card' && styles.paymentRadioButtonActive
            ]}>
              {paymentMethod === 'credit_card' && (
                <View style={styles.paymentRadioButtonInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernPaymentOption,
              paymentMethod === 'eft' && styles.modernPaymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('eft')}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={[
                styles.paymentIconContainer,
                paymentMethod === 'eft' && styles.paymentIconContainerActive
              ]}>
                <Icon name="account-balance" size={24} color={paymentMethod === 'eft' ? '#FFFFFF' : Colors.primary} />
              </View>
              <View style={styles.paymentOptionTextContainer}>
                <Text style={[
                  styles.modernPaymentOptionText,
                  paymentMethod === 'eft' && styles.modernPaymentOptionTextActive
                ]}>
                  EFT/Havale
                </Text>
                <Text style={styles.paymentOptionSubtext}>Banka havalesi ile ödeme</Text>
              </View>
            </View>
            <View style={[
              styles.paymentRadioButton,
              paymentMethod === 'eft' && styles.paymentRadioButtonActive
            ]}>
              {paymentMethod === 'eft' && (
                <View style={styles.paymentRadioButtonInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernPaymentOption,
              paymentMethod === 'wallet' && styles.modernPaymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('wallet')}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={[
                styles.paymentIconContainer,
                paymentMethod === 'wallet' && styles.paymentIconContainerActive
              ]}>
                <Icon name="account-balance-wallet" size={24} color={paymentMethod === 'wallet' ? '#FFFFFF' : Colors.primary} />
              </View>
              <View style={styles.paymentOptionTextContainer}>
                <Text style={[
                  styles.modernPaymentOptionText,
                  paymentMethod === 'wallet' && styles.modernPaymentOptionTextActive
                ]}>
                  Cüzdan (Bakiye)
                </Text>
                <Text style={styles.paymentOptionSubtext}>
                  {walletBalance != null && walletBalance >= total 
                    ? 'Yeterli bakiye mevcut' 
                    : 'Yetersiz bakiye'}
                </Text>
              </View>
            </View>
            <View style={[
              styles.paymentRadioButton,
              paymentMethod === 'wallet' && styles.paymentRadioButtonActive
            ]}>
              {paymentMethod === 'wallet' && (
                <View style={styles.paymentRadioButtonInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernPaymentOption,
              paymentMethod === 'nfc' && styles.modernPaymentOptionSelected,
              !nfcSupported && styles.modernPaymentOptionDisabled
            ]}
            onPress={() => {
              if (!nfcSupported) {
                Alert.alert(
                  'NFC Desteklenmiyor',
                  'Bu cihazda NFC özelliği desteklenmiyor veya etkin değil. Lütfen NFC ayarlarını kontrol edin veya başka bir ödeme yöntemi seçin.',
                  [{ text: 'Tamam' }]
                );
                return;
              }
              console.log('📱 NFC ödeme seçeneği seçildi');
              setPaymentMethod('nfc');
            }}
            disabled={!nfcSupported}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={[
                styles.paymentIconContainer,
                paymentMethod === 'nfc' && styles.paymentIconContainerActive,
                !nfcSupported && styles.paymentIconContainerDisabled
              ]}>
                <Icon 
                  name="nfc" 
                  size={24} 
                  color={
                    !nfcSupported 
                      ? '#9CA3AF' 
                      : paymentMethod === 'nfc' 
                        ? '#FFFFFF' 
                        : Colors.primary
                  } 
                />
              </View>
              <View style={styles.paymentOptionTextContainer}>
                <Text style={[
                  styles.modernPaymentOptionText,
                  paymentMethod === 'nfc' && styles.modernPaymentOptionTextActive,
                  !nfcSupported && styles.modernPaymentOptionTextDisabled
                ]}>
                  Temassız (NFC)
                </Text>
                <Text style={[
                  styles.paymentOptionSubtext,
                  !nfcSupported && styles.paymentOptionSubtextDisabled
                ]}>
                  {nfcSupported 
                    ? 'Kartı telefonun arkasına yaklaştırın' 
                    : 'NFC desteklenmiyor'}
                </Text>
              </View>
            </View>
            <View style={[
              styles.paymentRadioButton,
              paymentMethod === 'nfc' && styles.paymentRadioButtonActive,
              !nfcSupported && styles.paymentRadioButtonDisabled
            ]}>
              {paymentMethod === 'nfc' && nfcSupported && (
                <View style={styles.paymentRadioButtonInner} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Credit Card Form */}
        {(paymentMethod === 'credit_card') && (
          <View style={styles.cardFormSection}>
            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeader}>
              <Icon name="credit-card" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Kart Bilgileri</Text>
            </View>

            <View style={styles.modernInputContainer}>
              <View style={styles.inputLabelContainer}>
                <Icon name="badge" size={16} color="#6B7280" />
                <Text style={styles.modernInputLabel}>Kart Üzerindeki İsim *</Text>
              </View>
              <TextInput
                style={styles.modernTextInput}
                value={cardInfo.cardHolder}
                onChangeText={(text) => setCardInfo(prev => ({ ...prev, cardHolder: text.toUpperCase() }))}
                placeholder="AHMET YILMAZ"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modernInputContainer}>
              <View style={styles.inputLabelContainer}>
                <Icon name="credit-card" size={16} color="#6B7280" />
                <Text style={styles.modernInputLabel}>Kart Numarası *</Text>
              </View>
              <TextInput
                style={styles.modernTextInput}
                value={cardInfo.cardNumber}
                onChangeText={(text) => {
                  // Format card number with spaces
                  const formatted = text.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                  if (formatted.length <= 19) {
                    setCardInfo(prev => ({ ...prev, cardNumber: formatted }));
                  }
                }}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.modernInputContainer, { flex: 1, marginRight: 8 }]}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="calendar-today" size={16} color="#6B7280" />
                  <Text style={styles.modernInputLabel}>Son Kullanma *</Text>
                </View>
                <TextInput
                  style={styles.modernTextInput}
                  value={cardInfo.expiryDate}
                  onChangeText={(text) => {
                    // Format MM/YY
                    const formatted = text.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                    if (formatted.length <= 5) {
                      setCardInfo(prev => ({ ...prev, expiryDate: formatted }));
                    }
                  }}
                  placeholder="MM/YY"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={[styles.modernInputContainer, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="lock" size={16} color="#6B7280" />
                  <Text style={styles.modernInputLabel}>CVV *</Text>
                </View>
                <TextInput
                  style={styles.modernTextInput}
                  value={cardInfo.cvv}
                  onChangeText={(text) => {
                    if (text.length <= 3) {
                      setCardInfo(prev => ({ ...prev, cvv: text }));
                    }
                  }}
                  placeholder="123"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            {nfcSupported && (
              <View style={styles.nfcButtonContainer}>
                <TouchableOpacity 
                  onPress={handleReadCardViaNfc} 
                  style={styles.nfcButton}
                >
                  <Icon name="nfc" size={20} color="#FFFFFF" />
                  <Text style={styles.nfcButtonText}>NFC ile Kartı Tara</Text>
                </TouchableOpacity>
                <Text style={styles.nfcButtonHint}>Kartı telefonun arkasına yaklaştırın</Text>
              </View>
            )}
          </View>
        )}

        {/* NFC Payment Panel */}
        {paymentMethod === 'nfc' && (
          <View style={styles.cardFormSection}>
            <View style={styles.sectionDivider} />
            
            {nfcCardData && nfcCardData.pan ? (
              // Kart Okundu - Modern Kart Görünümü
              <View style={styles.nfcModernContainer}>
                {/* Başarı Badge */}
                <View style={styles.nfcSuccessBadge}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.nfcSuccessBadgeText}>Kart Başarıyla Okundu</Text>
                </View>

                {/* Modern Kart Görünümü */}
                <View style={styles.nfcCardPreview}>
                  <View style={styles.nfcCardHeader}>
                    <View style={styles.nfcCardLogo}>
                      <Icon name="credit-card" size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.nfcCardChip}>
                      <Icon name="nfc" size={24} color="#FFD700" />
                    </View>
                  </View>
                  
                  <View style={styles.nfcCardNumberContainer}>
                    <Text style={styles.nfcCardNumber}>
                      {nfcCardData.pan.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim() || 
                       cardInfo.cardNumber || 
                       '**** **** **** ****'}
                    </Text>
                  </View>

                  <View style={styles.nfcCardFooter}>
                    <View style={styles.nfcCardFooterLeft}>
                      <Text style={styles.nfcCardLabel}>Kart Sahibi</Text>
                      <Text style={styles.nfcCardValue}>
                        {nfcCardData.cardHolderName || cardInfo.cardHolder || 'AD SOYAD'}
                      </Text>
                    </View>
                    <View style={styles.nfcCardFooterRight}>
                      <Text style={styles.nfcCardLabel}>Son Kullanma</Text>
                      <Text style={styles.nfcCardValue}>
                        {nfcCardData.expiryMonth && nfcCardData.expiryYear
                          ? `${nfcCardData.expiryMonth.padStart(2, '0')}/${nfcCardData.expiryYear.slice(-2)}`
                          : cardInfo.expiryDate || 'MM/YY'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Kart Bilgileri Detay */}
                <View style={styles.nfcCardDetailsContainer}>
                  <Text style={styles.nfcCardDetailsTitle}>Okunan Kart Bilgileri</Text>
                  
                  <View style={styles.nfcDetailRow}>
                    <View style={styles.nfcDetailIconContainer}>
                      <Icon name="credit-card" size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.nfcDetailContent}>
                      <Text style={styles.nfcDetailLabel}>Kart Numarası</Text>
                      <Text style={styles.nfcDetailValue}>
                        {nfcCardData.pan.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim() || 
                         cardInfo.cardNumber || 
                         'Okunamadı'}
                      </Text>
                    </View>
                  </View>

                  {nfcCardData.expiryMonth && nfcCardData.expiryYear && (
                    <View style={styles.nfcDetailRow}>
                      <View style={styles.nfcDetailIconContainer}>
                        <Icon name="calendar-today" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.nfcDetailContent}>
                        <Text style={styles.nfcDetailLabel}>Son Kullanma Tarihi</Text>
                        <Text style={styles.nfcDetailValue}>
                          {nfcCardData.expiryMonth.padStart(2, '0')}/{nfcCardData.expiryYear.slice(-2)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {nfcCardData.cardHolderName && (
                    <View style={styles.nfcDetailRow}>
                      <View style={styles.nfcDetailIconContainer}>
                        <Icon name="person" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.nfcDetailContent}>
                        <Text style={styles.nfcDetailLabel}>Kart Sahibi</Text>
                        <Text style={styles.nfcDetailValue}>{nfcCardData.cardHolderName}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* CVC ve Kart Sahibi Girişi */}
                <View style={styles.nfcInputSection}>
                  <Text style={styles.nfcInputSectionTitle}>Ödeme İçin Gerekli Bilgiler</Text>
                  
                  <View style={styles.nfcInputGroup}>
                    <Text style={styles.nfcInputLabel}>
                      CVC Kodu <Text style={styles.nfcRequired}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.nfcModernInput}
                      placeholder="123"
                      placeholderTextColor="#9CA3AF"
                      value={cardInfo.cvv}
                      onChangeText={(text) => setCardInfo(prev => ({ ...prev, cvv: text.replace(/\D/g, '').slice(0, 4) }))}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                    <Text style={styles.nfcInputHint}>
                      Kartınızın arkasındaki 3 haneli güvenlik kodu
                    </Text>
                  </View>

                  <View style={styles.nfcInputGroup}>
                    <Text style={styles.nfcInputLabel}>
                      Kart Sahibi Adı <Text style={styles.nfcRequired}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.nfcModernInput}
                      placeholder="Ad Soyad"
                      placeholderTextColor="#9CA3AF"
                      value={cardInfo.cardHolder}
                      onChangeText={(text) => setCardInfo(prev => ({ ...prev, cardHolder: text }))}
                      autoCapitalize="words"
                    />
                    <Text style={styles.nfcInputHint}>
                      Kart üzerindeki isimle aynı olmalıdır
                    </Text>
                  </View>
                </View>

                {/* Tekrar Tara Butonu */}
                <TouchableOpacity 
                  onPress={handleReadCardViaNfc} 
                  style={styles.nfcRescanButtonModern}
                >
                  <Icon name="refresh" size={20} color={Colors.primary} />
                  <Text style={styles.nfcRescanButtonTextModern}>Kartı Tekrar Tara</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Kart Okunmadı - Tarama Ekranı
              <View style={styles.nfcModernContainer}>
                <View style={styles.nfcScanHeader}>
                  <View style={styles.nfcScanIconContainer}>
                    <View style={styles.nfcScanIconCircle}>
                      <Icon name="nfc" size={48} color={Colors.primary} />
                    </View>
                    <View style={styles.nfcScanPulse} />
                  </View>
                  <Text style={styles.nfcScanTitle}>Temassız Ödeme</Text>
                  <Text style={styles.nfcScanSubtitle}>
                    Kartınızı telefonun arkasına yaklaştırın
                  </Text>
                </View>

                <View style={styles.nfcScanInstructions}>
                  <View style={styles.nfcInstructionItem}>
                    <View style={styles.nfcInstructionNumber}>
                      <Text style={styles.nfcInstructionNumberText}>1</Text>
                    </View>
                    <Text style={styles.nfcInstructionText}>
                      Kartınızı telefonun arkasına yaklaştırın
                    </Text>
                  </View>
                  <View style={styles.nfcInstructionItem}>
                    <View style={styles.nfcInstructionNumber}>
                      <Text style={styles.nfcInstructionNumberText}>2</Text>
                    </View>
                    <Text style={styles.nfcInstructionText}>
                      Kart bilgileri otomatik olarak okunacak
                    </Text>
                  </View>
                  <View style={styles.nfcInstructionItem}>
                    <View style={styles.nfcInstructionNumber}>
                      <Text style={styles.nfcInstructionNumberText}>3</Text>
                    </View>
                    <Text style={styles.nfcInstructionText}>
                      Güvenli ödeme için CVC kodunu girin
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={handleReadCardViaNfc} 
                  style={styles.nfcScanButtonModern}
                >
                  <Icon name="nfc" size={28} color="#FFFFFF" />
                  <Text style={styles.nfcScanButtonTextModern}>NFC ile Kartı Tara</Text>
                </TouchableOpacity>

                <View style={styles.nfcSecurityBadge}>
                  <Icon name="lock" size={16} color="#6B7280" />
                  <Text style={styles.nfcSecurityText}>
                    iyzico ile güvenli ödeme
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* EFT/Havale Bilgi Notu */}
        {paymentMethod === 'eft' && (
          <View style={styles.cardFormSection}>
            <View style={styles.sectionDivider} />
            <View style={styles.eftInfoCard}>
              <View style={styles.eftIconContainer}>
                <Icon name="account-balance" size={28} color="#FF8C00" />
              </View>
              <Text style={styles.eftTitle}>Banka Bilgileri</Text>
              <Text style={styles.eftDescription}>
                Sipariş tamamlandıktan sonra banka bilgileri gösterilecektir. Ödemenizi yaptıktan sonra siparişiniz işleme alınacaktır.
              </Text>
              <View style={styles.eftFeatures}>
                <View style={styles.eftFeature}>
                  <Icon name="check-circle" size={18} color="#10B981" />
                  <Text style={styles.eftFeatureText}>Güvenli ödeme</Text>
                </View>
                <View style={styles.eftFeature}>
                  <Icon name="check-circle" size={18} color="#10B981" />
                  <Text style={styles.eftFeatureText}>Hızlı onay</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  ), [paymentMethod, cardInfo, bottomActionsHeight, walletBalance, total, loadingWallet, nfcSupported, handleReadCardViaNfc]);

  const renderSummaryStep = useCallback(() => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: bottomActionsHeight }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Modern Header Section */}
      <View style={styles.summaryHeader}>
        <View style={styles.headerIconContainer}>
          <Icon name="receipt" size={28} color={Colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
          <Text style={styles.summarySubtitle}>Siparişinizi kontrol edip onaylayın</Text>
        </View>
      </View>

      {/* Ürünler Bölümü */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <Icon name="shopping-cart" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Sipariş Edilen Ürünler</Text>
        </View>
        
        <View style={styles.modernOrderItems}>
          {cartItems.map((item, index) => (
            <View key={index} style={styles.modernOrderItem}>
              <View style={styles.orderItemContent}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.modernOrderItemName} numberOfLines={2}>
                    {item.product?.name || 'Ürün'}
                  </Text>
                  <Text style={styles.modernOrderItemDetails}>
                    {item.quantity} adet × {ProductController.formatPrice(Number(item.product?.price) || 0)}
                  </Text>
                </View>
                <View style={styles.orderItemPriceContainer}>
                  <Text style={styles.modernOrderItemTotal}>
                    {ProductController.formatPrice((Number(item.product?.price) || 0) * item.quantity)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Fiyat Özeti */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <Icon name="attach-money" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Fiyat Özeti</Text>
        </View>

        <View style={styles.modernPriceSummary}>
          <View style={styles.modernPriceRow}>
            <View style={styles.priceLabelContainer}>
              <Icon name="receipt" size={16} color="#6B7280" style={{ marginRight: Spacing.xs }} />
              <Text style={styles.modernPriceLabel}>Ara Toplam</Text>
            </View>
            <Text style={styles.modernPriceValue}>
              {ProductController.formatPrice(Number(subtotal) || 0)}
            </Text>
          </View>
          <View style={styles.modernPriceRow}>
            <View style={styles.priceLabelContainer}>
              <Icon name="local-shipping" size={16} color="#6B7280" style={{ marginRight: Spacing.xs }} />
              <Text style={styles.modernPriceLabel}>Kargo</Text>
            </View>
            <Text style={styles.modernPriceValue}>
              {ProductController.formatPrice(Number(shipping) || 0)}
            </Text>
          </View>
          <View style={styles.modernPriceDivider} />
          <View style={styles.modernTotalRow}>
            <View style={styles.totalLabelContainer}>
              <Icon name="payments" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
              <Text style={styles.modernTotalLabel}>Toplam</Text>
            </View>
            <Text style={styles.modernTotalValue}>
              {ProductController.formatPrice(Number(total) || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Teslimat Bilgileri */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <Icon name="location-on" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Teslimat Bilgileri</Text>
        </View>
        
        <View style={styles.modernInfoCard}>
          <View style={styles.infoRow}>
            <Icon name="person" size={18} color="#6B7280" style={{ marginRight: Spacing.sm }} />
            <Text style={styles.modernInfoText}>
              {deliveryInfo.firstName} {deliveryInfo.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone" size={18} color="#6B7280" style={{ marginRight: Spacing.sm }} />
            <Text style={styles.modernInfoText}>{deliveryInfo.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="home" size={18} color="#6B7280" style={{ marginRight: Spacing.sm }} />
            <Text style={styles.modernInfoText} numberOfLines={2}>
              {deliveryInfo.address}, {deliveryInfo.district}, {deliveryInfo.city}
            </Text>
          </View>
        </View>
      </View>

      {/* Ödeme Yöntemi */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <Icon name="payment" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Ödeme Yöntemi</Text>
        </View>
        
        <View style={styles.modernInfoCard}>
          <View style={styles.infoRow}>
            <Icon 
              name={
                paymentMethod === 'credit_card' ? 'credit-card' : 
                paymentMethod === 'eft' ? 'account-balance' : 
                paymentMethod === 'wallet' ? 'account-balance-wallet' : 
                'nfc'
              } 
              size={18} 
              color={Colors.primary}
              style={{ marginRight: Spacing.sm }}
            />
            <View style={styles.paymentInfoContainer}>
              <Text style={styles.modernInfoText}>
                {paymentMethod === 'credit_card' ? 'Kredi/Banka Kartı' : 
                 paymentMethod === 'eft' ? 'EFT/Havale' : 
                 paymentMethod === 'wallet' ? 'Cüzdan (Bakiye)' : 
                 'Temassız (NFC)'}
              </Text>
              {paymentMethod === 'credit_card' && cardInfo.cardNumber && (
                <Text style={styles.modernInfoSubtext}>
                  **** **** **** {cardInfo.cardNumber.slice(-4)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  ), [cartItems, subtotal, shipping, total, deliveryInfo, paymentMethod, cardInfo, bottomActionsHeight]);

  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      case 0:
        return renderDeliveryStep();
      case 1:
        return renderPaymentStep();
      case 2:
        return renderSummaryStep();
      default:
        return renderDeliveryStep();
    }
  }, [currentStep, renderDeliveryStep, renderPaymentStep, renderSummaryStep]);

  // Success Modal
  const renderSuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalContent}>
          {/* Success Icon */}
          <View style={styles.successIconWrapper}>
            <View style={styles.successIconCircle}>
              <Icon name="check-circle" size={64} color="#10B981" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.successModalTitle}>Sipariş Oluşturuldu!</Text>

          {/* Message */}
          <View style={styles.successModalMessage}>
            <Text style={styles.successModalText}>
              Siparişiniz başarıyla oluşturuldu.
            </Text>
            <Text style={styles.successModalOrderNumber}>
              Sipariş No: #{orderId}
            </Text>
            {paymentMethod === 'eft' && (
              <Text style={styles.successModalSubtext}>
                Ödeme için banka bilgileri bir sonraki ekranda gösterilecektir.
              </Text>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.successModalButton}
            onPress={() => {
              setShowSuccessModal(false);
              if (paymentMethod === 'eft') {
                setShowBankInfoModal(true);
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
                navigation.navigate('Orders');
              }
            }}
          >
            <Text style={styles.successModalButtonText}>
              {paymentMethod === 'eft' ? 'BANKA BİLGİLERİNİ GÖR' : 'SİPARİŞLERİM'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Bank Info Modal
  const renderBankInfoModal = () => (
    <Modal
      visible={showBankInfoModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBankInfoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.bankInfoModalContent}>
          {/* Header */}
          <View style={styles.bankInfoModalHeader}>
            <View style={styles.bankInfoHeaderLeft}>
              <View style={styles.bankInfoIconContainer}>
                <Icon name="account-balance" size={28} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.bankInfoModalTitle}>Banka Bilgileri</Text>
                <Text style={styles.bankInfoModalSubtitle}>Ödeme için aşağıdaki bilgileri kullanın</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.bankInfoCloseButton}
              onPress={() => setShowBankInfoModal(false)}
            >
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Bank Info Card */}
          <ScrollView 
            style={styles.bankInfoScroll} 
            contentContainerStyle={styles.bankInfoScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.bankInfoCard}>
              <View style={styles.bankInfoItem}>
                <View style={styles.bankInfoItemHeader}>
                  <Icon name="account-balance" size={20} color="#6B7280" style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.bankInfoLabel}>Hesap Sahibi</Text>
                </View>
                <TouchableOpacity
                  style={styles.bankInfoValueContainer}
                  onPress={() => handleCopy(EFT_DETAILS.accountName, 'Hesap Sahibi')}
                >
                  <Text style={styles.bankInfoValue}>{EFT_DETAILS.accountName}</Text>
                  <Icon name="content-copy" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.bankInfoItem}>
                <View style={styles.bankInfoItemHeader}>
                  <Icon name="credit-card" size={20} color="#6B7280" style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.bankInfoLabel}>IBAN</Text>
                </View>
                <TouchableOpacity
                  style={styles.bankInfoValueContainer}
                  onPress={() => handleCopy(EFT_DETAILS.iban, 'IBAN')}
                >
                  <Text style={styles.bankInfoValue}>{EFT_DETAILS.iban}</Text>
                  <Icon name="content-copy" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.bankInfoItem}>
                <View style={styles.bankInfoItemHeader}>
                  <Icon name="attach-money" size={20} color="#6B7280" style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.bankInfoLabel}>Tutar</Text>
                </View>
                <Text style={styles.bankInfoAmount}>
                  {ProductController.formatPrice(total).replace(/\$/g, '₺')}
                </Text>
              </View>

              <View style={styles.bankInfoItem}>
                <View style={styles.bankInfoItemHeader}>
                  <Icon name="description" size={20} color="#6B7280" style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.bankInfoLabel}>Açıklama</Text>
                </View>
                <TouchableOpacity
                  style={styles.bankInfoValueContainer}
                  onPress={() => handleCopy(`Sipariş #${orderId}`, 'Açıklama')}
                >
                  <Text style={styles.bankInfoValue}>Sipariş #{orderId}</Text>
                  <Icon name="content-copy" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Warning Card */}
            <View style={styles.bankInfoWarningCard}>
              <View style={styles.bankInfoWarningHeader}>
                <Icon name="warning" size={24} color="#F59E0B" />
                <Text style={styles.bankInfoWarningTitle}>Önemli</Text>
              </View>
              <Text style={styles.bankInfoWarningText}>
                Havale açıklamasına mutlaka sipariş numaranızı (#{orderId}) yazınız. Ödemeniz onaylandığında siparişiniz işleme alınacaktır.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.bankInfoModalActions}>
            <TouchableOpacity
              style={styles.bankInfoSecondaryButton}
              onPress={() => {
                setShowBankInfoModal(false);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              }}
            >
              <Text style={styles.bankInfoSecondaryButtonText}>Ana Sayfa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bankInfoPrimaryButton}
              onPress={() => {
                setShowBankInfoModal(false);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
                navigation.navigate('Orders');
              }}
            >
              <Text style={styles.bankInfoPrimaryButtonText}>Siparişlerim</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleStepAction = useCallback(() => {
    if (currentStep === 0) {
      if (validateDeliveryInfo()) {
        handleNextStep();
      }
    } else if (currentStep === 1) {
      if (validatePaymentInfo()) {
        handleNextStep();
      }
    } else if (currentStep === 2) {
      handleCompleteOrder();
    }
  }, [currentStep, validateDeliveryInfo, validatePaymentInfo, handleNextStep, handleCompleteOrder]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* header kaldırıldı */}
        
        <View style={styles.content}>
          {renderStepContent()}
        </View>
      </KeyboardAvoidingView>
      
      {/* Bottom Actions - SafeAreaView içinde ama KeyboardAvoidingView dışında */}
      <View style={[
        styles.bottomActions, 
        { 
          bottom: tabBarHeight, // Tab bar'ın üstüne yerleştir
          paddingBottom: Math.max(insets.bottom, Spacing.sm) + Spacing.sm 
        }
      ]}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handlePrevStep}
          >
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.nextButton, currentStep === 0 && styles.nextButtonFull]}
          onPress={handleStepAction}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'İşleniyor...' : 
             currentStep === 2 ? 'Siparişi Onayla' : 'Devam Et'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderSuccessModal()}
      {renderBankInfoModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header Styles
  headerGradient: {
    paddingBottom: Spacing.lg,
    ...Shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontWeight: '400',
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: '50%',
    right: '-50%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },

  // KeyboardAvoidingView
  keyboardAvoidingView: {
    flex: 1,
  },
  // Content
  content: {
    flex: 1,
    paddingBottom: 120, // Bottom actions için alan (artırıldı)
  },
  stepContent: {
    flex: 1,
    padding: Spacing.md,
  },
  scrollContentContainer: {
    paddingBottom: 100, // Varsayılan değer, dinamik olarak override edilecek
  },

  // Form Styles
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  deliverySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  walletBalanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...Shadows.medium,
  },
  walletBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  walletBalanceInfo: {
    flex: 1,
  },
  walletBalanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  walletBalanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  walletWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  walletWarningText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: Spacing.xs,
    flex: 1,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: Spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: Spacing.lg,
    marginHorizontal: -Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: Spacing.xs,
  },
  modernInputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modernInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  modernTextInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modernTextArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md + 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Payment Methods
  paymentMethods: {
    marginBottom: Spacing.lg,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F8F9FF',
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginLeft: Spacing.md,
  },
  modernPaymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md + 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    ...Shadows.small,
  },
  modernPaymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
    ...Shadows.medium,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  paymentIconContainerActive: {
    backgroundColor: Colors.primary,
  },
  paymentOptionTextContainer: {
    flex: 1,
  },
  modernPaymentOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  modernPaymentOptionTextActive: {
    color: Colors.primary,
  },
  paymentOptionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentOptionSubtextDisabled: {
    color: '#9CA3AF',
  },
  modernPaymentOptionDisabled: {
    opacity: 0.6,
  },
  paymentIconContainerDisabled: {
    backgroundColor: '#F3F4F6',
  },
  modernPaymentOptionTextDisabled: {
    color: '#9CA3AF',
  },
  paymentRadioButtonDisabled: {
    borderColor: '#D1D5DB',
  },
  paymentRadioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  paymentRadioButtonActive: {
    borderColor: Colors.primary,
  },
  paymentRadioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  cardForm: {
    marginTop: Spacing.md,
  },
  cardFormSection: {
    marginTop: Spacing.lg,
  },
  nfcButtonContainer: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  nfcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  nfcButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  nfcButtonHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  nfcInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nfcIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nfcTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.sm,
  },
  nfcDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  nfcBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    marginBottom: Spacing.lg,
  },
  nfcBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  nfcScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  nfcScanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  nfcCardInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  nfcCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  nfcCardInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: Spacing.xs,
    marginRight: Spacing.sm,
  },
  nfcCardInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  nfcCvcContainer: {
    marginTop: Spacing.md,
    width: '100%',
  },
  nfcCvcLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: Spacing.xs,
  },
  // Modern NFC Styles
  nfcModernContainer: {
    width: '100%',
  },
  nfcSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  nfcSuccessBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  nfcCardPreview: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    minHeight: 200,
    justifyContent: 'space-between',
    ...Shadows.large,
  },
  nfcCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  nfcCardLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcCardChip: {
    width: 40,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcCardNumberContainer: {
    marginBottom: Spacing.xl,
  },
  nfcCardNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  nfcCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  nfcCardFooterLeft: {
    flex: 1,
  },
  nfcCardFooterRight: {
    alignItems: 'flex-end',
  },
  nfcCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nfcCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  nfcCardDetailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.small,
  },
  nfcCardDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.md,
  },
  nfcDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  nfcDetailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  nfcDetailContent: {
    flex: 1,
  },
  nfcDetailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nfcDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  nfcInputSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.small,
  },
  nfcInputSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.md,
  },
  nfcInputGroup: {
    marginBottom: Spacing.lg,
  },
  nfcInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: Spacing.sm,
  },
  nfcRequired: {
    color: '#EF4444',
  },
  nfcModernInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  nfcInputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: Spacing.xs,
  },
  nfcRescanButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nfcRescanButtonTextModern: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  // NFC Tarama Ekranı Stilleri
  nfcScanHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  nfcScanIconContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  nfcScanIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  nfcScanPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    top: 0,
    left: 0,
  },
  nfcScanTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.xs,
  },
  nfcScanSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  nfcScanInstructions: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nfcInstructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nfcInstructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  nfcInstructionNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nfcInstructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  nfcScanButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
    gap: Spacing.md,
    ...Shadows.large,
    marginBottom: Spacing.lg,
  },
  nfcScanButtonTextModern: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  nfcSecurityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  nfcSecurityText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  nfcRescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  nfcRescanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  eftInfoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  eftIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF8C00' + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  eftTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.sm,
  },
  eftDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  eftFeatures: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  eftFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eftFeatureText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  // Order Summary
  orderItems: {
    marginBottom: Spacing.lg,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderItemName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  orderItemDetails: {
    flex: 1,
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'right',
    minWidth: 80,
  },
  modernOrderItems: {
    marginTop: Spacing.sm,
  },
  modernOrderItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  modernOrderItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  modernOrderItemDetails: {
    fontSize: 13,
    color: '#6B7280',
  },
  orderItemPriceContainer: {
    alignItems: 'flex-end',
  },
  modernOrderItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Price Summary
  priceSummary: {
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  modernPriceSummary: {
    marginTop: Spacing.sm,
  },
  modernPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  priceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernPriceLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernPriceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  modernPriceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: Spacing.sm,
  },
  modernTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.primary + '08',
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modernTotalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: Spacing.sm,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  priceTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Info Summary
  infoSummary: {
    marginBottom: Spacing.lg,
  },
  infoSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: Spacing.xs,
  },
  infoSummaryText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  modernInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  modernInfoText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  modernInfoSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentInfoContainer: {
    flex: 1,
  },

  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    ...Shadows.medium,
    zIndex: 9999, // Çok yüksek z-index - butonun her zaman görünür olması için
    elevation: 50, // Android için yüksek elevation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  backButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    marginRight: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },
  nextButton: {
    flex: 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    ...Shadows.small,
  },
  nextButtonFull: {
    flex: 1,
    marginRight: 0,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  
  // Success Modal
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.large,
  },
  successIconWrapper: {
    marginBottom: Spacing.lg,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981' + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successModalMessage: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  successModalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  successModalOrderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  successModalSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  successModalButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...Shadows.medium,
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Bank Info Modal
  bankInfoModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    height: '90%',
    flexDirection: 'column',
    ...Shadows.large,
  },
  bankInfoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bankInfoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  bankInfoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  bankInfoModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  bankInfoModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bankInfoCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  bankInfoScroll: {
    flex: 1,
  },
  bankInfoScrollContent: {
    paddingBottom: 20,
  },
  bankInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: Spacing.lg,
    margin: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankInfoItem: {
    marginBottom: Spacing.lg,
  },
  bankInfoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  bankInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bankInfoValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: Spacing.xs,
  },
  bankInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: Spacing.sm,
  },
  bankInfoAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  bankInfoWarningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bankInfoWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bankInfoWarningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: Spacing.xs,
  },
  bankInfoWarningText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  bankInfoModalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bankInfoSecondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  bankInfoSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  bankInfoPrimaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.medium,
  },
  bankInfoPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default OrderScreen;