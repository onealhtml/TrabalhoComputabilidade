cmake_minimum_required(VERSION 3.10)
project(TrabalhoComputabilidade C)

# C11 é suficiente (stdbool) e compila em qualquer GCC/Clang/MSVC recente.
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

add_executable(TrabalhoComputabilidade
        src/main.c
        src/automato.c
        src/arquivo.c
        src/simulador.c
        src/json.c)

if (MSVC)
    target_compile_options(TrabalhoComputabilidade PRIVATE /W4 /utf-8)
else ()
    target_compile_options(TrabalhoComputabilidade PRIVATE -Wall -Wextra)
endif ()

# Testes automáticos (ctest): rodam os exemplos e conferem ACEITA/REJEITADA.
enable_testing()
find_package(Python3 COMPONENTS Interpreter)
if (Python3_FOUND)
    add_test(NAME exemplos
            COMMAND ${Python3_EXECUTABLE} ${CMAKE_SOURCE_DIR}/testes/testar.py $<TARGET_FILE:TrabalhoComputabilidade>)
endif ()
