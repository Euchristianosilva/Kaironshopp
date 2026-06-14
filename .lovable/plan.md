## Visão geral

Uma única conta Melhor Envio (configurada pelo admin) atende todos os vendedores. Cada vendedor informa apenas o endereço de coleta; cada produto já tem peso/dimensões. O sistema chama a API do Melhor Envio para calcular o frete em tempo real no carrinho/checkout, agrupado por vendedor.

## Fase 1 — Banco de dados

Adicionar à tabela `sellers`:
- `origin_zip` (text), `origin_city` (text), `origin_state` (char(2)), `origin_address` (text), `origin_number` (text), `origin_complement` (text), `origin_district` (text)

Tabela `products` já tem `weight_g`, `height_cm`, `width_cm`, `length_cm` — apenas tornar visível no formulário e validar como obrigatórios para venda.

Tabela nova `shipping_quotes_cache` (opcional, p/ economizar chamadas):
- `cache_key` (hash de origem+destino+itens), `payload` (jsonb), `expires_at` (timestamptz)

## Fase 2 — Secrets e configuração

- Pedir ao admin: `MELHOR_ENVIO_TOKEN` (token de API), `MELHOR_ENVIO_ENV` (`sandbox` ou `production`).
- Base URL: `https://sandbox.melhorenvio.com.br` ou `https://www.melhorenvio.com.br`.
- Endpoint usado: `POST /api/v2/me/shipment/calculate`.

## Fase 3 — Server function de cálculo

`src/lib/shipping.functions.ts` → `calculateShipping({ destinationZip, items })`:
1. Agrupa itens por `seller_id`.
2. Para cada vendedor: valida origem cadastrada e que todos os produtos têm peso+dimensões. Monta payload Melhor Envio (from.postal_code, to.postal_code, products[]).
3. Chama API com `Authorization: Bearer ${MELHOR_ENVIO_TOKEN}`.
4. Retorna por vendedor: lista de `{ service_id, name, company, price, delivery_time, error? }`, filtrando opções com erro.
5. Cache em memória/DB curto (5–10min) por `(zip-origem, zip-destino, hash itens)`.

## Fase 4 — UI vendedor

- `seller.profile.tsx` / nova seção "Endereço de coleta": CEP (máscara), busca ViaCEP para autocompletar cidade/estado/logradouro/bairro, número, complemento. Salva em `sellers`.
- Formulário de produto (`seller.products.tsx`): tornar campos peso/dimensões obrigatórios e visíveis, com validação Zod.
- Banner de alerta no painel se origem ou medidas estiverem faltando.

## Fase 5 — UI carrinho/checkout

- `cart.tsx`: input de CEP de destino + botão "Calcular frete"; ao calcular, agrupa por vendedor e mostra opções (radio) com transportadora, prazo e valor. Persiste seleção em store.
- `checkout.tsx`: reaproveita seleção, exibe resumo do frete por vendedor, soma ao total. Bloqueia finalizar se algum vendedor não tiver opção escolhida.
- Salva opção escolhida em `orders.shipping_address` + novo `orders.shipping_quote` (jsonb com `{seller_id, service_id, name, company, price}`).

## Fase 6 — Painel admin

- `/admin/shipping`: formulário para o token, ambiente, status da conexão (teste via endpoint `/api/v2/me`), e lista de envios recentes (futuro).

## Detalhes técnicos

- Server fn calls a Melhor Envio só do servidor (token é secreto).
- ViaCEP é cliente (`https://viacep.com.br/ws/{cep}/json/`).
- Validação Zod em todos os endpoints (CEP regex `\d{8}`, peso > 0, dimensões > 0).
- Erros do upstream tratados por vendedor — não quebra checkout dos demais.

```text
[Cart] --CEP destino--> calculateShipping (server fn)
                          │
                          ├── agrupa por seller
                          ├── busca origem em sellers
                          ├── POST /shipment/calculate (Melhor Envio)
                          └── retorna opções por seller
[Checkout] --opção escolhida--> orders.shipping_quote --> Stripe Checkout
```

## Ordem de execução

1. Migration (campos de origem + cache opcional).
2. Pedir secret `MELHOR_ENVIO_TOKEN` + `MELHOR_ENVIO_ENV`.
3. Server fn `calculateShipping` + ping do admin.
4. Formulários do vendedor (origem + dimensões obrigatórias).
5. Carrinho + checkout consumindo a server fn.
6. Painel admin para gerir o token.

Pronto para começar pela Fase 1 (migration) e em seguida pedir o token do Melhor Envio.