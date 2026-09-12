let todasOcorrencias = [];


// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        atualizarRelogio();

        setInterval(
            atualizarRelogio,
            1000
        );

        definirDataAtual();

        carregarDashboard();

    }
);


// ======================================================
// RELÓGIO
// ======================================================

function atualizarRelogio() {

    const agora = new Date();

    document.getElementById("hora").textContent =
        agora.toLocaleTimeString(
            "pt-PT"
        );

    document.getElementById("data").textContent =
        agora.toLocaleDateString(
            "pt-PT",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );
}


// ======================================================
// DATA ATUAL
// ======================================================

function definirDataAtual() {

    const agora = new Date();

    const local =
        new Date(
            agora.getTime()
            - agora.getTimezoneOffset() * 60000
        )
        .toISOString()
        .slice(0, 16);

    document.getElementById(
        "dataHora"
    ).value = local;
}


// ======================================================
// NAVEGAÇÃO
// ======================================================

function mostrarPagina(pagina) {

    document
        .querySelectorAll(".page")
        .forEach(
            page =>
                page.classList.remove("active")
        );


    const elemento =
        document.getElementById(
            `pagina-${pagina}`
        );


    if (elemento) {

        elemento.classList.add("active");
    }


    document
        .querySelectorAll(".nav-button")
        .forEach(
            button =>
                button.classList.remove("active")
        );


    const nomes = {

        dashboard:
            "Dashboard Operacional",

        nova:
            "Nova ocorrência",

        ocorrencias:
            "Ocorrências",

        meios:
            "Meios disponíveis",

        mapa:
            "Mapa operacional"
    };


    const index = {

        dashboard: 0,
        nova: 1,
        ocorrencias: 2,
        meios: 3,
        mapa: 4

    }[pagina];


    const botoes =
        document.querySelectorAll(
            ".nav-button"
        );


    if (botoes[index]) {

        botoes[index]
            .classList.add("active");
    }


    document.getElementById(
        "tituloPagina"
    ).textContent =
        nomes[pagina] || "";


    document.getElementById(
        "paginaNome"
    ).textContent =
        pagina.toUpperCase();


    if (pagina === "ocorrencias") {

        carregarOcorrencias();
    }
}


// ======================================================
// DASHBOARD
// ======================================================

async function carregarDashboard() {

    try {

        const resposta =
            await fetch(
                "/api/dashboard"
            );


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            throw new Error(
                "Erro ao carregar dashboard."
            );
        }


        const s =
            dados.estatisticas;


        document.getElementById(
            "statTotal"
        ).textContent = s.total;


        document.getElementById(
            "statAbertas"
        ).textContent = s.abertas;


        document.getElementById(
            "statDespacho"
        ).textContent = s.despacho;


        document.getElementById(
            "statCurso"
        ).textContent = s.emCurso;


        document.getElementById(
            "statCriticas"
        ).textContent = s.criticas;


        renderDashboardOcorrencias(
            dados.ocorrencias
        );


    } catch (erro) {

        console.error(erro);

        mostrarToast(
            "Erro",
            "Não foi possível carregar o dashboard."
        );
    }
}


// ======================================================
// DASHBOARD OCORRÊNCIAS
// ======================================================

function renderDashboardOcorrencias(
    ocorrencias
) {

    const container =
        document.getElementById(
            "dashboardOcorrencias"
        );


    if (!ocorrencias.length) {

        container.innerHTML = `
            <div class="empty">
                Não existem ocorrências registadas.
            </div>
        `;

        return;
    }


    container.innerHTML =
        ocorrencias
            .slice(0, 8)
            .map(
                criarLinhaOcorrencia
            )
            .join("");
}


// ======================================================
// LINHA OCORRÊNCIA
// ======================================================

function criarLinhaOcorrencia(
    ocorrencia
) {

    const classeEstado =
        obterClasseEstado(
            ocorrencia.estado
        );


    return `

        <div
            class="occurrence"
            onclick="abrirOcorrencia('${ocorrencia.numeroOcorrencia}')"
        >

            <div>

                <div class="occurrence-number">
                    ${escapeHTML(
                        ocorrencia.numeroOcorrencia
                    )}
                </div>

            </div>


            <div>

                <div class="occurrence-location">

                    📍
                    ${escapeHTML(
                        ocorrencia.local
                    )}

                </div>

                <div class="occurrence-type">

                    ${escapeHTML(
                        ocorrencia.tipoOcorrencia
                    )}

                </div>

            </div>


            <div>

                <span class="badge ${classeEstado}">
                    ${escapeHTML(
                        ocorrencia.estado
                    )}
                </span>

            </div>


            <div>

                <span>
                    ${escapeHTML(
                        ocorrencia.prioridade
                    )}
                </span>

            </div>


            <div>

                <button
                    class="ghost-button"
                    onclick="event.stopPropagation(); alterarEstadoRapido('${ocorrencia.numeroOcorrencia}')"
                >
                    Estado
                </button>

            </div>

        </div>
    `;
}


