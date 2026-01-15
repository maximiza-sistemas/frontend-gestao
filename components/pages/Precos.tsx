import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';
import Button from '../common/Button';
import ProductPurchaseModal from '../common/ProductPurchaseModal';

const Precos: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await api.getActiveProducts();
            if (response.success) {
                setProducts(response.data || []);
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleManagePurchases = (product: any) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Preços de Compra"
                subtitle="Registre e acompanhe os preços de compra dos produtos"
                action={
                    <Button
                        variant="secondary"
                        icon="fa-solid fa-sync"
                        onClick={fetchProducts}
                    >
                        Atualizar
                    </Button>
                }
            />

            <FilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Buscar produto..."
            />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
                            <p className="text-gray-600">Carregando produtos...</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Último Preço Compra</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Data da Última Compra</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            Nenhum produto encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => {
                                        const priceBuy = parseFloat(product.price_buy || '0');
                                        // Formatar data sem usar new Date() para evitar problema de timezone
                                        const formatDate = (dateStr: string) => {
                                            if (!dateStr) return '-';
                                            const parts = dateStr.split('T')[0].split('-');
                                            if (parts.length === 3) {
                                                return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                            }
                                            return dateStr;
                                        };
                                        const lastPurchaseDate = product.last_purchase_date
                                            ? formatDate(product.last_purchase_date)
                                            : '-';

                                        return (
                                            <tr key={product.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{product.name}</div>
                                                    <div className="text-xs text-gray-500">{product.description}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="text-lg font-semibold text-blue-600">
                                                        R$ {priceBuy.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`text-sm ${product.last_purchase_location ? 'text-gray-700' : 'text-gray-400'}`}>
                                                        {product.last_purchase_location || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`text-sm ${product.last_purchase_date ? 'text-gray-700' : 'text-gray-400'}`}>
                                                        {lastPurchaseDate}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleManagePurchases(product)}
                                                        className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                                                    >
                                                        <i className="fa-solid fa-shopping-cart mr-2"></i>
                                                        Registrar Compra
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ProductPurchaseModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchProducts(); // Refresh to get updated prices
                }}
                product={selectedProduct}
            />
        </div>
    );
};

export default Precos;
