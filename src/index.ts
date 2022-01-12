import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import { gameRouter } from './routes/game';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(gameRouter);

app.get('/', (_, res) => {
  res.send(`Hello world at port ${port}!`);
});

app.listen(port);
