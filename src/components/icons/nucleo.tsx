import { createElement, type ComponentType, type SVGProps } from "react";
import {
  IconBallPool8FillDuo18,
  IconBallSoccerFillDuo18,
  IconBrainFillDuo18,
  IconCarSideFillDuo18,
  IconChildFillDuo18,
  IconCrownFillDuo18,
  IconFireFlameFillDuo18,
  IconFlagCheckeredFillDuo18,
  IconGamepadFillDuo18,
  IconGhostFillDuo18,
  IconMovieFillDuo18,
  IconPuzzlePieceFillDuo18,
  IconRankingStarFillDuo18,
  IconShieldFillDuo18,
  IconSparkleFillDuo18,
  IconSteeringWheelFillDuo18,
  IconTargetFillDuo18,
  IconTheatreMaskFillDuo18,
  IconTimerFillDuo18,
  IconTrophyFillDuo18,
} from "nucleo-ui-fill-duo-18";
import type { CategoryRow } from "@/lib/db-categories";

type NucleoIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; title?: string }>;

export function CategoryNucleoIcon({ category, className }: { category: CategoryRow; className?: string }) {
  return createElement(getCategoryIcon(category), { className, "aria-hidden": "true" });
}

function getCategoryIcon(category: CategoryRow): NucleoIcon {
  const text = `${category.name} ${category.slug}`.toLocaleLowerCase("tr");

  if (hasAny(text, ["2 players", "multiplayer", "collection", "collections", "kisilik", "cok-oyunculu", "koleksiyon"])) {
    return IconGamepadFillDuo18;
  }
  if (hasAny(text, ["3d", "action", "shoot", "aim", "battle", "fighting", "aksiyon", "atis", "nisan", "savas", "dovus", "yumruk", "silah"])) {
    return IconTargetFillDuo18;
  }
  if (hasAny(text, ["adventure", "superhero", "batman", "ben 10", "macera", "super-kahraman", "polis", "ninja"])) {
    return IconShieldFillDuo18;
  }
  if (hasAny(text, ["against time", "time", "timer", "avoid", "zamana", "zaman", "sure", "hiz", "kacinma"])) {
    return IconTimerFillDuo18;
  }
  if (hasAny(text, ["alien", "robot", "uzayli", "fantastik", "gizem"])) return IconSparkleFillDuo18;
  if (hasAny(text, ["angry", "bloody", "zombie", "monster", "ghost", "zombi", "canavar", "hayalet", "kanli", "korku"])) {
    return IconGhostFillDuo18;
  }
  if (hasAny(text, ["animal", "baby", "barbie", "beauty", "caring", "child", "hayvan", "bebek", "guzellik", "bakim", "cocuk", "giydirme", "makyaj", "moda"])) {
    return IconChildFillDuo18;
  }
  if (hasAny(text, ["anime", "manga", "movie", "movies", "film", "dizi", "simpsons", "spongebob", "star-wars", "naruto", "dragon-ball"])) {
    return IconMovieFillDuo18;
  }
  if (hasAny(text, ["balance", "logic", "puzzle", "board", "card", "denge", "mantik", "bulmaca", "masa", "kart", "hafiza", "fark-bulma", "dusunme", "satranc"])) {
    return IconPuzzlePieceFillDuo18;
  }
  if (hasAny(text, ["balloon", "bomb", "blow up", "balon", "bomba", "patlatma", "yikim"])) return IconFireFlameFillDuo18;
  if (hasAny(text, ["bike", "bicycle", "bisiklet", "motosiklet", "motokros", "atv", "kaykay", "sorf"])) {
    return IconSteeringWheelFillDuo18;
  }
  if (hasAny(text, ["car", "cars", "racing", "driving", "araba", "arabalar", "yaris", "park", "karting", "formula"])) {
    return IconCarSideFillDuo18;
  }
  if (hasAny(text, ["football", "soccer", "futbol"])) return IconBallSoccerFillDuo18;
  if (hasAny(text, ["sport", "sports", "basket", "pool", "tennis", "spor", "tenis", "hokey", "golf"])) {
    return IconBallPool8FillDuo18;
  }
  if (hasAny(text, ["chess", "strategy", "strateji", "matematik", "fizik", "yonetim", "simulasyon", "rol-yapma"])) {
    return IconBrainFillDuo18;
  }
  if (hasAny(text, ["crown", "king", "queen", "kral", "unlu"])) return IconCrownFillDuo18;
  if (hasAny(text, ["classic", "popular", "trend", "klasik", "populer", "noel", "cadilar"])) return IconRankingStarFillDuo18;
  if (hasAny(text, ["race", "rally", "ralli"])) return IconFlagCheckeredFillDuo18;
  if (hasAny(text, ["theatre", "theater", "tiyatro"])) return IconTheatreMaskFillDuo18;
  if (hasAny(text, ["winner", "trophy", "kazanan", "gures"])) return IconTrophyFillDuo18;

  return IconGamepadFillDuo18;
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
