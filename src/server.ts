import express, { Request, Response } from 'express';
import axios from 'axios';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const app = express();

// --- CONFIGURAÇÃO DE CAMINHOS ---
const caminhosPossiveis = [
    path.join(__dirname, '..', 'public'), // No Docker
    path.join(__dirname, 'public'),       // Local
    path.join(process.cwd(), 'public')    // Raiz
];
const publicPath = caminhosPossiveis.find(p => fs.existsSync(p)) || caminhosPossiveis[0];

console.log(`[Viação Mimo] Arquivos estáticos em: ${publicPath}`);
app.use(express.static(publicPath));

// --- ROTA PRINCIPAL (FRONTEND) ---
app.get('/', (req: Request, res: Response) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Erro: index.html não encontrado.");
    }
});

// --- ROTA DE EXPORTAÇÃO (BACKEND) ---
app.get('/exportar-excel', async (req: Request, res: Response) => {
    const { dataInicio, dataFim } = req.query;

    // Tradução de data: YYYY-MM-DD (HTML) para D/M/YYYY (API)
    const formatarData = (dStr: any) => {
        const [ano, mes, dia] = dStr.toString().split('-');
        return `${parseInt(dia)}/${parseInt(mes)}/${ano}`;
    };

    const dIn = dataInicio ? formatarData(dataInicio) : "19/2/2026";
    const dFi = dataFim ? formatarData(dataFim) : dIn;

    const apiUrl = `https://abmbus.com.br:8181/api/usuario/pesquisarelatorio?linhas=&empresas=3528872&dataInicial=${dIn}&dataFinal=${dFi}&periodo=&sentido=&agrupamentos=`;

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJtaW1vQGFibXByb3RlZ2UuY29tLmJyIiwiZXhwIjoxODcwOTkzNDM5fQ.aj4XA7WAMCpfJCGyLhWX1swG8fyLmxgBufpaJAZNeFecCp9HJbSy57FultLJs1i73axl00_tur-HFCjoZ07K9Q',
                'Origin': 'https://abmbus.com.br',
                'Referer': 'https://abmbus.com.br/'
            }
        });

        const dados: any[] = response.data;
        if (!Array.isArray(dados)) return res.status(404).send("Nenhum dado encontrado.");

        const workbook = new ExcelJS.Workbook();

        // Função para criar aba estilizada
        const criarAba = (nomeAba: string, filtro: string) => {
            const listaFiltrada = dados.filter(i => i.sentido === filtro);
            if (listaFiltrada.length === 0) return;

            const sheet = workbook.addWorksheet(nomeAba);

            // Definição das Colunas e Larguras
            sheet.columns = [
                { header: 'LINHA', key: 'linha', width: 35 },
                { header: 'DATA/HORA', key: 'data', width: 20 },
                { header: 'VEÍCULO', key: 'veiculo', width: 15 },
                { header: 'PLACA', key: 'placa', width: 12 },
                { header: 'VEL. MÁX', key: 'vel', width: 12 },
                { header: 'H.P.I PREVISTO', key: 'hpi', width: 18 },
                { header: 'PASSOU P.I?', key: 'passou', width: 15 },
                { header: 'MOTORISTA', key: 'moto', width: 35 }
            ];

            // Inserção dos Dados
            listaFiltrada.forEach(item => {
                const pontos = item.pontoDeParadaRelatorio || [];
                sheet.addRow({
                    linha: item.linhaDescricao,
                    data: item.dataHora,
                    veiculo: item.veiculo?.veiculo,
                    placa: item.veiculo?.placa,
                    vel: item.velocidadeMaximaStr,
                    hpi: pontos[0]?.horario || 'N/A',
                    passou: pontos[0]?.passou ? 'SIM' : 'NÃO',
                    moto: item.motorista || 'NÃO IDENTIFICADO'
                });
            });

            // --- ESTILIZAÇÃO DO LAYOUT ---
            // 1. Estilo do Cabeçalho (Fundo Azul, Texto Branco, Negrito)
            const headerRow = sheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0047AB' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = { bottom: { style: 'medium' } };
            });

            // 2. Estilo das Linhas (Bordas e Zebra)
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' }, left: { style: 'thin' },
                            bottom: { style: 'thin' }, right: { style: 'thin' }
                        };
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    });
                    
                    // Cores alternadas (Zebra)
                    if (rowNumber % 2 === 0) {
                        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
                    }

                    // Formatação Condicional: Se "NÃO" passou, pinta de vermelho
                    const cellPassou = row.getCell(7);
                    if (cellPassou.value === 'NÃO') {
                        cellPassou.font = { color: { argb: 'FF0000' }, bold: true };
                    }
                }
            });
        };

        criarAba('ENTRADAS', 'Entrada');
        criarAba('SAÍDAS', 'Saída');

        // Configuração de Resposta para Download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Mimo_${dIn.replace(/\//g, '-')}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error: any) {
        console.error("Erro ABM:", error.message);
        res.status(500).send("Erro ao gerar relatório.");
    }
});

app.listen(80, () => console.log("🚀 Servidor da Viação Mimo rodando na porta 80"));
