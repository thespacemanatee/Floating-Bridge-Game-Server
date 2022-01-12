import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

// eslint-disable-next-line import/first
import { pusherRouter, gameRouter } from './routes';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(pusherRouter);
app.use(gameRouter);

app.get('/', (_, res) => {
  res.send(`Hello world at port ${port}!`);
});

app.listen(port);
