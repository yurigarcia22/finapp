

import React, { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { PlusIcon } from './components/icons';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { NotificationToasts } from './components/NotificationToasts';
import { TransactionModal } from './components/TransactionModal';
import { AccountModal } from './components/AccountModal';
import { PaymentModal } from './components/PaymentModal';
import { BudgetModal } from './components/BudgetModal';
import { RuleModal } from './components/RuleModal';
import { CategoryModal } from './components/CategoryModal';
import {
  TransactionsPage,
  BudgetsPage,
  CardsPage,
  AccountsPage,
  ReportsPage,
  RulesPage,
  SettingsPage,
  CategoriesPage,
  FixedExpensesPage,
} from './components/pages';
import {
  Account,
  AccountType,
  Category,
  CategoryType,
  Transaction,
  TransactionStatus,
  Budget,
  CreditInvoice,
  Rule,
  Profile,
  FixedExpense,
  MonthlyFixedExpense,
  OverdueData
} from './types';
import { supabase } from './supabase';
import { AuthPage } from './components/AuthPage';

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id'>[] = [
  // Despesas
  { name: 'Moradia', type: CategoryType.EXPENSE, color: '#F97316', icon: '🏡' },
  { name: 'Supermercado', type: CategoryType.EXPENSE, color: '#10B981', icon: '🛒' },
  { name: 'Transporte', type: CategoryType.EXPENSE, color: '#3B82F6', icon: '🚗' },
  { name: 'Alimentação', type: CategoryType.EXPENSE, color: '#E11D48', icon: '🍔' },
  { name: 'Saúde', type: CategoryType.EXPENSE, color: '#EF4444', icon: '💊' },
  { name: 'Lazer', type: CategoryType.EXPENSE, color: ' #8B5CF6', icon: '👕' },
  { name: 'Contas', type: CategoryType.EXPENSE, color: '#F59E0B', icon: '📞' },
  { name: 'Educação', type: CategoryType.EXPENSE, color: '#0EA5E9', icon: '🎓' },
  { name: 'Outros', type: CategoryType.EXPENSE, color: '#64748B', icon: '💸' },
  // Receitas
  { name: 'Salário', type: CategoryType.INCOME, color: '#22C55E', icon: '💼' },
  { name: 'Renda Extra', type: CategoryType.INCOME, color: '#84CC16', icon: '🎁' },
  { name: 'Investimentos', type: CategoryType.INCOME, color: '#14B8A6', icon: '📈' },
];

interface AppContentProps {
  session: Session;
  profile: Profile | null;
  refetchProfile: () => void;
  onLogout: () => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const AppContent: React.FC<AppContentProps> = ({ session, profile, refetchProfile, onLogout, theme, setTheme }) => {
  const { user } = session;
  const { addNotification } = useNotifications();
  // ==================================================================================
  // ESTADO CENTRALIZADO DA APLICAÇÃO
  // ==================================================================================
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<CreditInvoice[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [monthlyFixedExpenses, setMonthlyFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  // Estados de visibilidade dos Modais
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalForceType, setAccountModalForceType] = useState<AccountType | undefined>(undefined);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [isRuleModalOpen, setRuleModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CreditInvoice | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const seedDefaultCategories = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('categories').insert(
        DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: userId }))
    ).select();

