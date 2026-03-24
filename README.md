# LinhaCash

O LinhaCash é uma plataforma que estou construindo com foco em análise de props da NBA.

A ideia surgiu de um problema simples: quem aposta ou analisa jogadores precisa ficar abrindo vários sites, conferindo estatísticas manualmente e organizando tudo na cabeça. Isso toma tempo e gera erro.

O objetivo aqui é concentrar tudo em um único lugar, com uma interface rápida, limpa e feita pra uso diário.

---

## 🧠 Proposta

O produto não é uma casa de apostas e nem entrega “palpites”.

A proposta é ser uma ferramenta de apoio baseada em dados, mostrando:

- desempenho recente do jogador
- consistência em relação à linha
- histórico de acertos (over/under)
- contexto básico da partida

Tudo de forma visual, simples e sem poluição.

---

## ⚙️ Como funciona (visão geral)

O fluxo principal da aplicação:

1. Usuário entra na plataforma (login/registro)
2. Visualiza os jogos do dia
3. Seleciona um jogo
4. Vê a lista de jogadores disponíveis
5. Clica em um jogador
6. Analisa os dados detalhados antes de tomar decisão

---

## 📊 Dados exibidos

Para cada jogador, a plataforma vai mostrar:

### 📈 Períodos
- L5 (últimos 5 jogos)
- L10
- L15
- L20
- Season (temporada completa)

### 🎯 Métricas
- Pontos (PTS)
- Rebotes (REB)
- Assistências (AST)
- Combinações (P+R, P+A, etc.)

### 📉 Linha ajustável
O usuário pode alterar a linha manualmente e ver:

- média no período
- taxa de acerto
- comportamento recente

### 📊 Gráfico
- histórico jogo a jogo
- identificação visual de hits/miss
- comparação com a linha atual

### 🧩 Contexto (planejado)
- adversário
- histórico contra o time (H2H)
- minutos por jogo

---

## 👤 Sistema de usuário

### Gratuito
- acesso limitado
- poucos jogos por dia
- poucos jogadores por time
- stats básicas

### Pro (planejado)
- acesso completo
- todos os jogos
- todos os jogadores
- todas as métricas
- períodos avançados

---

## 🧱 Estrutura atual

O projeto hoje já tem:

- layout completo (mobile + desktop)
- sistema de navegação entre telas
- telas principais estruturadas:
  - autenticação
  - jogos do dia
  - lista de jogadores
  - detalhe do jogador
  - perfil
- base pronta pra integração com backend

---

## 🔌 Integrações

### Banco e autenticação
- Supabase (auth + database)

### Dados esportivos
- API Sports (NBA)

A ideia é buscar:
- jogos do dia
- estatísticas de jogadores
- histórico de partidas

---

## 💻 Stack

- Next.js (frontend)
- Supabase (backend)
- API Sports (dados)
- CSS custom (sem framework pesado)

---

## 🚧 Status atual

Em desenvolvimento.

O foco no momento é:
- adaptar o layout para Next.js corretamente
- organizar componentes
- conectar com banco de dados
- iniciar integração com API

---

## 🛣️ Próximos passos

- [ ] Converter todo frontend para React (Next.js)
- [ ] Conectar Supabase (login real)
- [ ] Integrar API da NBA
- [ ] Implementar lógica de cálculo (médias, hit rate)
- [ ] Criar sistema de planos
- [ ] Implementar pagamento
- [ ] Criar trial gratuito (2 dias)
- [ ] Otimizar performance

---

## 🎯 Objetivo do projeto

Construir uma ferramenta simples, rápida e confiável para análise de props, que realmente ajude no dia a dia — sem excesso de informação e sem depender de vários sites ao mesmo tempo.

---

## 🌐 Deploy

https://linhacash1.vercel.app

---

## 📌 Observação

Projeto sendo desenvolvido do zero, ainda em evolução.
