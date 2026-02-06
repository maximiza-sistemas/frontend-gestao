import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface Order {
  id: number;
  client_id?: number;
  clientName: string;
  date: string;
  totalValue: number;
  status: 'Pendente' | 'Em Rota' | 'Entregue' | 'Cancelado';
  paymentMethod?: 'Dinheiro' | 'Pix' | 'Prazo' | 'Misto';
  paymentStatus?: 'Pendente' | 'Pago';
  cashAmount?: number;
  termAmount?: number;
  installments?: number;
  dueDate?: string;
  created_at?: string;
  updated_at?: string;
  discount?: number;
  paid_amount?: number;
  pending_amount?: number;
  expenses?: number;
  items_summary?: string;
  total_quantity?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const useOrders = (initialPage = 1, initialLimit = 20) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0
  });

  const fetchOrders = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);

      // Merge pagination params with any additional params
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...params
      };

      const response = await api.getOrders(queryParams);

      if (response.success) {
        setOrders(response.data || []);
        // Update pagination info from response
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages
          }));
        }
      } else {
        setError(response.error || 'Erro ao carregar pedidos');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, page: 1, limit }));
  }, []);

  const goToNextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination.page, pagination.totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  }, [pagination.page]);

  const createOrder = async (orderData: Omit<Order, 'id'>) => {
    try {
      const response = await api.createOrder(orderData);

      if (response.success) {
        await fetchOrders();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao criar pedido' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const updateOrder = async (id: number, orderData: Partial<Order>) => {
    try {
      const response = await api.updateOrder(id, orderData);

      if (response.success) {
        await fetchOrders();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao atualizar pedido' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const updateOrderStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateOrderStatus(id, status);

      if (response.success) {
        await fetchOrders();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao atualizar status' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const deleteOrder = async (id: number, reason: string) => {
    try {
      const response = await api.deleteOrder(id, reason);

      if (response.success) {
        await fetchOrders();
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Erro ao excluir pedido' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  // Fetch orders when pagination changes
  useEffect(() => {
    fetchOrders();
  }, [pagination.page, pagination.limit]);

  return {
    orders,
    loading,
    error,
    pagination,
    setPage,
    setLimit,
    goToNextPage,
    goToPreviousPage,
    fetchOrders,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    refetchOrders: fetchOrders,
  };
};
