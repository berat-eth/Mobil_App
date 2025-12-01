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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxImageSize?: number; // MB cinsinden
  disabled?: boolean;
}

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 60) / 3; // 3 sütunlu grid

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  maxImageSize = 5,
  disabled = false,
}) => {
  const { t, isLoading: languageLoading } = useLanguage();
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        'Fotoğraf galerisine erişim izni gerekli'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        `Maksimum ${maxImages} fotoğraf yükleyebilirsiniz`
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxImages - images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages: string[] = [];
        
        for (const asset of result.assets) {
          // Dosya boyutu kontrolü
          if (asset.fileSize && asset.fileSize > maxImageSize * 1024 * 1024) {
            Alert.alert(
              languageLoading ? 'Hata' : t('common.error'),
              `${asset.fileName} dosyası çok büyük. Maksimum ${maxImageSize}MB olmalı.`
            );
            continue;
          }
          
          newImages.push(asset.uri);
        }

        if (newImages.length > 0) {
          onImagesChange([...images, ...newImages]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), 'Fotoğraf seçilirken bir hata oluştu');
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        languageLoading ? 'Hata' : t('common.error'),
        `Maksimum ${maxImages} fotoğraf yükleyebilirsiniz`
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
        
        // Dosya boyutu kontrolü
        if (asset.fileSize && asset.fileSize > maxImageSize * 1024 * 1024) {
          Alert.alert(
            languageLoading ? 'Hata' : t('common.error'),
            `Fotoğraf çok büyük. Maksimum ${maxImageSize}MB olmalı.`
          );
          return;
        }

        onImagesChange([...images, asset.uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), 'Fotoğraf çekilirken bir hata oluştu');
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const showImageOptions = () => {
    Alert.alert(
      'Fotoğraf Ekle',
      'Fotoğraf eklemek için bir seçenek seçin',
      [
        { text: 'Galeriden Seç', onPress: pickImage },
        { text: 'Kamera ile Çek', onPress: takePhoto },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  const renderImage = (uri: string, index: number) => (
    <View key={index} style={styles.imageContainer}>
      <Image source={{ uri }} style={styles.image} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeImage(index)}
        disabled={disabled}
      >
        <Icon name="close" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderAddButton = () => (
    <TouchableOpacity
      style={[styles.addButton, disabled && styles.disabledButton]}
      onPress={showImageOptions}
      disabled={disabled || images.length >= maxImages}
    >
      {uploading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Icon 
          name="add" 
          size={24} 
          color={images.length >= maxImages ? Colors.textMuted : Colors.primary} 
        />
      )}
      <Text style={[
        styles.addButtonText,
        images.length >= maxImages && styles.disabledText
      ]}>
        {images.length >= maxImages ? 'Maksimum' : 'Fotoğraf Ekle'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Ürün Fotoğrafları ({images.length}/{maxImages})
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.imageGrid}>
          {images.map((uri, index) => renderImage(uri, index))}
          {images.length < maxImages && renderAddButton()}
        </View>
      </ScrollView>
      
      <Text style={styles.helpText}>
        Ürününüzün farklı açılardan fotoğraflarını ekleyebilirsiniz
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
  imageGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: Colors.background,
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
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
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
