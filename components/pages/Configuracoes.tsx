import React, { useState, useEffect } from 'react';
import Tabs from '../common/Tabs';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { UserRole } from '../../types';
import { mockCompanyInfo } from '../../data/mockData';
import { api } from '../../services/api';

const getRoleVariant = (role: UserRole) => {
    const map = { 'Administrador': 'admin', 'Gerente': 'manager', 'Vendedor': 'seller' };
    return map[role] as 'admin' | 'manager' | 'seller';
};

interface UserFormData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}

interface Branch {
    id: string;
    name: string;
    cnpj: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    status: 'Ativo' | 'Inativo';
}

interface BranchFormData {
    name: string;
    cnpj: string;
    address: string;
    city: string;
    state: string;
    phone: string;
}

interface UsersTabProps {
    users: any[];
    onAddUser: () => void;
    onRefresh: () => void;
    onEditUser: (user: any) => void;
    onToggleUserStatus: (user: any) => void;
    onDeleteUser: (user: any) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({ users = [], onAddUser, onEditUser, onToggleUserStatus, onDeleteUser }) => {
    const [confirmModal, setConfirmModal] = useState<{ type: 'toggle' | 'delete'; user: any } | null>(null);

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Usuários e Permissões</h2>
                    <Button variant="primary" icon="fa-solid fa-plus" onClick={onAddUser}>Adicionar Usuário</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Perfil</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Nenhum usuário encontrado</td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{user.name}</td>
                                        <td className="px-6 py-4">{user.email}</td>
                                        <td className="px-6 py-4"><Badge variant={getRoleVariant(user.role)}>{user.role}</Badge></td>
                                        <td className="px-6 py-4"><Badge variant={user.status === 'Ativo' ? 'success' : 'danger'}>{user.status}</Badge></td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-3">
                                                <button
                                                    onClick={() => onEditUser(user)}
                                                    className="font-medium text-blue-600 hover:underline text-xs"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({ type: 'toggle', user })}
                                                    className={`font-medium ${user.status === 'Ativo' ? 'text-orange-600' : 'text-green-600'} hover:underline text-xs`}
                                                >
                                                    {user.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({ type: 'delete', user })}
                                                    className="font-medium text-red-600 hover:underline text-xs"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
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

