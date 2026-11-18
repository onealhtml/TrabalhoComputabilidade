/*
 * automato.c - criação, consulta e validação do autômato (issue #2).
 */
#include "automato.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

Automato *automato_criar(void) {
    /* calloc zera tudo: nenhum símbolo, nenhum estado, nenhuma transição. */
    Automato *a = calloc(1, sizeof(Automato));
    if (a != NULL) {
        a->inicial = -1;
    }
    return a;
}

void automato_liberar(Automato *a) {
    free(a);
}

int automato_indice_estado(const Automato *a, const char *nome) {
    for (int e = 0; e < a->num_estados; e++) {
        if (strcmp(a->nomes[e], nome) == 0) {
            return e;
        }
    }
    return -1;
}

int automato_indice_simbolo(const Automato *a, char c) {
    for (int s = 0; s < a->num_simbolos; s++) {
        if (a->simbolos[s] == c) {
            return s;
        }
    }
    return -1;
}

/* Um símbolo é um único caractere visível. '&' é reservado para ε e '#'
 * inicia comentários no arquivo, por isso não podem ser símbolos. */
bool automato_adicionar_simbolo(Automato *a, const char *token, char *erro) {
    if (strlen(token) != 1) {
        snprintf(erro, TAM_ERRO, "símbolo '%s' inválido: cada símbolo deve ter um único caractere", token);
        return false;
    }
    char c = token[0];
    if (c < 33 || c > 126 || c == '&' || c == '#') {
        snprintf(erro, TAM_ERRO, "símbolo '%c' não permitido ('&' representa ε e '#' inicia comentário)", c);
        return false;
    }
    if (automato_indice_simbolo(a, c) >= 0) {
        snprintf(erro, TAM_ERRO, "símbolo '%c' repetido no alfabeto", c);
        return false;
    }
    if (a->num_simbolos >= MAX_SIMBOLOS) {
        snprintf(erro, TAM_ERRO, "alfabeto com mais de %d símbolos", MAX_SIMBOLOS);
        return false;
    }
    a->simbolos[a->num_simbolos++] = c;
    return true;
}

/* Nomes de estados usam letras, dígitos e '_' (ex.: q0, inicio, q_10). */
bool automato_adicionar_estado(Automato *a, const char *nome, char *erro) {
    size_t tam = strlen(nome);
    if (tam == 0 || tam >= MAX_NOME) {
        snprintf(erro, TAM_ERRO, "nome de estado '%s' deve ter de 1 a %d caracteres", nome, MAX_NOME - 1);
        return false;
    }
    for (size_t i = 0; i < tam; i++) {
        char c = nome[i];
        bool valido = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
        if (!valido) {
            snprintf(erro, TAM_ERRO, "nome de estado '%s' inválido: use apenas letras, dígitos e '_'", nome);
            return false;
        }
    }
    if (automato_indice_estado(a, nome) >= 0) {
        snprintf(erro, TAM_ERRO, "estado '%s' repetido", nome);
        return false;
    }
    if (a->num_estados >= MAX_ESTADOS) {
        snprintf(erro, TAM_ERRO, "autômato com mais de %d estados", MAX_ESTADOS);
        return false;
    }
    strcpy(a->nomes[a->num_estados++], nome);
    return true;
}

void automato_adicionar_transicao(Automato *a, int origem, int simbolo, int destino) {
    a->delta[origem][simbolo].tem[destino] = true;
}

bool automato_validar(const Automato *a, char *erro) {
    if (a->num_estados == 0) {
        snprintf(erro, TAM_ERRO, "o autômato precisa de pelo menos um estado");
        return false;
    }
    if (a->inicial < 0 || a->inicial >= a->num_estados) {
        snprintf(erro, TAM_ERRO, "estado inicial não definido");
        return false;
    }
    return true;
}

bool automato_validar_sentenca(const Automato *a, const char *sentenca, char *erro) {
    for (int i = 0; sentenca[i] != '\0'; i++) {
        if (automato_indice_simbolo(a, sentenca[i]) < 0) {
            unsigned char c = (unsigned char) sentenca[i];
            if (c >= 33 && c <= 126) {
                snprintf(erro, TAM_ERRO, "o símbolo '%c' (posição %d da sentença) não pertence ao alfabeto", c, i + 1);
            } else {
                snprintf(erro, TAM_ERRO, "a posição %d da sentença tem um caractere que não pertence ao alfabeto", i + 1);
            }
            return false;
        }
    }
    return true;
}

void conjunto_limpar(Conjunto *c) {
    memset(c->tem, 0, sizeof(c->tem));
}

bool conjunto_vazio(const Conjunto *c) {
    for (int e = 0; e < MAX_ESTADOS; e++) {
        if (c->tem[e]) {
            return false;
        }
    }
    return true;
}

bool conjunto_iguais(const Conjunto *a, const Conjunto *b) {
    return memcmp(a->tem, b->tem, sizeof(a->tem)) == 0;
}
