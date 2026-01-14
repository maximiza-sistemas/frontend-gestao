// Configuração base da API
const PRODUCTION_API_URL = 'https://maxi-gestao-gestao-backend.gkgtsp.easypanel.host/api';
const DEV_API_URL = 'http://localhost:3000/api';

const resolveApiBaseUrl = () => {
  // Primeiro, tenta usar a variável de ambiente
  const envBaseUrl = (import.meta as any)?.env?.VITE_API_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }

  // Em ambiente de produção (não localhost), usar URL de produção
  if (typeof window !== 'undefined' && window.location) {
    const { origin } = window.location;

    // Se estiver em localhost, usar API de desenvolvimento
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      const portAdjustedOrigin = origin.replace(/:(5173|4173|8080)$/, ':3000');
      return `${portAdjustedOrigin.replace(/\/$/, '')}/api`;
    }

    // Se não estiver em localhost, usar URL de produção
    return PRODUCTION_API_URL;
  }

  return DEV_API_URL;
};

const API_BASE_URL = resolveApiBaseUrl();

// Interface para resposta da API
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  supplier_id?: number; // Optional supplier selection
}

// Classe para gerenciar a API
class ApiService {
  private token: string | null = null;

  constructor() {
    // Recuperar token do localStorage se existir
    this.token = localStorage.getItem('auth_token');
  }

  // Configurar token de autenticação
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Remover token
  removeToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Método base para fazer requisições
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Adicionar token se disponível
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log(`📤 Requisição: ${options.method || 'GET'} ${url}`);
    if (options.body) {
      console.log('📤 Body:', options.body);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📥 Resposta: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log('📥 Dados:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ Erro na requisição ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // Métodos GET
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // Métodos POST
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Métodos PUT
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Métodos PATCH
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Métodos DELETE
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ====================================
  // AUTENTICAÇÃO
  // ====================================

  async login(email: string, password: string) {
    console.log('🌐 API: Fazendo login com', { email, password });
    const response = await this.post<{ token: string }>('/auth/login', { email, password });
    console.log('🌐 API: Resposta do servidor:', response);

    if (response.success && response.data?.token) {
      console.log('🌐 API: Token recebido, salvando no localStorage');
      this.setToken(response.data.token);
    } else {
      console.log('🌐 API: Login falhou ou sem token');
    }

    return response;
  }

  async logout() {
    const response = await this.post('/auth/logout');
    this.removeToken();
    return response;
  }

  async getMe() {
    return this.get('/auth/me');
  }

  // ====================================
  // USUÁRIOS
  // ====================================

  async getUsers(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/users${queryString}`);
  }

  async getUserById(id: number) {
    return this.get(`/users/${id}`);
  }

  async createUser(userData: any) {
    return this.post('/users', userData);
  }

  async updateUser(id: number, userData: any) {
    return this.put(`/users/${id}`, userData);
  }

  async deleteUser(id: number) {
    return this.delete(`/users/${id}`);
  }

  async getActivityLogs(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/users/activity-logs${queryString}`);
  }

  // ====================================
  // CLIENTES
  // ====================================

  async getClients(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/clients${queryString}`);
  }

  async getClientById(id: number) {
    return this.get(`/clients/${id}`);
  }

  async getClientHistory(id: number) {
    return this.get(`/clients/${id}/history`);
  }

  async createClient(clientData: any) {
    return this.post('/clients', clientData);
  }

  async updateClient(id: number, clientData: any) {
    return this.put(`/clients/${id}`, clientData);
  }

  async deleteClient(id: number) {
    return this.delete(`/clients/${id}`);
  }

  async getClientStats() {
    return this.get('/clients/stats');
  }

  async getTopClients(limit = 10) {
    return this.get(`/clients/top-clients?limit=${limit}`);
  }

  // ====================================
  // PRODUTOS
  // ====================================

  async getProducts(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/products${queryString}`);
  }

  async getActiveProducts() {
    return this.get('/products/active');
  }

