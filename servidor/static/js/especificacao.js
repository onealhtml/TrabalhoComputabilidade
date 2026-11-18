// Tela de especificação do autômato (issue #10).
//
// O formulário mantém o autômato no objeto 'modelo'. A cada alteração, o
// modelo é convertido no texto do arquivo .afn e enviado ao servidor, que pede
// ao núcleo em C para validá-lo; o desenho usa o autômato devolvido pelo C.

const modelo = {
    alfabeto: [],
    estados: [],
    inicial: "",
    finais: [],
    delta: {},   // delta[estado][símbolo ou "ε"] = [destinos]
};

let modoTransicoes = "tabela";
let linhasLista = [];          // usado no modo lista: [{de, simbolo, para}]
let cyEspecificacao = null;
let automatoValido = null;     // último autômato aceito pelo C
let temporizadorValidacao = null;

const $ = id => document.getElementById(id);

// ------------------------------------------------------------ modelo <-> texto

function destinos(estado, simbolo) {
    return (modelo.delta[estado] && modelo.delta[estado][simbolo]) || [];
}

function definirDestinos(estado, simbolo, lista) {
    if (!modelo.delta[estado]) modelo.delta[estado] = {};
    modelo.delta[estado][simbolo] = lista;
}

// Gera o texto no formato do arquivo .afn (documentado em docs/formato.md).
function gerarTextoAfn() {
    const linhas = [
        "alfabeto: " + modelo.alfabeto.join(" "),
        "estados: " + modelo.estados.join(" "),
    ];
    if (modelo.inicial) linhas.push("inicial: " + modelo.inicial);
    linhas.push("finais: " + modelo.finais.join(" "));
    linhas.push("transicoes:");
    for (const e of modelo.estados) {
        for (const s of [...modelo.alfabeto, EPSILON]) {
            const d = destinos(e, s);
            if (d.length > 0) linhas.push(`${e} ${s === EPSILON ? "&" : s} -> ${d.join(" ")}`);
        }
    }
    return linhas.join("\n") + "\n";
}

// Preenche o modelo a partir do autômato em JSON devolvido pelo C.
function carregarAutomato(automato) {
    modelo.alfabeto = [...automato.alfabeto];
    modelo.estados = [...automato.estados];
    modelo.inicial = automato.inicial;
    modelo.finais = [...automato.finais];
    modelo.delta = {};
    for (const t of automato.transicoes) definirDestinos(t.de, t.simbolo, [...t.para]);
    linhasLista = linhasDoModelo();
    renderizarFormulario();
    aoMudarAutomato();
}

// Remove transições de estados/símbolos que não existem mais.
function limparDelta() {
    const simbolos = [...modelo.alfabeto, EPSILON];
    for (const e of Object.keys(modelo.delta)) {
        if (!modelo.estados.includes(e)) {
            delete modelo.delta[e];
            continue;
        }
        for (const s of Object.keys(modelo.delta[e])) {
            if (!simbolos.includes(s)) delete modelo.delta[e][s];
        }
    }
}

// ------------------------------------------------------------ formulário

function renderizarFormulario() {
    $("campo-alfabeto").value = modelo.alfabeto.join(" ");
    $("campo-estados").value = modelo.estados.join(" ");
    renderizarInicialEFinais();
    renderizarTransicoes();
}

function renderizarInicialEFinais() {
    if (!modelo.estados.includes(modelo.inicial)) modelo.inicial = modelo.estados[0] || "";
    modelo.finais = modelo.finais.filter(f => modelo.estados.includes(f));

    $("campo-inicial").innerHTML = modelo.estados
        .map(e => `<option ${e === modelo.inicial ? "selected" : ""}>${escaparHtml(e)}</option>`).join("");

    $("campo-finais").innerHTML = modelo.estados.length === 0
        ? '<small class="dica">Defina os estados primeiro.</small>'
        : modelo.estados.map(e => `<label><input type="checkbox" value="${escaparHtml(e)}"
              ${modelo.finais.includes(e) ? "checked" : ""}> ${escaparHtml(e)}</label>`).join("");
    $("campo-finais").querySelectorAll("input").forEach(c => c.addEventListener("change", () => {
        modelo.finais = [...$("campo-finais").querySelectorAll("input:checked")].map(i => i.value);
        aoMudarAutomato();
    }));
}