    if (error) {
        console.error("Error seeding categories:", error);
        addNotification({ title: 'Erro', message: 'Não foi possível criar categorias padrão.', type: 'warning' });
        return [];
    }
    return data || [];
  }, [addNotification]);


  const fetchData = useCallback(async () => {
    if (!user || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (accountsError)
        throw new Error(
          `Erro ao carregar Contas: ${accountsError.message}. Verifique se a tabela e as permissões (RLS) estão corretas.`
        );

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      if (categoriesError)
        throw new Error(
          `Erro ao carregar Categorias: ${categoriesError.message}. Verifique se a tabela e as permissões (RLS) estão corretas.`
        );

      let finalCategoriesData = categoriesData || [];
      if (!categoriesError && categoriesData && categoriesData.length === 0) {
        const { count: txCount, error: txCheckError } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        const hasTransactions = !txCheckError && (txCount ?? 0) > 0;
        
        if (!hasTransactions) {
            addNotification({ title: 'Bem-vindo!', message: 'Adicionamos algumas categorias padrão para você começar.', type: 'info' });
            finalCategoriesData = await seedDefaultCategories(user.id);
        }
      }

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (transactionsError)
        throw new Error(
          `Erro ao carregar Transações: ${transactionsError.message}. Verifique as permissões (RLS).`
        );

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('credit_invoices')
        .select('*')
        .eq('user_id', user.id);
      if (invoicesError)
        throw new Error(
          `Erro ao carregar Faturas: ${invoicesError.message}. Verifique se a tabela e as permissões (RLS) estão corretas.`
        );

      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);
      if (budgetsError)
        throw new Error(
          `Erro ao carregar Orçamentos: ${budgetsError.message}. Verifique se a tabela e as permissões (RLS) estão corretas.`
        );

      const { data: rulesData, error: rulesError } = await supabase
        .from('rules')
        .select('*')
        .eq('user_id', user.id);
      if (rulesError)
        throw new Error(
          `Erro ao carregar Regras: ${rulesError.message}. Verifique se a tabela e as permissões (RLS) estão corretas.`
        );
      
      const { data: fixedExpensesData, error: fixedExpensesError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', user.id);
       if (fixedExpensesError)
        throw new Error(
          `Erro ao carregar Despesas Fixas: ${fixedExpensesError.message}. Verifique se a tabela 'fixed_expenses' e as permissões (RLS) estão corretas.`
        );
        
      const { data: monthlyFixedExpensesData, error: monthlyFixedExpensesError } = await supabase
        .from('monthly_fixed_expenses')
        .select('*')
        .eq('user_id', user.id);
      if (monthlyFixedExpensesError)
        throw new Error(
            `Erro ao carregar Despesas Fixas Mensais: ${monthlyFixedExpensesError.message}. Verifique se a tabela 'monthly_fixed_expenses' e as permissões (RLS) estão corretas.`
        );


      setAccounts(accountsData || []);
      setCategories(finalCategoriesData || []);

      const categoriesMap = new Map((finalCategoriesData || []).map(c => [c.id, c]));
      const mappedTransactions =
        transactionsData?.map((tx: any) => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          date: tx.date,
          type: tx.type,
          category: tx.category_id
            ? ((categoriesMap.get(tx.category_id) as Category | undefined) || null)
            : null,
          accountId: tx.account_id,
          status: tx.status,
          installments: tx.installments,
          current_installment: tx.current_installment,
          parent_transaction_id: tx.parent_transaction_id,
        })) || [];
      setTransactions(mappedTransactions);

      const mappedInvoices =
        invoicesData?.map((inv: any) => ({
          id: inv.id,
          cardId: inv.card_id,
          month: inv.month,
          status: inv.status,
          amount: inv.amount,
          dueDate: inv.due_date
        })) || [];
      setInvoices(mappedInvoices);

      const mappedBudgets =
        budgetsData?.map((b: any) => ({
          id: b.id,
          categoryId: b.category_id,
          amount: b.amount
        })) || [];
      setBudgets(mappedBudgets);

      setRules(rulesData || []);
      
      const mappedFixedExpenses =
        fixedExpensesData?.map((fe: any) => ({
          ...fe,
          category: fe.category_id ? categoriesMap.get(fe.category_id) || null : null,
        })) || [];
      setFixedExpenses(mappedFixedExpenses);

      const fixedExpensesMap = new Map((mappedFixedExpenses || []).map(fe => [fe.id, fe]));
      const mappedMonthlyFixedExpenses =
        monthlyFixedExpensesData?.map((mfe: any) => ({
          ...mfe,
          fixedExpense: fixedExpensesMap.get(mfe.fixed_expense_id)
        })) || [];
      setMonthlyFixedExpenses(mappedMonthlyFixedExpenses);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      addNotification({
        title: 'Erro ao carregar dados',
        message: error.message,
        type: 'warning'
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [addNotification, user?.id, seedDefaultCategories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overdueData = useMemo<OverdueData>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const overdueFixedExpenses = monthlyFixedExpenses.filter(
      (expense) =>
        expense.status === 'Não pago' && new Date(expense.due_date) < today
    );

    const overdueInvoices = invoices.filter(
      (invoice) =>
        invoice.status !== 'Paga' && new Date(invoice.dueDate) < today
    );

    return { overdueFixedExpenses, overdueInvoices };
  }, [monthlyFixedExpenses, invoices]);

  // ==================================================================================
  // FUNÇÕES HANDLER PARA MODIFICAR O ESTADO
  // ==================================================================================
  
  const updateCreditCardInvoice = useCallback(async (accountId: string, transactionDateStr: string, transactionAmount: number, dueDay: number) => {
    if (!user) return;
    const transactionDate = new Date(transactionDateStr + 'T12:00:00Z');
    
    const invoiceDueDate = new Date(Date.UTC(transactionDate.getUTCFullYear(), transactionDate.getUTCMonth() + 1, dueDay));
    const dueDateStr = invoiceDueDate.toISOString().split('T')[0];

    let { data: invoice, error: findError } = await supabase
        .from('credit_invoices')
        .select('id, amount')
        .eq('user_id', user.id)
        .eq('card_id', accountId)
        .eq('due_date', dueDateStr)
        .single();

    if (findError && findError.code !== 'PGRST116') {
        throw new Error(`Erro ao buscar fatura: ${findError.message}`);
    }

    if (invoice) {
        const newAmount = invoice.amount + transactionAmount;
        const finalAmount = Math.abs(newAmount) < 0.01 ? 0 : newAmount;

        const { error: updateError } = await supabase
            .from('credit_invoices')
            .update({ amount: finalAmount })
            .eq('id', invoice.id);
        if (updateError) throw new Error(`Erro ao atualizar fatura: ${updateError.message}`);
    } else {
        if (transactionAmount > 0) {
            const monthName = invoiceDueDate.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            
            const newInvoice = {
                card_id: accountId,
                month: capitalizedMonth,
                status: 'Aberta' as const,
                amount: transactionAmount,
                due_date: dueDateStr,
                user_id: user.id
            };
            const { error: createError } = await supabase.from('credit_invoices').insert(newInvoice);
            if (createError) throw new Error(`Erro ao criar fatura: ${createError.message}`);
        }
    }
  }, [user]);

  const handleSaveTransaction = async (newTransaction: Omit<Transaction, 'id' | 'current_installment' | 'parent_transaction_id'>, options?: { showNotification?: boolean }) => {
    const { category, accountId, installments, ...rest } = newTransaction;
    const account = accounts.find(acc => acc.id === accountId);

    if (!user) {
        addNotification({ title: 'Erro', message: 'Usuário não autenticado.', type: 'warning' });
        return null;
    }
    if (!account) {
        addNotification({ title: 'Erro', message: 'Conta não encontrada.', type: 'warning' });
        return null;
    }

    try {
        if (account.type === AccountType.CREDIT_CARD && installments && installments > 1) {
            // Installment logic
            const { due_day: dueDay } = account;
            if (!dueDay) {
                throw new Error('O cartão de crédito precisa de um dia de vencimento para registrar parcelas.');
            }

            const transactionsToInsert = [];
            const totalAmountInCents = Math.round(newTransaction.amount * 100);
            const baseInstallmentAmountInCents = Math.floor(totalAmountInCents / installments);
            const remainderInCents = totalAmountInCents % installments;
            const txDate = new Date(newTransaction.date + 'T12:00:00Z');

            for (let i = 1; i <= installments; i++) {
                const installmentDate = new Date(txDate);
                installmentDate.setUTCMonth(txDate.getUTCMonth() + i - 1);
                
                let currentInstallmentAmountInCents = baseInstallmentAmountInCents;
                if (i === 1) {
                    currentInstallmentAmountInCents += remainderInCents;
                }

                transactionsToInsert.push({
                    ...rest,
                    account_id: accountId,
                    category_id: category?.id,
                    user_id: user.id,
                    description: `${newTransaction.description} (${i}/${installments})`,
                    amount: currentInstallmentAmountInCents / 100,
                    date: installmentDate.toISOString().split('T')[0],
                    status: TransactionStatus.PENDING,
                });
            }

            const { error: txError } = await supabase.from('transactions').insert(transactionsToInsert);
            if (txError) throw new Error(`Não foi possível salvar as transações parceladas: ${txError.message}`);

            // Update invoices for each installment
            for (const tx of transactionsToInsert) {
                const amountChange = tx.type === CategoryType.INCOME ? -tx.amount : tx.amount;
                await updateCreditCardInvoice(accountId, tx.date, amountChange, dueDay);
            }

            // Update card balance with total purchase amount
            const totalAmountChange = newTransaction.type === CategoryType.INCOME ? -newTransaction.amount : newTransaction.amount;
            await supabase.from('accounts').update({ balance: account.balance + totalAmountChange }).eq('id', account.id);
            
            if (options?.showNotification !== false) {
                addNotification({ title: 'Sucesso', message: 'Transação parcelada salva com sucesso!', type: 'success' });
            }
            await fetchData();
            setTransactionModalOpen(false);
            return null; // No single ID for installment purchases
        
        } else {
            // Single transaction logic
            const { data, error } = await supabase.from('transactions').insert({
                ...rest,
                account_id: accountId,
                category_id: category?.id,
                user_id: user.id
            }).select('id').single();

            if (error || !data) {
                throw new Error(`Não foi possível salvar a transação: ${error?.message}`);
            }
            
            const amountChange = newTransaction.type === CategoryType.INCOME ? newTransaction.amount : -newTransaction.amount;

            if (account.type === AccountType.CREDIT_CARD) {
                const { due_day: dueDay } = account;
                 if (!dueDay) {
                    throw new Error('O cartão de crédito precisa de um dia de vencimento.');
                 }
                await updateCreditCardInvoice(accountId, newTransaction.date, -amountChange, dueDay);
                // For expenses, amountChange is negative, so we subtract it to increase the balance (debt)
                await supabase.from('accounts').update({ balance: account.balance - amountChange }).eq('id', account.id);
            } else {
                await supabase.from('accounts').update({ balance: account.balance + amountChange }).eq('id', account.id);
            }
            
            if (options?.showNotification !== false) {
                addNotification({ title: 'Sucesso', message: 'Transação salva com sucesso!', type: 'success' });
            }
            await fetchData();
            setTransactionModalOpen(false);
            return data.id;
        }

    } catch (err: any) {
        addNotification({ title: 'Erro', message: err.message, type: 'warning' });
        console.error(err);
        return null;
    }
  };


  const handleCreateAccount = async (newAccount: Omit<Account, 'id' | 'currency'>) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...newAccount, currency: 'BRL', user_id: user.id })
      .select()
      .single();

    if (error) {
      let userMessage = `Não foi possível criar a conta. Erro: ${error.message}`;
      if (error.message.includes('column "due_day" of relation "accounts" does not exist')) {
          userMessage = 'Falha ao criar: A coluna "due_day" não existe na sua tabela "accounts". Por favor, adicione uma coluna do tipo "number" ou "int2" para armazenar o dia do vencimento e tente novamente.';
      }

      addNotification({
        title: 'Erro de Banco de Dados',
        message: userMessage,
        type: 'warning'
      });
      console.error(error);
      return;
    }

    if (data && newAccount.type === AccountType.CREDIT_CARD) {
      const now = new Date();
      const currentMonthName = now.toLocaleString('pt-BR', { month: 'long' });
      const capitalizedMonth =
        currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

      const dueDay = newAccount.due_day || 15;
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);

      const newInvoice = {
        card_id: data.id,
        month: capitalizedMonth,
        status: 'Aberta' as const,
        amount: 0,
        due_date: dueDate.toISOString().split('T')[0],
        user_id: user.id
      };

      const { error: invoiceError } = await supabase.from('credit_invoices').insert(newInvoice);

      if (invoiceError) {
        // Rollback: delete the account that was just created to avoid inconsistent state.
        await supabase.from('accounts').delete().eq('id', data.id);
        
        addNotification({ 
            title: 'Erro de Sincronização', 
            message: 'A conta do cartão foi criada, mas a fatura inicial falhou. A criação foi revertida. Verifique a configuração da sua tabela `credit_invoices` (ex: RLS).', 
            type: 'warning' 
        });
        console.error("Invoice creation error:", invoiceError);
        return;
      }
    }

    addNotification({
      title: 'Sucesso',
      message: 'Conta criada com sucesso!',
      type: 'success'
    });
    await fetchData();
    setAccountModalOpen(false);
  };

  const handleUpdateAccount = async (updatedAccount: Account) => {
    const { error } = await supabase
      .from('accounts')
      .update({
        name: updatedAccount.name,
        balance: updatedAccount.balance,
        limit: updatedAccount.limit,
        due_day: updatedAccount.due_day
      })
      .eq('id', updatedAccount.id)
      .eq('user_id', user.id);

    if (error) {
      let userMessage = `Não foi possível atualizar a conta. Erro: ${error.message}`;
      if (error.message.includes('column "due_day" of relation "accounts" does not exist')) {
          userMessage = 'Falha ao atualizar: A coluna "due_day" não existe na sua tabela "accounts". Por favor, adicione uma coluna do tipo "number" ou "int2" para armazenar o dia do vencimento.';
      }
      addNotification({
        title: 'Erro de Banco de Dados',
        message: userMessage,
        type: 'warning'
      });
      console.error(error);
      return;
    }

    addNotification({
      title: 'Sucesso',
      message: 'Conta atualizada com sucesso!',
      type: 'success'
    });
    await fetchData();
    setEditingAccount(null);
    setAccountModalOpen(false);
  };

  const handleDeleteAccount = async (accountId: string) => {
    const { data: associatedTransactions, error: txCheckError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('account_id', accountId)
      .eq('user_id', user.id);
    const { data: associatedInvoices, error: invoiceCheckError } = await supabase
      .from('credit_invoices')
      .select('id', { count: 'exact' })
      .eq('card_id', accountId)
      .eq('user_id', user.id);

    const txCount = associatedTransactions?.length || 0;
    const invoiceCount = associatedInvoices?.length || 0;

    if (txCheckError || invoiceCheckError) {
      addNotification({
        title: 'Erro de Verificação',
        message: 'Não foi possível verificar os dados associados à conta.',
        type: 'warning'
      });
      return;
    }

    let confirmMessage = 'Tem certeza que deseja excluir esta conta?';
    if (txCount > 0 || invoiceCount > 0) {
      confirmMessage += `\n\nATENÇÃO: Esta ação é permanente e também excluirá:\n- ${txCount} transações associadas\n- ${invoiceCount} faturas associadas`;
    }

    if (window.confirm(confirmMessage)) {
      if (txCount > 0) {
        await supabase
          .from('transactions')
          .delete()
          .eq('account_id', accountId)
          .eq('user_id', user.id);
      }
      if (invoiceCount > 0) {
        await supabase
          .from('credit_invoices')
          .delete()
          .eq('card_id', accountId)
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) {
        addNotification({
          title: 'Erro ao Excluir',
          message: `Não foi possível excluir a conta.`,
          type: 'warning'
        });
      } else {
        addNotification({
          title: 'Sucesso',
          message: 'Conta e dados associados excluídos com sucesso.',
          type: 'success'
        });
        await fetchData();
      }
    }
  };

  const openAddAccountModal = (type?: AccountType) => {
    setEditingAccount(null);
    setAccountModalForceType(type);
    setAccountModalOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountModalForceType(undefined);
    setAccountModalOpen(true);
  };

  const handlePayInvoice = async (invoiceId: string, paymentAccountId: string, amount: number) => {
    if (!user) return;
    const invoiceToPay = invoices.find(i => i.id === invoiceId);
    if (!invoiceToPay) return;

    const { error: invoiceError } = await supabase
      .from('credit_invoices')
      .update({ status: 'Paga' })
      .eq('id', invoiceId)
      .eq('user_id', user.id);

    if (invoiceError) {
        addNotification({ title: 'Erro', message: 'Não foi possível atualizar o status da fatura.', type: 'warning' });
        return;
    }

    const cardAccount = accounts.find(acc => acc.id === invoiceToPay.cardId);
    if (cardAccount) {
        await supabase
            .from('accounts')
            .update({ balance: cardAccount.balance - amount })
            .eq('id', cardAccount.id)
            .eq('user_id', user.id);
    }
    
    // The payment transaction itself is handled by handleSaveTransaction, which will update the payment account's balance
    await handleSaveTransaction({
        description: `Pagamento Fatura ${invoiceToPay.month}`,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        type: CategoryType.EXPENSE,
        category: categories.find(c => c.name === 'Contas')!, // Find a more appropriate category if needed
        accountId: paymentAccountId,
        status: TransactionStatus.CLEARED
    });

    setPaymentModalOpen(false);
    // handleSaveTransaction already calls fetchData
  };

  const openPaymentModal = (invoice: CreditInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentModalOpen(true);
  };

  const handleSaveBudget = async (newBudget: Omit<Budget, 'id'>) => {
    const { error } = await supabase.from('budgets').insert({
      category_id: newBudget.categoryId,
      amount: newBudget.amount,
      user_id: user.id
    });
    if (error) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível salvar o orçamento.',
        type: 'warning'
      });
    } else {
      addNotification({
        title: 'Sucesso',
        message: 'Orçamento salvo com sucesso!',
        type: 'success'
      });
      await fetchData();
      setBudgetModalOpen(false);
    }
  };

  const handleSaveRule = async (newRule: Omit<Rule, 'id'>) => {
    const { error } = await supabase
      .from('rules')
      .insert({ ...newRule, user_id: user.id });
    if (error) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível salvar a regra.',
        type: 'warning'
      });
    } else {
      addNotification({
        title: 'Sucesso',
        message: 'Regra salva com sucesso!',
        type: 'success'
      });
      await fetchData();
      setRuleModalOpen(false);
    }
  };

  const handleSaveOrUpdateCategory = async (categoryData: Omit<Category, 'id'> | Category) => {
    if ('id' in categoryData) {
        // Update logic
        const { id, name, type, color, icon } = categoryData;
        const { error } = await supabase
            .from('categories')
            .update({ name, type, color, icon })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            addNotification({ title: 'Erro', message: 'Não foi possível atualizar a categoria.', type: 'warning' });
        } else {
            addNotification({ title: 'Sucesso', message: 'Categoria atualizada!', type: 'success' });
        }
    } else {
        // Insert logic
        const { error } = await supabase
            .from('categories')
            .insert({ ...categoryData, user_id: user.id });
        if (error) {
            addNotification({ title: 'Erro', message: 'Não foi possível salvar a categoria.', type: 'warning' });
        } else {
            addNotification({ title: 'Sucesso', message: 'Categoria salva com sucesso!', type: 'success' });
        }
    }
    await fetchData();
    setCategoryModalOpen(false);
    setEditingCategory(null);
  };
  
  const handleEditCategory = (category: Category) => {
      setEditingCategory(category);
      setCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { data: associatedTransactions, error: checkTxError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('category_id', categoryId)
      .eq('user_id', user.id);
    const { data: associatedBudgets, error: checkBudgetError } = await supabase
      .from('budgets')
      .select('id', { count: 'exact' })
      .eq('category_id', categoryId)
      .eq('user_id', user.id);

    if (checkTxError || checkBudgetError) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível verificar o uso da categoria.',
        type: 'warning'
      });
      return;
    }

    const txCount = associatedTransactions?.length || 0;
    const budgetCount = associatedBudgets?.length || 0;

    if (txCount > 0 || budgetCount > 0) {
      let confirmMessage =
        'Esta categoria está sendo usada. Deseja continuar com a exclusão?\n\nATENÇÃO:';
      if (txCount > 0)
        confirmMessage += `\n- ${txCount} transações serão desvinculadas (não excluídas).`;
      if (budgetCount > 0)
        confirmMessage += `\n- ${budgetCount} orçamentos associados serão PERMANENTEMENTE excluídos.`;

      if (window.confirm(confirmMessage)) {
        if (budgetCount > 0) {
          await supabase
            .from('budgets')
            .delete()
            .eq('category_id', categoryId)
            .eq('user_id', user.id);
        }
        if (txCount > 0) {
          await supabase
            .from('transactions')
            .update({ category_id: null })
            .eq('category_id', categoryId)
            .eq('user_id', user.id);
        }
      } else {
        return; // User cancelled
      }
    }

    if (
      window.confirm(
        'Tem certeza que deseja excluir esta categoria? A ação não pode ser desfeita.'
      )
    ) {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user.id);
      if (deleteError) {
        addNotification({
          title: 'Erro',
          message: `Não foi possível excluir a categoria.`,
          type: 'warning'
        });
      } else {
        addNotification({
          title: 'Sucesso',
          message: 'Categoria excluída com sucesso!',
          type: 'success'
        });
        await fetchData();
      }
    }
  };

  const toggleRule = async (rule: Rule) => {
    const { error } = await supabase
      .from('rules')
      .update({ enabled: !rule.enabled })
      .eq('id', rule.id)
      .eq('user_id', user.id);
    if (error) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível alterar a regra.',
        type: 'warning'
      });
    } else {
      await fetchData();
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta regra?')) {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', user.id);
      if (error) {
        addNotification({
          title: 'Erro',
          message: 'Não foi possível excluir a regra.',
          type: 'warning'
        });
      } else {
        addNotification({
          title: 'Sucesso',
          message: 'Regra excluída com sucesso!',
          type: 'success'
        });
        await fetchData();
      }
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction & { isGroup?: boolean }) => {
    if (!user) return;

    let transactionsToDelete: Transaction[] = [];
    let isInstallmentDeletion = false;

    // It's a summarized/grouped transaction from the main list
    if (transaction.isGroup && transaction.installments) {
        const baseDesc = transaction.description;
        const totalInstallments = transaction.installments;

        transactionsToDelete = transactions.filter(tx => {
            const siblingMatch = tx.description.match(/(.+) \((\d+)\/(\d+)\)$/);
            return siblingMatch && 
                   siblingMatch[1] === baseDesc && 
                   parseInt(siblingMatch[3], 10) === totalInstallments && 
                   tx.accountId === transaction.accountId;
        });
        isInstallmentDeletion = transactionsToDelete.length > 0;
    } else {
        // It's a single transaction, which might be one part of an installment
        const installmentMatch = transaction.description.match(/(.+) \((\d+)\/(\d+)\)$/);
        if (installmentMatch) {
            const [, baseDesc, , totalInstallmentsStr] = installmentMatch;
            const allSiblings = transactions.filter(tx => {
                const siblingMatch = tx.description.match(/(.+) \((\d+)\/(\d+)\)$/);
                return siblingMatch && siblingMatch[1] === baseDesc && siblingMatch[3] === totalInstallmentsStr && tx.accountId === transaction.accountId;
            });
            if (allSiblings.length > 0) {
                transactionsToDelete = allSiblings;
                isInstallmentDeletion = true;
            }
        }
    }
    
    // If it's a regular, non-installment transaction
    if (transactionsToDelete.length === 0) {
        transactionsToDelete.push(transaction);
        isInstallmentDeletion = false;
    }

    const confirmMessage = isInstallmentDeletion
      ? `Tem certeza que deseja excluir esta compra parcelada e todas as suas ${transactionsToDelete.length} parcelas?`
      : 'Tem certeza que deseja excluir esta transação?';

    if (!window.confirm(confirmMessage)) return;

    try {
      const account = accounts.find(acc => acc.id === transaction.accountId);
      if (!account) throw new Error('Conta associada não encontrada.');
      
      const totalAmountReversed = transactionsToDelete.reduce((sum, tx) => {
        return sum + (tx.type === CategoryType.INCOME ? -tx.amount : tx.amount);
      }, 0);

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .in('id', transactionsToDelete.map(t => t.id));

      if (deleteError) throw deleteError;

      if (account.type === AccountType.CREDIT_CARD) {
        // Revert card balance
        await supabase.from('accounts').update({ balance: account.balance - totalAmountReversed }).eq('id', account.id);
        
        // Revert invoice amounts
        for (const tx of transactionsToDelete) {
          const amountChange = tx.type === CategoryType.INCOME ? tx.amount : -tx.amount;
          await updateCreditCardInvoice(tx.accountId, tx.date, amountChange, account.due_day!);
        }
      } else {
        // Revert regular account balance
        await supabase.from('accounts').update({ balance: account.balance - totalAmountReversed }).eq('id', account.id);
      }
      
      addNotification({ title: 'Sucesso', message: 'Transação(ões) excluída(s) com sucesso!', type: 'success' });
      await fetchData();

    } catch (err: any) {
      console.error(err);
      addNotification({ title: 'Erro', message: `Não foi possível excluir a transação: ${err.message}`, type: 'warning' });
    }
  };


  const handleSaveOrUpdateFixedExpense = async (expenseData: Omit<FixedExpense, 'id' | 'is_active' | 'category'> | FixedExpense) => {
    if ('id' in expenseData) {
        // Lógica de atualização
        const { id, name, default_amount, due_day, category_id, notes } = expenseData;
        const { error } = await supabase
            .from('fixed_expenses')
            .update({ name, default_amount, due_day, category_id, notes })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            addNotification({ title: 'Erro', message: 'Não foi possível atualizar a despesa fixa.', type: 'warning' });
            console.error('Error updating fixed expense:', error);
        } else {
            addNotification({ title: 'Sucesso', message: 'Despesa fixa atualizada!', type: 'success' });
            await fetchData();
        }
    } else {
        // Lógica de inserção
        const { error } = await supabase
            .from('fixed_expenses')
            .insert({ ...expenseData, is_active: true, user_id: user.id });

        if (error) {
            addNotification({ title: 'Erro', message: 'Não foi possível salvar a despesa fixa.', type: 'warning' });
            console.error('Error saving fixed expense:', error);
        } else {
            addNotification({ title: 'Sucesso', message: 'Despesa fixa criada com sucesso!', type: 'success' });
            await fetchData();
        }
    }
  };
  
  const handleUpdateMonthlyFixedExpense = async (updatedExpense: { id: string; amount: number }) => {
      const { error } = await supabase
          .from('monthly_fixed_expenses')
          .update({ amount: updatedExpense.amount })
          .eq('id', updatedExpense.id)
          .eq('user_id', user.id);

      if (error) {
          addNotification({ title: 'Erro', message: 'Não foi possível atualizar a despesa deste mês.', type: 'warning' });
          console.error('Error updating monthly fixed expense:', error);
      } else {
          addNotification({ title: 'Sucesso', message: 'Despesa do mês atualizada!', type: 'success' });
          await fetchData();
      }
  };
  
  const handleDeleteFixedExpense = async (monthlyExpense: MonthlyFixedExpense, mode: 'this' | 'all') => {
      if (mode === 'this') {
          const { error } = await supabase
              .from('monthly_fixed_expenses')
              .delete()
              .eq('id', monthlyExpense.id)
              .eq('user_id', user.id);
          
          if (error) {
               addNotification({ title: 'Erro', message: 'Não foi possível apagar a despesa deste mês.', type: 'warning' });
          } else {
               addNotification({ title: 'Sucesso', message: 'Despesa do mês apagada.', type: 'success' });
               await fetchData();
          }
      } else { // 'all'
          // A exclusão da despesa principal deve, idealmente, cascatear e excluir as mensais (configuração no DB).
          const { error } = await supabase
              .from('fixed_expenses')
              .delete()
              .eq('id', monthlyExpense.fixed_expense_id)
              .eq('user_id', user.id);
          
          if (error) {
               addNotification({ title: 'Erro', message: 'Não foi possível apagar a despesa fixa permanentemente.', type: 'warning' });
          } else {
               addNotification({ title: 'Sucesso', message: 'Despesa fixa e suas ocorrências foram apagadas.', type: 'success' });
               await fetchData();
          }
      }
  };

  const renderPage = () => {
    const pageProps = { accounts, categories, transactions };
    switch (currentPage) {
      case 'Dashboard':
        return (
          <Dashboard
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            invoices={invoices}
            overdueData={overdueData}
          />
        );
      case 'Transações':
        return (
          <TransactionsPage
            {...pageProps}
            onDeleteTransaction={handleDeleteTransaction}
          />
        );
      case 'Fixas':
        return (
            <FixedExpensesPage 
                user={user}
                fixedExpenses={fixedExpenses}
                monthlyFixedExpenses={monthlyFixedExpenses}
                categories={categories}
                accounts={accounts.filter(acc => acc.type !== AccountType.CREDIT_CARD)}
                onSaveTransaction={handleSaveTransaction}
                onDataNeedsRefresh={fetchData}
                onSaveOrUpdateFixedExpense={handleSaveOrUpdateFixedExpense}
                onUpdateMonthlyFixedExpense={handleUpdateMonthlyFixedExpense}
                onDeleteFixedExpense={handleDeleteFixedExpense}
                overdueData={overdueData}
            />
        );
      case 'Orçamentos':
        return (
          <BudgetsPage
            budgets={budgets}
            transactions={transactions}
            categories={categories}
            onAddBudget={() => setBudgetModalOpen(true)}
          />
        );
      case 'Cartões':
        return (
          <CardsPage
            accounts={accounts}
            invoices={invoices}
            onPayInvoice={openPaymentModal}
            transactions={transactions}
            onAddCard={() => openAddAccountModal(AccountType.CREDIT_CARD)}
            onEditCard={handleEditAccount}
            onDeleteCard={handleDeleteAccount}
            overdueData={overdueData}
          />
        );
      case 'Contas':
        return (
          <AccountsPage
            accounts={accounts}
            onAddAccount={() => openAddAccountModal()}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      case 'Relatórios':
        return <ReportsPage transactions={transactions} />;
      case 'Regras':
        return (
          <RulesPage
            rules={rules}
            onAddRule={() => setRuleModalOpen(true)}
            onToggleRule={toggleRule}
            onDeleteRule={handleDeleteRule}
          />
        );
      case 'Categorias':
        return (
          <CategoriesPage
            categories={categories}
            onAddCategory={() => setCategoryModalOpen(true)}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'Configurações':
        return (
          <SettingsPage
            user={user}
            profile={profile}
            onProfileUpdate={refetchProfile}
            theme={theme}
            setTheme={setTheme}
          />
        );
      default:
        return (
          <Dashboard
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            invoices={invoices}
            overdueData={overdueData}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={onLogout}
        theme={theme}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          profile={profile}
          setCurrentPage={setCurrentPage}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <svg
                className="animate-spin -ml-1 mr-3 h-8 w-8 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-lg text-muted-foreground">Carregando dados...</span>
            </div>
          ) : (
            renderPage()
          )}
        </main>
      </div>
      <button
        onClick={() => setTransactionModalOpen(true)}
        className="fixed bottom-8 right-8 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all duration-300 ease-in-out hover:scale-110 z-30"
        aria-label="Adicionar Nova Transação"
      >
        <PlusIcon className="h-6 w-6" />
      </button>
      <NotificationToasts />

      {/* MODAIS */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onSave={(tx) => handleSaveTransaction(tx)}
        accounts={accounts}
        categories={categories}
      />
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setAccountModalOpen(false);
          setEditingAccount(null);
          setAccountModalForceType(undefined);
        }}
        onSave={accountData => {
          if ('id' in accountData) {
            handleUpdateAccount(accountData as Account);
          } else {
            handleCreateAccount(
              accountData as Omit<Account, 'id' | 'currency'>
            );
          }
        }}
        accountToEdit={editingAccount}
        forceType={accountModalForceType}
      />
      {selectedInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedInvoice(null);
          }}
          onSave={handlePayInvoice}
          invoice={selectedInvoice}
          paymentAccounts={accounts.filter(
            acc => acc.type !== AccountType.CREDIT_CARD
          )}
        />
      )}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        onSave={handleSaveBudget}
        categories={categories.filter(c => c.type === CategoryType.EXPENSE)}
      />
      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        onSave={handleSaveRule}
      />
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
            setCategoryModalOpen(false);
            setEditingCategory(null);
        }}
        onSave={handleSaveOrUpdateCategory}
        categoryToEdit={editingCategory}
      />
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchProfile = useCallback(async (user: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile(data);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }

        if (ignore) return;

        const currentSession = data?.session ?? null;
        setSession(currentSession);

        if (currentSession) {
          await fetchProfile(currentSession.user);
        } else {
          setProfile(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const loadingSpinner = (
    <div className="flex justify-center items-center h-screen bg-background">
      <svg
        className="animate-spin h-10 w-10 text-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );

  if (loading) {
    return loadingSpinner;
  }

  return (
    <NotificationProvider>
      <Suspense fallback={loadingSpinner}>
        {!session ? (
          <AuthPage />
        ) : (
          <AppContent
            key={session.user.id}
            session={session}
            profile={profile}
            refetchProfile={() =>
              session.user ? fetchProfile(session.user) : Promise.resolve()
            }
            onLogout={handleLogout}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </Suspense>
    </NotificationProvider>
  );
};

export default App;