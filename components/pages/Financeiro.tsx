import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import Tabs from '../common/Tabs';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Toast from '../common/Toast';
import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';

// Tipos locais
interface FinancialTransaction {
    id: number;
    transaction_code: string;
    type: 'Receita' | 'Despesa' | 'Transferência' | 'Depósito';
    category?: {
        id: number;
        name: string;
        color?: string;
        icon?: string;
    };
    account?: {
        id: number;
        name: string;
        type: string;
    };
    client?: {
        id: number;
        name: string;
    };
    description: string;
    amount: number;
    payment_method?: string;
    transaction_date: string;
    due_date?: string;
    payment_date?: string;
    status: 'Pendente' | 'Pago' | 'Cancelado' | 'Vencido';
    notes?: string;
}

interface FinancialSummary {
    total_revenue: number;
    total_expenses: number;
    balance: number;
    pending_revenue: number;
    pending_expenses: number;
    overdue_amount: number;
}

interface FinancialCategory {
    id: number;
    name: string;
    type: 'Receita' | 'Despesa';
    color?: string;
    icon?: string;
}

interface FinancialAccount {
    id: number;
    name: string;
    type: string;
    current_balance: number;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

const KPICard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm flex items-center">
        <div className={`p-3 rounded-full mr-4 flex items-center justify-center w-12 h-12 ${color}`}>
            <i className={`${icon} text-xl text-white`}></i>
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const getStatusVariant = (status: string) => {
    const map: { [key: string]: 'success' | 'info' | 'warning' | 'danger' } = {
        'Pago': 'success',
        'Pendente': 'info',
        'Vencido': 'danger',
        'Cancelado': 'secondary' as any
    };
    return map[status] || 'info';
};

const TransactionForm: React.FC<{
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
    categories: FinancialCategory[];
    accounts: FinancialAccount[];
    clients: any[];
    suppliers: any[];
    isLoading: boolean;
}> = ({ onSave, onClose, categories, accounts, clients, suppliers, isLoading }) => {
    const [formData, setFormData] = useState({
        type: 'Receita',
        description: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        category_id: '',
        account_id: '',
        destination_account_id: '',
        client_id: '',
        supplier_id: '',
        status: 'Pendente',
        payment_method: 'Dinheiro',
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Auto-select accounts and categories
    useEffect(() => {
        if (formData.type === 'Depósito') {
            const caixaAccount = accounts.find(acc => acc.name.includes('Caixa') || acc.type === 'Caixa');
            const bancoAccount = accounts.find(acc => acc.name.includes('Banco') || acc.type === 'Banco');

            setFormData(prev => ({
                ...prev,
                account_id: caixaAccount ? String(caixaAccount.id) : prev.account_id,
                destination_account_id: bancoAccount ? String(bancoAccount.id) : prev.destination_account_id
            }));
        } else {
            // Auto-select first account if not set
            if (!formData.account_id && accounts.length > 0) {
                setFormData(prev => ({ ...prev, account_id: String(accounts[0].id) }));
            }
            // Auto-select first category if not set
            if (!formData.category_id && categories.length > 0) {
                const availableCategories = categories.filter(c => c.type === formData.type);
                if (availableCategories.length > 0) {
                    setFormData(prev => ({ ...prev, category_id: String(availableCategories[0].id) }));
                }
            }
        }
    }, [formData.type, accounts, categories, formData.account_id, formData.category_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            amount: parseFloat(formData.amount.replace(',', '.')),
            category_id: formData.category_id ? Number(formData.category_id) : null,
            account_id: Number(formData.account_id),
            destination_account_id: formData.destination_account_id ? Number(formData.destination_account_id) : null,
            client_id: formData.client_id ? Number(formData.client_id) : null,
            supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null
        });
    };

    const isDeposit = formData.type === 'Depósito';
    const isRevenue = formData.type === 'Receita';
    const isExpense = formData.type === 'Despesa';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="mt-1 block w-auto border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                    >
                        <option value="Receita">Receita</option>
                        <option value="Despesa">Despesa</option>
                        <option value="Depósito">Depósito</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-auto border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                        disabled={isDeposit} // Depósitos são sempre imediatos/pagos geralmente
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                    <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Data</label>
                    <input
                        type="date"
                        name="transaction_date"
                        value={formData.transaction_date}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                </div>
            </div>

            {/* Conta e Categoria ocultas conforme solicitado */}
            <input type="hidden" name="account_id" value={formData.account_id} />
            <input type="hidden" name="category_id" value={formData.category_id} />

            {/* Cliente (apenas Receita) */}
            {isRevenue && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cliente (Opcional)</label>
                    <select
                        name="client_id"
                        value={formData.client_id}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                        <option value="">Selecione...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Fornecedor (apenas Despesa) */}
            {isExpense && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fornecedor (Opcional)</label>
                    <select
                        name="supplier_id"
                        value={formData.supplier_id}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                        <option value="">Selecione...</option>
                        {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="secondary" onClick={onClose} type="button">
                    Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar Transação'}
                </Button>
            </div>
        </form>
    );
};

const Financeiro: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Transações');
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [cashFlowData, setCashFlowData] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    // Modal states
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    });

