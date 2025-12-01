import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import AdminStoryService, { AdminStoryItem } from '../services/AdminStoryService';
import StoryViewer from './StoryViewer';

interface InstagramStoriesProps {
  onStoryPress?: (story: AdminStoryItem) => void;
  limit?: number;
}

export const InstagramStories: React.FC<InstagramStoriesProps> = ({ onStoryPress, limit = 20 }) => {
  const [stories, setStories] = useState<AdminStoryItem[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  const load = useCallback(async () => {
    console.log('Story yükleniyor...');
    const data = await AdminStoryService.getStories(limit);
    console.log('Story verisi:', data);
    
    // API'den gelen veriyi kullan, yoksa boş array
    setStories(data || []);
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStoryPress = (story: AdminStoryItem, index: number) => {
    setSelectedStoryIndex(index);
    setViewerVisible(true);
    onStoryPress?.(story);
  };

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {stories.map((item, index) => (
            <TouchableOpacity 
              key={String(item.id)} 
              style={styles.item} 
              onPress={() => handleStoryPress(item, index)}
            >
              <View style={[styles.ring, styles.ringUnseen]}>
                <Image 
                  source={{ uri: item.thumbnailUrl || item.imageUrl }} 
                  style={styles.avatar} 
                />
              </View>
              <Text style={styles.username} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <StoryViewer
        visible={viewerVisible}
        stories={stories}
        currentIndex={selectedStoryIndex}
        onClose={() => setViewerVisible(false)}
        onStoryPress={onStoryPress}
      />
    </>
  );
};

const AVATAR = 58;
const RING = 68;

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  item: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 76,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  ringUnseen: {
    borderWidth: 2,
    borderColor: Colors.pink,
  },
  ringSeen: {
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  username: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
});

export default InstagramStories;


