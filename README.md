# Cinzas do Horizonte

ARPG de fantasia isométrico 2.5D para desktop, com mundo procedural contínuo e expedições de morte permanente. Arte vetorial original gerada no projeto; nenhuma dependência de assets dos jogos de referência.

## Executar

Requer Node.js 22.12+ ou 24+ com npm.

```sh
npm install
npm run dev
```

Abra http://127.0.0.1:5173. Para produção:

```sh
npm run build
npm run preview
```

No Windows, dê duplo clique em `Jogar.cmd`: ele inicia o servidor se necessário e abre o navegador. Também é possível executar `./Start-Game.ps1` depois da instalação. O servidor de desenvolvimento é local.

## Primeira jornada

1. Nova expedição → Lutador. Cada novo jogo reinicia moedas, classes, grupo, mapas, itens e progressão; somente preferências pessoais são mantidas.
2. Use a seed sugerida `urze-7` ou digite outra. Deixar vazio gera uma seed com Web Crypto.
3. Use o ping Explorar sobre a tenda a leste para se aproximar e abrir a loja. A carteira inicial tem 45 prata e 2 ouro.
4. Compre uma arma por 18 prata e a Joia da Brasa por 1 ouro. Pressione I, equipe a arma e insira a joia.
5. Como Lutador, Q se transforma em Talho de brasa, com dano adicional e queimadura.
6. Procure o baú além da tenda e os inimigos mais a leste. Aproxime-se dos achados para recolher.
7. Compre classes no mercador: Atirador, nível 3 e 100 prata; Bastião, nível 5 e 200 prata; Feiticeiro, nível 7 e 300 prata. O nível considera o maior nível alcançado nesta jornada. Depois de desbloquear, cada recrutamento custa 35 prata. Troque de membro usando 1–4.
8. Havendo sobreviventes, a jornada continua; santuários mantêm a ressurreição paga existente. Começar outro jogo reinicia a progressão.

## Sprites dos personagens

Lutador, Atirador, Feiticeiro e Bastião utilizam os PNGs de `assets/sprite/player`, com idle e caminhada em oito direções. Os retratos também utilizam esses assets. O recorte divide as dimensões reais da imagem em células inteiras; o ponto de apoio é calculado por frame para compensar o deslocamento do desenho dentro da célula. Os PNGs originais são preservados.

Para trocar a arte, consulte [o guia de configuração](docs/SPRITES.md). Caminhos, grade, direções, velocidade, altura, retratos e ajustes de âncora ficam em `src/rendering/PlayerSpriteConfig.ts`.

## Sandbox durante o jogo

Pressione **F3** para abrir o laboratório, disponível também no build. Edite nível, moedas, vida, recurso, pontos e requisitos de classe; teste invencibilidade do grupo, IA inimiga congelada, ausência de recargas, recurso infinito e velocidade da simulação. Clique em **Aplicar valores**.

O experimento suspende o autosave. **Descartar experimento** restaura o estado anterior; **Incorporar à partida e salvar** mantém os valores e encerra os modificadores temporários. Recarregar ou sair para o menu descarta experimentos não incorporados. Os botões rápidos também iniciam um sandbox. Há saída do sandbox mesmo depois de eliminar todo o grupo.

## Controles

| Entrada | Ação |
|---|---|
| Botão esquerdo, clique ou segurar | Mover a seleção; sem seleção, mover o controlado |
| ALT + arraste | Selecionar membros vivos, incluindo o controlado |
| Botão central rápido em inimigo | Alternar presença na fila de até oito alvos; primeiro tem prioridade |
| Segurar botão central | Radial de ordens; TAB ou roda alterna para oito pings |
| Ping Explorar sobre tenda/baú/santuário | Aproximar e interagir |
| Q / W / E / R | Quatro habilidades da classe |
| Clique direito | Ataque básico: inimigo sob cursor, alvo prioritário ou direção livre |
| 1 / 2 / 3 / 4 ou retrato | Controlar membro vivo |
| T | Pausa tática; dar ordens e retomar |
| I / K / M | Inventário / habilidades / atlas |
| Escape | Fechar painel ou abrir pausa |
| Roda do mouse | Zoom entre 0,7 e 1,4 |
| F3 | Observatório e comandos de desenvolvimento |

