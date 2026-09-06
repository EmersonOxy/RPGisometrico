# Trocar sprites dos personagens

Edite `src/rendering/PlayerSpriteConfig.ts`. A lógica de movimento, combate e saves usa os IDs das classes; os arquivos de arte são configurados separadamente.

| Classe | ID | Pasta atual |
|---|---|---|
| Lutador / guerreiro | fighter | lutador |
| Atirador | shooter | atirador |
| Feiticeiro | mage | feiticeiro |
| Bastião | tank | tank |

## Arquivos e animação

Cada classe tem `sheets.idle` e `sheets.walk`. Para substituir PNGs com a mesma organização, mantenha os nomes e substitua os arquivos. Se os nomes mudarem, atualize os caminhos literais de `new URL(...)` na configuração. Recarregue o jogo para carregar a nova arte.

O padrão é pixel-art 32x32 com 8 linhas (uma por direção) e 1 coluna (frame estático + balanço de marcha procedural). Exceção: o idle do lutador anima por direção a partir de `assets/sprite/player/lutador/idle/` (pastas `idle_<direcao>/` ou arquivos `idle_<direcao> [(N)].png`; direções sem animação, como a frente, seguem estáticas; animações curtas ciclam até a coluna máxima). Não é necessário informar a resolução para a animação: o carregador lê as dimensões reais e arredonda as bordas das células.

- `columns` e `rows`: quantidade de células da nova sheet; a grade deve ser uniforme.
- `directionRows`: índice da linha para N, NE, E, SE, S, SW, W e NW, nessa ordem, começando em zero. Pode repetir linhas se houver menos direções.
- `fps`: velocidade dos frames por animação.
- `height`: altura visual do personagem no mundo, atualmente 78 pixels, independente das margens transparentes.
- `referenceHeight`: altura de referência em pixels da origem, opcional por sheet; fixa a escala manualmente quando a medição automática não servir.

É possível personalizar após a declaração do registro, por exemplo:

```ts
playerSpriteConfig.shooter.sheets.walk.fps = 12;
playerSpriteConfig.shooter.height = 78;
```

## Alinhamento e ponto de apoio

O deslocamento relatado vinha do uso do centro da célula como âncora, apesar de o desenho mudar de posição dentro dela. O modo `registration: "head"` mede a transparência uma vez no carregamento, posiciona o eixo horizontal na região superior da cabeça e usa uma distância constante da cabeça ao chão por direção. A escala permanece constante durante os frames da mesma sheet. Não há recorte destrutivo nem reexportação dos PNGs.

Essa referência automática é uma aproximação para as sheets atuais. Arte futura com chapéus assimétricos, efeitos acima da cabeça ou poses muito diferentes pode precisar de pivôs explícitos. Para arte já alinhada pelo autor, use `registration: "cell"` (centro inferior da célula). Para controle exato, informe `pivots`, onde cada chave é `linha:coluna` e as coordenadas são pixels dentro da célula original:

```ts
playerSpriteConfig.fighter.sheets.walk.pivots = {
  "0:0": { x: 16, y: 31 }, // Exemplo em pixels 32x32; ajustar conforme a nova arte.
  "4:0": { x: 15, y: 31 },
};
```

Pivôs explícitos prevalecem sobre o cálculo automático. Os frames sem ajuste continuam usando o modo escolhido. Isso permite corrigir a arte sem alterar a posição real, colisão, círculo ou seleção do personagem.

## Retratos

Cada classe tem `portrait`, com `url`, dimensões totais da imagem (`width`, `height`) e `viewBox` no formato `x y largura altura`. Classes no padrão usam a base 32x32 (`width: 32, height: 32`, `viewBox: "4 0 24 32"` — a silhueta deve ficar entre x=4 e x=27); o CSS usa `image-rendering: pixelated` para ampliar sem embaçar. Ao substituir essas imagens, ajuste também o retrato para a nova resolução e enquadramento.

Sheets pixel-art em baixa resolução usam `filter: "nearest"` na configuração para o Phaser amostrar com NEAREST (sem blur); arte HD mantém o filtro linear padrão.

## Adicionar uma classe nova (passo a passo)

1. Crie `assets/sprite/player/<pasta>/` com `<prefixo>_base.png` (32x32, vista de frente) e, se houver, `<prefixo>_frente_direita.png`, `<prefixo>_frente_esquerda.png`, `<prefixo>_costas_direita.png`, `<prefixo>_costas_esquerda.png`. Sem as 4 direções, a base é repetida nas 8 direções como placeholder.
2. Registre a pasta na tabela `CLASSES` de `scripts/spritegen/compose-fighter-shooter.cjs` e rode `node scripts/spritegen/compose-fighter-shooter.cjs` — ele gera `<prefixo>_idle.png` e `<prefixo>_walk.png` e avisa se a base sair do `viewBox` padrão. Se colocar animação por direção em `<pasta>/idle/` (pastas `[idle_]<direcao>/` ou arquivos `idle_<direcao> [(N)].png`), cada direção anima só os seus frames (direções sem animação seguem estáticas): ajuste `columns`/`fps` na configuração (ex.: o lutador usa `columns = 10`, `fps = 6`).
3. Em `src/rendering/PlayerSpriteConfig.ts`, adicione uma linha com `pixelCharacter(...)` (passe um `viewBox` diferente só se a silhueta sair de x=4..27, como o escudo do bastião).

## Inimigos e revisão visual

As configurações dos inimigos ficam em `src/rendering/EnemySpriteConfig.ts`. O slime usa o mesmo padrão pixel-art (idle 32x32, 7 colunas x 8 linhas, `filter: "nearest"`), gerado pelo mesmo script (`["sprite/enemy", "slime", "slime", ...]` na tabela). O carregamento mede a silhueta por alpha, usa a altura mediana por sheet e ancora cada frame no apoio inferior. A grade do golem tem nove linhas, das quais oito representam as direções utilizadas. Sua caminhada reaproveita temporariamente a sheet transparente de repouso porque a exportação de caminhada tem fundo opaco.

Os PNGs originais foram preservados. Testes e inspeção visual estão descritos na [revisão de 05/09/2026](REVISAO-2026-09-05.md).
