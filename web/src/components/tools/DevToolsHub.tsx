import React, { useState } from 'react';
import { 
  Code2, 
  Binary, 
  Clock, 
  Wifi, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';

export const DevToolsHub: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'json' | 'base64' | 'timestamp' | 'jwt' | 'ping'>('json');
  const [copied, setCopied] = useState(false);

  // JSON State
  const [jsonInput, setJsonInput] = useState('{"name":"personal_utils","version":1,"tools":["containers","json","jwt"],"status":"ok"}');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Base64 State
  const [b64Input, setB64Input] = useState('Hello Go + React Developer!');
  const [b64Output, setB64Output] = useState('');

  // Timestamp State
  const [tsInput, setTsInput] = useState(Math.floor(Date.now() / 1000).toString());
  const [dateOutput, setDateOutput] = useState('');

  // Ping State
  const [pingHost, setPingHost] = useState('127.0.0.1');
  const [pingPort, setPingPort] = useState('5432');
  const [pingResult, setPingResult] = useState<any>(null);
  const [pingLoading, setPingLoading] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // JSON format
  const formatJSON = (spaces = 2) => {
    try {
      const obj = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(obj, null, spaces));
      setJsonError('');
    } catch (e: any) {
      setJsonError(e.message);
      setJsonOutput('');
    }
  };

  // Base64 Encode/Decode
  const encodeB64 = () => {
    try {
      setB64Output(btoa(unescape(encodeURIComponent(b64Input))));
    } catch (e: any) {
      setB64Output('Error: ' + e.message);
    }
  };

  const decodeB64 = () => {
    try {
      setB64Output(decodeURIComponent(escape(atob(b64Input))));
    } catch (e: any) {
      setB64Output('Error: ' + e.message);
    }
  };

  // Timestamp convert
  const convertTimestamp = () => {
    const num = Number(tsInput);
    if (isNaN(num)) {
      setDateOutput('Invalid timestamp');
      return;
    }
    const ms = tsInput.length === 10 ? num * 1000 : num;
    const d = new Date(ms);
    setDateOutput(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} (UTC+8)`);
  };

  // TCP Ping
  const handlePing = async () => {
    setPingLoading(true);
    try {
      const res = await api.pingTest(pingHost, Number(pingPort));
      setPingResult(res);
    } catch (err: any) {
      setPingResult({ connected: false, error: err.message });
    } finally {
      setPingLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 bg-[#09090b] overflow-y-auto max-w-6xl mx-auto w-full">
      {/* Tool Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            内置开发者快算与诊断工具箱
          </h2>
          <p className="text-xs text-[#71717a] mt-0.5">
            纯客户端毫秒级运算与 Go 后端系统诊断能力
          </p>
        </div>

        {/* Tool Category Selector */}
        <div className="flex items-center gap-1.5 bg-[#18181b] p-1 rounded-xl border border-[#27272a]">
          {[
            { id: 'json', label: 'JSON 美化/压缩', icon: Code2 },
            { id: 'base64', label: 'Base64 编解码', icon: Binary },
            { id: 'timestamp', label: '时间戳转换', icon: Clock },
            { id: 'ping', label: '端口连通性探测 (Ping)', icon: Wifi },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* JSON Formatter */}
      {activeTool === 'json' && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#f4f4f5]">JSON 格式化与校验</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => formatJSON(2)}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                格式化 (2空格)
              </button>
              <button
                onClick={() => formatJSON(0)}
                className="px-3 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] text-xs transition-colors"
              >
                压缩单行
              </button>
              <button
                onClick={() => { setJsonInput(''); setJsonOutput(''); }}
                className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-red-400"
                title="清空"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[#71717a] block mb-1">输入原始 JSON</label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={14}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-3 font-mono text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#71717a]">格式化输出</label>
                {jsonOutput && (
                  <button
                    onClick={() => handleCopy(jsonOutput)}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? '已复制' : '复制结果'}
                  </button>
                )}
              </div>
              <textarea
                readOnly
                value={jsonError ? `Error: ${jsonError}` : jsonOutput}
                rows={14}
                className={`w-full bg-[#09090b] border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none ${
                  jsonError ? 'border-red-500/50 text-red-400' : 'border-[#27272a] text-emerald-400'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Base64 Tool */}
      {activeTool === 'base64' && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#f4f4f5]">Base64 字符串快速编解码</span>
            <div className="flex items-center gap-2">
              <button
                onClick={encodeB64}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                Base64 编码 (Encode)
              </button>
              <button
                onClick={decodeB64}
                className="px-3 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] text-xs transition-colors"
              >
                Base64 解码 (Decode)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[#71717a] block mb-1">输入内容</label>
              <textarea
                value={b64Input}
                onChange={(e) => setB64Input(e.target.value)}
                rows={10}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-3 font-mono text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#71717a]">转换结果</label>
                {b64Output && (
                  <button
                    onClick={() => handleCopy(b64Output)}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? '已复制' : '复制结果'}
                  </button>
                )}
              </div>
              <textarea
                readOnly
                value={b64Output}
                rows={10}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-3 font-mono text-xs text-sky-400 resize-none focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Timestamp Tool */}
      {activeTool === 'timestamp' && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-4">
          <span className="text-xs font-semibold text-[#f4f4f5] block">Unix 时间戳与北京时间互转</span>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="输入 10位或13位时间戳"
              className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setTsInput(Math.floor(Date.now() / 1000).toString())}
              className="px-3 py-2 rounded bg-[#27272a] hover:bg-[#3f3f46] text-xs text-[#a1a1aa] hover:text-white"
            >
              填入当前时间戳
            </button>
            <button
              onClick={convertTimestamp}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
            >
              转换日期
            </button>
          </div>

          {dateOutput && (
            <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-lg flex items-center justify-between">
              <span className="text-xs text-[#a1a1aa]">转换结果:</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{dateOutput}</span>
            </div>
          )}
        </div>
      )}

      {/* TCP Ping Tool */}
      {activeTool === 'ping' && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-semibold text-[#f4f4f5] block">TCP 端口连通性探测 (Go Backend Engine)</span>
            <p className="text-[11px] text-[#71717a] mt-0.5">直接利用 Go 后端测试本地容器、PostgreSQL 或公网服务器端口是否开放</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={pingHost}
                onChange={(e) => setPingHost(e.target.value)}
                placeholder="目标主机 (如 127.0.0.1 或 github.com)"
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-28">
              <input
                type="number"
                value={pingPort}
                onChange={(e) => setPingPort(e.target.value)}
                placeholder="端口 (如 5432)"
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handlePing}
              disabled={pingLoading}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {pingLoading && <span className="animate-spin">🌀</span>}
              <span>立即探测</span>
            </button>
          </div>

          {pingResult && (
            <div className={`p-3.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
              pingResult.connected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${pingResult.connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span>{pingResult.connected ? '端口开放正常 (Reachable)' : `连接失败: ${pingResult.error}`}</span>
              </div>
              {pingResult.connected && (
                <span className="text-[11px] opacity-80">耗时: {pingResult.latency} ms</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
