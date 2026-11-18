const http = require('http');
const { execSync } = require('child_process');

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        console.log('Recebido do Flowise:', body);
        const { codigo } = JSON.parse(body);
        const b64 = Buffer.from(codigo).toString('base64');
        
        // Sem a flag -i para o comando encerrar imediatamente após rodar
        const cmd = `docker exec coder_server coder ssh Teste-codigo -- 'echo "${b64}" | base64 -d | python3'`;
        const out = execSync(cmd, { timeout: 10000 }).toString();
        
        console.log('Resultado obtido:', out.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ resultado: out.trim() || 'Executado sem saída.' }));
      } catch (err) {
        console.error('Erro na execução:', err.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ resultado: `Erro:\n${err.stderr ? err.stderr.toString() : err.message}` }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3005, '0.0.0.0', () => console.log('Ponte Coder rodando na porta 3005'));
