# Roteiro da apresentação (02/12/2026)

Entrega do zip até 19h no virtual e apresentação na aula do mesmo dia. Entregar sem
apresentar (ou o contrário) zera o trabalho. A apresentação vale 3,0 e é **individual**:
cada um apresenta a sua parte, mas o professor pode perguntar sobre qualquer parte.

## Antes da aula

- [ ] Rodar `python empacotar.py` e enviar `dist/TrabalhoComputabilidade.zip`.
- [ ] Na máquina da apresentação, testar do zero seguindo o README (compilar, instalar
      o Flask, subir o servidor, abrir no navegador). Funciona sem internet.
- [ ] Deixar abertas as abas da seção "Demonstração" abaixo.
- [ ] Todos lerem o relatório inteiro e o `docs/formato.md`.

## Divisão (cerca de 3 a 4 minutos por pessoa)

| Ordem | Quem | Parte | O que mostrar |
|---|---|---|---|
| 1 | Bernardo | Visão geral e exemplos | Objetivo, arquitetura C + Flask + páginas, os 4 exemplos e por que cada um é não determinístico |
| 2 | Lorenzo | Núcleo em C | `Automato` e `delta[e][s]` como conjunto, coluna `EPSILON`, leitura do arquivo, `fecho_epsilon` com pilha, simulação por conjuntos e árvore |
| 3 | Pedro | Servidor e desenhos | `app.py` chamando o C com `subprocess`, rotas, JSON do C; desenho do autômato e da árvore com Cytoscape |
| 4 | João | Telas e uso | Especificação por tabela e lista, abrir/salvar, erros de validação, passo a passo completo |

## Demonstração sugerida

1. `?exemplo=numeros_reais` → tela de especificação; mostrar tabela, lista e o .afn gerado;
   salvar o arquivo, clicar em **Novo** e abrir de novo.
2. Introduzir um erro (destino `q99`) e mostrar a mensagem do C.
3. Execução de `+2.5e-10` passo a passo: fecho-ε acrescentando estados (sinal opcional).
4. `?exemplo=termina_abb&sentenca=ababb`: a árvore abrindo um ramo a cada `a`.
5. `?exemplo=binario_101_ou_00&sentenca=1100&passo=fim`: ε no início escolhendo a condição.
6. `?exemplo=palavras_chave&sentenca=doub&passo=fim`: REJEITADA (fim fora de estado final).
7. Sentença com símbolo fora do alfabeto (`if2`).

## Perguntas prováveis (todos devem saber responder)

- **Como o não determinismo é tratado?** Por conjuntos de estados (todos os caminhos ao
  mesmo tempo) para o resultado e os passos; e por uma árvore de configurações
  (estado, posição) para mostrar cada escolha. Ver `src/simulador.c`.
- **Por que não backtracking ou conversão para AFD?** Backtracking pode ser exponencial
  e mostra um caminho por vez; o AFD esconde as escolhas que precisamos mostrar.
- **O que é fecho-ε e como evitar laço infinito num ciclo de ε?** Estados alcançáveis só
  com ε; um estado só entra na pilha se ainda não está no conjunto.
- **E se a árvore ficar enorme?** Limite de 3000 nós, aviso na tela; o resultado vem dos
  conjuntos e continua correto.
- **Onde está a lógica?** Só no C. O servidor só grava o texto num arquivo temporário e
  chama o executável; a página só mostra o JSON.
- **Quando a sentença é aceita?** Depois de lida inteira, se algum estado ativo é final.
- **Formato do arquivo?** Texto: `alfabeto`, `estados`, `inicial`, `finais`, `transicoes`
  com linhas `origem símbolos -> destinos`; `&` é ε.