function renderizarTransicoes() {
    $("modo-tabela").classList.toggle("ativo", modoTransicoes === "tabela");
    $("modo-lista").classList.toggle("ativo", modoTransicoes === "lista");
    $("editor-tabela").hidden = modoTransicoes !== "tabela";
    $("editor-lista").hidden = modoTransicoes !== "lista";
    if (modoTransicoes === "tabela") renderizarTabela();
    else renderizarLista();
}

// Modo tabela: uma linha por estado, uma coluna por símbolo (+ ε).
function renderizarTabela() {
    if (modelo.estados.length === 0) {
        $("editor-tabela").innerHTML = '<p class="dica">Defina o alfabeto e os estados para montar a tabela.</p>';
        return;
    }
    const simbolos = [...modelo.alfabeto, EPSILON];
    let html = '<table class="delta"><thead><tr><th>δ</th>';
    for (const s of simbolos) html += `<th>${escaparHtml(s)}</th>`;
    html += "</tr></thead><tbody>";
    for (const e of modelo.estados) {
        const marca = (e === modelo.inicial ? "→ " : "") + (modelo.finais.includes(e) ? "* " : "");
        html += `<tr><th class="estado">${marca}${escaparHtml(e)}</th>`;
        simbolos.forEach((s, i) => {
            html += `<td><input data-estado="${escaparHtml(e)}" data-simbolo="${i}"
                     value="${escaparHtml(destinos(e, s).join(" "))}" aria-label="δ(${escaparHtml(e)}, ${escaparHtml(s)})"></td>`;
        });
        html += "</tr>";
    }
    $("editor-tabela").innerHTML = html + "</tbody></table>";
    $("editor-tabela").querySelectorAll("input").forEach(campo => campo.addEventListener("input", () => {
        definirDestinos(campo.dataset.estado, simbolos[campo.dataset.simbolo], palavras(campo.value, /[\s,]+/));
        aoMudarAutomato();
    }));
}

// Modo lista: uma linha por (origem, símbolo) -> destinos.
function linhasDoModelo() {
    const linhas = [];
    for (const e of modelo.estados) {
        for (const s of [...modelo.alfabeto, EPSILON]) {
            const d = destinos(e, s);
            if (d.length > 0) linhas.push({de: e, simbolo: s, para: d.join(" ")});
        }
    }
    return linhas;
}

function modeloDaLista() {
    modelo.delta = {};
    for (const l of linhasLista) {
        const novos = palavras(l.para, /[\s,]+/);
        definirDestinos(l.de, l.simbolo, [...new Set([...destinos(l.de, l.simbolo), ...novos])]);
    }
    limparDelta();
    aoMudarAutomato();
}

function renderizarLista() {
    const opcoes = (lista, atual) => lista
        .map(v => `<option ${v === atual ? "selected" : ""}>${escaparHtml(v)}</option>`).join("");
    const simbolos = [...modelo.alfabeto, EPSILON];
    linhasLista = linhasLista.filter(l => modelo.estados.includes(l.de) && simbolos.includes(l.simbolo));

    let html = '<div class="lista-transicoes">';
    linhasLista.forEach((l, i) => {
        html += `<div class="item-transicao" data-i="${i}">
            δ( <select data-campo="de">${opcoes(modelo.estados, l.de)}</select> ,
            <select data-campo="simbolo">${opcoes(simbolos, l.simbolo)}</select> )
            <span class="seta">→</span>
            <input data-campo="para" value="${escaparHtml(l.para)}" placeholder="destinos">
            <button data-remover title="Remover transição">✕</button></div>`;
    });
    html += '</div><p><button id="btn-nova-transicao">+ Adicionar transição</button></p>';
    $("editor-lista").innerHTML = html;

    $("editor-lista").querySelectorAll(".item-transicao").forEach(item => {
        const linha = linhasLista[item.dataset.i];
        item.querySelectorAll("[data-campo]").forEach(campo => campo.addEventListener("input", () => {
            linha[campo.dataset.campo] = campo.value;
            modeloDaLista();
        }));
        item.querySelector("[data-remover]").addEventListener("click", () => {
            linhasLista.splice(item.dataset.i, 1);
            modeloDaLista();
            renderizarLista();
        });
    });
    $("btn-nova-transicao").addEventListener("click", () => {
        if (modelo.estados.length === 0) return;
        linhasLista.push({de: modelo.estados[0], simbolo: simbolos[0], para: ""});
        renderizarLista();
        $("editor-lista").querySelector(".item-transicao:last-child input").focus();
    });
}

// ------------------------------------------------------------ validação e desenho

function aoMudarAutomato() {
    $("previa-arquivo").textContent = gerarTextoAfn();
    clearTimeout(temporizadorValidacao);
    temporizadorValidacao = setTimeout(validarNoServidor, 250);
    window.dispatchEvent(new Event("automato-mudou"));
}