    // Carregar dados iniciais
    useEffect(() => {
        loadInitialData();
    }, [dateRange]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Datas para fluxo de caixa (fallback para mês atual se filtro estiver vazio)
            const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
            const defaultEnd = new Date().toLocaleDateString('en-CA');

            const cashFlowStart = dateRange.start || defaultStart;
            const cashFlowEnd = dateRange.end || defaultEnd;

            // Carregar todas as informações em paralelo
            const [transactionsRes, summaryRes, categoriesRes, accountsRes, cashFlowRes, clientsRes, suppliersRes] = await Promise.all([
                api.getFinancialTransactions({
                    date_from: dateRange.start,
                    date_to: dateRange.end
                }),
                api.getFinancialSummary({
                    date_from: dateRange.start || undefined,
                    date_to: dateRange.end || undefined
                }),
                api.getFinancialCategories(),
                api.getFinancialAccounts(),
                api.getCashFlow(cashFlowStart, cashFlowEnd),
                api.getClients({ limit: 200 }),
                api.getSuppliers()
            ]);

            if (transactionsRes.success) {
                setTransactions(transactionsRes.data || []);
            }

            if (summaryRes.success) {
                setSummary(summaryRes.data);
            }

            if (categoriesRes.success) {
                setCategories(categoriesRes.data || []);
            }

            if (accountsRes.success) {
                setAccounts(accountsRes.data || []);
            }

            if (clientsRes.success) {
                setClients(clientsRes.data || []);
            }

            if (suppliersRes.success) {
                setSuppliers(suppliersRes.data || []);
            }

            if (cashFlowRes.success) {
                const flowData = cashFlowRes.data?.map((item: any) => ({
                    date: formatDate(item.date),
                    receitas: item.revenue,
                    despesas: item.expenses,
                    saldo: item.balance
                })) || [];
                setCashFlowData(flowData);
            }
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
            setToast({ message: 'Erro ao carregar dados financeiros', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetailsModal = (transaction: FinancialTransaction) => {
        setSelectedTransaction(transaction);
        setIsDetailsModalOpen(true);
    };

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        try {
            const paymentDate = newStatus === 'Pago' ? new Date().toISOString() : undefined;
            const response = await api.updateTransactionStatus(id, newStatus, paymentDate);

            if (response.success) {
                setToast({ message: 'Status atualizado com sucesso!', type: 'success' });
                loadInitialData(); // Recarregar dados
                setIsDetailsModalOpen(false);
            } else {
                throw new Error(response.error || 'Erro ao atualizar status');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            setToast({ message: 'Erro ao atualizar status', type: 'error' });
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        try {
            const response = await api.deleteFinancialTransaction(id);

            if (response.success) {
                setToast({ message: 'Transação excluída com sucesso!', type: 'success' });
                loadInitialData();
                setIsDetailsModalOpen(false);
            } else {
                throw new Error(response.error || 'Erro ao excluir transação');
            }
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            setToast({ message: 'Erro ao excluir transação', type: 'error' });
        }
    };

    const handleSaveTransaction = async (data: any) => {
        setIsSubmitting(true);
        try {
            const response = await api.createFinancialTransaction(data);
            if (response.success) {
                setToast({ message: 'Transação criada com sucesso!', type: 'success' });
                setIsFormModalOpen(false);
                loadInitialData();
            } else {
                throw new Error(response.error || 'Erro ao criar transação');
            }
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            setToast({ message: 'Erro ao salvar transação', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtrar transações
    const filteredTransactions = useMemo(() => {
        return transactions.filter(transaction => {
            const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.transaction_code.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'Todos' || transaction.type === typeFilter;
            const matchesStatus = statusFilter === 'Todos' || transaction.status === statusFilter;
            const matchesCategory = categoryFilter === 'Todos' ||
                transaction.category?.id?.toString() === categoryFilter;

            return matchesSearch && matchesType && matchesStatus && matchesCategory;
        });
    }, [transactions, searchTerm, typeFilter, statusFilter, categoryFilter]);

    // Separar receitas e despesas para as abas
    const receivables = filteredTransactions.filter(t => t.type === 'Receita');
    const payables = filteredTransactions.filter(t => t.type === 'Despesa');

    const clearFilters = () => {
        setSearchTerm('');
        setTypeFilter('Todos');
        setStatusFilter('Todos');
        setCategoryFilter('Todos');
        // Resetar para o mês atual ou limpar totalmente?
        // O usuário pediu "carregar do banco", talvez queira ver tudo.
        // Vamos manter o reset padrão, mas adicionar um botão "Ver Todas" na UI.
        setDateRange({
            start: '',
            end: ''
        });
    };

    const showAllTransactions = () => {
        setDateRange({ start: '', end: '' });
    };

    return (
        <>
            <div className="space-y-6">
                <PageHeader title="Gestão Financeira" />

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Total de Receitas"
                        value={formatCurrency(summary?.total_revenue || 0)}
                        icon="fas fa-arrow-up"
                        color="bg-green-500"
                    />
                    <KPICard
                        title="Total de Despesas"
                        value={formatCurrency(summary?.total_expenses || 0)}
                        icon="fas fa-arrow-down"
                        color="bg-red-500"
                    />
                    <KPICard
                        title="Saldo"
                        value={formatCurrency(summary?.balance || 0)}
                        icon="fas fa-wallet"
                        color="bg-blue-500"
                    />
                    <KPICard
                        title="A Receber"
                        value={formatCurrency(summary?.pending_revenue || 0)}
                        icon="fas fa-clock"
                        color="bg-yellow-500"
                    />
                </div>

                {/* Filtros */}
                <div className="flex justify-between items-center">
                    <FilterBar onClearFilters={clearFilters}>
                        <input
                            type="text"
                            placeholder="Buscar transação..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md mr-4"
                        />

                        <div className="flex items-center space-x-2 col-span-1 md:col-span-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="p-2 border border-gray-300 rounded-md"
                                title="Data Inicial"
                            />
                            <span className="text-gray-500">até</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="p-2 border border-gray-300 rounded-md"
                                title="Data Final"
                            />
                            <button
                                onClick={showAllTransactions}
                                className="p-2 text-blue-600 hover:text-blue-800 text-sm"
                                title="Ver todas as datas"
                            >
                                <i className="fas fa-calendar-alt"></i> Ver Todas
                            </button>
                        </div>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            <option value="Receita">Receitas</option>
                            <option value="Despesa">Despesas</option>
                            <option value="Depósito">Depósitos</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md"
                        >
                            <option value="Todos">Todas as Categorias</option>
                            {Array.from(new Set(categories.map(c => c.id)))
                                .map(id => categories.find(c => c.id === id))
                                .map(cat => (
                                    <option key={cat!.id} value={cat!.id.toString()}>
                                        {cat!.name}
                                    </option>
                                ))}
                        </select>
                    </FilterBar>

                    <Button
                        variant="primary"
                        onClick={() => setIsFormModalOpen(true)}
                    >
                        <i className="fas fa-plus mr-2"></i>
                        Nova Transação
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs
                    tabs={['Transações', 'Contas a Receber', 'Contas a Pagar', 'Fluxo de Caixa']}
                    activeTab={activeTab}
                    onTabClick={setActiveTab}
                />

                {/* Conteúdo das Tabs */}
                {activeTab === 'Transações' && (
                    <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Conta</th>
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-4">Carregando...</td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-4">Nenhuma transação encontrada</td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(transaction => (
                                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{transaction.transaction_code}</td>
                                            <td className="px-4 py-3">{formatDate(transaction.transaction_date)}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={transaction.type === 'Receita' ? 'success' : transaction.type === 'Despesa' ? 'danger' : 'info'}>
                                                    {transaction.type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {transaction.type === 'Depósito' || transaction.type === 'Transferência' ? (
                                                    <span className="text-xs">
                                                        {transaction.account?.name} <i className="fas fa-arrow-right mx-1 text-gray-400"></i> {transaction.destination_account?.name || 'Externo'}
                                                    </span>
                                                ) : (
                                                    <span>{transaction.account?.name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {transaction.category && (
                                                    <span className="flex items-center">
                                                        {transaction.category.icon && (
                                                            <i className={`${transaction.category.icon} mr-2`} style={{ color: transaction.category.color }}></i>
                                                        )}
                                                        {transaction.category.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{transaction.description}</td>
                                            <td className="px-4 py-3">{transaction.client?.name || '-'}</td>
                                            <td className="px-4 py-3 font-semibold">
                                                <span className={transaction.type === 'Receita' ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(transaction.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusVariant(transaction.status)}>
                                                    {transaction.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleOpenDetailsModal(transaction)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'Contas a Receber' && (
                    <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Vencimento</th>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receivables.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4">Nenhuma conta a receber</td>
                                    </tr>
                                ) : (
                                    receivables.map(transaction => (
                                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{transaction.transaction_code}</td>
                                            <td className="px-4 py-3">{transaction.due_date ? formatDate(transaction.due_date) : '-'}</td>
                                            <td className="px-4 py-3">{transaction.client?.name || '-'}</td>
                                            <td className="px-4 py-3">{transaction.description}</td>
                                            <td className="px-4 py-3 font-semibold text-green-600">
                                                {formatCurrency(transaction.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusVariant(transaction.status)}>
                                                    {transaction.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleOpenDetailsModal(transaction)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'Contas a Pagar' && (
                    <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Vencimento</th>
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payables.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4">Nenhuma conta a pagar</td>
                                    </tr>
                                ) : (
                                    payables.map(transaction => (
                                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{transaction.transaction_code}</td>
                                            <td className="px-4 py-3">{transaction.due_date ? formatDate(transaction.due_date) : '-'}</td>
                                            <td className="px-4 py-3">{transaction.category?.name || '-'}</td>
                                            <td className="px-4 py-3">{transaction.description}</td>
                                            <td className="px-4 py-3 font-semibold text-red-600">
                                                {formatCurrency(transaction.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusVariant(transaction.status)}>
                                                    {transaction.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleOpenDetailsModal(transaction)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'Fluxo de Caixa' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={cashFlowData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="receitas" stroke="#10b981" name="Receitas" strokeWidth={2} />
                                <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
                                <Line type="monotone" dataKey="saldo" stroke="#3b82f6" name="Saldo" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes */}
            {selectedTransaction && (
                <Modal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    title="Detalhes da Transação"
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Código</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.transaction_code}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                <Badge variant={selectedTransaction.type === 'Receita' ? 'success' : 'danger'}>
                                    {selectedTransaction.type}
                                </Badge>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data</label>
                                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedTransaction.transaction_date)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <Badge variant={getStatusVariant(selectedTransaction.status)}>
                                    {selectedTransaction.status}
                                </Badge>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.category?.name || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Conta</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.account?.name || '-'}</p>
                            </div>
                            {selectedTransaction.client && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.client.name}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor</label>
                                <p className={`mt-1 text-lg font-semibold ${selectedTransaction.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(selectedTransaction.amount)}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Descrição</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedTransaction.description}</p>
                        </div>

                        {selectedTransaction.notes && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Observações</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.notes}</p>
                            </div>
                        )}

                        <div className="flex justify-between pt-4 border-t">
                            <div className="flex gap-2">
                                {selectedTransaction.status === 'Pendente' && (
                                    <Button
                                        variant="success"
                                        onClick={() => handleUpdateStatus(selectedTransaction.id, 'Pago')}
                                    >
                                        <i className="fas fa-check mr-2"></i>
                                        Marcar como Pago
                                    </Button>
                                )}
                                {selectedTransaction.status === 'Pago' && (
                                    <Button
                                        variant="warning"
                                        onClick={() => handleUpdateStatus(selectedTransaction.id, 'Pendente')}
                                    >
                                        <i className="fas fa-undo mr-2"></i>
                                        Reverter para Pendente
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="danger"
                                onClick={() => handleDeleteTransaction(selectedTransaction.id)}
                            >
                                <i className="fas fa-trash mr-2"></i>
                                Excluir
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal de Nova Transação */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title="Nova Transação"
            >
                <TransactionForm
                    onSave={handleSaveTransaction}
                    onClose={() => setIsFormModalOpen(false)}
                    categories={categories}
                    accounts={accounts}
                    clients={clients}
                    suppliers={suppliers}
                    isLoading={isSubmitting}
                />
            </Modal>

            {/* Toast de notificação */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
};

export default Financeiro;