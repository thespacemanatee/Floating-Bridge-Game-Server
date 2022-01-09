import { groupBy } from "../utils";

type CardSuit = "c" | "d" | "h" | "s";
type CardValue =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "j"
  | "q"
  | "k"
  | "a";

type Card = {
  suit: CardSuit;
  value: CardValue;
};

const suits: CardSuit[] = ["c", "d", "h", "s"];

const values: CardValue[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "j",
  "q",
  "k",
  "a",
];

const getDeck = () => {
  const deck: Card[] = [];
  suits.forEach((suit) => {
    values.forEach((value) => {
      deck.push({ suit, value });
    });
  });
  return deck;
};

const shuffleDeck = (deck: Card[]) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }
};

const isValidHand = (hand: Card[]) => {
  let points = 0;
  hand.forEach((card) => {
    switch (card.value) {
      case "a": {
        points += 4;
      }
      case "k": {
        points += 3;
      }
      case "q": {
        points += 2;
      }
      case "j": {
        points += 1;
      }
    }
  });
  Object.values(groupBy(hand, "suit")).forEach((suit: Card[]) => {
    if (suit.length >= 5) points += 1;
  });
  return points >= 4;
};

const allHandsValid = (hands: Card[][]) => {
  let valid = true;
  hands.forEach((hand) => {
    valid = valid && isValidHand(hand);
  });
  return valid;
};

const getHands = (deck: Card[]) => {
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < deck.length; i += 4) {
    for (let j = 0; j < 4; j++) {
      hands[j].push(deck[i + j]);
    }
  }
  return hands;
};

export const getValidHands = () => {
  const deck = getDeck();
  let hands;
  let valid = false;
  while (!valid) {
    shuffleDeck(deck);
    hands = getHands(deck);
    valid = allHandsValid(hands);
  }
  return hands;
};

export const assignHandsToPlayers = (
  users: { id: string }[],
  hands: Card[][]
) => {
  return hands.map((hand, idx) => ({
    id: users[idx].id,
    hand,
  }));
};
