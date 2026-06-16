var B=Object.defineProperty;var $=(c,l,d)=>l in c?B(c,l,{enumerable:!0,configurable:!0,writable:!0,value:d}):c[l]=d;var u=(c,l,d)=>$(c,typeof l!="symbol"?l+"":l,d);(function(){"use strict";const c={TRACKED_THREADS:"trackedThreads",SETTINGS:"settings"},l={followUpIntervalDays:5,aiTone:"professional",openAiApiKey:"",licenseKey:"",licenseValid:!1,licensePlan:"free"},d={THREAD_VIEW:'[role="main"]'},m="pr-track-card";function v(t=window.location.href){let e;try{e=new URL(t).hash}catch{return null}const s=e.slice(1).split("/"),r=s[s.length-1];return!r||r.length<8?null:/^[0-9a-f]{16}$/i.test(r)||/^[A-Za-z0-9_\-+/]{16,}$/.test(r)?r:(console.debug("[ProposalRescue] Segment rejected as thread ID:",r,"| full hash:",e),null)}function k(){var n;const t=document.querySelector("h2.hP");if((n=t==null?void 0:t.textContent)!=null&&n.trim())return t.textContent.trim();const e=document.title??"";if(e&&e!=="Gmail"){const s=e.split(" - ");if(s.length>=2){const r=s.slice(0,s.length-2).join(" - ").trim();return r||s[0].trim()}return e}return"(No subject)"}function C(){var r,o,p;const t=D(),e=document.querySelectorAll(".gD");for(const i of e){const a=i.getAttribute("email")??"",g=i.getAttribute("name")??((r=i.textContent)==null?void 0:r.trim())??a.split("@")[0];if(a&&a.toLowerCase()!==t.toLowerCase())return{name:g||a,email:a}}const n=document.querySelectorAll("[email]");for(const i of n){const a=i.getAttribute("email")??"",g=i.getAttribute("name")??((o=i.textContent)==null?void 0:o.trim())??"";if(a&&a.toLowerCase()!==t.toLowerCase())return{name:g||a.split("@")[0],email:a}}const s=document.querySelectorAll("[data-hovercard-id]");for(const i of s){const a=i.getAttribute("data-hovercard-id")??"";if(a.includes("@")&&a.toLowerCase()!==t.toLowerCase())return{name:((p=i.textContent)==null?void 0:p.trim())||a.split("@")[0],email:a}}return{name:"Unknown",email:""}}function D(){var n;const t=document.querySelector('meta[itemprop="email"]');if(t!=null&&t.content)return t.content;const e=document.querySelector('img[data-cid="bhc"]');return(n=e==null?void 0:e.alt)!=null&&n.includes("@")?e.alt:""}class L{constructor(){u(this,"mutationObserver",null);u(this,"currentThreadId",null);u(this,"callbacks",[]);u(this,"debounceTimer",null);u(this,"onHashChange",()=>{this.handlePotentialNavigation()})}onNavigation(e){this.callbacks.push(e)}start(){this.setupHashListener(),this.setupMutationObserver(),this.handlePotentialNavigation()}stop(){var e;(e=this.mutationObserver)==null||e.disconnect(),this.mutationObserver=null,window.removeEventListener("hashchange",this.onHashChange),this.debounceTimer&&clearTimeout(this.debounceTimer)}setupHashListener(){window.addEventListener("hashchange",this.onHashChange)}setupMutationObserver(){const e=document.querySelector('[role="main"]')??document.body;if(this.mutationObserver=new MutationObserver(()=>{this.debouncedNavigation()}),this.mutationObserver.observe(e,{childList:!0,subtree:!0,attributes:!1,characterData:!1}),e===document.body){const n=new MutationObserver(()=>{var r;const s=document.querySelector('[role="main"]');s&&(n.disconnect(),(r=this.mutationObserver)==null||r.disconnect(),this.mutationObserver=new MutationObserver(()=>this.debouncedNavigation()),this.mutationObserver.observe(s,{childList:!0,subtree:!0,attributes:!1,characterData:!1}))});n.observe(document.body,{childList:!0,subtree:!1})}}debouncedNavigation(){this.debounceTimer&&clearTimeout(this.debounceTimer),this.debounceTimer=setTimeout(()=>{this.handlePotentialNavigation()},150)}handlePotentialNavigation(){const e=v();e!==this.currentThreadId&&(this.currentThreadId=e,this.notifyCallbacks(e))}notifyCallbacks(e){for(const n of this.callbacks)try{n(e)}catch(s){console.error("[ProposalRescue] Navigation callback error:",s)}}waitForThreadView(){return new Promise(e=>{const n=document.querySelector(d.THREAD_VIEW);if(n){e(n);return}const s=new MutationObserver(()=>{const r=document.querySelector(d.THREAD_VIEW);r&&(s.disconnect(),e(r))});s.observe(document.body,{childList:!0,subtree:!0})})}}const y=new L;function w(t){return new Promise((e,n)=>{chrome.storage.sync.get(t,s=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):e(s)})})}function P(t){return new Promise((e,n)=>{chrome.storage.sync.set(t,()=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):e()})})}async function T(){const e=(await w([c.SETTINGS])).settings??l;return(!e.licensePlan||!["free","pro","owner"].includes(e.licensePlan))&&(e.licensePlan="free"),e.licenseValid===void 0&&(e.licenseValid=!1),e}async function b(){return(await w([c.TRACKED_THREADS])).trackedThreads??{}}async function A(t){return(await b())[t]??null}async function E(t){const e=await b();e[t.threadId]=t,await P({[c.TRACKED_THREADS]:e})}async function R(){const t=await new Promise(e=>{chrome.storage.sync.get("onboardingDismissed",n=>e(n))});return!!(t!=null&&t.onboardingDismissed)}async function I(t){await new Promise(e=>{chrome.storage.sync.set({onboardingDismissed:t},()=>e())})}function O(t,e=new Date){const n=new Date(e);return n.setDate(n.getDate()+t),n}function N(t){return O(t).toISOString()}async function q(){try{const t=await T();if(t.licenseValid&&(t.licensePlan==="pro"||t.licensePlan==="owner"))return!0;const e=await b();return Object.values(e).filter(s=>s.status==="active").length<5}catch{return!1}}async function x(t){if(document.getElementById(m))return;if(!await R()){const r=H(t);document.body.appendChild(r);return}const n=await A(t.threadId),s=n?U(n):_(t);document.body.appendChild(s)}function M(){var t;(t=document.getElementById(m))==null||t.remove()}function H(t){var s,r;const e=f();e.innerHTML=`
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <p class="pr-prompt" style="font-weight: 600; margin-bottom: 4px; display: block;">Welcome to Proposal Rescue!</p>
    <p style="font-size: 11px; color: #4b5563; margin-bottom: 12px; line-height: 1.4; display: block;">
      Track conversations to get follow-up reminders. If a client doesn't reply within your set interval, we'll alert you.
    </p>
    <div class="pr-actions">
      <button class="pr-btn pr-btn-primary" id="pr-btn-onboarding-ok">Got It</button>
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `;const n=async()=>{await I(!0),e.remove(),await x(t)};return(s=e.querySelector("#pr-btn-onboarding-ok"))==null||s.addEventListener("click",n),(r=e.querySelector("#pr-btn-close"))==null||r.addEventListener("click",n),e}function _(t){var s,r,o;const e=f();e.innerHTML=`
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <p class="pr-prompt">Track this conversation?</p>
    <div class="pr-actions">
      <button class="pr-btn pr-btn-primary" id="pr-btn-track">Track</button>
      <button class="pr-btn pr-btn-ghost" id="pr-btn-dismiss">Not Now</button>
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `,(s=e.querySelector("#pr-btn-track"))==null||s.addEventListener("click",async()=>{await j(e,t)});const n=()=>e.remove();return(r=e.querySelector("#pr-btn-dismiss"))==null||r.addEventListener("click",n),(o=e.querySelector("#pr-btn-close"))==null||o.addEventListener("click",n),e}function U(t){const e=f();return h(e,t),e}function h(t,e){var o,p;const n=e.status==="active";let s="",r="";e.status==="won"?(s="🏆 Won",r="#15803d"):e.status==="lost"?(s="❌ Lost",r="#b91c1c"):e.status==="stopped"?(s="⏹ Stopped",r="#4b5563"):(s="✓ Tracking",r="#15803d"),t.innerHTML=`
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <div class="pr-content-body" style="margin-bottom: 10px;">
      <span class="pr-tracked-badge" style="color: ${r}; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
        ${s}
      </span>
      <span style="color: #4b5563; font-size: 12px; display: block; margin-top: 4px;">
        ${n?"Active follow-up reminders":"Reminders are disabled for this thread"}
      </span>
    </div>
    <div class="pr-actions" style="display: flex; gap: 8px; align-items: center;">
      ${n?'<button class="pr-btn pr-btn-ghost" id="pr-btn-stop" style="font-size: 11px; padding: 4px 10px;">Stop Tracking</button>':""}
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `,(o=t.querySelector("#pr-btn-close"))==null||o.addEventListener("click",()=>t.remove()),n&&((p=t.querySelector("#pr-btn-stop"))==null||p.addEventListener("click",async()=>{try{const i={...e,status:"stopped",snoozedUntil:null};await E(i),h(t,i),console.log("[ProposalRescue] Stopped tracking via content card:",i)}catch(i){console.error("[ProposalRescue] Failed to stop tracking:",i)}}))}function G(t){var n,s,r;t.innerHTML=`
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <p class="pr-prompt" style="color: #dc2626; font-weight: 600; margin-bottom: 4px; display: block;">Plan Limit Reached</p>
    <p style="font-size: 11px; color: #4b5563; margin-bottom: 12px; line-height: 1.4; display: block;">
      Upgrade to Proposal Rescue Pro for unlimited tracking.
    </p>
    <div class="pr-actions">
      <button class="pr-btn pr-btn-primary" id="pr-btn-upgrade">Upgrade</button>
      <button class="pr-btn pr-btn-ghost" id="pr-btn-close-upgrade">Dismiss</button>
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `;const e=()=>t.remove();(n=t.querySelector("#pr-btn-close-upgrade"))==null||n.addEventListener("click",e),(s=t.querySelector("#pr-btn-close"))==null||s.addEventListener("click",e),(r=t.querySelector("#pr-btn-upgrade"))==null||r.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"OPEN_OPTIONS"}).catch(()=>{}),t.remove()})}async function j(t,e){try{if(!await q()){G(t);return}const s=await T(),r=new Date().toISOString(),o={threadId:e.threadId,subject:e.subject,participantName:e.participantName,participantEmail:e.participantEmail,status:"active",followUpCount:0,lastUserEmailDate:r,nextActionDate:N(s.followUpIntervalDays),snoozedUntil:null,createdAt:r};await E(o),h(t,o),console.log("[ProposalRescue] ✅ Thread saved:",o)}catch(n){console.error("[ProposalRescue] Failed to save thread:",n)}}function f(){const t=document.createElement("div");return t.id=m,t}console.log("[ProposalRescue] Content script loaded");function S(){chrome.runtime.sendMessage({type:"GMAIL_LOADED"}).catch(()=>{}),y.onNavigation(F),y.start(),chrome.runtime.onMessage.addListener((t,e,n)=>{if(t.action==="INSERT_DRAFT"){const s=z(t.text);n(s)}return!0})}function z(t){const e=['[role="textbox"][aria-label*="Message Body"]','div[contenteditable="true"]'];let n=null;const s=document.activeElement;if(s&&s.getAttribute("contenteditable")==="true"&&(n=s),!n)for(const r of e){const o=document.querySelectorAll(r);if(o.length>0){n=o[o.length-1];break}}if(!n)return{success:!1,error:"Could not find an open compose or reply box. Please click Reply or open Compose in Gmail first."};try{n.focus(),document.execCommand("insertText",!1,t)||(n.innerText=t);const o=new Event("input",{bubbles:!0});return n.dispatchEvent(o),V("Follow-up draft inserted!"),{success:!0}}catch(r){return{success:!1,error:(r==null?void 0:r.message)||"Failed to insert text."}}}function V(t){let e=document.getElementById("pr-toast");e&&e.remove(),e=document.createElement("div"),e.id="pr-toast",e.style.cssText=`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    z-index: 1000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    font-family: Roboto, Arial, sans-serif;
    animation: pr-slide-up 0.15s ease-out both;
  `,e.innerText=t,document.body.appendChild(e),setTimeout(()=>{e==null||e.remove()},2e3)}function F(t){M();const e=window.location.hash;console.log("[ProposalRescue] Navigation | hash:",e,"| threadId:",t),t&&setTimeout(()=>{K(t)},600)}function K(t){if(v()!==t)return;const n=k(),s=C();console.log("[ProposalRescue] ✅ Thread detected:",{threadId:t,subject:n,participant:s}),x({threadId:t,subject:n,participantName:s.name,participantEmail:s.email})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",S):S()})();
