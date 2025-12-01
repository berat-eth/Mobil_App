import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { DiscountWheelController, DiscountWheelResult, WheelCheckResult } from '../controllers/DiscountWheelController';
import { useAppContext } from '../contexts/AppContext';

const { width, height } = Dimensions.get('window');

interface DiscountWheelProps {
  visible: boolean;
  onClose: () => void;
  onSpinComplete: (result: DiscountWheelResult) => void;
}

export default function DiscountWheel({ visible, onClose, onSpinComplete }: DiscountWheelProps) {
  const { state } = useAppContext();
  const user = state.user;
  const [wheelStatus, setWheelStatus] = useState<WheelCheckResult>({ canSpin: true, alreadySpun: false });
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<DiscountWheelResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const slotAnimation1 = useRef(new Animated.Value(0)).current;
  const slotAnimation2 = useRef(new Animated.Value(0)).current;
  const slotAnimation3 = useRef(new Animated.Value(0)).current;
  
  // Ses efektleri için refs
  const spinSound = useRef<Audio.Sound | null>(null);
  const winSound = useRef<Audio.Sound | null>(null);
  const clickSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible) {
      checkWheelStatus();
      loadSounds();
    }
    
    return () => {
      // Cleanup sounds when component unmounts
      unloadSounds();
    };
  }, [visible]);

  const loadSounds = async () => {
    try {
      // Ses dosyaları mevcut değilse sessiz çalış
      console.log('Sound effects disabled - files not found');
    } catch (error) {
      console.warn('Could not load sound effects:', error);
    }
  };

  const unloadSounds = async () => {
    try {
      if (spinSound.current) {
        await spinSound.current.unloadAsync();
        spinSound.current = null;
      }
      if (winSound.current) {
        await winSound.current.unloadAsync();
        winSound.current = null;
      }
      if (clickSound.current) {
        await clickSound.current.unloadAsync();
        clickSound.current = null;
      }
    } catch (error) {
      console.warn('Could not unload sounds:', error);
    }
  };

  const playSound = async (soundRef: React.RefObject<Audio.Sound | null>) => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (error) {
      // Ses dosyası yoksa sessiz geç
      console.log('Sound effect skipped - file not available');
    }
  };

  const checkWheelStatus = async () => {
    try {
      setLoading(true);
      const status = await DiscountWheelController.checkWheelStatus();
      setWheelStatus(status);
      
      if (status.alreadySpun && status.existingCode) {
        // Show existing result
        setSpinResult({
          spinResult: status.spinResult as '1' | '3' | '5' | '7' | '10' | '20',
          discountCode: status.existingCode,
          expiresAt: status.expiresAt || '',
          discountType: 'percentage',
          discountValue: status.spinResult || '1'
        });
      }
    } catch (error) {
      console.error('Error checking wheel status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || !wheelStatus.canSpin) return;

    try {
      setIsSpinning(true);
      
      // Start spin animation
      const spinValue = spinAnimation._value;
      const randomSpins = 5 + Math.random() * 5; // 5-10 full rotations
      const finalRotation = spinValue + (360 * randomSpins);
      
      Animated.timing(spinAnimation, {
        toValue: finalRotation,
        duration: 3000,
        useNativeDriver: true,
      }).start();

      // Scale animation
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start();

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Make API call
      const result = await DiscountWheelController.spinWheel(user?.id);
      
      if (result.success && result.data) {
        setSpinResult(result.data);
        onSpinComplete(result.data);
        
        // Update wheel status
        setWheelStatus({
          canSpin: false,
          alreadySpun: true,
          existingCode: result.data.discountCode,
          spinResult: result.data.spinResult,
          expiresAt: result.data.expiresAt
        });
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Error spinning wheel:', error);
      Alert.alert('Hata', 'Çark çevrilirken hata oluştu');
    } finally {
      setIsSpinning(false);
    }
  };

  const handleClose = () => {
    setSpinResult(null);
    onClose();
  };

  const getDiscountColor = (value: string): string => {
    switch (value) {
      case '1': return '#ffc107'; // Sarı
      case '3': return '#28a745'; // Yeşil
      case '5': return '#ff6b35'; // Turuncu
      case '7': return '#dc3545'; // Kırmızı
      case '10': return '#ffc107'; // Sarı
      case '20': return '#dc3545'; // Kırmızı
      default: return '#6c757d';
    }
  };

  const getDiscountIcon = (value: string): string => {
    switch (value) {
      case '1': return 'gift';
      case '3': return 'star';
      case '5': return 'diamond';
      case '7': return 'trophy';
      case '10': return 'diamond';
      case '20': return 'trophy';
      default: return 'gift';
    }
  };

  const spinInterpolate = spinAnimation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="gift" size={28} color="#007bff" style={styles.titleIcon} />
              <Text style={styles.title}>İndirim Çarkı</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          ) : spinResult ? (
            <View style={styles.resultContainer}>
              <View style={[styles.resultCard, { backgroundColor: getDiscountColor(spinResult.spinResult) }]}>
                <Ionicons 
                  name={getDiscountIcon(spinResult.spinResult)} 
                  size={60} 
                  color="white" 
                />
                <Text style={styles.resultTitle}>
                  Tebrikler! %{spinResult.spinResult} İndirim Kazandınız!
                </Text>
                <Text style={styles.discountCode}>
                  {DiscountWheelController.formatDiscountCode(spinResult.discountCode)}
                </Text>
                <Text style={styles.expiryText}>
                  {DiscountWheelController.getTimeRemaining(spinResult.expiresAt)} sonra süresi dolacak
                </Text>
              </View>
              
              <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>🎉 İndirim Kodunuz Hazır!</Text>
                <Text style={styles.infoText}>
                  Bu kodu sepetinizde kullanarak %{spinResult.spinResult} indirim kazanabilirsiniz.
                </Text>
                <Text style={styles.infoText}>
                  Kod 7 gün geçerlidir ve sadece bir kez kullanılabilir.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.wheelContainer}>
              <Text style={styles.description}>
                Çarkı çevirin ve %1, %3, %5, %7, %10 veya %20 indirim kazanın!
              </Text>
              
              <View style={styles.wheelWrapper}>
                <Animated.View
                  style={[
                    styles.wheel,
                    {
                      transform: [
                        { rotate: spinInterpolate },
                        { scale: scaleAnimation }
                      ]
                    }
                  ]}
                >
                  {/* %5 - Turuncu */}
                  <View style={[styles.wheelSection, { 
                    backgroundColor: '#ff6b35',
                    transform: [{ rotate: '0deg' }]
                  }]}>
                    <Text style={styles.wheelText}>%5</Text>
                  </View>
                  {/* %7 - Kırmızı */}
                  <View style={[styles.wheelSection, { 
                    backgroundColor: '#dc3545',
                    transform: [{ rotate: '60deg' }]
                  }]}>
                    <Text style={[styles.wheelText, { transform: [{ rotate: '-60deg' }] }]}>%7</Text>
                  </View>
                  {/* %1 - Sarı */}
                  <View style={[styles.wheelSection, { 
                    backgroundColor: '#ffc107',
                    transform: [{ rotate: '120deg' }]
                  }]}>
                    <Text style={[styles.wheelText, { transform: [{ rotate: '-120deg' }] }]}>%1</Text>
                  </View>
                  {/* %7 - Kırmızı */}
                  <View style={[styles.wheelSection, { 
                    backgroundColor: '#dc3545',
                    transform: [{ rotate: '180deg' }]
                  }]}>
                    <Text style={[styles.wheelText, { transform: [{ rotate: '-180deg' }] }]}>%7</Text>
                  </View>
                  {/* %20 - Kırmızı */}
                  <View style={[styles.wheelSection, { 
                    backgroundColor: '#dc3545',
                    transform: [{ rotate: '240deg' }]
                  }]}>
                    <Text style={[styles.wheelText, { transform: [{ rotate: '-240deg' }] }]}>%20</Text>
                  </View>
                  {/* %10 - Sarı */}
                  <View style={[styles.wheelSection, { 
                    backgroundColor: '#ffc107',
                    transform: [{ rotate: '300deg' }]
                  }]}>
                    <Text style={[styles.wheelText, { transform: [{ rotate: '-300deg' }] }]}>%10</Text>
                  </View>
                </Animated.View>
                
                <View style={styles.wheelPointer} />
              </View>

              {wheelStatus.alreadySpun ? (
                <View style={styles.alreadySpunContainer}>
                  <Ionicons name="checkmark-circle" size={48} color="#28a745" />
                  <Text style={styles.alreadySpunText}>
                    Bu cihazdan zaten çark çevrilmiş
                  </Text>
                  <Text style={styles.alreadySpunSubtext}>
                    Her cihazdan sadece bir kez çark çevirebilirsiniz
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]}
                  onPress={handleSpin}
                  disabled={isSpinning}
                >
                  <LinearGradient
                    colors={['#007bff', '#0056b3']}
                    style={styles.spinButtonGradient}
                  >
                    <Ionicons name="refresh" size={24} color="white" />
                    <Text style={styles.spinButtonText}>
                      {isSpinning ? 'Çevriliyor...' : 'Çarkı Çevir'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              * Her cihazdan sadece bir kez çark çevirebilirsiniz
            </Text>
            <Text style={styles.footerText}>
              * İndirim kodları 7 gün geçerlidir
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: width * 0.9,
    maxHeight: height * 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 15,
    marginBottom: 20,
    minWidth: width * 0.7,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  discountCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    letterSpacing: 2,
  },
  expiryText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
  wheelContainer: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  wheelWrapper: {
    position: 'relative',
    marginBottom: 30,
  },
  wheel: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelSection: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    transformOrigin: '100% 100%',
  },
  wheelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  wheelPointer: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#333',
  },
  spinButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  spinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  alreadySpunContainer: {
    alignItems: 'center',
    padding: 20,
  },
  alreadySpunText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  alreadySpunSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 3,
  },
  // Slot Machine Styles
  slotMachineContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  slotMachineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  slotMachineTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10,
    textAlign: 'center',
  },
  slotMachineDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  slotMachine: {
    alignItems: 'center',
    marginBottom: 20,
  },
  slotMachineFrame: {
    backgroundColor: '#2c3e50',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  slotMachineScreen: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#ffd700',
  },
  slotRow: {
    height: 60,
    width: 200,
    overflow: 'hidden',
    marginBottom: 5,
    backgroundColor: '#000',
    borderRadius: 5,
  },
  slot: {
    flexDirection: 'column',
  },
  slotItem: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  slotText: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slotMachineLights: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  light: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  lightRed: {
    backgroundColor: '#ff4757',
  },
  lightYellow: {
    backgroundColor: '#ffa502',
  },
  lightGreen: {
    backgroundColor: '#2ed573',
  },
  lightBlue: {
    backgroundColor: '#3742fa',
  },
});

