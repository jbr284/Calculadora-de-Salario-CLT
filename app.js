// app.js - VERSÃO FINAL FLEX 2026

// --- 1. REGRAS FIXAS (LEI 2026 - Oficial & Ajustado) ---
const regrasFederais = {
    ano: 2026,
    salarioMinimo: 1621.00, // Base Faixa 1
    tetoINSS: 8475.55,      // Teto Oficial
    deducaoDependente: 189.59,
    descontoSimplificadoValor: 607.20, // Estimativa 2026 para IRRF

    // Tabela INSS (Valores Matemáticos para Bater com Contabilidade)
    // A dedução aqui é a parcela matemática que ajusta a progressividade
    tabelaINSS: [
        { ate: 1621.00, aliq: 0.075, ded: 0.00 },
        { ate: 2902.84, aliq: 0.090, ded: 24.32 },
        { ate: 4354.27, aliq: 0.120, ded: 111.40 },
        { ate: 8475.55, aliq: 0.140, ded: 198.49 }
    ],
    
    // Tabela IRRF (Base de Cálculo)
    tabelaIRRF: [
        { ate: 2259.20, aliq: 0, ded: 0 },
        { ate: 2826.65, aliq: 0.075, ded: 169.44 },
        { ate: 3751.05, aliq: 0.15, ded: 381.44 },
        { ate: 4664.68, aliq: 0.225, ded: 662.77 },
        { ate: "acima", aliq: 0.275, ded: 896.00 }
    ]
};

// --- 2. PERFIL ---
const perfilPadrao = {
    nomeEmpresa: "Minha Empresa",
    config: {
        adiantamento: 40,   
        noturno: 20,        
        descontosExtras: [] 
    }
};

const Store = {
    getPerfil() {
        const dados = localStorage.getItem('calc_perfil_empresa_flex');
        if (!dados) return JSON.parse(JSON.stringify(perfilPadrao));
        return JSON.parse(dados);
    },
    salvarPerfil(perfil) {
        localStorage.setItem('calc_perfil_empresa_flex', JSON.stringify(perfil));
    }
};

