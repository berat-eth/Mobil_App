import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  SafeAreaView,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { AdminStoryItem } from '../services/AdminStoryService';

interface StoryViewerProps {
  visible: boolean;
  stories: AdminStoryItem[];
  currentIndex: number;
  onClose: () => void;
  onStoryPress?: (story: AdminStoryItem) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const StoryViewer: React.FC<StoryViewerProps> = ({
  visible,
  stories,
  currentIndex,
  onClose,
  onStoryPress,
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(currentIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setCurrentStoryIndex(currentIndex);
    setProgress(0);
  }, [currentIndex, visible]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, stories.length, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    }
  }, [currentStoryIndex]);

  useEffect(() => {
    if (!visible || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2; // 5 saniyede tamamlanır
      });
    }, 100);

    return () => clearInterval(timer);
  }, [visible, currentStoryIndex, isPaused, handleNext]);

  // Android geri tuşu ile kapatma
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  const handleStoryPress = () => {
    const currentStory = stories[currentStoryIndex];
    if (currentStory && onStoryPress) {
      onStoryPress(currentStory);
    }
  };

  const handleActionButtonPress = () => {
    const currentStory = stories[currentStoryIndex];
    if (currentStory && currentStory.clickAction) {
      if (currentStory.clickAction.type === 'category' && currentStory.clickAction.value) {
        // Kategori sayfasına yönlendir
        console.log('Kategoriye yönlendiriliyor:', currentStory.clickAction.value);
      } else if (currentStory.clickAction.type === 'product' && currentStory.clickAction.value) {
        // Ürün detayına yönlendir
        console.log('Ürüne yönlendiriliyor:', currentStory.clickAction.value);
      } else if (currentStory.clickAction.type === 'url' && currentStory.clickAction.value) {
        // URL'ye yönlendir
        console.log('URL\'ye yönlendiriliyor:', currentStory.clickAction.value);
      }
    }
  };

  const handlePressIn = () => {
    setIsPaused(true);
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  if (!visible || !stories.length) return null;

  const currentStory = stories[currentStoryIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="black" barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: index === currentStoryIndex
                      ? `${progress}%`
                      : index < currentStoryIndex
                      ? '100%'
                      : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Story Content */}
        <TouchableOpacity
          style={styles.storyContainer}
          onPress={handleStoryPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Top Close Area */}
          <TouchableOpacity 
            style={styles.topCloseArea}
            onPress={onClose}
            activeOpacity={1}
          />
          {currentStory.videoUrl ? (
            <Video
              source={{ uri: currentStory.videoUrl }}
              style={styles.storyImage}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
          ) : (
            <Image
              source={{ uri: currentStory.imageUrl }}
              style={styles.storyImage}
              resizeMode="cover"
            />
          )}
          
          {/* Story Overlay */}
          <View style={styles.storyOverlay}>
            <View style={styles.storyInfo}>
              <Text style={styles.storyTitle}>{currentStory.title}</Text>
              {currentStory.description && (
                <Text style={styles.storyDescription}>{currentStory.description}</Text>
              )}
              
              {/* Action Button */}
              {currentStory.clickAction && currentStory.clickAction.type !== 'none' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleActionButtonPress}
                >
                  <Text style={styles.actionButtonText}>
                    {currentStory.clickAction.type === 'category' ? 'Kategoriye Git' :
                     currentStory.clickAction.type === 'product' ? 'Ürünü Gör' :
                     currentStory.clickAction.type === 'url' ? 'Detayları Gör' : 'Devam Et'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Navigation Areas */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navigationArea, styles.leftArea]}
            onPress={handlePrevious}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={[styles.navigationArea, styles.rightArea]}
            onPress={handleNext}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          />
        </View>

        {/* Story Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentStoryIndex + 1} / {stories.length}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  closeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  storyContainer: {
    flex: 1,
    position: 'relative',
  },
  topCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 5,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  storyInfo: {
    marginTop: 'auto',
  },
  storyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyDescription: {
    fontSize: 18,
    color: 'white',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: Spacing.md,
  },
  navigationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  navigationArea: {
    flex: 1,
  },
  leftArea: {
    // Sol yarı - önceki story
  },
  rightArea: {
    // Sağ yarı - sonraki story
  },
  counterContainer: {
    position: 'absolute',
    top: 60,
    right: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StoryViewer;
