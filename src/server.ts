import express, { Request, Response } from 'express';
import axios from 'axios';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const app = express();
const caminhosPossiveis = [
    path.join(__dirname, '..', 'public'), // No Docker (sai de dist e vai para public)
    path.join(__dirname, 'public'),       // Rodando via ts-node ou local
    path.join(process.cwd(), 'public')    // Raiz do processo atual
];

const publicPath = caminhosPossiveis.find(p => fs.existsSync(p)) || caminhosPossiveis[0];

console.log(`[Viação Mimo] Servindo arquivos de: ${publicPath}`);

app.use(express.static(publicPath));

app.get('/', (req: Request, res: Response) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`Erro: index.html não encontrado em ${publicPath}`);
    }
});

const formatarDados = (lista: any[]) => {
    return lista.map(item => {
        const pontos = item.pontoDeParadaRelatorio || [];
        const primeiroPonto = pontos.length > 0 ? pontos[0] : {};
        const ultimoPonto = pontos.length > 0 ? pontos[pontos.length - 1] : {};

        return {
            "Linha": item.linhaDescricao,
            "Data/Hora": item.dataHora || item.data,
            "Veículo": item.veiculo?.veiculo || "N/A",
            "Placa": item.veiculo?.placa || "N/A",
            "Velocidade Maxima": item.velocidadeMaximaStr,
            "H.P.I Previsto": primeiroPonto.horario || "N/A",
            "Passou no ponto inicial?": primeiroPonto.passou ? "Sim" : "Não",
            "H.P.F Previsto": ultimoPonto.horario || "N/A",
            "Passou no ponto final?": ultimoPonto.passou ? "Sim" : "Não",
            "Motorista": item.motorista || "Não Identificado",
            "Sentido": item.sentido
        };
    });
};

app.get('/exportar-excel', async (req: Request, res: Response) => {
    // Captura as datas enviadas pelo frontend. Se não enviar, usa a data de hoje.
    const { dataInicio, dataFim } = req.query;
    
    // A API da ABM Bus usa o formato D/M/YYYY (ex: 19/2/2026)
    // O HTML input type="date" envia YYYY-MM-DD, então precisamos converter:
    const formatarDataParaAPI = (dataStr: any) => {
        const [ano, mes, dia] = dataStr.toString().split('-');
        return `${parseInt(dia)}/${parseInt(mes)}/${ano}`;
    };

    const dInicial = dataInicio ? formatarDataParaAPI(dataInicio) : "19/2/2026";
    const dFinal = dataFim ? formatarDataParaAPI(dataFim) : dInicial;

    const apiUrl = `https://abmbus.com.br:8181/api/usuario/pesquisarelatorio?linhas=&empresas=3528872&dataInicial=${dInicial}&dataFinal=${dFinal}&periodo=&sentido=&agrupamentos=`;

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJtaW1vQGFibXByb3RlZ2UuY29tLmJyIiwiZXhwIjoxODcwOTkzNDM5fQ.aj4XA7WAMCpfJCGyLhWX1swG8fyLmxgBufpaJAZNeFecCp9HJbSy57FultLJs1i73axl00_tur-HFCjoZ07K9Q',
                'Origin': 'https://abmbus.com.br',
                'Referer': 'https://abmbus.com.br/'
            }
        });

        const dados: any[] = response.data;
        if (!Array.isArray(dados)) return res.status(404).send("Dados não encontrados.");

        const entradas = formatarDados(dados.filter(item => item.sentido === 'Entrada'));
        const saidas = formatarDados(dados.filter(item => item.sentido === 'Saída'));

        const workbook = XLSX.utils.book_new();
        if (entradas.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(entradas), "Entradas");
        if (saidas.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saidas), "Saídas");

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Mimo_${dInicial.replace(/\//g, '-')}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buffer);

    } catch (error: any) {
        res.status(500).send("Erro ao processar relatório.");
    }
});

app.listen(80, () => console.log("🚀 Servidor Mimo Online na porta 80"));
