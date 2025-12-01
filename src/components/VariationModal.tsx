import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { ProductVariation, ProductVariationOption } from '../utils/types';

type ProductLike = {
  id: number;
  name?: string;
  price?: number;
  variations?: ProductVariation[];
};

interface VariationModalProps {
  visible: boolean;
  product: ProductLike | null;
  selectedOptions: { [variationKey: string]: ProductVariationOption };
  onClose: () => void;
  onConfirm: (selected: { [variationKey: string]: ProductVariationOption }) => void;
}

export const VariationModal: React.FC<VariationModalProps> = ({
  visible,
  product,
  selectedOptions,
  onClose,
  onConfirm,
}) => {
  const initialState = useMemo(() => selectedOptions || {}, [selectedOptions]);
  const [localSelection, setLocalSelection] = useState<{ [k: string]: ProductVariationOption }>(initialState);

  useEffect(() => {
    setLocalSelection(initialState);
  }, [initialState, product?.id]);

  const variations: ProductVariation[] = Array.isArray((product as any)?.variations)
    ? ((product as any).variations as ProductVariation[])
    : [];

  const handlePick = (variation: ProductVariation, option: ProductVariationOption) => {
    const key = String(variation.id ?? variation.name ?? 'var');
    setLocalSelection((prev) => ({ ...prev, [key]: option }));
  };

  const allPicked = variations.every((v) => {
    const key = String(v.id ?? v.name ?? 'var');
    return !!localSelection[key];
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{product?.name || 'Varyasyon Seç'}</Text>
          </View>

          <ScrollView style={styles.content}>
            {variations.map((variation) => {
              const key = String(variation.id ?? variation.name ?? 'var');
              const options = Array.isArray(variation.options) ? variation.options : [];
              const current = localSelection[key]?.id;
              return (
                <View key={key} style={styles.variationBlock}>
                  <Text style={styles.variationName}>{variation.name || 'Varyasyon'}</Text>
                  <View style={styles.optionsRow}>
                    {options.map((opt) => {
                      const selected = current === opt.id;
                      return (
                        <TouchableOpacity
                          key={String(opt.id)}
                          style={[styles.optionChip, selected && styles.optionChipSelected]}
                          onPress={() => handlePick(variation, opt)}
                          disabled={(opt.stock ?? 0) <= 0}
                        >
                          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                            {opt.value || String(opt.id)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
              <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirm, !allPicked && styles.disabled]}
              onPress={() => onConfirm(localSelection)}
              disabled={!allPicked}
            >
              <Text style={styles.confirmText}>Sepete Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    maxHeight: '75%',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors?.text || '#111',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  variationBlock: {
    marginBottom: 12,
  },
  variationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  optionChipSelected: {
    backgroundColor: Colors?.primary || '#2563eb',
    borderColor: Colors?.primary || '#2563eb',
  },
  optionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  cancel: {
    backgroundColor: '#f3f4f6',
  },
  confirm: {
    backgroundColor: Colors?.primary || '#2563eb',
  },
  disabled: {
    opacity: 0.6,
  },
  cancelText: {
    color: '#111827',
    fontWeight: '700',
  },
  confirmText: {
    color: 'white',
    fontWeight: '700',
  },
});


