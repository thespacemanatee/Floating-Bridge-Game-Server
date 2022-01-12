import { Collection, MongoClient } from 'mongodb';

export const collections: {
  rooms?: Collection;
  games?: Collection;
} = {};

export async function connectToDatabase() {
  const client = new MongoClient(process.env.MONGO_URI);

  await client.connect();

  const db = client.db(process.env.DB_NAME);

  const gamesCollection: Collection = db.collection(
    process.env.GAMES_COLLECTION_NAME
  );

  collections.games = gamesCollection;
}
