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
import { Receipt, Plus, Search, X, TrendingUp, TrendingDown, ChevronDown, ArrowRightLeft, Split, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AmountInput, DatePickerInput, MerchantPicker, CategoryPicker } from '@/components/FormFields';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  account_id: string | null;
  to_account_id: string | null;
  linked_transaction_id: string | null;
  merchant_id: string | null;
  merchant_name: string;
  goal_item_id: string | null;
  is_split: boolean;
  notes: string;
}

interface TransactionSplit {
  id: string;
  transaction_id: string;
  category_id: string | null;
  amount: number;
  percentage: number | null;
  notes: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
}

interface Merchant {
  id: string;
  name: string;
  category: string;
  is_favorite: boolean;
}

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [toAccountDropdownOpen, setToAccountDropdownOpen] = useState(false);
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'income' | 'expense' | 'transfer',
    account_id: '',
    to_account_id: '',
    merchant_id: '',
    goal_item_id: '',
    notes: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [splits, setSplits] = useState<{ category_id: string; amount: string; notes: string }[]>([]);
  const [showSplitForm, setShowSplitForm] = useState(false);
  const [splitCategoryDropdowns, setSplitCategoryDropdowns] = useState<{ [key: number]: boolean }>({});
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [transactionSplits, setTransactionSplits] = useState<{ [key: string]: TransactionSplit[] }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [transactionsRes, accountsRes, categoriesRes, merchantsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*'),
        supabase.from('merchants').select('*').eq('user_id', user.id).order('is_favorite', { ascending: false }).order('name'),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (merchantsRes.error) throw merchantsRes.error;

      setTransactions(transactionsRes.data || []);
      setAccounts(accountsRes.data || []);
      setCategories(categoriesRes.data || []);
      setMerchants(merchantsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (formData.type === 'transfer') {
      if (!formData.amount || !formData.account_id || !formData.to_account_id) {
        Alert.alert('Error', 'Please select from and to accounts and enter an amount');
        return;
      }

      if (formData.account_id === formData.to_account_id) {
        Alert.alert('Error', 'Cannot transfer to the same account');
        return;
      }

      try {
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
          Alert.alert('Error', 'Please enter a valid positive amount');
          return;
        }

        if (editingId) {
          const { data, error } = await supabase.rpc('update_transfer', {
            p_transaction_id: editingId,
            p_from_account_id: formData.account_id,
            p_to_account_id: formData.to_account_id,
            p_amount: amount,
            p_date: formData.date,
            p_description: formData.description,
            p_notes: formData.notes,
          });

          if (error) throw error;
        } else {
          const { data, error } = await supabase.rpc('create_transfer', {
            p_user_id: user.id,
            p_from_account_id: formData.account_id,
            p_to_account_id: formData.to_account_id,
            p_amount: amount,
            p_date: formData.date,
            p_description: formData.description,
            p_notes: formData.notes,
          });

          if (error) throw error;
        }

        resetForm();
        setModalVisible(false);
        fetchData();
      } catch (error) {
        console.error('Error saving transfer:', error);
        Alert.alert('Error', 'Failed to save transfer');
      }
    } else {
      if (!formData.amount || (!showSplitForm && !formData.category)) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (showSplitForm && splits.length > 0) {
        const hasInvalidSplits = splits.some(s => !s.category_id || !s.amount);
        if (hasInvalidSplits) {
          Alert.alert('Error', 'Please fill in category and amount for all splits');
          return;
        }

        const splitTotal = getSplitTotal();
        const transactionAmount = parseFloat(formData.amount);
        if (Math.abs(splitTotal - transactionAmount) > 0.01) {
          Alert.alert(
            'Error',
            `Split amounts must equal transaction amount.\nSplit total: $${splitTotal.toFixed(2)}\nTransaction: $${transactionAmount.toFixed(2)}\nDifference: $${Math.abs(splitTotal - transactionAmount).toFixed(2)}`
          );
          return;
        }
      }

      try {
        const amount = parseFloat(formData.amount);
        if (isNaN(amount)) {
          Alert.alert('Error', 'Please enter a valid amount');
          return;
        }

        const selectedCategory = categories.find(c => c.name === formData.category);
        const selectedMerchant = merchants.find(m => m.id === formData.merchant_id);

        const isSplitTransaction = showSplitForm && splits.length > 0;
        const splitCategories = isSplitTransaction
          ? splits.map(s => categories.find(c => c.id === s.category_id)?.name).filter(Boolean).join(', ')
          : '';

        const transactionData = {
          user_id: user.id,
          amount: formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
          category: isSplitTransaction ? splitCategories : formData.category,
          category_id: isSplitTransaction ? null : (selectedCategory?.id || null),
          description: formData.description,
          date: formData.date,
          type: formData.type,
          account_id: formData.account_id || null,
          merchant_id: formData.merchant_id || null,
          merchant_name: selectedMerchant?.name || '',
          is_split: isSplitTransaction,
          notes: formData.notes,
        };

        let transactionId = editingId;

        if (editingId) {
          const { error } = await supabase
            .from('transactions')
            .update(transactionData)
            .eq('id', editingId);

          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('transactions')
            .insert(transactionData)
            .select()
            .single();

          if (error) throw error;
          transactionId = data.id;
        }

        if (showSplitForm && splits.length > 0 && transactionId) {
          await supabase
            .from('transaction_splits')
            .delete()
            .eq('transaction_id', transactionId);

          const splitsData = splits.map(split => ({
            transaction_id: transactionId,
            category_id: split.category_id,
            amount: parseFloat(split.amount),
            percentage: Math.round((parseFloat(split.amount) / amount) * 100),
            notes: split.notes,
          }));

          const { error: splitsError } = await supabase
            .from('transaction_splits')
            .insert(splitsData);

          if (splitsError) throw splitsError;
        } else if (transactionId) {
          await supabase
            .from('transaction_splits')
            .delete()
            .eq('transaction_id', transactionId);
        }

        resetForm();
        setModalVisible(false);
        fetchData();
      } catch (error) {
        console.error('Error saving transaction:', error);
        Alert.alert('Error', 'Failed to save transaction');
      }
    }
  };

  const handleEdit = async (transaction: Transaction) => {
    setEditingId(transaction.id);

    if (transaction.type === 'transfer') {
      setFormData({
        amount: Math.abs(transaction.amount).toString(),
        category: 'Transfer',
        description: transaction.description,
        date: transaction.date,
        type: 'transfer',
        account_id: transaction.account_id || '',
        to_account_id: transaction.to_account_id || '',
        merchant_id: '',
        goal_item_id: '',
        notes: transaction.notes || '',
      });
    } else {
      setFormData({
        amount: Math.abs(transaction.amount).toString(),
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        type: transaction.type as 'income' | 'expense',
        account_id: transaction.account_id || '',
        to_account_id: '',
        merchant_id: transaction.merchant_id || '',
        goal_item_id: transaction.goal_item_id || '',
        notes: transaction.notes || '',
      });

      if (transaction.is_split) {
        const { data: splitsData, error } = await supabase
          .from('transaction_splits')
          .select('*')
          .eq('transaction_id', transaction.id);

        if (!error && splitsData) {
          setSplits(splitsData.map(s => ({
            category_id: s.category_id || '',
            amount: s.amount.toString(),
            notes: s.notes || '',
          })));
          setShowSplitForm(true);
        }
      }
    }

    setModalVisible(true);
  };

  const handleDelete = async (id: string, type: string) => {
    const message = type === 'transfer'
      ? 'Are you sure? This will delete both sides of the transfer.'
      : 'Are you sure you want to delete this transaction?';

    Alert.alert(
      'Delete Transaction',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'transfer') {
                const { error } = await supabase.rpc('delete_transfer', {
                  p_transaction_id: id,
                });

                if (error) throw error;
              } else {
                const { error } = await supabase
                  .from('transactions')
                  .delete()
                  .eq('id', id);

                if (error) throw error;
              }

              fetchData();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      account_id: '',
      to_account_id: '',
      merchant_id: '',
      goal_item_id: '',
      notes: '',
    });
    setEditingId(null);
    setCategoryDropdownOpen(false);
    setAccountDropdownOpen(false);
    setToAccountDropdownOpen(false);
    setMerchantDropdownOpen(false);
    setSplits([]);
    setShowSplitForm(false);
    setSplitCategoryDropdowns({});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'No Account';
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  const getCategoryDisplay = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? `${category.icon} ${category.name}` : categoryName;
  };

  const getMerchantName = (merchantId: string | null) => {
    if (!merchantId) return null;
    const merchant = merchants.find(m => m.id === merchantId);
    return merchant ? merchant.name : null;
  };

  const favoriteMerchants = merchants.filter(m => m.is_favorite);
  const regularMerchants = merchants.filter(m => !m.is_favorite);

  const addSplit = () => {
    setSplits([...splits, { category_id: '', amount: '', notes: '' }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: string, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const toggleSplitCategoryDropdown = (index: number) => {
    setCategoryDropdownOpen(false);
    setAccountDropdownOpen(false);
    setMerchantDropdownOpen(false);
    setSplitCategoryDropdowns(prev => {
      const newState: { [key: number]: boolean } = {};
      Object.keys(prev).forEach(key => {
        newState[parseInt(key)] = false;
      });
      newState[index] = !prev[index];
      return newState;
    });
  };

  const getSplitTotal = () => {
    return splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  };

  const getRemainingAmount = () => {
    const total = parseFloat(formData.amount) || 0;
    return total - getSplitTotal();
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.icon} ${category.name}` : 'Select category';
  };

  const toggleSplitDetails = async (transactionId: string) => {
    if (expandedTransaction === transactionId) {
      setExpandedTransaction(null);
      return;
    }

    if (!transactionSplits[transactionId]) {
      try {
        const { data, error } = await supabase
          .from('transaction_splits')
          .select('*')
          .eq('transaction_id', transactionId);

        if (error) throw error;

        setTransactionSplits(prev => ({
          ...prev,
          [transactionId]: data || [],
        }));
      } catch (error) {
        console.error('Error fetching splits:', error);
        return;
      }
    }

    setExpandedTransaction(transactionId);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.category.toLowerCase().includes(query) ||
        tx.description.toLowerCase().includes(query) ||
        getAccountName(tx.account_id).toLowerCase().includes(query)
      );
    }

    return true;
  });

  const displayedCategories = categories.filter((cat) => {
    if (cat.name === 'Transfer') return false;
    if (formData.type === 'income') return cat.type === 'income' || cat.type === 'both';
    if (formData.type === 'expense') return cat.type === 'expense' || cat.type === 'both';
    return false;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'income' && styles.filterChipActive]}
          onPress={() => setFilterType('income')}
        >
          <TrendingUp size={14} color={filterType === 'income' ? '#fff' : '#10b981'} />
          <Text style={[styles.filterChipText, filterType === 'income' && styles.filterChipTextActive]}>
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'expense' && styles.filterChipActive]}
          onPress={() => setFilterType('expense')}
        >
          <TrendingDown size={14} color={filterType === 'expense' ? '#fff' : '#ef4444'} />
          <Text style={[styles.filterChipText, filterType === 'expense' && styles.filterChipTextActive]}>
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'transfer' && styles.filterChipActive]}
          onPress={() => setFilterType('transfer')}
        >
          <ArrowRightLeft size={14} color={filterType === 'transfer' ? '#fff' : '#3b82f6'} />
          <Text style={[styles.filterChipText, filterType === 'transfer' && styles.filterChipTextActive]}>
            Transfers
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Receipt size={64} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>No Transactions</Text>
              <Text style={styles.emptyStateText}>
                Start tracking your finances by adding transactions
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((transaction) => {
                const category = categories.find(c => c.name === transaction.category);
                const isTransfer = transaction.type === 'transfer';
                const isExpanded = expandedTransaction === transaction.id;
                const splits = transactionSplits[transaction.id] || [];

                return (
                  <View key={transaction.id}>
                    <TouchableOpacity
                      style={styles.transactionCard}
                      onPress={() => handleEdit(transaction)}
                      onLongPress={() => handleDelete(transaction.id, transaction.type)}
                    >
                      <View style={styles.transactionLeft}>
                        <View
                          style={[
                            styles.transactionIcon,
                            {
                              backgroundColor: isTransfer
                                ? '#dbeafe'
                                : transaction.type === 'income'
                                ? '#dcfce7'
                                : '#fee2e2',
                            },
                          ]}
                        >
                          {isTransfer ? (
                            <ArrowRightLeft size={20} color="#3b82f6" />
                          ) : transaction.type === 'income' ? (
                            <TrendingUp size={20} color="#10b981" />
                          ) : (
                            <TrendingDown size={20} color="#ef4444" />
                          )}
                        </View>
                        <View style={styles.transactionDetails}>
                          <View style={styles.transactionHeader}>
                            {!transaction.is_split && category && <Text style={styles.categoryEmoji}>{category.icon}</Text>}
                            <Text style={[styles.transactionCategory, transaction.is_split && styles.splitCategories]}>
                              {transaction.category}
                            </Text>
                            {transaction.is_split && (
                              <TouchableOpacity
                                style={styles.splitBadge}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  toggleSplitDetails(transaction.id);
                                }}
                              >
                                <Split size={12} color="#6366f1" />
                                <Text style={styles.splitBadgeText}>Split</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          {transaction.description ? (
                            <Text style={styles.transactionDescription}>{transaction.description}</Text>
                          ) : null}
                          {isTransfer ? (
                            <View style={styles.transferInfo}>
                              <Text style={styles.transferText}>
                                {getAccountName(transaction.account_id)} → {getAccountName(transaction.to_account_id)}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.transactionAccount}>{getAccountName(transaction.account_id)}</Text>
                          )}
                          <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                        </View>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text
                          style={[
                            styles.transactionAmount,
                            {
                              color: isTransfer
                                ? '#3b82f6'
                                : transaction.amount >= 0
                                ? '#10b981'
                                : '#ef4444',
                            },
                          ]}
                        >
                          {isTransfer ? '' : transaction.amount >= 0 ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && splits.length > 0 && (
                      <View style={styles.splitDetailsContainer}>
                        <Text style={styles.splitDetailsTitle}>Split Breakdown:</Text>
                        {splits.map((split) => {
                          const splitCategory = categories.find(c => c.id === split.category_id);
                          return (
                            <View key={split.id} style={styles.splitDetailRow}>
                              <View style={styles.splitDetailLeft}>
                                {splitCategory && (
                                  <Text style={styles.splitDetailEmoji}>{splitCategory.icon}</Text>
                                )}
                                <View>
                                  <Text style={styles.splitDetailCategory}>
                                    {splitCategory?.name || 'Unknown'}
                                  </Text>
                                  {split.notes ? (
                                    <Text style={styles.splitDetailNotes}>{split.notes}</Text>
                                  ) : null}
                                </View>
                              </View>
                              <View style={styles.splitDetailRight}>
                                <Text style={styles.splitDetailAmount}>
                                  {formatCurrency(split.amount)}
                                </Text>
                                <Text style={styles.splitDetailPercentage}>
                                  {split.percentage}%
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

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
              {editingId ? 'Edit Transaction' : 'Add Transaction'}
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

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'expense' && styles.typeButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, type: 'expense', category: '' })}
              >
                <TrendingDown
                  size={20}
                  color={formData.type === 'expense' ? '#fff' : '#ef4444'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'income' && styles.typeButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, type: 'income', category: '' })}
              >
                <TrendingUp
                  size={20}
                  color={formData.type === 'income' ? '#fff' : '#10b981'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'transfer' && styles.typeButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, type: 'transfer', category: 'Transfer' })}
              >
                <ArrowRightLeft
                  size={20}
                  color={formData.type === 'transfer' ? '#fff' : '#3b82f6'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'transfer' && styles.typeButtonTextActive,
                  ]}
                >
                  Transfer
                </Text>
              </TouchableOpacity>
            </View>

            {formData.type === 'transfer' ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>From Account *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => {
                      setAccountDropdownOpen(!accountDropdownOpen);
                      setToAccountDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, !formData.account_id && styles.dropdownPlaceholder]}>
                      {formData.account_id ? getAccountName(formData.account_id) : 'Select account'}
                    </Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  {accountDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({ ...formData, account_id: account.id });
                            setAccountDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{account.name}</Text>
                          <Text style={styles.dropdownItemSubtext}>{account.type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.transferArrow}>
                  <ArrowRightLeft size={24} color="#64748b" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>To Account *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => {
                      setToAccountDropdownOpen(!toAccountDropdownOpen);
                      setAccountDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, !formData.to_account_id && styles.dropdownPlaceholder]}>
                      {formData.to_account_id ? getAccountName(formData.to_account_id) : 'Select account'}
                    </Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  {toAccountDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({ ...formData, to_account_id: account.id });
                            setToAccountDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{account.name}</Text>
                          <Text style={styles.dropdownItemSubtext}>{account.type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                {!showSplitForm && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Category *</Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => {
                        setCategoryDropdownOpen(!categoryDropdownOpen);
                        setAccountDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownText, !formData.category && styles.dropdownPlaceholder]}>
                        {formData.category ? getCategoryDisplay(formData.category) : 'Select category'}
                      </Text>
                      <ChevronDown size={20} color="#94a3b8" />
                    </TouchableOpacity>
                    {categoryDropdownOpen && (
                      <View style={styles.dropdownMenu}>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                          {displayedCategories.map((cat) => (
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
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Account</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => {
                      setAccountDropdownOpen(!accountDropdownOpen);
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, !formData.account_id && styles.dropdownPlaceholder]}>
                      {formData.account_id ? getAccountName(formData.account_id) : 'Select account (optional)'}
                    </Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  {accountDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({ ...formData, account_id: account.id });
                            setAccountDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{account.name}</Text>
                          <Text style={styles.dropdownItemSubtext}>{account.type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {formData.type !== 'transfer' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Merchant</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setMerchantDropdownOpen(!merchantDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setAccountDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownText, !formData.merchant_id && styles.dropdownPlaceholder]}>
                    {formData.merchant_id ? getMerchantName(formData.merchant_id) || 'Select merchant' : 'Select merchant (optional)'}
                  </Text>
                  <ChevronDown size={20} color="#94a3b8" />
                </TouchableOpacity>
                {merchantDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, merchant_id: '' });
                          setMerchantDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>None</Text>
                      </TouchableOpacity>
                      {favoriteMerchants.length > 0 && (
                        <>
                          <View style={styles.dropdownDivider}>
                            <Text style={styles.dropdownDividerText}>Favorites</Text>
                          </View>
                          {favoriteMerchants.map((merchant) => (
                            <TouchableOpacity
                              key={merchant.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setFormData({
                                  ...formData,
                                  merchant_id: merchant.id,
                                  category: merchant.category || formData.category
                                });
                                setMerchantDropdownOpen(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>⭐ {merchant.name}</Text>
                              {merchant.category && (
                                <Text style={styles.dropdownItemSubtext}>{merchant.category}</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                      {regularMerchants.length > 0 && (
                        <>
                          {favoriteMerchants.length > 0 && (
                            <View style={styles.dropdownDivider}>
                              <Text style={styles.dropdownDividerText}>All Merchants</Text>
                            </View>
                          )}
                          {regularMerchants.map((merchant) => (
                            <TouchableOpacity
                              key={merchant.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setFormData({
                                  ...formData,
                                  merchant_id: merchant.id,
                                  category: merchant.category || formData.category
                                });
                                setMerchantDropdownOpen(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{merchant.name}</Text>
                              {merchant.category && (
                                <Text style={styles.dropdownItemSubtext}>{merchant.category}</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <AmountInput
              label="Amount"
              value={parseFloat(formData.amount) || 0}
              onChange={(amount) => setFormData({ ...formData, amount: String(amount) })}
              required
            />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Weekly grocery shopping"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />
            </View>

            <DatePickerInput
              label="Date"
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              required
            />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                multiline
                numberOfLines={3}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />
            </View>

            {formData.type !== 'transfer' && (
              <View style={styles.splitSection}>
                <TouchableOpacity
                  style={styles.splitToggle}
                  onPress={() => {
                    setShowSplitForm(!showSplitForm);
                    if (!showSplitForm && splits.length === 0) {
                      addSplit();
                    }
                  }}
                >
                  <View style={styles.splitToggleLeft}>
                    <Split size={20} color="#1e40af" />
                    <Text style={styles.splitToggleText}>Split Transaction</Text>
                  </View>
                  <View style={[styles.splitToggleCheckbox, showSplitForm && styles.splitToggleCheckboxActive]}>
                    {showSplitForm && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>

                {showSplitForm && (
                  <View style={styles.splitForm}>
                    <View style={styles.splitHeader}>
                      <Text style={styles.splitHeaderText}>Split into Categories</Text>
                      <Text style={styles.splitHeaderAmount}>
                        {formatCurrency(getSplitTotal())} / {formatCurrency(parseFloat(formData.amount) || 0)}
                      </Text>
                    </View>

                    {Math.abs(getRemainingAmount()) > 0.01 && (
                      <View style={[styles.splitWarning, getRemainingAmount() < 0 && styles.splitError]}>
                        <Text style={[styles.splitWarningText, getRemainingAmount() < 0 && styles.splitErrorText]}>
                          {getRemainingAmount() > 0
                            ? `⚠️ Need ${formatCurrency(getRemainingAmount())} more to match total`
                            : `❌ Over by ${formatCurrency(Math.abs(getRemainingAmount()))} - reduce split amounts`
                          }
                        </Text>
                      </View>
                    )}
                    {Math.abs(getRemainingAmount()) <= 0.01 && (
                      <View style={styles.splitSuccess}>
                        <Text style={styles.splitSuccessText}>
                          ✓ Splits match transaction total
                        </Text>
                      </View>
                    )}

                    {splits.map((split, index) => (
                      <View key={index} style={[styles.splitRow, { zIndex: 1000 - index }]}>
                        <View style={styles.splitRowHeader}>
                          <Text style={styles.splitRowNumber}>Split {index + 1}</Text>
                          {splits.length > 1 && (
                            <TouchableOpacity onPress={() => removeSplit(index)}>
                              <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.splitRowContent}>
                          <View style={[styles.splitField, styles.splitFieldCategory]}>
                            <Text style={styles.splitLabel}>Category *</Text>
                            <TouchableOpacity
                              style={styles.splitDropdown}
                              onPress={() => toggleSplitCategoryDropdown(index)}
                            >
                              <Text style={[styles.splitDropdownText, !split.category_id && styles.dropdownPlaceholder]}>
                                {split.category_id ? getCategoryName(split.category_id) : 'Select category'}
                              </Text>
                              <ChevronDown size={18} color="#94a3b8" />
                            </TouchableOpacity>
                            {splitCategoryDropdowns[index] && (
                              <ScrollView style={styles.splitDropdownMenu} nestedScrollEnabled>
                                {categories
                                  .filter(c => {
                                    if (c.name === 'Transfer') return false;
                                    return formData.type === 'income' ? c.type === 'income' : c.type === 'expense';
                                  })
                                  .map((cat) => (
                                    <TouchableOpacity
                                      key={cat.id}
                                      style={styles.dropdownItem}
                                      onPress={() => {
                                        updateSplit(index, 'category_id', cat.id);
                                        toggleSplitCategoryDropdown(index);
                                      }}
                                    >
                                      <View style={styles.dropdownItemLeft}>
                                        <Text style={styles.categoryEmojiLarge}>{cat.icon}</Text>
                                        <Text style={styles.dropdownItemText}>{cat.name}</Text>
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                              </ScrollView>
                            )}
                          </View>

                          <View style={[styles.splitField, styles.splitFieldLower]}>
                            <Text style={styles.splitLabel}>Amount *</Text>
                            <View style={styles.splitAmountInput}>
                              <Text style={styles.currencySymbol}>$</Text>
                              <TextInput
                                style={styles.splitAmountField}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                value={split.amount}
                                onChangeText={(text) => updateSplit(index, 'amount', text)}
                              />
                            </View>
                            {split.amount && formData.amount && (
                              <Text style={styles.splitPercentage}>
                                {Math.round((parseFloat(split.amount) / parseFloat(formData.amount)) * 100)}%
                              </Text>
                            )}
                          </View>

                          <View style={[styles.splitField, styles.splitFieldLower]}>
                            <Text style={styles.splitLabel}>Notes</Text>
                            <TextInput
                              style={styles.splitNotesInput}
                              placeholder="Optional notes..."
                              value={split.notes}
                              onChangeText={(text) => updateSplit(index, 'notes', text)}
                            />
                          </View>
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity style={styles.addSplitButton} onPress={addSplit}>
                      <Plus size={16} color="#1e40af" strokeWidth={2.5} />
                      <Text style={styles.addSplitButtonText}>Add Another Split</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
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
                {editingId ? 'Update' : 'Add'}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  filterChipActive: {
    backgroundColor: '#1e40af',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
  transactionsList: {
    padding: 24,
    gap: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  splitCategories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  transactionAccount: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 2,
  },
  transferInfo: {
    marginBottom: 4,
  },
  transferText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
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
  formGroup: {
    marginBottom: 20,
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
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
  dropdownItemSubtext: {
    fontSize: 13,
    color: '#94a3b8',
  },
  categoryEmojiLarge: {
    fontSize: 20,
  },
  dropdownDivider: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  dropdownDividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transferArrow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  amountField: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 14,
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
  splitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    marginLeft: 8,
  },
  splitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  splitSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  splitToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  splitToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  splitToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  splitToggleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitToggleCheckboxActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  splitForm: {
    marginTop: 16,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  splitHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  splitHeaderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  splitWarning: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  splitWarningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
  splitError: {
    backgroundColor: '#fee2e2',
  },
  splitErrorText: {
    color: '#991b1b',
  },
  splitSuccess: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  splitSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
    textAlign: 'center',
  },
  splitRow: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'visible',
  },
  splitRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  splitRowNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  splitRowContent: {
    gap: 12,
    overflow: 'visible',
  },
  splitField: {
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  splitFieldCategory: {
    zIndex: 100,
  },
  splitFieldLower: {
    zIndex: 1,
  },
  splitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  splitDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  splitDropdownText: {
    fontSize: 14,
    color: '#0f172a',
  },
  splitDropdownMenu: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  splitAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  splitAmountField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  splitPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 4,
  },
  splitNotesInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  addSplitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e7ff',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
  },
  addSplitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  splitDetailsContainer: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 24,
    marginTop: -6,
    marginBottom: 6,
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
  },
  splitDetailsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  splitDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  splitDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  splitDetailEmoji: {
    fontSize: 18,
  },
  splitDetailCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  splitDetailNotes: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  splitDetailRight: {
    alignItems: 'flex-end',
  },
  splitDetailAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  splitDetailPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 2,
  },
});
