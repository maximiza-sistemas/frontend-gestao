import React from 'react';

export type BadgeVariant = 'success' | 'danger' | 'info' | 'warning' | 'indigo' | 'purple' | 'neutral' | 'admin' | 'manager' | 'seller';

export interface Client {
    id: number;
    name: string;
    type: 'Residencial' | 'Comercial' | 'Industrial';
    contact: string;
    address: string;
    status: 'Ativo' | 'Inativo';
    lastChange: string;
    lastPurchase?: {
        date: string;
        details: string;
        value: number;
    };
    contractUrl?: string;
    contractFilename?: string;
    contractUploadedAt?: string;
}

export interface StockItem {
    id: string;
    name: string;
    full: number;
    empty: number;
    maintenance: number;
    location: 'Matriz' | 'Filial' | 'Consolidado';
}

export interface MonthlySales {
    month: string;
    matriz: number;
    filial: number;
}

export type OrderStatus = 'Entregue' | 'Em Rota' | 'Pendente' | 'Cancelado';

export interface Order {
    id: number;
    clientName: string;
    date: string;
    totalValue: number;
    status: OrderStatus;
    paymentMethod?: 'Dinheiro' | 'Pix' | 'Prazo' | 'Misto';
    cashAmount?: number;
    termAmount?: number;
    installments?: number;
    dueDate?: string;
}

export type ReceivableStatus = 'Pago' | 'A Vencer' | 'Vencido';

export interface Receivable {
    id: number;
    clientName: string;
    invoiceId: string;
    issueDate: string;
    dueDate: string;
    amount: number;
    status: ReceivableStatus;
}

export type PayableStatus = 'Pago' | 'A Pagar' | 'Vencido';

export interface Payable {
    id: number;
    supplier: string;
    description: string;
    dueDate: string;
    amount: number;
    status: PayableStatus;
}

export interface CashFlowData {
    month: string;
    entradas: number;
    saidas: number;
}

export type VehicleStatus = 'Disponível' | 'Em Rota' | 'Em Manutenção';

export interface Vehicle {
    id: number;
    plate: string;
    model: string;
    driver: string;
    status: VehicleStatus;
    nextMaintenance: string;
}

export interface Supplier {
    id: number;
    name: string;
    category: string;
    contact: string;
    status: 'Ativo' | 'Inativo';
}

export interface AggregatedSalesData {
    month: string;
    totalOrders: number;
    revenue: number;
}

export interface ClientPerformanceData {
    rank: number;
    clientName: string;
    totalSpent: number;
    orderCount: number;
}

export type UserRole = 'Administrador' | 'Gerente' | 'Vendedor';
export type UserStatus = 'Ativo' | 'Inativo';

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
}

export interface ActivityLog {
    id: number;
    timestamp: string;
    user: string;
    action: string;
}

export type RouteStatus = 'Planejada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
export type DeliveryStatus = 'Pendente' | 'Em Andamento' | 'Entregue' | 'Não Entregue' | 'Parcial';

export interface DeliveryRoute {
    id: number;
    routeCode: string;
    routeName: string;
    vehicleId?: number;
    vehiclePlate?: string;
    driverId?: number;
    driverName?: string;
    routeDate: string;
    startTime?: string;
    endTime?: string;
    status: RouteStatus;
    totalDistanceKm?: number;
    totalDurationMinutes?: number;
    totalStops?: number;
    completedStops?: number;
    notes?: string;
    stops?: RouteStop[];
}

export interface RouteStop {
    id: number;
    routeId: number;
    orderId?: number;
    clientId: number;
    clientName: string;
    stopSequence: number;
    deliveryAddress: string;
    latitude?: number;
    longitude?: number;
    estimatedArrival?: string;
    actualArrival?: string;
    estimatedDeparture?: string;
    actualDeparture?: string;
    deliveryStatus: DeliveryStatus;
    deliveryNotes?: string;
    products?: {
        name: string;
        quantity: number;
    }[];
    signatureUrl?: string;
    photoUrl?: string;
}

export type MaintenanceType = 'Vazamento' | 'Válvula Danificada' | 'Amassado' | 'Ferrugem' | 'Pintura' | 'Outro';
export type MaintenanceStatus = 'Pendente' | 'Em Manutenção' | 'Concluído' | 'Descartado';

