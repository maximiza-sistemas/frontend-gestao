import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface StockItem {
  id: number;
  product_id: number;
  product_name: string;
  location_id: number;
  location_name: string;
  full_quantity: number;
  empty_quantity: number;
  maintenance_quantity: number;
  minimum_stock: number;
  maximum_stock: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  location_id: number;
  location_name: string;
  movement_type: 'Entrada' | 'Saída' | 'Transferência' | 'Ajuste';
  bottle_type: 'Cheio' | 'Vazio' | 'Manutenção';
  quantity: number;
  reason: string;
  user_id: number;
  user_name: string;
  created_at: string;
}

export const useStock = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getStock(params);

      if (response.success) {
        setStockItems(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar estoque');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (params?: any) => {
    try {
      const response = await api.getStockMovements(params);

      if (response.success) {
        setMovements(response.data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar movimentações:', err);
    }
  };

  const updateStock = async (productId: number, locationId: number, stockData: any) => {
    try {
      const response = await api.updateStock(productId, locationId, stockData);

      if (response.success) {
        // Recarregar lista
        await fetchStock();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao atualizar estoque' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const createMovement = async (movementData: any) => {
    try {
      const response = await api.createStockMovement(movementData);

      if (response.success) {
        // Recarregar lista de estoque e movimentações
        await Promise.all([fetchStock(), fetchMovements()]);
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao criar movimentação' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const adjustStock = async (adjustmentData: {
    product_id: number;
    location_id: number;
    bottle_type: 'Cheio' | 'Vazio' | 'Manutenção';
    quantity: number;
    adjustment_type: 'add' | 'subtract' | 'set';
    reason?: string;
  }) => {
    try {
      const response = await api.post('/stock/adjust', adjustmentData);

      if (response.success) {
        // Recarregar lista de estoque e movimentações
        await Promise.all([fetchStock(), fetchMovements()]);
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao ajustar estoque' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const transferStock = async (transferData: {
    product_id: number;
    from_location_id: number;
    to_location_id: number;
    bottle_type: 'Cheio' | 'Vazio' | 'Manutenção';
    quantity: number;
    reason?: string;
  }) => {
    try {
      const response = await api.post('/stock/transfer', transferData);

      if (response.success) {
        // Recarregar lista de estoque e movimentações
        await Promise.all([fetchStock(), fetchMovements()]);
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao transferir estoque' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  useEffect(() => {
    fetchStock();
    fetchMovements();
  }, []);

  return {
    stockItems,
    movements,
    loading,
    error,
    fetchStock,
    fetchMovements,
    updateStock,
    createMovement,
    adjustStock,
    transferStock,
  };
};
