import React, { useMemo, useState, useRef, useEffect } from 'react';
import { KpiCard } from './KpiCard';
import { CategoryPieChart } from './charts/CategoryPieChart';
import { KpiData, Transaction, Account, AccountType, MonthlySummaryData, Budget, Category, CreditInvoice, CategoryType, OverdueData } from '../types';
import { MoreVerticalIcon, CreditCardIcon, ChevronDownIcon, AlertTriangleIcon } from './icons';
import { MonthlySummaryBarChart } from './charts/MonthlySummaryBarChart';

interface DashboardProps {
    accounts: Account[];
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
    invoices: CreditInvoice[];
    overdueData: OverdueData;
}

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

const AccountCard: React.FC<{ account: Account }> = ({ account }) => (
    <div className="bg-secondary p-4 rounded-lg flex items-center justify-between">
        <div>
            <p className="text-secondary-foreground font-semibold">{account.name}</p>
            <p className="text-sm text-muted-foreground">{translateAccountType(account.type)}</p>
        </div>
        <p className={`font-bold text-lg ${account.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
        </p>
    </div>
);

const BudgetCard: React.FC<{ item: { name: string; spent: number; total: number; color: string; } }> = ({ item }) => {
    const percentage = item.total > 0 ? (item.spent / item.total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between mb-1.5 text-sm">
                <span className="font-medium text-card-foreground">{item.name}</span>
                <span className="text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.spent)} / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: item.color }}></div>
            </div>
        </div>
    );
};

const UpcomingBillCard: React.FC<{ bill: {id: string; name: string; dueDate: string; amount: number;} }> = ({ bill }) => (
    <div className="flex items-center justify-between p-3 hover:bg-secondary rounded-lg transition-colors duration-200">
        <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                 <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="ml-4">
                <p className="font-semibold text-card-foreground">{bill.name}</p>
                <p className="text-sm text-muted-foreground">Vence em {bill.dueDate}</p>
            </div>
        </div>
        <p className="font-semibold text-card-foreground">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
        </p>
    </div>
);

const periodOptions = [
    { value: 'thisMonth', label: 'Este Mês' },
    { value: 'today', label: 'Hoje' },
    { value: 'last7days', label: 'Últimos 7 dias' },
    { value: 'last30days', label: 'Últimos 30 dias' },
    { value: 'thisYear', label: 'Este Ano' }
];

const PeriodFilter: React.FC<{ value: string; onChange: (value: string) => void; }> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = periodOptions.find(opt => opt.value === value)?.label;

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                <span>{selectedLabel}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-border ring-opacity-5 focus:outline-none animate-element z-20">
                    <div className="py-1">
                        {periodOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left block px-4 py-2 text-sm ${value === option.value ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-accent'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const OverdueAlerts: React.FC<{ overdueData: OverdueData }> = ({ overdueData }) => {
    const { overdueFixedExpenses, overdueInvoices } = overdueData;
    const totalOverdue = overdueFixedExpenses.length + overdueInvoices.length;

    if (totalOverdue === 0) {
        return null;
    }

    const totalFixedAmount = overdueFixedExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalInvoiceAmount = overdueInvoices.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-start gap-4 animate-element">
            <AlertTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
                <h3 className="font-bold text-lg text-red-600 dark:text-red-300">Avisos Importantes!</h3>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                    {overdueInvoices.length > 0 && (
                        <li>
                            Você tem <strong>{overdueInvoices.length} {overdueInvoices.length > 1 ? 'faturas vencidas' : 'fatura vencida'}</strong>, totalizando{' '}
                            <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvoiceAmount)}</strong>.
                        </li>
                    )}
                     {overdueFixedExpenses.length > 0 && (
                        <li>
                            Você tem <strong>{overdueFixedExpenses.length} {overdueFixedExpenses.length > 1 ? 'despesas fixas vencidas' : 'despesa fixa vencida'}</strong>, totalizando{' '}
                            <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFixedAmount)}</strong>.
                        </li>
                    )}
                </ul>
                 <p className="text-xs mt-3">Acesse as páginas de <span className="font-semibold underline">Cartões</span> e <span className="font-semibold underline">Fixas</span> para regularizar.</p>
            </div>
        </div>
    );
};


export const Dashboard: React.FC<DashboardProps> = ({ accounts, transactions, budgets, categories, invoices, overdueData }) => {
    const [period, setPeriod] = useState('thisMonth');
    
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        const endDate = new Date(now);
    
        endDate.setHours(23, 59, 59, 999);
    
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'last7days':
                startDate.setDate(now.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'last30days':
                startDate.setDate(now.getDate() - 29);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'thisYear':
                startDate = new Date(now.getFullYear(), 0, 1);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'thisMonth':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                break;
        }
    
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
    
        return transactions.filter(tx => {
            const txDate = tx.date;
            return txDate >= startStr && txDate <= endStr;
        });
    
    }, [transactions, period]);

    const kpiData = useMemo(() => {
        const receitas = filteredTransactions.filter(tx => tx.type === CategoryType.INCOME).reduce((sum, tx) => sum + tx.amount, 0);
        const despesas = filteredTransactions.filter(tx => tx.type === CategoryType.EXPENSE).reduce((sum, tx) => sum + tx.amount, 0);
        const poupanca = receitas - despesas;
        const balancoTotal = accounts
            .filter(acc => acc.type !== AccountType.CREDIT_CARD)
            .reduce((sum, acc) => sum + acc.balance, 0);
        
        const periodLabels: { [key: string]: string } = {
            thisMonth: 'Este Mês',
            today: 'Hoje',
            last7days: 'Últimos 7 dias',
            last30days: 'Últimos 30 dias',
            thisYear: 'Este Ano'
        };
        const titleSuffix = periodLabels[period as keyof typeof periodLabels] || 'Este Mês';
        
        const data: KpiData[] = [
            { title: `Receitas (${titleSuffix})`, value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receitas) },
            { title: `Despesas (${titleSuffix})`, value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesas) },
            { title: `Movimentações (${titleSuffix.toLowerCase()})`, value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(poupanca) },
            { title: 'Balanço Total', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balancoTotal) },
        ];
        return data;
    }, [filteredTransactions, accounts, period]);

    const regularAccounts = useMemo(() => accounts.filter(acc => acc.type !== AccountType.CREDIT_CARD), [accounts]);
    const creditCardAccounts = useMemo(() => accounts.filter(acc => acc.type === AccountType.CREDIT_CARD), [accounts]);

    const monthlySummaryData = useMemo(() => {
        const data: MonthlySummaryData[] = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const monthName = date.toLocaleString('pt-BR', { month: 'short' });
            const month = date.getMonth();
            const year = date.getFullYear();

            const monthTxs = transactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate.getMonth() === month && txDate.getFullYear() === year;
            });
            
            const receitas = monthTxs.filter(tx => tx.type === CategoryType.INCOME).reduce((sum, tx) => sum + tx.amount, 0);
            const despesas = monthTxs.filter(tx => tx.type === CategoryType.EXPENSE).reduce((sum, tx) => sum + tx.amount, 0);
            
            data.push({ month: monthName.charAt(0).toUpperCase() + monthName.slice(1), receitas, despesas });
        }
        return data;
    }, [transactions]);
    
    const budgetDetails = useMemo(() => {
        return budgets.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            const spent = filteredTransactions
                .filter(tx => tx.category?.id === budget.categoryId && tx.type === CategoryType.EXPENSE)
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            return {
                name: category?.name || 'N/A',
                spent,
                total: budget.amount,
                color: category?.color || '#FFFFFF',
            };
        });
    }, [budgets, categories, filteredTransactions]);

    const upcomingBills = useMemo(() => {
        return invoices
            .filter(inv => (inv.status === 'Aberta' || inv.status === 'Fechada') && inv.amount > 0)
            .map(inv => {
                const card = accounts.find(acc => acc.id === inv.cardId);
                return {
                    id: inv.id,
                    name: `Fatura ${card?.name || 'Cartão'}`,
                    dueDate: new Date(inv.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'short' }),
                    amount: inv.amount,
                };
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [invoices, accounts]);


    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <PeriodFilter value={period} onChange={setPeriod} />
            </div>

            <OverdueAlerts overdueData={overdueData} />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((item) => <KpiCard key={item.title} item={item} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-card-foreground mb-4">Receitas vs Despesas (Últimos 6 meses)</h2>
                        <MonthlySummaryBarChart data={monthlySummaryData} />
                    </div>
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-card-foreground mb-4">Despesas por Categoria</h2>
                        <CategoryPieChart data={filteredTransactions} />
                    </div>

                </div>

                <div className="space-y-8">
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                         <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-card-foreground">Contas</h2>
                            <button className="text-muted-foreground hover:text-foreground"><MoreVerticalIcon className="h-5 w-5"/></button>
                        </div>
                        <div className="space-y-3">
                            {regularAccounts.slice(0, 5).map(acc => <AccountCard key={acc.id} account={acc} />)}
                        </div>
                    </div>

                    {creditCardAccounts.length > 0 && (
                        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-card-foreground">Cartões de Crédito</h2>
                                <button className="text-muted-foreground hover:text-foreground"><MoreVerticalIcon className="h-5 w-5"/></button>
                            </div>
                            <div className="space-y-3">
                                {creditCardAccounts.map(card => {
                                    const openInvoice = invoices.find(inv => inv.cardId === card.id && inv.status === 'Aberta');
                                    const nextInvoice = invoices
                                        .filter(inv => inv.cardId === card.id && (inv.status === 'Aberta' || inv.status === 'Fechada'))
                                        .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

                                    const dueDateText = nextInvoice
                                        ? `Vence em ${new Date(nextInvoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'short' })}`
                                        : `Vencimento dia ${card.due_day}`;

                                    return (
                                        <div key={card.id} className="bg-secondary p-4 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="text-secondary-foreground font-semibold">{card.name}</p>
                                                <p className="text-sm text-muted-foreground">{dueDateText}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Fatura Aberta</p>
                                                <p className="font-bold text-lg text-yellow-500">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(openInvoice?.amount || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-card-foreground mb-4">Orçamentos</h2>
                        <div className="space-y-4">
                            {budgetDetails.map(item => <BudgetCard key={item.name} item={item} />)}
                        </div>
                    </div>
                    
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-card-foreground mb-4">Próximos Vencimentos</h2>
                        <div className="space-y-2">
                            {upcomingBills.length > 0 ? (
                                upcomingBills.map(bill => <UpcomingBillCard key={bill.id} bill={bill} />)
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum vencimento próximo.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};