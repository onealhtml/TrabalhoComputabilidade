# Simulador de AFND / AFND-ε — Trabalho de Computabilidade

Trabalho da disciplina de Computabilidade (UNISC, Prof. Ivan L. Süptitz).
**Entrega e apresentação: 02/12/2026** (zip no virtual até 19h, apresentação na aula do mesmo dia).

Grupo:
- Lorenzo Farias (`onealhtml`): núcleo em C
- Pedro Cabral Buchaim (`Tinpack`): servidor em Python e desenho do autômato/árvore
- João Vitor Cossettin Napoleão: páginas web (HTML, CSS, JS), layout e testes de uso
- Bernardo Soares Nunes (`besoaresn`): exemplos, README e relatório

## Arquitetura

- **C (núcleo):** toda a lógica do autômato. Um executável de linha de comando que lê o
  arquivo do autômato e a sentença e imprime na saída padrão o trace da execução em JSON
  (passos, estados ativos, entrada consumida/restante, árvore de caminhos e resultado
  ACEITA/REJEITADA).
- **Interface web** (o usuário acessa pelo navegador; terminal não serve para os desenhos):
  - **Servidor Python (Flask, `servidor/app.py`):** chama o executável C via `subprocess`
    (comandos `info`, `simular`, `salvar`) e entrega o JSON para as páginas.
  - **Páginas HTML/CSS/JS (`servidor/static/`):** telas de especificação e de passo-a-passo,
    desenho do autômato e da árvore com Cytoscape.js (vendorizado em `static/vendor/`, sem CDN).
  Nem o servidor nem as páginas reimplementam lógica do autômato.

O formato do arquivo do autômato e o schema do JSON estão em `docs/formato.md` e são o
contrato entre as partes; mudanças neles precisam ser combinadas no grupo.

Núcleo em `src/`: `automato.*` (estruturas), `arquivo.*` (abrir/salvar), `simulador.*`
(fecho-ε, passos por conjuntos e árvore de caminhos), `json.*` e `main.c` (CLI).

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
python testes/testar.py                 # testes (ou ctest --test-dir cmake-build-debug)
python -m pip install -r requirements.txt
python servidor/app.py                  # http://127.0.0.1:5000
```

O `CMakeLists.txt` pede CMake 3.10 e C11 para compilar em qualquer máquina. Os exemplos
(`exemplos/*.afn`) têm comentários `# aceita:` / `# rejeita:` usados pelos testes.

## Organização

- `relatorio/`: `Relatório.docx` (editável) e `Relatório.pdf` (entregue); o esboço ficou como histórico.
- `docs/apresentacao.md`: divisão e roteiro da apresentação.
- `python empacotar.py` gera `dist/TrabalhoComputabilidade.zip` para a entrega.
- Pendências estão nas **issues do GitHub** (milestone "Entrega 02/12/2026", labels
  `nucleo-c`, `interface-web`, `exemplos`, `entrega`). Ver com `gh issue list`.
- O zip final precisa conter código-fonte, instruções de execução, exemplos e o
  relatório PDF (só o link do repositório não vale).

## Convenções

- Textos, commits, issues e mensagens da interface em português.
- O projeto precisa ser de autoria do grupo: código gerado com ajuda de IA deve ser
  entendido por quem vai apresentá-lo.
