/*
 * simulador.c - fecho-ε (issue #4) e motor passo a passo com árvore (issue #5).
 */
#include "simulador.h"

#include <string.h>

/*
 * Fecho-ε com uma pilha: cada estado novo entra no conjunto e na pilha; ao
 * tirar um estado da pilha, olhamos suas transições ε. Um estado só é
 * empilhado se ainda não estava no conjunto, então ciclos de ε (q1 -ε-> q2
 * -ε-> q1) não causam laço infinito e a pilha nunca passa de MAX_ESTADOS.
 */
Conjunto fecho_epsilon(const Automato *a, Conjunto c) {
    int pilha[MAX_ESTADOS];
    int topo = 0;

    for (int e = 0; e < a->num_estados; e++) {
        if (c.tem[e]) pilha[topo++] = e;
    }

    while (topo > 0) {
        int e = pilha[--topo];
        for (int d = 0; d < a->num_estados; d++) {
            if (a->delta[e][EPSILON].tem[d] && !c.tem[d]) {
                c.tem[d] = true;
                pilha[topo++] = d;
            }
        }
    }
    return c;
}

Conjunto mover(const Automato *a, const Conjunto *c, int simbolo) {
    Conjunto resultado;
    conjunto_limpar(&resultado);
    for (int e = 0; e < a->num_estados; e++) {
        if (!c->tem[e]) continue;
        for (int d = 0; d < a->num_estados; d++) {
            if (a->delta[e][simbolo].tem[d]) resultado.tem[d] = true;
        }
    }
    return resultado;
}

static bool tem_final(const Automato *a, const Conjunto *c) {
    for (int e = 0; e < a->num_estados; e++) {
        if (c->tem[e] && a->final[e]) return true;
    }
    return false;
}

/* Passos por conjuntos de estados (decide ACEITA / REJEITADA). */
static void simular_conjuntos(const Automato *a, Execucao *ex) {
    conjunto_limpar(&ex->antes_fecho[0]);
    ex->antes_fecho[0].tem[a->inicial] = true;
    ex->ativos[0] = fecho_epsilon(a, ex->antes_fecho[0]);
    ex->num_passos = 1;

    for (int k = 1; k <= ex->tamanho; k++) {
        /* Se nenhum estado está ativo, todos os caminhos morreram: para aqui. */
        if (conjunto_vazio(&ex->ativos[k - 1])) break;

        int simbolo = automato_indice_simbolo(a, ex->sentenca[k - 1]);
        ex->antes_fecho[k] = mover(a, &ex->ativos[k - 1], simbolo);
        ex->ativos[k] = fecho_epsilon(a, ex->antes_fecho[k]);
        ex->num_passos++;
    }

    ex->aceita = ex->num_passos == ex->tamanho + 1 && tem_final(a, &ex->ativos[ex->tamanho]);
}

/* Verdadeiro se 'estado' já aparece no caminho do nó 'no' até a raiz na mesma
 * posição da entrada, ou seja, seguir essa transição ε fecharia um ciclo. */
static bool ciclo_epsilon(const Execucao *ex, int no, int estado) {
    int posicao = ex->nos[no].posicao;
    while (no >= 0 && ex->nos[no].posicao == posicao) {
        if (ex->nos[no].estado == estado) return true;
        no = ex->nos[no].pai;
    }
    return false;
}

/* Acrescenta um nó no fim do vetor (quem chama garante que há espaço). */
static void adicionar_no(Execucao *ex, int pai, int estado, int posicao, int simbolo) {
    No *n = &ex->nos[ex->num_nos++];
    n->estado = estado;
    n->pai = pai;
    n->posicao = posicao;
    n->simbolo = simbolo;
    n->status = NO_CORTADO;   /* muda quando o nó for expandido */
}

/*
 * Árvore de caminhos, construída em largura: os nós são processados na ordem
 * em que foram criados (o próprio vetor funciona como fila). Para cada nó:
 *   - se a entrada acabou e o estado é final, o caminho ACEITA;
 *   - senão, cria um filho para cada transição ε (sem repetir estado na mesma
 *     posição, para não entrar em ciclo) e um filho para cada destino lendo o
 *     próximo símbolo;
 *   - se não criou nenhum filho, o caminho MORREU.
 * Um nó tem no máximo um filho por estado lendo ε e um por estado lendo o
 * símbolo. Se o vetor não comporta esse pior caso, a construção para: o nó
 * atual e os que ainda estão na fila ficam NO_CORTADO.
 */
static void construir_arvore(const Automato *a, Execucao *ex) {
    ex->num_nos = 0;
    ex->arvore_truncada = false;
    adicionar_no(ex, -1, a->inicial, 0, -1);

    for (int i = 0; i < ex->num_nos; i++) {
        int estado = ex->nos[i].estado;
        int posicao = ex->nos[i].posicao;

        if (posicao == ex->tamanho && a->final[estado]) {
            ex->nos[i].status = NO_ACEITO;
            continue;
        }

        if (ex->num_nos + 2 * a->num_estados > MAX_NOS) {
            ex->arvore_truncada = true;
            break;
        }

        int filhos = 0;
        for (int d = 0; d < a->num_estados; d++) {
            if (a->delta[estado][EPSILON].tem[d] && !ciclo_epsilon(ex, i, d)) {
                adicionar_no(ex, i, d, posicao, EPSILON);
                filhos++;
            }
        }

        if (posicao < ex->tamanho) {
            int simbolo = automato_indice_simbolo(a, ex->sentenca[posicao]);
            for (int d = 0; d < a->num_estados; d++) {
                if (a->delta[estado][simbolo].tem[d]) {
                    adicionar_no(ex, i, d, posicao + 1, simbolo);
                    filhos++;
                }
            }
        }

        ex->nos[i].status = filhos > 0 ? NO_INTERNO : NO_MORTO;
    }
}

void simular(const Automato *a, const char *sentenca, Execucao *ex) {
    ex->sentenca = sentenca;
    ex->tamanho = (int) strlen(sentenca);
    simular_conjuntos(a, ex);
    construir_arvore(a, ex);
}
