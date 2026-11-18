// Tela de execução passo a passo (issue #9).
//
// O servidor devolve, de uma vez, todo o trace calculado pelo C (passos e
// árvore). Os botões só escolhem qual passo mostrar: nada é recalculado aqui.

let trace = null;          // JSON devolvido por /api/simular
let passoAtual = 0;
let cyExecucao = null;
let cyArvore = null;

function ultimoPasso() {
    return trace ? trace.passos.length - 1 : 0;
}

function tags(estados, finais) {
    if (estados.length === 0) return '<span class="estado-tag nenhum">nenhum (∅)</span>';
    return estados.map(e => `<span class="estado-tag ${finais.includes(e) ? "final" : ""}"
        title="${finais.includes(e) ? "estado final" : ""}">${escaparHtml(e)}</span>`).join("");
}

function simboloHtml(s) {
    return `<code>${escaparHtml(s)}</code>`;
}

function renderizarSituacao() {
    const p = trace.passos[passoAtual];
    const finais = trace.automato.finais;
    const n = trace.sentenca.length;
    const fim = passoAtual === ultimoPasso();

    let fita = "";
    if (n === 0) fita = '<span class="vazia">ε (sentença vazia)</span>';
    [...trace.sentenca].forEach((c, i) => {
        const classe = i < passoAtual ? "lido" : i === passoAtual ? "atual" : "";
        fita += `<span class="${classe}">${escaparHtml(c)}</span>`;
    });

    let html = `<div class="contador">Passo ${passoAtual} de ${n} · consumido: <b>${escaparHtml(p.consumido) || "ε"}</b>
                · restante: <b>${escaparHtml(p.restante) || "ε"}</b></div>
                <div class="fita">${fita}</div>`;

    if (passoAtual === 0) {
        html += `<div class="estados-linha"><b>Início:</b> estado inicial ${simboloHtml(trace.automato.inicial)}</div>`;
    } else {
        html += `<div class="estados-linha"><b>Símbolo lido:</b> ${simboloHtml(p.simbolo)}</div>
                 <div class="estados-linha"><b>Alcançados lendo ${simboloHtml(p.simbolo)}:</b>
                     ${tags(p.estados_antes_fecho, finais)}</div>`;
    }
    html += `<div class="estados-linha"><b>Estados atuais (após fecho-ε):</b> ${tags(p.estados, finais)}</div>`;

    if (!fim) {
        const proximo = trace.passos[passoAtual + 1];
        html += `<div class="estados-linha"><b>Possíveis lendo ${simboloHtml(proximo.simbolo)}:</b>
                 ${tags(proximo.estados, finais)}</div>`;
    }

    const ganhos = p.estados.filter(e => !p.estados_antes_fecho.includes(e));
    if (ganhos.length > 0) {
        html += `<p class="explicacao">As transições ε acrescentaram ${ganhos.map(simboloHtml).join(", ")} sem consumir entrada.</p>`;
    }

    if (fim) {
        const aceita = trace.resultado === "ACEITA";
        let motivo;
        if (aceita) {
            const finaisAtivos = p.estados.filter(e => finais.includes(e));
            motivo = `a entrada foi toda lida e ${finaisAtivos.map(simboloHtml).join(", ")} é estado final`;
        } else if (p.estados.length === 0) {
            motivo = `nenhum caminho consegue ler ${simboloHtml(p.simbolo)} na posição ${passoAtual}: todos morreram`;
        } else {
            motivo = "a entrada foi toda lida, mas nenhum estado atual é final";
        }
        html += `<div class="resultado ${aceita ? "aceita" : "rejeitada"}">${trace.resultado}<small>${motivo}</small></div>`;
    }
    $("situacao").innerHTML = html;
}

function atualizar() {
    if (!trace) return;
    renderizarSituacao();
    destacarPasso(cyExecucao, trace.passos[passoAtual], trace.automato.finais);
    // Ao terminar (inclusive quando todos os caminhos morrem antes do fim), a árvore aparece inteira.
    mostrarArvoreAte(cyArvore, trace.arvore, passoAtual === ultimoPasso() ? Infinity : passoAtual);

    $("btn-reiniciar").disabled = $("btn-anterior").disabled = passoAtual === 0;
    $("btn-proximo").disabled = $("btn-tudo").disabled = passoAtual === ultimoPasso();
}

function irPara(k) {
    if (!trace) return;
    passoAtual = Math.max(0, Math.min(k, ultimoPasso()));
    atualizar();
}

