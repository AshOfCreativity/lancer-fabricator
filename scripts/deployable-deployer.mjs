import { deployToScene } from "./deployable-sheet.mjs";

const MODULE_ID = "lancer-fabricator-main";

export function registerDeployerHooks() {
  Hooks.on("renderActorSheet", (sheet, html) => {
    const actor = sheet.actor;
    if (!actor || (actor.type !== "mech" && actor.type !== "npc")) return;
    injectDeployButtons(html, actor);
  });
}

function injectDeployButtons(html, owner) {
  const cards = html.find(".deployable-wrapper.set");
  if (cards.length === 0) return;

  cards.each((_, card) => {
    const $card = $(card);
    const uuid = $card.attr("data-uuid");
    if (!uuid) return;

    if ($card.find(".fabricator-deploy-btn").length > 0) return;

    const $activations = $card.find(".deployable-activations");
    if ($activations.length === 0) return;

    const $btn = $(`<button type="button" class="fabricator-deploy-btn" title="Deploy to scene">
      <i class="fas fa-parachute-box"></i> Deploy
    </button>`);

    $btn.on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const depActor = await fromUuid(uuid);
      if (!depActor) {
        ui.notifications.warn("Deployable actor not found");
        return;
      }
      await deployToScene(depActor);
    });

    $activations.append($btn);
  });
}
