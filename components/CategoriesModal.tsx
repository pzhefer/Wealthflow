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
import { X, Plus, Edit2, Trash2, Tag, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
  is_system: boolean;
}

interface CategoriesModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  '💰', '💵', '💸', '💳', '🏦', '💼', '🎯', '🎁', '🛒', '🍽️',
  '🚗', '🏠', '⚡', '🏥', '🎬', '🛍️', '✈️', '📚', '🛡️', '📱',
  '🐾', '💇', '☕', '🍔', '🎮', '⚽', '🎵', '📸', '🌍', '🎨',
  '💡', '🔧', '🏋️', '🧘', '🎓', '👔', '👗', '👟', '🎒', '📦'
];

const COLOR_OPTIONS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#10b981' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Gray', value: '#64748b' },
];

export default function CategoriesModal({ visible, onClose }: CategoriesModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense' | 'both',
    icon: '📝',
    color: '#64748b',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchCategories();
    }
  }, [visible]);

  const fetchCategories = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const categoryData = {
        user_id: user.id,
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        is_system: false,
      };

      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(categoryData);

        if (error) throw error;
      }

      resetForm();
      setFormVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', 'Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    if (category.is_system) {
      Alert.alert('Cannot Edit', 'System categories cannot be edited');
      return;
    }

    setEditingId(category.id);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
    });
    setFormVisible(true);
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      Alert.alert('Cannot Delete', 'System categories cannot be deleted');
      return;
    }

    Alert.alert('Delete Category', 'Are you sure? Transactions using this category will keep the name but lose the link.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('categories').delete().eq('id', id);

            if (error) throw error;
            fetchCategories();
          } catch (error) {
            console.error('Error deleting category:', error);
            Alert.alert('Error', 'Failed to delete category');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      icon: '📝',
      color: '#64748b',
    });
    setEditingId(null);
  };

  const filteredCategories = categories.filter((cat) => {
    if (filter === 'all') return true;
    return cat.type === filter || cat.type === 'both';
  });

  const systemCategories = filteredCategories.filter((c) => c.is_system);
  const customCategories = filteredCategories.filter((c) => !c.is_system);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!formVisible ? (
          <>
            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'income' && styles.filterButtonActive]}
                onPress={() => setFilter('income')}
              >
                <TrendingUp size={16} color={filter === 'income' ? '#fff' : '#64748b'} />
                <Text style={[styles.filterText, filter === 'income' && styles.filterTextActive]}>
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'expense' && styles.filterButtonActive]}
                onPress={() => setFilter('expense')}
              >
                <TrendingDown size={16} color={filter === 'expense' ? '#fff' : '#64748b'} />
                <Text style={[styles.filterText, filter === 'expense' && styles.filterTextActive]}>
                  Expense
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#1e40af" />
              </View>
            ) : (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {systemCategories.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System Categories</Text>
                    <View style={styles.categoryList}>
                      {systemCategories.map((category) => (
                        <View key={category.id} style={styles.categoryCard}>
                          <View style={styles.categoryLeft}>
                            <View
                              style={[
                                styles.categoryIconCircle,
                                { backgroundColor: `${category.color}20` },
                              ]}
                            >
                              <Text style={styles.categoryIcon}>{category.icon}</Text>
                            </View>
                            <View>
                              <Text style={styles.categoryName}>{category.name}</Text>
                              <Text style={styles.categoryType}>
                                {category.type === 'both' ? 'Income & Expense' : category.type}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[styles.colorIndicator, { backgroundColor: category.color }]}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Custom Categories</Text>
                    <Text style={styles.categoryCount}>{customCategories.length}</Text>
                  </View>

                  {customCategories.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Tag size={48} color="#cbd5e1" strokeWidth={1.5} />
                      <Text style={styles.emptyStateTitle}>No Custom Categories</Text>
                      <Text style={styles.emptyStateText}>
                        Create categories to organize your transactions
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.categoryList}>
                      {customCategories.map((category) => (
                        <View key={category.id} style={styles.categoryCard}>
                          <View style={styles.categoryLeft}>
                            <View
                              style={[
                                styles.categoryIconCircle,
                                { backgroundColor: `${category.color}20` },
                              ]}
                            >
                              <Text style={styles.categoryIcon}>{category.icon}</Text>
                            </View>
                            <View>
                              <Text style={styles.categoryName}>{category.name}</Text>
                              <Text style={styles.categoryType}>
                                {category.type === 'both' ? 'Income & Expense' : category.type}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.categoryActions}>
                            <View
                              style={[styles.colorIndicator, { backgroundColor: category.color }]}
                            />
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleEdit(category)}
                            >
                              <Edit2 size={18} color="#64748b" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleDelete(category.id, category.is_system)}
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
                <Text style={styles.addButtonText}>Add Category</Text>
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
                  placeholder="e.g., Coffee Shops"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type *</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.type === 'expense' && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type: 'expense' })}
                  >
                    <TrendingDown size={18} color={formData.type === 'expense' ? '#fff' : '#ef4444'} />
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
                    onPress={() => setFormData({ ...formData, type: 'income' })}
                  >
                    <TrendingUp size={18} color={formData.type === 'income' ? '#fff' : '#10b981'} />
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
                      formData.type === 'both' && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type: 'both' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === 'both' && styles.typeButtonTextActive,
                      ]}
                    >
                      Both
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Icon</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.emojiScroll}
                >
                  <View style={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.emojiOption,
                          formData.icon === emoji && styles.emojiOptionActive,
                        ]}
                        onPress={() => setFormData({ ...formData, icon: emoji })}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color.value}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color.value },
                        formData.color === color.value && styles.colorOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, color: color.value })}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={styles.previewCategory}>
                  <View
                    style={[
                      styles.categoryIconCircle,
                      { backgroundColor: `${formData.color}20` },
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{formData.icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.categoryName}>{formData.name || 'Category Name'}</Text>
                    <Text style={styles.categoryType}>
                      {formData.type === 'both' ? 'Income & Expense' : formData.type}
                    </Text>
                  </View>
                </View>
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
                  {editingId ? 'Update' : 'Create'} Category
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
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
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
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  categoryType: {
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  categoryActions: {
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
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
  emojiScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiOption: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  emojiOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1e40af',
  },
  emojiText: {
    fontSize: 28,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#0f172a',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  previewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
