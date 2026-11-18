/*
 * automato.h - estruturas de dados do AFND / AFND-ε (issue #2).
 *
 * O autômato é guardado em vetores de tamanho fixo para ficar simples de
 * explicar: estados e símbolos são identificados pelo seu índice.
 *
 *   - simbolos[i]  é o i-ésimo símbolo do alfabeto (um caractere);
 *   - nomes[e]     é o nome do estado de índice e (ex.: "q0");
 *   - delta[e][s]  é o CONJUNTO de estados de destino a partir do estado e
 *                  lendo o símbolo s. A coluna s = EPSILON guarda as
 *                  transições ε (que não consomem entrada).
 *
 * Como delta[e][s] é um conjunto, um mesmo par (estado, símbolo) pode ter
 * vários destinos, que é o que caracteriza o não determinismo.
 */
#ifndef AUTOMATO_H
#define AUTOMATO_H

#include <stdbool.h>
#include <stddef.h>

#define MAX_ESTADOS 64
#define MAX_SIMBOLOS 64
#define MAX_NOME 32
#define TAM_ERRO 256

/* Índice da coluna das transições ε na tabela delta. */
#define EPSILON MAX_SIMBOLOS

/* Conjunto de estados: tem[e] é verdadeiro se o estado e pertence ao conjunto. */
typedef struct {
    bool tem[MAX_ESTADOS];
} Conjunto;

typedef struct {
    int num_simbolos;
    char simbolos[MAX_SIMBOLOS];

    int num_estados;
    char nomes[MAX_ESTADOS][MAX_NOME];

    int inicial;                 /* índice do estado inicial, -1 se não definido */
    bool final[MAX_ESTADOS];     /* final[e] é verdadeiro se e é estado final */

    /* Tabela de transições: (estado, símbolo ou ε) -> conjunto de estados. */
    Conjunto delta[MAX_ESTADOS][MAX_SIMBOLOS + 1];
} Automato;

/* Criação e liberação de memória. */
Automato *automato_criar(void);
void automato_liberar(Automato *a);

/* Consultas: devolvem o índice ou -1 se não existir. */
int automato_indice_estado(const Automato *a, const char *nome);
int automato_indice_simbolo(const Automato *a, char c);

/* Inclusões usadas na leitura do arquivo. Devolvem false e preenchem erro. */
bool automato_adicionar_simbolo(Automato *a, const char *token, char *erro);
bool automato_adicionar_estado(Automato *a, const char *nome, char *erro);
void automato_adicionar_transicao(Automato *a, int origem, int simbolo, int destino);

/* Validação geral (estado inicial definido, ao menos um estado...). */
bool automato_validar(const Automato *a, char *erro);

/* Confere se toda a sentença usa apenas símbolos do alfabeto. */
bool automato_validar_sentenca(const Automato *a, const char *sentenca, char *erro);

/* Operações sobre conjuntos de estados. */
void conjunto_limpar(Conjunto *c);
bool conjunto_vazio(const Conjunto *c);
bool conjunto_iguais(const Conjunto *a, const Conjunto *b);

#endif
