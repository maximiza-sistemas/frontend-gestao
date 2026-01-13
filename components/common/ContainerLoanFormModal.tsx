import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ProductItem {
    product_id: string;
    quantity: string;
}

interface ContainerLoanFormData {
    loan_type: string;
    direction: string;
    products: ProductItem[];
    entity_type: string;
    entity_name: string;
    entity_contact: string;
    entity_address: string;
    loan_date: string;
    expected_return_date: string;
    notes: string;
    location_id: string;
}

interface Product {
    id: number;
    name: string;
}

interface Location {
    id: number;
    name: string;
}

interface ContainerLoanFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    mode: 'create' | 'edit';
    products: Product[];
    locations: Location[];
}

const ContainerLoanFormModal: React.FC<ContainerLoanFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    mode = 'create',
    products = [],
    locations = []
}) => {
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState<ContainerLoanFormData>({
        loan_type: 'Empréstimo',
        direction: 'Saída',
        products: [{ product_id: '', quantity: '1' }],
        entity_type: 'Empresa',
        entity_name: '',
        entity_contact: '',
        entity_address: '',
        loan_date: today,
        expected_return_date: '',
        notes: '',
        location_id: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData && mode === 'edit') {
            // Para edição, mantemos compatibilidade com formato antigo (produto único)
            const productsList: ProductItem[] = initialData.product_id
                ? [{ product_id: initialData.product_id?.toString() || '', quantity: initialData.quantity?.toString() || '1' }]
                : [{ product_id: '', quantity: '1' }];

            setFormData({
                loan_type: initialData.loan_type || 'Empréstimo',
                direction: initialData.direction || 'Saída',
                products: productsList,
                entity_type: initialData.entity_type || 'Empresa',
                entity_name: initialData.entity_name || '',
                entity_contact: initialData.entity_contact || '',
                entity_address: initialData.entity_address || '',
                loan_date: initialData.loan_date?.split('T')[0] || today,
                expected_return_date: initialData.expected_return_date?.split('T')[0] || '',
                notes: initialData.notes || '',
                location_id: initialData.location_id?.toString() || ''
            });
        } else {
            setFormData({
                loan_type: 'Empréstimo',
                direction: 'Saída',
                products: [{ product_id: products.length > 0 ? products[0].id.toString() : '', quantity: '1' }],
                entity_type: 'Empresa',
                entity_name: '',
                entity_contact: '',
                entity_address: '',
                loan_date: today,
                expected_return_date: '',
                notes: '',
                location_id: locations.length > 0 ? locations[0].id.toString() : ''
            });
        }
        setErrors({});
        setSubmitError(null);
    }, [initialData, mode, isOpen, products, locations]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleProductChange = (index: number, field: 'product_id' | 'quantity', value: string) => {
        const updatedProducts = [...formData.products];
        updatedProducts[index] = { ...updatedProducts[index], [field]: value };
        setFormData(prev => ({ ...prev, products: updatedProducts }));
        // Limpar erro do produto
        if (errors[`product_${index}`]) {
            setErrors(prev => ({ ...prev, [`product_${index}`]: '' }));
        }
    };

    const addProduct = () => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, { product_id: '', quantity: '1' }]
        }));
    };

    const removeProduct = (index: number) => {
        if (formData.products.length > 1) {
            setFormData(prev => ({
                ...prev,
                products: prev.products.filter((_, i) => i !== index)
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setErrors(prev => ({ ...prev, contract: 'Apenas arquivos PDF são permitidos' }));
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, contract: 'Arquivo deve ter no máximo 10MB' }));
                return;
            }
            setContractFile(file);
            setErrors(prev => ({ ...prev, contract: '' }));
        }
    };

    const removeContractFile = () => {
        setContractFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validar cada produto
        formData.products.forEach((item, index) => {
            if (!item.product_id) {
                newErrors[`product_${index}`] = 'Selecione um produto';
            }
            if (!item.quantity || parseInt(item.quantity) <= 0) {
                newErrors[`quantity_${index}`] = 'Quantidade deve ser maior que zero';
            }
        });

        // Verificar produtos duplicados
        const productIds = formData.products.map(p => p.product_id).filter(id => id);
        const uniqueIds = new Set(productIds);
        if (productIds.length !== uniqueIds.size) {
            newErrors.products_duplicate = 'Não é permitido selecionar o mesmo produto mais de uma vez';
        }

        if (!formData.entity_name.trim()) {
            newErrors.entity_name = 'Nome é obrigatório';
        }

        if (!formData.loan_date) {
            newErrors.loan_date = 'Data do empréstimo é obrigatória';
        }

        if (!formData.location_id) {
            newErrors.location_id = 'Selecione uma localização';
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
            // Preparar dados para envio
            const productsData = formData.products.map(item => ({
                product_id: parseInt(item.product_id),
                quantity: parseInt(item.quantity)
            }));

            // Se apenas um produto, enviar no formato antigo para compatibilidade
            if (productsData.length === 1) {
                await onSubmit({
                    loan_type: formData.loan_type,
                    direction: formData.direction,
                    product_id: productsData[0].product_id,
                    quantity: productsData[0].quantity,
                    entity_type: formData.entity_type,
                    entity_name: formData.entity_name,
                    entity_contact: formData.entity_contact,
                    entity_address: formData.entity_address,
                    loan_date: formData.loan_date,
                    expected_return_date: formData.expected_return_date,
                    notes: formData.notes,
                    location_id: formData.location_id ? parseInt(formData.location_id) : undefined,
                    contract_file: contractFile
                });
            } else {
                // Múltiplos produtos - enviar um empréstimo para cada produto
                for (const product of productsData) {
                    await onSubmit({
                        loan_type: formData.loan_type,
                        direction: formData.direction,
                        product_id: product.product_id,
                        quantity: product.quantity,
                        entity_type: formData.entity_type,
                        entity_name: formData.entity_name,
                        entity_contact: formData.entity_contact,
                        entity_address: formData.entity_address,
                        loan_date: formData.loan_date,
                        expected_return_date: formData.expected_return_date,
                        notes: formData.notes,
                        location_id: formData.location_id ? parseInt(formData.location_id) : undefined,
                        contract_file: contractFile
                    });
                }
            }
            setSubmitError(null);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar empréstimo:', error);
            setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar empréstimo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const directionLabel = formData.direction === 'Saída'
        ? 'Emprestando recipientes para terceiros'
        : 'Recebendo recipientes de terceiros';

    // Obter produtos disponíveis (não selecionados em outras linhas)
    const getAvailableProducts = (currentIndex: number) => {
        const selectedIds = formData.products
            .filter((_, i) => i !== currentIndex)
            .map(p => p.product_id);
        return products.filter(p => !selectedIds.includes(p.id.toString()));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'create' ? 'Registrar Empréstimo de Recipiente' : 'Editar Empréstimo'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo e Direção */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo *
                        </label>
                        <select
                            name="loan_type"
                            value={formData.loan_type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="Empréstimo">Empréstimo</option>
                            <option value="Comodato">Comodato</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Direção *
                        </label>
                        <select
                            name="direction"
                            value={formData.direction}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="Saída">Saída (Emprestando)</option>
                            <option value="Entrada">Entrada (Recebendo)</option>
                        </select>
                    </div>
                </div>

                {/* Info da direção */}
                <div className={`p-3 rounded-md text-sm ${formData.direction === 'Saída' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                    <i className={`fa-solid ${formData.direction === 'Saída' ? 'fa-arrow-up-from-bracket' : 'fa-arrow-down-to-bracket'} mr-2`}></i>
                    {directionLabel}
                </div>

                {/* Produtos (múltiplos) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                            Produtos *
                        </label>
                        <button
                            type="button"
                            onClick={addProduct}
                            className="text-sm text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"
                        >
                            <i className="fa-solid fa-plus"></i>
                            Adicionar Produto
                        </button>
                    </div>

                    {errors.products_duplicate && (
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{errors.products_duplicate}</p>
                    )}

                    {formData.products.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-md">
                            <div className="flex-1">
                                <select
                                    value={item.product_id}
                                    onChange={(e) => handleProductChange(index, 'product_id', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors[`product_${index}`] ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">Selecione o produto...</option>
                                    {getAvailableProducts(index).map(product => (
                                        <option key={product.id} value={product.id}>{product.name}</option>
                                    ))}
                                    {/* Mostrar o produto atual mesmo que já esteja selecionado */}
                                    {item.product_id && !getAvailableProducts(index).find(p => p.id.toString() === item.product_id) && (
                                        <option value={item.product_id}>
                                            {products.find(p => p.id.toString() === item.product_id)?.name}
                                        </option>
                                    )}
                                </select>
                                {errors[`product_${index}`] && <p className="mt-1 text-xs text-red-600">{errors[`product_${index}`]}</p>}
                            </div>
                            <div className="w-24">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                                    min="1"
                                    placeholder="Qtd"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors[`quantity_${index}`] ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {errors[`quantity_${index}`] && <p className="mt-1 text-xs text-red-600">{errors[`quantity_${index}`]}</p>}
                            </div>
                            {formData.products.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeProduct(index)}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                    title="Remover produto"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Localização */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Localização *
                    </label>
                    <select
                        name="location_id"
                        value={formData.location_id}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.location_id ? 'border-red-500' : 'border-gray-300'
                            }`}
                    >
                        <option value="">Selecione...</option>
                        {locations.map(location => (
                            <option key={location.id} value={location.id}>{location.name}</option>
                        ))}
                    </select>
                    {errors.location_id && <p className="mt-1 text-sm text-red-600">{errors.location_id}</p>}
                </div>

                {/* Tipo de Entidade */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Entidade *
                    </label>
                    <select
                        name="entity_type"
                        value={formData.entity_type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="Empresa">Empresa</option>
                        <option value="Pessoa Física">Pessoa Física</option>
                    </select>
                </div>

                {/* Nome da Entidade */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.entity_type === 'Empresa' ? 'Nome da Empresa' : 'Nome da Pessoa'} *
                    </label>
                    <input
                        type="text"
                        name="entity_name"
                        value={formData.entity_name}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.entity_name ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder={formData.entity_type === 'Empresa' ? 'Nome da empresa' : 'Nome completo'}
                    />
                    {errors.entity_name && <p className="mt-1 text-sm text-red-600">{errors.entity_name}</p>}
                </div>

                {/* Contato e Endereço */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contato
                        </label>
                        <input
                            type="text"
                            name="entity_contact"
                            value={formData.entity_contact}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Telefone ou email"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Endereço
                        </label>
                        <input
                            type="text"
                            name="entity_address"
                            value={formData.entity_address}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Endereço"
                        />
                    </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data do Empréstimo *
                        </label>
                        <input
                            type="date"
                            name="loan_date"
                            value={formData.loan_date}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.loan_date ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.loan_date && <p className="mt-1 text-sm text-red-600">{errors.loan_date}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Previsão de Devolução
                        </label>
                        <input
                            type="date"
                            name="expected_return_date"
                            value={formData.expected_return_date}
                            onChange={handleChange}
                            min={formData.loan_date}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>

                {/* Observações */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Observações adicionais"
                    />
                </div>

                {/* Upload de Contrato */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <i className="fa-solid fa-file-pdf mr-2 text-red-600"></i>
                        Contrato (PDF)
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-300 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-upload"></i>
                            {contractFile ? 'Alterar arquivo' : 'Selecionar arquivo'}
                        </button>
                        {contractFile && (
                            <div className="flex items-center gap-2 flex-1 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                                <i className="fa-solid fa-file-pdf text-red-500"></i>
                                <span className="text-sm text-green-800 truncate flex-1">{contractFile.name}</span>
                                <span className="text-xs text-gray-500">
                                    ({(contractFile.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                    type="button"
                                    onClick={removeContractFile}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Remover arquivo"
                                >
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>
                        )}
                    </div>
                    {errors.contract && <p className="mt-1 text-sm text-red-600">{errors.contract}</p>}
                    <p className="mt-1 text-xs text-gray-500">Formato aceito: PDF (máximo 10MB)</p>
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
                        {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Registrar' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Modal >
    );
};

export default ContainerLoanFormModal;
