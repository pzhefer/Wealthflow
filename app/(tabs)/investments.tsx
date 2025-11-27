import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Plus, X, Bitcoin, DollarSign, TrendingDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Portfolio {
  id: string;
  name: string;
  type: 'stocks' | 'crypto' | 'other';
  description: string | null;
  created_at: string;
}

interface Holding {
  id: string;
  portfolio_id: string;
  symbol: string;
  name: string;
  quantity: number;
  cost_basis: number;
  current_price: number;
  notes: string | null;
}

interface PortfolioWithHoldings extends Portfolio {
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
}

export default function InvestmentsScreen() {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<PortfolioWithHoldings[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioModalVisible, setPortfolioModalVisible] = useState(false);
  const [holdingModalVisible, setHoldingModalVisible] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);

  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    type: 'stocks' as 'stocks' | 'crypto' | 'other',
    description: '',
  });
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);

  const [holdingForm, setHoldingForm] = useState({
    symbol: '',
    name: '',
    quantity: '',
    cost_basis: '',
    current_price: '',
    notes: '',
  });
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolios();
  }, [user]);

  const fetchPortfolios = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('investment_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (portfoliosError) throw portfoliosError;

      const portfoliosWithHoldings = await Promise.all(
        (portfoliosData || []).map(async (portfolio) => {
          const { data: holdings, error: holdingsError } = await supabase
            .from('investment_holdings')
            .select('*')
            .eq('portfolio_id', portfolio.id)
            .order('symbol');

          if (holdingsError) throw holdingsError;

          const totalValue = (holdings || []).reduce(
            (sum, h) => sum + h.quantity * h.current_price,
            0
          );
          const totalCost = (holdings || []).reduce(
            (sum, h) => sum + h.quantity * h.cost_basis,
            0
          );
          const totalGain = totalValue - totalCost;
          const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

          return {
            ...portfolio,
            holdings: holdings || [],
            totalValue,
            totalCost,
            totalGain,
            totalGainPercent,
          };
        })
      );

      setPortfolios(portfoliosWithHoldings);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPortfolio = async () => {
    if (!user || !portfolioForm.name) {
      Alert.alert('Error', 'Please enter a portfolio name');
      return;
    }

    try {
      const portfolioData = {
        user_id: user.id,
        name: portfolioForm.name,
        type: portfolioForm.type,
        description: portfolioForm.description || null,
      };

      if (editingPortfolioId) {
        const { error } = await supabase
          .from('investment_portfolios')
          .update(portfolioData)
          .eq('id', editingPortfolioId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investment_portfolios')
          .insert(portfolioData);

        if (error) throw error;
      }

      resetPortfolioForm();
      setPortfolioModalVisible(false);
      fetchPortfolios();
    } catch (error) {
      console.error('Error saving portfolio:', error);
      Alert.alert('Error', 'Failed to save portfolio');
    }
  };

  const handleSubmitHolding = async () => {
    if (!user || !selectedPortfolio || !holdingForm.symbol || !holdingForm.quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const quantity = parseFloat(holdingForm.quantity);
      const costBasis = parseFloat(holdingForm.cost_basis);
      const currentPrice = parseFloat(holdingForm.current_price);

      if (isNaN(quantity) || isNaN(costBasis) || isNaN(currentPrice)) {
        Alert.alert('Error', 'Please enter valid numbers');
        return;
      }

      const holdingData = {
        portfolio_id: selectedPortfolio,
        symbol: holdingForm.symbol.toUpperCase(),
        name: holdingForm.name || holdingForm.symbol.toUpperCase(),
        quantity,
        cost_basis: costBasis,
        current_price: currentPrice,
        notes: holdingForm.notes || null,
      };

      if (editingHoldingId) {
        const { error } = await supabase
          .from('investment_holdings')
          .update(holdingData)
          .eq('id', editingHoldingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investment_holdings')
          .insert(holdingData);

        if (error) throw error;
      }

      resetHoldingForm();
      setHoldingModalVisible(false);
      fetchPortfolios();
    } catch (error) {
      console.error('Error saving holding:', error);
      Alert.alert('Error', 'Failed to save holding');
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    Alert.alert(
      'Delete Portfolio',
      'This will delete all holdings in this portfolio. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('investment_portfolios')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchPortfolios();
            } catch (error) {
              console.error('Error deleting portfolio:', error);
              Alert.alert('Error', 'Failed to delete portfolio');
            }
          },
        },
      ]
    );
  };

  const handleDeleteHolding = async (id: string) => {
    Alert.alert(
      'Delete Holding',
      'Are you sure you want to delete this holding?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('investment_holdings')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchPortfolios();
            } catch (error) {
              console.error('Error deleting holding:', error);
              Alert.alert('Error', 'Failed to delete holding');
            }
          },
        },
      ]
    );
  };

  const resetPortfolioForm = () => {
    setPortfolioForm({ name: '', type: 'stocks', description: '' });
    setEditingPortfolioId(null);
  };

  const resetHoldingForm = () => {
    setHoldingForm({
      symbol: '',
      name: '',
      quantity: '',
      cost_basis: '',
      current_price: '',
      notes: '',
    });
    setEditingHoldingId(null);
    setSelectedPortfolio(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const totalPortfolioValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const totalPortfolioCost = portfolios.reduce((sum, p) => sum + p.totalCost, 0);
  const totalPortfolioGain = totalPortfolioValue - totalPortfolioCost;
  const totalPortfolioGainPercent =
    totalPortfolioCost > 0 ? (totalPortfolioGain / totalPortfolioCost) * 100 : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Investments</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {portfolios.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Portfolio Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalPortfolioValue)}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>Total Gain/Loss</Text>
                <Text
                  style={[
                    styles.summaryStatValue,
                    totalPortfolioGain >= 0 ? styles.positiveGain : styles.negativeGain,
                  ]}
                >
                  {formatCurrency(totalPortfolioGain)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>Return</Text>
                <Text
                  style={[
                    styles.summaryStatValue,
                    totalPortfolioGain >= 0 ? styles.positiveGain : styles.negativeGain,
                  ]}
                >
                  {formatPercent(totalPortfolioGainPercent)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {portfolios.length === 0 ? (
          <View style={styles.emptyState}>
            <TrendingUp size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No Investments</Text>
            <Text style={styles.emptyStateText}>
              Track your stocks, crypto, and other investments all in one place
            </Text>
          </View>
        ) : (
          <View style={styles.portfolioList}>
            {portfolios.map((portfolio) => (
              <View key={portfolio.id} style={styles.portfolioCard}>
                <TouchableOpacity
                  style={styles.portfolioHeader}
                  onLongPress={() => handleDeletePortfolio(portfolio.id)}
                >
                  <View style={styles.portfolioTitleRow}>
                    <View style={styles.portfolioIcon}>
                      {portfolio.type === 'crypto' ? (
                        <Bitcoin size={24} color="#f59e0b" />
                      ) : (
                        <TrendingUp size={24} color="#10b981" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.portfolioName}>{portfolio.name}</Text>
                      <Text style={styles.portfolioType}>
                        {portfolio.type.charAt(0).toUpperCase() + portfolio.type.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.portfolioValue}>
                    <Text style={styles.portfolioValueText}>
                      {formatCurrency(portfolio.totalValue)}
                    </Text>
                    <Text
                      style={[
                        styles.portfolioGain,
                        portfolio.totalGain >= 0 ? styles.positiveGain : styles.negativeGain,
                      ]}
                    >
                      {formatPercent(portfolio.totalGainPercent)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {portfolio.holdings.length === 0 ? (
                  <View style={styles.emptyHoldings}>
                    <Text style={styles.emptyHoldingsText}>No holdings yet</Text>
                    <TouchableOpacity
                      style={styles.addHoldingButton}
                      onPress={() => {
                        setSelectedPortfolio(portfolio.id);
                        setHoldingModalVisible(true);
                      }}
                    >
                      <Plus size={16} color="#1e40af" />
                      <Text style={styles.addHoldingButtonText}>Add Holding</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.holdingsList}>
                      {portfolio.holdings.map((holding) => {
                        const value = holding.quantity * holding.current_price;
                        const cost = holding.quantity * holding.cost_basis;
                        const gain = value - cost;
                        const gainPercent = cost > 0 ? (gain / cost) * 100 : 0;

                        return (
                          <TouchableOpacity
                            key={holding.id}
                            style={styles.holdingItem}
                            onPress={() => {
                              setEditingHoldingId(holding.id);
                              setSelectedPortfolio(portfolio.id);
                              setHoldingForm({
                                symbol: holding.symbol,
                                name: holding.name,
                                quantity: holding.quantity.toString(),
                                cost_basis: holding.cost_basis.toString(),
                                current_price: holding.current_price.toString(),
                                notes: holding.notes || '',
                              });
                              setHoldingModalVisible(true);
                            }}
                            onLongPress={() => handleDeleteHolding(holding.id)}
                          >
                            <View style={styles.holdingLeft}>
                              <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                              <Text style={styles.holdingQuantity}>
                                {holding.quantity} shares
                              </Text>
                            </View>
                            <View style={styles.holdingRight}>
                              <Text style={styles.holdingValue}>{formatCurrency(value)}</Text>
                              <Text
                                style={[
                                  styles.holdingGain,
                                  gain >= 0 ? styles.positiveGain : styles.negativeGain,
                                ]}
                              >
                                {formatPercent(gainPercent)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TouchableOpacity
                      style={styles.addHoldingButtonInline}
                      onPress={() => {
                        setSelectedPortfolio(portfolio.id);
                        setHoldingModalVisible(true);
                      }}
                    >
                      <Plus size={16} color="#1e40af" />
                      <Text style={styles.addHoldingButtonInlineText}>Add Holding</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetPortfolioForm();
          setPortfolioModalVisible(true);
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={portfolioModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPortfolioModalVisible(false);
          resetPortfolioForm();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPortfolioId ? 'Edit Portfolio' : 'Create Portfolio'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setPortfolioModalVisible(false);
                resetPortfolioForm();
              }}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Portfolio Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="My Portfolio"
                value={portfolioForm.name}
                onChangeText={(text) => setPortfolioForm({ ...portfolioForm, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    portfolioForm.type === 'stocks' && styles.typeButtonActive,
                  ]}
                  onPress={() => setPortfolioForm({ ...portfolioForm, type: 'stocks' })}
                >
                  <TrendingUp size={18} color={portfolioForm.type === 'stocks' ? '#fff' : '#10b981'} />
                  <Text
                    style={[
                      styles.typeButtonText,
                      portfolioForm.type === 'stocks' && styles.typeButtonTextActive,
                    ]}
                  >
                    Stocks
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    portfolioForm.type === 'crypto' && styles.typeButtonActive,
                  ]}
                  onPress={() => setPortfolioForm({ ...portfolioForm, type: 'crypto' })}
                >
                  <Bitcoin size={18} color={portfolioForm.type === 'crypto' ? '#fff' : '#f59e0b'} />
                  <Text
                    style={[
                      styles.typeButtonText,
                      portfolioForm.type === 'crypto' && styles.typeButtonTextActive,
                    ]}
                  >
                    Crypto
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    portfolioForm.type === 'other' && styles.typeButtonActive,
                  ]}
                  onPress={() => setPortfolioForm({ ...portfolioForm, type: 'other' })}
                >
                  <DollarSign size={18} color={portfolioForm.type === 'other' ? '#fff' : '#64748b'} />
                  <Text
                    style={[
                      styles.typeButtonText,
                      portfolioForm.type === 'other' && styles.typeButtonTextActive,
                    ]}
                  >
                    Other
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description..."
                multiline
                numberOfLines={3}
                value={portfolioForm.description}
                onChangeText={(text) =>
                  setPortfolioForm({ ...portfolioForm, description: text })
                }
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setPortfolioModalVisible(false);
                resetPortfolioForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmitPortfolio}>
              <Text style={styles.saveButtonText}>
                {editingPortfolioId ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={holdingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setHoldingModalVisible(false);
          resetHoldingForm();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingHoldingId ? 'Edit Holding' : 'Add Holding'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setHoldingModalVisible(false);
                resetHoldingForm();
              }}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Symbol/Ticker *</Text>
              <TextInput
                style={styles.input}
                placeholder="AAPL, BTC, etc."
                autoCapitalize="characters"
                value={holdingForm.symbol}
                onChangeText={(text) => setHoldingForm({ ...holdingForm, symbol: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Apple Inc."
                value={holdingForm.name}
                onChangeText={(text) => setHoldingForm({ ...holdingForm, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                keyboardType="decimal-pad"
                value={holdingForm.quantity}
                onChangeText={(text) => setHoldingForm({ ...holdingForm, quantity: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Cost Basis (per share) *</Text>
              <TextInput
                style={styles.input}
                placeholder="150.00"
                keyboardType="decimal-pad"
                value={holdingForm.cost_basis}
                onChangeText={(text) => setHoldingForm({ ...holdingForm, cost_basis: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Price *</Text>
              <TextInput
                style={styles.input}
                placeholder="175.00"
                keyboardType="decimal-pad"
                value={holdingForm.current_price}
                onChangeText={(text) =>
                  setHoldingForm({ ...holdingForm, current_price: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes..."
                multiline
                numberOfLines={3}
                value={holdingForm.notes}
                onChangeText={(text) => setHoldingForm({ ...holdingForm, notes: text })}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setHoldingModalVisible(false);
                resetHoldingForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmitHolding}>
              <Text style={styles.saveButtonText}>
                {editingHoldingId ? 'Update' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#10b981',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1fae5',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStatItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#34d399',
    marginHorizontal: 16,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#d1fae5',
    marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  positiveGain: {
    color: '#10b981',
  },
  negativeGain: {
    color: '#ef4444',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
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
  portfolioList: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 100,
  },
  portfolioCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  portfolioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  portfolioIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  portfolioType: {
    fontSize: 13,
    color: '#64748b',
  },
  portfolioValue: {
    alignItems: 'flex-end',
  },
  portfolioValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  portfolioGain: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyHoldings: {
    alignItems: 'center',
    padding: 32,
  },
  emptyHoldingsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  addHoldingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  addHoldingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  holdingsList: {
    padding: 16,
    gap: 12,
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  holdingLeft: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  holdingQuantity: {
    fontSize: 13,
    color: '#64748b',
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  holdingGain: {
    fontSize: 13,
    fontWeight: '600',
  },
  addHoldingButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  addHoldingButtonInlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
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
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  modalFooter: {
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
