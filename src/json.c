/*
 * json.c - escreve o autômato e a execução em JSON (issue #6).
 *
 * Não usamos biblioteca: o JSON é montado com fprintf. Só os textos precisam
 * de cuidado (aspas e barras invertidas são escapadas em json_texto).
 */
#include "json.h"

/* "ε" escrito como escape JSON, para a saída ficar em ASCII. */
#define JSON_EPSILON "\"\\u03b5\""

static void json_texto(FILE *f, const char *s) {
    fputc('"', f);
    for (; *s != '\0'; s++) {
        unsigned char c = (unsigned char) *s;
        if (c == '"' || c == '\\') fprintf(f, "\\%c", c);
        else if (c == '\n') fprintf(f, "\\n");
        else if (c < 32) fprintf(f, "\\u%04x", c);
        else fputc(c, f);
    }
    fputc('"', f);
}

static void json_simbolo(FILE *f, const Automato *a, int simbolo) {
    if (simbolo == EPSILON) {
        fprintf(f, JSON_EPSILON);
    } else if (simbolo < 0) {
        fprintf(f, "null");
    } else {
        char s[2] = {a->simbolos[simbolo], '\0'};
        json_texto(f, s);
    }
}

/* Escreve um trecho da sentença (de 'inicio' até 'fim', sem incluir 'fim'). */
static void json_trecho(FILE *f, const char *sentenca, int inicio, int fim) {
    char buffer[MAX_SENTENCA + 1];
    int n = 0;
    for (int i = inicio; i < fim; i++) buffer[n++] = sentenca[i];
    buffer[n] = '\0';
    json_texto(f, buffer);
}

static void json_conjunto(FILE *f, const Automato *a, const Conjunto *c) {
    fprintf(f, "[");
    bool primeiro = true;
    for (int e = 0; e < a->num_estados; e++) {
        if (!c->tem[e]) continue;
        if (!primeiro) fprintf(f, ",");
        json_texto(f, a->nomes[e]);
        primeiro = false;
    }
    fprintf(f, "]");
}

/* Uma transição usada num passo: {"de":"q0","simbolo":"a","para":"q1"}. */
static void json_transicao(FILE *f, const Automato *a, int de, int simbolo, int para, bool *primeiro) {
    if (!*primeiro) fprintf(f, ",");
    *primeiro = false;
    fprintf(f, "{\"de\":");
    json_texto(f, a->nomes[de]);
    fprintf(f, ",\"simbolo\":");
    json_simbolo(f, a, simbolo);
    fprintf(f, ",\"para\":");
    json_texto(f, a->nomes[para]);
    fprintf(f, "}");
}

static void json_automato(FILE *f, const Automato *a) {
    fprintf(f, "{\"alfabeto\":[");
    for (int s = 0; s < a->num_simbolos; s++) {
        if (s > 0) fprintf(f, ",");
        json_simbolo(f, a, s);
    }
    fprintf(f, "],\"estados\":[");
    for (int e = 0; e < a->num_estados; e++) {
        if (e > 0) fprintf(f, ",");
        json_texto(f, a->nomes[e]);
    }
    fprintf(f, "],\"inicial\":");
    json_texto(f, a->nomes[a->inicial]);
    fprintf(f, ",\"finais\":[");
    bool primeiro = true;
    for (int e = 0; e < a->num_estados; e++) {
        if (!a->final[e]) continue;
        if (!primeiro) fprintf(f, ",");
        json_texto(f, a->nomes[e]);
        primeiro = false;
    }

    /* Transições agrupadas por (origem, símbolo): {"de","simbolo","para":[...]} */
    fprintf(f, "],\"transicoes\":[");
    primeiro = true;
    for (int e = 0; e < a->num_estados; e++) {
        for (int i = 0; i <= a->num_simbolos; i++) {
            int s = (i == a->num_simbolos) ? EPSILON : i;
            if (conjunto_vazio(&a->delta[e][s])) continue;
            if (!primeiro) fprintf(f, ",");
            primeiro = false;
            fprintf(f, "{\"de\":");
            json_texto(f, a->nomes[e]);
            fprintf(f, ",\"simbolo\":");
            json_simbolo(f, a, s);
            fprintf(f, ",\"para\":");
            json_conjunto(f, a, &a->delta[e][s]);
            fprintf(f, "}");
        }
    }
    fprintf(f, "]}");
}

