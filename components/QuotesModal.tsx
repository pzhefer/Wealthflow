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
import { X, Plus, Check, Trash2, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Quote {
  id: string;
  vendor_name: string;
  amount: number;
  notes: string;
  is_selected: boolean;
  quote_date: string;
}

interface QuotesModalProps {
  visible: boolean;
  goalItemId: string | null;
  goalItemName: string;
  onClose: () => void;
}

export default function QuotesModal({
  visible,
  goalItemId,
  goalItemName,
  onClose,
}: QuotesModalProps) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    vendor_name: '',
    amount: '',
    notes: '',
    quote_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (visible && goalItemId) {
      fetchQuotes();
    }
  }, [visible, goalItemId]);

  const fetchQuotes = async () => {
    if (!user || !goalItemId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goal_item_quotes')
        .select('*')
        .eq('goal_item_id', goalItemId)
        .order('quote_date', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuote = () => {
    setEditingId(null);
    setFormData({
      vendor_name: '',
      amount: '',
      notes: '',
      quote_date: new Date().toISOString().split('T')[0],
    });
    setFormVisible(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingId(quote.id);
    setFormData({
      vendor_name: quote.vendor_name,
      amount: quote.amount.toString(),
      notes: quote.notes,
      quote_date: quote.quote_date,
    });
    setFormVisible(true);
  };

  const handleSaveQuote = async () => {
    if (!user || !goalItemId || !formData.vendor_name || !formData.amount) {
      Alert.alert('Error', 'Please fill in vendor name and amount');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const quoteData = {
        goal_item_id: goalItemId,
        user_id: user.id,
        vendor_name: formData.vendor_name,
        amount: amount,
        notes: formData.notes,
        quote_date: formData.quote_date,
        is_selected: false,
      };

      if (editingId) {
        const { error } = await supabase
          .from('goal_item_quotes')
          .update(quoteData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('goal_item_quotes').insert(quoteData);

        if (error) throw error;
      }

      setFormVisible(false);
      fetchQuotes();
    } catch (error) {
      console.error('Error saving quote:', error);
      Alert.alert('Error', 'Failed to save quote');
    }
  };

  const handleSelectQuote = async (quoteId: string) => {
    if (!goalItemId) return;

    try {
      await supabase
        .from('goal_item_quotes')
        .update({ is_selected: false })
        .eq('goal_item_id', goalItemId);

      const { error } = await supabase
        .from('goal_item_quotes')
        .update({ is_selected: true })
        .eq('id', quoteId);

      if (error) throw error;
      fetchQuotes();
    } catch (error) {
      console.error('Error selecting quote:', error);
      Alert.alert('Error', 'Failed to select quote');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    Alert.alert('Delete Quote', 'Are you sure you want to delete this quote?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('goal_item_quotes').delete().eq('id', quoteId);

            if (error) throw error;
            fetchQuotes();
          } catch (error) {
            console.error('Error deleting quote:', error);
            Alert.alert('Error', 'Failed to delete quote');
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {goalItemName}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {!formVisible ? (
          <>
            <View style={styles.subtitle}>
              <Text style={styles.subtitleText}>Quotes & Price Comparisons</Text>
            </View>

            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#1e40af" />
              </View>
            ) : (
              <ScrollView style={styles.content}>
                {quotes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No quotes yet. Add quotes to compare prices from different vendors.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.quotesList}>
                    {quotes.map((quote) => (
                      <View
                        key={quote.id}
                        style={[styles.quoteCard, quote.is_selected && styles.quoteCardSelected]}
                      >
                        <View style={styles.quoteHeader}>
                          <View style={styles.quoteTitle}>
                            <Text style={styles.vendorName}>{quote.vendor_name}</Text>
                            {quote.is_selected && (
                              <View style={styles.selectedBadge}>
                                <Check size={12} color="#10b981" strokeWidth={3} />
                                <Text style={styles.selectedText}>Selected</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.quoteActions}>
                            <TouchableOpacity onPress={() => handleEditQuote(quote)}>
                              <Text style={styles.editButton}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteQuote(quote.id)}>
                              <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text style={styles.quoteAmount}>{formatCurrency(quote.amount)}</Text>

                        <View style={styles.quoteDate}>
                          <Calendar size={14} color="#64748b" />
                          <Text style={styles.quoteDateText}>{formatDate(quote.quote_date)}</Text>
                        </View>

                        {quote.notes && (
                          <Text style={styles.quoteNotes} numberOfLines={2}>
                            {quote.notes}
                          </Text>
                        )}

                        {!quote.is_selected && (
                          <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => handleSelectQuote(quote.id)}
                          >
                            <Check size={16} color="#1e40af" />
                            <Text style={styles.selectButtonText}>Select This Quote</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.addButton} onPress={handleAddQuote}>
                <Plus size={20} color="#fff" strokeWidth={2.5} />
                <Text style={styles.addButtonText}>Add Quote</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Vendor / Provider Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Airline A, Hotel Hilton"
                  value={formData.vendor_name}
                  onChangeText={(text) => setFormData({ ...formData, vendor_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={formData.amount}
                  onChangeText={(text) => setFormData({ ...formData, amount: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Quote Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.quote_date}
                  onChangeText={(text) => setFormData({ ...formData, quote_date: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Details about this quote..."
                  multiline
                  numberOfLines={4}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.formFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setFormVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveQuote}>
                <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Add Quote'}</Text>
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  subtitle: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subtitleText: {
    fontSize: 14,
    color: '#64748b',
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
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  quotesList: {
    gap: 12,
  },
  quoteCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  quoteCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  quoteTitle: {
    flex: 1,
    gap: 6,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  selectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  quoteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  quoteAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  quoteDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quoteDateText: {
    fontSize: 13,
    color: '#64748b',
  },
  quoteNotes: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 4,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
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
    height: 100,
    textAlignVertical: 'top',
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
