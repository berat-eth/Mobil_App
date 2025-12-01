import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NotificationService, { Notification } from '../services/NotificationService';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';

interface NotificationScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      if (!NotificationService) {
        console.error('❌ NotificationService tanımsız');
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const [notifs, count] = await Promise.all([
        NotificationService.getNotifications(100),
        NotificationService.getUnreadCount(),
      ]);
      setNotifications(notifs || []);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('❌ Bildirimler yüklenirken hata:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = async (notification: Notification) => {
    
    if (!notification.isRead) {
      await NotificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Handle notification data if available
    if (notification.data) {
      if (notification.data.productId) {
        navigation.navigate('ProductDetail', { productId: notification.data.productId });
      } else if (notification.data.orderId) {
        navigation.navigate('Orders');
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await NotificationService.markAllAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'promotion':
        return 'local-offer';
      case 'order':
        return 'shopping-cart';
      default:
        return 'info';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'promotion':
        return '#8b5cf6';
      case 'order':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getTypeColor(item.type)}15` }]}>
        <Icon
          name={getTypeIcon(item.type)}
          size={24}
          color={getTypeColor(item.type)}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{item.title}</Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Tümünü okundu işaretle</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.placeholder} />}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-none" size={64} color={Colors.textLight} />
          <Text style={styles.emptyText}>Bildiriminiz yok</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  markAllButton: {
    padding: Spacing.xs,
  },
  markAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadNotification: {
    backgroundColor: '#f0f9ff',
    borderLeftColor: Colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.xs,
  },
  message: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  date: {
    fontSize: 12,
    color: Colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
});

