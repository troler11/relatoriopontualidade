import express, { Request, Response } from 'express';
import axios from 'axios';
import * as XLSX from 'xlsx';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Serve arquivos estáticos (seu HTML/Frontend)
app.use(express.static('public'));

app.get('/exportar-excel', async (req: Request, res: Response) => {
    const apiUrl = "https://abmbus.com.br:8181/api/usuario/pesquisarelatorio?linhas=&empresas=3528872&dataInicial=19/2/2026&dataFinal=19/2/2026&periodo=&sentido=&agrupamentos=";

    try {
        // 1. Faz a chamada para a API da ABM Bus
        const response = await axios.get(apiUrl, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJtaW1vQGFibXByb3RlZ2UuY29tLmJyIiwiZXhwIjoxODcwOTkzNDM5fQ.aj4XA7WAMCpfJCGyLhWX1swG8fyLmxgBufpaJAZNeFecCp9HJbSy57FultLJs1i73axl00_tur-HFCjoZ07K9Q',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                'Origin': 'https://abmbus.com.br',
                'Referer': 'https://abmbus.com.br/'
            }
        });

        const dados = response.data;

        if (!dados || dados.length === 0) {
            return res.status(404).send("Nenhum dado encontrado.");
        }

        // 2. Cria o arquivo Excel em memória
        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");

        // 3. Escreve o buffer do arquivo
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // 4. Configura os headers para o navegador baixar o arquivo automaticamente
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio_mimo.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        return res.send(buffer);

    } catch (error: any) {
        console.error("Erro ao processar requisição:", error.message);
        res.status(500).json({ error: "Erro ao buscar dados da API ou gerar Excel" });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
