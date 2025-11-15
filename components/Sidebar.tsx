import React from 'react';
import {
  HomeIcon,
  SwapIcon,
  TargetIcon,
  CreditCardIcon,
  PieChartIcon,
  SlidersIcon,
  SettingsIcon,
  WalletIcon,
  TagIcon,
  LogOutIcon
} from './icons';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  onLogout
}) => {
  const navigation = [
    { name: 'Dashboard', icon: HomeIcon },
    { name: 'Transações', icon: SwapIcon },
    { name: 'Orçamentos', icon: TargetIcon },
    { name: 'Cartões', icon: CreditCardIcon },
    { name: 'Contas', icon: WalletIcon },
    { name: 'Relatórios', icon: PieChartIcon },
    { name: 'Regras', icon: SlidersIcon },
    { name: 'Categorias', icon: TagIcon }
  ];

  const secondaryNavigation = [{ name: 'Configurações', icon: SettingsIcon }];

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-[#10192A] pt-5 pb-4 overflow-y-auto">
          
          {/* LOGO */}
          <div className="flex items-center flex-shrink-0 px-4">
            <img src="/components/assets/logo.svg" alt="NG Fin Logo" className="h-8 w-8" />
            <span className="ml-3 text-2xl font-bold text-white">NG Fin</span>
          </div>

          {/* MENU PRINCIPAL */}
          <div className="mt-8 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setCurrentPage(item.name)}
                  className={`
                    w-full text-left
                    ${
                      currentPage === item.name
                        ? 'bg-[#6464FF] text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  `}
                >
                  <item.icon className="mr-3 flex-shrink-0 h-6 w-6" />
                  {item.name}
                </button>
              ))}
            </nav>

            {/* MENU SECUNDÁRIO */}
            <div className="mt-auto px-2 pb-4">
              <nav className="space-y-1">
                {secondaryNavigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setCurrentPage(item.name)}
                    className={`
                      w-full text-left
                      ${
                        currentPage === item.name
                          ? 'bg-[#6464FF] text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200
                    `}
                  >
                    <item.icon className="mr-3 flex-shrink-0 h-6 w-6" />
                    {item.name}
                  </button>
                ))}

                {/* BOTÃO SAIR */}
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