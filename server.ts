import express, { Request, Response } from 'express';
import axios from 'axios';
import * as XLSX from 'xlsx';
import path from 'path';

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Função opcional para deixar os nomes das colunas bonitos no Excel
const formatarDados = (lista: any[]) => {
    return lista.map(item => ({
        "Linha": item.linhaDescricao, // Ajuste conforme os campos do seu JSON
        "Data/Hora": item.dataHora || item.data, // Ajuste conforme os campos do seu JSON
        "Veículo": item.veiculo.veiculo, // Ajuste conforme os campos do seu JSON
        "Placa": item.veiculo.placa, // Ajuste conforme os campos do seu JSON
        "Velocidade Maxima": item.veiculo.velocidadeMaximaStr, // Ajuste conforme os campos do seu JSON
        "Status": item.status, // Ajuste conforme os campos do seu JSON
        "H.P.I Previsto": item.status, // Ajuste conforme os campos do seu JSON
        "H.P.I Executado": item.status, // Ajuste conforme os campos do seu JSON
        "Passou no ponto inicial?": item.status, // Ajuste conforme os campos do seu JSON
        "H.P.F Previsto": item.status, // Ajuste conforme os campos do seu JSON
        "H.P.F Executado": item.status, // Ajuste conforme os campos do seu JSON
        "Passou no ponto final?": item.status, // Ajuste conforme os campos do seu JSON
        "% Pontos": item.status, // Ajuste conforme os campos do seu
        "Duração (minutos)s": item.status, // Ajuste conforme os campos do seu
        "Pontualidade": item.status, // Ajuste conforme os campos do seu
        "Motorista": item.motorista,
        "Sentido": item.sentido
    }));
};

app.get('/exportar-excel', async (req: Request, res: Response) => {
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

        // --- FILTRAGEM BASEADA NO SEU JSON ---
        const entradasRaw = dados.filter(item => item.sentido === 'Entrada');
        const saidasRaw = dados.filter(item => item.sentido === 'Saída');

        // Formata os dados para o Excel (Opcional, mas recomendado)
        const entradas = formatarDados(entradasRaw);
        const saidas = formatarDados(saidasRaw);

        // Cria o arquivo Excel
        const workbook = XLSX.utils.book_new();

        // Adiciona a aba de Entradas
        const worksheetEntradas = XLSX.utils.json_to_sheet(entradas);
        XLSX.utils.book_append_sheet(workbook, worksheetEntradas, "Entradas");

        // Adiciona a aba de Saídas
        const worksheetSaidas = XLSX.utils.json_to_sheet(saidas);
        XLSX.utils.book_append_sheet(workbook, worksheetSaidas, "Saídas");

        // Gera o buffer para download
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=Relatorio_Mimo_Entrada_Saida.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        return res.send(buffer);

    } catch (error: any) {
        console.error("Erro na API ABM Bus:", error.message);
        res.status(500).send("Erro ao processar o relatório.");
    }
});

app.listen(80, () => console.log("Servidor ativo na porta 80"));
