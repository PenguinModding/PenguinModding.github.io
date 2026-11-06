(() => {
"use strict";
const ID="__pm_gallery_extractor__";
const previous=document.getElementById(ID);
if(previous){previous.remove();return;}
const clean=v=>String(v??"").replace(/\s+/g," ").trim();
const abs=v=>{try{return v?new URL(v,location.href).href:"";}catch{return"";}};
const likelyLink=v=>{try{const u=new URL(v,location.href);return /^https?:$/.test(u.protocol)&&!/\.(png|jpe?g|gif|webp|svg|avif|css|woff2?)([?#]|$)/i.test(u.href)&&u.href!==location.href;}catch{return false;}};
const pageTitle=clean(document.title)||location.hostname;
function parsePageJSON(){const t=(document.body?.innerText||"").trim();if(!/^[{[]/.test(t))return null;try{return JSON.parse(t);}catch{return null;}}
function fromJSON(root){
 if(root&&root.names&&Array.isArray(root.names))return root.names.map((n,i)=>({name:clean(n),link:abs(root.links?.[i]||""),thumb:abs(root.thumbnails?.[i]||""),isNew:(root.newExtensions||[]).includes(n)}));
 const out=[],seen=new Set();
 function walk(v,d){if(!v||typeof v!=="object"||d>8)return;if(Array.isArray(v)){v.forEach(x=>walk(x,d+1));return;}
 const o={};for(const [k,x] of Object.entries(v))if(typeof x==="string"||typeof x==="number")o[k.toLowerCase()]=String(x);
 const pick=(...keys)=>{for(const k of keys)if(o[k])return o[k];return"";};
 const name=clean(pick("name","title","displayname","display_name","extensionname"));
 let link=abs(pick("url","link","href","src","code","source","extensionurl","extensionid","extension_id"));
 if(link){try{const u=new URL(link);const embedded=u.searchParams.get("url")||u.searchParams.get("extension");if(embedded)link=abs(embedded);}catch{}}
 const thumb=abs(pick("thumbnail","thumbnailurl","thumbnail_url","image","icon","banner","cover","rawurl","raw_url"));
 if(name||link||thumb){const key=name.toLowerCase()+"|"+link;if(!seen.has(key)){seen.add(key);out.push({name:name||"Unnamed extension",link,thumb,isNew:Boolean(v.new||v.isNew||v.is_new)});}}
 Object.values(v).forEach(x=>walk(x,d+1));
 }
 walk(root,0);return out;
}
function fromDOM(){
 const out=[],seen=new Set();
 const textOf=e=>clean(e?.innerText||e?.textContent||"");
 const getHeading=e=>e.querySelector("h1,h2,h3,h4,h5,[class*=name i],[class*=title i],[data-name]");
 const getName=e=>{
  const h=getHeading(e);
  let n=textOf(h)||clean(e.getAttribute?.("data-name")||e.getAttribute?.("aria-label")||"");
  if(!n){
   const lines=(e.innerText||"").split(/\n/).map(clean).filter(Boolean);
   n=lines.find(x=>x.length>1&&x.length<90&&!/^(copy|copy link|copy url|try it out|details|new|updated|add to project|url)$/i.test(x))||"";
  }
  return n;
 };
 const getThumb=e=>{
  const m=[...e.querySelectorAll("img,picture source,meta[property='og:image']")];
  for(const x of m){
   const raw=x.currentSrc||x.src||x.getAttribute("src")||x.getAttribute("data-src")||x.getAttribute("data-lazy-src")||x.getAttribute("content")||x.getAttribute("srcset")?.split(",")[0]?.trim().split(/\s+/)[0];
   const u=abs(raw);if(u)return u;
  }
  const bg=[e,...e.querySelectorAll("*")].map(x=>x.getAttribute?.("style")||"").join(" ").match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
  return bg?abs(bg[1]):"";
 };
 const strings=(root,depth=0,visited=new Set())=>{
  if(!root||depth>3||visited.has(root))return [];
  if(typeof root==="string")return [root];
  if(typeof root!=="object"&&typeof root!=="function")return [];
  visited.add(root);const vals=[];
  try{for(const k of Object.keys(root).slice(0,60)){let v;try{v=root[k]}catch{continue}if(typeof v==="string")vals.push(v);else if(v&&typeof v==="object")vals.push(...strings(v,depth+1,visited));}}catch{}
  return vals;
 };
 const getLink=e=>{
  const values=[];
  for(const el of [e,...e.querySelectorAll("*")]){
   for(const k of ["href","data-href","data-url","data-src","data-extension-url","data-code","data-link","data-clipboard-text","data-copy","download-url","value","onclick"]){
    const v=el.getAttribute?.(k);if(v)values.push(v);
   }
   if(el.matches?.("button,[role=button]")){
    const p=Object.keys(el).find(k=>k.startsWith("__reactProps$")||k.startsWith("__vueParentComponent"));
    if(p)values.push(...strings(el[p]));
   }
  }
  const expanded=[];
  for(const v of values){
   const raw=String(v);
   if(/^https?:\/\//i.test(raw))expanded.push(raw);
   expanded.push(...(raw.match(/https?:\/\/[^"'\\s<>)}]+/g)||[]));
   for(const match of raw.matchAll(/(?:extension|url|src|code)=([^&"'\\s)]+)/gi)){try{expanded.push(decodeURIComponent(match[1]));}catch{}}
  }
  for(const candidate of expanded){
   const u=abs(candidate);if(!u)continue;
   try{const parsed=new URL(u);const embedded=parsed.searchParams.get("extension")||parsed.searchParams.get("url")||parsed.searchParams.get("src");if(embedded&&likelyLink(abs(embedded)))return abs(embedded);}catch{}
   if(likelyLink(u)&&!/\/(profile|user|author)\//i.test(new URL(u).pathname))return u;
  }
  // Some galleries store the target in a button's data attributes or inline script text.
  const cardText=e.innerHTML||"";
  const rawUrls=cardText.match(/https?:\\?\/\\?\/[^"'\\s<>]+/g)||[];
  for(const raw of rawUrls){const u=abs(raw.replace(/\\\//g,"/"));if(likelyLink(u))return u;}
  return "";
 };
 const add=(e,opts={})=>{
  if(!e||e===document.body||e===document.documentElement)return;
  const name=clean(opts.name||getName(e)),thumb=abs(opts.thumb||getThumb(e)),link=abs(opts.link||getLink(e));
  if(!name||name.length>120||/^(extensions?|filters?|categories|gallery|search|about|home)$/i.test(name))return;
  if(!thumb&&!link&&!opts.allowText)return;
  const key=name.toLowerCase().replace(/\s+/g," ").trim();
  const prior=out.find(x=>x.name.toLowerCase().replace(/\s+/g," ").trim()===key);
  if(prior){if(!prior.thumb&&thumb)prior.thumb=thumb;if(!prior.link&&link)prior.link=link;prior.isNew=prior.isNew||opts.isNew||/\bnew\b/i.test(textOf(e));return;}
  out.push({name,link,thumb,isNew:!!opts.isNew||/\bnew\b/i.test(textOf(e))||!!e.querySelector?.("[class*=new i],[aria-label*=new i]")});
 };
 const host=location.hostname.toLowerCase();
 // Custom-element gallery: metadata is attached directly to extension-div.
 if(host.includes("sharkpools-extensions")||document.querySelector("extension-div")){
  for(const e of document.querySelectorAll("extension-div")){const m=e.metaData||e.metadata||{};add(e,{name:m.id||m.name||m.title,thumb:m.banner,link:m.url?abs("extension-code/"+String(m.url).replace(/^\/+/,"")):""});}
 }
 // PenguinMod official extension gallery: cards are anchored around headings/images.
 if(host==="extensions.penguinmod.com"||host.endsWith(".extensions.penguinmod.com")){
  for(const h of document.querySelectorAll("h2,h3,h4")){
   const n=textOf(h);if(!n||/extensions|filters|categories/i.test(n))continue;
   let card=h;for(let i=0;i<5&&card.parentElement;i++){card=card.parentElement;if(getThumb(card)||getLink(card))break;}
   add(card,{name:n});
  }
 }
 // TurboWarp's gallery uses headings; direct script links are not always present.
 if(host==="extensions.turbowarp.org"){
  for(const h of document.querySelectorAll("h2,h3")){
   const n=textOf(h);if(!n||/turbowarp extension gallery/i.test(n))continue;
   let card=h.parentElement||h;for(let i=0;i<3&&card.parentElement;i++){if(getThumb(card)||getLink(card))break;card=card.parentElement;}
   let link=getLink(card);if(!link)link="https://extensions.turbowarp.org/"+n.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".js";
   add(card,{name:n,link});
  }
 }
 // Known card layouts from the saved importers.
 const selectors=[
  ".extension .name", ".extensions-outer .extensions > a", ".card .card-title",
  "#gallery .extension", ".extensionHolder .extension", ".extension-library",
  ".extension strong", ".extension .title", ".extension-card", ".extension-item",
  ".extension-card-container", ".library-item", ".extensionTile", ".extension-tile"
 ];
 for(const selector of selectors){
  for(const node of document.querySelectorAll(selector)){
   const card=selector===".extension .name"||selector===".extension strong"||selector===".extension .title" ? node.closest(".extension")||node.parentElement : selector===".card .card-title" ? node.closest(".card")||node.parentElement : node;
   add(card,{name:selector===".extension .name"||selector===".extension strong"||selector===".extension .title"||selector===".card .card-title"?textOf(node):undefined});
  }
 }
 // Cards with action buttons, including sites that render text-only cards.
 for(const button of document.querySelectorAll("button,[role=button],a")){
  const label=textOf(button);
  if(!/^(copy(?: direct)? link|copy url|try it out|url)$/i.test(label))continue;
  let card=button;
  for(let i=0;i<7&&card.parentElement&&card!==document.body;i++){
   const parent=card.parentElement;
   const n=getName(parent),t=textOf(parent);
   if(n&&t.length<1500&&(getThumb(parent)||getLink(parent)||parent.querySelectorAll("button,[role=button]").length>=1)){card=parent;break;}
   card=parent;
  }
  add(card,{allowText:true});
 }
 // Generic repeated card scan. Text-only cards are accepted only when they expose a usable link/action.
 const candidates=[...document.querySelectorAll("article,[class*=card i],[class*=extension i],[class*=tile i],[class*=plugin i],li,[role=listitem]")];
 candidates.sort((a,b)=>a.querySelectorAll("*").length-b.querySelectorAll("*").length);
 for(const e of candidates){
  const name=getName(e);if(!name||name.length>120)continue;
  const link=getLink(e),thumb=getThumb(e);
  if(!thumb&&!link&&!e.querySelector("button,[role=button]"))continue;
  if(e.querySelectorAll("h1,h2,h3,h4,h5").length>3)continue;
  add(e,{name,link,thumb,allowText:true});
 }
 // Image-anchored fallback for galleries with unusual wrappers or icon-only cards.
 for(const media of document.querySelectorAll("img")){
  let card=media;
  for(let i=0;i<8&&card.parentElement&&card!==document.body;i++){
   card=card.parentElement;
   const t=textOf(card);
   if(t.length<8||t.length>1300||card.querySelectorAll("img").length>4)continue;
   const anchor=media.closest("a"),name=getName(card)||clean(media.alt||media.title||anchor?.getAttribute("aria-label")||anchor?.title);
   if(name)add(card,{name,thumb:media.currentSrc||media.src,link:getLink(card)||anchor?.href,allowText:true});
   if(name)break;
  }
 }
 return out;
}
function scan(){
 const json=parsePageJSON(),j=json?fromJSON(json):[],d=fromDOM();
 return {items:j.length?j:d,method:j.length?"JSON data":"DOM card scan",detail:j.length?"Parsed data embedded in the current JSON page.":d.length>=3?"Detected repeated card-like page elements.":d.length?"Only a few possible cards were found; check results carefully.":"No reliable entries found. This gallery may need a custom adapter."};
}
let found=scan(),items=found.items;
const host=document.createElement("div");host.id=ID;host.style.cssText="all:initial;position:fixed;inset:0;z-index:2147483647;font:14px system-ui;color:#eee;";
const sh=host.attachShadow({mode:"open"});
sh.innerHTML='<style>*{box-sizing:border-box}.bg{position:fixed;inset:0;background:#0009;display:flex;justify-content:flex-end}.panel{width:min(700px,100vw);height:100%;background:#171a21;display:flex;flex-direction:column;box-shadow:0 0 30px #000}.head,.meta,.foot{padding:14px 18px;border-bottom:1px solid #343a46}.head{display:flex;align-items:center;gap:12px}.head b{font-size:18px;flex:1}button{background:#2b3240;color:#fff;border:1px solid #4c5669;border-radius:7px;padding:8px 11px;cursor:pointer;font:inherit}.primary{background:#3569bd}.meta{background:#202530}.muted{color:#aeb8c8;font-size:12px;overflow-wrap:anywhere}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.list{overflow:auto;flex:1;padding:8px 18px}.entry{display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #343a46}.thumb{width:50px;height:46px;object-fit:contain;background:#2a303b;border-radius:5px}.name{font-weight:650;overflow-wrap:anywhere}.url{font-size:11px;color:#9db9ee;overflow-wrap:anywhere}.foot{border-top:1px solid #343a46;border-bottom:0;display:flex;justify-content:space-between}.pill{font-size:11px;background:#3b4555;border-radius:20px;padding:3px 7px}@media(max-width:480px){.panel{width:100vw}}</style><div class="bg"><section class="panel"><div class="head"><b>Gallery Extractor <span class="pill">v2.0</span></b><button id="close">✕</button></div><div class="meta"><b id="title"></b><div class="muted" id="url"></div><p id="method"></p><div class="muted" id="detail"></div><div class="actions"><button class="primary" id="download">Download JSON</button><button id="copy">Copy JSON</button><button id="rescan">Rescan</button></div></div><div class="list" id="list"></div><div class="foot"><span class="muted" id="count"></span><span class="muted">Review before exporting</span></div></section></div>';
document.documentElement.appendChild(host);
const $=id=>sh.getElementById(id);
$("title").textContent=pageTitle;$("url").textContent=location.href;
function jsonOut(){return{names:items.map(x=>clean(x.name)),links:items.map(x=>x.link||""),thumbnails:items.map(x=>x.thumb||""),newExtensions:items.filter(x=>x.isNew).map(x=>clean(x.name))};}
function render(){
 $("method").textContent="Detected method: "+found.method;
 $("detail").textContent=found.detail;
 $("count").textContent=items.length+" possible extensions found";
 const list=$("list");list.replaceChildren();
 if(!items.length){const p=document.createElement("p");p.textContent="Nothing detected automatically. A site-specific adapter or manual selection may be needed.";list.append(p);return;}
 items.forEach((it,i)=>{
 const row=document.createElement("div");row.className="entry";
 const img=document.createElement("img");img.className="thumb";img.src=it.thumb||"";img.alt="";img.onerror=()=>img.style.visibility="hidden";
 const info=document.createElement("div");const name=document.createElement("div");name.className="name";name.textContent=it.name||"Unnamed extension";
 const url=document.createElement("div");url.className="url";url.textContent=it.link||"(no link detected)";
 info.append(name,url);const edit=document.createElement("button");edit.textContent="Edit";
 edit.onclick=()=>{const n=prompt("Extension name",it.name);if(n===null)return;const l=prompt("Extension link",it.link);if(l===null)return;const t=prompt("Thumbnail URL",it.thumb);if(t===null)return;it.name=clean(n);it.link=abs(l);it.thumb=abs(t);render();};
 row.append(img,info,edit);list.append(row);
 });
}
render();
$("close").onclick=()=>host.remove();
$("rescan").onclick=()=>{found=scan();items=found.items;render();};
$("download").onclick=()=>{const blob=new Blob([JSON.stringify(jsonOut(),null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=location.hostname.replace(/[^a-z0-9.-]/gi,"_")+"-extensions.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$("copy").onclick=async()=>{const txt=JSON.stringify(jsonOut(),null,2);try{await navigator.clipboard.writeText(txt);}catch{const ta=document.createElement("textarea");ta.value=txt;sh.append(ta);ta.select();document.execCommand("copy");ta.remove();}$("copy").textContent="Copied!";setTimeout(()=>$("copy").textContent="Copy JSON",1300);};
})();