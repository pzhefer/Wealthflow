import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { X, Upload, Camera, File, Search, Grid, List, ChevronDown, Trash2, Eye, Download } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AmountInput, DatePickerInput, MerchantPicker, CategoryPicker } from './FormFields';

interface DocumentsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Document {
  id: string;
  name: string;
  description: string;
  category: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  tags: string[];
  is_receipt: boolean;
  receipt_amount: number | null;
  receipt_merchant: string | null;
  receipt_date: string | null;
  ocr_text: string | null;
  ocr_data: any;
  created_at: string;
}

interface ReceiptData {
  merchant: string | null;
  amount: number | null;
  date: string | null;
  category: string | null;
  confidence: number;
  rawText: string;
}

const CATEGORIES = [
  'Receipt',
  'Invoice',
  'Tax Document',
  'Insurance',
  'Investment',
  'Legal',
  'Medical',
  'Banking',
  'Other',
];

export default function DocumentsModal({ visible, onClose }: DocumentsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [receiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [currentReceiptImage, setCurrentReceiptImage] = useState<string | null>(null);
  const [currentReceiptAsset, setCurrentReceiptAsset] = useState<any>(null);
  const [viewDocumentModalVisible, setViewDocumentModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [merchants, setMerchants] = useState<Array<{id: string, name: string}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (visible) {
      fetchDocuments();
      fetchMerchants();
      fetchCategories();
    }
  }, [visible]);

  const fetchDocuments = async () => {
    if (!user) {
      console.log('No user found, cannot fetch documents');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching documents for user:', user.id);

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Documents fetched:', data?.length || 0);
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      Alert.alert('Error', `Failed to load documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchants = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setMerchants(data || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const createMerchant = async (name: string) => {
    if (!user || !name.trim()) return null;
    try {
      const { data, error } = await supabase
        .from('merchants')
        .insert({ name: name.trim(), user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      await fetchMerchants();
      return data;
    } catch (error) {
      console.error('Error creating merchant:', error);
      return null;
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      await uploadFile(file);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        base64: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      // Process receipt with OCR
      setOcrProcessing(true);
      setCurrentReceiptImage(asset.uri);
      setCurrentReceiptAsset(asset);

      // Try OCR but don't fail if it doesn't work
      let ocrResult = null;
      try {
        ocrResult = await processReceiptOCR(asset.uri);
        console.log('✅ OCR Result received:', {
          hasResult: !!ocrResult,
          merchant: ocrResult?.merchant,
          amount: ocrResult?.amount,
          date: ocrResult?.date,
          rawTextLength: ocrResult?.rawText?.length || 0
        });
      } catch (ocrError) {
        console.error('❌ OCR processing failed:', {
          error: ocrError,
          message: ocrError instanceof Error ? ocrError.message : String(ocrError),
          stack: ocrError instanceof Error ? ocrError.stack : undefined
        });
      }

      setOcrProcessing(false);

      // Always show preview - user can manually enter data
      setReceiptData(ocrResult || {
        merchant: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: 'General',
        confidence: 0,
        rawText: '',
      });
      setReceiptPreviewVisible(true);
    } catch (error) {
      console.error('Error taking picture:', error);
      setOcrProcessing(false);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const processReceiptOCR = async (imageUri: string): Promise<ReceiptData | null> => {
    if (!user) return null;

    try {
      console.log('Starting OCR process...');
      console.log('Reading image from URI:', imageUri);

      // Platform-specific image reading
      let base64Image: string;

      if (Platform.OS === 'web') {
        // Web: fetch the blob and convert to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const reader = new FileReader();
        base64Image = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Native: use FileSystem
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });
      }

      console.log('Base64 image length:', base64Image.length);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-receipt-ocr`;
      console.log('Calling OCR function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Image,
        }),
      });

      console.log('OCR response status:', response.status);
      const result = await response.json();
      console.log('OCR result FULL:', JSON.stringify(result, null, 2));
      console.log('OCR result:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
        rawTextLength: result.rawText?.length || 0
      });

      if (!response.ok || result.error) {
        console.log('OCR not available or failed:', {
          status: response.status,
          error: result.error
        });
        console.log('User can manually enter receipt data');
        return null;
      }

      if (result.success && result.data) {
        console.log('OCR extracted:', {
          merchant: result.data.merchant,
          amount: result.data.amount,
          confidence: result.data.confidence,
          rawTextLength: result.rawText?.length || 0
        });
        return {
          merchant: result.data.merchant || 'Not detected',
          amount: result.data.amount || 0,
          date: result.data.date || new Date().toISOString().split('T')[0],
          category: result.data.category || 'General',
          confidence: result.data.confidence || 0,
          rawText: result.rawText || '',
        };
      }

      console.log('OCR failed - no success or no data in result:', result);
      return null;
    } catch (error) {
      console.error('OCR processing error:', error);
      Alert.alert('OCR Error', `Failed to process receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const uploadReceiptFile = async (file: any, ocrData?: ReceiptData) => {
    if (!user) return;

    try {
      setLoading(true);

      console.log('📤 Uploading receipt file:', {
        hasOcrData: !!ocrData,
        merchant: ocrData?.merchant,
        amount: ocrData?.amount,
        date: ocrData?.date,
        rawTextLength: ocrData?.rawText?.length || 0
      });

      // Create file path: userId/filename
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Convert URI to blob for upload
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob, {
          contentType: file.mimeType || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Prepare OCR data for database
      const dbRecord = {
        user_id: user.id,
        name: file.name || 'Untitled Receipt',
        description: '',
        category: 'Receipt',
        file_path: fileName,
        file_size: file.size || 0,
        mime_type: file.mimeType || 'image/jpeg',
        tags: [],
        is_receipt: true,
        receipt_amount: ocrData?.amount || null,
        receipt_merchant: ocrData?.merchant || null,
        receipt_date: ocrData?.date || null,
        ocr_text: ocrData?.rawText || '',
        ocr_data: ocrData ? {
          merchant: ocrData.merchant,
          amount: ocrData.amount,
          date: ocrData.date,
          category: ocrData.category,
          confidence: ocrData.confidence,
        } : null,
      };

      console.log('💾 Saving to database:', dbRecord);

      // Save metadata to database with OCR data
      const { error: dbError } = await supabase.from('documents').insert(dbRecord);

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('✅ Receipt saved successfully');
      Alert.alert('Success', 'Receipt saved successfully');
      fetchDocuments();
      setReceiptPreviewVisible(false);
      setCurrentReceiptImage(null);
      setCurrentReceiptAsset(null);
      setReceiptData(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: any) => {
    if (!user) return;

    try {
      setLoading(true);

      // Create file path: userId/filename
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Convert URI to blob for upload
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob, {
          contentType: file.mimeType || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Check if it's an image (potential receipt)
      const isImage = file.mimeType?.startsWith('image/');
      const isReceipt = file.name?.toLowerCase().includes('receipt') || false;

      // Save metadata to database
      const { error: dbError } = await supabase.from('documents').insert({
        user_id: user.id,
        name: file.name || 'Untitled Document',
        description: '',
        category: isReceipt ? 'Receipt' : 'Other',
        file_path: fileName,
        file_size: file.size || 0,
        mime_type: file.mimeType || 'application/octet-stream',
        tags: [],
        is_receipt: isReceipt,
      });

      if (dbError) throw dbError;

      Alert.alert('Success', 'Document uploaded successfully');
      fetchDocuments();
      setUploadModalVisible(false);
      setCameraModalVisible(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = async (doc: Document) => {
    try {
      setDocumentLoading(true);
      console.log('Opening document:', {
        name: doc.name,
        path: doc.file_path,
        isReceipt: doc.is_receipt,
        merchant: doc.receipt_merchant,
        amount: doc.receipt_amount
      });

      setSelectedDocument(doc);
      setViewDocumentModalVisible(true);

      // Use getPublicUrl for better mobile compatibility
      // Bucket is public with RLS policy allowing public read access
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(doc.file_path);

      console.log('📸 Document public URL generated:', {
        url: data.publicUrl,
        filePath: doc.file_path,
        urlLength: data.publicUrl.length
      });

      setDocumentUrl(data.publicUrl);
    } catch (error) {
      console.error('Error viewing document:', error);
      Alert.alert('Error', `Failed to load document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setViewDocumentModalVisible(false);
    } finally {
      setDocumentLoading(false);
    }
  };

  const deleteDocument = async (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteConfirmVisible(true);
  };

  const performDelete = async (doc: Document) => {
    try {
      setLoading(true);

      // Delete from database first
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Then delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) {
        // Non-fatal - file may already be deleted
      }

      // Close the view modal if it's open
      if (viewDocumentModalVisible && selectedDocument?.id === doc.id) {
        setViewDocumentModalVisible(false);
        setSelectedDocument(null);
        setDocumentUrl(null);
      }

      await fetchDocuments();
    } catch (error) {
      const errorMsg = `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const testOCRConnection = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Not authenticated. Please log in again.');
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/test-ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey!,
        },
      });

      const result = await response.json();
      console.log('OCR Test Result:', result);

      if (result.success) {
        Alert.alert(
          'OCR Test Successful ✓',
          `Google Vision API is configured and working!\n\nTest result: ${result.testResult || 'API responding correctly'}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'OCR Test Failed ✗',
          `Error: ${result.error}\n\n${result.message || ''}\n\nConfigured: ${result.configured ? 'Yes' : 'No'}\nAPI Working: ${result.apiWorking ? 'Yes' : 'No'}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Test error:', error);
      Alert.alert('Test Error', `Failed to test OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Documents</Text>
            <Text style={styles.subtitle}>{documents.length} documents</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search documents..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.toolbarRight}>
            <TouchableOpacity
              style={styles.viewModeButton}
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List size={20} color="#64748b" /> : <Grid size={20} color="#64748b" />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filters}>
          <TouchableOpacity
            style={styles.testOCRButton}
            onPress={testOCRConnection}
          >
            <Text style={styles.testOCRButtonText}>Test OCR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryFilter}
            onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
          >
            <Text style={styles.categoryFilterText}>{selectedCategory}</Text>
            <ChevronDown size={16} color="#64748b" />
          </TouchableOpacity>

          {categoryDropdownOpen && (
            <View style={styles.categoryDropdown}>
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => {
                  setSelectedCategory('All');
                  setCategoryDropdownOpen(false);
                }}
              >
                <Text style={styles.categoryItemText}>All</Text>
              </TouchableOpacity>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryItem}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setCategoryDropdownOpen(false);
                  }}
                >
                  <Text style={styles.categoryItemText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#1e40af" />
            </View>
          ) : filteredDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <File size={64} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>
                {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
              </Text>
              <Text style={styles.emptyStateText}>
                {documents.length === 0
                  ? 'Upload your first document or take a photo of a receipt'
                  : 'Try adjusting your search or filters'
                }
              </Text>
              {documents.length > 0 && (
                <TouchableOpacity
                  style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1e40af', borderRadius: 8 }}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '600' }}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={viewMode === 'grid' ? styles.grid : styles.list}>
              {filteredDocuments.map((doc) => (
                <View key={doc.id} style={viewMode === 'grid' ? styles.gridCard : styles.listCard}>
                  <View style={styles.documentIcon}>
                    {doc.mime_type.startsWith('image/') ? (
                      <Camera size={24} color="#6366f1" />
                    ) : (
                      <File size={24} color="#6366f1" />
                    )}
                  </View>

                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName} numberOfLines={2}>
                      {doc.name}
                    </Text>
                    <Text style={styles.documentMeta}>
                      {doc.category} • {formatFileSize(doc.file_size)}
                    </Text>
                    <Text style={styles.documentDate}>{formatDate(doc.created_at)}</Text>
                    {doc.is_receipt && doc.receipt_amount && (
                      <View style={styles.receiptBadge}>
                        <Text style={styles.receiptAmount}>${doc.receipt_amount.toFixed(2)}</Text>
                        {doc.receipt_merchant && (
                          <Text style={styles.receiptMerchant}>{doc.receipt_merchant}</Text>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.documentActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => viewDocument(doc)}>
                      <Eye size={18} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => deleteDocument(doc)}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
            <Upload size={20} color="#ffffff" />
            <Text style={styles.uploadButtonText}>Upload File</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
            <Camera size={20} color="#ffffff" />
            <Text style={styles.cameraButtonText}>Scan Receipt</Text>
          </TouchableOpacity>
        </View>

        {ocrProcessing && (
          <View style={styles.ocrOverlay}>
            <View style={styles.ocrCard}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.ocrText}>Processing receipt...</Text>
              <Text style={styles.ocrSubtext}>Extracting information with AI</Text>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={receiptPreviewVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReceiptPreviewVisible(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Receipt Preview</Text>
            <TouchableOpacity
              onPress={() => {
                setReceiptPreviewVisible(false);
                setCurrentReceiptImage(null);
                setCurrentReceiptAsset(null);
                setReceiptData(null);
              }}
              style={styles.closeButton}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.previewContainer}
          >
            {currentReceiptImage && (
              <Image
                source={{ uri: currentReceiptImage }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}

            {receiptData && (
              <View style={styles.ocrResultsCard}>
                {receiptData.confidence > 0 ? (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(receiptData.confidence * 100)}% Confidence
                    </Text>
                  </View>
                ) : (
                  <View style={styles.partialDataNotice}>
                    <Text style={styles.partialDataText}>
                      OCR is not configured. Please manually enter receipt details below.
                    </Text>
                  </View>
                )}

                {(receiptData.confidence > 0 && (!receiptData.merchant && !receiptData.amount && !receiptData.date)) && (
                  <View style={styles.partialDataNotice}>
                    <Text style={styles.partialDataText}>
                      OCR could not detect merchant, amount, or date. Please verify and update the details below.
                    </Text>
                  </View>
                )}

                {(receiptData.confidence > 0 && (receiptData.merchant || receiptData.amount || receiptData.date) &&
                 (!receiptData.merchant || !receiptData.amount || !receiptData.date)) && (
                  <View style={styles.partialDataNotice}>
                    <Text style={styles.partialDataText}>
                      Some fields could not be detected. Please verify and complete the details below.
                    </Text>
                  </View>
                )}

                <MerchantPicker
                  label="Merchant"
                  value={receiptData.merchant || ''}
                  onChange={(name) => setReceiptData({ ...receiptData, merchant: name })}
                  merchants={merchants}
                  onCreateNew={createMerchant}
                  required
                />

                <AmountInput
                  label="Amount"
                  value={receiptData.amount || 0}
                  onChange={(amount) => setReceiptData({ ...receiptData, amount })}
                  required
                />

                <DatePickerInput
                  label="Date"
                  value={receiptData.date || ''}
                  onChange={(date) => setReceiptData({ ...receiptData, date })}
                  required
                />

                <CategoryPicker
                  label="Category"
                  value={receiptData.category || ''}
                  onChange={(name) => setReceiptData({ ...receiptData, category: name })}
                  categories={categories}
                />

                {receiptData.rawText && (
                  <View style={styles.ocrField}>
                    <Text style={styles.ocrFieldLabel}>Extracted Text</Text>
                    <ScrollView style={styles.rawTextScroll}>
                      <Text style={styles.rawText}>{receiptData.rawText}</Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                if (!receiptData?.merchant?.trim() || !receiptData?.amount || !receiptData?.date?.trim()) {
                  Alert.alert('Missing Information', 'Please fill in merchant, amount, and date before saving.');
                  return;
                }

                console.log('💾 Save Receipt clicked', {
                  hasImage: !!currentReceiptImage,
                  hasReceiptData: !!receiptData,
                  merchant: receiptData?.merchant,
                  amount: receiptData?.amount,
                  date: receiptData?.date
                });

                if (currentReceiptImage && currentReceiptAsset) {
                  uploadReceiptFile({
                    uri: currentReceiptImage,
                    name: `receipt_${Date.now()}.jpg`,
                    mimeType: 'image/jpeg',
                    size: currentReceiptAsset.fileSize || 0,
                  }, receiptData);
                }
              }}
            >
              <Text style={styles.saveButtonText}>Save Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={viewDocumentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewDocumentModalVisible(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>View Document</Text>
              {selectedDocument && (
                <Text style={styles.subtitle}>{selectedDocument.name}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setViewDocumentModalVisible(false);
                setSelectedDocument(null);
                setDocumentUrl(null);
              }}
              style={styles.closeButton}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.previewContainer}>
            {documentLoading ? (
              <View style={styles.documentPreviewPlaceholder}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.documentPreviewSubtext}>Loading document...</Text>
              </View>
            ) : selectedDocument ? (
              <>
                {documentUrl && selectedDocument.mime_type.startsWith('image/') ? (
                  <>
                    <View style={styles.imageContainer}>
                    {Platform.OS === 'web' ? (
                      <img
                        src={documentUrl}
                        alt={selectedDocument.name}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '500px',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                        onError={(e) => {
                          console.error('Image load error:', e);
                        }}
                        onLoad={() => console.log('Image loaded successfully')}
                      />
                    ) : (
                      <Image
                        source={{
                          uri: documentUrl,
                        }}
                        style={styles.documentPreviewImage}
                        resizeMode="contain"
                        onError={(error) => {
                          console.error('❌ Image load error:', {
                            error: JSON.stringify(error),
                            url: documentUrl,
                            urlStart: documentUrl?.substring(0, 150),
                            mimeType: selectedDocument?.mime_type
                          });
                        }}
                        onLoad={(event) => {
                          console.log('✅ Image loaded successfully:', {
                            dimensions: event.nativeEvent,
                            url: documentUrl?.substring(0, 100)
                          });
                        }}
                        onLoadStart={() => console.log('⏳ Image load started:', documentUrl?.substring(0, 100))}
                        onLoadEnd={() => console.log('🏁 Image load ended')}
                      />
                    )}
                  </View>
                  </>
                ) : documentUrl && selectedDocument.mime_type === 'application/pdf' ? (
                  <View style={styles.documentPreviewPlaceholder}>
                    <File size={64} color="#ef4444" />
                    <Text style={styles.documentPreviewText}>PDF Document</Text>
                    <Text style={styles.documentPreviewSubtext}>{selectedDocument.name}</Text>
                    <Text style={styles.documentPreviewSubtext}>
                      {formatFileSize(selectedDocument.file_size)}
                    </Text>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => {
                        if (documentUrl) {
                          window.open(documentUrl, '_blank');
                        }
                      }}
                    >
                      <Download size={20} color="#ffffff" />
                      <Text style={styles.downloadButtonText}>Open PDF</Text>
                    </TouchableOpacity>
                  </View>
                ) : documentUrl ? (
                  <View style={styles.documentPreviewPlaceholder}>
                    <File size={64} color="#94a3b8" />
                    <Text style={styles.documentPreviewText}>{selectedDocument.mime_type}</Text>
                    <Text style={styles.documentPreviewSubtext}>
                      {formatFileSize(selectedDocument.file_size)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.documentPreviewPlaceholder}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.documentPreviewSubtext}>Loading...</Text>
                  </View>
                )}

                {selectedDocument.is_receipt && (selectedDocument.receipt_merchant || selectedDocument.receipt_amount) ? (
                  <View style={styles.ocrResultsCard}>
                    <Text style={styles.receiptInfoTitle}>Receipt Information</Text>

                    {selectedDocument.receipt_merchant && (
                      <View style={styles.ocrField}>
                        <Text style={styles.ocrFieldLabel}>Merchant</Text>
                        <Text style={styles.ocrFieldValue}>{selectedDocument.receipt_merchant}</Text>
                      </View>
                    )}

                    {selectedDocument.receipt_amount && (
                      <View style={styles.ocrField}>
                        <Text style={styles.ocrFieldLabel}>Amount</Text>
                        <Text style={styles.ocrFieldValueLarge}>
                          ${selectedDocument.receipt_amount.toFixed(2)}
                        </Text>
                      </View>
                    )}

                    {selectedDocument.receipt_date && (
                      <View style={styles.ocrField}>
                        <Text style={styles.ocrFieldLabel}>Receipt Date</Text>
                        <Text style={styles.ocrFieldValue}>{selectedDocument.receipt_date}</Text>
                      </View>
                    )}

                    <View style={styles.ocrField}>
                      <Text style={styles.ocrFieldLabel}>Category</Text>
                      <Text style={styles.ocrFieldValue}>{selectedDocument.category}</Text>
                    </View>

                    <View style={styles.ocrField}>
                      <Text style={styles.ocrFieldLabel}>Uploaded</Text>
                      <Text style={styles.ocrFieldValue}>{formatDate(selectedDocument.created_at)}</Text>
                    </View>

                    {selectedDocument.ocr_text && (
                      <View style={styles.ocrField}>
                        <Text style={styles.ocrFieldLabel}>Extracted Text (Preview)</Text>
                        <Text style={styles.ocrFieldValue} numberOfLines={5}>
                          {selectedDocument.ocr_text}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : selectedDocument.is_receipt ? (
                  <View style={styles.ocrResultsCard}>
                    <Text style={styles.receiptInfoTitle}>Receipt Information</Text>
                    <Text style={styles.documentPreviewText}>No OCR data extracted</Text>
                  </View>
                ) : null}

                {!selectedDocument.is_receipt && (
                  <View style={styles.documentMetaCard}>
                    <View style={styles.ocrField}>
                      <Text style={styles.ocrFieldLabel}>File Size</Text>
                      <Text style={styles.ocrFieldValue}>{formatFileSize(selectedDocument.file_size)}</Text>
                    </View>
                    <View style={styles.ocrField}>
                      <Text style={styles.ocrFieldLabel}>Type</Text>
                      <Text style={styles.ocrFieldValue}>{selectedDocument.mime_type}</Text>
                    </View>
                    <View style={styles.ocrField}>
                      <Text style={styles.ocrFieldLabel}>Uploaded</Text>
                      <Text style={styles.ocrFieldValue}>{formatDate(selectedDocument.created_at)}</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.documentPreviewPlaceholder}>
                <Text style={styles.documentPreviewText}>No document selected</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                setViewDocumentModalVisible(false);
                if (selectedDocument) {
                  deleteDocument(selectedDocument);
                }
              }}
            >
              <Trash2 size={20} color="#ffffff" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteModalIconContainer}>
                <Trash2 size={28} color="#ef4444" />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Document?</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
              </Text>
            </View>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  setDocumentToDelete(null);
                }}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={async () => {
                  setDeleteConfirmVisible(false);
                  if (documentToDelete) {
                    await performDelete(documentToDelete);
                    setDocumentToDelete(null);
                  }
                }}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  filters: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  testOCRButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  testOCRButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  categoryDropdown: {
    position: 'absolute',
    top: 50,
    left: 24,
    right: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 300,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoryItemText: {
    fontSize: 15,
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    paddingHorizontal: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  list: {
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  receiptBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  receiptAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  receiptMerchant: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 2,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#1e40af',
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  cameraButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  ocrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  ocrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 250,
  },
  ocrText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
  },
  ocrSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  previewContainer: {
    padding: 24,
    flexGrow: 1,
    minHeight: 400,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginBottom: 24,
  },
  ocrResultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  confidenceBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  ocrField: {
    marginBottom: 20,
  },
  ocrFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ocrFieldValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  editableField: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 250,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#0f172a',
  },
  dropdownItemNew: {
    backgroundColor: '#f0fdf4',
  },
  dropdownItemNewText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  dropdownClose: {
    padding: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  dropdownCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownInput: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  datePickerContent: {
    padding: 16,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 4,
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
    paddingVertical: 10,
  },
  ocrFieldValueLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
  },
  rawTextScroll: {
    maxHeight: 150,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rawText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  documentPreviewImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginBottom: 24,
  },
  documentPreviewPlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  documentPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  documentPreviewSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  receiptInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#ef4444',
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  documentMetaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    marginTop: 16,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  partialDataNotice: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  partialDataText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  deleteModalHeader: {
    padding: 24,
    alignItems: 'center',
  },
  deleteModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderBottomRightRadius: 16,
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
