import React, { useState } from 'react';
import { XIcon } from './icons';
import { Category, CategoryType } from '../types';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Fix: The 'onSave' prop should expect all Category properties except 'id'.
    // The modal provides a placeholder for 'icon', which was previously and incorrectly omitted from the type.
    onSave: (category: Omit<Category, 'id'>) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<CategoryType>(CategoryType.EXPENSE);
    const [color, setColor] = useState('#E11D48');
    
    const colorPresets = ['#E11D48', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#22C55E', '#EF4444', '#F97316', '#84CC16', '#0EA5E9'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert('Por favor, preencha o nome da categoria.');
            return;
        }
        onSave({ name, type, color, icon: '' }); // Icon placeholder
        setName('');
        setType(CategoryType.EXPENSE);
        setColor('#E11D48');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-[#10192A] rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-white" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Nova Categoria</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="cat-name" className="block text-sm font-medium text-gray-400 mb-1">Nome da Categoria</label>
                        <input type="text" id="cat-name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white" />
                    </div>
                    <div>
                        <label htmlFor="cat-type" className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                        <select id="cat-type" value={type} onChange={e => setType(e.target.value as CategoryType)} required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white">
                            <option value={CategoryType.EXPENSE}>Despesa</option>
                            <option value={CategoryType.INCOME}>Receita</option>
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-400 mb-2">Cor</label>
                         <div className="flex flex-wrap gap-2">
                            {colorPresets.map(presetColor => (
                                <button type="button" key={presetColor} onClick={() => setColor(presetColor)} 
                                    className={`w-8 h-8 rounded-full transition-transform duration-200 ${color === presetColor ? 'ring-2 ring-offset-2 ring-offset-[#10192A] ring-white scale-110' : ''}`} 
                                    style={{ backgroundColor: presetColor }}
                                />
                            ))}
                         </div>
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