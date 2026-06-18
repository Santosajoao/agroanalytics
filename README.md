# 🌱 AgroAnalytics

Sistema de Coleta e Análise de Dados na Agricultura de Precisão — desenvolvimento de uma aplicação para gestão de solo e pluviometria.

**TCC** — João Pedro Santos de Araújo · Engenharia de Software · UTFPR Cornélio Procópio · 2025
**Orientador** — Prof. Dr. Fabrício Martins Lopes

---

## 📐 Arquitetura

```
Frontend (React PWA)  →  Backend (Node.js + Express API REST)  →  PostgreSQL
   localhost:3000              localhost:5000                    localhost:5432
```

- **Frontend**: React 18 + React Router + Recharts (gráficos) — PWA com Service Worker offline-first
- **Backend**: Node.js + Express + JWT (autenticação) + bcrypt (senhas)
- **Banco de dados**: PostgreSQL (extensível com PostGIS para dados geoespaciais)

Implementa todos os módulos descritos no TCC: gestão de propriedades/talhões, análise de solo com algoritmo de calagem, registro pluviométrico, módulo de produtividade e relatórios analíticos integrados.

---

## 🪟 Instalação no Windows — passo a passo

### 1. Instale os pré-requisitos

**Node.js (v18 ou superior)**
1. Acesse https://nodejs.org
2. Baixe a versão **LTS** e instale (Next, Next, Finish)
3. Confirme no PowerShell ou CMD:
   ```
   node --version
   npm --version
   ```

**PostgreSQL (v14 ou superior)**
1. Acesse https://www.postgresql.org/download/windows/
2. Baixe o instalador e execute
3. Durante a instalação:
   - Defina uma senha para o usuário `postgres` (anote-a!)
   - Mantenha a porta padrão `5432`
   - Pode desmarcar o Stack Builder no final
4. Confirme que o serviço está rodando: abra "Serviços" do Windows (`services.msc`) e procure por `postgresql-x64-XX` — deve estar "Em execução"

> 💡 **Alternativa**: se preferir não instalar o PostgreSQL diretamente, você pode usar o **pgAdmin** (instalado junto) para gerenciar o banco visualmente.

### 2. Baixe e extraia o projeto

Extraia a pasta `agroanalytics` em um local de sua preferência, por exemplo:
```
C:\Projetos\agroanalytics
```

### 3. Configure as variáveis de ambiente

1. Vá até a pasta `agroanalytics\backend`
2. Copie o arquivo `.env.example` e renomeie a cópia para `.env`
3. Abra o `.env` com o Bloco de Notas e edite a senha do PostgreSQL:
   ```
   DB_PASSWORD=sua_senha_aqui    ← coloque a senha que você definiu na instalação
   ```

### 4. Instale as dependências

Abra o **PowerShell** ou **CMD** na pasta raiz do projeto (`agroanalytics`):

```powershell
cd C:\Projetos\agroanalytics

# Backend
cd backend
npm install

# Frontend
cd ..\frontend
npm install
```

> ⏳ Isso pode levar alguns minutos na primeira vez.

### 5. Crie e popule o banco de dados

Ainda no terminal, dentro da pasta `backend`:

```powershell
cd C:\Projetos\agroanalytics\backend
npm run db:setup
npm run db:seed
```

Você verá mensagens de confirmação como:
```
✅ Banco de dados 'agroanalytics' criado!
✅ Tabela usuarios
✅ Tabela propriedades
...
🌾 Seed concluído com sucesso!
📧 Login: joao@agroanalytics.com
🔑 Senha: 123456
```

### 6. Inicie o sistema

Você precisará de **dois terminais abertos** (backend e frontend rodam separadamente):

**Terminal 1 — Backend:**
```powershell
cd C:\Projetos\agroanalytics\backend
npm run dev
```
Aguarde a mensagem: `🌾 AgroAnalytics API rodando em http://localhost:5000`

**Terminal 2 — Frontend:**
```powershell
cd C:\Projetos\agroanalytics\frontend
npm start
```
O navegador abrirá automaticamente em `http://localhost:3000`

### 7. Faça login

Use a conta de demonstração já cadastrada pelo seed:
- **E-mail**: `joao@agroanalytics.com`
- **Senha**: `123456`

Ou crie sua própria conta na tela de login (aba "Criar conta").

