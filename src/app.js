import express from 'express';
import path from 'path';
import { handleInput } from './open-ai.js';
import { fileTest } from './open-ai-file.js';


const app = express();
const __dirname = path.dirname(new URL(import.meta.url).pathname);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/response.html');
});


app.get('/file-test', (req, res) => {
  fileTest()

  res.send('file test');
});

app.post('/', async (req, res, next) => {
  const conversation_history = req.body;
  try {
    const html = await handleInput(conversation_history);
    res.send(html);
  } catch (error) {
    next(error);
  }
});

app.listen(15000, () => {
  console.log(`
  ##     ## ##    ##     ######  ##     ##    ###    ########     ######   ########  ######## 
  ###   ###  ##  ##     ##    ## ##     ##   ## ##      ##       ##    ##  ##     ##    ##    
  #### ####   ####      ##       ##     ##  ##   ##     ##       ##        ##     ##    ##    
  ## ### ##    ##       ##       ######### ##     ##    ##       ##   #### ########     ##    
  ##     ##    ##       ##       ##     ## #########    ##       ##    ##  ##           ##    
  ##     ##    ##       ##    ## ##     ## ##     ##    ##       ##    ##  ##           ##    
  ##     ##    ##        ######  ##     ## ##     ##    ##        ######   ##           ##    
  `);
  console.log('Server listening on port 15000');
});
