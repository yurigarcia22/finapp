import React, { useState } from 'react';
import { XIcon } from './icons';
import { Rule } from '../types';

interface RuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: Omit<Rule, 'id'>) => void;
}

export const RuleModal: React.FC<RuleModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [conditions, setConditions] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !conditions) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        onSave({ name, conditions, enabled: true });
        setName('');
        setConditions('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-element" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-card-foreground" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Nova Regra</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="rule-name" className="block text-sm font-medium text-muted-foreground mb-1">Nome da Regra</label>
                        <input type="text" id="rule-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Mercado -> Alimentação" className="w-full bg-secondary border border-border rounded-md p-3 text-foreground" />
                    </div>
                    <div>
                        <label htmlFor="rule-conditions" className="block text-sm font-medium text-muted-foreground mb-1">Condições</label>
                        <input type="text" id="rule-conditions" value={conditions} onChange={e => setConditions(e.target.value)} required placeholder="Ex: Descrição contém 'mercado'" className="w-full bg-secondary border border-border rounded-md p-3 text-foreground" />
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