import React, { useState, useEffect } from 'react';
import Button from './Button';
import { api } from '../../services/api';

// Lista de bancos disponíveis
const BANCOS = [
    'Bradesco',
    'Itaú',
    'Banco do Brasil',
    'Caixa',
    'Santander',
    'Nubank',
    'Inter',
    'C6 Bank',
    'Mercado Pago',
    'PicPay',
    'Outro'
];

type TipoPagamento = 'a_vista' | 'a_vista_combinado' | 'a_prazo';
type MetodoPagamento = 'Dinheiro' | 'Pix' | 'Transferência';
type MetodoCombinado = 'Dinheiro + Pix' | 'Dinheiro + Transferência' | 'Pix + Transferência';

interface OrderFormSimplifiedProps {
    onSave: (order: any) => void;
    onClose: () => void;
    orderToEdit?: any; // Pedido a ser editado (opcional)
}

const OrderFormSimplified: React.FC<OrderFormSimplifiedProps> = ({ onSave, onClose, orderToEdit }) => {
    // Dados básicos
    const [clients, setClients] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Produto selecionado
    const [productId, setProductId] = useState('');
    const [quantidade, setQuantidade] = useState('1');
    const [valorUnitario, setValorUnitario] = useState('');

    // Despesas
    const [despesas, setDespesas] = useState('');

    // Pagamento
    const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>('a_vista');
    const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('Dinheiro');
    const [metodoCombinado, setMetodoCombinado] = useState<MetodoCombinado>('Dinheiro + Pix');

    // Bancos para Pix e Transferência
    const [bancoPix, setBancoPix] = useState('');
    const [bancoTransferencia, setBancoTransferencia] = useState('');

    // Valores para pagamento combinado
    const [valorDinheiro, setValorDinheiro] = useState('');
    const [valorPix, setValorPix] = useState('');
    const [valorTransferencia, setValorTransferencia] = useState('');

    // A Prazo - Entrada
    const [houveEntrada, setHouveEntrada] = useState(false);
    const [valorEntrada, setValorEntrada] = useState('');
    const [metodoEntrada, setMetodoEntrada] = useState<MetodoPagamento>('Dinheiro');
    const [bancoEntrada, setBancoEntrada] = useState('');

    // Observações
    const [observacoes, setObservacoes] = useState('');

    // Comprovante
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    // Loading
    const [loading, setLoading] = useState(false);

    // Carregar clientes e produtos
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

    // Carregar dados do pedido para edição
    useEffect(() => {
        const loadOrderData = async () => {
            if (!orderToEdit) return;

            // Carregar dados básicos
            setClientId(orderToEdit.client_id?.toString() || orderToEdit.clientId?.toString() || '');

            // Formatar data (remover parte do tempo se existir)
            const orderDate = orderToEdit.order_date || orderToEdit.date || '';
            const datePart = typeof orderDate === 'string' ? orderDate.split('T')[0] : '';
            setDate(datePart || new Date().toISOString().split('T')[0]);

            setObservacoes(orderToEdit.notes || '');
            setDespesas((orderToEdit.expenses || 0).toString());

            // Carregar itens do pedido
            try {
                const orderDetails = await api.getOrderById(orderToEdit.id);
                if (orderDetails.success && orderDetails.data) {
                    const data = orderDetails.data as { items?: any[] };
                    const items = data.items || [];
                    if (items.length > 0) {
                        const firstItem = items[0];
                        setProductId(firstItem.product_id?.toString() || '');
                        setQuantidade(firstItem.quantity?.toString() || '1');
                        setValorUnitario(firstItem.unit_price?.toString() || '');
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar detalhes do pedido:', error);
            }

            // Carregar informações de pagamento
            const paymentMethod = orderToEdit.payment_method || orderToEdit.paymentMethod;
            if (paymentMethod === 'Prazo') {
                setTipoPagamento('a_prazo');
            } else if (paymentMethod === 'Misto') {
                setTipoPagamento('a_vista_combinado');
            } else if (paymentMethod) {
                setTipoPagamento('a_vista');
                setMetodoPagamento(paymentMethod as any);
            }
        };

        loadOrderData();
    }, [orderToEdit]);

    // Calcular valores (Quantidade × Valor Unitário - Despesas)
    const valorUnitarioNum = parseFloat(valorUnitario) || 0;
    const quantidadeNum = parseInt(quantidade) || 0;
    const valorBruto = quantidadeNum * valorUnitarioNum; // Valor a receber
    const despesasNumerico = parseFloat(despesas) || 0;
    const valorLiquido = valorBruto - despesasNumerico; // Lucro líquido

    // Validação e envio
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!clientId) {
            alert('Selecione um cliente!');
            return;
        }

        if (!productId) {
            alert('Selecione um produto!');
            return;
        }

        if (quantidadeNum <= 0) {
            alert('Informe a quantidade!');
            return;
        }

        if (valorUnitarioNum <= 0) {
            alert('Informe o valor unitário!');
            return;
        }

        // Validações de banco
        if (tipoPagamento === 'a_vista') {
            if (metodoPagamento === 'Pix' && !bancoPix) {
                alert('Selecione o banco para Pix!');
                return;
            }
            if (metodoPagamento === 'Transferência' && !bancoTransferencia) {
                alert('Selecione o banco para Transferência!');
                return;
            }
        }

        if (tipoPagamento === 'a_vista_combinado') {
            if (metodoCombinado.includes('Pix') && !bancoPix) {
                alert('Selecione o banco para Pix!');
                return;
            }
            if (metodoCombinado.includes('Transferência') && !bancoTransferencia) {
                alert('Selecione o banco para Transferência!');
                return;
            }
        }

        if (tipoPagamento === 'a_prazo' && houveEntrada) {
            if (!valorEntrada || parseFloat(valorEntrada) <= 0) {
                alert('Informe o valor da entrada!');
                return;
            }
            if (metodoEntrada === 'Pix' && !bancoEntrada) {
                alert('Selecione o banco da entrada!');
                return;
            }
            if (metodoEntrada === 'Transferência' && !bancoEntrada) {
                alert('Selecione o banco da entrada!');
                return;
            }
        }

        // Montar dados do pedido
        const product = products.find(p => p.id.toString() === productId);

        const paymentDetails: any = {
            tipo: tipoPagamento
        };

        if (tipoPagamento === 'a_vista') {
            paymentDetails.metodo = metodoPagamento;
            if (metodoPagamento === 'Pix') paymentDetails.banco_pix = bancoPix;
            if (metodoPagamento === 'Transferência') paymentDetails.banco_transferencia = bancoTransferencia;
        } else if (tipoPagamento === 'a_vista_combinado') {
            paymentDetails.metodo_combinado = metodoCombinado;
            if (metodoCombinado.includes('Pix')) paymentDetails.banco_pix = bancoPix;
            if (metodoCombinado.includes('Transferência')) paymentDetails.banco_transferencia = bancoTransferencia;

            if (metodoCombinado === 'Dinheiro + Pix') {
                paymentDetails.valor_dinheiro = parseFloat(valorDinheiro) || 0;
                paymentDetails.valor_pix = parseFloat(valorPix) || 0;
            } else if (metodoCombinado === 'Dinheiro + Transferência') {
                paymentDetails.valor_dinheiro = parseFloat(valorDinheiro) || 0;
                paymentDetails.valor_transferencia = parseFloat(valorTransferencia) || 0;
            } else if (metodoCombinado === 'Pix + Transferência') {
                paymentDetails.valor_pix = parseFloat(valorPix) || 0;
                paymentDetails.valor_transferencia = parseFloat(valorTransferencia) || 0;
            }
        } else if (tipoPagamento === 'a_prazo') {
            paymentDetails.houve_entrada = houveEntrada;
            if (houveEntrada) {
                paymentDetails.valor_entrada = parseFloat(valorEntrada) || 0;
                paymentDetails.metodo_entrada = metodoEntrada;
                if (metodoEntrada === 'Pix' || metodoEntrada === 'Transferência') {
                    paymentDetails.banco_entrada = bancoEntrada;
                }
            }
        }

        const orderData = {
            client_id: Number(clientId),
            order_date: date,
            status: 'Pendente',
            payment_method: tipoPagamento === 'a_prazo' ? 'Prazo' :
                tipoPagamento === 'a_vista' ? metodoPagamento : 'Misto',
            payment_status: tipoPagamento === 'a_prazo' && !houveEntrada ? 'Pendente' :
                tipoPagamento === 'a_prazo' && houveEntrada ? 'Parcial' : 'Pago',
            payment_cash_amount: tipoPagamento === 'a_vista' && metodoPagamento === 'Dinheiro' ? valorBruto :
                tipoPagamento === 'a_vista_combinado' ? (parseFloat(valorDinheiro) || 0) : 0,
            payment_term_amount: tipoPagamento === 'a_prazo' ?
                (valorBruto - (houveEntrada ? (parseFloat(valorEntrada) || 0) : 0)) : 0,
            items: [{
                product_id: Number(productId),
                quantity: quantidadeNum,
                unit_price: valorUnitarioNum
            }],
            notes: observacoes,
            expenses: despesasNumerico,
            gross_value: valorBruto,
            net_value: valorLiquido,
            payment_details: JSON.stringify(paymentDetails),
            receipt_file: receiptFile || undefined
        };

        setLoading(true);
        onSave(orderData);
    };

    // Renderizar seleção de banco
    const renderBankSelect = (
        value: string,
        onChange: (v: string) => void,
        label: string
    ) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
            >
                <option value="">Selecione o banco...</option>
                {BANCOS.map(banco => (
                    <option key={banco} value={banco}>{banco}</option>
                ))}
            </select>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente e Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        required
                    >
                        <option value="">Selecione um cliente...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pedido</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
            </div>

            {/* Produto, Quantidade e Valor */}
            <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">📦 Detalhes do Pedido</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Produto <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={productId}
                            onChange={e => setProductId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                            required
                        >
                            <option value="">Selecione...</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantidade <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={quantidade}
                            onChange={e => setQuantidade(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor Unitário (R$) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorUnitario}
                            onChange={e => setValorUnitario(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                            placeholder="0.00"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Preço por unidade acordado com o cliente</p>
                    </div>
                </div>

                {/* Subtotal calculado */}
                {valorUnitarioNum > 0 && quantidadeNum > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-700">Cálculo:</span>
                            <span className="font-medium text-blue-800">
                                {quantidade} × R$ {valorUnitarioNum.toFixed(2)} = <strong>R$ {valorBruto.toFixed(2)}</strong>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Despesas */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    💸 Despesas (R$)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={despesas}
                    onChange={e => setDespesas(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Frete, combustível, etc. (será subtraído do valor do pedido)</p>
            </div>

            {/* Resumo Financeiro */}
            {valorBruto > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-green-50 p-4 rounded-md border border-orange-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 Resumo Financeiro</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">💰 Valor do Pedido ({quantidadeNum} un):</span>
                            <span className="font-medium text-green-600">+ R$ {valorBruto.toFixed(2)}</span>
                        </div>
                        {despesasNumerico > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">💸 Despesas:</span>
                                <span className="font-medium text-red-600">- R$ {despesasNumerico.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                            <span className="text-lg font-bold text-gray-900">✅ Valor Líquido:</span>
                            <span className={`text-lg font-bold ${valorLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {valorLiquido.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tipo de Pagamento */}
            <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">💳 Forma de Pagamento</h3>

                {/* Categoria principal */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                        { value: 'a_vista', label: 'À Vista', icon: '💵' },
                        { value: 'a_vista_combinado', label: 'À Vista Combinado', icon: '💸' },
                        { value: 'a_prazo', label: 'A Prazo', icon: '📅' }
                    ].map(tipo => (
                        <button
                            key={tipo.value}
                            type="button"
                            onClick={() => setTipoPagamento(tipo.value as TipoPagamento)}
                            className={`p-3 border rounded-md text-sm font-medium transition-all ${tipoPagamento === tipo.value
                                ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <span className="block text-lg mb-1">{tipo.icon}</span>
                            {tipo.label}
                        </button>
                    ))}
                </div>

                {/* À Vista - Método único */}
                {tipoPagamento === 'a_vista' && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pagamento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Dinheiro', 'Pix', 'Transferência'] as MetodoPagamento[]).map(metodo => (
                                    <button
                                        key={metodo}
                                        type="button"
                                        onClick={() => setMetodoPagamento(metodo)}
                                        className={`p-2 border rounded-md text-sm font-medium transition-all ${metodoPagamento === metodo
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {metodo === 'Dinheiro' && '💵 '}
                                        {metodo === 'Pix' && '📱 '}
                                        {metodo === 'Transferência' && '🏦 '}
                                        {metodo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {metodoPagamento === 'Pix' && renderBankSelect(bancoPix, setBancoPix, 'Banco do Pix')}
                        {metodoPagamento === 'Transferência' && renderBankSelect(bancoTransferencia, setBancoTransferencia, 'Banco da Transferência')}
                    </div>
                )}

                {/* À Vista Combinado */}
                {tipoPagamento === 'a_vista_combinado' && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Combinação de Pagamento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Dinheiro + Pix', 'Dinheiro + Transferência', 'Pix + Transferência'] as MetodoCombinado[]).map(metodo => (
                                    <button
                                        key={metodo}
                                        type="button"
                                        onClick={() => setMetodoCombinado(metodo)}
                                        className={`p-2 border rounded-md text-sm font-medium transition-all ${metodoCombinado === metodo
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {metodo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Valores divididos */}
                        <div className="grid grid-cols-2 gap-4">
                            {metodoCombinado.includes('Dinheiro') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor em Dinheiro (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={valorDinheiro}
                                        onChange={e => setValorDinheiro(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}
                            {metodoCombinado.includes('Pix') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor em Pix (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={valorPix}
                                        onChange={e => setValorPix(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}
                            {metodoCombinado.includes('Transferência') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor em Transferência (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={valorTransferencia}
                                        onChange={e => setValorTransferencia(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Bancos */}
                        <div className="grid grid-cols-2 gap-4">
                            {metodoCombinado.includes('Pix') && renderBankSelect(bancoPix, setBancoPix, 'Banco do Pix')}
                            {metodoCombinado.includes('Transferência') && renderBankSelect(bancoTransferencia, setBancoTransferencia, 'Banco da Transferência')}
                        </div>
                    </div>
                )}

                {/* A Prazo */}
                {tipoPagamento === 'a_prazo' && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                        {/* Toggle Entrada */}
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={houveEntrada}
                                    onChange={e => setHouveEntrada(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                <span className="ml-3 text-sm font-medium text-gray-700">Houve entrada?</span>
                            </label>
                        </div>

                        {/* Campos de entrada */}
                        {houveEntrada && (
                            <div className="space-y-4 pl-4 border-l-4 border-orange-400">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Entrada (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={valorEntrada}
                                            onChange={e => setValorEntrada(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Método da Entrada</label>
                                        <select
                                            value={metodoEntrada}
                                            onChange={e => setMetodoEntrada(e.target.value as MetodoPagamento)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                        >
                                            <option value="Dinheiro">💵 Dinheiro</option>
                                            <option value="Pix">📱 Pix</option>
                                            <option value="Transferência">🏦 Transferência</option>
                                        </select>
                                    </div>
                                </div>

                                {(metodoEntrada === 'Pix' || metodoEntrada === 'Transferência') && (
                                    renderBankSelect(bancoEntrada, setBancoEntrada, `Banco da Entrada (${metodoEntrada})`)
                                )}

                                {/* Resumo A Prazo */}
                                {valorBruto > 0 && parseFloat(valorEntrada) > 0 && (
                                    <div className="bg-white p-3 rounded-md mt-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Entrada:</span>
                                            <span className="text-green-600 font-medium">R$ {parseFloat(valorEntrada).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Restante (a prazo):</span>
                                            <span className="text-orange-600 font-medium">
                                                R$ {(valorBruto - (parseFloat(valorEntrada) || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!houveEntrada && (
                            <p className="text-sm text-gray-500 italic">
                                O valor de R$ {valorBruto.toFixed(2)} será cobrado posteriormente.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Observações */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📝 Observações</label>
                <textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Observações adicionais..."
                />
            </div>

            {/* Comprovante de Pagamento */}
            {tipoPagamento !== 'a_prazo' || houveEntrada ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <i className="fa-solid fa-file-image mr-1"></i>Comprovante (opcional)
                    </label>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                    {receiptFile && (
                        <p className="text-xs text-green-600 mt-1">
                            <i className="fa-solid fa-check mr-1"></i>
                            {receiptFile.name}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG ou PDF até 5MB</p>
                </div>
            ) : null}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? (
                        <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Salvando...</>
                    ) : (
                        <>💾 Salvar Pedido</>
                    )}
                </Button>
            </div>
        </form>
    );
};

export default OrderFormSimplified;
