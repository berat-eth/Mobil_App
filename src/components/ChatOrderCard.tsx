import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Order, OrderStatus } from '../utils/types';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';

interface ChatOrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = width * 0.7; // Chat için daha geniş

const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return Colors.warning;
    case OrderStatus.PROCESSING:
      return Colors.info;
    case OrderStatus.SHIPPED:
      return Colors.primary;
    case OrderStatus.DELIVERED:
      return Colors.success;
    case OrderStatus.CANCELLED:
      return Colors.error;
    default:
      return Colors.textLight;
  }
};

const getStatusText = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Beklemede';
    case OrderStatus.PROCESSING:
      return 'Hazırlanıyor';
    case OrderStatus.SHIPPED:
      return 'Kargoda';
    case OrderStatus.DELIVERED:
      return 'Teslim Edildi';
    case OrderStatus.CANCELLED:
      return 'İptal Edildi';
    default:
      return status;
  }
};

const getStatusIcon = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return 'schedule';
    case OrderStatus.PROCESSING:
      return 'local-shipping';
    case OrderStatus.SHIPPED:
      return 'local-shipping';
    case OrderStatus.DELIVERED:
      return 'check-circle';
    case OrderStatus.CANCELLED:
      return 'cancel';
    default:
      return 'info';
  }
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const ChatOrderCard: React.FC<ChatOrderCardProps> = ({ order, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(order)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Sipariş #{order.id}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Icon name={getStatusIcon(order.status)} size={14} color="#FFFFFF" />
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Icon name="shopping-bag" size={16} color={Colors.textLight} />
          <Text style={styles.detailText}>
            {order.items?.length || 0} ürün
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="location-on" size={16} color={Colors.textLight} />
          <Text style={styles.detailText} numberOfLines={1}>
            {order.shippingAddress}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.total}>
          {Number(order.totalAmount || 0).toFixed(2)} TL
        </Text>
        <Icon name="chevron-right" size={20} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
    width: cardWidth,
    ...Spacing.shadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  details: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textLight,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});

