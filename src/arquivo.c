/*
 * arquivo.c - leitura e gravação do autômato (issue #3). Formato em arquivo.h.
 */
#include "arquivo.h"

#include <stdio.h>
#include <string.h>

#define TAM_LINHA 4096
#define MAX_TOKENS 512

/* Quebra a linha em palavras separadas por espaço/tab (altera a linha). */
static int dividir(char *linha, char *tokens[], int max) {
    int n = 0;
    char *t = strtok(linha, " \t");
    while (t != NULL && n < max) {
        tokens[n++] = t;
        t = strtok(NULL, " \t");
    }
    return n;
}

/* Remove o comentário, o fim de linha e os espaços das pontas. */
static char *limpar_linha(char *linha) {
    char *p = strchr(linha, '#');
    if (p != NULL) *p = '\0';
    p = linha + strlen(linha);
    while (p > linha && (p[-1] == '\n' || p[-1] == '\r' || p[-1] == ' ' || p[-1] == '\t')) {
        *--p = '\0';
    }
    while (*linha == ' ' || *linha == '\t') linha++;
    return linha;
}

static bool eh_epsilon(const char *token) {
    return strcmp(token, "&") == 0 || strcmp(token, "ε") == 0;
}

/* Lê uma linha "origem simbolo... -> destino..." da seção de transições. */
static bool ler_transicao(Automato *a, char *linha, int num_linha, char *erro) {
    char *t[MAX_TOKENS];
    int n = dividir(linha, t, MAX_TOKENS);

    int seta = -1;
    for (int i = 0; i < n; i++) {
        if (strcmp(t[i], "->") == 0) {
            seta = i;
            break;
        }
    }
    if (seta < 0) {
        snprintf(erro, TAM_ERRO, "linha %d: transição sem '->' (formato: origem símbolo -> destinos)", num_linha);
        return false;
    }
    if (seta < 2) {
        snprintf(erro, TAM_ERRO, "linha %d: faltou o estado de origem ou o símbolo antes de '->'", num_linha);
        return false;
    }
    if (seta == n - 1) {
        snprintf(erro, TAM_ERRO, "linha %d: faltou o estado de destino depois de '->'", num_linha);
        return false;
    }

    int origem = automato_indice_estado(a, t[0]);
    if (origem < 0) {
        snprintf(erro, TAM_ERRO, "linha %d: estado de origem '%s' não foi declarado em 'estados'", num_linha, t[0]);
        return false;
    }

    for (int i = 1; i < seta; i++) {
        int simbolo;
        if (eh_epsilon(t[i])) {
            simbolo = EPSILON;
        } else if (strlen(t[i]) == 1 && automato_indice_simbolo(a, t[i][0]) >= 0) {
            simbolo = automato_indice_simbolo(a, t[i][0]);
        } else {
            snprintf(erro, TAM_ERRO, "linha %d: símbolo '%s' não pertence ao alfabeto", num_linha, t[i]);
            return false;
        }

        for (int j = seta + 1; j < n; j++) {
            int destino = automato_indice_estado(a, t[j]);
            if (destino < 0) {
                snprintf(erro, TAM_ERRO, "linha %d: estado de destino '%s' não foi declarado em 'estados'", num_linha, t[j]);
                return false;
            }
            automato_adicionar_transicao(a, origem, simbolo, destino);
        }
    }
    return true;
}

/* Lê uma linha "chave: valores" do cabeçalho. */
static bool ler_secao(Automato *a, const char *chave, char *valores, int num_linha,
                      bool *visto_alfabeto, bool *visto_estados, bool *visto_finais, char *erro) {
    char *t[MAX_TOKENS];
    int n = dividir(valores, t, MAX_TOKENS);

    if (strcmp(chave, "alfabeto") == 0) {
        if (*visto_alfabeto) {
            snprintf(erro, TAM_ERRO, "linha %d: 'alfabeto' aparece mais de uma vez", num_linha);
            return false;
        }
        *visto_alfabeto = true;
        for (int i = 0; i < n; i++) {
            char msg[TAM_ERRO];
            if (!automato_adicionar_simbolo(a, t[i], msg)) {
                snprintf(erro, TAM_ERRO, "linha %d: %.200s", num_linha, msg);
                return false;
            }
        }
        return true;
    }

    if (strcmp(chave, "estados") == 0) {
        if (*visto_estados) {
            snprintf(erro, TAM_ERRO, "linha %d: 'estados' aparece mais de uma vez", num_linha);
            return false;
        }
        *visto_estados = true;
        for (int i = 0; i < n; i++) {
            char msg[TAM_ERRO];
            if (!automato_adicionar_estado(a, t[i], msg)) {
                snprintf(erro, TAM_ERRO, "linha %d: %.200s", num_linha, msg);
                return false;
            }
        }
        return true;
    }

    /* inicial e finais referenciam estados, que precisam ter sido declarados antes. */
    if (strcmp(chave, "inicial") == 0 || strcmp(chave, "finais") == 0) {
        if (!*visto_estados) {
            snprintf(erro, TAM_ERRO, "linha %d: declare 'estados' antes de '%s'", num_linha, chave);
            return false;
        }
        if (strcmp(chave, "inicial") == 0) {
            if (a->inicial >= 0) {
                snprintf(erro, TAM_ERRO, "linha %d: 'inicial' aparece mais de uma vez", num_linha);
                return false;
            }
            if (n != 1) {
                snprintf(erro, TAM_ERRO, "linha %d: informe exatamente um estado inicial", num_linha);
                return false;
            }
            a->inicial = automato_indice_estado(a, t[0]);
            if (a->inicial < 0) {
                snprintf(erro, TAM_ERRO, "linha %d: estado inicial '%s' não foi declarado em 'estados'", num_linha, t[0]);
                return false;
            }
            return true;
        }
        if (*visto_finais) {
            snprintf(erro, TAM_ERRO, "linha %d: 'finais' aparece mais de uma vez", num_linha);
            return false;
        }
        *visto_finais = true;
        for (int i = 0; i < n; i++) {
            int e = automato_indice_estado(a, t[i]);
            if (e < 0) {
                snprintf(erro, TAM_ERRO, "linha %d: estado final '%s' não foi declarado em 'estados'", num_linha, t[i]);
                return false;
            }
            a->final[e] = true;
        }
        return true;
    }

    snprintf(erro, TAM_ERRO, "linha %d: seção '%s' desconhecida (use alfabeto, estados, inicial, finais ou transicoes)",
             num_linha, chave);
    return false;
}