            {/* Modal de Confirmação */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            {confirmModal.type === 'toggle'
                                ? (confirmModal.user.status === 'Ativo' ? 'Desativar Usuário' : 'Ativar Usuário')
                                : 'Excluir Usuário'
                            }
                        </h3>
                        {confirmModal.type === 'delete' && (
                            <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
                                <p className="text-red-800 text-sm">
                                    <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                                    Esta ação é irreversível!
                                </p>
                            </div>
                        )}
                        <p className="text-gray-600 mb-6">
                            {confirmModal.type === 'toggle'
                                ? `Tem certeza que deseja ${confirmModal.user.status === 'Ativo' ? 'desativar' : 'ativar'} o usuário "${confirmModal.user.name}"?`
                                : `Tem certeza que deseja excluir permanentemente o usuário "${confirmModal.user.name}"?`
                            }
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmModal.type === 'toggle') {
                                        onToggleUserStatus(confirmModal.user);
                                    } else {
                                        onDeleteUser(confirmModal.user);
                                    }
                                    setConfirmModal(null);
                                }}
                                className={`px-4 py-2 text-white rounded-md ${confirmModal.type === 'delete'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : confirmModal.user.status === 'Ativo'
                                        ? 'bg-orange-600 hover:bg-orange-700'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {confirmModal.type === 'toggle'
                                    ? (confirmModal.user.status === 'Ativo' ? 'Desativar' : 'Ativar')
                                    : 'Excluir'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

interface CompanyTabProps {
    companyInfo?: { name?: string; cnpj?: string };
    onUpdate: (data: { name: string; cnpj: string }) => void;
    branches: Branch[];
    onAddBranch: () => void;
    onEditBranch: (branch: Branch) => void;
    onDeleteBranch: (id: string) => void;
    onToggleBranchStatus: (id: string) => void;
}

const CompanyTab: React.FC<CompanyTabProps> = ({
    companyInfo = {},
    onUpdate,
    branches,
    onAddBranch,
    onEditBranch,
    onDeleteBranch,
    onToggleBranchStatus
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: companyInfo.name || '',
        cnpj: companyInfo.cnpj || ''
    });
    const [errors, setErrors] = useState<{ name?: string; cnpj?: string }>({});
    const [loading, setLoading] = useState(false);

    const formatCNPJ = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 14) {
            return numbers.replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                '$1.$2.$3/$4-$5'
            );
        }
        return value;
    };

    const validateCNPJ = (cnpj: string): boolean => {
        const numbers = cnpj.replace(/\D/g, '');
        return numbers.length === 14;
    };

    const handleChange = (field: 'name' | 'cnpj', value: string) => {
        if (field === 'cnpj') {
            value = formatCNPJ(value);
        }
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: { name?: string; cnpj?: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nome da empresa é obrigatório';
        }

        if (!formData.cnpj.trim()) {
            newErrors.cnpj = 'CNPJ é obrigatório';
        } else if (!validateCNPJ(formData.cnpj)) {
            newErrors.cnpj = 'CNPJ inválido (deve ter 14 dígitos)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Simula delay de API
            await new Promise(resolve => setTimeout(resolve, 500));

            onUpdate(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Erro ao salvar:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: companyInfo.name || '',
            cnpj: companyInfo.cnpj || ''
        });
        setErrors({});
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            {/* Seção de Informações da Empresa */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Informações da Empresa</h2>
                <div className="space-y-4 max-w-2xl">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome da Empresa {isEditing && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md transition-colors ${isEditing
                                ? errors.name
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                : 'border-gray-300 bg-gray-50'
                                } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                            readOnly={!isEditing}
                            placeholder={isEditing ? "Digite o nome da empresa" : ""}
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            CNPJ {isEditing && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            value={formData.cnpj}
                            onChange={(e) => handleChange('cnpj', e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md transition-colors ${isEditing
                                ? errors.cnpj
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                : 'border-gray-300 bg-gray-50'
                                } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                            readOnly={!isEditing}
                            placeholder={isEditing ? "00.000.000/0000-00" : ""}
                            maxLength={18}
                        />
                        {errors.cnpj && <p className="text-red-500 text-sm mt-1">{errors.cnpj}</p>}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        {!isEditing ? (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <i className="fa-solid fa-pen mr-2"></i>
                                Editar Informações
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-save mr-2"></i>
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Seção de Filiais */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Filiais</h2>
                    <button
                        onClick={onAddBranch}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <i className="fa-solid fa-plus mr-2"></i>
                        Nova Filial
                    </button>
                </div>

                {branches.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <i className="fa-solid fa-building text-4xl mb-4 text-gray-300"></i>
                        <p>Nenhuma filial cadastrada</p>
                        <p className="text-sm mt-2">Clique em "Nova Filial" para adicionar uma filial</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3">CNPJ</th>
                                    <th className="px-6 py-3">Cidade/Estado</th>
                                    <th className="px-6 py-3">Telefone</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches.map(branch => (
                                    <tr key={branch.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{branch.name}</td>
                                        <td className="px-6 py-4">{branch.cnpj}</td>
                                        <td className="px-6 py-4">{branch.city}/{branch.state}</td>
                                        <td className="px-6 py-4">{branch.phone}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={branch.status === 'Ativo' ? 'success' : 'danger'}>
                                                {branch.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-3">
                                                <button
                                                    onClick={() => onEditBranch(branch)}
                                                    className="font-medium text-blue-600 hover:underline"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => onToggleBranchStatus(branch.id)}
                                                    className={`font-medium ${branch.status === 'Ativo' ? 'text-orange-600' : 'text-green-600'
                                                        } hover:underline`}
                                                >
                                                    {branch.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <button
                                                    onClick={() => onDeleteBranch(branch.id)}
                                                    className="font-medium text-red-600 hover:underline"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const SecurityTab: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivityLogs();
    }, []);

    const loadActivityLogs = async () => {
        try {
            setLoading(true);
            const response = await api.getActivityLogs({ limit: 100 });
            console.log('📊 Logs de atividade:', response);
            setLogs(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar logs de atividade:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Logs de Atividade</h2>
                <button
                    onClick={loadActivityLogs}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                    <i className="fa-solid fa-rotate-right mr-2"></i>
                    Atualizar
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <i className="fa-solid fa-clipboard-list text-4xl mb-4 text-gray-300"></i>
                    <p>Nenhum log de atividade encontrado</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Data/Hora</th>
                                <th className="px-6 py-3">Usuário</th>
                                <th className="px-6 py-3">Ação Realizada</th>
                                <th className="px-6 py-3">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{formatDate(log.created_at)}</td>
                                    <td className="px-6 py-4 font-medium">{log.user_name || 'Sistema'}</td>
                                    <td className="px-6 py-4">{log.action}</td>
                                    <td className="px-6 py-4 text-xs text-gray-400">{log.ip_address || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (userData: UserFormData) => void;
    loading: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSubmit, loading }) => {
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        role: 'Vendedor'
    });
    const [errors, setErrors] = useState<Partial<UserFormData>>({});

    const validateForm = (): boolean => {
        const newErrors: Partial<UserFormData> = {};

        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
        if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
        if (!formData.password) newErrors.password = 'Senha é obrigatória';
        else if (formData.password.length < 6) newErrors.password = 'Senha deve ter no mínimo 6 caracteres';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    const handleChange = (field: keyof UserFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', role: 'Vendedor' });
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Novo Usuário</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                }`}
                            placeholder="Digite o nome completo"
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                }`}
                            placeholder="usuario@exemplo.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Senha *
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                }`}
                            placeholder="Mínimo 6 caracteres"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Perfil de Acesso *
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value as UserRole)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Vendedor">Vendedor</option>
                            <option value="Gerente">Gerente</option>
                            <option value="Administrador">Administrador</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface BranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (branchData: BranchFormData) => void;
    loading: boolean;
    editingBranch?: Branch | null;
}

