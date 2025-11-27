export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'mortgage' | 'crypto' | 'real_estate' | 'other'
          balance: number
          currency: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'mortgage' | 'crypto' | 'real_estate' | 'other'
          balance?: number
          currency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'mortgage' | 'crypto' | 'real_estate' | 'other'
          balance?: number
          currency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          to_account_id: string | null
          linked_transaction_id: string | null
          merchant_id: string | null
          merchant_name: string
          goal_item_id: string | null
          is_split: boolean
          amount: number
          category: string
          category_id: string | null
          description: string
          notes: string
          date: string
          type: 'income' | 'expense' | 'transfer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          to_account_id?: string | null
          linked_transaction_id?: string | null
          merchant_id?: string | null
          merchant_name?: string
          goal_item_id?: string | null
          is_split?: boolean
          amount: number
          category: string
          category_id?: string | null
          description?: string
          notes?: string
          date?: string
          type: 'income' | 'expense' | 'transfer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          to_account_id?: string | null
          linked_transaction_id?: string | null
          merchant_id?: string | null
          merchant_name?: string
          goal_item_id?: string | null
          is_split?: boolean
          amount?: number
          category?: string
          category_id?: string | null
          description?: string
          notes?: string
          date?: string
          type?: 'income' | 'expense' | 'transfer'
          created_at?: string
          updated_at?: string
        }
      }
      transaction_splits: {
        Row: {
          id: string
          transaction_id: string
          category_id: string | null
          amount: number
          percentage: number | null
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          category_id?: string | null
          amount: number
          percentage?: number | null
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          category_id?: string | null
          amount?: number
          percentage?: number | null
          notes?: string
          created_at?: string
        }
      }
      merchants: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          notes: string
          is_favorite: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string
          notes?: string
          is_favorite?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          notes?: string
          is_favorite?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: 'income' | 'expense' | 'both'
          icon: string
          color: string
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: 'income' | 'expense' | 'both'
          icon?: string
          color?: string
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: 'income' | 'expense' | 'both'
          icon?: string
          color?: string
          is_system?: boolean
          created_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          amount: number
          period: 'weekly' | 'monthly' | 'yearly'
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          amount: number
          period?: 'weekly' | 'monthly' | 'yearly'
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          amount?: number
          period?: 'weekly' | 'monthly' | 'yearly'
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          type: 'savings' | 'debt_payoff' | 'investment' | 'purchase' | 'emergency_fund' | 'retirement' | 'other'
          target_amount: number
          current_amount: number
          target_date: string | null
          account_id: string | null
          linked_account_id: string | null
          notes: string
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string
          type: 'savings' | 'debt_payoff' | 'investment' | 'purchase' | 'emergency_fund' | 'retirement' | 'other'
          target_amount: number
          current_amount?: number
          target_date?: string | null
          account_id?: string | null
          linked_account_id?: string | null
          notes?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          type?: 'savings' | 'debt_payoff' | 'investment' | 'purchase' | 'emergency_fund' | 'retirement' | 'other'
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          account_id?: string | null
          linked_account_id?: string | null
          notes?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      goal_items: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          name: string
          description: string
          budget_amount: number
          status: 'planned' | 'quoted' | 'booked' | 'completed' | 'cancelled'
          sort_order: number
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          name: string
          description?: string
          budget_amount?: number
          status?: 'planned' | 'quoted' | 'booked' | 'completed' | 'cancelled'
          sort_order?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          user_id?: string
          name?: string
          description?: string
          budget_amount?: number
          status?: 'planned' | 'quoted' | 'booked' | 'completed' | 'cancelled'
          sort_order?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      goal_item_quotes: {
        Row: {
          id: string
          goal_item_id: string
          user_id: string
          vendor_name: string
          amount: number
          notes: string
          is_selected: boolean
          quote_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_item_id: string
          user_id: string
          vendor_name: string
          amount: number
          notes?: string
          is_selected?: boolean
          quote_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_item_id?: string
          user_id?: string
          vendor_name?: string
          amount?: number
          notes?: string
          is_selected?: boolean
          quote_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      investment_portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'stocks' | 'crypto' | 'other'
          description: string | null
          total_value: number
          total_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: 'stocks' | 'crypto' | 'other'
          description?: string | null
          total_value?: number
          total_cost?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'stocks' | 'crypto' | 'other'
          description?: string | null
          total_value?: number
          total_cost?: number
          created_at?: string
          updated_at?: string
        }
      }
      investment_holdings: {
        Row: {
          id: string
          portfolio_id: string
          user_id: string
          symbol: string
          name: string
          quantity: number
          cost_basis: number
          current_price: number
          notes: string | null
          asset_type: 'stock' | 'crypto' | 'etf' | 'mutual_fund' | 'bond' | 'other'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          user_id: string
          symbol: string
          name: string
          quantity: number
          cost_basis: number
          current_price?: number
          notes?: string | null
          asset_type?: 'stock' | 'crypto' | 'etf' | 'mutual_fund' | 'bond' | 'other'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          user_id?: string
          symbol?: string
          name?: string
          quantity?: number
          cost_basis?: number
          current_price?: number
          notes?: string | null
          asset_type?: 'stock' | 'crypto' | 'etf' | 'mutual_fund' | 'bond' | 'other'
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          portfolio_id: string | null
          symbol: string
          name: string
          trade_type: 'buy' | 'sell' | 'short' | 'cover'
          instrument_type: 'stock' | 'crypto' | 'option' | 'etf' | 'forex' | 'other'
          quantity: number
          entry_price: number
          exit_price: number | null
          entry_date: string
          exit_date: string | null
          commission: number
          profit_loss: number | null
          roi_percentage: number | null
          strategy: string
          status: 'open' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          portfolio_id?: string | null
          symbol: string
          name: string
          trade_type: 'buy' | 'sell' | 'short' | 'cover'
          instrument_type?: 'stock' | 'crypto' | 'option' | 'etf' | 'forex' | 'other'
          quantity: number
          entry_price: number
          exit_price?: number | null
          entry_date: string
          exit_date?: string | null
          commission?: number
          profit_loss?: number | null
          roi_percentage?: number | null
          strategy?: string
          status?: 'open' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          portfolio_id?: string | null
          symbol?: string
          name?: string
          trade_type?: 'buy' | 'sell' | 'short' | 'cover'
          instrument_type?: 'stock' | 'crypto' | 'option' | 'etf' | 'forex' | 'other'
          quantity?: number
          entry_price?: number
          exit_price?: number | null
          entry_date?: string
          exit_date?: string | null
          commission?: number
          profit_loss?: number | null
          roi_percentage?: number | null
          strategy?: string
          status?: 'open' | 'closed'
          created_at?: string
          updated_at?: string
        }
      }
      trade_notes: {
        Row: {
          id: string
          trade_id: string
          user_id: string
          note_type: 'general' | 'strategy' | 'emotion' | 'lesson' | 'analysis'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          trade_id: string
          user_id: string
          note_type?: 'general' | 'strategy' | 'emotion' | 'lesson' | 'analysis'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          trade_id?: string
          user_id?: string
          note_type?: 'general' | 'strategy' | 'emotion' | 'lesson' | 'analysis'
          content?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
