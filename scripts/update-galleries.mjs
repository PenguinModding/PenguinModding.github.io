import fs from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, ".github/gallery-update-state.json");
const INTERVAL_MS = 15 * 24 * 60 * 60 * 1000;
const NOW = new Date();
const SOURCES = [
  { id:"penguinmod", file:"penguinmod-extensions.json", url:"https://extensions.penguinmod.com/?editor=true", kind:"penguinmod" },
  { id:"turbowarp", file:"turbowarp-extensions.json", url:"https://extensions.turbowarp.org/", kind:"turbowarp" },
  { id:"sharkpool", file:"sharkpool-extensions.json", url:"https://sharkpools-extensions.vercel.app/?originPM=true", kind:"sharkpool" },
  { id:"godslayer", file:"godslayer-extensions.json", url:"https://godslayerakp.gay/extensions.server.js", kind:"godslayer" },
  { id:"ziplox", file:"ziplox-extensions.json", url:"https://ziplox.neocities.org/extensions/", kind:"ziplox" },
  { id:"allay", file:"allay-extensions.json", url:"https://greedyallay.github.io/extensions/", kind:"allay" },
  { id:"kylekart", file:"kylekart-extensions.json", url:"https://kylekart.github.io/ScratchExtensions/?ref=mistium&source=Joshuaknowsmaths", kind:"kylekart" },
  { id:"coast", file:"coast-extensions.json", url:"https://studio.penguinmod.com/fullscreen.html?fps=60&interpolate&offscreen&source=Joshuaknowsmaths#0255145410", kind:"generic" },
  { id:"pooid7", file:"pooid7-extensions.json", url:"https://p7scratchextensions.pages.dev/", kind:"pooid7" },
  { id:"cst", file:"cst-extensions.json", url:"https://cst1229.eu.org/extensions", kind:"cst" },
  { id:"dde", file:"dde-extensions.json", url:"https://dde-ext-gallery.vercel.app/", kind:"dde" },
  { id:"lemons", file:"lemons-extensions.json", url:"https://bludisanlemon.github.io/lemons-gallery/", kind:"lemons" },
  { id:"pen", file:"pen-extensions.json", url:"https://pen-group.github.io/extensions/", kind:"pen" },
  { id:"ruby", file:"ruby-extensions.json", url:"https://ruby-devs.vercel.app/gallery", kind:"ruby" },
  { id:"dinosaurmod", file:"dinosaurmod-extensions.json", url:"https://dinosaurmod.github.io/extensions/", kind:"dinosaur" },
  { id:"electramod", file:"electramod-extensions.json", url:"https://electramod-extensions-gallery.vercel.app/", kind:"electra" },
  { id:"mgik", file:"mgik-extensions.json", url:"https://s.mgik.dev/CRAZYextensionlistwow.json?ref=ListOfAllExtensionDiscord", kind:"json" },
  { id:"skybuilder", file:"skybuilder-extensions.json", url:"https://skybuilder-extensions.vercel.app/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"m0v0", file:"m0v0-extensions.json", url:"https://m0v0.github.io/Website/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"goofywarp", file:"goofywarp-extensions.json", url:"https://goofywarp.github.io/extensions/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"alejo", file:"alejo-extensions.json", url:"https://alejo14.vercel.app/extensions.html", kind:"generic" },
  { id:"tutelmod", file:"tutelmod-extensions.json", url:"https://extensions.tutelmod.com/?editor=true", kind:"tutelmod" },
  { id:"adacraft", file:"adacraft-extensions.json", url:"https://www.adacraft.org/studio/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"tringlyman", file:"tringlyman-extensions.json", url:"https://tringlyman.github.io/Scratch-Extensions/", kind:"generic" },
  { id:"kittenblock", file:"kittenblock-extensions.json", url:"https://kblock.kittenbot.cc/?ref=ListOfAllExtensionDiscord", kind:"generic" },
  { id:"turbololder", file:"turbololder-extensions.json", url:"https://turbololder.vercel.app/", kind:"generic" }
];

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
const absolute = (value, base) => { try { return value ? new URL(value, base).href : ""; } catch { return ""; } };
const isImage = value => /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#]|$)/i.test(value || "");
const isUsefulLink = value => /^https?:/i.test(value || "") && !isImage(value);
const uniq = items => {
  const map = new Map();
  for (const item of items) {
    const name = clean(item.name), link = clean(item.link), thumb = clean(item.thumb);
    if (!name || name.length > 140 || /^(extensions?|filters?|categories|gallery|search|about|home|try it out|copy link)$/i.test(name)) continue;
    const key = (link || name).toLowerCase();
    if (!map.has(key)) map.set(key, {name, link, thumb});
    else {
      const prior = map.get(key);
      if (!prior.thumb && thumb) prior.thumb = thumb;
      if (!prior.link && link) prior.link = link;
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
    const name = clean(forcedName || el.find("h1,h2,h3,h4,h5,.title,.name,.card-title,.extension-name,.extension-title,.libraryItemName,strong,[data-name]").first().text() || el.attr("data-name") || el.attr("aria-label") || el.find("img").first().attr("alt"));
    const img = el.find("img,picture source,meta[property='og:image'],meta[name='twitter:image']").first();
    const thumbRaw = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || img.attr("data-original") || img.attr("data-image") || img.attr("data-thumb") || img.attr("data-srcset")?.split(",")[0]?.trim().split(/\s+/)[0] || img.attr("srcset")?.split(",")[0]?.trim().split(/\s+/)[0] || img.attr("content");
    const thumb = thumbRaw && (/^https?:|^\//i.test(thumbRaw)) ? absolute(thumbRaw,base) : "";
    let link = "";
    const attrs = ["href","data-href","data-url","data-src","data-extension-url","data-code","data-link","data-copy","data-clipboard-text","download-url"];
    el.find("*").addBack().each((_,node)=>{
      const n=$(node);
      for(const a of attrs){const v=n.attr(a);if(v){const u=absolute(v,base);if(isUsefulLink(u)&&u!==base){link=u;break;}}}
      if(!link){const raw=n.attr("onclick")||"";const m=raw.match(/https?:\/\/[^"'\\s<>]+/);if(m)link=absolute(m[0],base);}
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
    pooid7: [".card"],
    cst: ["a:has(img)"],
    dde: ["#gallery .extension"],
    lemons: [".extension"],
    pen: [".extensionHolder .extension"],
    ruby: [".extension"],
    dinosaur: [".extension-library"],
    electra: [".extension","[class*=card i]"],
    tutelmod: ["article","[class*=card i]","[class*=extension i]"]
  };
  const chosen = selectors[kind] || ["article","[class*=card i]","[class*=extension i]","[class*=tile i]","[class*=plugin i]","[role=listitem]","li"];
  for (const selector of chosen) {
    $(selector).each((_,node)=>{
      if (kind==="turbowarp" && !/^H[23]$/.test(node.tagName)) return;
      if (kind==="cst" && node.tagName!=="a") return;
      if (kind==="penguinmod" && node.tagName==="a" && !$(node).find("img").length && !clean($(node).text())) return;
      let card=node;
      if (["h2","h3"].includes(node.tagName)) card=$(node).parent().get(0) || node;
      addCard(card, ["H2","H3"].includes(node.tagName)?$(node).text():undefined);
    });
  }
  // Handle JSON embedded in script tags and framework hydration state.
  $("script[type='application/json'],script#__NEXT_DATA__").each((_,node)=>{
    try { found.push(...parseJsonTree(JSON.parse($(node).text()),base)); } catch {}
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
    const re=/\{\s*displaytitle\s*:\s*["']([^"']+)["'][\s\S]*?banner\s*:\s*["']([^"']*)["'][\s\S]*?code\s*:\s*["']([^"']+)["'][\s\S]*?\}/g;
    for(const m of text.matchAll(re))found.push({name:m[1],thumb:absolute(m[2],base),link:absolute(m[3],base)});
  }
  return uniq(found);
}

async function fetchSource(source) {
  const response = await fetch(source.url,{redirect:"follow",headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0 (+https://github.com/PenguinModding/PenguinModding.github.io)","accept":"text/html,application/json,text/plain,*/*"},signal:AbortSignal.timeout(35000)});
  if(!response.ok) throw new Error("HTTP "+response.status);
  const body=await response.text();
  const finalUrl=response.url||source.url;
  if(source.kind==="json" || /^\s*[\[{]/.test(body)) {
    try { const data=JSON.parse(body); const items=parseJsonTree(data,finalUrl); if(items.length)return items; } catch {}
  }
  if(source.kind==="penguinmod") {
    const feed="https://raw.githubusercontent.com/PenguinMod/PenguinMod-ExtensionsGallery/main/src/lib/extensions.js";
    const fr=await fetch(feed,{headers:{"user-agent":"PenguinMod-Gallery-Monitor/1.0"},signal:AbortSignal.timeout(35000)});
    if(!fr.ok)throw new Error("Official extension feed HTTP "+fr.status);
    const js=await fr.text();
    const items=[];
    const re=/\{\s*name\s*:\s*["']([^"']+)["'][\s\S]*?code\s*:\s*["']([^"']+)["'][\s\S]*?(?:banner\s*:\s*["']([^"']*)["'])?[\s\S]*?\}/g;
    for(const m of js.matchAll(re))items.push({name:m[1],link:absolute("extensions/"+m[2].replace(/^\/+/,""),"https://extensions.penguinmod.com/"),thumb:m[3]?absolute("images/"+m[3].replace(/^\/+/,""),"https://extensions.penguinmod.com/"):""});
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
  const items=fromHtml(body,finalUrl,source.kind);
  if(items.length)return items;
  throw new Error("No reliable extension cards or data found");
}

async function readExisting(file) {
  try { return JSON.parse(await fs.readFile(path.join(ROOT,file),"utf8")); }
  catch { return {names:[],links:[],thumbnails:[],newExtensions:[]}; }
}
function validSnapshot(items, existing) {
  const min = Math.max(1, Math.min(3, Math.ceil((existing.names?.length||0)*0.2)));
  if(items.length<min)throw new Error("Only "+items.length+" entries found; safety minimum is "+min+". Existing JSON left untouched.");
  const complete=items.filter(x=>x.name && (x.link||x.thumb));
  if(complete.length<min)throw new Error("Too few usable entries. Existing JSON left untouched.");
  return uniq(complete);
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
      const items=validSnapshot(fetched,existing);
      const oldLinks=new Set((existing.links||[]).filter(Boolean));
      const oldNames=new Set(existing.names||[]);
      const newItems=items.filter(x=>x.link?!oldLinks.has(x.link):!oldNames.has(x.name));
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
