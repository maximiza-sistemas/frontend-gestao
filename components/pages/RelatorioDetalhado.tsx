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

    // Função para obter valor pago real por item do pedido
    // Usa o paid_amount real do pedido, distribuído proporcionalmente entre os itens do mesmo pedido
    const getSalePaidAmount = (sale: any) => {
        const orderPaid = sale.orderPaidAmount ?? 0;
        const orderTotal = sale.orderTotalValue ?? 0;
        if (orderTotal <= 0) return 0;
        // Proporcional ao valor deste item dentro do pedido
        return (sale.total / orderTotal) * orderPaid;
    };

    // Novas métricas: Despesas por pedido, Compras e Valor Líquido
    const orderExpensesTotal = useMemo(
        () => filteredSales.reduce((sum, sale) => sum + ((sale as any).expenses || 0), 0),
        [filteredSales]
    );

    // Total de compras de botijões (preço × quantidade)
    const purchasesTotal = useMemo(
        () => (reportData as any)?.purchasesTotal ?? 0,
        [reportData]
    );


    // Total recebido (pagamentos realizados pelos clientes)
    const totalReceived = useMemo(
        () => filteredReceivements.reduce((sum, item) => sum + (item.received ?? item.amount), 0),
        [filteredReceivements]
    );

    // Total pago calculado a partir das vendas (usa paid_amount real do pedido)
    const totalPaidFromSales = useMemo(
        () => filteredSales.reduce((sum, sale) => sum + getSalePaidAmount(sale), 0),
        [filteredSales]
    );

    // Valores Vencidos (Pedidos a prazo vencidos e não pagos)
    const valoresVencidos = useMemo(() => {
        const todayIso = new Date().toISOString().split('T')[0];
        return filteredSales.reduce((sum, sale) => {
            if (sale.dueDate && sale.dueDate < todayIso && sale.paymentStatus !== 'Pago') {
                return sum + (sale.total - getSalePaidAmount(sale));
            }
            return sum;
        }, 0);
    }, [filteredSales]);

    // Saldo a Receber = Faturamento Bruto - Total Pago (baseado nas vendas)
    const saldoAReceber = totalSales - totalPaidFromSales;

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
        let pdfHeaderY = 110;
        if (clientFilter !== 'Todos') {
            pdfHeaderY += 15;
            doc.text(`Cliente: ${clientFilter}`, 40, pdfHeaderY);
        }
        if (paymentMethodFilter !== 'Todos') {
            pdfHeaderY += 15;
            doc.text(`Pagamento: ${paymentMethodFilter}`, 40, pdfHeaderY);
        }

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
            `Vendas${clientFilter !== 'Todos' ? ` (${clientFilter})` : ''}`,
            ['Cliente', 'Cidade', 'Produto', 'Data', 'Situação', 'Qtd.', 'Valor Bruto', 'Despesas', 'Valores Pagos'],
            [
                ...filteredSales.map((sale) => {
                    const saleExp = (sale as any).expenses || 0;
                    const salePaid = getSalePaidAmount(sale);
                    return [
                        sale.client,
                        sale.city,
                        sale.product,
                        sale.date ? formatPtDate(sale.date) : '-',
                        (sale as any).paymentStatus || 'Pendente',
                        sale.quantity,
                        formatCurrency(sale.total),
                        saleExp > 0 ? `- ${formatCurrency(saleExp)}` : '-',
                        formatCurrency(salePaid),
                    ];
                }),
                [
                    'Total Geral',
                    '',
                    '',
                    '',
                    '',
                    totalQuantity,
                    formatCurrency(totalSales),
                    orderExpensesTotal > 0 ? `- ${formatCurrency(orderExpensesTotal)}` : '-',
                    `${formatCurrency(totalPaidFromSales)} (Dif: ${formatCurrency(totalSales - totalPaidFromSales)})`,
                ],
            ]
        );

        addTable(
            'Produtos',
            ['Produto', 'Quantidade', 'P. Médio', 'Total'],
            filteredProductSummary.map((item) => [
                item.product,
                item.quantity,
                formatCurrency(item.averagePrice),
                formatCurrency(item.total),
            ])
        );

        const financeBody = filteredPaymentBreakdown.map((item) => {
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
            filteredPaymentBreakdown.reduce((sum, item) => sum + item.quantity, 0),
            formatCurrency(paymentTotal),
            '100%',
        ]);
        addTable('Financeiro', ['Forma', 'Quantidade', 'Total', '%'], financeBody);

        const receivementRows = (filteredReceivements.length
            ? filteredReceivements
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
        if (filteredReceivements.length) {
            const receivedSum = filteredReceivements.reduce(
                (sum, item) => sum + (item.received ?? item.amount),
                0
            );
            const billedSum = filteredReceivements.reduce((sum, item) => sum + item.amount, 0);
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
            `Recebimentos${paymentMethodFilter !== 'Todos' ? ` (${paymentMethodFilter})` : ''}`,
            ['Código', 'Cliente', 'Forma', 'Documento', 'Valor', 'Recebido'],
            receivementRows
        );


        const summaryQty = filteredReceivementSummaryByClient.reduce((sum, item) => sum + item.quantity, 0);
        const summaryValue = filteredReceivementSummaryByClient.reduce((sum, item) => sum + item.amount, 0);
        const summaryRows = filteredReceivementSummaryByClient.map((item) => [
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

        const generalQty = filteredGeneralDetail.reduce((sum, item) => sum + item.quantity, 0);
        const generalValue = filteredGeneralDetail.reduce((sum, item) => sum + item.amount, 0);
        const generalRows = filteredGeneralDetail.map((item) => [
            item.method,
            item.quantity,
            formatCurrency(item.amount),
        ]);
        generalRows.push(['Total', generalQty, formatCurrency(generalValue)]);
        addTable('Detalhamento Geral', ['Forma', 'Quantidade', 'Total'], generalRows);

        // Resumo Financeiro (KPIs)
        addTable(
            'Resumo Financeiro',
            ['Indicador', 'Valor'],
            [
                ['Faturamento Bruto', formatCurrency(totalSales)],
                ['Quantidade Total', `${totalQuantity} un`],
                ['Ticket Médio', formatCurrency(averageTicket)],
                ['Despesas (Pedidos)', `- ${formatCurrency(orderExpensesTotal)}`],
                ['Compras (Botijões)', `- ${formatCurrency(purchasesTotal)}`],
                ['Valores Pagos', formatCurrency(totalReceived)],
                ['Saldo a Receber', formatCurrency(saldoAReceber)],
            ]
        );

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
                        <div class="label">💵 Valores Pagos</div>
                        <div class="value green">${formatCurrency(totalReceived)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">⏳ Saldo a Receber</div>
                        <div class="value ${saldoAReceber > 0 ? 'orange' : 'green'}">${formatCurrency(saldoAReceber)}</div>
                    </div>

                    <div class="summary-card">
                        <div class="label">🚨 Valores Vencidos</div>
                        <div class="value ${valoresVencidos > 0 ? 'red' : 'green'}">${formatCurrency(valoresVencidos)}</div>
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
                                <th>Vencimento</th>
                                <th>Produto</th>
                                <th>Data</th>
                                <th>Situação</th>
                                <th class="right">Qtd</th>
                                <th class="right">Valor Bruto</th>
                                <th class="right">Despesas</th>
                                <th class="right">Valores Pagos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredSales.length === 0 ? '<tr><td colspan="9" style="text-align:center;color:#999;">Nenhuma venda no período.</td></tr>' : ''}
                            ${filteredSales.map(sale => {
            const saleExp = (sale as any).expenses || 0;
            const salePaid = getSalePaidAmount(sale);
            const paymentStatusClass = (sale as any).paymentStatus === 'Pago' ? 'green' : (sale as any).paymentStatus === 'Vencido' ? 'red' : 'orange';

            // Lógica de cores do vencimento
            let dueDateClass = '';
            let dueDateDisplay = '-';
            const todayIso = new Date().toISOString().split('T')[0];
            if (sale.dueDate) {
                dueDateDisplay = formatPtDate(sale.dueDate);
                if (sale.paymentStatus === 'Pago') {
                    dueDateClass = 'green';
                } else {
                    const diffTime = new Date(`${sale.dueDate}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) dueDateClass = 'red font-bold';
                    else if (diffDays <= 3) dueDateClass = 'orange font-bold';
                    else dueDateClass = 'green';
                }
            }

            return `<tr>
                                    <td>${sale.client}</td>
                                    <td class="${dueDateClass}">${dueDateDisplay}</td>
                                    <td>${sale.product}</td>
                                    <td>${sale.date ? formatPtDate(sale.date) : '-'}</td>
                                    <td class="${paymentStatusClass}">${(sale as any).paymentStatus || 'Pendente'}</td>
                                    <td class="right">${sale.quantity}</td>
                                    <td class="right green">${formatCurrency(sale.total)}</td>
                                    <td class="right red">${saleExp > 0 ? '- ' + formatCurrency(saleExp) : '-'}</td>
                                    <td class="right green">${formatCurrency(salePaid)}</td>
                                </tr>`;
        }).join('')}
                            ${filteredSales.length > 0 ? `<tr class="total">
                                <td colspan="5">Total Geral</td>
                                <td class="right">${totalQuantity}</td>
                                <td class="right green">${formatCurrency(totalSales)}</td>
                                <td class="right red">${orderExpensesTotal > 0 ? '- ' + formatCurrency(orderExpensesTotal) : '-'}</td>
                                <td class="right green">${formatCurrency(totalPaidFromSales)} <small class="${(totalSales - totalPaidFromSales) > 0 ? 'orange' : 'green'}">(Dif: ${formatCurrency(totalSales - totalPaidFromSales)})</small></td>
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

                <section>
                    <h2>Resumo Financeiro</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Indicador</th>
                                <th class="right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Faturamento Bruto</td><td class="right green">${formatCurrency(totalSales)}</td></tr>
                            <tr><td>Quantidade Total</td><td class="right">${totalQuantity} un</td></tr>
                            <tr><td>Ticket Médio</td><td class="right">${formatCurrency(averageTicket)}</td></tr>
                            <tr><td>Despesas (Pedidos)</td><td class="right red">- ${formatCurrency(orderExpensesTotal)}</td></tr>
                            <tr><td>Compras (Botijões)</td><td class="right red">- ${formatCurrency(purchasesTotal)}</td></tr>
                            <tr class="total"><td>Valores Pagos</td><td class="right green">${formatCurrency(totalReceived)}</td></tr>
                            <tr class="total"><td>Saldo a Receber</td><td class="right ${saldoAReceber > 0 ? 'orange' : 'green'}">${formatCurrency(saldoAReceber)}</td></tr>
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

            {/* Filtros - Layout reorganizado em duas linhas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                {/* Primeira linha: Período */}
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg flex-1">
                        <i className="fas fa-calendar text-gray-400"></i>
                        <input
                            type="date"
                            className="bg-transparent border-0 text-sm focus:ring-0 p-1 flex-1"
                            value={startDate}
                            max={endDate}
                            onChange={(event) => setStartDate(event.target.value)}
                        />
                        <span className="text-gray-400">→</span>
                        <input
                            type="date"
                            className="bg-transparent border-0 text-sm focus:ring-0 p-1 flex-1"
                            value={endDate}
                            min={startDate}
                            onChange={(event) => setEndDate(event.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        {loading ? (
                            <span className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                <i className="fa-solid fa-spinner fa-spin" />
                                Atualizando...
                            </span>
                        ) : (
                            <span className="text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                <i className="fas fa-check-circle text-green-500 mr-1"></i>
                                {appliedPeriod}
                            </span>
                        )}
                    </div>
                </div>

                {/* Segunda linha: Filtros Dropdown */}
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    >
                        {paymentMethods.map(method => (
                            <option key={method} value={method}>{method === 'Todos' ? 'Todos os Pagamentos' : method}</option>
                        ))}
                    </select>

                    <select
                        className="px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                    >
                        <option value="Todos">Todos os Clientes</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.name}>{client.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => { setPaymentMethodFilter('Todos'); setClientFilter('Todos'); }}
                        className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                    >
                        <i className="fas fa-times mr-1"></i>
                        Limpar
                    </button>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-3">
                        {error}
                    </div>
                )}
            </div>

            {/* KPIs - Layout Unificado em 4 colunas responsivas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* 1. Faturamento Bruto */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-emerald-500">
                        <i className="fas fa-coins text-xl text-white"></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Faturamento Bruto</p>
                    <p className="text-base md:text-lg font-bold text-emerald-600 leading-tight w-full truncate" title={formatCurrency(totalSales)}>{formatCurrency(totalSales)}</p>
                </div>

                {/* 2. Quantidade Total */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-blue-500">
                        <i className="fas fa-box text-xl text-white"></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Quantidade Total</p>
                    <p className="text-base md:text-lg font-bold text-gray-800 leading-tight w-full truncate" title={`${totalQuantity} un`}>{totalQuantity} un</p>
                </div>

                {/* 3. Ticket Médio */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-amber-500">
                        <i className="fas fa-chart-line text-xl text-white"></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ticket Médio</p>
                    <p className="text-base md:text-lg font-bold text-gray-800 leading-tight w-full truncate" title={formatCurrency(averageTicket)}>{formatCurrency(averageTicket)}</p>
                </div>

                {/* 4. Pagos */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-200 bg-blue-50 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-blue-500">
                        <i className="fas fa-hand-holding-usd text-xl text-white"></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pagos</p>
                    <p className="text-base md:text-lg font-bold text-blue-600 leading-tight w-full truncate" title={formatCurrency(totalReceived)}>{formatCurrency(totalReceived)}</p>
                </div>

                {/* 5. Saldo a Receber */}
                <div className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow ${saldoAReceber > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${saldoAReceber > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                        <i className={`fas ${saldoAReceber > 0 ? 'fa-clock' : 'fa-check-double'} text-xl text-white`}></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">A Receber</p>
                    <p className={`text-base md:text-lg font-bold leading-tight w-full truncate ${saldoAReceber > 0 ? 'text-amber-600' : 'text-emerald-600'}`} title={formatCurrency(saldoAReceber)}>
                        {formatCurrency(saldoAReceber)}
                    </p>
                </div>

                {/* 6. Vencidos */}
                <div className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow ${valoresVencidos > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${valoresVencidos > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                        <i className={`fas ${valoresVencidos > 0 ? 'fa-exclamation-circle' : 'fa-check-circle'} text-xl text-white`}></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Vencidos</p>
                    <p className={`text-base md:text-lg font-bold leading-tight w-full truncate ${valoresVencidos > 0 ? 'text-red-600' : 'text-emerald-600'}`} title={formatCurrency(valoresVencidos)}>
                        {formatCurrency(valoresVencidos)}
                    </p>
                </div>

                {/* 7. Compras */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-orange-500">
                        <i className="fas fa-shopping-cart text-xl text-white"></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Compras</p>
                    <p className="text-base md:text-lg font-bold text-orange-600 leading-tight w-full truncate" title={`- ${formatCurrency(purchasesTotal)}`}>- {formatCurrency(purchasesTotal)}</p>
                </div>

                {/* 8. Despesas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-rose-500">
                        <i className="fas fa-receipt text-xl text-white"></i>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Despesas</p>
                    <p className="text-base md:text-lg font-bold text-rose-600 leading-tight w-full truncate" title={`- ${formatCurrency(orderExpensesTotal)}`}>- {formatCurrency(orderExpensesTotal)}</p>
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
                                <th className="px-4 py-3 text-left">Vencimento</th>
                                <th className="px-4 py-3 text-left">Produto</th>
                                <th className="px-4 py-3 text-left">Data</th>
                                <th className="px-4 py-3 text-left">Situação</th>
                                <th className="px-4 py-3 text-right">Qtd</th>
                                <th className="px-4 py-3 text-right">Valor Bruto</th>
                                <th className="px-4 py-3 text-right">Despesas</th>
                                <th className="px-4 py-3 text-right">Valores Pagos</th>
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
                                const salePaid = getSalePaidAmount(sale);
                                const paymentStatus = (sale as any).paymentStatus || 'Pendente';
                                const paymentStatusClass = paymentStatus === 'Pago' ? 'text-green-600' : paymentStatus === 'Vencido' ? 'text-red-600' : 'text-orange-600';

                                // Lógica de cores do vencimento
                                let dueDateClass = 'text-gray-800';
                                let dueDateDisplay = '-';
                                const todayIso = new Date().toISOString().split('T')[0];
                                if (sale.dueDate) {
                                    dueDateDisplay = formatPtDate(sale.dueDate);
                                    if (sale.paymentStatus === 'Pago') {
                                        dueDateClass = 'text-green-600';
                                    } else {
                                        const diffTime = new Date(`${sale.dueDate}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        if (diffDays < 0) dueDateClass = 'text-red-600 font-bold';
                                        else if (diffDays <= 3) dueDateClass = 'text-orange-600 font-bold';
                                        else dueDateClass = 'text-green-600';
                                    }
                                }

                                return (
                                    <tr key={`${sale.client}-${index}`} className="border-b last:border-b-0">
                                        <td className="px-4 py-3 font-medium text-gray-800">{sale.client}</td>
                                        <td className={`px-4 py-3 ${dueDateClass}`}>{dueDateDisplay}</td>
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
                                        <td className="px-4 py-3 text-right text-green-600 font-semibold">
                                            {formatCurrency(salePaid)}
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
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-green-600">{formatCurrency(totalPaidFromSales)}</span>
                                        <span className={`ml-2 text-xs font-bold ${(totalSales - totalPaidFromSales) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            (Dif: {formatCurrency(totalSales - totalPaidFromSales)})
                                        </span>
                                    </td>
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
