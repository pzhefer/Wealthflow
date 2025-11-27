import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Plus,
  Repeat,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Play,
  Pause,
  Trash2,
  ChevronDown,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface RecurringTransactionsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense' | 'transfer';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  next_occurrence: string;
  is_active: boolean;
  auto_generate: boolean;
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
}

interface Merchant {
  id: string;
  name: string;
  category: string;
  is_favorite: boolean;
}

export default function RecurringTransactionsModal({ visible, onClose }: RecurringTransactionsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [frequencyDropdownOpen, setFrequencyDropdownOpen] = useState(false);
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    category_id: '',
    description: '',
    type: 'expense' as 'income' | 'expense' | 'transfer',
    frequency: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
    start_date: new Date().toISOString().split('T')[0],
    account_id: '',
    merchant_id: '',
    day_of_month: '',
  });

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [recurringRes, accountsRes, categoriesRes, merchantsRes] = await Promise.all([
        supabase
          .from('recurring_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('next_occurrence'),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*'),
        supabase.from('merchants').select('*').eq('user_id', user.id).order('is_favorite', { ascending: false }).order('name'),
      ]);

      if (recurringRes.error) throw recurringRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (merchantsRes.error) throw merchantsRes.error;

      setRecurringTransactions(recurringRes.data || []);
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
    if (!user || !formData.name || !formData.amount || !formData.category || !formData.frequency) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const selectedCategory = categories.find(c => c.name === formData.category);
      const dayOfMonth = formData.day_of_month ? parseInt(formData.day_of_month) : null;

      if (dayOfMonth && (dayOfMonth < 1 || dayOfMonth > 31)) {
        Alert.alert('Error', 'Day of month must be between 1 and 31');
        return;
      }

      const recurringData = {
        user_id: user.id,
        name: formData.name,
        amount: formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category: formData.category,
        category_id: selectedCategory?.id || null,
        description: formData.description || '',
        type: formData.type,
        frequency: formData.frequency,
        start_date: formData.start_date,
        next_occurrence: formData.start_date,
        account_id: formData.account_id ? formData.account_id : null,
        merchant_id: formData.merchant_id ? formData.merchant_id : null,
        day_of_month: dayOfMonth,
        is_active: true,
        auto_generate: true,
      };

      console.log('Creating recurring transaction with data:', recurringData);

      const { data: insertedData, error } = await supabase
        .from('recurring_transactions')
        .insert(recurringData)
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Successfully created recurring transaction:', insertedData);

      resetForm();
      setAddModalVisible(false);
      fetchData();
      Alert.alert('Success', 'Recurring transaction created successfully');
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create recurring transaction';
      Alert.alert('Error', errorMessage);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error toggling active status:', error);
      Alert.alert('Error', 'Failed to update recurring transaction');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Recurring Transaction',
      `Are you sure you want to delete "${name}"? This will not delete transactions already created from this rule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('recurring_transactions')
                .delete()
                .eq('id', id);

              if (error) throw error;

              fetchData();
            } catch (error) {
              console.error('Error deleting recurring transaction:', error);
              Alert.alert('Error', 'Failed to delete recurring transaction');
            }
          },
        },
      ]
    );
  };

  const generateDueTransactions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('generate_due_recurring_transactions', {
        p_up_to_date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      const count = data?.length || 0;
      Alert.alert('Success', `Generated ${count} transaction(s) from recurring rules`);
      fetchData();
    } catch (error) {
      console.error('Error generating transactions:', error);
      Alert.alert('Error', 'Failed to generate transactions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      category: '',
      category_id: '',
      description: '',
      type: 'expense',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      account_id: '',
      merchant_id: '',
      day_of_month: '',
    });
    setCategoryDropdownOpen(false);
    setAccountDropdownOpen(false);
    setFrequencyDropdownOpen(false);
    setMerchantDropdownOpen(false);
  };

  const formatFrequency = (freq: string) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const getCategoryDisplay = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? `${category.icon} ${category.name}` : categoryName;
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'No Account';
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  const displayedCategories = categories.filter((cat) => {
    if (cat.name === 'Transfer') return false;
    if (formData.type === 'income') return cat.type === 'income' || cat.type === 'both';
    if (formData.type === 'expense') return cat.type === 'expense' || cat.type === 'both';
    return false;
  });

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Biweekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Repeat size={24} color="#1e40af" />
            <Text style={styles.title}>Recurring Transactions</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateDueTransactions}
            disabled={loading}
          >
            <Play size={16} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Due</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setAddModalVisible(true);
            }}
          >
            <Plus size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Add Recurring</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#1e40af" />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {recurringTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Repeat size={64} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyStateTitle}>No Recurring Transactions</Text>
                <Text style={styles.emptyStateText}>
                  Set up recurring transactions to automatically track regular income and expenses
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {recurringTransactions.map((recurring) => (
                  <View key={recurring.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View
                          style={[
                            styles.typeIcon,
                            {
                              backgroundColor:
                                recurring.type === 'income' ? '#dcfce7' : '#fee2e2',
                            },
                          ]}
                        >
                          {recurring.type === 'income' ? (
                            <TrendingUp size={18} color="#10b981" />
                          ) : (
                            <TrendingDown size={18} color="#ef4444" />
                          )}
                        </View>
                        <View>
                          <Text style={styles.cardName}>{recurring.name}</Text>
                          <Text style={styles.cardCategory}>
                            {getCategoryDisplay(recurring.category)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.cardAmount,
                          {
                            color: recurring.type === 'income' ? '#10b981' : '#ef4444',
                          },
                        ]}
                      >
                        {formatCurrency(recurring.amount)}
                      </Text>
                    </View>

                    <View style={styles.cardBody}>
                      {recurring.description ? (
                        <Text style={styles.cardDescription}>{recurring.description}</Text>
                      ) : null}
                      <View style={styles.cardMeta}>
                        <View style={styles.cardMetaItem}>
                          <Calendar size={14} color="#64748b" />
                          <Text style={styles.cardMetaText}>
                            {formatFrequency(recurring.frequency)}
                          </Text>
                        </View>
                        <View style={styles.cardMetaItem}>
                          <Calendar size={14} color="#64748b" />
                          <Text style={styles.cardMetaText}>
                            Next: {formatDate(recurring.next_occurrence)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => toggleActive(recurring.id, recurring.is_active)}
                      >
                        {recurring.is_active ? (
                          <>
                            <Pause size={16} color="#64748b" />
                            <Text style={styles.cardActionText}>Pause</Text>
                          </>
                        ) : (
                          <>
                            <Play size={16} color="#10b981" />
                            <Text style={[styles.cardActionText, { color: '#10b981' }]}>Resume</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => handleDelete(recurring.id, recurring.name)}
                      >
                        <Trash2 size={16} color="#ef4444" />
                        <Text style={[styles.cardActionText, { color: '#ef4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                    {!recurring.is_active && (
                      <View style={styles.pausedBadge}>
                        <Text style={styles.pausedBadgeText}>Paused</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        <Modal
          visible={addModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setAddModalVisible(false);
            resetForm();
          }}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Recurring Transaction</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddModalVisible(false);
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
                  onPress={() => setFormData({ ...formData, type: 'expense', category: '', category_id: '' })}
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
                  onPress={() => setFormData({ ...formData, type: 'income', category: '', category_id: '' })}
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
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Monthly Rent"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setCategoryDropdownOpen(!categoryDropdownOpen);
                    setAccountDropdownOpen(false);
                    setFrequencyDropdownOpen(false);
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
                            setFormData({ ...formData, category: cat.name, category_id: cat.id });
                            setCategoryDropdownOpen(false);
                          }}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                            <Text style={styles.dropdownItemText}>{cat.name}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount *</Text>
                <View style={styles.amountInput}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountField}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Frequency *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setFrequencyDropdownOpen(!frequencyDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setAccountDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownText}>
                    {formatFrequency(formData.frequency)}
                  </Text>
                  <ChevronDown size={20} color="#94a3b8" />
                </TouchableOpacity>
                {frequencyDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {frequencies.map((freq) => (
                      <TouchableOpacity
                        key={freq.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, frequency: freq.value as any });
                          setFrequencyDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{freq.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Day of Month (1-31)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1 for 1st of month"
                    keyboardType="number-pad"
                    value={formData.day_of_month}
                    onChangeText={(text) => setFormData({ ...formData, day_of_month: text })}
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.start_date}
                  onChangeText={(text) => setFormData({ ...formData, start_date: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional description"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Merchant</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setMerchantDropdownOpen(!merchantDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setAccountDropdownOpen(false);
                    setFrequencyDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownText, !formData.merchant_id && styles.dropdownPlaceholder]}>
                    {formData.merchant_id ? merchants.find(m => m.id === formData.merchant_id)?.name : 'Select merchant (optional)'}
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
                      {merchants.filter(m => m.is_favorite).length > 0 && (
                        <>
                          <View style={styles.dropdownDivider}>
                            <Text style={styles.dropdownDividerText}>Favorites</Text>
                          </View>
                          {merchants.filter(m => m.is_favorite).map((merchant) => (
                            <TouchableOpacity
                              key={merchant.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setFormData({
                                  ...formData,
                                  merchant_id: merchant.id,
                                  category: merchant.category || formData.category,
                                  category_id: categories.find(c => c.name === merchant.category)?.id || formData.category_id
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
                      {merchants.filter(m => !m.is_favorite).length > 0 && (
                        <>
                          {merchants.filter(m => m.is_favorite).length > 0 && (
                            <View style={styles.dropdownDivider}>
                              <Text style={styles.dropdownDividerText}>All Merchants</Text>
                            </View>
                          )}
                          {merchants.filter(m => !m.is_favorite).map((merchant) => (
                            <TouchableOpacity
                              key={merchant.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setFormData({
                                  ...formData,
                                  merchant_id: merchant.id,
                                  category: merchant.category || formData.category,
                                  category_id: categories.find(c => c.name === merchant.category)?.id || formData.category_id
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

              <View style={styles.formGroup}>
                <Text style={styles.label}>Account</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setAccountDropdownOpen(!accountDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setFrequencyDropdownOpen(false);
                    setMerchantDropdownOpen(false);
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
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setAddModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
                <Text style={styles.saveButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e40af',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  list: {
    padding: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 13,
    color: '#64748b',
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontSize: 13,
    color: '#64748b',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  pausedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pausedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  dropdownItemSubtext: {
    fontSize: 13,
    color: '#94a3b8',
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
  categoryEmoji: {
    fontSize: 20,
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
