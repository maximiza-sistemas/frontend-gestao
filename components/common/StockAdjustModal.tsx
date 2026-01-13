import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentData) => Promise<void>;
  stockItem: any;
}

interface AdjustmentData {
  product_id: number;
  location_id: number;
  bottle_type: 'Cheio' | 'Vazio' | 'Manutenção';
  quantity: number;
  adjustment_type: 'add' | 'subtract' | 'set';
  reason?: string;
}

const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  stockItem
}) => {
  const [bottleType, setBottleType] = useState<'Cheio' | 'Vazio' | 'Manutenção'>('Cheio');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBottleType('Cheio');
      setAdjustmentType('add');
      setQuantity('');
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  const getCurrentQuantity = () => {
    if (!stockItem) return 0;
    switch (bottleType) {
      case 'Cheio':
        return stockItem.full_quantity || 0;
      case 'Vazio':
        return stockItem.empty_quantity || 0;
      case 'Manutenção':
        return stockItem.maintenance_quantity || 0;
      default:
        return 0;
    }
  };

  const getNewQuantity = () => {
    const current = getCurrentQuantity();
    const qty = parseInt(quantity) || 0;

    switch (adjustmentType) {
      case 'add':
        return current + qty;
      case 'subtract':
        return Math.max(0, current - qty);
      case 'set':
        return qty;
      default:
        return current;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      setError('Quantidade deve ser maior que zero');
      return;
    }

    if (adjustmentType === 'subtract' && qty > getCurrentQuantity()) {
      setError('Quantidade a remover é maior que o estoque atual');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        product_id: stockItem.product_id,
        location_id: stockItem.location_id,
        bottle_type: bottleType,
        quantity: qty,
        adjustment_type: adjustmentType,
        reason: reason.trim() || undefined
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ajustar estoque');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stockItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar Estoque"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informações do Produto */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-semibold text-gray-900">{stockItem.product_name}</h4>
          <p className="text-sm text-gray-600">{stockItem.location_name}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Cheios:</span>
              <span className="ml-1 font-semibold text-green-700">{stockItem.full_quantity}</span>
            </div>
            <div>
              <span className="text-gray-500">Vazios:</span>
              <span className="ml-1 font-semibold text-blue-700">{stockItem.empty_quantity}</span>
            </div>
            <div>
              <span className="text-gray-500">Manutenção:</span>
              <span className="ml-1 font-semibold text-orange-700">{stockItem.maintenance_quantity}</span>
            </div>
          </div>
        </div>

        {/* Tipo de Botijão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Botijão
          </label>
          <select
            value={bottleType}
            onChange={(e) => setBottleType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="Cheio">Cheio</option>
            <option value="Vazio">Vazio</option>
            <option value="Manutenção">Manutenção</option>
          </select>
        </div>

        {/* Tipo de Ajuste */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Ajuste
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAdjustmentType('add')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                adjustmentType === 'add'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fa-solid fa-plus mr-1"></i>
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('subtract')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                adjustmentType === 'subtract'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fa-solid fa-minus mr-1"></i>
              Remover
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('set')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                adjustmentType === 'set'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fa-solid fa-edit mr-1"></i>
              Definir
            </button>
          </div>
        </div>

        {/* Quantidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Digite a quantidade"
          />
          {quantity && (
            <p className="mt-1 text-sm text-gray-600">
              Quantidade atual: <span className="font-semibold">{getCurrentQuantity()}</span>
              {' → '}
              Nova quantidade: <span className="font-semibold text-orange-600">{getNewQuantity()}</span>
            </p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Descreva o motivo do ajuste..."
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
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
            {isSubmitting ? 'Ajustando...' : 'Confirmar Ajuste'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StockAdjustModal;
