import React from 'react';
import { RouteStop } from '../../types';

interface RouteMapProps {
  stops: RouteStop[];
  className?: string;
}

const RouteMap: React.FC<RouteMapProps> = ({ stops, className = '' }) => {
  // Em produção, aqui seria integrado com Google Maps ou Mapbox
  // Por enquanto, vamos criar uma visualização simplificada
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Entregue': return 'text-green-600 bg-green-100';
      case 'Em Andamento': return 'text-blue-600 bg-blue-100';
      case 'Não Entregue': return 'text-red-600 bg-red-100';
      case 'Parcial': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Entregue': return '✓';
      case 'Em Andamento': return '⏳';
      case 'Não Entregue': return '✗';
      case 'Parcial': return '⚠';
      default: return '○';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Rota de Entrega</h3>
        <p className="text-sm text-gray-500 mt-1">
          {stops.length} paradas programadas
        </p>
      </div>

      <div className="p-4">
        {/* Mapa simulado */}
        <div className="bg-gray-100 rounded-lg h-64 mb-4 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50"></div>
          
          {/* Linha conectando os pontos */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            <path
              d={`M ${stops.map((_, i) => `${50 + i * 150},${100 + Math.sin(i) * 30}`).join(' L ')}`}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
          </svg>

          {/* Pontos de parada */}
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + index * 150}px`,
                top: `${100 + Math.sin(index) * 30}px`,
                zIndex: 2
              }}
            >
              <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold ${getStatusColor(stop.deliveryStatus)}`}>
                {index + 1}
              </div>
            </div>
          ))}

          <div className="relative z-10 text-center">
            <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-500">Visualização do Mapa</p>
            <p className="text-xs text-gray-400 mt-1">Integração com Google Maps em breve</p>
          </div>
        </div>

        {/* Lista de paradas */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sequência de Entregas:</h4>
          
          {stops.map((stop, index) => (
            <div key={stop.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getStatusColor(stop.deliveryStatus)}`}>
                  {getStatusIcon(stop.deliveryStatus)}
                </div>
              </div>
              
              <div className="flex-grow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {index + 1}. {stop.clientName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      📍 {stop.deliveryAddress}
                    </p>
                    
                    {stop.products && stop.products.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Produtos:</span>
                        {stop.products.map((p, i) => (
                          <span key={i} className="ml-2">
                            {p.quantity}x {p.name}
                            {i < stop.products!.length - 1 && ','}
                          </span>
                        ))}
                      </div>
                    )}

                    {stop.estimatedArrival && (
                      <p className="text-xs text-gray-500 mt-1">
                        ⏰ Chegada estimada: {stop.estimatedArrival}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(stop.deliveryStatus)}`}>
                      {stop.deliveryStatus}
                    </span>
                    
                    {stop.actualArrival && (
                      <p className="text-xs text-gray-500 mt-1">
                        Entregue: {stop.actualArrival}
                      </p>
                    )}
                  </div>
                </div>

                {stop.deliveryNotes && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                    📝 {stop.deliveryNotes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
