/*
 * json.h - saída em JSON para o servidor Python (issue #6).
 * O schema está documentado em docs/formato.md.
 */
#ifndef JSON_H
#define JSON_H

#include <stdio.h>

#include "automato.h"
#include "simulador.h"

void json_erro(FILE *f, const char *mensagem);
void json_ok(FILE *f);
void json_info(FILE *f, const Automato *a);
void json_execucao(FILE *f, const Automato *a, const Execucao *ex);

#endif
