// Desenho do autômato e da árvore de execução com Cytoscape.js (issues #7 e #8).
// Os dados vêm sempre do JSON produzido pelo núcleo em C.
//
// Visual de caderno (mesmas cores do estilo.css): traços em caneta azul,
// estados ativos e transições usadas com marca-texto amarelo, caminhos mortos
// em vermelho e o caminho aceito em verde.

cytoscape.use(cytoscapeDagre);

const CORES = {
    papel: "#ffffff", grafite: "#24262b", caneta: "#1c3d8c", marcaTexto: "#ffe45e",
    verde: "#1d7244", verdeClaro: "#e0f1e7", vermelho: "#b8222b", vermelhoClaro: "#fbe5e6",
    interno: "#9aa0aa", aresta: "#b4b9c3", cortado: "#9a7b1f",
};
const FONTE = "'STIX Two Text', Cambria, Georgia, serif";

// Junta símbolos consecutivos do alfabeto: [0,1,...,9] vira "0–9".
function rotuloSimbolos(simbolos, alfabeto) {
    const ordem = s => (s === EPSILON ? alfabeto.length : alfabeto.indexOf(s));
    const lista = [...simbolos].sort((a, b) => ordem(a) - ordem(b));
    const partes = [];
    for (let i = 0; i < lista.length;) {
        let j = i;
        while (j + 1 < lista.length && lista[j] !== EPSILON && ordem(lista[j + 1]) === ordem(lista[j]) + 1) j++;
        partes.push(j - i >= 2 ? `${lista[i]}–${lista[j]}` : lista.slice(i, j + 1).join(", "));
        i = j + 1;
    }
    return partes.join(", ");
}

// ---------------------------------------------------------------- autômato

const ESTILO_AUTOMATO = [
    {
        selector: "node.estado", style: {
            "label": "data(label)", "text-valign": "center", "text-halign": "center",
            "width": 48, "height": 48, "background-color": CORES.papel, "border-width": 2,
            "border-color": CORES.caneta, "font-family": FONTE, "font-style": "italic", "font-size": 19,
            "color": CORES.grafite,
            "transition-property": "background-color, border-color", "transition-duration": "0.15s",
        },
    },
    {selector: "node.final", style: {"border-style": "double", "border-width": 7}},
    {selector: "node.inicio", style: {"width": 1, "height": 1, "opacity": 0}},
    {selector: "node.ativo", style: {"background-color": CORES.marcaTexto}},
    {selector: "node.aceitando", style: {"background-color": CORES.verdeClaro, "border-color": CORES.verde}},
    {
        selector: "edge", style: {
            "curve-style": "bezier", "target-arrow-shape": "triangle", "width": 1.5,
            "line-color": CORES.caneta, "target-arrow-color": CORES.caneta, "arrow-scale": 1.05,
            "label": "data(label)", "font-family": FONTE, "font-size": 16, "color": CORES.grafite,
            "text-background-color": CORES.papel, "text-background-opacity": 1, "text-background-padding": 2,
            "loop-direction": "-45deg", "loop-sweep": "-60deg", "control-point-step-size": 50,
        },
    },
    {selector: "edge.inicial", style: {"width": 2}},
    // Transição usada no passo: um traço de marca-texto por baixo da linha.
    {
        selector: "edge.usada", style: {
            "width": 2.5, "z-index": 10, "font-weight": 600,
            "underlay-color": CORES.marcaTexto, "underlay-opacity": 1, "underlay-padding": 5,
            "text-background-color": CORES.marcaTexto,
        },
    },
];

// Cria (ou recria) o desenho do autômato dentro do elemento 'conteiner'.
function desenharAutomato(conteiner, automato, anterior) {
    if (anterior) anterior.destroy();
    const elementos = [{data: {id: "__inicio"}, classes: "inicio"}];

    for (const e of automato.estados) {
        const final = automato.finais.includes(e);
        elementos.push({data: {id: "e:" + e, label: nomeEstado(e)}, classes: "estado" + (final ? " final" : "")});
    }
    elementos.push({data: {id: "__seta", source: "__inicio", target: "e:" + automato.inicial, label: ""}, classes: "inicial"});

    // Uma aresta por par (origem, destino), com todos os símbolos no rótulo.
    const arestas = new Map();
    for (const t of automato.transicoes) {
        for (const destino of t.para) {
            const id = `${t.de}->${destino}`;
            if (!arestas.has(id)) arestas.set(id, {de: t.de, para: destino, simbolos: []});
            arestas.get(id).simbolos.push(t.simbolo);
        }
    }
    for (const [id, a] of arestas) {
        elementos.push({
            data: {id: "t:" + id, source: "e:" + a.de, target: "e:" + a.para, label: rotuloSimbolos(a.simbolos, automato.alfabeto)},
        });
    }

    const cy = cytoscape({
        container: conteiner, elements: elementos, style: ESTILO_AUTOMATO,
        layout: {name: "dagre", rankDir: "LR", nodeSep: 40, rankSep: 64, edgeSep: 20, padding: 24},
        wheelSensitivity: 0.3, minZoom: 0.2, maxZoom: 2.5,
    });
    enquadrar(cy);
    return cy;
}

