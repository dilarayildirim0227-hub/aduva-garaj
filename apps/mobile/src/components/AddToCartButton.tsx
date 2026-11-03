'use client';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { cartApi, CartDto } from '../lib/cart-api';
import { formatKurus } from '../lib/cart-api';

interface VariantOption {
  id: string;
  name: string;
  stock: number;
}

interface AddToCartButtonProps {
  productId: string;
  productTitle: string;
  stock: number;
  maxPerOrder?: number;
  variants?: VariantOption[];
  selectedVehicleId?: string | null;
  onCartUpdated?: (cart: CartDto) => void;
  style?: any;
}

export function AddToCartButton({
  productId,
  productTitle,
  stock,
  maxPerOrder = 10,
  variants = [],
  selectedVehicleId = null,
  onCartUpdated,
  style,
}: AddToCartButtonProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null,
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const activeVariant = variants.find((v) => v.id === selectedVariantId);
  const effectiveStock = activeVariant ? activeVariant.stock : stock;
  const maxAllowed = Math.min(effectiveStock, maxPerOrder);
  const isOutOfStock = effectiveStock <= 0;

  async function handleAdd() {
    if (isOutOfStock || status === 'loading') return;

    setStatus('loading');
    setFeedbackMessage(`${productTitle} sepete ekleniyor...`);

    try {
      const idempotencyKey = `${productId}-${selectedVariantId || 'base'}-${Date.now()}`;
      const updated = await cartApi.addItem(
        {
          productId,
          variantId: selectedVariantId,
          quantity,
          vehicleId: selectedVehicleId,
        },
        idempotencyKey,
      );
      setStatus('success');
      setFeedbackMessage(`${quantity} adet "${productTitle}" sepete eklendi.`);
      onCartUpdated?.(updated);
      setTimeout(() => setStatus('idle'), 2200);
    } catch (err: any) {
      setStatus('error');
      setFeedbackMessage(err?.message || 'Ürün sepete eklenemedi.');
    }
  }

  return (
    <View style={[styles.container, style]}>
      {/* Varyant Seçici */}
      {variants.length > 0 && (
        <View style={styles.variantContainer}>
          <Text style={styles.variantLabel}>Varyant:</Text>
          <View style={styles.variantOptions} role="radiogroup">
            {variants.map((v) => {
              const selected = v.id === selectedVariantId;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelectedVariantId(v.id)}
                  disabled={v.stock <= 0}
                  style={[
                    styles.variantOption,
                    selected && styles.variantOptionSelected,
                    v.stock <= 0 && styles.variantOptionDisabled,
                  ]}
                >
                  <Text style={[
                    styles.variantOptionText,
                    selected && styles.variantOptionTextSelected,
                    v.stock <= 0 && styles.variantOptionTextDisabled,
                  ]}>
                    {v.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Miktar Seçici + Sepete Ekle Butonu */}
      <View style={styles.quantityAndButton}>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || isOutOfStock}
            style={[styles.qtyButton, (quantity <= 1 || isOutOfStock) && styles.qtyButtonDisabled]}
          >
            <Ionicons name="remove" size={20} color={(quantity <= 1 || isOutOfStock) ? '#64748b' : '#fff'} />
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity
            onPress={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
            disabled={quantity >= maxAllowed || isOutOfStock}
            style={[styles.qtyButton, (quantity >= maxAllowed || isOutOfStock) && styles.qtyButtonDisabled]}
          >
            <Ionicons name="add" size={20} color={(quantity >= maxAllowed || isOutOfStock) ? '#64748b' : '#fff'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton,
            isOutOfStock && styles.addButtonDisabled,
            status === 'success' && styles.addButtonSuccess,
            status === 'loading' && styles.addButtonLoading,
          ]}
          onPress={handleAdd}
          disabled={isOutOfStock || status === 'loading'}
          activeOpacity={0.9}
        >
          {status === 'loading' && <Ionicons name="spinner" size={20} color="#fff" style={styles.spinner} />}
          <Text style={styles.addButtonText}>
            {isOutOfStock
              ? 'Stokta Yok'
              : status === 'loading'
                ? 'Ekleniyor...'
                : status === 'success'
                  ? '✓ Sepette'
                  : 'Sepete Ekle'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feedback */}
      <View style={styles.feedbackContainer}>
        {status === 'error' && (
          <View style={styles.errorFeedback}>
            <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
            <Text style={styles.errorFeedbackText}>{feedbackMessage}</Text>
          </View>
        )}
        {status === 'success' && (
          <View style={styles.successFeedback}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
            <Text style={styles.successFeedbackText}>{feedbackMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  variantContainer: { gap: 6 },
  variantLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  variantOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  variantOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  variantOptionSelected: { backgroundColor: '#7f1d1d', borderColor: '#E10600' },
  variantOptionDisabled: { opacity: 0.5 },
  variantOptionText: { fontSize: 12, fontWeight: '600', color: '#e2e8f0' },
  variantOptionTextSelected: { color: '#fff', fontWeight: '700' },
  variantOptionTextDisabled: { color: '#64748b' },
  quantityAndButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  qtyButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  qtyButtonDisabled: { opacity: 0.5 },
  qtyValue: { fontSize: 16, fontWeight: '700', color: '#fff', paddingHorizontal: 8 },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#E10600',
  },
  addButtonDisabled: { backgroundColor: '#334155' },
  addButtonSuccess: { backgroundColor: '#22c55e' },
  addButtonLoading: { backgroundColor: '#f59e0b' },
  spinner: { marginRight: 4 },
  addButtonText: { fontSize: 13, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  feedbackContainer: { minHeight: 20 },
  errorFeedback: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  errorFeedbackText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  successFeedback: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  successFeedbackText: { fontSize: 12, fontWeight: '600', color: '#22c55e' },
});