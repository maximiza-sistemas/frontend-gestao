import React, { useState, useMemo, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { OrderStatus } from '../../types';
import { Order, useOrders } from '../../hooks/useOrders';
import { api } from '../../services/api';
import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Toast from '../common/Toast';
import OrderFormSimplified from '../common/OrderFormSimplified';

const getOrderStatusVariant = (status: OrderStatus) => {
    const map = {
        'Entregue': 'success',
        'Em Rota': 'info',
        'Pendente': 'warning',
        'Cancelado': 'danger'
    };
    return map[status] as 'success' | 'info' | 'warning' | 'danger';
};

// Helper para formatar datas de string YYYY-MM-DD para DD/MM/YYYY (evita problemas de timezone)
const formatDisplayDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    // Se já estiver no formato ISO completo, pegar só a parte da data
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
};

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (paymentData: { amount: number; payment_method: string; notes?: string; payment_date?: string; receipt?: File }) => void;
    order: any;
    onDiscountUpdate?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSave, order, onDiscountUpdate }) => {
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão' | 'Transferência' | 'Depósito'>('Dinheiro');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [discount, setDiscount] = useState<string>('0');
    const [editingDiscount, setEditingDiscount] = useState(false);
    const [savingDiscount, setSavingDiscount] = useState(false);
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedBank, setSelectedBank] = useState<string>('');
    const [paymentTime, setPaymentTime] = useState<string>('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    // Lista de bancos disponíveis
    const BANKS = ['Nubank', 'Inter', 'Bradesco', 'Itaú', 'Caixa', 'Santander', 'Banco do Brasil', 'C6 Bank', 'PagBank', 'Sicoob', 'Outro'];

    // Estado para armazenar os dados atualizados do pedido
    const [savedDiscount, setSavedDiscount] = useState<number | null>(null);
    const [savedPendingAmount, setSavedPendingAmount] = useState<number | null>(null);

    // Buscar histórico de pagamentos ao abrir o modal
    useEffect(() => {
        const fetchPaymentHistory = async () => {
            if (isOpen && order?.id) {
                setLoadingHistory(true);
                try {
                    const response = await api.getOrderPayments(order.id);
                    if (response.success) {
                        setPaymentHistory(response.data || []);
                    } else {
                        console.error('Erro ao buscar pagamentos:', response.error);
                    }
                } catch (error) {
                    console.error('Erro ao buscar histórico de pagamentos:', error);
                } finally {
                    setLoadingHistory(false);
                }
            }
        };
        fetchPaymentHistory();
    }, [isOpen, order?.id]);

    const orderTotal = Number(order?.totalValue ?? order?.total_value ?? 0);
    // Usar o desconto salvo localmente se disponível, senão usar o do order
    const currentDiscount = savedDiscount !== null ? savedDiscount : Number(order?.discount ?? 0);
    // Quando editando, mostrar preview do desconto; senão usar o desconto atual salvo
    const displayDiscount = editingDiscount ? (parseFloat(discount) || 0) : currentDiscount;
    const totalWithDiscount = orderTotal - displayDiscount;
    const paidAmount = Number(order?.paid_amount ?? 0);
    // Usar o pending_amount salvo localmente se disponível, senão calcular
    const pendingAmount = savedPendingAmount !== null
        ? savedPendingAmount
        : Math.max(0, totalWithDiscount - paidAmount);

    useEffect(() => {
        if (isOpen) {
            // Resetar os estados salvos quando o modal abre
            setSavedDiscount(null);
            setSavedPendingAmount(null);
            const initialDiscount = Number(order?.discount ?? 0);
            setDiscount(initialDiscount.toFixed(2));
            setEditingDiscount(false);
            const initialPending = Math.max(0, orderTotal - initialDiscount - paidAmount);
            if (initialPending > 0) {
                setAmount(initialPending.toFixed(2));
            }
            setPaymentMethod('Dinheiro');
            setSelectedBank('');
            setPaymentTime(''); // Hora deve ser inserida manualmente
            setReceiptFile(null);
            setNotes('');
        }
    }, [isOpen, order?.id]);

    // Atualizar o amount quando o pendingAmount muda
    useEffect(() => {
        if (isOpen && pendingAmount > 0 && !editingDiscount) {
            setAmount(pendingAmount.toFixed(2));
        }
    }, [pendingAmount, isOpen, editingDiscount]);

    if (!isOpen || !order) return null;

    const handleSaveDiscount = async () => {
        const numDiscount = parseFloat(discount);
        if (isNaN(numDiscount) || numDiscount < 0) {
            alert('Digite um valor de desconto válido');
            return;
        }
        if (numDiscount > orderTotal) {
            alert(`O desconto não pode ser maior que o valor total (R$ ${orderTotal.toFixed(2)})`);
            return;
        }

        setSavingDiscount(true);
        try {
            const response = await api.updateOrderDiscount(order.id, numDiscount);
            if (response.success && response.data) {
                // Atualizar os estados locais com os dados retornados da API
                const data = response.data as { discount: string | number; pending_amount: string | number };
                const newDiscount = parseFloat(String(data.discount));
                const newPendingAmount = parseFloat(String(data.pending_amount));

                // Usar flushSync para forçar atualização imediata do DOM
                flushSync(() => {
                    setEditingDiscount(false);
                    setSavedDiscount(newDiscount);
                    setSavedPendingAmount(newPendingAmount);
                    setDiscount(newDiscount.toFixed(2));
                    setAmount(newPendingAmount.toFixed(2));
                });

                if (onDiscountUpdate) {
                    onDiscountUpdate();
                }
            } else {
                alert(response.error || 'Erro ao salvar desconto');
            }
        } catch (error) {
            alert('Erro ao salvar desconto');
        } finally {
            setSavingDiscount(false);
        }
    };

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Informe um valor válido');
            return;
        }
        if (numAmount > pendingAmount) {
            alert(`Valor máximo: R$ ${pendingAmount.toFixed(2)}`);
            return;
        }

        // Validar banco para métodos que exigem
        const requiresBank = ['Pix', 'Transferência', 'Depósito'].includes(paymentMethod);
        if (requiresBank && !selectedBank) {
            alert('Selecione o banco para este método de pagamento!');
            return;
        }

        setLoading(true);
        try {
            // Incluir banco e hora nas notas para pagamentos eletrônicos
            let paymentNotes = notes;
            const requiresBankInfo = ['Pix', 'Transferência', 'Depósito'].includes(paymentMethod);
            if (requiresBankInfo && selectedBank) {
                const timeInfo = paymentTime ? ` às ${paymentTime}` : '';
                paymentNotes = `[${selectedBank}${timeInfo}] ${notes}`.trim();
            }
            await onSave({ amount: numAmount, payment_method: paymentMethod, notes: paymentNotes, payment_date: paymentDate, receipt: receiptFile || undefined });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[500px] shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-2 text-gray-800">
                    <i className="fa-solid fa-money-bill-wave text-green-600 mr-2"></i>
                    Registrar Pagamento
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    Pedido #{order.id} - <strong>{order.clientName}</strong>
                </p>

                {/* Resumo */}
                <div className="bg-gray-50 p-3 rounded-md mb-4 grid grid-cols-3 gap-2 text-sm">
                    <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-bold">
                            {currentDiscount > 0 ? (
                                <>
                                    <span className="line-through text-gray-400 text-xs mr-1">
                                        {orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <span className="text-blue-600">
                                        {totalWithDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </>
                            ) : (
                                orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500">Já Pago</p>
                        <p className="font-bold text-green-600">{paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Pendente</p>
                        <p className="font-bold text-red-600">{pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>

                {/* Desconto */}
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-md mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-orange-800">
                            <i className="fa-solid fa-percent mr-2"></i>Desconto
                        </label>
                        {!editingDiscount && (
                            <button
                                type="button"
                                onClick={() => setEditingDiscount(true)}
                                className="text-xs text-orange-600 hover:text-orange-800 underline"
                            >
                                <i className="fa-solid fa-edit mr-1"></i>Editar
                            </button>
                        )}
                    </div>

                    {editingDiscount ? (
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={orderTotal}
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="w-full border border-orange-300 rounded-md p-2 pl-10 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSaveDiscount}
                                disabled={savingDiscount}
                                className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
                            >
                                {savingDiscount ? <i className="fa-solid fa-spinner fa-spin"></i> : '✓ Salvar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDiscount(currentDiscount.toFixed(2));
                                    setEditingDiscount(false);
                                }}
                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-orange-700">
                                {currentDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            {currentDiscount > 0 && (
                                <span className="text-xs text-gray-500">
                                    Total c/ desconto: {totalWithDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Formulário */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Pagamento (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={pendingAmount}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="0.00"
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setAmount((pendingAmount / 2).toFixed(2))}
                                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmount(pendingAmount.toFixed(2))}
                                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                Total
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['Dinheiro', 'Pix', 'Cartão', 'Transferência', 'Depósito'] as const).map((method) => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => {
                                        setPaymentMethod(method);
                                        // Limpar banco se mudou para método que não precisa
                                        if (!['Pix', 'Transferência', 'Depósito'].includes(method)) {
                                            setSelectedBank('');
                                        }
                                    }}
                                    className={`p-2 border rounded-md text-sm font-medium transition-colors ${paymentMethod === method
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {method === 'Dinheiro' && '💵'}
                                    {method === 'Pix' && '📱'}
                                    {method === 'Cartão' && '💳'}
                                    {method === 'Transferência' && '🏦'}
                                    {method === 'Depósito' && '💰'}
                                    {' '}{method}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Seleção de Banco e Hora para Pix, Transferência e Depósito */}
                    {['Pix', 'Transferência', 'Depósito'].includes(paymentMethod) && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <i className="fa-solid fa-building-columns mr-1"></i>Banco *
                                    </label>
                                    <select
                                        value={selectedBank}
                                        onChange={(e) => setSelectedBank(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                                        required
                                    >
                                        <option value="">Selecione o banco...</option>
                                        {BANKS.map((bank) => (
                                            <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <i className="fa-solid fa-clock mr-1"></i>Hora
                                    </label>
                                    <input
                                        type="time"
                                        value={paymentTime}
                                        onChange={(e) => setPaymentTime(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                            </div>

                        </>
                    )}

                    {/* Upload de Comprovante - disponível para todos os métodos */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <i className="fa-solid fa-file-image mr-1"></i>Comprovante (opcional)
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        />
                        {receiptFile && (
                            <p className="text-xs text-green-600 mt-1">
                                <i className="fa-solid fa-check mr-1"></i>
                                {receiptFile.name}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG ou PDF até 5MB</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
                        <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Ex: Parcela 1 de 3..."
                        />
                    </div>

                    {/* Histórico de Pagamentos */}
                    {paymentHistory.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">
                                <i className="fa-solid fa-history mr-2"></i>
                                Histórico de Pagamentos ({paymentHistory.length})
                            </h4>
                            <div className="max-h-40 overflow-y-auto">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-blue-100">
                                        <tr>
                                            <th className="px-2 py-1 text-left">Data</th>
                                            <th className="px-2 py-1 text-right">Valor</th>
                                            <th className="px-2 py-1 text-left">Método</th>
                                            <th className="px-2 py-1 text-center">Comprov.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentHistory.map((payment, index) => (
                                            <tr key={payment.id || index} className="border-b border-blue-100">
                                                <td className="px-2 py-1">
                                                    {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-2 py-1 text-right font-medium text-green-700">
                                                    {Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="px-2 py-1">{payment.payment_method}</td>
                                                <td className="px-2 py-1 text-center">
                                                    {payment.receipt_file ? (
                                                        <a
                                                            href={api.getPaymentReceiptUrl(order.id, payment.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Ver comprovante"
                                                        >
                                                            <i className="fa-solid fa-file-image"></i>
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {loadingHistory && (
                        <div className="text-center text-gray-500 text-sm">
                            <i className="fa-solid fa-spinner fa-spin mr-2"></i>Carregando histórico...
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || pendingAmount <= 0}
                        className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Salvando...</>
                        ) : (
                            <>💰 Confirmar Pagamento</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente para exibir detalhes do pedido com histórico de pagamentos
interface OrderDetailsContentProps {
    order: Order;
    onClose: () => void;
}

const OrderDetailsContent: React.FC<OrderDetailsContentProps> = ({ order, onClose }) => {
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        const fetchPaymentHistory = async () => {
            try {
                const response = await api.getOrderPayments(order.id);
                if (response.success) {
                    setPaymentHistory(response.data || []);
                }
            } catch (error) {
                console.error('Erro ao buscar histórico de pagamentos:', error);
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchPaymentHistory();
    }, [order.id]);

    const orderTotal = Number(order.totalValue ?? order.total_value ?? 0);
    const discount = Number(order.discount ?? 0);
    const totalWithDiscount = orderTotal - discount;
    const paidAmount = Number(order.paid_amount ?? 0);
    const pendingAmount = Math.max(0, totalWithDiscount - paidAmount);

    return (
        <div className="space-y-4">
            {/* Informações básicas do pedido */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="text-lg font-semibold">{order.clientName}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Data do Pedido</p>
                    <p className="text-lg">{new Date(order.date).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            {/* Resumo financeiro */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    <i className="fa-solid fa-receipt mr-2"></i>Resumo Financeiro
                </h4>
                <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-bold text-lg">{orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Desconto</p>
                        <p className="font-bold text-orange-600">{discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Pago</p>
                        <p className="font-bold text-green-600">{paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Pendente</p>
                        <p className={`font-bold ${pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Status do pedido */}
            <div className="flex items-center gap-4">
                <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <Badge variant={getOrderStatusVariant(order.status)}>{order.status}</Badge>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Pagamento</p>
                    <Badge variant={pendingAmount === 0 ? 'success' : 'warning'}>
                        {pendingAmount === 0 ? 'Pago' : 'Pendente'}
                    </Badge>
                </div>
            </div>

            {/* Histórico de Pagamentos */}
            <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    <i className="fa-solid fa-history mr-2"></i>
                    Histórico de Pagamentos ({paymentHistory.length})
                </h4>

                {loadingHistory ? (
                    <div className="text-center py-4 text-gray-500">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        Carregando histórico...
                    </div>
                ) : paymentHistory.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                        <i className="fa-solid fa-info-circle mr-2"></i>
                        Nenhum pagamento registrado
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">Data</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-700">Valor</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">Método</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">Observações</th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">Comprovante</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paymentHistory.map((payment, index) => (
                                    <tr key={payment.id || index} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Reg: {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-green-700">
                                            {Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100">
                                                {payment.payment_method === 'Dinheiro' && '💵'}
                                                {payment.payment_method === 'Pix' && '📱'}
                                                {payment.payment_method === 'Cartão' && '💳'}
                                                {payment.payment_method === 'Transferência' && '🏦'}
                                                {payment.payment_method === 'Depósito' && '💰'}
                                                {' '}{payment.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={payment.notes || ''}>
                                            {payment.notes || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {payment.receipt_file ? (
                                                <a
                                                    href={api.getPaymentReceiptUrl(order.id, payment.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 rounded hover:bg-blue-100"
                                                    title="Ver comprovante"
                                                >
                                                    <i className="fa-solid fa-file-image mr-1"></i>
                                                    Ver
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td className="px-3 py-2 font-semibold">Total Pago</td>
                                    <td className="px-3 py-2 text-right font-bold text-green-700">
                                        {paymentHistory.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end">
                <Button variant="secondary" onClick={onClose}>Fechar</Button>
            </div>
        </div>
    );
};

interface OrderStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (status: string) => void;
    currentStatus: string;
    orderId: number;
}

const OrderStatusModal: React.FC<OrderStatusModalProps> = ({ isOpen, onClose, onSave, currentStatus, orderId }) => {
    const [status, setStatus] = useState(currentStatus);

    useEffect(() => {
        setStatus(currentStatus);
    }, [currentStatus]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Alterar Status do Pedido</h3>
                <p className="text-sm text-gray-600 mb-4">Pedido #{orderId}</p>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Entregue">Entregue</option>
                    </select>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(status)}
                        className="px-4 py-2 text-white bg-orange-600 rounded-md hover:bg-orange-700"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

const OrderForm: React.FC<{
    onSave: (order: any) => void;
    onClose: () => void;
    orderToEdit: Order | null;
}> = ({ onSave, onClose, orderToEdit }) => {
    const isEditing = !!orderToEdit;
    const [clients, setClients] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Form State
    const [clientId, setClientId] = useState(orderToEdit?.clientId || '');
    const [date, setDate] = useState(orderToEdit?.date || new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<OrderStatus>(orderToEdit?.status || 'Pendente');
    const [paymentStatus, setPaymentStatus] = useState<'Pendente' | 'Pago'>(orderToEdit?.paymentStatus || 'Pendente');
    const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Prazo' | 'Misto'>(orderToEdit?.paymentMethod || 'Dinheiro');
    const [cashAmount, setCashAmount] = useState(orderToEdit?.cashAmount || 0);
    const [termAmount, setTermAmount] = useState(orderToEdit?.termAmount || 0);
    const [installments, setInstallments] = useState(orderToEdit?.installments || 1);
    const [dueDate, setDueDate] = useState(orderToEdit?.dueDate || '');
    const [notes, setNotes] = useState(orderToEdit?.notes || '');

    // Items State
    const [selectedItems, setSelectedItems] = useState<{ product_id: number, quantity: number, unit_price: number, name: string, supplier_id?: number, supplier_name?: string, cost_price?: number }[]>([]);
    const [currentProduct, setCurrentProduct] = useState('');
    const [currentQuantity, setCurrentQuantity] = useState(1);
    const [currentSupplier, setCurrentSupplier] = useState('');
    const [productSuppliers, setProductSuppliers] = useState<{ supplier_id: number, supplier_name: string, cost_price: number, is_default: boolean }[]>([]);
    const [estimatedMargin, setEstimatedMargin] = useState<number | null>(null);

    // Derived State
    const totalValue = useMemo(() => {
        return selectedItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    }, [selectedItems]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientsRes, productsRes] = await Promise.all([
                    api.getClients({ status: 'Ativo', limit: 200 }),
                    api.getProducts({ status: 'Ativo' })
                ]);

                if (clientsRes.success) setClients(clientsRes.data || []);
                if (productsRes.success) setProducts(productsRes.data || []);
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            }
        };
        fetchData();
    }, []);

    // Fetch suppliers when product changes
    useEffect(() => {
        if (currentProduct) {
            const fetchProductCosts = async () => {
                try {
                    const response = await api.getProductCosts(Number(currentProduct));
                    if (response.success && Array.isArray(response.data)) {
                        const costs = response.data;
                        setProductSuppliers(costs.map((c: any) => ({
                            supplier_id: c.supplier_id,
                            supplier_name: c.supplier_name,
                            cost_price: Number(c.cost_price),
                            is_default: c.is_default
                        })));

                        // Auto-select default supplier
                        const defaultSupplier = costs.find((c: any) => c.is_default);
                        if (defaultSupplier) {
                            setCurrentSupplier(defaultSupplier.supplier_id.toString());
                        } else {
                            setCurrentSupplier('');
                        }
                    } else {
                        setProductSuppliers([]);
                        setCurrentSupplier('');
                    }
                } catch (error) {
                    console.error('Erro ao buscar fornecedores do produto:', error);
                    setProductSuppliers([]);
                }
            };
            fetchProductCosts();
        } else {
            setProductSuppliers([]);
            setCurrentSupplier('');
        }
    }, [currentProduct]);

    // Calculate estimated margin
    useEffect(() => {
        if (currentProduct) {
            const product = products.find(p => p.id.toString() === currentProduct);
            if (product) {
                const priceSell = Number(product.price_sell);
                let costPrice = Number(product.price_buy); // Fallback

                if (currentSupplier) {
                    const supplier = productSuppliers.find(s => s.supplier_id.toString() === currentSupplier);
                    if (supplier) {
                        costPrice = supplier.cost_price;
                    }
                } else if (productSuppliers.length > 0) {
                    // If no supplier selected but defaults exist, maybe use default? 
                    // Logic here: if user explicitly selects nothing, use product base cost.
                    // But we auto-select default above.
                }

                if (priceSell > 0) {
                    const margin = ((priceSell - costPrice) / priceSell) * 100;
                    setEstimatedMargin(margin);
                } else {
                    setEstimatedMargin(null);
                }
            }
        } else {
            setEstimatedMargin(null);
        }
    }, [currentProduct, currentSupplier, products, productSuppliers]);


    // Update cash/term amounts when total changes or method changes
    useEffect(() => {
        if (paymentMethod === 'Dinheiro' || paymentMethod === 'Pix') {
            setCashAmount(totalValue);
            setTermAmount(0);
        } else if (paymentMethod === 'Prazo') {
            setCashAmount(0);
            setTermAmount(totalValue);
        }
    }, [totalValue, paymentMethod]);

    const handleAddItem = () => {
        if (!currentProduct) return;
        const product = products.find(p => p.id.toString() === currentProduct);
        if (!product) return;

        let supplierName = undefined;
        let costPrice = undefined;

        if (currentSupplier) {
            const supplier = productSuppliers.find(s => s.supplier_id.toString() === currentSupplier);
            if (supplier) {
                supplierName = supplier.supplier_name;
                costPrice = supplier.cost_price;
            }
        }

        const newItem = {
            product_id: product.id,
            quantity: currentQuantity,
            unit_price: Number(product.price_sell),
            name: product.name,
            supplier_id: currentSupplier ? Number(currentSupplier) : undefined,
            supplier_name: supplierName,
            cost_price: costPrice
        };

        setSelectedItems([...selectedItems, newItem]);
        setCurrentProduct('');
        setCurrentQuantity(1);
        setCurrentSupplier('');
        setEstimatedMargin(null);
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!clientId) {
            alert('Selecione um cliente!');
            return;
        }

        if (selectedItems.length === 0) {
            alert('Adicione pelo menos um produto ao pedido!');
            return;
        }

        // Validações de pagamento
        if (paymentMethod === 'Misto') {
            if (Math.abs((cashAmount + termAmount) - totalValue) > 0.01) {
                alert('A soma dos valores à vista e a prazo deve ser igual ao valor total!');
                return;
            }
        }

        if ((paymentMethod === 'Prazo' || paymentMethod === 'Misto') && !dueDate) {
            alert('Data de vencimento é obrigatória para pagamentos a prazo!');
            return;
        }

        onSave({
            client_id: Number(clientId),
            order_date: date,
            status,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            payment_cash_amount: paymentMethod === 'Dinheiro' || paymentMethod === 'Pix' ? totalValue : cashAmount,
            payment_term_amount: paymentMethod === 'Prazo' ? totalValue : termAmount,
            payment_installments: installments,
            payment_due_date: dueDate || undefined,
            items: selectedItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                supplier_id: item.supplier_id
            })),
            notes
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                {/* Cliente e Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="order-client" className="block text-sm font-medium text-gray-700">Cliente</label>
                        <select id="order-client" value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" required>
                            <option value="" disabled>Selecione um cliente</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="order-date" className="block text-sm font-medium text-gray-700">Data do Pedido</label>
                        <input type="date" id="order-date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" required />
                    </div>
                </div>

                {/* Seleção de Produtos */}
                <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Itens do Pedido</h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-end">
                        <div className="md:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Produto</label>
                            <select
                                value={currentProduct}
                                onChange={e => setCurrentProduct(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="" disabled>Selecione um produto</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} - R$ {Number(product.price_sell).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor (Custo)</label>
                            <select
                                value={currentSupplier}
                                onChange={e => setCurrentSupplier(e.target.value)}
                                disabled={!currentProduct}
                                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                            >
                                <option value="">Padrão / Sem Fornecedor</option>
                                {productSuppliers.map(s => (
                                    <option key={s.supplier_id} value={s.supplier_id}>
                                        {s.supplier_name} (R$ {s.cost_price.toFixed(2)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Qtd</label>
                            <input
                                type="number"
                                min="1"
                                value={currentQuantity}
                                onChange={e => setCurrentQuantity(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Button type="button" onClick={handleAddItem} disabled={!currentProduct} className="w-full">Adicionar</Button>
                        </div>
                    </div>
                    {estimatedMargin !== null && (
                        <div className="text-xs text-gray-500 mb-2">
                            Margem Estimada: <span className={estimatedMargin >= 20 ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>{estimatedMargin.toFixed(1)}%</span>
                        </div>
                    )}

                    {/* Lista de Itens */}
                    <div className="bg-gray-50 rounded-md p-2 mb-2">
                        {selectedItems.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center">Nenhum item adicionado.</p>
                        ) : (
                            <ul className="space-y-2">
                                {selectedItems.map((item, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm">
                                        <div>
                                            <span className="font-medium">{item.quantity}x {item.name}</span>
                                            {item.supplier_name && (
                                                <span className="text-xs text-gray-500 block">Fornecedor: {item.supplier_name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span>R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                                            <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700">
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="text-right font-bold text-lg">
                        Total: R$ {totalValue.toFixed(2)}
                    </div>
                </div>

                {/* Pagamento */}
                <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informações de Pagamento</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">Método de Pagamento</label>
                            <select
                                id="payment-method"
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value as any)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Dinheiro">À Vista - Dinheiro</option>
                                <option value="Pix">À Vista - Pix</option>
                                <option value="Prazo">A Prazo</option>
                                <option value="Misto">Misto (Parte à vista + Parte a prazo)</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="order-status" className="block text-sm font-medium text-gray-700">Status do Pedido</label>
                            <select id="order-status" value={status} onChange={e => setStatus(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                                <option value="Pendente">Pendente</option>
                                <option value="Em Rota">Em Rota</option>
                                <option value="Entregue">Entregue</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="payment-status" className="block text-sm font-medium text-gray-700">Status do Pagamento</label>
                            <select id="payment-status" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                                <option value="Pendente">Pendente</option>
                                <option value="Pago">Pago</option>
                            </select>
                        </div>

                        {(paymentMethod === 'Misto') && (
                            <>
                                <div>
                                    <label htmlFor="cash-amount" className="block text-sm font-medium text-gray-700">Valor à Vista (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        id="cash-amount"
                                        value={cashAmount}
                                        onChange={e => {
                                            const cash = parseFloat(e.target.value) || 0;
                                            setCashAmount(cash);
                                            setTermAmount(totalValue - cash);
                                        }}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="term-amount" className="block text-sm font-medium text-gray-700">Valor a Prazo (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        id="term-amount"
                                        value={termAmount}
                                        onChange={e => {
                                            const term = parseFloat(e.target.value) || 0;
                                            setTermAmount(term);
                                            setCashAmount(totalValue - term);
                                        }}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {(paymentMethod === 'Prazo' || paymentMethod === 'Misto') && (
                            <>
                                <div>
                                    <label htmlFor="installments" className="block text-sm font-medium text-gray-700">Número de Parcelas</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        id="installments"
                                        value={installments}
                                        onChange={e => setInstallments(parseInt(e.target.value) || 1)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="due-date" className="block text-sm font-medium text-gray-700">Vencimento da 1ª Parcela</label>
                                    <input
                                        type="date"
                                        id="due-date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Observações</label>
                    <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary">{isEditing ? 'Salvar Alterações' : 'Salvar Pedido'}</Button>
                </div>
            </div>
        </form>
    );
};


const Vendas: React.FC = () => {
    const { orders, loading, error, pagination, setPage, setLimit, goToNextPage, goToPreviousPage, createOrder, updateOrder, updateOrderStatus, deleteOrder, refetchOrders } = useOrders(1, 20);
    const [modalState, setModalState] = useState<'form' | 'details' | 'cancel' | 'reopen' | 'delete' | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const handleOpenModal = (state: 'form' | 'details' | 'cancel' | 'reopen' | 'delete', order: Order | null) => {
        setSelectedOrder(order);
        setModalState(state);
    };

    const handleCloseModals = () => {
        setModalState(null);
        setSelectedOrder(null);
        setIsPaymentModalOpen(false);
        setSelectedOrderForPayment(null);
        setIsStatusModalOpen(false);
        setSelectedOrderForStatus(null);
    };

    const handleSaveOrder = async (orderData: Omit<Order, 'id'>) => {
        try {
            let result;
            if (selectedOrder) {
                result = await updateOrder(selectedOrder.id, orderData);
            } else {
                result = await createOrder(orderData);
            }

            if (result.success) {
                showMessage(selectedOrder ? 'Pedido atualizado com sucesso' : 'Pedido criado com sucesso', 'success');
                handleCloseModals();
            } else {
                showMessage(result.error || 'Erro ao salvar pedido', 'error');
            }
        } catch (error) {
            showMessage('Erro de conexão ao salvar pedido', 'error');
        }
    };

    const handleConfirmCancel = async () => {
        if (selectedOrder) {
            try {
                const result = await updateOrderStatus(selectedOrder.id, 'Cancelado');
                if (result.success) {
                    showMessage('Pedido cancelado com sucesso', 'success');
                    handleCloseModals();
                } else {
                    showMessage(result.error || 'Erro ao cancelar pedido', 'error');
                }
            } catch (error) {
                showMessage('Erro de conexão ao cancelar pedido', 'error');
            }
        }
    };

    const handleConfirmDelete = async () => {
        if (selectedOrder) {
            try {
                const result = await deleteOrder(selectedOrder.id);
                if (result.success) {
                    showMessage('Pedido excluído com sucesso', 'success');
                    handleCloseModals();
                } else {
                    showMessage(result.error || 'Erro ao excluir pedido', 'error');
                }
            } catch (error) {
                showMessage('Erro de conexão ao excluir pedido', 'error');
            }
        }
    };

    const handleConfirmReopen = async () => {
        if (selectedOrder) {
            try {
                const result = await updateOrderStatus(selectedOrder.id, 'Pendente');
                if (result.success) {
                    showMessage('Pedido reaberto com sucesso', 'success');
                    handleCloseModals();
                } else {
                    showMessage(result.error || 'Erro ao reabrir pedido', 'error');
                }
            } catch (error) {
                showMessage('Erro de conexão ao reabrir pedido', 'error');
            }
        }
    };

    const handlePaymentStatusClick = (order: Order) => {
        setSelectedOrderForPayment(order);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSave = async (paymentData: { amount: number; payment_method: string; notes?: string; payment_date?: string; receipt?: File }) => {
        if (!selectedOrderForPayment) return;

        try {
            const response = await api.createOrderPayment(selectedOrderForPayment.id, paymentData);
            if (response.success) {
                showMessage(`Pagamento de ${paymentData.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} registrado com sucesso!`, 'success');
                refetchOrders();
                handleCloseModals();
            } else {
                showMessage(response.error || 'Erro ao registrar pagamento', 'error');
            }
        } catch (error) {
            showMessage('Erro de conexão ao registrar pagamento', 'error');
        }
    };


    const handleOrderStatusClick = (order: Order) => {
        setSelectedOrderForStatus(order);
        setIsStatusModalOpen(true);
    };

    const handleOrderStatusSave = async (newStatus: string) => {
        if (!selectedOrderForStatus) return;

        const result = await updateOrderStatus(selectedOrderForStatus.id, newStatus);
        if (result.success) {
            showMessage('Status do pedido atualizado com sucesso', 'success');
            handleCloseModals();
        } else {
            showMessage(result.error || 'Erro ao atualizar status do pedido', 'error');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('Todos');
        setStartDate('');
        setEndDate('');
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.clientName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'Todos' || order.status === statusFilter;
            const orderDate = new Date(order.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);
            const matchesDate = (!start || orderDate >= start) && (!end || orderDate <= end);
            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, statusFilter, startDate, endDate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
                    <p className="text-gray-600">Carregando pedidos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p className="font-bold">Erro ao carregar pedidos</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Modal
                isOpen={modalState === 'form'}
                onClose={handleCloseModals}
                title={selectedOrder ? 'Editar Pedido' : 'Novo Pedido'}
                size="lg"
            >
                <OrderFormSimplified onClose={handleCloseModals} onSave={handleSaveOrder} orderToEdit={selectedOrder} />
            </Modal>

            <Modal
                isOpen={modalState === 'details' && !!selectedOrder}
                onClose={handleCloseModals}
                title={`Detalhes do Pedido #${selectedOrder?.id}`}
                size="lg"
            >
                {selectedOrder &&
                    <OrderDetailsContent order={selectedOrder} onClose={handleCloseModals} />
                }
            </Modal>

            <Modal
                isOpen={modalState === 'cancel' && !!selectedOrder}
                onClose={handleCloseModals}
                title="Confirmar Cancelamento"
            >
                <p>Tem certeza que deseja cancelar o pedido <strong>#{selectedOrder?.id}</strong>?</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={handleCloseModals}>Voltar</Button>
                    <Button variant="danger" onClick={handleConfirmCancel}>Confirmar</Button>
                </div>
            </Modal>

            <Modal
                isOpen={modalState === 'reopen' && !!selectedOrder}
                onClose={handleCloseModals}
                title="Confirmar Reabertura"
            >
                <p>Tem certeza que deseja reabrir o pedido <strong>#{selectedOrder?.id}</strong>? O status será "Pendente".</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={handleCloseModals}>Voltar</Button>
                    <Button variant="success" onClick={handleConfirmReopen}>Confirmar</Button>
                </div>
            </Modal>

            <Modal
                isOpen={modalState === 'delete' && !!selectedOrder}
                onClose={handleCloseModals}
                title="Confirmar Exclusão Permanente"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <p className="text-red-800 font-medium">
                            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                            Atenção: Esta ação é irreversível!
                        </p>
                    </div>
                    <p>Tem certeza que deseja excluir permanentemente o pedido <strong>#{selectedOrder?.id}</strong>?</p>
                    <p className="text-sm text-gray-600">Todos os pagamentos e dados associados serão perdidos.</p>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={handleCloseModals}>Cancelar</Button>
                    <Button variant="danger" onClick={handleConfirmDelete}>
                        <i className="fa-solid fa-trash mr-2"></i>Excluir Permanentemente
                    </Button>
                </div>
            </Modal>

            <div className="space-y-6">
                <PageHeader title="Vendas & Pedidos" buttonLabel="Novo Pedido" onButtonClick={() => handleOpenModal('form', null)} />

                <FilterBar onClearFilters={clearFilters}>
                    <input type="text" placeholder="Pesquisar por cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 bg-white" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 bg-white">
                        <option value="Todos">Todos os Status</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Em Rota">Em Rota</option>
                        <option value="Entregue">Entregue</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 bg-white" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 bg-white" />
                </FilterBar>

                <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 sticky left-0 bg-gray-50 z-10">ID do Pedido</th>
                                <th scope="col" className="px-6 py-3 sticky left-[100px] bg-gray-50 z-10">Cliente</th>
                                <th scope="col" className="px-6 py-3">Produto</th>
                                <th scope="col" className="px-6 py-3 text-center">Qtd</th>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3 text-right">Valor Total</th>
                                <th scope="col" className="px-6 py-3 text-right">Desconto</th>
                                <th scope="col" className="px-6 py-3 text-right">Despesas</th>
                                <th scope="col" className="px-6 py-3 text-right">Pago</th>
                                <th scope="col" className="px-6 py-3 text-right">Pendente</th>
                                <th scope="col" className="px-6 py-3 text-center">Pagamento</th>
                                <th scope="col" className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white z-10">#{order.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap sticky left-[100px] bg-white z-10 font-medium">{order.clientName}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-700" title={order.items_summary || '-'}>
                                            {order.items_summary
                                                ? (order.items_summary.length > 25
                                                    ? order.items_summary.substring(0, 25) + '...'
                                                    : order.items_summary)
                                                : '-'
                                            }
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-semibold text-blue-600">
                                            {order.total_quantity || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{formatDisplayDate(order.date)}</td>
                                    <td className="px-6 py-4 text-right">{order.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-medium ${(order.discount || 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                            {(order.discount || 0) > 0
                                                ? `- ${(order.discount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                                : '-'
                                            }
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-red-600 font-medium">
                                            {((order as any).expenses || 0) > 0
                                                ? `- ${((order as any).expenses || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                                : '-'
                                            }
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-green-600 font-medium">
                                            {((order as any).paid_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-medium ${((order as any).pending_amount || order.totalValue) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {((order as any).pending_amount ?? order.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-medium">
                                            {order.paymentMethod === 'Dinheiro' && '💵 Dinheiro'}
                                            {order.paymentMethod === 'Pix' && '📱 Pix'}
                                            {order.paymentMethod === 'Prazo' && `📅 ${order.installments || 1}x`}
                                            {order.paymentMethod === 'Misto' && '💰 Misto'}
                                            {!order.paymentMethod && '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center space-x-2">
                                            {((order as any).pending_amount ?? order.totalValue) > 0 && (
                                                <button
                                                    onClick={() => handlePaymentStatusClick(order)}
                                                    className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                                                >
                                                    💰 Pagar
                                                </button>
                                            )}
                                            <button onClick={() => handleOpenModal('details', order)} className="font-medium text-blue-600 hover:underline text-xs">Detalhes</button>
                                            <button onClick={() => handleOpenModal('form', order)} className="font-medium text-orange-600 hover:underline text-xs">Editar</button>
                                            {order.status === 'Cancelado' ? (
                                                <button onClick={() => handleOpenModal('reopen', order)} className="font-medium text-green-600 hover:underline text-xs">Reabrir</button>
                                            ) : (
                                                <button onClick={() => handleOpenModal('cancel', order)} className="font-medium text-red-600 hover:underline text-xs disabled:text-gray-400 disabled:no-underline" disabled={order.status === 'Entregue'}>
                                                    Cancelar
                                                </button>
                                            )}
                                            {order.status === 'Pendente' && (
                                                <button
                                                    onClick={() => handleOpenModal('delete', order)}
                                                    className="font-medium text-red-700 hover:underline text-xs"
                                                    title="Excluir permanentemente"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={goToPreviousPage}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={goToNextPage}
                                disabled={pagination.page >= pagination.totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Próximo
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-gray-700">
                                    Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de{' '}
                                    <span className="font-medium">{pagination.total}</span> pedidos
                                </p>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Por página:</label>
                                    <select
                                        value={pagination.limit}
                                        onChange={(e) => setLimit(Number(e.target.value))}
                                        className="border border-gray-300 rounded-md text-sm p-1 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={goToPreviousPage}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <i className="fa-solid fa-chevron-left text-sm"></i>
                                    </button>

                                    {/* Page numbers */}
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (pagination.totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (pagination.page <= 3) {
                                            pageNum = i + 1;
                                        } else if (pagination.page >= pagination.totalPages - 2) {
                                            pageNum = pagination.totalPages - 4 + i;
                                        } else {
                                            pageNum = pagination.page - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-20 ${pagination.page === pageNum
                                                    ? 'z-10 bg-orange-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600'
                                                    : 'text-gray-900 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={goToNextPage}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Próximo</span>
                                        <i className="fa-solid fa-chevron-right text-sm"></i>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedOrderForPayment && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSave={handlePaymentSave}
                    order={selectedOrderForPayment}
                    onDiscountUpdate={refetchOrders}
                />
            )}

            {selectedOrderForStatus && (
                <OrderStatusModal
                    isOpen={isStatusModalOpen}
                    onClose={() => setIsStatusModalOpen(false)}
                    onSave={handleOrderStatusSave}
                    currentStatus={selectedOrderForStatus.status}
                    orderId={selectedOrderForStatus.id}
                />
            )}

            {showToast && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setShowToast(false)}
                />
            )}
        </>
    );
};

export default Vendas;
