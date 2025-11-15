import React, { useState } from 'react';
import { XIcon } from './icons';
import { Budget, Category } from '../types';

interface BudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (budget: Omit<Budget, 'id'>) => void;
    categories: Category[];
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSave, categories }) => {
    const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!categoryId || !amount) {
            alert('Por favor, selecione uma categoria e defina um valor.');
            return;
        }
        onSave({ categoryId, amount: parseFloat(amount) });
        setCategoryId('');
        setAmount('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-element" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-card-foreground" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Novo Orçamento</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="budget-category" className="block text-sm font-medium text-muted-foreground mb-1">Categoria</label>
                        <select id="budget-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground">
                            <option value="" disabled>Selecione uma categoria</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="budget-amount" className="block text-sm font-medium text-muted-foreground mb-1">Valor do Orçamento</label>
                        <input type="number" step="0.01" id="budget-amount" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="R$ 0,00" className="w-full bg-secondary border border-border rounded-md p-3 text-foreground" />
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};