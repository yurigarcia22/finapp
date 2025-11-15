import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, InfoIcon, CheckCircleIcon } from './icons';
import { useNotifications } from '../contexts/NotificationContext';

export const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const iconMap = {
        info: <InfoIcon className="h-5 w-5 text-blue-500" />,
        success: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
        warning: <InfoIcon className="h-5 w-5 text-yellow-500" />,
    };
    
    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-primary relative"
            >
                <span className="sr-only">Ver notificações</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card"></span>
                )}
            </button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-popover ring-1 ring-border ring-opacity-5 focus:outline-none animate-element">
                    <div className="py-1">
                        <div className="px-4 py-2 flex justify-between items-center border-b border-border">
                             <h3 className="text-sm font-medium text-popover-foreground">Notificações</h3>
                             {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>
                             )}
                        </div>
                        <ul className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <li className="px-4 py-3 text-sm text-muted-foreground text-center">Nenhuma notificação</li>
                            ) : (
                                notifications.map(n => (
                                    <li key={n.id} className={`border-b border-border/50 ${!n.read ? 'bg-primary/10' : ''}`}>
                                        <a href="#" className="block px-4 py-3 hover:bg-accent" onClick={(e) => { e.preventDefault(); markAsRead(n.id); }}>
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 pt-0.5">
                                                    {iconMap[n.type]}
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-popover-foreground">{n.title}</p>
                                                    <p className="text-sm text-muted-foreground">{n.message}</p>
                                                    <p className="text-xs text-muted-foreground/80 mt-1">
                                                        {new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </a>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};