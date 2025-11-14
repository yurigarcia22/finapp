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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-[#10192A] rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-white" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Nova Regra</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="rule-name" className="block text-sm font-medium text-gray-400 mb-1">Nome da Regra</label>
                        <input type="text" id="rule-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Mercado -> Alimentação" className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white" />
                    </div>
                    <div>
                        <label htmlFor="rule-conditions" className="block text-sm font-medium text-gray-400 mb-1">Condições</label>
                        <input type="text" id="rule-conditions" value={conditions} onChange={e => setConditions(e.target.value)} required placeholder="Ex: Descrição contém 'mercado'" className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white" />
                    </div>
                     <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-[#1E293B] hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-[#6464FF] hover:bg-indigo-500 font-semibold">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};