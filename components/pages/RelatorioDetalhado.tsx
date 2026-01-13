import React, { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import api from '../../services/api';
import { DetailedReportData } from '../../types';

const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const todayIso = new Date().toISOString().split('T')[0];
const startOfMonth = new Date();
startOfMonth.setDate(1);
const startOfMonthIso = startOfMonth.toISOString().split('T')[0];

const formatPtDate = (isoDate: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));

const RelatorioDetalhado: React.FC = () => {
    const [startDate, setStartDate] = useState(startOfMonthIso);
    const [endDate, setEndDate] = useState(todayIso);
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('Todos');
    const [reportData, setReportData] = useState<DetailedReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { normalizedStart, normalizedEnd } = useMemo(() => {
        if (startDate <= endDate) {
            return { normalizedStart: startDate, normalizedEnd: endDate };
        }
        return { normalizedStart: endDate, normalizedEnd: startDate };
    }, [startDate, endDate]);

    useEffect(() => {
        let isMounted = true;
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.getDetailedReport({
                    startDate: normalizedStart,
                    endDate: normalizedEnd,
                });

                if (!isMounted) {
                    return;
                }

                if (response.success && response.data) {
                    setReportData(response.data as DetailedReportData);
                } else {
                    setReportData(null);
                    setError(response.error || response.message || 'Não foi possível gerar o relatório.');
                }
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setReportData(null);
                setError(err instanceof Error ? err.message : 'Erro inesperado ao gerar o relatório.');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchReport();

        return () => {
            isMounted = false;
        };
    }, [normalizedStart, normalizedEnd]);

    const fallbackPeriod = `${formatPtDate(normalizedStart)} - ${formatPtDate(normalizedEnd)}`;
    const metadata = reportData?.metadata ?? {
        date: formatPtDate(todayIso),
        unit: 'Todas as unidades',
        city: 'Consolidado',
        period: fallbackPeriod,
        preparedBy: 'Sistema SISGÁS',
    };

    const appliedPeriod = reportData?.metadata.period ?? fallbackPeriod;
    const sales = reportData?.sales ?? [];
    const productSummary = reportData?.productSummary ?? [];
    const paymentBreakdown = reportData?.paymentBreakdown ?? [];
    const receivements = reportData?.receivements ?? [];
    const receivementSummary = reportData?.receivementSummary ?? [];
    const expenses = reportData?.expenses ?? [];
    const generalDetail = reportData?.generalDetail ?? paymentBreakdown;
    const liquidStock = (reportData as any)?.liquidStock ?? [];
    const containerStock = (reportData as any)?.containerStock ?? [];

    // Obter lista \u00fanica de m\u00e9todos de pagamento para o filtro
    const paymentMethods = useMemo(() => {
        const methods = new Set<string>();
        receivementSummary.forEach(item => methods.add(item.method));
        paymentBreakdown.forEach(item => methods.add(item.method));
        return ['Todos', ...Array.from(methods).sort()];
    }, [receivementSummary, paymentBreakdown]);

    // Filtrar recebimentos por m\u00e9todo de pagamento
    const filteredReceivements = useMemo(() => {
        if (paymentMethodFilter === 'Todos') return receivements;
        return receivements.filter(item => item.method === paymentMethodFilter);
    }, [receivements, paymentMethodFilter]);

    const filteredReceivementSummary = useMemo(() => {
        if (paymentMethodFilter === 'Todos') return receivementSummary;
        return receivementSummary.filter(item => item.method === paymentMethodFilter);
    }, [receivementSummary, paymentMethodFilter]);

    const totalSales = useMemo(
        () => sales.reduce((sum, sale) => sum + sale.total, 0),
        [sales]
    );
    const totalQuantity = useMemo(
        () => sales.reduce((sum, sale) => sum + sale.quantity, 0),
        [sales]
    );
    const averageTicket = totalQuantity ? totalSales / totalQuantity : 0;
    const paymentTotal = useMemo(
        () => paymentBreakdown.reduce((sum, item) => sum + item.amount, 0),
        [paymentBreakdown]
    );
    const totalExpenses = useMemo(
        () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
        [expenses]
    );

    // Novas métricas: Despesas por pedido e Valor Líquido
    const orderExpensesTotal = useMemo(
        () => sales.reduce((sum, sale) => sum + ((sale as any).expenses || 0), 0),
        [sales]
    );
    const netValue = totalSales - orderExpensesTotal;

    const handleDownloadPdf = () => {
        if (!reportData) {
            window.alert('Gere o relatório antes de exportar o PDF.');
            return;
        }

        const jsPdfFactory = window.jspdf?.jsPDF;
        if (!jsPdfFactory) {
            window.alert('Biblioteca de PDF não encontrada. Verifique sua conexão com a CDN.');
            return;
        }

        const doc = new jsPdfFactory({
            unit: 'pt',
            format: 'a4',
            compress: true,
        });
        const docAny = doc as any;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('RELATÓRIO DETALHADO DE VENDAS', 40, 45);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${appliedPeriod}`, 40, 65);
        doc.text(`Unidade: ${metadata.unit} · ${metadata.city}`, 40, 80);
        doc.text(`Emitido em: ${metadata.date}`, 40, 95);
        doc.text(`Preparado por: ${metadata.preparedBy}`, 40, 110);

        const addTable = (
            title: string,
            head: string[],
            body: (string | number)[][]
        ) => {
            const startY = docAny.lastAutoTable ? docAny.lastAutoTable.finalY + 30 : 140;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(title, 40, startY - 10);
            doc.setFont('helvetica', 'normal');

            docAny.autoTable({
                startY,
                head: [head],
                body,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 4 },
                headStyles: { fillColor: [245, 247, 250], textColor: 33, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 160 },
                },
                didDrawPage: (data: any) => {
                    const pageSize = doc.internal.pageSize;
                    const pageWidth = pageSize.getWidth();
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(
                        `Página ${doc.getNumberOfPages()}`,
                        pageWidth - 80,
                        pageSize.getHeight() - 20
                    );
                },
            });
        };

        addTable(
            'Vendas',
            ['Cliente', 'Cidade', 'Unidade', 'Produto', 'Qtd.', 'Total', 'P. Unitário'],
            [
                ...sales.map((sale) => [
                    sale.client,
                    sale.city,
                    sale.unit,
                    sale.product,
                    sale.quantity,
                    formatCurrency(sale.total),
                    formatCurrency(sale.unitPrice),
                ]),
                [
                    'Total Geral',
                    '',
                    '',
                    '',
                    totalQuantity,
                    formatCurrency(totalSales),
                    formatCurrency(averageTicket),
                ],
            ]
        );

        addTable(
            'Produtos',
            ['Produto', 'Quantidade', 'P. Médio', 'Total'],
            productSummary.map((item) => [
                item.product,
                item.quantity,
                formatCurrency(item.averagePrice),
                formatCurrency(item.total),
            ])
        );

        const financeBody = paymentBreakdown.map((item) => {
            const percentage = paymentTotal ? (item.amount / paymentTotal) * 100 : 0;
            return [
                item.method,
                item.quantity,
                formatCurrency(item.amount),
                `${percentage.toFixed(1)}%`,
            ];
        });
        financeBody.push([
            'Total',
            paymentBreakdown.reduce((sum, item) => sum + item.quantity, 0),
            formatCurrency(paymentTotal),
            '100%',
        ]);
        addTable('Financeiro', ['Forma', 'Quantidade', 'Total', '%'], financeBody);

        const receivementRows = (receivements.length
            ? receivements
            : [
                {
                    code: '-',
                    client: 'Sem recebimentos no período',
                    method: '-',
                    document: '-',
                    amount: 0,
                    received: 0,
                },
            ]).map((item) => [
                item.code,
                item.client,
                item.method,
                item.document,
                formatCurrency(item.amount),
                formatCurrency(item.received ?? item.amount),
            ]);
        if (receivements.length) {
            const receivedSum = receivements.reduce(
                (sum, item) => sum + (item.received ?? item.amount),
                0
            );
            const billedSum = receivements.reduce((sum, item) => sum + item.amount, 0);
            receivementRows.push([
                'Total',
                '',
                '',
                '',
                formatCurrency(billedSum),
                formatCurrency(receivedSum),
            ]);
        }
        addTable(
            'Recebimentos',
            ['Código', 'Cliente', 'Forma', 'Documento', 'Valor', 'Recebido'],
            receivementRows
        );



        const summaryQty = receivementSummary.reduce((sum, item) => sum + item.quantity, 0);
        const summaryValue = receivementSummary.reduce((sum, item) => sum + item.amount, 0);
        const summaryRows = receivementSummary.map((item) => [
            item.method,
            item.quantity,
            formatCurrency(item.amount),
        ]);
        summaryRows.push(['Total', summaryQty, formatCurrency(summaryValue)]);
        addTable('Resumo dos Recebimentos', ['Forma', 'Quantidade', 'Total'], summaryRows);

        addTable(
            'Despesas (Todas as Unidades)',
            ['Cedente', 'Vencimento', 'Documento', 'Valor'],
            [
                ...expenses.map((expense) => [
                    expense.provider,
                    expense.dueDate,
                    expense.document,
                    formatCurrency(expense.amount),
                ]),
                ['Total Geral', '', '', formatCurrency(totalExpenses)],
            ]
        );

        const generalQty = generalDetail.reduce((sum, item) => sum + item.quantity, 0);
        const generalValue = generalDetail.reduce((sum, item) => sum + item.amount, 0);
        const generalRows = generalDetail.map((item) => [
            item.method,
            item.quantity,
            formatCurrency(item.amount),
        ]);
        generalRows.push(['Total', generalQty, formatCurrency(generalValue)]);
        addTable('Detalhamento Geral', ['Forma', 'Quantidade', 'Total'], generalRows);

        doc.save(`relatorio-detalhado-${metadata.date.replace(/\//g, '-')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Relatório Detalhado</p>
                    <h1 className="text-3xl font-bold text-gray-800">Vendas Consolidadas</h1>
                    <p className="text-sm text-gray-500">
                        {appliedPeriod} · Unidade {metadata.unit} · {metadata.city}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" icon="fa-solid fa-print" onClick={() => window.print()}>
                        Imprimir
                    </Button>
                    <Button
                        variant="primary"
                        icon="fa-solid fa-file-pdf"
                        onClick={handleDownloadPdf}
                        disabled={loading || !reportData}
                    >
                        Exportar PDF
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Data inicial</label>
                        <input
                            type="date"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                            value={startDate}
                            max={endDate}
                            onChange={(event) => setStartDate(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Data final</label>
                        <input
                            type="date"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                            value={endDate}
                            min={startDate}
                            onChange={(event) => setEndDate(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Tipo de Pagamento</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white"
                            value={paymentMethodFilter}
                            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        >
                            {paymentMethods.map(method => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col justify-center">
                        <p className="text-xs uppercase text-gray-500">Período aplicado</p>
                        <p className="text-sm font-semibold text-gray-800">{appliedPeriod}</p>
                    </div>
                    <div className="flex flex-col justify-center items-start md:items-end text-sm">
                        {loading ? (
                            <span className="flex items-center gap-2 text-gray-500">
                                <i className="fa-solid fa-spinner fa-spin" />
                                Atualizando dados...
                            </span>
                        ) : (
                            <span className="text-gray-500">Última atualização em {metadata.date}</span>
                        )}
                    </div>
                </div>
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <p className="text-sm text-gray-500">💰 Faturamento Bruto</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalSales)}</p>
                    <p className="text-xs text-gray-400 mt-1">Valor total das vendas</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <p className="text-sm text-gray-500">📦 Quantidade Total</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalQuantity} un</p>
                    <p className="text-xs text-gray-400 mt-1">Período: {appliedPeriod}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <p className="text-sm text-gray-500">💸 Despesas (Pedidos)</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">- {formatCurrency(orderExpensesTotal)}</p>
                    <p className="text-xs text-gray-400 mt-1">Frete, combustível, etc.</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200 bg-green-50">
                    <p className="text-sm text-gray-500">✅ Valor Líquido</p>
                    <p className={`text-2xl font-bold mt-1 ${netValue >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatCurrency(netValue)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Faturamento - Despesas</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <p className="text-sm text-gray-500">📊 Ticket Médio</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(averageTicket)}</p>
                    <p className="text-xs text-gray-400 mt-1">Por unidade vendida</p>
                </div>
            </div>

            <section className="bg-white rounded-xl shadow-sm border">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">Vendas Detalhadas</h2>
                    <span className="text-sm text-gray-500">Total de registros: {sales.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Cliente</th>
                                <th className="px-4 py-3 text-left">Cidade</th>
                                <th className="px-4 py-3 text-left">Unidade</th>
                                <th className="px-4 py-3 text-left">Produto</th>
                                <th className="px-4 py-3 text-right">Qtd</th>
                                <th className="px-4 py-3 text-right">Valor Bruto</th>
                                <th className="px-4 py-3 text-right">Despesas</th>
                                <th className="px-4 py-3 text-right">Valor Líquido</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-3 text-center text-gray-500">
                                        Nenhuma venda registrada no período selecionado.
                                    </td>
                                </tr>
                            )}
                            {sales.map((sale, index) => {
                                const saleExpenses = (sale as any).expenses || 0;
                                const saleNetValue = sale.total - saleExpenses;
                                return (
                                    <tr key={`${sale.client}-${index}`} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{sale.client}</td>
                                        <td className="px-4 py-3">{sale.city}</td>
                                        <td className="px-4 py-3">{sale.unit}</td>
                                        <td className="px-4 py-3">{sale.product}</td>
                                        <td className="px-4 py-3 text-right">{sale.quantity}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                                            {formatCurrency(sale.total)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600">
                                            {saleExpenses > 0 ? `- ${formatCurrency(saleExpenses)}` : '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${saleNetValue >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                                            {formatCurrency(saleNetValue)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sales.length > 0 && (
                                <tr className="bg-gray-50 font-semibold text-gray-800">
                                    <td className="px-4 py-3" colSpan={4}>Total Geral</td>
                                    <td className="px-4 py-3 text-right">{totalQuantity}</td>
                                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totalSales)}</td>
                                    <td className="px-4 py-3 text-right text-red-600">
                                        {orderExpensesTotal > 0 ? `- ${formatCurrency(orderExpensesTotal)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(netValue)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">Produtos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Produto</th>
                                    <th className="px-4 py-3 text-right">Quantidade</th>
                                    <th className="px-4 py-3 text-right">Preço Unit.</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productSummary.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                                            Sem dados de produtos para o período selecionado.
                                        </td>
                                    </tr>
                                )}
                                {productSummary.map((item) => (
                                    <tr key={item.product} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{item.product}</td>
                                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.averagePrice)}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">Financeiro</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Forma</th>
                                    <th className="px-4 py-3 text-right">Quantidade</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                                            Não há registros financeiros neste período.
                                        </td>
                                    </tr>
                                )}
                                {paymentBreakdown.map((item) => {
                                    const percentage = paymentTotal ? (item.amount / paymentTotal) * 100 : 0;
                                    return (
                                        <tr key={item.method} className="border-b last:border-b-0">
                                            <td className="px-4 py-3 font-medium text-gray-800">{item.method}</td>
                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.amount)}</td>
                                            <td className="px-4 py-3 text-right">{percentage.toFixed(1)}%</td>
                                        </tr>
                                    );
                                })}
                                {paymentBreakdown.length > 0 && (
                                    <tr className="bg-gray-50 font-semibold text-gray-800">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3 text-right">{paymentBreakdown.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(paymentTotal)}</td>
                                        <td className="px-4 py-3 text-right">100%</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">Recebimentos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Cod.</th>
                                    <th className="px-4 py-3 text-left">Cliente</th>
                                    <th className="px-4 py-3 text-left">Forma</th>
                                    <th className="px-4 py-3 text-left">Documento</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-right">Recebido</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceivements.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-3 text-center text-gray-500">
                                            Nenhum recebimento registrado no período.
                                        </td>
                                    </tr>
                                )}
                                {filteredReceivements.map((item) => (
                                    <tr key={item.code} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{item.code}</td>
                                        <td className="px-4 py-3">{item.client}</td>
                                        <td className="px-4 py-3">{item.method}</td>
                                        <td className="px-4 py-3">{item.document}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.received ?? item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">Resumo dos Recebimentos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Forma</th>
                                    <th className="px-4 py-3 text-right">Quantidade</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceivementSummary.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                                            Nenhum recebimento consolidado no período.
                                        </td>
                                    </tr>
                                )}
                                {filteredReceivementSummary.map((item) => (
                                    <tr key={item.method} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{item.method}</td>
                                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                                {filteredReceivementSummary.length > 0 && (
                                    <tr className="bg-gray-50 font-semibold text-gray-800">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3 text-right">{filteredReceivementSummary.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(filteredReceivementSummary.reduce((sum, item) => sum + item.amount, 0))}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">Despesas (Todas as Unidades)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Cedente</th>
                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                    <th className="px-4 py-3 text-left">Documento</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                                            Nenhuma despesa registrada no período.
                                        </td>
                                    </tr>
                                )}
                                {expenses.map((expense, index) => (
                                    <tr key={`${expense.document}-${index}`} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{expense.provider}</td>
                                        <td className="px-4 py-3">{expense.dueDate}</td>
                                        <td className="px-4 py-3">{expense.document}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(expense.amount)}</td>
                                    </tr>
                                ))}
                                {expenses.length > 0 && (
                                    <tr className="bg-gray-50 font-semibold text-gray-800">
                                        <td className="px-4 py-3" colSpan={3}>Total Geral</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(totalExpenses)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section className="bg-white rounded-xl shadow-sm border mb-8">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">Detalhamento Geral</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Forma</th>
                                <th className="px-4 py-3 text-right">Quantidade</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {generalDetail.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                                        Sem registros no período selecionado.
                                    </td>
                                </tr>
                            )}
                            {generalDetail.map((item) => (
                                <tr key={item.method} className="border-b last:border-b-0">
                                    <td className="px-4 py-3 font-medium text-gray-800">{item.method}</td>
                                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                            {generalDetail.length > 0 && (
                                <tr className="bg-gray-50 font-semibold text-gray-800">
                                    <td className="px-4 py-3">Total</td>
                                    <td className="px-4 py-3 text-right">{generalDetail.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(generalDetail.reduce((sum, item) => sum + item.amount, 0))}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Seção de Estoque */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Estoque Líquido (Botijões Cheios) */}
                <section className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b bg-green-50">
                        <h2 className="text-lg font-semibold text-green-700 uppercase tracking-wide">
                            🟢 Estoque Líquido (Cheios)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Produto</th>
                                    <th className="px-4 py-3 text-left">Unidade</th>
                                    <th className="px-4 py-3 text-right">Quantidade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {liquidStock.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                                            Nenhum estoque líquido disponível.
                                        </td>
                                    </tr>
                                )}
                                {liquidStock.map((item: any, index: number) => (
                                    <tr key={`liquid-${index}`} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{item.product}</td>
                                        <td className="px-4 py-3">{item.location}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                                            {item.quantity}
                                        </td>
                                    </tr>
                                ))}
                                {liquidStock.length > 0 && (
                                    <tr className="bg-green-50 font-semibold text-green-800">
                                        <td className="px-4 py-3" colSpan={2}>Total</td>
                                        <td className="px-4 py-3 text-right">
                                            {liquidStock.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Estoque de Vasilhame (Vazios e Manutenção) */}
                <section className="bg-white rounded-xl shadow-sm border">
                    <div className="px-6 py-4 border-b bg-orange-50">
                        <h2 className="text-lg font-semibold text-orange-700 uppercase tracking-wide">
                            🟠 Estoque de Vasilhame
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Produto</th>
                                    <th className="px-4 py-3 text-left">Unidade</th>
                                    <th className="px-4 py-3 text-right">Vazios</th>
                                    <th className="px-4 py-3 text-right">Manutenção</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {containerStock.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                                            Nenhum vasilhame em estoque.
                                        </td>
                                    </tr>
                                )}
                                {containerStock.map((item: any, index: number) => (
                                    <tr key={`container-${index}`} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{item.product}</td>
                                        <td className="px-4 py-3">{item.location}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{item.empty}</td>
                                        <td className="px-4 py-3 text-right text-yellow-600">{item.maintenance}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-orange-600">
                                            {item.total}
                                        </td>
                                    </tr>
                                ))}
                                {containerStock.length > 0 && (
                                    <tr className="bg-orange-50 font-semibold text-orange-800">
                                        <td className="px-4 py-3" colSpan={2}>Total</td>
                                        <td className="px-4 py-3 text-right">
                                            {containerStock.reduce((sum: number, item: any) => sum + item.empty, 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {containerStock.reduce((sum: number, item: any) => sum + item.maintenance, 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {containerStock.reduce((sum: number, item: any) => sum + item.total, 0)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default RelatorioDetalhado;
