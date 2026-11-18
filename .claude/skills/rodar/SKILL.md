---
name: rodar
description: Compila o núcleo em C com CMake, roda os testes e sobe a interface web (Flask). Usar quando pedirem para compilar, rodar ou testar o simulador.
---

1. Compilar o núcleo:
   ```sh
   cmake -S . -B cmake-build-debug && cmake --build cmake-build-debug
   ```
   Se falhar, mostrar o erro do compilador e corrigir antes de seguir. Sem CMake:
   `gcc -std=c11 -O2 -o build/TrabalhoComputabilidade src/*.c`.
2. Rodar os testes: `python testes/testar.py` (ou `ctest --test-dir cmake-build-debug`).
3. Para testar uma sentença pela linha de comando:
   `./cmake-build-debug/TrabalhoComputabilidade simular exemplos/termina_abb.afn ababb`
   (a saída é JSON; conferir com `python -m json.tool`).
4. Interface: `python -m pip install -r requirements.txt` e `python servidor/app.py`;
   abrir http://127.0.0.1:5000.
5. Informar o resultado (ACEITA/REJEITADA, testes ou o erro) de forma resumida.
