import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Upload,
  GitBranch,
  FileText,
  Download,
  Zap,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

const API_URL = "https://vedant8771.pythonanywhere.com";

function App() {
  const [activeTab, setActiveTab] = useState("single");
  const [code, setCode] = useState("");
  const [results, setResults] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const editorRef = useRef(null);
  // Preview Modal
  const [previewFile, setPreviewFile] = useState(null);
  const previewEditorRef = useRef(null);
  const [copied, setCopied] = useState(false);
  // Progress
  const [progress, setProgress] = useState(0);
  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const multiFileInputRef = useRef(null);
  // Function Details Modal
  const [showFunctionModal, setShowFunctionModal] = useState(false);
  const [modalFunctions, setModalFunctions] = useState([]);
  // =========================
  // FETCH HELPER
  // =========================
  const fetchWithError = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Backend error");
    return data;
  };
  // =========================
  // PROGRESS
  // =========================
  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      const steps = [15, 35, 55, 75, 88, 94];
      let i = 0;
      interval = setInterval(() => {
        setProgress(steps[i]);
        i++;
        if (i >= steps.length) clearInterval(interval);
      }, 380);
    } else {
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 700);
      return () => clearTimeout(t);
    }
    return () => clearInterval(interval);
  }, [loading]);
  // =========================
  // ANALYZE FUNCTIONS
  // =========================
  const analyzeCode = async () => {
    setLoading(true);
    try {
      const data = await fetchWithError(`${API_URL}/analyze`, { code });
     
      setResults(data);
      if (editorRef.current) applyHeatmap(data.functions || []);
    } catch (e) {
      alert(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const analyzeMulti = async () => {
    setLoading(true);
    try {
      const data = await fetchWithError(`${API_URL}/analyze-multi`, { files });
      setResults(data);
    } catch (e) {
      alert(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const analyzeRepo = async () => {
    setLoading(true);
    try {
      const data = await fetchWithError(`${API_URL}/analyze-repo`, { repo_url: githubUrl });
      setResults(data);
    } catch (e) {
      alert(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const analyzeWithAI = async () => {
    setLoading(true);
    try {
      let body = { code: "" };
      if (activeTab === "single") body = { code };
      else if (activeTab === "multi" && files.length > 0) body = { code: files[0].code };
      else if (activeTab === "repo") {
        alert("AI Deep Analysis is currently available only for Single & Multi-File tabs.");
        setLoading(false);
        return;
      }
      const data = await fetchWithError(`${API_URL}/ai-analyze`, body);
      let parsed = typeof data.ai_analysis === "string" ? JSON.parse(data.ai_analysis) : data.ai_analysis;
      setAiResult(parsed);
    } catch (e) {
      setAiResult({ error: e.message });
    }
    setLoading(false);
  };
  // =========================
  // HEATMAP
  // =========================
  const applyHeatmap = (functions) => {
    if (!editorRef.current) return;
    const decorations = functions.map((func) => ({
      range: {
        startLineNumber: func.lineno,
        endLineNumber: func.lineno + (func.length_lines || 1),
        startColumn: 1,
        endColumn: 1000,
      },
      options: {
        isWholeLine: true,
        className:
          func.complexity > 15
            ? "heatmap-high"
            : func.complexity > 7
            ? "heatmap-medium"
            : "heatmap-low",
      },
    }));
    editorRef.current.deltaDecorations([], decorations);
  };
  // =========================
  // MULTI FILE
  // =========================
  const processFiles = async (fileList) => {
    const pyFiles = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".py"));
    const fileData = await Promise.all(
      pyFiles.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                code: reader.result,
                size: file.size,
              });
            reader.readAsText(file);
          })
      )
    );
    setFiles((prev) => [...prev, ...fileData]);
  };
  const handleMultiUpload = (e) => processFiles(e.target.files);
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const clearAllFiles = () => setFiles([]);
  // =========================
  // LINTER
  // =========================
  const runLinter = (codeText, editorInstance) => {
    if (!editorInstance || !window.monaco) return;
    const model = editorInstance.getModel();
    if (!model) return;
    const lines = codeText.split("\n");
    const markers = [];
    lines.forEach((line, i) => {
      const lineNum = i + 1;
      if (line.includes("print(") && !line.includes("logging")) {
        markers.push({
          startLineNumber: lineNum,
          endLineNumber: lineNum,
          startColumn: line.indexOf("print") + 1,
          endColumn: line.indexOf("print") + 6,
          message: "Consider using logging module instead of print()",
          severity: window.monaco.MarkerSeverity.Warning,
        });
      }
      if (line.length > 120) {
        markers.push({
          startLineNumber: lineNum,
          endLineNumber: lineNum,
          startColumn: 121,
          endColumn: line.length + 1,
          message: "Line too long (PEP 8: max 120 chars)",
          severity: window.monaco.MarkerSeverity.Warning,
        });
      }
      if (line.trim().startsWith("TODO") || line.trim().startsWith("# TODO")) {
        markers.push({
          startLineNumber: lineNum,
          endLineNumber: lineNum,
          startColumn: 1,
          endColumn: line.length + 1,
          message: "TODO found",
          severity: window.monaco.MarkerSeverity.Info,
        });
      }
    });
    window.monaco.editor.setModelMarkers(model, "python-linter", markers);
  };
  // =========================
  // CHART & METRICS
  // =========================
  const chartData = results?.functions?.map((f) => ({
    name: f.name,
    complexity: f.complexity,
  })) || [];
  const totalFunctions = results?.functions?.length || 0;
  const avgComplexity = totalFunctions
    ? Math.round(results.functions.reduce((sum, f) => sum + f.complexity, 0) / totalFunctions)
    : 0;
  const highRiskCount = results?.functions?.filter((f) => f.complexity > 15).length || 0;
  const totalLines = files.reduce((sum, f) => sum + (f.code.split("\n").length), 0);
  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-x-4">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
              🚀
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-300">
                CodePulse AI
              </h1>
              <p className="text-emerald-400 text-sm font-medium -mt-1">Real-time code intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-x-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 h-9 rounded-3xl text-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            Backend Connected
          </div>
        </div>
        {/* TABS */}
        <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-1 mb-10 shadow-2xl">
          {[
            { id: "single", label: "Single File", icon: FileText },
            { id: "multi", label: "Multi File", icon: Upload },
            { id: "repo", label: "GitHub Repo", icon: GitBranch },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-x-2 px-7 py-3 rounded-3xl text-sm font-semibold transition-all ${
                  activeTab === tab.id ? "bg-white text-zinc-900 shadow-lg" : "hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: INPUT AREA */}
          <div className="lg:col-span-7">
            {/* SINGLE FILE */}
            {activeTab === "single" && (
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl h-full flex flex-col" style={{ minHeight: "720px" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-x-3">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-xl">Python Code Editor</h2>
                  </div>
                  <div className="text-xs px-3 py-1 bg-emerald-400/10 text-emerald-400 rounded-2xl font-mono">
                    HEATMAP + LINT ENABLED
                  </div>
                </div>
                <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden" style={{ minHeight: "580px" }}>
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language="python"
                    value={code}
                    onChange={setCode}
                    onMount={(editor) => {
                      editorRef.current = editor;
                      if (results?.functions) applyHeatmap(results.functions);
                    }}
                    options={{
                      minimap: { enabled: true },
                      fontSize: 15,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      automaticLayout: true,
                      folding: true,
                      bracketPairColorization: { enabled: true },
                      tabSize: 4,
                      insertSpaces: true,
                    }}
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={analyzeCode}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-x-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 transition-all px-8 py-4 rounded-3xl font-semibold text-lg shadow-xl disabled:opacity-70"
                  >
                    <Zap className="w-6 h-6" />
                    {loading ? "Analyzing..." : "Analyze Complexity"}
                  </button>
                  <button
                    onClick={analyzeWithAI}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-x-3 bg-gradient-to-r from-purple-500 to-violet-400 hover:from-purple-600 hover:to-violet-500 transition-all px-8 py-4 rounded-3xl font-semibold text-lg shadow-xl disabled:opacity-70"
                  >
                    🤖 {loading ? "Thinking..." : "AI Deep Analysis"}
                  </button>
                </div>
              </div>
            )}
            {/* MULTI FILE */}
            {activeTab === "multi" && (
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-x-3">
                    <Upload className="w-6 h-6 text-amber-400" />
                    <h2 className="font-semibold text-2xl">Multi-File Analyzer</h2>
                  </div>
                  {files.length > 0 && (
                    <div className="flex items-center gap-x-4 text-xs">
                      <span className="bg-emerald-400/10 text-emerald-400 px-3 py-1 rounded-2xl">
                        {files.length} files • {totalLines} lines
                      </span>
                      <button
                        onClick={clearAllFiles}
                        className="flex items-center gap-x-2 text-red-400 hover:text-red-500 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl py-16 cursor-pointer transition-all group ${
                    isDragging ? "border-amber-400 bg-amber-400/10 scale-105" : "border-white/30 hover:border-amber-400/60"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={handleDrop}
                  onClick={() => multiFileInputRef.current?.click()}
                >
                  <Upload className="w-16 h-16 text-white/40 group-hover:text-amber-400 transition-colors mb-4" />
                  <p className="text-xl font-medium mb-1">
                    {isDragging ? "Drop your .py files here ✨" : "Drop Python files or click to browse"}
                  </p>
                  <p className="text-white/60 text-sm">Multiple files • .py only • Unlimited batches</p>
                  <input
                    ref={multiFileInputRef}
                    type="file"
                    multiple
                    accept=".py"
                    onChange={handleMultiUpload}
                    className="hidden"
                  />
                </div>
                {files.length > 0 && (
                  <div className="mt-8">
                    <div className="space-y-2 max-h-72 overflow-auto pr-2">
                      {files.map((file, i) => {
                        const lineCount = file.code.split("\n").length;
                        const sizeKB = (file.size / 1024).toFixed(1);
                        return (
                          <div
                            key={i}
                            className="group flex items-center gap-x-3 bg-white/5 hover:bg-white/10 px-5 py-4 rounded-3xl transition-all"
                          >
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="text-emerald-400 hover:text-white transition-colors"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span className="font-mono text-sm flex-1 truncate">{file.name}</span>
                            <span className="text-xs bg-emerald-400/10 text-emerald-400 px-3 py-1 rounded-2xl font-medium">
                              {lineCount} lines
                            </span>
                            <span className="text-xs text-white/50">{sizeKB} KB</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(i);
                              }}
                              className="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={analyzeMulti}
                    disabled={loading || files.length === 0}
                    className="flex-1 flex items-center justify-center gap-x-3 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 transition-all px-8 py-5 rounded-3xl font-semibold text-lg shadow-xl disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5" />
                    {loading ? "Analyzing All Files..." : `Analyze ${files.length} File${files.length !== 1 ? "s" : ""}`}
                  </button>
                  <button
                    onClick={analyzeWithAI}
                    disabled={loading || files.length === 0}
                    className="flex-1 flex items-center justify-center gap-x-3 bg-gradient-to-r from-purple-500 to-violet-400 hover:from-purple-600 hover:to-violet-500 transition-all px-8 py-5 rounded-3xl font-semibold text-lg shadow-xl disabled:opacity-50"
                  >
                    🤖 {loading ? "Thinking..." : "AI Deep Analysis"}
                  </button>
                </div>
              </div>
            )}
            {/* REPO */}
            {activeTab === "repo" && (
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-x-3 mb-6">
                  <GitBranch className="w-6 h-6 text-blue-400" />
                  <h2 className="font-semibold text-2xl">Analyze GitHub Repository</h2>
                </div>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="https://github.com/username/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 focus:border-blue-400 rounded-3xl pl-14 pr-6 py-7 text-lg placeholder:text-white/40 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={analyzeRepo}
                    disabled={loading || !githubUrl}
                    className="flex-1 flex items-center justify-center gap-x-3 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all px-8 py-5 rounded-3xl font-semibold text-lg shadow-xl disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5" />
                    {loading ? "Analyzing..." : "Analyze Complexity"}
                  </button>
                  <button
                    onClick={analyzeWithAI}
                    disabled={loading || !githubUrl}
                    className="flex-1 flex items-center justify-center gap-x-3 bg-gradient-to-r from-purple-500 to-violet-400 hover:from-purple-600 hover:to-violet-500 transition-all px-8 py-5 rounded-3xl font-semibold text-lg shadow-xl disabled:opacity-50"
                  >
                    🤖 {loading ? "Thinking..." : "AI Deep Analysis"}
                  </button>
                </div>
                <p className="text-center text-xs text-white/40 mt-6">Public repos only • Analyzes all Python files</p>
              </div>
            )}
          </div>
          {/* RIGHT: DASHBOARD */}
          <div className="lg:col-span-5 space-y-8">
            {results && (
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-7 shadow-2xl">
                <h2 className="font-semibold text-xl mb-5 flex items-center gap-x-2">📊 Analysis Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-2xl p-5 text-center">
                    <div className="text-emerald-400 text-4xl font-bold mb-1">{totalFunctions}</div>
                    <div className="text-xs uppercase tracking-widest text-white/60">Functions</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 text-center">
                    <div className="text-amber-400 text-4xl font-bold mb-1">{avgComplexity}</div>
                    <div className="text-xs uppercase tracking-widest text-white/60">Avg Complexity</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 text-center relative">
                    <div className="text-red-400 text-4xl font-bold mb-1">{highRiskCount}</div>
                    <div className="text-xs uppercase tracking-widest text-white/60">High Risk</div>
                    {highRiskCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-bold w-5 h-5 rounded-2xl flex items-center justify-center ring-2 ring-zinc-900">
                        !
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalFunctions(results.functions || []);
                    setShowFunctionModal(true);
                  }}
                  className="mt-6 w-full flex items-center justify-center gap-x-2 bg-white/10 hover:bg-white/20 transition-all text-white px-6 py-3 rounded-2xl font-medium"
                >
                  <FileText className="w-4 h-4" />
                  View Full Function Details
                </button>
              </div>
            )}
            {aiResult && (
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-7 shadow-2xl">
                <div className="flex items-center gap-x-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-violet-400 rounded-2xl flex items-center justify-center text-xl">🤖</div>
                  <h2 className="font-semibold text-xl">AI Intelligence Report</h2>
                </div>
                {aiResult.error && (
                  <div className="flex gap-x-3 bg-red-400/10 border border-red-400/30 rounded-2xl p-4 text-red-300">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p>{aiResult.error}</p>
                  </div>
                )}
                {aiResult.issues && (
                  <div className="mb-7">
                    <div className="flex items-center gap-x-2 text-red-400 text-sm mb-3">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Issues Detected</span>
                    </div>
                    <ul className="space-y-3">
                      {aiResult.issues.map((issue, idx) => (
                        <li key={idx} className="flex gap-x-3 text-sm bg-white/5 rounded-2xl p-4">
                          <span className="text-red-400 font-bold text-xl leading-none mt-px">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiResult.suggestions && (
                  <div className="mb-7">
                    <div className="flex items-center gap-x-2 text-emerald-400 text-sm mb-3">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Smart Suggestions</span>
                    </div>
                    <ul className="space-y-3">
                      {aiResult.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex gap-x-3 text-sm bg-white/5 rounded-2xl p-4">
                          <span className="text-emerald-400 font-bold text-xl leading-none mt-px">→</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiResult.refactoring && (
                  <div>
                    <div className="flex items-center gap-x-2 text-violet-400 text-sm mb-3">
                      <Zap className="w-4 h-4" />
                      <span className="font-medium">Refactoring Ideas</span>
                    </div>
                    <ul className="space-y-3">
                      {aiResult.refactoring.map((refactor, idx) => (
                        <li key={idx} className="flex gap-x-3 text-sm bg-white/5 rounded-2xl p-4">
                          <span className="text-violet-400 font-bold text-xl leading-none mt-px">♻</span>
                          {refactor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {loading && (
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-full max-w-xs bg-white/10 h-2.5 rounded-3xl overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-500 rounded-3xl"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-lg font-medium">Crunching your code...</p>
                <p className="text-white/50 text-sm mt-1">
                  {activeTab === "multi" ? `Processing ${files.length} files` : "Static analysis + AI"}
                </p>
              </div>
            )}
            {!results && !aiResult && !loading && (
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="text-6xl mb-6 opacity-30">📡</div>
                <h3 className="text-2xl font-medium mb-2">Ready for analysis</h3>
                <p className="text-white/60">Click Analyze to see metrics, chart &amp; function details</p>
              </div>
            )}
          </div>
        </div>
        {/* BOTTOM CHART */}
        {chartData.length > 0 && (
          <>
            <div className="mt-12 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h2 className="font-semibold text-2xl mb-6 flex items-center gap-x-2">📈 Complexity Distribution</h2>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" tick={{ fill: "#ffffff80", fontSize: 13 }} />
                  <YAxis tick={{ fill: "#ffffff80", fontSize: 13 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#ffffff20", borderRadius: "16px" }}
                    labelStyle={{ color: "#a3e4d0" }}
                  />
                  <Bar dataKey="complexity" fill="#34d399" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "codepulse-report.json";
                  a.click();
                }}
                className="flex items-center gap-x-3 bg-white text-zinc-900 px-7 py-4 rounded-3xl font-semibold hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                <Download className="w-5 h-5" />
                Download Full Report (JSON)
              </button>
            </div>
          </>
        )}
      </div>
      {/* PREVIEW MODAL - FIXED (no blank screen) */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-6">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-6xl max-h-[96vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-x-3">
                <span className="text-3xl">🐍</span>
                <div>
                  <h2 className="font-semibold text-xl font-mono tracking-tight">Preview: {previewFile.name}</h2>
                  <p className="text-white/50 text-xs">
                    {previewFile.code.split("\n").length} lines • {(previewFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-x-4">
                <button
                  onClick={() => runLinter(previewFile.code, previewEditorRef.current)}
                  className="flex items-center gap-x-2 px-5 py-2 text-sm font-medium bg-white/10 hover:bg-amber-400/20 hover:text-amber-300 rounded-2xl transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Run Linter
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewFile.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-x-2 px-5 py-2 text-sm font-medium bg-white/10 hover:bg-emerald-400/20 hover:text-emerald-300 rounded-2xl transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Code"}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([previewFile.code], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = previewFile.name;
                    a.click();
                  }}
                  className="flex items-center gap-x-2 px-5 py-2 text-sm font-medium bg-white/10 hover:bg-teal-400/20 hover:text-teal-300 rounded-2xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download .py
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            {/* FIXED EDITOR - No more blank screen */}
            <div className="flex-1 p-4 bg-[#1e1e1e] overflow-hidden" style={{ height: "640px" }}>
              <Editor
                key={previewFile.name}
                height="100%"
                theme="vs-dark"
                language="python"
                value={previewFile.code}
                onMount={(editor) => {
                  previewEditorRef.current = editor;
                  runLinter(previewFile.code, editor);
                }}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  fontSize: 15,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  folding: true,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </div>
            <div className="px-8 py-3 text-xs text-white/40 border-t border-white/10 flex items-center justify-between bg-zinc-950">
              <div>Read-only preview • Monaco Editor • Linter active</div>
              <div className="flex items-center gap-x-2">
                <span className="bg-emerald-400/10 text-emerald-400 px-3 py-1 rounded-2xl text-[10px]">PEP 8 ready</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* FUNCTION DETAILS MODAL */}
      {showFunctionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="bg-zinc-800 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-x-3">
                <FileText className="w-6 h-6 text-emerald-400" />
                <h2 className="text-2xl font-semibold">Function Details</h2>
              </div>
              <button
                onClick={() => setShowFunctionModal(false)}
                className="p-2 hover:bg-white/10 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-auto max-h-[calc(85vh-80px)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/60 text-sm">
                    <th className="pb-4 font-medium">Function Name</th>
                    <th className="pb-4 font-medium text-center">Complexity</th>
                    <th className="pb-4 font-medium text-center">Lines</th>
                    <th className="pb-4 font-medium text-center">Start Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {modalFunctions.map((func, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 font-mono">{func.name}</td>
                      <td className="py-4 text-center">
                        <span
                          className={`inline-block px-4 py-1 rounded-2xl text-xs font-bold ${
                            func.complexity > 15
                              ? "bg-red-400/20 text-red-400"
                              : func.complexity > 7
                              ? "bg-amber-400/20 text-amber-400"
                              : "bg-emerald-400/20 text-emerald-400"
                          }`}
                        >
                          {func.complexity}
                        </span>
                      </td>
                      <td className="py-4 text-center font-medium">{func.length_lines || "—"}</td>
                      <td className="py-4 text-center font-medium text-white/70">{func.lineno}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {modalFunctions.length === 0 && (
                <p className="text-center text-white/40 py-12">No functions found in this analysis.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
