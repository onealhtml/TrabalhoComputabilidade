# Simulador de AFND / AFND-ε — Trabalho de Computabilidade

Trabalho da disciplina de Computabilidade (UNISC, Prof. Ivan L. Süptitz).
**Entrega e apresentação: 02/12/2026** (zip no virtual até 19h, apresentação na aula do mesmo dia).

Grupo:
- Lorenzo Farias (`onealhtml`): núcleo em C
- Pedro Buchaim (`Tinpack`): interface em Python
- Bernardo Soares Nunes (`besoaresn`): exemplos, README e relatório

## Arquitetura

- **C (núcleo):** toda a lógica do autômato. Um executável de linha de comando que lê o
  arquivo do autômato e a sentença e imprime na saída padrão o trace da execução em JSON
  (passos, estados ativos, entrada consumida/restante, árvore de caminhos e resultado
  ACEITA/REJEITADA).
- **Python (interface):** só interação e visualização. Chama o executável C via
  `subprocess`, lê o JSON e desenha o autômato, a árvore de execução e o passo-a-passo.
  Não reimplementar lógica do autômato no Python.

O formato do arquivo do autômato (issue #1) e o schema do JSON (issue #6) são o contrato
entre as duas partes; mudanças neles precisam ser combinadas no grupo.

## Requisitos da especificação

- Usuário define alfabeto, estados, estado inicial, estados finais e transições
  (lista, tabela ou gráfico). Transições com **múltiplos destinos** para o mesmo
  (estado, símbolo) e **transições ε**.
- Salvar a especificação em arquivo e reabrir.
- Execução **passo-a-passo** mostrando estado atual, estados possíveis, situação da
  entrada e os caminhos decorrentes das escolhas não determinísticas.
- Resultado final: ACEITA ou REJEITADA.
- Exemplos obrigatórios (mínimo 4): números reais com sinal e notação científica
  opcionais; palavras-chave de uma linguagem de programação; 2 livres.

Avaliação: estruturas + abrir/salvar 2,0 · passo-a-passo 2,0 · visual (desenho do
autômato e árvore de execução) 1,5 · relatório PDF 1,5 · apresentação individual 3,0.
Cada integrante apresenta uma parte e precisa entender a solução inteira, então o
código deve ser simples de explicar.

## Compilar e rodar

```sh
cmake -S . -B cmake-build-debug
cmake --build cmake-build-debug
./cmake-build-debug/TrabalhoComputabilidade
```

O `CMakeLists.txt` pede CMake 4.3 e C23 (padrão do CLion); se alguém tiver versão mais
antiga, baixar o mínimo em vez de atualizar a máquina.

## Organização

- `relatorio/`: documentos do relatório (esboço em .docx; a versão final vai em PDF).
- Pendências estão nas **issues do GitHub** (milestone "Entrega 02/12/2026", labels
  `nucleo-c`, `python-visual`, `exemplos`, `entrega`). Ver com `gh issue list`.
- O zip final precisa conter código-fonte, instruções de execução, exemplos e o
  relatório PDF (só o link do repositório não vale).

## Convenções

- Textos, commits, issues e mensagens da interface em português.
- O projeto precisa ser de autoria do grupo: código gerado com ajuda de IA deve ser
  entendido por quem vai apresentá-lo.
