import express, { Request, Response } from 'express';
import axios from 'axios';
import * as XLSX from 'xlsx';
import path from 'path';

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

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

        // --- LÓGICA DE SEPARAÇÃO POR ABAS ---
        // Ajuste 'item.sentido' para o nome correto do campo da sua API
        const entradas = dados.filter(item => item.sentido === 'ENTRADA' || item.sentido === 0);
        const saidas = dados.filter(item => item.sentido === 'SAIDA' || item.sentido === 1);

        // Cria o Workbook (Livro)
        const workbook = XLSX.utils.book_new();

        // Cria a aba de Entradas
        const worksheetEntradas = XLSX.utils.json_to_sheet(entradas);
        XLSX.utils.book_append_sheet(workbook, worksheetEntradas, "Entradas");

        // Cria a aba de Saídas
        const worksheetSaidas = XLSX.utils.json_to_sheet(saidas);
        XLSX.utils.book_append_sheet(workbook, worksheetSaidas, "Saídas");

        // Se houver dados que não se encaixam, você pode criar uma aba "Geral"
        if (dados.length > (entradas.length + saidas.length)) {
             const worksheetGeral = XLSX.utils.json_to_sheet(dados);
             XLSX.utils.book_append_sheet(workbook, worksheetGeral, "Todos os Dados");
        }

        // Gera o buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=relatorio_mimo_separado.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        return res.send(buffer);

    } catch (error: any) {
        console.error("Erro:", error.message);
        res.status(500).send("Erro ao processar dados");
    }
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