WASD opcional nas configurações usa movimento direto e desativa clique para mover; nessa opção, habilidades passam para Z/X/C/V para evitar conflito. As teclas podem ser remapeadas e os rótulos do HUD e da árvore acompanham a configuração.

Sem seleção, ordens e pings afetam o controlado. Com seleção, afetam apenas os membros selecionados. Mover, reagrupar, defender e investigar têm prioridade temporária sobre a IA. A radial cancela no centro ou com Escape; desaceleração opcional de 25%/50%. Alvos descarregados têm tolerância de cinco segundos; a fila cheia preserva a prioridade existente.

Ordens dos companheiros: seguir, manter posição, focar alvo do líder, passivo e agressivo. Companheiros têm alcance limitado e formação. Painéis pausam o combate para permitir leitura.

## Sistemas jogáveis

- Quatro classes: Lutador, Atirador, Feiticeiro e Bastião (Tank), cada qual com básico, quatro ativas, três talentos e maestria repetível.
- Seis comportamentos inimigos: perseguidor, arqueiro que recua, investidor com antecipação, caçador de matilha, conjurador de área e guardião lento.
- Combate com projéteis físicos, áreas, investida, buffs, ameaça, guarda compartilhada, críticos, Burn, Slow e Stun.
- Cinco joias. Fire/Fighter substitui habilidade; Fortune/Tank aumenta moedas em 25%. Frost/Atirador aplica lentidão; Storm reduz recargas; Stone aumenta sobrevivência.
- Equipamentos em quatro slots, cinco raridades, affixes compatíveis, requisitos de classe/nível, comparação, compra e venda.
- Seis biomas definidos por campos contínuos: prados, bosque, dunas, várzea, gelo e montanha.
- Chunks de 32×32, renderização isométrica 64×32, preload em Worker e fallback na thread principal.
- Loja e recrutamento, santuários, baús, encontros e deltas persistentes.
- IndexedDB com snapshot atômico versionado. Meta e run têm estruturas distintas; gravados juntos para não separar recompensa de progresso.
- Autosave periódico, achados, equipamento, recrutamento, mortes, mudança de chunk e ocultação da aba.

## Arquitetura

```
src/
  core/          Tipos, EventBus tipado, ciclo da expedição e coordenação
  data/          Registries e fórmulas de balanceamento
  world/         Coordenadas, streaming, geração e navegação
  workers/       Worker de worldgen
  entities/      IA e movimento lógico
  combat/        Habilidades, projéteis, status e mitigação
  progression/   Personagens, XP, atributos e modificadores
  loot/          Gerador de itens/affixes
  shops/         Economia, equipamento e recrutamento
  persistence/   Repositório IndexedDB e migração
  rendering/     Texturas originais, terreno e entidades Phaser
  game/          Cena, câmera, input de mundo e áudio sintetizado
  ui/            DOM, painéis, minimapa e reconciliação dos contadores
tests/           Lógica sem renderer
e2e/             Jornada real com Playwright
artifacts/       Screenshots de verificação
```

A simulação usa coordenadas de tiles, independentes de pixels. A física de navegação é lógica e não usa corpos Arcade projetados: isso mantém colisão/A* no mesmo espaço 2D. O Phaser cuida do WebGL, sprites, ordenação, câmera e input; Canvas 2D é usado apenas para preparar texturas estáticas e o minimapa.

As decisões da IA são espaçadas, entidades distantes ficam inativas e o terreno é pré-desenhado por chunk. Render radius 1 (9 chunks) e preload radius 2 (25) ficam em `data/balance.ts`. Chunks distantes são removidos e suas texturas liberadas.

Terrain, clima, vegetação, POIs e spawns usam seeds derivadas. Loot dinâmico usa um estado PRNG separado salvo na run. Terreno não é salvo: apenas seed, personagens, inventário, descobertas, drops e deltas.

## Expandir por dados

