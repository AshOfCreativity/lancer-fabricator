const MODULE_ID = "lancer-fabricator-main";

export class CoreBonusApp extends Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "lancer-fabricator-core-bonuses",
      title: "Core Bonuses",
      template: `modules/${MODULE_ID}/templates/core-bonus-app.hbs`,
      classes: ["lancer", "fabricator-app", "fabricator-cb-app"],
      width: 380,
      height: "auto",
      resizable: true
    });
  }

  async getData() {
    const pilot = this.actor.system?.pilot?.value;
    const coreBonuses = (pilot?.itemTypes?.core_bonus ?? []).map(cb => ({
      id: cb.id,
      name: cb.name,
      effect: cb.system?.effect ?? "",
      mountedEffect: cb.system?.mounted_effect ?? "",
      manufacturer: cb.system?.manufacturer ?? "",
      img: cb.img || "icons/svg/upgrade.svg"
    }));

    return {
      actor: this.actor,
      pilotName: pilot?.name ?? "No pilot linked",
      coreBonuses,
      hasCoreBonuses: coreBonuses.length > 0
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".fabricator-cb-post").click(this._onPost.bind(this));
  }

  async _onPost(event) {
    event.preventDefault();
    const cbId = event.currentTarget.dataset.cbId;
    const pilot = this.actor.system?.pilot?.value;
    if (!pilot) return;
    const cb = pilot.items.get(cbId);
    if (!cb) return;

    const lines = [`<strong>${cb.name}</strong>`];
    if (cb.system?.manufacturer) lines.push(`<em>${cb.system.manufacturer}</em>`);
    if (cb.system?.effect) lines.push(`<p>${cb.system.effect}</p>`);
    if (cb.system?.mounted_effect) lines.push(`<p><strong>Mounted:</strong> ${cb.system.mounted_effect}</p>`);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="fabricator-cb-chat-card">${lines.join("")}</div>`
    });
  }
}
