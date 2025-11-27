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
import { X, Plus, Edit2, Trash2, Store, Star, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Merchant {
  id: string;
  name: string;
  category: string;
  notes: string;
  is_favorite: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface MerchantsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function MerchantsModal({ visible, onClose }: MerchantsModalProps) {
  const { user } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    notes: '',
    is_favorite: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [merchantsRes, categoriesRes] = await Promise.all([
        supabase
          .from('merchants')
          .select('*')
          .eq('user_id', user.id)
          .order('is_favorite', { ascending: false })
          .order('name', { ascending: true }),
        supabase.from('categories').select('*'),
      ]);

      if (merchantsRes.error) throw merchantsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setMerchants(merchantsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.name.trim()) {
      Alert.alert('Error', 'Please enter a merchant name');
      return;
    }

    try {
      const merchantData = {
        user_id: user.id,
        name: formData.name.trim(),
        category: formData.category,
        notes: formData.notes,
        is_favorite: formData.is_favorite,
      };

      if (editingId) {
        const { error } = await supabase
          .from('merchants')
          .update(merchantData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('merchants').insert(merchantData);

        if (error) throw error;
      }

      resetForm();
      setFormVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving merchant:', error);
      Alert.alert('Error', 'Failed to save merchant');
    }
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingId(merchant.id);
    setFormData({
      name: merchant.name,
      category: merchant.category,
      notes: merchant.notes,
      is_favorite: merchant.is_favorite,
    });
    setFormVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Merchant',
      'Are you sure? Transactions will keep the merchant name but lose the link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('merchants').delete().eq('id', id);

              if (error) throw error;
              fetchData();
            } catch (error) {
              console.error('Error deleting merchant:', error);
              Alert.alert('Error', 'Failed to delete merchant');
            }
          },
        },
      ]
    );
  };

  const toggleFavorite = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ is_favorite: !currentValue })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      notes: '',
      is_favorite: false,
    });
    setEditingId(null);
    setCategoryDropdownOpen(false);
  };

  const getCategoryDisplay = (categoryName: string) => {
    const category = categories.find((c) => c.name === categoryName);
    return category ? `${category.icon} ${category.name}` : categoryName || 'None';
  };

  const filteredMerchants = merchants.filter((merchant) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      merchant.name.toLowerCase().includes(query) ||
      merchant.category.toLowerCase().includes(query)
    );
  });

  const favoriteMerchants = filteredMerchants.filter((m) => m.is_favorite);
  const regularMerchants = filteredMerchants.filter((m) => !m.is_favorite);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Merchants</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!formVisible ? (
          <>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search merchants..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#1e40af" />
              </View>
            ) : (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {favoriteMerchants.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Favorites</Text>
                    <View style={styles.merchantList}>
                      {favoriteMerchants.map((merchant) => (
                        <View key={merchant.id} style={styles.merchantCard}>
                          <View style={styles.merchantLeft}>
                            <View style={styles.merchantIcon}>
                              <Store size={20} color="#1e40af" />
                            </View>
                            <View style={styles.merchantDetails}>
                              <Text style={styles.merchantName}>{merchant.name}</Text>
                              {merchant.category ? (
                                <Text style={styles.merchantCategory}>
                                  {getCategoryDisplay(merchant.category)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <View style={styles.merchantActions}>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => toggleFavorite(merchant.id, merchant.is_favorite)}
                            >
                              <Star size={18} color="#f59e0b" fill="#f59e0b" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleEdit(merchant)}
                            >
                              <Edit2 size={18} color="#64748b" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleDelete(merchant.id)}
                            >
                              <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>All Merchants</Text>
                    <Text style={styles.merchantCount}>{regularMerchants.length}</Text>
                  </View>

                  {regularMerchants.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Store size={48} color="#cbd5e1" strokeWidth={1.5} />
                      <Text style={styles.emptyStateTitle}>No Merchants</Text>
                      <Text style={styles.emptyStateText}>
                        Add merchants to quickly categorize transactions
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.merchantList}>
                      {regularMerchants.map((merchant) => (
                        <View key={merchant.id} style={styles.merchantCard}>
                          <View style={styles.merchantLeft}>
                            <View style={styles.merchantIcon}>
                              <Store size={20} color="#1e40af" />
                            </View>
                            <View style={styles.merchantDetails}>
                              <Text style={styles.merchantName}>{merchant.name}</Text>
                              {merchant.category ? (
                                <Text style={styles.merchantCategory}>
                                  {getCategoryDisplay(merchant.category)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <View style={styles.merchantActions}>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => toggleFavorite(merchant.id, merchant.is_favorite)}
                            >
                              <Star size={18} color="#cbd5e1" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleEdit(merchant)}
                            >
                              <Edit2 size={18} color="#64748b" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleDelete(merchant.id)}
                            >
                              <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
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
                <Text style={styles.addButtonText}>Add Merchant</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Starbucks, Amazon, Whole Foods"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Default Category</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !formData.category && styles.dropdownPlaceholder,
                    ]}
                  >
                    {formData.category ? getCategoryDisplay(formData.category) : 'None (optional)'}
                  </Text>
                  <ChevronDown size={20} color="#94a3b8" />
                </TouchableOpacity>
                {categoryDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, category: '' });
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>None</Text>
                      </TouchableOpacity>
                      {categories.map((cat) => (
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
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Optional notes..."
                  multiline
                  numberOfLines={3}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                />
              </View>

              <TouchableOpacity
                style={styles.favoriteToggle}
                onPress={() => setFormData({ ...formData, is_favorite: !formData.is_favorite })}
              >
                <View style={styles.favoriteToggleLeft}>
                  <Star
                    size={20}
                    color={formData.is_favorite ? '#f59e0b' : '#cbd5e1'}
                    fill={formData.is_favorite ? '#f59e0b' : 'transparent'}
                  />
                  <Text style={styles.favoriteToggleText}>Add to Favorites</Text>
                </View>
                <View
                  style={[
                    styles.favoriteToggleCheckbox,
                    formData.is_favorite && styles.favoriteToggleCheckboxActive,
                  ]}
                >
                  {formData.is_favorite && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
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
                  {editingId ? 'Update' : 'Create'} Merchant
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
  searchBar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  merchantCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  merchantList: {
    gap: 12,
  },
  merchantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  merchantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  merchantIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  merchantCategory: {
    fontSize: 13,
    color: '#64748b',
  },
  merchantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
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
  favoriteToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  favoriteToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favoriteToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  favoriteToggleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteToggleCheckboxActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