// ======================================================
// CARREGAR TODAS
// ======================================================

async function carregarOcorrencias() {

    try {

        const resposta =
            await fetch(
                "/api/ocorrencias"
            );


        const dados =
            await resposta.json();


        todasOcorrencias =
            dados.ocorrencias || [];


        renderTabelaOcorrencias(
            todasOcorrencias
        );


    } catch (erro) {

        console.error(erro);

        mostrarToast(
            "Erro",
            "Não foi possível carregar as ocorrências."
        );
    }
}


// ======================================================
// RENDER TABELA
// ======================================================

function renderTabelaOcorrencias(
    ocorrencias
) {

    const container =
        document.getElementById(
            "tabelaOcorrencias"
        );


    if (!ocorrencias.length) {

        container.innerHTML = `
            <div class="empty">
                Nenhuma ocorrência encontrada.
            </div>
        `;

        return;
    }


    container.innerHTML =
        ocorrencias
            .map(
                criarLinhaOcorrencia
            )
            .join("");
}


// ======================================================
// FILTROS
// ======================================================

function filtrarOcorrencias() {

    const texto =
        document
            .getElementById("pesquisa")
            .value
            .toLowerCase();


    const estado =
        document
            .getElementById("filtroEstado")
            .value;


    const filtradas =
        todasOcorrencias.filter(
            o => {

                const correspondeTexto =

                    String(
                        o.numeroOcorrencia
                    )
                    .toLowerCase()
                    .includes(texto)

                    ||

                    String(
                        o.local
                    )
                    .toLowerCase()
                    .includes(texto)

                    ||

                    String(
                        o.tipoOcorrencia
                    )
                    .toLowerCase()
                    .includes(texto);


                const correspondeEstado =
                    !estado ||
                    o.estado === estado;


                return (
                    correspondeTexto &&
                    correspondeEstado
                );
            }
        );


    renderTabelaOcorrencias(
        filtradas
    );
}


// ======================================================
// CRIAR OCORRÊNCIA
// ======================================================

async function criarOcorrencia(event) {

    event.preventDefault();


    const botao =
        document.getElementById(
            "btnEnviar"
        );


    botao.disabled = true;

    botao.textContent =
        "⏳ A REGISTAR...";


    try {

        const meios =
            Array.from(
                document.querySelectorAll(
                    ".vehicle-grid input:checked"
                )
            )
            .map(
                input =>
                    input.value
            );


        const dados = {

            dataHora:
                document.getElementById(
                    "dataHora"
                ).value,

            local:
                document.getElementById(
                    "local"
                ).value,

            prioridade:
                document.getElementById(
                    "prioridade"
                ).value,

            cos:
                document.getElementById(
                    "cos"
                ).value,

            contacto:
                document.getElementById(
                    "contacto"
                ).value,

            familia:
                document.getElementById(
                    "familia"
                ).value,

            especie:
                document.getElementById(
                    "especie"
                ).value,

            tipoOcorrencia:
                document.getElementById(
                    "tipoOcorrencia"
                ).value,

            codigoOcorrencia:
                document.getElementById(
                    "codigoOcorrencia"
                ).value,

            descricao:
                document.getElementById(
                    "descricao"
                ).value,

            vitimas:
                document.getElementById(
                    "vitimas"
                ).value,

            veiculos:
                document.getElementById(
                    "veiculos"
                ).value,

            desencarceramento:
                document.getElementById(
                    "desencarceramento"
                ).checked,

            materiasPerigosas:
                document.getElementById(
                    "materiasPerigosas"
                ).checked,

            riscoIncendio:
                document.getElementById(
                    "riscoIncendio"
                ).checked,

            apoioMedico:
                document.getElementById(
                    "apoioMedico"
                ).checked,

            autoridade:
                document.getElementById(
                    "autoridade"
                ).checked,

            meios,

            inem:
                document.getElementById(
                    "inem"
                ).value,

            autoridadeExterna:
                document.getElementById(
                    "autoridadeExterna"
                ).value,

            outrosMeios:
                document.getElementById(
                    "outrosMeios"
                ).value,

            observacoes:
                document.getElementById(
                    "observacoes"
                ).value

        };


        const resposta =
            await fetch(
                "/api/ocorrencias",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(dados)
                }
            );


        const resultado =
            await resposta.json();


        if (!resultado.sucesso) {

            throw new Error(
                resultado.erro
            );
        }


        mostrarToast(
            "Ocorrência criada",
            `${resultado.numero} registada com sucesso.`
        );


        if (
            resultado.discord &&
            resultado.discord.enviado
        ) {

            mostrarToast(
                "Discord",
                "Ocorrência enviada para o Discord."
            );
        }


        document.getElementById(
            "numero"
        ).value =
            resultado.numero;


        setTimeout(
            () => {

                limparFormulario();

                mostrarPagina(
                    "ocorrencias"
                );

            },
            1200
        );


    } catch (erro) {

        console.error(erro);

        mostrarToast(
            "Erro",
            erro.message
        );


    } finally {

        botao.disabled = false;

        botao.textContent =
            "🚨 ACIONAR MEIOS";
    }
}


