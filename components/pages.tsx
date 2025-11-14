
import React, { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { Account, AccountType, Category, CategoryType, Transaction, TransactionStatus, CreditInvoice, Budget, Rule } from '../types';
import { FilterIcon, UploadIcon, DownloadIcon, EditIcon, Trash2Icon, CreditCardIcon, WalletIcon, PlusCircleIcon, ToggleLeftIcon, ToggleRightIcon, UserIcon, TagIcon, ChevronDownIcon } from './icons';
import { CategoryPieChart } from './charts/CategoryPieChart';
import { MonthlySummaryBarChart } from './charts/MonthlySummaryBarChart';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../supabase';


// ==================================================================================
// COMPONENTES UTILITÁRIOS
// ==================================================================================
const PageWrapper: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <div className="text-white animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        {children}
    </div>
);

const ActionButton: React.FC<{ icon: React.ElementType, children: React.ReactNode, onClick?: () => void, className?: string }> = ({ icon: Icon, children, onClick, className = '' }) => (
    <button onClick={onClick} className={`flex items-center bg-[#1E293B] hover:bg-[#334155] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 ${className}`}>
        <Icon className="h-5 w-5 mr-2" />
        {children}
    </button>
);

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
                    <div className="bg-[#10192A] p-4 rounded-xl shadow-lg space-y-4 animate-fade-in-down">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="text-sm font-medium text-gray-400 block mb-2">Tipo</label>
                                <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-2 text-white">
                                    <option value="all">Todos</option>
                                    <option value={CategoryType.INCOME}>Receitas</option>
                                    <option value={CategoryType.EXPENSE}>Despesas</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-400 block mb-2">Conta</label>
                                <select value={filters.accountId} onChange={e => handleFilterChange('accountId', e.target.value)} className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-2 text-white">
                                    <option value="all">Todas as Contas</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                             <label className="text-sm font-medium text-gray-400 block mb-2">Período</label>
                             <div className="flex flex-wrap gap-2">
                                {datePresets.map(preset => (
                                    <button key={preset.key} onClick={() => handleDatePresetChange(preset.key)} className={`px-3 py-1 rounded-md text-sm ${filters.datePreset === preset.key ? 'bg-[#6464FF] text-white' : 'bg-[#1E293B]'}`}>{preset.label}</button>
                                ))}
                             </div>
                        </div>
                        {filters.datePreset === 'custom' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                 <div>
                                     <label className="text-sm font-medium text-gray-400 block mb-2">Data Início</label>
                                     <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-2 text-white" />
                                 </div>
                                 <div>
                                     <label className="text-sm font-medium text-gray-400 block mb-2">Data Fim</label>
                                     <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-2 text-white" />
                                 </div>
                             </div>
                        )}
                        <div className="flex justify-end pt-2">
                            <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-white">Limpar Filtros</button>
                        </div>
                    </div>
                )}

                <div className="bg-[#10192A] rounded-xl shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-[#192134]">
                                <tr>
                                    <th scope="col" className="p-4 w-12">Status</th>
                                    <th scope="col" className="px-6 py-3">Descrição</th>
                                    <th scope="col" className="px-6 py-3">Categoria</th>
                                    <th scope="col" className="px-6 py-3">Data</th>
                                    <th scope="col" className="px-6 py-3">Conta</th>
                                    <th scope="col" className="px-6 py-3 text-right">Valor</th>
                                    <th scope="col" className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-[#192134] hover:bg-[#192134]/50">
                                        <td className="p-4"><div className="flex justify-center"><span className={`h-3 w-3 rounded-full ${statusMap[tx.status].color}`} title={statusMap[tx.status].text}></span></div></td>
                                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{tx.description}</td>
                                        <td className="px-6 py-4"><div className="flex items-center"><span className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: tx.category?.color || '#808080' }}></span>{tx.category?.name || 'Sem Categoria'}</div></td>
                                        <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-6 py-4">{getAccountName(tx.accountId)}</td>
                                        <td className={`px-6 py-4 text-right font-semibold ${tx.type === CategoryType.INCOME ? 'text-green-400' : 'text-white'}`}>
                                            {tx.type === CategoryType.EXPENSE ? '-' : ''}
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                        </td>
                                        <td className="px-6 py-4"><div className="flex items-center justify-center space-x-3"><button className="text-gray-400 hover:text-white"><EditIcon className="h-5 w-5" /></button><button onClick={() => onDeleteTransaction(tx)} className="text-gray-400 hover:text-red-500"><Trash2Icon className="h-5 w-5" /></button></div></td>
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
    const accountIcons: { [key in AccountType]: React.ReactElement } = {
        [AccountType.CHECKING]: <WalletIcon className="h-6 w-6 text-[#6464FF]" />,
        [AccountType.SAVINGS]: <WalletIcon className="h-6 w-6 text-green-400" />,
        [AccountType.WALLET]: <WalletIcon className="h-6 w-6 text-yellow-400" />,
        [AccountType.CREDIT_CARD]: <CreditCardIcon className="h-6 w-6 text-red-400" />,
        [AccountType.INVESTMENT]: <WalletIcon className="h-6 w-6 text-indigo-400" />,
        [AccountType.LOAN]: <WalletIcon className="h-6 w-6 text-orange-400" />,
    };

    return (
        <PageWrapper title="Contas">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(account => (
                    <div key={account.id} className="relative bg-[#10192A] p-6 rounded-xl shadow-lg flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300 group">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1">
                            <button onClick={() => onEditAccount(account)} className="p-2 bg-[#1E293B] rounded-full text-gray-400 hover:text-white hover:bg-[#334155] transition-colors" aria-label={`Editar conta ${account.name}`}>
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDeleteAccount(account.id)} className="p-2 bg-[#1E293B] rounded-full text-gray-400 hover:text-red-500 hover:bg-[#334155] transition-colors" aria-label={`Excluir conta ${account.name}`}>
                                <Trash2Icon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-lg font-semibold text-white">{account.name}</p>
                                <p className="text-sm text-gray-400 capitalize">{account.type.replace('_', ' ')}</p>
                            </div>
                            <div className="p-2 bg-[#192134] rounded-lg">{accountIcons[account.type]}</div>
                        </div>
                        <div className="mt-4">
                            {account.type === AccountType.CREDIT_CARD ? (
                                <>
                                    <p className="text-sm text-gray-500">Limite do Cartão</p>
                                    <p className="text-2xl font-bold text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.limit || 0)}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-500">Saldo Atual</p>
                                    <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                 <button onClick={onAddAccount} className="border-2 border-dashed border-gray-600 hover:border-[#6464FF] hover:text-[#6464FF] text-gray-500 rounded-xl flex flex-col items-center justify-center p-6 transition-all duration-300 group">
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
            <div className="flex justify-end mb-4"><ActionButton icon={PlusCircleIcon} onClick={onAddBudget}>Criar Orçamento</ActionButton></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {budgetDetails.map(item => {
                    const percentage = Math.min((item.spent / item.amount) * 100, 100);
                    return (
                        <div key={item.id} className="bg-[#10192A] p-6 rounded-xl shadow-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-white">{item.categoryName}</h3>
                                <span className="text-sm text-gray-400">{percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[#192134] rounded-full h-3 mb-2">
                                <div className="h-3 rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }}></div>
                            </div>
                            <div className="text-right text-sm text-gray-300">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.spent)} / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
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
}
export const CardsPage: React.FC<CardsPageProps> = ({ invoices, onPayInvoice, accounts, transactions }) => {
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
        const dueDate = new Date(invoice.dueDate);
        // Invoice month is the month before the due date
        const invoiceDate = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth() - 1, 1));
        const invoiceMonth = invoiceDate.getUTCMonth();
        const invoiceYear = invoiceDate.getUTCFullYear();

        return transactions.filter(tx => {
            if (tx.accountId !== invoice.cardId || tx.type !== CategoryType.EXPENSE) return false;
            const txDate = new Date(tx.date);
            return txDate.getUTCMonth() === invoiceMonth && txDate.getUTCFullYear() === invoiceYear;
        });
    };
    
    return (
        <PageWrapper title="Cartões de Crédito">
            {creditCardAccounts.length === 0 ? (
                <div className="bg-[#10192A] p-6 rounded-xl shadow-lg text-center text-gray-400">
                    <p>Nenhum cartão de crédito cadastrado.</p>
                    <p className="text-sm mt-2">Adicione um na página 'Contas' para vê-lo aqui.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {creditCardAccounts.map(card => {
                        const cardInvoices = invoices
                            .filter(inv => inv.cardId === card.id)
                            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
                        const currentInvoice = cardInvoices.find(inv => inv.status === 'Aberta');
                        const statusColor: { [key: string]: string } = { 'Aberta': 'text-yellow-400', 'Paga': 'text-green-400', 'Fechada': 'text-red-400' };

                        return (
                            <div key={card.id} className="bg-[#10192A] p-6 rounded-xl shadow-lg">
                                <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-700">
                                    <div className="flex items-center">
                                        <CreditCardIcon className="h-10 w-10 text-purple-400" />
                                        <div className="ml-4">
                                            <h2 className="text-xl font-bold text-white">{card.name}</h2>
                                            <p className="text-sm text-gray-400">Limite: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limit || 0)}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Fatura Atual</p>
                                        <p className="text-xl font-semibold text-yellow-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentInvoice?.amount || 0)}
                                        </p>
                                    </div>
                                </div>
                                <h3 className="font-semibold mb-4 text-white">Últimas Faturas</h3>
                                {cardInvoices.length > 0 ? (
                                    <ul className="space-y-1">
                                        {cardInvoices.map(invoice => {
                                            const invoiceTransactions = getTransactionsForInvoice(invoice);
                                            const isExpanded = expandedInvoices.has(invoice.id);
                                            return (
                                            <React.Fragment key={invoice.id}>
                                                <li className="flex justify-between items-center p-3 bg-[#192134] rounded-lg cursor-pointer hover:bg-[#1E293B]" onClick={() => toggleInvoiceDetails(invoice.id)}>
                                                    <div className='flex items-center'>
                                                        <ChevronDownIcon className={`h-5 w-5 text-gray-400 mr-3 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        <div>
                                                            <span className="font-semibold text-white">{invoice.month}</span>
                                                            <span className={`ml-3 text-sm font-bold ${statusColor[invoice.status]}`}>{invoice.status}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}</p>
                                                        <p className="text-xs text-gray-500">Venc. {new Date(invoice.dueDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                                    </div>
                                                    {invoice.status !== 'Paga' && (
                                                        <button onClick={(e) => { e.stopPropagation(); onPayInvoice(invoice); }} className="bg-[#6464FF] text-white px-3 py-1 text-sm rounded-md hover:bg-indigo-500 transition-colors ml-4">Pagar Fatura</button>
                                                    )}
                                                </li>
                                                {isExpanded && (
                                                    <div className='pl-8 pr-4 pb-2 pt-1 animate-fade-in-down'>
                                                        {invoiceTransactions.length > 0 ? (
                                                            <table className='w-full text-sm'>
                                                                <tbody>
                                                                {invoiceTransactions.map(tx => (
                                                                    <tr key={tx.id} className='border-b border-gray-700/50'>
                                                                        <td className='py-2 pr-2 text-gray-400'>{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short'})}</td>
                                                                        <td className='py-2 px-2 text-white'>{tx.description}</td>
                                                                        <td className='py-2 pl-2 text-right text-red-400'>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}</td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <p className='text-center text-gray-500 text-sm py-2'>Nenhum débito nesta fatura.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        )})}
                                    </ul>
                                ) : (
                                     <p className="text-center text-gray-500 py-4">Nenhuma fatura encontrada para este cartão.</p>
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
            <div className="bg-[#10192A] p-4 rounded-xl shadow-lg mb-6">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-400">Período:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-[#1E293B] border border-gray-600 rounded-md p-2 text-white" />
                    <span className="text-gray-400">até</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-[#1E293B] border border-gray-600 rounded-md p-2 text-white" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#10192A] p-6 rounded-xl shadow-lg">
                    <h2 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h2>
                    <CategoryPieChart data={filteredTransactions} />
                </div>
                <div className="bg-[#10192A] p-6 rounded-xl shadow-lg">
                    <h2 className="text-lg font-semibold text-white mb-4">Receitas vs Despesas</h2>
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
            <div className="flex justify-end mb-4"><ActionButton icon={PlusCircleIcon} onClick={onAddRule}>Criar Regra</ActionButton></div>
            <div className="bg-[#10192A] rounded-xl shadow-lg overflow-hidden">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-[#192134]"><tr><th className="px-6 py-3">Nome da Regra</th><th className="px-6 py-3">Condições</th><th className="px-6 py-3 text-center">Status</th><th className="px-6 py-3 text-center">Ações</th></tr></thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr key={rule.id} className="border-b border-[#192134] hover:bg-[#192134]/50">
                                <td className="px-6 py-4 font-medium text-white">{rule.name}</td>
                                <td className="px-6 py-4">{rule.conditions}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => onToggleRule(rule)}>{rule.enabled ? <ToggleRightIcon className="h-6 w-6 text-green-500"/> : <ToggleLeftIcon className="h-6 w-6 text-gray-600"/>}</button>
                                </td>
                                <td className="px-6 py-4"><div className="flex items-center justify-center space-x-3"><button className="text-gray-400 hover:text-white"><EditIcon className="h-5 w-5" /></button><button onClick={() => onDeleteRule(rule.id)} className="text-gray-400 hover:text-red-500"><Trash2Icon className="h-5 w-5" /></button></div></td>
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
            <div className="flex justify-end mb-4"><ActionButton icon={PlusCircleIcon} onClick={onAddCategory}>Adicionar Categoria</ActionButton></div>
            <div className="bg-[#10192A] rounded-xl shadow-lg overflow-hidden">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-[#192134]">
                        <tr>
                            <th className="px-6 py-3">Nome</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.id} className="border-b border-[#192134] hover:bg-[#192134]/50">
                                <td className="px-6 py-4 font-medium text-white">
                                    <div className="flex items-center">
                                        <span className="h-3 w-3 rounded-full mr-3" style={{ backgroundColor: cat.color }}></span>
                                        {cat.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        cat.type === CategoryType.INCOME ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                        {cat.type === CategoryType.INCOME ? 'Receita' : 'Despesa'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center space-x-3">
                                        <button className="text-gray-400 hover:text-white"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => onDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-500"><Trash2Icon className="h-5 w-5" /></button>
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
}
export const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
    const { addNotification } = useNotifications();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

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

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(false);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#10192A] rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold border-b border-gray-700 pb-3 mb-4 text-white">Informações do Perfil</h3>
                    <div className="space-y-4">
                         <div>
                            <label className="text-sm font-medium text-gray-400">Email</label>
                            <p className="text-white mt-1 p-3 bg-[#1E293B] rounded-md">{user.email}</p>
                        </div>
                         <div>
                            <label className="text-sm font-medium text-gray-400">Último Login</label>
                            <p className="text-white mt-1 p-3 bg-[#1E293B] rounded-md">{new Date(user.last_sign_in_at || '').toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[#10192A] rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold border-b border-gray-700 pb-3 mb-4 text-white">Alterar Senha</h3>
                     <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div>
                            <label htmlFor="new-password"className="block text-sm font-medium text-gray-400 mb-1">Nova Senha</label>
                            <input
                                type="password"
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password"className="block text-sm font-medium text-gray-400 mb-1">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white"
                            />
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-[#6464FF] hover:bg-indigo-500 font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </PageWrapper>
    );
};
