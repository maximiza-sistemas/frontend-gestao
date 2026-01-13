import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface DriverFormData {
    name: string;
    cpf: string;
    cnh_number: string;
    cnh_category: string;
    cnh_expiry: string;
    phone?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    hire_date: string;
    status: 'Ativo' | 'Inativo' | 'Férias' | 'Afastado';
}

interface DriverFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<DriverFormData>) => void;
    driver?: DriverFormData | null;
}

const DriverFormModal: React.FC<DriverFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    driver
}) => {
    const [formData, setFormData] = useState<Partial<DriverFormData>>({
        name: '',
        cpf: '',
        cnh_number: '',
        cnh_category: 'B',
        cnh_expiry: '',
        phone: '',
        emergency_contact: '',
        emergency_phone: '',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'Ativo'
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (driver) {
            setFormData(driver);
        } else {
            setFormData({
                name: '',
                cpf: '',
                cnh_number: '',
                cnh_category: 'B',
                cnh_expiry: '',
                phone: '',
                emergency_contact: '',
                emergency_phone: '',
                hire_date: new Date().toISOString().split('T')[0],
                status: 'Ativo'
            });
        }
        setErrors({});
    }, [driver, isOpen]);

    const formatCPF = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                '$1.$2.$3-$4'
            ).substring(0, 14);
        }
        return value.substring(0, 14);
    };

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            if (numbers.length === 11) {
                return numbers.replace(
                    /(\d{2})(\d{5})(\d{4})/,
                    '($1) $2-$3'
                );
            } else if (numbers.length === 10) {
                return numbers.replace(
                    /(\d{2})(\d{4})(\d{4})/,
                    '($1) $2-$3'
                );
            }
        }
        return value;
    };

    const validateCPF = (cpf: string) => {
        const numbers = cpf.replace(/\D/g, '');
        
        if (numbers.length !== 11) return false;
        
        // Verifica se todos os números são iguais
        if (/^(\d)\1{10}$/.test(numbers)) return false;
        
        // Validação do primeiro dígito
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(numbers[i]) * (10 - i);
        }
        let digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(numbers[9])) return false;
        
        // Validação do segundo dígito
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(numbers[i]) * (11 - i);
        }
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(numbers[10])) return false;
        
        return true;
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Nome é obrigatório';
        } else if (formData.name.trim().length < 3) {
            newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
        }

        if (!formData.cpf?.trim()) {
            newErrors.cpf = 'CPF é obrigatório';
        } else if (!validateCPF(formData.cpf)) {
            newErrors.cpf = 'CPF inválido';
        }

        if (!formData.cnh_number?.trim()) {
            newErrors.cnh_number = 'Número da CNH é obrigatório';
        } else if (formData.cnh_number.replace(/\D/g, '').length !== 11) {
            newErrors.cnh_number = 'CNH deve ter 11 dígitos';
        }

        if (!formData.cnh_category) {
            newErrors.cnh_category = 'Categoria da CNH é obrigatória';
        }

        if (!formData.cnh_expiry) {
            newErrors.cnh_expiry = 'Validade da CNH é obrigatória';
        } else {
            const expiryDate = new Date(formData.cnh_expiry);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (expiryDate < today) {
                newErrors.cnh_expiry = 'CNH está vencida';
            }
        }

        if (formData.phone && formData.phone.replace(/\D/g, '').length < 10) {
            newErrors.phone = 'Telefone inválido';
        }

        if (formData.emergency_phone && formData.emergency_phone.replace(/\D/g, '').length < 10) {
            newErrors.emergency_phone = 'Telefone de emergência inválido';
        }

        if (!formData.hire_date) {
            newErrors.hire_date = 'Data de contratação é obrigatória';
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
        let formattedValue = value;
        
        if (field === 'cpf') {
            formattedValue = formatCPF(value);
        } else if (field === 'phone' || field === 'emergency_phone') {
            formattedValue = formatPhone(value);
        }
        
        setFormData(prev => ({
            ...prev,
            [field]: formattedValue
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
            title={driver ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}
            size="large"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Pessoais */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Completo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="Ex: João da Silva"
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.name ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.name && (
                                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                CPF <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.cpf || ''}
                                onChange={(e) => handleChange('cpf', e.target.value)}
                                placeholder="000.000.000-00"
                                maxLength={14}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.cpf ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.cpf && (
                                <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefone
                            </label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.phone ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.phone && (
                                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dados da CNH */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Dados da CNH</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número da CNH <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.cnh_number || ''}
                                onChange={(e) => handleChange('cnh_number', e.target.value.replace(/\D/g, ''))}
                                placeholder="00000000000"
                                maxLength={11}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.cnh_number ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.cnh_number && (
                                <p className="text-red-500 text-xs mt-1">{errors.cnh_number}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Categoria <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.cnh_category || 'B'}
                                onChange={(e) => handleChange('cnh_category', e.target.value)}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.cnh_category ? 'border-red-500' : 'border-gray-300'
                                }`}
                            >
                                <option value="A">A - Moto</option>
                                <option value="B">B - Carro</option>
                                <option value="C">C - Caminhão</option>
                                <option value="D">D - Ônibus</option>
                                <option value="E">E - Carreta</option>
                                <option value="AB">AB - Moto e Carro</option>
                                <option value="AC">AC - Moto e Caminhão</option>
                                <option value="AD">AD - Moto e Ônibus</option>
                                <option value="AE">AE - Moto e Carreta</option>
                            </select>
                            {errors.cnh_category && (
                                <p className="text-red-500 text-xs mt-1">{errors.cnh_category}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Validade da CNH <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.cnh_expiry || ''}
                                onChange={(e) => handleChange('cnh_expiry', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.cnh_expiry ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.cnh_expiry && (
                                <p className="text-red-500 text-xs mt-1">{errors.cnh_expiry}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contato de Emergência */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contato de Emergência</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do Contato
                            </label>
                            <input
                                type="text"
                                value={formData.emergency_contact || ''}
                                onChange={(e) => handleChange('emergency_contact', e.target.value)}
                                placeholder="Ex: Maria da Silva"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefone de Emergência
                            </label>
                            <input
                                type="text"
                                value={formData.emergency_phone || ''}
                                onChange={(e) => handleChange('emergency_phone', e.target.value)}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.emergency_phone ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.emergency_phone && (
                                <p className="text-red-500 text-xs mt-1">{errors.emergency_phone}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Informações de Trabalho */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informações de Trabalho</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data de Contratação <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.hire_date || ''}
                                onChange={(e) => handleChange('hire_date', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                    errors.hire_date ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.hire_date && (
                                <p className="text-red-500 text-xs mt-1">{errors.hire_date}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.status || 'Ativo'}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                                <option value="Férias">Férias</option>
                                <option value="Afastado">Afastado</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Resumo */}
                {formData.name && formData.cpf && formData.cnh_number && (
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-700 mb-2">Resumo do Cadastro</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-500">Nome:</span>
                                <span className="ml-2 font-medium">{formData.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">CPF:</span>
                                <span className="ml-2 font-medium">{formData.cpf}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">CNH:</span>
                                <span className="ml-2 font-medium">{formData.cnh_number} - Cat. {formData.cnh_category}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Status:</span>
                                <span className={`ml-2 font-medium ${
                                    formData.status === 'Ativo' ? 'text-green-600' : 
                                    formData.status === 'Inativo' ? 'text-red-600' : 
                                    'text-yellow-600'
                                }`}>
                                    {formData.status}
                                </span>
                            </div>
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
                        {driver ? 'Atualizar' : 'Cadastrar'} Motorista
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default DriverFormModal;
