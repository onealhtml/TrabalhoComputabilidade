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

document.querySelectorAll(".aba").forEach(b => b.addEventListener("click", () => mostrarTela(b.dataset.tela)));
