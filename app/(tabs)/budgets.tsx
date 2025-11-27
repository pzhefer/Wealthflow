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
import { PieChart, Plus, X, TrendingDown, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Budget {
  id: string;
  category: string;
  amount: number;
  period: string;
  start_date: string;
  end_date: string | null;
  spent: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

export default function BudgetsScreen() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly' as 'weekly' | 'monthly' | 'yearly',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgets();
  }, [user]);

  const fetchBudgets = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

      const [budgetsResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .order('category'),
        supabase
          .from('categories')
          .select('*')
          .eq('type', 'expense')
          .order('name'),
      ]);

      if (budgetsResponse.error) throw budgetsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      const budgetsData = budgetsResponse.data || [];

      const budgetsWithSpent = await Promise.all(
        budgetsData.map(async (budget) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, is_split')
            .eq('user_id', user.id)
            .eq('category', budget.category)
            .eq('type', 'expense')
            .eq('is_split', false)
            .gte('date', firstDayStr);

          const categoryObj = categoriesResponse.data?.find(c => c.name === budget.category);
          const { data: splitTransactions } = categoryObj
            ? await supabase
                .from('transaction_splits')
                .select('amount, transaction:transactions!inner(date, user_id)')
                .eq('category_id', categoryObj.id)
                .gte('transaction.date', firstDayStr)
            : { data: [] };

          const regularSpent = Math.abs(
            (transactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0)
          );

          const splitSpent = Math.abs(
            (splitTransactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0)
          );

          return {
            ...budget,
            spent: regularSpent + splitSpent,
          };
        })
      );

      setBudgets(budgetsWithSpent);
      setCategories(categoriesResponse.data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.category || !formData.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const budgetData = {
        user_id: user.id,
        category: formData.category,
        amount: amount,
        period: formData.period,
        start_date: new Date().toISOString().split('T')[0],
      };

      if (editingId) {
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert(budgetData);

        if (error) throw error;
      }

      resetForm();
      setModalVisible(false);
      fetchBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget');
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period as 'weekly' | 'monthly' | 'yearly',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchBudgets();
            } catch (error) {
              console.error('Error deleting budget:', error);
              Alert.alert('Error', 'Failed to delete budget');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      period: 'monthly',
    });
    setEditingId(null);
    setCategoryDropdownOpen(false);
  };

  const getCategoryDisplay = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? `${category.icon} ${category.name}` : categoryName;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPercentage = (spent: number, budget: number) => {
    return budget > 0 ? Math.round((spent / budget) * 100) : 0;
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalPercentage = getPercentage(totalSpent, totalBudget);

  const availableCategories = categories.filter(
    cat => !budgets.some(b => b.category === cat.name) || editingId
  );

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
        <Text style={styles.title}>Budgets</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {budgets.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>This Month</Text>
              <Text style={styles.summaryPercentage}>{totalPercentage}% Used</Text>
            </View>
            <View style={styles.summaryAmounts}>
              <View>
                <Text style={styles.summaryLabel}>Spent</Text>
                <Text style={styles.summarySpent}>{formatCurrency(totalSpent)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View>
                <Text style={styles.summaryLabel}>Budget</Text>
                <Text style={styles.summaryBudget}>{formatCurrency(totalBudget)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View>
                <Text style={styles.summaryLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.summaryRemaining,
                    totalBudget - totalSpent < 0 && styles.summaryOverBudget,
                  ]}
                >
                  {formatCurrency(totalBudget - totalSpent)}
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(totalPercentage, 100)}%`,
                    backgroundColor: totalPercentage > 100 ? '#ef4444' : totalPercentage > 80 ? '#f97316' : '#10b981',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <PieChart size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No Budgets</Text>
            <Text style={styles.emptyStateText}>
              Create budgets to track your spending and reach your financial goals
            </Text>
          </View>
        ) : (
          <View style={styles.budgetList}>
            {budgets.map((budget) => {
              const percentage = getPercentage(budget.spent, budget.amount);
              const isOverBudget = percentage > 100;
              const isNearLimit = percentage > 80 && percentage <= 100;
              const remaining = budget.amount - budget.spent;
              const categoryIcon = categories.find(c => c.name === budget.category)?.icon || '📝';

              return (
                <TouchableOpacity
                  key={budget.id}
                  style={styles.budgetCard}
                  onPress={() => handleEdit(budget)}
                  onLongPress={() => handleDelete(budget.id)}
                >
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetTitleRow}>
                      <Text style={styles.budgetIcon}>{categoryIcon}</Text>
                      <View>
                        <Text style={styles.budgetCategory}>{budget.category}</Text>
                        <Text style={styles.budgetPeriod}>{budget.period}</Text>
                      </View>
                    </View>
                    <View style={styles.budgetStatus}>
                      {isOverBudget ? (
                        <AlertCircle size={20} color="#ef4444" />
                      ) : isNearLimit ? (
                        <AlertCircle size={20} color="#f97316" />
                      ) : (
                        <CheckCircle size={20} color="#10b981" />
                      )}
                    </View>
                  </View>

                  <View style={styles.budgetAmounts}>
                    <View style={styles.budgetAmountItem}>
                      <Text style={styles.budgetAmountLabel}>Spent</Text>
                      <Text style={styles.budgetSpent}>
                        {formatCurrency(budget.spent)}
                      </Text>
                    </View>
                    <View style={styles.budgetAmountItem}>
                      <Text style={styles.budgetAmountLabel}>Budget</Text>
                      <Text style={styles.budgetTotal}>
                        {formatCurrency(budget.amount)}
                      </Text>
                    </View>
                    <View style={styles.budgetAmountItem}>
                      <Text style={styles.budgetAmountLabel}>Left</Text>
                      <Text
                        style={[
                          styles.budgetRemaining,
                          isOverBudget && styles.budgetOverAmount,
                        ]}
                      >
                        {formatCurrency(remaining)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: isOverBudget
                              ? '#ef4444'
                              : isNearLimit
                              ? '#f97316'
                              : '#10b981',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressLabel}>{percentage}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Budget' : 'Create Budget'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              >
                <Text style={[styles.dropdownText, !formData.category && styles.dropdownPlaceholder]}>
                  {formData.category ? getCategoryDisplay(formData.category) : 'Select category'}
                </Text>
                <ChevronDown size={20} color="#94a3b8" />
              </TouchableOpacity>
              {categoryDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {availableCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, category: cat.name });
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <Text style={styles.categoryEmojiLarge}>{cat.icon}</Text>
                          <Text style={styles.dropdownItemText}>{cat.name}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Budget Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Period</Text>
              <View style={styles.periodSelector}>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    formData.period === 'weekly' && styles.periodButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, period: 'weekly' })}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      formData.period === 'weekly' && styles.periodButtonTextActive,
                    ]}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    formData.period === 'monthly' && styles.periodButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, period: 'monthly' })}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      formData.period === 'monthly' && styles.periodButtonTextActive,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    formData.period === 'yearly' && styles.periodButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, period: 'yearly' })}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      formData.period === 'yearly' && styles.periodButtonTextActive,
                    ]}
                  >
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
              <Text style={styles.saveButtonText}>
                {editingId ? 'Update' : 'Create Budget'}
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
    backgroundColor: '#1e40af',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bfdbfe',
  },
  summaryPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#3b82f6',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#bfdbfe',
    marginBottom: 4,
  },
  summarySpent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryBudget: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryRemaining: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  summaryOverBudget: {
    color: '#fca5a5',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
  budgetList: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 100,
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetIcon: {
    fontSize: 32,
  },
  budgetCategory: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  budgetPeriod: {
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  budgetStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetAmountItem: {
    flex: 1,
  },
  budgetAmountLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  budgetSpent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  budgetTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  budgetRemaining: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  budgetOverAmount: {
    color: '#ef4444',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 40,
    textAlign: 'right',
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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 16,
    color: '#0f172a',
  },
  dropdownPlaceholder: {
    color: '#94a3b8',
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  categoryEmojiLarge: {
    fontSize: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  periodButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  periodButtonTextActive: {
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
