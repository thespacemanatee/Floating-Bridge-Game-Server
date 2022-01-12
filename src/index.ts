/* eslint-disable import/first */
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

import { pusherRouter, gamesRouter } from './routes';
import { connectToDatabase } from './services/database.service';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.get('/', (_, res) => {
  res.send(`Hello world at port ${port}!`);
});

connectToDatabase()
  .then(() => {
    app.use('/pusher', pusherRouter);
    app.use('/games', gamesRouter);
    app.listen(port, () => {
      console.log(`Server started at port ${port}!`);
    });
  })
  .catch((error: Error) => {
    console.error('Database connection failed', error);
    process.exit();
  });
