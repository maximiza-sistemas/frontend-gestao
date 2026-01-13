import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Toast from '../common/Toast';
import Tabs from '../common/Tabs';
import VehicleFormModal from '../common/VehicleFormModal';
import DriverFormModal from '../common/DriverFormModal';
import MaintenanceFormModal from '../common/MaintenanceFormModal';

// Tipos locais
interface Vehicle {
    id: number;
    plate: string;
    model: string;
    brand: string;
    year: number;
    type: 'Caminhão' | 'Van' | 'Utilitário' | 'Moto' | 'Carro';
    fuel_type: 'Diesel' | 'Gasolina' | 'Flex' | 'GNV' | 'Elétrico';
    capacity_kg?: number;
    capacity_units?: number;
    mileage: number;
    status: 'Disponível' | 'Em Rota' | 'Manutenção' | 'Inativo';
    insurance_expiry?: string;
    license_expiry?: string;
    next_maintenance_date?: string;
    next_maintenance_km?: number;
    monthly_cost?: number;
}

interface Driver {
    id: number;
    name: string;
    cpf: string;
    cnh_number: string;
    cnh_category: string;
    cnh_expiry: string;
    phone?: string;
    status: 'Ativo' | 'Inativo' | 'Férias' | 'Afastado';
}

interface VehicleMaintenance {
    id: number;
    vehicle_id: number;
    vehicle?: { plate: string; model: string; brand: string };
    maintenance_type: string;
    description: string;
    start_date: string;
    end_date?: string;
    cost?: number;
    status: 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
}

interface FleetSummary {
    total_vehicles: number;
    available_vehicles: number;
    vehicles_on_route: number;
    vehicles_in_maintenance: number;
    total_distance_month: number;
    total_fuel_cost_month: number;
    total_maintenance_cost_month: number;
    average_fuel_efficiency: number;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

const getVehicleStatusVariant = (status: string) => {
    const map: { [key: string]: 'success' | 'info' | 'warning' | 'danger' } = {
        'Disponível': 'success',
        'Em Rota': 'info',
        'Manutenção': 'warning',
        'Inativo': 'danger'
    };
    return map[status] || 'info';
};

const getDriverStatusVariant = (status: string) => {
    const map: { [key: string]: 'success' | 'warning' | 'danger' | 'info' } = {
        'Ativo': 'success',
        'Férias': 'info',
        'Afastado': 'warning',
        'Inativo': 'danger'
    };
    return map[status] || 'info';
};

const Frota: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Veículos');
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [maintenance, setMaintenance] = useState<VehicleMaintenance[]>([]);
    const [summary, setSummary] = useState<FleetSummary | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
    
    // Modal states
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    
    // Filter states
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [vehicleStatusFilter, setVehicleStatusFilter] = useState('Todos');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('Todos');
    const [driverSearch, setDriverSearch] = useState('');
    const [driverStatusFilter, setDriverStatusFilter] = useState('Todos');
    const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState('Todos');

    // Carregar dados iniciais
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Carregar todas as informações em paralelo
            const [vehiclesRes, driversRes, maintenanceRes, summaryRes] = await Promise.all([
                api.getFleetVehicles(),
                api.getFleetDrivers(),
                api.getFleetMaintenance(),
                api.getFleetSummary()
            ]);

            if (vehiclesRes.success) {
                setVehicles(vehiclesRes.data || []);
            }
            
            if (driversRes.success) {
                setDrivers(driversRes.data || []);
            }
            
            if (maintenanceRes.success) {
                setMaintenance(maintenanceRes.data || []);
            }
            