async function validarNoServidor() {
    const r = await api("/api/abrir", {texto: gerarTextoAfn()});
    const aviso = $("validacao");
    if (!r.ok) {
        automatoValido = null;
        aviso.className = "aviso erro";
        aviso.textContent = "Autômato inválido: " + r.erro;
        return;
    }
    automatoValido = r.automato;
    const a = r.automato;
    const temEpsilon = a.transicoes.some(t => t.simbolo === EPSILON);
    const naoDet = a.transicoes.some(t => t.para.length > 1) || temEpsilon;
    aviso.className = "aviso ok";
    const qtd = (n, palavra) => `${n} ${palavra}${n === 1 ? "" : "s"}`;
    const tipo = temEpsilon ? "AFND-ε" : naoDet ? "AFND" : "autômato determinístico";
    aviso.textContent = `Válido: ${tipo} com ${qtd(a.estados.length, "estado")} e ${qtd(a.alfabeto.length, "símbolo")}.`;
    cyEspecificacao = desenharAutomato($("grafo-especificacao"), a, cyEspecificacao);
}

// ------------------------------------------------------------ eventos

$("campo-alfabeto").addEventListener("input", () => {
    modelo.alfabeto = palavras($("campo-alfabeto").value, /\s+/);
    limparDelta();
    renderizarTransicoes();
    aoMudarAutomato();
});

$("campo-estados").addEventListener("input", () => {
    modelo.estados = palavras($("campo-estados").value, /[\s,]+/);
    limparDelta();
    renderizarInicialEFinais();
    renderizarTransicoes();
    aoMudarAutomato();
});

$("campo-inicial").addEventListener("change", () => {
    modelo.inicial = $("campo-inicial").value;
    renderizarTransicoes();
    aoMudarAutomato();
});

$("modo-tabela").addEventListener("click", () => {
    modoTransicoes = "tabela";
    renderizarTransicoes();
});
$("modo-lista").addEventListener("click", () => {
    modoTransicoes = "lista";
    linhasLista = linhasDoModelo();
    renderizarTransicoes();
});

$("btn-novo").addEventListener("click", () => {
    if (!confirm("Começar um autômato novo? As alterações não salvas serão perdidas.")) return;
    carregarAutomato({alfabeto: [], estados: ["q0"], inicial: "q0", finais: [], transicoes: []});
    $("nome-arquivo").value = "automato";
    $("sel-exemplo").value = "";
    definirSugestoes([], []);
    $("campo-alfabeto").focus();
});

// Abrir: o navegador lê o arquivo e o C valida e interpreta o conteúdo.
$("arquivo-abrir").addEventListener("change", async evento => {
    const arquivo = evento.target.files[0];
    evento.target.value = "";
    if (!arquivo) return;
    const r = await api("/api/abrir", {texto: await arquivo.text()});
    if (!r.ok) {
        alert(`Não foi possível abrir "${arquivo.name}":\n${r.erro}`);
        return;
    }
    carregarAutomato(r.automato);
    $("nome-arquivo").value = arquivo.name.replace(/\.[^.]*$/, "");
    $("sel-exemplo").value = "";
    definirSugestoes([], []);
});

// Salvar: o C grava o arquivo e o navegador faz o download do conteúdo.
$("btn-salvar").addEventListener("click", async () => {
    const r = await api("/api/salvar", {texto: gerarTextoAfn()});
    if (!r.ok) {
        alert("Não foi possível salvar:\n" + r.erro);
        return;
    }
    const nome = ($("nome-arquivo").value.trim() || "automato").replace(/[\\/:*?"<>|]/g, "_") + ".afn";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([r.texto], {type: "text/plain"}));
    link.download = nome;
    link.click();
    URL.revokeObjectURL(link.href);
});

async function abrirExemplo(nome) {
    const r = await api("/api/exemplos/" + encodeURIComponent(nome));
    if (!r.ok) {
        alert(r.erro);
        return false;
    }
    carregarAutomato(r.automato);
    $("nome-arquivo").value = nome;
    $("sel-exemplo").value = nome;
    definirSugestoes(r.aceitas, r.rejeitadas);
    return true;
}

$("sel-exemplo").addEventListener("change", () => {
    if ($("sel-exemplo").value) abrirExemplo($("sel-exemplo").value);
});

window.addEventListener("tela-mudou", () => {
    if (cyEspecificacao) enquadrar(cyEspecificacao);
});
