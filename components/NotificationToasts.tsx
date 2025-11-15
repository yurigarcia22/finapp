import React, { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types';
import { XIcon, InfoIcon, CheckCircleIcon } from './icons';

const Toast: React.FC<{ notification: Notification; onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(notification.id);
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [notification.id, onDismiss]);

    const iconMap = {
        info: <InfoIcon className="h-6 w-6 text-blue-500" />,
        success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
        warning: <InfoIcon className="h-6 w-6 text-yellow-500" />,
    };

    return (
        <div className="bg-card shadow-lg rounded-lg pointer-events-auto ring-1 ring-border/50 overflow-hidden w-full max-w-sm">
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {iconMap[notification.type]}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-card-foreground">{notification.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            onClick={() => onDismiss(notification.id)}
                            className="rounded-md inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            <span className="sr-only">Fechar</span>
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const NotificationToasts: React.FC = () => {
    const { notifications } = useNotifications();
    const [toasts, setToasts] = useState<Notification[]>([]);
    const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const newNotifications = notifications.filter(n => !processedIds.has(n.id));

        if (newNotifications.length > 0) {
            setToasts(prev => [...newNotifications, ...prev].slice(0, 3));
            
            setProcessedIds(prev => {
                const newIds = new Set(prev);
                newNotifications.forEach(n => newIds.add(n.id));
                return newIds;
            });
        }
    }, [notifications]);

    const handleDismiss = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50">
            <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                {toasts.map(toast => (
                    <Toast key={toast.id} notification={toast} onDismiss={handleDismiss} />
                ))}
            </div>
        </div>
    );
};