# Gas Distributor - Frontend

Sistema de gestão para distribuidora de gás - Interface React

## Tecnologias
- React 19
- TypeScript
- Vite
- TailwindCSS

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Build para Produção

```bash
npm run build
```

Os arquivos de produção serão gerados na pasta `dist/`.

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz:

```env
VITE_API_BASE_URL=https://seu-backend.com/api
```

## Deploy (EasyPanel)

1. Configure um novo serviço "Static Site" ou "Nixpacks"
2. Aponte para este repositório
3. Build command: `npm run build`
4. Output directory: `dist`
5. Configure a variável `VITE_API_BASE_URL`
