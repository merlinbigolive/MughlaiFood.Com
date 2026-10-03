
// Supabase visitor tracker - uses the same visitor_logs table/policy pattern.
const TRACKER = {
  supabaseUrl: window.SUPABASE_URL || "",
  anonKey: window.SUPABASE_ANON_KEY || "",
  site: window.SITE_NAME || location.hostname.replace(/^www\./,"").toLowerCase()
};

async function trackVisitor(){
  if(!TRACKER.supabaseUrl || !TRACKER.anonKey) return;
  try{
    const ua=navigator.userAgent||"";
    const bot=/bot|crawler|spider|slurp|facebookexternalhit|preview|headless/i.test(ua);
    let geo={};
    try{
      const r=await fetch("https://ipapi.co/json/",{cache:"no-store"});
      if(r.ok) geo=await r.json();
    }catch(_){}
    const row={
      site: TRACKER.site,
      visitor_type: bot ? "bot" : "human",
      city: geo.city || null,
      country: geo.country_name || null,
      country_code: geo.country_code || null,
      user_agent: ua.slice(0,1000),
      referrer: document.referrer ? document.referrer.slice(0,1000) : null
    };
    await fetch(TRACKER.supabaseUrl.replace(/\/$/,"")+"/rest/v1/visitor_logs",{
      method:"POST",
      headers:{
        "apikey":TRACKER.anonKey,
        "Authorization":"Bearer "+TRACKER.anonKey,
        "Content-Type":"application/json",
        "Prefer":"return=minimal"
      },
      body:JSON.stringify(row),
      keepalive:true
    });
  }catch(e){ console.debug("visitor tracker:",e); }
}
window.addEventListener("load",trackVisitor);
