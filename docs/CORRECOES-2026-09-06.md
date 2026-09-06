# Correções após a atualização 60fb4d1

## Problemas resolvidos

- Geração: um bioma sem POI seguro elegível perto da origem agora fica sem POI nessa célula, sem sortear uma lista vazia. A seed `urze-7` conclui o carregamento inicial.
- População: hordas e encontros comuns compartilham a mesma candidatura territorial e arbitragem determinística entre vizinhos. Um território recebe apenas um desses grupos; POIs vizinhos, área inicial e orçamento também são respeitados.
- Combate: inimigos recebem todos os projéteis e golpes simultâneos, incluindo efeitos e choque térmico. Personagens mantêm a proteção de 0,4 s. Recuo e brilho de dano continuam nos inimigos. Stagger expirado deixa de bloquear ações.
- Persistência: schema 5 aceita saves anteriores, inicializa configurações e talentos, valida classe e configurações e repara slots inválidos/duplicados sem deslocar os slots válidos. Seed, versão do gerador, passivas antigas e deltas são preservados.
- Loot: tabelas de inimigos respeitam nível mínimo e bioma dos itens. Novos POIs usam suas próprias tabelas com sorteio determinístico; recompensas monetárias incorporam a dificuldade. A recompensa dos POIs antigos permanece compatível.
- Exploração: XP de descoberta atualiza o maior nível e é salvo mesmo ao abrir um mercador. Conversas com NPCs são concluídas ao chegar; Explorar usa o alvo mais próximo, permitindo acessar o mercador ao lado de um NPC.
- Encerramento: destruir o gerenciador de chunks também limpa as solicitações pendentes.

## Preservação

Nenhum arquivo de sprite foi alterado. Mantidos o visual, as variantes, o recuo, os controles e o fluxo de sandbox da atualização. Não houve reset do banco de dados, commit ou push.

A correção do espaçamento altera a distribuição de encontros gerados pela versão 3; terreno, seed e registros de progresso continuam sendo utilizados. Geradores legados não foram substituídos.

## Validação

- 140/140 testes unitários, incluindo 18 regressões novas; nenhum erro assíncrono reportado.
- 11 cenários únicos de navegador validados. Na primeira execução completa, 10 passaram e a expedição identificou a prioridade incorreta do NPC. Após corrigir, passaram a expedição e os quatro cenários de controles/interação executados novamente.
- Navegador: sprites em oito direções e pausa, choque térmico, inventário e árvore em três resoluções, atlas com milhares de chunks, seis biomas, descarregamento, sandbox, comércio, recrutamento, save/retomada e morte permanente.
- TypeScript e build de produção aprovados. Permanece o aviso anterior de bundle JavaScript acima de 1600 kB; não é erro de compilação.

Os testes de persistência utilizam IndexedDB isolado; não substituem o save pessoal do jogador.
