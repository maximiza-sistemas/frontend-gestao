import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';

const COLORS = ['#f58220', '#f9a825', '#fbc02d'];

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  loading?: boolean;
}

interface DashboardStats {
  totalClients: number;
  totalOrders: number;
  monthlyRevenue: number;
  totalStock: number;
}

interface MonthlySalesData {
  month: string;
  [key: string]: string | number;
}

interface StockDistribution {
  name: string;
  value: number;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, loading = false }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow">
    {/* Ícone no topo */}
    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${icon.includes('users') ? 'bg-blue-500' :
      icon.includes('cart') ? 'bg-emerald-500' :
        icon.includes('dollar') ? 'bg-amber-500' :
          'bg-rose-500'
      }`}>
      <i className={`${icon} text-2xl text-white`}></i>
    </div>
    {/* Título */}
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</p>
    {/* Valor */}
    {loading ? (
      <div className="h-7 w-24 bg-gray-200 animate-pulse rounded"></div>
    ) : (
      <p className="text-xl font-bold text-gray-800 leading-tight break-all">{value}</p>
    )}
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<MonthlySalesData[]>([]);
  const [stockDistributionData, setStockDistributionData] = useState<StockDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de Data (Padrão: Mês Atual)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar dados em paralelo
      const [statsResponse, salesResponse, stockResponse] = await Promise.all([
        api.getDashboardStats(startDate, endDate),
        api.getDashboardMonthlySales(),
        api.getDashboardStockDistribution(),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data as DashboardStats);
      }

      if (salesResponse.success && salesResponse.data) {
        setSalesData(salesResponse.data as MonthlySalesData[]);
      }

      if (stockResponse.success && stockResponse.data) {
        setStockDistributionData(stockResponse.data as StockDistribution[]);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  // Extrair chaves únicas (localizações) dos dados de vendas
  const locationKeys = React.useMemo(() => {
    if (salesData.length === 0) return [];
    const keys = new Set<string>();
    salesData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'month') keys.add(key);
      });
    });
    return Array.from(keys);
  }, [salesData]);

  const clearFilters = () => {
    const date = new Date();
    setStartDate(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header + Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

        {/* Filtros redesenhados */}
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
          <i className="fas fa-calendar text-gray-400"></i>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent border-0 text-sm focus:ring-0 p-1"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent border-0 text-sm focus:ring-0 p-1"
          />
          <button
            onClick={clearFilters}
            className="ml-2 px-2 py-1 text-gray-500 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* KPIs - Layout com ícone no topo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Clientes"
          value={stats?.totalClients.toLocaleString('pt-BR') || '0'}
          icon="fa-solid fa-users"
          loading={loading}
        />
        <KPICard
          title="Pedidos"
          value={stats?.totalOrders.toLocaleString('pt-BR') || '0'}
          icon="fa-solid fa-cart-shopping"
          loading={loading}
        />
        <KPICard
          title="Faturamento"
          value={stats ? `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
          icon="fa-solid fa-dollar-sign"
          loading={loading}
        />
        <KPICard
          title="Botijões em Estoque"
          value={stats?.totalStock.toLocaleString('pt-BR') || '0'}
          icon="fa-solid fa-box-archive"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Vendas Mensais (Matriz vs. Filial)</h2>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400"></i>
            </div>
          ) : salesData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Sem dados de vendas disponíveis
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6B7280' }} />
                <YAxis tick={{ fill: '#6B7280' }} />
                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Legend />
                {locationKeys.map((key, index) => (
                  <Bar key={key} dataKey={key} name={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Distribuição de Estoque</h2>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400"></i>
            </div>
          ) : stockDistributionData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Sem dados de estoque disponíveis
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                >
                  {stockDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} unidades`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
