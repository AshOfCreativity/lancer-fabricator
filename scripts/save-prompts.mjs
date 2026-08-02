const MODULE_ID = "lancer-fabricator-main";

const SAVE_TYPES = {
  hull: { path: "system.hull", label: "Hull" },
  agi:  { path: "system.agi",  label: "Agility" },
  sys:  { path: "system.sys",  label: "Systems" },
  eng:  { path: "system.eng",  label: "Engineering" }
};

/**
 * Post a save prompt card to chat. Works with tokens so duplicate
 * actors (e.g. three Archers) each get their own roll button.
 * Any player or GM can click to roll for tokens they own.
 */
export async function promptSave({ saveType, title, effect, targetTokenIds = [], dc }) {
  const save = SAVE_TYPES[saveType];
  if (!save) {
    ui.notifications.error(`Unknown save type: ${saveType}`);
    return null;
  }

  const scene = canvas.scene;
  if (!scene) {
    ui.notifications.warn("No active scene.");
    return null;
  }

  const targets = targetTokenIds
    .map(id => {
      const tokenDoc = scene.tokens.get(id);
      if (!tokenDoc) return null;
      const actor = tokenDoc.actor;
      if (!actor) return null;
      return {
        tokenId: id,
        sceneId: scene.id,
        actorId: actor.id,
        name: tokenDoc.name || actor.name,
        img: tokenDoc.texture?.src || actor.img || "icons/svg/mystery-man.svg",
        result: null
      };
    })
    .filter(Boolean);

  if (targets.length === 0) {
    ui.notifications.warn("No valid targets for save prompt.");
    return null;
  }

  const cardData = {
    saveType,
    saveLabel: save.label,
    title: title || `${save.label} Save`,
    effect: effect || "",
    dc: dc ?? 10,
    sceneId: scene.id,
    targets
  };

  const content = renderSaveCard(cardData);

  const msg = await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker(),
    flags: {
      [MODULE_ID]: {
        savePrompt: cardData
      }
    }
  });

  return msg;
}

function renderSaveCard(data) {
  const targetRows = data.targets.map(t => {
    const resultHTML = t.result
      ? renderResult(t.result)
      : `<button class="fabricator-save-roll-btn" data-token-id="${t.tokenId}" data-scene-id="${t.sceneId}" type="button">
           <i class="fas fa-dice-d20"></i> Roll ${data.saveLabel}
         </button>`;

    return `<div class="fabricator-save-target" data-token-id="${t.tokenId}">
      <img src="${t.img}" class="fabricator-save-portrait" alt="${escHTML(t.name)}" />
      <span class="fabricator-save-name">${escHTML(t.name)}</span>
      <span class="fabricator-save-action">${resultHTML}</span>
    </div>`;
  }).join("");

  return `<div class="fabricator-save-card">
    <div class="fabricator-save-header">
      <i class="fas fa-shield-alt"></i>
      <strong>${escHTML(data.title)}</strong>
      <span class="fabricator-save-dc">DC ${data.dc}</span>
    </div>
    ${data.effect ? `<div class="fabricator-save-effect">${data.effect}</div>` : ""}
    <div class="fabricator-save-targets">${targetRows}</div>
  </div>`;
}

function renderResult(result) {
  const cls = result.passed ? "fabricator-save-pass" : "fabricator-save-fail";
  const icon = result.passed ? "fa-check" : "fa-times";
  const label = result.passed ? "PASS" : "FAIL";
  return `<span class="${cls}">
    <i class="fas ${icon}"></i> ${label} (${result.total})
  </span>`;
}

/**
 * Resolve a token's actor from scene + token IDs.
 */
function resolveTokenActor(sceneId, tokenId) {
  const scene = game.scenes.get(sceneId);
  if (!scene) return null;
  const tokenDoc = scene.tokens.get(tokenId);
  if (!tokenDoc) return null;
  return tokenDoc.actor;
}

/**
 * Register the chat message listener for save roll buttons.
 * Call once during module ready.
 */
