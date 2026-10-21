---
name: rodar
description: Compila o núcleo em C com CMake e executa o simulador (e a interface Python, quando existir). Usar quando pedirem para compilar, rodar ou testar o simulador.
---

1. Compilar o núcleo:
   ```sh
   cmake -S . -B cmake-build-debug && cmake --build cmake-build-debug
   ```
   Se falhar, mostrar o erro do compilador e corrigir antes de seguir.
2. Rodar o executável `./cmake-build-debug/TrabalhoComputabilidade`. Quando a CLI
   existir (issue #6), passar um arquivo de `exemplos/` e uma sentença, e conferir se a
   saída é um JSON válido (`python3 -m json.tool`).
3. Se a interface Python já existir, executá-la a partir da raiz do projeto.
4. Informar o resultado (ACEITA/REJEITADA ou o erro) de forma resumida.
