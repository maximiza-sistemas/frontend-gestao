import React from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Administrador' | 'Gerente' | 'Vendedor';
  status: 'Ativo' | 'Inativo';
}

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
}

const menuItems = [
  { name: 'Dashboard', icon: 'fa-solid fa-house' },
  { name: 'Clientes', icon: 'fa-solid fa-users' },
  { name: 'Estoque', icon: 'fa-solid fa-box-archive' },
  { name: 'Preços', icon: 'fa-solid fa-tags' },
  { name: 'Vendas & Pedidos', icon: 'fa-solid fa-cart-shopping' },
  { name: 'Financeiro', icon: 'fa-solid fa-dollar-sign' },
  { name: 'Frota', icon: 'fa-solid fa-truck' },
  { name: 'Fornecedores', icon: 'fa-solid fa-store' },
  { name: 'Relatório Detalhado', icon: 'fa-solid fa-file-invoice-dollar' },
  { name: 'Configurações', icon: 'fa-solid fa-gear' },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, user, onLogout }) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrador': return 'bg-red-100 text-red-800';
      case 'Gerente': return 'bg-blue-100 text-blue-800';
      case 'Vendedor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <aside className="w-64 bg-white shadow-md flex-shrink-0 flex flex-col h-screen">
      {/* Logo do Sistema */}
      <div className="p-4 border-b flex justify-center items-center bg-[#1a4d4a]">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-fire-flame-curved text-[#f97316] text-3xl"></i>
          <h1 className="text-2xl font-bold tracking-wider text-white">SISGÁS</h1>
        </div>
      </div>

      {/* Informações do usuário */}
      {user && (
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-[#f97316] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-0.5 ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Menu de navegação com scroll */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5">
          {menuItems.map((item) => (
            <li key={item.name} className="px-3">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage(item.name);
                }}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${activePage === item.name
                  ? 'bg-[#f97316]/10 text-[#f97316] font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
              >
                <i className={`${item.icon} fa-fw w-5 h-5 mr-3 text-center flex-shrink-0`}></i>
                <span className="text-sm">{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Botão de logout fixo no final */}
      <div className="p-3 border-t bg-white mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200"
        >
          <i className="fa-solid fa-sign-out-alt fa-fw w-5 h-5 mr-3 text-center flex-shrink-0"></i>
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
