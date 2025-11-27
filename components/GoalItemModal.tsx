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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Clock, FileText, Calendar, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface GoalItemModalProps {
  visible: boolean;
  goalId: string;
  item: {
    id: string;
    name: string;
    description: string;
    budget_amount: number;
    status: string;
    notes: string;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', icon: Clock, color: '#64748b' },
  { value: 'quoted', label: 'Quoted', icon: FileText, color: '#3b82f6' },
  { value: 'booked', label: 'Booked', icon: Calendar, color: '#f59e0b' },
  { value: 'completed', label: 'Completed', icon: Check, color: '#10b981' },
  { value: 'cancelled', label: 'Cancelled', icon: X, color: '#ef4444' },
];

export default function GoalItemModal({ visible, goalId, item, onClose, onSaved }: GoalItemModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget_amount: '',
    status: 'planned',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description,
        budget_amount: item.budget_amount.toString(),
        status: item.status,
        notes: item.notes,
      });
    } else {
      resetForm();
    }
  }, [item, visible]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      budget_amount: '',
      status: 'planned',
      notes: '',
    });
  };

  const handleSave = async () => {
    if (!user || !formData.name || !formData.budget_amount) {
      Alert.alert('Error', 'Please fill in name and budget amount');
      return;
    }

    const budget = parseFloat(formData.budget_amount);
    if (isNaN(budget) || budget < 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      setSaving(true);

      const itemData = {
        goal_id: goalId,
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        budget_amount: budget,
        status: formData.status,
        notes: formData.notes,
      };

      if (item?.id) {
        const { error } = await supabase
          .from('goal_items')
          .update(itemData)
          .eq('id', item.id);

        if (error) throw error;
      } else {
        const { data: existingItems } = await supabase
          .from('goal_items')
          .select('sort_order')
          .eq('goal_id', goalId)
          .order('sort_order', { ascending: false })
          .limit(1);

        const nextSortOrder = existingItems?.[0]?.sort_order ? existingItems[0].sort_order + 1 : 0;

        const { error } = await supabase.from('goal_items').insert({
          ...itemData,
          sort_order: nextSortOrder,
        });

        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving goal item:', error);
      Alert.alert('Error', 'Failed to save goal item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{item ? 'Edit Item' : 'Add Item'}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Flights, Accommodation, Activities"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Budget Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={formData.budget_amount}
              onChangeText={(text) => setFormData({ ...formData, budget_amount: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map((status) => {
                const StatusIcon = status.icon;
                const isSelected = formData.status === status.value;

                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusCard,
                      isSelected && {
                        borderColor: status.color,
                        backgroundColor: `${status.color}10`,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, status: status.value })}
                  >
                    <StatusIcon size={20} color={isSelected ? status.color : '#64748b'} />
                    <Text
                      style={[
                        styles.statusLabel,
                        isSelected && { color: status.color, fontWeight: '600' },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add details about this item..."
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

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
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
  content: {
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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    width: '30%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  footer: {
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
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
