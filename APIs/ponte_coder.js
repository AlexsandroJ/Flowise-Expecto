const http = require('http');
const { execSync } = require('child_process');

const PORTA = 3005;
const WORKSPACE = 'Teste-codigo';

// Mapeamento de interpretadores suportados na sandbox
const INTERPRETADORES = {
    python: 'python3',
    python3: 'python3',
    javascript: 'node',
    js: 'node',
    node: 'node',
    bash: 'bash',
    sh: 'sh'
};

http.createServer((req, res) => {
    const inicio = Date.now();
    const dataHora = new Date().toLocaleTimeString('pt-BR');

    console.log(`\n==================================================`);
    console.log(`[${dataHora}] --> ${req.method} ${req.url} (Origem: ${req.socket.remoteAddress})`);

    if (req.method === 'POST' && (req.url === '/run' || req.url === '/')) {
        let body = '';
        req.on('data', chunk => body += chunk);

        req.on('end', () => {
            console.log(`[BODY RECEBIDO]: ${body}`);

            try {
                const dados = JSON.parse(body);
                const codigo = dados.codigo;
                const langSolicitada = (dados.linguagem || 'python').toLowerCase();

                if (!codigo) {
                    throw new Error('O campo "codigo" está vazio ou ausente no JSON.');
                }

                const bin = INTERPRETADORES[langSolicitada] || langSolicitada;
                const b64 = Buffer.from(codigo).toString('base64');

                console.log(`[EXECUTANDO] Linguagem: ${langSolicitada} (${bin}) | Workspace: ${WORKSPACE}`);

                // O "2>&1" junta os logs de aviso/erro com a saída normal para o agente ver tudo
                const cmd = `docker exec coder_server coder ssh ${WORKSPACE} -- 'cd /home/coder && echo "${b64}" | base64 -d | ${bin} 2>&1'`;

                const out = execSync(cmd, { timeout: 15000 }).toString();
                const duracao = Date.now() - inicio;

                console.log(`[200 OK] (${duracao}ms) Saída:\n${out.trim() || '(Sem saída)'}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    sucesso: true,
                    exit_code: 0,
                    linguagem: langSolicitada,
                    tempo_ms: duracao,
                    log: out.trim() || 'Código executado com sucesso (sem saída no print).'
                }));

            } catch (err) {
                const duracao = Date.now() - inicio;
                // Captura tanto o stdout parcial quanto o stderr completo do erro
                const saidaParcial = err.stdout ? err.stdout.toString().trim() : '';
                const erroDetalhado = err.stderr ? err.stderr.toString().trim() : err.message;
                const logCompleto = [saidaParcial, erroDetalhado].filter(Boolean).join('\n');

                console.error(`[ERRO EXECUÇÃO] (${duracao}ms) Exit Code: ${err.status || 1}\n${logCompleto}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    sucesso: false,
                    exit_code: err.status || 1,
                    tempo_ms: duracao,
                    log: logCompleto
                }));
            }
        });
    }
    else {
        console.log(`[404 NOT FOUND] Rota ou método inválido.`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Use POST /run' }));
    }
}).listen(PORTA, '0.0.0.0', () => {
    console.log(`🚀 Ponte Coder API ativa em http://0.0.0:${PORTA}/run`);
    console.log(`📦 Workspace alvo: ${WORKSPACE}`);
    console.log(`⏳ Aguardando requisições...\n`);
});
