# Catálogo DZAMP — continuar o projeto aqui

Li o repositório `Ismaelvictors/catalago-dzamp`. Ele tem: página inicial com carrossel, página de catálogo com filtro por linha, seleção de tamanho/cor/estampa, sacola com quantidade e observação, página de contatos, e finalização do pedido pelo WhatsApp. Os produtos e o número do WhatsApp vêm de um banco externo.

A ideia é recriar tudo aqui, com o mesmo visual (com refinamentos), banco próprio e 4 linhas de produto.

## O que vou construir

**Banco de dados aqui (Lovable Cloud)**
- Tabela de produtos: título, descrição, preço, linha, fotos, tamanhos.
- Tabela de configurações: número do WhatsApp.
- Leitura pública (o site lê sem login); nada de escrita pública.
- Já entram os 6 produtos de exemplo do repositório, agora com as 4 linhas.

**Linhas e opções (como no repositório)**
- Infantil: tamanho único PP (veste 2, 3 e 4 anos), com estampa.
- Jovem: P, M, G, com estampa.
- Adulto: P, M, G, GG, com estampa.
- UV Manga Longa: P, M, G, GG, sem estampa.
- Cores: Vermelho, Preto, Branco, Azul Marinho, Cinza, Bege, Verde, Amarelo, Rosa.
- Estampas: Adidas, Nike, Boss, Lacoste, DZAMP.

**Páginas**
- Início: carrossel, destaques e chamada para o catálogo.
- Catálogo: filtro por linha, cartão de produto, tela de escolha (tamanho, cor, estampa, observação, quantidade).
- Contatos: informações e atalho para o WhatsApp.
- Cada página com endereço próprio (/, /catalogo, /contatos), o que ajuda no Google e ao compartilhar links.

**Sacola e pedido**
- Sacola lateral com itens, quantidade, subtotal e remoção.
- Conteúdo salvo no navegador, como hoje.
- Botão que abre o WhatsApp com o pedido montado (mesmo texto do repositório).

**Imagens**
- Trago as fotos do repositório (logo, carrossel e produtos) para cá.

## Refinamentos que vou aplicar
- Identidade visual igual (cores, tipografia e layout), reconstruída no sistema de cores do projeto para funcionar bem em telas pequenas.
- Acabamento de espaçamentos, estados de carregamento e mensagens de erro.
- Acessibilidade básica nos botões e no menu.

## Fora do escopo agora
- Painel de administração com login (fica para depois; enquanto isso, eu ajusto produtos e o número do WhatsApp pelo banco a seu pedido).

## Detalhes técnicos
- Stack daqui: TanStack Start + React + Tailwind v4; o repositório era React puro com rotas por hash — a navegação vira rotas de arquivo em `src/routes`.
- Banco: Lovable Cloud (Postgres) com tabelas `products` e `settings`, RLS ativa e políticas `SELECT` para `anon`/`authenticated`, mais os GRANTs correspondentes.
- Leituras públicas via server function com a chave publicável; nada de chave de serviço no navegador.
- `category` com os 4 valores: `infantil`, `jovem`, `adulto`, `uv`; seed convertido do `.sql/dzamp_seed.sql` (os itens `jovem_adulto` viram `adulto`).
- Configuração de linhas (tamanhos/cores/estampas) fica em um módulo no código, como em `src/lines.ts`.
- Estilos convertidos de `src/style.css` para tokens em `src/styles.css` + utilitários Tailwind.
- Fotos copiadas para `public/images`.
- `head()` por rota com título e descrição próprios.
