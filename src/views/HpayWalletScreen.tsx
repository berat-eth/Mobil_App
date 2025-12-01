import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { UserController } from '../controllers/UserController';
import { apiService } from '../utils/api-service';
import { ProductController } from '../controllers/ProductController';

interface HpayTx {
  id: number;
  amount: number;
  description: string;
  createdAt: string;
  type: 'credit' | 'debit';
}

const HpayWalletScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<HpayTx[]>([]);
  const [balance, setBalance] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = await UserController.getCurrentUserId();
      const res = await apiService.get(`/wallet/transactions/${userId}`);
      if (!res.success) {
        setTransactions([]);
        return;
      }
      const list: any[] = res.data?.transactions || [];
      const hpay = list
        .filter((t: any) => t.paymentMethod === 'hpay_plus')
        .map((t: any) => ({
          id: t.id,
          amount: Math.abs(t.amount),
          description: t.description || 'Hpay+ İşlemi',
          createdAt: t.createdAt,
          type: (t.amount > 0 ? 'credit' : 'debit') as 'credit' | 'debit',
        }));
      setTransactions(hpay);
      const bal = hpay.reduce((sum: number, t: HpayTx) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
      setBalance(bal);
    } catch (e) {
      setError('Hpay+ işlemleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}> 
        <View style={styles.loading}> 
          <ActivityIndicator size="large" color={Colors.text} />
          <Text style={styles.loadingText}>Hpay+ yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Icon name="star" size={28} color="#a855f7" />
            <Text style={styles.headerTitle}>Hpay+ Bakiyesi</Text>
          </View>
          <Text style={styles.headerAmount}>{ProductController.formatPrice(balance)}</Text>
          <View style={styles.notice}> 
            <Icon name="info" size={16} color="#92400E" />
            <Text style={styles.noticeText}>Hpay+ bakiyeleri çekilemez veya transfer edilemez. Sadece uygun işlemlerde kullanılabilir.</Text>
          </View>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Hpay+ İşlem Geçmişi</Text>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: (tx.type === 'credit' ? '#a855f7' : '#6b7280') + '20' }]}>
                <Icon name={tx.type === 'credit' ? 'add' : 'remove'} size={18} color={tx.type === 'credit' ? '#a855f7' : '#6b7280'} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={styles.txAmountArea}>
                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? '#a855f7' : '#6b7280' }]}>
                  {tx.type === 'credit' ? '+' : '-'}{ProductController.formatPrice(tx.amount)}
                </Text>
              </View>
            </View>
          ))}
          {transactions.length === 0 && (
            <View style={styles.empty}> 
              <Icon name="history" size={36} color={Colors.textLight} />
              <Text style={styles.emptyText}>Henüz Hpay+ işlemi yok</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HpayWalletScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: Colors.textLight },
  headerCard: { backgroundColor: 'white', margin: 16, borderRadius: 16, padding: 16, ...Shadows.small },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  headerAmount: { fontSize: 32, fontWeight: '800', color: Colors.text, marginTop: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1, padding: 8, borderRadius: 8, marginTop: 12 },
  noticeText: { flex: 1, color: '#92400E', fontSize: 12 },
  listSection: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: Colors.text },
  txDate: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  txAmountArea: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { marginTop: 8, color: Colors.textLight },
});


