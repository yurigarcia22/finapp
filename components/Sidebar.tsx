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
  LogOutIcon,
  ClipboardListIcon
} from './icons';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
  theme: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  onLogout,
  theme
}) => {
  const navigation = [
    { name: 'Dashboard', icon: HomeIcon },
    { name: 'Transações', icon: SwapIcon },
    { name: 'Fixas', icon: ClipboardListIcon },
    { name: 'Orçamentos', icon: TargetIcon },
    { name: 'Cartões', icon: CreditCardIcon },
    { name: 'Contas', icon: WalletIcon },
    { name: 'Relatórios', icon: PieChartIcon },
    { name: 'Regras', icon: SlidersIcon },
    { name: 'Categorias', icon: TagIcon }
  ];

  const secondaryNavigation = [{ name: 'Configurações', icon: SettingsIcon }];

  // ❗ Mantive exatamente as URLs que você passou
  const lightLogoUrl = 'https://i.ibb.co/hx9bHhZg/LOGOTIPO-V3.png';
  const darkLogoUrl = 'https://i.ibb.co/MD2j2Lq6/LOGOTIPO-V4.png';

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-card border-r border-border pt-5 pb-4 overflow-y-auto">

          {/* Logo com tamanho ajustado, sem classe inválida */}
          <div className="flex items-center justify-center flex-shrink-0 px-4 py-6">
            <img
              src={theme === 'dark' ? darkLogoUrl : lightLogoUrl}
              alt="NG Fin Logo"
              className="h-[96px] w-auto"
            />
          </div>

          <div className="mt-8 flex-1 flex flex-col">
            <nav className="flex-1 px-4 space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setCurrentPage(item.name)}
                  className={`
                    w-full text-left group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200
                    ${
                      currentPage === item.name
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                    }
                  `}
                >
                  <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                  {item.name}
                </button>
              ))}
            </nav>

            <div className="mt-auto px-4 pb-4">
              <nav className="space-y-2">
                {secondaryNavigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setCurrentPage(item.name)}
                    className={`
                      w-full text-left group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200
                      ${
                        currentPage === item.name
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                      }
                    `}
                  >
                    <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                    {item.name}
                  </button>
                ))}

                <button
                  onClick={onLogout}
                  className={`
                    w-full text-left text-muted-foreground hover:bg-secondary hover:text-secondary-foreground
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200
                  `}
                >
                  <LogOutIcon className="mr-3 flex-shrink-0 h-5 w-5" />
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
