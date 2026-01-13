import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Toast from '../common/Toast';

// Tipos locais
interface Supplier {
    id: number;
    name: string;
    category?: string;
    contact?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    cnpj?: string;
    status: 'Ativo' | 'Inativo';
    created_at?: string;
    updated_at?: string;
}

interface SupplierStatistics {
    total: number;
    active: number;
    inactive: number;
    byCategory: { category: string; count: number }[];
}

const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
        return numbers.replace(
            /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
            '$1.$2.$3/$4-$5'
        ).substring(0, 18);
    }
    return value.substring(0, 18);
};

const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
        if (numbers.length === 11) {
            return numbers.replace(
                /(\d{2})(\d{5})(\d{4})/,
                '($1) $2-$3'
            );
        } else if (numbers.length === 10) {
            return numbers.replace(
                /(\d{2})(\d{4})(\d{4})/,
                '($1) $2-$3'
            );
        }
    }
    return value;
};

const SupplierForm: React.FC<{
    onSave: (supplier: Partial<Supplier>) => void;
    onClose: () => void;
    supplierToEdit: Supplier | null;
    categories: string[];
}> = ({ onSave, onClose, supplierToEdit, categories }) => {
    const isEditing = !!supplierToEdit;
    const [formData, setFormData] = useState<Partial<Supplier>>({
        name: '',
        category: '',
        contact: '',
        email: '',
        cnpj: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        status: 'Ativo'
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (supplierToEdit) {
            setFormData(supplierToEdit);
        } else {
            setFormData({
                name: '',
                category: '',
                contact: '',
                email: '',
                cnpj: '',
                address: '',
                city: '',
                state: '',
                zip_code: '',
                status: 'Ativo'
            });
        }
        setErrors({});
    }, [supplierToEdit]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        if (formData.cnpj) {
            const cnpjNumbers = formData.cnpj.replace(/\D/g, '');
            if (cnpjNumbers.length !== 14) {
                newErrors.cnpj = 'CNPJ deve ter 14 dígitos';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData);
        }
    };

    const handleChange = (field: string, value: any) => {
        let formattedValue = value;
        
        if (field === 'cnpj') {
            formattedValue = formatCNPJ(value);
        } else if (field === 'contact') {
            formattedValue = formatPhone(value);
        }
        
        setFormData(prev => ({
            ...prev,
            [field]: formattedValue
        }));
        
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Nome do Fornecedor <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={e => handleChange('name', e.target.value)} 
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                            errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required 
                    />
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                        <input 
                            type="text" 
                            value={formData.cnpj || ''} 
                            onChange={e => handleChange('cnpj', e.target.value)}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                                errors.cnpj ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.cnpj && (
                            <p className="text-red-500 text-xs mt-1">{errors.cnpj}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Categoria</label>
                        <input 
                            type="text" 
                            value={formData.category || ''} 
                            onChange={e => handleChange('category', e.target.value)}
                            list="categories"
                            placeholder="Ex: Gás, Equipamentos, etc."
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                        <datalist id="categories">
                            {categories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Telefone</label>
                        <input 
                            type="text" 
                            value={formData.contact || ''} 
                            onChange={e => handleChange('contact', e.target.value)}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input 
                            type="email" 
                            value={formData.email || ''} 
                            onChange={e => handleChange('email', e.target.value)}
                            placeholder="fornecedor@exemplo.com"
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                                errors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Endereço</label>
                    <input 
                        type="text" 
                        value={formData.address || ''} 
                        onChange={e => handleChange('address', e.target.value)}
                        placeholder="Rua, número, complemento"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cidade</label>
                        <input 
                            type="text" 
                            value={formData.city || ''} 
                            onChange={e => handleChange('city', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <input 
                            type="text" 
                            value={formData.state || ''} 
                            onChange={e => handleChange('state', e.target.value)}
                            maxLength={2}
                            placeholder="UF"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">CEP</label>
                        <input 
                            type="text" 
                            value={formData.zip_code || ''} 
                            onChange={e => handleChange('zip_code', e.target.value)}
                            placeholder="00000-000"
                            maxLength={9}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select 
                        value={formData.status || 'Ativo'} 
                        onChange={e => handleChange('status', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" variant="primary">
                    {isEditing ? 'Atualizar' : 'Cadastrar'}
                </Button>
            </div>
        </form>
    );
};

const Fornecedores: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [statistics, setStatistics] = useState<SupplierStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [categoryFilter, setCategoryFilter] = useState('Todos');

    // Carregar dados iniciais
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Carregar dados em paralelo
            const [suppliersRes, categoriesRes, statsRes] = await Promise.all([
                api.getSuppliers(),
                api.getSupplierCategories(),
                api.getSupplierStatistics()
            ]);

            if (suppliersRes.success) {
                setSuppliers(suppliersRes.data || []);
            }
            
            if (categoriesRes.success) {
                setCategories(categoriesRes.data || []);
            }
            
            if (statsRes.success) {
                setStatistics(statsRes.data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados de fornecedores:', error);
            setToast({ message: 'Erro ao carregar dados de fornecedores', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSupplier = async (supplierData: Partial<Supplier>) => {
        try {
            let response;
            
            if (supplierToEdit) {
                response = await api.updateSupplier(supplierToEdit.id, supplierData);
            } else {
                response = await api.createSupplier(supplierData);
            }
            
            if (response.success) {
                setToast({ 
                    message: supplierToEdit ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!', 
                    type: 'success' 
                });
                loadInitialData();
                handleCloseModal();
            } else {
                throw new Error(response.error || 'Erro ao salvar fornecedor');
            }
        } catch (error: any) {
            console.error('Erro ao salvar fornecedor:', error);
            setToast({ 
                message: error.message || 'Erro ao salvar fornecedor', 
                type: 'error' 
            });
        }
    };

    const handleDeleteSupplier = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;
        
        try {
            const response = await api.deleteSupplier(id);
            
            if (response.success) {
                setToast({ message: 'Fornecedor excluído com sucesso!', type: 'success' });
                loadInitialData();
            } else {
                throw new Error(response.error || 'Erro ao excluir fornecedor');
            }
        } catch (error) {
            console.error('Erro ao excluir fornecedor:', error);
            setToast({ message: 'Erro ao excluir fornecedor', type: 'error' });
        }
    };

    const handleOpenModal = (supplier?: Supplier) => {
        setSupplierToEdit(supplier || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSupplierToEdit(null);
        setIsModalOpen(false);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('Todos');
        setCategoryFilter('Todos');
    };

    // Filtrar fornecedores
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 supplier.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'Todos' || supplier.status === statusFilter;
            const matchesCategory = categoryFilter === 'Todos' || supplier.category === categoryFilter;
            
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [suppliers, searchTerm, statusFilter, categoryFilter]);

    return (
        <>
            <div className="space-y-6">
                <PageHeader title="Fornecedores" />

                {/* Estatísticas */}
                {statistics && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total</p>
                                    <p className="text-2xl font-bold">{statistics.total}</p>
                                </div>
                                <i className="fas fa-truck text-3xl text-gray-400"></i>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Ativos</p>
                                    <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
                                </div>
                                <i className="fas fa-check-circle text-3xl text-green-400"></i>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Inativos</p>
                                    <p className="text-2xl font-bold text-red-600">{statistics.inactive}</p>
                                </div>
                                <i className="fas fa-times-circle text-3xl text-red-400"></i>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Categorias</p>
                                    <p className="text-2xl font-bold">{statistics.byCategory.length}</p>
                                </div>
                                <i className="fas fa-tags text-3xl text-blue-400"></i>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtros e botão de adicionar */}
                <div className="flex justify-between items-center">
                    <FilterBar onClearFilters={clearFilters}>
                        <input
                            type="text"
                            placeholder="Buscar fornecedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 bg-white"
                        />
                        
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 bg-white"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                        
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 bg-white"
                        >
                            <option value="Todos">Todas as Categorias</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </FilterBar>
                    
                    <Button 
                        variant="primary" 
                        onClick={() => handleOpenModal()}
                    >
                        <i className="fas fa-plus mr-2"></i>
                        Novo Fornecedor
                    </Button>
                </div>

                {/* Tabela de fornecedores */}
                <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3">Nome</th>
                                <th className="px-4 py-3">CNPJ</th>
                                <th className="px-4 py-3">Categoria</th>
                                <th className="px-4 py-3">Contato</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Cidade/UF</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-4">Carregando...</td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-4">Nenhum fornecedor encontrado</td>
                                </tr>
                            ) : (
                                filteredSuppliers.map(supplier => (
                                    <tr key={supplier.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{supplier.name}</td>
                                        <td className="px-4 py-3">{supplier.cnpj || '-'}</td>
                                        <td className="px-4 py-3">
                                            {supplier.category && (
                                                <Badge variant="info">{supplier.category}</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{supplier.contact || '-'}</td>
                                        <td className="px-4 py-3">{supplier.email || '-'}</td>
                                        <td className="px-4 py-3">
                                            {supplier.city && supplier.state 
                                                ? `${supplier.city}/${supplier.state}` 
                                                : supplier.city || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={supplier.status === 'Ativo' ? 'success' : 'danger'}>
                                                {supplier.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(supplier)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Editar"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSupplier(supplier.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Excluir"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de cadastro/edição */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={supplierToEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            >
                <SupplierForm
                    onSave={handleSaveSupplier}
                    onClose={handleCloseModal}
                    supplierToEdit={supplierToEdit}
                    categories={categories}
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

export default Fornecedores;