function limparExecucao(mensagem) {
    trace = null;
    ["btn-reiniciar", "btn-anterior", "btn-proximo", "btn-tudo"].forEach(id => $(id).disabled = true);
    $("situacao").innerHTML = `<p class="vazio">${mensagem}</p>`;
    $("aviso-arvore").hidden = true;
    if (cyArvore) {
        cyArvore.destroy();
        cyArvore = null;
    }
    if (cyExecucao) destacarPasso(cyExecucao, null, []);
}

async function carregarSentenca() {
    $("erro-execucao").hidden = true;
    const sentenca = $("campo-sentenca").value;
    const r = await api("/api/simular", {texto: gerarTextoAfn(), sentenca});
    if (!r.ok) {
        $("erro-execucao").hidden = false;
        $("erro-execucao").textContent = r.erro.includes("alfabeto") || r.erro.includes("sentença")
            ? "Sentença inválida: " + r.erro
            : "O autômato da especificação tem um problema: " + r.erro;
        limparExecucao("Corrija o erro acima e carregue a sentença de novo.");
        return;
    }
    trace = r;
    cyExecucao = desenharAutomato($("grafo-execucao"), r.automato, cyExecucao);
    cyArvore = desenharArvore($("grafo-arvore"), r.arvore, cyArvore);
    $("aviso-arvore").hidden = !r.arvore.truncada;
    $("aviso-arvore").className = "aviso info";
    $("aviso-arvore").textContent = `A árvore tem caminhos demais: foram desenhados só os primeiros
        ${r.arvore.nos.length} nós. O resultado (calculado por conjuntos de estados) continua correto.`;
    irPara(0);
}

// Sentenças de teste dos exemplos, como botões.
function definirSugestoes(aceitas, rejeitadas) {
    const chip = (s, classe) => `<button class="chip ${classe}" data-sentenca="${escaparHtml(s)}">${escaparHtml(s) || "ε"}</button>`;
    $("sugestoes").innerHTML = aceitas.length + rejeitadas.length === 0 ? "" :
        "Testar: " + aceitas.map(s => chip(s, "aceita")).join("") + rejeitadas.map(s => chip(s, "rejeita")).join("");
    $("sugestoes").querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
        $("campo-sentenca").value = b.dataset.sentenca;
        carregarSentenca();
    }));
}

$("btn-executar").addEventListener("click", carregarSentenca);
$("campo-sentenca").addEventListener("keydown", e => {
    if (e.key === "Enter") carregarSentenca();
});
$("btn-reiniciar").addEventListener("click", () => irPara(0));
$("btn-anterior").addEventListener("click", () => irPara(passoAtual - 1));
$("btn-proximo").addEventListener("click", () => irPara(passoAtual + 1));
$("btn-tudo").addEventListener("click", () => irPara(ultimoPasso()));

document.addEventListener("keydown", e => {
    const naExecucao = $("tela-execucao").classList.contains("ativa");
    if (!naExecucao || !trace || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") irPara(passoAtual + 1);
    if (e.key === "ArrowLeft") irPara(passoAtual - 1);
    if (e.key === "Home") irPara(0);
    if (e.key === "End") irPara(ultimoPasso());
});

window.addEventListener("automato-mudou", () => {
    if (trace) limparExecucao("O autômato foi alterado. Carregue a sentença de novo.");
});

window.addEventListener("tela-mudou", () => {
    for (const cy of [cyExecucao, cyArvore]) if (cy) cy.resize();
    if (trace) atualizar();
    else if (automatoValido && $("tela-execucao").classList.contains("ativa")) {
        cyExecucao = desenharAutomato($("grafo-execucao"), automatoValido, cyExecucao);
    }
});

// ------------------------------------------------------------ início
// Parâmetros opcionais na URL, úteis na apresentação e para tirar prints:
//   ?exemplo=termina_abb&sentenca=ababb&passo=3&tela=execucao

async function iniciar() {
    limparExecucao("Digite uma sentença e clique em <b>Carregar sentença</b>.");
    const exemplos = await api("/api/exemplos");
    if (Array.isArray(exemplos)) {
        $("sel-exemplo").innerHTML += exemplos.map(n => `<option value="${escaparHtml(n)}">${escaparHtml(n)}</option>`).join("");
    }

    const params = new URLSearchParams(location.search);
    await abrirExemplo(params.get("exemplo") || "termina_abb");
    await validarNoServidor();

    if (params.get("tela") === "execucao" || params.has("sentenca")) {
        mostrarTela("execucao");
        if (params.has("sentenca")) {
            $("campo-sentenca").value = params.get("sentenca");
            await carregarSentenca();
            if (params.has("passo")) irPara(params.get("passo") === "fim" ? ultimoPasso() : Number(params.get("passo")));
        }
    }
}

iniciar();
