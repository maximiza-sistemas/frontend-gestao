import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import Button from '../common/Button';

type StockType = 'liquido' | 'vasilhame';

interface ReportLine {
  product_id: number;
  product_name: string;
  weight_kg?: number;
  previous: number;
  entry: number;
  exit: number;
  current_stock?: number;
}

interface ReportUnit {
  unit_name: string;
  municipality: string;
  route_name: string;
  driver_name: string;
  helper_name: string;
}

interface ClientNote {
  client: string;
  note: string;
}

interface LocationOption {
  id: number;
  name: string;
  city?: string;
}

interface SavedReport {
  id: number;
  report_date: string;
  location_id: number | null;
  location_name?: string;
  user_name?: string;
  units: ReportUnit[];
  liquido: ReportLine[];
  vasilhame: ReportLine[];
  client_notes?: ClientNote[];
  notes?: string;
}

interface DailyStockReportProps {
  showMessage: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const emptyUnit = (): ReportUnit => ({
  unit_name: '',
  municipality: '',
  route_name: '',
  driver_name: '',
  helper_name: '',
});

const todayISO = () => new Date().toISOString().split('T')[0];

const toNumber = (value: string): number => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
};

const formatDateBR = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}.${m}.${y}`;
};

const lineTotal = (line: ReportLine) => line.previous + line.entry - line.exit;

const DailyStockReport: React.FC<DailyStockReportProps> = ({ showMessage }) => {
  const [reportDate, setReportDate] = useState(todayISO());
  const [locationId, setLocationId] = useState<string>(''); // '' = consolidado
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [units, setUnits] = useState<ReportUnit[]>([emptyUnit()]);
  const [liquido, setLiquido] = useState<ReportLine[]>([]);
  const [vasilhame, setVasilhame] = useState<ReportLine[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const selectedLocationName = useMemo(() => {
    if (!locationId) return '';
    return locations.find((l) => l.id === Number(locationId))?.name || '';
  }, [locationId, locations]);

  // Carregar unidades (filiais) e relatórios salvos
  const fetchSavedReports = useCallback(async () => {
    const res = await api.getDailyReports({ limit: 60 });
    if (res.success) {
      const parsed = (res.data || []).map((r: any) => ({
        ...r,
        units: typeof r.units === 'string' ? JSON.parse(r.units) : r.units || [],
        liquido: typeof r.liquido === 'string' ? JSON.parse(r.liquido) : r.liquido || [],
        vasilhame: typeof r.vasilhame === 'string' ? JSON.parse(r.vasilhame) : r.vasilhame || [],
        client_notes: typeof r.client_notes === 'string' ? JSON.parse(r.client_notes) : r.client_notes || [],
      }));
      setSavedReports(parsed);
    }
  }, []);

  useEffect(() => {
    api.getLocations().then((res) => {
      if (res.success) {
        setLocations((res.data || []).map((l: any) => ({ id: l.id, name: l.name, city: l.city })));
      }
    });
    api.getClients({ limit: 500 }).then((res) => {
      if (res.success) {
        const names = ((res.data as any[]) || [])
          .map((c: any) => c.name)
          .filter((n: any): n is string => typeof n === 'string' && n.trim().length > 0);
        setClientOptions(Array.from(new Set(names)).sort());
      }
    });
    fetchSavedReports();
  }, [fetchSavedReports]);

  // Pré-preencher a partir do estoque atual / dia anterior / movimentações
  const loadPrefill = useCallback(async (opts?: { silent?: boolean }) => {
    setLoading(true);
    try {
      const res = await api.getDailyReportPrefill(reportDate, locationId ? Number(locationId) : undefined);
      if (res.success && res.data) {
        setLiquido(res.data.liquido || []);
        setVasilhame(res.data.vasilhame || []);
        setCurrentReportId(null);
        // Semear o primeiro bloco de resumo com a unidade selecionada
        setUnits((prev) => {
          if (prev.length === 1 && !prev[0].unit_name && selectedLocationName) {
            const loc = locations.find((l) => l.id === Number(locationId));
            return [{ ...prev[0], unit_name: selectedLocationName, municipality: loc?.city || '' }];
          }
          return prev;
        });
        if (!opts?.silent) {
          showMessage(
            res.data.has_previous
              ? 'Dados carregados (estoque atual + dia anterior).'
              : 'Dados carregados do estoque atual.',
            'success'
          );
        }
      } else {
        showMessage(res.error || 'Erro ao carregar dados do estoque', 'error');
      }
    } catch {
      showMessage('Erro de conexão ao carregar dados do estoque', 'error');
    } finally {
      setLoading(false);
    }
  }, [reportDate, locationId, selectedLocationName, locations, showMessage]);

  // Carregar prefill inicial (apenas uma vez)
  useEffect(() => {
    loadPrefill({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCell = (type: StockType, productId: number, field: 'previous' | 'entry' | 'exit', value: number) => {
    const setter = type === 'liquido' ? setLiquido : setVasilhame;
    setter((prev) =>
      prev.map((line) => (line.product_id === productId ? { ...line, [field]: Math.max(0, value) } : line))
    );
  };

  const updateUnit = (index: number, field: keyof ReportUnit, value: string) => {
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)));
  };

  const addUnit = () => setUnits((prev) => [...prev, emptyUnit()]);
  const removeUnit = (index: number) => setUnits((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const addClientNote = () => setClientNotes((prev) => [...prev, { client: '', note: '' }]);
  const updateClientNote = (index: number, field: keyof ClientNote, value: string) =>
    setClientNotes((prev) => prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)));
  const removeClientNote = (index: number) => setClientNotes((prev) => prev.filter((_, i) => i !== index));

  const startNewReport = () => {
    setCurrentReportId(null);
    setNotes('');
    setUnits([emptyUnit()]);
    setClientNotes([]);
    loadPrefill();
  };

  const loadReport = (report: SavedReport) => {
    setCurrentReportId(report.id);
    setReportDate(report.report_date.split('T')[0]);
    setLocationId(report.location_id ? String(report.location_id) : '');
    setUnits(report.units && report.units.length > 0 ? report.units : [emptyUnit()]);
    setLiquido(report.liquido || []);
    setVasilhame(report.vasilhame || []);
    setClientNotes(report.client_notes || []);
    setNotes(report.notes || '');
    showMessage(`Relatório de ${formatDateBR(report.report_date)} carregado.`, 'info');
  };

  const handleSave = async () => {
    if (liquido.length === 0 && vasilhame.length === 0) {
      showMessage('Não há dados para salvar. Carregue do estoque primeiro.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        report_date: reportDate,
        location_id: locationId ? Number(locationId) : null,
        notes,
        units: units.filter((u) => u.unit_name || u.driver_name || u.route_name),
        liquido,
        vasilhame,
        client_notes: clientNotes.filter((n) => n.client.trim() || n.note.trim()),
      };

      const res = currentReportId
        ? await api.updateDailyReport(currentReportId, payload)
        : await api.createDailyReport(payload);

      if (res.success) {
        showMessage(currentReportId ? 'Relatório atualizado com sucesso!' : 'Relatório salvo com sucesso!', 'success');
        if (res.data?.id) setCurrentReportId(res.data.id);
        fetchSavedReports();
      } else {
        showMessage(res.error || 'Erro ao salvar relatório', 'error');
      }
    } catch {
      showMessage('Erro de conexão ao salvar relatório', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!currentReportId) return;
    if (!confirm('Deseja realmente excluir este relatório salvo?')) return;
    const res = await api.deleteDailyReport(currentReportId);
    if (res.success) {
      showMessage('Relatório excluído.', 'success');
      startNewReport();
      fetchSavedReports();
    } else {
      showMessage(res.error || 'Erro ao excluir relatório', 'error');
    }
  };

  // ---- Totais ----
  const columnSum = (lines: ReportLine[], field: 'previous' | 'entry' | 'exit') =>
    lines.reduce((sum, l) => sum + (l[field] || 0), 0);
  const grandTotal = (lines: ReportLine[]) => lines.reduce((sum, l) => sum + lineTotal(l), 0);

  // ====================================
  // EXPORTAÇÃO PDF (modelo "Relatório de Venda Diária")
  // ====================================
  const buildMatrixForExport = (lines: ReportLine[]) => {
    const head = [['', ...lines.map((l) => l.product_name), 'TOTAL']];
    const body = [
      ['ESTOQUE ANTERIOR', ...lines.map((l) => l.previous), columnSum(lines, 'previous')],
      ['ENTRADA', ...lines.map((l) => l.entry), columnSum(lines, 'entry')],
      ['SAÍDA', ...lines.map((l) => l.exit), columnSum(lines, 'exit')],
      ['TOTAL', ...lines.map((l) => lineTotal(l)), grandTotal(lines)],
    ];
    return { head, body };
  };

  const handleExportPDF = () => {
    const jsPdfFactory = (window as any).jspdf?.jsPDF;
    if (!jsPdfFactory) {
      showMessage('Biblioteca de PDF não encontrada. Verifique sua conexão.', 'error');
      return;
    }
    if (liquido.length === 0 && vasilhame.length === 0) {
      showMessage('Nenhum dado para exportar.', 'error');
      return;
    }

    const doc = new jsPdfFactory({ unit: 'pt', format: 'a4', compress: true });
    const docAny = doc as any;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RELATÓRIO DE VENDA DIÁRIA', pageWidth / 2, 45, { align: 'center' });

    // 1. Resumo
    doc.setFontSize(11);
    doc.text('1. Resumo', 40, 75);

    let cursorY = 82;
    const blocks = units.filter((u) => u.unit_name || u.driver_name || u.route_name);
    const unitBlocks = blocks.length > 0 ? blocks : [emptyUnit()];
    unitBlocks.forEach((u) => {
      docAny.autoTable({
        startY: cursorY,
        body: [
          ['DATA', formatDateBR(reportDate)],
          ['UNIDADE', u.unit_name || '-'],
          ['MUNICÍPIO', u.municipality || '-'],
          ['ROTA', u.route_name || '-'],
          ['MOTORISTA', u.driver_name || '-'],
          ['AJUDANTE', u.helper_name || '-'],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 110 },
          1: { cellWidth: 200 },
        },
        margin: { left: 40 },
        tableWidth: 310,
      });
      cursorY = docAny.lastAutoTable.finalY + 12;
    });

    // 2. Estoque Líquido
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. Estoque Líquido', 40, cursorY + 6);
    const liq = buildMatrixForExport(liquido);
    docAny.autoTable({
      startY: cursorY + 12,
      head: liq.head,
      body: liq.body,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, halign: 'center' },
      headStyles: { fillColor: [245, 247, 250], textColor: 33, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', fillColor: [250, 250, 250] } },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.index === liq.body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 249, 196]; // destaque amarelo (linha TOTAL)
        }
      },
      margin: { left: 40, right: 40 },
    });

    // 3. Estoque Vasilhame
    let vasY = docAny.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. Estoque Vasilhame', 40, vasY);
    const vas = buildMatrixForExport(vasilhame);
    docAny.autoTable({
      startY: vasY + 6,
      head: vas.head,
      body: vas.body,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, halign: 'center' },
      headStyles: { fillColor: [245, 247, 250], textColor: 33, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', fillColor: [250, 250, 250] } },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.index === vas.body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 249, 196];
        }
      },
      margin: { left: 40, right: 40 },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Emitido em ${new Date().toLocaleString('pt-BR')}`,
          40,
          doc.internal.pageSize.getHeight() - 20
        );
      },
    });

    // 4. Observações dos Clientes
    const clientNoteRows = clientNotes.filter((n) => n.client.trim() || n.note.trim());
    if (clientNoteRows.length > 0) {
      const cnY = docAny.lastAutoTable.finalY + 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('4. Observações dos Clientes', 40, cnY);
      docAny.autoTable({
        startY: cnY + 6,
        head: [['Cliente', 'Observação']],
        body: clientNoteRows.map((n) => [n.client || '-', n.note || '']),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
        headStyles: { fillColor: [245, 247, 250], textColor: 33, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 150, fontStyle: 'bold' } },
        margin: { left: 40, right: 40 },
      });
    }

    const dateSafe = formatDateBR(reportDate).replace(/\./g, '-');
    doc.save(`relatorio-venda-diaria-${dateSafe}.pdf`);
    showMessage('Relatório PDF exportado com sucesso!', 'success');
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    if (liquido.length === 0 && vasilhame.length === 0) {
      showMessage('Nenhum dado para exportar.', 'error');
      return;
    }
    const sep = ';';
    const lines: string[] = [];
    lines.push('RELATÓRIO DE VENDA DIÁRIA');
    lines.push(`Data${sep}${formatDateBR(reportDate)}`);
    lines.push('');
    lines.push('1. Resumo');
    lines.push(['UNIDADE', 'MUNICÍPIO', 'ROTA', 'MOTORISTA', 'AJUDANTE'].join(sep));
    units
      .filter((u) => u.unit_name || u.driver_name || u.route_name)
      .forEach((u) =>
        lines.push([u.unit_name, u.municipality, u.route_name, u.driver_name, u.helper_name].map((v) => `"${v || ''}"`).join(sep))
      );

    const matrixCsv = (title: string, data: ReportLine[]) => {
      lines.push('');
      lines.push(title);
      lines.push(['', ...data.map((l) => l.product_name), 'TOTAL'].join(sep));
      lines.push(['ESTOQUE ANTERIOR', ...data.map((l) => l.previous), columnSum(data, 'previous')].join(sep));
      lines.push(['ENTRADA', ...data.map((l) => l.entry), columnSum(data, 'entry')].join(sep));
      lines.push(['SAÍDA', ...data.map((l) => l.exit), columnSum(data, 'exit')].join(sep));
      lines.push(['TOTAL', ...data.map((l) => lineTotal(l)), grandTotal(data)].join(sep));
    };
    matrixCsv('2. Estoque Líquido', liquido);
    matrixCsv('3. Estoque Vasilhame', vasilhame);

    const clientNoteRows = clientNotes.filter((n) => n.client.trim() || n.note.trim());
    if (clientNoteRows.length > 0) {
      lines.push('');
      lines.push('4. Observações dos Clientes');
      lines.push(['Cliente', 'Observação'].join(sep));
      clientNoteRows.forEach((n) =>
        lines.push([`"${(n.client || '').replace(/"/g, '""')}"`, `"${(n.note || '').replace(/"/g, '""')}"`].join(sep))
      );
    }

    const csvContent = '﻿' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateSafe = formatDateBR(reportDate).replace(/\./g, '-');
    link.download = `relatorio-venda-diaria-${dateSafe}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Relatório CSV exportado com sucesso!', 'success');
    setShowExportMenu(false);
  };

  // ====================================
  // Render de uma matriz (líquido OU vasilhame)
  // ====================================
  const renderMatrix = (title: string, sectionNumber: string, type: StockType, lines: ReportLine[], accent: string) => {
    const rows: { label: string; field: 'previous' | 'entry' | 'exit' }[] = [
      { label: 'ESTOQUE ANTERIOR', field: 'previous' },
      { label: 'ENTRADA', field: 'entry' },
      { label: 'SAÍDA', field: 'exit' },
    ];

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className={`px-4 py-3 border-b border-gray-200 ${accent}`}>
          <h3 className="font-semibold text-gray-800">
            <span className="text-gray-500 mr-2">{sectionNumber}.</span>
            {title}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase border border-gray-200 w-48">
                  &nbsp;
                </th>
                {lines.map((l) => (
                  <th
                    key={l.product_id}
                    className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase border border-gray-200"
                  >
                    {l.product_name}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase border border-gray-200 bg-gray-100">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400 border border-gray-200">
                    Nenhum produto. Clique em "Carregar do estoque".
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((row) => (
                    <tr key={row.field} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 bg-gray-50">
                        {row.label}
                      </td>
                      {lines.map((l) => (
                        <td key={l.product_id} className="px-1 py-1 border border-gray-200 text-center">
                          <input
                            type="number"
                            min={0}
                            value={l[row.field]}
                            onChange={(e) => updateCell(type, l.product_id, row.field, toNumber(e.target.value))}
                            className="w-16 px-1 py-1 text-center text-sm border border-transparent rounded hover:border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center text-sm font-semibold text-gray-700 border border-gray-200 bg-gray-50">
                        {columnSum(lines, row.field)}
                      </td>
                    </tr>
                  ))}
                  {/* Linha TOTAL (destaque, como na imagem) */}
                  <tr className="bg-yellow-100">
                    <td className="px-4 py-2 text-sm font-bold text-gray-800 border border-gray-300">TOTAL</td>
                    {lines.map((l) => (
                      <td key={l.product_id} className="px-3 py-2 text-center text-sm font-bold text-gray-800 border border-gray-300">
                        {lineTotal(l)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-sm font-bold text-gray-900 border border-gray-300 bg-yellow-200">
                      {grandTotal(lines)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Barra de controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Data do relatório</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unidade</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none"
            >
              <option value="">Consolidado (todas as unidades)</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <Button variant="secondary" icon="fa-solid fa-rotate" onClick={() => loadPrefill()} disabled={loading}>
            {loading ? 'Carregando...' : 'Carregar do estoque'}
          </Button>

          {savedReports.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Abrir relatório salvo</label>
              <select
                value={currentReportId ?? ''}
                onChange={(e) => {
                  const r = savedReports.find((s) => s.id === Number(e.target.value));
                  if (r) loadReport(r);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none"
              >
                <option value="">— Selecione —</option>
                {savedReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDateBR(r.report_date)} {r.location_name ? `· ${r.location_name}` : '· Consolidado'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1" />

          <Button variant="secondary" icon="fa-solid fa-file-circle-plus" onClick={startNewReport}>
            Novo
          </Button>

          <div className="relative">
            <Button variant="secondary" icon="fa-solid fa-file-export" onClick={() => setShowExportMenu((v) => !v)}>
              Exportar
            </Button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-file-pdf text-red-500" />
                    Exportar PDF
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-file-csv text-green-600" />
                    Exportar CSV
                  </button>
                </div>
              </>
            )}
          </div>

          {currentReportId && (
            <Button variant="danger" icon="fa-solid fa-trash" onClick={handleDeleteReport}>
              Excluir
            </Button>
          )}

          <Button variant="primary" icon="fa-solid fa-floppy-disk" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : currentReportId ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>
        {currentReportId && (
          <p className="mt-2 text-xs text-orange-600">
            <i className="fa-solid fa-pen-to-square mr-1" />
            Editando relatório salvo #{currentReportId}. As alterações sobrescrevem o registro.
          </p>
        )}
      </div>

      {/* 1. Resumo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            <span className="text-gray-500 mr-2">1.</span>Resumo
          </h3>
          <button onClick={addUnit} className="text-sm text-orange-600 hover:text-orange-800 font-medium">
            <i className="fa-solid fa-plus mr-1" />
            Adicionar unidade
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {units.map((unit, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase">Unidade {index + 1}</span>
                {units.length > 1 && (
                  <button onClick={() => removeUnit(index)} className="text-red-500 hover:text-red-700 text-sm" title="Remover">
                    <i className="fa-solid fa-times" />
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-600 bg-gray-50 w-32">DATA</td>
                    <td className="px-3 py-2 text-gray-700">{formatDateBR(reportDate)}</td>
                  </tr>
                  {([
                    ['UNIDADE', 'unit_name'],
                    ['MUNICÍPIO', 'municipality'],
                    ['ROTA', 'route_name'],
                    ['MOTORISTA', 'driver_name'],
                    ['AJUDANTE', 'helper_name'],
                  ] as [string, keyof ReportUnit][]).map(([label, field]) => (
                    <tr key={field} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-1.5 font-medium text-gray-600 bg-gray-50">{label}</td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={unit[field]}
                          onChange={(e) => updateUnit(index, field, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none uppercase"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Estoque Líquido */}
      {renderMatrix('Estoque Líquido', '2', 'liquido', liquido, 'bg-green-50')}

      {/* 3. Estoque Vasilhame */}
      {renderMatrix('Estoque Vasilhame', '3', 'vasilhame', vasilhame, 'bg-blue-50')}

      {/* 4. Observações dos Clientes */}
      <datalist id="daily-report-client-options">
        {clientOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-orange-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            <span className="text-gray-500 mr-2">4.</span>Observações dos Clientes
          </h3>
          <button
            onClick={addClientNote}
            className="text-sm text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"
          >
            <i className="fa-solid fa-plus" />
            Adicionar observação
          </button>
        </div>
        <div className="p-4 space-y-2">
          {clientNotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhuma observação. Clique em "Adicionar observação" para incluir uma linha por cliente.
            </p>
          ) : (
            clientNotes.map((cn, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5 text-right">{index + 1}.</span>
                <input
                  type="text"
                  list="daily-report-client-options"
                  value={cn.client}
                  onChange={(e) => updateClientNote(index, 'client', e.target.value)}
                  placeholder="Cliente"
                  className="w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={cn.note}
                  onChange={(e) => updateClientNote(index, 'note', e.target.value)}
                  placeholder="Observação..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none"
                />
                <button
                  onClick={() => removeClientNote(index)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Remover observação"
                >
                  <i className="fa-solid fa-times" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Observações do dia (opcional)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none"
        />
      </div>
    </div>
  );
};

export default DailyStockReport;
