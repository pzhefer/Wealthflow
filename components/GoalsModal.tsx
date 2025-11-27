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
import { X, Plus, Target, PiggyBank, TrendingDown, ShoppingBag, Shield, Award, CheckCircle, Edit2, Trash2, Eye, Wallet, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import GoalDetailsModal from './GoalDetailsModal';

interface Goal {
  id: string;
  name: string;
  description: string;
  type: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  account_id: string | null;
  linked_account_id: string | null;
  notes: string;
  is_completed: boolean;
  item_count?: number;
  account_name?: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface GoalsModalProps {
  visible: boolean;
  onClose: () => void;
}

const GOAL_TYPES = [
  { value: 'savings', label: 'Savings', icon: PiggyBank, color: '#10b981' },
  { value: 'debt_payoff', label: 'Debt Payoff', icon: TrendingDown, color: '#ef4444' },
  { value: 'investment', label: 'Investment', icon: TrendingDown, color: '#1e40af' },
  { value: 'purchase', label: 'Purchase', icon: ShoppingBag, color: '#f59e0b' },
  { value: 'emergency_fund', label: 'Emergency Fund', icon: Shield, color: '#8b5cf6' },
  { value: 'retirement', label: 'Retirement', icon: Award, color: '#ec4899' },
];

export default function GoalsModal({ visible, onClose }: GoalsModalProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'savings',
    target_amount: '',
    current_amount: '',
    target_date: '',
    linked_account_id: '',
    notes: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchGoals();
      fetchAccounts();
    }
  }, [visible]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('is_completed', { ascending: true })
        .order('target_date', { ascending: true });

      if (error) throw error;

      const goalsWithData = await Promise.all(
        (data || []).map(async (goal) => {
          const { count: itemCount } = await supabase
            .from('goal_items')
            .select('*', { count: 'exact', head: true })
            .eq('goal_id', goal.id);

          let account_name = '';
          let current_amount = goal.current_amount;

          if (goal.linked_account_id) {
            const { data: accountData } = await supabase
              .from('accounts')
              .select('name, balance')
              .eq('id', goal.linked_account_id)
              .single();

            if (accountData) {
              account_name = accountData.name;

              const { data: transactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('account_id', goal.linked_account_id)
                .neq('type', 'transfer');

              const accountBalance = Number(accountData.balance) +
                (transactions || []).reduce((sum, t) => sum + Number(t.amount), 0);

              current_amount = accountBalance;
            }
          }

          return {
            ...goal,
            item_count: itemCount || 0,
            account_name,
            current_amount,
          };
        })
      );

      setGoals(goalsWithData);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.name || !formData.target_amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const targetAmount = parseFloat(formData.target_amount);
      const currentAmount = parseFloat(formData.current_amount || '0');

      if (isNaN(targetAmount) || targetAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid target amount');
        return;
      }

      const goalData = {
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        target_amount: targetAmount,
        current_amount: currentAmount,
        target_date: formData.target_date || null,
        linked_account_id: formData.linked_account_id || null,
        notes: formData.notes,
        is_completed: currentAmount >= targetAmount,
      };

      if (editingId) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('goals').insert(goalData);

        if (error) throw error;
      }

      resetForm();
      setFormVisible(false);
      fetchGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal');
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setFormData({
      name: goal.name,
      description: goal.description,
      type: goal.type,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date || '',
      linked_account_id: goal.linked_account_id || '',
      notes: goal.notes,
    });
    setFormVisible(true);
  };

  const handleViewDetails = (goalId: string) => {
    setSelectedGoalId(goalId);
    setDetailsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('goals').delete().eq('id', id);

            if (error) throw error;
            fetchGoals();
          } catch (error) {
            console.error('Error deleting goal:', error);
            Alert.alert('Error', 'Failed to delete goal');
          }
        },
      },
    ]);
  };

  const handleUpdateProgress = async (goal: Goal) => {
    Alert.prompt(
      'Update Progress',
      'Enter current amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (value?: string) => {
            if (!value) return;

            const currentAmount = parseFloat(value);
            if (isNaN(currentAmount) || currentAmount < 0) {
              Alert.alert('Error', 'Please enter a valid amount');
              return;
            }

            try {
              const { error } = await supabase
                .from('goals')
                .update({
                  current_amount: currentAmount,
                  is_completed: currentAmount >= goal.target_amount,
                })
                .eq('id', goal.id);

              if (error) throw error;
              fetchGoals();
            } catch (error) {
              console.error('Error updating progress:', error);
              Alert.alert('Error', 'Failed to update progress');
            }
          },
        },
      ],
      'plain-text',
      goal.current_amount.toString()
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'savings',
      target_amount: '',
      current_amount: '',
      target_date: '',
      linked_account_id: '',
      notes: '',
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

  const getProgress = (current: number, target: number) => {
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  const getGoalIcon = (type: string) => {
    const goalType = GOAL_TYPES.find((t) => t.value === type);
    return goalType ? goalType.icon : Target;
  };

  const getGoalColor = (type: string) => {
    const goalType = GOAL_TYPES.find((t) => t.value === type);
    return goalType ? goalType.color : '#64748b';
  };

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Goals</Text>
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
                {activeGoals.length === 0 && completedGoals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Target size={64} color="#cbd5e1" strokeWidth={1.5} />
                    <Text style={styles.emptyStateTitle}>No Goals</Text>
                    <Text style={styles.emptyStateText}>
                      Set financial goals to stay motivated and track your progress
                    </Text>
                  </View>
                ) : (
                  <>
                    {activeGoals.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Active Goals</Text>
                        <View style={styles.goalsList}>
                          {activeGoals.map((goal) => {
                            const IconComponent = getGoalIcon(goal.type);
                            const progress = getProgress(goal.current_amount, goal.target_amount);
                            const remaining = goal.target_amount - goal.current_amount;

                            return (
                              <View key={goal.id} style={styles.goalCard}>
                                <View style={styles.goalHeader}>
                                  <View style={styles.goalTitleRow}>
                                    <View
                                      style={[
                                        styles.goalIcon,
                                        { backgroundColor: `${getGoalColor(goal.type)}20` },
                                      ]}
                                    >
                                      <IconComponent size={20} color={getGoalColor(goal.type)} />
                                    </View>
                                    <View style={styles.goalInfo}>
                                      <Text style={styles.goalName}>{goal.name}</Text>
                                      {goal.description ? (
                                        <Text style={styles.goalDescription}>
                                          {goal.description}
                                        </Text>
                                      ) : null}
                                    </View>
                                  </View>
                                  <View style={styles.goalActions}>
                                    <TouchableOpacity onPress={() => handleEdit(goal)} style={styles.actionButton}>
                                      <Edit2 size={18} color="#3b82f6" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(goal.id)} style={styles.actionButton}>
                                      <Trash2 size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                <View style={styles.goalProgress}>
                                  <View style={styles.goalAmounts}>
                                    <Text style={styles.goalCurrent}>
                                      {formatCurrency(goal.current_amount)}
                                    </Text>
                                    <Text style={styles.goalTarget}>
                                      of {formatCurrency(goal.target_amount)}
                                    </Text>
                                  </View>
                                  <Text style={styles.goalRemaining}>
                                    {formatCurrency(remaining)} remaining
                                  </Text>
                                </View>

                                <View style={styles.progressBarContainer}>
                                  <View style={styles.progressBar}>
                                    <View
                                      style={[
                                        styles.progressFill,
                                        {
                                          width: `${progress}%`,
                                          backgroundColor: getGoalColor(goal.type),
                                        },
                                      ]}
                                    />
                                  </View>
                                  <Text style={styles.progressLabel}>{progress.toFixed(0)}%</Text>
                                </View>

                                {goal.account_name && (
                                  <View style={styles.goalMetaRow}>
                                    <Wallet size={14} color="#64748b" />
                                    <Text style={styles.goalMetaText}>{goal.account_name}</Text>
                                  </View>
                                )}

                                {goal.item_count !== undefined && goal.item_count > 0 && (
                                  <View style={styles.goalMetaRow}>
                                    <Target size={14} color="#64748b" />
                                    <Text style={styles.goalMetaText}>{goal.item_count} item{goal.item_count !== 1 ? 's' : ''}</Text>
                                  </View>
                                )}

                                {goal.target_date && (
                                  <Text style={styles.goalDate}>
                                    Due {formatDate(goal.target_date)}
                                  </Text>
                                )}

                                <TouchableOpacity
                                  style={styles.viewDetailsButton}
                                  onPress={() => handleViewDetails(goal.id)}
                                >
                                  <Eye size={16} color="#1e40af" />
                                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
                                  <ChevronRight size={16} color="#1e40af" />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {completedGoals.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Completed</Text>
                        <View style={styles.goalsList}>
                          {completedGoals.map((goal) => {
                            const IconComponent = getGoalIcon(goal.type);

                            return (
                              <TouchableOpacity
                                key={goal.id}
                                style={[styles.goalCard, styles.goalCardCompleted]}
                                onLongPress={() => handleDelete(goal.id)}
                              >
                                <View style={styles.goalHeader}>
                                  <View style={styles.goalTitleRow}>
                                    <View style={[styles.goalIcon, styles.goalIconCompleted]}>
                                      <CheckCircle size={20} color="#10b981" />
                                    </View>
                                    <View style={styles.goalInfo}>
                                      <Text style={styles.goalName}>{goal.name}</Text>
                                      <Text style={styles.goalCompletedText}>Goal achieved!</Text>
                                    </View>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </>
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
                <Text style={styles.addButtonText}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Goal Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Save for vacation"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Goal Type *</Text>
                <View style={styles.typeGrid}>
                  {GOAL_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeCard,
                          formData.type === type.value && styles.typeCardActive,
                          { borderColor: formData.type === type.value ? type.color : '#e2e8f0' },
                        ]}
                        onPress={() => setFormData({ ...formData, type: type.value })}
                      >
                        <IconComponent
                          size={24}
                          color={formData.type === type.value ? type.color : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.typeLabel,
                            formData.type === type.value && { color: type.color },
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
                <Text style={styles.label}>Target Amount *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10000"
                  keyboardType="decimal-pad"
                  value={formData.target_amount}
                  onChangeText={(text) => setFormData({ ...formData, target_amount: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={formData.current_amount}
                  onChangeText={(text) => setFormData({ ...formData, current_amount: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Linked Account (Optional)</Text>
                <View style={styles.accountDropdown}>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      Alert.alert(
                        'Select Account',
                        'Choose the account where funds for this goal are kept',
                        [
                          { text: 'None', onPress: () => setFormData({ ...formData, linked_account_id: '' }) },
                          ...accounts.map((account) => ({
                            text: account.name,
                            onPress: () => setFormData({ ...formData, linked_account_id: account.id }),
                          })),
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <Text style={formData.linked_account_id ? styles.inputText : styles.placeholderText}>
                      {formData.linked_account_id
                        ? accounts.find((a) => a.id === formData.linked_account_id)?.name || 'Select account'
                        : 'Select account (optional)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Target Date (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.target_date}
                  onChangeText={(text) => setFormData({ ...formData, target_date: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add a description..."
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes..."
                  multiline
                  numberOfLines={3}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
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
                <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Add Goal'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <GoalDetailsModal
          visible={detailsModalVisible}
          goalId={selectedGoalId}
          onClose={() => {
            setDetailsModalVisible(false);
            fetchGoals();
          }}
          onEditGoal={() => {
            const goal = goals.find((g) => g.id === selectedGoalId);
            if (goal) {
              setDetailsModalVisible(false);
              handleEdit(goal);
            }
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  goalCardCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  goalHeader: {
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconCompleted: {
    backgroundColor: '#dcfce7',
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  goalDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  goalCompletedText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  goalDate: {
    fontSize: 12,
    color: '#64748b',
  },
  goalProgress: {
    marginBottom: 12,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  goalCurrent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  goalTarget: {
    fontSize: 14,
    color: '#64748b',
  },
  goalRemaining: {
    fontSize: 13,
    color: '#64748b',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 40,
    textAlign: 'right',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    backgroundColor: '#f8fafc',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
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
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  goalMetaText: {
    fontSize: 13,
    color: '#64748b',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  accountDropdown: {
    width: '100%',
  },
  inputText: {
    fontSize: 16,
    color: '#0f172a',
  },
  placeholderText: {
    fontSize: 16,
    color: '#94a3b8',
  },
});
