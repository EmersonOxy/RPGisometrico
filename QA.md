# Verificação executada — 05/09/2026

## Alteração atual — alinhamento e sheets das quatro classes (não testada)

- Correção posterior ao screenshot do usuário: retratos usam clipPath explícito no retângulo do frame; cartões permitem largura suficiente para as sheets quadradas, evitando personagens pequenos e exposição de frames vizinhos. Não executada verificação desta correção.
- Substituição da âncora fixa da célula por registro por frame, usando a região da cabeça e uma distância constante até o chão por direção.
- Idle, caminhada, orientação de combate e retratos integrados para Lutador, Atirador, Feiticeiro e Bastião.
- Configuração central e ajustes de pivô documentados em `docs/SPRITES.md`.
- Nenhum teste, build ou verificação no navegador executado nesta alteração, por solicitação do usuário. A expectativa antiga de textura do Feiticeiro foi atualizada no cenário existente, sem executá-lo.
- Os resultados abaixo são históricos e não validam esta alteração. A confirmação visual do alinhamento está pendente do usuário.

## Atualização — sprites somente do Lutador

- Integração de idle, walk e retrato com os PNGs do usuário, sem modificar os arquivos originais.
- Oito direções verificadas com WASD; idle ao parar; orientação no ataque; pausa tática congela os frames; Feiticeiro mantém textura anterior.
- Recortes inteiros cobrem a sheet idle inteira, sem lacunas ou sobreposições. Testes de animação cobrem movimento real, pausa, orientação e movimento reduzido.
- TypeScript aprovado; 107 testes de lógica. Verificação visual: `artifacts/fighter-sprites-game.png`.

## Atualização — novo jogo, sandbox e classes

- Novo jogo reinicia progressão, moedas, desbloqueios, tutoriais, grupo, mapa e ordens. Preferências pessoais são preservadas; início com Lutador, nível 1, 45 prata e 2 ouro.
- F3 oferece sandbox reversível, valores editáveis, modificadores temporários, regras de desbloqueio e ações rápidas. Autosave bloqueado durante experimentos; descarte, recarregamento e incorporação explícita verificados no navegador.
- Atirador exige nível 3 + 100 prata; Bastião, nível 5 + 200 prata; Feiticeiro, nível 7 + 300 prata. Verificação no sistema de compras, além da indicação visual da loja. Recrutamento posterior continua custando 35 prata por companheiro.
- TypeScript aprovado; 104 testes Vitest e nove cenários de navegador.
- Sheets do Lutador inspecionadas, sem alteração dos PNGs: [relatório](artifacts/VERIFICACAO-SPRITES-LUTADOR.md) e medições em `artifacts/fighter-sheets-analysis.json`.

Os registros abaixo descrevem versões anteriores; a retenção de progressão entre novos jogos deixou de ser a regra atual.

## Atualização — correções da quarta passagem

- TypeScript e build Vite aprovados.
- 98 testes Vitest em cinco arquivos.
- Oito cenários Playwright/Edge: jornada completa, quatro cenários da quarta passagem, painéis em três resoluções, atlas extenso e seis biomas.
- Seleção com quatro membros e destinos distintos, ataque livre nas quatro classes, alvo explícito, prioridade das ordens, oito pings, tolerância de alvos, feed conectado e teclas remapeadas agora têm verificações específicas.
- Detalhes e decisões: [Correções da quarta passagem](artifacts/CORRECOES-QUARTA-PASSAGEM.md).

## Registro das passagens anteriores

- `npm install`: concluído; lockfile presente; auditoria da instalação sem vulnerabilidades reportadas.
- `npm run dev`: servidor iniciado e verificado em 5173; comando também confirmado em porta temporária, posteriormente encerrada.
- `npm run build`: TypeScript strict sem erros e build Vite concluído.
- `npm test`: 48 testes passaram (21 de mundo/progressão/loot/persistência/navegação e 27 de combate/IA/loja).
- Playwright/Edge: 2 testes passaram na versão final, em aproximadamente 4,5 minutos.
- Jornada: abertura, classe, movimento, comerciante, compra, equipamento, Fire Jewel, habilidade modificada, combate normal e abate, coleta, recrutamento, seleção, Fortune Jewel, pausa tática, morte individual, sobrevivente, reload, wipe, nova expedição e meta preservada.
- Biomas: seis regiões renderizadas, screenshots inspecionados; carregamento limitado a 25 chunks. Teleportes usados exclusivamente para alcançar os biomas na verificação.
- Console: nenhum erro capturado nos testes completos.
- Renderer padrão: 86 FPS observados na cena inicial, viewport 1440×900, 25 chunks carregados, 277 inimigos cadastrados (apenas os próximos simulados/renderizados). Essa amostra não é um benchmark prolongado.
- Renderer forçado por software: aproximadamente 5–6 FPS na travessia de biomas; esse modo é usado pelo smoke test sem depender de GPU.
- `Start-Game.ps1 -NoBrowser`: confirmou que o endereço local responde. `Jogar.cmd` é o iniciador para duplo clique.

As capturas estão em `artifacts/`: menu, mundo, inventário, habilidades, combate, sobrevivente após reload, game over, seis biomas e cena com renderer padrão.

Os recursos de debug foram usados para acelerar moeda/recrutamento e provocar mortes determinísticas de QA. O inimigo do teste de jornada foi derrotado por habilidades e ataque do jogo; não foi removido por comando de debug.

Não foi certificado: benchmark sustentado em 1920×1080, equilíbrio de centenas de horas, mobile ou gamepad. Não há backend nem multiplayer.
