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
    type: 'Receita' | 'Despesas Diversas' | 'Transferência' | 'Contas a Receber' | 'Retirada pelo Proprietário' | 'Venda no Vale' | 'Venda no Cartão' | 'Venda no Pix';
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
    attachment_url?: string;
}

interface FinancialSummary {
    total_revenue: number;
    total_expenses: number;
    balance: number;
    pending_revenue: number;
    pending_expenses: number;
    overdue_amount: number;
    total_venda_pix: number;
    total_venda_cartao: number;
    total_venda_vale: number;
    total_retirada_proprietario: number;
    cash_balance: number;
    previous_day_cash?: number;
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

type PaginationKey = 'transactions' | 'receivables' | 'payables';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (date: string) => {
    if (!date) return '-';
    // Se a data está no formato YYYY-MM-DD, formatar diretamente para evitar shift de timezone
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
        const [datePart] = date.split('T');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    }
    return new Date(date).toLocaleDateString('pt-BR');
};

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const KPICard: React.FC<{ title: string; value: string; icon: string; color: string; trend?: 'up' | 'down' }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow">
        {/* Ícone no topo */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${color}`}>
            <i className={`${icon} text-2xl text-white`}></i>
        </div>
        {/* Título */}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</p>
        {/* Valor */}
        <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
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

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const getPageCount = (totalItems: number, pageSize: number) => Math.max(1, Math.ceil(totalItems / pageSize));

const paginateItems = <T,>(items: T[], currentPage: number, pageSize: number) => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
};

const PaginationControls: React.FC<{
    totalItems: number;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}> = ({ totalItems, currentPage, pageSize, onPageChange, onPageSizeChange }) => {
    const pageCount = getPageCount(totalItems, pageSize);
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Itens por página</span>
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                    {PAGE_SIZE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center">
                <span>
                    Mostrando {startItem}-{endItem} de {totalItems}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="h-8 w-8 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Página anterior"
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="min-w-20 px-2 text-center font-medium text-gray-700">
                        {currentPage} / {pageCount}
                    </span>
                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= pageCount}
                        className="h-8 w-8 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Próxima página"
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Formas de recebimento disponíveis para Receitas (espelha o "À Vista Combinado" dos pedidos).
// Cada forma é mapeada para o tipo de transação correspondente, aproveitando os KPIs já existentes
// (Venda no Pix / Venda no Cartão). payment_method precisa respeitar o CHECK da tabela
// financial_transactions (Cartão genérico não existe no CHECK, então fica null).
type ReceiptMethod = 'Dinheiro' | 'Pix' | 'Cartão' | 'Transferência' | 'Boleto';

const RECEIPT_METHODS: { key: ReceiptMethod; label: string; icon: string }[] = [
    { key: 'Dinheiro', label: 'Dinheiro', icon: 'fa-money-bill-wave' },
    { key: 'Pix', label: 'Pix', icon: 'fa-qrcode' },
    { key: 'Cartão', label: 'Cartão', icon: 'fa-credit-card' },
    { key: 'Transferência', label: 'Transferência', icon: 'fa-building-columns' },
    { key: 'Boleto', label: 'Boleto', icon: 'fa-barcode' }
];

const RECEIPT_METHOD_MAP: Record<ReceiptMethod, { type: string; payment_method: string | null }> = {
    'Dinheiro': { type: 'Receita', payment_method: 'Dinheiro' },
    'Pix': { type: 'Venda no Pix', payment_method: 'Pix' },
    'Cartão': { type: 'Venda no Cartão', payment_method: null },
    'Transferência': { type: 'Receita', payment_method: 'Transferência' },
    'Boleto': { type: 'Receita', payment_method: 'Boleto' }
};

const TransactionForm: React.FC<{
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
    categories: FinancialCategory[];
    accounts: FinancialAccount[];
    clients: any[];
    suppliers: any[];
    isLoading: boolean;
    transactionToEdit?: FinancialTransaction | null;
}> = ({ onSave, onClose, categories, accounts, clients, suppliers, isLoading, transactionToEdit }) => {
    const formatDateForInput = (date: string | undefined) => {
        if (!date) return getLocalDateInputValue();
        if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.split('T')[0];
        const parsedDate = new Date(date);
        return Number.isNaN(parsedDate.getTime()) ? getLocalDateInputValue() : getLocalDateInputValue(parsedDate);
    };
    const initialTransactionDate = formatDateForInput(transactionToEdit?.transaction_date);

    const [formData, setFormData] = useState({
        type: transactionToEdit?.type || 'Receita',
        description: transactionToEdit?.description || '',
        amount: transactionToEdit ? String(transactionToEdit.amount) : '',
        transaction_date: initialTransactionDate,
        due_date: initialTransactionDate,
        category_id: transactionToEdit?.category?.id ? String(transactionToEdit.category.id) : '',
        account_id: transactionToEdit?.account?.id ? String(transactionToEdit.account.id) : '',
        destination_account_id: '',
        client_id: transactionToEdit?.client?.id ? String(transactionToEdit.client.id) : '',
        supplier_id: '',
        status: transactionToEdit?.status || 'Pendente',
        payment_method: transactionToEdit?.payment_method || 'Dinheiro',
        notes: transactionToEdit?.notes || ''
    });
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Formas de recebimento (apenas para Receita em modo de criação).
    // selectedMethods = formas escolhidas; methodAmounts = valor por forma quando há mais de uma.
    const [selectedMethods, setSelectedMethods] = useState<ReceiptMethod[]>(['Dinheiro']);
    const [methodAmounts, setMethodAmounts] = useState<Record<string, string>>({});
    const isReceita = formData.type === 'Receita';
    const showReceiptMethods = isReceita && !transactionToEdit;

    const toggleMethod = (key: ReceiptMethod) => {
        setSelectedMethods(prev => {
            if (prev.includes(key)) {
                if (prev.length === 1) return prev; // mantém ao menos uma forma
                return prev.filter(m => m !== key);
            }
            return [...prev, key];
        });
    };

    const totalAmount = parseFloat((formData.amount || '').replace(',', '.')) || 0;
    const methodsSum = selectedMethods.reduce(
        (sum, m) => sum + (parseFloat((methodAmounts[m] || '').replace(',', '.')) || 0),
        0
    );
    const sumMatchesTotal = Math.abs(methodsSum - totalAmount) < 0.01;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'transaction_date') {
            setFormData(prev => ({
                ...prev,
                transaction_date: value,
                due_date: value
            }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (file: File | null) => {
        if (!file) {
            setAttachmentFile(null);
            setAttachmentPreview(null);
            return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            alert('Apenas imagens (JPEG, PNG) e PDFs são permitidos.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5MB.');
            return;
        }
        setAttachmentFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setAttachmentPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setAttachmentPreview(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileChange(file);
    };

    // Auto-select accounts and categories
    useEffect(() => {
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
    }, [formData.type, accounts, categories, formData.account_id, formData.category_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const baseData = {
            ...formData,
            due_date: formData.transaction_date,
            amount: parseFloat(formData.amount.replace(',', '.')),
            category_id: formData.category_id ? Number(formData.category_id) : null,
            account_id: Number(formData.account_id),
            destination_account_id: formData.destination_account_id ? Number(formData.destination_account_id) : null,
            client_id: formData.client_id ? Number(formData.client_id) : null,
            supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
            receipt_file: attachmentFile || undefined
        };

        // Receita: gera uma transação por forma de recebimento escolhida.
        if (showReceiptMethods) {
            const multiple = selectedMethods.length > 1;

            if (multiple && !sumMatchesTotal) {
                alert(`A soma das formas (${formatCurrency(methodsSum)}) deve ser igual ao valor total (${formatCurrency(totalAmount)}).`);
                return;
            }

            const splits = selectedMethods.map((method: ReceiptMethod) => {
                const mapped = RECEIPT_METHOD_MAP[method];
                const amount = multiple
                    ? (parseFloat((methodAmounts[method] || '').replace(',', '.')) || 0)
                    : totalAmount;
                return {
                    type: mapped.type,
                    payment_method: mapped.payment_method,
                    amount,
                    description: multiple ? `${formData.description} (${method})` : formData.description
                };
            });

            if (multiple && splits.some(s => s.amount <= 0)) {
                alert('Informe um valor maior que zero para cada forma de recebimento.');
                return;
            }

            onSave({ ...baseData, splits });
            return;
        }

        onSave(baseData);
    };

    const isRevenue = formData.type === 'Receita' || formData.type === 'Contas a Receber' || formData.type === 'Venda no Vale' || formData.type === 'Venda no Cartão' || formData.type === 'Venda no Pix';
    const isExpense = formData.type === 'Despesas Diversas' || formData.type === 'Retirada pelo Proprietário';

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
                        <option value="Despesas Diversas">Despesas Diversas</option>
                        <option value="Contas a Receber">Contas a Receber</option>
                        <option value="Retirada pelo Proprietário">Retirada pelo Proprietário</option>
                        <option value="Venda no Vale">Venda no Vale</option>
                        <option value="Venda no Cartão">Venda no Cartão</option>
                        <option value="Venda no Pix">Venda no Pix</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-auto border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
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
                        onWheel={(e) => e.currentTarget.blur()}
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

            {/* Formas de Recebimento (apenas Receita, na criação) */}
            {showReceiptMethods && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Forma(s) de Recebimento
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {RECEIPT_METHODS.map(({ key, label, icon }) => {
                            const active = selectedMethods.includes(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleMethod(key)}
                                    className={`flex items-center justify-center gap-2 p-2 border rounded-md text-sm font-medium transition-all ${active
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    <i className={`fas ${icon}`}></i>
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {selectedMethods.length > 1 && (
                        <div className="mt-3 space-y-2">
                            {selectedMethods.map((method: ReceiptMethod) => (
                                <div key={method} className="flex items-center gap-2">
                                    <span className="w-32 text-sm text-gray-600">{method}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={methodAmounts[method] || ''}
                                        onChange={(e) => setMethodAmounts(prev => ({ ...prev, [method]: e.target.value }))}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0.00"
                                        className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                                    />
                                </div>
                            ))}
                            <div className={`flex justify-between text-sm font-medium pt-1 ${sumMatchesTotal ? 'text-green-600' : 'text-red-600'}`}>
                                <span>Soma das formas:</span>
                                <span>{formatCurrency(methodsSum)} / {formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                        Selecione uma ou mais formas. Pix e Cartão são registrados como "Venda no Pix" e "Venda no Cartão".
                    </p>
                </div>
            )}

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

            {/* Upload de Comprovante */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante (Opcional)</label>
                <div
                    className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${attachmentFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                    {attachmentFile ? (
                        <div className="flex items-center justify-center gap-3">
                            {attachmentPreview ? (
                                <img src={attachmentPreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border" />
                            ) : (
                                <div className="h-16 w-16 bg-red-100 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-file-pdf text-red-500 text-2xl"></i>
                                </div>
                            )}
                            <div className="text-left">
                                <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{attachmentFile.name}</p>
                                <p className="text-xs text-gray-500">{(attachmentFile.size / 1024).toFixed(1)} KB</p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFileChange(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 mt-1"
                                >
                                    <i className="fas fa-times mr-1"></i>Remover
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <i className="fas fa-cloud-upload-alt text-gray-400 text-2xl mb-2"></i>
                            <p className="text-sm text-gray-500">Clique ou arraste para anexar</p>
                            <p className="text-xs text-gray-400 mt-1">JPEG, PNG ou PDF (máx. 5MB)</p>
                        </div>
                    )}
                </div>
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
    const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    });
    const [pageSize, setPageSize] = useState(10);
    const [currentPages, setCurrentPages] = useState<Record<PaginationKey, number>>({
        transactions: 1,
        receivables: 1,
        payables: 1
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

            // Se apenas uma das datas for informada, trata como filtro de um único dia
            // (evita "intervalo aberto" trazendo datas posteriores à data escolhida).
            const effectiveStart = dateRange.start || dateRange.end || undefined;
            const effectiveEnd = dateRange.end || dateRange.start || undefined;

            const cashFlowStart = effectiveStart || defaultStart;
            const cashFlowEnd = effectiveEnd || defaultEnd;

            // Carregar todas as informações em paralelo
            const [transactionsRes, summaryRes, categoriesRes, accountsRes, cashFlowRes, clientsRes, suppliersRes] = await Promise.all([
                api.getFinancialTransactions({
                    date_from: effectiveStart,
                    date_to: effectiveEnd
                }),
                api.getFinancialSummary({
                    date_from: effectiveStart,
                    date_to: effectiveEnd
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
            if (editingTransaction) {
                const response = await api.updateFinancialTransaction(editingTransaction.id, data);
                if (!response.success) throw new Error(response.error || 'Erro ao salvar transação');
                setToast({ message: 'Transação atualizada com sucesso!', type: 'success' });
            } else if (Array.isArray(data.splits) && data.splits.length > 0) {
                // Receita com múltiplas formas de recebimento: uma transação por forma.
                // O comprovante é anexado apenas à primeira.
                const { splits, receipt_file, ...base } = data;
                for (let i = 0; i < splits.length; i++) {
                    const split = splits[i];
                    const response = await api.createFinancialTransaction({
                        ...base,
                        type: split.type,
                        payment_method: split.payment_method,
                        amount: split.amount,
                        description: split.description,
                        receipt_file: i === 0 ? receipt_file : undefined
                    });
                    if (!response.success) throw new Error(response.error || 'Erro ao salvar transação');
                }
                setToast({ message: splits.length > 1 ? 'Transações criadas com sucesso!' : 'Transação criada com sucesso!', type: 'success' });
            } else {
                const response = await api.createFinancialTransaction(data);
                if (!response.success) throw new Error(response.error || 'Erro ao salvar transação');
                setToast({ message: 'Transação criada com sucesso!', type: 'success' });
            }
            setIsFormModalOpen(false);
            setEditingTransaction(null);
            loadInitialData();
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            setToast({ message: 'Erro ao salvar transação', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditTransaction = (transaction: FinancialTransaction) => {
        setIsDetailsModalOpen(false);
        setSelectedTransaction(null);
        setEditingTransaction(transaction);
        setIsFormModalOpen(true);
    };

    // Filtrar transações
    const filteredTransactions = useMemo(() => {
        return transactions.filter(transaction => {
            const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.transaction_code.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'Todos' || transaction.type === typeFilter;
            const matchesStatus = statusFilter === 'Todos' || transaction.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [transactions, searchTerm, typeFilter, statusFilter]);

    // Separar receitas e despesas para as abas.
    // Contas a Receber: apenas as que possuem valor em aberto (Pendente/Vencido).
    // Ao marcar como "Pago", o item sai automaticamente desta lista (os dados são recarregados).
    const receivables = filteredTransactions.filter(t =>
        ['Receita', 'Contas a Receber', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix'].includes(t.type) &&
        ['Pendente', 'Vencido'].includes(t.status)
    );
    const payables = filteredTransactions.filter(t => ['Despesas Diversas', 'Retirada pelo Proprietário'].includes(t.type));
    const transactionPageCount = getPageCount(filteredTransactions.length, pageSize);
    const receivablePageCount = getPageCount(receivables.length, pageSize);
    const payablePageCount = getPageCount(payables.length, pageSize);
    const transactionPage = Math.min(currentPages.transactions, transactionPageCount);
    const receivablePage = Math.min(currentPages.receivables, receivablePageCount);
    const payablePage = Math.min(currentPages.payables, payablePageCount);
    const paginatedTransactions = paginateItems(filteredTransactions, transactionPage, pageSize);
    const paginatedReceivables = paginateItems(receivables, receivablePage, pageSize);
    const paginatedPayables = paginateItems(payables, payablePage, pageSize);

    useEffect(() => {
        setCurrentPages({
            transactions: 1,
            receivables: 1,
            payables: 1
        });
    }, [searchTerm, typeFilter, statusFilter, dateRange.start, dateRange.end, pageSize]);

    useEffect(() => {
        setCurrentPages(prev => {
            const next = {
                transactions: Math.min(prev.transactions, transactionPageCount),
                receivables: Math.min(prev.receivables, receivablePageCount),
                payables: Math.min(prev.payables, payablePageCount)
            };

            return next.transactions === prev.transactions &&
                next.receivables === prev.receivables &&
                next.payables === prev.payables
                ? prev
                : next;
        });
    }, [transactionPageCount, receivablePageCount, payablePageCount]);

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
    };

    const handlePageChange = (key: PaginationKey, page: number) => {
        setCurrentPages(prev => ({
            ...prev,
            [key]: page
        }));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setTypeFilter('Todos');
        setStatusFilter('Todos');
        // Resetar para o mês atual ou limpar totalmente?
        // O usuário pediu "carregar do banco", talvez queira ver tudo.
        // Vamos manter o reset padrão, mas adicionar um botão "Ver Todas" na UI.
        setDateRange({
            start: '',
            end: ''
        });
        setCurrentPages({
            transactions: 1,
            receivables: 1,
            payables: 1
        });
    };

    const showAllTransactions = () => {
        setDateRange({ start: '', end: '' });
        setCurrentPages({
            transactions: 1,
            receivables: 1,
            payables: 1
        });
    };

    // ====================================
    // EXPORTAÇÃO (respeita os filtros atuais — todas as páginas da aba ativa)
    // ====================================
    const [showExportMenu, setShowExportMenu] = useState(false);

    const getExportContext = () => {
        switch (activeTab) {
            case 'Contas a Receber':
                return { key: 'contas-a-receber', label: 'Contas a Receber', rows: receivables as any[], cashFlow: false as const };
            case 'Contas a Pagar':
                return { key: 'contas-a-pagar', label: 'Contas a Pagar', rows: payables as any[], cashFlow: false as const };
            case 'Fluxo de Caixa':
                return { key: 'fluxo-de-caixa', label: 'Fluxo de Caixa', rows: cashFlowData as any[], cashFlow: true as const };
            case 'Transações':
            default:
                return { key: 'transacoes', label: 'Transações', rows: filteredTransactions as any[], cashFlow: false as const };
        }
    };

    const buildExportMeta = () => {
        const parts: string[] = [];
        parts.push(
            (dateRange.start || dateRange.end)
                ? `Período: ${dateRange.start ? formatDate(dateRange.start) : '...'} a ${dateRange.end ? formatDate(dateRange.end) : '...'}`
                : 'Período: Todas as datas'
        );
        if (typeFilter !== 'Todos') parts.push(`Tipo: ${typeFilter}`);
        if (statusFilter !== 'Todos') parts.push(`Status: ${statusFilter}`);
        if (searchTerm) parts.push(`Busca: "${searchTerm}"`);
        return parts;
    };

    const dateStampForFile = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // KPIs do período (mesmos cards exibidos na tela)
    const getKpiRows = (): [string, number][] => [
        ['Total de Receitas', summary?.total_revenue || 0],
        ['Total de Despesas', summary?.total_expenses || 0],
        ['Retirada pelo Proprietário', summary?.total_retirada_proprietario || 0],
        ['Total de Venda no Pix', summary?.total_venda_pix || 0],
        ['Total de Venda no Cartão', summary?.total_venda_cartao || 0],
        ['Total de Venda no Vale', summary?.total_venda_vale || 0],
    ];

    // Total líquido do detalhamento = entradas − saídas (mesma classificação do
    // trigger update_account_balance no backend). Transferências são neutras.
    const REVENUE_TYPES = ['Receita', 'Contas a Receber', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix', 'Depósito'];
    const EXPENSE_TYPES = ['Despesa', 'Despesas Diversas', 'Retirada pelo Proprietário'];
    const netTransactionsTotal = (rows: any[]): number =>
        rows.reduce((s, t) => {
            const amt = Number(t.amount || 0);
            if (REVENUE_TYPES.includes(t.type)) return s + amt;
            if (EXPENSE_TYPES.includes(t.type)) return s - amt;
            return s;
        }, 0);

    // ====================================
    // FECHAMENTO DE CAIXA (resumo no fim do relatório)
    // SALDO TOTAL = RECEITA − DESPESA − CONTAS A RECEBER
    // ====================================
    const SALES_TYPES = ['Receita', 'Contas a Receber', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix', 'Depósito'];
    const OPEN_STATUS = ['Pendente', 'Vencido'];

    const dateLabelForClosing = (): string => {
        if (dateRange.start && dateRange.end && dateRange.start !== dateRange.end) {
            return `${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}`;
        }
        const single = dateRange.start || dateRange.end;
        return single ? formatDate(single) : 'Todas as datas';
    };

    // Usa o conjunto completo do período (transactions), independente da busca/filtros de tela.
    const buildCashClosing = () => {
        const sum = (pred: (t: any) => boolean) =>
            transactions.filter(pred).reduce((s, t) => s + Number(t.amount || 0), 0);

        // RECEITA = todas as vendas do período (pagas ou a prazo), exceto canceladas.
        const receita = sum(t => SALES_TYPES.includes(t.type) && t.status !== 'Cancelado');
        // DESPESA = saídas pagas.
        const despesa = sum(t => EXPENSE_TYPES.includes(t.type) && t.status === 'Pago');
        // CONTAS A RECEBER = vendas a prazo ainda em aberto.
        const contasAReceber = sum(t => SALES_TYPES.includes(t.type) && OPEN_STATUS.includes(t.status));
        const saldoTotal = receita - despesa - contasAReceber;

        return { date: dateLabelForClosing(), receita, despesa, contasAReceber, saldoTotal };
    };

    const handleExportPDF = () => {
        const jsPdfFactory = (window as any).jspdf?.jsPDF;
        if (!jsPdfFactory) {
            setToast({ message: 'Biblioteca de PDF não encontrada. Verifique sua conexão.', type: 'error' });
            return;
        }
        const ctx = getExportContext();
        if (!ctx.rows || ctx.rows.length === 0) {
            setToast({ message: 'Nenhum dado para exportar com o filtro atual.', type: 'error' });
            return;
        }

        const doc = new jsPdfFactory({ unit: 'pt', format: 'a4', orientation: 'landscape', compress: true });
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text(`RELATÓRIO FINANCEIRO — ${ctx.label}`, 40, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const meta = buildExportMeta();
        meta.push(`Emitido em: ${new Date().toLocaleString('pt-BR')}`);
        meta.forEach((line, i) => doc.text(line, 40, 58 + i * 13));
        const kpiTop = 58 + meta.length * 13 + 8;

        // Resumo do Período (KPIs) — em pares (label/valor) por linha
        const kpis = getKpiRows();
        const kpiBody: any[] = [];
        for (let i = 0; i < kpis.length; i += 2) {
            const a = kpis[i];
            const b = kpis[i + 1];
            kpiBody.push([a[0], formatCurrency(a[1]), b ? b[0] : '', b ? formatCurrency(b[1]) : '']);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Resumo do Período', 40, kpiTop);
        docAny.autoTable({
            startY: kpiTop + 6,
            head: [['Indicador', 'Valor', 'Indicador', 'Valor']],
            body: kpiBody,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { fontStyle: 'bold' }, 3: { halign: 'right' } },
            margin: { left: 40, right: 40 },
        });

        const detailTop = docAny.lastAutoTable.finalY + 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Detalhamento — ${ctx.label}`, 40, detailTop);
        const mainTableTop = detailTop + 6;

        if (ctx.cashFlow) {
            const body = ctx.rows.map((r: any) => [
                r.date,
                formatCurrency(r.receitas || 0),
                formatCurrency(r.despesas || 0),
                formatCurrency(r.saldo || 0),
            ]);
            docAny.autoTable({
                startY: mainTableTop,
                head: [['Data', 'Receitas', 'Despesas', 'Saldo']],
                body,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 4 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
                margin: { left: 40, right: 40 },
            });
        } else {
            const total = netTransactionsTotal(ctx.rows);
            const body = ctx.rows.map((t) => [
                t.transaction_code,
                formatDate(t.transaction_date),
                t.type,
                t.account?.name || '-',
                t.description,
                t.client?.name || '-',
                formatCurrency(t.amount),
                t.status,
            ]);
            body.push(['', '', '', '', '', 'TOTAL', formatCurrency(total), '']);
            docAny.autoTable({
                startY: mainTableTop,
                head: [['Código', 'Data', 'Tipo', 'Conta', 'Descrição', 'Cliente', 'Valor', 'Status']],
                body,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 6: { halign: 'right' } },
                didParseCell: (data: any) => {
                    if (data.section === 'body' && data.row.index === body.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [243, 244, 246];
                    }
                },
                margin: { left: 40, right: 40 },
                didDrawPage: () => {
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - 70, doc.internal.pageSize.getHeight() - 18);
                },
            });
        }

        // ====================================
        // RESUMO / FECHAMENTO DE CAIXA
        // ====================================
        const cc = buildCashClosing();

        // Garante que título + tabela caibam juntos; senão, nova página.
        const pageHeight = doc.internal.pageSize.getHeight();
        const estimatedHeight = 16 + 6 * 18; // título + tabela (header + 5 linhas)
        let summaryTop = docAny.lastAutoTable.finalY + 24;
        if (summaryTop + estimatedHeight > pageHeight - 30) {
            doc.addPage();
            summaryTop = 40;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Resumo — Fechamento de Caixa', 40, summaryTop);

        // Tabela — DESCRIÇÃO / VALOR
        docAny.autoTable({
            startY: summaryTop + 6,
            head: [['DESCRIÇÃO', 'VALOR']],
            body: [
                ['DATA', cc.date],
                ['RECEITA', formatCurrency(cc.receita)],
                ['DESPESA', formatCurrency(cc.despesa)],
                ['CONTAS A RECEBER', formatCurrency(cc.contasAReceber)],
                ['SALDO TOTAL', formatCurrency(cc.saldoTotal)],
            ],
            theme: 'grid',
            tableWidth: 300,
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
            margin: { left: 40 },
            pageBreak: 'avoid',
            didParseCell: (data: any) => {
                if (data.section === 'body' && data.row.index === 4) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [243, 244, 246];
                }
            },
        });

        doc.save(`financeiro-${ctx.key}-${dateStampForFile()}.pdf`);
        setToast({ message: `Exportado ${ctx.rows.length} registro(s) em PDF.`, type: 'success' });
        setShowExportMenu(false);
    };

    const handleExportCSV = () => {
        const ctx = getExportContext();
        if (!ctx.rows || ctx.rows.length === 0) {
            setToast({ message: 'Nenhum dado para exportar com o filtro atual.', type: 'error' });
            return;
        }
        const sep = ';';
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const num = (v: any) => Number(v || 0).toFixed(2).replace('.', ',');
        const lines: string[] = [];
        lines.push(`RELATÓRIO FINANCEIRO - ${ctx.label}`);
        buildExportMeta().forEach((m) => lines.push(m));
        lines.push('');

        lines.push('Resumo do Período (KPIs)');
        getKpiRows().forEach(([label, val]) => lines.push([esc(label), num(val)].join(sep)));
        lines.push('');

        if (ctx.cashFlow) {
            lines.push(['Data', 'Receitas', 'Despesas', 'Saldo'].join(sep));
            ctx.rows.forEach((r) => lines.push([esc(r.date), num(r.receitas), num(r.despesas), num(r.saldo)].join(sep)));
        } else {
            lines.push(['Código', 'Data', 'Tipo', 'Conta', 'Descrição', 'Cliente', 'Valor', 'Status'].join(sep));
            ctx.rows.forEach((t) => lines.push([
                esc(t.transaction_code), esc(formatDate(t.transaction_date)), esc(t.type),
                esc(t.account?.name || '-'), esc(t.description), esc(t.client?.name || '-'),
                num(t.amount), esc(t.status),
            ].join(sep)));
            const total = netTransactionsTotal(ctx.rows);
            lines.push(['', '', '', '', '', esc('TOTAL'), num(total), ''].join(sep));
        }

        // Resumo / Fechamento de Caixa
        const cc = buildCashClosing();
        lines.push('');
        lines.push('Resumo - Fechamento de Caixa');
        lines.push([esc('DESCRIÇÃO'), esc('VALOR')].join(sep));
        lines.push([esc('DATA'), esc(cc.date)].join(sep));
        lines.push([esc('RECEITA'), num(cc.receita)].join(sep));
        lines.push([esc('DESPESA'), num(cc.despesa)].join(sep));
        lines.push([esc('CONTAS A RECEBER'), num(cc.contasAReceber)].join(sep));
        lines.push([esc('SALDO TOTAL'), num(cc.saldoTotal)].join(sep));

        const csv = '﻿' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `financeiro-${ctx.key}-${dateStampForFile()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setToast({ message: `Exportado ${ctx.rows.length} registro(s) em CSV.`, type: 'success' });
        setShowExportMenu(false);
    };

    return (
        <>
            <div className="space-y-6">
                <PageHeader title="Gestão Financeira" />

                {/* KPIs - Layout com ícone no topo (6 cards) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Total de Receitas"
                        value={formatCurrency(summary?.total_revenue || 0)}
                        icon="fas fa-arrow-up"
                        color="bg-emerald-500"
                    />
                    <KPICard
                        title="Total de Despesas"
                        value={formatCurrency(summary?.total_expenses || 0)}
                        icon="fas fa-arrow-down"
                        color="bg-rose-500"
                    />
                    <KPICard
                        title="Retirada pelo Proprietário"
                        value={formatCurrency(summary?.total_retirada_proprietario || 0)}
                        icon="fas fa-money-bill-wave"
                        color="bg-purple-500"
                    />
                    <KPICard
                        title="Total de Venda no Pix"
                        value={formatCurrency(summary?.total_venda_pix || 0)}
                        icon="fas fa-qrcode"
                        color="bg-teal-500"
                    />
                    <KPICard
                        title="Total de Venda no Cartão"
                        value={formatCurrency(summary?.total_venda_cartao || 0)}
                        icon="fas fa-credit-card"
                        color="bg-indigo-500"
                    />
                    <KPICard
                        title="Total de Venda no Vale"
                        value={formatCurrency(summary?.total_venda_vale || 0)}
                        icon="fas fa-receipt"
                        color="bg-orange-500"
                    />
                </div>

                {/* Filtros - Layout reorganizado em duas linhas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    {/* Primeira linha: Busca e Período */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                        <div className="relative flex-1">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                placeholder="Buscar transação..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                            <i className="fas fa-calendar text-gray-400"></i>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-transparent border-0 text-sm focus:ring-0 p-1"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-transparent border-0 text-sm focus:ring-0 p-1"
                            />
                        </div>
                    </div>

                    {/* Segunda linha: Filtros Dropdown + Ações */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            <option value="Receita">Receitas</option>
                            <option value="Despesas Diversas">Despesas Diversas</option>
                            <option value="Contas a Receber">Contas a Receber</option>
                            <option value="Retirada pelo Proprietário">Retirada pelo Proprietário</option>
                            <option value="Venda no Vale">Venda no Vale</option>
                            <option value="Venda no Cartão">Venda no Cartão</option>
                            <option value="Venda no Pix">Venda no Pix</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>

                        <button
                            onClick={showAllTransactions}
                            className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                        >
                            <i className="fas fa-calendar-alt mr-1"></i>
                            Ver Todas
                        </button>

                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                        >
                            <i className="fas fa-times mr-1"></i>
                            Limpar
                        </button>

                        {/* Exportar (conforme filtro) + Nova Transação */}
                        <div className="flex-1 flex justify-end items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(v => !v)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                    title="Exportar todos os registros do filtro atual"
                                >
                                    <i className="fas fa-file-export"></i>
                                    Exportar
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </button>
                                {showExportMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                        <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                                            <button
                                                onClick={handleExportPDF}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                            >
                                                <i className="fas fa-file-pdf text-red-500"></i>
                                                Exportar PDF
                                            </button>
                                            <button
                                                onClick={handleExportCSV}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                            >
                                                <i className="fas fa-file-csv text-green-600"></i>
                                                Exportar CSV
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Button
                                variant="primary"
                                onClick={() => { setEditingTransaction(null); setIsFormModalOpen(true); }}
                                className="shadow-lg shadow-orange-200"
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Nova Transação
                            </Button>
                        </div>
                    </div>
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
                                    paginatedTransactions.map(transaction => (
                                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{transaction.transaction_code}</td>
                                            <td className="px-4 py-3">{formatDate(transaction.transaction_date)}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={['Receita', 'Contas a Receber', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix'].includes(transaction.type) ? 'success' : ['Despesas Diversas', 'Retirada pelo Proprietário'].includes(transaction.type) ? 'danger' : 'info'}>
                                                    {transaction.type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {transaction.type === 'Transferência' ? (
                                                    <span className="text-xs">
                                                        {transaction.account?.name} <i className="fas fa-arrow-right mx-1 text-gray-400"></i> {transaction.destination_account?.name || 'Externo'}
                                                    </span>
                                                ) : (
                                                    <span>{transaction.account?.name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{transaction.description}</td>
                                            <td className="px-4 py-3">{transaction.client?.name || '-'}</td>
                                            <td className="px-4 py-3 font-semibold">
                                                <span className={['Receita', 'Contas a Receber', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix'].includes(transaction.type) ? 'text-green-600' : 'text-red-600'}>
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
                        {filteredTransactions.length > 0 && (
                            <PaginationControls
                                totalItems={filteredTransactions.length}
                                currentPage={transactionPage}
                                pageSize={pageSize}
                                onPageChange={(page) => handlePageChange('transactions', page)}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'Contas a Receber' && (
                    <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Data</th>
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
                                    paginatedReceivables.map(transaction => (
                                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{transaction.transaction_code}</td>
                                            <td className="px-4 py-3">{formatDate(transaction.transaction_date)}</td>
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
                        {receivables.length > 0 && (
                            <PaginationControls
                                totalItems={receivables.length}
                                currentPage={receivablePage}
                                pageSize={pageSize}
                                onPageChange={(page) => handlePageChange('receivables', page)}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'Contas a Pagar' && (
                    <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payables.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-4">Nenhuma conta a pagar</td>
                                    </tr>
                                ) : (
                                    paginatedPayables.map(transaction => (
                                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{transaction.transaction_code}</td>
                                            <td className="px-4 py-3">{formatDate(transaction.transaction_date)}</td>
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
                        {payables.length > 0 && (
                            <PaginationControls
                                totalItems={payables.length}
                                currentPage={payablePage}
                                pageSize={pageSize}
                                onPageChange={(page) => handlePageChange('payables', page)}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        )}
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
                                <Badge variant={['Receita', 'Contas a Receber', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix'].includes(selectedTransaction.type) ? 'success' : 'danger'}>
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
                                <p className={`mt-1 text-lg font-semibold ${['Receita', 'Contas a Receber', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix'].includes(selectedTransaction.type) ? 'text-green-600' : 'text-red-600'}`}>
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

                        {selectedTransaction.attachment_url && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Comprovante</label>
                                <div className="mt-2 flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <i className={`fas ${selectedTransaction.attachment_url.endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'} text-lg`}></i>
                                    </div>
                                    <a
                                        href={api.getTransactionReceiptUrl(selectedTransaction.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                        <i className="fas fa-download mr-1"></i>
                                        Visualizar Comprovante
                                    </a>
                                </div>
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
                                <Button
                                    variant="primary"
                                    onClick={() => handleEditTransaction(selectedTransaction)}
                                >
                                    <i className="fas fa-edit mr-2"></i>
                                    Editar
                                </Button>
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

            {/* Modal de Nova/Editar Transação */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setEditingTransaction(null); }}
                title={editingTransaction ? 'Editar Transação' : 'Nova Transação'}
            >
                <TransactionForm
                    onSave={handleSaveTransaction}
                    onClose={() => { setIsFormModalOpen(false); setEditingTransaction(null); }}
                    categories={categories}
                    accounts={accounts}
                    clients={clients}
                    suppliers={suppliers}
                    isLoading={isSubmitting}
                    transactionToEdit={editingTransaction}
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