---

## 🗂️ Estrutura do projeto

```
agroanalytics/
├── backend/
│   ├── config/database.js          # Conexão PostgreSQL
│   ├── src/
│   │   ├── controllers/            # Lógica de negócio (RF001-RF006)
│   │   ├── routes/index.js         # Rotas da API REST
│   │   ├── middleware/auth.js      # Autenticação JWT
│   │   └── database/
│   │       ├── setup.js            # Cria tabelas
│   │       └── seed.js             # Popula dados de exemplo
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json           # PWA
│   │   └── service-worker.js       # Offline-first (RNF004)
│   ├── src/
│   │   ├── pages/                  # Dashboard, Propriedades, Solo, etc.
│   │   ├── components/             # Sidebar, UI compartilhada
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js         # Cliente HTTP (axios)
│   │   └── App.jsx
│   └── package.json
│
└── README.md
```

---

## 🌾 Módulos implementados (conforme TCC)

| Requisito | Módulo | Descrição |
|---|---|---|
| RF001 | Autenticação | Cadastro/login de produtores com JWT |
| RF002 | Propriedades e Talhões | Cadastro com geolocalização (lat/lng) |
| RF003 | Análise de Solo | Inserção manual de laudos (pH, V%, P, K, Ca, Mg, MO, CTC) |
| RF004 | Recomendação de Calagem | `NC = (V₂ − V₁) × CTC / (10 × PRNT/100)` |
| RF005 | Pluviometria | Registro diário de chuva por talhão, individual ou em lote |
| RF006 | Produtividade | Correlação solo + chuva + colheita final, relatórios |

**Requisitos não-funcionais:**
- RNF001 (Usabilidade móvel): interface responsiva
- RNF002/RNF003 (Disponibilidade/Desempenho): API REST otimizada com índices no banco
- RNF004 (Offline-first): Service Worker cacheia assets estáticos
- RNF005 (Escalabilidade): arquitetura em camadas (cliente-servidor-banco)

---

## 🔌 Principais endpoints da API

```
POST   /api/auth/registrar
POST   /api/auth/login
GET    /api/auth/perfil

GET    /api/propriedades
POST   /api/propriedades
GET    /api/propriedades/:id/talhoes

POST   /api/talhoes
PUT    /api/talhoes/:id

GET    /api/talhoes/:talhaoId/analises
POST   /api/analises
POST   /api/analises/calagem

GET    /api/chuva?talhao_id=...&safra=...
POST   /api/chuva
POST   /api/chuva/lote

GET    /api/ciclos?talhao_id=...&safra=...
POST   /api/ciclos

GET    /api/relatorios/dashboard
GET    /api/relatorios/completo?propriedade_id=...&safra=...
```

---

## 🛠️ Solução de problemas comuns (Windows)

**Erro "porta 5432 já em uso" ou conexão recusada**
→ Verifique se o serviço PostgreSQL está rodando em `services.msc`.

**Erro "senha de autenticação falhou"**
→ Confirme que a senha no arquivo `backend\.env` é exatamente a mesma definida na instalação do PostgreSQL.

**Erro "porta 3000 ou 5000 já em uso"**
→ Feche outros programas que possam estar usando essas portas, ou altere `PORT` no `.env` do backend.

**`npm install` falha com erro de permissão**
→ Execute o PowerShell como Administrador.

**Tela branca no navegador**
→ Verifique se o backend está rodando (Terminal 1) antes de abrir o frontend.

---

## 📊 Algoritmo de Calagem (RF004)

Baseado na fórmula de saturação por bases (Manual EMBRAPA):

```
NC (t/ha) = (V₂ − V₁) × CTC / (10 × PRNT/100)
```

Onde:
- **NC**: necessidade de calcário em toneladas por hectare
- **V₂**: saturação de bases desejada (varia por cultura: Soja 65%, Milho 70%, etc.)
- **V₁**: saturação de bases atual (informada na análise)
- **CTC**: capacidade de troca catiônica (cmolc/dm³)
- **PRNT**: poder relativo de neutralização total do calcário (ajustável, padrão 80%)

---

## 📄 Licença

Este projeto acompanha o TCC sob licença **CC BY-NC-ND 4.0** (uso não comercial, sem derivações, com atribuição ao autor).
