import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Toast from './Toast';

interface ProductCost {
    id: number;
    product_id: number;
    supplier_id: number;
    cost_price: string;
    is_default: boolean;
    supplier_name: string;
    valid_from?: string;
}

interface ProductCostModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: { id: number; name: string } | null;
}

const ProductCostModal: React.FC<ProductCostModalProps> = ({ isOpen, onClose, product }) => {
    const [costs, setCosts] = useState<ProductCost[]>([]);
    const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        supplier_id: '',
        cost_price: '',
        is_default: false
    });

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    useEffect(() => {
        if (isOpen && product) {
            fetchCosts();
            fetchSuppliers();
        }
    }, [isOpen, product]);

    const fetchCosts = async () => {
        if (!product) return;
        try {
            setLoading(true);
            const response = await api.getProductCosts(product.id);
            if (response.success && Array.isArray(response.data)) {
                setCosts(response.data);
            } else {
                setCosts([]);
            }
        } catch (error) {
            console.error('Erro ao buscar custos:', error);
            showMessage('Erro ao carregar custos', 'error');
            setCosts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await api.getSuppliers();
            if (response.success && Array.isArray(response.data)) {
                setSuppliers(response.data);
            } else {
                setSuppliers([]);
            }
        } catch (error) {
            console.error('Erro ao buscar fornecedores:', error);
            setSuppliers([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        try {
            await api.saveProductCost(product.id, {
                supplier_id: Number(formData.supplier_id),
                cost_price: Number(formData.cost_price),
                is_default: formData.is_default
            });
            showMessage('Custo salvo com sucesso', 'success');
            setFormData({ supplier_id: '', cost_price: '', is_default: false });
            fetchCosts();
        } catch (error) {
            console.error('Erro ao salvar custo:', error);
            showMessage('Erro ao salvar custo', 'error');
        }
    };

    const handleDelete = async (supplierId: number) => {
        if (!product || !confirm('Tem certeza que deseja remover este custo?')) return;

        try {
            await api.deleteProductCost(product.id, supplierId);
            showMessage('Custo removido', 'success');
            fetchCosts();
        } catch (error) {
            console.error('Erro ao remover custo:', error);
            showMessage('Erro ao remover custo', 'error');
        }
    };

    const handleSetDefault = async (cost: ProductCost) => {
        if (!product) return;
        try {
            await api.saveProductCost(product.id, {
                supplier_id: cost.supplier_id,
                cost_price: Number(cost.cost_price),
                is_default: true
            });
            showMessage('Definido como padrão', 'success');
            fetchCosts();
        } catch (error) {
            console.error('Erro ao definir padrão:', error);
            showMessage('Erro ao definir padrão', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {showToast && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setShowToast(false)}
                />
            )}
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Gerenciar Custos - {product?.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <i className="fa-solid fa-times text-xl"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                            <select
                                required
                                className="w-full border rounded p-2"
                                value={formData.supplier_id}
                                onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                            >
                                <option value="">Selecione...</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Custo (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full border rounded p-2"
                                value={formData.cost_price}
                                onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center space-x-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_default}
                                    onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Custo Padrão</span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
                    >
                        <i className="fa-solid fa-plus mr-2"></i>
                        Adicionar Custo
                    </button>
                </form>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Válido Desde</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-4">Carregando...</td></tr>
                            ) : costs.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhum custo registrado</td></tr>
                            ) : (
                                costs.map((cost) => (
                                    <tr key={`${cost.id}-${cost.valid_from}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cost.supplier_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            R$ {Number(cost.cost_price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {cost.valid_from ? new Date(cost.valid_from).toLocaleDateString() + ' ' + new Date(cost.valid_from).toLocaleTimeString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {cost.is_default && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Padrão
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {!cost.is_default && (
                                                <button
                                                    onClick={() => handleSetDefault(cost)}
                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                    title="Definir como padrão"
                                                >
                                                    <i className="fa-solid fa-check"></i>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(cost.supplier_id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Remover"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductCostModal;
