import React, { FC } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction } from '../../types';

interface CategoryPieChartProps {
    data: Transaction[];
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
        <text x={x} y={y} fill="var(--primary-foreground)" textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export const CategoryPieChart: FC<CategoryPieChartProps> = ({ data }) => {
    const expenseData = data.filter(tx => tx.type === 'expense');
    
    const categoryTotals = expenseData.reduce((acc, tx) => {
        if (!tx.category) return acc;

        const categoryName = tx.category.name;
        if (!acc[categoryName]) {
            acc[categoryName] = { name: categoryName, value: 0, color: tx.category.color };
        }
        acc[categoryName].value += tx.amount;
        return acc;
    }, {} as { [key: string]: { name: string; value: number; color: string } });

    const chartData = Object.values(categoryTotals);

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        stroke="var(--card)"
                    >
                        {chartData.map((entry: any, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--popover)',
                            borderColor: 'var(--border)',
                            borderRadius: '0.5rem',
                            color: 'var(--popover-foreground)',
                        }}
                        itemStyle={{ color: 'var(--popover-foreground)' }}
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    />
                     <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: 'var(--muted-foreground)' }}
                     />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};