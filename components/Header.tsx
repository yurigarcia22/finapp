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
        <header className="relative z-10 flex-shrink-0 flex h-16 bg-[#10192A] shadow-md">
            <div className="flex-1 px-4 flex justify-between sm:px-6 lg:px-8">
                <div className="flex-1 flex">
                    <form className="w-full flex md:ml-0" action="#" method="GET">
                        <label htmlFor="search-field" className="sr-only">
                            Pesquisar
                        </label>
                        <div className="relative w-full text-gray-400 focus-within:text-gray-200">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <input
                                id="search-field"
                                className="block w-full h-full pl-8 pr-3 py-2 border-transparent bg-transparent text-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-0 focus:border-transparent sm:text-sm"
                                placeholder="Pesquisar transações, orçamentos, etc. (⌘K)"
                                type="search"
                                name="search"
                            />
                        </div>
                    </form>
                </div>
                <div className="ml-4 flex items-center md:ml-6">
                    <NotificationBell />

                    {/* Profile dropdown */}
                    <div className="ml-3 relative" ref={menuRef}>
                        <div>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="max-w-xs bg-gray-800 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
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
                                <span className="hidden md:block ml-2 text-white text-sm font-medium">{displayName}</span>
                                <ChevronDownIcon className="hidden md:block ml-1 h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                         {isMenuOpen && (
                            <div
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-[#1E293B] ring-1 ring-black ring-opacity-5 focus:outline-none"
                                role="menu"
                                aria-orientation="vertical"
                                aria-labelledby="user-menu-button"
                            >
                                <button
                                    onClick={() => {
                                        setCurrentPage('Configurações');
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                    role="menuitem"
                                >
                                    Meu Perfil
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
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