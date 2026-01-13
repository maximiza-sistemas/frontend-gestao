import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DeliveryRoute, RouteStop } from '../types';

// Função para mapear dados do backend para o frontend
const mapBackendToFrontend = (backendRoute: any): DeliveryRoute => {
  return {
    id: backendRoute.id,
    routeCode: backendRoute.route_code,
    routeName: backendRoute.route_name,
    routeDate: backendRoute.route_date,
    vehiclePlate: backendRoute.vehicle_plate,
    driverName: backendRoute.driver_name,
    status: backendRoute.status,
    notes: backendRoute.notes,
    totalDistanceKm: backendRoute.total_distance_km,
    totalDurationMinutes: backendRoute.total_duration_minutes,
    totalStops: backendRoute.total_stops,
    completedStops: backendRoute.completed_stops,
    stops: backendRoute.stops?.map((stop: any): RouteStop => ({
      id: stop.id,
      routeId: stop.route_id,
      orderId: stop.order_id,
      clientId: stop.client_id || 0,
      clientName: stop.client_name || '',
      stopSequence: stop.stop_order,
      deliveryAddress: stop.address,
      latitude: stop.latitude,
      longitude: stop.longitude,
      deliveryStatus: stop.status === 'Concluído' ? 'Entregue' :
                     stop.status === 'Falhado' ? 'Não Entregue' :
                     stop.status === 'Em Andamento' ? 'Em Andamento' : 'Pendente',
      deliveryNotes: stop.notes,
    }))
  };
};

// Função para mapear dados do frontend para o backend
const mapFrontendToBackend = (frontendRoute: Partial<DeliveryRoute>) => {
  return {
    route_code: frontendRoute.routeCode,
    route_name: frontendRoute.routeName,
    route_date: frontendRoute.routeDate,
    vehicle_plate: frontendRoute.vehiclePlate,
    driver_name: frontendRoute.driverName,
    status: frontendRoute.status,
    notes: frontendRoute.notes,
    total_distance_km: frontendRoute.totalDistanceKm,
    total_duration_minutes: frontendRoute.totalDurationMinutes,
  };
};

export const useDeliveryRoutes = () => {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getDeliveryRoutes(params);

      if (response.success) {
        const mappedRoutes = (response.data || []).map(mapBackendToFrontend);
        setRoutes(mappedRoutes);
      } else {
        setError(response.error || 'Erro ao carregar rotas');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const getRouteById = async (id: number) => {
    try {
      const response = await api.getDeliveryRouteById(id);

      if (response.success) {
        const mappedRoute = mapBackendToFrontend(response.data);
        return { success: true, data: mappedRoute };
      } else {
        return { success: false, error: response.error || 'Erro ao buscar rota' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const createRoute = async (routeData: Omit<DeliveryRoute, 'id'>) => {
    try {
      const backendData = {
        route: mapFrontendToBackend(routeData),
        stops: []
      };
      const response = await api.createDeliveryRoute(backendData);

      if (response.success) {
        await fetchRoutes();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao criar rota' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const updateRoute = async (id: number, routeData: Partial<DeliveryRoute>) => {
    try {
      const backendData = mapFrontendToBackend(routeData);
      const response = await api.updateDeliveryRoute(id, backendData);

      if (response.success) {
        await fetchRoutes();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao atualizar rota' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const updateRouteStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateDeliveryRouteStatus(id, status);

      if (response.success) {
        await fetchRoutes();
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error || 'Erro ao atualizar status' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const deleteRoute = async (id: number) => {
    try {
      const response = await api.deleteDeliveryRoute(id);

      if (response.success) {
        await fetchRoutes();
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Erro ao excluir rota' };
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  return {
    routes,
    loading,
    error,
    fetchRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    updateRouteStatus,
    deleteRoute,
  };
};