  async getProductsWithStock() {
    return this.get('/products/with-stock');
  }

  async getProductById(id: number) {
    return this.get(`/products/${id}`);
  }

  async createProduct(productData: any) {
    return this.post('/products', productData);
  }

  async updateProduct(id: number, productData: any) {
    return this.put(`/products/${id}`, productData);
  }

  async deleteProduct(id: number) {
    return this.delete(`/products/${id}`);
  }

  async getProductStats() {
    return this.get('/products/stats');
  }

  async getMostSoldProducts(limit = 10) {
    return this.get(`/products/most-sold?limit=${limit}`);
  }

  async getLowStockProducts() {
    return this.get('/products/low-stock');
  }

  async getProductProfitability() {
    return this.get('/products/profitability');
  }

  async getProductPriceHistory(id: number) {
    return this.get(`/products/${id}/price-history`);
  }

  async syncProductsToStock() {
    return this.post('/products/sync-stock');
  }

  async getProductCosts(productId: number) {
    return this.get(`/products/${productId}/costs`);
  }

  async saveProductCost(productId: number, data: { supplier_id: number; cost_price: number; is_default?: boolean }) {
    return this.post(`/products/${productId}/costs`, data);
  }

  async deleteProductCost(productId: number, supplierId: number) {
    return this.delete(`/products/${productId}/costs/${supplierId}`);
  }

  // ====================================
  // COMPRAS DE PRODUTOS
  // ====================================

  async getProductPurchases(productId: number) {
    return this.get(`/products/${productId}/purchases`);
  }

  async createProductPurchase(productId: number, data: {
    unit_price: number;
    quantity: number;
    purchase_date?: string;
    is_term?: boolean;
    payment_date?: string;
    notes?: string;
  }) {
    return this.post(`/products/${productId}/purchases`, data);
  }

  async getProductPurchaseInstallments(productId: number, purchaseId: number) {
    return this.get(`/products/${productId}/purchases/${purchaseId}/installments`);
  }

  async updatePurchaseInstallment(
    productId: number,
    purchaseId: number,
    installmentId: number,
    data: { paid_amount: number; paid_date: string }
  ) {
    return this.put(`/products/${productId}/purchases/${purchaseId}/installments/${installmentId}`, data);
  }

  async deleteProductPurchase(productId: number, purchaseId: number) {
    return this.delete(`/products/${productId}/purchases/${purchaseId}`);
  }

  // ====================================
  // ESTOQUE
  // ====================================


