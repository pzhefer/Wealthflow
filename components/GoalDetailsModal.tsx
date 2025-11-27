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
  ChevronRight,
  Check,
  Calendar,
  Wallet,
  TrendingUp,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import GoalItemModal from './GoalItemModal';
import QuotesModal from './QuotesModal';

interface Goal {
  id: string;
  name: string;
  description: string;
  type: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  linked_account_id: string | null;
  notes: string;
  is_completed: boolean;
}

interface GoalItem {
  id: string;
  goal_id: string;
  name: string;
  description: string;
  budget_amount: number;
  status: 'planned' | 'quoted' | 'booked' | 'completed' | 'cancelled';
  sort_order: number;
  notes: string;
  actual_spent: number;
  selected_quote_amount: number;
  quotes_count: number;
}

interface GoalDetailsModalProps {
  visible: boolean;
  goalId: string | null;
  onClose: () => void;
  onEditGoal: () => void;
}

const STATUS_CONFIG = {
  planned: { label: 'Planned', color: '#64748b', icon: Clock },
  quoted: { label: 'Quoted', color: '#3b82f6', icon: FileText },
  booked: { label: 'Booked', color: '#f59e0b', icon: Calendar },
  completed: { label: 'Completed', color: '#10b981', icon: Check },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: X },
};

