import React, { useState } from 'react';
import { MaintenanceType, MaintenanceStatus, Client } from '../../types';
import Modal from './Modal';
import Button from './Button';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (maintenance: any) => void;
  productName: string;
  productId: number;
  locationName: string;
  locationId: number;
  clients: Client[];
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productName,
  productId,
  locationName,
  locationId,
  clients
}) => {
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Vazamento');
  const [damageDescription, setDamageDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [clientId, setClientId] = useState<number | null>(null);
  const [chargeClient, setChargeClient] = useState(false);
  const [maintenanceCost, setMaintenanceCost] = useState<number>(0);
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [customType, setCustomType] = useState('');

  const maintenanceTypes: MaintenanceType[] = [
    'Vazamento',
    'Válvula Danificada',
    'Amassado',
    'Ferrugem',
    'Pintura',
    'Outro'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!damageDescription.trim()) {
      alert('Por favor, descreva o dano');
      return;
    }

    if (chargeClient && !clientId) {
      alert('Por favor, selecione o cliente responsável');
      return;
    }

    const maintenance = {
      productId,
      productName,
      locationId,
      locationName,
      clientId: chargeClient ? clientId : null,
      clientName: chargeClient && clientId ? clients.find(c => c.id === clientId)?.name : null,
      maintenanceType,
      damageDescription: maintenanceType === 'Outro' && customType ? `${customType}: ${damageDescription}` : damageDescription,
      quantity,
      status: 'Pendente' as MaintenanceStatus,
      maintenanceCost: chargeClient ? maintenanceCost : 0,
      chargeClient,
      maintenanceDate,
      technicianNotes,
      createdAt: new Date().toISOString()
    };

    onSave(maintenance);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setMaintenanceType('Vazamento');
    setDamageDescription('');
    setQuantity(1);
    setClientId(null);
    setChargeClient(false);
    setMaintenanceCost(0);
    setMaintenanceDate(new Date().toISOString().split('T')[0]);
    setTechnicianNotes('');
    setCustomType('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Produto para Manutenção"
      size="large"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Informações do Produto */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Produto</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Produto:</span>
                <span className="ml-2 font-medium">{productName}</span>
              </div>
              <div>
                <span className="text-gray-500">Local:</span>
                <span className="ml-2 font-medium">{locationName}</span>
              </div>
            </div>
          </div>

          {/* Tipo de Manutenção */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Dano/Problema *
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              required
            >
              {maintenanceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            {maintenanceType === 'Outro' && (
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Especifique o tipo de dano"
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            )}
          </div>

          {/* Descrição do Dano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição Detalhada do Dano *
            </label>
            <textarea
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="Descreva o problema encontrado no produto..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade de Produtos
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>

            {/* Data da Manutenção */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do Registro
              </label>
              <input
                type="date"
                value={maintenanceDate}
                onChange={(e) => setMaintenanceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>

          {/* Responsabilidade do Cliente */}
          <div className="border-t pt-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="charge-client"
                checked={chargeClient}
                onChange={(e) => setChargeClient(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="charge-client" className="ml-2 text-sm font-medium text-gray-700">
                Cliente responsável pelo dano
              </label>
            </div>

            {chargeClient && (
              <div className="space-y-4 ml-6">
                {/* Seleção do Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione o Cliente *
                  </label>
                  <select
                    value={clientId || ''}
                    onChange={(e) => setClientId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    required={chargeClient}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.filter(c => c.status === 'Ativo').map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custo da Manutenção */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custo Estimado da Manutenção (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maintenanceCost}
                    onChange={(e) => setMaintenanceCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>

                {clientId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Atenção:</strong> O cliente será notificado e o valor poderá ser cobrado na próxima fatura.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observações Técnicas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações Técnicas (Opcional)
            </label>
            <textarea
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="Notas adicionais sobre a manutenção necessária..."
            />
          </div>
        </div>

        {/* Botões */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              handleReset();
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Registrar Manutenção
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MaintenanceModal;
