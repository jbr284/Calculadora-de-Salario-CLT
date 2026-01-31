# 💰 Calculadora Salário CLT (SaaS Edition 2026)

Uma aplicação web moderna (PWA) para cálculo de folha de pagamento, projetada com foco em UX (Experiência do Usuário) e flexibilidade. 
Diferente de calculadoras estáticas, esta versão **SaaS Genérica** permite que o usuário construa seu próprio perfil, com os descontos pontuais da empresa na qual trabalha, entre, Vale, VT, VA, AM, AO, Sindicato,...etc.

> **Destaque:** Possui sistema de **Onboarding** (Boas-vindas) inteligente e persistência de dados local, funcionando como um App nativo.

## 🚀 Funcionalidades Principais

### 1. 🎨 Interface "App-Like" & Responsiva
* **Design em Cards:** Layout moderno de 3 colunas que se adapta perfeitamente a celulares (Mobile-First).
* **Feedback Visual:** Uso de "Toasts" (notificações suaves) em vez de alertas invasivos.
* **Animações:** Transições suaves em modais e destaques visuais para guiar o usuário.

### 2. ⚙️ Motor de Cálculo 2026 (Preciso)
* **INSS & IRRF:** Tabelas e regras de dedução atualizadas para 2026.
* **DSR Ajustado:** Cálculo do Reflexo do DSR (Descanso Semanal Remunerado) sobre horas variáveis (apenas sobre o valor do adicional), evitando bitributação.
* **Arredondamento Financeiro:** Função `round2()` implementada para garantir precisão de centavos (`0.01`) idêntica a sistemas contábeis.

### 3. 🛠️ Personalização Total (SaaS)
* **Dinâmica:** O usuário não fica preso a campos fixos. Ele pode adicionar **"N" descontos extras** (VT, Plano de Saúde, Farmácia, Empréstimo) com nomes e valores personalizados.
* **Perfil da Empresa:** Configuração do Nome da Empresa e percentuais globais (Adiantamento, Adicional Noturno).

### 4. 👋 Onboarding Inteligente
* **Primeiro Acesso:** Detecta se é a primeira vez do usuário e exibe um guia de configuração.
* **Fluxo Guiado:** Pergunta sobre o "Vale" (Adiantamento) e, dependendo da resposta, guia o usuário visualmente para configurar o restante.

### 5. 📱 PWA (Offline First)
* **Service Worker (v3):** Estratégia de cache avançada com *skipWaiting* para garantir que o usuário sempre tenha a versão mais recente sem "cache fantasma".
* **Instalável:** Manifesto configurado para adicionar à tela inicial do Android/iOS.

---

## 📂 Estrutura do Projeto

```text
/
├── index.html        # Interface limpa (Layout Cards + Modais)
├── style.css         # Estilização moderna, variáveis CSS e animações
├── app.js            # Lógica de cálculo, gerenciamento de estado e Onboarding
├── sw.js             # Service Worker (Cache e Atualização Forçada)
├── manifest.json     # Metadados do App (Ícones, Nome, Cores)
└── icons/            # Ícones gerados para PWA
