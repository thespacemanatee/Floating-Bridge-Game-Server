/* eslint-disable no-bitwise */
import Pusher from 'pusher';
import { CardSuit, CardValue, Card, Bid, PlayedCard, Trump } from '../models';

const hashCode = (s: string) =>
  s.split('').reduce((a, b) => {
    const c = (a << 5) - a + b.charCodeAt(0);
    return c & c;
  }, 0);

export const getUserColor = (id: string) =>
  `hsl(${hashCode(id) % 360},70%,60%)`;

export const groupBy = (items: any, key: any) =>
  items.reduce(
    (result: any, item: any) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item],
    }),
    {}
  );

export const getChannelUsers = async (
  pusher: Pusher,
  channelName: string
): Promise<[{ id: string }]> => {
  const res = await pusher.get({
    path: `/channels/${channelName}/users`,
  });
  if (res.status === 200) {
    const body: any = await res.json();
    return body.users;
  }
  return null;
};

const parseCardSuit = (suit: CardSuit) => {
  switch (suit) {
    case 'c':
      return 10;
    case 'd':
      return 100;
    case 'h':
      return 1000;
    case 's':
      return 10000;
    default:
      return 0;
  }
};

const parseCardValue = (value: CardValue) => {
  switch (value) {
    case 'j':
      return 11;
    case 'q':
      return 12;
    case 'k':
      return 13;
    case 'a':
      return 14;
    default:
      return parseInt(value, 10);
  }
};

export const parseCardTotalValue = (card: Card) =>
  parseCardSuit(card.suit) + parseCardValue(card.value);

export const isBidding = (bidSequence: Bid[]) => {
  if (bidSequence.length >= 4) {
    const lastIndex = bidSequence.length - 1;
    const k = lastIndex - 3;
    for (let i = lastIndex; i > k; i -= 1) {
      if (bidSequence[i]) {
        return true;
      }
    }
    return false;
  }
  return true;
};

export const getRoundWinner = (playedCards: PlayedCard[], trump: Trump) => {
  const originalSuit = playedCards[0].suit;
  playedCards.sort((a, b) => parseCardTotalValue(a) - parseCardTotalValue(b));
  const biggestTrump = playedCards.filter((card) => card.suit === trump).pop();
  if (biggestTrump) {
    return biggestTrump;
  }
  return playedCards.filter((card) => card.suit === originalSuit).pop();
};
