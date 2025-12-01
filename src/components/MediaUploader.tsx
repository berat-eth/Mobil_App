import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Video,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../utils/api-service';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  uploaded?: boolean;
  uploadUrl?: string;
}

interface MediaUploaderProps {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxMedia?: number;
  maxImageSize?: number; // MB cinsinden
  maxVideoSize?: number; // MB cinsinden
  disabled?: boolean;
}

const { width } = Dimensions.get('window');
const MEDIA_SIZE = (width - 60) / 3; // 3 sütunlu grid

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  media,
  onMediaChange,
  maxMedia = 5,
  maxImageSize = 5,
  maxVideoSize = 50,
  disabled = false,
}) => {
  const { t, isLoading: languageLoading } = useLanguage();
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async (isVideo: boolean = false) => {
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libraryStatus !== 'granted') {
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        'Medya galerisine erişim izni gerekli'
      );
      return false;
    }

    if (isVideo) {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert(
          languageLoading ? 'Hata' : t('common.error'),
          'Kamera erişim izni gerekli'
        );
        return false;
      }
    }

    return true;
  };

  const uploadToServer = async (fileUri: string, type: 'image' | 'video'): Promise<string | null> => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      const filename = fileUri.split('/').pop() || `media-${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`;
      const fileType = type === 'image' ? 'image/jpeg' : 'video/mp4';
      
      formData.append('media', {
        uri: fileUri,
        type: fileType,
        name: filename,
      } as any);

      // Authentication header'larını al
      const { getApiKey, getTenantId } = await import('../services/AuthKeyStore');
      const { DEFAULT_TENANT_API_KEY, DEFAULT_TENANT_ID, SINGLE_TENANT } = await import('../utils/api-config');
      
      let apiKeyToUse: string | null = null;
      let tenantIdToUse: string | null = null;
      
      if (SINGLE_TENANT) {
        apiKeyToUse = DEFAULT_TENANT_API_KEY || null;
        tenantIdToUse = DEFAULT_TENANT_ID || null;
      }
      
      // Depodan okunan değerleri tercih et
      try {
        const [storedKey, storedTenant] = await Promise.all([
          getApiKey(),
          getTenantId()
        ]);
        if (storedKey) apiKeyToUse = storedKey;
        if (storedTenant) tenantIdToUse = storedTenant;
      } catch {}
      
      // Runtime'da set edilen API anahtarı öncelikli
      const runtimeApiKey = apiService.getApiKey();
      if (runtimeApiKey) {
        apiKeyToUse = runtimeApiKey;
      }
      
      // Header'ları oluştur
      const headers: Record<string, string> = {};
      
      // FormData için Content-Type'ı fetch otomatik ayarlar, manuel eklemeyin
      if (tenantIdToUse) {
        headers['X-Tenant-Id'] = tenantIdToUse;
        headers['x-tenant-id'] = tenantIdToUse;
      }
      
      if (apiKeyToUse) {
        headers['X-API-Key'] = apiKeyToUse;
        headers['Authorization'] = `Bearer ${apiKeyToUse}`;
      }
      
      const baseUrl = apiService.getCurrentApiUrl();
      const response = await fetch(`${baseUrl}/reviews/upload`, {
        method: 'POST',
        body: formData,
        headers,
      });

      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        return result.data[0].mediaUrl;
      }
      
      throw new Error(result.message || 'Yükleme başarısız');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        error.message || 'Dosya yüklenirken bir hata oluştu'
      );
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pickMedia = async (isVideo: boolean = false) => {
    if (media.length >= maxMedia) {
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        `Maksimum ${maxMedia} medya yükleyebilirsiniz`
      );
      return;
    }

    const hasPermission = await requestPermissions(isVideo);
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: isVideo 
          ? ImagePicker.MediaTypeOptions.Videos 
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: !isVideo,
        aspect: isVideo ? undefined : [1, 1],
        quality: isVideo ? 1 : 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxMedia - media.length,
      });

      if (!result.canceled && result.assets) {
        const newMedia: MediaItem[] = [];
        
        for (const asset of result.assets) {
          const fileSizeMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;
          const maxSize = isVideo ? maxVideoSize : maxImageSize;
          
          if (fileSizeMB > maxSize) {
            Alert.alert(
              languageLoading ? 'Hata' : t('common.error'),
              `${asset.fileName || 'Dosya'} çok büyük. Maksimum ${maxSize}MB olmalı.`
            );
            continue;
          }
          
          const mediaType = isVideo ? 'video' : 'image';
          newMedia.push({
            uri: asset.uri,
            type: mediaType,
            uploaded: false,
          });
        }

        if (newMedia.length > 0) {
          // Yeni medyaları ekle
          const updatedMedia = [...media, ...newMedia];
          onMediaChange(updatedMedia);
          
          // Sunucuya yükle
          for (let i = 0; i < newMedia.length; i++) {
            const index = media.length + i;
            const uploadUrl = await uploadToServer(newMedia[i].uri, newMedia[i].type);
            
            if (uploadUrl) {
              const updated = [...updatedMedia];
              updated[index] = {
                ...updated[index],
                uploaded: true,
                uploadUrl: uploadUrl,
              };
              onMediaChange(updated);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error picking media:', error);
      Alert.alert(t('common.error'), 'Medya seçilirken bir hata oluştu');
    }
  };

  const takePhoto = async () => {
    if (media.length >= maxMedia) {
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        `Maksimum ${maxMedia} medya yükleyebilirsiniz`
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        'Kamera erişim izni gerekli'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileSizeMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;
        
        if (fileSizeMB > maxImageSize) {
          Alert.alert(
            languageLoading ? 'Hata' : t('common.error'),
            `Fotoğraf çok büyük. Maksimum ${maxImageSize}MB olmalı.`
          );
          return;
        }

        const newMedia: MediaItem = {
          uri: asset.uri,
          type: 'image',
          uploaded: false,
        };

        const updatedMedia = [...media, newMedia];
        onMediaChange(updatedMedia);

        // Sunucuya yükle
        const uploadUrl = await uploadToServer(newMedia.uri, 'image');
        if (uploadUrl) {
          const index = updatedMedia.length - 1;
          updatedMedia[index] = {
            ...updatedMedia[index],
            uploaded: true,
            uploadUrl: uploadUrl,
          };
          onMediaChange(updatedMedia);
        }
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), 'Fotoğraf çekilirken bir hata oluştu');
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = media.filter((_, i) => i !== index);
    onMediaChange(newMedia);
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Medya Ekle',
      'Medya eklemek için bir seçenek seçin',
      [
        { text: 'Görsel Seç', onPress: () => pickMedia(false) },
        { text: 'Video Seç', onPress: () => pickMedia(true) },
        { text: 'Fotoğraf Çek', onPress: takePhoto },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  const renderMedia = (item: MediaItem, index: number) => (
    <View key={index} style={styles.mediaContainer}>
      {item.type === 'image' ? (
        <Image source={{ uri: item.uploadUrl || item.uri }} style={styles.media} />
      ) : (
        <Video
          source={{ uri: item.uploadUrl || item.uri }}
          style={styles.media}
          resizeMode="cover"
          paused={true}
        />
      )}
      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Icon name="play-circle-filled" size={20} color="#fff" />
        </View>
      )}
      {!item.uploaded && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeMedia(index)}
        disabled={disabled}
      >
        <Icon name="close" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderAddButton = () => (
    <TouchableOpacity
      style={[styles.addButton, disabled && styles.disabledButton]}
      onPress={showMediaOptions}
      disabled={disabled || media.length >= maxMedia || uploading}
    >
      {uploading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Icon 
          name="add" 
          size={24} 
          color={media.length >= maxMedia ? Colors.textMuted : Colors.primary} 
        />
      )}
      <Text style={[
        styles.addButtonText,
        media.length >= maxMedia && styles.disabledText
      ]}>
        {media.length >= maxMedia ? 'Maksimum' : 'Medya Ekle'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Yorum Medyaları ({media.length}/{maxMedia})
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.mediaGrid}>
          {media.map((item, index) => renderMedia(item, index))}
          {media.length < maxMedia && renderAddButton()}
        </View>
      </ScrollView>
      
      <Text style={styles.helpText}>
        Ürününüzün fotoğraflarını veya videolarını ekleyebilirsiniz
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  scrollView: {
    marginBottom: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaContainer: {
    position: 'relative',
  },
  media: {
    width: MEDIA_SIZE,
    height: MEDIA_SIZE,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButton: {
    width: MEDIA_SIZE,
    height: MEDIA_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  disabledButton: {
    borderColor: Colors.textMuted,
    backgroundColor: Colors.background,
  },
  addButtonText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  disabledText: {
    color: Colors.textMuted,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});