            if (summaryRes.success) {
                setSummary(summaryRes.data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados da frota:', error);
            setToast({ message: 'Erro ao carregar dados da frota', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateVehicle = async (vehicleData: Partial<Vehicle>) => {
        try {
            const response = await api.createFleetVehicle(vehicleData);
            
            if (response.success) {
                setToast({ message: 'Veículo cadastrado com sucesso!', type: 'success' });
                loadInitialData();
                setIsVehicleModalOpen(false);
            } else {
                throw new Error(response.error || 'Erro ao cadastrar veículo');
            }
        } catch (error) {
            console.error('Erro ao cadastrar veículo:', error);
            setToast({ message: 'Erro ao cadastrar veículo', type: 'error' });
        }
    };

    const handleUpdateVehicle = async (id: number, vehicleData: Partial<Vehicle>) => {
        try {
            const response = await api.updateFleetVehicle(id, vehicleData);
            
            if (response.success) {
                setToast({ message: 'Veículo atualizado com sucesso!', type: 'success' });
                loadInitialData();
                setIsVehicleModalOpen(false);
    setSelectedVehicle(null);
            } else {
                throw new Error(response.error || 'Erro ao atualizar veículo');
            }
        } catch (error) {
            console.error('Erro ao atualizar veículo:', error);
            setToast({ message: 'Erro ao atualizar veículo', type: 'error' });
        }
    };

    const handleDeleteVehicle = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
        
        try {
            const response = await api.deleteFleetVehicle(id);
            
            if (response.success) {
                setToast({ message: 'Veículo excluído com sucesso!', type: 'success' });
                loadInitialData();
    } else {
                throw new Error(response.error || 'Erro ao excluir veículo');
            }
        } catch (error) {
            console.error('Erro ao excluir veículo:', error);
            setToast({ message: 'Erro ao excluir veículo', type: 'error' });
        }
    };

    const handleCreateDriver = async (driverData: Partial<Driver>) => {
        try {
            const response = await api.createFleetDriver(driverData);
            
            if (response.success) {
                setToast({ message: 'Motorista cadastrado com sucesso!', type: 'success' });
                loadInitialData();
                setIsDriverModalOpen(false);
            } else {
                throw new Error(response.error || 'Erro ao cadastrar motorista');
            }
        } catch (error) {
            console.error('Erro ao cadastrar motorista:', error);
            setToast({ message: 'Erro ao cadastrar motorista', type: 'error' });
        }
    };

    const handleCreateMaintenance = async (maintenanceData: any) => {
        try {
            const response = await api.createFleetMaintenance(maintenanceData);
            
            if (response.success) {
                setToast({ message: 'Manutenção agendada com sucesso!', type: 'success' });
                loadInitialData();
                setIsMaintenanceModalOpen(false);
            } else {
                throw new Error(response.error || 'Erro ao agendar manutenção');
            }
        } catch (error) {
            console.error('Erro ao agendar manutenção:', error);
            setToast({ message: 'Erro ao agendar manutenção', type: 'error' });
        }
    };

    // Filtrar veículos
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            const matchesSearch = vehicle.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                                 vehicle.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                                 vehicle.brand.toLowerCase().includes(vehicleSearch.toLowerCase());
            
            const matchesStatus = vehicleStatusFilter === 'Todos' || vehicle.status === vehicleStatusFilter;
            const matchesType = vehicleTypeFilter === 'Todos' || vehicle.type === vehicleTypeFilter;
            
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [vehicles, vehicleSearch, vehicleStatusFilter, vehicleTypeFilter]);

    // Filtrar motoristas
    const filteredDrivers = useMemo(() => {
        return drivers.filter(driver => {
            const matchesSearch = driver.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
                                 driver.cpf.includes(driverSearch) ||
                                 driver.cnh_number.includes(driverSearch);
            
            const matchesStatus = driverStatusFilter === 'Todos' || driver.status === driverStatusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [drivers, driverSearch, driverStatusFilter]);

    // Filtrar manutenções
    const filteredMaintenance = useMemo(() => {
        return maintenance.filter(m => {
            return maintenanceStatusFilter === 'Todos' || m.status === maintenanceStatusFilter;
        });
    }, [maintenance, maintenanceStatusFilter]);

    const clearVehicleFilters = () => {
        setVehicleSearch('');
        setVehicleStatusFilter('Todos');
        setVehicleTypeFilter('Todos');
    };

    const clearDriverFilters = () => {
        setDriverSearch('');
        setDriverStatusFilter('Todos');
    };

  return (
    <>
            <div className="space-y-6">
                <PageHeader title="Gestão de Frota" />

                {/* KPIs */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total de Veículos</p>
                                    <p className="text-2xl font-bold">{summary.total_vehicles}</p>
                                </div>
                                <i className="fas fa-truck text-3xl text-gray-400"></i>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Disponíveis</p>
                                    <p className="text-2xl font-bold text-green-600">{summary.available_vehicles}</p>
                                </div>
                                <i className="fas fa-check-circle text-3xl text-green-400"></i>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Km Rodados (Mês)</p>
                                    <p className="text-2xl font-bold">{summary.total_distance_month.toLocaleString('pt-BR')}</p>
                                </div>
                                <i className="fas fa-road text-3xl text-blue-400"></i>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Custo Combustível (Mês)</p>
                                    <p className="text-2xl font-bold">{formatCurrency(summary.total_fuel_cost_month)}</p>
                                </div>
                                <i className="fas fa-gas-pump text-3xl text-orange-400"></i>
                            </div>
              </div>
          </div>
                )}

                {/* Tabs */}
                <Tabs
                    tabs={['Veículos', 'Motoristas', 'Manutenções']}
                    activeTab={activeTab}
                    onTabClick={setActiveTab}
                />

                {/* Conteúdo das Tabs */}
                {activeTab === 'Veículos' && (
                    <>
                        <div className="flex justify-between items-center">
                            <FilterBar onClearFilters={clearVehicleFilters}>
                                <input
                                    type="text"
                                    placeholder="Buscar veículo..."
                                    value={vehicleSearch}
                                    onChange={(e) => setVehicleSearch(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                />
                                
                                <select
                                    value={vehicleStatusFilter}
                                    onChange={(e) => setVehicleStatusFilter(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                >
                <option value="Todos">Todos os Status</option>
                <option value="Disponível">Disponível</option>
                <option value="Em Rota">Em Rota</option>
                                    <option value="Manutenção">Manutenção</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                                
                                <select
                                    value={vehicleTypeFilter}
                                    onChange={(e) => setVehicleTypeFilter(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="Todos">Todos os Tipos</option>
                                    <option value="Caminhão">Caminhão</option>
                                    <option value="Van">Van</option>
                                    <option value="Utilitário">Utilitário</option>
                                    <option value="Moto">Moto</option>
                                    <option value="Carro">Carro</option>
                                </select>
                            </FilterBar>
                            
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setSelectedVehicle(null);
                                    setIsVehicleModalOpen(true);
                                }}
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Novo Veículo
                            </Button>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Placa</th>
                                        <th className="px-4 py-3">Modelo</th>
                                        <th className="px-4 py-3">Marca</th>
                                        <th className="px-4 py-3">Ano</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3">Combustível</th>
                                        <th className="px-4 py-3">Km</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-4">Carregando...</td>
                                        </tr>
                                    ) : filteredVehicles.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-4">Nenhum veículo encontrado</td>
                                        </tr>
                                    ) : (
                                        filteredVehicles.map(vehicle => (
                                            <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{vehicle.plate}</td>
                                                <td className="px-4 py-3">{vehicle.model}</td>
                                                <td className="px-4 py-3">{vehicle.brand}</td>
                                                <td className="px-4 py-3">{vehicle.year}</td>
                                                <td className="px-4 py-3">{vehicle.type}</td>
                                                <td className="px-4 py-3">{vehicle.fuel_type}</td>
                                                <td className="px-4 py-3">{vehicle.mileage ? vehicle.mileage.toLocaleString('pt-BR') : '0'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={getVehicleStatusVariant(vehicle.status)}>
                                                        {vehicle.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedVehicle(vehicle);
                                                                setIsVehicleModalOpen(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVehicle(vehicle.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'Motoristas' && (
                    <>
                        <div className="flex justify-between items-center">
                            <FilterBar onClearFilters={clearDriverFilters}>
                                <input
                                    type="text"
                                    placeholder="Buscar motorista..."
                                    value={driverSearch}
                                    onChange={(e) => setDriverSearch(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                />
                                
                                <select
                                    value={driverStatusFilter}
                                    onChange={(e) => setDriverStatusFilter(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="Todos">Todos os Status</option>
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                    <option value="Férias">Férias</option>
                                    <option value="Afastado">Afastado</option>
            </select>
        </FilterBar>
                            
                            <Button
                                variant="primary"
                                onClick={() => setIsDriverModalOpen(true)}
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Novo Motorista
                            </Button>
                        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                            <table className="w-full text-sm">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                                        <th className="px-4 py-3">Nome</th>
                                        <th className="px-4 py-3">CPF</th>
                                        <th className="px-4 py-3">CNH</th>
                                        <th className="px-4 py-3">Categoria</th>
                                        <th className="px-4 py-3">Validade CNH</th>
                                        <th className="px-4 py-3">Telefone</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Ações</th>
                  </tr>
              </thead>
              <tbody>
                                    {filteredDrivers.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-4">Nenhum motorista encontrado</td>
                                        </tr>
                                    ) : (
                                        filteredDrivers.map(driver => (
                                            <tr key={driver.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{driver.name}</td>
                                                <td className="px-4 py-3">{driver.cpf}</td>
                                                <td className="px-4 py-3">{driver.cnh_number}</td>
                                                <td className="px-4 py-3">{driver.cnh_category}</td>
                                                <td className="px-4 py-3">{formatDate(driver.cnh_expiry)}</td>
                                                <td className="px-4 py-3">{driver.phone || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={getDriverStatusVariant(driver.status)}>
                                                        {driver.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDriver(driver);
                                                            setIsDriverModalOpen(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                          </td>
                      </tr>
                                        ))
                                    )}
              </tbody>
          </table>
        </div>
                    </>
                )}

                {activeTab === 'Manutenções' && (
                    <>
                        <div className="flex justify-between items-center">
                            <FilterBar onClearFilters={() => setMaintenanceStatusFilter('Todos')}>
                                <select
                                    value={maintenanceStatusFilter}
                                    onChange={(e) => setMaintenanceStatusFilter(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="Todos">Todos os Status</option>
                                    <option value="Agendada">Agendada</option>
                                    <option value="Em Andamento">Em Andamento</option>
                                    <option value="Concluída">Concluída</option>
                                    <option value="Cancelada">Cancelada</option>
                                </select>
                            </FilterBar>
                            
                            <Button
                                variant="primary"
                                onClick={() => setIsMaintenanceModalOpen(true)}
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Agendar Manutenção
                            </Button>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Veículo</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3">Descrição</th>
                                        <th className="px-4 py-3">Data Início</th>
                                        <th className="px-4 py-3">Data Fim</th>
                                        <th className="px-4 py-3">Custo</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMaintenance.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4">Nenhuma manutenção encontrada</td>
                                        </tr>
                                    ) : (
                                        filteredMaintenance.map(m => (
                                            <tr key={m.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">
                                                    {m.vehicle ? `${m.vehicle.plate} - ${m.vehicle.model}` : '-'}
                                                </td>
                                                <td className="px-4 py-3">{m.maintenance_type}</td>
                                                <td className="px-4 py-3">{m.description}</td>
                                                <td className="px-4 py-3">{formatDate(m.start_date)}</td>
                                                <td className="px-4 py-3">{m.end_date ? formatDate(m.end_date) : '-'}</td>
                                                <td className="px-4 py-3">
                                                    {m.cost ? formatCurrency(m.cost) : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={
                                                        m.status === 'Concluída' ? 'success' :
                                                        m.status === 'Em Andamento' ? 'info' :
                                                        m.status === 'Agendada' ? 'warning' : 'danger'
                                                    }>
                                                        {m.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
      </div>
                    </>
                )}
            </div>

            {/* Modais de Formulário */}
            <VehicleFormModal
                isOpen={isVehicleModalOpen}
                onClose={() => {
                    setIsVehicleModalOpen(false);
                    setSelectedVehicle(null);
                }}
                onSave={(data) => {
                    if (selectedVehicle) {
                        handleUpdateVehicle(selectedVehicle.id, data);
                    } else {
                        handleCreateVehicle(data);
                    }
                }}
                vehicle={selectedVehicle}
            />

            <DriverFormModal
                isOpen={isDriverModalOpen}
                onClose={() => {
                    setIsDriverModalOpen(false);
                    setSelectedDriver(null);
                }}
                onSave={(data) => {
                    if (selectedDriver) {
                        // handleUpdateDriver(selectedDriver.id, data);
                        setToast({ message: 'Funcionalidade de edição em desenvolvimento', type: 'info' });
                    } else {
                        handleCreateDriver(data);
                    }
                }}
                driver={selectedDriver}
            />

            <MaintenanceFormModal
                isOpen={isMaintenanceModalOpen}
                onClose={() => {
                    setIsMaintenanceModalOpen(false);
                }}
                onSave={handleCreateMaintenance}
                vehicles={vehicles}
            />

            {/* Toast de notificação */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
};

export default Frota;