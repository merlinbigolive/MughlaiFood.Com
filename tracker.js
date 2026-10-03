// MughlaiFood visitor tracker: browser sends visitor details to the server-side API.
async function trackVisitor(){
  try{
    const ua=navigator.userAgent||"";
    const bot=/bot|crawler|spider|slurp|facebookexternalhit|preview|headless/i.test(ua);
    let geo={};
    try{
      const r=await fetch("https://ipapi.co/json/",{cache:"no-store"});
      if(r.ok) geo=await r.json();
    }catch(_){ }
    const row={
      site:"mughlaifood.com",
      visitor_type:bot?"bot":"human",
      city:geo.city||null,
      country:geo.country_name||null,
      country_code:geo.country_code||null,
      user_agent:ua.slice(0,1000),
      referrer:document.referrer?document.referrer.slice(0,1000):null
    };
    await fetch("/api/track",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(row),
      keepalive:true
    });
  }catch(e){ console.debug("visitor tracker:",e); }
}
window.addEventListener("load",trackVisitor);
