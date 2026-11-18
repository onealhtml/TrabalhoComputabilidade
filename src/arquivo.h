/*
 * arquivo.h - leitura e gravação do autômato em arquivo texto (issues #1 e #3).
 *
 * Formato (extensão .afn), uma informação por linha:
 *
 *     # comentário (tudo depois de '#' é ignorado)
 *     alfabeto: 0 1
 *     estados: q0 q1 q2
 *     inicial: q0
 *     finais: q2
 *     transicoes:
 *     q0 0 1 -> q0        (origem, um ou mais símbolos, "->", destinos)
 *     q0 1 -> q1          (o mesmo par pode aparecer de novo: os destinos se somam)
 *     q1 & -> q2          ('&' ou 'ε' representa a transição vazia)
 *
 * Os itens de cada linha são separados por espaços.
 */
#ifndef ARQUIVO_H
#define ARQUIVO_H

#include "automato.h"

/* Lê o arquivo para dentro de 'a' (que deve vir de automato_criar). */
bool arquivo_carregar(const char *caminho, Automato *a, char *erro);

/* Grava 'a' no arquivo, no mesmo formato aceito por arquivo_carregar. */
bool arquivo_salvar(const char *caminho, const Automato *a, char *erro);

#endif