const Format = {
    money: (val) => {
        if(typeof val === 'number') return val;
        if(!val && val !== 0) return 0;
        let v = val.toString().replace(/\./g, '').replace(',', '.');
        return isNaN(parseFloat(v)) ? 0 : parseFloat(v);
    },
    number: (val) => {
        if(!val && val !== 0) return 0;
        let v = val.toString().replace(',', '.').replace(':', '.');
        return isNaN(parseFloat(v)) ? 0 : parseFloat(v);
    },
    toBRL: (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
};

// --- 3. MOTOR DE CÁLCULO ---
function calcularSalario(inputs, perfil) {
    const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, options } = inputs;
    
    // Dias Úteis (Calendário)
    const diasUteis = inputs.diasUteis > 0 ? inputs.diasUteis : 25;
    const domFeriados = inputs.domFeriados >= 0 ? inputs.domFeriados : 5;

    const cfg = perfil.config;
    const diasEfetivos = (!diasTrab || diasTrab === 0) ? 30 : diasTrab;
    const valorDia = salario / 30;
    const valorHora = salario / 220;

    // --- PROVENTOS ---
    const vencBase = valorDia * diasEfetivos;
    const valorHE50 = he50 * valorHora * 1.5;
    const valorHE60 = he60 * valorHora * 1.6;
    const valorHE80 = he80 * valorHora * 1.8;
    const valorHE100 = he100 * valorHora * 2.0;
    const valorHE150 = he150 * valorHora * 2.5;
    const percNoturno = cfg.noturno / 100;
    const valorNoturno = noturno * valorHora * percNoturno;

    const totalHE = valorHE50 + valorHE60 + valorHE80 + valorHE100 + valorHE150;
    const dsrHE = (totalHE / diasUteis) * domFeriados;
    const dsrNoturno = (valorNoturno / diasUteis) * domFeriados;
    
    // Total Bruto (RENDIMENTOS TRIBUTÁVEIS)
    // *Importante para a regra de isenção do IRRF*
    const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

    // --- DESCONTOS ---
    const fgts = totalBruto * 0.08;
    const descFaltas = faltas * valorDia;
    const descAtrasos = atrasos * valorHora;
    const adiantamento = options.adiantamento ? ((salario / 30) * diasEfetivos * (cfg.adiantamento / 100)) : 0;
    
    // Extras (Dinâmicos da Configuração)
    let somaExtras = 0;
    const listaExtrasCalculados = [];
    if (cfg.descontosExtras && cfg.descontosExtras.length > 0) {
        cfg.descontosExtras.forEach(itemConfig => {
            let valorCalculado = 0;
            if (itemConfig.tipo === '%') {
                // Percentual sobre Salário Contratual
                valorCalculado = salario * (itemConfig.valor / 100);
            } else {
                // Valor Fixo
                valorCalculado = itemConfig.valor;
            }
            somaExtras += valorCalculado;
            listaExtrasCalculados.push({ nome: itemConfig.nome, valor: valorCalculado });
        });
    }

    // --- INSS (CÁLCULO EXATO COM A TABELA MATEMÁTICA) ---
    let baseINSS = totalBruto;
    if (baseINSS > regrasFederais.tetoINSS) baseINSS = regrasFederais.tetoINSS;
    let inss = 0;
    
    for (const f of regrasFederais.tabelaINSS) {
        if (baseINSS <= f.ate) {
            inss = (baseINSS * f.aliq) - f.ded;
            break;
        }
    }
    // Se estourar a última faixa (mas travado no teto)
    if (inss === 0 && baseINSS >= regrasFederais.tabelaINSS[3].ate) {
        const ult = regrasFederais.tabelaINSS[3];
        inss = (baseINSS * ult.aliq) - ult.ded;
    }

    // --- IRRF 2026 (LEI 15.270) ---
    // 1. Definição da Dedução (Legal ou Simplificado)
    const deducoesLegais = inss + (dependentes * regrasFederais.deducaoDependente);
    const deducaoUtilizada = Math.max(deducoesLegais, regrasFederais.descontoSimplificadoValor);
    
    // 2. Base de Cálculo para a Tabela
    const baseIRRF = totalBruto - deducaoUtilizada;
    
    // 3. Enquadramento na Tabela Progressiva (Cálculo Base)
    let irrfCalculado = 0;
    if (baseIRRF > 0) {
        for (const f of regrasFederais.tabelaIRRF) {
            if (f.ate === "acima" || baseIRRF <= f.ate) {
                irrfCalculado = (baseIRRF * f.aliq) - f.ded;
                break;
            }
        }
    }
    if (irrfCalculado < 0) irrfCalculado = 0;

    // 4. Aplicação do REDUTOR 2026 (Baseado em RENDIMENTOS TRIBUTÁVEIS)
    let irrfFinal = irrfCalculado;

    // Regra A: Isenção se Rendimentos <= 5000
    if (totalBruto <= 5000) {
        irrfFinal = 0;
    } 
    // Regra B: Redução Progressiva se Rendimentos entre 5000 e 7350
    else if (totalBruto > 5000 && totalBruto <= 7350) {
        // Fórmula: 978,62 - (13,3145% * TotalBruto)
        const redutor = 978.62 - (0.133145 * totalBruto);
        if (redutor > 0) {
            irrfFinal = irrfCalculado - redutor;
        }
    }
    // Regra C: Acima de 7350, segue o irrfCalculado normal.

    // Proteção contra negativo
    if (irrfFinal < 0) irrfFinal = 0;

    const totalDescontos = descFaltas + descAtrasos + inss + irrfFinal + adiantamento + somaExtras;
    const liquido = totalBruto - totalDescontos;

    return {
        p: { vencBase, valorHE50, valorHE60, valorHE80, valorHE100, valorHE150, valorNoturno, dsrHE, dsrNoturno, totalBruto },
        d: { descFaltas, descAtrasos, inss, irrf: irrfFinal, adiantamento, extras: listaExtrasCalculados, totalDescontos },
        fgts, liquido
    };
}

