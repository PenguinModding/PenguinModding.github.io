import fs from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, ".github/gallery-update-state.json");
const INTERVAL_MS = 15 * 24 * 60 * 60 * 1000;
const NOW = new Date();
const SOURCES = [
  { id:"penguinmod", file:"penguinmod-extensions.json", url:"https://extensions.penguinmod.com/?editor=false", kind:"penguinmod" },
  { id:"turbowarp", file:"turbowarp-extensions.json", url:"https://extensions.turbowarp.org/", kind:"turbowarp" },
  { id:"sharkpool", file:"sharkpool-extensions.json", url:"https://sharkpools-extensions.vercel.app/?originPM=true", kind:"sharkpool" },
  { id:"godslayer", file:"godslayer-extensions.json", url:"https://godslayerakp.gay/extensions.server.js", kind:"godslayer" },
  { id:"ziplox", file:"ziplox-extensions.json", url:"https://ziplox.neocities.org/extensions/", kind:"ziplox" },
  { id:"allay", file:"allay-extensions.json", url:"https://greedyallay.github.io/extensions/", kind:"allay" },
  { id:"kylekart", file:"kylekart-extensions.json", url:"https://kylekart.github.io/ScratchExtensions/?ref=mistium&source=Joshuaknowsmaths", kind:"kylekart" },
  { id:"coast", file:"coast-extensions.json", url:"https://studio.penguinmod.com/fullscreen.html?fps=60&interpolate&offscreen&source=Joshuaknowsmaths#0255145410", kind:"generic" },
  { id:"pooiod7", file:"pooiod7-extensions.json", url:"https://p7scratchextensions.pages.dev/", kind:"pooiod7" },
  { id:"cst", file:"cst-extensions.json", url:"https://cst1229.eu.org/extensions", kind:"cst" },
  { id:"dde", file:"dde-extensions.json", url:"https://dde-ext-gallery.vercel.app/", kind:"dde" },
  { id:"lemons", file:"lemons-extensions.json", url:"https://bludisanlemon.github.io/lemons-gallery/", kind:"lemons" },
  { id:"pen", file:"pen-extensions.json", url:"https://pen-group.github.io/extensions/", kind:"pen" },
  { id:"ruby", file:"ruby-extensions.json", url:"https://ruby-devs.vercel.app/gallery", kind:"ruby" },
  { id:"dinosaurmod", file:"dinosaurmod-extensions.json", url:"https://dinosaurmod.github.io/extensions/", kind:"dinosaur" },
  { id:"electramod", file:"electramod-extensions.json", url:"https://electramod-extensions-gallery.vercel.app/", kind:"electra" },
  { id:"mgik", file:"mgik-extensions.json", url:"https://s.mgik.dev/CRAZYextensionlistwow.json?ref=ListOfAllExtensionDiscord", kind:"json" },
  { id:"skybuilder", file:"skybuilder-extensions.json", url:"https://skybuilder-extensions.vercel.app/", kind:"skybuilder" },
  { id:"m0v0", file:"m0v0-extensions.json", url:"https://m0v0.github.io/Website/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"goofywarp", file:"goofywarp-extensions.json", url:"https://goofywarp.github.io/extensions/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"alejo", file:"alejo-extensions.json", url:"https://alejo14.vercel.app/extensions.html", kind:"generic" },
  { id:"tutelmod", file:"tutelmod-extensions.json", url:"https://extensions.tutelmod.com/?editor=true", kind:"tutelmod" },
  { id:"adacraft", file:"adacraft-extensions.json", url:"https://www.adacraft.org/studio/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"tringlyman", file:"tringlyman-extensions.json", url:"https://tringlyman.github.io/Scratch-Extensions/", kind:"tringlyman" },
  { id:"kittenblock", file:"kittenblock-extensions.json", url:"https://kblock.kittenbot.cc/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"turbololder", file:"turbololder-extensions.json", url:"https://turbololder.vercel.app/", kind:"generic" }
];

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
const absolute = (value, base) => { try { return value ? new URL(value, base).href : ""; } catch { return ""; } };
const isImage = value => /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#]|$)/i.test(value || "") || /(?:\/image\/|\/images?\/|cloudinary|imgur|\.svg\?)/i.test(value || "");
const isUsefulLink = value => /^https?:/i.test(value || "") && !isImage(value) && !/^(?:javascript:|mailto:|tel:)/i.test(value || "");
const normalizedUrl = value => {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch { return ""; }
};
const identityKeys = item => {
  const link = normalizedUrl(item.link);
  const name = clean(item.name).toLocaleLowerCase("en");
  return link ? ["url:" + link] : name ? ["name:" + name] : [];
};
const uniq = items => {
  const map = new Map();
  for (const item of items) {
    const name = clean(item.name), link = clean(item.link), thumb = clean(item.thumb);
    if (!name || name.length > 140 || /^(extensions?|filters?|categories|gallery|search|about|home|try it out|copy link)$/i.test(name) || /extension gallery$/i.test(name)) continue;
    const key = identityKeys({name,link})[0];
    if (!key) continue;
    if (!map.has(key)) map.set(key, {name, link, thumb});
    else {
      const prior = map.get(key);
      if ((!prior.thumb || !isImage(prior.thumb)) && thumb) prior.thumb = thumb;
      if (!prior.link && link) prior.link = link;
      if (name.length > prior.name.length) prior.name = name;
    }
  }
  return [...map.values()];
};

function parseJsonTree(root, base) {
  const found = [], seen = new Set();
  const visit = (value, depth=0) => {
    if (!value || typeof value !== "object" || depth > 9 || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { value.forEach(v => visit(v, depth+1)); return; }
    const lower = Object.fromEntries(Object.entries(value).map(([k,v]) => [k.toLowerCase(),v]));
    const pick = (...keys) => keys.map(k=>lower[k]).find(v=>typeof v==="string" && v.trim()) || "";
    const name = clean(pick("name","title","displayname","display_name","extensionname","extension_id","id"));
    let link = absolute(pick("url","link","href","code","source","extensionurl","extensionid","extension_id","rawurl","raw_url"),base);
    if (link) {
      try { const u=new URL(link); link=absolute(u.searchParams.get("extension")||u.searchParams.get("url")||u.searchParams.get("src")||link,base); } catch {}
    }
    const thumbValue = pick("thumbnail","thumbnailurl","thumbnail_url","image","imageurl","image_url","icon","iconurl","icon_url","banner","bannerurl","banner_url","cover","coverurl","cover_url");
    const thumb = absolute(thumbValue,base);
    if (name && (isUsefulLink(link)||isImage(thumb))) found.push({name,link:isUsefulLink(link)?link:"",thumb:isImage(thumb)?thumb:""});
    Object.values(value).forEach(v=>visit(v,depth+1));
  };
  visit(root);
  return uniq(found);
}

function fromHtml(html, base, kind) {
  const $ = load(html);
  const found = [];
  const addCard = (card, forcedName) => {
    const el = $(card);
    const rowName = el.is("tr") ? el.find("td").first().text() : "";
    const name = clean(forcedName || rowName || el.find("h1,h2,h3,h4,h5,.title,.name,.card-title,.extension-name,.extension-title,.libraryItemName,strong,[data-name]").first().text() || el.attr("data-name") || el.attr("aria-label") || el.find("img").first().attr("alt"));
    const img = el.find("img,picture source,meta[property='og:image'],meta[name='twitter:image']").first();
    const thumbRaw = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || img.attr("data-original") || img.attr("data-image") || img.attr("data-thumb") || img.attr("data-srcset")?.split(",")[0]?.trim().split(/\s+/)[0] || img.attr("srcset")?.split(",")[0]?.trim().split(/\s+/)[0] || img.attr("content");
    const thumb = thumbRaw && (/^https?:|^\//i.test(thumbRaw)) ? absolute(thumbRaw,base) : "";
    let link = "";
    const attrs = ["href","data-href","data-url","data-src","data-extension-url","data-code","data-link","data-copy","data-clipboard-text","download-url","value"];
    el.find("*").addBack().each((_,node)=>{
      const n=$(node);
      for(const a of attrs){const v=n.attr(a);if(v){const u=absolute(v,base);if(isUsefulLink(u)&&u!==base){link=u;break;}}}
      if(!link){const raw=[n.attr("onclick"),n.attr("onmousedown"),n.attr("data-clipboard-text"),n.attr("data-copy")].filter(Boolean).join(" ");const m=raw.match(/(?:https?:\/\/|\.\/|\.\.\/|\/)[^"'\s<>]+/);if(m)link=absolute(m[0],base);}
      if(link)return false;
    });
    if (!link) {
      const a=el.find("a[href]").filter((_,n)=>isUsefulLink(absolute($(n).attr("href"),base))).first();
      if(a.length)link=absolute(a.attr("href"),base);
    }
    if (name && (link || thumb)) found.push({name,link,thumb});
  };
  const selectors = {
    penguinmod: ["a[href*='/extensions/']","article","[class*=extension i]"],
    turbowarp: ["h2","h3"],
    sharkpool: ["extension-div"],
    allay: [".extension"],
    kylekart: [".extensions-outer .extensions > a"],
    pooiod7: [".card","tr"],
    cst: ["a:has(img)"],
    dde: ["#gallery .extension"],
    lemons: [".extension"],
    pen: [".extensionHolder .extension"],
    ruby: [".extension"],
    dinosaur: [".extension-library"],
    electra: [".extension","[class*=card i]","h2","h3"],
    tutelmod: ["article","[class*=card i]","[class*=extension i]"]
  };
  const chosen = selectors[kind] || ["article","[class*=card i]","[class*=extension i]","[class*=tile i]","[class*=plugin i]","[role=listitem]","li","h1","h2","h3","h4"];
  for (const selector of chosen) {
    $(selector).each((_,node)=>{
      if (["turbowarp","pooiod7","electra","generic","dinosaur","ruby","turbololder","skybuilder","dde","lemons","pen"].includes(kind) && !/^H[1-4]$/.test(node.tagName) && ["turbowarp","pooiod7","turbololder"].includes(kind)) return;
      if (kind==="cst" && node.tagName!=="a") return;
      if (kind==="penguinmod" && node.tagName==="a" && !$(node).find("img").length && !clean($(node).text())) return;
      let card=node;
      if (/^h[1-4]$/i.test(node.tagName)) {
        card=$(node).closest("article,[class*=card i],[class*=extension i],[class*=item i],[class*=entry i],li").get(0) || $(node).parent().get(0) || node;
      }
      addCard(card, /^h[1-4]$/i.test(node.tagName)?$(node).text():undefined);
    });
  }
  // Handle JSON embedded in script tags and framework hydration state.
  $("script[type='application/json'],script#__NEXT_DATA__,script[type='application/ld+json']").each((_,node)=>{
    try { found.push(...parseJsonTree(JSON.parse($(node).text()),base)); } catch {}
  });
  // Some galleries render cards from inline JavaScript rather than HTML/JSON script tags.
  $("script:not([src])").each((_,node)=>{
    const raw=$(node).text();
    const patterns=[
      /(?:name|title)\s*:\s*["']([^"']{2,100})["'][\s\S]{0,900}?(?:extensionId|extensionURL|extensionUrl|code|url|href)\s*:\s*["']([^"']{4,500})["']/gi,
      /(?:extensionId|extensionURL|extensionUrl|code|url|href)\s*:\s*["']([^"']{4,500})["'][\s\S]{0,900}?(?:name|title)\s*:\s*["']([^"']{2,100})["']/gi
    ];
    for(let p=0;p<patterns.length;p++) for(const m of raw.matchAll(patterns[p])) {
      const name=p===0?m[1]:m[2], rawLink=p===0?m[2]:m[1], link=absolute(rawLink,base);
      if(name && isUsefulLink(link)) found.push({name,link,thumb:""});
    }
  });
  return uniq(found);
}

function parseJsObjectFeed(text, base, kind) {
  const found=[];
  if(kind==="godslayer") {
    const $=load(text);
    $("a[href]").each((_,a)=>{const name=clean($(a).text());const link=absolute($(a).attr("href"),base);if(name&&isUsefulLink(link))found.push({name,link,thumb:""});});
  }
  if(kind==="ziplox") {
    // Parse each flat object separately to stop fields leaking between entries.
    const objects=text.match(/\{[^{}]*\}/g)||[];
    const field=(object,...keys)=>{
      for(const key of keys) {
        const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        const match=object.match(new RegExp("(?:^|\\{|[,\\s])"+escaped+"\\s*:\\s*([\\\"'`])([\\s\\S]*?)\\1","i"));
        if(match)return match[2].trim();
      }
      return "";
    };
    for(const object of objects) {
      const displayTitle=field(object,"displayTitle","displaytitle","title","name");
      const internalTitle=field(object,"internalTitle","internaltitle","id");
      const code=field(object,"code","url","link","extensionURL","extensionUrl");
      const banner=field(object,"banner","thumbnail","thumbnailURL","thumbnailUrl","image","icon");
      const name=clean(displayTitle||internalTitle);
      const link=absolute(code,base);
      const thumb=absolute(banner,base);
      if(name && (isUsefulLink(link)||isImage(thumb)))found.push({name,link:isUsefulLink(link)?link:"",thumb:isImage(thumb)?thumb:""});
    }
  }
  return uniq(found);
}


function parseCommentedJson(text) {
  // Remove JSONC comments without touching // inside quoted strings.
  let output = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inString) {
      output += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; output += ch; continue; }
    if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      output += "\n";
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
      continue;
    }
    output += ch;
  }
  return JSON.parse(output.replace(/,\s*([}\]])/g, "$1"));
}


function stripJsComments(source) {
  let out = "", quote = "", escaped = false, line = false, block = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (line) { if (ch === "\n") { line = false; out += ch; } else out += " "; continue; }
    if (block) { if (ch === "*" && next === "/") { block = false; out += "  "; i++; } else out += ch === "\n" ? "\n" : " "; continue; }
    if (quote) { out += ch; if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === quote) quote = ""; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; out += ch; continue; }
    if (ch === "/" && next === "/") { line = true; out += "  "; i++; continue; }
    if (ch === "/" && next === "*") { block = true; out += "  "; i++; continue; }
    out += ch;
  }
  return out;
}

function extractObjectBlocks(source) {
  const cleanSource = stripJsComments(source);
  const blocks = [];
  let quote = "", escaped = false, depth = 0, start = -1;
  for (let i = 0; i < cleanSource.length; i++) {
    const ch = cleanSource[i];
    if (quote) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === quote) quote = ""; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}" && depth > 0) { depth--; if (depth === 0 && start >= 0) { blocks.push(cleanSource.slice(start, i + 1)); start = -1; } }
  }
  return blocks;
}

