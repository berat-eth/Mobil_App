import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Share,
} from 'react-native';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../contexts/AppContext';
import { CampaignController, Campaign } from '../controllers/CampaignController';
import { PersonalizationController, PersonalizedContent } from '../controllers/PersonalizationController';
import { DiscountWheelController, DiscountCode } from '../controllers/DiscountWheelController';
import { SocialSharingController, SocialTask } from '../controllers/SocialSharingController';
import { UserController } from '../controllers/UserController';
import { canEarnShareExp, recordSuccessfulShare, DAILY_LIMIT } from '../utils/social-share-limit';
import { NotificationController } from '../controllers/NotificationController';
import { GroupDiscountController, GroupDiscount } from '../controllers/GroupDiscountController';
import { ShoppingCompetitionController, Competition } from '../controllers/ShoppingCompetitionController';
import { CartSharingController, SharedCart } from '../controllers/CartSharingController';
import { BuyTogetherController, BuyTogetherOffer } from '../controllers/BuyTogetherController';
import { UserLevelController } from '../controllers/UserLevelController';
import { UserLevelProgress } from '../models/UserLevel';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { EmptyState } from '../components/EmptyState';
import { UserLevelCard } from '../components/UserLevelCard';
import DiscountWheel from '../components/DiscountWheel';
import ErrorBoundary from '../components/ErrorBoundary';

const { width } = Dimensions.get('window');