  async getStock(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/stock${queryString}`);
  }

  async getStockConsolidated() {
    return this.get('/stock/consolidated');
  }

  async getLowStock() {
    return this.get('/stock/low-stock');
  }

  async getStockStats() {
    return this.get('/stock/stats');
  }

  async updateStock(productId: number, locationId: number, stockData: any) {
    return this.put(`/stock/product/${productId}/location/${locationId}`, stockData);
  }

  async createStockMovement(movementData: any) {
    return this.post('/stock/movements', movementData);
  }

  async getStockMovements(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/stock/movements${queryString}`);
  }

  async adjustStock(adjustData: any) {
    return this.post('/stock/adjust', adjustData);
  }

  async transferStock(transferData: any) {
    return this.post('/stock/transfer', transferData);
  }

  async deleteStock(productId: number, locationId: number) {
    return this.delete(`/stock/product/${productId}/location/${locationId}`);
  }

  // ====================================
  // PEDIDOS
  // ====================================

  async getOrders(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/orders${queryString}`);
  }

  async getOrderById(id: number) {
    return this.get(`/orders/${id}`);
  }

  async createOrder(orderData: any) {
    return this.post('/orders', orderData);
  }

  async updateOrder(id: number, orderData: any) {
    return this.put(`/orders/${id}`, orderData);
  }

  async updateOrderStatus(id: number, status: string) {
    return this.patch(`/orders/${id}/status`, { status });
  }

  async updateOrderPaymentStatus(id: number, payment_status: string) {
    return this.patch(`/orders/${id}/payment-status`, { payment_status });
  }

  async deleteOrder(id: number) {
    return this.delete(`/orders/${id}`);
  }

  async getOrderStats() {
    return this.get('/orders/stats');
  }

  async getSalesByPeriod(startDate: string, endDate: string) {
    return this.get(`/orders/sales-by-period?start_date=${startDate}&end_date=${endDate}`);
  }

  async getSalesByLocation() {
    return this.get('/orders/sales-by-location');
  }

  // ====================================
  // PAGAMENTOS DE PEDIDOS
  // ====================================

  async getOrderPayments(orderId: number) {
    return this.get(`/orders/${orderId}/payments`);
  }

  async createOrderPayment(orderId: number, paymentData: { amount: number; payment_method: string; notes?: string; payment_date?: string; receipt?: File }) {
    // Se houver arquivo, usar FormData
    if (paymentData.receipt) {
      const formData = new FormData();
      formData.append('amount', paymentData.amount.toString());
      formData.append('payment_method', paymentData.payment_method);
      if (paymentData.notes) formData.append('notes', paymentData.notes);
      if (paymentData.payment_date) formData.append('payment_date', paymentData.payment_date);
      formData.append('receipt', paymentData.receipt);

      const headers: Record<string, string> = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payments`, {
        method: 'POST',
        headers,
        body: formData
      });
      return response.json();
    }
    // Sem arquivo, usar JSON normal
    return this.post(`/orders/${orderId}/payments`, paymentData);
  }

  getPaymentReceiptUrl(orderId: number, paymentId: number): string {
    return `${API_BASE_URL}/orders/${orderId}/payments/${paymentId}/receipt`;
  }

  async updateOrderDiscount(orderId: number, discount: number) {
    return this.patch(`/orders/${orderId}/discount`, { discount });
  }

  async deleteOrderPayment(orderId: number, paymentId: number) {
    return this.delete(`/orders/${orderId}/payments/${paymentId}`);
  }

  async getOrderPaymentSummary(orderId: number) {
    return this.get(`/orders/${orderId}/payment-summary`);
  }

  // ====================================
  // ROTAS DE ENTREGA
  // ====================================

  async getDeliveryRoutes(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/delivery-routes${queryString}`);
  }

  async getDeliveryRouteById(id: number) {
    return this.get(`/delivery-routes/${id}`);
  }

  async createDeliveryRoute(routeData: any) {
    return this.post('/delivery-routes', routeData);
  }

  async updateDeliveryRoute(id: number, routeData: any) {
    return this.put(`/delivery-routes/${id}`, routeData);
  }

  async updateDeliveryRouteStatus(id: number, status: string) {
    return this.put(`/delivery-routes/${id}/status`, { status });
  }

  async updateDeliveryRouteStop(stopId: number, stopData: any) {
    return this.put(`/delivery-routes/stops/${stopId}`, stopData);
  }

  async deleteDeliveryRoute(id: number) {
    return this.delete(`/delivery-routes/${id}`);
  }

  async getDeliveryRouteStats() {
    return this.get('/delivery-routes/stats');
  }

  // ====================================
  // FINANCEIRO
  // ====================================

  // Contas a Receber
  async getReceivables(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/financial/receivables${queryString}`);
  }

  async getReceivableById(id: number) {
    return this.get(`/financial/receivables/${id}`);
  }

  async createReceivable(data: any) {
    return this.post('/financial/receivables', data);
  }

  async updateReceivable(id: number, data: any) {
    return this.put(`/financial/receivables/${id}`, data);
  }

  async updateReceivableStatus(id: number, status: string) {
    return this.put(`/financial/receivables/${id}/status`, { status });
  }

  async deleteReceivable(id: number) {
    return this.delete(`/financial/receivables/${id}`);
  }

  async getReceivablesStats() {
    return this.get('/financial/receivables/stats');
  }

  // Contas a Pagar
  async getPayables(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/financial/payables${queryString}`);
  }

  async getPayableById(id: number) {
    return this.get(`/financial/payables/${id}`);
  }

  async createPayable(data: any) {
    return this.post('/financial/payables', data);
  }

  async updatePayable(id: number, data: any) {
    return this.put(`/financial/payables/${id}`, data);
  }

  async updatePayableStatus(id: number, status: string) {
    return this.put(`/financial/payables/${id}/status`, { status });
  }

  async deletePayable(id: number) {
    return this.delete(`/financial/payables/${id}`);
  }

  async getPayablesStats() {
    return this.get('/financial/payables/stats');
  }

  // ====================================
  // DASHBOARD
  // ====================================

  async getDashboardStats(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return this.get(`/dashboard/stats${queryString ? `?${queryString}` : ''}`);
  }

  async getDashboardMonthlySales() {
    return this.get('/dashboard/monthly-sales');
  }

  async getDashboardStockDistribution() {
    return this.get('/dashboard/stock-distribution');
  }

  // ====================================
  // RELATÓRIOS
  // ====================================

  async getDetailedReport(params: { startDate: string; endDate: string; locationId?: number }) {
    const searchParams = new URLSearchParams({
      date_from: params.startDate,
      date_to: params.endDate,
    });

    if (params.locationId) {
      searchParams.append('location_id', params.locationId.toString());
    }

    return this.get(`/reports/detailed?${searchParams.toString()}`);
  }

  // ====================================
  // HEALTH CHECK
  // ====================================

  async healthCheck() {
    return this.get('/health');
  }

  // ====================================
  // MÉTODOS DO MÓDULO FINANCEIRO
  // ====================================

  // Categorias
  async getFinancialCategories(type?: 'Receita' | 'Despesa'): Promise<ApiResponse> {
    const params = type ? `?type=${type}` : '';
    return this.get(`/financial/categories${params}`);
  }

  async createFinancialCategory(data: any): Promise<ApiResponse> {
    return this.post('/financial/categories', data);
  }

  // Contas
  async getFinancialAccounts(): Promise<ApiResponse> {
    return this.get('/financial/accounts');
  }

  async getFinancialAccount(id: number): Promise<ApiResponse> {
    return this.get(`/financial/accounts/${id}`);
  }

  async createFinancialAccount(data: any): Promise<ApiResponse> {
    return this.post('/financial/accounts', data);
  }

  // Transações
  async getFinancialTransactions(filters?: {
    type?: string;
    status?: string;
    category_id?: number;
    account_id?: number;
    client_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get(`/financial/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async getFinancialTransaction(id: number): Promise<ApiResponse> {
    return this.get(`/financial/transactions/${id}`);
  }

  async createFinancialTransaction(data: any): Promise<ApiResponse> {
    return this.post('/financial/transactions', data);
  }

  async updateFinancialTransaction(id: number, data: any): Promise<ApiResponse> {
    return this.put(`/financial/transactions/${id}`, data);
  }

  async deleteFinancialTransaction(id: number): Promise<ApiResponse> {
    return this.delete(`/financial/transactions/${id}`);
  }

  async updateTransactionStatus(id: number, status: string, paymentDate?: string): Promise<ApiResponse> {
    return this.patch(`/financial/transactions/${id}/status`, {
      status,
      payment_date: paymentDate
    });
  }

  // Resumo e Relatórios
  async getFinancialSummary(filters?: {
    date_from?: string;
    date_to?: string;
    account_id?: number;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get(`/financial/summary${queryString ? `?${queryString}` : ''}`);
  }

  async getCashFlow(startDate: string, endDate: string): Promise<ApiResponse> {
    return this.get(`/financial/cash-flow?start_date=${startDate}&end_date=${endDate}`);
  }

  async getCategoryBreakdown(type: 'Receita' | 'Despesa', startDate?: string, endDate?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ type });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.get(`/financial/category-breakdown?${params.toString()}`);
  }

  // ====================================
  // MÉTODOS DO MÓDULO DE FROTA
  // ====================================

  // Veículos
  async getFleetVehicles(filters?: { status?: string; type?: string }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const queryString = params.toString();
    return this.get(`/fleet/vehicles${queryString ? `?${queryString}` : ''}`);
  }

  async getFleetVehicle(id: number): Promise<ApiResponse> {
    return this.get(`/fleet/vehicles/${id}`);
  }

  async createFleetVehicle(data: any): Promise<ApiResponse> {
    return this.post('/fleet/vehicles', data);
  }

  async updateFleetVehicle(id: number, data: any): Promise<ApiResponse> {
    return this.put(`/fleet/vehicles/${id}`, data);
  }

  async deleteFleetVehicle(id: number): Promise<ApiResponse> {
    return this.delete(`/fleet/vehicles/${id}`);
  }

  // Motoristas
  async getFleetDrivers(status?: string): Promise<ApiResponse> {
    return this.get(`/fleet/drivers${status ? `?status=${status}` : ''}`);
  }

  async getFleetDriver(id: number): Promise<ApiResponse> {
    return this.get(`/fleet/drivers/${id}`);
  }

  async createFleetDriver(data: any): Promise<ApiResponse> {
    return this.post('/fleet/drivers', data);
  }

  async updateFleetDriver(id: number, data: any): Promise<ApiResponse> {
    return this.put(`/fleet/drivers/${id}`, data);
  }

  // Manutenções
  async getFleetMaintenance(filters?: { status?: string; start_date?: string; end_date?: string }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const queryString = params.toString();
    return this.get(`/fleet/maintenance${queryString ? `?${queryString}` : ''}`);
  }

  async getVehicleMaintenance(vehicleId: number): Promise<ApiResponse> {
    return this.get(`/fleet/vehicles/${vehicleId}/maintenance`);
  }

  async createFleetMaintenance(data: any): Promise<ApiResponse> {
    return this.post('/fleet/maintenance', data);
  }

  async updateMaintenanceStatus(id: number, status: string, endDate?: string): Promise<ApiResponse> {
    return this.patch(`/fleet/maintenance/${id}/status`, {
      status,
      end_date: endDate
    });
  }

  // Abastecimentos
  async getVehicleFueling(vehicleId: number): Promise<ApiResponse> {
    return this.get(`/fleet/vehicles/${vehicleId}/fueling`);
  }

  async createFleetFueling(data: any): Promise<ApiResponse> {
    return this.post('/fleet/fueling', data);
  }

  // Viagens
  async getVehicleTrips(vehicleId: number): Promise<ApiResponse> {
    return this.get(`/fleet/vehicles/${vehicleId}/trips`);
  }

  async createFleetTrip(data: any): Promise<ApiResponse> {
    return this.post('/fleet/trips', data);
  }

  async updateFleetTrip(id: number, data: any): Promise<ApiResponse> {
    return this.put(`/fleet/trips/${id}`, data);
  }

  // Despesas
  async getVehicleExpenses(vehicleId: number): Promise<ApiResponse> {
    return this.get(`/fleet/vehicles/${vehicleId}/expenses`);
  }

  async createFleetExpense(data: any): Promise<ApiResponse> {
    return this.post('/fleet/expenses', data);
  }

  // Resumo
  async getFleetSummary(): Promise<ApiResponse> {
    return this.get('/fleet/summary');
  }

  // ====================================
  // MÉTODOS DO MÓDULO DE FORNECEDORES
  // ====================================

  // Listar fornecedores
  async getSuppliers(filters?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get(`/suppliers${queryString ? `?${queryString}` : ''}`);
  }

  // Buscar fornecedor por ID
  async getSupplier(id: number): Promise<ApiResponse> {
    return this.get(`/suppliers/${id}`);
  }

  // Criar fornecedor
  async createSupplier(data: any): Promise<ApiResponse> {
    return this.post('/suppliers', data);
  }

  // Atualizar fornecedor
  async updateSupplier(id: number, data: any): Promise<ApiResponse> {
    return this.put(`/suppliers/${id}`, data);
  }

  // Deletar fornecedor
  async deleteSupplier(id: number): Promise<ApiResponse> {
    return this.delete(`/suppliers/${id}`);
  }

  // Buscar categorias de fornecedores
  async getSupplierCategories(): Promise<ApiResponse> {
    return this.get('/suppliers/data/categories');
  }

  // Estatísticas de fornecedores
  async getSupplierStatistics(): Promise<ApiResponse> {
    return this.get('/suppliers/data/statistics');
  }

  // ====================================
  // EMPRÉSTIMOS DE RECIPIENTES
  // ====================================

  // Listar empréstimos
  async getContainerLoans(filters?: {
    status?: string;
    direction?: string;
    entity_type?: string;
    search?: string;
    location_id?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.get(`/container-loans${queryString ? `?${queryString}` : ''}`);
  }

  // Buscar empréstimo por ID
  async getContainerLoan(id: number): Promise<ApiResponse> {
    return this.get(`/container-loans/${id}`);
  }

  // Criar empréstimo
  async createContainerLoan(data: any): Promise<ApiResponse> {
    return this.post('/container-loans', data);
  }

  // Atualizar empréstimo
  async updateContainerLoan(id: number, data: any): Promise<ApiResponse> {
    return this.put(`/container-loans/${id}`, data);
  }

  // Devolver empréstimo
  async returnContainerLoan(id: number, actualReturnDate?: string): Promise<ApiResponse> {
    return this.post(`/container-loans/${id}/return`, { actual_return_date: actualReturnDate });
  }

  // Cancelar empréstimo
  async cancelContainerLoan(id: number): Promise<ApiResponse> {
    return this.delete(`/container-loans/${id}`);
  }

  // Excluir empréstimo permanentemente
  async deleteContainerLoanPermanent(id: number): Promise<ApiResponse> {
    return this.delete(`/container-loans/${id}/permanent`);
  }

  // Estatísticas de empréstimos
  async getContainerLoanStats(): Promise<ApiResponse> {
    return this.get('/container-loans/stats');
  }

  // Upload de contrato PDF
  async uploadLoanContract(loanId: number, file: File): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('contract', file);

      const response = await fetch(`${API_BASE_URL}/container-loans/${loanId}/contract`, {
        method: 'POST',
        headers: {
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro HTTP no upload:', response.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          return { success: false, error: errorJson.error || `Erro ${response.status}` };
        } catch {
          return { success: false, error: `Erro ${response.status}: ${errorText}` };
        }
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao fazer upload do contrato:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro de conexão' };
    }
  }

  // Download de contrato PDF
  async downloadLoanContract(loanId: number): Promise<Blob | null> {
    const response = await fetch(`${API_BASE_URL}/container-loans/${loanId}/contract`, {
      method: 'GET',
      headers: {
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      }
    });

    if (!response.ok) {
      return null;
    }
    return response.blob();
  }

  // Deletar contrato PDF
  async deleteLoanContract(loanId: number): Promise<ApiResponse> {
    return this.delete(`/container-loans/${loanId}/contract`);
  }

  // ====================================
  // FILIAIS / LOCALIZAÇÕES
  // ====================================

  async getLocations(): Promise<ApiResponse> {
    return this.get('/locations');
  }

  async getLocation(id: number): Promise<ApiResponse> {
    return this.get(`/locations/${id}`);
  }

  async createLocation(data: {
    name: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
  }): Promise<ApiResponse> {
    return this.post('/locations', data);
  }

  async updateLocation(id: number, data: {
    name?: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    status?: string;
  }): Promise<ApiResponse> {
    return this.put(`/locations/${id}`, data);
  }

  async deleteLocation(id: number): Promise<ApiResponse> {
    return this.delete(`/locations/${id}`);
  }

  async toggleLocationStatus(id: number): Promise<ApiResponse> {
    return this.patch(`/locations/${id}/toggle-status`);
  }
}

// Exportar instância única da API
export const api = new ApiService();
export default api;
