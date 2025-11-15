import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Account, AccountType, Category, CategoryType, Transaction, TransactionStatus, CreditInvoice, Budget, Rule, Profile, FixedExpense, MonthlyFixedExpense } from '../types';
import { FilterIcon, UploadIcon, DownloadIcon, EditIcon, Trash2Icon, CreditCardIcon, WalletIcon, PlusCircleIcon, ToggleLeftIcon, ToggleRightIcon, TagIcon, ChevronDownIcon, SunIcon, MoonIcon, MoreVerticalIcon, ClipboardListIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
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
        // FIX: Cast `type` to string to avoid TypeScript error with exhaustive switch.
        default: return (type as string).replace('_', ' ');
    }
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

const ActionButton: React.FC<{ icon: React.ElementType, children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' }> = ({ icon: Icon, children, onClick, className = '', variant = 'secondary' }) => {
    const baseClasses = "flex items-center font-medium py-2 px-4 rounded-lg transition-colors duration-200";
    const variantClasses = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
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
    onDeleteTransaction: (transaction: Transaction) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ transactions, accounts, onDeleteTransaction }) => {
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
        { key: 'custom', label: 'Personalizado' },
    ];

    const handleDatePresetChange = (preset: string) => {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        let start = '';
        let end = new Date(now).toISOString().split('T')[0];

        if (preset !== 'all' && preset !== 'custom') {
            switch (preset) {
                case 'today':
                    start = new Date(now).toISOString().split('T')[0];
                    break;
                case '7days':
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(now.getDate() - 6);
                    start = sevenDaysAgo.toISOString().split('T')[0];
                    break;
                case 'thisMonth':
                    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    start = firstDayThisMonth.toISOString().split('T')[0];
                    break;
                case 'lastMonth':
                    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    start = firstDayLastMonth.toISOString().split('T')[0];
                    end = lastDayLastMonth.toISOString().split('T')[0];
                    break;
            }
             setFilters(prev => ({ ...prev, datePreset: preset, startDate: start, endDate: end }));
        } else {
             setFilters(prev => ({ ...prev, datePreset: preset, startDate: preset === 'all' ? '' : prev.startDate, endDate: preset === 'all' ? '' : prev.endDate }));
        }
    };
    
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            if (!tx || !tx.date) return false;
            const txDateOnly = tx.date.substring(0, 10);
            
            if (filters.type !== 'all' && tx.type !== filters.type) return false;
            if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) return false;
            if (filters.startDate && txDateOnly < filters.startDate) return false;
            if (filters.endDate && txDateOnly > filters.endDate) return false;
            
            return true;
        });
    }, [transactions, filters]);

    const handleFilterChange = (key: 'type' | 'accountId' | 'startDate' | 'endDate', value: string) => {
        const isDateChange = key === 'startDate' || key === 'endDate';
        setFilters(prev => ({ 
            ...prev, 
            [key]: value,
            datePreset: isDateChange ? 'custom' : prev.datePreset
        }));
    };
    
    const clearFilters = () => {
        setFilters({ type: 'all', accountId: 'all', datePreset: 'all', startDate: '', endDate: '' });
    };

    const statusMap: { [key in TransactionStatus]: { text: string; color: string } } = {
        [TransactionStatus.PENDING]: { text: 'Pendente', color: 'bg-yellow-500' },
        [TransactionStatus.CLEARED]: { text: 'Confirmado', color: 'bg-green-500' },
        [TransactionStatus.RECONCILED]: { text: 'Conciliado', color: 'bg-blue-500' },
    };

    const getAccountName = (accountId: string) => accounts.find(a => a.id === accountId)?.name || 'N/A';

    return (
        <PageWrapper title="Transações">
            <div className="space-y-6">
                <div className="flex justify-end space-x-3">
                    <ActionButton icon={FilterIcon} onClick={() => setShowFilters(!showFilters)}>Filtrar</ActionButton>
                    <ActionButton icon={UploadIcon}>Importar</ActionButton>
                    <ActionButton icon={DownloadIcon}>Exportar</ActionButton>
                </div>

                {showFilters && (
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-4 animate-element">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">Tipo</label>
                                <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="w-full bg-secondary border border-border rounded-md p-2 text-foreground">
                                    <option value="all">Todos</option>
                                    <option value={CategoryType.INCOME}>Receitas</option>
                                    <option value={CategoryType.EXPENSE}>Despesas</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">Conta</label>
                                <select value={filters.accountId} onChange={e => handleFilterChange('accountId', e.target.value)} className="w-full bg-secondary border border-border rounded-md p-2 text-foreground">
                                    <option value="all">Todas as Contas</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                             <label className="text-sm font-medium text-muted-foreground block mb-2">Período</label>
                             <div className="flex flex-wrap gap-2">
                                {datePresets.map(preset => (
                                    <button key={preset.key} onClick={() => handleDatePresetChange(preset.key)} className={`px-3 py-1 rounded-md text-sm transition-colors ${filters.datePreset === preset.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}>{preset.label}</button>
                                ))}
                             </div>
                        </div>
                        {filters.datePreset === 'custom' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                 <div>
                                     <label className="text-sm font-medium text-muted-foreground block mb-2">Data Início</label>
                                     <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full bg-secondary border border-border rounded-md p-2 text-foreground" />
                                 </div>
                                 <div>
                                     <label className="text-sm font-medium text-muted-foreground block mb-2">Data Fim</label>
                                     <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full bg-secondary border border-border rounded-md p-2 text-foreground" />
                                 </div>
                             </div>
                        )}
                        <div className="flex justify-end pt-2">
                            <button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground">Limpar Filtros</button>
                        </div>
                    </div>
                )}

                <div className="bg-card rounded-xl border border-border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted-foreground">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="p-4 w-12"></th>
                                    <th scope="col" className="px-6 py-3 font-medium">Descrição</th>
                                    <th scope="col" className="px-6 py-3 font-medium">Categoria</th>
                                    <th scope="col" className="px-6 py-3 font-medium">Data</th>
                                    <th scope="col" className="px-6 py-3 font-medium">Conta</th>
                                    <th scope="col" className="px-6 py-3 text-right font-medium">Valor</th>
                                    <th scope="col" className="px-6 py-3 text-center font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-border hover:bg-secondary">
                                        <td className="p-4"><div className="flex justify-center"><span className={`h-2.5 w-2.5 rounded-full ${statusMap[tx.status].color}`} title={statusMap[tx.status].text}></span></div></td>
                                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{tx.description}</td>
                                        <td className="px-6 py-4"><div className="flex items-center"><span className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: tx.category?.color || '#808080' }}></span>{tx.category?.name || 'N/A'}</div></td>
                                        <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-6 py-4">{getAccountName(tx.accountId)}</td>
                                        <td className={`px-6 py-4 text-right font-semibold ${tx.type === CategoryType.INCOME ? 'text-green-500' : 'text-foreground'}`}>
                                            {tx.type === CategoryType.EXPENSE ? '-' : ''}
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                        </td>
                                        <td className="px-6 py-4"><div className="flex items-center justify-center space-x-3"><button className="text-muted-foreground hover:text-foreground"><EditIcon className="h-4 w-4" /></button><button onClick={() => onDeleteTransaction(tx)} className="text-muted-foreground hover:text-red-500"><Trash2Icon className="h-4 w-4" /></button></div></td>
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
export const AccountsPage: React.FC<AccountsPageProps> = ({ accounts, onAddAccount, onEditAccount, onDeleteAccount }) => {
    const regularAccounts = accounts.filter(acc => acc.type !== AccountType.CREDIT_CARD);
    
    const accountIcons: { [key in AccountType]: React.ReactElement } = {
        [AccountType.CHECKING]: <WalletIcon className="h-6 w-6 text-primary" />,
        [AccountType.SAVINGS]: <WalletIcon className="h-6 w-6 text-green-500" />,
        [AccountType.WALLET]: <WalletIcon className="h-6 w-6 text-yellow-500" />,
        [AccountType.CREDIT_CARD]: <CreditCardIcon className="h-6 w-6 text-red-500" />,
        [AccountType.INVESTMENT]: <WalletIcon className="h-6 w-6 text-indigo-500" />,
        [AccountType.LOAN]: <WalletIcon className="h-6 w-6 text-orange-500" />,
    };

    return (
        <PageWrapper title="Contas">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularAccounts.map(account => (
                    <div key={account.id} className="relative bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1">
                            <button onClick={() => onEditAccount(account)} className="p-2 bg-secondary rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label={`Editar conta ${account.name}`}>
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDeleteAccount(account.id)} className="p-2 bg-secondary rounded-full text-muted-foreground hover:text-red-500 hover:bg-accent transition-colors" aria-label={`Excluir conta ${account.name}`}>
                                <Trash2Icon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-lg font-semibold text-foreground">{account.name}</p>
                                <p className="text-sm text-muted-foreground">{translateAccountType(account.type)}</p>
                            </div>
                            <div className="p-2 bg-secondary rounded-lg">{accountIcons[account.type]}</div>
                        </div>
                        <div className="mt-4">
                            {account.type === AccountType.CREDIT_CARD ? (
                                <>
                                    <p className="text-sm text-muted-foreground">Limite do Cartão</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.limit || 0)}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground">Saldo Atual</p>
                                    <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                 <button onClick={onAddAccount} className="border-2 border-dashed border-border hover:border-primary hover:text-primary text-muted-foreground rounded-xl flex flex-col items-center justify-center p-6 transition-all duration-300 group">
                    <PlusCircleIcon className="h-10 w-10 mb-2 group-hover:scale-110 transition-transform"/>
                    <span className="font-semibold">Adicionar Conta</span>
                </button>
            </div>
        </PageWrapper>
    )
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
export const BudgetsPage: React.FC<BudgetsPageProps> = ({ budgets, transactions, categories, onAddBudget }) => {
    
    const budgetDetails = useMemo(() => {
        return budgets.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            const spent = transactions
                .filter(tx => tx.category?.id === budget.categoryId && tx.type === CategoryType.EXPENSE)
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
            <div className="flex justify-end mb-4"><ActionButton icon={PlusCircleIcon} onClick={onAddBudget} variant="primary">Criar Orçamento</ActionButton></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {budgetDetails.map(item => {
                    const percentage = Math.min((item.spent / item.amount) * 100, 100);
                    return (
                        <div key={item.id} className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-foreground">{item.categoryName}</h3>
                                <span className="text-sm text-muted-foreground">{percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2.5 mb-2">
                                <div className="h-2.5 rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }}></div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                                <span className="text-foreground font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.spent)}</span> / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
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
}
export const CardsPage: React.FC<CardsPageProps> = ({ invoices, onPayInvoice, accounts, transactions, onAddCard }) => {
    const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
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
        // This logic might need adjustment based on closing date vs due date.
        // Simple approach: find transactions for this card from the previous month.
        const invoiceDate = new Date(invoice.dueDate + 'T00:00:00');
        const targetMonth = invoiceDate.getMonth() === 0 ? 11 : invoiceDate.getMonth() - 1;
        const targetYear = invoiceDate.getMonth() === 0 ? invoiceDate.getFullYear() - 1 : invoiceDate.getFullYear();

        return transactions
            .filter(tx => {
                if (tx.accountId !== invoice.cardId) return false;
                const txDate = new Date(tx.date + 'T00:00:00');
                return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };
    
    return (
        <PageWrapper title="Cartões de Crédito">
            <div className="flex justify-end mb-4">
                <ActionButton icon={PlusCircleIcon} onClick={onAddCard} variant="primary">
                    Adicionar Cartão
                </ActionButton>
            </div>
            {creditCardAccounts.length === 0 ? (
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-center text-muted-foreground">
                    <p>Nenhum cartão de crédito cadastrado.</p>
                    <p className="text-sm mt-2">Clique em 'Adicionar Cartão' para começar.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {creditCardAccounts.map(card => {
                        const cardInvoices = invoices
                            .filter(inv => inv.cardId === card.id)
                            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
                        const currentInvoice = cardInvoices.find(inv => inv.status === 'Aberta');
                        const statusColor: { [key: string]: string } = { 'Aberta': 'text-yellow-500', 'Paga': 'text-green-500', 'Fechada': 'text-red-500' };

                        return (
                            <div key={card.id} className="bg-card p-6 rounded-xl border border-border shadow-sm">
                                <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
                                    <div className="flex items-center">
                                        <CreditCardIcon className="h-10 w-10 text-primary" />
                                        <div className="ml-4">
                                            <h2 className="text-xl font-bold text-foreground">{card.name}</h2>
                                            <p className="text-sm text-muted-foreground">Limite: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limit || 0)}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fatura Atual</p>
                                        <p className="text-xl font-semibold text-yellow-500">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentInvoice?.amount || 0)}
                                        </p>
                                    </div>
                                </div>
                                <h3 className="font-semibold mb-4 text-foreground">Últimas Faturas</h3>
                                {cardInvoices.length > 0 ? (
                                    <ul className="space-y-2">
                                        {cardInvoices.map(invoice => {
                                            const invoiceTransactions = getTransactionsForInvoice(invoice);
                                            const isExpanded = expandedInvoices.has(invoice.id);
                                            return (
                                            <React.Fragment key={invoice.id}>
                                                <li className="flex justify-between items-center p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent" onClick={() => toggleInvoiceDetails(invoice.id)}>
                                                    <div className='flex items-center'>
                                                        <ChevronDownIcon className={`h-5 w-5 text-muted-foreground mr-3 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        <div>
                                                            <span className="font-semibold text-foreground">{invoice.month}</span>
                                                            <span className={`ml-3 text-xs font-bold ${statusColor[invoice.status]}`}>{invoice.status.toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}</p>
                                                        <p className="text-xs text-muted-foreground">Venc. {new Date(invoice.dueDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                                    </div>
                                                    {invoice.status !== 'Paga' && (
                                                        <button onClick={(e) => { e.stopPropagation(); onPayInvoice(invoice); }} className="bg-primary text-primary-foreground px-3 py-1 text-sm rounded-md hover:bg-primary/90 transition-colors ml-4">Pagar</button>
                                                    )}
                                                </li>
                                                {isExpanded && (
                                                    <div className='pl-8 pr-4 pb-2 pt-1 animate-element'>
                                                        {invoiceTransactions.length > 0 ? (
                                                            <table className='w-full text-sm'>
                                                                <tbody>
                                                                {invoiceTransactions.map(tx => (
                                                                    <tr key={tx.id} className='border-b border-border/50'>
                                                                        <td className='py-2 pr-2 text-muted-foreground'>{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short'})}</td>
                                                                        <td className='py-2 px-2 text-foreground'>{tx.description}</td>
                                                                        <td className='py-2 pl-2 text-right text-red-500'>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}</td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <p className='text-center text-muted-foreground text-sm py-2'>Nenhum débito nesta fatura.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        )})}
                                    </ul>
                                ) : (
                                     <p className="text-center text-muted-foreground py-4">Nenhuma fatura encontrada para este cartão.</p>
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
interface ReportsPageProps { transactions: Transaction[]; }
export const ReportsPage: React.FC<ReportsPageProps> = ({ transactions }) => {
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const filteredTransactions = useMemo(() => {
        if (!startDate || !endDate) return transactions;
        return transactions.filter(tx => {
            const txDate = tx.date.substring(0, 10);
            return txDate >= startDate && txDate <= endDate;
        });
    }, [transactions, startDate, endDate]);
    
    const monthlySummaryData = useMemo(() => {
        const summary: { [key: string]: { date: Date; month: string; receitas: number; despesas: number } } = {};
        
        filteredTransactions.forEach(tx => {
            const date = new Date(tx.date);
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            
            if (!summary[key]) {
                summary[key] = { 
                    date: new Date(date.getUTCFullYear(), date.getUTCMonth(), 1),
                    month: date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').replace(/^\w/, c => c.toUpperCase()), 
                    receitas: 0, 
                    despesas: 0 
                };
            }
            if (tx.type === CategoryType.INCOME) summary[key].receitas += tx.amount;
            if (tx.type === CategoryType.EXPENSE) summary[key].despesas += tx.amount;
        });
        
        return Object.values(summary).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [filteredTransactions]);

    return (
        <PageWrapper title="Relatórios">
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm mb-6">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-muted-foreground">Período:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary border border-border rounded-md p-2 text-foreground" />
                    <span className="text-muted-foreground">até</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-secondary border border-border rounded-md p-2 text-foreground" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Despesas por Categoria</h2>
                    <CategoryPieChart data={filteredTransactions} />
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Receitas vs Despesas</h2>
                    <MonthlySummaryBarChart data={monthlySummaryData} />
                </div>
            </div>
        </PageWrapper>
    );
}

// ==================================================================================
// PÁGINA DE REGRAS
// ==================================================================================
interface RulesPageProps { 
    rules: Rule[];
    onAddRule: () => void; 
    onToggleRule: (rule: Rule) => void;
    onDeleteRule: (ruleId: string) => void;
}
export const RulesPage: React.FC<RulesPageProps> = ({ rules, onAddRule, onToggleRule, onDeleteRule }) => {
    return (
        <PageWrapper title="Regras de Automação">
            <div className="flex justify-end mb-4"><ActionButton icon={PlusCircleIcon} onClick={onAddRule} variant="primary">Criar Regra</ActionButton></div>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary"><tr><th className="px-6 py-3 font-medium">Nome da Regra</th><th className="px-6 py-3 font-medium">Condições</th><th className="px-6 py-3 text-center font-medium">Status</th><th className="px-6 py-3 text-center font-medium">Ações</th></tr></thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr key={rule.id} className="border-b border-border hover:bg-secondary">
                                <td className="px-6 py-4 font-medium text-foreground">{rule.name}</td>
                                <td className="px-6 py-4">{rule.conditions}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => onToggleRule(rule)}>{rule.enabled ? <ToggleRightIcon className="h-6 w-6 text-green-500"/> : <ToggleLeftIcon className="h-6 w-6 text-muted-foreground"/>}</button>
                                </td>
                                <td className="px-6 py-4"><div className="flex items-center justify-center space-x-3"><button className="text-muted-foreground hover:text-foreground"><EditIcon className="h-4 w-4" /></button><button onClick={() => onDeleteRule(rule.id)} className="text-muted-foreground hover:text-red-500"><Trash2Icon className="h-4 w-4" /></button></div></td>
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
    onDeleteCategory: (categoryId: string) => void;
}
export const CategoriesPage: React.FC<CategoriesPageProps> = ({ categories, onAddCategory, onDeleteCategory }) => {
    return (
        <PageWrapper title="Categorias">
            <div className="flex justify-end mb-4"><ActionButton icon={PlusCircleIcon} onClick={onAddCategory} variant="primary">Adicionar Categoria</ActionButton></div>
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
                            <tr key={cat.id} className="border-b border-border hover:bg-secondary">
                                <td className="px-6 py-4 font-medium text-foreground">
                                    <div className="flex items-center">
                                        <span className="h-3 w-3 rounded-full mr-3" style={{ backgroundColor: cat.color }}></span>
                                        {cat.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        cat.type === CategoryType.INCOME ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                    }`}>
                                        {cat.type === CategoryType.INCOME ? 'Receita' : 'Despesa'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center space-x-3">
                                        <button className="text-muted-foreground hover:text-foreground"><EditIcon className="h-4 w-4" /></button>
                                        <button onClick={() => onDeleteCategory(cat.id)} className="text-muted-foreground hover:text-red-500"><Trash2Icon className="h-4 w-4" /></button>
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
export const SettingsPage: React.FC<SettingsPageProps> = ({ user, profile, onProfileUpdate, theme, setTheme }) => {
    const { addNotification } = useNotifications();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState({ profile: false, password: false });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(prev => ({ ...prev, profile: true }));
        
        const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
        
        if (error) {
            addNotification({ title: 'Erro', message: 'Não foi possível atualizar o perfil.', type: 'warning' });
        } else {
            addNotification({ title: 'Sucesso', message: 'Perfil atualizado!', type: 'success' });
            onProfileUpdate();
        }
        setLoading(prev => ({ ...prev, profile: false }));
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addNotification({ title: 'Erro', message: 'As senhas não coincidem.', type: 'warning' });
            return;
        }
        if (newPassword.length < 6) {
            addNotification({ title: 'Erro', message: 'A nova senha deve ter pelo menos 6 caracteres.', type: 'warning' });
            return;
        }

        setLoading(prev => ({ ...prev, password: true }));
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(prev => ({ ...prev, password: false }));

        if (error) {
            addNotification({ title: 'Erro ao Atualizar', message: error.message, type: 'warning' });
        } else {
            addNotification({ title: 'Sucesso!', message: 'Sua senha foi alterada.', type: 'success' });
            setNewPassword('');
            setConfirmPassword('');
        }
    };
    
    return (
        <PageWrapper title="Configurações">
            <div className="space-y-8">
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h3 className="text-lg font-semibold border-b border-border pb-4 mb-6 text-foreground">Aparência</h3>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">Tema</label>
                        <div className="flex items-center gap-2 rounded-lg bg-secondary p-1">
                            <button onClick={() => setTheme('light')} className={`p-2 rounded-md transition-colors ${theme === 'light' ? 'bg-background shadow-sm' : 'hover:bg-accent'}`}><SunIcon className="w-5 h-5"/></button>
                            <button onClick={() => setTheme('dark')} className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-background shadow-sm' : 'hover:bg-accent'}`}><MoonIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h3 className="text-lg font-semibold border-b border-border pb-4 mb-6 text-foreground">Informações do Perfil</h3>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                         <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-muted-foreground mb-1">Nome Completo</label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            />
                        </div>
                         <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <p className="text-foreground mt-1 p-3 bg-secondary rounded-md text-muted-foreground">{user.email}</p>
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
                    <h3 className="text-lg font-semibold border-b border-border pb-4 mb-6 text-foreground">Alterar Senha</h3>
                     <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div>
                            <label htmlFor="new-password"className="block text-sm font-medium text-muted-foreground mb-1">Nova Senha</label>
                            <input
                                type="password"
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password"className="block text-sm font-medium text-muted-foreground mb-1">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
    fixedExpenses: FixedExpense[];
    monthlyFixedExpenses: MonthlyFixedExpense[];
    categories: Category[];
    accounts: Account[];
    onSaveTransaction: (
        transaction: Omit<Transaction, 'id' | 'current_installment' | 'parent_transaction_id'>,
        options?: { showNotification?: boolean }
    ) => Promise<string | null>;
    onDataNeedsRefresh: () => void;
}

const FixedExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: Omit<FixedExpense, 'id' | 'is_active' | 'category'>) => void;
    expenseToEdit: FixedExpense | null;
    categories: Category[];
}> = ({ isOpen, onClose, onSave, expenseToEdit, categories }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [notes, setNotes] = useState('');
    const isEditing = !!expenseToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditing && expenseToEdit) {
                setName(expenseToEdit.name);
                setAmount(String(expenseToEdit.default_amount));
                setDueDay(String(expenseToEdit.due_day));
                setCategoryId(expenseToEdit.category_id || '');
                setNotes(expenseToEdit.notes || '');
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
        onSave({ 
            name, 
            default_amount: parseFloat(amount), 
            due_day: parseInt(dueDay, 10), 
            category_id: categoryId, 
            notes: notes || null 
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
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
                            className="w-full bg-secondary border border-border rounded-md p-3 text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="Valor Padrão"
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
                            className="w-full bg-secondary border border-border rounded-md p-3 text-foreground placeholder:text-muted-foreground"
                        />
                        <select
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                            required
                            className="w-full bg-secondary border border-border rounded-md p-3 text-foreground"
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
                            className="w-full bg-secondary border border-border rounded-md p-3 h-24 text-foreground placeholder:text-muted-foreground resize-none"
                        />
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
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(parseFloat(amount))}
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
    );
};

export const FixedExpensesPage: React.FC<FixedExpensesPageProps> = ({
    fixedExpenses,
    monthlyFixedExpenses,
    categories,
    accounts,
    onSaveTransaction,
    onDataNeedsRefresh,
}) => {
    const { addNotification } = useNotifications();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isPayModalOpen, setPayModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] =
        useState<MonthlyFixedExpense | null>(null);

    const currentMonthStr = useMemo(
        () =>
            `${currentDate.getFullYear()}-${String(
                currentDate.getMonth() + 1
            ).padStart(2, '0')}`,
        [currentDate]
    );

    const generateMonthlyExpenses = useCallback(
        async (month: string) => {
            const activeFixedExpenses = fixedExpenses.filter(fe => fe.is_active);
            const existingMonthlyExpensesForMonth = monthlyFixedExpenses.filter(
                mfe => mfe.month === month
            );

            const expensesToCreate = activeFixedExpenses.filter(
                fe =>
                    !existingMonthlyExpensesForMonth.some(
                        mfe => mfe.fixed_expense_id === fe.id
                    )
            );

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
                    };
                });
                const { error } = await supabase
                    .from('monthly_fixed_expenses')
                    .insert(newMonthlyEntries);
                if (error) {
                    addNotification({
                        title: 'Erro',
                        message: 'Falha ao gerar despesas fixas para o mês.',
                        type: 'warning',
                    });
                } else {
                    addNotification({
                        title: 'Sucesso',
                        message: `Geradas ${newMonthlyEntries.length} despesas para o mês.`,
                        type: 'success',
                    });
                    onDataNeedsRefresh();
                }
            }
        },
        [fixedExpenses, monthlyFixedExpenses, addNotification, onDataNeedsRefresh]
    );

    useEffect(() => {
        generateMonthlyExpenses(currentMonthStr);
    }, [currentMonthStr, generateMonthlyExpenses]);

    const expensesForCurrentMonth = useMemo(() => {
        return monthlyFixedExpenses
            .filter(mfe => mfe.month === currentMonthStr)
            .sort(
                (a, b) =>
                    new Date(a.due_date).getDate() -
                    new Date(b.due_date).getDate()
            );
    }, [monthlyFixedExpenses, currentMonthStr]);

    const handleOpenPayModal = (expense: MonthlyFixedExpense) => {
        setSelectedExpense(expense);
        setPayModalOpen(true);
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
                status: TransactionStatus.CLEARED,
            },
            { showNotification: false }
        );

        if (transactionId) {
            const { error } = await supabase
                .from('monthly_fixed_expenses')
                .update({
                    status: 'Pago',
                    amount: amount,
                    transaction_id: transactionId,
                })
                .eq('id', selectedExpense.id);

            if (error) {
                addNotification({
                    title: 'Erro',
                    message: 'Falha ao atualizar status da despesa.',
                    type: 'warning',
                });
            } else {
                addNotification({
                    title: 'Sucesso',
                    message: 'Despesa marcada como paga!',
                    type: 'success',
                });
                onDataNeedsRefresh();
            }
        } else {
            addNotification({
                title: 'Erro',
                message: 'Falha ao criar a transação de pagamento.',
                type: 'warning',
            });
        }
    };
    
    const handleSaveNewFixedExpense = async (
        expense: Omit<FixedExpense, 'id' | 'is_active' | 'category'>
    ) => {
        const { error } = await supabase
            .from('fixed_expenses')
            .insert({ ...expense, is_active: true });
        if (error) {
            addNotification({
                title: 'Erro',
                message: 'Não foi possível salvar a despesa.',
                type: 'warning',
            });
        } else {
            addNotification({
                title: 'Sucesso',
                message: 'Despesa fixa criada!',
                type: 'success',
            });
            onDataNeedsRefresh();
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
                                year: 'numeric',
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
                    onClick={() => setAddModalOpen(true)}
                    variant="primary"
                >
                    Adicionar Despesa
                </ActionButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {expensesForCurrentMonth.map(item => (
                    <div
                        key={item.id}
                        className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-bold text-foreground">
                                    {item.fixedExpense?.name}
                                </h3>
                                <span
                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        item.status === 'Pago'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                >
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-foreground mb-1">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(item.amount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Vence dia{' '}
                                {new Date(item.due_date).getUTCDate()}
                            </p>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button className="text-sm font-medium text-muted-foreground hover:text-foreground">
                                Editar
                            </button>
                            {item.status === 'Não pago' && (
                                <button
                                    onClick={() => handleOpenPayModal(item)}
                                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    Marcar como Paga
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <FixedExpenseModal 
                isOpen={isAddModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSave={handleSaveNewFixedExpense}
                expenseToEdit={null}
                categories={categories}
            />

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
