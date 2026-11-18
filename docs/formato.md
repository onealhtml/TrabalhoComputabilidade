# Formato do arquivo e do JSON

Este documento é o contrato entre o núcleo em C e a interface web (issues #1 e #6).

## Arquivo do autômato (`.afn`)

Arquivo de texto simples, uma informação por linha, itens separados por espaços.
Tudo o que vem depois de `#` é comentário.

```text
# AFND-ε de exemplo
alfabeto: a b
estados: q0 q1 q2
inicial: q0
finais: q2
transicoes:
q0 a b -> q0          # origem, um ou mais símbolos, "->", um ou mais destinos
q0 a -> q1            # o par (q0, a) agora tem dois destinos: q0 e q1
q1 & -> q2            # '&' (ou 'ε') é a transição vazia
```

| Linha | Conteúdo | Regras |
|---|---|---|
| `alfabeto:` | símbolos | Cada símbolo é **um caractere** visível. `&` e `#` são reservados. |
| `estados:` | nomes dos estados | Letras, dígitos e `_`, até 31 caracteres. |
| `inicial:` | um estado | Obrigatório; precisa estar em `estados`. |
| `finais:` | zero ou mais estados | Precisam estar em `estados`. |
| `transicoes:` | — | Todas as linhas seguintes são transições. |

Transição: `origem símbolo [símbolo...] -> destino [destino...]`. A mesma origem e
símbolo podem aparecer em várias linhas: os destinos se somam. Isso permite
**múltiplos destinos** e **transições ε** (`&`).

`alfabeto` e `estados` precisam vir antes de `inicial`, `finais` e `transicoes`.
Limites: 64 estados, 64 símbolos, sentenças de até 500 símbolos.

Ao salvar, o núcleo em C grava o arquivo nesse mesmo formato, juntando numa linha os
símbolos que levam aos mesmos destinos (ex.: `q1 0 1 2 3 4 5 6 7 8 9 -> q2`).

Nos arquivos de `exemplos/`, os comentários `# aceita: ...` e `# rejeita: ...`
listam sentenças de teste (`ε` = sentença vazia). Eles são usados pelos testes
automáticos e pelos botões "Testar" da página.

## Linha de comando do núcleo em C

```text
TrabalhoComputabilidade info    <arquivo.afn>               valida e devolve o autômato
TrabalhoComputabilidade simular <arquivo.afn> <sentença>    executa a sentença
TrabalhoComputabilidade salvar  <entrada.afn> <saída.afn>   valida e grava o arquivo
```

A saída é sempre um JSON na saída padrão. Em caso de erro o código de saída é 1 e:

```json
{"ok": false, "erro": "linha 7: estado de destino 'q9' não foi declarado em 'estados'"}
```

### `info`

```json
{"ok": true, "automato": AUTOMATO}
```

`AUTOMATO`:

```json
{
  "alfabeto": ["a", "b"],
  "estados": ["q0", "q1", "q2"],
  "inicial": "q0",
  "finais": ["q2"],
  "transicoes": [
    {"de": "q0", "simbolo": "a", "para": ["q0", "q1"]},
    {"de": "q0", "simbolo": "b", "para": ["q0"]},
    {"de": "q1", "simbolo": "ε", "para": ["q2"]}
  ]
}
```

Há uma entrada em `transicoes` por par (origem, símbolo); `"ε"` é a transição vazia.

### `salvar`

```json
{"ok": true}
```

### `simular`

```json
{
  "ok": true,
  "automato": AUTOMATO,
  "sentenca": "ab",
  "passos": [PASSO, ...],
  "arvore": {"truncada": false, "nos": [NO, ...]},
  "resultado": "ACEITA"
}
```

`PASSO` (um por símbolo lido, mais o passo 0 antes de ler qualquer coisa):

| Campo | Significado |
|---|---|
| `passo` | número do passo `k` (= quantos símbolos já foram lidos) |
| `simbolo` | símbolo lido neste passo (`null` no passo 0) |
| `consumido` / `restante` | parte da sentença já lida / ainda por ler |
| `estados_antes_fecho` | estados alcançados lendo o símbolo, antes do fecho-ε (no passo 0, o inicial) |
| `estados` | estados ativos depois do fecho-ε |
| `transicoes` | transições usadas para chegar neste passo: `{"de", "simbolo", "para"}` |

Se em algum passo `estados` ficar vazio, todos os caminhos morreram e a lista de
passos termina ali (a sentença é REJEITADA sem ser lida até o fim).

`NO` (nó da árvore de caminhos, em ordem de criação; a raiz tem `id` 0):

| Campo | Significado |
|---|---|
| `id` / `pai` | identificador do nó e do pai (`-1` na raiz) |
| `estado` | estado deste nó |
| `passo` | quantos símbolos já foram lidos neste ponto do caminho |
| `simbolo` | símbolo da transição que levou até aqui (`"ε"`, ou `null` na raiz) |
| `status` | `interno` (o caminho continua), `aceito`, `morto` ou `cortado` |

Um nó `aceito` leu toda a entrada e está num estado final. Um nó `morto` não tem
como continuar. Como a árvore pode crescer muito, ela é limitada a 3000 nós: se o
limite for atingido, `truncada` é `true` e os nós não expandidos ficam `cortado`.
O `resultado` é sempre calculado pelos conjuntos de estados, então continua correto.

## Rotas do servidor (Flask)

| Rota | Corpo (JSON) | Resposta |
|---|---|---|
| `GET /` | — | a página |
| `POST /api/abrir` | `{"texto": "<conteúdo .afn>"}` | resposta do `info` |
| `POST /api/salvar` | `{"texto": "..."}` | resposta do `salvar` + `"texto"` gravado pelo C |
| `POST /api/simular` | `{"texto": "...", "sentenca": "ab"}` | resposta do `simular` |
| `GET /api/exemplos` | — | lista de nomes dos exemplos |
| `GET /api/exemplos/<nome>` | — | resposta do `info` + `texto`, `aceitas`, `rejeitadas` |

Em caso de erro a resposta tem status 400 e `{"ok": false, "erro": "..."}`.
