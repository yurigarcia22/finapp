
import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons';
import { Category, CategoryType } from '../types';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Omit<Category, 'id'> | Category) => void;
    categoryToEdit?: Category | null;
}

const EMOJI_LIST = [
    '🏡', '🛒', '🚗', '🍔', '💊', '👕', '📞', '🎓', '💸', '💼', '🎁', '📈',
    '✈️', '🍽️', '🏠', '🚌', '🛍️', '📦', '🧾', '🏥', '🎉', '💻', '💡', '💰'
];

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<CategoryType>(CategoryType.EXPENSE);
    const [color, setColor] = useState('#E11D48');
    const [icon, setIcon] = useState('💸');
    const [isPickerOpen, setPickerOpen] = useState(false);
    const isEditing = !!categoryToEdit;
    
    const pickerRef = useRef<HTMLDivElement>(null);

    const colorPresets = ['#E11D48', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#22C55E', '#EF4444', '#F97316', '#84CC16', '#0EA5E9'];

    useEffect(() => {
        if (isOpen) {
            if (isEditing && categoryToEdit) {
                setName(categoryToEdit.name);
                setType(categoryToEdit.type);
                setColor(categoryToEdit.color);
                setIcon(categoryToEdit.icon || '💸');
            } else {
                setName('');
                setType(CategoryType.EXPENSE);
                setColor('#E11D48');
                setIcon('💸');
            }
        }
    }, [isOpen, categoryToEdit, isEditing]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert('Por favor, preencha o nome da categoria.');
            return;
        }

        if (isEditing && categoryToEdit) {
             onSave({ name, type, color, icon, id: categoryToEdit.id });
        } else {
             onSave({ name, type, color, icon });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-element" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-card-foreground" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <div className="relative flex-shrink-0">
                            <label htmlFor="cat-icon-btn" className="block text-sm font-medium text-muted-foreground mb-1">Ícone</label>
                             <button 
                                type="button" 
                                id="cat-icon-btn" 
                                onClick={() => setPickerOpen(!isPickerOpen)}
                                className="w-16 h-12 flex items-center justify-center bg-secondary border border-border rounded-md p-3 text-foreground" 
                            >
                                <span className="text-2xl">{icon}</span>
                            </button>
                            {isPickerOpen && (
                                <div ref={pickerRef} className="absolute z-10 top-full mt-2 w-64 p-2 bg-popover border border-border rounded-lg shadow-xl grid grid-cols-6 gap-2">
                                    {EMOJI_LIST.map(emoji => (
                                        <button 
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                setIcon(emoji);
                                                setPickerOpen(false);
                                            }}
                                            className="p-2 text-2xl rounded-md hover:bg-accent transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex-grow">
                            <label htmlFor="cat-name" className="block text-sm font-medium text-muted-foreground mb-1">Nome da Categoria</label>
                            <input type="text" id="cat-name" value={name} onChange={e => setName(e.target.value)} required className="w-full h-12 bg-secondary border border-border rounded-md p-3 text-foreground" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="cat-type" className="block text-sm font-medium text-muted-foreground mb-1">Tipo</label>
                        <select id="cat-type" value={type} onChange={e => setType(e.target.value as CategoryType)} required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground">
                            <option value={CategoryType.EXPENSE}>Despesa</option>
                            <option value={CategoryType.INCOME}>Receita</option>
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-muted-foreground mb-2">Cor</label>
                         <div className="flex flex-wrap gap-2">
                            {colorPresets.map(presetColor => (
                                <button type="button" key={presetColor} onClick={() => setColor(presetColor)} 
                                    className={`w-8 h-8 rounded-full transition-transform duration-200 ${color === presetColor ? 'ring-2 ring-offset-2 ring-offset-card ring-primary scale-110' : ''}`} 
                                    style={{ backgroundColor: presetColor }}
                                />
                            ))}
                         </div>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">{isEditing ? 'Salvar Alterações' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
