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

// Um estado no texto, como nos livros (q₀); estados finais ganham o círculo duplo.
function estadoHtml(e, finais) {
    const final = finais.includes(e);
    return `<span class="estado${final ? " final" : ""}"${final ? ' title="estado final"' : ""}>${escaparHtml(nomeEstado(e))}</span>`;
}

// Conjunto de estados em notação matemática: {q₀, q₁}, ou ∅ se vazio.
function conjuntoHtml(estados, finais) {
    if (estados.length === 0) return '<span class="conjunto vazio-conj" title="nenhum estado">∅</span>';
    return `<span class="conjunto">{${estados.map(e => estadoHtml(e, finais)).join(", ")}}</span>`;
}

function simboloHtml(s) {
    return `<code>${escaparHtml(s)}</code>`;
}

// A fita: símbolos já lidos esmaecidos, a cabeça (▼) sobre o próximo símbolo e
// uma célula em branco no fim, onde a cabeça para quando tudo foi lido.
function renderizarFita(p) {
    const n = trace.sentenca.length;
    let celulas = "";
    [...trace.sentenca].forEach((c, i) => {
        const classe = i < passoAtual ? "lido" : i === passoAtual ? "atual" : "";
        celulas += `<span class="celula ${classe}">${escaparHtml(c)}</span>`;
    });
    celulas += `<span class="celula fim${passoAtual === n ? " atual" : ""}" title="fim da entrada"></span>`;

    $("fita").innerHTML = `<p class="fita-info"><span>Passo ${passoAtual} de ${n}</span>
        <span>lido: <b>${escaparHtml(p.consumido) || "ε"}</b></span>
        <span>falta ler: <b>${escaparHtml(p.restante) || "ε"}</b></span></p>
        <div class="celulas" aria-label="Fita de entrada">${celulas}</div>`;
    $("fita").querySelector(".celula.atual")?.scrollIntoView({block: "nearest", inline: "center"});
}

function renderizarSituacao() {
    const p = trace.passos[passoAtual];
    const finais = trace.automato.finais;
    const fim = passoAtual === ultimoPasso();
    renderizarFita(p);

    const linha = (rotulo, valor) => `<dt>${rotulo}</dt><dd>${valor}</dd>`;
    let html = '<dl class="passo">';
    if (passoAtual === 0) {
        html += linha("Início", `<span class="conjunto">${estadoHtml(trace.automato.inicial, finais)}</span>`);
    } else {
        html += linha("Símbolo lido", simboloHtml(p.simbolo));
        html += linha(`Alcançados lendo ${simboloHtml(p.simbolo)}`, conjuntoHtml(p.estados_antes_fecho, finais));
    }
    html += linha("Estados atuais, após o fecho-ε", conjuntoHtml(p.estados, finais));
    if (!fim) {
        const proximo = trace.passos[passoAtual + 1];
        html += linha(`Possíveis lendo ${simboloHtml(proximo.simbolo)}`, conjuntoHtml(proximo.estados, finais));
    }
    html += "</dl>";

    const ganhos = p.estados.filter(e => !p.estados_antes_fecho.includes(e));
    if (ganhos.length > 0) {
        const lista = ganhos.map(e => `<span class="conjunto">${estadoHtml(e, finais)}</span>`).join(", ");
        html += `<p class="explicacao">As transições ε acrescentaram ${lista} sem consumir entrada.</p>`;
    }

    if (fim) {
        const aceita = trace.resultado === "ACEITA";
        let motivo;
        if (aceita) {
            const finaisAtivos = p.estados.filter(e => finais.includes(e))
                .map(e => `<span class="conjunto">${estadoHtml(e, finais)}</span>`);
            motivo = `A entrada foi toda lida e ${finaisAtivos.join(", ")} é estado final.`;
        } else if (p.estados.length === 0) {
            motivo = `Nenhum caminho consegue ler ${simboloHtml(p.simbolo)} na posição ${passoAtual}: todos morreram.`;
        } else {
            motivo = "A entrada foi toda lida, mas nenhum estado atual é final.";
        }
        html += `<div class="resultado ${aceita ? "aceita" : "rejeitada"}"><span class="palavra">${trace.resultado}</span>
                 <small>${motivo}</small></div>`;
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
    $("fita").innerHTML = "";
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
    const grupo = (titulo, lista, classe) => lista.length === 0 ? "" :
        `<span class="grupo-sug"><span class="titulo-sug">${titulo}</span>${lista.map(s => chip(s, classe)).join("")}</span>`;
    $("sugestoes").innerHTML = grupo("Deveriam ser aceitas:", aceitas, "aceita") +
        grupo("Deveriam ser rejeitadas:", rejeitadas, "rejeita");
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
    if (cyExecucao) enquadrar(cyExecucao);
    if (cyArvore) cyArvore.resize();
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
    await fontesCarregadas;
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
