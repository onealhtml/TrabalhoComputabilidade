"""
Testes automáticos do núcleo em C.

Uso:  python testes/testar.py [caminho do executável]
(também roda com `ctest --test-dir cmake-build-debug`)

Para cada arquivo .afn de exemplos/ e testes/, lê as linhas de comentário
"# aceita: ..." e "# rejeita: ..." (ε = sentença vazia) e confere o resultado
do executável. Também confere:
  - a árvore de caminhos concorda com o resultado (tem nó "aceito" se e só se ACEITA);
  - salvar e abrir de novo produz o mesmo autômato;
  - arquivos malformados geram mensagem de erro.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
falhas = 0


def executavel_padrao():
    for pasta in ("cmake-build-debug", "cmake-build-release", "build"):
        for nome in ("TrabalhoComputabilidade.exe", "TrabalhoComputabilidade"):
            caminho = RAIZ / pasta / nome
            if caminho.exists():
                return caminho
    sys.exit("Executável não encontrado. Compile antes com o CMake.")


def rodar(*argumentos):
    r = subprocess.run([str(EXE), *map(str, argumentos)], capture_output=True, encoding="utf-8")
    return json.loads(r.stdout)


def conferir(condicao, mensagem):
    global falhas
    if not condicao:
        falhas += 1
        print("  FALHOU:", mensagem)


def sentencas(arquivo, chave):
    for linha in arquivo.read_text(encoding="utf-8").splitlines():
        if linha.startswith(f"# {chave}:"):
            return ["" if s == "ε" else s for s in linha.split(":", 1)[1].split()]
    return []


def testar_arquivo(arquivo):
    print(arquivo.relative_to(RAIZ))
    for esperado, chave in (("ACEITA", "aceita"), ("REJEITADA", "rejeita")):
        for s in sentencas(arquivo, chave):
            r = rodar("simular", arquivo, s)
            conferir(r.get("ok"), f"'{s}': erro {r.get('erro')}")
            if not r.get("ok"):
                continue
            conferir(r["resultado"] == esperado, f"'{s}': esperado {esperado}, veio {r['resultado']}")
            if not r["arvore"]["truncada"]:
                tem_aceito = any(n["status"] == "aceito" for n in r["arvore"]["nos"])
                conferir(tem_aceito == (esperado == "ACEITA"), f"'{s}': árvore discorda do resultado")

    # Salvar e reabrir deve dar o mesmo autômato.
    with tempfile.TemporaryDirectory() as pasta:
        copia = Path(pasta) / "copia.afn"
        conferir(rodar("salvar", arquivo, copia).get("ok"), "salvar falhou")
        conferir(rodar("info", arquivo) == rodar("info", copia), "salvar/abrir mudou o autômato")


ARQUIVOS_INVALIDOS = {
    "sem estados": "alfabeto: a\ninicial: q0\n",
    "estado não declarado": "alfabeto: a\nestados: q0\ninicial: q0\ntransicoes:\nq0 a -> q9\n",
    "símbolo fora do alfabeto": "alfabeto: a\nestados: q0\ninicial: q0\ntransicoes:\nq0 b -> q0\n",
    "sem seta": "alfabeto: a\nestados: q0\ninicial: q0\ntransicoes:\nq0 a q0\n",
    "símbolo com 2 caracteres": "alfabeto: ab\nestados: q0\ninicial: q0\n",
    "sem inicial": "alfabeto: a\nestados: q0\n",
    "estado repetido": "alfabeto: a\nestados: q0 q0\ninicial: q0\n",
}


def testar_erros():
    print("arquivos inválidos")
    with tempfile.TemporaryDirectory() as pasta:
        for nome, conteudo in ARQUIVOS_INVALIDOS.items():
            arquivo = Path(pasta) / "invalido.afn"
            arquivo.write_text(conteudo, encoding="utf-8")
            r = rodar("info", arquivo)
            conferir(not r["ok"] and r["erro"], f"{nome}: deveria dar erro")
        r = rodar("simular", RAIZ / "exemplos" / "termina_abb.afn", "abc")
        conferir(not r["ok"] and "alfabeto" in r["erro"], "sentença fora do alfabeto deveria dar erro")


if __name__ == "__main__":
    EXE = Path(sys.argv[1]) if len(sys.argv) > 1 else executavel_padrao()
    for arquivo in sorted((RAIZ / "exemplos").glob("*.afn")) + sorted((RAIZ / "testes").glob("*.afn")):
        testar_arquivo(arquivo)
    testar_erros()
    print("OK: todos os testes passaram" if falhas == 0 else f"{falhas} teste(s) falharam")
    sys.exit(1 if falhas else 0)
