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

const AccountCard: React.FC<{ account: Account }> = ({ account }) => (
    <div className="bg-[#192134] p-4 rounded-lg flex items-center justify-between">
        <div>
            <p className="text-white font-semibold">{account.name}</p>
            <p className="text-sm text-gray-400 capitalize">{account.type.replace('_', ' ')}</p>
        </div>
        <p className={`font-bold text-lg ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
        </p>
    </div>
);

const BudgetCard: React.FC<{ item: { name: string; spent: number; total: number; color: string; } }> = ({ item }) => {
    const percentage = item.total > 0 ? (item.spent / item.total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between mb-1 text-sm">
                <span className="font-medium text-gray-300">{item.name}</span>
                <span className="text-gray-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.spent)} / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                </span>
            </div>
            <div className="w-full bg-[#192134] rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: item.color }}></div>
            </div>
        </div>
    );
};

const UpcomingBillCard: React.FC<{ bill: {id: string; name: string; dueDate: string; amount: number;} }> = ({ bill }) => (
    <div className="flex items-center justify-between p-3 hover:bg-[#192134] rounded-lg">
        <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#192134] flex items-center justify-center">
                 <CreditCardIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-4">
                <p className="font-semibold text-white">{bill.name}</p>
                <p className="text-sm text-gray-400">Vence em {bill.dueDate}</p>
            </div>
        </div>
        <p className="font-semibold text-white">
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
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((item) => <KpiCard key={item.title} item={item} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#10192A] rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Receitas vs Despesas (Últimos 6 meses)</h2>
                        <MonthlySummaryBarChart data={monthlySummaryData} />
                    </div>
                    <div className="bg-[#10192A] rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h2>
                        <CategoryPieChart data={transactions} />
                    </div>

                </div>

                <div className="space-y-8">
                    <div className="bg-[#10192A] rounded-xl shadow-lg p-6">
                         <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white">Contas</h2>
                            <button className="text-gray-400 hover:text-white"><MoreVerticalIcon className="h-5 w-5"/></button>
                        </div>
                        <div className="space-y-4">
                            {accounts.map(acc => <AccountCard key={acc.id} account={acc} />)}
                        </div>
                    </div>

                    <div className="bg-[#10192A] rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Orçamentos</h2>
                        <div className="space-y-4">
                            {budgetDetails.map(item => <BudgetCard key={item.name} item={item} />)}
                        </div>
                    </div>
                    
                    <div className="bg-[#10192A] rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Próximos Vencimentos</h2>
                        <div className="space-y-2">
                            {upcomingBills.map(bill => <UpcomingBillCard key={bill.id} bill={bill} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};