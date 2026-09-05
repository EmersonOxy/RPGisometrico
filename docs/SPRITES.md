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

As sheets atuais têm 4 colunas no idle, 6 no walk e 8 linhas. Não é necessário informar a resolução para a animação: o carregador lê as dimensões reais e arredonda as bordas das células, inclusive na idle de 887 × 1774.

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
  "0:0": { x: 90, y: 170 }, // Exemplo; ajustar conforme a nova arte.
  "0:1": { x: 86, y: 170 },
};
```

Pivôs explícitos prevalecem sobre o cálculo automático. Os frames sem ajuste continuam usando o modo escolhido. Isso permite corrigir a arte sem alterar a posição real, colisão, círculo ou seleção do personagem.

## Retratos

Cada classe tem `portrait`, com `url`, dimensões totais da imagem (`width`, `height`) e `viewBox` no formato `x y largura altura`. O Lutador usa a imagem base; as demais classes usam o primeiro frame frontal da idle. Ao substituir essas imagens, ajuste também o retrato para a nova resolução e enquadramento.

## Estado desta alteração

Implementação entregue sem executar testes, build ou abrir o jogo, conforme solicitado. O alinhamento visual aguarda o retorno do usuário.
