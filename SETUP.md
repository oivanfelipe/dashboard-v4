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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permitir leitura/escrita pública (anon key)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON clients FOR ALL USING (true) WITH CHECK (true);
```

3. Anote: **Project URL** e **anon public key** (em Settings → API)

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

4. Clique **Deploy** → aguarde ~1 minuto

Pronto! Você terá uma URL do tipo `https://v4-dashboard-xxx.vercel.app`

---

## 6. Uso

- Abra a URL e clique **+ Adicionar Cliente**
- Cole o nome e o ID da planilha Google Sheets
- Os clientes ficam salvos no Supabase — qualquer pessoa com o link verá os mesmos
- O chat com IA usa o Groq (llama-3.3-70b) com contexto dos dados do período selecionado

---

## Atualizar o deploy

Qualquer push para a branch `main` no GitHub dispara um novo deploy automático no Vercel.
