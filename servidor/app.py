"""
Servidor web do simulador (issue #17).

É só uma ponte: as páginas mandam o texto do autômato (formato .afn) e a
sentença; o servidor grava o texto num arquivo temporário, executa o núcleo
em C com subprocess e devolve o JSON que o C imprimiu. Nenhuma lógica do
autômato é feita aqui.

Rodar (a partir da raiz do projeto):
    python servidor/app.py
e abrir http://127.0.0.1:5000 no navegador.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

RAIZ = Path(__file__).resolve().parent.parent
PASTA_EXEMPLOS = RAIZ / "exemplos"
PASTAS_BUILD = ("cmake-build-debug", "cmake-build-release", "build")

app = Flask(__name__, static_folder="static", static_url_path="")


def encontrar_executavel():
    """Procura o executável do núcleo C (pode ser indicado na variável SIMULADOR_C)."""
    if os.environ.get("SIMULADOR_C"):
        return Path(os.environ["SIMULADOR_C"])
    for pasta in PASTAS_BUILD:
        for nome in ("TrabalhoComputabilidade.exe", "TrabalhoComputabilidade"):
            caminho = RAIZ / pasta / nome
            if caminho.exists():
                return caminho
    return None


def executar_c(*argumentos):
    """Roda o executável C e devolve o JSON que ele imprimiu, como dicionário."""
    exe = encontrar_executavel()
    if exe is None:
        return {"ok": False, "erro": "Núcleo em C não encontrado. Compile com o CMake antes de subir o servidor."}
    try:
        r = subprocess.run([str(exe), *argumentos], capture_output=True, encoding="utf-8", timeout=15)
    except subprocess.TimeoutExpired:
        return {"ok": False, "erro": "A simulação demorou demais e foi interrompida."}
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {"ok": False, "erro": f"Resposta inesperada do núcleo em C (código {r.returncode}): {r.stderr.strip()}"}


def com_arquivo_temporario(texto, funcao):
    """Grava o texto do autômato num arquivo temporário e chama funcao(caminho)."""
    with tempfile.TemporaryDirectory() as pasta:
        caminho = Path(pasta) / "automato.afn"
        caminho.write_text(texto, encoding="utf-8")
        return funcao(pasta, caminho)


def ler_corpo():
    dados = request.get_json(silent=True) or {}
    return str(dados.get("texto", "")), dados


def responder(resultado):
    return jsonify(resultado), (200 if resultado.get("ok") else 400)


@app.get("/")
def pagina_inicial():
    return send_from_directory(app.static_folder, "index.html")


@app.post("/api/abrir")
def abrir():
    """Valida o texto de um arquivo .afn e devolve o autômato em JSON (usado ao abrir um arquivo)."""
    texto, _ = ler_corpo()
    return responder(com_arquivo_temporario(texto, lambda pasta, arq: executar_c("info", arq)))


@app.post("/api/salvar")
def salvar():
    """O C lê o texto, valida e grava o arquivo; devolvemos o conteúdo gravado para download."""
    texto, _ = ler_corpo()

    def gravar(pasta, arq):
        saida = Path(pasta) / "salvo.afn"
        resultado = executar_c("salvar", arq, saida)
        if resultado.get("ok"):
            resultado["texto"] = saida.read_text(encoding="utf-8")
        return resultado

    return responder(com_arquivo_temporario(texto, gravar))


@app.post("/api/simular")
def simular():
    texto, dados = ler_corpo()
    sentenca = str(dados.get("sentenca", ""))
    return responder(com_arquivo_temporario(texto, lambda pasta, arq: executar_c("simular", arq, sentenca)))


def sentencas_de_teste(texto, chave):
    """Lê o comentário '# aceita: ...' ou '# rejeita: ...' dos exemplos (ε = sentença vazia)."""
    m = re.search(rf"^#\s*{chave}:(.*)$", texto, re.MULTILINE)
    if not m:
        return []
    return ["" if s == "ε" else s for s in m.group(1).split()]


@app.get("/api/exemplos")
def listar_exemplos():
    return jsonify(sorted(p.stem for p in PASTA_EXEMPLOS.glob("*.afn")))


@app.get("/api/exemplos/<nome>")
def abrir_exemplo(nome):
    caminho = PASTA_EXEMPLOS / f"{nome}.afn"
    if not re.fullmatch(r"[\w-]+", nome) or not caminho.exists():
        return jsonify({"ok": False, "erro": f"Exemplo '{nome}' não encontrado."}), 404
    texto = caminho.read_text(encoding="utf-8")
    resultado = com_arquivo_temporario(texto, lambda pasta, arq: executar_c("info", arq))
    resultado.update(
        nome=nome,
        texto=texto,
        aceitas=sentencas_de_teste(texto, "aceita"),
        rejeitadas=sentencas_de_teste(texto, "rejeita"),
    )
    return responder(resultado)


if __name__ == "__main__":
    if encontrar_executavel() is None:
        print("AVISO: núcleo em C não encontrado; compile com o CMake (veja o README).", file=sys.stderr)
    porta = int(os.environ.get("PORTA", "5000"))
    print(f"Simulador no ar: abra http://127.0.0.1:{porta} no navegador (Ctrl+C para parar)")
    app.run(host="127.0.0.1", port=porta, debug=False)
