import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface Vehicle {
    id: number;
    plate: string;
    model: string;
    brand: string;
}

interface MaintenanceFormData {
    vehicle_id: number;
    maintenance_type: 'Preventiva' | 'Corretiva' | 'Revisão' | 'Troca de Óleo' | 'Troca de Pneus' | 'Elétrica' | 'Mecânica' | 'Funilaria' | 'Outro';
    description: string;
    service_provider?: string;
    start_date: string;
    end_date?: string;
    mileage_at_service?: number;
    cost?: number;
    parts_replaced?: string;
    next_maintenance_km?: number;
    next_maintenance_date?: string;
    invoice_number?: string;
    warranty_until?: string;
    performed_by?: string;
    status: 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
    notes?: string;
}

interface MaintenanceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<MaintenanceFormData>) => void;
    maintenance?: MaintenanceFormData | null;
    vehicles: Vehicle[];
}

const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    maintenance,
    vehicles
}) => {
    const [formData, setFormData] = useState<Partial<MaintenanceFormData>>({
        vehicle_id: 0,
        maintenance_type: 'Preventiva',
        description: '',
        service_provider: '',
        start_date: new Date().toISOString().split('T')[0],
        mileage_at_service: 0,
        cost: 0,
        status: 'Agendada'
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showCostDetails, setShowCostDetails] = useState(false);

    useEffect(() => {
        if (maintenance) {
            setFormData(maintenance);
            setShowCostDetails(!!maintenance.cost && maintenance.cost > 0);
        } else {
            setFormData({
                vehicle_id: vehicles.length > 0 ? vehicles[0].id : 0,
                maintenance_type: 'Preventiva',
                description: '',
                service_provider: '',
                start_date: new Date().toISOString().split('T')[0],
                mileage_at_service: 0,
                cost: 0,
                status: 'Agendada'
            });
            setShowCostDetails(false);
        }
        setErrors({});
    }, [maintenance, vehicles, isOpen]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.vehicle_id || formData.vehicle_id === 0) {
            newErrors.vehicle_id = 'Veículo é obrigatório';
        }

        if (!formData.maintenance_type) {
            newErrors.maintenance_type = 'Tipo de manutenção é obrigatório';
        }

        if (!formData.description?.trim()) {
            newErrors.description = 'Descrição é obrigatória';
        } else if (formData.description.trim().length < 10) {
            newErrors.description = 'Descrição deve ter pelo menos 10 caracteres';
        }

        if (!formData.start_date) {
            newErrors.start_date = 'Data de início é obrigatória';
        }

        if (formData.end_date && formData.start_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            
            if (endDate < startDate) {
                newErrors.end_date = 'Data de término não pode ser anterior à data de início';
            }
        }

        if (formData.mileage_at_service && formData.mileage_at_service < 0) {
            newErrors.mileage_at_service = 'Quilometragem não pode ser negativa';
        }

        if (formData.cost && formData.cost < 0) {
            newErrors.cost = 'Custo não pode ser negativo';
        }

        if (formData.next_maintenance_km && formData.mileage_at_service) {
            if (formData.next_maintenance_km <= formData.mileage_at_service) {
                newErrors.next_maintenance_km = 'Próxima manutenção deve ser maior que a quilometragem atual';
            }
        }

        if (formData.warranty_until && formData.start_date) {
            const startDate = new Date(formData.start_date);
            const warrantyDate = new Date(formData.warranty_until);
            
            if (warrantyDate < startDate) {
                newErrors.warranty_until = 'Garantia não pode expirar antes da manutenção';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (validateForm()) {
            onSave(formData);
            onClose();
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Limpar erro do campo quando o usuário começar a digitar
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const getMaintenanceTypeDescription = (type: string) => {
        const descriptions: { [key: string]: string } = {
            'Preventiva': 'Manutenção programada para prevenir problemas',
            'Corretiva': 'Reparo de problemas identificados',
            'Revisão': 'Revisão geral do veículo',
            'Troca de Óleo': 'Substituição do óleo do motor',
            'Troca de Pneus': 'Substituição de pneus desgastados',
            'Elétrica': 'Reparo no sistema elétrico',
            'Mecânica': 'Reparo mecânico geral',
            'Funilaria': 'Reparo de lataria e pintura',
            'Outro': 'Outros tipos de manutenção'
        };
        return descriptions[type] || '';
    };

    const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={maintenance ? 'Editar Manutenção' : 'Agendar Nova Manutenção'}
            size="large"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Veículo e Tipo */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Manutenção</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Veículo <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.vehicle_id || 0}
                                onChange={(e) => handleChange('vehicle_id', parseInt(e.target.value))}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.vehicle_id ? 'border-red-500' : 'border-gray-300'
                                }`}
                                disabled={!!maintenance}
                            >
                                <option value={0}>Selecione um veículo</option>
                                {vehicles.map(vehicle => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                                    </option>
                                ))}
                            </select>
                            {errors.vehicle_id && (
                                <p className="text-red-500 text-xs mt-1">{errors.vehicle_id}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Manutenção <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.maintenance_type || 'Preventiva'}
                                onChange={(e) => handleChange('maintenance_type', e.target.value)}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.maintenance_type ? 'border-red-500' : 'border-gray-300'
                                }`}
                            >
                                <option value="Preventiva">Preventiva</option>
                                <option value="Corretiva">Corretiva</option>
                                <option value="Revisão">Revisão</option>
                                <option value="Troca de Óleo">Troca de Óleo</option>
                                <option value="Troca de Pneus">Troca de Pneus</option>
                                <option value="Elétrica">Elétrica</option>
                                <option value="Mecânica">Mecânica</option>
                                <option value="Funilaria">Funilaria</option>
                                <option value="Outro">Outro</option>
                            </select>
                            {formData.maintenance_type && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {getMaintenanceTypeDescription(formData.maintenance_type)}
                                </p>
                            )}
                            {errors.maintenance_type && (
                                <p className="text-red-500 text-xs mt-1">{errors.maintenance_type}</p>
                            )}
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descrição do Serviço <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={3}
                            placeholder="Descreva detalhadamente o serviço a ser realizado..."
                            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                errors.description ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.description && (
                            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                        )}
                    </div>
                </div>

                {/* Datas e Quilometragem */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Agendamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data de Início <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.start_date || ''}
                                onChange={(e) => handleChange('start_date', e.target.value)}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.start_date ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.start_date && (
                                <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data de Término
                            </label>
                            <input
                                type="date"
                                value={formData.end_date || ''}
                                onChange={(e) => handleChange('end_date', e.target.value)}
                                min={formData.start_date}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.end_date ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.end_date && (
                                <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Km do Veículo
                            </label>
                            <input
                                type="number"
                                value={formData.mileage_at_service || ''}
                                onChange={(e) => handleChange('mileage_at_service', parseInt(e.target.value) || 0)}
                                min="0"
                                placeholder="Ex: 45000"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.mileage_at_service ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.mileage_at_service && (
                                <p className="text-red-500 text-xs mt-1">{errors.mileage_at_service}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prestador de Serviço
                            </label>
                            <input
                                type="text"
                                value={formData.service_provider || ''}
                                onChange={(e) => handleChange('service_provider', e.target.value)}
                                placeholder="Ex: Oficina Mecânica ABC"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Responsável pelo Serviço
                            </label>
                            <input
                                type="text"
                                value={formData.performed_by || ''}
                                onChange={(e) => handleChange('performed_by', e.target.value)}
                                placeholder="Ex: João Silva"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Custos e Garantia */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Custos e Garantia</h3>
                        <button
                            type="button"
                            onClick={() => setShowCostDetails(!showCostDetails)}
                            className="text-sm text-orange-600 hover:text-orange-700"
                        >
                            {showCostDetails ? 'Ocultar' : 'Mostrar'} detalhes
                        </button>
                    </div>
                    
                    {showCostDetails && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Custo Total (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.cost || ''}
                                        onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                            errors.cost ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.cost && (
                                        <p className="text-red-500 text-xs mt-1">{errors.cost}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Número da NF/Recibo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.invoice_number || ''}
                                        onChange={(e) => handleChange('invoice_number', e.target.value)}
                                        placeholder="Ex: NF-123456"
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Garantia até
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.warranty_until || ''}
                                        onChange={(e) => handleChange('warranty_until', e.target.value)}
                                        min={formData.start_date}
                                        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                            errors.warranty_until ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.warranty_until && (
                                        <p className="text-red-500 text-xs mt-1">{errors.warranty_until}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Peças Substituídas
                                </label>
                                <textarea
                                    value={formData.parts_replaced || ''}
                                    onChange={(e) => handleChange('parts_replaced', e.target.value)}
                                    rows={2}
                                    placeholder="Liste as peças que foram substituídas..."
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Próxima Manutenção */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Próxima Manutenção</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Próxima Manutenção (Km)
                            </label>
                            <input
                                type="number"
                                value={formData.next_maintenance_km || ''}
                                onChange={(e) => handleChange('next_maintenance_km', parseInt(e.target.value) || 0)}
                                min={formData.mileage_at_service || 0}
                                placeholder="Ex: 50000"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.next_maintenance_km ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.next_maintenance_km && (
                                <p className="text-red-500 text-xs mt-1">{errors.next_maintenance_km}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Próxima Manutenção (Data)
                            </label>
                            <input
                                type="date"
                                value={formData.next_maintenance_date || ''}
                                onChange={(e) => handleChange('next_maintenance_date', e.target.value)}
                                min={formData.start_date}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Status e Observações */}
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.status || 'Agendada'}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Agendada">Agendada</option>
                                <option value="Em Andamento">Em Andamento</option>
                                <option value="Concluída">Concluída</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observações
                        </label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            rows={2}
                            placeholder="Observações adicionais..."
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                </div>

                {/* Resumo */}
                {selectedVehicle && formData.maintenance_type && formData.start_date && (
                    <div className="bg-orange-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-700 mb-2">Resumo do Agendamento</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-500">Veículo:</span>
                                <span className="ml-2 font-medium">
                                    {selectedVehicle.plate} - {selectedVehicle.brand} {selectedVehicle.model}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Tipo:</span>
                                <span className="ml-2 font-medium">{formData.maintenance_type}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Data:</span>
                                <span className="ml-2 font-medium">
                                    {new Date(formData.start_date).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Status:</span>
                                <span className={`ml-2 font-medium ${
                                    formData.status === 'Agendada' ? 'text-yellow-600' :
                                    formData.status === 'Em Andamento' ? 'text-blue-600' :
                                    formData.status === 'Concluída' ? 'text-green-600' :
                                    'text-red-600'
                                }`}>
                                    {formData.status}
                                </span>
                            </div>
                            {formData.cost && formData.cost > 0 && (
                                <div>
                                    <span className="text-gray-500">Custo:</span>
                                    <span className="ml-2 font-medium">
                                        R$ {formData.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                    >
                        {maintenance ? 'Atualizar' : 'Agendar'} Manutenção
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default MaintenanceFormModal;
