/**
 * Metavault Bridge - ingest Project Metavault "foundry bundle" exports
 * and seed Foundry actors from them.
 *
 * Bundle shape (see Project-Metavault/modules/mission-planning/fieldwork/
 * foundry_export.js):
 *   {
 *     format: "metavault-foundry-bundle",
 *     version: 1,
 *     sourceApp: "project-metavault",
 *     exportedAt: ISO,
 *     dossier: { name, tier, description, category, socials, secrets, databank },
 *     npcs:    [{ name, role, tier, classId, className, templates, baseFeatures,
 *                 optionalFeatures, currentFeatures, stats, notes, portrait }],
 *     lcpData: { npc_classes, npc_features, npc_templates }  // optional
 *   }
 *
 * Minimum viable path: file picker -> JSON parse -> build NPC actors with
 * notes, tier, size, and a plain-text feature dump on each. Stretch path:
 * paste a URL -> fetch -> import.
 *
 * NPC actors are created with just enough schema that LANCER's own sheet
 * will open them cleanly. Users layer compendium features in after.
 */

const MODULE_ID = "lancer-fabricator-main";
const BUNDLE_FORMAT = "metavault-foundry-bundle";

/**
 * Validate that a parsed object is a Metavault bundle we recognize.
 * Throws with a human-readable message on mismatch.
 */
function assertBundle(obj) {
  if (!obj || typeof obj !== "object") {
    throw new Error("Not a JSON object.");
  }
  if (obj.format !== BUNDLE_FORMAT) {
    throw new Error(`Not a Metavault bundle (format=${obj.format ?? "missing"}).`);
  }
  if (!Array.isArray(obj.npcs)) {
    throw new Error("Bundle has no npcs array.");
  }
}

/**
 * Open the Seed-from-Metavault dialog. Lets the user pick a .json bundle
 * from disk or fetch one by URL.
 */
