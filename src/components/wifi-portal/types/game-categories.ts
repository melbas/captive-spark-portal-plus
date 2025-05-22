
import { MiniGameData, GameType } from "../types";

export enum GameCategory {
  EDUCATIONAL = "educational",
  ENTERTAINMENT = "entertainment",
  COGNITIVE = "cognitive",
  CHALLENGE = "challenge"
}

export interface GameCategoryInfo {
  id: GameCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const GAME_CATEGORIES: GameCategoryInfo[] = [
  {
    id: GameCategory.EDUCATIONAL,
    name: "Éducatif",
    description: "Jeux qui stimulent l'apprentissage et les connaissances",
    icon: "brain",
    color: "blue"
  },
  {
    id: GameCategory.ENTERTAINMENT,
    name: "Divertissement",
    description: "Jeux détente pour le plaisir et la découverte",
    icon: "gamepad-2",
    color: "purple"
  },
  {
    id: GameCategory.COGNITIVE,
    name: "Cognitif",
    description: "Jeux qui stimulent la mémoire et la réflexion",
    icon: "lightbulb",
    color: "amber"
  },
  {
    id: GameCategory.CHALLENGE,
    name: "Défis",
    description: "Jeux qui testent vos réflexes et votre rapidité",
    icon: "zap",
    color: "green"
  }
];

export const getGameCategory = (gameType: GameType): GameCategory => {
  switch (gameType) {
    case GameType.MEMORY:
      return GameCategory.COGNITIVE;
    case GameType.QUIZ:
      return GameCategory.EDUCATIONAL;
    case GameType.PUZZLE:
      return GameCategory.COGNITIVE;
    case GameType.TAP:
      return GameCategory.CHALLENGE;
    default:
      return GameCategory.ENTERTAINMENT;
  }
};

export const getCategoryInfo = (category: GameCategory): GameCategoryInfo => {
  return GAME_CATEGORIES.find(c => c.id === category) || GAME_CATEGORIES[0];
};
