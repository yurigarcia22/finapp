import React from 'react';
import { KpiData } from '../types';
import { TrendingUpIcon, TrendingDownIcon } from './icons';

interface KpiCardProps {
    item: KpiData;
}

export const KpiCard: React.FC<KpiCardProps> = ({ item }) => {
    const isIncrease = item.changeType === 'increase';
    const isDecrease = item.changeType === 'decrease';
    const changeColor = isIncrease ? 'text-green-500' : 'text-red-500';
    
    return (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-md">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{item.value}</p>
            </div>
            {item.change !== undefined && (
                <div className="mt-4 flex items-center">
                    <div className={`flex items-center text-sm font-semibold ${changeColor}`}>
                        {isIncrease && <TrendingUpIcon className="h-4 w-4 mr-1" />}
                        {isDecrease && <TrendingDownIcon className="h-4 w-4 mr-1" />}
                        <span>{item.change.toFixed(1)}%</span>
                    </div>
                    <p className="ml-2 text-sm text-muted-foreground">vs mês passado</p>
                </div>
            )}
        </div>
    );
};