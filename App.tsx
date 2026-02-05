
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/pages/Dashboard';
// import Clientes from './components/pages/Clientes';
import ClientesAPI from './components/pages/ClientesAPI';
// import EstoqueSimples from './components/pages/EstoqueSimples';
// import EstoqueComManutencao from './components/pages/EstoqueComManutencao';
import EstoqueAPI from './components/pages/EstoqueAPI';
import Vendas from './components/pages/Vendas';

import Financeiro from './components/pages/Financeiro';
import Frota from './components/pages/Frota';
import Fornecedores from './components/pages/Fornecedores';
import RelatorioDetalhado from './components/pages/RelatorioDetalhado';
import Configuracoes from './components/pages/Configuracoes';
import Precos from './components/pages/Precos';
import PWAInstallButton from './components/common/PWAInstallButton';

// Componente principal da aplicação (após login)
const MainApp: React.FC = () => {
  const [activePage, setActivePage] = useState('Dashboard');
  const { user, logout } = useAuth();

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Clientes':
        return <ClientesAPI />;
      case 'Estoque':
        return <EstoqueAPI />;
      case 'Vendas & Pedidos':
        return <Vendas />;
      case 'Financeiro':
        return <Financeiro />;
      case 'Frota':
        return <Frota />;
      case 'Fornecedores':
        return <Fornecedores />;
      case 'Relatório Detalhado':
        return <RelatorioDetalhado />;
      case 'Preços':
        return <Precos />;
      case 'Configurações':
        return <Configuracoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={logout}
      />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {renderPage()}
      </main>
      <PWAInstallButton />
    </div>
  );
};

// Componente de controle de autenticação
const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <MainApp /> : <Login />;
};

// Componente raiz com provider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;
