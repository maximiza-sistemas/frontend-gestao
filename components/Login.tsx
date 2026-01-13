import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

// Logo da Copa Energia como componente
function CopaEnergiaLogo() {
  return (
    <div className="flex items-center justify-center space-x-3">
      {/* Ícone inspirado no logo da Copa Energia */}
      <div className="relative">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Pétalas/Raios em laranja */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) * Math.PI / 180;
            const x1 = 30 + Math.cos(angle) * 15;
            const y1 = 30 + Math.sin(angle) * 15;
            const x2 = 30 + Math.cos(angle) * 25;
            const y2 = 30 + Math.sin(angle) * 25;
            
            return (
              <ellipse
                key={i}
                cx={(x1 + x2) / 2}
                cy={(y1 + y2) / 2}
                rx="4"
                ry="2.5"
                transform={`rotate(${i * 30} 30 30)`}
                fill="#f97316"
                opacity={i % 2 === 0 ? 1 : 0.7}
              />
            );
          })}
          {/* Centro */}
          <circle cx="30" cy="30" r="8" fill="#1a4d4a" />
        </svg>
      </div>
      {/* Texto COPA energia */}
      <div className="flex flex-col">
        <span className="text-white text-3xl font-bold tracking-wider">COPA</span>
        <span className="text-white text-xl font-light tracking-wider">energia</span>
      </div>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('🔑 Tentando fazer login com:', { email, password });

    try {
      const result = await login(email, password);
      console.log('📝 Resultado do login:', result);
      
      if (!result.success) {
        console.error('❌ Login falhou:', result.error);
        setError(result.error || 'Erro no login');
      } else {
        console.log('✅ Login bem-sucedido!');
      }
      // Se sucesso, o useAuth já redireciona automaticamente
    } catch (error) {
      console.error('🔥 Erro ao fazer login:', error);
      setError('Erro de conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a4d4a] to-[#0f3331] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <CopaEnergiaLogo />
        </div>
        <p className="mt-4 text-center text-sm text-white/80">
          Sistema de Gestão de Distribuidora de Gás
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1a4d4a]">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="admin@sisgas.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1a4d4a]">
                Senha
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="Digite sua senha"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#f97316] to-[#fb923c] hover:from-[#ea580c] hover:to-[#f97316] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f97316] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-[#1a4d4a] font-medium">Credenciais de teste</span>
              </div>
            </div>

            <div className="mt-4 bg-[#1a4d4a]/5 rounded-lg p-4">
              <div className="text-sm text-[#1a4d4a] space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#f97316]">Admin:</span>
                  <span className="text-xs">admin@sisgas.com / admin123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#f97316]">Gerente:</span>
                  <span className="text-xs">gerente@sisgas.com / gerente123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#f97316]">Vendedor:</span>
                  <span className="text-xs">vendedor1@sisgas.com / vendedor123</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
