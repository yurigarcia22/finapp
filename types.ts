
export enum AccountType {
  WALLET = 'wallet',
  CHECKING = 'checking',
  SAVINGS = 'savings',
  INVESTMENT = 'investment',
  CREDIT_CARD = 'credit_card',
  LOAN = 'loan',
}

export enum CategoryType {
  EXPENSE = 'expense',
  INCOME = 'income',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CLEARED = 'cleared',
  RECONCILED = 'reconciled',
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  limit?: number;
  institution?: string;
  currency: string;
  due_day?: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: CategoryType;
  category: Category | null;
  accountId: string;
  status: TransactionStatus;
  installments?: number;
  current_installment?: number;
  parent_transaction_id?: string | null;
}

export interface CreditInvoice {
  id: string;
  cardId: string;
  month: string;
  status: 'Aberta' | 'Fechada' | 'Paga';
  amount: number;
  dueDate: string;
}

export interface KpiData {
    title: string;
    value: string;
    change?: number;
    changeType?: 'increase' | 'decrease';
}

export interface Budget {
    id: string;
    categoryId: string;
    amount: number;
}

export interface Rule {
    id: string;
    name: string;
    conditions: string;
    enabled: boolean;
}

export interface UpcomingBill {
    id: string;
    name: string;
    dueDate: string;
    amount: number;
    logoUrl: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  timestamp: string;
}

export interface MonthlySummaryData {
    month: string;
    receitas: number;
    despesas: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  updated_at?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  default_amount: number;
  due_day: number;
  category_id: string | null;
  notes: string | null;
  is_active: boolean;
  category?: Category | null;
  created_at?: string;
}

export interface MonthlyFixedExpense {
  id: string;
  fixed_expense_id: string;
  month: string; // YYYY-MM
  amount: number;
  status: 'Pago' | 'Não pago';
  due_date: string;
  transaction_id: string | null;
  fixedExpense?: FixedExpense;
}

export interface OverdueData {
  overdueFixedExpenses: MonthlyFixedExpense[];
  overdueInvoices: CreditInvoice[];
}