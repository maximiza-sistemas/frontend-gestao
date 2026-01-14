import React, { useState, useMemo, useEffect } from 'react';
import { useStock } from '../../hooks/useStock';
import { api } from '../../services/api';
import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';
import Button from '../common/Button';
import Toast from '../common/Toast';
import ProductFormModal from '../common/ProductFormModal';
import StockAdjustModal from '../common/StockAdjustModal';
import ContainerLoanFormModal from '../common/ContainerLoanFormModal';
import { ContainerLoan, ContainerLoanStats } from '../../types';

const EstoqueAPI: React.FC = () => {
  const { stockItems, movements, loading, error, fetchStock, adjustStock } = useStock();

  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('Todos');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Produtos
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stock' | 'products' | 'loans'>('stock');
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  // Ajuste de Estoque
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingStockItem, setAdjustingStockItem] = useState<any>(null);

  // Empréstimos de Recipientes
  const [loans, setLoans] = useState<ContainerLoan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loanStats, setLoanStats] = useState<ContainerLoanStats | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<ContainerLoan | null>(null);
  const [loanStatusFilter, setLoanStatusFilter] = useState('Todos');
  const [loanDirectionFilter, setLoanDirectionFilter] = useState('Todos');
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [viewingLoan, setViewingLoan] = useState<ContainerLoan | null>(null);
  const [showLoanDetailModal, setShowLoanDetailModal] = useState(false);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Buscar produtos
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await api.getActiveProducts();
      if (response.success) {
        setProducts(response.data || []);
      } else {
        showMessage(response.error || 'Erro ao carregar produtos', 'error');
      }
    } catch (err) {
      showMessage('Erro de conexão ao carregar produtos', 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  // Criar ou atualizar produto
  const handleProductSubmit = async (formData: any) => {
    try {
      let response;
      if (editingProduct) {
        response = await api.updateProduct(editingProduct.id, formData);
      } else {
        response = await api.createProduct(formData);
      }

      if (!response.success) {
        throw new Error(response.error || 'Erro ao salvar produto');
      }

      showMessage(
        editingProduct ? 'Produto atualizado com sucesso' : 'Produto cadastrado com sucesso',
        'success'
      );

      // Recarregar tanto produtos quanto estoque
      await Promise.all([fetchProducts(), fetchStock()]);

      setShowProductModal(false);
      setEditingProduct(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro de conexão ao salvar produto';
      showMessage(message, 'error');
      throw err;
    }
  };

  // Desativar produto
  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!confirm(`Deseja realmente desativar o produto "${productName}"?`)) {
      return;
    }

    try {
      const response = await api.deleteProduct(productId);
      if (response.success) {
        showMessage('Produto desativado com sucesso', 'success');
        await fetchProducts();
      } else {
        showMessage(response.error || 'Erro ao desativar produto', 'error');
      }
    } catch (err) {
      showMessage('Erro de conexão ao desativar produto', 'error');
    }
  };

  // Sincronizar produtos com estoque
  const syncProductsToStock = async () => {
    try {
      const response = await api.syncProductsToStock();
      if (response.success) {
        showMessage(
          `${response.data?.synced || 0} produto(s) sincronizado(s) com o estoque`,
          'success'
        );
        await fetchStock();
      } else {
        showMessage(response.error || 'Erro ao sincronizar produtos', 'error');
      }
    } catch (err) {
      showMessage('Erro de conexão ao sincronizar produtos', 'error');
    }
  };

  // Ajustar estoque
  const handleStockAdjust = async (adjustmentData: any) => {
    try {
      const result = await adjustStock(adjustmentData);

      if (result.success) {
        showMessage('Estoque ajustado com sucesso', 'success');
        setShowAdjustModal(false);
        setAdjustingStockItem(null);
      } else {
        throw new Error(result.error || 'Erro ao ajustar estoque');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro de conexão ao ajustar estoque';
      showMessage(message, 'error');
      throw err;
    }
  };

  // Excluir estoque
  const handleDeleteStock = async (item: any) => {
    if (!confirm(`Tem certeza que deseja excluir o estoque de "${item.product_name}" em "${item.location_name}"?`)) {
      return;
    }

    try {
      const response = await api.deleteStock(item.product_id, item.location_id);
      if (response.success) {
        showMessage('Estoque excluído com sucesso', 'success');
        await fetchStock();
      } else {
        showMessage(response.error || 'Erro ao excluir estoque', 'error');
      }
    } catch (err) {
      showMessage('Erro ao excluir estoque', 'error');
    }
  };

  // Buscar empréstimos de recipientes
  const fetchLoans = async () => {
    setLoansLoading(true);
    try {
      const [loansResponse, statsResponse, locationsResponse] = await Promise.all([
        api.getContainerLoans(),
        api.getContainerLoanStats(),
        api.getStock() // Para obter localizações a partir do estoque
      ]);

      if (loansResponse.success) {
        setLoans(loansResponse.data || []);
      }
      if (statsResponse.success) {
        setLoanStats(statsResponse.data);
      }
      if (locationsResponse.success && locationsResponse.data) {
        const uniqueLocations = Array.from(
          new Map((locationsResponse.data as any[]).map((item: any) => [item.location_id, { id: item.location_id, name: item.location_name }])).values()
        );
        setLocations(uniqueLocations);
      }
    } catch (err) {
      showMessage('Erro ao carregar empréstimos', 'error');
    } finally {
      setLoansLoading(false);
    }
  };

  // Criar empréstimo
  const handleLoanSubmit = async (formData: any) => {
    try {
      // Extrair contract_file para upload separado (File objects não serializam em JSON)
      const { contract_file, ...loanData } = formData;

      let response;
      if (editingLoan) {
        response = await api.updateContainerLoan(editingLoan.id, loanData);
      } else {
        response = await api.createContainerLoan(loanData);
      }

      if (!response.success) {
        throw new Error(response.error || 'Erro ao salvar empréstimo');
      }

      showMessage(
        editingLoan ? 'Empréstimo atualizado com sucesso' : 'Empréstimo registrado com sucesso',
        'success'
      );

      // Upload do contrato se houver
      if (contract_file && response.data?.id) {
        try {
          const uploadResponse = await api.uploadLoanContract(response.data.id, contract_file);
          if (!uploadResponse.success) {
            console.error('Erro no upload do contrato:', uploadResponse.error);
            showMessage('Empréstimo salvo, mas erro ao enviar contrato: ' + (uploadResponse.error || 'Erro desconhecido'), 'error');
          }
        } catch (uploadError) {
          console.error('Erro ao enviar contrato:', uploadError);
          showMessage('Empréstimo salvo, mas erro ao enviar contrato', 'error');
        }
      }

      await Promise.all([fetchLoans(), fetchStock()]);
      setShowLoanModal(false);
      setEditingLoan(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar empréstimo';
      showMessage(message, 'error');
      throw err;
    }
  };

  // Devolver empréstimo
  const handleReturnLoan = async (loanId: number) => {
    if (!confirm('Confirma a devolução deste empréstimo?')) return;

    try {
      const response = await api.returnContainerLoan(loanId);
      if (response.success) {
        showMessage('Empréstimo devolvido com sucesso', 'success');
        await Promise.all([fetchLoans(), fetchStock()]);
      } else {
        showMessage(response.error || 'Erro ao devolver empréstimo', 'error');
      }
    } catch (err) {
      showMessage('Erro ao devolver empréstimo', 'error');
    }
  };

  // Cancelar empréstimo
  const handleCancelLoan = async (loanId: number) => {
    if (!confirm('Confirma o cancelamento deste empréstimo?')) return;

    try {
      const response = await api.cancelContainerLoan(loanId);
      if (response.success) {
        showMessage('Empréstimo cancelado com sucesso', 'success');
        await Promise.all([fetchLoans(), fetchStock()]);
      } else {
        showMessage(response.error || 'Erro ao cancelar empréstimo', 'error');
      }
    } catch (err) {
      showMessage('Erro ao cancelar empréstimo', 'error');
    }
  };

  // Excluir empréstimo permanentemente
  const handleDeleteLoan = async (loanId: number) => {
    if (!confirm('ATENÇÃO: Esta ação irá excluir permanentemente o empréstimo e não poderá ser desfeita. Deseja continuar?')) return;

    try {
      const response = await api.deleteContainerLoanPermanent(loanId);
      if (response.success) {
        showMessage('Empréstimo excluído permanentemente', 'success');
        await Promise.all([fetchLoans(), fetchStock()]);
      } else {
        showMessage(response.error || 'Erro ao excluir empréstimo', 'error');
      }
    } catch (err) {
      showMessage('Erro ao excluir empréstimo', 'error');
    }
  };
  // Carregar produtos ao montar o componente ou mudar de tab
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'loans') {
      fetchLoans();
      fetchProducts(); // Para o modal de criação
    } else if (activeTab === 'stock') {
      // Carregar estatísticas de empréstimos para exibir nos cards
      api.getContainerLoanStats().then(response => {
        if (response.success) {
          setLoanStats(response.data);
        }
      });
    }
  }, [activeTab]);

  // Sincronizar automaticamente quando não houver dados de estoque
  useEffect(() => {
    if (!loading && stockItems.length === 0 && !error && !hasAutoSynced) {
      setHasAutoSynced(true);
      syncProductsToStock();
    }
  }, [loading, stockItems.length, error, hasAutoSynced]);

  const filteredStock = useMemo(() => {
    return stockItems.filter(item => {
      const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = locationFilter === 'Todos' || item.location_name === locationFilter;

      return matchesSearch && matchesLocation;
    });
  }, [stockItems, searchTerm, locationFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('Todos');
  };

  // Filtro de empréstimos
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const matchesSearch = loan.entity_name.toLowerCase().includes(loanSearchTerm.toLowerCase()) ||
        (loan.product_name || '').toLowerCase().includes(loanSearchTerm.toLowerCase());
      const matchesStatus = loanStatusFilter === 'Todos' || loan.status === loanStatusFilter;
      const matchesDirection = loanDirectionFilter === 'Todos' || loan.direction === loanDirectionFilter;
      return matchesSearch && matchesStatus && matchesDirection;
    });
  }, [loans, loanSearchTerm, loanStatusFilter, loanDirectionFilter]);

  const clearLoanFilters = () => {
    setLoanSearchTerm('');
    setLoanStatusFilter('Todos');
    setLoanDirectionFilter('Todos');
  };

  const uniqueLocations = useMemo(() => {
    const locations = new Set(stockItems.map(item => item.location_name));
    return Array.from(locations);
  }, [stockItems]);

  const totalFull = useMemo(() =>
    filteredStock.reduce((sum, item) => sum + item.full_quantity, 0),
    [filteredStock]
  );

  const totalEmpty = useMemo(() =>
    filteredStock.reduce((sum, item) => sum + item.empty_quantity, 0),
    [filteredStock]
  );

  const totalMaintenance = useMemo(() =>
    filteredStock.reduce((sum, item) => sum + item.maintenance_quantity, 0),
    [filteredStock]
  );

  const getLowStockClass = (item: typeof stockItems[0]) => {
    if (item.full_quantity <= item.minimum_stock) {
      return 'bg-red-50 border-red-200';
    } else if (item.full_quantity <= item.minimum_stock * 1.5) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
          <p className="text-gray-600">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Erro ao carregar estoque</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Estoque"
        subtitle="Controle de botijões e produtos"
        action={
          <div className="flex gap-2">
            <Button
              variant="primary"
              icon="fa-solid fa-plus"
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
                if (activeTab !== 'products') {
                  setActiveTab('products');
                }
              }}
            >
              Cadastrar Produto
            </Button>
            {activeTab === 'stock' && (
              <Button
                variant="secondary"
                icon="fa-solid fa-database"
                onClick={syncProductsToStock}
                title="Sincronizar produtos com estoque"
              >
                Sincronizar
              </Button>
            )}
            <Button
              variant="secondary"
              icon="fa-solid fa-sync"
              onClick={() => activeTab === 'stock' ? fetchStock() : fetchProducts()}
            >
              Atualizar
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'stock'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <i className="fa-solid fa-boxes-stacked mr-2"></i>
            Estoque
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'products'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <i className="fa-solid fa-gas-pump mr-2"></i>
            Produtos
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'loans'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <i className="fa-solid fa-handshake mr-2"></i>
            Empréstimos
            {loanStats && loanStats.active_count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                {loanStats.active_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo do Tab Estoque */}
      {activeTab === 'stock' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Botijões Cheios</p>
                  <p className="text-2xl font-bold text-green-600">{totalFull}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-green-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Botijões Vazios</p>
                  <p className="text-2xl font-bold text-blue-600">{totalEmpty}</p>
                  {loanStats && (loanStats.total_lent_out > 0 || loanStats.total_borrowed_in > 0) && (
                    <div className="text-xs mt-1 text-gray-500">
                      {loanStats.total_lent_out > 0 && (
                        <span className="text-orange-600 mr-2">
                          <i className="fa-solid fa-arrow-up text-xs mr-1"></i>
                          {loanStats.total_lent_out} emprestados
                        </span>
                      )}
                      {loanStats.total_borrowed_in > 0 && (
                        <span className="text-blue-600">
                          <i className="fa-solid fa-arrow-down text-xs mr-1"></i>
                          {loanStats.total_borrowed_in} recebidos
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-circle text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Em Manutenção</p>
                  <p className="text-2xl font-bold text-orange-600">{totalMaintenance}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-tools text-orange-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Geral</p>
                  <p className="text-2xl font-bold text-gray-800">{totalFull + totalEmpty + totalMaintenance}</p>
                  {loanStats && loanStats.active_count > 0 && (
                    <p className="text-xs mt-1 text-orange-600">
                      <i className="fa-solid fa-handshake mr-1"></i>
                      {loanStats.active_count} empréstimos ativos
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-boxes-stacked text-gray-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onClearFilters={clearFilters}
            placeholder="Buscar por produto ou localização..."
            filters={[
              {
                label: 'Localização',
                value: locationFilter,
                onChange: setLocationFilter,
                options: ['Todos', ...uniqueLocations]
              }
            ]}
          />

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cheios</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vazios</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Manutenção</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <i className="fa-solid fa-inbox text-4xl mb-2"></i>
                        <p>Nenhum item em estoque encontrado</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((item) => {
                      const totalItem = item.full_quantity + item.empty_quantity + item.maintenance_quantity;
                      const isLowStock = item.full_quantity <= item.minimum_stock;
                      const isWarningStock = item.full_quantity <= item.minimum_stock * 1.5 && !isLowStock;

                      return (
                        <tr key={`${item.product_id}-${item.location_id}`} className={getLowStockClass(item)}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-sm text-gray-500">Mín: {item.minimum_stock} | Máx: {item.maximum_stock}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.location_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex px-2 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">
                              {item.full_quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex px-2 py-1 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">
                              {item.empty_quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex px-2 py-1 text-sm font-semibold text-orange-800 bg-orange-100 rounded-full">
                              {item.maintenance_quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center font-semibold">{totalItem}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {isLowStock ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
                                <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                                Crítico
                              </span>
                            ) : isWarningStock ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">
                                <i className="fa-solid fa-exclamation-circle mr-1"></i>
                                Baixo
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                                <i className="fa-solid fa-check-circle mr-1"></i>
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setAdjustingStockItem(item);
                                  setShowAdjustModal(true);
                                }}
                                className="text-orange-600 hover:text-orange-800 font-medium"
                                title="Ajustar estoque"
                              >
                                <i className="fa-solid fa-edit mr-1"></i>
                                Ajustar
                              </button>
                              <button
                                onClick={() => handleDeleteStock(item)}
                                className="text-red-600 hover:text-red-800"
                                title="Excluir estoque"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Conteúdo do Tab Produtos */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
                <p className="text-gray-600">Carregando produtos...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (kg)</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <i className="fa-solid fa-inbox text-4xl mb-2"></i>
                        <p>Nenhum produto encontrado</p>
                        <p className="text-sm mt-2">Clique em "Cadastrar Produto" para adicionar o primeiro produto</p>
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 max-w-xs truncate">{product.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                            {product.weight_kg ? `${product.weight_kg} kg` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setShowProductModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar"
                              >
                                <i className="fa-solid fa-edit"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="text-red-600 hover:text-red-800"
                                title="Desativar"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo do Tab Empréstimos */}
      {activeTab === 'loans' && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Emprestados (Saída)</p>
                  <p className="text-2xl font-bold text-orange-600">{loanStats?.total_lent_out || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-arrow-up-from-bracket text-orange-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Recebidos (Entrada)</p>
                  <p className="text-2xl font-bold text-blue-600">{loanStats?.total_borrowed_in || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-arrow-down-to-bracket text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{loanStats?.active_count || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-green-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Botão Novo Empréstimo + Filtros */}
          <div className="flex justify-between items-center">
            <Button
              variant="primary"
              icon="fa-solid fa-plus"
              onClick={() => {
                setEditingLoan(null);
                setShowLoanModal(true);
              }}
            >
              Novo Empréstimo
            </Button>
            <Button
              variant="secondary"
              icon="fa-solid fa-sync"
              onClick={fetchLoans}
            >
              Atualizar
            </Button>
          </div>

          <FilterBar
            searchTerm={loanSearchTerm}
            onSearchChange={setLoanSearchTerm}
            onClearFilters={clearLoanFilters}
            placeholder="Buscar por entidade ou produto..."
            filters={[
              {
                label: 'Status',
                value: loanStatusFilter,
                onChange: setLoanStatusFilter,
                options: ['Todos', 'Ativo', 'Devolvido', 'Cancelado']
              },
              {
                label: 'Direção',
                value: loanDirectionFilter,
                onChange: setLoanDirectionFilter,
                options: ['Todos', 'Saída', 'Entrada']
              }
            ]}
          />

          {/* Tabela de Empréstimos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loansLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
                  <p className="text-gray-600">Carregando empréstimos...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Direção</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLoans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <i className="fa-solid fa-handshake text-4xl mb-2"></i>
                          <p>Nenhum empréstimo encontrado</p>
                          <p className="text-sm mt-2">Clique em "Novo Empréstimo" para registrar</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLoans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{loan.entity_name}</div>
                            <div className="text-sm text-gray-500">
                              {loan.entity_type} • {loan.loan_type}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {loan.product_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 rounded-full">
                              {loan.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${loan.direction === 'Saída'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                              }`}>
                              <i className={`fa-solid ${loan.direction === 'Saída' ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                              {loan.direction}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                            {new Date(loan.loan_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${loan.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                              loan.status === 'Devolvido' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-1">
                              {/* Botão Visualizar */}
                              <button
                                onClick={() => {
                                  setViewingLoan(loan);
                                  setShowLoanDetailModal(true);
                                }}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                title="Ver detalhes"
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>
                              {/* Botão Editar - apenas para ativos */}
                              {loan.status === 'Ativo' && (
                                <button
                                  onClick={() => {
                                    setEditingLoan(loan);
                                    setShowLoanModal(true);
                                  }}
                                  className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded"
                                  title="Editar"
                                >
                                  <i className="fa-solid fa-edit"></i>
                                </button>
                              )}
                              {/* Botão Devolver - apenas para ativos */}
                              {loan.status === 'Ativo' && (
                                <button
                                  onClick={() => handleReturnLoan(loan.id)}
                                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                  title="Marcar como devolvido"
                                >
                                  <i className="fa-solid fa-rotate-left"></i>
                                </button>
                              )}
                              {/* Botão Cancelar - apenas para ativos */}
                              {loan.status === 'Ativo' && (
                                <button
                                  onClick={() => handleCancelLoan(loan.id)}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                  title="Cancelar empréstimo"
                                >
                                  <i className="fa-solid fa-times"></i>
                                </button>
                              )}
                              {/* Botão Excluir permanentemente */}
                              <button
                                onClick={() => handleDeleteLoan(loan.id)}
                                className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Excluir permanentemente"
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
            )}
          </div>
        </>
      )}

      {/* Modal de Ajuste de Estoque */}
      <StockAdjustModal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setAdjustingStockItem(null);
        }}
        onSubmit={handleStockAdjust}
        stockItem={adjustingStockItem}
      />

      {/* Modal de Cadastro/Edição de Produto */}
      <ProductFormModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        onSubmit={handleProductSubmit}
        initialData={editingProduct}
        mode={editingProduct ? 'edit' : 'create'}
      />

      {/* Modal de Empréstimo de Recipiente */}
      <ContainerLoanFormModal
        isOpen={showLoanModal}
        onClose={() => {
          setShowLoanModal(false);
          setEditingLoan(null);
        }}
        onSubmit={handleLoanSubmit}
        initialData={editingLoan}
        mode={editingLoan ? 'edit' : 'create'}
        products={products}
        locations={locations}
      />

      {/* Modal de Detalhes do Empréstimo */}
      {showLoanDetailModal && viewingLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fa-solid fa-handshake mr-2 text-orange-600"></i>
                Detalhes do Empréstimo
              </h3>
              <button
                onClick={() => {
                  setShowLoanDetailModal(false);
                  setViewingLoan(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Status e Tipo */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${viewingLoan.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                  viewingLoan.status === 'Devolvido' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                  {viewingLoan.status}
                </span>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${viewingLoan.direction === 'Saída' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                  <i className={`fa-solid ${viewingLoan.direction === 'Saída' ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                  {viewingLoan.direction}
                </span>
                <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                  {viewingLoan.loan_type}
                </span>
              </div>

              {/* Informações principais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Entidade</label>
                  <p className="font-medium text-gray-900">{viewingLoan.entity_name}</p>
                  <p className="text-sm text-gray-500">{viewingLoan.entity_type}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Produto</label>
                  <p className="font-medium text-gray-900">{viewingLoan.product_name || '-'}</p>
                  <p className="text-sm text-gray-500">Quantidade: {viewingLoan.quantity}</p>
                </div>
              </div>

              {/* Contato e Endereço */}
              {(viewingLoan.entity_contact || viewingLoan.entity_address) && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  {viewingLoan.entity_contact && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Contato</label>
                      <p className="text-gray-900">{viewingLoan.entity_contact}</p>
                    </div>
                  )}
                  {viewingLoan.entity_address && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Endereço</label>
                      <p className="text-gray-900">{viewingLoan.entity_address}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Datas */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Data do Empréstimo</label>
                  <p className="text-gray-900">{new Date(viewingLoan.loan_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Data de Devolução</label>
                  <p className="text-gray-900">
                    {viewingLoan.actual_return_date
                      ? new Date(viewingLoan.actual_return_date).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Localização */}
              <div className="pt-2 border-t border-gray-100">
                <label className="text-xs text-gray-500 uppercase">Localização</label>
                <p className="text-gray-900">{viewingLoan.location_name || '-'}</p>
              </div>

              {/* Observações */}
              {viewingLoan.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs text-gray-500 uppercase">Observações</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingLoan.notes}</p>
                </div>
              )}

              {/* Contrato */}
              {(viewingLoan as any).contract_file && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs text-gray-500 uppercase">Contrato</label>
                  <button
                    onClick={async () => {
                      const blob = await api.downloadLoanContract(viewingLoan.id);
                      if (blob) {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = (viewingLoan as any).contract_file;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } else {
                        showMessage('Erro ao baixar contrato', 'error');
                      }
                    }}
                    className="mt-1 flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <i className="fa-solid fa-file-pdf text-red-500"></i>
                    <span>Baixar Contrato</span>
                    <i className="fa-solid fa-download text-sm"></i>
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {viewingLoan.status === 'Ativo' && (
                <>
                  <Button
                    variant="secondary"
                    icon="fa-solid fa-edit"
                    onClick={() => {
                      setShowLoanDetailModal(false);
                      setEditingLoan(viewingLoan);
                      setShowLoanModal(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="primary"
                    icon="fa-solid fa-rotate-left"
                    onClick={() => {
                      setShowLoanDetailModal(false);
                      handleReturnLoan(viewingLoan.id);
                    }}
                  >
                    Devolver
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setShowLoanDetailModal(false);
                  setViewingLoan(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default EstoqueAPI;
