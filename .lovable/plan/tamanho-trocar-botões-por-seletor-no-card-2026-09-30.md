# Tamanho: trocar botões por seletor no card

## Decisão
No card de produto, substituir os botões de tamanho (P, M, G, GG) por um menu selecionável igual ao de Estampa, com rótulo "Tamanho" e seta para baixo. Motivo: fica em uma linha só, segue o mesmo padrão visual de Cor e Estampa e acomoda qualquer quantidade de tamanhos.

## Mudanças
- `src/components/dzamp/product-controls.tsx`: no card, o componente de tamanho passa a renderizar o mesmo estilo de seletor usado em `EstampaSelect` (label + `.select-wrap` + seta), com placeholder "Selecione" quando nenhum tamanho está escolhido.
- `src/components/dzamp/ProductCard.tsx`: ajustar o uso do componente (valor pode ser nulo até o usuário escolher; manter o aviso "Selecione um tamanho." quando tentar adicionar sem tamanho).
- `src/dzamp.css`: garantir que o seletor de tamanho herde o estilo existente de `.select-wrap` (seta, ponto de espaço à direita) sem ajustes duplicados.
- O modal de detalhes do produto (`ProductModal.tsx`) mantém os botões de tamanho, pois lá há espaço suficiente — só o card muda.

## Verificação
- Conferir no preview que o card mostra "Tamanho" como seletor em uma linha, com seta, e que adicionar à sacola sem tamanho mostra o aviso.
- Checar o build.
