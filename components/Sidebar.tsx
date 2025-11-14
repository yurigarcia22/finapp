import React from 'react';
import { HomeIcon, SwapIcon, TargetIcon, CreditCardIcon, PieChartIcon, SlidersIcon, SettingsIcon, WalletIcon, TagIcon, LogOutIcon } from './icons';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, onLogout }) => {

  const navigation = [
    { name: 'Dashboard', icon: HomeIcon },
    { name: 'Transações', icon: SwapIcon },
    { name: 'Orçamentos', icon: TargetIcon },
    { name: 'Cartões', icon: CreditCardIcon },
    { name: 'Contas', icon: WalletIcon },
    { name: 'Relatórios', icon: PieChartIcon },
    { name: 'Regras', icon: SlidersIcon },
    { name: 'Categorias', icon: TagIcon },
  ];

  const secondaryNavigation = [
      { name: 'Configurações', icon: SettingsIcon },
  ]

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-[#10192A] pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#6464FF]">
                <path d="M16 0L32 16L16 32L0 16L16 0Z" fill="currentColor"/>
                <path d="M16 6L26 16L16 26L6 16L16 6Z" stroke="#0B0F1A" strokeWidth="2"/>
            </svg>
            <span className="ml-3 text-2xl font-bold text-white">FinPilot</span>
          </div>
          <div className="mt-8 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setCurrentPage(item.name)}
                  className={`
                    w-full text-left
                    ${currentPage === item.name ? 'bg-[#6464FF] text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  `}
                >
                  <item.icon className="mr-3 flex-shrink-0 h-6 w-6" />
                  {item.name}
                </button>
              ))}
            </nav>
            <div className="mt-auto px-2 pb-4">
                 <nav className="space-y-1">
                    {secondaryNavigation.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => setCurrentPage(item.name)}
                          className={`
                            w-full text-left
                            ${currentPage === item.name ? 'bg-[#6464FF] text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                            group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200
                          `}
                        >
                          <item.icon className="mr-3 flex-shrink-0 h-6 w-6" />
                          {item.name}
                        </button>
                    ))}
                    <button
                        onClick={onLogout}
                        className={`
                        w-full text-left text-gray-300 hover:bg-gray-700 hover:text-white
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200
                        `}
                    >
                        <LogOutIcon className="mr-3 flex-shrink-0 h-6 w-6" />
                        Sair
                    </button>
                 </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};