- **Bioma:** adicione sua definição a `data/biomes.ts`, o ID em `core/types.ts` e a regra climática em `world/generation/WorldGenerator.ts`. Associe fauna e decoração no renderer.
- **Inimigo:** adicione a definição em `data/enemies.ts`, inclua em um enemyPool de bioma e registre a textura em `rendering/Textures.ts`. Os seis comportamentos existentes podem ser reutilizados.
- **Habilidade:** adicione em `data/abilities.ts` e associe à classe. Escolha um handler existente, alvo, custo, cooldown, escala, status, cor e tags. Uma mecânica inédita pode acrescentar um pequeno handler em CombatSystem.
- **Joia:** registre em `data/jewels.ts` com modificadores globais e `effectsByClass`. `replace` troca habilidades; `stats` altera atributos; `status` adiciona efeito aos ataques.
- **Item:** adicione base em `data/items.ts` e associe às tabelas de loot/lojas. Stats e tags determinam compatibilidade de affixes.
- **Affix:** adicione em `data/affixes.ts`: slots, tags, nível mínimo, peso e modificador.
- **Loja/loot:** `data/shops.ts` e `data/lootTables.ts` centralizam estoque, moeda, chance e identidade dos drops.
- **Balanceamento:** custos e limites em `data/balance.ts`; números específicos das classes, habilidades e inimigos ficam nos respectivos registries.

## Saves e seeds

O banco é `cinzas-horizonte`, object store `state`, chave `current`, schema 2. Para limpar, use DevTools → Application → IndexedDB → exclua esse banco e recarregue. A operação remove também moedas e desbloqueios.

A migração aceita o schema 1 simulado com `wallet` e `unlockedClasses`. Saves de versão futura ou inválidos são recusados com aviso; não são sobrescritos automaticamente. O código serializa gravações e só anuncia sucesso ao completar a transação.

A seed aparece no atlas e no F3. A posição inicial e a tenda são garantidas. Demais estruturas usam macrocélulas; novas regiões não têm limite fixo. Inimigos derrotados permanecem marcados nessa expedição.

## Testes

```sh
npm test
npm run dev
npm run test:e2e
```

O smoke test usa Edge instalado no Windows. Em outro sistema, remova `channel: "msedge"` de `playwright.config.ts` e execute `npx playwright install chromium`. Ele usa renderização WebGL por software para funcionar sem GPU dedicada.

A jornada automatizada interage via cliques/teclas e verifica compra, equipamento, Fire Jewel, abate, coleta, recrutamento, seleção, Fortune Jewel, pausa tática, morte individual, reload, wipe e nova run. Comandos F3 dão recursos para acelerar o trecho econômico e causam as mortes de QA; o abate do inimigo ocorre pelo combate normal.

## Debug

Somente em `npm run dev`: F3 mostra FPS, seed, coordenadas, chunks, entidades, selecionado e save. Botões: silver (+100), gold (+10), fire, fortune, level, elite, teleport (+3 chunks X e +1 Y), grid (navegação/colisões), kill e wipe.

A API `window.__game` é exposta apenas em development para os testes. Ela não existe no build de produção.

## Current Vertical Slice Limitations

- Arte original vetorial com animações simples; sem campanha narrativa, dublagem ou trilha musical. Sons de impacto são sintetizados.
- Talentos iniciais são bônus configuráveis; suas versões condicionais mais sofisticadas ficam para evolução.
- Ruínas/ninhos reutilizam peças de cenário; há um arquétipo de comerciante com estoque determinístico, sem calendário de reposição.
- Equilíbrio econômico inicial e progressão longa ainda precisam de sessões prolongadas; não há promessa de balanceamento de centenas de horas.
- O renderer padrão registrou 86 FPS na cena inicial em 1440×900; a renderização forçada por software registrou 5–6 FPS. São amostras locais, não um benchmark sustentado em 1080p.
- Mobile e gamepad não fazem parte desta entrega.

## Próximas melhorias de maior impacto

1. Playtests de combate e economia, ajustando leitura das antecipações, duração de encontros e ritmo dos upgrades.
2. Novas peças de cenário e silhuetas/poses por direção, mantendo o mesmo núcleo de geração e ordenação.
3. Mais interações condicionais entre talentos, joias e affixes, com testes de sinergia e balanceamento.




