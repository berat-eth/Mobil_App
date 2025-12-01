import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';

interface ReviewImageGalleryProps {
  images: string[];
  visible: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const { width, height } = Dimensions.get('window');

export const ReviewImageGallery: React.FC<ReviewImageGalleryProps> = ({
  images,
  visible,
  onClose,
  initialIndex = 0,
}) => {
  const { t, isLoading: languageLoading } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const renderImage = (uri: string, index: number) => (
    <View key={index} style={styles.imageContainer}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );

  const renderThumbnail = (uri: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.thumbnail,
        currentIndex === index && styles.activeThumbnail
      ]}
      onPress={() => setCurrentIndex(index)}
    >
      <Image source={{ uri }} style={styles.thumbnailImage} />
    </TouchableOpacity>
  );

  if (!visible || images.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="black" barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Main Image */}
        <View style={styles.mainImageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentIndex(index);
            }}
            contentOffset={{ x: currentIndex * width, y: 0 }}
          >
            {images.map((uri, index) => renderImage(uri, index))}
          </ScrollView>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={goToPrevious}
                >
                  <Icon name="chevron-left" size={30} color="white" />
                </TouchableOpacity>
              )}

              {currentIndex < images.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={goToNext}
                >
                  <Icon name="chevron-right" size={30} color="white" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Thumbnails */}
        {images.length > 1 && (
          <View style={styles.thumbnailsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsScroll}
            >
              {images.map((uri, index) => renderThumbnail(uri, index))}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  mainImageContainer: {
    flex: 1,
    position: 'relative',
  },
  imageContainer: {
    width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  thumbnailsContainer: {
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
  },
  thumbnailsScroll: {
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  activeThumbnail: {
    borderColor: Colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
