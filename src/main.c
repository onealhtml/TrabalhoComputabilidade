/*
 * main.c - linha de comando do simulador (issue #6).
 *
 * Uso:
 *   TrabalhoComputabilidade info     <arquivo.afn>
 *   TrabalhoComputabilidade simular  <arquivo.afn> <sentenca>
 *   TrabalhoComputabilidade salvar   <entrada.afn> <saida.afn>
 *
 * A resposta sempre sai em JSON na saída padrão. Em caso de erro:
 *   {"ok":false,"erro":"mensagem"}  e o programa termina com código 1.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "arquivo.h"
#include "automato.h"
#include "json.h"
#include "simulador.h"

static int falhar(const char *mensagem) {
    json_erro(stdout, mensagem);
    return 1;
}

static void uso(void) {
    fprintf(stderr,
            "Uso:\n"
            "  TrabalhoComputabilidade info    <arquivo.afn>\n"
            "  TrabalhoComputabilidade simular <arquivo.afn> <sentenca>\n"
            "  TrabalhoComputabilidade salvar  <entrada.afn> <saida.afn>\n");
}

static int comando_simular(const Automato *a, const char *sentenca) {
    char erro[TAM_ERRO];
    if (strlen(sentenca) > MAX_SENTENCA) {
        snprintf(erro, TAM_ERRO, "a sentença tem mais de %d símbolos", MAX_SENTENCA);
        return falhar(erro);
    }
    if (!automato_validar_sentenca(a, sentenca, erro)) {
        return falhar(erro);
    }

    Execucao *ex = malloc(sizeof(Execucao));
    if (ex == NULL) return falhar("memória insuficiente");
    simular(a, sentenca, ex);
    json_execucao(stdout, a, ex);
    free(ex);
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 3) {
        uso();
        return falhar("argumentos insuficientes");
    }
    const char *comando = argv[1];

    Automato *a = automato_criar();
    if (a == NULL) return falhar("memória insuficiente");

    char erro[TAM_ERRO];
    int codigo;

    if (!arquivo_carregar(argv[2], a, erro)) {
        codigo = falhar(erro);
    } else if (strcmp(comando, "info") == 0) {
        json_info(stdout, a);
        codigo = 0;
    } else if (strcmp(comando, "simular") == 0 && argc == 4) {
        codigo = comando_simular(a, argv[3]);
    } else if (strcmp(comando, "salvar") == 0 && argc == 4) {
        if (arquivo_salvar(argv[3], a, erro)) {
            json_ok(stdout);
            codigo = 0;
        } else {
            codigo = falhar(erro);
        }
    } else {
        uso();
        codigo = falhar("comando inválido");
    }

    automato_liberar(a);
    return codigo;
}
