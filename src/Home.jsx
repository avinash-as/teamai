import { useState } from "react";

export default function HomePage({ onStart }) {
  const [prompt, setPrompt] = useState("");
  const submit = (e) => {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    try { sessionStorage.setItem("teamai_pending_prompt", text); } catch (e) { void e; }
    onStart?.(text);
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",zIndex:1}}>
      <div className="grid-bg"/>
      <div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/>
      <h1 style={{fontSize:"clamp(2rem,5vw,3.4rem)",fontWeight:800,letterSpacing:"-2px",marginBottom:10,textAlign:"center"}}>
        Where should we <span style={{color:"var(--accent)"}}>begin?</span>
      </h1>
      <p style={{color:"var(--muted)",fontFamily:"var(--font-m)",fontSize:".85rem",marginBottom:28,textAlign:"center",maxWidth:520}}>
        Describe what you want to build, fix, or change. TeamAI will plan, code, test, and deliver.
      </p>
      <form onSubmit={submit} style={{width:"100%",maxWidth:720}}>
        <div style={{background:"var(--card-bg)",border:"1px solid var(--border2)",borderRadius:20,padding:14,boxShadow:"var(--shadow)",backdropFilter:"blur(20px)"}}>
          <textarea
            value={prompt} onChange={e=>setPrompt(e.target.value)}
            placeholder="Ask anything..."
            rows={3}
            style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"var(--text)",fontFamily:"var(--font-m)",fontSize:".9rem",resize:"none",lineHeight:1.6}}
            onKeyDown={e=>{ if(e.key==="Enter" && (e.metaKey||e.ctrlKey)) submit(e); }}
          />
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8,gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:8}}>
              <button type="button" className="chat-hist-btn" title="Attach files">📎</button>
              <button type="button" className="chat-hist-btn" title="Thinking mode">🧠</button>
            </div>
            <button type="submit" className="build-btn" style={{padding:"10px 22px",marginTop:0}} disabled={!prompt.trim()}>Send →</button>
          </div>
        </div>
      </form>
      <div style={{marginTop:24,display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",maxWidth:720}}>
        {["Build a complete MERN stack app","Create a responsive landing page","Build a REST API with auth","Fix a bug in my project"].map(s=>(
          <button key={s} className="chip" onClick={()=>setPrompt(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}
