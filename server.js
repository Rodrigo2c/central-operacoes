const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "ocorrencias.json");

// ======================================================
// CONFIGURAÇÃO
// ======================================================

// NÃO coloques o webhook no index.html ou script.js.
// No Windows PowerShell podes definir:
// $env:DISCORD_WEBHOOK="O_TEU_WEBHOOK_NOVO"

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || "";


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));


// ======================================================
// PREPARAR BASE DE DADOS
// ======================================================

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify([], null, 2),
        "utf8"
    );
}


// ======================================================
// FUNÇÕES DE DADOS
// ======================================================

function lerOcorrencias() {

    try {

        const dados = fs.readFileSync(
            DATA_FILE,
            "utf8"
        );

        return JSON.parse(dados);

    } catch (erro) {

        console.error("Erro ao ler ocorrências:", erro);

        return [];
    }
}


function guardarOcorrencias(ocorrencias) {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(ocorrencias, null, 2),
        "utf8"
    );
}


// ======================================================
// GERAR NÚMERO
// ======================================================

function gerarNumeroOcorrencia() {

    const ocorrencias = lerOcorrencias();

    const ano = new Date().getFullYear();

    const doAno = ocorrencias.filter(o =>
        String(o.numeroOcorrencia || "")
            .startsWith(`OC-${ano}-`)
    );

    const numero = doAno.length + 1;

    return `OC-${ano}-${String(numero).padStart(4, "0")}`;
}


// ======================================================
// DISCORD
// ======================================================

async function enviarDiscord(ocorrencia) {

    if (!DISCORD_WEBHOOK) {

        console.log(
            "Discord não configurado. Ocorrência guardada localmente."
        );

        return {
            enviado: false,
            motivo: "Webhook não configurado"
        };
    }


    let cor = 3447003;

    switch (
        String(ocorrencia.prioridade || "")
            .toLowerCase()
    ) {

        case "baixa":
            cor = 5763719;
            break;

        case "média":
        case "media":
            cor = 16776960;
            break;

        case "alta":
            cor = 15105570;
            break;

        case "crítica":
        case "critica":
            cor = 15548997;
            break;
    }


    const meios = Array.isArray(ocorrencia.meios)
        ? ocorrencia.meios
            .map(m => `• ${m}`)
            .join("\n")
        : "Nenhum meio indicado.";


    const embed = {

        title: `🚨 ${ocorrencia.numeroOcorrencia}`,

        description:
            ocorrencia.descricao ||
            "Nova ocorrência registada na Central de Operações.",

        color: cor,

        fields: [

            {
                name: "📍 Local",
                value: ocorrencia.local || "Não indicado",
                inline: false
            },

            {
                name: "🚨 Prioridade",
                value: ocorrencia.prioridade || "Não definida",
                inline: true
            },

            {
                name: "📋 Classificação",
                value: ocorrencia.tipoOcorrencia || "Não definida",
                inline: true
            },

            {
                name: "🔢 Código",
                value: String(
                    ocorrencia.codigoOcorrencia || "N/A"
                ),
                inline: true
            },

            {
                name: "👨‍🚒 COS",
                value: ocorrencia.cos || "Não indicado",
                inline: true
            },

            {
                name: "📡 Contacto / Canal",
                value: ocorrencia.contacto || "Não indicado",
                inline: true
            },

            {
                name: "👥 Vítimas",
                value: String(
                    ocorrencia.vitimas ?? 0
                ),
                inline: true
            },

            {
                name: "🚗 Veículos envolvidos",
                value: String(
                    ocorrencia.veiculos ?? 0
                ),
                inline: true
            },

            {
                name: "🚒 Meios",
                value: meios || "Nenhum",
                inline: false
            }

        ],

        footer: {
            text: "CENTRAL DE OPERAÇÕES • Sistema Operacional"
        },

        timestamp: new Date().toISOString()
    };


    if (ocorrencia.observacoes) {

        embed.fields.push({

            name: "📝 Observações",

            value:
                String(ocorrencia.observacoes)
                    .substring(0, 1024),

            inline: false
        });
    }


    const resposta = await fetch(
        DISCORD_WEBHOOK,
        {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                username: "Central de Operações",

                embeds: [embed]

            })
        }
    );


    if (!resposta.ok) {

        throw new Error(
            `Discord devolveu HTTP ${resposta.status}`
        );
    }


    return {
        enviado: true,
        codigo: resposta.status
    };
}


// ======================================================
// VALIDAR OCORRÊNCIA
// ======================================================

function validarOcorrencia(dados) {

    if (!dados) {
        throw new Error("Dados inválidos.");
    }

    if (!dados.local) {
        throw new Error(
            "O local da ocorrência é obrigatório."
        );
    }

    if (!dados.tipoOcorrencia) {
        throw new Error(
            "A classificação da ocorrência é obrigatória."
        );
    }

}


// ======================================================
// DASHBOARD
// ======================================================

app.get("/api/dashboard", (req, res) => {

    const ocorrencias = lerOcorrencias();

    const stats = {

        total: ocorrencias.length,

        abertas: ocorrencias.filter(
            o => o.estado === "Aberta"
        ).length,

        despacho: ocorrencias.filter(
            o => o.estado === "Em despacho"
        ).length,

        emCurso: ocorrencias.filter(
            o => o.estado === "Em curso"
        ).length,

        controladas: ocorrencias.filter(
            o => o.estado === "Controlada"
        ).length,

        encerradas: ocorrencias.filter(
            o => o.estado === "Encerrada"
        ).length,

        criticas: ocorrencias.filter(
            o => o.prioridade === "Crítica"
        ).length,

        altas: ocorrencias.filter(
            o => o.prioridade === "Alta"
        ).length
    };


    res.json({
        sucesso: true,
        estatisticas: stats,
        ocorrencias: ocorrencias.slice(-50).reverse()
    });
});


