import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  Modal,
  Video,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Review } from '../utils/types';
import { ReviewController } from '../controllers/ReviewController';
import { ReviewImageGallery } from './ReviewImageGallery';
import { useLanguage } from '../contexts/LanguageContext';
import { Colors } from '../theme/colors';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: number;
  onReviewUpdate: () => void;
}

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 60) / 4; // 4 sütunlu grid

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  currentUserId,
  onReviewUpdate,
}) => {
  const { t, isLoading: languageLoading } = useLanguage();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={[styles.star, i <= rating && styles.starSelected]}>
          {i <= rating ? '★' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  const handleDeleteReview = async (reviewId: number) => {
    Alert.alert(
      t('reviews.deleteReview'),
      t('reviews.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('reviews.delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await ReviewController.deleteReview(reviewId);
            if (result.success) {
              onReviewUpdate();
            } else {
              Alert.alert(languageLoading ? 'Hata' : t('common.error'), result.message);
            }
          },
        },
      ]
    );
  };

  const handleViewImages = (images: string[], initialIndex: number = 0) => {
    setSelectedImages(images);
    setGalleryInitialIndex(initialIndex);
    setGalleryVisible(true);
  };

  const renderReviewMedia = (review: Review) => {
    // Yeni medya desteği (görsel + video)
    const media = review.media || [];
    
    // Backward compatibility: eski images desteği
    const images = review.images || [];
    const allMedia = [
      ...media.map(m => ({ type: 'media' as const, url: m.mediaUrl, mediaType: m.mediaType, id: m.id })),
      ...images.map(img => ({ type: 'image' as const, url: img.imageUrl, mediaType: 'image' as const, id: img.id }))
    ];

    if (allMedia.length === 0) {
      return null;
    }

    const mediaUrls = allMedia.map(m => m.url);

    return (
      <View style={styles.imagesContainer}>
        <Text style={styles.imagesLabel}>{t('reviews.images')}:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.imagesScroll}
        >
          {allMedia.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              style={styles.imageContainer}
              onPress={() => handleViewImages(mediaUrls, index)}
            >
              {item.mediaType === 'video' ? (
                <>
                  <Video
                    source={{ uri: item.url }}
                    style={styles.reviewImage}
                    resizeMode="cover"
                    paused={true}
                  />
                  <View style={styles.videoBadge}>
                    <Icon name="play-circle-filled" size={24} color="#fff" />
                  </View>
                </>
              ) : (
                <Image source={{ uri: item.url }} style={styles.reviewImage} />
              )}
              {allMedia.length > 3 && index === 2 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>+{allMedia.length - 3}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('reviews.noReviews')}</Text>
        <Text style={styles.emptySubtext}>{t('reviews.noReviewsDescription')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <View style={styles.userInfo}>
              <View style={styles.userNameContainer}>
                <Text style={styles.userName}>{review.userName}</Text>
                {review.isVerifiedPurchase && (
                  <View style={styles.verifiedBadge}>
                    <Icon name="verified" size={16} color={Colors.primary} />
                    <Text style={styles.verifiedText}>{t('reviews.verifiedPurchase')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.reviewDate}>
                {formatDate(review.createdAt)}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              {renderStars(review.rating)}
              <Text style={styles.ratingText}>{review.rating}/5</Text>
            </View>
          </View>

          <Text style={styles.reviewComment}>{review.comment}</Text>

          {renderReviewMedia(review)}

          <View style={styles.reviewFooter}>
            {review.helpfulCount !== undefined && (
              <View style={styles.helpfulContainer}>
                <TouchableOpacity style={styles.helpfulButton}>
                  <Icon 
                    name={review.isHelpful ? "thumb-up" : "thumb-up-outlined"} 
                    size={16} 
                    color={review.isHelpful ? Colors.primary : Colors.textMuted} 
                  />
                  <Text style={[
                    styles.helpfulText,
                    review.isHelpful && styles.helpfulTextActive
                  ]}>
                    {t('reviews.helpful')} ({review.helpfulCount})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {currentUserId === review.userId && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteReview(review.id)}
                >
                  <Icon name="delete" size={16} color={Colors.error} />
                  <Text style={styles.deleteButtonText}>{t('reviews.delete')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ))}

      <ReviewImageGallery
        images={selectedImages}
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
        initialIndex={galleryInitialIndex}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  reviewItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 10,
    color: Colors.primary,
    marginLeft: 2,
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 16,
    color: '#E0E0E0',
    marginRight: 2,
  },
  starSelected: {
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imagesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  imagesScroll: {
    marginBottom: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  reviewImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 4,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpfulContainer: {
    flex: 1,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  helpfulText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  helpfulTextActive: {
    color: Colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: Colors.background,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});
