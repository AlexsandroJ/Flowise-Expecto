const http = require('http');
const { execSync } = require('child_process');

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { codigo } = JSON.parse(body);
        const b64 = Buffer.from(codigo).toString('base64');
        const out = execSync(
          `docker exec -i coder_server coder ssh Teste-codigo -- "echo '${b64}' | base64 -d | python3"`,
          { timeout: 15000 }
        ).toString();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ resultado: out.trim() || 'Executado sem saída.' }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ resultado: `Erro:\n${err.stderr ? err.stderr.toString() : err.message}` }));
      }
    });
  }
}).listen(3005, '0.0.0.0', () => console.log('Ponte Coder rodando na porta 3005'));
