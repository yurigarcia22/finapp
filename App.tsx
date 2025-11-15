import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
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
  CategoriesPage
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
  Profile
} from './types';
import { supabase } from './supabase';
import { AuthPage } from './components/AuthPage';

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

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);

      const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));
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
  }, [addNotification, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================================================================================
  // FUNÇÕES HANDLER PARA MODIFICAR O ESTADO
  // ==================================================================================
  const handleSaveTransaction = async (newTransaction: Omit<Transaction, 'id' | 'current_installment' | 'parent_transaction_id'>) => {
    const { category, accountId, installments, ...rest } = newTransaction;
    const account = accounts.find(acc => acc.id === accountId);

    if (account?.type === AccountType.CREDIT_CARD && installments && installments > 1) {
        // Handle installment transaction
        const transactionsToInsert = [];
        const parentId = crypto.randomUUID();
        const installmentAmount = newTransaction.amount / installments;
        const txDate = new Date(newTransaction.date + 'T12:00:00Z');

        for (let i = 1; i <= installments; i++) {
            const installmentDate = new Date(txDate);
            installmentDate.setMonth(txDate.getMonth() + i - 1);
            
            transactionsToInsert.push({
                ...rest,
                account_id: accountId,
                category_id: category?.id,
                user_id: user.id,
                description: `${newTransaction.description} (${i}/${installments})`,
                amount: installmentAmount,
                date: installmentDate.toISOString().split('T')[0],
                status: TransactionStatus.PENDING,
                parent_transaction_id: parentId,
                current_installment: i,
                installments: installments,
            });
        }

        const { error } = await supabase.from('transactions').insert(transactionsToInsert);

        if (error) {
            addNotification({ title: 'Erro', message: 'Não foi possível salvar a transação parcelada.', type: 'warning' });
            console.error(error);
            return;
        }

        // Update current open invoice with the amount of the first installment
        const { data: openInvoice } = await supabase.from('credit_invoices').select('*').eq('card_id', accountId).eq('status', 'Aberta').single();
        if (openInvoice) {
            await supabase.from('credit_invoices').update({ amount: openInvoice.amount + installmentAmount }).eq('id', openInvoice.id);
        }

    } else {
        // Handle single transaction
        const { error } = await supabase.from('transactions').insert({
            ...rest,
            account_id: accountId,
            category_id: category?.id,
            user_id: user.id
        });

        if (error) {
            addNotification({ title: 'Erro', message: 'Não foi possível salvar a transação.', type: 'warning' });
            console.error(error);
            return;
        }

        if (account?.type === AccountType.CREDIT_CARD) {
            const { data: openInvoice } = await supabase.from('credit_invoices').select('*').eq('card_id', accountId).eq('status', 'Aberta').single();
            if (openInvoice) {
                const amountChange = newTransaction.type === CategoryType.INCOME ? -newTransaction.amount : newTransaction.amount;
                await supabase.from('credit_invoices').update({ amount: openInvoice.amount + amountChange }).eq('id', openInvoice.id);
            }
        } else if (account) {
            const amountChange = newTransaction.type === CategoryType.INCOME ? newTransaction.amount : -newTransaction.amount;
            await supabase.from('accounts').update({ balance: account.balance + amountChange }).eq('id', account.id);
        }
    }

    addNotification({ title: 'Sucesso', message: 'Transação salva com sucesso!', type: 'success' });
    await fetchData();
    setTransactionModalOpen(false);
};


  const handleCreateAccount = async (newAccount: Omit<Account, 'id' | 'currency'>) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...newAccount, currency: 'BRL', user_id: user.id })
      .select()
      .single();

    if (error) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível criar a conta.',
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
      await supabase.from('credit_invoices').insert(newInvoice);
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
      addNotification({
        title: 'Erro',
        message: 'Não foi possível atualizar a conta.',
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

  const handlePayInvoice = async (
    invoiceId: string,
    paymentAccountId: string,
    amount: number
  ) => {
    const { error: invoiceError } = await supabase
      .from('credit_invoices')
      .update({ status: 'Paga' })
      .eq('id', invoiceId)
      .eq('user_id', user.id);
    if (invoiceError) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível pagar a fatura.',
        type: 'warning'
      });
      console.error(invoiceError);
      return;
    }

    const paymentTransaction: Omit<Transaction, 'id'> = {
      description: `Pagamento Fatura ${
        invoices.find(i => i.id === invoiceId)?.month
      }`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      type: CategoryType.EXPENSE,
      category: categories.find(c => c.name === 'Pagamento de Fatura')!,
      accountId: paymentAccountId,
      status: TransactionStatus.CLEARED
    };
    await handleSaveTransaction(paymentTransaction); // This will handle notifications and fetching data
    setPaymentModalOpen(false);
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

  const handleSaveCategory = async (newCategory: Omit<Category, 'id'>) => {
    const { error } = await supabase
      .from('categories')
      .insert({ ...newCategory, user_id: user.id });
    if (error) {
      addNotification({
        title: 'Erro',
        message: 'Não foi possível salvar a categoria.',
        type: 'warning'
      });
    } else {
      addNotification({
        title: 'Sucesso',
        message: 'Categoria salva com sucesso!',
        type: 'success'
      });
      await fetchData();
      setCategoryModalOpen(false);
    }
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

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)
        .eq('user_id', user.id);

      if (error) {
        addNotification({
          title: 'Erro',
          message: 'Não foi possível excluir a transação.',
          type: 'warning'
        });
        return;
      }

      const { data: account } = await supabase
        .from('accounts')
        .select('id, type, balance')
        .eq('id', transaction.accountId)
        .eq('user_id', user.id)
        .single();

      if (!account) {
        addNotification({
          title: 'Erro',
          message: 'Conta associada não encontrada. O balanço pode estar incorreto.',
          type: 'warning'
        });
        await fetchData();
        return;
      }

      if (account.type === AccountType.CREDIT_CARD) {
        const { data: openInvoice } = await supabase
          .from('credit_invoices')
          .select('id, amount')
          .eq('card_id', transaction.accountId)
          .eq('status', 'Aberta')
          .eq('user_id', user.id)
          .single();
        if (openInvoice) {
          const amountChange =
            transaction.type === CategoryType.INCOME
              ? transaction.amount
              : -transaction.amount;
          await supabase
            .from('credit_invoices')
            .update({ amount: openInvoice.amount + amountChange })
            .eq('id', openInvoice.id)
            .eq('user_id', user.id);
        }
      } else {
        const amountChange =
          transaction.type === CategoryType.INCOME
            ? -transaction.amount
            : transaction.amount;
        await supabase
          .from('accounts')
          .update({ balance: account.balance + amountChange })
          .eq('id', account.id)
          .eq('user_id', user.id);
      }

      addNotification({
        title: 'Sucesso',
        message: 'Transação excluída com sucesso!',
        type: 'success'
      });
      await fetchData();
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
          />
        );
      case 'Transações':
        return (
          <TransactionsPage
            {...pageProps}
            onDeleteTransaction={handleDeleteTransaction}
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
        onSave={handleSaveTransaction}
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
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
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