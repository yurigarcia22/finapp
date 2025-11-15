import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { SearchIcon, ChevronDownIcon } from './icons';
import { NotificationBell } from './NotificationBell';
import { Profile } from '../types';

interface HeaderProps {
    user: User;
    profile: Profile | null;
    setCurrentPage: (page: string) => void;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, profile, setCurrentPage, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayName = profile?.full_name || user.email;

    return (
        <header className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border">
            <div className="flex-1 px-4 flex justify-between sm:px-6 lg:px-8">
                <div className="flex-1 flex">
                    <div className="w-full flex md:ml-0">
                        <label htmlFor="search-field" className="sr-only">
                            Pesquisar
                        </label>
                        <div className="relative w-full text-muted-foreground focus-within:text-foreground">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <input
                                id="search-field"
                                className="block w-full h-full pl-8 pr-3 py-2 border-transparent bg-transparent text-foreground placeholder-muted-foreground focus:outline-none focus:placeholder-foreground focus:ring-0 focus:border-transparent sm:text-sm"
                                placeholder="Pesquisar transações, orçamentos, etc."
                                type="search"
                                name="search"
                            />
                        </div>
                    </div>
                </div>
                <div className="ml-4 flex items-center md:ml-6">
                    <NotificationBell />

                    <div className="ml-4 relative" ref={menuRef}>
                        <div>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="max-w-xs bg-transparent rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-primary"
                                id="user-menu-button"
                                aria-expanded="false"
                                aria-haspopup="true"
                            >
                                <span className="sr-only">Abrir menu do usuário</span>
                                <img
                                    className="h-8 w-8 rounded-full"
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || '')}&background=6464FF&color=fff&bold=true`}
                                    alt="User profile"
                                />
                                <span className="hidden md:block ml-3 text-foreground text-sm font-medium">{displayName}</span>
                                <ChevronDownIcon className="hidden md:block ml-1 h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>
                         {isMenuOpen && (
                            <div
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-popover ring-1 ring-border ring-opacity-5 focus:outline-none animate-element"
                                role="menu"
                                aria-orientation="vertical"
                                aria-labelledby="user-menu-button"
                            >
                                <button
                                    onClick={() => {
                                        setCurrentPage('Configurações');
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left block px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                                    role="menuitem"
                                >
                                    Meu Perfil
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="w-full text-left block px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                                    role="menuitem"
                                >
                                    Sair
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};