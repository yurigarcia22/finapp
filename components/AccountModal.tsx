import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';
import { Account, AccountType } from '../types';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Omit<Account, 'id' | 'currency'> | Account) => void;
    accountToEdit?: Account | null;
    forceType?: AccountType;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, accountToEdit, forceType }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>(AccountType.CHECKING);
    const [value, setValue] = useState('');
    const [dueDay, setDueDay] = useState('');

    const isEditing = !!accountToEdit;

    useEffect(() => {
        if (isOpen) {
            const initialType = forceType || accountToEdit?.type || AccountType.CHECKING;
            setType(initialType);

            if (isEditing && accountToEdit) {
                setName(accountToEdit.name);
                if (accountToEdit.type === AccountType.CREDIT_CARD) {
                    setValue(String(accountToEdit.limit || ''));
                    setDueDay(String(accountToEdit.due_day || ''));
                } else {
                    setValue(String(accountToEdit.balance));
                    setDueDay('');
                }
            } else {
                setName('');
                setValue('');
                setDueDay('');
            }
        }
    }, [isOpen, accountToEdit, isEditing, forceType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const valueNumber = parseFloat(value);
        if (!name || isNaN(valueNumber) || (type === AccountType.CREDIT_CARD && (!dueDay || parseInt(dueDay, 10) < 1 || parseInt(dueDay, 10) > 31))) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        if (isEditing && accountToEdit) {
            const updatedAccountData: Account = {
                ...accountToEdit,
                name,
                balance: type === AccountType.CREDIT_CARD ? accountToEdit.balance : valueNumber,
                limit: type === AccountType.CREDIT_CARD ? valueNumber : undefined,
                due_day: type === AccountType.CREDIT_CARD ? parseInt(dueDay, 10) : undefined,
            };
            onSave(updatedAccountData);
        } else {
             const newAccountData: Omit<Account, 'id' | 'currency'> = {
                name,
                type,
                balance: type === AccountType.CREDIT_CARD ? 0 : valueNumber,
                limit: type === AccountType.CREDIT_CARD ? valueNumber : undefined,
                due_day: type === AccountType.CREDIT_CARD ? parseInt(dueDay, 10) : undefined,
            };
            onSave(newAccountData);
        }
    };

    if (!isOpen) return null;

    const availableAccountTypes = [
      { value: AccountType.CHECKING, label: 'Conta Corrente' },
      { value: AccountType.WALLET, label: 'Carteira' },
      { value: AccountType.SAVINGS, label: 'Poupança' },
      { value: AccountType.INVESTMENT, label: 'Investimento' }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-element" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-card-foreground" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{isEditing ? 'Editar Conta' : (forceType === AccountType.CREDIT_CARD ? 'Novo Cartão de Crédito' : 'Nova Conta')}</h2>
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
                            disabled={isEditing || !!forceType}
                            className="w-full bg-secondary border border-border rounded-md p-3 text-foreground disabled:bg-muted disabled:cursor-not-allowed"
                        >
                           {forceType === AccountType.CREDIT_CARD ? (
                               <option value={AccountType.CREDIT_CARD}>Cartão de Crédito</option>
                           ) : (
                               availableAccountTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                           )}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="acc-value" className="block text-sm font-medium text-muted-foreground mb-1">
                            {type === AccountType.CREDIT_CARD ? 'Limite do Cartão' : 'Saldo Inicial'}
                        </label>
                        <input type="number" step="0.01" id="acc-value" value={value} onChange={e => setValue(e.target.value)} required placeholder="R$ 0,00" className="w-full bg-secondary border border-border rounded-md p-3 text-foreground" />
                    </div>
                     {type === AccountType.CREDIT_CARD && (
                        <div>
                            <label htmlFor="acc-due-day" className="block text-sm font-medium text-muted-foreground mb-1">
                                Dia de Vencimento da Fatura
                            </label>
                            <input type="number" min="1" max="31" id="acc-due-day" value={dueDay} onChange={e => setDueDay(e.target.value)} required placeholder="Ex: 10" className="w-full bg-secondary border border-border rounded-md p-3 text-foreground" />
                        </div>
                     )}
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">{isEditing ? 'Salvar Alterações' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};