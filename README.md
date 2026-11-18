# Simulador de AFND / AFND-ε

Trabalho da disciplina de Computabilidade (UNISC, Prof. Ivan L. Süptitz).

Grupo: Bernardo Soares Nunes, João Vitor Cossettin Napoleão, Lorenzo Farias e Pedro Cabral Buchaim.

O simulador permite definir um autômato finito não determinístico (com múltiplos
destinos e transições ε), salvar e abrir a especificação em arquivo e executar uma
sentença passo a passo, vendo os estados ativos, a situação da entrada, o desenho do
autômato e a árvore com todos os caminhos de execução. No fim ele informa se a
sentença foi **ACEITA** ou **REJEITADA**.

```
┌──────────────┐  HTTP/JSON  ┌──────────────────┐ subprocess ┌────────────────────┐
│  Navegador   │ ──────────▶ │ Servidor Python  │ ─────────▶ │  Núcleo em C       │
│ HTML/CSS/JS  │ ◀────────── │ (Flask)          │ ◀───────── │ (toda a lógica do  │
│ (Cytoscape)  │             │ servidor/app.py  │   JSON     │  autômato) src/    │
└──────────────┘             └──────────────────┘            └────────────────────┘
```

## Requisitos

- Compilador C (GCC/MinGW, Clang ou MSVC) e **CMake 3.10+** (o CLion já traz os dois)
- **Python 3.9+** com `pip`
- Um navegador atual (Chrome, Edge, Firefox). Não precisa de internet: as bibliotecas
  JavaScript estão em `servidor/static/vendor/`.

## Como executar

Todos os comandos a partir da pasta raiz do projeto.

**1. Compilar o núcleo em C**

```sh
cmake -S . -B cmake-build-debug
cmake --build cmake-build-debug
```

No CLion basta abrir a pasta e usar *Build*. Sem CMake, dá para compilar direto com o GCC:

```sh
mkdir build
gcc -std=c11 -O2 -o build/TrabalhoComputabilidade src/*.c
```

**2. Instalar as dependências do servidor** (só na primeira vez)

```sh
python -m pip install -r requirements.txt
```

**3. Subir o servidor e abrir no navegador**

```sh
python servidor/app.py
```

Abra **http://127.0.0.1:5000**. Para parar o servidor, `Ctrl+C`.
O servidor procura o executável em `cmake-build-debug/`, `cmake-build-release/` ou
`build/`; outro caminho pode ser indicado na variável de ambiente `SIMULADOR_C`.
A porta pode ser trocada com a variável `PORTA`.

> No Linux/macOS use `python3` no lugar de `python`.

## Como usar

1. **Especificação**: informe o alfabeto (símbolos de um caractere separados por
   espaço), os estados, o estado inicial, os finais e as transições, pela **tabela**
   (linha = estado, coluna = símbolo, célula = destinos separados por espaço) ou pela
   **lista**. A coluna/símbolo **ε** é a transição vazia. O desenho e a validação são
   atualizados enquanto você digita.
   - **Salvar arquivo** baixa o autômato como `.afn`; **Abrir arquivo** carrega um `.afn`.
   - **Exemplo** carrega um dos autômatos de `exemplos/`.
2. **Execução passo a passo**: digite a sentença (vazia = ε) e clique em
   **Carregar sentença**. Use **Próximo / Anterior / Reiniciar / Executar tudo** (ou as
   setas ← → do teclado). Os botões "Testar" carregam as sentenças de teste do exemplo.

A página também aceita parâmetros, úteis na apresentação:
`http://127.0.0.1:5000/?exemplo=termina_abb&sentenca=ababb&passo=3`
(`passo=fim` vai direto ao resultado).

## Exemplos (`exemplos/`)

| Arquivo | Linguagem | Tipo |
|---|---|---|
| `numeros_reais.afn` | números reais com sinal e notação científica opcionais: `42`, `-3.14`, `+2.5e-10`, `1E5` | AFND-ε |
| `palavras_chave.afn` | palavras-chave de C: `if int for float do double else while return` | AFND |
| `termina_abb.afn` | sentenças sobre {a, b} que terminam com `abb` | AFND |
| `binario_101_ou_00.afn` | binários que contêm `101` ou terminam em `00` | AFND-ε |

Cada arquivo traz no comentário `# aceita:` / `# rejeita:` as sentenças de teste.

## Formato do arquivo

```text
alfabeto: a b
estados: q0 q1 q2
inicial: q0
finais: q2
transicoes:
q0 a b -> q0
q0 a -> q1
q1 & -> q2
```

Detalhes do formato, da linha de comando do C e do JSON trocado com o servidor em
[`docs/formato.md`](docs/formato.md).

## Linha de comando (sem interface)

```sh
./cmake-build-debug/TrabalhoComputabilidade info    exemplos/termina_abb.afn
./cmake-build-debug/TrabalhoComputabilidade simular exemplos/termina_abb.afn ababb
./cmake-build-debug/TrabalhoComputabilidade salvar  exemplos/termina_abb.afn copia.afn
```

## Testes

```sh
python testes/testar.py          # ou: ctest --test-dir cmake-build-debug
```

Roda todas as sentenças de teste dos exemplos, confere se a árvore concorda com o
resultado, se salvar e reabrir preserva o autômato e se arquivos inválidos geram erro.

## Estrutura

```
src/            núcleo em C
  automato.*      estruturas de dados (issue #2)
  arquivo.*       abrir e salvar (issues #1 e #3)
  simulador.*     fecho-ε, passos e árvore de caminhos (issues #4 e #5)
  json.*, main.c  linha de comando e saída JSON (issue #6)
servidor/       servidor Flask (app.py) e páginas (static/)
exemplos/       autômatos de exemplo
testes/         testes automáticos
docs/           formato do arquivo e do JSON
relatorio/      relatório (PDF)
```

Bibliotecas de terceiros (licença MIT), incluídas em `servidor/static/vendor/`:
[Cytoscape.js](https://js.cytoscape.org) 3.30.2, [dagre](https://github.com/dagrejs/dagre) 0.8.5
e [cytoscape-dagre](https://github.com/cytoscape/cytoscape.js-dagre) 2.5.0.
