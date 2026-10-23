import { useState } from "react";
import Editor from "@monaco-editor/react";

const RUNTIME_DEFAULT = "http://localhost:3002";

export default function WorkspacePage() {
  const [runtimeUrl, setRuntimeUrl] = useState(RUNTIME_DEFAULT);
  const [root, setRoot] = useState("");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("");
  const [entries, setEntries] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [command, setCommand] = useState("");
  const [cmdOutput, setCmdOutput] = useState("");
  const [editor, setEditor] = useState("vscode");
  const [loading, setLoading] = useState(false);

  const call = async (path, opts = {}) => {
    const res = await fetch(`${runtimeUrl}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const connect = async () => {
    setLoading(true); setStatus("");
    try {
      const data = await call(`/health`);
      setConnected(true);
      setStatus(`Connected to runtime on port ${data.port}`);
      await listDir("");
    } catch (e) {
      setConnected(false);
      setStatus(`Connect failed: ${e.message}`);
    }
    setLoading(false);
  };

  const listDir = async (rel) => {
    if (!root) { setStatus("Enter a workspace root path first."); return; }
    setLoading(true); setStatus("");
    try {
      const data = await call(`/ls?root=${encodeURIComponent(root)}&path=${encodeURIComponent(rel)}`);
      setEntries(data.entries || []);
      setCurrentPath(rel);
      setStatus(`Loaded ${data.entries?.length || 0} items`);
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  const openFile = async (rel) => {
    setLoading(true); setStatus("");
    try {
      const data = await call(`/read?root=${encodeURIComponent(root)}&path=${encodeURIComponent(rel)}`);
      setSelectedFile(rel);
      setContent(data.content || "");
      setEditContent(data.content || "");
      setStatus(`Opened ${rel}`);
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setLoading(true); setStatus("");
    try {
      await call("/write", { method: "POST", body: JSON.stringify({ root, path: selectedFile, content: editContent }) });
      setContent(editContent);
      setStatus(`Saved ${selectedFile}`);
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  const runCommand = async () => {
    if (!command.trim()) return;
    setLoading(true); setCmdOutput(""); setStatus("");
    try {
      const data = await call("/run", { method: "POST", body: JSON.stringify({ root, command }) });
      setCmdOutput((data.stdout || "") + (data.stderr ? `\n--- stderr ---\n${data.stderr}` : ""));
      setStatus("Command finished");
    } catch (e) { setCmdOutput(e.message); setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  const openEditor = async () => {
    setLoading(true); setStatus("");
    try {
      await call("/open", { method: "POST", body: JSON.stringify({ root, path: selectedFile || "", editor }) });
      setStatus(`Opened in ${editor}`);
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  return (
    <div>
      <div className="ph fu"><div className="ph-title">Local Workspace</div>
        <div className="ph-sub">// connect to the TeamAI local runtime to browse, edit, run, and open files</div></div>

      <div className="builder-box fu2">
        <div className="field-row">
          <div className="field"><label>Runtime URL</label>
            <input className="finp" value={runtimeUrl} onChange={e=>setRuntimeUrl(e.target.value)} placeholder="http://localhost:3002"/></div>
          <div className="field"><label>Workspace Root (absolute path)</label>
            <input className="finp" value={root} onChange={e=>setRoot(e.target.value)} placeholder="C:\\Projects\\my-app"/></div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
          <button className="act-btn act-btn-primary" onClick={connect} disabled={loading}>{loading?"Working...":"Connect"}</button>
          <button className="act-btn act-btn-sec" onClick={()=>listDir(currentPath)} disabled={!connected || loading}>Refresh</button>
          <button className="act-btn act-btn-sec" onClick={openEditor} disabled={!connected || loading}>Open in Editor</button>
        </div>
        <select className="finp" style={{marginTop:8,maxWidth:220}} value={editor} onChange={e=>setEditor(e.target.value)}>
          <option value="vscode">VS Code</option>
          <option value="vscode-insiders">VS Code Insiders</option>
          <option value="cursor">Cursor</option>
          <option value="windsurf">Windsurf</option>
        </select>
        {status && <div style={{marginTop:8,fontSize:".72rem",color:"var(--muted)",fontFamily:"var(--font-m)"}}>{status}</div>}
        <div style={{marginTop:6,fontSize:".65rem",color:"var(--muted2)",fontFamily:"var(--font-m)"}}>
          Start runtime: <code>npm run runtime</code>
        </div>
      </div>

      {connected && (
        <div style={{display:"flex",gap:16,marginTop:16,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:220,maxHeight:420,overflow:"auto",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:12}}>
            <div style={{fontSize:".7rem",fontWeight:800,color:"var(--muted)",marginBottom:8}}>FILES {currentPath && `— ${currentPath}`}</div>
            {currentPath && <div style={{padding:"4px 6px",cursor:"pointer",fontSize:".75rem",color:"var(--accent)",fontFamily:"var(--font-m)"}}
              onClick={()=>{const parent=currentPath.split("/").slice(0,-1).join("/");listDir(parent);}}>📁 ..</div>}
            {entries.map(e => (
              <div key={e.path} onClick={() => e.type==="dir" ? listDir(e.path) : openFile(e.path)}
                style={{padding:"4px 6px",cursor:"pointer",fontSize:".75rem",fontFamily:"var(--font-m)",borderBottom:"1px solid var(--border)",
                  color: e.type==="dir" ? "var(--accent)" : "var(--text)"}}>
                {e.type==="dir" ? "📁" : "📄"} {e.name}
              </div>
            ))}
            {entries.length === 0 && <div style={{color:"var(--muted)",fontSize:".75rem"}}>Empty directory</div>}
          </div>

          {selectedFile && (
            <div style={{flex:2,minWidth:300}}>
              <div style={{fontSize:".75rem",fontWeight:800,marginBottom:6}}>{selectedFile}</div>
              <div style={{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
                <Editor height="420px" defaultLanguage="javascript" value={editContent} onChange={(v)=>setEditContent(v||"")}
                  theme="vs-dark" options={{ minimap:{enabled:false}, fontSize:13, wordWrap:"on" }}/>
              </div>
              <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                <button className="act-btn act-btn-primary" onClick={saveFile} disabled={loading}>Save</button>
                <button className="act-btn act-btn-sec" onClick={()=>setEditContent(content)} disabled={loading}>Revert</button>
              </div>
            </div>
          )}
        </div>
      )}

      {connected && (
        <div className="builder-box fu2" style={{marginTop:16}}>
          <h3 style={{marginBottom:8}}>Run Command</h3>
          <input className="finp" value={command} onChange={e=>setCommand(e.target.value)} placeholder="npm test" onKeyDown={e=>e.key==="Enter"&&runCommand()}/>
          <button className="act-btn act-btn-primary" style={{marginTop:8}} onClick={runCommand} disabled={loading || !command.trim()}>Run</button>
          {cmdOutput && <pre style={{marginTop:12,background:"var(--surface2)",padding:12,borderRadius:8,fontFamily:"var(--font-m)",fontSize:".72rem",whiteSpace:"pre-wrap",maxHeight:300,overflow:"auto"}}>{cmdOutput}</pre>}
        </div>
      )}
    </div>
  );
}
