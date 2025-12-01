import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ViewToken, Dimensions } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { NetworkMonitor } from '../utils/performance-utils';

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: string | number;
  blurRadius?: number;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

/**
 * LazyImage component with viewport detection, progressive loading, and network-aware quality
 * Only loads images when they're about to enter the viewport
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  placeholder,
  blurRadius = 10,
  style,
  onLoadStart,
  onLoadEnd,
  ...props
}) => {
  const [isInViewport, setIsInViewport] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSource, setImageSource] = useState<{ uri: string } | number | null>(null);
  const viewRef = useRef<View>(null);

  useEffect(() => {
    // Simple viewport detection using Intersection Observer-like approach
    // For React Native, we use onLayout and measure
    const checkViewport = () => {
      if (!viewRef.current) return;
      
      viewRef.current.measure((x, y, width, height, pageX, pageY) => {
        // Consider image in viewport if it's within 200px of screen bounds
        const threshold = 200;
        const screenHeight = Dimensions.get('window').height;
        
        const isVisible = 
          pageY + height >= -threshold && 
          pageY <= screenHeight + threshold;
        
        if (isVisible && !isInViewport) {
          setIsInViewport(true);
          
          // Network-aware image quality selection
          const connectionType = NetworkMonitor.getConnectionType();
          const uri = typeof source === 'object' && 'uri' in source ? source.uri : null;
          
          if (uri) {
            // Adjust image quality based on network type
            let optimizedUri = uri;
            if (connectionType === 'cellular') {
              // Use medium quality for cellular
              optimizedUri = uri.replace(/\/UrunResimleri\/buyuk\//i, '/UrunResimleri/orta/');
            }
            setImageSource({ uri: optimizedUri });
          } else {
            setImageSource(source);
          }
        }
      });
    };

    // Initial check
    const timeout = setTimeout(checkViewport, 100);
    
    // Check periodically (simplified approach)
    const interval = setInterval(checkViewport, 500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [source, isInViewport]);

  const handleLoadStart = () => {
    setIsLoaded(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoaded(true);
    onLoadEnd?.();
  };

  return (
    <View ref={viewRef} style={[styles.container, style]} onLayout={() => {}}>
      {placeholder && !isLoaded && (
        <Image
          source={placeholder}
          style={[StyleSheet.absoluteFill, styles.placeholder]}
          contentFit="cover"
          blurRadius={blurRadius}
        />
      )}
      {isInViewport && imageSource && (
        <Image
          {...props}
          source={imageSource}
          style={[StyleSheet.absoluteFill, isLoaded ? styles.image : styles.imageLoading]}
          contentFit={props.contentFit || 'cover'}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          transition={200}
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
  placeholder: {
    opacity: 0.5,
  },
  image: {
    opacity: 1,
  },
  imageLoading: {
    opacity: 0,
  },
});

