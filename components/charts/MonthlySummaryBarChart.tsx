import React, { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlySummaryData } from '../../types';

interface MonthlySummaryBarChartProps {
    data: MonthlySummaryData[];
}

export const MonthlySummaryBarChart: FC<MonthlySummaryBarChartProps> = ({ data }) => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 20,
                        left: -10,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)' }} fontSize={12} tickLine={{ stroke: 'var(--border)' }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)' }} fontSize={12} tickLine={{ stroke: 'var(--border)' }} tickFormatter={(value: number) => `R$${value/1000}k`} />
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
                    <Legend wrapperStyle={{ fontSize: '14px', color: 'var(--muted-foreground)' }} />
                    <Bar dataKey="receitas" fill="#10B981" name="Receitas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill="#E11D48" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};