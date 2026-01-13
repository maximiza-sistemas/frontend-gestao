import React, { useState, useEffect } from 'react';
import { StockItem } from '../../types';
import Modal from './Modal';
import Button from './Button';

interface StockFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Omit<StockItem, 'id'>) => void;
    item?: StockItem | null;
    title?: string;
}

const StockFormModal: React.FC<StockFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    item,
    title = 'Cadastrar Produto no Estoque'
}) => {
    const [formData, setFormData] = useState({
        name: '',
        location: 'Matriz' as 'Matriz' | 'Filial',
        full: 0,
        empty: 0,
        maintenance: 0,
        minStock: 50,
        maxStock: 500,
        lastUpdate: new Date().toISOString().split('T')[0]
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name,
                location: item.location,
                full: item.full,
                empty: item.empty,
                maintenance: item.maintenance,
                minStock: item.minStock || 50,
                maxStock: item.maxStock || 500,
                lastUpdate: item.lastUpdate || new Date().toISOString().split('T')[0]
            });
        } else {
            setFormData({
                name: '',
                location: 'Matriz',
                full: 0,
                empty: 0,
                maintenance: 0,
                minStock: 50,
                maxStock: 500,
                lastUpdate: new Date().toISOString().split('T')[0]
            });
        }
        setErrors({});
    }, [item, isOpen]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nome do produto é obrigatório';
        }

        if (formData.full < 0) {
            newErrors.full = 'Quantidade de cheios não pode ser negativa';
        }

        if (formData.empty < 0) {
            newErrors.empty = 'Quantidade de vazios não pode ser negativa';
        }

        if (formData.maintenance < 0) {
            newErrors.maintenance = 'Quantidade em manutenção não pode ser negativa';
        }

        if (formData.minStock < 0) {
            newErrors.minStock = 'Estoque mínimo não pode ser negativo';
        }

        if (formData.maxStock < formData.minStock) {
            newErrors.maxStock = 'Estoque máximo deve ser maior que o mínimo';
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome do Produto */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Produto <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                        <option value="">Selecione um produto</option>
                        <option value="P13">P13 - Botijão 13kg</option>
                        <option value="P20">P20 - Botijão 20kg</option>
                        <option value="P45">P45 - Botijão 45kg</option>
                        <option value="P90">P90 - Cilindro 90kg</option>
                        <option value="P190">P190 - Cilindro 190kg</option>
                    </select>
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                </div>

                {/* Localização */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Localização <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="Matriz">Matriz</option>
                        <option value="Filial">Filial</option>
                    </select>
                </div>

                {/* Quantidades */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cheios
                        </label>
                        <input
                            type="number"
                            value={formData.full}
                            onChange={(e) => handleChange('full', parseInt(e.target.value) || 0)}
                            min="0"
                            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                errors.full ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.full && (
                            <p className="text-red-500 text-xs mt-1">{errors.full}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vazios
                        </label>
                        <input
                            type="number"
                            value={formData.empty}
                            onChange={(e) => handleChange('empty', parseInt(e.target.value) || 0)}
                            min="0"
                            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                errors.empty ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.empty && (
                            <p className="text-red-500 text-xs mt-1">{errors.empty}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Manutenção
                        </label>
                        <input
                            type="number"
                            value={formData.maintenance}
                            onChange={(e) => handleChange('maintenance', parseInt(e.target.value) || 0)}
                            min="0"
                            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                errors.maintenance ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.maintenance && (
                            <p className="text-red-500 text-xs mt-1">{errors.maintenance}</p>
                        )}
                    </div>
                </div>

                {/* Limites de Estoque */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estoque Mínimo
                        </label>
                        <input
                            type="number"
                            value={formData.minStock}
                            onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                            min="0"
                            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                errors.minStock ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.minStock && (
                            <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estoque Máximo
                        </label>
                        <input
                            type="number"
                            value={formData.maxStock}
                            onChange={(e) => handleChange('maxStock', parseInt(e.target.value) || 0)}
                            min="0"
                            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                errors.maxStock ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.maxStock && (
                            <p className="text-red-500 text-xs mt-1">{errors.maxStock}</p>
                        )}
                    </div>
                </div>

                {/* Data da Última Atualização */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data da Última Atualização
                    </label>
                    <input
                        type="date"
                        value={formData.lastUpdate}
                        onChange={(e) => handleChange('lastUpdate', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                {/* Resumo */}
                <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-700 mb-2">Resumo do Cadastro</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-500">Total de Unidades:</span>
                            <span className="ml-2 font-medium">{formData.full + formData.empty + formData.maintenance}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Disponíveis:</span>
                            <span className="ml-2 font-medium text-green-600">{formData.full}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Status do Estoque:</span>
                            <span className={`ml-2 font-medium ${
                                formData.full < formData.minStock ? 'text-red-600' : 
                                formData.full > formData.maxStock ? 'text-yellow-600' : 
                                'text-green-600'
                            }`}>
                                {formData.full < formData.minStock ? 'Baixo' : 
                                 formData.full > formData.maxStock ? 'Excesso' : 
                                 'Normal'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Local:</span>
                            <span className="ml-2 font-medium">{formData.location}</span>
                        </div>
                    </div>
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
                        {item ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default StockFormModal;
