import React, { useState, useEffect, useMemo } from 'react';
import { XIcon } from './icons';
import { Transaction, Account, Category, CategoryType, TransactionStatus, AccountType } from '../types';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id'>) => void;
    accounts: Account[];
    categories: Category[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, accounts, categories }) => {
    const [type, setType] = useState<CategoryType>(CategoryType.EXPENSE);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const filteredCategories = categories.filter(c => c.type === type);
    
    const availableAccounts = useMemo(() => {
        if (type === CategoryType.INCOME) {
            return accounts.filter(acc => acc.type !== AccountType.CREDIT_CARD);
        }
        return accounts; // For expenses, allow all account types
    }, [accounts, type]);

    const { creditCardAccounts, otherAccounts } = useMemo(() => {
        const creditCards = availableAccounts.filter(acc => acc.type === AccountType.CREDIT_CARD);
        const others = availableAccounts.filter(acc => acc.type !== AccountType.CREDIT_CARD);
        return { creditCardAccounts: creditCards, otherAccounts: others };
    }, [availableAccounts]);


    // Reset category and account when type changes
    useEffect(() => {
        setCategoryId('');
        if (accountId && !availableAccounts.some(acc => acc.id === accountId)) {
            setAccountId('');
        }
    }, [type, availableAccounts, accountId]);

    const resetForm = () => {
        setType(CategoryType.EXPENSE);
        setAmount('');
        setDescription('');
        setCategoryId('');
        setAccountId('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (!amount || !description || !selectedCategory || !accountId || !date) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        onSave({
            description,
            amount: parseFloat(amount),
            date,
            type,
            category: selectedCategory,
            accountId,
            status: TransactionStatus.PENDING,
        });

        resetForm();
    };
    
    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-[#10192A] rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-white transform transition-all duration-300 ease-in-out" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Nova Transação</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-6">
                    <div className="flex border border-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setType(CategoryType.EXPENSE)}
                            className={`w-1/2 py-2 rounded-md transition-colors ${type === 'expense' ? 'bg-red-500/80' : 'hover:bg-gray-700'}`}
                        >
                            Despesa
                        </button>
                        <button
                            onClick={() => setType(CategoryType.INCOME)}
                            className={`w-1/2 py-2 rounded-md transition-colors ${type === 'income' ? 'bg-green-500/80' : 'hover:bg-gray-700'}`}
                        >
                            Receita
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">Valor</label>
                        <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} placeholder="R$ 0,00" required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white text-lg focus:ring-2 focus:ring-[#6464FF]" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado" required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-[#6464FF]" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">Categoria</label>
                        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-[#6464FF]">
                            <option value="" disabled>Selecione uma categoria</option>
                            {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="account" className="block text-sm font-medium text-gray-400 mb-1">Conta</label>
                        <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-[#6464FF]">
                            <option value="" disabled>Selecione uma conta</option>
                            {otherAccounts.length > 0 && (
                                <optgroup label="Contas">
                                    {otherAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </optgroup>
                            )}
                            {creditCardAccounts.length > 0 && (
                                <optgroup label="Cartões de Crédito">
                                    {creditCardAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-[#6464FF]" />
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-[#1E293B] hover:bg-gray-700 transition-colors">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-[#6464FF] hover:bg-indigo-500 font-semibold transition-colors">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};