function jsStringField(object, key) {
  const match = object.match(new RegExp("\\b" + key + "\\s*:\\s*(['\"])([\\s\\S]*?)\\1"));
  if (!match) return "";
  return match[2].replace(/\\\\'/g, "'").replace(/\\\\\\\\/g, "\\\\").replace(/\\\\n/g, "\n");
}

function slugName(slug) {
  return clean(slug.split("/").pop().replace(/\.js$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
}

async function fetchDedicated(source, finalUrl, body) {
  console.log("[gallery-debug] fetchDedicated entered; id=" + String(source?.id) + "; kind=" + String(source?.kind));

  if (source.kind === "dinosaur") {
    const dataUrl = "https://raw.githubusercontent.com/Dinosaurmod/extensions/main/src/extensions.jsx";
    const response = await fetch(dataUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("DinosaurMod extension index HTTP " + response.status);
    const js = await response.text();
    const imports = {};
    for (const match of js.matchAll(/import\s+([\w$]+)\s+from\s+['"]\.\/icons\/([^'"]+)['"]/g)) {
      imports[match[1]] = absolute("src/icons/" + match[2], "https://raw.githubusercontent.com/Dinosaurmod/extensions/main/");
    }
    const legacyBase = "https://gabsthecuriouskid.github.io/DinosaurModExtensions/";
    const items = [];
    for (const object of extractObjectBlocks(js)) {
      const name = jsStringField(object, "name");
      const extensionExpr = object.match(/\bextensionId\s*:\s*extensionUrl\s*\+\s*(['"])([^'"]+)\1/);
      if (!name || !extensionExpr) continue;
      const iconExpr = object.match(/\biconURL\s*:\s*([\w$]+)(?:\s*\+\s*(['"])([^'"]*)\2)?/);
      let thumb = "";
      if (iconExpr) {
        if (iconExpr[3] !== undefined && iconExpr[1] === "legacyExtensionUrl") thumb = absolute("images/" + iconExpr[3], legacyBase);
        else if (iconExpr[3] !== undefined) thumb = absolute(iconExpr[3], "https://raw.githubusercontent.com/Dinosaurmod/extensions/main/");
        else thumb = imports[iconExpr[1]] || "";
      }
      items.push({
        name,
        link: absolute("src/extensions/" + extensionExpr[2], "https://raw.githubusercontent.com/Dinosaurmod/extensions/main/"),
        thumb
      });
    }
    const result = uniq(items);
    if (result.length < 5) throw new Error("DinosaurMod index returned only " + result.length + " usable extensions");
    return result;
  }

  // TutelMod is scanned from its configured live gallery page; keep its live listing authoritative.
  // Do not use the unrelated TurtleMod-Team source repository as its catalogue.

  if (source.kind === "turbowarp") {
    const listUrl = "https://raw.githubusercontent.com/TurboWarp/extensions/master/extensions/extensions.json";
    const response = await fetch(listUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("TurboWarp extension index HTTP " + response.status);
    const slugs = parseCommentedJson(await response.text()).filter(x => typeof x === "string");
    const items = await Promise.all(slugs.map(async slug => {
      const imageBase = "https://extensions.turbowarp.org/images/" + slug;
      let thumb = "";
      for (const extension of [".svg", ".png", ".jpg", ".jpeg", ".webp"]) {
        const candidate = imageBase + extension;
        try {
          const check = await fetch(candidate, {method:"HEAD",headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(10000)});
          if (check.ok) { thumb = candidate; break; }
        } catch {}
      }
      if (!thumb) thumb = "https://extensions.turbowarp.org/images/unknown.svg";
      return {
        name: slugName(slug),
        link: absolute(slug + ".js", "https://extensions.turbowarp.org/"),
        thumb
      };
    }));
    return uniq(items);
  }

  if (source.kind === "pen") {
    const jsonUrl = absolute("extensions.json", finalUrl);
    const response = await fetch(jsonUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("Pen Group extension index HTTP " + response.status);
    const data = await response.json();
    return uniq(data.map(item => {
      const version = item.latestVersion || item.versions?.[item.versions.length - 1]?.filename;
      return {
        name: item.name,
        link: version ? absolute("extensions/" + encodeURIComponent(item.id) + "/" + encodeURIComponent(version), finalUrl) : "",
        thumb: absolute("extensions/" + encodeURIComponent(item.id) + "/thumbnail." + (item.thumbnailFormat || "svg"), finalUrl)
      };
    }));
  }

  if (source.kind === "sharkpool") {
    const dataUrl = "https://raw.githubusercontent.com/SharkPool-SP/SharkPools-Extensions/main/Gallery%20Files/Extension-Keys.json";
    const response = await fetch(dataUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("SharkPool extension index HTTP " + response.status);
    const data = await response.json();
    return uniq(Object.entries(data.extensions || {}).filter(([, item]) => !item.isDeprecated).map(([name, item]) => ({
      name,
      link: item.url ? absolute("extension-code/" + item.url, finalUrl) : "",
      thumb: item.banner ? absolute("extension-thumbs/" + item.banner, finalUrl) : ""
    })));
  }

  if (source.id === "pooiod7" || source.kind === "pooiod7") {
    // The gallery publishes its source list as extensions.json. The live
    // site and the project's source repository are both supported so a
    // temporary Pages/CDN fetch issue does not make the whole gallery vanish.
    const urls = [
      "https://p7scratchextensions.pages.dev/extensions.json",
      "https://raw.githubusercontent.com/pooiod/ScratchExtensions/main/extensions.json"
    ];
    let data = null;
    const errors = [];
    console.log("[pooiod7] starting dedicated JSON index lookup");
    for (const dataUrl of urls) {
      try {
        const response = await fetch(dataUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0","accept":"application/json"},signal:AbortSignal.timeout(35000)});
        console.log("[pooiod7] " + dataUrl + " -> HTTP " + response.status);
        if (!response.ok) throw new Error("HTTP " + response.status);
        const parsed = await response.json();
        if (!Array.isArray(parsed) || !parsed.length) throw new Error("Extension index was empty or not an array");
        console.log("[pooiod7] parsed raw entries=" + parsed.length);
        data = parsed;
        break;
      } catch (error) { console.log("[pooiod7] index error: " + String(error)); errors.push(dataUrl + ": " + String(error)); }
    }
    // Last-resort source: GitHub's contents API. This avoids depending on
    // either the Pages deployment or raw-content CDN being available to CI.
    if (!data) {
      try {
        const response = await fetch("https://api.github.com/repos/pooiod/ScratchExtensions/contents/extensions.json", {
          headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0","accept":"application/vnd.github+json"},
          signal:AbortSignal.timeout(35000)
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const file = await response.json();
        const parsed = JSON.parse(Buffer.from(file.content || "", "base64").toString("utf8"));
        if (!Array.isArray(parsed) || !parsed.length) throw new Error("GitHub API returned an empty or invalid index");
        data = parsed;
      } catch (error) { errors.push("GitHub contents API: " + String(error)); }
    }
    if (!data) throw new Error("[pooiod7] extension index unavailable. " + errors.join(" | "));
    console.log("[pooiod7] loaded raw entries=" + data.length);
    const visibleEntries = data.filter(item => item && item.hidden !== true);
    console.log("[pooiod7] visible entries=" + visibleEntries.length);
    const items = uniq(visibleEntries.map(item => {
      const id = String(item.id || "").trim();
      const name = clean(item.title || item.name || id);
      // The viewer defaults to /ext/<id>/main.js. Use the exact published
      // asset path and retain the cover path supplied by the index.
      const link = id ? absolute("ext/" + encodeURIComponent(id) + "/main.js", "https://p7scratchextensions.pages.dev/") : "";
      const imagePath = typeof item.image === "string" ? item.image.replaceAll("[id]", id) : "";
      const thumb = imagePath ? absolute(imagePath, "https://p7scratchextensions.pages.dev/") : "";
      return {name,link,thumb};
    }));
    console.log("[pooiod7] usable unique entries=" + items.length);
    if (items.length < 3) throw new Error("[pooiod7] index parsed but only " + items.length + " usable entries were extracted");
    return items;
  }

  if (source.kind === "skybuilder") {
    const dataUrl = "https://skybuilder-extensions.vercel.app/extensions-list.json";
    const response = await fetch(dataUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0","accept":"application/json"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("SkyBuilder extension index HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("SkyBuilder extension index was not an array");
    return uniq(await Promise.all(data.map(async item => {
      const id = String(item.id || "");
      let thumb = "";
      if (id) {
        for (const ext of [".png",".svg"]) {
          const candidate = absolute("static/extensions/" + encodeURIComponent(id) + ext, "https://skybuilder-extensions.vercel.app/");
          try {
            let check = await fetch(candidate,{method:"HEAD",headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(10000)});
            if ([403,405,501].includes(check.status)) {
              check = await fetch(candidate,{headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0","range":"bytes=0-0"},signal:AbortSignal.timeout(10000)});
            }
            if (check.ok || check.status===206) { thumb=candidate; break; }
          } catch {}
        }
      }
      return {
        name:item.name,
        link:id?absolute("extensions/"+encodeURIComponent(id)+".js","https://skybuilder-extensions.vercel.app/"):"",
        thumb
      };
    })));
  }

  if (source.kind === "dde") {
    const dataUrl = absolute("extensions/extensions.json", finalUrl);
    const response = await fetch(dataUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("DDE extension index HTTP " + response.status);
    const data = await response.json();
    return uniq(data.filter(item => !item.hidden).map(item => ({
      name: item.name,
      link: absolute("extensions/code/" + item.id + ".js", finalUrl),
      thumb: absolute("extensions/thumbnail/" + item.id + "." + (item.imgFormat || "svg"), finalUrl)
    })));
  }

  if (source.kind === "lemons") {
    const dataUrl = absolute("extensions.json", finalUrl);
    const response = await fetch(dataUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("Lemons extension index HTTP " + response.status);
    const data = await response.json();
    return uniq(data.map(item => ({
      name: item.title,
      link: item.url ? absolute(item.url, finalUrl) : "",
      thumb: item.img ? absolute(item.img, finalUrl) : ""
    })));
  }

  if (source.kind === "ruby") {
    const dataUrl = "https://ruby-devs.vercel.app/data/extensions.json";
    const response = await fetch(dataUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("Ruby extension index HTTP " + response.status);
    const data = await response.json();
    return uniq(data.map(item => ({
      name: item.name,
      link: item.url ? absolute(item.url, finalUrl) : "",
      thumb: item.thumb ? absolute(item.thumb, finalUrl) : ""
    })));
  }

  if (source.kind === "allay") {
    const $ = load(body);
    const found = [];
    $(".extension").each((_, card) => {
      const el = $(card);
      const name = clean(el.find(".name").first().text());
      const image = el.find("img").first().attr("src");
      const script = el.find("[onclick]").toArray().map(n => $(n).attr("onclick") || "").join(" ");
      const match = script.match(/copyExtension\(\s*['"`'"]([^'"`]+)['"`"]\s*\)/);
      const file = match?.[1];
      if (name && file) found.push({
        name,
        link: absolute("resources/extensions/" + file, finalUrl),
        thumb: image ? absolute(image, finalUrl) : ""
      });
    });
    return uniq(found);
  }

  if (source.kind === "tringlyman") {
    const $ = load(body);
    const found = [];
    $("a[download][href]").each((_, node) => {
      const href = $(node).attr("href");
      if (!/\.js(?:[?#]|$)/i.test(href || "")) return;
      let filename = "";
      try { filename = decodeURIComponent(href.split("/").pop().split("?")[0]); } catch {}
      const name = clean(filename.replace(/\.js$/i, "").replace(/\s+Extension$/i, "").replace(/^Tringlyman's\s+/i, ""));
      const card = $(node).closest("div");
      const img = card.find("img").first().attr("src");
      if (name) found.push({name,link:absolute(href,finalUrl),thumb:img?absolute(img,finalUrl):""});
    });
    return uniq(found);
  }

  if (source.kind === "electra") {
    const jsUrl = "https://raw.githubusercontent.com/ElectraMod/ElectraMod-ExtensionsGallery/main/src/lib/extensions.js";
    const response = await fetch(jsUrl, {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if (!response.ok) throw new Error("ElectraMod extension data HTTP " + response.status);
    const js = await response.text();
    const found = [];
    const re = /\{\s*name\s*:\s*["']([^"']+)["'][\s\S]*?code\s*:\s*["']([^"']+)["'][\s\S]*?banner\s*:\s*["']([^"']+)["'][\s\S]*?\}/g;
    for (const match of js.matchAll(re)) found.push({
      name: match[1],
      link: absolute(match[2], "https://electramod-extensions-gallery.vercel.app/"),
      thumb: absolute(match[3], "https://electramod-extensions-gallery.vercel.app/")
    });
    return uniq(found);
  }

  return [];
}

async function fetchSource(source) {
  // Route by stable source ID as well as kind, and emit a trace so CI proves
  // which adapter actually ran.
  if (source.id === "pooiod7" || source.kind === "pooiod7") {
    console.log("[pooiod7] fetchSource adapter entered; kind=" + source.kind);
    const result = await fetchDedicated({...source, kind:"pooiod7"}, source.url, "");
    console.log("[pooiod7] adapter returned " + result.length + " unique records");
    if (!Array.isArray(result) || result.length < 3) {
      throw new Error("[pooiod7] dedicated adapter returned fewer than 3 records");
    }
    return result;
  }
  const response = await fetch(source.url,{redirect:"follow",headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0 (+https://github.com/PenguinModding/PenguinModding.github.io)","accept":"text/html,application/json,text/plain,*/*"},signal:AbortSignal.timeout(35000)});
  if(!response.ok) throw new Error("HTTP "+response.status);
  const body=await response.text();
  const finalUrl=response.url||source.url;
  if(source.kind==="json" || /^\s*[\[{]/.test(body)) {
    try { const data=JSON.parse(body); const items=parseJsonTree(data,finalUrl); if(items.length)return items; } catch {}
  }
  if(source.id==="kylekart" || source.kind==="kylekart") {
    const $=load(body);
    const banners={
      "pitchano":"get/banners/pitchano.svg",
      "legacy blocks":"get/banners/legacy.svg",
      "theme color":"get/banners/theme-color.svg"
    };
    const items=[];
    $(".extensions-outer .extensions > a").each((_,node)=>{
      const card=$(node);
      const name=clean(card.find("h3").first().text());
      const link=absolute(card.attr("href"),finalUrl);
      const image=card.find("img").first().attr("src") || card.find("meta[property='og:image']").attr("content");
      const thumb=image?absolute(image,finalUrl):(banners[name.toLowerCase()]?absolute(banners[name.toLowerCase()],finalUrl):"");
      if(name && isUsefulLink(link)) items.push({name,link,thumb:isImage(thumb)?thumb:""});
    });
    if(items.length<10) throw new Error("ElmoBear gallery returned only "+items.length+" usable extension cards");
    console.log("[kylekart] parsed "+items.length+" cards; "+items.filter(x=>x.thumb).length+" have published banner images");
    return uniq(items);
  }
  if(source.kind==="penguinmod") {
    const feed="https://raw.githubusercontent.com/PenguinMod/PenguinMod-ExtensionsGallery/main/src/lib/extensions.js";
    const fr=await fetch(feed,{headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if(!fr.ok)throw new Error("Official extension feed HTTP "+fr.status);
    const js=await fr.text();
    const items=[];
    // Parse each catalogue object separately so the banner field cannot be skipped.
    const objects=js.match(/\{[^{}]*\}/g)||[];
    const readField=(object,key)=>{
      const match=object.match(new RegExp("(?:^|[,\\s])"+key+"\\s*:\\s*([\\\"\'])(.*?)\\1","s"));
      return match?match[2].trim():"";
    };
    for(const object of objects){
      const name=readField(object,"name");
      const code=readField(object,"code");
      const banner=readField(object,"banner");
      if(!name||!code)continue;
      items.push({
        name,
        link:absolute("extensions/"+code.replace(/^\/+/, ""),"https://extensions.penguinmod.com/"),
        thumb:banner?absolute("images/"+banner.replace(/^\/+/, ""),"https://extensions.penguinmod.com/"):""
      });
    }
    if(items.length>=10)return uniq(items);
  }
  if(source.kind==="ziplox" || source.kind==="godslayer") {
    let items=parseJsObjectFeed(body,finalUrl,source.kind);
    if(!items.length && source.kind==="ziplox") {
      const jsUrl=absolute("extensions.js",finalUrl);
      const jr=await fetch(jsUrl,{headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
      if(jr.ok)items=parseJsObjectFeed(await jr.text(),jsUrl,"ziplox");
    }
    if(items.length)return items;
  }
  const dedicated = await fetchDedicated(source, finalUrl, body);
  if (dedicated.length) return dedicated;
  let items=fromHtml(body,finalUrl,source.kind);

  // Inspect first-party JS bundles for client-rendered gallery data, even when
  // the initial HTML contains a partial list. Merge rather than replacing it.
  const $=load(body);
  const scriptUrls=$("script[src]").toArray().map(node=>absolute($(node).attr("src"),finalUrl)).filter(Boolean).slice(0,12);
  const bundleItems=[];
  for(const scriptUrl of scriptUrls) {
    try {
      const sr=await fetch(scriptUrl,{headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0","accept":"*/*"},signal:AbortSignal.timeout(20000)});
      if(!sr.ok)continue;
      const js=await sr.text();
      const parsed=fromHtml("<script>"+js.replace(/</g,"\\u003c")+"</script>",scriptUrl,source.kind);
      bundleItems.push(...parsed);
      const rx=/(?:name|title)\s*:\s*["']([^"']{2,100})["'][\s\S]{0,1200}?(?:extensionId|extensionURL|extensionUrl|code|url|href)\s*:\s*["']([^"']{4,500})["']/gi;
      for(const m of js.matchAll(rx)) {
        const link=absolute(m[2],scriptUrl);
        if(isUsefulLink(link))bundleItems.push({name:m[1],link,thumb:""});
      }
    } catch {}
  }
  items=uniq([...items,...bundleItems]);
  if(items.length)return items;
  throw new Error("No reliable extension cards or data found (HTML and linked JS inspected)");
}

async function readExisting(file) {
  try { return JSON.parse(await fs.readFile(path.join(ROOT,file),"utf8")); }
  catch { return {names:[],links:[],thumbnails:[],newExtensions:[]}; }
}
async function probeUrl(value) {
  if (!value) return false;
  try {
    const options = {headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(12000)};
    let response = await fetch(value,{...options,method:"HEAD"});
    if (response.ok) return true;
    // Some static hosts reject HEAD but correctly serve GET.
    if ([403,405,501].includes(response.status)) {
      response = await fetch(value,{...options,method:"GET",headers:{...options.headers,range:"bytes=0-0"}});
      return response.ok || response.status===206;
    }
    return false;
  } catch { return false; }
}
async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const index=next++;output[index]=await mapper(items[index],index);}
  }));
  return output;
}
function mergeKnownFields(items, existing) {
  const previous = new Map();
  (existing.names||[]).forEach((name,i)=>{
    const item={name,link:existing.links?.[i]||"",thumb:existing.thumbnails?.[i]||""};
    for(const key of identityKeys(item)) if(!previous.has(key)) previous.set(key,item);
  });
  return items.map(item=>{
    const match=identityKeys(item).map(key=>previous.get(key)).find(Boolean);
    return match?{
      name:item.name||match.name,
      link:item.link||match.link,
      thumb:item.thumb||match.thumb
    }:item;
  });
}
async function validSnapshot(items, existing) {
  const previousCount = existing.names?.length || 0;
  // A sudden large drop is more likely a partial/client-rendered scrape than
  // hundreds of extensions being intentionally removed. Keep the old file.
  const safeMinimum = previousCount >= 10
    ? Math.max(3, Math.ceil(previousCount * 0.8))
    : Math.max(1, Math.min(3, Math.ceil(previousCount * 0.2)));
  const unique = uniq(items);
  if (unique.length < safeMinimum) {
    throw new Error("Only " + unique.length + " entries found; safety minimum is " + safeMinimum + " (80% of previous " + previousCount + "). Existing JSON left untouched.");
  }

  // Do not use HEAD/GET probes as a reason to delete an entry. Many gallery
  // hosts reject automated HEAD requests, rate-limit CI, or serve assets via
  // redirects while the URL still works in a browser. Keep discovered URLs
  // and merge previously known URLs when a refreshed card omits them.
  const merged = mergeKnownFields(unique, existing);
  return uniq(merged.map(item => ({
    name: clean(item.name),
    link: isUsefulLink(item.link) ? item.link : "",
    thumb: isImage(item.thumb) ? item.thumb : ""
  })));
}

async function main() {
  let state={lastCheckedAt:null};
  try { state=JSON.parse(await fs.readFile(STATE_PATH,"utf8")); } catch {}
  const last=state.lastCheckedAt?Date.parse(state.lastCheckedAt):0;
  if(last && NOW.getTime()-last<INTERVAL_MS && process.env.GITHUB_EVENT_NAME!=="workflow_dispatch") {
    console.log("Not due yet. Last complete scan: "+state.lastCheckedAt);
    return;
  }
  const report=[];
  for(const source of SOURCES) {
    try {
      const existing=await readExisting(source.file);
      const fetched=await fetchSource(source);
      const items=await validSnapshot(fetched,existing);
      const oldKeys=new Set();
      (existing.names||[]).forEach((name,i)=>{
        for(const key of identityKeys({name,link:existing.links?.[i]||""}))oldKeys.add(key);
      });
      const newItems=items.filter(item=>!identityKeys(item).some(key=>oldKeys.has(key)));
      const output={
        names:items.map(x=>x.name),
        links:items.map(x=>x.link||""),
        thumbnails:items.map(x=>x.thumb||""),
        newExtensions:newItems.map(x=>x.name)
      };
      await fs.writeFile(path.join(ROOT,source.file),JSON.stringify(output,null,2)+"\n");
      report.push({id:source.id,status:"ok",count:items.length,new:newItems.length,file:source.file});
      console.log("OK "+source.id+": "+items.length+" total, "+newItems.length+" new");
    } catch(error) {
      report.push({id:source.id,status:"error",error:String(error)});
      console.error("FAILED "+source.id+": "+String(error));
    }
  }
  await fs.mkdir(path.dirname(STATE_PATH),{recursive:true});
  const failures=report.filter(x=>x.status==="error").length;
  await fs.writeFile(STATE_PATH,JSON.stringify({lastCheckedAt:failures===0?NOW.toISOString():(state.lastCheckedAt||null),lastAttemptAt:NOW.toISOString(),intervalDays:15,report},null,2)+"\n");
  console.log("Scan finished: "+(report.length-failures)+" succeeded, "+failures+" failed.");
  if(failures===report.length)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
