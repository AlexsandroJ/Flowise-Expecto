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

  if (req.method === 'POST' && req.url === '/run') {
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

        // Seleciona o executável (se não estiver na lista, usa o próprio nome enviado)
        const bin = INTERPRETADORES[langSolicitada] || langSolicitada;
        const b64 = Buffer.from(codigo).toString('base64');

        console.log(`[EXECUTANDO] Linguagem: ${langSolicitada} (${bin}) | Workspace: ${WORKSPACE}`);

        // Garante que rode na pasta /home/coder para os arquivos ficarem visíveis no terminal web
        const cmd = `docker exec coder_server coder ssh ${WORKSPACE} -- 'cd /home/coder && echo "${b64}" | base64 -d | ${bin}'`;
        
        const out = execSync(cmd, { timeout: 15000 }).toString();
        const duracao = Date.now() - inicio;

        console.log(`[200 OK] (${duracao}ms) Saída:\n${out.trim() || '(Sem saída no stdout)'}`);
        console.log(`==================================================`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'sucesso',
          linguagem: langSolicitada,
          tempo_ms: duracao,
          resultado: out.trim() || 'Código executado com sucesso (sem saída).'
        }));

      } catch (err) {
        const duracao = Date.now() - inicio;
        const msgErro = err.stderr ? err.stderr.toString() : err.message;

        console.error(`[500 ERRO] (${duracao}ms) Falha:\n${msgErro}`);
        console.log(`==================================================`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'erro',
          tempo_ms: duracao,
          resultado: `Erro na execução:\n${msgErro}`
        }));
      }
    });
  } else {
    console.log(`[404 NOT FOUND] Rota ou método inválido.`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: 'Use POST /run' }));
  }
}).listen(PORTA, '0.0.0.0', () => {
  console.log(`🚀 Ponte Coder API ativa em http://0.0.0:${PORTA}/run`);
  console.log(`📦 Workspace alvo: ${WORKSPACE}`);
  console.log(`⏳ Aguardando requisições...\n`);
});
