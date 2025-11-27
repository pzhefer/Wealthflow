import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  BookOpen,
  DollarSign,
  Calendar,
  Activity,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Trade {
  id: string;
  symbol: string;
  name: string;
  trade_type: string;
  instrument_type: string;
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  entry_date: string;
  exit_date: string | null;
  commission: number;
  profit_loss: number | null;
  roi_percentage: number | null;
  strategy: string;
  status: string;
}

interface TradingJournalModalProps {
  visible: boolean;
  onClose: () => void;
}

const TRADE_TYPES = [
  { value: 'buy', label: 'Buy', color: '#10b981' },
  { value: 'sell', label: 'Sell', color: '#ef4444' },
  { value: 'short', label: 'Short', color: '#f59e0b' },
  { value: 'cover', label: 'Cover', color: '#06b6d4' },
];

const INSTRUMENT_TYPES = [
  { value: 'stock', label: 'Stock' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'option', label: 'Option' },
  { value: 'etf', label: 'ETF' },
  { value: 'forex', label: 'Forex' },
  { value: 'other', label: 'Other' },
];

export default function TradingJournalModal({ visible, onClose }: TradingJournalModalProps) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    trade_type: 'buy',
    instrument_type: 'stock',
    quantity: '',
    entry_price: '',
    exit_price: '',
    entry_date: new Date().toISOString().split('T')[0],
    exit_date: '',
    commission: '0',
    strategy: '',
    status: 'open',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchTrades();
    }
  }, [visible, filter]);

  const fetchTrades = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !user ||
      !formData.symbol ||
      !formData.name ||
      !formData.quantity ||
      !formData.entry_price
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const quantity = parseFloat(formData.quantity);
      const entryPrice = parseFloat(formData.entry_price);
      const exitPrice = formData.exit_price ? parseFloat(formData.exit_price) : null;
      const commission = parseFloat(formData.commission || '0');

      if (isNaN(quantity) || isNaN(entryPrice) || quantity <= 0 || entryPrice <= 0) {
        Alert.alert('Error', 'Please enter valid numbers');
        return;
      }

      const tradeData = {
        user_id: user.id,
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        trade_type: formData.trade_type,
        instrument_type: formData.instrument_type,
        quantity,
        entry_price: entryPrice,
        exit_price: exitPrice,
        entry_date: formData.entry_date,
        exit_date: formData.exit_date || null,
        commission,
        strategy: formData.strategy,
        status: formData.status,
      };

      if (editingId) {
        const { error } = await supabase.from('trades').update(tradeData).eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('trades').insert(tradeData);

        if (error) throw error;
      }

      resetForm();
      setFormVisible(false);
      fetchTrades();
    } catch (error) {
      console.error('Error saving trade:', error);
      Alert.alert('Error', 'Failed to save trade');
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditingId(trade.id);
    setFormData({
      symbol: trade.symbol,
      name: trade.name,
      trade_type: trade.trade_type,
      instrument_type: trade.instrument_type,
      quantity: trade.quantity.toString(),
      entry_price: trade.entry_price.toString(),
      exit_price: trade.exit_price?.toString() || '',
      entry_date: trade.entry_date.split('T')[0],
      exit_date: trade.exit_date ? trade.exit_date.split('T')[0] : '',
      commission: trade.commission.toString(),
      strategy: trade.strategy,
      status: trade.status,
    });
    setFormVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Trade', 'Are you sure you want to delete this trade?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('trades').delete().eq('id', id);

            if (error) throw error;
            fetchTrades();
          } catch (error) {
            console.error('Error deleting trade:', error);
            Alert.alert('Error', 'Failed to delete trade');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      trade_type: 'buy',
      instrument_type: 'stock',
      quantity: '',
      entry_price: '',
      exit_price: '',
      entry_date: new Date().toISOString().split('T')[0],
      exit_date: '',
      commission: '0',
      strategy: '',
      status: 'open',
    });
    setEditingId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTradeTypeColor = (type: string) => {
    return TRADE_TYPES.find((t) => t.value === type)?.color || '#64748b';
  };

  const totalProfitLoss = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const winningTrades = trades.filter((t) => t.status === 'closed' && (t.profit_loss || 0) > 0)
    .length;
  const totalClosedTrades = trades.filter((t) => t.status === 'closed').length;
  const winRate = totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0;

  const filteredTrades = trades;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Trading Journal</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!formVisible ? (
          <>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total P&L</Text>
                <Text
                  style={[
                    styles.statValue,
                    totalProfitLoss >= 0 ? styles.profitText : styles.lossText,
                  ]}
                >
                  {formatCurrency(totalProfitLoss)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Win Rate</Text>
                <Text style={styles.statValue}>{winRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Trades</Text>
                <Text style={styles.statValue}>{trades.length}</Text>
              </View>
            </View>

            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                onPress={() => setFilter('all')}
              >
                <Text
                  style={[styles.filterText, filter === 'all' && styles.filterTextActive]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'open' && styles.filterButtonActive]}
                onPress={() => setFilter('open')}
              >
                <Text
                  style={[styles.filterText, filter === 'open' && styles.filterTextActive]}
                >
                  Open
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'closed' && styles.filterButtonActive]}
                onPress={() => setFilter('closed')}
              >
                <Text
                  style={[styles.filterText, filter === 'closed' && styles.filterTextActive]}
                >
                  Closed
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#1e40af" />
              </View>
            ) : (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {filteredTrades.length === 0 ? (
                  <View style={styles.emptyState}>
                    <BookOpen size={64} color="#cbd5e1" strokeWidth={1.5} />
                    <Text style={styles.emptyStateTitle}>No Trades</Text>
                    <Text style={styles.emptyStateText}>
                      Start tracking your trades to analyze performance
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tradesList}>
                    {filteredTrades.map((trade) => (
                      <TouchableOpacity
                        key={trade.id}
                        style={styles.tradeCard}
                        onPress={() => handleEdit(trade)}
                        onLongPress={() => handleDelete(trade.id)}
                      >
                        <View style={styles.tradeHeader}>
                          <View style={styles.tradeLeft}>
                            <View style={styles.tradeSymbolRow}>
                              <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                              <View
                                style={[
                                  styles.tradeTypeBadge,
                                  { backgroundColor: `${getTradeTypeColor(trade.trade_type)}20` },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.tradeTypeText,
                                    { color: getTradeTypeColor(trade.trade_type) },
                                  ]}
                                >
                                  {trade.trade_type.toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.instrumentBadge}>
                                <Text style={styles.instrumentText}>
                                  {trade.instrument_type}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.tradeName}>{trade.name}</Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  trade.status === 'open' ? '#dbeafe' : '#dcfce7',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color: trade.status === 'open' ? '#1e40af' : '#10b981',
                                },
                              ]}
                            >
                              {trade.status}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.tradeDetails}>
                          <View style={styles.tradeRow}>
                            <Text style={styles.tradeLabel}>Quantity</Text>
                            <Text style={styles.tradeValue}>{trade.quantity}</Text>
                          </View>
                          <View style={styles.tradeRow}>
                            <Text style={styles.tradeLabel}>Entry</Text>
                            <Text style={styles.tradeValue}>
                              {formatCurrency(trade.entry_price)}
                            </Text>
                          </View>
                          {trade.exit_price && (
                            <View style={styles.tradeRow}>
                              <Text style={styles.tradeLabel}>Exit</Text>
                              <Text style={styles.tradeValue}>
                                {formatCurrency(trade.exit_price)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {trade.status === 'closed' && trade.profit_loss !== null && (
                          <View style={styles.profitLossCard}>
                            <View style={styles.profitLossRow}>
                              <Text style={styles.profitLossLabel}>P&L</Text>
                              <Text
                                style={[
                                  styles.profitLossValue,
                                  trade.profit_loss >= 0 ? styles.profitText : styles.lossText,
                                ]}
                              >
                                {trade.profit_loss >= 0 ? '+' : ''}
                                {formatCurrency(trade.profit_loss)}
                              </Text>
                            </View>
                            {trade.roi_percentage !== null && (
                              <Text
                                style={[
                                  styles.roiText,
                                  trade.roi_percentage >= 0 ? styles.profitText : styles.lossText,
                                ]}
                              >
                                {trade.roi_percentage >= 0 ? '+' : ''}
                                {trade.roi_percentage.toFixed(2)}%
                              </Text>
                            )}
                          </View>
                        )}

                        {trade.strategy && (
                          <View style={styles.strategyCard}>
                            <Text style={styles.strategyLabel}>Strategy</Text>
                            <Text style={styles.strategyText}>{trade.strategy}</Text>
                          </View>
                        )}

                        <View style={styles.tradeDates}>
                          <Text style={styles.dateText}>Entry: {formatDate(trade.entry_date)}</Text>
                          {trade.exit_date && (
                            <Text style={styles.dateText}>Exit: {formatDate(trade.exit_date)}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  resetForm();
                  setFormVisible(true);
                }}
              >
                <Plus size={20} color="#fff" strokeWidth={2.5} />
                <Text style={styles.addButtonText}>Add Trade</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Symbol *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AAPL, BTC, etc."
                  value={formData.symbol}
                  onChangeText={(text) => setFormData({ ...formData, symbol: text.toUpperCase() })}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Apple Inc., Bitcoin, etc."
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Trade Type *</Text>
                <View style={styles.typeRow}>
                  {TRADE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        formData.trade_type === type.value && styles.typeButtonActive,
                        {
                          borderColor:
                            formData.trade_type === type.value ? type.color : '#e2e8f0',
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, trade_type: type.value })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.trade_type === type.value && { color: type.color },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Instrument Type *</Text>
                <View style={styles.typeRow}>
                  {INSTRUMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.instrumentButton,
                        formData.instrument_type === type.value && styles.instrumentButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, instrument_type: type.value })}
                    >
                      <Text
                        style={[
                          styles.instrumentButtonText,
                          formData.instrument_type === type.value &&
                            styles.instrumentButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="100"
                    keyboardType="decimal-pad"
                    value={formData.quantity}
                    onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Entry Price *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="150.00"
                    keyboardType="decimal-pad"
                    value={formData.entry_price}
                    onChangeText={(text) => setFormData({ ...formData, entry_price: text })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Exit Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="160.00"
                    keyboardType="decimal-pad"
                    value={formData.exit_price}
                    onChangeText={(text) => setFormData({ ...formData, exit_price: text })}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Commission</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={formData.commission}
                    onChangeText={(text) => setFormData({ ...formData, commission: text })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Entry Date *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formData.entry_date}
                    onChangeText={(text) => setFormData({ ...formData, entry_date: text })}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Exit Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formData.exit_date}
                    onChangeText={(text) => setFormData({ ...formData, exit_date: text })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      formData.status === 'open' && styles.statusButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, status: 'open' })}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        formData.status === 'open' && styles.statusButtonTextActive,
                      ]}
                    >
                      Open
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      formData.status === 'closed' && styles.statusButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, status: 'closed' })}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        formData.status === 'closed' && styles.statusButtonTextActive,
                      ]}
                    >
                      Closed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Strategy Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your trading strategy..."
                  multiline
                  numberOfLines={4}
                  value={formData.strategy}
                  onChangeText={(text) => setFormData({ ...formData, strategy: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.formFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setFormVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
                <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Add Trade'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  profitText: {
    color: '#10b981',
  },
  lossText: {
    color: '#ef4444',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  tradesList: {
    gap: 16,
  },
  tradeCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tradeLeft: {
    flex: 1,
  },
  tradeSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tradeSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  tradeTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tradeTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  instrumentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  instrumentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tradeName: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tradeDetails: {
    gap: 8,
    marginBottom: 12,
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  tradeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  profitLossCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  profitLossRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  profitLossLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  profitLossValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  roiText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  strategyCard: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  strategyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  strategyText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  tradeDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footer: {
    padding: 24,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1e40af',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  formContent: {
    flex: 1,
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  typeButtonActive: {
    backgroundColor: '#f8fafc',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  instrumentButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instrumentButtonActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  instrumentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  instrumentButtonTextActive: {
    color: '#ffffff',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1e40af',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