// ======================================================
// LISTAR OCORRÊNCIAS
// ======================================================

app.get("/api/ocorrencias", (req, res) => {

    const ocorrencias = lerOcorrencias();

    res.json({
        sucesso: true,
        ocorrencias: ocorrencias.reverse()
    });
});


// ======================================================
// OBTER UMA OCORRÊNCIA
// ======================================================

app.get("/api/ocorrencias/:numero", (req, res) => {

    const ocorrencias = lerOcorrencias();

    const ocorrencia = ocorrencias.find(
        o =>
            String(o.numeroOcorrencia) ===
            String(req.params.numero)
    );


    if (!ocorrencia) {

        return res.status(404).json({

            sucesso: false,

            erro: "Ocorrência não encontrada."
        });
    }


    res.json({
        sucesso: true,
        ocorrencia
    });
});


// ======================================================
// CRIAR OCORRÊNCIA
// ======================================================

app.post("/api/ocorrencias", async (req, res) => {

    try {

        const dados = req.body;

        validarOcorrencia(dados);

        const ocorrencias = lerOcorrencias();

        const numero = gerarNumeroOcorrencia();


        const ocorrencia = {

            id: Date.now().toString(),

            numeroOcorrencia: numero,

            dataHora:
                dados.dataHora ||
                new Date().toISOString(),

            dataRegisto:
                new Date().toISOString(),

            local:
                dados.local || "",

            coordenadas:
                dados.coordenadas || null,

            prioridade:
                dados.prioridade || "Baixa",

            cos:
                dados.cos || "",

            contacto:
                dados.contacto || "",

            familia:
                dados.familia || "",

            especie:
                dados.especie || "",

            tipoOcorrencia:
                dados.tipoOcorrencia || "",

            codigoOcorrencia:
                dados.codigoOcorrencia || "",

            descricao:
                dados.descricao || "",

            vitimas:
                Number(dados.vitimas || 0),

            veiculos:
                Number(dados.veiculos || 0),

            desencarceramento:
                Boolean(dados.desencarceramento),

            materiasPerigosas:
                Boolean(dados.materiasPerigosas),

            riscoIncendio:
                Boolean(dados.riscoIncendio),

            apoioMedico:
                Boolean(dados.apoioMedico),

            autoridade:
                Boolean(dados.autoridade),

            meios:
                Array.isArray(dados.meios)
                    ? dados.meios
                    : [],

            inem:
                dados.inem || "Não acionado",

            autoridadeExterna:
                dados.autoridadeExterna || "Não acionada",

            outrosMeios:
                dados.outrosMeios || "",

            observacoes:
                dados.observacoes || "",

            estado: "Aberta"
        };


        ocorrencias.push(ocorrencia);

        guardarOcorrencias(ocorrencias);


        let discord = {
            enviado: false
        };


        try {

            discord = await enviarDiscord(
                ocorrencia
            );

        } catch (erroDiscord) {

            console.error(
                "Erro Discord:",
                erroDiscord
            );
        }


        res.json({

            sucesso: true,

            mensagem:
                "Ocorrência registada com sucesso.",

            numero:
                numero,

            ocorrencia,

            discord
        });


    } catch (erro) {

        console.error(erro);

        res.status(400).json({

            sucesso: false,

            erro:
                erro.message ||
                "Erro ao criar ocorrência."
        });
    }
});


// ======================================================
// ALTERAR ESTADO
// ======================================================

app.patch(
    "/api/ocorrencias/:numero/estado",
    (req, res) => {

        try {

            const novoEstado =
                req.body.estado;

            const estadosValidos = [

                "Aberta",

                "Em despacho",

                "Em curso",

                "Controlada",

                "Encerrada"

            ];


            if (!estadosValidos.includes(novoEstado)) {

                return res.status(400).json({

                    sucesso: false,

                    erro: "Estado inválido."
                });
            }


            const ocorrencias =
                lerOcorrencias();


            const ocorrencia =
                ocorrencias.find(
                    o =>
                        String(o.numeroOcorrencia) ===
                        String(req.params.numero)
                );


            if (!ocorrencia) {

                return res.status(404).json({

                    sucesso: false,

                    erro:
                        "Ocorrência não encontrada."
                });
            }


            ocorrencia.estado =
                novoEstado;

            ocorrencia.ultimaAtualizacao =
                new Date().toISOString();


            guardarOcorrencias(
                ocorrencias
            );


            res.json({

                sucesso: true,

                ocorrencia

            });


        } catch (erro) {

            res.status(500).json({

                sucesso: false,

                erro: erro.message
            });
        }
    }
);


// ======================================================
// APAGAR OCORRÊNCIA
// ======================================================

app.delete(
    "/api/ocorrencias/:numero",
    (req, res) => {

        const ocorrencias =
            lerOcorrencias();

        const novas =
            ocorrencias.filter(
                o =>
                    String(o.numeroOcorrencia) !==
                    String(req.params.numero)
            );


        if (
            novas.length ===
            ocorrencias.length
        ) {

            return res.status(404).json({

                sucesso: false,

                erro:
                    "Ocorrência não encontrada."
            });
        }


        guardarOcorrencias(novas);


        res.json({

            sucesso: true,

            mensagem:
                "Ocorrência eliminada."
        });
    }
);


// ======================================================
// SERVIDOR
// ======================================================

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("🚨 CENTRAL DE OPERAÇÕES");
    console.log("======================================");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log("======================================");
    console.log("");
});