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
import { X, Plus, Wallet, CreditCard, Building2, Bitcoin, Home, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  current_balance?: number;
}

interface AccountsModalProps {
  visible: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking', icon: Wallet },
  { value: 'savings', label: 'Savings', icon: Building2 },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'investment', label: 'Investment', icon: Briefcase },
  { value: 'crypto', label: 'Crypto', icon: Bitcoin },
  { value: 'real_estate', label: 'Real Estate', icon: Home },
  { value: 'other', label: 'Other', icon: Wallet },
];

export default function AccountsModal({ visible, onClose }: AccountsModalProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'USD',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchAccounts();
    }
  }, [visible]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const accountsWithBalances = await Promise.all(
        (data || []).map(async (account) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`);

          let currentBalance = account.balance;

          (transactions || []).forEach((tx) => {
            if (tx.type === 'transfer') {
              return;
            }
            currentBalance += tx.amount;
          });

          return {
            ...account,
            current_balance: currentBalance,
          };
        })
      );

      setAccounts(accountsWithBalances);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.name || !formData.balance) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const balance = parseFloat(formData.balance);
      if (isNaN(balance)) {
        Alert.alert('Error', 'Please enter a valid balance');
        return;
      }

      const accountData = {
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        balance: balance,
        currency: formData.currency,
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert(accountData);

        if (error) throw error;
      }

      resetForm();
      setFormVisible(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      Alert.alert('Error', 'Failed to save account');
    }
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
    });
    setFormVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Account', 'Are you sure you want to delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('accounts').delete().eq('id', id);

            if (error) throw error;
            fetchAccounts();
          } catch (error) {
            console.error('Error deleting account:', error);
            Alert.alert('Error', 'Failed to delete account');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      balance: '',
      currency: 'USD',
    });
    setEditingId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccountIcon = (type: string) => {
    const accountType = ACCOUNT_TYPES.find((t) => t.value === type);
    return accountType ? accountType.icon : Wallet;
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Accounts</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!formVisible ? (
          <>
            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#1e40af" />
              </View>
            ) : (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {accounts.length > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Balance</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalBalance)}</Text>
                    <Text style={styles.summarySubtext}>{accounts.length} accounts</Text>
                  </View>
                )}

                {accounts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Wallet size={64} color="#cbd5e1" strokeWidth={1.5} />
                    <Text style={styles.emptyStateTitle}>No Accounts</Text>
                    <Text style={styles.emptyStateText}>
                      Add accounts to track your finances across multiple sources
                    </Text>
                  </View>
                ) : (
                  <View style={styles.accountsList}>
                    {accounts.map((account) => {
                      const IconComponent = getAccountIcon(account.type);
                      return (
                        <TouchableOpacity
                          key={account.id}
                          style={styles.accountCard}
                          onPress={() => handleEdit(account)}
                          onLongPress={() => handleDelete(account.id)}
                        >
                          <View style={styles.accountIcon}>
                            <IconComponent size={24} color="#1e40af" />
                          </View>
                          <View style={styles.accountInfo}>
                            <Text style={styles.accountName}>{account.name}</Text>
                            <Text style={styles.accountType}>
                              {ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ||
                                account.type}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.accountBalance}>
                              {formatCurrency(account.current_balance ?? account.balance)}
                            </Text>
                            {account.current_balance !== account.balance && (
                              <Text style={styles.initialBalanceText}>
                                Initial: {formatCurrency(account.balance)}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
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
                <Text style={styles.addButtonText}>Add Account</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Account Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="My Checking Account"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Account Type *</Text>
                <View style={styles.typeGrid}>
                  {ACCOUNT_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeCard,
                          formData.type === type.value && styles.typeCardActive,
                        ]}
                        onPress={() => setFormData({ ...formData, type: type.value })}
                      >
                        <IconComponent
                          size={24}
                          color={formData.type === type.value ? '#1e40af' : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.typeLabel,
                            formData.type === type.value && styles.typeLabelActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Balance *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={formData.balance}
                  onChangeText={(text) => setFormData({ ...formData, balance: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  style={styles.input}
                  placeholder="USD"
                  value={formData.currency}
                  onChangeText={(text) => setFormData({ ...formData, currency: text })}
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
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update' : 'Add Account'}
                </Text>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  summaryCard: {
    backgroundColor: '#1e40af',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bfdbfe',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  emptyState: {
    flex: 1,
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
  accountsList: {
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  accountType: {
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  initialBalanceText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 2,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  typeCardActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1e40af',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: '#1e40af',
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
