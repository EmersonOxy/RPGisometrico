import type { Engine } from "../core/Engine";
import { icon, gem, portrait } from "./Icons";
import { esc, itemSlot, gameButton } from "./Components";
import { classRegistry } from "../data/classes";
import { jewelRegistry } from "../data/jewels";
import { classRequirement, playerLevel } from "../progression/ClassUnlocks";
export function shopView(e: Engine) {
  return (
    '<section class="merchant-desk"><header class="screen-heading"><div><small>Acampamento dos viajantes</small><h2>A Tenda dos Caminhos</h2></div><p class="merchant-wallet">' +
    icon("coin") +
    e.meta.silver +
    " prata " +
    icon("fortune") +
    e.meta.gold +
    ' ouro</p></header><div class="merchant-layout"><section class="stock-cloth"><div class="merchant-mark">' +
    icon("merchant") +
    '<p>“Leve apenas o que lhe ajudar<br>a voltar com uma história.”</p></div><h3>Sobre o balcão <small>18 prata cada</small></h3><div class="stock-grid">' +
    e.shop
      .stock()
      .map(
        (i) =>
          '<button class="stock-item" data-action="buy" data-id="' +
          i.baseId +
          '" data-tip="stock:' +
          i.baseId +
          '" aria-label="Comprar ' +
          esc(i.name) +
          '">' +
          icon(i.baseId) +
          "<span>" +
          i.name +
          "</span><small>18 prata</small></button>",
      )
      .join("") +
    '</div><h3>Pedras de vínculo <small>1 ouro cada</small></h3><div class="shop-gems">' +
    Object.values(jewelRegistry)
      .map(
        (j) =>
          '<button data-action="buy" data-id="' +
          j.id +
          '" data-tip="jewel:' +
          j.id +
          '" aria-label="Comprar ' +
          j.name +
          '">' +
          gem(j.id) +
          "</button>",
      )
      .join("") +
    "</div>" +
    gameButton(icon("potion") + "Restaurar grupo · 8 prata", "buy", "potion") +
    '</section><section class="recruit-paper"><h3>Companheiros de estrada</h3><p>Um pacto persiste. Uma vida, não.</p><div class="recruit-roster">' +
    Object.values(classRegistry)
      .map(
        (cls) =>
          '<div class="recruit-token">' +
          portrait(cls.id) +
          "<div><h4>" +
          cls.name +
          "</h4><small>" +
          cls.resource +
          "</small>" +
          gameButton(
            e.meta.unlockedClasses.includes(cls.id)
              ? "Recrutar · 35 prata"
              : `Nível ${classRequirement(e.meta,cls.id).level} · Comprar classe · ${classRequirement(e.meta,cls.id).silver} prata`,
            e.meta.unlockedClasses.includes(cls.id) ? "recruit" : "unlock",
            cls.id,
            !e.meta.unlockedClasses.includes(cls.id) && (playerLevel(e.run) < classRequirement(e.meta,cls.id).level || e.meta.silver < classRequirement(e.meta,cls.id).silver) ? "disabled" : "",
          ) +
          "</div></div>",
      )
      .join("") +
    '</div></section></div><footer class="merchant-sale"><span>Oferecer seus achados</span><div>' +
    e.run.inventory
      .map((i, index) => itemSlot(i, index, false, "sell"))
      .join("") +
    (!e.run.inventory.length ? "<small>Sua mochila está vazia.</small>" : "") +
    "</div><small>Clique em um item para vender.</small></footer></section>"
  );
}