void json_erro(FILE *f, const char *mensagem) {
    fprintf(f, "{\"ok\":false,\"erro\":");
    json_texto(f, mensagem);
    fprintf(f, "}\n");
}

void json_ok(FILE *f) {
    fprintf(f, "{\"ok\":true}\n");
}

void json_info(FILE *f, const Automato *a) {
    fprintf(f, "{\"ok\":true,\"automato\":");
    json_automato(f, a);
    fprintf(f, "}\n");
}

static const char *nome_status(StatusNo s) {
    switch (s) {
        case NO_INTERNO: return "interno";
        case NO_ACEITO: return "aceito";
        case NO_MORTO: return "morto";
        default: return "cortado";
    }
}

void json_execucao(FILE *f, const Automato *a, const Execucao *ex) {
    fprintf(f, "{\"ok\":true,\"automato\":");
    json_automato(f, a);
    fprintf(f, ",\n\"sentenca\":");
    json_texto(f, ex->sentenca);

    fprintf(f, ",\n\"passos\":[");
    for (int k = 0; k < ex->num_passos; k++) {
        if (k > 0) fprintf(f, ",");
        fprintf(f, "\n{\"passo\":%d,\"simbolo\":", k);
        if (k == 0) fprintf(f, "null");
        else json_simbolo(f, a, automato_indice_simbolo(a, ex->sentenca[k - 1]));
        fprintf(f, ",\"consumido\":");
        json_trecho(f, ex->sentenca, 0, k);
        fprintf(f, ",\"restante\":");
        json_trecho(f, ex->sentenca, k, ex->tamanho);
        fprintf(f, ",\"estados_antes_fecho\":");
        json_conjunto(f, a, &ex->antes_fecho[k]);
        fprintf(f, ",\"estados\":");
        json_conjunto(f, a, &ex->ativos[k]);

        /* Transições usadas para chegar a este passo: as que leem o símbolo
         * (a partir dos ativos do passo anterior) e as ε do fecho. */
        fprintf(f, ",\"transicoes\":[");
        bool primeiro = true;
        if (k > 0) {
            int s = automato_indice_simbolo(a, ex->sentenca[k - 1]);
            for (int e = 0; e < a->num_estados; e++) {
                if (!ex->ativos[k - 1].tem[e]) continue;
                for (int d = 0; d < a->num_estados; d++) {
                    if (a->delta[e][s].tem[d]) json_transicao(f, a, e, s, d, &primeiro);
                }
            }
        }
        for (int e = 0; e < a->num_estados; e++) {
            if (!ex->ativos[k].tem[e]) continue;
            for (int d = 0; d < a->num_estados; d++) {
                if (a->delta[e][EPSILON].tem[d]) json_transicao(f, a, e, EPSILON, d, &primeiro);
            }
        }
        fprintf(f, "]}");
    }

    fprintf(f, "],\n\"arvore\":{\"truncada\":%s,\"nos\":[", ex->arvore_truncada ? "true" : "false");
    for (int i = 0; i < ex->num_nos; i++) {
        const No *n = &ex->nos[i];
        if (i > 0) fprintf(f, ",");
        fprintf(f, "\n{\"id\":%d,\"pai\":%d,\"estado\":", i, n->pai);
        json_texto(f, a->nomes[n->estado]);
        fprintf(f, ",\"passo\":%d,\"simbolo\":", n->posicao);
        json_simbolo(f, a, n->simbolo);
        fprintf(f, ",\"status\":\"%s\"}", nome_status(n->status));
    }
    fprintf(f, "]},\n\"resultado\":\"%s\"}\n", ex->aceita ? "ACEITA" : "REJEITADA");
}
