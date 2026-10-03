function d(t){const o=t==null?"":String(t);return/[",\n\r]/.test(o)?`"${o.replace(/"/g,'""')}"`:o}function u(t,o){const e=[t.map(d).join(",")];for(const r of o)e.push(r.map(d).join(","));return e.join(`\r
`)}function c(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function h(t,o,e){const r=o.map(a=>`<th>${c(a)}</th>`).join(""),i=e.map(a=>`<tr>${a.map(n=>`<td>${c(n)}</td>`).join("")}</tr>`).join("");return`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" /><title>${c(t)}</title></head>
<body>
<table border="1"><thead><tr>${r}</tr></thead><tbody>${i}</tbody></table>
</body></html>`}function f(t,o,e){const r=e.includes("csv")||e.includes("excel"),i=new Blob([r?"\uFEFF"+o:o],{type:e}),a=URL.createObjectURL(i),n=document.createElement("a");n.href=a,n.download=t,n.rel="noopener",document.body.appendChild(n),n.click(),document.body.removeChild(n),setTimeout(()=>URL.revokeObjectURL(a),1e3)}function b(t,o,e){f(t,u(o,e),"text/csv;charset=utf-8")}function m(t,o,e,r){f(t,h(o,e,r),"application/vnd.ms-excel;charset=utf-8")}function g(t,o,e){const r=o.map(l=>`<th>${c(l)}</th>`).join(""),i=e.map(l=>`<tr>${l.map(p=>`<td>${c(p)}</td>`).join("")}</tr>`).join(""),a=t.generatedAt||new Date().toLocaleString(),n=`<!doctype html><html><head><meta charset="utf-8" />
<title>${c(t.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17150f; margin: 32px; }
  header { border-bottom: 2px solid #17150f; padding-bottom: 12px; margin-bottom: 18px; }
  .brand { font-weight: 800; letter-spacing: 0.14em; font-size: 13px; text-transform: uppercase; }
  h1 { font-size: 22px; margin: 6px 0 2px; }
  .sub { color: #6b655c; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd8ce; font-size: 12px; }
  th { background: #f1ede6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
  tbody tr:nth-child(even) { background: #faf8f4; }
  footer { margin-top: 20px; color: #9a938a; font-size: 11px; }
  @page { margin: 14mm; }
</style></head>
<body>
  <header>
    <div class="brand">KUDII</div>
    <h1>${c(t.title)}</h1>
    <div class="sub">${c(t.business||"")}${t.subtitle?" · "+c(t.subtitle):""}</div>
  </header>
  <table><thead><tr>${r}</tr></thead><tbody>${i}</tbody></table>
  <footer>Generated ${c(a)} · KUDII — know your money.</footer>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };<\/script>
</body></html>`,s=window.open("","_blank","width=900,height=700");return s?(s.document.open(),s.document.write(n),s.document.close(),!0):!1}async function x(t,o,e,r){const i=u(e,r),a=typeof navigator<"u"?navigator:null;if(a&&typeof a.share=="function"&&typeof File<"u")try{const n=new File(["\uFEFF"+i],t,{type:"text/csv;charset=utf-8"});if(!a.canShare||a.canShare({files:[n]}))return await a.share({title:o,text:o,files:[n]}),{ok:!0,shared:!0}}catch(n){if(n&&n.name==="AbortError")return{ok:!0,cancelled:!0}}try{return b(t,e,r),{ok:!0,shared:!1}}catch(n){return{ok:!1,error:(n==null?void 0:n.message)||"Export failed"}}}async function y(t,o){var r;const e=typeof navigator<"u"?navigator:null;if(e&&typeof e.share=="function")try{return await e.share({title:t,text:o}),{ok:!0,shared:!0}}catch(i){if(i&&i.name==="AbortError")return{ok:!0,cancelled:!0}}try{if((r=e==null?void 0:e.clipboard)!=null&&r.writeText)return await e.clipboard.writeText(o),{ok:!0,shared:!1}}catch{}return{ok:!1,error:"Sharing is not available on this device"}}export{m as a,y as b,b as d,g as p,x as s};
