import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows, BorderRadius } from '../theme/theme';

const { width } = Dimensions.get('window');

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const tabIcons: { [key: string]: string } = {
  Home: 'home',
  Products: 'category',
  Cart: 'shopping-cart',
  Profile: 'person',
  Custom: 'business',
};

const tabActiveGradients: { [key: string]: string[] } = {
  Home: ['#3b82f6', '#2563eb'],
  Products: ['#8b5cf6', '#7c3aed'],
  Cart: ['#ec4899', '#db2777'],
  Profile: ['#10b981', '#059669'],
  Custom: ['#f59e0b', '#d97706'],
};

export const ModernTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Modern Background with Shadow */}
      <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 0) }]}>
        {/* Top border line with gradient */}
        <LinearGradient
          colors={['#3b82f6', '#8b5cf6', '#ec4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topBorder}
        />
        
        <View style={styles.tabBar}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel || options.title || route.name;
            const isFocused = state.index === index;
            const iconName = tabIcons[route.name] || 'apps';
            const gradientColors = tabActiveGradients[route.name] || ['#3b82f6', '#2563eb'];
            
            const iconNode = typeof options.tabBarIcon === 'function'
              ? options.tabBarIcon({ 
                  color: '#000000', 
                  size: 24 
                })
              : (
                  <Icon
                    name={iconName}
                    size={24}
                    color="#000000"
                  />
                );

            // Animations
            const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0.85)).current;
            const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;

            useEffect(() => {
              Animated.parallel([
                Animated.spring(scaleAnim, {
                  toValue: isFocused ? 1 : 0.85,
                  useNativeDriver: true,
                  tension: 100,
                  friction: 8,
                }),
                Animated.timing(opacityAnim, {
                  toValue: isFocused ? 1 : 0.6,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start();
            }, [isFocused]);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            // Badge value from screen options
            const badgeValue = options.tabBarBadge;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
                activeOpacity={0.8}
              >
                <Animated.View 
                  style={[
                    styles.tabContent,
                    {
                      transform: [{ scale: scaleAnim }],
                      opacity: opacityAnim,
                    }
                  ]}
                >
                  {/* Active Gradient Background */}
                  {isFocused && (
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeGradient}
                    >
                      <View style={styles.gradientOverlay} />
                    </LinearGradient>
                  )}
                  
                  {/* Icon Container */}
                  <Animated.View style={styles.iconContainer}>
                    {React.cloneElement(iconNode as any, { 
                      size: isFocused ? 26 : 24,
                    })}
                    
                    {/* Badge */}
                    {badgeValue != null && badgeValue !== 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {Number(badgeValue) > 99 ? '99+' : String(badgeValue)}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                  
                  {/* Label */}
                  <Animated.Text
                    style={[
                      styles.tabLabel,
                      {
                        color: '#000000',
                        fontWeight: isFocused ? '700' : '600',
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Animated.Text>
                  
                  {/* Active Indicator Dot */}
                  {isFocused && (
                    <Animated.View style={styles.activeIndicator}>
                      <View style={styles.activeDot} />
                    </Animated.View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
    overflow: 'hidden',
  },
  topBorder: {
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: width * 0.35,
    marginTop: 8,
    borderRadius: 2,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    minHeight: 56,
    overflow: 'visible',
  },
  activeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    zIndex: 2,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    marginLeft: -3,
    zIndex: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
