const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(`
    <html>
      <head><title>🌸 SAKURA CLUB テスト</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>🌸 SAKURA CLUB</h1>
        <h2>✅ Node.jsサーバー動作中！</h2>
        <p>時刻: ${new Date().toLocaleString('ja-JP')}</p>
        <p>アプリケーションは完成しています！</p>
      </body>
    </html>
  `);
});

const PORT = 3005;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`✅ ネットワーク: http://192.168.1.4:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ サーバーエラー:', err);
});