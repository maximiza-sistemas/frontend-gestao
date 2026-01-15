import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { api } from '../../services/api';

interface ProductFormData {
  name: string;
  description: string;
  weight_kg: string;
  status: string;
  // Localização (filial) onde o produto será cadastrado
  location_id?: string;
  // Campos de estoque inicial (apenas para criação)
  initial_full_quantity?: string;
  initial_empty_quantity?: string;
  initial_maintenance_quantity?: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: any;
  mode: 'create' | 'edit';
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    weight_kg: '',
    status: 'Ativo',
    location_id: '',
    initial_full_quantity: '0',
    initial_empty_quantity: '0',
    initial_maintenance_quantity: '0'
  });

  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<{ id: number, name: string }[]>([]);

  // Buscar localizações disponíveis
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await api.getStock();
        if (response.success && response.data) {
          const uniqueLocations = Array.from(
            new Map((response.data as any[]).map((item: any) => [item.location_id, { id: item.location_id, name: item.location_name }])).values()
          );
          setLocations(uniqueLocations);
          // Definir primeira localização como padrão se houver
          if (uniqueLocations.length > 0 && !formData.location_id) {
            setFormData(prev => ({ ...prev, location_id: uniqueLocations[0].id.toString() }));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar localizações:', error);
      }
    };
    if (isOpen && mode === 'create') {
      fetchLocations();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        weight_kg: initialData.weight_kg?.toString() || '',
        status: initialData.status || 'Ativo'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        weight_kg: '',
        status: 'Ativo',
        location_id: locations.length > 0 ? locations[0].id.toString() : '',
        initial_full_quantity: '0',
        initial_empty_quantity: '0',
        initial_maintenance_quantity: '0'
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [initialData, mode, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpar erro do campo ao digitar
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do produto é obrigatório';
    }

    if (formData.weight_kg && parseFloat(formData.weight_kg) <= 0) {
      newErrors.weight_kg = 'Peso deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setSubmitError(null);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Cadastrar Produto' : 'Editar Produto'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Produto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Produto *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="Ex: P13, P45, P90"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Descrição do produto"
          />
        </div>

        {/* Peso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Peso (kg)
          </label>
          <input
            type="number"
            name="weight_kg"
            value={formData.weight_kg}
            onChange={handleChange}
            step="0.01"
            min="0"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.weight_kg ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="13.00"
          />
          {errors.weight_kg && <p className="mt-1 text-sm text-red-600">{errors.weight_kg}</p>}
        </div>



        {/* Estoque Inicial - Apenas no modo create */}
        {mode === 'create' && (
          <>
            <div className="border-t-2 border-orange-200 pt-4 mt-6">
              <div className="bg-orange-50 p-3 rounded-md mb-4">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                  <i className="fa-solid fa-boxes-stacked mr-2 text-orange-600"></i>
                  Configuração de Estoque Inicial
                </h3>
                <p className="text-xs text-gray-600 mt-1">Selecione a filial e defina as quantidades iniciais</p>
              </div>

              {/* Seleção de Localização/Filial */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filial *
                </label>
                <select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {locations.length === 0 ? (
                    <option value="">Carregando localizações...</option>
                  ) : (
                    locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">O produto será cadastrado apenas nesta filial</p>
              </div>              <div className="grid grid-cols-3 gap-4">
                {/* Botijões Cheios */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheios
                  </label>
                  <input
                    type="number"
                    name="initial_full_quantity"
                    value={formData.initial_full_quantity}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>

                {/* Botijões Vazios */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vazios
                  </label>
                  <input
                    type="number"
                    name="initial_empty_quantity"
                    value={formData.initial_empty_quantity}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>

                {/* Botijões em Manutenção */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manutenção
                  </label>
                  <input
                    type="number"
                    name="initial_maintenance_quantity"
                    value={formData.initial_maintenance_quantity}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>

        {submitError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            icon={isSubmitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'}
          >
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Cadastrar' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;
