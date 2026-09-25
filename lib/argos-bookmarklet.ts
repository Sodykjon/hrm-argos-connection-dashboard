// Source of the «ARGOS жонли» bookmarklet (see docs/bookmarklets/argos-jonli.md).
// Runs inside the user's logged-in hrm.argos.uz tab: reads the org tree with the
// page's own Bearer token (same-origin), keeps only [tin, billing, label], and
// hands it to the dashboard's /argos-jonli/qabul window via postMessage — the
// only channel out of hrm.argos.uz that needs no CORS and no stored password.
// Repeats every 10 minutes while the tab stays open; click the status box to stop.
// Token refresh mirrors Documents/HRM_pasport_yangilash/extension/content.js.

const SRC = String.raw`(function(){
var D="__ORIGIN__",A="https://hrm.argos.uz",EVERY=600000;
if(location.origin!==A){alert("Бу хатчўпни hrm.argos.uz саҳифасида босинг.");return;}
var G=window.__argosJonli;if(G){G.run(true);return;}
G=window.__argosJonli={};
var box=document.createElement("div");
box.style.cssText="position:fixed;z-index:2147483647;right:16px;bottom:16px;background:#0b2a4a;color:#fff;font:13px/1.45 system-ui,sans-serif;padding:10px 14px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:360px;cursor:pointer";
box.title="Тўхтатиш учун босинг";document.body.appendChild(box);
function say(m){box.textContent="ARGOS жонли: "+m;}
var W=null,ready=false,queue=null,timer=null,busy=false;
function hm(){var d=new Date();return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}
function H(){return {"Authorization":"Bearer "+localStorage.getItem("accessToken"),"Content-Type":"application/json","Accept":"application/json"};}
async function refresh(){var l=null;try{l=JSON.parse(localStorage.getItem("login"));}catch(e){}
if(!l||!l.refreshToken)throw new Error("сессия тугаган");
var r=await fetch("/api/Account/EImzo/RefreshToken/refresh-token",{method:"POST",headers:H(),body:JSON.stringify({token:l.token,refreshToken:l.refreshToken})});
if(!r.ok)throw new Error("сессия тугаган ("+r.status+")");
var j=null;try{j=JSON.parse(await r.text());}catch(e){}
var d=j&&typeof j==="object"?(j.data&&typeof j.data==="object"?j.data:j):null;
var a=d&&(d.accessToken||d.access_token||d.token);if(!a)throw new Error("сессия тугаган");
localStorage.setItem("accessToken",a);
localStorage.setItem("login",JSON.stringify(Object.assign({},l,{token:d.token||l.token,refreshToken:d.refreshToken||l.refreshToken,expiration:d.expiration||l.expiration})));}
async function tree(retry){
var r=await fetch("/api/Staff/Institution/GetSpInstitutionTreeV2",{headers:H()});
if(r.status===401&&!retry){await refresh();return tree(true);}
if(!r.ok)throw new Error("HTTP "+r.status);
var j=await r.json(),arr=Array.isArray(j)?j:(j.data||j.result||j.items||[j]),out=[],seen={};
(function w(ns){for(var i=0;i<ns.length;i++){var n=ns[i];if(String(n.type)==="2"&&n.tin!=null){var t=String(n.tin).trim();if(/^\d{6,12}$/.test(t)&&!seen[t]){seen[t]=1;out.push([t,n.activeBillingStatus?1:0,String(n.label||"").trim()]);}}if(n.children&&n.children.length)w(n.children);}})(arr);
return out;}
function send(){if(!queue||!W||W.closed||!ready)return;W.postMessage({type:"argos-jonli-tree",tree:queue},D);queue=null;say("юборилди, сақланмоқда…");}
function openW(){if(!W||W.closed){ready=false;W=window.open(D+"/argos-jonli/qabul","argos_jonli");}}
window.addEventListener("message",function(e){if(e.origin!==D)return;var d=e.data||{};
if(d.type==="argos-jonli-ready"){ready=true;send();}
if(d.type==="argos-jonli-ack"){say((d.ok?"✓ ":"✗ ")+d.msg+" · "+hm()+" · кейингиси 10 дақиқадан сўнг");}});
G.run=async function(click){if(busy)return;busy=true;
try{if(click)openW();say("дарахт ўқилмоқда…");var rows=await tree(false);
queue={at:new Date().toISOString(),rows:rows};
if(!W||W.closed){say("қабул вкладкаси ёпилган — хатчўпни қайта босинг");}else{say(rows.length+" та ташкилот ўқилди");send();}
}catch(e){say("хато: "+e.message+" — қайта киринг ва хатчўпни босинг");}
busy=false;};
box.onclick=function(){clearInterval(timer);window.__argosJonli=null;box.remove();};
timer=setInterval(function(){G.run(false);},EVERY);
G.run(true);
})();`;

export function bookmarkletSource(origin: string): string {
  return SRC.replace("__ORIGIN__", origin);
}

export function bookmarkletHref(origin: string): string {
  return "javascript:" + encodeURIComponent(bookmarkletSource(origin));
}
