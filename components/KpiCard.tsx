
import React from 'react';
import { KpiData } from '../types';
import { TrendingUpIcon, TrendingDownIcon } from './icons';

interface KpiCardProps {
    item: KpiData;
}

export const KpiCard: React.FC<KpiCardProps> = ({ item }) => {
    const isIncrease = item.changeType === 'increase';
    const isDecrease = item.changeType === 'decrease';
    const changeColor = isIncrease ? 'text-green-400' : 'text-red-400';
    
    return (
        <div className="bg-[#10192A] rounded-xl shadow-lg p-6 flex flex-col justify-between transform hover:scale-105 transition-transform duration-300">
            <div>
                <p className="text-sm font-medium text-gray-400">{item.title}</p>
                <p className="mt-1 text-3xl font-bold text-white">{item.value}</p>
            </div>
            {item.change !== undefined && (
                <div className="mt-4 flex items-center">
                    <div className={`flex items-center text-sm font-semibold ${changeColor}`}>
                        {isIncrease && <TrendingUpIcon className="h-5 w-5 mr-1" />}
                        {isDecrease && <TrendingDownIcon className="h-5 w-5 mr-1" />}
                        <span>{item.change.toFixed(2)}%</span>
                    </div>
                    <p className="ml-2 text-sm text-gray-500">vs mês passado</p>
                </div>
            )}
        </div>
    );
};
