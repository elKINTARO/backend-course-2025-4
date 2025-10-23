const { program } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const { XMLBuilder } = require('fast-xml-parser');
const url = require('url');
//всякі імпорти

//параметри які я юзаю в кр
program
  .requiredOption('-i, --input <path>', 'шлях до файлу для читання')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера');

program.parse(process.argv);

const options = program.opts();

//перевірка існування вхідного файлу
if (!fsSync.existsSync(options.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

//настройка хмл білдера
const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true
});

//вже сама функція читання і обробки жейсон
async function processRequest(queryParams) {
  try {
    //читання нашого нджейсон
    const data = await fs.readFile(options.input, 'utf-8');
    const lines = data.trim().split('\n');
    const passengers = lines.map(line => JSON.parse(line));

    //фільтрація згідно параметрів
    let filteredData = passengers;

    //фільтр виживших
    if (queryParams.survived === 'true') {
      filteredData = filteredData.filter(p => p.Survived === '1' || p.Survived === 1);
    }

    //формулювання результу
    const result = filteredData.map(passenger => {
      const passengerData = {
        name: passenger.Name,
        ticket: passenger.Ticket
      };

      //якщо вік=тру то виводимо 
      if (queryParams.age === 'true') {
        passengerData.age = passenger.Age;
      }

      return passengerData;
    });

    //формування хмл
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

//створення хттп серврера
const server = http.createServer(async (req, res) => {
  try {
    //парсимо урл і дістаємо параметри
    const parsedUrl = url.parse(req.url, true);
    const queryParams = parsedUrl.query;

    //обробка запиту та отримання хмл відп
    const xmlResponse = await processRequest(queryParams);

    //відправка відп
    res.writeHead(200, { 
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(xmlResponse);
  } catch (error) {
    //обробочка помилочок
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Помилка сервера: ${error.message}`);
    console.error('Помилка:', error);
  }
});

//запуск сервера та трошки інфи в консоль для юзера(мене)
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

//обробочка помилочок сервера
server.on('error', (err) => {
  console.error('Помилка сервера:', err.message);
  process.exit(1);
});