import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';
import { Account, AccountType } from '../types';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Omit<Account, 'id' | 'currency'> | Account) => void;
    accountToEdit?: Account | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, accountToEdit }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>(AccountType.CHECKING);
    const [value, setValue] = useState('');

    const isEditing = !!accountToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditing && accountToEdit) {
                setName(accountToEdit.name);
                setType(accountToEdit.type);
                if (accountToEdit.type === AccountType.CREDIT_CARD) {
                    setValue(String(accountToEdit.limit || ''));
                } else {
                    setValue(String(accountToEdit.balance));
                }
            } else {
                setName('');
                setType(AccountType.CHECKING);
                setValue('');
            }
        }
    }, [isOpen, accountToEdit, isEditing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !value) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (isEditing && accountToEdit) {
            const updatedAccountData: Account = {
                ...accountToEdit,
                name,
                balance: type === AccountType.CREDIT_CARD ? accountToEdit.balance : parseFloat(value),
                limit: type === AccountType.CREDIT_CARD ? parseFloat(value) : undefined,
            };
            onSave(updatedAccountData);
        } else {
             const newAccountData = {
                name,
                type,
                balance: type === AccountType.CREDIT_CARD ? 0 : parseFloat(value),
                limit: type === AccountType.CREDIT_CARD ? parseFloat(value) : undefined,
            };
            onSave(newAccountData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-element" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-card-foreground" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{isEditing ? 'Editar Conta' : 'Nova Conta'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="acc-name" className="block text-sm font-medium text-muted-foreground mb-1">Nome da Conta</label>
                        <input type="text" id="acc-name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-secondary border border-border rounded-md p-3 text-foreground" />
                    </div>
                    <div>
                        <label htmlFor="acc-type" className="block text-sm font-medium text-muted-foreground mb-1">Tipo de Conta</label>
                        <select 
                            id="acc-type" 
                            value={type} 
                            onChange={e => setType(e.target.value as AccountType)} 
                            required 
                            disabled={isEditing}
                            className="w-full bg-secondary border border-border rounded-md p-3 text-foreground disabled:bg-muted disabled:cursor-not-allowed"
                        >
                           <option value={AccountType.CHECKING}>Conta Corrente</option>
                           <option value={AccountType.WALLET}>Carteira</option>
                           <option value={AccountType.CREDIT_CARD}>Cartão de Crédito</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="acc-value" className="block text-sm font-medium text-muted-foreground mb-1">
                            {type === AccountType.CREDIT_CARD ? 'Limite do Cartão' : 'Saldo Inicial'}
                        </label>
                        <input type="number" step="0.01" id="acc-value" value={value} onChange={e => setValue(e.target.value)} required placeholder="R$ 0,00" className="w-full bg-secondary border border-border rounded-md p-3 text-foreground" />
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