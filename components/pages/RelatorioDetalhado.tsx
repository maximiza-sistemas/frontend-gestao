import React, { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import api from '../../services/api';
import { DetailedReportData } from '../../types';
import { useClients } from '../../hooks/useClients';

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
    const [clientFilter, setClientFilter] = useState('Todos');
    const [reportData, setReportData] = useState<DetailedReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hook para buscar clientes
    const { clients } = useClients();

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

    // Obter lista única de métodos de pagamento para o filtro
    const paymentMethods = useMemo(() => {
        const methods = new Set<string>();
        receivementSummary.forEach(item => methods.add(item.method));
        paymentBreakdown.forEach(item => methods.add(item.method));
        return ['Todos', ...Array.from(methods).sort()];
    }, [receivementSummary, paymentBreakdown]);

    // Filtrar vendas por cliente (case-insensitive e trim)
    const filteredSales = useMemo(() => {
        if (clientFilter === 'Todos') return sales;
        const filterLower = clientFilter.toLowerCase().trim();
        return sales.filter(sale => {
            const saleClient = (sale.client || '').toLowerCase().trim();
            return saleClient === filterLower || saleClient.includes(filterLower) || filterLower.includes(saleClient);
        });
    }, [sales, clientFilter]);

    // Filtrar recebimentos por método de pagamento e cliente (case-insensitive)
    const filteredReceivements = useMemo(() => {
        let filtered = receivements;
        if (paymentMethodFilter !== 'Todos') {
            filtered = filtered.filter(item => item.method === paymentMethodFilter);
        }
        if (clientFilter !== 'Todos') {
            const filterLower = clientFilter.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const recClient = (item.client || '').toLowerCase().trim();
                return recClient === filterLower || recClient.includes(filterLower) || filterLower.includes(recClient);
            });
        }
        return filtered;
    }, [receivements, paymentMethodFilter, clientFilter]);

    const filteredReceivementSummary = useMemo(() => {
        if (paymentMethodFilter === 'Todos') return receivementSummary;
        return receivementSummary.filter(item => item.method === paymentMethodFilter);
    }, [receivementSummary, paymentMethodFilter]);

    // Calcular resumo de produtos baseado nas vendas filtradas (por cliente)
    const filteredProductSummary = useMemo(() => {
        if (clientFilter === 'Todos') return productSummary;
        // Reagrupar produtos das vendas filtradas
        const productMap = new Map<string, { quantity: number; total: number }>();
        filteredSales.forEach(sale => {
            const existing = productMap.get(sale.product) || { quantity: 0, total: 0 };
            productMap.set(sale.product, {
                quantity: existing.quantity + sale.quantity,
                total: existing.total + sale.total
            });
        });
        return Array.from(productMap.entries()).map(([product, data]) => ({
            product,
            quantity: data.quantity,
            averagePrice: data.quantity > 0 ? data.total / data.quantity : 0,
            total: data.total
        }));
    }, [productSummary, filteredSales, clientFilter]);

    // Calcular breakdown de pagamentos baseado nas vendas filtradas (por cliente)
    const filteredPaymentBreakdown = useMemo(() => {
        if (clientFilter === 'Todos') return paymentBreakdown;
        // Reagrupar métodos de pagamento das vendas filtradas
        const methodMap = new Map<string, { quantity: number; amount: number }>();
        filteredSales.forEach(sale => {
            const method = sale.paymentMethod || 'Outros';
            const existing = methodMap.get(method) || { quantity: 0, amount: 0 };
            methodMap.set(method, {
                quantity: existing.quantity + 1,
                amount: existing.amount + sale.total
            });
        });
        const totalAmount = Array.from(methodMap.values()).reduce((sum, v) => sum + v.amount, 0);
        return Array.from(methodMap.entries()).map(([method, data]) => ({
            method,
            quantity: data.quantity,
            amount: data.amount,
            percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
        }));
    }, [paymentBreakdown, filteredSales, clientFilter]);

    // Filtrar detalhamento geral baseado no cliente
    const filteredGeneralDetail = useMemo(() => {
        if (clientFilter === 'Todos') return generalDetail;
        return filteredPaymentBreakdown;
    }, [generalDetail, filteredPaymentBreakdown, clientFilter]);

    // Recalcular resumo de recebimentos filtrado por cliente
    const filteredReceivementSummaryByClient = useMemo(() => {
        if (clientFilter === 'Todos') return filteredReceivementSummary;
        // Reagrupar métodos dos recebimentos filtrados
        const methodMap = new Map<string, { quantity: number; amount: number }>();
        filteredReceivements.forEach(item => {
            const existing = methodMap.get(item.method) || { quantity: 0, amount: 0 };
            methodMap.set(item.method, {
                quantity: existing.quantity + 1,
                amount: existing.amount + item.amount
            });
        });
        return Array.from(methodMap.entries()).map(([method, data]) => ({
            method,
            quantity: data.quantity,
            amount: data.amount
        }));
    }, [filteredReceivementSummary, filteredReceivements, clientFilter]);

    const totalSales = useMemo(
        () => filteredSales.reduce((sum, sale) => sum + sale.total, 0),
        [filteredSales]
    );
    const totalQuantity = useMemo(
        () => filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
        [filteredSales]
    );
    const averageTicket = totalQuantity ? totalSales / totalQuantity : 0;
    const paymentTotal = useMemo(
        () => filteredPaymentBreakdown.reduce((sum, item) => sum + item.amount, 0),
        [filteredPaymentBreakdown]
    );
    const totalExpenses = useMemo(
        () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
        [expenses]
    );

    // Novas métricas: Despesas por pedido e Valor Líquido
    const orderExpensesTotal = useMemo(
        () => filteredSales.reduce((sum, sale) => sum + ((sale as any).expenses || 0), 0),
        [filteredSales]
    );
    const netValue = totalSales - orderExpensesTotal;

    // Nome do cliente selecionado para exibição
    const selectedClientName = clientFilter !== 'Todos' ? clientFilter : null;

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
            ['Cliente', 'Cidade', 'Produto', 'Data', 'Situação', 'Qtd.', 'Total', 'P. Unitário'],
            [
                ...sales.map((sale) => [
                    sale.client,
                    sale.city,
                    sale.product,
                    sale.date ? formatPtDate(sale.date) : '-',
                    (sale as any).paymentStatus || 'Pendente',
                    sale.quantity,
                    formatCurrency(sale.total),
                    formatCurrency(sale.unitPrice),
                ]),
                [
                    'Total Geral',
                    '',
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

    const handlePrint = () => {
        if (!reportData) {
            window.alert('Gere o relatório antes de imprimir.');
            return;
        }

        // Criar HTML para impressão
        const printContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Relatório Detalhado - ${appliedPeriod}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, Helvetica, sans-serif; 
                        font-size: 11px; 
                        line-height: 1.4;
                        color: #333;
                        padding: 20px;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 20px; 
                        border-bottom: 2px solid #333;
                        padding-bottom: 15px;
                    }
                    .header h1 { font-size: 18px; margin-bottom: 8px; }
                    .header p { font-size: 11px; color: #666; margin: 3px 0; }
                    .summary-cards {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                        gap: 10px;
                    }
                    .summary-card {
                        flex: 1;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        text-align: center;
                    }
                    .summary-card .label { font-size: 9px; color: #666; text-transform: uppercase; }
                    .summary-card .value { font-size: 14px; font-weight: bold; margin-top: 4px; }
                    .summary-card .value.green { color: #16a34a; }
                    .summary-card .value.red { color: #dc2626; }
                    section { margin-bottom: 20px; page-break-inside: avoid; }
                    section h2 { 
                        font-size: 12px; 
                        text-transform: uppercase; 
                        background: #f5f5f5;
                        padding: 8px 10px;
                        border-left: 4px solid #f97316;
                        margin-bottom: 8px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 10px;
                    }
                    th { 
                        background: #f5f7fa; 
                        padding: 6px 8px; 
                        text-align: left; 
                        font-weight: 600;
                        border-bottom: 2px solid #ddd;
                        text-transform: uppercase;
                        font-size: 9px;
                    }
                    th.right, td.right { text-align: right; }
                    td { 
                        padding: 6px 8px; 
                        border-bottom: 1px solid #eee; 
                    }
                    tr.total { 
                        background: #f5f7fa; 
                        font-weight: bold; 
                    }
                    tr.total td { border-top: 2px solid #ddd; }
                    .green { color: #16a34a; }
                    .red { color: #dc2626; }
                    .orange { color: #ea580c; }
                    .footer {
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 9px;
                        color: #999;
                    }
                    @media print {
                        body { padding: 10px; }
                        .summary-cards { flex-wrap: wrap; }
                        .summary-card { min-width: 18%; }
                        section { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>RELATÓRIO DETALHADO DE VENDAS</h1>
                    <p><strong>Período:</strong> ${appliedPeriod}</p>
                    <p><strong>Unidade:</strong> ${metadata.unit} · ${metadata.city}</p>
                    <p><strong>Emitido em:</strong> ${metadata.date} | <strong>Preparado por:</strong> ${metadata.preparedBy}</p>
                    ${clientFilter !== 'Todos' ? `<p><strong>Cliente:</strong> ${clientFilter}</p>` : ''}
                    ${paymentMethodFilter !== 'Todos' ? `<p><strong>Pagamento:</strong> ${paymentMethodFilter}</p>` : ''}
                </div>

                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="label">💰 Faturamento Bruto</div>
                        <div class="value green">${formatCurrency(totalSales)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">📦 Quantidade Total</div>
                        <div class="value">${totalQuantity} un</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">💸 Despesas</div>
                        <div class="value red">- ${formatCurrency(orderExpensesTotal)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">✅ Valor Líquido</div>
                        <div class="value ${netValue >= 0 ? 'green' : 'red'}">${formatCurrency(netValue)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">📊 Ticket Médio</div>
                        <div class="value">${formatCurrency(averageTicket)}</div>
                    </div>
                </div>

                <section>
                    <h2>Vendas Detalhadas ${clientFilter !== 'Todos' ? `(${clientFilter})` : ''}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Cidade</th>
                                <th>Produto</th>
                                <th>Data</th>
                                <th>Situação</th>
                                <th class="right">Qtd</th>
                                <th class="right">Valor Bruto</th>
                                <th class="right">Despesas</th>
                                <th class="right">Valor Líquido</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredSales.length === 0 ? '<tr><td colspan="9" style="text-align:center;color:#999;">Nenhuma venda no período.</td></tr>' : ''}
                            ${filteredSales.map(sale => {
            const saleExp = (sale as any).expenses || 0;
            const saleNet = sale.total - saleExp;
            const paymentStatusClass = (sale as any).paymentStatus === 'Pago' ? 'green' : (sale as any).paymentStatus === 'Vencido' ? 'red' : 'orange';
            return `<tr>
                                    <td>${sale.client}</td>
                                    <td>${sale.city}</td>
                                    <td>${sale.product}</td>
                                    <td>${sale.date ? formatPtDate(sale.date) : '-'}</td>
                                    <td class="${paymentStatusClass}">${(sale as any).paymentStatus || 'Pendente'}</td>
                                    <td class="right">${sale.quantity}</td>
                                    <td class="right green">${formatCurrency(sale.total)}</td>
                                    <td class="right red">${saleExp > 0 ? '- ' + formatCurrency(saleExp) : '-'}</td>
                                    <td class="right">${formatCurrency(saleNet)}</td>
                                </tr>`;
        }).join('')}
                            ${filteredSales.length > 0 ? `<tr class="total">
                                <td colspan="5">Total Geral</td>
                                <td class="right">${totalQuantity}</td>
                                <td class="right green">${formatCurrency(totalSales)}</td>
                                <td class="right red">${orderExpensesTotal > 0 ? '- ' + formatCurrency(orderExpensesTotal) : '-'}</td>
                                <td class="right">${formatCurrency(netValue)}</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Produtos</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th class="right">Quantidade</th>
                                <th class="right">Preço Unit.</th>
                                <th class="right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredProductSummary.map(item => `<tr>
                                <td>${item.product}</td>
                                <td class="right">${item.quantity}</td>
                                <td class="right">${formatCurrency(item.averagePrice)}</td>
                                <td class="right">${formatCurrency(item.total)}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Financeiro</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Forma</th>
                                <th class="right">Quantidade</th>
                                <th class="right">Total</th>
                                <th class="right">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredPaymentBreakdown.map(item => {
            const pct = paymentTotal ? (item.amount / paymentTotal) * 100 : 0;
            return `<tr>
                                    <td>${item.method}</td>
                                    <td class="right">${item.quantity}</td>
                                    <td class="right">${formatCurrency(item.amount)}</td>
                                    <td class="right">${pct.toFixed(1)}%</td>
                                </tr>`;
        }).join('')}
                            ${filteredPaymentBreakdown.length > 0 ? `<tr class="total">
                                <td>Total</td>
                                <td class="right">${filteredPaymentBreakdown.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                <td class="right">${formatCurrency(paymentTotal)}</td>
                                <td class="right">100%</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Recebimentos ${paymentMethodFilter !== 'Todos' ? `(${paymentMethodFilter})` : ''}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Cliente</th>
                                <th>Forma</th>
                                <th>Documento</th>
                                <th class="right">Valor</th>
                                <th class="right">Recebido</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredReceivements.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhum recebimento no período.</td></tr>' : ''}
                            ${filteredReceivements.map(item => `<tr>
                                <td>${item.code}</td>
                                <td>${item.client}</td>
                                <td>${item.method}</td>
                                <td>${item.document}</td>
                                <td class="right">${formatCurrency(item.amount)}</td>
                                <td class="right">${formatCurrency(item.received ?? item.amount)}</td>
                            </tr>`).join('')}
                            ${filteredReceivements.length > 0 ? `<tr class="total">
                                <td colspan="4">Total</td>
                                <td class="right">${formatCurrency(filteredReceivements.reduce((sum, item) => sum + item.amount, 0))}</td>
                                <td class="right">${formatCurrency(filteredReceivements.reduce((sum, item) => sum + (item.received ?? item.amount), 0))}</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Resumo dos Recebimentos ${paymentMethodFilter !== 'Todos' ? `(${paymentMethodFilter})` : ''}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Forma</th>
                                <th class="right">Quantidade</th>
                                <th class="right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredReceivementSummaryByClient.map(item => `<tr>
                                <td>${item.method}</td>
                                <td class="right">${item.quantity}</td>
                                <td class="right">${formatCurrency(item.amount)}</td>
                            </tr>`).join('')}
                            ${filteredReceivementSummaryByClient.length > 0 ? `<tr class="total">
                                <td>Total</td>
                                <td class="right">${filteredReceivementSummaryByClient.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                <td class="right">${formatCurrency(filteredReceivementSummaryByClient.reduce((sum, item) => sum + item.amount, 0))}</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Despesas (Todas as Unidades)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Cedente</th>
                                <th>Vencimento</th>
                                <th>Documento</th>
                                <th class="right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;">Nenhuma despesa no período.</td></tr>' : ''}
                            ${expenses.map(expense => `<tr>
                                <td>${expense.provider}</td>
                                <td>${expense.dueDate}</td>
                                <td>${expense.document}</td>
                                <td class="right">${formatCurrency(expense.amount)}</td>
                            </tr>`).join('')}
                            ${expenses.length > 0 ? `<tr class="total">
                                <td colspan="3">Total Geral</td>
                                <td class="right">${formatCurrency(totalExpenses)}</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Detalhamento Geral</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Forma</th>
                                <th class="right">Quantidade</th>
                                <th class="right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredGeneralDetail.map(item => `<tr>
                                <td>${item.method}</td>
                                <td class="right">${item.quantity}</td>
                                <td class="right">${formatCurrency(item.amount)}</td>
                            </tr>`).join('')}
                            ${filteredGeneralDetail.length > 0 ? `<tr class="total">
                                <td>Total</td>
                                <td class="right">${filteredGeneralDetail.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                <td class="right">${formatCurrency(filteredGeneralDetail.reduce((sum, item) => sum + item.amount, 0))}</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                </section>

                <div class="footer">
                    <p>SISGÁS - Sistema de Gestão de Distribuidora de Gás</p>
                    <p>Relatório gerado em ${metadata.date}</p>
                </div>
            </body>
            </html>
        `;

        // Criar nova janela e imprimir
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            // Aguardar carregamento antes de imprimir
            setTimeout(() => {
                printWindow.print();
            }, 250);
        } else {
            window.alert('Não foi possível abrir a janela de impressão. Verifique se pop-ups estão habilitados.');
        }
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
                    <Button variant="secondary" icon="fa-solid fa-print" onClick={handlePrint} disabled={loading || !reportData}>
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Cliente</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white"
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                        >
                            <option value="Todos">Todos os Clientes</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.name}>{client.name}</option>
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
                    <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">
                        Vendas Detalhadas {clientFilter !== 'Todos' && <span className="text-orange-600">({clientFilter})</span>}
                    </h2>
                    <span className="text-sm text-gray-500">Total de registros: {filteredSales.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Cliente</th>
                                <th className="px-4 py-3 text-left">Cidade</th>
                                <th className="px-4 py-3 text-left">Produto</th>
                                <th className="px-4 py-3 text-left">Data</th>
                                <th className="px-4 py-3 text-left">Situação</th>
                                <th className="px-4 py-3 text-right">Qtd</th>
                                <th className="px-4 py-3 text-right">Valor Bruto</th>
                                <th className="px-4 py-3 text-right">Despesas</th>
                                <th className="px-4 py-3 text-right">Valor Líquido</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-3 text-center text-gray-500">
                                        Nenhuma venda registrada no período selecionado.
                                    </td>
                                </tr>
                            )}
                            {filteredSales.map((sale, index) => {
                                const saleExpenses = (sale as any).expenses || 0;
                                const saleNetValue = sale.total - saleExpenses;
                                const paymentStatus = (sale as any).paymentStatus || 'Pendente';
                                const paymentStatusClass = paymentStatus === 'Pago' ? 'text-green-600' : paymentStatus === 'Vencido' ? 'text-red-600' : 'text-orange-600';
                                return (
                                    <tr key={`${sale.client}-${index}`} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{sale.client}</td>
                                        <td className="px-4 py-3">{sale.city}</td>
                                        <td className="px-4 py-3">{sale.product}</td>
                                        <td className="px-4 py-3">{sale.date ? formatPtDate(sale.date) : '-'}</td>
                                        <td className={`px-4 py-3 font-medium ${paymentStatusClass}`}>{paymentStatus}</td>
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
                            {filteredSales.length > 0 && (
                                <tr className="bg-gray-50 font-semibold text-gray-800">
                                    <td className="px-4 py-3" colSpan={5}>Total Geral</td>
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
                                {filteredProductSummary.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                                            Sem dados de produtos para o período selecionado.
                                        </td>
                                    </tr>
                                )}
                                {filteredProductSummary.map((item) => (
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
                                {filteredPaymentBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                                            Não há registros financeiros neste período.
                                        </td>
                                    </tr>
                                )}
                                {filteredPaymentBreakdown.map((item) => {
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
                                {filteredPaymentBreakdown.length > 0 && (
                                    <tr className="bg-gray-50 font-semibold text-gray-800">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3 text-right">{filteredPaymentBreakdown.reduce((sum, item) => sum + item.quantity, 0)}</td>
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
                                {filteredReceivementSummaryByClient.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                                            Nenhum recebimento consolidado no período.
                                        </td>
                                    </tr>
                                )}
                                {filteredReceivementSummaryByClient.map((item) => (
                                    <tr key={item.method} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{item.method}</td>
                                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                                {filteredReceivementSummaryByClient.length > 0 && (
                                    <tr className="bg-gray-50 font-semibold text-gray-800">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3 text-right">{filteredReceivementSummaryByClient.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(filteredReceivementSummaryByClient.reduce((sum, item) => sum + item.amount, 0))}</td>
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
                            {filteredGeneralDetail.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                                        Sem registros no período selecionado.
                                    </td>
                                </tr>
                            )}
                            {filteredGeneralDetail.map((item) => (
                                <tr key={item.method} className="border-b last:border-b-0">
                                    <td className="px-4 py-3 font-medium text-gray-800">{item.method}</td>
                                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                            {filteredGeneralDetail.length > 0 && (
                                <tr className="bg-gray-50 font-semibold text-gray-800">
                                    <td className="px-4 py-3">Total</td>
                                    <td className="px-4 py-3 text-right">{filteredGeneralDetail.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(filteredGeneralDetail.reduce((sum, item) => sum + item.amount, 0))}</td>
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
