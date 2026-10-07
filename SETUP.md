# V4 Dashboard — Setup de Deploy

Stack: **GitHub → Vercel** (frontend + serverless) · **Supabase** (clientes) · **Groq** (chat IA) · **Google Sheets API** (dados)

---

## 1. Supabase — criar tabela de clientes

1. Acesse [supabase.com](https://supabase.com) → New Project
2. No **SQL Editor**, execute:

```sql
CREATE TABLE clients (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  sheet_id   TEXT NOT NULL,
  model      TEXT NOT NULL DEFAULT 'auto',  -- ecommerce | b2b | auto
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permitir leitura/escrita pública (anon key)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON clients FOR ALL USING (true) WITH CHECK (true);
```

3. Anote: **Project URL** e **anon public key** (em Settings → API)

---

> Projeto Supabase já existente? Adicione a coluna do modelo do cliente:
> ```sql
> ALTER TABLE clients ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'auto';
> ```
> Sem a coluna o dashboard funciona, mas guarda o modelo só no navegador de quem cadastrou.

---

## 2. Google API Key — para ler Google Sheets

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ou use um existente)
3. **APIs & Services → Enable APIs** → habilite **Google Sheets API**
4. **APIs & Services → Credentials → Create Credentials → API Key**
5. (Opcional mas recomendado) Restrinja a chave para Google Sheets API

> As planilhas precisam ter permissão **"Qualquer pessoa com o link pode ver"**

---

## 3. Groq API Key — para o chat de análise (gratuito)

1. Acesse [console.groq.com](https://console.groq.com)
2. Crie uma conta → API Keys → **Create API Key**

---

## 4. GitHub — criar repositório

```bash
# No terminal, dentro da pasta v4-dashboard/
git init
git add .
git commit -m "feat: V4 dashboard tráfego pago"
git remote add origin https://github.com/SEU_USUARIO/v4-dashboard.git
git push -u origin main
```

---

## 5. Vercel — deploy

1. Acesse [vercel.com](https://vercel.com) → **Add New → Project**
2. Conecte o repositório GitHub criado acima
3. Em **Environment Variables**, adicione:

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | URL do seu projeto Supabase |
| `SUPABASE_ANON_KEY` | anon key do Supabase |
| `GOOGLE_API_KEY` | chave da Google Sheets API |
| `GROQ_API_KEY` | chave da Groq |
| `GROQ_MODEL` | (opcional) modelo do chat; padrão `openai/gpt-oss-120b` |

4. Clique **Deploy** → aguarde ~1 minuto

Pronto! Você terá uma URL do tipo `https://v4-dashboard-xxx.vercel.app`

---

## 6. Layout da planilha (um cliente = uma planilha)

Modelo: planilha "Touch of Synergy - Funil Diário". Cada aba é um funil:

| Aba | Tipo | Métricas lidas |
|-----|------|----------------|
| `Funil Ecommerce` (B2C) | e-commerce | Alcance, Impressões, Cliques, Sessões, Add to Cart, Checkout, Vendas, Faturamento, Investimento |
| `Funil B2B` | inside sales | Alcance, Impressões, Cliques, Page Views (LP), Leads, Investimento |
| `Funil Meta Ads`, `Funil Google Ads` | mesmo layout do funil do cliente | por canal; aparecem como abas ao lado da aba geral |

- **Um dia por coluna**, com a data `dd/mm/aaaa` na linha de datas. Métricas nas linhas (coluna A = etapa, coluna B = nome da métrica).
- O tipo da aba é detectado pelas métricas (Faturamento/Vendas → e-commerce; Leads → B2B), não pelo nome. Abas sem linha de datas são ignoradas.
- Só os valores-base são lidos. CTR, CPM, CPC, Connect Rate, CPA, CPL, ROAS etc. são **recalculados** para o período filtrado.
- As colunas **"Semanal …"** e **"Soma <Mês>"** são ignoradas: são totais, não períodos novos. O dashboard soma sempre a partir dos dias, então semana e fechamento do mês nunca entram em dobro.
- Dias sem lançamento no fim da planilha (futuros, tudo zerado) são cortados automaticamente.
- Compartilhe como **"Qualquer pessoa com o link pode ver"**.

---

## 7. Uso

- Abra a URL e clique **+ Adicionar Cliente**; informe o nome, o link (ou ID) da planilha e o **modelo** (E-commerce B2C, Inside Sales B2B ou os dois). O modelo define quais abas aparecem
- Os clientes ficam salvos no Supabase — qualquer pessoa com o link verá os mesmos
- Tela do cliente: escolha o funil (abas), o **período** (atalhos ou De/Até) e o agrupamento (dia, semana, mês). KPIs, funil, gráfico de linhas (você escolhe os KPIs) e tabela seguem o período; as variações comparam com o período anterior de mesmo tamanho
- O chat com IA usa o Groq (`openai/gpt-oss-120b`, ajustável pela variável `GROQ_MODEL`) com o contexto do período selecionado. As regras de análise de ads (diagnóstico de funil B2C/B2B, boas práticas Meta/Google, formato da resposta) ficam em `api/_playbook.js`: edite esse arquivo para ajustar o jeito que o analista responde

## Testes

```bash
node test/parse.test.js   # confere o parser contra os totais semanais/mensais da planilha-modelo
```

---

## Atualizar o deploy

Qualquer push para a branch `main` no GitHub dispara um novo deploy automático no Vercel.
