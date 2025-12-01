import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { NetworkMonitor } from '../utils/performance-utils';

interface ProgressiveImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  thumbnailSource?: { uri: string } | number;
  style?: ViewStyle | ViewStyle[];
  blurRadius?: number;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

/**
 * ProgressiveImage component with blur-up effect
 * Shows low quality placeholder first, then loads high quality image
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  thumbnailSource,
  style,
  blurRadius = 10,
  onLoadStart,
  onLoadEnd,
  ...props
}) => {
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [imageSource, setImageSource] = useState<{ uri: string } | number | null>(null);

  useEffect(() => {
    // Network-aware quality selection
    const connectionType = NetworkMonitor.getConnectionType();
    const uri = typeof source === 'object' && 'uri' in source ? source.uri : null;

    if (uri) {
      let optimizedUri = uri;
      
      // Adjust image quality based on network type
      if (connectionType === 'cellular') {
        // Use medium quality for cellular
        optimizedUri = uri.replace(/\/UrunResimleri\/buyuk\//i, '/UrunResimleri/orta/');
      }
      
      setImageSource({ uri: optimizedUri });
    } else {
      setImageSource(source);
    }
  }, [source]);

  const handleHighQualityLoadStart = () => {
    setHighQualityLoaded(false);
    onLoadStart?.();
  };

  const handleHighQualityLoadEnd = () => {
    setHighQualityLoaded(true);
    // Fade out thumbnail after high quality loads
    setTimeout(() => {
      setShowThumbnail(false);
    }, 200);
    onLoadEnd?.();
  };

  // Generate thumbnail from main source if not provided
  const getThumbnailSource = (): { uri: string } | number | null => {
    if (thumbnailSource) {
      return thumbnailSource;
    }

    const uri = typeof source === 'object' && 'uri' in source ? source.uri : null;
    if (uri) {
      // Try to get thumbnail version (small/medium)
      const thumbnailUri = uri
        .replace(/\/UrunResimleri\/buyuk\//i, '/UrunResimleri/kucuk/')
        .replace(/\/UrunResimleri\/orta\//i, '/UrunResimleri/kucuk/');
      
      return { uri: thumbnailUri };
    }

    return null;
  };

  const thumbnail = getThumbnailSource();

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail (low quality) */}
      {thumbnail && showThumbnail && (
        <Image
          source={thumbnail}
          style={[StyleSheet.absoluteFill, styles.thumbnail]}
          contentFit={props.contentFit || 'cover'}
          blurRadius={blurRadius}
          cachePolicy="memory-disk"
        />
      )}

      {/* High quality image */}
      {imageSource && (
        <Image
          {...props}
          source={imageSource}
          style={[
            StyleSheet.absoluteFill,
            styles.highQuality,
            highQualityLoaded ? styles.highQualityLoaded : styles.highQualityLoading,
          ]}
          contentFit={props.contentFit || 'cover'}
          onLoadStart={handleHighQualityLoadStart}
          onLoadEnd={handleHighQualityLoadEnd}
          transition={300}
          cachePolicy="memory-disk"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    opacity: 0.6,
  },
  highQuality: {
    opacity: 0,
  },
  highQualityLoading: {
    opacity: 0,
  },
  highQualityLoaded: {
    opacity: 1,
  },
});

