# Security Hardening Phase 2

## Objetivo

Validação de resiliência defensiva e melhorias operacionais para rotas sensíveis em ambiente próprio (local/staging).

## Script de resiliência

Use:

```bash
npm run security:resilience -- --baseUrl http://localhost:3000 --token <JWT>
```

Cenários incluídos:

1. burst autenticado em `/api/games`
2. burst autenticado em `/api/metrics`
3. repetição de checkout
4. repetição de suporte/report
5. repetição de login esperado
6. repetição de login inválido
7. acesso em rota protegida com token inválido/expirado
8. replay-like de webhook com assinatura inválida/duplicada
9. navegação concorrente usuário free
10. navegação concorrente usuário pro

## Interpretação rápida

- `429` crescente em cenários de abuso = esperado/positivo
- `401/403` em cenários sem token/expirado = esperado/positivo
- `5xx` alto sob carga = investigar logs estruturados `[route-error]`
- `avg_ms` muito alto com baixo erro = gargalo de latência

## Melhorias aplicadas

- rate limiting detalhado com `retryAfterSeconds`
- maior escopo de chave em `/api/games` e `/api/metrics` por identidade + IP
- logging estruturado para fluxos de checkout, suporte, auth, delete e webhook
- defensiva extra no webhook por `requestId` com limite mais agressivo

## Próximos passos recomendados

- enviar logs para sink central (Sentry/Datadog/ELK)
- painel de métricas para %401/%429/%5xx por rota
- testes automáticos noturnos em staging com baseline de latência
