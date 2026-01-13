import React, { useState, useMemo } from 'react';
import { useClients } from '../../hooks/useClients';
import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Toast from '../common/Toast';

interface Client {
    id: number;
    name: string;
    type: 'Residencial' | 'Comercial' | 'Industrial';
    contact?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    cpf_cnpj?: string;
    status: 'Ativo' | 'Inativo';
    credit_limit: number;
    created_at: string;
    updated_at: string;
    last_order_date?: string;
    last_order_total?: number;
    last_order_details?: string;
    open_balance?: number;
    total_spent?: number;
}

const ClientForm: React.FC<{
    onSave: (client: Partial<Client>) => void;
    onClose: () => void;
    clientToEdit: Client | null;
    isLoading?: boolean;
}> = ({ onClose, onSave, clientToEdit, isLoading = false }) => {
    const isEditing = !!clientToEdit;
    const [formData, setFormData] = useState({
        name: clientToEdit?.name || '',
        type: clientToEdit?.type || 'Residencial' as const,
        contact: clientToEdit?.contact || '',
        email: clientToEdit?.email || '',
        address: clientToEdit?.address || '',
        city: clientToEdit?.city || '',
        state: clientToEdit?.state || '',
        zip_code: clientToEdit?.zip_code || '',
        cpf_cnpj: clientToEdit?.cpf_cnpj || '',
        status: clientToEdit?.status || 'Ativo' as const,
        credit_limit: clientToEdit?.credit_limit || 0,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const formatPhone = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
    };

    const formatCpfCnpj = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 11) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else {
            return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
    };

    const formatCep = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        if (formData.cpf_cnpj) {
            const cleaned = formData.cpf_cnpj.replace(/\D/g, '');
            if (cleaned.length !== 11 && cleaned.length !== 14) {
                newErrors.cpf_cnpj = 'CPF ou CNPJ inválido';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: string, value: any) => {
        let formattedValue = value;

        if (field === 'contact') {
            formattedValue = formatPhone(value);
        } else if (field === 'cpf_cnpj') {
            formattedValue = formatCpfCnpj(value);
        } else if (field === 'zip_code') {
            formattedValue = formatCep(value);
        } else if (field === 'state') {
            formattedValue = value.toUpperCase().slice(0, 2);
        }

        setFormData(prev => ({ ...prev, [field]: formattedValue }));

        // Limpar erro do campo quando o usuário começar a digitar
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                        Nome Completo / Razão Social *
                    </label>
                    <input
                        type="text"
                        id="client-name"
                        value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                        required
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="client-type" className="block text-sm font-medium text-gray-700">
                            Tipo de Cliente *
                        </label>
                        <select
                            id="client-type"
                            value={formData.type}
                            onChange={e => handleChange('type', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial">Comercial</option>
                            <option value="Industrial">Industrial</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="client-status" className="block text-sm font-medium text-gray-700">
                            Status
                        </label>
                        <select
                            id="client-status"
                            value={formData.status}
                            onChange={e => handleChange('status', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="client-contact" className="block text-sm font-medium text-gray-700">
                            Telefone
                        </label>
                        <input
                            type="text"
                            id="client-contact"
                            value={formData.contact}
                            onChange={e => handleChange('contact', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                        />
                    </div>
                    <div>
                        <label htmlFor="client-email" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            type="email"
                            id="client-email"
                            value={formData.email}
                            onChange={e => handleChange('email', e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="client-address" className="block text-sm font-medium text-gray-700">
                        Endereço
                    </label>
                    <input
                        type="text"
                        id="client-address"
                        value={formData.address}
                        onChange={e => handleChange('address', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="client-city" className="block text-sm font-medium text-gray-700">
                            Cidade
                        </label>
                        <input
                            type="text"
                            id="client-city"
                            value={formData.city}
                            onChange={e => handleChange('city', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="client-state" className="block text-sm font-medium text-gray-700">
                            Estado
                        </label>
                        <input
                            type="text"
                            id="client-state"
                            value={formData.state}
                            onChange={e => handleChange('state', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            placeholder="UF"
                            maxLength={2}
                        />
                    </div>
                    <div>
                        <label htmlFor="client-zip" className="block text-sm font-medium text-gray-700">
                            CEP
                        </label>
                        <input
                            type="text"
                            id="client-zip"
                            value={formData.zip_code}
                            onChange={e => handleChange('zip_code', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            placeholder="00000-000"
                            maxLength={9}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="client-cpf-cnpj" className="block text-sm font-medium text-gray-700">
                            CPF/CNPJ
                        </label>
                        <input
                            type="text"
                            id="client-cpf-cnpj"
                            value={formData.cpf_cnpj}
                            onChange={e => handleChange('cpf_cnpj', e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.cpf_cnpj ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                            placeholder="000.000.000-00 ou 00.000.000/0000-00"
                            maxLength={18}
                        />
                        {errors.cpf_cnpj && (
                            <p className="mt-1 text-sm text-red-600">{errors.cpf_cnpj}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="client-credit-limit" className="block text-sm font-medium text-gray-700">
                            Limite de Crédito (R$)
                        </label>
                        <input
                            type="number"
                            id="client-credit-limit"
                            value={formData.credit_limit}
                            onChange={e => handleChange('credit_limit', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
                <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar')} Cliente
                </Button>
            </div>
        </form>
    );
};

const HistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    history: any[];
    isLoading: boolean;
}> = ({ isOpen, onClose, clientName, history, isLoading }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Histórico de Compras - ${clientName}`}>
            <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Nenhuma compra encontrada.
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pendente</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {history.map((order) => (
                                <tr key={order.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(order.date)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(order.totalValue)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <span className={`font-medium ${parseFloat(order.pendingAmount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(parseFloat(order.pendingAmount) || 0)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <Badge variant={order.status === 'Entregue' ? 'success' : 'warning'}>
                                            {order.status === 'Entregue' ? 'Entregue' : 'Pendente'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <Badge variant={order.paymentStatus === 'Pago' ? 'success' : order.paymentStatus === 'Parcial' ? 'warning' : 'danger'}>
                                            {order.paymentStatus || 'Pendente'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={onClose}>Fechar</Button>
            </div>
        </Modal>
    );
};

const ClientesAPI: React.FC = () => {
    const { clients, loading, error, createClient, updateClient, deleteClient } = useClients();
    const [showModal, setShowModal] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

    // Import ApiService instance (assuming it's available or we use a hook)
    // Since useClients uses ApiService internally but doesn't expose it, we might need to import it directly or add it to useClients.
    // For now, I'll import the singleton instance if possible, or just fetch using fetch/axios if ApiService is not exported.
    // Wait, api.ts exports `api` instance usually?
    // Let's check api.ts imports in this file. It doesn't import api.
    // I will use the `api` service directly.
    // But first I need to import it. I'll add the import in a separate edit or assume it's globally available? No.
    // I'll add `import { api } from '../../services/api';` at the top.

    const handleViewHistory = async (client: Client) => {
        setSelectedClientForHistory(client);
        setShowHistoryModal(true);
        setHistoryLoading(true);
        try {
            // We need to import api service. I will add the import in the next step or use a workaround.
            // Workaround: use fetch for now or assume api is imported.
            // Actually, I can't assume. I must import it.
            // I will add the import line in a separate edit.
            // For now, I'll comment out the actual call and fix imports next.
            const response = await import('../../services/api').then(m => m.api.getClientHistory(client.id));
            if (response.success) {
                setHistoryData(response.data);
            } else {
                setToast({ message: 'Erro ao carregar histórico', type: 'error' });
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            setToast({ message: 'Erro ao carregar histórico', type: 'error' });
        } finally {
            setHistoryLoading(false);
        }
    };

    const isInactive = (dateString?: string) => {
        if (!dateString) return true; // Never purchased = inactive? Or neutral? User said "when > 30 days".
        // If never purchased, maybe not red signal?
        // Let's assume only if purchased > 30 days ago.
        const lastOrder = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastOrder.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 30;
    };

    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.cpf_cnpj?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'Todos' || client.status === statusFilter;
            const matchesType = typeFilter === 'Todos' || client.type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [clients, searchTerm, statusFilter, typeFilter]);

    const handleSaveClient = async (clientData: Partial<Client>) => {
        setIsSubmitting(true);
        console.log('📝 Salvando cliente:', clientData);

        try {
            let result;
            if (clientToEdit) {
                console.log('✏️ Atualizando cliente ID:', clientToEdit.id);
                result = await updateClient(clientToEdit.id, clientData);
            } else {
                console.log('➕ Criando novo cliente');
                result = await createClient(clientData);
            }

            console.log('📊 Resultado:', result);

            if (result.success) {
                setShowModal(false);
                setClientToEdit(null);
                // Mostrar mensagem de sucesso
                const message = clientToEdit ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!';
                console.log('✅', message);
                setToast({ message, type: 'success' });
            } else {
                console.error('❌ Erro ao salvar:', result.error);
                setToast({ message: result.error || 'Erro ao salvar cliente', type: 'error' });
            }
        } catch (error) {
            console.error('🔥 Erro de conexão:', error);
            alert('Erro de conexão com o servidor');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClient = async (client: Client) => {
        if (window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?`)) {
            const result = await deleteClient(client.id);
            if (result.success) {
                setToast({ message: 'Cliente excluído com sucesso!', type: 'success' });
            } else {
                setToast({ message: result.error || 'Erro ao excluir cliente', type: 'error' });
            }
        }
    };

    const handleEditClient = (client: Client) => {
        setClientToEdit(client);
        setShowModal(true);
    };

    const handleNewClient = () => {
        console.log('🆕 Abrindo modal para novo cliente');
        setClientToEdit(null);
        setShowModal(true);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                <p>Erro ao carregar clientes: {error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm underline hover:no-underline"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestão de Clientes</h1>
                    <p className="mt-1 text-sm text-gray-600">Gerencie informações dos seus clientes</p>
                </div>
                <button
                    onClick={handleNewClient}
                    className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg font-medium"
                    type="button"
                >
                    <i className="fa-solid fa-user-plus"></i>
                    <span>Novo Cliente</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold text-lg text-gray-900">{filteredClients.length}</span>
                            {' '}cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
                        </div>
                        {searchTerm && (
                            <div className="text-sm text-gray-500">
                                Pesquisando por: <span className="font-medium">"{searchTerm}"</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <span className="text-sm text-gray-500">Total de clientes:</span>
                        <span className="text-sm font-semibold text-gray-900">{clients.length}</span>
                    </div>
                </div>
                <FilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filters={[
                        {
                            label: 'Status',
                            value: statusFilter,
                            onChange: setStatusFilter,
                            options: ['Todos', 'Ativo', 'Inativo']
                        },
                        {
                            label: 'Tipo',
                            value: typeFilter,
                            onChange: setTypeFilter,
                            options: ['Todos', 'Residencial', 'Comercial', 'Industrial']
                        }
                    ]}
                />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contato
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Limite Crédito
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Saldo em Aberto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Última Compra
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {client.last_order_date && isInactive(client.last_order_date) && (
                                                <div className="mr-2 text-red-500" title="Inativo há mais de 30 dias">
                                                    <i className="fa-solid fa-circle-exclamation"></i>
                                                </div>
                                            )}
                                            <div>
                                                <div
                                                    className="text-sm font-medium text-gray-900 cursor-pointer hover:text-orange-600"
                                                    onClick={() => handleViewHistory(client)}
                                                >
                                                    {client.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {client.email || client.cpf_cnpj}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge
                                            variant={
                                                client.type === 'Industrial' ? 'purple' :
                                                    client.type === 'Comercial' ? 'info' : 'neutral'
                                            }
                                        >
                                            {client.type}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {client.contact || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={client.status === 'Ativo' ? 'success' : 'danger'}>
                                            {client.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(client.credit_limit)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`font-medium ${(client.open_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(client.open_balance || 0)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {client.last_order_date ? (
                                            <div>
                                                <div>{formatDate(client.last_order_date)}</div>
                                                {client.last_order_total && (
                                                    <div className="text-xs">
                                                        {formatCurrency(client.last_order_total)}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            'Nenhuma compra'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleViewHistory(client)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Ver Histórico"
                                            >
                                                <i className="fa-solid fa-clock-rotate-left"></i>
                                            </button>
                                            <button
                                                onClick={() => handleEditClient(client)}
                                                className="text-orange-600 hover:text-orange-900"
                                                title="Editar"
                                            >
                                                <i className="fa-solid fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClient(client)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Excluir"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredClients.length === 0 && (
                    <div className="text-center py-12">
                        <i className="fa-solid fa-users text-4xl text-gray-300 mb-4"></i>
                        <p className="text-gray-500">Nenhum cliente encontrado</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
            >
                <ClientForm
                    onSave={handleSaveClient}
                    onClose={() => setShowModal(false)}
                    clientToEdit={clientToEdit}
                    isLoading={isSubmitting}
                />
            </Modal>

            <HistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                clientName={selectedClientForHistory?.name || ''}
                history={historyData}
                isLoading={historyLoading}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default ClientesAPI;

