import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';

interface HamburgerMenuProps {
  navigation: any;
  categories: string[];
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ navigation, categories }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Kategori -> Icon eşlemesi
  const categoryIcons: Record<string, any> = {
    'Mont': require('../../assets/kategori_icon/mont.png'),
    'Pantolon': require('../../assets/kategori_icon/pantolon.png'),
    'Gömlek': require('../../assets/kategori_icon/gömlek.png'),
    'Hırka': require('../../assets/kategori_icon/hırka.png'),
    'Eşofmanlar': require('../../assets/kategori_icon/esofman.png'),
    'Bandana': require('../../assets/kategori_icon/bandana.png'),
    'Battaniye': require('../../assets/kategori_icon/battaniye.png'),
    'Kamp Ürünleri': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Camp Ürünleri': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Polar Bere': require('../../assets/kategori_icon/polar bere.png'),
    'Rüzgarlık': require('../../assets/kategori_icon/rüzgarlık.png'),
    'Şapka': require('../../assets/kategori_icon/şapka.png'),
    'Hoodie': require('../../assets/kategori_icon/hoodie_4696583.png'),
    'Mutfak Ürünleri': require('../../assets/kategori_icon/mutfsk ürünleri.png'),
    'Silah Aksesuar': require('../../assets/kategori_icon/silah aksuar.png'),
    'Silah Aksuar': require('../../assets/kategori_icon/silah aksuar.png'),
    'Silah Aksesuarları': require('../../assets/kategori_icon/silah aksuar.png'),
    'Tişört': require('../../assets/kategori_icon/tişört.png'),
    'T-Shirt': require('../../assets/kategori_icon/tişört.png'),
    'Sweatshirt': require('../../assets/kategori_icon/hoodie_4696583.png'),
    'Yelek': require('../../assets/kategori_icon/waistcoat_6229344.png'),
    'Waistcoat': require('../../assets/kategori_icon/waistcoat_6229344.png'),
    'Aplike': require('../../assets/kategori_icon/aplike.png'),
    'Yardımcı Giyim Ürünleri': require('../../assets/kategori_icon/aplike.png'),
    'Yardımcı Giyim': require('../../assets/kategori_icon/aplike.png'),
    'Yağmurluk': require('../../assets/kategori_icon/yağmurluk.png'),
  };

  const getCategoryIcon = (cat: string) => {
    if (!cat || typeof cat !== 'string') return null;
    if (categoryIcons[cat]) return categoryIcons[cat];
    const lower = cat.toLowerCase();
    for (const key of Object.keys(categoryIcons)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return categoryIcons[key];
      }
    }
    return null;
  };

  const handleCategoryPress = (categoryName: string) => {
    setIsVisible(false);
    navigation.navigate('Products', {
      screen: 'ProductsMain',
      params: { category: categoryName },
    });
  };

  // "Hesabım" kaldırıldı

  return (
    <>
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={() => setIsVisible(true)}
      >
        <View style={{ width: 20, height: 16, justifyContent: 'space-between' }}>
          <View style={{ width: '100%', height: 2, backgroundColor: '#000000', borderRadius: 1 }} />
          <View style={{ width: '100%', height: 2, backgroundColor: '#000000', borderRadius: 1 }} />
          <View style={{ width: '100%', height: 2, backgroundColor: '#000000', borderRadius: 1 }} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsVisible(false)}
        >
          <Pressable
            style={styles.menuContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Kategoriler</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsVisible(false)}
                >
                  <Image 
                    source={require('../../assets/folder delete.png')} 
                    style={{ width: 16, height: 16, tintColor: '#FFFFFF' }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.categoriesContainer}
                showsVerticalScrollIndicator={false}
              >
                {(categories || []).map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryItem}
                    onPress={() => handleCategoryPress(category)}
                  >
                    {/* Sol ikon */}
                    {getCategoryIcon(category) ? (
                      <Image 
                        source={getCategoryIcon(category) as any}
                        style={{ width: 22, height: 22, marginRight: 12 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Image 
                        source={require('../../assets/categories-icon.png')} 
                        style={{ width: 22, height: 22, marginRight: 12, tintColor: '#999' }}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.categoryName}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    padding: 10,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#1A1A2E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  categoriesContainer: {
    flex: 1,
    paddingTop: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoryArrow: {
    fontSize: 20,
    color: '#999',
  },
  divider: {
    height: 8,
    backgroundColor: '#F5F5F5',
    marginVertical: 16,
  },
});