export function registerSavePromptListeners() {
  Hooks.on("renderChatMessage", (message, html) => {
    const saveData = message.getFlag(MODULE_ID, "savePrompt");
    if (!saveData) return;

    html.find(".fabricator-save-roll-btn").on("click", async (event) => {
      event.preventDefault();
      const btn = event.currentTarget;
      const tokenId = btn.dataset.tokenId;
      const sceneId = btn.dataset.sceneId;

      const actor = resolveTokenActor(sceneId, tokenId);
      if (!actor) {
        ui.notifications.error("Token or actor not found.");
        return;
      }

      if (!actor.isOwner) {
        ui.notifications.warn("You don't own this actor.");
        return;
      }

      const save = SAVE_TYPES[saveData.saveType];
      if (!save) return;

      const flowResult = await actor.beginStatFlow(save.path, saveData.title);

      if (flowResult === false) return;

      const lastRoll = findLastRollForActor(actor);
      const total = lastRoll?.total ?? null;
      const passed = total !== null ? total >= saveData.dc : null;

      const updatedData = foundry.utils.deepClone(saveData);
      const target = updatedData.targets.find(t => t.tokenId === tokenId);
      if (target && total !== null) {
        target.result = { total, passed };
        await message.update({
          content: renderSaveCard(updatedData),
          [`flags.${MODULE_ID}.savePrompt`]: updatedData
        });
      }
    });
  });
}

/**
 * Find the most recent roll for an actor from chat messages.
 */
function findLastRollForActor(actor) {
  const messages = game.messages.contents;
  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 5); i--) {
    const msg = messages[i];
    if (msg.rolls?.length > 0) {
      const speaker = msg.speaker;
      if (speaker?.actor === actor.id) {
        return msg.rolls[0];
      }
    }
  }
  return null;
}

/**
 * Show a dialog to configure and post a save prompt.
 * Collects targeted or selected tokens — each token gets its own entry.
 */
export async function showSavePromptDialog() {
  const saveOptions = Object.entries(SAVE_TYPES)
    .map(([key, val]) => `<option value="${key}">${val.label}</option>`)
    .join("");

  const tokenTargets = canvas.tokens?.controlled ?? [];
  const targetedTokens = [...game.user.targets];
  const allTokens = targetedTokens.length > 0 ? targetedTokens : tokenTargets;
  const actorRows = allTokens
    .filter(t => t.actor)
    .map(t => `<label class="fabricator-save-target-row">
        <input type="checkbox" name="target" value="${t.document.id}" checked />
        ${escHTML(t.document.name || t.actor.name)}
      </label>`)
    .join("");

  const noTargets = allTokens.length === 0
    ? `<p class="hint">Select or target tokens first.</p>`
    : "";

  return new Promise(resolve => {
    new Dialog({
      title: "Save Prompt",
      content: `
        <form class="fabricator-save-dialog">
          <div class="form-group">
            <label>Save Type</label>
            <select name="saveType">${saveOptions}</select>
          </div>
          <div class="form-group">
            <label>DC</label>
            <input type="number" name="dc" value="10" min="1" max="30" />
          </div>
          <div class="form-group">
            <label>Title (optional)</label>
            <input type="text" name="title" placeholder="e.g., Bombard's Payload" />
          </div>
          <div class="form-group">
            <label>On Fail</label>
            <input type="text" name="effect" placeholder="e.g., Knocked Prone and 2d6 explosive" />
          </div>
          <div class="form-group">
            <label>Targets</label>
            ${noTargets}
            <div class="fabricator-save-target-list">${actorRows}</div>
          </div>
        </form>
      `,
      buttons: {
        prompt: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Post Save",
          callback: async (html) => {
            const saveType = html.find('[name="saveType"]').val();
            const dc = parseInt(html.find('[name="dc"]').val()) || 10;
            const title = html.find('[name="title"]').val()?.trim() || "";
            const effect = html.find('[name="effect"]').val()?.trim() || "";
            const checked = html.find('[name="target"]:checked');
            const targetTokenIds = [];
            checked.each((_, el) => targetTokenIds.push(el.value));

            if (targetTokenIds.length === 0) {
              ui.notifications.warn("Select at least one target.");
              resolve(null);
              return;
            }

            const msg = await promptSave({ saveType, title, effect, targetTokenIds, dc });
            resolve(msg);
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "prompt",
      close: () => resolve(null)
    }).render(true);
  });
}

function escHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
