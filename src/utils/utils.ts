import Pusher from "pusher";
import { CardSuit, CardValue, Card } from "../models";

const hashCode = (s: string) =>
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

export const getUserColor = (id: string) =>
  "hsl(" + (hashCode(id) % 360) + ",70%,60%)";

export const groupBy = (items: any, key: any) =>
  items.reduce(
    (result: any, item: any) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item],
    }),
    {}
  );

export const getChannelUsers = async (pusher: Pusher, channelName: string) => {
  const res = await pusher.get({
    path: `/channels/${channelName}/users`,
  });
  if (res.status === 200) {
    const body: any = await res.json();
    return body.users;
  }
};

const parseCardSuit = (suit: CardSuit) => {
  switch (suit) {
    case "c":
      return 10;
    case "d":
      return 100;
    case "h":
      return 1000;
    case "s":
      return 10000;
  }
};

const parseCardValue = (value: CardValue) => {
  switch (value) {
    case "j":
      return 11;
    case "q":
      return 12;
    case "k":
      return 13;
    case "a":
      return 14;
    default:
      return parseInt(value);
  }
};

export const parseCardTotalValue = (card: Card) =>
  parseCardSuit(card.suit) + parseCardValue(card.value);
