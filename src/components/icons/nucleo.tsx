import { createElement, type ComponentType, type SVGProps } from "react";
import { IconBallBasketFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBallBasketFillDuo18";
import { IconBallSoccerFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBallSoccerFillDuo18";
import { IconBombFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBombFillDuo18";
import { IconBrainFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBrainFillDuo18";
import { IconCarSideFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCarSideFillDuo18";
import { IconChefHatFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconChefHatFillDuo18";
import { IconDiceFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconDiceFillDuo18";
import { IconDoctorFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconDoctorFillDuo18";
import { IconDressFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconDressFillDuo18";
import { IconFireFlameFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconFireFlameFillDuo18";
import { IconFlagCheckeredFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconFlagCheckeredFillDuo18";
import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconGhostFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGhostFillDuo18";
import { IconGiftFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGiftFillDuo18";
import { IconMagnifierSparkleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMagnifierSparkleFillDuo18";
import { IconMobileFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMobileFillDuo18";
import { IconMovieFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMovieFillDuo18";
import { IconMusicFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMusicFillDuo18";
import { IconPaletteFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPaletteFillDuo18";
import { IconPersonJumpingRopeFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPersonJumpingRopeFillDuo18";
import { IconPuzzlePieceFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPuzzlePieceFillDuo18";
import { IconRocketFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconRocketFillDuo18";
import { IconShieldFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShieldFillDuo18";
import { IconSnowflakeFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconSnowflakeFillDuo18";
import { IconSparkleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconSparkleFillDuo18";
import { IconTargetFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTargetFillDuo18";
import { IconTimerFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTimerFillDuo18";
import { IconTrophyFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTrophyFillDuo18";
import { IconTruckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTruckFillDuo18";
import type { CategoryRow } from "@/lib/db-categories";

type CategoryIconData = Pick<CategoryRow, "name" | "slug">;

type NucleoIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; title?: string }>;

export function CategoryNucleoIcon({ category, className }: { category: CategoryIconData; className?: string }) {
  return createElement(getCategoryIcon(category), { className, "aria-hidden": "true" });
}

function getCategoryIcon(category: CategoryIconData): NucleoIcon {
  const text = `${category.name} ${category.slug}`.toLocaleLowerCase("tr");

  if (hasAny(text, ["noel-baba"])) return IconGiftFillDuo18;
  if (hasAny(text, ["noel", "christmas"])) return IconGiftFillDuo18;
  if (hasAny(text, ["cadilar", "halloween"])) return IconGhostFillDuo18;

  if (hasAny(text, ["2 players", "multiplayer", "kisilik", "cok-oyunculu"])) {
    return IconGamepadFillDuo18;
  }
  if (category.slug === "oyunlar" || hasAny(text, ["koleksiyon", "oyun-parcalari"])) return IconDiceFillDuo18;

  if (hasAny(text, ["formula", "karting", "race", "racing", "yaris", "ralli"])) return IconFlagCheckeredFillDuo18;
  if (hasAny(text, ["park-etme"])) return IconCarSideFillDuo18;
  if (hasAny(text, ["canavar-kamyon"])) return IconTruckFillDuo18;
  if (hasAny(text, ["4x4", "truck", "kamyon"])) return IconTruckFillDuo18;
  if (hasAny(text, ["car", "cars", "driving", "araba", "arabalar"])) return IconCarSideFillDuo18;
  if (hasAny(text, ["atv", "motosiklet", "motokros"])) return IconCarSideFillDuo18;
  if (hasAny(text, ["bisiklet"])) return IconCarSideFillDuo18;
  if (hasAny(text, ["kaykay"])) return IconPersonJumpingRopeFillDuo18;
  if (hasAny(text, ["sorf"])) return IconRocketFillDuo18;
  if (hasAny(text, ["tekne"])) return IconRocketFillDuo18;
  if (hasAny(text, ["gemi", "korsan"])) return IconRocketFillDuo18;
  if (hasAny(text, ["helikopter"])) return IconRocketFillDuo18;
  if (hasAny(text, ["fuze", "rocket"])) return IconRocketFillDuo18;
  if (hasAny(text, ["uzayli", "alien"])) return IconRocketFillDuo18;
  if (hasAny(text, ["star-wars", "spaceship"])) return IconRocketFillDuo18;

  if (hasAny(text, ["ok-ve-yay"])) return IconTargetFillDuo18;
  if (hasAny(text, ["kilic"])) return IconTargetFillDuo18;
  if (hasAny(text, ["yumruk", "boks"])) return IconTargetFillDuo18;
  if (hasAny(text, ["savas", "dunya-savasi", "tank", "silah", "tommy-gun", "metal-slug", "atis"])) return IconTargetFillDuo18;
  if (hasAny(text, ["dovus", "siddet", "kanli", "cinayet"])) return IconGhostFillDuo18;
  if (hasAny(text, ["aksiyon", "nisan", "fırlatma", "firlatma"])) {
    return IconTargetFillDuo18;
  }
  if (hasAny(text, ["savunma", "kale", "kule-savunma"])) return IconShieldFillDuo18;
  if (hasAny(text, ["hayatta-kalma"])) return IconShieldFillDuo18;
  if (hasAny(text, ["adventure", "superhero", "batman", "ben 10", "macera", "super-kahraman", "polis", "ninja", "power-rangers"])) {
    return IconShieldFillDuo18;
  }

  if (hasAny(text, ["against time", "time", "timer", "avoid", "zamana", "zaman", "sure", "hiz", "kacinma"])) {
    return IconTimerFillDuo18;
  }
  if (hasAny(text, ["kacis"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["kosu"])) return IconPersonJumpingRopeFillDuo18;
  if (hasAny(text, ["ziplama"])) return IconPersonJumpingRopeFillDuo18;
  if (hasAny(text, ["tikla-ve-oyna"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["toplama"])) return IconGamepadFillDuo18;

  if (hasAny(text, ["robot", "transformers", "bakugan"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["fantastik", "gizem", "ejderha", "dinozor"])) return IconSparkleFillDuo18;
  if (hasAny(text, ["angry", "bloody", "zombie", "monster", "ghost", "zombi", "canavar", "hayalet", "korku"])) {
    return IconGhostFillDuo18;
  }

  if (hasAny(text, ["futbol", "penalti"])) return IconBallSoccerFillDuo18;
  if (hasAny(text, ["basket"])) return IconBallBasketFillDuo18;
  if (hasAny(text, ["bilardo"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["golf"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["tenis"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["hokey"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["gures"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["top-oyunlari", "spor"])) return IconTrophyFillDuo18;

  if (hasAny(text, ["barbie", "giydirme", "moda"])) return IconDressFillDuo18;
  if (hasAny(text, ["makyaj", "guzellik"])) return IconDressFillDuo18;
  if (hasAny(text, ["pedikur"])) return IconDressFillDuo18;
  if (hasAny(text, ["kuafor"])) return IconDressFillDuo18;
  if (hasAny(text, ["tarak"])) return IconDressFillDuo18;
  if (hasAny(text, ["bakim"])) return IconSparkleFillDuo18;
  if (hasAny(text, ["bebek-giydirme"])) return IconDressFillDuo18;
  if (hasAny(text, ["baby", "bebek", "oyuncak-bebek", "child", "cocuk"])) {
    return IconGamepadFillDuo18;
  }

  if (hasAny(text, ["doktor", "ameliyat"])) return IconDoctorFillDuo18;
  if (hasAny(text, ["ambulans"])) return IconDoctorFillDuo18;
  if (hasAny(text, ["mask", "medical"])) return IconDoctorFillDuo18;
  if (hasAny(text, ["mutfak"])) return IconChefHatFillDuo18;
  if (hasAny(text, ["restoran"])) return IconChefHatFillDuo18;
  if (hasAny(text, ["yemek"])) return IconChefHatFillDuo18;
  if (hasAny(text, ["pizza"])) return IconChefHatFillDuo18;
  if (hasAny(text, ["alisveris"])) return IconTrophyFillDuo18;

  if (hasAny(text, ["anime", "manga", "movie", "movies", "film", "dizi", "simpsons", "spongebob", "naruto", "dragon-ball", "goku", "doraemon", "one-piece", "pokemon", "mario"])) {
    return IconMovieFillDuo18;
  }
  if (hasAny(text, ["animasyon", "cozum-videolu"])) return IconMovieFillDuo18;
  if (hasAny(text, ["hikaye"])) return IconMovieFillDuo18;

  if (hasAny(text, ["dans", "ritim"])) return IconMusicFillDuo18;
  if (hasAny(text, ["muzik", "sarkici"])) return IconMusicFillDuo18;
  if (hasAny(text, ["komik"])) return IconSparkleFillDuo18;
  if (hasAny(text, ["tiyatro"])) return IconMovieFillDuo18;

  if (hasAny(text, ["boyama"])) return IconPaletteFillDuo18;
  if (hasAny(text, ["resim-yapma"])) return IconPaletteFillDuo18;
  if (hasAny(text, ["kesme"])) return IconPaletteFillDuo18;
  if (hasAny(text, ["fare"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["gizli-nesne", "dedektif", "fark-bulma"])) return IconMagnifierSparkleFillDuo18;
  if (hasAny(text, ["goz", "eye"])) return IconMagnifierSparkleFillDuo18;

  if (hasAny(text, ["balance", "logic", "puzzle", "board", "card", "denge", "mantik", "bulmaca", "masa", "kart", "hafiza", "fark-bulma", "dusunme", "satranc"])) {
    if (hasAny(text, ["satranc"])) return IconPuzzlePieceFillDuo18;
    if (hasAny(text, ["kart", "solitaire"])) return IconPuzzlePieceFillDuo18;
    if (hasAny(text, ["matematik"])) return IconPuzzlePieceFillDuo18;
    if (hasAny(text, ["fizik"])) return IconPuzzlePieceFillDuo18;
    if (hasAny(text, ["denge"])) return IconPuzzlePieceFillDuo18;
    return IconPuzzlePieceFillDuo18;
  }
  if (hasAny(text, ["beceri", "platform", "pinball"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["chess", "strategy", "strateji", "matematik", "fizik", "yonetim", "simulasyon", "rol-yapma"])) {
    return IconBrainFillDuo18;
  }

  if (hasAny(text, ["balon"])) return IconBombFillDuo18;
  if (hasAny(text, ["bomba", "bomberman"])) return IconBombFillDuo18;
  if (hasAny(text, ["patlatma", "yikim"])) return IconFireFlameFillDuo18;
  if (hasAny(text, ["kar"])) return IconSnowflakeFillDuo18;
  if (hasAny(text, ["mevsim"])) return IconSnowflakeFillDuo18;
  if (hasAny(text, ["ciftlik", "inek", "koyun"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["hayvan", "ayi", "kurt", "yengec"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["mobil"])) return IconMobileFillDuo18;
  if (hasAny(text, ["3d"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["insa-etme"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["ilginç", "ilginc"])) return IconSparkleFillDuo18;
  if (hasAny(text, ["unlu", "kral", "crown", "king", "queen"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["classic", "popular", "trend", "klasik", "populer"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["winner", "trophy", "kazanan"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["flag", "bayrak"])) return IconTrophyFillDuo18;

  return IconGamepadFillDuo18;
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
