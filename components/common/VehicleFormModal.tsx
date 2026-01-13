import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface VehicleFormData {
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
    inspection_expiry?: string;
    owner_type?: 'Próprio' | 'Alugado' | 'Terceirizado';
    monthly_cost?: number;
    notes?: string;
}

interface VehicleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<VehicleFormData>) => void;
    vehicle?: VehicleFormData | null;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    vehicle
}) => {
    const [formData, setFormData] = useState<Partial<VehicleFormData>>({
        plate: '',
        model: '',
        brand: '',
        year: new Date().getFullYear(),
        type: 'Caminhão',
        fuel_type: 'Diesel',
        capacity_kg: 0,
        capacity_units: 0,
        mileage: 0,
        status: 'Disponível',
        owner_type: 'Próprio',
        monthly_cost: 0
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (vehicle) {
            setFormData(vehicle);
        } else {
            setFormData({
                plate: '',
                model: '',
                brand: '',
                year: new Date().getFullYear(),
                type: 'Caminhão',
                fuel_type: 'Diesel',
                capacity_kg: 0,
                capacity_units: 0,
                mileage: 0,
                status: 'Disponível',
                owner_type: 'Próprio',
                monthly_cost: 0
            });
        }
        setErrors({});
    }, [vehicle, isOpen]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.plate?.trim()) {
            newErrors.plate = 'Placa é obrigatória';
        } else if (!/^[A-Z]{3}-?\d{4}$/.test(formData.plate.toUpperCase().replace(/\s/g, ''))) {
            newErrors.plate = 'Placa inválida (formato: ABC-1234)';
        }

        if (!formData.model?.trim()) {
            newErrors.model = 'Modelo é obrigatório';
        }

        if (!formData.brand?.trim()) {
            newErrors.brand = 'Marca é obrigatória';
        }

        if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
            newErrors.year = 'Ano inválido';
        }

        if (formData.mileage && formData.mileage < 0) {
            newErrors.mileage = 'Quilometragem não pode ser negativa';
        }

        if (formData.capacity_kg && formData.capacity_kg < 0) {
            newErrors.capacity_kg = 'Capacidade não pode ser negativa';
        }

        if (formData.monthly_cost && formData.monthly_cost < 0) {
            newErrors.monthly_cost = 'Custo mensal não pode ser negativo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (validateForm()) {
            // Formatar a placa
            const formattedData = {
                ...formData,
                plate: formData.plate?.toUpperCase().replace(/\s/g, '')
            };
            
            onSave(formattedData);
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

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={vehicle ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
            size="large"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações Básicas */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Placa <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.plate || ''}
                                onChange={(e) => handleChange('plate', e.target.value.toUpperCase())}
                                placeholder="ABC-1234"
                                maxLength={8}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.plate ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.plate && (
                                <p className="text-red-500 text-xs mt-1">{errors.plate}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.type || 'Caminhão'}
                                onChange={(e) => handleChange('type', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Caminhão">Caminhão</option>
                                <option value="Van">Van</option>
                                <option value="Utilitário">Utilitário</option>
                                <option value="Moto">Moto</option>
                                <option value="Carro">Carro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Marca <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.brand || ''}
                                onChange={(e) => handleChange('brand', e.target.value)}
                                placeholder="Ex: Mercedes-Benz"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.brand ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.brand && (
                                <p className="text-red-500 text-xs mt-1">{errors.brand}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Modelo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.model || ''}
                                onChange={(e) => handleChange('model', e.target.value)}
                                placeholder="Ex: Accelo 815"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.model ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.model && (
                                <p className="text-red-500 text-xs mt-1">{errors.model}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ano <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.year || currentYear}
                                onChange={(e) => handleChange('year', parseInt(e.target.value))}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.year ? 'border-red-500' : 'border-gray-300'
                                }`}
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            {errors.year && (
                                <p className="text-red-500 text-xs mt-1">{errors.year}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Combustível <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.fuel_type || 'Diesel'}
                                onChange={(e) => handleChange('fuel_type', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Diesel">Diesel</option>
                                <option value="Gasolina">Gasolina</option>
                                <option value="Flex">Flex</option>
                                <option value="GNV">GNV</option>
                                <option value="Elétrico">Elétrico</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Capacidade e Quilometragem */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Capacidade e Quilometragem</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Capacidade (kg)
                            </label>
                            <input
                                type="number"
                                value={formData.capacity_kg || ''}
                                onChange={(e) => handleChange('capacity_kg', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="100"
                                placeholder="Ex: 3000"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.capacity_kg ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.capacity_kg && (
                                <p className="text-red-500 text-xs mt-1">{errors.capacity_kg}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Capacidade (unidades)
                            </label>
                            <input
                                type="number"
                                value={formData.capacity_units || ''}
                                onChange={(e) => handleChange('capacity_units', parseInt(e.target.value) || 0)}
                                min="0"
                                placeholder="Ex: 150"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quilometragem Atual
                            </label>
                            <input
                                type="number"
                                value={formData.mileage || ''}
                                onChange={(e) => handleChange('mileage', parseFloat(e.target.value) || 0)}
                                min="0"
                                placeholder="Ex: 45000"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.mileage ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.mileage && (
                                <p className="text-red-500 text-xs mt-1">{errors.mileage}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Documentação e Validades */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Documentação e Validades</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vencimento do Seguro
                            </label>
                            <input
                                type="date"
                                value={formData.insurance_expiry || ''}
                                onChange={(e) => handleChange('insurance_expiry', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vencimento do Licenciamento
                            </label>
                            <input
                                type="date"
                                value={formData.license_expiry || ''}
                                onChange={(e) => handleChange('license_expiry', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vencimento da Inspeção
                            </label>
                            <input
                                type="date"
                                value={formData.inspection_expiry || ''}
                                onChange={(e) => handleChange('inspection_expiry', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Status e Propriedade */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Status e Propriedade</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.status || 'Disponível'}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Disponível">Disponível</option>
                                <option value="Em Rota">Em Rota</option>
                                <option value="Manutenção">Manutenção</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Propriedade
                            </label>
                            <select
                                value={formData.owner_type || 'Próprio'}
                                onChange={(e) => handleChange('owner_type', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Próprio">Próprio</option>
                                <option value="Alugado">Alugado</option>
                                <option value="Terceirizado">Terceirizado</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Custo Mensal (R$)
                            </label>
                            <input
                                type="number"
                                value={formData.monthly_cost || ''}
                                onChange={(e) => handleChange('monthly_cost', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="100"
                                placeholder="Ex: 2500.00"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.monthly_cost ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.monthly_cost && (
                                <p className="text-red-500 text-xs mt-1">{errors.monthly_cost}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Observações */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações
                    </label>
                    <textarea
                        value={formData.notes || ''}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        rows={3}
                        placeholder="Informações adicionais sobre o veículo..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

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
                        {vehicle ? 'Atualizar' : 'Cadastrar'} Veículo
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default VehicleFormModal;
