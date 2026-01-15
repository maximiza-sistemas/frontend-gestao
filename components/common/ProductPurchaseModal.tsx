import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Toast from './Toast';

interface ProductPurchase {
    id: number;
    product_id: number;
    location_id?: number | null;
    location_name?: string;
    unit_price: number;
    quantity: number;
    total_amount: number;
    purchase_date: string;
    is_installment: boolean;
    installment_count: number;
    notes?: string;
    paid_amount?: number;
    pending_amount?: number;
}

interface PurchaseInstallment {
    id: number;
    purchase_id: number;
    installment_number: number;
    due_date: string;
    amount: number;
    paid_amount: number;
    paid_date?: string;
    status: 'Pendente' | 'Pago' | 'Vencido';
}

interface ProductPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: { id: number; name: string } | null;
}

interface Location {
    id: number;
    name: string;
    status?: string;
}

const ProductPurchaseModal: React.FC<ProductPurchaseModalProps> = ({ isOpen, onClose, product }) => {
    const [purchases, setPurchases] = useState<ProductPurchase[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

    // Form state
    const [formData, setFormData] = useState({
        unit_price: '',
        quantity: '1',
        purchase_date: new Date().toISOString().split('T')[0],
        is_term: false, // A prazo
        payment_date: '', // Data que o pagamento foi realizado (para compras a prazo)
        location_id: '', // Empresa que realizou a compra
        notes: ''
    });

    // Installments state
    const [selectedPurchase, setSelectedPurchase] = useState<ProductPurchase | null>(null);
    const [installments, setInstallments] = useState<PurchaseInstallment[]>([]);
    const [showInstallments, setShowInstallments] = useState(false);

    // Payment form state
    const [paymentForm, setPaymentForm] = useState({
        installmentId: 0,
        paid_amount: '',
        paid_date: new Date().toISOString().split('T')[0]
    });
    const [showPaymentForm, setShowPaymentForm] = useState(false);

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
            fetchPurchases();
            fetchLocations();
        }
    }, [isOpen, product]);

    const fetchLocations = async () => {
        try {
            const response = await api.getLocations();
            if (response.success && Array.isArray(response.data)) {
                setLocations(response.data.filter((loc: Location) => loc.status === 'Ativo'));
            }
        } catch (error) {
            console.error('Erro ao buscar empresas:', error);
        }
    };

    const fetchPurchases = async () => {
        if (!product) return;
        try {
            setLoading(true);
            const response = await api.getProductPurchases(product.id);
            if (response.success && Array.isArray(response.data)) {
                setPurchases(response.data);
            } else {
                setPurchases([]);
            }
        } catch (error) {
            console.error('Erro ao buscar compras:', error);
            showMessage('Erro ao carregar compras', 'error');
            setPurchases([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || submitting) return;

        setSubmitting(true);
        try {
            const response = await api.createProductPurchase(product.id, {
                unit_price: Number(formData.unit_price),
                quantity: Number(formData.quantity),
                purchase_date: formData.purchase_date,
                is_term: formData.is_term,
                payment_date: formData.is_term && formData.payment_date ? formData.payment_date : undefined,
                location_id: formData.location_id ? Number(formData.location_id) : undefined,
                notes: formData.notes || undefined
            });

            if (response.success) {
                showMessage('Compra registrada com sucesso', 'success');
                setFormData({
                    unit_price: '',
                    quantity: '1',
                    purchase_date: new Date().toISOString().split('T')[0],
                    is_term: false,
                    payment_date: '',
                    location_id: '',
                    notes: ''
                });
                fetchPurchases();
                setActiveTab('history');
            } else {
                showMessage(response.error || 'Erro ao registrar compra', 'error');
            }
        } catch (error) {
            console.error('Erro ao registrar compra:', error);
            showMessage('Erro ao registrar compra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewInstallments = async (purchase: ProductPurchase) => {
        if (!product) return;
        try {
            const response = await api.getProductPurchaseInstallments(product.id, purchase.id);
            if (response.success && Array.isArray(response.data)) {
                setInstallments(response.data);
                setSelectedPurchase(purchase);
                setShowInstallments(true);
            }
        } catch (error) {
            console.error('Erro ao buscar parcelas:', error);
            showMessage('Erro ao carregar parcelas', 'error');
        }
    };

    const handlePayInstallment = (installment: PurchaseInstallment) => {
        setPaymentForm({
            installmentId: installment.id,
            paid_amount: installment.amount.toString(),
            paid_date: new Date().toISOString().split('T')[0]
        });
        setShowPaymentForm(true);
    };

    const handleSubmitPayment = async () => {
        if (!product || !selectedPurchase) return;
        try {
            const response = await api.updatePurchaseInstallment(
                product.id,
                selectedPurchase.id,
                paymentForm.installmentId,
                {
                    paid_amount: Number(paymentForm.paid_amount),
                    paid_date: paymentForm.paid_date
                }
            );

            if (response.success) {
                showMessage('Pagamento registrado', 'success');
                setShowPaymentForm(false);
                handleViewInstallments(selectedPurchase);
                fetchPurchases();
            } else {
                showMessage(response.error || 'Erro ao registrar pagamento', 'error');
            }
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            showMessage('Erro ao registrar pagamento', 'error');
        }
    };

    const handleDelete = async (purchaseId: number) => {
        if (!product || !confirm('Tem certeza que deseja excluir esta compra?')) return;

        try {
            const response = await api.deleteProductPurchase(product.id, purchaseId);
            if (response.success) {
                showMessage('Compra excluída', 'success');
                fetchPurchases();
            } else {
                showMessage(response.error || 'Erro ao excluir compra', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir compra:', error);
            showMessage('Erro ao excluir compra', 'error');
        }
    };

    const calculatedTotal = Number(formData.unit_price || 0) * Number(formData.quantity || 0);

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
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Compras - {product?.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <i className="fa-solid fa-times text-xl"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b mb-4">
                    <button
                        className={`px-4 py-2 font-medium ${activeTab === 'form' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('form')}
                    >
                        <i className="fa-solid fa-plus mr-2"></i>Nova Compra
                    </button>
                    <button
                        className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <i className="fa-solid fa-history mr-2"></i>Histórico ({purchases.length})
                    </button>
                </div>

                {/* Form Tab */}
                {activeTab === 'form' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Unitário (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full border rounded p-2"
                                    placeholder="0,00"
                                    value={formData.unit_price}
                                    onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full border rounded p-2"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Valor Total:</span>
                                <span className="text-2xl font-bold text-green-600">
                                    R$ {calculatedTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Compra</label>
                                <input
                                    type="date"
                                    className="w-full border rounded p-2"
                                    value={formData.purchase_date}
                                    onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                                <select
                                    required
                                    className="w-full border rounded p-2"
                                    value={formData.location_id}
                                    onChange={e => setFormData({ ...formData, location_id: e.target.value })}
                                >
                                    <option value="">Selecione a empresa...</option>
                                    {locations.map(location => (
                                        <option key={location.id} value={location.id}>
                                            {location.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_term}
                                    onChange={e => setFormData({ ...formData, is_term: e.target.checked, payment_date: e.target.checked ? '' : '' })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">A Prazo</span>
                            </label>
                        </div>

                        {formData.is_term && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
                                <input
                                    type="date"
                                    className="w-full border rounded p-2"
                                    value={formData.payment_date}
                                    onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.payment_date ? 'Pagamento já realizado' : 'Deixe em branco se ainda não foi pago'}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                            <textarea
                                className="w-full border rounded p-2"
                                rows={2}
                                placeholder="Observações sobre a compra..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full px-4 py-2 rounded flex items-center justify-center ${submitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                } text-white`}
                        >
                            {submitting ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-check mr-2"></i>
                                    Registrar Compra
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="text-center py-8">
                                <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i>
                            </div>
                        ) : purchases.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Nenhuma compra registrada
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Unit.</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {purchases.map((purchase) => (
                                        <tr key={purchase.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                {new Date(purchase.purchase_date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                {purchase.location_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                                R$ {purchase.unit_price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                {purchase.quantity}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                                                R$ {purchase.total_amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                {(purchase as any).is_term ? (
                                                    (purchase as any).payment_date ? (
                                                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                            Pago em {new Date((purchase as any).payment_date).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                                            A Prazo - Pendente
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                        À Vista
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleDelete(purchase.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Excluir"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Installments Modal */}
                {showInstallments && selectedPurchase && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">
                                    Parcelas - Compra de {new Date(selectedPurchase.purchase_date).toLocaleDateString('pt-BR')}
                                </h3>
                                <button onClick={() => setShowInstallments(false)} className="text-gray-500 hover:text-gray-700">
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>

                            <table className="min-w-full divide-y divide-gray-200 mb-4">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Parcela</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Vencimento</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {installments.map((inst) => (
                                        <tr key={inst.id}>
                                            <td className="px-3 py-2 text-sm">{inst.installment_number}/{selectedPurchase.installment_count}</td>
                                            <td className="px-3 py-2 text-sm">{new Date(inst.due_date).toLocaleDateString('pt-BR')}</td>
                                            <td className="px-3 py-2 text-sm text-right">R$ {inst.amount.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-1 text-xs rounded-full ${inst.status === 'Pago' ? 'bg-green-100 text-green-800' :
                                                    inst.status === 'Vencido' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {inst.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {inst.status !== 'Pago' && (
                                                    <button
                                                        onClick={() => handlePayInstallment(inst)}
                                                        className="text-green-600 hover:text-green-800 text-sm"
                                                    >
                                                        <i className="fa-solid fa-check mr-1"></i>Pagar
                                                    </button>
                                                )}
                                                {inst.status === 'Pago' && inst.paid_date && (
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(inst.paid_date).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Payment Form Modal */}
                {showPaymentForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
                        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                            <h3 className="text-lg font-bold mb-4">Registrar Pagamento</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Pago (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full border rounded p-2"
                                        value={paymentForm.paid_amount}
                                        onChange={e => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded p-2"
                                        value={paymentForm.paid_date}
                                        onChange={e => setPaymentForm({ ...paymentForm, paid_date: e.target.value })}
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowPaymentForm(false)}
                                        className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSubmitPayment}
                                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductPurchaseModal;
