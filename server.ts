import express, { Request, Response } from 'express';
import axios from 'axios';
import * as XLSX from 'xlsx';
import path from 'path';

const app = express();

// Serve os arquivos da pasta public (onde deve estar seu index.html)
app.use(express.static(path.join(__dirname, 'public')));

const formatarDados = (lista: any[]) => {
    return lista.map(item => {
        // Proteção para evitar erro se o array de pontos estiver vazio
        const pontos = item.pontoDeParadaRelatorio || [];
        const primeiroPonto = pontos.length > 0 ? pontos[0] : {};
        const ultimoPonto = pontos.length > 0 ? pontos[pontos.length - 1] : {};

        return {
            "Linha": item.linhaDescricao,
            "Data/Hora": item.dataHora || item.data,
            "Veículo": item.veiculo?.veiculo || "N/A",
            "Placa": item.veiculo?.placa || "N/A",
            "Velocidade Maxima": item.velocidadeMaximaStr,
            "Status": item.status,
            "H.P.I Previsto": primeiroPonto.horario || "N/A",
            "H.P.I Executado": item.status, // Ajustar se houver campo específico no JSON
            "Passou no ponto inicial?": primeiroPonto.passou ? "Sim" : "Não",
            "H.P.F Previsto": ultimoPonto.horario || "N/A",
            "H.P.F Executado": item.status, // Ajustar se houver campo específico no JSON
            "Passou no ponto final?": item.status, // Ajustar se houver campo específico no JSON
            "% Pontos": item.status, // Ajustar conforme campo real
            "Duração (minutos)": item.status, // Ajustar conforme campo real
            "Pontualidade": item.status, // Ajustar conforme campo real
            "Motorista": item.motorista || "Não Identificado",
            "Sentido": item.sentido
        };
    });
};

app.get('/exportar-excel', async (req: Request, res: Response) => {
    // Pegando a data atual para o nome do arquivo
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const apiUrl = "https://abmbus.com.br:8181/api/usuario/pesquisarelatorio?linhas=&empresas=3528872&dataInicial=19/2/2026&dataFinal=19/2/2026&periodo=&sentido=&agrupamentos=";

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJtaW1vQGFibXByb3RlZ2UuY29tLmJyIiwiZXhwIjoxODcwOTkzNDM5fQ.aj4XA7WAMCpfJCGyLhWX1swG8fyLmxgBufpaJAZNeFecCp9HJbSy57FultLJs1i73axl00_tur-HFCjoZ07K9Q',
                'Origin': 'https://abmbus.com.br',
                'Referer': 'https://abmbus.com.br/'
            }
        });

        const dados: any[] = response.data;

        if (!Array.isArray(dados)) {
            return res.status(404).send("A API não retornou uma lista de dados válida.");
        }

        // Separação rigorosa baseada no seu JSON
        const entradasRaw = dados.filter(item => item.sentido === 'Entrada');
        const saidasRaw = dados.filter(item => item.sentido === 'Saída');

        const entradas = formatarDados(entradasRaw);
        const saidas = formatarDados(saidasRaw);

        const workbook = XLSX.utils.book_new();

        // Só cria a aba se houver dados, para evitar Excel "quebrado"
        if (entradas.length > 0) {
            const wsEntradas = XLSX.utils.json_to_sheet(entradas);
            XLSX.utils.book_append_sheet(workbook, wsEntradas, "Entradas");
        }

        if (saidas.length > 0) {
            const wsSaidas = XLSX.utils.json_to_sheet(saidas);
            XLSX.utils.book_append_sheet(workbook, wsSaidas, "Saídas");
        }

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Mimo_${dataHoje}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        return res.send(buffer);

    } catch (error: any) {
        console.error("Erro na API ABM Bus:", error.message);
        res.status(500).send("Erro ao processar o relatório. Verifique os logs do servidor.");
    }
});

// Porta 80 para produção na Hostinger
app.listen(80, () => console.log("🚀 Servidor da Viação Mimo rodando na porta 80"));