export function showMetavaultImportDialog() {
  const content = `
    <div class="fab-metavault-import">
      <p class="fab-mv-intro">Seed Foundry NPC actors from a Project Metavault dossier bundle.</p>
      <div class="fab-mv-section">
        <label><strong>From file</strong></label>
        <input type="file" name="bundle-file" accept=".json,application/json" />
      </div>
      <div class="fab-mv-section">
        <label><strong>Or from URL</strong></label>
        <input type="text" name="bundle-url" placeholder="https://metavault.example.com/dossier/export.json" style="width:100%;" />
        <p class="fab-mv-hint" style="font-size:12px;color:#888;margin-top:4px;">Metavault must serve the bundle JSON at a URL this browser can reach.</p>
      </div>
      <div class="fab-mv-section">
        <label><input type="checkbox" name="create-folder" checked /> Put created actors in a folder named after the dossier</label>
      </div>
      <div class="fab-mv-section">
        <label><input type="checkbox" name="emit-chat-card" checked /> Post a chat card summary when done</label>
      </div>
    </div>
  `;

  new Dialog({
    title: "Seed from Metavault",
    content,
    buttons: {
      import: {
        icon: '<i class="fas fa-file-import"></i>',
        label: "Import",
        callback: async (html) => {
          const fileInput = html.find('input[name="bundle-file"]')[0];
          const urlInput = html.find('input[name="bundle-url"]').val().trim();
          const createFolder = html.find('input[name="create-folder"]').prop("checked");
          const emitChat = html.find('input[name="emit-chat-card"]').prop("checked");

          try {
            let bundle = null;
            if (fileInput?.files?.length) {
              const text = await fileInput.files[0].text();
              bundle = JSON.parse(text);
            } else if (urlInput) {
              bundle = await fetchFromUrl(urlInput);
            } else {
              ui.notifications.warn("Pick a file or enter a URL.");
              return;
            }
            await importBundle(bundle, { createFolder, emitChat });
          } catch (err) {
            console.error(`${MODULE_ID} | Metavault import failed`, err);
            ui.notifications.error(`Metavault import failed: ${err.message}`);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "import"
  }, {
    width: 520,
    classes: ["lancer", "fab-metavault-import-dialog"]
  }).render(true);
}

/**
 * Fetch a bundle JSON from a URL.
 * @param {string} url
 * @returns {Promise<Object>}
 */
export async function fetchFromUrl(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Create actors from a parsed bundle.
 * @param {Object} bundle
 * @param {Object} [options]
 * @param {boolean} [options.createFolder=true]
 * @param {boolean} [options.emitChat=true]
 * @returns {Promise<{actors: Actor[], folder: Folder|null}>}
 */
export async function importBundle(bundle, options = {}) {
  assertBundle(bundle);

  const createFolder = options.createFolder !== false;
  const emitChat = options.emitChat !== false;
  const dossierName = bundle.dossier?.name || "Metavault Dossier";

  let folder = null;
  if (createFolder) {
    folder = await Folder.create({
      name: dossierName,
      type: "Actor",
      color: "#8a6a3d"
    });
  }

  const actors = [];
  for (const npc of bundle.npcs) {
    try {
      const actor = await buildNpcActor(npc, bundle, folder);
      if (actor) actors.push(actor);
    } catch (err) {
      console.error(`${MODULE_ID} | Failed to create NPC "${npc?.name}"`, err);
      ui.notifications.warn(`Skipped NPC "${npc?.name ?? "unknown"}": ${err.message}`);
    }
  }

  ui.notifications.info(`Seeded ${actors.length} NPC${actors.length === 1 ? "" : "s"} from Metavault dossier "${dossierName}".`);

  if (emitChat) {
    await postImportChatCard(bundle, actors, folder);
  }

  return { actors, folder };
}

/**
 * Build one NPC actor from a bundle entry.
 * @private
 */
async function buildNpcActor(npc, bundle, folder) {
  const tier = Number(npc.tier ?? bundle.dossier?.tier ?? 1);
  const size = Number(npc.stats?.size ?? 1);

  const featuresHtml = buildFeaturesHtml(npc);
  const notesHtml = `${npc.notes || ""}\n${featuresHtml}`;

  const actorData = {
    name: npc.name || "Metavault NPC",
    type: "npc",
    img: npc.portrait || "icons/svg/mystery-man.svg",
    folder: folder?.id ?? null,
    flags: {
      [MODULE_ID]: {
        metavault: {
          sourceApp: bundle.sourceApp,
          dossier: bundle.dossier?.name,
          dossierCategory: bundle.dossier?.category,
          classId: npc.classId,
          className: npc.className,
          templates: npc.templates || [],
          tier,
          exportedAt: bundle.exportedAt,
          sourceId: npc.sourceId
        }
      }
    },
    system: {
      notes: notesHtml,
      tier,
      size
    },
    prototypeToken: {
      name: npc.name || "Metavault NPC",
      actorLink: false,
      disposition: -1
    }
  };

  const actor = await Actor.create(actorData);
  if (!actor) return null;

  const items = buildNpcFeatureItems(npc);
  if (items.length > 0) {
    try {
      await actor.createEmbeddedDocuments("Item", items);
    } catch (err) {
      console.warn(`${MODULE_ID} | Feature items failed on ${actor.name}`, err);
    }
  }

  return actor;
}

/**
 * Turn feature entries into minimal npc_feature items. Falls back to a
 * plain structure LANCER's data model accepts: name, type=npc_feature,
 * system.{origin, effect, type, tags}.
 */
function buildNpcFeatureItems(npc) {
  const seen = new Set();
  const pool = [...(npc.currentFeatures || []), ...(npc.baseFeatures || [])];
  const items = [];
  for (const feat of pool) {
    if (!feat || !feat.name) continue;
    const key = (feat.id || feat.name).toString().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      name: feat.name,
      type: "npc_feature",
      img: "icons/svg/aura.svg",
      flags: {
        [MODULE_ID]: {
          metavault: { featureId: feat.id || null, origin: feat.origin || null }
        }
      },
      system: {
        origin: typeof feat.origin === "string" ? feat.origin : "",
        effect: feat.effect || "",
        type: feat.type || "Reaction",
        tags: Array.isArray(feat.tags) ? feat.tags : []
      }
    });
  }
  return items;
}

function buildFeaturesHtml(npc) {
  const parts = [];
  const section = (title, list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    parts.push(`<h3>${escHtml(title)}</h3><ul>`);
    for (const f of list) {
      if (!f?.name) continue;
      const tagStr = Array.isArray(f.tags) && f.tags.length
        ? ` <em>[${f.tags.map(t => escHtml(t?.name ?? t?.id ?? "")).filter(Boolean).join(", ")}]</em>`
        : "";
      parts.push(`<li><strong>${escHtml(f.name)}</strong> (${escHtml(f.type || "")})${tagStr}<br/>${escHtml(f.effect || "")}</li>`);
    }
    parts.push("</ul>");
  };

  section("Current Features", npc.currentFeatures);
  section("Base Features",    npc.baseFeatures);
  section("Optional Features", npc.optionalFeatures);
  return parts.join("\n");
}

async function postImportChatCard(bundle, actors, folder) {
  const list = actors.map(a => `<li>${escHtml(a.name)}</li>`).join("");
  const folderLine = folder ? `<div>Folder: <strong>${escHtml(folder.name)}</strong></div>` : "";
  const content = `
    <div class="fabricator-chat-card" style="border-left-color: #8a6a3d;">
      <div class="fabricator-die-header"><strong><i class="fas fa-folder-plus"></i> METAVAULT IMPORT</strong></div>
      <div>Dossier: <strong>${escHtml(bundle.dossier?.name || "Unnamed")}</strong> (Tier ${escHtml(bundle.dossier?.tier ?? "?")})</div>
      ${folderLine}
      <div>${actors.length} NPC${actors.length === 1 ? "" : "s"} created:</div>
      <ul style="margin:4px 0 0 18px;">${list}</ul>
    </div>
  `;
  await ChatMessage.create({ content, speaker: ChatMessage.getSpeaker() });
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const METAVAULT_BUNDLE_FORMAT = BUNDLE_FORMAT;
