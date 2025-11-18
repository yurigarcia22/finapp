





import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { User } from '@supabase/supabase-js';
import {
    Account,
    AccountType,
    Category,
    CategoryType,
    Transaction,
    TransactionStatus,
    CreditInvoice,
    Budget,
    Rule,
    Profile,
    FixedExpense,
    MonthlyFixedExpense,
    OverdueData
} from '../types';
import {
    FilterIcon,
    UploadIcon,
    DownloadIcon,
    EditIcon,
    Trash2Icon,
    CreditCardIcon,
    WalletIcon,
    PlusCircleIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    TagIcon,
    ChevronDownIcon,
    SunIcon,
    MoonIcon,
    MoreVerticalIcon,
    ClipboardListIcon,
    XIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    AlertTriangleIcon
} from './icons';
import { CategoryPieChart } from './charts/CategoryPieChart';
import { MonthlySummaryBarChart } from './charts/MonthlySummaryBarChart';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../supabase';

const translateAccountType = (type: AccountType): string => {
    switch (type) {
        case AccountType.CHECKING: return 'Conta Corrente';
        case AccountType.SAVINGS: return 'Poupança';
        case AccountType.WALLET: return 'Carteira';
        case AccountType.INVESTMENT: return 'Investimento';
        case AccountType.CREDIT_CARD: return 'Cartão de Crédito';
        case AccountType.LOAN: return 'Empréstimo';
        default: return (type as string).replace('_', ' ');
    }
};

const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

// ==================================================================================
// COMPONENTES UTILITÁRIOS
// ==================================================================================
const PageWrapper: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <div className="text-foreground animate-element">
        <h1 className="text-3xl font-bold mb-8">{title}</h1>
        {children}
    </div>
);

const ActionButton: React.FC<{
    icon: React.ElementType;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'primary' | 'secondary';
}> = ({ icon: Icon, children, onClick, className = '', variant = 'secondary' }) => {
    const baseClasses = 'flex items-center font-medium py-2 px-4 rounded-lg transition-colors duration-200';
    const variantClasses = {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
    };

    return (
        <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            <Icon className="h-5 w-5 mr-2" />
            {children}
        </button>
    );
};

