import React, { useMemo } from 'react';
import { KpiCard } from './KpiCard';
import { CategoryPieChart } from './charts/CategoryPieChart';
import { KpiData, Transaction, Account, AccountType, MonthlySummaryData, Budget, Category, CreditInvoice, CategoryType } from '../types';
import { MoreVerticalIcon, CreditCardIcon } from './icons';
import { MonthlySummaryBarChart } from './charts/MonthlySummaryBarChart';

interface DashboardProps {
    accounts: Account[];
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
    invoices: CreditInvoice[];
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


export const Dashboard: React.FC<DashboardProps> = ({ accounts, transactions, budgets, categories, invoices }) => {
    
    const { kpiData, currentMonthTransactions } = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();

        const currentMonthTxs = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
        });

        const prevMonthTxs = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
        });

        const calculateTotal = (txs: Transaction[], type: CategoryType) => txs.filter(tx => tx.type === type).reduce((sum, tx) => sum + tx.amount, 0);

        const receitasDoMes = calculateTotal(currentMonthTxs, CategoryType.INCOME);
        const despesasDoMes = calculateTotal(currentMonthTxs, CategoryType.EXPENSE);
        const receitasMesAnterior = calculateTotal(prevMonthTxs, CategoryType.INCOME);
        const despesasMesAnterior = calculateTotal(prevMonthTxs, CategoryType.EXPENSE);
        
        const poupanca = receitasDoMes - despesasDoMes;
        const balancoTotal = accounts
            .filter(acc => acc.type !== AccountType.CREDIT_CARD)
            .reduce((sum, acc) => sum + acc.balance, 0);

        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };
        
        const data: KpiData[] = [
            {
                title: 'Receitas do Mês',
                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receitasDoMes),
                change: calculateChange(receitasDoMes, receitasMesAnterior),
                changeType: receitasDoMes >= receitasMesAnterior ? 'increase' : 'decrease',
            },
            {
                title: 'Despesas do Mês',
                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesasDoMes),
                change: calculateChange(despesasDoMes, despesasMesAnterior),
                changeType: despesasDoMes >= despesasMesAnterior ? 'increase' : 'decrease',
            },
            {
                title: 'Poupança',
                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(poupanca),
            },
            {
                title: 'Balanço Total',
                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balancoTotal),
            },
        ];
        return { kpiData: data, currentMonthTransactions: currentMonthTxs };
    }, [transactions, accounts]);

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
            const spent = currentMonthTransactions
                .filter(tx => tx.category?.id === budget.categoryId && tx.type === CategoryType.EXPENSE)
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            return {
                name: category?.name || 'N/A',
                spent,
                total: budget.amount,
                color: category?.color || '#FFFFFF',
            };
        });
    }, [budgets, categories, currentMonthTransactions]);

    const upcomingBills = useMemo(() => {
        return invoices
            .filter(inv => inv.status === 'Aberta' || inv.status === 'Fechada')
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
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>

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
                        <CategoryPieChart data={transactions} />
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
                            {upcomingBills.map(bill => <UpcomingBillCard key={bill.id} bill={bill} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
