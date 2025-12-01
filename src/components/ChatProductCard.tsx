import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Product } from '../utils/types';
import { ProductController } from '../controllers/ProductController';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';

interface ChatProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = width * 0.7; // Chat için daha geniş

export const ChatProductCard: React.FC<ChatProductCardProps> = ({ product, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(product)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: product.image || 'https://via.placeholder.com/200' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.price}>
            {ProductController.formatPrice(product.price)}
          </Text>
          {product.stock > 0 && (
            <View style={styles.stockContainer}>
              <Icon name="check-circle" size={14} color={Colors.success} />
              <Text style={styles.stockText}>Stokta</Text>
            </View>
          )}
        </View>
        {product.rating > 0 && (
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color={Colors.warning} />
            <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.arrowContainer}>
        <Icon name="chevron-right" size={20} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginVertical: Spacing.xs,
    overflow: 'hidden',
    width: cardWidth,
    ...Spacing.shadow,
  },
  image: {
    width: 80,
    height: 80,
    backgroundColor: Colors.border,
  },
  content: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    color: Colors.textLight,
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingRight: Spacing.sm,
  },
});

