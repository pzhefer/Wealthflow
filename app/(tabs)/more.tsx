import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { User, Target, BarChart3, Settings, HelpCircle, LogOut, ChevronRight, Wallet, BookOpen, Tag, Store, Repeat, FileText } from 'lucide-react-native';
import AccountsModal from '@/components/AccountsModal';
import ReportsModal from '@/components/ReportsModal';
import GoalsModal from '@/components/GoalsModal';
import TradingJournalModal from '@/components/TradingJournalModal';
import CategoriesModal from '@/components/CategoriesModal';
import MerchantsModal from '@/components/MerchantsModal';
import RecurringTransactionsModal from '@/components/RecurringTransactionsModal';
import DocumentsModal from '@/components/DocumentsModal';

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [accountsModalVisible, setAccountsModalVisible] = useState(false);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [tradingJournalVisible, setTradingJournalVisible] = useState(false);
  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const [merchantsVisible, setMerchantsVisible] = useState(false);
  const [recurringVisible, setRecurringVisible] = useState(false);
  const [documentsVisible, setDocumentsVisible] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User size={32} color="#1e40af" strokeWidth={2} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.email?.split('@')[0]}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Tools</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setAccountsModalVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
                  <Wallet size={20} color="#f59e0b" />
                </View>
                <Text style={styles.menuItemText}>Accounts</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setGoalsModalVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#dbeafe' }]}>
                  <Target size={20} color="#1e40af" />
                </View>
                <Text style={styles.menuItemText}>Goals</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setReportsModalVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#dcfce7' }]}>
                  <BarChart3 size={20} color="#10b981" />
                </View>
                <Text style={styles.menuItemText}>Reports</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setTradingJournalVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
                  <BookOpen size={20} color="#f59e0b" />
                </View>
                <Text style={styles.menuItemText}>Trading Journal</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setCategoriesVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#e0e7ff' }]}>
                  <Tag size={20} color="#6366f1" />
                </View>
                <Text style={styles.menuItemText}>Categories</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setMerchantsVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Store size={20} color="#10b981" />
                </View>
                <Text style={styles.menuItemText}>Merchants</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setRecurringVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#fce7f3' }]}>
                  <Repeat size={20} color="#ec4899" />
                </View>
                <Text style={styles.menuItemText}>Recurring Transactions</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setDocumentsVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#ede9fe' }]}>
                  <FileText size={20} color="#6366f1" />
                </View>
                <Text style={styles.menuItemText}>Documents</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#f1f5f9' }]}>
                  <Settings size={20} color="#64748b" />
                </View>
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
                  <HelpCircle size={20} color="#f59e0b" />
                </View>
                <Text style={styles.menuItemText}>Help & Support</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#fee2e2' }]}>
                  <LogOut size={20} color="#ef4444" />
                </View>
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WealthFlow v1.0.0</Text>
        </View>
      </ScrollView>

      <AccountsModal
        visible={accountsModalVisible}
        onClose={() => setAccountsModalVisible(false)}
      />

      <ReportsModal
        visible={reportsModalVisible}
        onClose={() => setReportsModalVisible(false)}
      />

      <GoalsModal
        visible={goalsModalVisible}
        onClose={() => setGoalsModalVisible(false)}
      />

      <TradingJournalModal
        visible={tradingJournalVisible}
        onClose={() => setTradingJournalVisible(false)}
      />

      <CategoriesModal
        visible={categoriesVisible}
        onClose={() => setCategoriesVisible(false)}
      />

      <MerchantsModal
        visible={merchantsVisible}
        onClose={() => setMerchantsVisible(false)}
      />

      <RecurringTransactionsModal
        visible={recurringVisible}
        onClose={() => setRecurringVisible(false)}
      />

      <DocumentsModal
        visible={documentsVisible}
        onClose={() => setDocumentsVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 68,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