// --- 4. UI CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
    let perfilAtual = Store.getPerfil();
    
    // UI: Modal Config
    function renderConfigList() {
        const container = document.getElementById('container-lista-config');
        container.innerHTML = '';
        perfilAtual.config.descontosExtras.forEach((item, index) => {
            const row = document.createElement('div');
            row.style.cssText = "display:flex; gap:5px; margin-bottom:8px; align-items:center;";
            
            const inputNome = document.createElement('input');
            inputNome.type = 'text'; inputNome.value = item.nome; inputNome.placeholder = 'Ex: VT, Empréstimo'; inputNome.style.flex = "2";
            inputNome.onchange = (e) => { item.nome = e.target.value; };
            
            const inputValor = document.createElement('input');
            inputValor.type = 'number'; inputValor.value = item.valor; inputValor.placeholder = 'Valor'; inputValor.style.flex = "1";
            inputValor.onchange = (e) => { item.valor = parseFloat(e.target.value) || 0; };

            const selTipo = document.createElement('select');
            selTipo.innerHTML = `<option value="$">R$</option><option value="%">%</option>`;
            selTipo.value = item.tipo; selTipo.style.width = '60px';
            selTipo.onchange = (e) => { item.tipo = e.target.value; };

            const btnDel = document.createElement('button');
            btnDel.textContent = 'X';
            btnDel.style.cssText = "background:#d32f2f; color:white; border:none; border-radius:4px; padding:5px 10px; cursor:pointer;";
            btnDel.onclick = () => { perfilAtual.config.descontosExtras.splice(index, 1); renderConfigList(); };

            row.appendChild(inputNome); row.appendChild(inputValor); row.appendChild(selTipo); row.appendChild(btnDel);
            container.appendChild(row);
        });
    }

    // UI: Preview na Home
    function atualizarPreviewFixos() {
        const container = document.getElementById('preview-fixos');
        const extras = perfilAtual.config.descontosExtras;

        if (!extras || extras.length === 0) {
            container.innerHTML = '<p style="font-style:italic; color:#aaa; margin:0;">Nenhum desconto fixo configurado.</p>';
            return;
        }

        let html = '<table style="width:100%; border-collapse:collapse;">';
        extras.forEach(item => {
            const valorDisplay = item.tipo === '$' 
                ? parseFloat(item.valor).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) 
                : item.valor + '%';
            
            html += `
                <tr style="border-bottom:1px dashed #eee;">
                    <td style="padding:4px 0;">${item.nome}</td>
                    <td style="text-align:right; font-weight:bold;">${valorDisplay}</td>
                </tr>
            `;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    // INIT
    document.getElementById('nome-empresa-display').textContent = perfilAtual.nomeEmpresa;
    atualizarPreviewFixos(); // Chama ao iniciar

    const selDias = document.getElementById('inicioFerias');
    const selFeriados = document.getElementById('diaFeriado');
    for(let i=1; i<=31; i++){ const opt = `<option value="${i}">${i}</option>`; selDias.innerHTML += opt; selFeriados.innerHTML += opt; }

    // MODAL ACTIONS
    const modal = document.getElementById('modal-config');
    document.getElementById('btn-config').onclick = () => {
        document.getElementById('cfg_nome_empresa').value = perfilAtual.nomeEmpresa;
        document.getElementById('cfg_perc_adiantamento').value = perfilAtual.config.adiantamento;
        document.getElementById('cfg_perc_noturno').value = perfilAtual.config.noturno;
        renderConfigList(); modal.classList.remove('hidden');
    };
    document.getElementById('btn-close-modal').onclick = () => modal.classList.add('hidden');
    
    document.getElementById('btn-add-novo-desconto').onclick = () => {
        perfilAtual.config.descontosExtras.push({ id: Date.now(), nome: "", valor: 0, tipo: "$" });
        renderConfigList();
    };
    document.getElementById('btn-save-config').onclick = () => {
        perfilAtual.nomeEmpresa = document.getElementById('cfg_nome_empresa').value || "Minha Empresa";
        perfilAtual.config.adiantamento = parseFloat(document.getElementById('cfg_perc_adiantamento').value) || 0;
        perfilAtual.config.noturno = parseFloat(document.getElementById('cfg_perc_noturno').value) || 0;
        perfilAtual.config.descontosExtras = perfilAtual.config.descontosExtras.filter(i => i.nome.trim() !== "");
        
        Store.salvarPerfil(perfilAtual);
        document.getElementById('nome-empresa-display').textContent = perfilAtual.nomeEmpresa;
        atualizarPreviewFixos(); // Atualiza a tabela na home ao salvar
        alert('Configurações salvas!'); modal.classList.add('hidden');
    };

    // FUNÇÕES AUXILIARES
    function getSafeVal(id) { const el = document.getElementById(id); return el ? el.value : ""; }

    function performCalc() {
        const inputs = {
            salario: Format.money(getSafeVal('salario')),
            diasTrab: Format.number(getSafeVal('diasTrab')),
            dependentes: Format.number(getSafeVal('dependentes')),
            faltas: Format.number(getSafeVal('faltas')),
            atrasos: Format.number(getSafeVal('atrasos')),
            he50: Format.number(getSafeVal('he50')),
            he60: Format.number(getSafeVal('he60')),
            he80: Format.number(getSafeVal('he80')),
            he100: Format.number(getSafeVal('he100')),
            he150: Format.number(getSafeVal('he150')),
            noturno: Format.number(getSafeVal('noturno')),
            diasUteis: parseInt(getSafeVal('diasUteis')) || 0,
            domFeriados: parseInt(getSafeVal('domFeriados')) || 0,
            options: {
                adiantamento: document.getElementById('chk_adiantamento') ? document.getElementById('chk_adiantamento').checked : false
            }
        };

        const res = calcularSalario(inputs, perfilAtual);
        const liquidoMensal = res.liquido + res.d.adiantamento;
        const row = (l, v) => v > 0.01 ? `<tr><td>${l}</td><td class="valor">${Format.toBRL(v)}</td></tr>` : '';
        
        let htmlExtras = '';
        if (res.d.extras) res.d.extras.forEach(ex => { htmlExtras += row(ex.nome, ex.valor); });

        document.getElementById('resultado-container').innerHTML = `
            <div style="text-align:center; margin-bottom:10px; font-weight:bold; color:#555;">${perfilAtual.nomeEmpresa}</div>
            <table class="result-table">
                <thead><tr><th>Descrição</th><th>Valor</th></tr></thead>
                <tbody>
                    <tr class="section-header"><td colspan="2">Proventos</td></tr>
                    ${row('Salário Base', res.p.vencBase)}
                    ${row('HE 50%', res.p.valorHE50)}
                    ${row('HE 60%', res.p.valorHE60)}
                    ${row('HE 80%', res.p.valorHE80)}
                    ${row('HE 100%', res.p.valorHE100)}
                    ${row('HE 150%', res.p.valorHE150)}
                    ${row(`Adic. Noturno (${perfilAtual.config.noturno}%)`, res.p.valorNoturno)}
                    ${row('DSR s/ Horas Extras', res.p.dsrHE)}
                    ${row('DSR s/ Adic. Noturno', res.p.dsrNoturno)}
                    <tr class="summary-row"><td>Total Bruto</td><td class="valor">${Format.toBRL(res.p.totalBruto)}</td></tr>

                    <tr class="section-header"><td colspan="2">Descontos</td></tr>
                    ${row('INSS', res.d.inss)}
                    ${row('IRRF', res.d.irrf)}
                    ${row('Faltas', res.d.descFaltas)}
                    ${row('Atrasos', res.d.descAtrasos)}
                    ${row('Adiantamento', res.d.adiantamento)}
                    ${htmlExtras}
                    <tr class="summary-row"><td>Total Descontos</td><td class="valor">${Format.toBRL(res.d.totalDescontos)}</td></tr>

                    <tr class="section-header"><td colspan="2">Resumo Final</td></tr>
                    <tr class="final-result-main"><td>Salário Líquido (A Receber)</td><td class="valor">${Format.toBRL(res.liquido)}</td></tr>
                    <tr class="final-result-secondary"><td>Salário Líquido Total (Mês)</td><td class="valor">${Format.toBRL(liquidoMensal)}</td></tr>
                    <tr class="final-result-secondary fgts-row"><td>FGTS (Depósito)</td><td class="valor">${Format.toBRL(res.fgts)}</td></tr>
                </tbody>
            </table>
        `;
        document.getElementById('form-view').classList.add('hidden');
        document.getElementById('result-view').classList.remove('hidden');
        window.scrollTo(0,0);
    }

    const mesReferenciaInput = document.getElementById('mesReferencia');
    const diasTrabInput = document.getElementById('diasTrab');
    const boxFerias = document.getElementById('box-calculo-ferias');
    const qtdDiasFeriasInput = document.getElementById('qtdDiasFerias');
    const inicioFeriasInput = document.getElementById('inicioFerias');

    if (!mesReferenciaInput.value) {
        const now = new Date(); mesReferenciaInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    function atualizarFerias() {
        const modo = document.querySelector('input[name="tipoDias"]:checked').value;
        if (modo === 'completo') { boxFerias.classList.add('hidden'); diasTrabInput.value = 30; return; }
        boxFerias.classList.remove('hidden');
        
        const colQtd = document.getElementById('col-qtd');
        const lblData = document.getElementById('lbl-data-ferias');
        if (modo === 'retorno_ferias') {
            colQtd.classList.add('hidden');
            lblData.textContent = "Dia do Retorno";
        } else {
            colQtd.classList.remove('hidden');
            lblData.textContent = "Dia de Início";
        }

        const mesRef = mesReferenciaInput.value;
        const diaInicio = parseInt(inicioFeriasInput.value);
        const qtdDias = parseInt(qtdDiasFeriasInput.value);
        if (!mesRef || !diaInicio) { diasTrabInput.value = 0; return; }
        const [ano, mes] = mesRef.split('-').map(Number);
        const ultimoDiaMes = new Date(ano, mes, 0).getDate();
        const diaValidado = Math.min(diaInicio, ultimoDiaMes);
        let diasPagar = 0;
        if (modo === 'saida_ferias') {
            if(!qtdDias) return;
            const dataFim = new Date(ano, mes-1, diaValidado);
            dataFim.setDate(dataFim.getDate() + qtdDias - 1);
            const fimMesDate = new Date(ano, mes, 0);
            if (dataFim <= fimMesDate) diasPagar = 30 - qtdDias; 
            else diasPagar = diaValidado - 1;
        } else {
            diasPagar = 30 - (diaValidado - 1);
        }
        diasTrabInput.value = Math.max(0, Math.min(30, diasPagar));
    }

    function preencherDiasMes() {
        const mesAno = mesReferenciaInput.value;
        if (!mesAno) return;
        const [ano, mes] = mesAno.split('-').map(Number);
        const diasNoMes = new Date(ano, mes, 0).getDate();
        let diasUteis = 0, domingos = 0;
        for (let d = 1; d <= diasNoMes; d++) {
            const data = new Date(ano, mes - 1, d);
            const diaSemana = data.getDay();
            if (diaSemana >= 1 && diaSemana <= 6) diasUteis++;
            if (diaSemana === 0) domingos++;
        }
        const feriadosFixos = ["01/01", "21/04", "01/05", "07/09", "12/10", "02/11", "15/11", "25/12"];
        let feriadosNacionais = 0;
        feriadosFixos.forEach(fix => {
            const [dia, mesFix] = fix.split('/');
            if (parseInt(mesFix) === mes) {
                const dt = new Date(ano, mes - 1, parseInt(dia));
                if (dt.getDay() !== 0) feriadosNacionais++;
            }
        });
        const extrasStr = document.getElementById('feriadosExtras').value;
        const qtdExtras = extrasStr ? extrasStr.split(',').length : 0;
        document.getElementById('diasUteis').value = diasUteis - qtdExtras - feriadosNacionais;
        document.getElementById('domFeriados').value = domingos + qtdExtras + feriadosNacionais;
        if(document.querySelector('input[name="tipoDias"]:checked')?.value !== 'completo') atualizarFerias();
    }

    document.getElementById('btn-calcular').addEventListener('click', performCalc);
    document.getElementById('btn-voltar').addEventListener('click', () => { document.getElementById('result-view').classList.add('hidden'); document.getElementById('form-view').classList.remove('hidden'); });
    document.getElementById('btn-pdf').addEventListener('click', () => {
        const opt = { margin: 10, filename: 'holerite.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } };
        html2pdf().set(opt).from(document.getElementById('resultado-container')).save();
    });

    document.querySelectorAll('input[name="tipoDias"]').forEach(r => r.addEventListener('change', atualizarFerias));
    inicioFeriasInput.addEventListener('change', atualizarFerias);
    qtdDiasFeriasInput.addEventListener('input', atualizarFerias);
    mesReferenciaInput.addEventListener('change', preencherDiasMes);

    document.getElementById('btn-add-feriado').addEventListener('click', () => {
        const dia = document.getElementById('diaFeriado').value;
        if(dia) {
            const div = document.createElement('div');
            div.className = 'feriado-box'; div.textContent = `Dia ${dia}`;
            div.onclick = () => { 
                const nova = document.getElementById('feriadosExtras').value.split(',').filter(d => !d.endsWith(dia)).join(',');
                document.getElementById('feriadosExtras').value = nova; div.remove(); preencherDiasMes(); 
            };
            document.getElementById('listaFeriados').appendChild(div);
            const current = document.getElementById('feriadosExtras').value;
            const fullDate = `${dia.padStart(2, '0')}/${mesReferenciaInput.value.split('-')[1]}`;
            document.getElementById('feriadosExtras').value = current ? current + ',' + fullDate : fullDate;
            preencherDiasMes();
        }
    });
    document.getElementById('btn-limpar-feriados').addEventListener('click', () => {
        document.getElementById('feriadosExtras').value = ''; document.getElementById('listaFeriados').innerHTML = ''; preencherDiasMes();
    });

    document.querySelectorAll('.hora-conversivel').forEach(c => {
        c.addEventListener('blur', function() {
            let v = this.value.replace(',', '.').replace(':', '.'); if(v) this.value = parseFloat(v).toFixed(2);
        });
    });

    preencherDiasMes();
});
