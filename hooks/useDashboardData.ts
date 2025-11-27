import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    type: string;
  }>;
  budgets: Array<{
    id: string;
    category: string;
    amount: number;
    spent: number;
  }>;
  upcomingRecurring: Array<{
    id: string;
    name: string;
    amount: number;
    category: string;
    next_occurrence: string;
    frequency: string;
  }>;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalNetWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    recentTransactions: [],
    budgets: [],
    upcomingRecurring: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchDashboardData() {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        const [accountsResult, allTransactionsResult, transactionsResult, monthlyTransactionsResult, budgetsResult, recurringResult] = await Promise.all([
          supabase
            .from('accounts')
            .select('id, type, balance')
            .eq('user_id', user.id)
            .eq('is_active', true),

          supabase
            .from('transactions')
            .select('account_id, to_account_id, amount, type')
            .eq('user_id', user.id),

          supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(5),

          supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .neq('type', 'transfer')
            .gte('date', firstDayStr),

          supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .eq('period', 'monthly'),

          supabase
            .from('recurring_transactions')
            .select('id, name, amount, category, next_occurrence, frequency')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .lte('next_occurrence', thirtyDaysStr)
            .order('next_occurrence', { ascending: true })
            .limit(5),
        ]);

        if (accountsResult.error) throw accountsResult.error;
        if (allTransactionsResult.error) throw allTransactionsResult.error;
        if (transactionsResult.error) throw transactionsResult.error;
        if (monthlyTransactionsResult.error) throw monthlyTransactionsResult.error;
        if (budgetsResult.error) throw budgetsResult.error;
        if (recurringResult.error) throw recurringResult.error;

        const accounts = accountsResult.data || [];
        const allTransactions = allTransactionsResult.data || [];
        const transactions = transactionsResult.data || [];
        const monthlyTransactions = monthlyTransactionsResult.data || [];
        const budgets = budgetsResult.data || [];
        const upcomingRecurring = recurringResult.data || [];

        const calculateCurrentBalance = (accountId: string, initialBalance: number) => {
          let balance = initialBalance;
          allTransactions.forEach(tx => {
            if (tx.type !== 'transfer' && tx.account_id === accountId) {
              balance += tx.amount;
            }
          });
          return balance;
        };

        const totalAssets = accounts
          .filter(acc => ['checking', 'savings', 'investment'].includes(acc.type))
          .reduce((sum, acc) => sum + calculateCurrentBalance(acc.id, Number(acc.balance || 0)), 0);

        const totalLiabilities = Math.abs(
          accounts
            .filter(acc => ['credit_card', 'loan', 'mortgage'].includes(acc.type))
            .reduce((sum, acc) => sum + calculateCurrentBalance(acc.id, Number(acc.balance || 0)), 0)
        );

        const monthlyIncome = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const monthlyExpenses = Math.abs(
          monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)
        );

        const { data: allCategories } = await supabase
          .from('categories')
          .select('id, name');

        const budgetsWithSpent = await Promise.all(
          budgets.map(async (budget) => {
            if (!user?.id) return { id: budget.id, category: budget.category, amount: 0, spent: 0 };

            const { data: categoryTransactions } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', user.id)
              .eq('category', budget.category)
              .eq('type', 'expense')
              .eq('is_split', false)
              .gte('date', firstDayStr);

            const categoryObj = allCategories?.find(c => c.name === budget.category);
            const { data: splitTransactions } = categoryObj
              ? await supabase
                  .from('transaction_splits')
                  .select('amount, transaction:transactions!inner(date, user_id)')
                  .eq('category_id', categoryObj.id)
                  .gte('transaction.date', firstDayStr)
              : { data: [] };

            const regularSpent = Math.abs(
              (categoryTransactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0)
            );

            const splitSpent = Math.abs(
              (splitTransactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0)
            );

            return {
              id: budget.id,
              category: budget.category,
              amount: Number(budget.amount),
              spent: regularSpent + splitSpent,
            };
          })
        );

        setData({
          totalNetWorth: totalAssets - totalLiabilities,
          totalAssets,
          totalLiabilities,
          monthlyIncome,
          monthlyExpenses,
          recentTransactions: transactions,
          budgets: budgetsWithSpent,
          upcomingRecurring,
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  return { data, loading, error };
}
