import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Client {
  id: number;
  name: string;
  type: 'Residencial' | 'Comercial' | 'Industrial';
  contact?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  cpf_cnpj?: string;
  status: 'Ativo' | 'Inativo';
  credit_limit: number;
  created_at: string;
  updated_at: string;
  // Campos adicionais que podem vir da API
  last_order_date?: string;
  last_order_total?: number;
  last_order_details?: string;
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getClients(params);
      
      if (response.success) {
        setClients(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar clientes');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Partial<Client>) => {
    try {
      const response = await api.createClient(clientData);
      
      if (response.success) {
        // Recarregar lista
        await fetchClients();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao criar cliente' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const updateClient = async (id: number, clientData: Partial<Client>) => {
    try {
      const response = await api.updateClient(id, clientData);
      
      if (response.success) {
        // Recarregar lista
        await fetchClients();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao atualizar cliente' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const deleteClient = async (id: number) => {
    try {
      const response = await api.deleteClient(id);
      
      if (response.success) {
        // Recarregar lista
        await fetchClients();
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Erro ao deletar cliente' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
};

