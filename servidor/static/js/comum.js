// Funções usadas pelas duas telas.

const EPSILON = "ε";

// Chama uma rota do servidor e devolve o JSON. Erros de rede viram {ok:false, erro}.
async function api(rota, dados) {
    const opcoes = dados === undefined ? {} : {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dados),
    };
    try {
        const resposta = await fetch(rota, opcoes);
        return await resposta.json();
    } catch (e) {
        return {ok: false, erro: "Não foi possível falar com o servidor. Ele está rodando?"};
    }
}

// Separa um texto em palavras (pelo separador dado), sem repetições.
function palavras(texto, separador) {
    return [...new Set(texto.split(separador).filter(p => p !== ""))];
}

function mostrarTela(nome) {
    document.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.tela === nome));
    document.querySelectorAll(".tela").forEach(t => t.classList.toggle("ativa", t.id === "tela-" + nome));
    // O Cytoscape precisa recalcular o tamanho quando o contêiner fica visível.
    window.dispatchEvent(new Event("tela-mudou"));
}

function escaparHtml(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
}

// Nome do estado como nos livros: "q0" vira "q₀" e "q_12" vira "q₁₂". Só muda
// a exibição nos desenhos e na execução; o arquivo e os campos usam o nome digitado.
const INDICES = "₀₁₂₃₄₅₆₇₈₉";
function nomeEstado(nome) {
    const m = /^([A-Za-z]+)_?(\d+)$/.exec(nome);
    return m ? m[1] + [...m[2]].map(d => INDICES[d]).join("") : nome;
}

// O Cytoscape desenha num canvas, que não espera a fonte carregar: carregamos
// antes do primeiro desenho para os rótulos não saírem com a fonte padrão.
const fontesCarregadas = Promise.all([
    "17px 'STIX Two Text'", "italic 17px 'STIX Two Text'", "600 17px 'STIX Two Text'",
].map(f => document.fonts.load(f))).catch(() => {});

document.querySelectorAll(".aba").forEach(b => b.addEventListener("click", () => mostrarTela(b.dataset.tela)));

// Ao redimensionar a janela, os desenhos são reenquadrados como numa troca de tela.
let temporizadorJanela = null;
window.addEventListener("resize", () => {
    clearTimeout(temporizadorJanela);
    temporizadorJanela = setTimeout(() => window.dispatchEvent(new Event("tela-mudou")), 150);
});
