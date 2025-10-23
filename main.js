const { program } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const { XMLBuilder } = require('fast-xml-parser');
const url = require('url');

// Налаштування параметрів командного рядка
program
  .requiredOption('-i, --input <path>', 'шлях до файлу для читання')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера');

program.parse(process.argv);

const options = program.opts();

// Перевірка існування вхідного файлу
if (!fsSync.existsSync(options.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

// Налаштування XML builder
const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true
});

// Функція для читання та обробки NDJSON
async function processRequest(queryParams) {
  try {
    // Читання NDJSON файлу (кожен рядок - окремий JSON)
    const data = await fs.readFile(options.input, 'utf-8');
    const lines = data.trim().split('\n');
    const passengers = lines.map(line => JSON.parse(line));

    // Фільтрація даних відповідно до параметрів
    let filteredData = passengers;

    // Фільтр: показувати лише тих, хто вижив
    if (queryParams.survived === 'true') {
      filteredData = filteredData.filter(p => p.Survived === '1' || p.Survived === 1);
    }

    // Формування результату
    const result = filteredData.map(passenger => {
      const passengerData = {
        name: passenger.Name,
        ticket: passenger.Ticket
      };

      // Додавання віку, якщо параметр age=true
      if (queryParams.age === 'true') {
        passengerData.age = passenger.Age;
      }

      return passengerData;
    });

    // Формування XML
    const xmlData = {
      passengers: {
        passenger: result
      }
    };

    return xmlBuilder.build(xmlData);
  } catch (error) {
    throw new Error(`Помилка обробки даних: ${error.message}`);
  }
}

// Створення HTTP сервера
const server = http.createServer(async (req, res) => {
  try {
    // Парсинг URL та query параметрів
    const parsedUrl = url.parse(req.url, true);
    const queryParams = parsedUrl.query;

    // Обробка запиту та отримання XML
    const xmlResponse = await processRequest(queryParams);

    // Відправка відповіді
    res.writeHead(200, { 
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } catch (error) {
    // Обробка помилок
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Помилка сервера: ${error.message}`);
    console.error('Помилка:', error);
  }
});

// Запуск сервера
server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  console.log(`Використовується файл: ${options.input}`);
  console.log('\nДоступні параметри запиту:');
  console.log('  ?survived=true - показати лише тих, хто вижив');
  console.log('  ?age=true - відобразити вік пасажирів');
  console.log('\nПриклади запитів:');
  console.log(`  http://${options.host}:${options.port}/`);
  console.log(`  http://${options.host}:${options.port}/?survived=true`);
  console.log(`  http://${options.host}:${options.port}/?survived=true&age=true`);
});

// Обробка помилок сервера
server.on('error', (err) => {
  console.error('Помилка сервера:', err.message);
  process.exit(1);
});