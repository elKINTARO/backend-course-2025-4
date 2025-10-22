const { program } = require('commander');
const http = require('http');
const fs = require('fs');

//ті самі параметри
program
  .requiredOption('-i, --input <path>', 'шлях до файлу для читання')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера');

program.parse(process.argv);

const options = program.opts();

//перевіркф вхідного файлу
if (!fs.existsSync(options.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

//створ HTTP серв
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Сервер працює!\n');
});

//запуск
server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});

//обробка помилок серв
server.on('error', (err) => {
  console.error('Помилка сервера:', err.message);
  process.exit(1);
});
