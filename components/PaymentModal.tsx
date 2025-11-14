import React, { useState } from 'react';
import { XIcon } from './icons';
import { CreditInvoice, Account } from '../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (invoiceId: string, paymentAccountId: string, amount: number) => void;
    invoice: CreditInvoice;
    paymentAccounts: Account[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSave, invoice, paymentAccounts }) => {
    const [paymentAccountId, setPaymentAccountId] = useState(paymentAccounts[0]?.id || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentAccountId) {
            alert('Por favor, selecione uma conta para o pagamento.');
            return;
        }
        onSave(invoice.id, paymentAccountId, invoice.amount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-[#10192A] rounded-xl shadow-2xl w-full max-w-md p-8 m-4 text-white" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Pagar Fatura</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className='mb-6 p-4 bg-[#1E293B] rounded-lg'>
                    <p className="text-gray-400">Fatura de {invoice.month}</p>
                    <p className="text-2xl font-bold text-yellow-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}</p>
                    <p className="text-sm text-gray-500">Vencimento: {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="payment-account" className="block text-sm font-medium text-gray-400 mb-1">Pagar com</label>
                        <select id="payment-account" value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} required className="w-full bg-[#1E293B] border border-gray-600 rounded-md p-3 text-white">
                            {paymentAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)})</option>
                            ))}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-[#1E293B] hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-[#6464FF] hover:bg-indigo-500 font-semibold">Confirmar Pagamento</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