export default function GoalDetailsModal({
  visible,
  goalId,
  onClose,
  onEditGoal,
}: GoalDetailsModalProps) {
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalItems, setGoalItems] = useState<GoalItem[]>([]);
  const [accountName, setAccountName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [quotesModalVisible, setQuotesModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GoalItem | null>(null);

  useEffect(() => {
    if (visible && goalId) {
      fetchGoalDetails();
    }
  }, [visible, goalId]);

  const fetchGoalDetails = async () => {
    if (!user || !goalId) return;

    try {
      setLoading(true);

      // Fetch goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (goalError) throw goalError;
      setGoal(goalData);

      // Fetch linked account name
      if (goalData.linked_account_id) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('name')
          .eq('id', goalData.linked_account_id)
          .single();

        if (accountData) setAccountName(accountData.name);
      }

      // Fetch goal items with calculations
      const { data: itemsData, error: itemsError } = await supabase
        .from('goal_items')
        .select('*')
        .eq('goal_id', goalId)
        .order('sort_order');

      if (itemsError) throw itemsError;

      // For each item, get actual spent and selected quote
      const itemsWithCalcs = await Promise.all(
        (itemsData || []).map(async (item) => {
          // Get actual spent from transactions
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('goal_item_id', item.id)
            .eq('type', 'expense');

          const actual_spent = Math.abs(
            (transactions || []).reduce((sum, t) => sum + Number(t.amount), 0)
          );

          // Get selected quote amount and count
          const { data: quotes } = await supabase
            .from('goal_item_quotes')
            .select('amount, is_selected')
            .eq('goal_item_id', item.id);

          const selected_quote = quotes?.find((q) => q.is_selected);
          const selected_quote_amount = selected_quote ? Number(selected_quote.amount) : 0;
          const quotes_count = quotes?.length || 0;

          return {
            ...item,
            actual_spent,
            selected_quote_amount,
            quotes_count,
          };
        })
      );

      setGoalItems(itemsWithCalcs);
    } catch (error) {
      console.error('Error fetching goal details:', error);
      Alert.alert('Error', 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setItemModalVisible(true);
  };

  const handleEditItem = (item: GoalItem) => {
    setSelectedItem(item);
    setItemModalVisible(true);
  };

  const handleViewQuotes = (item: GoalItem) => {
    setSelectedItem(item);
    setQuotesModalVisible(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this goal item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('goal_items').delete().eq('id', itemId);

            if (error) throw error;
            fetchGoalDetails();
          } catch (error) {
            console.error('Error deleting item:', error);
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
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

  if (!goal) return null;

  const totalBudget = goalItems.reduce((sum, item) => sum + Number(item.budget_amount), 0);
  const totalPlanned = goalItems.reduce((sum, item) => {
    return sum + (item.selected_quote_amount || Number(item.budget_amount));
  }, 0);
  const totalActual = goalItems.reduce((sum, item) => sum + item.actual_spent, 0);
  const totalRemaining = goal.target_amount - totalActual;
  const budgetVariance = totalBudget - totalPlanned;

  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.title}>{goal.name}</Text>
          <TouchableOpacity onPress={onEditGoal}>
            <Edit2 size={20} color="#1e40af" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#1e40af" />
          </View>
        ) : (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Overall Progress */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overall Progress</Text>
                <View style={styles.progressCard}>
                  <View style={styles.progressAmounts}>
                    <Text style={styles.progressCurrent}>{formatCurrency(goal.current_amount)}</Text>
                    <Text style={styles.progressTarget}>of {formatCurrency(goal.target_amount)}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]}
                      />
                    </View>
                    <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
                  </View>
                </View>

                {/* Goal Info */}
                <View style={styles.infoGrid}>
                  {goal.target_date && (
                    <View style={styles.infoCard}>
                      <Calendar size={20} color="#3b82f6" />
                      <View>
                        <Text style={styles.infoLabel}>Target Date</Text>
                        <Text style={styles.infoValue}>{formatDate(goal.target_date)}</Text>
                      </View>
                    </View>
                  )}

                  {accountName && (
                    <View style={styles.infoCard}>
                      <Wallet size={20} color="#10b981" />
                      <View>
                        <Text style={styles.infoLabel}>Linked Account</Text>
                        <Text style={styles.infoValue}>{accountName}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Summary */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Budget Summary</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Budget (Items)</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Planned Cost (Quotes)</Text>
                    <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>
                      {formatCurrency(totalPlanned)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Actual Spent</Text>
                    <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                      {formatCurrency(totalActual)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
                    <Text style={styles.summaryLabel}>Remaining in Budget</Text>
                    <Text
                      style={[
                        styles.summaryValueLarge,
                        { color: totalRemaining >= 0 ? '#10b981' : '#ef4444' },
                      ]}
                    >
                      {formatCurrency(totalRemaining)}
                    </Text>
                  </View>
                  {budgetVariance !== 0 && (
                    <View style={styles.varianceBox}>
                      <TrendingUp size={16} color={budgetVariance > 0 ? '#10b981' : '#ef4444'} />
                      <Text
                        style={[
                          styles.varianceText,
                          { color: budgetVariance > 0 ? '#10b981' : '#ef4444' },
                        ]}
                      >
                        {budgetVariance > 0 ? 'Saving' : 'Over'} {formatCurrency(Math.abs(budgetVariance))} vs budget
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Goal Items */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Budget Breakdown</Text>
                  <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
                    <Plus size={16} color="#1e40af" strokeWidth={2.5} />
                    <Text style={styles.addItemButtonText}>Add Item</Text>
                  </TouchableOpacity>
                </View>

                {goalItems.length === 0 ? (
                  <View style={styles.emptyItems}>
                    <Text style={styles.emptyItemsText}>
                      No items yet. Add budget items to break down your goal.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemsList}>
                    {goalItems.map((item) => {
                      const StatusIcon = STATUS_CONFIG[item.status].icon;
                      const statusColor = STATUS_CONFIG[item.status].color;
                      const variance = item.budget_amount - item.actual_spent;

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.itemCard}
                          onPress={() => handleEditItem(item)}
                        >
                          <View style={styles.itemHeader}>
                            <View style={styles.itemTitleRow}>
                              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                                <StatusIcon size={14} color={statusColor} />
                              </View>
                              <Text style={styles.itemName}>{item.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                              <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.itemDetails}>
                            <View style={styles.itemDetailRow}>
                              <Text style={styles.itemDetailLabel}>Budget</Text>
                              <Text style={styles.itemDetailValue}>
                                {formatCurrency(item.budget_amount)}
                              </Text>
                            </View>
                            {item.selected_quote_amount > 0 && (
                              <View style={styles.itemDetailRow}>
                                <Text style={styles.itemDetailLabel}>Selected Quote</Text>
                                <Text style={[styles.itemDetailValue, { color: '#3b82f6' }]}>
                                  {formatCurrency(item.selected_quote_amount)}
                                </Text>
                              </View>
                            )}
                            {item.actual_spent > 0 && (
                              <View style={styles.itemDetailRow}>
                                <Text style={styles.itemDetailLabel}>Actual Spent</Text>
                                <Text style={[styles.itemDetailValue, { color: '#f59e0b' }]}>
                                  {formatCurrency(item.actual_spent)}
                                </Text>
                              </View>
                            )}
                          </View>

                          {item.actual_spent > 0 && variance !== 0 && (
                            <View
                              style={[
                                styles.itemVariance,
                                { backgroundColor: variance >= 0 ? '#dcfce7' : '#fee2e2' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.itemVarianceText,
                                  { color: variance >= 0 ? '#10b981' : '#ef4444' },
                                ]}
                              >
                                {variance >= 0 ? '💰 Saved' : '⚠️ Over'} {formatCurrency(Math.abs(variance))}
                              </Text>
                            </View>
                          )}

                          <TouchableOpacity
                            style={styles.viewQuotesButton}
                            onPress={() => handleViewQuotes(item)}
                          >
                            <FileText size={14} color="#3b82f6" />
                            <Text style={styles.viewQuotesButtonText}>
                              {item.quotes_count} Quote{item.quotes_count !== 1 ? 's' : ''}
                            </Text>
                            <ChevronRight size={14} color="#3b82f6" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {goal.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.descriptionText}>{goal.description}</Text>
                </View>
              )}
            </ScrollView>
          </>
        )}

        <GoalItemModal
          visible={itemModalVisible}
          goalId={goalId || ''}
          item={selectedItem}
          onClose={() => {
            setItemModalVisible(false);
            setSelectedItem(null);
          }}
          onSaved={() => {
            fetchGoalDetails();
          }}
        />

        <QuotesModal
          visible={quotesModalVisible}
          goalItemId={selectedItem?.id || null}
          goalItemName={selectedItem?.name || ''}
          onClose={() => {
            setQuotesModalVisible(false);
            fetchGoalDetails();
          }}
        />
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  progressAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  progressCurrent: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressTarget: {
    fontSize: 16,
    color: '#64748b',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1e40af',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 45,
    textAlign: 'right',
  },
  infoGrid: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowHighlight: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  summaryValueLarge: {
    fontSize: 20,
    fontWeight: '700',
  },
  varianceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  varianceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  addItemButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
  },
  emptyItems: {
    padding: 40,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemDetails: {
    gap: 6,
    marginBottom: 12,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemVariance: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemVarianceText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewQuotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 4,
  },
  viewQuotesButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
