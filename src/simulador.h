/*
 * simulador.h - fecho-ε e execução passo a passo (issues #4 e #5).
 *
 * A execução é feita de dois jeitos complementares:
 *
 *  1. Por CONJUNTOS de estados (passos): no passo 0 os estados ativos são o
 *     fecho-ε do estado inicial; no passo k, lendo o k-ésimo símbolo, os
 *     ativos são o fecho-ε de todos os destinos a partir dos ativos do passo
 *     anterior. A sentença é ACEITA se, depois de ler tudo, algum estado
 *     ativo for final. É isso que decide o resultado.
 *
 *  2. Pela ÁRVORE de caminhos: cada nó é uma configuração (estado, posição na
 *     entrada). Cada escolha não determinística (vários destinos, ou uma
 *     transição ε) gera um filho. Assim dá para mostrar todos os caminhos,
 *     quais morrem e quais aceitam.
 */
#ifndef SIMULADOR_H
#define SIMULADOR_H

#include "automato.h"

#define MAX_SENTENCA 500
#define MAX_NOS 3000      /* limite de nós da árvore (ela pode crescer muito) */

typedef enum {
    NO_INTERNO,   /* o caminho continua (o nó tem filhos) */
    NO_ACEITO,    /* leu toda a entrada e está num estado final */
    NO_MORTO,     /* não há mais transições ou a entrada acabou fora de estado final */
    NO_CORTADO    /* não foi expandido porque a árvore atingiu MAX_NOS */
} StatusNo;

typedef struct {
    int estado;       /* índice do estado */
    int pai;          /* índice do nó pai na árvore, -1 na raiz */
    int posicao;      /* quantos símbolos da entrada já foram lidos */
    int simbolo;      /* símbolo usado para chegar aqui: índice, EPSILON ou -1 na raiz */
    StatusNo status;
} No;

typedef struct {
    const char *sentenca;
    int tamanho;

    /* Passos por conjuntos: posição 0..num_passos-1. */
    int num_passos;
    Conjunto antes_fecho[MAX_SENTENCA + 1];   /* destinos lendo o símbolo, antes do fecho-ε */
    Conjunto ativos[MAX_SENTENCA + 1];        /* estados ativos após o fecho-ε */

    /* Árvore de caminhos. */
    No nos[MAX_NOS];
    int num_nos;
    bool arvore_truncada;

    bool aceita;
} Execucao;

/* Fecho-ε: todos os estados alcançáveis a partir de 'c' usando só transições ε. */
Conjunto fecho_epsilon(const Automato *a, Conjunto c);
Conjunto fecho_epsilon_estado(const Automato *a, int estado);

/* União dos destinos de todos os estados de 'c' lendo o símbolo s. */
Conjunto mover(const Automato *a, const Conjunto *c, int simbolo);

/* Executa a sentença (já validada contra o alfabeto) e preenche 'ex'. */
void simular(const Automato *a, const char *sentenca, Execucao *ex);

#endif