export interface ProductMaintenance {
    id: number;
    productId: number;
    productName: string;
    locationId: number;
    locationName?: string;
    clientId?: number;
    clientName?: string;
    clientOrderId?: number;
    maintenanceType: MaintenanceType;
    damageDescription: string;
    quantity: number;
    status: MaintenanceStatus;
    maintenanceCost?: number;
    chargeClient: boolean;
    maintenanceDate?: string;
    completionDate?: string;
    technicianNotes?: string;
    userId?: number;
    userName?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface DetailedSaleRecord {
    client: string;
    city: string;
    unit: string;
    product: string;
    quantity: number;
    total: number;
    unitPrice: number;
    date: string;
    paymentMethod: string;
    status?: string;
    paymentStatus?: string;
    paidAmount?: number;
    dueDate?: string;
}

export interface ProductSummary {
    product: string;
    quantity: number;
    averagePrice: number;
    total: number;
}

export interface PaymentBreakdown {
    method: string;
    quantity: number;
    amount: number;
    percentage?: number;
}

export interface ReceivementEntry {
    code: string;
    client: string;
    method: string;
    document: string;
    amount: number;
    received?: number;
    date: string;
}

export interface ExpenseEntry {
    provider: string;
    dueDate: string;
    document: string;
    amount: number;
}

export interface DetailedReportData {
    metadata: {
        date: string;
        unit: string;
        city: string;
        period: string;
        preparedBy: string;
    };
    sales: DetailedSaleRecord[];
    productSummary: ProductSummary[];
    paymentBreakdown: PaymentBreakdown[];
    receivements: ReceivementEntry[];
    returnedChecks: ReceivementEntry[];
    receivementSummary: PaymentBreakdown[];
    expenses: ExpenseEntry[];
    generalDetail: PaymentBreakdown[];
}

// Empréstimos de Recipientes
export type LoanDirection = 'Saída' | 'Entrada';
export type LoanEntityType = 'Empresa' | 'Pessoa Física';
export type LoanStatus = 'Ativo' | 'Devolvido' | 'Cancelado';

export interface ContainerLoan {
    id: number;
    loan_type: 'Empréstimo' | 'Comodato';
    direction: LoanDirection;
    product_id: number;
    product_name?: string;
    product_weight?: number;
    quantity: number;
    entity_type: LoanEntityType;
    entity_name: string;
    entity_contact?: string;
    entity_address?: string;
    loan_date: string;
    expected_return_date?: string;
    actual_return_date?: string;
    status: LoanStatus;
    notes?: string;
    location_id?: number;
    location_name?: string;
    created_at: string;
}

export interface ContainerLoanStats {
    active_count: number;
    returned_count: number;
    cancelled_count: number;
    lent_out_count: number;
    borrowed_in_count: number;
    total_lent_out: number;
    total_borrowed_in: number;
    overdue_count: number;
}

// Pagamentos de Pedidos
export type PaymentMethodType = 'Dinheiro' | 'Pix' | 'Cartão';

export interface OrderPayment {
    id: number;
    order_id: number;
    amount: number;
    payment_method: PaymentMethodType;
    payment_date: string;
    notes?: string;
    user_id?: number;
    user_name?: string;
    receipt_file?: string;
    created_at: string;
}

export interface OrderWithPayments extends Order {
    paid_amount: number;
    pending_amount: number;
    payments?: OrderPayment[];
}

// Compras de Produtos
export interface ProductPurchase {
    id: number;
    product_id: number;
    product_name?: string;
    unit_price: number;
    quantity: number;
    total_amount: number;
    purchase_date: string;
    is_installment: boolean;
    installment_count: number;
    notes?: string;
    created_at: string;
    updated_at?: string;
    paid_amount?: number;
    pending_amount?: number;
    installments?: PurchaseInstallment[];
}

export type PurchaseInstallmentStatus = 'Pendente' | 'Pago' | 'Vencido';

export interface PurchaseInstallment {
    id: number;
    purchase_id: number;
    installment_number: number;
    due_date: string;
    amount: number;
    paid_amount: number;
    paid_date?: string;
    status: PurchaseInstallmentStatus;
    created_at: string;
}

