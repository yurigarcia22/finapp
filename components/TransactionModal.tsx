import React, { useState, useEffect, useMemo } from 'react';
import { XIcon } from './icons';
import { Transaction, Account, Category, CategoryType, TransactionStatus, AccountType } from '../types';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id' | 'current_installment' | 'parent_transaction_id'>) => void;
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
    const [isInstallment, setIsInstallment] = useState(false);
    const [installments, setInstallments] = useState('2');

    const selectedAccount = useMemo(() => accounts.find(acc => acc.id === accountId), [accounts, accountId]);
    const showInstallmentOption = type === CategoryType.EXPENSE && selectedAccount?.type === AccountType.CREDIT_CARD;

    const filteredCategories = categories.filter(c => c.type === type);
    
    const availableAccounts = useMemo(() => {
        if (type === CategoryType.INCOME) {
            return accounts.filter(acc => acc.type !== AccountType.CREDIT_CARD);
        }
        return accounts;
    }, [accounts, type]);

    const { creditCardAccounts, otherAccounts } = useMemo(() => {
        const creditCards = availableAccounts.filter(acc => acc.type === AccountType.CREDIT_CARD);
        const others = availableAccounts.filter(acc => acc.type !== AccountType.CREDIT_CARD);
        return { creditCardAccounts: creditCards, otherAccounts: others };
    }, [availableAccounts]);


    useEffect(() => {
        setCategoryId('');
        if (accountId && !availableAccounts.some(acc => acc.id === accountId)) {
            setAccountId('');
        }
        if (!showInstallmentOption) {
            setIsInstallment(false);
        }
    }, [type, availableAccounts, accountId, showInstallmentOption]);

    const resetForm = () => {
        setType(CategoryType.EXPENSE);
        setAmount('');
        setDescription('');
        setCategoryId('');
        setAccountId('');
        setDate(new Date().toISOString().split('T')[0]);
        setIsInstallment(false);
        setInstallments('2');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (!amount || !description || !selectedCategory || !accountId || !date) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        const transactionData: Omit<Transaction, 'id' | 'current_installment' | 'parent_transaction_id'> = {
            description,
            amount: parseFloat(amount),
            date,
            type,
            category: selectedCategory,
            accountId,
            status: TransactionStatus.PENDING,
        };

        if (isInstallment && showInstallmentOption) {
            transactionData.installments = parseInt(installments, 10);
        }

        onSave(transactionData);
        resetForm();
    };
    
    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-element" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-card-foreground transform transition-all duration-300 ease-in-out" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Nova Transação</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-6">
                    <div className="flex bg-secondary p-1 rounded-lg">
                        <button
                            onClick={() => setType(CategoryType.EXPENSE)}
                            className={`w-1/2 py-2 rounded-md transition-colors font-semibold ${type === 'expense' ? 'bg-card text-red-500 shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}
                        >
                            Despesa
                        </button>
                        <button
                            onClick={() => setType(CategoryType.INCOME)}
                            className={`w-1/2 py-2 rounded-md transition-colors font-semibold ${type === 'income' ? 'bg-card text-green-500 shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}
                        >
                            Receita
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-1">Valor</label>
                        <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} placeholder="R$ 0,00" required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground text-lg focus:ring-2 focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">Descrição</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado" required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground focus:ring-2 focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label htmlFor="account" className="block text-sm font-medium text-muted-foreground mb-1">Conta</label>
                        <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground focus:ring-2 focus:ring-primary focus:border-primary">
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

                    {showInstallmentOption && (
                        <div className="bg-secondary/50 border border-border rounded-md p-3 space-y-3">
                             <div className="flex items-center">
                                <input id="isInstallment" type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="h-4 w-4 rounded custom-checkbox" />
                                <label htmlFor="isInstallment" className="ml-2 block text-sm font-medium text-foreground">Compra Parcelada?</label>
                             </div>
                             {isInstallment && (
                                <div className="animate-element">
                                    <label htmlFor="installments" className="block text-sm font-medium text-muted-foreground mb-1">Número de Parcelas</label>
                                    <input type="number" min="2" max="48" step="1" id="installments" value={installments} onChange={e => setInstallments(e.target.value)} className="w-full bg-background border border-border rounded-md p-2 text-foreground" />
                                </div>
                             )}
                        </div>
                    )}

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-1">Categoria</label>
                        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground focus:ring-2 focus:ring-primary focus:border-primary">
                            <option value="" disabled>Selecione uma categoria</option>
                            {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-muted-foreground mb-1">Data</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground focus:ring-2 focus:ring-primary focus:border-primary" />
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};