// Enquadra o desenho no espaço disponível (ao desenhar, trocar de tela ou
// redimensionar a janela), sem ampliar demais autômatos pequenos.
function enquadrar(cy) {
    cy.resize();
    cy.fit(undefined, 24);
    if (cy.zoom() > 1.4) {
        cy.zoom(1.4);
        cy.center();
    }
}

// Destaca os estados ativos e as transições usadas num passo da execução.
function destacarPasso(cy, passo, finais) {
    cy.batch(() => {
        cy.elements().removeClass("ativo aceitando usada");
        if (!passo) return;
        for (const e of passo.estados) {
            cy.getElementById("e:" + e).addClass(finais.includes(e) && passo.restante === "" ? "aceitando" : "ativo");
        }
        for (const t of passo.transicoes) {
            cy.getElementById(`t:${t.de}->${t.para}`).addClass("usada");
        }
    });
}

// ---------------------------------------------------------------- árvore

const ESTILO_ARVORE = [
    {
        selector: "node", style: {
            "label": "data(label)", "text-valign": "center", "text-halign": "center",
            "width": 40, "height": 40, "font-family": FONTE, "font-style": "italic", "font-size": 16,
            "color": CORES.grafite, "background-color": CORES.papel, "border-width": 1.5, "border-color": CORES.interno,
        },
    },
    {selector: "node.ativo", style: {"background-color": CORES.marcaTexto, "border-color": CORES.caneta, "border-width": 2}},
    {
        selector: "node.aceito", style: {
            "background-color": CORES.verdeClaro, "border-color": CORES.verde, "border-width": 6, "border-style": "double",
        },
    },
    {selector: "node.morto", style: {"background-color": CORES.vermelhoClaro, "border-color": CORES.vermelho, "border-width": 2, "color": CORES.vermelho}},
    {selector: "node.cortado", style: {"border-color": CORES.cortado, "border-style": "dashed"}},
    {
        selector: "edge", style: {
            "curve-style": "bezier", "target-arrow-shape": "triangle", "width": 1.2, "arrow-scale": .9,
            "line-color": CORES.aresta, "target-arrow-color": CORES.aresta,
            "label": "data(label)", "font-family": FONTE, "font-size": 15, "color": CORES.caneta,
            "text-background-color": CORES.papel, "text-background-opacity": 1, "text-background-padding": 1,
        },
    },
    {selector: "edge.epsilon", style: {"line-style": "dashed"}},
    {selector: ".escondido", style: {"display": "none"}},
];

// Desenha a árvore inteira uma vez (posições fixas); os passos só mostram/escondem nós.
function desenharArvore(conteiner, arvore, anterior) {
    if (anterior) anterior.destroy();
    const elementos = [];
    for (const n of arvore.nos) {
        elementos.push({data: {id: "n" + n.id, label: nomeEstado(n.estado)}});
        if (n.pai >= 0) {
            elementos.push({
                data: {id: "a" + n.id, source: "n" + n.pai, target: "n" + n.id, label: n.simbolo},
                classes: n.simbolo === EPSILON ? "epsilon" : "",
            });
        }
    }
    return cytoscape({
        container: conteiner, elements: elementos, style: ESTILO_ARVORE,
        layout: {name: "dagre", rankDir: "TB", nodeSep: 18, rankSep: 34, padding: 20},
        wheelSensitivity: 0.3, minZoom: 0.05, maxZoom: 2,
    });
}

// Mostra só os nós até o passo k. Um nó "interno" cujos filhos ainda não
// apareceram é a ponta de um caminho que continua: aparece como "ativo".
function mostrarArvoreAte(cy, arvore, k) {
    const visivel = n => n.passo <= k;
    const temFilhoVisivel = new Set(arvore.nos.filter(n => n.pai >= 0 && visivel(n)).map(n => n.pai));

    cy.batch(() => {
        for (const n of arvore.nos) {
            const no = cy.getElementById("n" + n.id);
            no.removeClass("ativo aceito morto cortado escondido");
            if (!visivel(n)) {
                no.addClass("escondido");
                continue;
            }
            if (n.status === "interno") {
                if (!temFilhoVisivel.has(n.id)) no.addClass("ativo");
            } else no.addClass(n.status);
        }
    });
    const nos = cy.nodes().not(".escondido");
    cy.fit(nos, 25);
    if (cy.zoom() > 1.3) {
        cy.zoom(1.3);
        cy.center(nos);
    }
}
