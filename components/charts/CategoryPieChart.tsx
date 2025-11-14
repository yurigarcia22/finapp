import React, { FC } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction } from '../../types';

interface CategoryPieChartProps {
    data: Transaction[];
}

const RADIAN = Math.PI / 180;
// Fix: The recharts library has strict typing for the label prop. Using a less strict
// type for the custom label renderer props resolves the type conflict. The necessary
// properties are passed by recharts at runtime.
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export const CategoryPieChart: FC<CategoryPieChartProps> = ({ data }) => {
    const expenseData = data.filter(tx => tx.type === 'expense');
    
    const categoryTotals = expenseData.reduce((acc, tx) => {
        if (!tx.category) return acc; // Safely skip transactions without a category

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
                    >
                        {/* FIX: Explicitly type 'entry' to avoid type inference issues with recharts library. */}
                        {chartData.map((entry: any, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1E293B',
                            borderColor: '#334155',
                            borderRadius: '0.5rem',
                        }}
                        itemStyle={{ color: '#E2E8F0' }}
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    />
                     <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }}
                     />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};