export default function MyCampaignsScreen() {
  const { state } = useAppContext();
  const user = state.user;
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [socialTasks, setSocialTasks] = useState<SocialTask[]>([]);
  const [groupDiscounts, setGroupDiscounts] = useState<GroupDiscount[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [sharedCarts, setSharedCarts] = useState<SharedCart[]>([]);
  const [buyTogetherOffers, setBuyTogetherOffers] = useState<BuyTogetherOffer[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevelProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDiscountWheel, setShowDiscountWheel] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Eğer kullanıcı yoksa sadece loading'i kapat
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // API çağrılarını daha güvenli hale getir - her birini ayrı ayrı try-catch ile sar
      const loadPersonalizedContent = async () => {
        try {
          return await PersonalizationController.generatePersonalizedContent(user.id);
        } catch (error) {
          console.warn('Personalized content failed:', error);
          return null;
        }
      };

      const loadCampaigns = async () => {
        try {
          return await CampaignController.getAvailableCampaigns(user.id);
        } catch (error) {
          console.warn('Campaigns failed:', error);
          return [];
        }
      };

      const loadDiscountCodes = async () => {
        try {
          return await DiscountWheelController.getUserDiscountCodes(user.id);
        } catch (error) {
          console.warn('Discount codes failed:', error);
          return [];
        }
      };

      const loadSocialTasks = async () => {
        try {
          return await SocialSharingController.getUserSocialTasks(String(user.id));
        } catch (error) {
          console.warn('⚠️ Social tasks failed:', error);
          return [];
        }
      };

      const loadGroupDiscounts = async () => {
        try {
          return await GroupDiscountController.getUserGroupDiscounts(String(user.id));
        } catch (error) {
          console.warn('⚠️ Group discounts failed:', error);
          return [];
        }
      };

      const loadCompetitions = async () => {
        try {
          return await ShoppingCompetitionController.getActiveCompetitions(String(user.id));
        } catch (error) {
          console.warn('⚠️ Competitions failed:', error);
          return [];
        }
      };

      const loadSharedCarts = async () => {
        try {
          return await CartSharingController.getUserSharedCarts(String(user.id));
        } catch (error) {
          console.warn('⚠️ Shared carts failed:', error);
          return [];
        }
      };

      const loadBuyTogether = async () => {
        try {
          return await BuyTogetherController.getActiveOffers(String(user.id));
        } catch (error) {
          console.warn('⚠️ Buy together failed:', error);
          return [];
        }
      };

      const loadUserLevel = async () => {
        try {
          return await UserLevelController.getUserLevel(String(user.id));
        } catch (error) {
          console.warn('User level failed:', error);
          return null;
        }
      };

      // Paralel çağrıları yap ama her birinin başarısız olması durumunda diğerlerini etkilemesin
      const [
        content,
        campaigns,
        codes,
        socialTasksData,
        groupDiscountsData,
        competitionsData,
        sharedCartsData,
        buyTogetherData,
        levelData
      ] = await Promise.allSettled([
        loadPersonalizedContent(),
        loadCampaigns(),
        loadDiscountCodes(),
        loadSocialTasks(),
        loadGroupDiscounts(),
        loadCompetitions(),
        loadSharedCarts(),
        loadBuyTogether(),
        loadUserLevel()
      ]);

      // Sonuçları güvenli şekilde ayarla
      setPersonalizedContent(content.status === 'fulfilled' ? content.value : null);
      setAvailableCampaigns(campaigns.status === 'fulfilled' ? (campaigns.value || []) : []);
      setDiscountCodes(codes.status === 'fulfilled' ? (codes.value || []) : []);
      setSocialTasks(socialTasksData.status === 'fulfilled' ? (socialTasksData.value || []) : []);
      setGroupDiscounts(groupDiscountsData.status === 'fulfilled' ? (groupDiscountsData.value || []) : []);
      setCompetitions(competitionsData.status === 'fulfilled' ? (competitionsData.value || []) : []);
      setSharedCarts(sharedCartsData.status === 'fulfilled' ? (sharedCartsData.value || []) : []);
      setBuyTogetherOffers(buyTogetherData.status === 'fulfilled' ? (buyTogetherData.value || []) : []);
      setUserLevel(levelData.status === 'fulfilled' ? levelData.value : null);

    } catch (error) {
      console.error('Critical error in loadData:', error);
      // Kritik hata durumunda da loading'i kapat ki sosyal kampanyalar görünsün
      setPersonalizedContent(null);
      setAvailableCampaigns([]);
      setDiscountCodes([]);
      setSocialTasks([]);
      setGroupDiscounts([]);
      setCompetitions([]);
      setSharedCarts([]);
      setBuyTogetherOffers([]);
      setUserLevel(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDiscountWheelComplete = (result: any) => {
    setShowDiscountWheel(false);
    // Refresh discount codes
    loadData();
    Alert.alert(
      'Tebrikler!',
      `%${result.spinResult} indirim kazandınız!\nKodunuz: ${result.discountCode}`,
      [{ text: 'Tamam' }]
    );
  };

  // Sosyal paylaşım fonksiyonu
  const handleSocialShare = async (taskId: string) => {
    let effectiveUserId = user?.id;
    if (!effectiveUserId) {
      const current = await UserController.getCurrentUser();
      effectiveUserId = current?.id;
    }
    if (!effectiveUserId) {
      Alert.alert('Giriş Gerekli', 'Paylaşım için lütfen önce giriş yapın.');
      return;
    }

    try {
      const platform = taskId.split('-')[0];
      const shareText = `🔥 Harika kamp ürünleri keşfet!\n\nHuğlu Outdoor'da indirimli fiyatlarla kamp malzemeleri! 🏕️\n\n#Kamp #Outdoor #HuğluOutdoor`;

      // Platforma özel URL ile açmayı dene (Instagram/Facebook/WhatsApp/Twitter)
      const platformUrl = SocialSharingController.generateShareUrl(platform, undefined, undefined, shareText);

      let shared = false;
      try {
        const canOpen = await Linking.canOpenURL(platformUrl);
        if (canOpen) {
          await Linking.openURL(platformUrl);
          shared = true;
        }
      } catch {}

      // Platforma özel URL açılamazsa Native Share'e düş
      if (!shared) {
        const result = await Share.share({
          message: shareText,
          title: 'Huğlu Outdoor - Kamp Malzemeleri',
        });
        shared = result.action === Share.sharedAction;
      }

      if (shared) {
        const { allowed, remaining } = await canEarnShareExp(effectiveUserId);
        if (allowed) {
          const expResult = await UserLevelController.addSocialShareExp(effectiveUserId.toString());
          if (expResult.success) {
            await recordSuccessfulShare(effectiveUserId);
            Alert.alert('🎉 Paylaşım Başarılı!', `+25 EXP kazandınız!\n\nBugün kalan EXP hakları: ${remaining - 1}/${DAILY_LIMIT}`, [{ text: 'Harika!' }]);
            try {
              await NotificationController.createSystemNotification(effectiveUserId, 'EXP Kazanımı', 'Paylaşımınız için +25 EXP hesabınıza tanımlandı.');
            } catch {}
          }
        } else {
          Alert.alert('Paylaşım Başarılı', `Günlük EXP limitine ulaştınız (${DAILY_LIMIT}/gün). Yarın tekrar deneyin.`);
        }
        await loadData();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu');
    }
  };

  // Grup indirimi davet fonksiyonu
  const handleGroupInvite = async (groupId: string) => {
    if (!user?.id) return;

    try {
      const result = await GroupDiscountController.sendInvitation(String(user.id), groupId, {
        message: 'Bu harika kamp ürünlerini birlikte alalım!'
      });
      
      Alert.alert(
        'Davetiye Gönderildi',
        'Arkadaşlarınıza davetiye gönderildi. Onlar katıldığında indirim aktif olacak!',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Hata', 'Davetiye gönderilirken bir hata oluştu');
    }
  };

  // Yarışmaya katılma fonksiyonu
  const handleJoinCompetition = async (competitionId: string) => {
    if (!user?.id) return;

    try {
      const result = await ShoppingCompetitionController.joinCompetition(String(user.id), competitionId);
      
      if (result.success) {
        Alert.alert(
          'Yarışmaya Katıldınız!',
          result.message,
          [{ text: 'Tamam' }]
        );
        loadData();
      }
    } catch (error) {
      console.error('Error joining competition:', error);
      Alert.alert('Hata', 'Yarışmaya katılırken bir hata oluştu');
    }
  };

  // Sepet paylaşma fonksiyonu
  const handleShareCart = async () => {
    if (!user?.id) return;

    try {
      const result = await CartSharingController.shareCart(String(user.id), {
        title: 'Kamp Malzemeleri Sepetim',
        description: 'Bu hafta sonu kamp için hazırladığım sepet',
        productIds: ['product-1', 'product-2', 'product-3'],
        shareType: 'public',
        expiresInDays: 7
      });
      
      if (result.success) {
        Alert.alert(
          'Sepet Paylaşıldı!',
          `Sepetiniz başarıyla paylaşıldı.\nPaylaşım URL'si: ${result.shareUrl}`,
          [{ text: 'Tamam' }]
        );
        loadData();
      }
    } catch (error) {
      console.error('Error sharing cart:', error);
      Alert.alert('Hata', 'Sepet paylaşılırken bir hata oluştu');
    }
  };

  // Birlikte al teklifine katılma fonksiyonu
  const handleJoinBuyTogether = async (offerId: string) => {
    if (!user?.id) return;

    try {
      const result = await BuyTogetherController.joinOffer({
        userId: String(user.id),
        offerId,
        selectedProducts: [
          { productId: 'product-1', quantity: 1, price: 450 },
          { productId: 'product-2', quantity: 1, price: 280 }
        ]
      });
      
      if (result.success) {
        Alert.alert(
          'Teklife Katıldınız!',
          `${result.message}\n₺${result.savings} tasarruf kazandınız!`,
          [{ text: 'Tamam' }]
        );
        loadData();
      }
    } catch (error) {
      console.error('Error joining buy together:', error);
      Alert.alert('Hata', 'Teklife katılırken bir hata oluştu');
    }
  };

  const renderCampaignCard = (campaign: Campaign) => (
    <View key={campaign.id} style={styles.campaignCard}>
      <View style={styles.campaignHeader}>
        <View style={styles.campaignIcon}>
          <Icon name="card-giftcard" size={24} color="white" />
        </View>
        <View style={styles.campaignInfo}>
          <Text style={styles.campaignTitle}>{campaign.name}</Text>
          <Text style={styles.campaignDescription}>{campaign.description}</Text>
        </View>
        <View style={[styles.campaignStatus, { backgroundColor: getStatusColor(campaign.status) }]}>
          <Text style={styles.statusText}>{getStatusText(campaign.status)}</Text>
        </View>
      </View>
      
      <View style={styles.campaignDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>İndirim:</Text>
          <Text style={styles.detailValue}>
            {campaign.discountValue}% İndirim
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Minimum Tutar:</Text>
          <Text style={styles.detailValue}>
            {campaign.minOrderAmount} TL
          </Text>
        </View>
        {campaign.endDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bitiş:</Text>
            <Text style={styles.detailValue}>
              {new Date(campaign.endDate).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderDiscountCodeCard = (code: DiscountCode) => (
    <View key={code.id} style={styles.discountCard}>
      <View style={styles.discountHeader}>
        <View style={styles.discountIcon}>
          <Icon name="local-offer" size={20} color="white" />
        </View>
        <View style={styles.discountInfo}>
          <Text style={styles.discountCode}>
            {DiscountWheelController.formatDiscountCode(code.discountCode)}
          </Text>
          <Text style={styles.discountValue}>
            {DiscountWheelController.getDiscountDisplay(code.discountValue, code.discountType)}
          </Text>
        </View>
        <View style={[styles.discountStatus, { 
          backgroundColor: code.isUsed ? '#dc3545' : '#28a745' 
        }]}>
          <Text style={styles.discountStatusText}>
            {code.isUsed ? 'Kullanıldı' : 'Aktif'}
          </Text>
        </View>
      </View>
      
      <View style={styles.discountDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Süre:</Text>
          <Text style={styles.detailValue}>
            {DiscountWheelController.getTimeRemaining(code.expiresAt)}
          </Text>
        </View>
        {code.minOrderAmount > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Min. Tutar:</Text>
            <Text style={styles.detailValue}>
              {code.minOrderAmount} TL
            </Text>
          </View>
        )}
        {code.isUsed && code.usedAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Kullanım:</Text>
            <Text style={styles.detailValue}>
              {new Date(code.usedAt).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPersonalizedOffer = (offer: any, index: number) => (
    <TouchableOpacity key={offer.id} style={styles.offerCard}>
      <LinearGradient
        colors={[getOfferColor(offer.type), getOfferColor(offer.type) + 'CC']}
        style={styles.offerGradient}
      >
        <View style={styles.offerContent}>
          <Icon name="local-offer" size={24} color="white" />
          <View style={styles.offerText}>
            <Text style={styles.offerTitle}>{offer.title}</Text>
            <Text style={styles.offerDescription}>{offer.description}</Text>
          </View>
        </View>
        {offer.discountAmount && (
          <View style={styles.offerDiscount}>
            <Text style={styles.discountText}>
              %{offer.discountAmount} İndirim
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // Loading durumunda sadece API verilerini bekle, sosyal kampanyalar her zaman görünsün
  const showLoading = loading && user?.id;

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {/* İç başlık kaldırıldı; üst başlık navigator tarafından geliyor */}

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
        {/* User Level Section */}
        {userLevel && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Seviye Sistemi</Text>
              <Text style={styles.sectionSubtitle}>İlerlemenizi takip edin</Text>
            </View>
            <UserLevelCard 
              levelProgress={userLevel} 
              compact={true}
              onPress={() => {
                // Seviye detay sayfasına yönlendirme
                Alert.alert('Seviye Detayları', 'Seviye detay sayfası yakında eklenecek!');
              }}
            />
          </View>
        )}

        {/* Discount Wheel Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 İndirim Çarkı</Text>
            <Text style={styles.sectionSubtitle}>Şansınızı deneyin!</Text>
          </View>
          <TouchableOpacity
            style={styles.wheelButton}
            onPress={() => setShowDiscountWheel(true)}
          >
            <LinearGradient
              colors={['#007bff', '#0056b3']}
              style={styles.wheelButtonGradient}
            >
              <Icon name="card-giftcard" size={30} color="white" />
              <Text style={styles.wheelButtonText}>Çarkı Çevir</Text>
              <Text style={styles.wheelButtonSubtext}>%1, %3, %5, %7, %10 veya %20 indirim kazan!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Social Sharing Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📱 Sosyal Paylaşım Görevleri</Text>
            <Text style={styles.sectionSubtitle}>Paylaş, indirim kazan!</Text>
          </View>
          
          <View style={styles.socialTaskCard}>
            <View style={styles.socialTaskHeader}>
              <View style={styles.socialTaskIcon}>
                <Icon name="share" size={24} color="white" />
              </View>
              <View style={styles.socialTaskInfo}>
                <Text style={styles.socialTaskTitle}>Instagram'da Paylaş</Text>
                <Text style={styles.socialTaskDescription}>Ürünü Instagram'da paylaş, %10 indirim kazan</Text>
              </View>
              <View style={styles.socialTaskReward}>
                <Text style={styles.socialTaskRewardText}>%10</Text>
                <Text style={styles.socialTaskRewardLabel}>İndirim</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.socialTaskButton}
              onPress={() => handleSocialShare('instagram-share')}
            >
              <Icon name="share" size={20} color="#007bff" />
              <Text style={styles.socialTaskButtonText}>Paylaş ve Kazan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.socialTaskCard}>
            <View style={styles.socialTaskHeader}>
              <View style={styles.socialTaskIcon}>
                <Icon name="share" size={24} color="white" />
              </View>
              <View style={styles.socialTaskInfo}>
                <Text style={styles.socialTaskTitle}>Facebook'ta Paylaş</Text>
                <Text style={styles.socialTaskDescription}>Sepetini Facebook'ta paylaş, %5 indirim kazan</Text>
              </View>
              <View style={styles.socialTaskReward}>
                <Text style={styles.socialTaskRewardText}>%5</Text>
                <Text style={styles.socialTaskRewardLabel}>İndirim</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.socialTaskButton}
              onPress={() => handleSocialShare('facebook-share')}
            >
              <Icon name="share" size={20} color="#007bff" />
              <Text style={styles.socialTaskButtonText}>Paylaş ve Kazan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.socialTaskCard}>
            <View style={styles.socialTaskHeader}>
              <View style={styles.socialTaskIcon}>
                <Icon name="share" size={24} color="white" />
              </View>
              <View style={styles.socialTaskInfo}>
                <Text style={styles.socialTaskTitle}>WhatsApp'ta Paylaş</Text>
                <Text style={styles.socialTaskDescription}>Ürünü WhatsApp'ta paylaş, %8 indirim kazan</Text>
              </View>
              <View style={styles.socialTaskReward}>
                <Text style={styles.socialTaskRewardText}>%8</Text>
                <Text style={styles.socialTaskRewardLabel}>İndirim</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.socialTaskButton}
              onPress={() => handleSocialShare('whatsapp-share')}
            >
              <Icon name="share" size={20} color="#007bff" />
              <Text style={styles.socialTaskButtonText}>Paylaş ve Kazan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Family Packages / Group Discounts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Aile Paketleri & Grup İndirimi</Text>
            <Text style={styles.sectionSubtitle}>Birlikte al, daha ucuza gel!</Text>
          </View>
          
          <View style={styles.groupDiscountCard}>
            <View style={styles.groupDiscountHeader}>
              <View style={styles.groupDiscountIcon}>
                <Icon name="group" size={24} color="white" />
              </View>
              <View style={styles.groupDiscountInfo}>
                <Text style={styles.groupDiscountTitle}>3 Arkadaş Kampanyası</Text>
                <Text style={styles.groupDiscountDescription}>3 arkadaşınla aynı ürünü al → %20 daha ucuza gelsin</Text>
              </View>
              <View style={styles.groupDiscountReward}>
                <Text style={styles.groupDiscountRewardText}>%20</Text>
                <Text style={styles.groupDiscountRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.groupDiscountProgress}>
              <Text style={styles.groupDiscountProgressText}>2/3 kişi katıldı</Text>
              <View style={styles.groupDiscountProgressBar}>
                <View style={[styles.groupDiscountProgressFill, { width: '66%' }]} />
              </View>
            </View>
            <TouchableOpacity 
              style={styles.groupDiscountButton}
              onPress={() => handleGroupInvite('group-1')}
            >
              <Icon name="person-add" size={20} color="#28a745" />
              <Text style={styles.groupDiscountButtonText}>Arkadaş Davet Et</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.groupDiscountCard}>
            <View style={styles.groupDiscountHeader}>
              <View style={styles.groupDiscountIcon}>
                <Icon name="home" size={24} color="white" />
              </View>
              <View style={styles.groupDiscountInfo}>
                <Text style={styles.groupDiscountTitle}>Aile Paketi</Text>
                <Text style={styles.groupDiscountDescription}>Aile üyelerinle birlikte alışveriş yap, %15 indirim kazan</Text>
              </View>
              <View style={styles.groupDiscountReward}>
                <Text style={styles.groupDiscountRewardText}>%15</Text>
                <Text style={styles.groupDiscountRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.groupDiscountProgress}>
              <Text style={styles.groupDiscountProgressText}>1/2 kişi katıldı</Text>
              <View style={styles.groupDiscountProgressBar}>
                <View style={[styles.groupDiscountProgressFill, { width: '50%' }]} />
              </View>
            </View>
            <TouchableOpacity style={styles.groupDiscountButton}>
              <Icon name="person-add" size={20} color="#28a745" />
              <Text style={styles.groupDiscountButtonText}>Aile Üyesi Ekle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.groupDiscountCard}>
            <View style={styles.groupDiscountHeader}>
              <View style={styles.groupDiscountIcon}>
              <Icon name="emoji-events" size={24} color="white" />
              </View>
              <View style={styles.groupDiscountInfo}>
                <Text style={styles.groupDiscountTitle}>Kamp Arkadaşları</Text>
                <Text style={styles.groupDiscountDescription}>Kamp malzemeleri için 5 kişilik grup oluştur, %25 indirim</Text>
              </View>
              <View style={styles.groupDiscountReward}>
                <Text style={styles.groupDiscountRewardText}>%25</Text>
                <Text style={styles.groupDiscountRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.groupDiscountProgress}>
              <Text style={styles.groupDiscountProgressText}>3/5 kişi katıldı</Text>
              <View style={styles.groupDiscountProgressBar}>
                <View style={[styles.groupDiscountProgressFill, { width: '60%' }]} />
              </View>
            </View>
            <TouchableOpacity style={styles.groupDiscountButton}>
              <Icon name="person-add" size={20} color="#28a745" />
              <Text style={styles.groupDiscountButtonText}>Grup Oluştur</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shopping Competitions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Alışveriş Yarışmaları</Text>
            <Text style={styles.sectionSubtitle}>Davet et, puan kazan, ödül al!</Text>
          </View>
          
          <View style={styles.competitionCard}>
            <View style={styles.competitionHeader}>
              <View style={styles.competitionIcon}>
                <Icon name="emoji-events" size={24} color="white" />
              </View>
              <View style={styles.competitionInfo}>
                <Text style={styles.competitionTitle}>Aylık Liderlik Yarışması</Text>
                <Text style={styles.competitionDescription}>En çok davet eden kazanır! Ay sonunda ödül</Text>
              </View>
              <View style={styles.competitionReward}>
                <Text style={styles.competitionRewardText}>1.</Text>
                <Text style={styles.competitionRewardLabel}>Ödül</Text>
              </View>
            </View>
            <View style={styles.competitionStats}>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>15</Text>
                <Text style={styles.competitionStatLabel}>Davet</Text>
              </View>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>3</Text>
                <Text style={styles.competitionStatLabel}>Sıralama</Text>
              </View>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>5</Text>
                <Text style={styles.competitionStatLabel}>Gün Kaldı</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.competitionButton}
              onPress={() => handleJoinCompetition('comp-1')}
            >
              <Icon name="group" size={20} color="#ff6b6b" />
              <Text style={styles.competitionButtonText}>Yarışmaya Katıl</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.competitionCard}>
            <View style={styles.competitionHeader}>
              <View style={styles.competitionIcon}>
                <Icon name="card-giftcard" size={24} color="white" />
              </View>
              <View style={styles.competitionInfo}>
                <Text style={styles.competitionTitle}>Haftalık Kamp Malzemesi</Text>
                <Text style={styles.competitionDescription}>Bu hafta en çok alışveriş yapan kamp malzemesi kazanır</Text>
              </View>
              <View style={styles.competitionReward}>
                <Text style={styles.competitionRewardText}>🎁</Text>
                <Text style={styles.competitionRewardLabel}>Hediye</Text>
              </View>
            </View>
            <View style={styles.competitionStats}>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>₺850</Text>
                <Text style={styles.competitionStatLabel}>Harcama</Text>
              </View>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>2</Text>
                <Text style={styles.competitionStatLabel}>Sıralama</Text>
              </View>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>3</Text>
                <Text style={styles.competitionStatLabel}>Gün Kaldı</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.competitionButton}>
              <Icon name="shopping-cart" size={20} color="#ff6b6b" />
              <Text style={styles.competitionButtonText}>Alışverişe Devam Et</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.competitionCard}>
            <View style={styles.competitionHeader}>
              <View style={styles.competitionIcon}>
                <Icon name="star" size={24} color="white" />
              </View>
              <View style={styles.competitionInfo}>
                <Text style={styles.competitionTitle}>Sosyal Medya Şampiyonu</Text>
                <Text style={styles.competitionDescription}>En çok paylaşım yapan %50 indirim kazanır</Text>
              </View>
              <View style={styles.competitionReward}>
                <Text style={styles.competitionRewardText}>%50</Text>
                <Text style={styles.competitionRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.competitionStats}>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>8</Text>
                <Text style={styles.competitionStatLabel}>Paylaşım</Text>
              </View>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>1</Text>
                <Text style={styles.competitionStatLabel}>Sıralama</Text>
              </View>
              <View style={styles.competitionStat}>
                <Text style={styles.competitionStatValue}>7</Text>
                <Text style={styles.competitionStatLabel}>Gün Kaldı</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.competitionButton}>
              <Icon name="share" size={20} color="#ff6b6b" />
              <Text style={styles.competitionButtonText}>Paylaşım Yap</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cart Sharing Feature Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🛒 Sepet Paylaşma</Text>
            <Text style={styles.sectionSubtitle}>Sepetini paylaş, birlikte alışveriş yap!</Text>
          </View>
          
          <View style={styles.cartShareCard}>
            <View style={styles.cartShareHeader}>
              <View style={styles.cartShareIcon}>
              <Icon name="shopping-cart" size={24} color="white" />
              </View>
              <View style={styles.cartShareInfo}>
                <Text style={styles.cartShareTitle}>Sepetimi Paylaş</Text>
                <Text style={styles.cartShareDescription}>"Bak bunu aldım, sen de ister misin?"</Text>
              </View>
              <View style={styles.cartShareReward}>
                <Text style={styles.cartShareRewardText}>%5</Text>
                <Text style={styles.cartShareRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.cartShareStats}>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>₺450</Text>
                <Text style={styles.cartShareStatLabel}>Sepet Tutarı</Text>
              </View>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>3</Text>
                <Text style={styles.cartShareStatLabel}>Ürün</Text>
              </View>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>2</Text>
                <Text style={styles.cartShareStatLabel}>Paylaşım</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.cartShareButton}
              onPress={handleShareCart}
            >
              <Icon name="share" size={20} color="#17a2b8" />
              <Text style={styles.cartShareButtonText}>Sepetimi Paylaş</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cartShareCard}>
            <View style={styles.cartShareHeader}>
              <View style={styles.cartShareIcon}>
                <Icon name="group" size={24} color="white" />
              </View>
              <View style={styles.cartShareInfo}>
                <Text style={styles.cartShareTitle}>Ortak Alışveriş</Text>
                <Text style={styles.cartShareDescription}>Arkadaşınla aynı anda alışveriş yap, indirim kazan</Text>
              </View>
              <View style={styles.cartShareReward}>
                <Text style={styles.cartShareRewardText}>%10</Text>
                <Text style={styles.cartShareRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.cartShareStats}>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>2</Text>
                <Text style={styles.cartShareStatLabel}>Kişi</Text>
              </View>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>₺890</Text>
                <Text style={styles.cartShareStatLabel}>Toplam</Text>
              </View>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>₺89</Text>
                <Text style={styles.cartShareStatLabel}>Tasarruf</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.cartShareButton}>
              <Icon name="person-add" size={20} color="#17a2b8" />
              <Text style={styles.cartShareButtonText}>Arkadaş Davet Et</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cartShareCard}>
            <View style={styles.cartShareHeader}>
              <View style={styles.cartShareIcon}>
                <Icon name="card-giftcard" size={24} color="white" />
              </View>
              <View style={styles.cartShareInfo}>
                <Text style={styles.cartShareTitle}>Hediye Sepeti</Text>
                <Text style={styles.cartShareDescription}>Arkadaşına hediye sepeti gönder, ikiniz de indirim kazanın</Text>
              </View>
              <View style={styles.cartShareReward}>
                <Text style={styles.cartShareRewardText}>%15</Text>
                <Text style={styles.cartShareRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.cartShareStats}>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>1</Text>
                <Text style={styles.cartShareStatLabel}>Hediye</Text>
              </View>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>₺250</Text>
                <Text style={styles.cartShareStatLabel}>Tutar</Text>
              </View>
              <View style={styles.cartShareStat}>
                <Text style={styles.cartShareStatValue}>₺37</Text>
                <Text style={styles.cartShareStatLabel}>Tasarruf</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.cartShareButton}>
              <Icon name="card-giftcard" size={20} color="#17a2b8" />
              <Text style={styles.cartShareButtonText}>Hediye Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Buy Together, Get Cheaper Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🤝 Birlikte Al, Daha Ucuza Gel</Text>
            <Text style={styles.sectionSubtitle}>Arkadaşınla birlikte al, indirim kazan!</Text>
          </View>
          
          <View style={styles.buyTogetherCard}>
            <View style={styles.buyTogetherHeader}>
              <View style={styles.buyTogetherIcon}>
                <Icon name="home" size={24} color="white" />
              </View>
              <View style={styles.buyTogetherInfo}>
                <Text style={styles.buyTogetherTitle}>Çadır + Uyku Tulumu</Text>
                <Text style={styles.buyTogetherDescription}>Arkadaşınla birlikte al, %15 daha ucuz olsun</Text>
              </View>
              <View style={styles.buyTogetherReward}>
                <Text style={styles.buyTogetherRewardText}>%15</Text>
                <Text style={styles.buyTogetherRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.buyTogetherProducts}>
              <View style={styles.buyTogetherProduct}>
                <Text style={styles.buyTogetherProductName}>Kamp Çadırı</Text>
                <Text style={styles.buyTogetherProductPrice}>₺450</Text>
              </View>
              <View style={styles.buyTogetherProduct}>
                <Text style={styles.buyTogetherProductName}>Uyku Tulumu</Text>
                <Text style={styles.buyTogetherProductPrice}>₺280</Text>
              </View>
            </View>
            <View style={styles.buyTogetherStats}>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺730</Text>
                <Text style={styles.buyTogetherStatLabel}>Normal Fiyat</Text>
              </View>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺620</Text>
                <Text style={styles.buyTogetherStatLabel}>Birlikte Al</Text>
              </View>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺110</Text>
                <Text style={styles.buyTogetherStatLabel}>Tasarruf</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.buyTogetherButton}
              onPress={() => handleJoinBuyTogether('offer-1')}
            >
              <Icon name="group" size={20} color="#6f42c1" />
              <Text style={styles.buyTogetherButtonText}>Arkadaşınla Al</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buyTogetherCard}>
            <View style={styles.buyTogetherHeader}>
              <View style={styles.buyTogetherIcon}>
              <Icon name="checkroom" size={24} color="white" />
              </View>
              <View style={styles.buyTogetherInfo}>
                <Text style={styles.buyTogetherTitle}>Kamp Kıyafetleri Seti</Text>
                <Text style={styles.buyTogetherDescription}>3 arkadaş aynı kıyafetleri al, %20 indirim</Text>
              </View>
              <View style={styles.buyTogetherReward}>
                <Text style={styles.buyTogetherRewardText}>%20</Text>
                <Text style={styles.buyTogetherRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.buyTogetherProducts}>
              <View style={styles.buyTogetherProduct}>
                <Text style={styles.buyTogetherProductName}>Polar Bere</Text>
                <Text style={styles.buyTogetherProductPrice}>₺85</Text>
              </View>
              <View style={styles.buyTogetherProduct}>
                <Text style={styles.buyTogetherProductName}>Hoodie</Text>
                <Text style={styles.buyTogetherProductPrice}>₺180</Text>
              </View>
              <View style={styles.buyTogetherProduct}>
                <Text style={styles.buyTogetherProductName}>Polar Pantolon</Text>
                <Text style={styles.buyTogetherProductPrice}>₺220</Text>
              </View>
            </View>
            <View style={styles.buyTogetherStats}>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺1,455</Text>
                <Text style={styles.buyTogetherStatLabel}>Normal Fiyat</Text>
              </View>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺1,164</Text>
                <Text style={styles.buyTogetherStatLabel}>Birlikte Al</Text>
              </View>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺291</Text>
                <Text style={styles.buyTogetherStatLabel}>Tasarruf</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.buyTogetherButton}>
              <Icon name="group" size={20} color="#6f42c1" />
              <Text style={styles.buyTogetherButtonText}>Grup Oluştur</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buyTogetherCard}>
            <View style={styles.buyTogetherHeader}>
              <View style={styles.buyTogetherIcon}>
                <Icon name="restaurant" size={24} color="white" />
              </View>
              <View style={styles.buyTogetherInfo}>
                <Text style={styles.buyTogetherTitle}>Mutfak Seti</Text>
                <Text style={styles.buyTogetherDescription}>Kamp mutfağı için 2 kişi birlikte al, %12 indirim</Text>
              </View>
              <View style={styles.buyTogetherReward}>
                <Text style={styles.buyTogetherRewardText}>%12</Text>
                <Text style={styles.buyTogetherRewardLabel}>İndirim</Text>
              </View>
            </View>
            <View style={styles.buyTogetherProducts}>
              <View style={styles.buyTogetherProduct}>
                <Text style={styles.buyTogetherProductName}>Kamp Ocağı</Text>
                <Text style={styles.buyTogetherProductPrice}>₺120</Text>
              </View>
              <View style={styles.buyTogetherProduct}>
                <Text style={styles.buyTogetherProductName}>Tencere Seti</Text>
                <Text style={styles.buyTogetherProductPrice}>₺95</Text>
              </View>
            </View>
            <View style={styles.buyTogetherStats}>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺430</Text>
                <Text style={styles.buyTogetherStatLabel}>Normal Fiyat</Text>
              </View>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺378</Text>
                <Text style={styles.buyTogetherStatLabel}>Birlikte Al</Text>
              </View>
              <View style={styles.buyTogetherStat}>
                <Text style={styles.buyTogetherStatValue}>₺52</Text>
                <Text style={styles.buyTogetherStatLabel}>Tasarruf</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.buyTogetherButton}>
              <Icon name="group" size={20} color="#6f42c1" />
              <Text style={styles.buyTogetherButtonText}>Arkadaşınla Al</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading indicator for API data */}
        {showLoading && (
          <View style={styles.section}>
            <LoadingIndicator />
          </View>
        )}

        {/* Personalized Offers */}
        {!showLoading && personalizedContent?.personalizedOffers && personalizedContent.personalizedOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Size Özel Teklifler</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersScroll}
            >
              {personalizedContent.personalizedOffers.map(renderPersonalizedOffer)}
            </ScrollView>
          </View>
        )}

        {/* Available Campaigns */}
        {!showLoading && availableCampaigns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎪 Aktif Kampanyalar</Text>
            {availableCampaigns.map(renderCampaignCard)}
          </View>
        )}

        {/* Discount Codes */}
        {!showLoading && discountCodes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ İndirim Kodlarım</Text>
            {discountCodes.map(renderDiscountCodeCard)}
          </View>
        )}

        {/* Empty State for API data */}
        {!showLoading && availableCampaigns.length === 0 && discountCodes.length === 0 && personalizedContent?.personalizedOffers?.length === 0 && (
          <EmptyState
            title="Henüz Kampanya Yok"
            message="Size özel kampanyalar henüz hazır değil"
            icon="card-giftcard"
          />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

        {/* Discount Wheel Modal */}
        <DiscountWheel
          visible={showDiscountWheel}
          onClose={() => setShowDiscountWheel(false)}
          onSpinComplete={handleDiscountWheelComplete}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

// Helper functions
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'active': '#28a745',
    'draft': '#ffc107',
    'paused': '#dc3545',
    'completed': '#6c757d',
    'cancelled': '#dc3545'
  };
  return colors[status] || '#6c757d';
};

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    'active': 'Aktif',
    'draft': 'Taslak',
    'paused': 'Duraklatıldı',
    'completed': 'Tamamlandı',
    'cancelled': 'İptal Edildi'
  };
  return texts[status] || status;
};

const getOfferColor = (type: string): string => {
  const colors: Record<string, string> = {
    'discount': '#28a745',
    'free_shipping': '#17a2b8',
    'bundle': '#6f42c1',
    'loyalty': '#fd7e14',
    'seasonal': '#20c997',
    'birthday': '#e83e8c'
  };
  return colors[type] || '#007bff';
};

const getOfferIcon = (type: string): string => {
  const icons: Record<string, string> = {
    'discount': 'local-offer',
    'free_shipping': 'local-shipping',
    'bundle': 'inventory',
    'loyalty': 'star',
    'seasonal': 'eco',
    'birthday': 'cake'
  };
  return icons[type] || 'card-giftcard';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  wheelButton: {
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  wheelButtonGradient: {
    padding: 20,
    alignItems: 'center',
  },
  wheelButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  wheelButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 5,
  },
  offersScroll: {
    paddingLeft: 20,
  },
  offerCard: {
    width: width * 0.8,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  offerGradient: {
    padding: 15,
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerText: {
    flex: 1,
    marginLeft: 10,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  offerDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  offerDiscount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  campaignCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  campaignIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  campaignDescription: {
    fontSize: 14,
    color: '#666',
  },
  campaignStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  campaignDetails: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  discountCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  discountInfo: {
    flex: 1,
  },
  discountCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    letterSpacing: 1,
  },
  discountValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  discountStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  discountDetails: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  // Social Task Styles
  socialTaskCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  socialTaskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  socialTaskInfo: {
    flex: 1,
  },
  socialTaskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  socialTaskDescription: {
    fontSize: 14,
    color: '#666',
  },
  socialTaskReward: {
    alignItems: 'center',
  },
  socialTaskRewardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  socialTaskRewardLabel: {
    fontSize: 12,
    color: '#28a745',
  },
  socialTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  socialTaskButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  // Group Discount Styles
  groupDiscountCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupDiscountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupDiscountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupDiscountInfo: {
    flex: 1,
  },
  groupDiscountTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  groupDiscountDescription: {
    fontSize: 14,
    color: '#666',
  },
  groupDiscountReward: {
    alignItems: 'center',
  },
  groupDiscountRewardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  groupDiscountRewardLabel: {
    fontSize: 12,
    color: '#28a745',
  },
  groupDiscountProgress: {
    marginBottom: 10,
  },
  groupDiscountProgressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  groupDiscountProgressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  groupDiscountProgressFill: {
    height: '100%',
    backgroundColor: '#28a745',
  },
  groupDiscountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  groupDiscountButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  // Competition Styles
  competitionCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  competitionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  competitionInfo: {
    flex: 1,
  },
  competitionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  competitionDescription: {
    fontSize: 14,
    color: '#666',
  },
  competitionReward: {
    alignItems: 'center',
  },
  competitionRewardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  competitionRewardLabel: {
    fontSize: 12,
    color: '#ff6b6b',
  },
  competitionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  competitionStat: {
    alignItems: 'center',
  },
  competitionStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  competitionStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  competitionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  competitionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  // Cart Share Styles
  cartShareCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartShareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartShareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#17a2b8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartShareInfo: {
    flex: 1,
  },
  cartShareTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  cartShareDescription: {
    fontSize: 14,
    color: '#666',
  },
  cartShareReward: {
    alignItems: 'center',
  },
  cartShareRewardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#17a2b8',
  },
  cartShareRewardLabel: {
    fontSize: 12,
    color: '#17a2b8',
  },
  cartShareStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  cartShareStat: {
    alignItems: 'center',
  },
  cartShareStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartShareStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cartShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17a2b8',
  },
  cartShareButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#17a2b8',
  },
  // Buy Together Styles
  buyTogetherCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buyTogetherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  buyTogetherIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6f42c1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buyTogetherInfo: {
    flex: 1,
  },
  buyTogetherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  buyTogetherDescription: {
    fontSize: 14,
    color: '#666',
  },
  buyTogetherReward: {
    alignItems: 'center',
  },
  buyTogetherRewardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6f42c1',
  },
  buyTogetherRewardLabel: {
    fontSize: 12,
    color: '#6f42c1',
  },
  buyTogetherProducts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  buyTogetherProduct: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  buyTogetherProductName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  buyTogetherProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  buyTogetherStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  buyTogetherStat: {
    alignItems: 'center',
  },
  buyTogetherStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buyTogetherStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buyTogetherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6f42c1',
  },
  buyTogetherButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6f42c1',
  },
});
