import express, { Request, Response } from 'express';
import axios from 'axios';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const app = express();

// --- CONFIGURAÇÃO DE CAMINHOS ---
const publicPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicPath));

app.get('/exportar-excel', async (req: Request, res: Response) => {
    const { dataInicio, dataFim } = req.query;
    const dIn = dataInicio ? dataInicio.toString().split('-').reverse().join('/') : "23/02/2026";

    try {
        const response = await axios.get(`https://abmbus.com.br:8181/api/usuario/pesquisarelatorio?linhas=&empresas=3528872&dataInicial=${dIn}&dataFinal=${dIn}&periodo=&sentido=&agrupamentos=`, {
            headers: { 'Authorization': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJtaW1vQGFibXByb3RlZ2UuY29tLmJyIiwiZXhwIjoxODcwOTkzNDM5fQ.aj4XA7WAMCpfJCGyLhWX1swG8fyLmxgBufpaJAZNeFecCp9HJbSy57FultLJs1i73axl00_tur-HFCjoZ07K9Q' }
        });

        const dados: any[] = response.data;
        const workbook = new ExcelJS.Workbook();

        const criarAba = (nomeAba: string, filtro: string) => {
            const lista = dados.filter(i => i.sentido === filtro);
            if (lista.length === 0) return;

            const sheet = workbook.addWorksheet(nomeAba);

            // 1. CONFIGURAÇÃO DE MARGENS E LAYOUT
            sheet.pageSetup.margins = { left: 0.7, right: 0.7, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 };
            
            // 2. CABEÇALHO COM LOGO E TÍTULO (Mesclagem de células)
            sheet.mergeCells('A1:B4'); // Espaço para o Logo
            sheet.mergeCells('C1:H2'); // Título do Relatório
            sheet.mergeCells('C3:H4'); // Subtítulo (Data e Empresa)

            const titulo = sheet.getCell('C1');
            titulo.value = 'RELATÓRIO DE PONTUALIDADE E OPERAÇÃO';
            titulo.font = { name: 'Arial', size: 16, bold: true };
            titulo.alignment = { vertical: 'middle', horizontal: 'center' };

            const subtitulo = sheet.getCell('C3');
            subtitulo.value = `Viação Mimo - Período: ${dIn} | Sentido: ${filtro}`;
            subtitulo.font = { name: 'Arial', size: 11 };
            subtitulo.alignment = { vertical: 'middle', horizontal: 'center' };

            // Inserir Logo (se o arquivo existir)
            const logoPath = path.join(publicPath, 'logo.png');
            if (fs.existsSync(logoPath)) {
                const imageId = workbook.addImage({
                    filename: logoPath,
                    extension: 'png',
                });
                sheet.addImage(imageId, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 120, height: 60 }
                });
            }

            // 3. DEFINIÇÃO DAS COLUNAS (Inicia na Linha 6 para dar espaço ao topo)
            const startRow = 6;
            sheet.getRow(startRow).values = ['LINHA', 'PREFIXO', 'PLACA', 'HORÁRIO PREV.', 'HORÁRIO EXEC.', 'STATUS', 'MOTORISTA', 'PONTUALIDADE'];
            
            sheet.columns = [
                { key: 'linha', width: 35 },
                { key: 'veiculo', width: 12 },
                { key: 'placa', width: 12 },
                { key: 'previsto', width: 15 },
                { key: 'executado', width: 15 },
                { key: 'status', width: 15 },
                { key: 'moto', width: 30 },
                { key: 'atraso', width: 15 }
            ];

            // 4. INSERÇÃO DE DADOS E LÓGICA DE ATRASO
            lista.forEach((item, index) => {
                const row = sheet.addRow({
                    linha: item.linhaDescricao,
                    veiculo: item.veiculo?.veiculo,
                    placa: item.veiculo?.placa,
                    previsto: item.pontoDeParadaRelatorio[0]?.horario || '--:--',
                    executado: item.dataHora.split(' ')[1], // Extrai apenas a hora
                    status: item.status,
                    moto: item.motorista || 'N/D',
                    atraso: item.status === 'Atrasado' ? 'ATRASADO' : 'PONTUAL'
                });

                // Estilo Zebra e Bordas
                row.eachCell((cell) => {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                });
                if (index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9F9F9' } };

                // DESTAQUE PARA ATRASADOS (Linha Vermelha)
                if (item.status === 'Atrasado') {
                    row.eachCell((cell) => {
                        cell.font = { color: { argb: 'FF0000' }, bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } }; // Fundo rosa claro
                    });
                }
            });

            // Estilo do Cabeçalho da Tabela
            const header = sheet.getRow(startRow);
            header.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0047AB' } };
                cell.font = { color: { argb: 'FFFFFF' }, bold: true };
                cell.alignment = { horizontal: 'center' };
            });
        };

        criarAba('ENTRADAS', 'Entrada');
        criarAba('SAÍDAS', 'Saída');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Mimo_Identico.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).send("Erro ao gerar relatório.");
    }
});

app.listen(80, () => console.log("🚀 Sistema Mimo Online"));