// ======================================================
// ALTERAR ESTADO
// ======================================================

async function alterarEstadoRapido(
    numero
) {

    const estados = [

        "Aberta",

        "Em despacho",

        "Em curso",

        "Controlada",

        "Encerrada"

    ];


    const novo =
        prompt(
            `Estado para ${numero}:\n\n` +
            estados.join("\n")
        );


    if (!novo) return;


    if (!estados.includes(novo)) {

        mostrarToast(
            "Erro",
            "Estado inválido."
        );

        return;
    }


    try {

        const resposta =
            await fetch(
                `/api/ocorrencias/${encodeURIComponent(numero)}/estado`,
                {

                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            estado: novo
                        })
                }
            );


        const resultado =
            await resposta.json();


        if (!resultado.sucesso) {

            throw new Error(
                resultado.erro
            );
        }


        mostrarToast(
            "Estado atualizado",
            `${numero} → ${novo}`
        );


        carregarDashboard();

        carregarOcorrencias();


    } catch (erro) {

        mostrarToast(
            "Erro",
            erro.message
        );
    }
}


// ======================================================
// ABRIR OCORRÊNCIA
// ======================================================

async function abrirOcorrencia(
    numero
) {

    try {

        const resposta =
            await fetch(
                `/api/ocorrencias/${encodeURIComponent(numero)}`
            );


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            throw new Error(
                dados.erro
            );
        }


        const o =
            dados.ocorrencia;


        alert(

            `${o.numeroOcorrencia}\n\n` +

            `📍 ${o.local}\n` +

            `🚨 Prioridade: ${o.prioridade}\n` +

            `📋 ${o.tipoOcorrencia}\n` +

            `📊 Estado: ${o.estado}\n\n` +

            `👨‍🚒 COS: ${o.cos || "N/A"}\n` +

            `👥 Vítimas: ${o.vitimas}\n` +

            `🚗 Veículos: ${o.veiculos}\n\n` +

            `${o.observacoes || ""}`

        );


    } catch (erro) {

        mostrarToast(
            "Erro",
            erro.message
        );
    }
}


// ======================================================
// LIMPAR FORMULÁRIO
// ======================================================

function limparFormulario() {

    document
        .getElementById(
            "formOcorrencia"
        )
        .reset();


    document.getElementById(
        "numero"
    ).value =
        "AUTOMÁTICO";


    definirDataAtual();
}


// ======================================================
// TOAST
// ======================================================

function mostrarToast(
    titulo,
    mensagem
) {

    const toast =
        document.getElementById(
            "toast"
        );


    document.getElementById(
        "toastTitulo"
    ).textContent =
        titulo;


    document.getElementById(
        "toastMensagem"
    ).textContent =
        mensagem;


    toast.classList.add("show");


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3500
    );
}


// ======================================================
// ESTADOS
// ======================================================

function obterClasseEstado(
    estado
) {

    switch (estado) {

        case "Aberta":
            return "badge-aberta";

        case "Em despacho":
            return "badge-despacho";

        case "Em curso":
            return "badge-curso";

        case "Controlada":
            return "badge-controlada";

        case "Encerrada":
            return "badge-encerrada";

        default:
            return "badge-encerrada";
    }
}


// ======================================================
// SEGURANÇA HTML
// ======================================================

function escapeHTML(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}