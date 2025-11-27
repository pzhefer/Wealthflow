import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Calendar, ChevronDown, Plus } from 'lucide-react-native';

interface AmountInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
}

export function AmountInput({
  label = 'Amount',
  value,
  onChange,
  placeholder = '0.00',
  required = false
}: AmountInputProps) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.amountInput}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountField}
          placeholder={placeholder}
          keyboardType="decimal-pad"
          value={value ? String(value) : ''}
          onChangeText={(text) => {
            const num = parseFloat(text);
            onChange(isNaN(num) ? 0 : num);
          }}
          placeholderTextColor="#94a3b8"
        />
      </View>
    </View>
  );
}

interface DatePickerInputProps {
  label?: string;
  value: string;
  onChange: (date: string) => void;
  required?: boolean;
}

export function DatePickerInput({
  label = 'Date',
  value,
  onChange,
  required = false
}: DatePickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(value ? new Date(value) : new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      setDate(selectedDate);
      const formatted = selectedDate.toISOString().split('T')[0];
      onChange(formatted);
      if (Platform.OS === 'ios') {
        setShowPicker(false);
      }
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowPicker(true)}
      >
        <Calendar size={20} color="#64748b" />
        <Text style={value ? styles.pickerText : styles.pickerPlaceholder}>
          {formatDisplayDate(value)}
        </Text>
        <ChevronDown size={20} color="#64748b" />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'web' && (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.dateInput}
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.datePickerButtons}>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => {
                    onChange(new Date().toISOString().split('T')[0]);
                  }}
                >
                  <Text style={styles.datePickerButtonText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.datePickerButtonPrimary]}
                  onPress={() => setShowPicker(false)}
                >
                  <Text style={[styles.datePickerButtonText, styles.datePickerButtonTextPrimary]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showPicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

interface MerchantPickerProps {
  label?: string;
  value: string;
  onChange: (merchantName: string) => void;
  merchants: Array<{ id: string; name: string }>;
  onCreateNew?: (name: string) => Promise<void>;
  required?: boolean;
}

export function MerchantPicker({
  label = 'Merchant',
  value,
  onChange,
  merchants,
  onCreateNew,
  required = false
}: MerchantPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMerchants = merchants.filter(m =>
    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showAddNew = searchQuery.trim() &&
    !merchants.find(m => m.name.toLowerCase() === searchQuery.toLowerCase());

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={value ? styles.pickerText : styles.pickerPlaceholder}>
          {value || 'Select merchant'}
        </Text>
        <ChevronDown size={20} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Merchant</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search or type to add new..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
                autoFocus
              />
            </View>

            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {filteredMerchants.map((merchant) => (
                <TouchableOpacity
                  key={merchant.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    onChange(merchant.name);
                    setSearchQuery('');
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{merchant.name}</Text>
                </TouchableOpacity>
              ))}

              {showAddNew && onCreateNew && (
                <TouchableOpacity
                  style={[styles.pickerItem, styles.pickerItemNew]}
                  onPress={async () => {
                    await onCreateNew(searchQuery);
                    onChange(searchQuery);
                    setSearchQuery('');
                    setShowPicker(false);
                  }}
                >
                  <Plus size={20} color="#10b981" />
                  <Text style={styles.pickerItemNewText}>Add "{searchQuery}"</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface CategoryPickerProps {
  label?: string;
  value: string;
  onChange: (categoryName: string) => void;
  categories: Array<{ id: string; name: string; icon?: string; color?: string }>;
  required?: boolean;
}

export function CategoryPicker({
  label = 'Category',
  value,
  onChange,
  categories,
  required = false
}: CategoryPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={value ? styles.pickerText : styles.pickerPlaceholder}>
          {value || 'Select category'}
        </Text>
        <ChevronDown size={20} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
                autoFocus
              />
            </View>

            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    onChange(category.name);
                    setSearchQuery('');
                    setShowPicker(false);
                  }}
                >
                  {category.icon && (
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                  )}
                  <Text style={styles.pickerItemText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 4,
  },
  amountField: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    paddingVertical: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#0f172a',
  },
  pickerItemNew: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemNewText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  categoryIcon: {
    fontSize: 20,
  },
  datePickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  dateInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  datePickerButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerButtonPrimary: {
    backgroundColor: '#6366f1',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  datePickerButtonTextPrimary: {
    color: '#ffffff',
  },
});
