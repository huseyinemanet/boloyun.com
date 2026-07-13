import { createElement, type ComponentType, type SVGProps } from "react";
import {
  IconAirBaloonFillDuo18,
  IconAmbulanceFillDuo18,
  IconAtomFillDuo18,
  IconBabyClothesFillDuo18,
  IconBalanceFillDuo18,
  IconBallBasketFillDuo18,
  IconBallPool8FillDuo18,
  IconBallSoccerFillDuo18,
  IconBallTennisFillDuo18,
  IconBaloonFillDuo18,
  IconBombFillDuo18,
  IconBowFillDuo18,
  IconBowlFoodFillDuo18,
  IconBoxingGloveFillDuo18,
  IconBrainFillDuo18,
  IconCalculatorFillDuo18,
  IconCarSideFillDuo18,
  IconCardsFillDuo18,
  IconCartShoppingFillDuo18,
  IconChefHatFillDuo18,
  IconChessKnightFillDuo18,
  IconChildFillDuo18,
  IconCircleMusicNoteFillDuo18,
  IconClapperboardPlayFillDuo18,
  IconCloudSnowFillDuo18,
  IconColorPaletteFillDuo18,
  IconCombFillDuo18,
  IconCrownFillDuo18,
  IconDiceFillDuo18,
  IconDoctorFillDuo18,
  IconDressFillDuo18,
  IconEyeOpenFillDuo18,
  IconFaceLaughingFillDuo18,
  IconFaceRobotFillDuo18,
  IconFireFlameFillDuo18,
  IconFlag2FillDuo18,
  IconFlagCheckeredFillDuo18,
  IconGamepadFillDuo18,
  IconGhostFillDuo18,
  IconGiftFillDuo18,
  IconGolfFlagFillDuo18,
  IconHandPointerFillDuo18,
  IconHatSantaFillDuo18,
  IconHelicopterFillDuo18,
  IconHorseHeadFillDuo18,
  IconHouseShieldFillDuo18,
  IconKeyboardMouseFillDuo18,
  IconKnifeForkFillDuo18,
  IconLipstickFillDuo18,
  IconMagicWandSparkleFillDuo18,
  IconMagnifierSparkleFillDuo18,
  IconMedicalMaskFillDuo18,
  IconMobileFillDuo18,
  IconMovieFillDuo18,
  IconMusicFillDuo18,
  IconNailFillDuo18,
  IconPaletteFillDuo18,
  IconPersonJumpingRopeFillDuo18,
  IconPizzaSliceFillDuo18,
  IconPuzzlePieceFillDuo18,
  IconRankingStarFillDuo18,
  IconRocketFillDuo18,
  IconSailboatFillDuo18,
  IconScissorsCombFillDuo18,
  IconScissorsFillDuo18,
  IconShieldFillDuo18,
  IconShipFillDuo18,
  IconSkateboardingFillDuo18,
  IconSkullFillDuo18,
  IconSnowflakeFillDuo18,
  IconSpaceshipFillDuo18,
  IconSparkleFillDuo18,
  IconSteeringWheelFillDuo18,
  IconSwordFillDuo18,
  IconTargetFillDuo18,
  IconTheatreMaskFillDuo18,
  IconTimerFillDuo18,
  IconTouchClickFillDuo18,
  IconTreeFillDuo18,
  IconTrophyFillDuo18,
  IconTruckFillDuo18,
  IconUserAlienFillDuo18,
  IconWaterSurfaceFillDuo18,
} from "nucleo-ui-fill-duo-18";
import type { CategoryRow } from "@/lib/db-categories";

type NucleoIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; title?: string }>;

export function CategoryNucleoIcon({ category, className }: { category: CategoryRow; className?: string }) {
  return createElement(getCategoryIcon(category), { className, "aria-hidden": "true" });
}

