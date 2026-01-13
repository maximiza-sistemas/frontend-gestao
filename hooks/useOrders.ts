import { useState, useEffect } from 'react';
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
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getOrders(params);

      if (response.success) {
        setOrders(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar pedidos');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

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

  const deleteOrder = async (id: number) => {
    try {
      const response = await api.deleteOrder(id);

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

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    refetchOrders: fetchOrders,
  };
};
