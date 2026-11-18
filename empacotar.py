"""
Monta o zip da entrega (issue #16): código-fonte, README, exemplos, testes,
documentação e o relatório em PDF.

Uso:  python empacotar.py
Gera dist/TrabalhoComputabilidade.zip com os arquivos do repositório
(os versionados e os novos ainda não commitados, respeitando o .gitignore).
"""
import subprocess
import sys
import unicodedata
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
NOME = "TrabalhoComputabilidade"
FORA_DO_ZIP = (".claude/", "CLAUDE.md", "relatorio/Esboço")


def arquivos_do_projeto():
    saida = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=RAIZ, capture_output=True, check=True,
    ).stdout.decode("utf-8")
    nomes = sorted(n for n in saida.split("\0") if n)
    return [n for n in nomes if not n.startswith(FORA_DO_ZIP) and (RAIZ / n).is_file()]


def sem_acentos(nome):
    """Nomes ASCII no zip, para não embaralhar em descompactadores antigos."""
    return unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode("ascii")


def main():
    arquivos = arquivos_do_projeto()
    if "relatorio/Relatório.pdf" not in arquivos:
        sys.exit("Falta o relatorio/Relatório.pdf: exporte o relatório antes de empacotar.")

    destino = RAIZ / "dist" / f"{NOME}.zip"
    destino.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        for nome in arquivos:
            z.write(RAIZ / nome, f"{NOME}/{sem_acentos(nome)}")
    print(f"{destino} criado com {len(arquivos)} arquivos.")


if __name__ == "__main__":
    main()