bool arquivo_carregar(const char *caminho, Automato *a, char *erro) {
    FILE *f = fopen(caminho, "r");
    if (f == NULL) {
        snprintf(erro, TAM_ERRO, "não foi possível abrir o arquivo '%s'", caminho);
        return false;
    }

    char buffer[TAM_LINHA];
    int num_linha = 0;
    bool em_transicoes = false;
    bool visto_alfabeto = false, visto_estados = false, visto_finais = false;
    bool ok = true;

    while (ok && fgets(buffer, sizeof(buffer), f) != NULL) {
        num_linha++;
        char *linha = limpar_linha(buffer);
        if (*linha == '\0') continue;

        if (em_transicoes) {
            ok = ler_transicao(a, linha, num_linha, erro);
            continue;
        }

        char *dois_pontos = strchr(linha, ':');
        if (dois_pontos == NULL) {
            snprintf(erro, TAM_ERRO, "linha %d: esperado 'chave: valores' (ex.: 'estados: q0 q1')", num_linha);
            ok = false;
            break;
        }
        *dois_pontos = '\0';
        char *chave = limpar_linha(linha);
        char *valores = dois_pontos + 1;

        if (strcmp(chave, "transicoes") == 0 || strcmp(chave, "transições") == 0) {
            if (!visto_alfabeto || !visto_estados) {
                snprintf(erro, TAM_ERRO, "linha %d: declare 'alfabeto' e 'estados' antes de 'transicoes'", num_linha);
                ok = false;
                break;
            }
            em_transicoes = true;
            /* Permite também transição na mesma linha: "transicoes: q0 a -> q1". */
            char *resto = limpar_linha(valores);
            if (*resto != '\0') ok = ler_transicao(a, resto, num_linha, erro);
            continue;
        }

        ok = ler_secao(a, chave, valores, num_linha, &visto_alfabeto, &visto_estados, &visto_finais, erro);
    }
    fclose(f);

    if (!ok) return false;
    if (!visto_alfabeto) {
        snprintf(erro, TAM_ERRO, "o arquivo não tem a linha 'alfabeto:'");
        return false;
    }
    if (!visto_estados) {
        snprintf(erro, TAM_ERRO, "o arquivo não tem a linha 'estados:'");
        return false;
    }
    return automato_validar(a, erro);
}

/* Escreve os símbolos de um conjunto de transições que levam ao mesmo destino
 * numa linha só, para o arquivo ficar curto (ex.: "q1 0 1 2 3 -> q1"). */
bool arquivo_salvar(const char *caminho, const Automato *a, char *erro) {
    FILE *f = fopen(caminho, "w");
    if (f == NULL) {
        snprintf(erro, TAM_ERRO, "não foi possível criar o arquivo '%s'", caminho);
        return false;
    }

    fprintf(f, "# Autômato finito não determinístico (AFND / AFND-ε)\n");
    fprintf(f, "alfabeto:");
    for (int s = 0; s < a->num_simbolos; s++) fprintf(f, " %c", a->simbolos[s]);
    fprintf(f, "\nestados:");
    for (int e = 0; e < a->num_estados; e++) fprintf(f, " %s", a->nomes[e]);
    fprintf(f, "\ninicial: %s\nfinais:", a->nomes[a->inicial]);
    for (int e = 0; e < a->num_estados; e++) {
        if (a->final[e]) fprintf(f, " %s", a->nomes[e]);
    }
    fprintf(f, "\ntransicoes:\n");

    for (int origem = 0; origem < a->num_estados; origem++) {
        bool escrito[MAX_SIMBOLOS + 1] = {false};
        /* Percorre os símbolos do alfabeto e, por último, o ε. */
        for (int i = 0; i <= a->num_simbolos; i++) {
            int s = (i == a->num_simbolos) ? EPSILON : i;
            const Conjunto *destinos = &a->delta[origem][s];
            if (escrito[s] || conjunto_vazio(destinos)) continue;

            fprintf(f, "%s", a->nomes[origem]);
            for (int j = i; j <= a->num_simbolos; j++) {
                int s2 = (j == a->num_simbolos) ? EPSILON : j;
                if (!escrito[s2] && conjunto_iguais(destinos, &a->delta[origem][s2])) {
                    escrito[s2] = true;
                    if (s2 == EPSILON) fprintf(f, " &");
                    else fprintf(f, " %c", a->simbolos[s2]);
                }
            }
            fprintf(f, " ->");
            for (int d = 0; d < a->num_estados; d++) {
                if (destinos->tem[d]) fprintf(f, " %s", a->nomes[d]);
            }
            fprintf(f, "\n");
        }
    }

    bool ok = (fclose(f) == 0);
    if (!ok) snprintf(erro, TAM_ERRO, "erro ao gravar o arquivo '%s'", caminho);
    return ok;
}
