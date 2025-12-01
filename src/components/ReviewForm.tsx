import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Review } from '../utils/types';
import { MediaUploader } from './MediaUploader';
import { useLanguage } from '../contexts/LanguageContext';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  uploaded?: boolean;
  uploadUrl?: string;
}

interface ReviewFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string, media?: MediaItem[]) => void;
  review?: Review | null;
  loading?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  visible,
  onClose,
  onSubmit,
  review,
  loading = false,
}) => {
  const { t, isLoading: languageLoading } = useLanguage();
  const [rating, setRating] = useState(review?.rating || 5);
  const [comment, setComment] = useState(review?.comment || '');
  const [media, setMedia] = useState<MediaItem[]>(
    review?.media?.map(m => ({
      uri: m.mediaUrl,
      type: m.mediaType,
      uploaded: true,
      uploadUrl: m.mediaUrl,
    })) || 
    review?.images?.map(img => ({
      uri: img.imageUrl,
      type: 'image' as const,
      uploaded: true,
      uploadUrl: img.imageUrl,
    })) || 
    []
  );

  const handleSubmit = () => {
    if (!comment.trim()) {
      Alert.alert(languageLoading ? 'Hata' : t('common.error'), languageLoading ? 'Lütfen bir yorum yazın' : t('reviews.commentRequired'));
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert(languageLoading ? 'Hata' : t('common.error'), languageLoading ? 'Lütfen 1-5 arası bir puan verin' : t('reviews.ratingRequired'));
      return;
    }

    onSubmit(rating, comment.trim(), media);
  };

  const handleClose = () => {
    setRating(review?.rating || 5);
    setComment(review?.comment || '');
    setMedia(
      review?.media?.map(m => ({
        uri: m.mediaUrl,
        type: m.mediaType,
        uploaded: true,
        uploadUrl: m.mediaUrl,
      })) || 
      review?.images?.map(img => ({
        uri: img.imageUrl,
        type: 'image' as const,
        uploaded: true,
        uploadUrl: img.imageUrl,
      })) || 
      []
    );
    onClose();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
          <Text style={[styles.star, i <= rating && styles.starSelected]}>
            {i <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {review ? 'Yorumunuzu Düzenleyin' : 'Yorum Yapın'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t('reviews.yourRating')}:</Text>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            <Text style={styles.ratingText}>{rating}/5</Text>

            <Text style={styles.label}>{t('reviews.yourComment')}:</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder={t('reviews.commentPlaceholder')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <MediaUploader
              media={media}
              onMediaChange={setMedia}
              maxMedia={5}
              maxImageSize={5}
              maxVideoSize={50}
              disabled={loading}
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? t('common.loading') : (review ? t('common.save') : t('reviews.submit'))}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 24,
    color: '#E0E0E0',
  },
  starSelected: {
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