// ==================================================================================
// PÁGINA DE TRANSAÇÕES
// ==================================================================================
interface TransactionsPageProps {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    onDeleteTransaction: (transaction: Transaction & { isGroup?: boolean }) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
    transactions,
    accounts,
    onDeleteTransaction
}) => {
    const [filters, setFilters] = useState({
        type: 'all',
        accountId: 'all',
        datePreset: 'all',
        startDate: '',
        endDate: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const datePresets = [
        { key: 'all', label: 'Tudo' },
        { key: 'today', label: 'Hoje' },
        { key: '7days', label: 'Últimos 7 dias' },
        { key: 'thisMonth', label: 'Este Mês' },
        { key: 'lastMonth', label: 'Mês Passado' },
        { key: 'custom', label: 'Personalizado' }
    ];

    const processedTransactions = useMemo(() => {
        const installmentGroups: { [key: string]: Transaction[] } = {};
        const singleTransactions: Transaction[] = [];

        transactions.forEach(tx => {
            const match = typeof tx.description === 'string' && tx.description.match(/(.+) \((\d+)\/(\d+)\)$/);
            if (match) {
                const [, baseDesc, , total] = match;
                const key = `${baseDesc}_${total}_${tx.accountId}`;
                if (!installmentGroups[key]) {
                    installmentGroups[key] = [];
                }
                installmentGroups[key].push(tx);
            } else {
                singleTransactions.push(tx);
            }
        });

        const summarizedInstallments = Object.values(installmentGroups).map(group => {
            group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const representative = group[0];
            const totalAmount = group.reduce((sum, tx) => sum + tx.amount, 0);
            const descMatch = representative.description.match(/(.+) \(\d+\/\d+\)$/);
            
            return {
                ...representative,
                id: representative.id, // Use the ID of the first installment as the key for deletion logic
                description: descMatch ? descMatch[1] : representative.description,
                amount: totalAmount,
                installments: group.length,
                isGroup: true,
            };
        });
        
        const combined = [...singleTransactions, ...summarizedInstallments];
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return combined;
    }, [transactions]);


    const handleDatePresetChange = (preset: string) => {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        let start = '';
        let end = new Date(now).toISOString().split('T')[0];

        if (preset !== 'all' && preset !== 'custom') {
            switch (preset) {
                case 'today': {
                    start = new Date(now).toISOString().split('T')[0];
                    break;
                }
                case '7days': {
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(now.getDate() - 6);
                    start = sevenDaysAgo.toISOString().split('T')[0];
                    break;
                }
                case 'thisMonth': {
                    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    start = firstDayThisMonth.toISOString().split('T')[0];
                    break;
                }
                case 'lastMonth': {
                    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    start = firstDayLastMonth.toISOString().split('T')[0];
                    end = lastDayLastMonth.toISOString().split('T')[0];
                    break;
                }
            }
            setFilters(prev => ({ ...prev, datePreset: preset, startDate: start, endDate: end }));
        } else {
            setFilters(prev => ({
                ...prev,
                datePreset: preset,
                startDate: preset === 'all' ? '' : prev.startDate,
                endDate: preset === 'all' ? '' : prev.endDate
            }));
        }
    };

    const filteredTransactions = useMemo(() => {
        return processedTransactions.filter(tx => {
            if (!tx || !tx.date) return false;
            const txDateOnly = tx.date.substring(0, 10);

            if (filters.type !== 'all' && tx.type !== filters.type) return false;
            if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) return false;
            if (filters.startDate && txDateOnly < filters.startDate) return false;
            if (filters.endDate && txDateOnly > filters.endDate) return false;

            return true;
        });
    }, [processedTransactions, filters]);

    const handleFilterChange = (key: 'type' | 'accountId' | 'startDate' | 'endDate', value: string) => {
        const isDateChange = key === 'startDate' || key === 'endDate';
        setFilters(prev => ({
            ...prev,
            [key]: value,
            datePreset: isDateChange ? 'custom' : prev.datePreset
        }));
    };

    const clearFilters = () => {
        setFilters({
            type: 'all',
            accountId: 'all',
            datePreset: 'all',
            startDate: '',
            endDate: ''
        });
    };

    const statusMap: { [key in TransactionStatus]: { text: string; color: string } } = {
        [TransactionStatus.PENDING]: { text: 'Pendente', color: 'bg-yellow-500' },
        [TransactionStatus.CLEARED]: { text: 'Confirmado', color: 'bg-green-500' },
        [TransactionStatus.RECONCILED]: { text: 'Conciliado', color: 'bg-blue-500' }
    };

    const getAccountName = (accountId: string) =>
        accounts.find(a => a.id === accountId)?.name || 'N/A';

    return (
        <PageWrapper title="Transações">
            <div className="space-y-6">
                <div className="flex justify-end space-x-3">
                    <ActionButton icon={FilterIcon} onClick={() => setShowFilters(!showFilters)}>
                        Filtrar
                    </ActionButton>
                    <ActionButton icon={UploadIcon}>Importar</ActionButton>
                    <ActionButton icon={DownloadIcon}>Exportar</ActionButton>
                </div>

                {showFilters && (
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-4 animate-element">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                    Tipo
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={e => handleFilterChange('type', e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md p-2 text-foreground"
                                >
                                    <option value="all">Todos</option>
                                    <option value={CategoryType.INCOME}>Receitas</option>
                                    <option value={CategoryType.EXPENSE}>Despesas</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                    Conta
                                </label>
                                <select
                                    value={filters.accountId}
                                    onChange={e => handleFilterChange('accountId', e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md p-2 text-foreground"
                                >
                                    <option value="all">Todas as Contas</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-2">
                                Período
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {datePresets.map(preset => (
                                    <button
                                        key={preset.key}
                                        onClick={() => handleDatePresetChange(preset.key)}
                                        className={`px-3 py-1 rounded-md text-sm transition-colors ${
                                            filters.datePreset === preset.key
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary text-secondary-foreground hover:bg-accent'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {filters.datePreset === 'custom' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                                        Data Início
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.startDate}
                                        onChange={e => handleFilterChange('startDate', e.target.value)}
                                        className="w-full bg-secondary border border-border rounded-md p-2 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                                        Data Fim
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.endDate}
                                        onChange={e => handleFilterChange('endDate', e.target.value)}
                                        className="w-full bg-secondary border border-border rounded-md p-2 text-foreground"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={clearFilters}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-card rounded-xl border border-border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted-foreground">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="p-4 w-12" />
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Descrição
                                    </th>
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Categoria
                                    </th>
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Data
                                    </th>
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Conta
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-right font-medium"
                                    >
                                        Valor
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-center font-medium"
                                    >
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((tx: any) => (
                                    <tr
                                        key={tx.id}
                                        className="border-b border-border hover:bg-secondary"
                                    >
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                <span
                                                    className={`h-2.5 w-2.5 rounded-full ${statusMap[tx.status].color}`}
                                                    title={statusMap[tx.status].text}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                                            {tx.description}
                                            {tx.isGroup && (
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({tx.installments}x de {formatCurrency(tx.amount / tx.installments)})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full mr-2"
                                                    style={{
                                                        backgroundColor:
                                                            tx.category?.color || '#808080'
                                                    }}
                                                />
                                                {tx.category?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(tx.date).toLocaleDateString('pt-BR', {
                                                timeZone: 'UTC',
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getAccountName(tx.accountId)}
                                        </td>
                                        <td
                                            className={`px-6 py-4 text-right font-semibold ${
                                                tx.type === CategoryType.INCOME
                                                    ? 'text-green-500'
                                                    : 'text-foreground'
                                            }`}
                                        >
                                            {tx.type === CategoryType.EXPENSE ? '-' : ''}
                                            {formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center space-x-3">
                                                <button className="text-muted-foreground hover:text-foreground">
                                                    <EditIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteTransaction(tx)}
                                                    className="text-muted-foreground hover:text-red-500"
                                                >
                                                    <Trash2Icon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE CONTAS
// ==================================================================================
interface AccountsPageProps {
    accounts: Account[];
    onAddAccount: () => void;
    onEditAccount: (account: Account) => void;
    onDeleteAccount: (accountId: string) => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
    accounts,
    onAddAccount,
    onEditAccount,
    onDeleteAccount
}) => {
    const regularAccounts = accounts.filter(acc => acc.type !== AccountType.CREDIT_CARD);

    const accountIcons: { [key in AccountType]: React.ReactElement } = {
        [AccountType.CHECKING]: <WalletIcon className="h-6 w-6 text-primary" />,
        [AccountType.SAVINGS]: <WalletIcon className="h-6 w-6 text-green-500" />,
        [AccountType.WALLET]: <WalletIcon className="h-6 w-6 text-yellow-500" />,
        [AccountType.CREDIT_CARD]: <CreditCardIcon className="h-6 w-6 text-red-500" />,
        [AccountType.INVESTMENT]: <WalletIcon className="h-6 w-6 text-indigo-500" />,
        [AccountType.LOAN]: <WalletIcon className="h-6 w-6 text-orange-500" />
    };

    return (
        <PageWrapper title="Contas">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularAccounts.map(account => (
                    <div
                        key={account.id}
                        className="relative bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 group"
                    >
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1">
                            <button
                                onClick={() => onEditAccount(account)}
                                className="p-2 bg-secondary rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                aria-label={`Editar conta ${account.name}`}
                            >
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDeleteAccount(account.id)}
                                className="p-2 bg-secondary rounded-full text-muted-foreground hover:text-red-500 hover:bg-accent transition-colors"
                                aria-label={`Excluir conta ${account.name}`}
                            >
                                <Trash2Icon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-lg font-semibold text-foreground">
                                    {account.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {translateAccountType(account.type)}
                                </p>
                            </div>
                            <div className="p-2 bg-secondary rounded-lg">
                                {accountIcons[account.type]}
                            </div>
                        </div>
                        <div className="mt-4">
                            {account.type === AccountType.CREDIT_CARD ? (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        Limite do Cartão
                                    </p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {formatCurrency(account.limit)}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground">Saldo Atual</p>
                                    <p
                                        className={`text-2xl font-bold ${
                                            account.balance >= 0
                                                ? 'text-green-500'
                                                : 'text-red-500'
                                        }`}
                                    >
                                        {formatCurrency(account.balance)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <button
                    onClick={onAddAccount}
                    className="border-2 border-dashed border-border hover:border-primary hover:text-primary text-muted-foreground rounded-xl flex flex-col items-center justify-center p-6 transition-all duration-300 group"
                >
                    <PlusCircleIcon className="h-10 w-10 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold">Adicionar Conta</span>
                </button>
            </div>
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE ORÇAMENTOS
// ==================================================================================
interface BudgetsPageProps {
    budgets: Budget[];
    transactions: Transaction[];
    categories: Category[];
    onAddBudget: () => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
    budgets,
    transactions,
    categories,
    onAddBudget
}) => {
    const budgetDetails = useMemo(() => {
        return budgets.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            const spent = transactions
                .filter(
                    tx =>
                        tx.category?.id === budget.categoryId &&
                        tx.type === CategoryType.EXPENSE
                )
                .reduce((sum, tx) => sum + tx.amount, 0);

            return {
                ...budget,
                categoryName: category?.name || 'N/A',
                color: category?.color || '#FFFFFF',
                spent
            };
        });
    }, [budgets, transactions, categories]);

    return (
        <PageWrapper title="Orçamentos">
            <div className="flex justify-end mb-4">
                <ActionButton icon={PlusCircleIcon} onClick={onAddBudget} variant="primary">
                    Criar Orçamento
                </ActionButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {budgetDetails.map(item => {
                    const percentage = Math.min((item.spent / item.amount) * 100, 100);
                    return (
                        <div
                            key={item.id}
                            className="bg-card p-6 rounded-xl border border-border shadow-sm"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-foreground">
                                    {item.categoryName}
                                </h3>
                                <span className="text-sm text-muted-foreground">
                                    {percentage.toFixed(0)}%
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2.5 mb-2">
                                <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: item.color
                                    }}
                                />
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                                <span className="text-foreground font-medium">
                                    {formatCurrency(item.spent)}
                                </span>{' '}
                                /{' '}
                                {formatCurrency(item.amount)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE CARTÕES
// ==================================================================================
interface CardsPageProps {
    invoices: CreditInvoice[];
    onPayInvoice: (invoice: CreditInvoice) => void;
    accounts: Account[];
    transactions: Transaction[];
    onAddCard: () => void;
    onEditCard: (account: Account) => void;
    onDeleteCard: (accountId: string) => void;
    overdueData: OverdueData;
}

export const CardsPage: React.FC<CardsPageProps> = ({
    invoices,
    onPayInvoice,
    accounts,
    transactions,
    onAddCard,
    onEditCard,
    onDeleteCard,
    overdueData
}) => {
    const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
    const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { overdueInvoices } = overdueData;
    const overdueInvoicesCount = overdueInvoices.length;
    const overdueInvoicesTotal = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const overdueInvoiceIds = useMemo(() => new Set(overdueInvoices.map(inv => inv.id)), [overdueInvoices]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpenId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const creditCardAccounts = accounts.filter(acc => acc.type === AccountType.CREDIT_CARD);

    const toggleInvoiceDetails = (invoiceId: string) => {
        setExpandedInvoices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(invoiceId)) {
                newSet.delete(invoiceId);
            } else {
                newSet.add(invoiceId);
            }
            return newSet;
        });
    };

    const getTransactionsForInvoice = (invoice: CreditInvoice) => {
        const card = accounts.find(acc => acc.id === invoice.cardId);
        if (!card || !card.due_day) return [];
        const dueDay = card.due_day;

        const invoiceDueDate = new Date(invoice.dueDate + 'T12:00:00Z');
        const dueYear = invoiceDueDate.getUTCFullYear();
        const dueMonth = invoiceDueDate.getUTCMonth(); // 0-11

        // The transaction period for an invoice due on {dueMonth} starts on {dueDay} of {dueMonth - 1}
        // and ends on {dueDay - 1} of {dueMonth}.
        const periodStartDate = new Date(Date.UTC(dueYear, dueMonth - 1, dueDay));
        const periodEndDate = new Date(Date.UTC(dueYear, dueMonth, dueDay - 1));

        const periodStartStr = periodStartDate.toISOString().split('T')[0];
        const periodEndStr = periodEndDate.toISOString().split('T')[0];
        
        return transactions
            .filter(tx => {
                if (tx.accountId !== invoice.cardId) return false;
                // Simple string comparison works because dates are in YYYY-MM-DD format
                return tx.date >= periodStartStr && tx.date <= periodEndStr;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <PageWrapper title="Cartões de Crédito">
            <div className="flex justify-end mb-4">
                <ActionButton icon={PlusCircleIcon} onClick={onAddCard} variant="primary">
                    Adicionar Cartão
                </ActionButton>
            </div>

            {overdueInvoicesCount > 0 && (
                 <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-center gap-4 animate-element">
                    <AlertTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-red-600 dark:text-red-300">Alerta de Vencimento</h3>
                        <p className="text-sm">
                            Você tem <strong>{overdueInvoicesCount} {overdueInvoicesCount > 1 ? 'faturas vencidas' : 'fatura vencida'}</strong>, totalizando{' '}
                            <strong>{formatCurrency(overdueInvoicesTotal)}</strong>.
                        </p>
                    </div>
                 </div>
            )}

            {creditCardAccounts.length === 0 ? (
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-center text-muted-foreground">
                    <p>Nenhum cartão de crédito cadastrado.</p>
                    <p className="text-sm mt-2">
                        Clique em &apos;Adicionar Cartão&apos; para começar.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {creditCardAccounts.map(card => {
                        const cardInvoices = invoices
                            .filter(inv => inv.cardId === card.id && Math.abs(inv.amount) > 0.01)
                            .sort(
                                (a, b) =>
                                    new Date(b.dueDate).getTime() -
                                    new Date(a.dueDate).getTime()
                            );
                        
                        const statusColor: { [key: string]: string } = {
                            Aberta: 'text-yellow-500',
                            Paga: 'text-green-500',
                            Fechada: 'text-red-500',
                            Vencida: 'text-red-500 font-bold',
                        };
                        
                        const usedLimit = card.balance;
                        const availableLimit = (card.limit || 0) - usedLimit;

                        return (
                            <div
                                key={card.id}
                                className="bg-card p-6 rounded-xl border border-border shadow-sm relative group"
                            >
                                <div className="absolute top-4 right-4 z-10">
                                    <div className="relative">
                                        <button 
                                            onClick={() => setDropdownOpenId(dropdownOpenId === card.id ? null : card.id)} 
                                            className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreVerticalIcon className="w-5 h-5" />
                                        </button>
                                        {dropdownOpenId === card.id && (
                                            <div ref={dropdownRef} className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-popover ring-1 ring-border focus:outline-none animate-element">
                                                <div className="py-1">
                                                    <button onClick={() => { onEditCard(card); setDropdownOpenId(null); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent">
                                                        <EditIcon className="h-4 w-4" /> Editar
                                                    </button>
                                                    <button onClick={() => { onDeleteCard(card.id); setDropdownOpenId(null); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-accent">
                                                        <Trash2Icon className="h-4 w-4" /> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center mb-6">
                                    <CreditCardIcon className="h-10 w-10 text-primary" />
                                    <div className="ml-4">
                                        <h2 className="text-xl font-bold text-foreground">
                                            {card.name}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                           Vencimento todo dia {card.due_day}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center border-y border-border py-4 mb-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Limite Total</p>
                                        <p className="font-semibold text-foreground">{formatCurrency(card.limit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Limite Utilizado</p>
                                        <p className="font-semibold text-yellow-500">{formatCurrency(usedLimit)}</p>
                                    </div>
                                     <div>
                                        <p className="text-sm text-muted-foreground">Limite Disponível</p>
                                        <p className="font-semibold text-green-500">{formatCurrency(availableLimit)}</p>
                                    </div>
                                </div>


                                <h3 className="font-semibold mb-4 text-foreground">
                                    Faturas
                                </h3>
                                {cardInvoices.length > 0 ? (
                                    <ul className="space-y-2">
                                        {cardInvoices.map(invoice => {
                                            const invoiceTransactions =
                                                getTransactionsForInvoice(invoice);
                                            const isExpanded = expandedInvoices.has(invoice.id);
                                            const isOverdue = overdueInvoiceIds.has(invoice.id);
                                            const currentStatus = isOverdue ? 'Vencida' : invoice.status;
                                            return (
                                                <React.Fragment key={invoice.id}>
                                                    <li
                                                        className="flex justify-between items-center p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent"
                                                        onClick={() =>
                                                            toggleInvoiceDetails(invoice.id)
                                                        }
                                                    >
                                                        <div className="flex items-center">
                                                            <ChevronDownIcon
                                                                className={`h-5 w-5 text-muted-foreground mr-3 transform transition-transform ${
                                                                    isExpanded
                                                                        ? 'rotate-180'
                                                                        : ''
                                                                }`}
                                                            />
                                                            <div>
                                                                <span className="font-semibold text-foreground">
                                                                    {invoice.month}
                                                                </span>
                                                                <span
                                                                    className={`ml-3 text-xs font-bold ${statusColor[currentStatus]}`}
                                                                >
                                                                    {currentStatus.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold text-foreground">
                                                                {formatCurrency(invoice.amount)}
                                                            </p>
                                                            <p className={`text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                                                Venc.{' '}
                                                                {new Date(
                                                                    invoice.dueDate
                                                                ).toLocaleDateString('pt-BR', {
                                                                    timeZone: 'UTC'
                                                                })}
                                                            </p>
                                                        </div>
                                                        {invoice.status !== 'Paga' && (
                                                            <button
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    onPayInvoice(invoice);
                                                                }}
                                                                className="bg-primary text-primary-foreground px-3 py-1 text-sm rounded-md hover:bg-primary/90 transition-colors ml-4"
                                                            >
                                                                Pagar
                                                            </button>
                                                        )}
                                                    </li>
                                                    {isExpanded && (
                                                        <div className="pl-8 pr-4 pb-2 pt-1 animate-element">
                                                            {invoiceTransactions.length > 0 ? (
                                                                <table className="w-full text-sm">
                                                                    <tbody>
                                                                        {invoiceTransactions.map(
                                                                            tx => (
                                                                                <tr
                                                                                    key={tx.id}
                                                                                    className="border-b border-border/50"
                                                                                >
                                                                                    <td className="py-2 pr-2 text-muted-foreground">
                                                                                        {new Date(
                                                                                            tx.date
                                                                                        ).toLocaleDateString(
                                                                                            'pt-BR',
                                                                                            {
                                                                                                timeZone:
                                                                                                    'UTC',
                                                                                                day: '2-digit',
                                                                                                month:
                                                                                                    'short'
                                                                                            }
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="py-2 px-2 text-foreground">
                                                                                        {
                                                                                            tx.description
                                                                                        }
                                                                                    </td>
                                                                                    <td className="py-2 pl-2 text-right text-red-500">
                                                                                        {formatCurrency(tx.amount)}
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <p className="text-center text-muted-foreground text-sm py-2">
                                                                    Nenhum débito nesta fatura.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">
                                        Nenhuma fatura encontrada para este cartão.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE RELATÓRIOS
// ==================================================================================
interface ReportsPageProps {
    transactions: Transaction[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ transactions }) => {
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split('T')[0];
    });

    const filteredTransactions = useMemo(() => {
        if (!startDate || !endDate) return transactions;
        return transactions.filter(tx => {
            const txDate = tx.date.substring(0, 10);
            return txDate >= startDate && txDate <= endDate;
        });
    }, [transactions, startDate, endDate]);

    const monthlySummaryData = useMemo(() => {
        const summary: {
            [key: string]: { date: Date; month: string; receitas: number; despesas: number };
        } = {};

        filteredTransactions.forEach(tx => {
            const date = new Date(tx.date);
            const key = `${date.getUTCFullYear()}-${String(
                date.getUTCMonth() + 1
            ).padStart(2, '0')}`;

            if (!summary[key]) {
                summary[key] = {
                    date: new Date(date.getUTCFullYear(), date.getUTCMonth(), 1),
                    month: date
                        .toLocaleString('pt-BR', { month: 'short' })
                        .replace('.', '')
                        .replace(/^\w/, c => c.toUpperCase()),
                    receitas: 0,
                    despesas: 0
                };
            }
            if (tx.type === CategoryType.INCOME) summary[key].receitas += tx.amount;
            if (tx.type === CategoryType.EXPENSE) summary[key].despesas += tx.amount;
        });

        return Object.values(summary).sort(
            (a, b) => a.date.getTime() - b.date.getTime()
        );
    }, [filteredTransactions]);

    return (
        <PageWrapper title="Relatórios">
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm mb-6">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-muted-foreground">
                        Período:
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-secondary border border-border rounded-md p-2 text-foreground"
                    />
                    <span className="text-muted-foreground">até</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-secondary border border-border rounded-md p-2 text-foreground"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Despesas por Categoria
                    </h2>
                    <CategoryPieChart data={filteredTransactions} />
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Receitas vs Despesas
                    </h2>
                    <MonthlySummaryBarChart data={monthlySummaryData} />
                </div>
            </div>
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE REGRAS
// ==================================================================================
interface RulesPageProps {
    rules: Rule[];
    onAddRule: () => void;
    onToggleRule: (rule: Rule) => void;
    onDeleteRule: (ruleId: string) => void;
}

export const RulesPage: React.FC<RulesPageProps> = ({
    rules,
    onAddRule,
    onToggleRule,
    onDeleteRule
}) => {
    return (
        <PageWrapper title="Regras de Automação">
            <div className="flex justify-end mb-4">
                <ActionButton icon={PlusCircleIcon} onClick={onAddRule} variant="primary">
                    Criar Regra
                </ActionButton>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                        <tr>
                            <th className="px-6 py-3 font-medium">Nome da Regra</th>
                            <th className="px-6 py-3 font-medium">Condições</th>
                            <th className="px-6 py-3 text-center font-medium">Status</th>
                            <th className="px-6 py-3 text-center font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr
                                key={rule.id}
                                className="border-b border-border hover:bg-secondary"
                            >
                                <td className="px-6 py-4 font-medium text-foreground">
                                    {rule.name}
                                </td>
                                <td className="px-6 py-4">{rule.conditions}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => onToggleRule(rule)}>
                                        {rule.enabled ? (
                                            <ToggleRightIcon className="h-6 w-6 text-green-500" />
                                        ) : (
                                            <ToggleLeftIcon className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center space-x-3">
                                        <button className="text-muted-foreground hover:text-foreground">
                                            <EditIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteRule(rule.id)}
                                            className="text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2Icon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE CATEGORIAS
// ==================================================================================
interface CategoriesPageProps {
    categories: Category[];
    onAddCategory: () => void;
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (categoryId: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
    categories,
    onAddCategory,
    onEditCategory,
    onDeleteCategory
}) => {
    return (
        <PageWrapper title="Categorias">
            <div className="flex justify-end mb-4">
                <ActionButton icon={PlusCircleIcon} onClick={onAddCategory} variant="primary">
                    Adicionar Categoria
                </ActionButton>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                        <tr>
                            <th className="px-6 py-3 font-medium">Nome</th>
                            <th className="px-6 py-3 font-medium">Tipo</th>
                            <th className="px-6 py-3 text-center font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr
                                key={cat.id}
                                className="border-b border-border hover:bg-secondary"
                            >
                                <td className="px-6 py-4 font-medium text-foreground">
                                    <div className="flex items-center">
                                        <span className="text-xl mr-4 w-6 text-center">{cat.icon}</span>
                                        <span
                                            className="h-3 w-3 rounded-full mr-3"
                                            style={{ backgroundColor: cat.color }}
                                        />
                                        {cat.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            cat.type === CategoryType.INCOME
                                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                        }`}
                                    >
                                        {cat.type === CategoryType.INCOME
                                            ? 'Receita'
                                            : 'Despesa'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center space-x-3">
                                        <button onClick={() => onEditCategory(cat)} className="text-muted-foreground hover:text-foreground">
                                            <EditIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteCategory(cat.id)}
                                            className="text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2Icon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE CONFIGURAÇÕES
// ==================================================================================
interface SettingsPageProps {
    user: User;
    profile: Profile | null;
    onProfileUpdate: () => void;
    theme: string;
    setTheme: (theme: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    user,
    profile,
    onProfileUpdate,
    theme,
    setTheme
}) => {
    const { addNotification } = useNotifications();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState({ profile: false, password: false });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(prev => ({ ...prev, profile: true }));

        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id);

        if (error) {
            addNotification({
                title: 'Erro',
                message: 'Não foi possível atualizar o perfil.',
                type: 'warning'
            });
        } else {
            addNotification({
                title: 'Sucesso',
                message: 'Perfil atualizado!',
                type: 'success'
            });
            onProfileUpdate();
        }
        setLoading(prev => ({ ...prev, profile: false }));
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addNotification({
                title: 'Erro',
                message: 'As senhas não coincidem.',
                type: 'warning'
            });
            return;
        }
        if (newPassword.length < 6) {
            addNotification({
                title: 'Erro',
                message: 'A nova senha deve ter pelo menos 6 caracteres.',
                type: 'warning'
            });
            return;
        }

        setLoading(prev => ({ ...prev, password: true }));
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(prev => ({ ...prev, password: false }));

        if (error) {
            addNotification({
                title: 'Erro ao Atualizar',
                message: error.message,
                type: 'warning'
            });
        } else {
            addNotification({
                title: 'Sucesso!',
                message: 'Sua senha foi alterada.',
                type: 'success'
            });
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <PageWrapper title="Configurações">
            <div className="space-y-8">
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h3 className="text-lg font-semibold border-b border-border pb-4 mb-6 text-foreground">
                        Aparência
                    </h3>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">
                            Tema
                        </label>
                        <div className="flex items-center gap-2 rounded-lg bg-secondary p-1">
                            <button
                                onClick={() => setTheme('light')}
                                className={`p-2 rounded-md transition-colors ${
                                    theme === 'light'
                                        ? 'bg-background shadow-sm'
                                        : 'hover:bg-accent'
                                }`}
                            >
                                <SunIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`p-2 rounded-md transition-colors ${
                                    theme === 'dark'
                                        ? 'bg-background shadow-sm'
                                        : 'hover:bg-accent'
                                }`}
                            >
                                <MoonIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h3 className="text-lg font-semibold border-b border-border pb-4 mb-6 text-foreground">
                        Informações do Perfil
                    </h3>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label
                                htmlFor="fullName"
                                className="block text-sm font-medium text-muted-foreground mb-1"
                            >
                                Nome Completo
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Email
                            </label>
                            <p className="text-foreground mt-1 p-3 bg-secondary rounded-md text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading.profile}
                                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading.profile ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h3 className="text-lg font-semibold border-b border-border pb-4 mb-6 text-foreground">
                        Alterar Senha
                    </h3>
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div>
                            <label
                                htmlFor="new-password"
                                className="block text-sm font-medium text-muted-foreground mb-1"
                            >
                                Nova Senha
                            </label>
                            <input
                                type="password"
                                id="new-password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="block text-sm font-medium text-muted-foreground mb-1"
                            >
                                Confirmar Nova Senha
                            </label>
                            <input
                                type="password"
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            />
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading.password}
                                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading.password ? 'Salvando...' : 'Salvar Nova Senha'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </PageWrapper>
    );
};

// ==================================================================================
// PÁGINA DE DESPESAS FIXAS
// ==================================================================================
interface FixedExpensesPageProps {
    user: User;
    fixedExpenses: FixedExpense[];
    monthlyFixedExpenses: MonthlyFixedExpense[];
    categories: Category[];
    accounts: Account[];
    onSaveTransaction: (
        transaction: Omit<Transaction, 'id' | 'current_installment' | 'parent_transaction_id'>,
        options?: { showNotification?: boolean }
    ) => Promise<string | null>;
    onDataNeedsRefresh: () => void;
    onSaveOrUpdateFixedExpense: (expense: Omit<FixedExpense, 'id' | 'is_active' | 'category'> | FixedExpense) => void;
    onUpdateMonthlyFixedExpense: (expense: { id: string; amount: number }) => void;
    onDeleteFixedExpense: (monthlyExpense: MonthlyFixedExpense, mode: 'this' | 'all') => Promise<void>;
    overdueData: OverdueData;
}

// Portal para garantir que o modal fique sempre acima de tudo e centralizado
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(children, document.body);
};

const FixedExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: { name: string; amount: string; dueDay: string; categoryId: string; notes: string | null }, scope?: 'this' | 'all') => void;
    expenseToEdit: MonthlyFixedExpense | null;
    categories: Category[];
}> = ({ isOpen, onClose, onSave, expenseToEdit, categories }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [notes, setNotes] = useState('');
    const [updateScope, setUpdateScope] = useState<'this' | 'all'>('this');
    const isEditing = !!expenseToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditing && expenseToEdit) {
                setName(expenseToEdit.fixedExpense?.name || '');
                setAmount(String(expenseToEdit.amount));
                setDueDay(String(expenseToEdit.fixedExpense?.due_day || ''));
                setCategoryId(expenseToEdit.fixedExpense?.category_id || '');
                setNotes(expenseToEdit.fixedExpense?.notes || '');
                setUpdateScope('this'); // Sempre reseta para 'this' ao abrir
            } else {
                setName('');
                setAmount('');
                setDueDay('');
                setCategoryId('');
                setNotes('');
            }
        }
    }, [isOpen, expenseToEdit, isEditing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId) {
            alert('É obrigatório selecionar uma categoria.');
            return;
        }
        const formData = {
            name,
            amount,
            dueDay,
            categoryId,
            notes: notes || null
        };

        onSave(formData, isEditing ? updateScope : undefined);
    };

    if (!isOpen) return null;

    const areFieldsDisabled = isEditing && updateScope === 'this';

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-md bg-card rounded-xl shadow-2xl text-card-foreground flex flex-col max-h-[90vh] animate-element"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-6 border-b border-border">
                        <h2 className="text-2xl font-bold">
                            {isEditing ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 overflow-y-auto">
                        <form
                            id="fixed-expense-form"
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nome (ex: Aluguel)"
                                required
                                disabled={areFieldsDisabled}
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Valor"
                                required
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground placeholder:text-muted-foreground"
                            />
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={dueDay}
                                onChange={e => setDueDay(e.target.value)}
                                placeholder="Dia do Vencimento"
                                required
                                disabled={areFieldsDisabled}
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <select
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                required
                                disabled={areFieldsDisabled}
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="" disabled>
                                    Selecione uma categoria
                                </option>
                                {categories
                                    .filter(c => c.type === 'expense')
                                    .map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                            </select>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Observações (opcional)"
                                disabled={areFieldsDisabled}
                                className="w-full bg-secondary border border-border rounded-md p-3 h-24 text-foreground placeholder:text-muted-foreground resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                             {isEditing && (
                                <div className="pt-2 border-t border-border">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Aplicar alterações a:</p>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-md border border-border has-[:checked]:bg-primary/10 has-[:checked]:border-primary flex-1 transition-colors">
                                            <input type="radio" name="updateScope" value="this" checked={updateScope === 'this'} onChange={() => setUpdateScope('this')} className="custom-checkbox" />
                                            <span>Apenas este mês</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-md border border-border has-[:checked]:bg-primary/10 has-[:checked]:border-primary flex-1 transition-colors">
                                            <input type="radio" name="updateScope" value="all" checked={updateScope === 'all'} onChange={() => setUpdateScope('all')} className="custom-checkbox" />
                                            <span>Esta e as futuras</span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 px-1">
                                        {updateScope === 'this' 
                                            ? 'Altera o valor apenas para a conta deste mês.'
                                            : 'Altera os dados padrão para esta e todas as futuras cobranças.'}
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="flex justify-end space-x-3 p-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="fixed-expense-form"
                            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

const PayFixedExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (accountId: string, amount: number, date: string) => void;
    expense: MonthlyFixedExpense;
    accounts: Account[];
}> = ({ isOpen, onClose, onConfirm, expense, accounts }) => {
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');
    const [amount, setAmount] = useState(String(expense.amount));
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        setAmount(String(expense.amount));
    }, [expense]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(accountId, parseFloat(amount), date);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-md bg-card rounded-xl shadow-2xl text-card-foreground flex flex-col max-h-[90vh] animate-element"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-6 border-b border-border">
                        <h2 className="text-2xl font-bold">Confirmar Pagamento</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div className="mb-4 p-4 bg-secondary rounded-lg">
                            <p className="text-muted-foreground">
                                {expense.fixedExpense?.name}
                            </p>
                            <p className="text-2xl font-bold text-yellow-500">
                                {formatCurrency(parseFloat(amount))}
                            </p>
                        </div>

                        <form
                            id="pay-expense-form"
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                required
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            />
                            <select
                                value={accountId}
                                onChange={e => setAccountId(e.target.value)}
                                required
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </option>
                                ))}
                            </select>
                        </form>
                    </div>

                    <div className="flex justify-end space-x-3 p-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="pay-expense-form"
                            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors"
                        >
                            Pagar
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

const DeleteConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: 'this' | 'all') => void;
    expenseName: string;
}> = ({ isOpen, onClose, onConfirm, expenseName }) => {
    if (!isOpen) return null;
    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
                <div className="w-full max-w-md bg-card rounded-xl shadow-2xl text-card-foreground p-6 animate-element" onClick={e => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-2">Excluir Despesa Fixa</h2>
                    <p className="text-muted-foreground mb-6">
                        Você tem certeza que deseja excluir a despesa "{expenseName}"?
                    </p>
                    <div className="flex flex-col space-y-3">
                        <button
                            onClick={() => onConfirm('this')}
                            className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors text-left"
                        >
                            <p className="font-semibold">Apagar somente este mês</p>
                            <p className="text-xs text-muted-foreground">Remove a despesa apenas da visão do mês atual.</p>
                        </button>
                        <button
                            onClick={() => onConfirm('all')}
                            className="w-full px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-left"
                        >
                            <p className="font-semibold">Apagar permanentemente</p>
                            <p className="text-xs">Exclui esta despesa de forma definitiva e impede futuras gerações.</p>
                        </button>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export const FixedExpensesPage: React.FC<FixedExpensesPageProps> = ({
    user,
    fixedExpenses,
    monthlyFixedExpenses,
    categories,
    accounts,
    onSaveTransaction,
    onDataNeedsRefresh,
    onSaveOrUpdateFixedExpense,
    onUpdateMonthlyFixedExpense,
    onDeleteFixedExpense,
    overdueData
}) => {
    const { addNotification } = useNotifications();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isPayModalOpen, setPayModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<MonthlyFixedExpense | null>(null);
    const [editingExpense, setEditingExpense] = useState<MonthlyFixedExpense | null>(null);
    const [deletingExpense, setDeletingExpense] = useState<MonthlyFixedExpense | null>(null);
    const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { overdueFixedExpenses } = overdueData;
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpenId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentMonthStr = useMemo(
        () =>
            `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
                2,
                '0'
            )}`,
        [currentDate]
    );

    const generateMonthlyExpenses = useCallback(
        async (month: string) => {
            const activeFixedExpenses = fixedExpenses.filter(fe => fe.is_active);
            const existingMonthlyExpensesForMonth = monthlyFixedExpenses.filter(
                mfe => mfe.month === month
            );

            const expensesToCreate = activeFixedExpenses.filter(fe => {
                const alreadyExists = existingMonthlyExpensesForMonth.some(
                    mfe => mfe.fixed_expense_id === fe.id
                );
                if (alreadyExists) return false;

                // Don't generate for months before the expense was created.
                if (fe.created_at) {
                    const creationDate = new Date(fe.created_at);
                    const creationMonthStr = `${creationDate.getFullYear()}-${String(
                        creationDate.getMonth() + 1
                    ).padStart(2, '0')}`;
                    if (month < creationMonthStr) {
                        return false;
                    }
                }
                return true;
            });

            if (expensesToCreate.length > 0) {
                const newMonthlyEntries = expensesToCreate.map(fe => {
                    const [year, monthNum] = month.split('-').map(Number);
                    const dueDate = new Date(year, monthNum - 1, fe.due_day);
                    return {
                        fixed_expense_id: fe.id,
                        month: month,
                        amount: fe.default_amount,
                        status: 'Não pago' as const,
                        due_date: dueDate.toISOString().split('T')[0],
                        user_id: user.id
                    };
                });
                const { error } = await supabase
                    .from('monthly_fixed_expenses')
                    .insert(newMonthlyEntries);
                if (error) {
                    addNotification({
                        title: 'Erro',
                        message: 'Falha ao gerar despesas fixas para o mês.',
                        type: 'warning'
                    });
                } else {
                    addNotification({
                        title: 'Sucesso',
                        message: `Geradas ${newMonthlyEntries.length} despesas para o mês.`,
                        type: 'success'
                    });
                    onDataNeedsRefresh();
                }
            }
        },
        [fixedExpenses, monthlyFixedExpenses, addNotification, onDataNeedsRefresh, user.id]
    );

    useEffect(() => {
        generateMonthlyExpenses(currentMonthStr);
    }, [currentMonthStr, fixedExpenses, monthlyFixedExpenses, generateMonthlyExpenses]);

    const expensesForCurrentMonth = useMemo(() => {
        return monthlyFixedExpenses
            .filter(mfe => mfe.month === currentMonthStr)
            .sort(
                (a, b) =>
                    new Date(a.due_date).getDate() - new Date(b.due_date).getDate()
            );
    }, [monthlyFixedExpenses, currentMonthStr]);

    const totalForCurrentMonth = useMemo(() => {
        return expensesForCurrentMonth.reduce((sum, exp) => sum + exp.amount, 0);
    }, [expensesForCurrentMonth]);

    const overdueForCurrentMonth = useMemo(() => {
        return overdueFixedExpenses.filter(ofe => ofe.month === currentMonthStr);
    }, [overdueFixedExpenses, currentMonthStr]);
    
    const overdueIdsForCurrentMonth = useMemo(() => new Set(overdueForCurrentMonth.map(exp => exp.id)), [overdueForCurrentMonth]);

    const overdueTotalAmount = overdueForCurrentMonth.reduce((sum, exp) => sum + exp.amount, 0);

    const handleOpenPayModal = (expense: MonthlyFixedExpense) => {
        setSelectedExpense(expense);
        setPayModalOpen(true);
    };

    const handleOpenEditModal = (expense: MonthlyFixedExpense) => {
        setEditingExpense(expense);
        setAddModalOpen(true);
        setDropdownOpenId(null);
    };

    const handleOpenDeleteModal = (monthlyExpense: MonthlyFixedExpense) => {
        setDeletingExpense(monthlyExpense);
        setDropdownOpenId(null);
    };

    const handleConfirmDelete = async (mode: 'this' | 'all') => {
        if (deletingExpense) {
            await onDeleteFixedExpense(deletingExpense, mode);
            setDeletingExpense(null);
        }
    };
    
    const handleCloseAddModal = () => {
        setAddModalOpen(false);
        setEditingExpense(null);
    };
    
    const handleModalSave = (
        formData: { name: string; amount: string; dueDay: string; categoryId: string; notes: string | null },
        scope?: 'this' | 'all'
    ) => {
        if (scope && editingExpense) { // It's an edit
            if (scope === 'this') {
                onUpdateMonthlyFixedExpense({
                    id: editingExpense.id,
                    amount: parseFloat(formData.amount)
                });
            } else { // scope === 'all'
                const payload: FixedExpense = {
                    ...(editingExpense.fixedExpense!),
                    name: formData.name,
                    default_amount: parseFloat(formData.amount),
                    due_day: parseInt(formData.dueDay, 10),
                    category_id: formData.categoryId,
                    notes: formData.notes
                };
                onSaveOrUpdateFixedExpense(payload);
            }
        } else { // It's a new expense
            const payload = {
                name: formData.name,
                default_amount: parseFloat(formData.amount),
                due_day: parseInt(formData.dueDay, 10),
                category_id: formData.categoryId,
                notes: formData.notes
            };
            onSaveOrUpdateFixedExpense(payload);
        }
        handleCloseAddModal();
    };

    const handleMarkAsPaid = async (
        accountId: string,
        amount: number,
        date: string
    ) => {
        if (!selectedExpense) return;

        const transactionId = await onSaveTransaction(
            {
                description: `Pagamento Fixo: ${selectedExpense.fixedExpense?.name}`,
                amount: amount,
                date: date,
                type: CategoryType.EXPENSE,
                category: selectedExpense.fixedExpense?.category || null,
                accountId: accountId,
                status: TransactionStatus.CLEARED
            },
            { showNotification: false }
        );

        if (transactionId) {
            const { error } = await supabase
                .from('monthly_fixed_expenses')
                .update({
                    status: 'Pago',
                    amount: amount,
                    transaction_id: transactionId
                })
                .eq('id', selectedExpense.id);

            if (error) {
                addNotification({
                    title: 'Erro',
                    message: 'Falha ao atualizar status da despesa.',
                    type: 'warning'
                });
            } else {
                addNotification({
                    title: 'Sucesso',
                    message: 'Despesa marcada como paga!',
                    type: 'success'
                });
                onDataNeedsRefresh();
            }
        } else {
            addNotification({
                title: 'Erro',
                message: 'Falha ao criar a transação de pagamento.',
                type: 'warning'
            });
        }
    };

    const changeMonth = (offset: number) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    return (
        <PageWrapper title="Despesas Fixas">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="p-2 rounded-full hover:bg-secondary transition-colors"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    <h2 className="text-xl font-semibold text-foreground text-center w-48">
                        {currentDate
                            .toLocaleString('pt-BR', {
                                month: 'long',
                                year: 'numeric'
                            })
                            .replace(/^\w/, c => c.toUpperCase())}
                    </h2>
                    <button
                        onClick={() => changeMonth(1)}
                        className="p-2 rounded-full hover:bg-secondary transition-colors"
                        aria-label="Próximo mês"
                    >
                        <ChevronRightIcon className="h-6 w-6" />
                    </button>
                </div>
                <ActionButton
                    icon={PlusCircleIcon}
                    onClick={() => { setEditingExpense(null); setAddModalOpen(true); }}
                    variant="primary"
                >
                    Adicionar Despesa
                </ActionButton>
            </div>
            
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 mb-6 animate-element">
                <h3 className="text-sm font-medium text-muted-foreground">Total do Mês Selecionado</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalForCurrentMonth)}
                </p>
            </div>

            {overdueForCurrentMonth.length > 0 && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-center gap-4 animate-element">
                    <AlertTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-red-600 dark:text-red-300">Alerta de Vencimento</h3>
                        <p className="text-sm">
                            Você tem <strong>{overdueForCurrentMonth.length} {overdueForCurrentMonth.length > 1 ? 'despesas vencidas' : 'despesa vencida'}</strong> este mês, totalizando{' '}
                            <strong>{formatCurrency(overdueTotalAmount)}</strong>.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-card rounded-xl border border-border shadow-sm">
                <div className={dropdownOpenId ? 'overflow-visible' : 'overflow-x-auto'}>
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-medium">Despesa</th>
                                <th scope="col" className="px-6 py-3 font-medium">Vencimento</th>
                                <th scope="col" className="px-6 py-3 font-medium text-right">Valor</th>
                                <th scope="col" className="px-6 py-3 font-medium text-center">Status</th>
                                <th scope="col" className="px-6 py-3 font-medium text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expensesForCurrentMonth.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Nenhuma despesa para este mês.
                                    </td>
                                </tr>
                            ) : expensesForCurrentMonth.map(item => {
                                const isOverdue = overdueIdsForCurrentMonth.has(item.id);
                                return (
                                <tr key={item.id} className={`border-b border-border hover:bg-secondary ${isOverdue ? 'bg-red-500/5' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-foreground">
                                        <div>
                                            <span>{item.fixedExpense?.name}</span>
                                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: item.fixedExpense?.category?.color || '#808080' }} />
                                                <span>{item.fixedExpense?.category?.name || 'Sem Categoria'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                                        {new Date(item.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-right text-foreground">
                                        {formatCurrency(item.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                            item.status === 'Pago'
                                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                                : isOverdue 
                                                    ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                                    : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                        }`}>
                                            {isOverdue ? 'Vencida' : item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center space-x-2">
                                            {item.status === 'Não pago' && (
                                                <button
                                                    onClick={() => handleOpenPayModal(item)}
                                                    className="px-3 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                            <div className="relative">
                                                <button onClick={() => setDropdownOpenId(dropdownOpenId === item.id ? null : item.id)} className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent">
                                                    <MoreVerticalIcon className="h-5 w-5" />
                                                </button>
                                                {dropdownOpenId === item.id && item.fixedExpense && (
                                                    <div ref={dropdownRef} className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-popover ring-1 ring-border focus:outline-none z-20 animate-element">
                                                        <div className="py-1">
                                                            <button onClick={() => handleOpenEditModal(item)} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent">
                                                                <EditIcon className="h-4 w-4" /> Editar
                                                            </button>
                                                            <button onClick={() => handleOpenDeleteModal(item)} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-accent">
                                                                <Trash2Icon className="h-4 w-4" /> Excluir
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            <FixedExpenseModal
                isOpen={isAddModalOpen}
                onClose={handleCloseAddModal}
                onSave={handleModalSave}
                expenseToEdit={editingExpense}
                categories={categories}
            />

            {deletingExpense && (
                 <DeleteConfirmationModal
                    isOpen={!!deletingExpense}
                    onClose={() => setDeletingExpense(null)}
                    onConfirm={handleConfirmDelete}
                    expenseName={deletingExpense.fixedExpense?.name || ''}
                />
            )}

            {selectedExpense && (
                <PayFixedExpenseModal
                    isOpen={isPayModalOpen}
                    onClose={() => setPayModalOpen(false)}
                    onConfirm={handleMarkAsPaid}
                    expense={selectedExpense}
                    accounts={accounts}
                />
            )}
        </PageWrapper>
    );
};