function getCategoryIcon(category: CategoryRow): NucleoIcon {
  const text = `${category.name} ${category.slug}`.toLocaleLowerCase("tr");

  if (hasAny(text, ["noel-baba"])) return IconHatSantaFillDuo18;
  if (hasAny(text, ["noel", "christmas"])) return IconGiftFillDuo18;
  if (hasAny(text, ["cadilar", "halloween"])) return IconGhostFillDuo18;

  if (hasAny(text, ["2 players", "multiplayer", "kisilik", "cok-oyunculu"])) {
    return IconGamepadFillDuo18;
  }
  if (category.slug === "oyunlar" || hasAny(text, ["koleksiyon", "oyun-parcalari"])) return IconDiceFillDuo18;

  if (hasAny(text, ["formula", "karting", "race", "racing", "yaris", "ralli"])) return IconFlagCheckeredFillDuo18;
  if (hasAny(text, ["park-etme"])) return IconSteeringWheelFillDuo18;
  if (hasAny(text, ["canavar-kamyon"])) return IconTruckFillDuo18;
  if (hasAny(text, ["4x4", "truck", "kamyon"])) return IconTruckFillDuo18;
  if (hasAny(text, ["car", "cars", "driving", "araba", "arabalar"])) return IconCarSideFillDuo18;
  if (hasAny(text, ["atv", "motosiklet", "motokros"])) return IconSteeringWheelFillDuo18;
  if (hasAny(text, ["bisiklet"])) return IconSteeringWheelFillDuo18;
  if (hasAny(text, ["kaykay"])) return IconSkateboardingFillDuo18;
  if (hasAny(text, ["sorf"])) return IconWaterSurfaceFillDuo18;
  if (hasAny(text, ["tekne"])) return IconSailboatFillDuo18;
  if (hasAny(text, ["gemi", "korsan"])) return IconShipFillDuo18;
  if (hasAny(text, ["helikopter"])) return IconHelicopterFillDuo18;
  if (hasAny(text, ["fuze", "rocket"])) return IconRocketFillDuo18;
  if (hasAny(text, ["uzayli", "alien"])) return IconUserAlienFillDuo18;
  if (hasAny(text, ["star-wars", "spaceship"])) return IconSpaceshipFillDuo18;

  if (hasAny(text, ["ok-ve-yay"])) return IconBowFillDuo18;
  if (hasAny(text, ["kilic"])) return IconSwordFillDuo18;
  if (hasAny(text, ["yumruk", "boks"])) return IconBoxingGloveFillDuo18;
  if (hasAny(text, ["savas", "dunya-savasi", "tank", "silah", "tommy-gun", "metal-slug", "atis"])) return IconTargetFillDuo18;
  if (hasAny(text, ["dovus", "siddet", "kanli", "cinayet"])) return IconSkullFillDuo18;
  if (hasAny(text, ["aksiyon", "nisan", "fırlatma", "firlatma"])) {
    return IconTargetFillDuo18;
  }
  if (hasAny(text, ["savunma", "kale", "kule-savunma"])) return IconHouseShieldFillDuo18;
  if (hasAny(text, ["hayatta-kalma"])) return IconShieldFillDuo18;
  if (hasAny(text, ["adventure", "superhero", "batman", "ben 10", "macera", "super-kahraman", "polis", "ninja", "power-rangers"])) {
    return IconShieldFillDuo18;
  }

  if (hasAny(text, ["against time", "time", "timer", "avoid", "zamana", "zaman", "sure", "hiz", "kacinma"])) {
    return IconTimerFillDuo18;
  }
  if (hasAny(text, ["kacis"])) return IconTouchClickFillDuo18;
  if (hasAny(text, ["kosu"])) return IconPersonJumpingRopeFillDuo18;
  if (hasAny(text, ["ziplama"])) return IconPersonJumpingRopeFillDuo18;
  if (hasAny(text, ["tikla-ve-oyna"])) return IconHandPointerFillDuo18;
  if (hasAny(text, ["toplama"])) return IconHandPointerFillDuo18;

  if (hasAny(text, ["robot", "transformers", "bakugan"])) return IconFaceRobotFillDuo18;
  if (hasAny(text, ["fantastik", "gizem", "ejderha", "dinozor"])) return IconSparkleFillDuo18;
  if (hasAny(text, ["angry", "bloody", "zombie", "monster", "ghost", "zombi", "canavar", "hayalet", "korku"])) {
    return IconGhostFillDuo18;
  }

  if (hasAny(text, ["futbol", "penalti"])) return IconBallSoccerFillDuo18;
  if (hasAny(text, ["basket"])) return IconBallBasketFillDuo18;
  if (hasAny(text, ["bilardo"])) return IconBallPool8FillDuo18;
  if (hasAny(text, ["golf"])) return IconGolfFlagFillDuo18;
  if (hasAny(text, ["tenis"])) return IconBallTennisFillDuo18;
  if (hasAny(text, ["hokey"])) return IconBallPool8FillDuo18;
  if (hasAny(text, ["gures"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["top-oyunlari", "spor"])) return IconBallPool8FillDuo18;

  if (hasAny(text, ["barbie", "giydirme", "moda"])) return IconDressFillDuo18;
  if (hasAny(text, ["makyaj", "guzellik"])) return IconLipstickFillDuo18;
  if (hasAny(text, ["pedikur"])) return IconNailFillDuo18;
  if (hasAny(text, ["kuafor"])) return IconScissorsCombFillDuo18;
  if (hasAny(text, ["tarak"])) return IconCombFillDuo18;
  if (hasAny(text, ["bakim"])) return IconSparkleFillDuo18;
  if (hasAny(text, ["bebek-giydirme"])) return IconBabyClothesFillDuo18;
  if (hasAny(text, ["baby", "bebek", "oyuncak-bebek", "child", "cocuk"])) {
    return IconChildFillDuo18;
  }

  if (hasAny(text, ["doktor", "ameliyat"])) return IconDoctorFillDuo18;
  if (hasAny(text, ["ambulans"])) return IconAmbulanceFillDuo18;
  if (hasAny(text, ["mask", "medical"])) return IconMedicalMaskFillDuo18;
  if (hasAny(text, ["mutfak"])) return IconChefHatFillDuo18;
  if (hasAny(text, ["restoran"])) return IconKnifeForkFillDuo18;
  if (hasAny(text, ["yemek"])) return IconBowlFoodFillDuo18;
  if (hasAny(text, ["pizza"])) return IconPizzaSliceFillDuo18;
  if (hasAny(text, ["alisveris"])) return IconCartShoppingFillDuo18;

  if (hasAny(text, ["anime", "manga", "movie", "movies", "film", "dizi", "simpsons", "spongebob", "naruto", "dragon-ball", "goku", "doraemon", "one-piece", "pokemon", "mario"])) {
    return IconMovieFillDuo18;
  }
  if (hasAny(text, ["animasyon", "cozum-videolu"])) return IconClapperboardPlayFillDuo18;
  if (hasAny(text, ["hikaye"])) return IconMovieFillDuo18;

  if (hasAny(text, ["dans", "ritim"])) return IconCircleMusicNoteFillDuo18;
  if (hasAny(text, ["muzik", "sarkici"])) return IconMusicFillDuo18;
  if (hasAny(text, ["komik"])) return IconFaceLaughingFillDuo18;
  if (hasAny(text, ["tiyatro"])) return IconTheatreMaskFillDuo18;

  if (hasAny(text, ["boyama"])) return IconColorPaletteFillDuo18;
  if (hasAny(text, ["resim-yapma"])) return IconPaletteFillDuo18;
  if (hasAny(text, ["kesme"])) return IconScissorsFillDuo18;
  if (hasAny(text, ["fare"])) return IconKeyboardMouseFillDuo18;
  if (hasAny(text, ["gizli-nesne", "dedektif", "fark-bulma"])) return IconMagnifierSparkleFillDuo18;
  if (hasAny(text, ["goz", "eye"])) return IconEyeOpenFillDuo18;

  if (hasAny(text, ["balance", "logic", "puzzle", "board", "card", "denge", "mantik", "bulmaca", "masa", "kart", "hafiza", "fark-bulma", "dusunme", "satranc"])) {
    if (hasAny(text, ["satranc"])) return IconChessKnightFillDuo18;
    if (hasAny(text, ["kart", "solitaire"])) return IconCardsFillDuo18;
    if (hasAny(text, ["matematik"])) return IconCalculatorFillDuo18;
    if (hasAny(text, ["fizik"])) return IconAtomFillDuo18;
    if (hasAny(text, ["denge"])) return IconBalanceFillDuo18;
    return IconPuzzlePieceFillDuo18;
  }
  if (hasAny(text, ["beceri", "platform", "pinball"])) return IconGamepadFillDuo18;
  if (hasAny(text, ["chess", "strategy", "strateji", "matematik", "fizik", "yonetim", "simulasyon", "rol-yapma"])) {
    return IconBrainFillDuo18;
  }

  if (hasAny(text, ["balon"])) return IconBaloonFillDuo18;
  if (hasAny(text, ["bomba", "bomberman"])) return IconBombFillDuo18;
  if (hasAny(text, ["patlatma", "yikim"])) return IconFireFlameFillDuo18;
  if (hasAny(text, ["kar"])) return IconSnowflakeFillDuo18;
  if (hasAny(text, ["mevsim"])) return IconCloudSnowFillDuo18;
  if (hasAny(text, ["ciftlik", "inek", "koyun"])) return IconHorseHeadFillDuo18;
  if (hasAny(text, ["hayvan", "ayi", "kurt", "yengec"])) return IconChildFillDuo18;
  if (hasAny(text, ["mobil"])) return IconMobileFillDuo18;
  if (hasAny(text, ["3d"])) return IconAirBaloonFillDuo18;
  if (hasAny(text, ["insa-etme"])) return IconTreeFillDuo18;
  if (hasAny(text, ["ilginç", "ilginc"])) return IconMagicWandSparkleFillDuo18;
  if (hasAny(text, ["unlu", "kral", "crown", "king", "queen"])) return IconCrownFillDuo18;
  if (hasAny(text, ["classic", "popular", "trend", "klasik", "populer"])) return IconRankingStarFillDuo18;
  if (hasAny(text, ["winner", "trophy", "kazanan"])) return IconTrophyFillDuo18;
  if (hasAny(text, ["flag", "bayrak"])) return IconFlag2FillDuo18;

  return IconGamepadFillDuo18;
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