const BranchModal: React.FC<BranchModalProps> = ({ isOpen, onClose, onSubmit, loading, editingBranch }) => {
    const [formData, setFormData] = useState<BranchFormData>({
        name: '',
        cnpj: '',
        address: '',
        city: '',
        state: '',
        phone: ''
    });
    const [errors, setErrors] = useState<Partial<BranchFormData>>({});

    useEffect(() => {
        if (editingBranch) {
            setFormData({
                name: editingBranch.name,
                cnpj: editingBranch.cnpj,
                address: editingBranch.address,
                city: editingBranch.city,
                state: editingBranch.state,
                phone: editingBranch.phone
            });
        } else {
            resetForm();
        }
    }, [editingBranch, isOpen]);

    const formatCNPJ = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 14) {
            return numbers.replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                '$1.$2.$3/$4-$5'
            );
        }
        return value;
    };

    const formatPhone = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers.replace(
                /^(\d{2})(\d{5})(\d{4})$/,
                '($1) $2-$3'
            );
        }
        return value;
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<BranchFormData> = {};

        if (!formData.name.trim()) newErrors.name = 'Nome da filial é obrigatório';
        if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
        else if (formData.cnpj.replace(/\D/g, '').length !== 14) newErrors.cnpj = 'CNPJ inválido';
        if (!formData.address.trim()) newErrors.address = 'Endereço é obrigatório';
        if (!formData.city.trim()) newErrors.city = 'Cidade é obrigatória';
        if (!formData.state.trim()) newErrors.state = 'Estado é obrigatório';
        if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
        else if (formData.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Telefone inválido';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    const handleChange = (field: keyof BranchFormData, value: string) => {
        let formattedValue = value;
        if (field === 'cnpj') formattedValue = formatCNPJ(value);
        if (field === 'phone') formattedValue = formatPhone(value);

        setFormData(prev => ({ ...prev, [field]: formattedValue }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const resetForm = () => {
        setFormData({ name: '', cnpj: '', address: '', city: '', state: '', phone: '' });
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                    <h3 className="text-xl font-bold text-gray-800">
                        {editingBranch ? 'Editar Filial' : 'Nova Filial'}
                    </h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome da Filial *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                placeholder="Digite o nome da filial"
                            />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                CNPJ *
                            </label>
                            <input
                                type="text"
                                value={formData.cnpj}
                                onChange={(e) => handleChange('cnpj', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.cnpj ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                            />
                            {errors.cnpj && <p className="text-red-500 text-sm mt-1">{errors.cnpj}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefone *
                            </label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                            />
                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Endereço *
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                placeholder="Rua, número, bairro"
                            />
                            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cidade *
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                placeholder="Nome da cidade"
                            />
                            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estado *
                            </label>
                            <select
                                value={formData.state}
                                onChange={(e) => handleChange('state', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.state ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                            >
                                <option value="">Selecione...</option>
                                <option value="AC">Acre</option>
                                <option value="AL">Alagoas</option>
                                <option value="AP">Amapá</option>
                                <option value="AM">Amazonas</option>
                                <option value="BA">Bahia</option>
                                <option value="CE">Ceará</option>
                                <option value="DF">Distrito Federal</option>
                                <option value="ES">Espírito Santo</option>
                                <option value="GO">Goiás</option>
                                <option value="MA">Maranhão</option>
                                <option value="MT">Mato Grosso</option>
                                <option value="MS">Mato Grosso do Sul</option>
                                <option value="MG">Minas Gerais</option>
                                <option value="PA">Pará</option>
                                <option value="PB">Paraíba</option>
                                <option value="PR">Paraná</option>
                                <option value="PE">Pernambuco</option>
                                <option value="PI">Piauí</option>
                                <option value="RJ">Rio de Janeiro</option>
                                <option value="RN">Rio Grande do Norte</option>
                                <option value="RS">Rio Grande do Sul</option>
                                <option value="RO">Rondônia</option>
                                <option value="RR">Roraima</option>
                                <option value="SC">Santa Catarina</option>
                                <option value="SP">São Paulo</option>
                                <option value="SE">Sergipe</option>
                                <option value="TO">Tocantins</option>
                            </select>
                            {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : editingBranch ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Configuracoes: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Usuários & Permissões');
    const [users, setUsers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [companyInfo, setCompanyInfo] = useState(() => {
        const saved = localStorage.getItem('companyInfo');
        return saved ? JSON.parse(saved) : mockCompanyInfo;
    });
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [branchLoading, setBranchLoading] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const TABS = ['Usuários & Permissões', 'Empresa', 'Segurança'];

    useEffect(() => {
        loadUsers();
        loadBranches();
    }, []);

    const loadBranches = async () => {
        try {
            setLoadingBranches(true);
            const response = await api.getLocations();
            if (response.success && Array.isArray(response.data)) {
                // Mapear os dados do banco para o formato esperado pelo componente
                const mappedBranches: Branch[] = response.data.map((loc: any) => ({
                    id: loc.id.toString(),
                    name: loc.name || '',
                    cnpj: loc.cnpj || '',
                    address: loc.address || '',
                    city: loc.city || '',
                    state: loc.state || '',
                    phone: loc.phone || '',
                    status: loc.status as 'Ativo' | 'Inativo'
                }));
                setBranches(mappedBranches);
            }
        } catch (error) {
            console.error('Erro ao carregar filiais:', error);
            setBranches([]);
        } finally {
            setLoadingBranches(false);
        }
    };

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await api.getUsers();
            console.log('📊 Resposta da API getUsers:', response);
            setUsers(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAddUser = async (userData: UserFormData) => {
        try {
            setLoading(true);
            await api.createUser(userData);
            setMessage({ type: 'success', text: 'Usuário cadastrado com sucesso!' });
            setIsModalOpen(false);
            await loadUsers();
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('Erro ao cadastrar usuário:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Erro ao cadastrar usuário. Tente novamente.'
            });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: any) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (userData: { name: string; email: string; role: UserRole }) => {
        if (!editingUser) return;
        try {
            setLoading(true);
            await api.updateUser(editingUser.id, userData);
            setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
            setIsEditModalOpen(false);
            setEditingUser(null);
            await loadUsers();
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('Erro ao atualizar usuário:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Erro ao atualizar usuário. Tente novamente.'
            });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleUserStatus = async (user: any) => {
        try {
            setLoading(true);
            const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
            await api.updateUser(user.id, { status: newStatus });
            setMessage({
                type: 'success',
                text: `Usuário ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`
            });
            await loadUsers();
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('Erro ao alterar status do usuário:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Erro ao alterar status do usuário.'
            });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (user: any) => {
        try {
            setLoading(true);
            await api.deleteUser(user.id);
            setMessage({ type: 'success', text: 'Usuário excluído com sucesso!' });
            await loadUsers();
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('Erro ao excluir usuário:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Erro ao excluir usuário.'
            });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCompany = (data: { name: string; cnpj: string }) => {
        try {
            localStorage.setItem('companyInfo', JSON.stringify(data));
            setCompanyInfo(data);
            setMessage({ type: 'success', text: 'Informações da empresa atualizadas com sucesso!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Erro ao salvar informações da empresa:', error);
            setMessage({
                type: 'error',
                text: 'Erro ao salvar informações. Tente novamente.'
            });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleAddBranch = () => {
        setEditingBranch(null);
        setIsBranchModalOpen(true);
    };

    const handleEditBranch = (branch: Branch) => {
        setEditingBranch(branch);
        setIsBranchModalOpen(true);
    };

    const handleSubmitBranch = async (branchData: BranchFormData) => {
        try {
            setBranchLoading(true);

            if (editingBranch) {
                // Editar filial existente
                const response = await api.updateLocation(parseInt(editingBranch.id), branchData);
                if (response.success) {
                    setMessage({ type: 'success', text: 'Filial atualizada com sucesso!' });
                    await loadBranches();
                } else {
                    throw new Error(response.error || 'Erro ao atualizar filial');
                }
            } else {
                // Adicionar nova filial
                const response = await api.createLocation(branchData);
                if (response.success) {
                    setMessage({ type: 'success', text: 'Filial cadastrada com sucesso!' });
                    await loadBranches();
                } else {
                    throw new Error(response.error || 'Erro ao cadastrar filial');
                }
            }

            setIsBranchModalOpen(false);
            setEditingBranch(null);
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('Erro ao salvar filial:', error);
            setMessage({
                type: 'error',
                text: error.message || 'Erro ao salvar filial. Tente novamente.'
            });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setBranchLoading(false);
        }
    };

    const handleDeleteBranch = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta filial?')) {
            try {
                const response = await api.deleteLocation(parseInt(id));
                if (response.success) {
                    await loadBranches();
                    setMessage({ type: 'success', text: 'Filial excluída com sucesso!' });
                    setTimeout(() => setMessage(null), 3000);
                } else {
                    throw new Error(response.error || 'Erro ao excluir filial');
                }
            } catch (error: any) {
                setMessage({ type: 'error', text: error.message || 'Erro ao excluir filial' });
                setTimeout(() => setMessage(null), 5000);
            }
        }
    };

    const handleToggleBranchStatus = async (id: string) => {
        try {
            const response = await api.toggleLocationStatus(parseInt(id));
            if (response.success) {
                await loadBranches();
                setMessage({ type: 'success', text: 'Status da filial atualizado com sucesso!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                throw new Error(response.error || 'Erro ao alterar status');
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao alterar status da filial' });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>

            {message && (
                <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    <div className="flex items-center gap-2">
                        <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{message.text}</span>
                    </div>
                </div>
            )}

            <div>
                <Tabs tabs={TABS} activeTab={activeTab} onTabClick={setActiveTab} />
                <div className="mt-6">
                    {activeTab === 'Usuários & Permissões' && (
                        loadingUsers ? (
                            <div className="bg-white p-12 rounded-lg shadow-sm flex items-center justify-center">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Carregando usuários...</p>
                                </div>
                            </div>
                        ) : (
                            <UsersTab
                                users={users}
                                onAddUser={() => setIsModalOpen(true)}
                                onRefresh={loadUsers}
                                onEditUser={handleEditUser}
                                onToggleUserStatus={handleToggleUserStatus}
                                onDeleteUser={handleDeleteUser}
                            />
                        )
                    )}
                    {activeTab === 'Empresa' && (
                        <CompanyTab
                            companyInfo={companyInfo}
                            onUpdate={handleUpdateCompany}
                            branches={branches}
                            onAddBranch={handleAddBranch}
                            onEditBranch={handleEditBranch}
                            onDeleteBranch={handleDeleteBranch}
                            onToggleBranchStatus={handleToggleBranchStatus}
                        />
                    )}
                    {activeTab === 'Segurança' && <SecurityTab />}
                </div>
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddUser}
                loading={loading}
            />

            {/* Modal de Edição de Usuário */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-800">Editar Usuário</h3>
                            <button
                                onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleUpdateUser({
                                name: formData.get('name') as string,
                                email: formData.get('email') as string,
                                role: formData.get('role') as UserRole
                            });
                        }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    name="name"
                                    defaultValue={editingUser.name}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={editingUser.email}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso *</label>
                                <select
                                    name="role"
                                    defaultValue={editingUser.role}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Vendedor">Vendedor</option>
                                    <option value="Gerente">Gerente</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                    disabled={loading}
                                >
                                    {loading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <BranchModal
                isOpen={isBranchModalOpen}
                onClose={() => {
                    setIsBranchModalOpen(false);
                    setEditingBranch(null);
                }}
                onSubmit={handleSubmitBranch}
                loading={branchLoading}
                editingBranch={editingBranch}
            />
        </div>
    );
};

export default Configuracoes;
