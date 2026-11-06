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
 const link=abs(pick("url","link","href","src","code","source","extensionurl"));
 const thumb=abs(pick("thumbnail","thumbnailurl","thumbnail_url","image","icon","banner","cover"));
 if(name||link||thumb){const key=name.toLowerCase()+"|"+link;if(!seen.has(key)){seen.add(key);out.push({name:name||"Unnamed extension",link,thumb,isNew:Boolean(v.new||v.isNew||v.is_new)});}}
 Object.values(v).forEach(x=>walk(x,d+1));
 }
 walk(root,0);return out;
}
function fromDOM(){
 const candidates=new Set();
 // Start from visible headings and walk upward to find the smallest card-like container.
 document.querySelectorAll("h1,h2,h3,h4,h5,[class*=name i],[class*=title i]").forEach(h=>{
  let node=h;
  for(let level=0;level<6&&node&&node!==document.body;level++,node=node.parentElement){
   if(node.closest("#"+ID))continue;
   const text=clean(node.innerText);
   const images=node.querySelectorAll("img,picture source");
   const buttons=node.querySelectorAll("button,[role=button]");
   if(text.length>20&&text.length<1800&&(images.length||buttons.length))candidates.add(node);
  }
 });
 // Also inspect common card wrappers even when their content has no anchor.
 ["article","[class*=card i]","[class*=extension i]","[class*=tile i]","[class*=plugin i]","li"].forEach(sel=>{
  document.querySelectorAll(sel).forEach(node=>{
   if(!node.closest("#"+ID)&&clean(node.innerText).length<1800&&(node.querySelector("img")||node.querySelector("button,[role=button]")))candidates.add(node);
  });
 });
 const out=[],seen=new Set();
 candidates.forEach(e=>{
  const text=clean(e.innerText);
  if(!text||text.length>1800)return;
  const heading=e.querySelector("h1,h2,h3,h4,h5,[class*=name i],[class*=title i]");
  const anchors=[...e.querySelectorAll("a[href]")];
  const linkEl=anchors.find(a=>likelyLink(a.href));
  const attrs=[...e.querySelectorAll("*")].flatMap(el=>["href","data-href","data-url","data-src","data-extension-url","data-code","value"].map(k=>el.getAttribute(k)).filter(Boolean));
  const buttons=[...e.querySelectorAll("button,[role=button]")];
  const buttonData=buttons.flatMap(b=>["data-url","data-href","data-src","data-code","data-extension-url","value"].map(k=>b.getAttribute(k)).filter(Boolean));
  const possible=[...(linkEl?[linkEl.href]:[]),...attrs,...buttonData];
  const link=possible.map(abs).find(likelyLink)||"";
  const img=[...e.querySelectorAll("img,picture source")].map(x=>x.currentSrc||x.src||x.getAttribute("src")||x.getAttribute("data-src")||x.getAttribute("data-lazy-src")||x.getAttribute("srcset")?.split(",")[0]?.trim().split(" ")[0]).map(abs).find(Boolean)||"";
  let name=clean(heading?.innerText||linkEl?.innerText||"");
  if(!name){
   name=text.split(/\n/).map(clean).find(line=>line&&line.length<100&&!/^(copy|copied|new|updated)$/i.test(line))||"";
  }
  if(!name||name.length>120||(!img&&!link&&!buttons.length))return;
  // Avoid selecting a large wrapper containing multiple separate extension cards.
  if(e.querySelectorAll("h1,h2,h3,h4,h5").length>5)return;
  const key=name.toLowerCase()+"|"+link+"|"+img;
  if(seen.has(key))return;
  seen.add(key);
  out.push({name,link,thumb:img,isNew:/\bnew\b/i.test(text)||!!e.querySelector("[class*=new i],[aria-label*=new i]")});
 });
 // Prefer entries that have a real heading and image, then collapse duplicate nested wrappers.
 const ranked=out.sort((a,b)=>(Number(Boolean(b.thumb))+Number(Boolean(b.link)))-(Number(Boolean(a.thumb))+Number(Boolean(a.link))));
 const final=[],keys=new Set();
 ranked.forEach(item=>{const key=item.name.toLowerCase()+"|"+item.link;if(!keys.has(key)){keys.add(key);final.push(item);}});
 return final;
}
function scan(){
 const json=parsePageJSON(),j=json?fromJSON(json):[],d=fromDOM();
 return {items:j.length?j:d,method:j.length?"JSON data":"DOM card scan",detail:j.length?"Parsed data embedded in the current JSON page.":d.length>=3?"Detected repeated card-like page elements.":d.length?"Only a few possible cards were found; check results carefully.":"No reliable entries found. This gallery may need a custom adapter."};
}
let found=scan(),items=found.items;
const host=document.createElement("div");host.id=ID;host.style.cssText="all:initial;position:fixed;inset:0;z-index:2147483647;font:14px system-ui;color:#eee;";
const sh=host.attachShadow({mode:"open"});
sh.innerHTML='<style>*{box-sizing:border-box}.bg{position:fixed;inset:0;background:#0009;display:flex;justify-content:flex-end}.panel{width:min(700px,100vw);height:100%;background:#171a21;display:flex;flex-direction:column;box-shadow:0 0 30px #000}.head,.meta,.foot{padding:14px 18px;border-bottom:1px solid #343a46}.head{display:flex;align-items:center;gap:12px}.head b{font-size:18px;flex:1}button{background:#2b3240;color:#fff;border:1px solid #4c5669;border-radius:7px;padding:8px 11px;cursor:pointer;font:inherit}.primary{background:#3569bd}.meta{background:#202530}.muted{color:#aeb8c8;font-size:12px;overflow-wrap:anywhere}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.list{overflow:auto;flex:1;padding:8px 18px}.entry{display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #343a46}.thumb{width:50px;height:46px;object-fit:contain;background:#2a303b;border-radius:5px}.name{font-weight:650;overflow-wrap:anywhere}.url{font-size:11px;color:#9db9ee;overflow-wrap:anywhere}.foot{border-top:1px solid #343a46;border-bottom:0;display:flex;justify-content:space-between}.pill{font-size:11px;background:#3b4555;border-radius:20px;padding:3px 7px}@media(max-width:480px){.panel{width:100vw}}</style><div class="bg"><section class="panel"><div class="head"><b>Gallery Extractor <span class="pill">v1.1</span></b><button id="close">✕</button></div><div class="meta"><b id="title"></b><div class="muted" id="url"></div><p id="method"></p><div class="muted" id="detail"></div><div class="actions"><button class="primary" id="download">Download JSON</button><button id="copy">Copy JSON</button><button id="rescan">Rescan</button></div></div><div class="list" id="list"></div><div class="foot"><span class="muted" id="count"></span><span class="muted">Review before exporting</span></div></section></div>';
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