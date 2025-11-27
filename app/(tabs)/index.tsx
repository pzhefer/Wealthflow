import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, AlertCircle, Calendar, Lightbulb, Repeat } from 'lucide-react-native';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data, loading, error } = useDashboardData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const generateInsights = () => {
    const insights = [];
    const savingsRate = data.monthlyIncome > 0
      ? ((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100
      : 0;

    if (savingsRate < 10 && data.monthlyIncome > 0) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        message: `You're saving only ${savingsRate.toFixed(1)}% of your income. Aim for at least 20% to build wealth.`,
        color: '#f59e0b',
      });
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        title: 'Excellent Savings!',
        message: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the great work!`,
        color: '#10b981',
      });
    }

    const overBudgetCategories = data.budgets.filter(b => b.spent > b.amount);
    if (overBudgetCategories.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Budget Overspending',
        message: `${overBudgetCategories.length} budget(s) exceeded. Review ${overBudgetCategories[0].category} spending.`,
        color: '#ef4444',
      });
    }

    if (data.totalLiabilities > data.totalAssets * 0.5) {
      insights.push({
        type: 'warning',
        title: 'High Debt Ratio',
        message: 'Your debt is over 50% of assets. Consider a debt reduction strategy.',
        color: '#f59e0b',
      });
    }

    const avgDailySaving = (data.monthlyIncome - data.monthlyExpenses) / 30;
    if (avgDailySaving > 0 && insights.length === 0) {
      insights.push({
        type: 'tip',
        title: 'Daily Savings Power',
        message: `You're saving ~${formatCurrency(avgDailySaving)}/day. That's ${formatCurrency(avgDailySaving * 365)}/year!`,
        color: '#8b5cf6',
      });
    }

    return insights.slice(0, 2);
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={styles.loadingText}>Loading your financial data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load data</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Total Net Worth</Text>
          <Text style={styles.netWorthAmount}>{formatCurrency(data.totalNetWorth)}</Text>
          <View style={styles.netWorthChange}>
            {data.monthlyIncome - data.monthlyExpenses >= 0 ? (
              <TrendingUp size={16} color="#10b981" />
            ) : (
              <TrendingDown size={16} color="#ef4444" />
            )}
            <Text style={styles.netWorthChangeText}>
              {formatCurrency(data.monthlyIncome - data.monthlyExpenses)} this month
            </Text>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Wallet size={20} color="#1e40af" />
            </View>
            <Text style={styles.statLabel}>Assets</Text>
            <Text style={styles.statAmount}>{formatCurrency(data.totalAssets)}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingDown size={20} color="#ef4444" />
            </View>
            <Text style={styles.statLabel}>Liabilities</Text>
            <Text style={styles.statAmount}>{formatCurrency(data.totalLiabilities)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Month</Text>
          </View>

          <View style={styles.monthlyCard}>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Income</Text>
              <Text style={styles.monthlyIncome}>{formatCurrency(data.monthlyIncome)}</Text>
            </View>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Expenses</Text>
              <Text style={styles.monthlyExpense}>{formatCurrency(data.monthlyExpenses)}</Text>
            </View>
            <View style={[styles.monthlyRow, styles.monthlyRowTotal]}>
              <Text style={styles.monthlyLabelBold}>Net</Text>
              <Text style={styles.monthlyNet}>
                {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.forecastCard}>
          <View style={styles.forecastHeader}>
            <Calendar size={20} color="#8b5cf6" />
            <Text style={styles.forecastTitle}>3-Month Forecast</Text>
          </View>
          <Text style={styles.forecastSubtitle}>Based on your average spending</Text>
          <View style={styles.forecastItems}>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastLabel}>Next Month</Text>
              <Text style={styles.forecastAmount}>
                {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}
              </Text>
              <Text style={styles.forecastType}>Projected Savings</Text>
            </View>
            <View style={styles.forecastDivider} />
            <View style={styles.forecastItem}>
              <Text style={styles.forecastLabel}>3 Months</Text>
              <Text style={styles.forecastAmount}>
                {formatCurrency((data.monthlyIncome - data.monthlyExpenses) * 3)}
              </Text>
              <Text style={styles.forecastType}>Total Projected</Text>
            </View>
          </View>
          <View style={styles.forecastNote}>
            <Text style={styles.forecastNoteText}>
              {data.monthlyIncome - data.monthlyExpenses >= 0
                ? '✓ You\'re saving money each month'
                : '⚠️ Spending exceeds income'}
            </Text>
          </View>
        </View>

        {insights.length > 0 && (
          <View style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <Lightbulb size={20} color="#8b5cf6" />
              <Text style={styles.insightsTitle}>AI Insights</Text>
            </View>
            <View style={styles.insightsList}>
              {insights.map((insight, index) => (
                <View key={index} style={[styles.insightItem, { borderLeftColor: insight.color }]}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Overview</Text>
          </View>
          {data.budgets.length === 0 ? (
            <View style={styles.emptyState}>
              <PiggyBank size={48} color="#94a3b8" />
              <Text style={styles.emptyStateText}>No budgets yet</Text>
              <Text style={styles.emptyStateSubtext}>Create your first budget to start tracking</Text>
            </View>
          ) : (
            <View style={styles.budgetList}>
              {data.budgets.slice(0, 3).map((budget) => {
                const percentage = (budget.spent / budget.amount) * 100;
                const isOverBudget = percentage > 100;
                return (
                  <View key={budget.id} style={styles.budgetItem}>
                    <View style={styles.budgetHeader}>
                      <Text style={styles.budgetCategory}>{budget.category}</Text>
                      <Text style={[styles.budgetAmount, isOverBudget && styles.budgetOverAmount]}>
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: isOverBudget ? '#ef4444' : '#10b981',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {data.upcomingRecurring.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Repeat size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Upcoming Recurring</Text>
            </View>
            <View style={styles.recurringList}>
              {data.upcomingRecurring.map((recurring) => (
                <View key={recurring.id} style={styles.recurringItem}>
                  <View style={styles.recurringLeft}>
                    <View style={styles.recurringIconContainer}>
                      <Calendar size={16} color="#6366f1" />
                    </View>
                    <View>
                      <Text style={styles.recurringName}>{recurring.name}</Text>
                      <Text style={styles.recurringCategory}>{recurring.category}</Text>
                    </View>
                  </View>
                  <View style={styles.recurringRight}>
                    <Text
                      style={[
                        styles.recurringAmount,
                        recurring.amount >= 0
                          ? styles.recurringIncome
                          : styles.recurringExpense,
                      ]}
                    >
                      {recurring.amount >= 0 ? '+' : ''}
                      {formatCurrency(recurring.amount)}
                    </Text>
                    <Text style={styles.recurringDate}>{formatDate(recurring.next_occurrence)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>
          {data.recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>Add your first transaction to get started</Text>
            </View>
          ) : (
            <View style={styles.transactionList}>
              {data.recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionCategory}>{transaction.category}</Text>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.type === 'income'
                          ? styles.transactionIncome
                          : styles.transactionExpense,
                      ]}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(Math.abs(Number(transaction.amount)))}
                    </Text>
                    <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  email: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  netWorthCard: {
    backgroundColor: '#1e40af',
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  netWorthLabel: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 8,
  },
  netWorthAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  netWorthChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  netWorthChangeText: {
    fontSize: 14,
    color: '#dbeafe',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  monthlyCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  monthlyRowTotal: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  monthlyLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  monthlyLabelBold: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  monthlyIncome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  monthlyExpense: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  monthlyNet: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  forecastCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  forecastSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  forecastItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  forecastItem: {
    flex: 1,
    alignItems: 'center',
  },
  forecastDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  forecastLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  forecastAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  forecastType: {
    fontSize: 12,
    color: '#64748b',
  },
  forecastNote: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  forecastNoteText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  insightMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  budgetList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 16,
  },
  budgetItem: {
    gap: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  budgetAmount: {
    fontSize: 13,
    color: '#64748b',
  },
  budgetOverAmount: {
    color: '#ef4444',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  transactionList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionIncome: {
    color: '#10b981',
  },
  transactionExpense: {
    color: '#ef4444',
  },
  transactionDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  recurringList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recurringLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  recurringIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  recurringCategory: {
    fontSize: 13,
    color: '#64748b',
  },
  recurringRight: {
    alignItems: 'flex-end',
  },
  recurringAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  recurringIncome: {
    color: '#10b981',
  },
  recurringExpense: {
    color: '#ef4444',
  },
  recurringDate: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
});
