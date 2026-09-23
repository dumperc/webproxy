export async function onRequest(context) {
  const request = context.request;
  const input = new URL(request.url).searchParams.get("url");
  if (!input) return new Response("Missing URL", {status:400});

  let target;
  try { target = new URL(input); } catch { return new Response("Invalid URL", {status:400}); }
  if (!["http:","https:"].includes(target.protocol))
    return new Response("Only HTTP(S) URLs are allowed", {status:400});

  const host = target.hostname.toLowerCase();
  if (host==="localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host==="metadata.google.internal" || isPrivateIPv4(host))
    return new Response("Local/private destinations are blocked", {status:403});

  const headers = new Headers(request.headers);
  headers.delete("host"); headers.delete("cookie"); headers.delete("authorization");
  headers.set("user-agent","Mozilla/5.0 (compatible; Proximity/1.0)");

  let response;
  try {
    response = await fetch(target.toString(), {method:request.method, headers, redirect:"manual"});
  } catch {
    return new Response("Destination could not be reached", {status:502});
  }

  const location=response.headers.get("location");
  if (response.status>=300 && response.status<400 && location) {
    try {
      const next=new URL(location,target).toString();
      const out=new URL(request.url);
      out.pathname="/proxy"; out.search="?url="+encodeURIComponent(next);
      return new Response(null,{status:response.status,headers:{Location:out.toString()}});
    } catch {}
  }

  const outHeaders=new Headers(response.headers);
  outHeaders.delete("content-security-policy");
  outHeaders.delete("content-security-policy-report-only");
  outHeaders.delete("x-frame-options");
  outHeaders.delete("content-length");
  outHeaders.set("cache-control","no-store");

  if ((outHeaders.get("content-type")||"").includes("text/html") && request.method==="GET") {
    let html=await response.text();
    html=rewrite(html,target);
    outHeaders.set("content-type","text/html; charset=UTF-8");
    return new Response(html,{status:response.status,headers:outHeaders});
  }
  return new Response(response.body,{status:response.status,headers:outHeaders});
}

function rewrite(html,base){
  for(const attr of ["href","src","action","poster"]){
    const re=new RegExp("("+attr+"\\\\s*=\\\\s*[\\\"'])([^\\\"']+)([\\\"'])","gi");
    html=html.replace(re,(m,a,url,q)=>{
      if(/^(#|data:|javascript:|mailto:|tel:|blob:)/i.test(url)) return m;
      try{const abs=new URL(url,base).toString(); if(/^https?:/i.test(abs)) return a+"/proxy?url="+encodeURIComponent(abs)+q;}catch{}
      return m;
    });
  }
  html=html.replace(/\\s+target\\s*=\\s*([\\\"'])_blank\\1/gi,"");
  html=html.replace(/\\s+target\\s*=\\s*([\\\"'])_new\\1/gi,"");
  return html;
}

function isPrivateIPv4(h){
  if(!/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(h)) return false;
  const p=h.split(".").map(Number),[a,b]=p;
  if(p.some(n=>n<0||n>255)) return true;
  return a===10||a===127||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||
         (a===192&&b===168)||a===0||a>=224;
}