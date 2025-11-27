import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, TrendingUp, TrendingDown, Calendar, PieChart } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ReportsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export default function ReportsModal({ visible, onClose }: ReportsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    if (visible) {
      fetchReports();
    }
  }, [visible, period]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const today = new Date();
      let startDate = new Date();

      if (period === 'month') {
        startDate.setMonth(today.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(today.getMonth() - 3);
      } else {
        startDate.setFullYear(today.getFullYear() - 1);
      }

      const startDateStr = startDate.toISOString().split('T')[0];

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .order('date', { ascending: true });

      if (error) throw error;

      const { data: splits, error: splitsError } = await supabase
        .from('transaction_splits')
        .select('*, categories(name)')
        .in('transaction_id', (transactions || []).filter(t => t.is_split).map(t => t.id));

      if (splitsError) throw splitsError;

      const income = (transactions || []).filter((t) => t.type === 'income');
      const expenses = (transactions || []).filter((t) => t.type === 'expense');

      const totalInc = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalExp = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      setTotalIncome(totalInc);
      setTotalExpense(totalExp);

      const categoryMap = expenses.reduce(
        (acc, t) => {
          if (t.is_split) {
            const transactionSplits = (splits || []).filter(s => s.transaction_id === t.id);
            transactionSplits.forEach(split => {
              const cat = (split.categories as any)?.name || 'Unknown';
              if (!acc[cat]) {
                acc[cat] = { amount: 0, count: 0 };
              }
              acc[cat].amount += Math.abs(split.amount);
              acc[cat].count += 1;
            });
          } else {
            const cat = t.category;
            if (!acc[cat]) {
              acc[cat] = { amount: 0, count: 0 };
            }
            acc[cat].amount += Math.abs(t.amount);
            acc[cat].count += 1;
          }
          return acc;
        },
        {} as Record<string, { amount: number; count: number }>
      );

      const categoryArray: CategorySpending[] = Object.entries(categoryMap)
        .map(([category, data]) => {
          const catData = data as { amount: number; count: number };
          return {
            category,
            amount: catData.amount,
            percentage: totalExp > 0 ? (catData.amount / totalExp) * 100 : 0,
            count: catData.count,
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      setCategorySpending(categoryArray);

      const monthlyMap = (transactions || []).reduce(
        (acc, t) => {
          const date = new Date(t.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!acc[monthKey]) {
            acc[monthKey] = { income: 0, expense: 0 };
          }
          if (t.type === 'income') {
            acc[monthKey].income += Math.abs(t.amount);
          } else {
            acc[monthKey].expense += Math.abs(t.amount);
          }
          return acc;
        },
        {} as Record<string, { income: number; expense: number }>
      );

      const monthlyArray: MonthlyData[] = Object.entries(monthlyMap)
        .map(([month, data]) => {
          const monthData = data as { income: number; expense: number };
          return {
            month,
            income: monthData.income,
            expense: monthData.expense,
            net: monthData.income - monthData.expense,
          };
        })
        .sort((a, b) => a.month.localeCompare(b.month));

      setMonthlyData(monthlyArray);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getColorForPercentage = (index: number) => {
    const colors = [
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#eab308',
      '#84cc16',
      '#22c55e',
      '#10b981',
      '#14b8a6',
      '#06b6d4',
      '#0ea5e9',
    ];
    return colors[index % colors.length];
  };

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reports</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.periodText, period === 'month' && styles.periodTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 'quarter' && styles.periodButtonActive]}
            onPress={() => setPeriod('quarter')}
          >
            <Text style={[styles.periodText, period === 'quarter' && styles.periodTextActive]}>
              Quarter
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 'year' && styles.periodButtonActive]}
            onPress={() => setPeriod('year')}
          >
            <Text style={[styles.periodText, period === 'year' && styles.periodTextActive]}>
              Year
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#1e40af" />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: '#dcfce7' }]}>
                  <TrendingUp size={24} color="#10b981" />
                </View>
                <Text style={styles.summaryLabel}>Total Income</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalIncome)}</Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: '#fee2e2' }]}>
                  <TrendingDown size={24} color="#ef4444" />
                </View>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalExpense)}</Text>
              </View>
            </View>

            <View style={styles.savingsCard}>
              <Text style={styles.savingsLabel}>Savings Rate</Text>
              <Text style={styles.savingsValue}>{savingsRate.toFixed(1)}%</Text>
              <Text style={styles.savingsSubtext}>
                {savingsRate >= 20
                  ? 'Excellent! Keep it up!'
                  : savingsRate >= 10
                  ? 'Good progress!'
                  : 'Try to save more'}
              </Text>
              <View style={styles.savingsBar}>
                <View
                  style={[
                    styles.savingsBarFill,
                    {
                      width: `${Math.min(Math.max(savingsRate, 0), 100)}%`,
                      backgroundColor:
                        savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444',
                    },
                  ]}
                />
              </View>
            </View>

            {categorySpending.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <PieChart size={20} color="#1e40af" />
                  <Text style={styles.sectionTitle}>Top Spending Categories</Text>
                </View>

                <View style={styles.categoriesList}>
                  {categorySpending.map((cat, index) => (
                    <View key={cat.category} style={styles.categoryItem}>
                      <View style={styles.categoryLeft}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: getColorForPercentage(index) },
                          ]}
                        />
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName}>{cat.category}</Text>
                          <Text style={styles.categoryCount}>{cat.count} transactions</Text>
                        </View>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                        <Text style={styles.categoryPercentage}>{cat.percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {monthlyData.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Calendar size={20} color="#1e40af" />
                  <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
                </View>

                <View style={styles.monthlyList}>
                  {monthlyData.map((month) => (
                    <View key={month.month} style={styles.monthlyItem}>
                      <Text style={styles.monthlyMonth}>{formatMonth(month.month)}</Text>
                      <View style={styles.monthlyAmounts}>
                        <View style={styles.monthlyRow}>
                          <Text style={styles.monthlyLabel}>Income</Text>
                          <Text style={styles.monthlyIncome}>
                            {formatCurrency(month.income)}
                          </Text>
                        </View>
                        <View style={styles.monthlyRow}>
                          <Text style={styles.monthlyLabel}>Expenses</Text>
                          <Text style={styles.monthlyExpense}>
                            {formatCurrency(month.expense)}
                          </Text>
                        </View>
                        <View style={styles.monthlyDivider} />
                        <View style={styles.monthlyRow}>
                          <Text style={styles.monthlyNetLabel}>Net</Text>
                          <Text
                            style={[
                              styles.monthlyNet,
                              month.net >= 0 ? styles.positiveNet : styles.negativeNet,
                            ]}
                          >
                            {formatCurrency(month.net)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
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
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#1e40af',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  periodTextActive: {
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
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  savingsCard: {
    backgroundColor: '#1e40af',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bfdbfe',
    marginBottom: 8,
  },
  savingsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  savingsSubtext: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 16,
  },
  savingsBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  savingsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoriesList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  monthlyList: {
    gap: 12,
  },
  monthlyItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthlyMonth: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  monthlyAmounts: {
    gap: 8,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  monthlyIncome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  monthlyExpense: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  monthlyDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  monthlyNetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  monthlyNet: {
    fontSize: 16,
    fontWeight: '700',
  },
  positiveNet: {
    color: '#10b981',
  },
  negativeNet: {
    color: '#ef4444',
  },
});
