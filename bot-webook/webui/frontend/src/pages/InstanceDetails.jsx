import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getInstances, startInstance, stopInstance, deleteInstance, getInstanceFiles, getFileContent, saveFileContent } from '../api';
import io from 'socket.io-client';
import Convert from 'ansi-to-html';
import { Play, Square, Settings, FileText, Terminal as TerminalIcon, Save, ArrowLeft, RefreshCw, List, LogOut, Trash2, ChevronDown, Copy, Check } from 'lucide-react';
import Header from '../components/Header';

const InstanceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('stopped');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [selectedScript, setSelectedScript] = useState('start.sh');
  const [activeTab, setActiveTab] = useState('terminal');
  const [envOverrides, setEnvOverrides] = useState({});
  const [defaultConfig, setDefaultConfig] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef(null);
  const terminalEndRef = useRef(null);
  const socketRef = useRef(null);
  const ansiConverter = useMemo(() => new Convert({
    fg: '#E2E8F0',
    bg: '#0F172A',
    newline: false,
    escapeXML: true
  }), []);

  const fetchInstance = async () => {
    try {
      const { data } = await getInstances();
      const inst = data.find(i => i.id === id);
      if (inst) {
        setInstance(inst);
        setEnvOverrides(inst.envOverrides || {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFiles = async () => {
    try {
      const { data } = await getInstanceFiles(id);
      setFiles(data.filter(f => f === 'acc.txt' || f === 'held_objects.json' || f === 'number_of_booked_seats_for_each_acc.txt' || f === 'hold-tokens.json'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEnv = async () => {
    try {
      const { data } = await api.get('/config/env');
      setDefaultConfig(data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    // Increase buffer to 50px and use a more robust check
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (atBottom !== autoScroll) {
      setAutoScroll(atBottom);
    }
  };

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    setAutoScroll(true);
  };

  useEffect(() => {
    if (autoScroll && activeTab === 'terminal' && terminalRef.current) {
      // Use direct scrollTop for immediate jumping during logs to stay at bottom
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll, activeTab]);

  useEffect(() => {
    fetchInstance();
    fetchFiles();
    fetchEnv();
    
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socketRef.current.emit('join', id);
    
    socketRef.current.on('logs', (newLog) => {
      setLogs((prev) => [...prev.slice(-500), newLog]);
    });
    
    socketRef.current.on('status', (newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [id]);

  const handleSaveEnv = async () => {
    try {
      await api.post(`/instances/${id}/env`, { envOverrides });
      alert('Env saved successfully');
    } catch {
      alert('Failed to save env');
    }
  };

  const handleStart = async () => {
    try {
      await startInstance(id, selectedScript);
      setStatus('running');
      setLogs([]);
    } catch {
      alert('Failed to start instance');
    }
  };

  const handleStop = async () => {
    try {
      await stopInstance(id);
      setStatus('stopped');
    } catch {
      alert('Failed to stop instance');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this instance? This will stop the bot and delete all its data.')) return;
    try {
      await deleteInstance(id);
      navigate('/');
    } catch {
      alert('Failed to delete instance');
    }
  };

  const loadFile = async (filename) => {
    setSelectedFile(filename);
    const { data } = await getFileContent(id, filename);
    setFileContent(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    setActiveTab('editor');
  };

  const handleSaveFile = async () => {
    try {
      await saveFileContent(id, selectedFile, fileContent);
      alert('File saved successfully');
    } catch {
      alert('Failed to save file');
    }
  };

  const handleCopyFile = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (!instance) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-slate-200">
      <Header />
      {/* Toolbar */}
      <div className="border-b border-slate-800 bg-secondary/30 backdrop-blur-md sticky top-[65px] z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-colors bg-slate-800/50 p-1.5 rounded-lg shrink-0">
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight truncate">{instance.name}</h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{status}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            <select 
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm flex-1 md:flex-none"
              value={selectedScript}
              onChange={(e) => setSelectedScript(e.target.value)}
            >
              <option value="start.sh">Bot (start.sh)</option>
              <option value="scripts/socket_listen.js">Socket Listen</option>
              <option value="scripts/prepare_booking_info.js">Prepare Info</option>
              <option value="scripts/prepare_hold_token.js">Prepare Hold Token</option>
              <option value="scripts/prepare_access_token.js">Prepare Access Token</option>
              <option value="scripts/check_booked_seats.js">Check Booked Seats</option>
              <option value="tests/socket_connect_first_account.js">Connect Socket (Test)</option>
            </select>
            {status === 'running' ? (
              <button onClick={handleStop} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 font-semibold shrink-0">
                <Square size={18} fill="currentColor" /> <span className="hidden sm:inline">Stop</span>
              </button>
            ) : (
              <button onClick={handleStart} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 font-semibold shadow-lg shadow-green-500/20 shrink-0">
                <Play size={18} fill="currentColor" /> <span className="hidden sm:inline">Start</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col lg:grid lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-secondary border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-400">Data Files</h2>
              <button onClick={fetchFiles} className="hover:text-primary"><RefreshCw size={14} /></button>
            </div>
            <div className="p-2 space-y-1 max-h-[200px] lg:max-h-[400px] overflow-y-auto">
              {files.map(file => (
                <button
                  key={file}
                  onClick={() => loadFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    selectedFile === file ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <FileText size={16} />
                  <span className="truncate">{file}</span>
                </button>
              ))}
              {files.length === 0 && <div className="text-slate-600 text-xs text-center py-4">No filtered files found</div>}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 md:gap-4 border-b border-slate-800 mb-4 pb-px">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'terminal' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
              } flex items-center gap-2`}
            >
              <TerminalIcon size={16} /> Terminal
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'editor' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
              } flex items-center gap-2`}
            >
              <FileText size={16} /> Editor {selectedFile && <span className="hidden sm:inline">({selectedFile})</span>}
            </button>
            <button
              onClick={() => setActiveTab('env')}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'env' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
              } flex items-center gap-2`}
            >
              <Settings size={16} /> <span className="hidden sm:inline">ENV Config</span><span className="sm:hidden">ENV</span>
            </button>
          </div>

          {activeTab === 'terminal' ? (
            <div className="relative group">
              <div 
                ref={terminalRef}
                onScroll={handleScroll}
                className="bg-slate-950 rounded-xl border border-slate-800 p-3 md:p-4 font-mono text-[10px] sm:text-xs md:text-sm h-[400px] md:h-[600px] overflow-y-auto shadow-inner custom-scrollbar"
              >
                {logs.length === 0 && <div className="text-slate-600 italic">No logs yet...</div>}
                {logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap mb-1 text-slate-300">
                     <span className="text-slate-600 mr-2">[{i}]</span>
                     <span dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(log) }} />
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
              
              {!autoScroll && (
                <button 
                  onClick={scrollToBottom}
                  className="absolute bottom-6 right-8 bg-primary hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all animate-bounce flex items-center gap-2 px-4 py-2 text-xs font-bold"
                >
                  <ChevronDown size={16} /> New Logs
                </button>
              )}
            </div>
          ) : activeTab === 'editor' ? (
            <div className="bg-secondary border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[400px] md:h-[600px]">
              {selectedFile ? (
                <>
                  <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-xs md:text-sm font-mono text-slate-400 truncate mr-2">{selectedFile}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyFile}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors shrink-0"
                      >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handleSaveFile}
                        className="bg-primary hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors shrink-0"
                      >
                        <Save size={14} /> Save
                      </button>
                    </div>
                  </div>
                  <textarea
                    wrap="off"
                    className="flex-1 bg-slate-950 p-3 md:p-4 font-mono text-[10px] sm:text-xs md:text-sm text-slate-300 focus:outline-none resize-none whitespace-pre overflow-x-auto"
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm p-4 text-center">
                  Select a file from the sidebar to edit
                </div>
              )}
            </div>
          ) : (
            <div className="bg-secondary border border-slate-800 rounded-xl p-4 md:p-6 h-[500px] md:h-[600px] overflow-y-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-lg md:text-xl font-bold">Environment Variables</h2>
                    <button onClick={handleSaveEnv} className="w-full sm:w-auto bg-primary hover:bg-blue-600 text-white px-4 py-1.5 rounded flex items-center justify-center gap-2">
                        <Save size={18} /> Save Config
                    </button>
                </div>
                <div className="space-y-4 pb-20">
                    {Object.keys(defaultConfig).length > 0 ? (
                      Object.keys(defaultConfig).map(key => {
                        const hasOverride = envOverrides[key] !== undefined;
                        const defaultValue = defaultConfig[key] || '';
                        const currentValue = hasOverride ? envOverrides[key] : defaultValue;
                        const isBoolean = defaultValue.toLowerCase() === 'true' || defaultValue.toLowerCase() === 'false' || 
                                          String(currentValue).toLowerCase() === 'true' || String(currentValue).toLowerCase() === 'false';
                        
                        return (
                          <div key={key} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <label className={`block text-xs font-semibold uppercase ${hasOverride ? 'text-primary' : 'text-slate-500'}`}>
                                {key} {hasOverride && '(Overridden)'}
                              </label>
                              <div className="flex items-center gap-3">
                                {hasOverride && (
                                  <button 
                                    onClick={() => {
                                      const newOverrides = { ...envOverrides };
                                      delete newOverrides[key];
                                      setEnvOverrides(newOverrides);
                                    }}
                                    className="text-[10px] text-red-500 hover:underline"
                                  >
                                    Reset
                                  </button>
                                )}
                                {isBoolean && (
                                  <div 
                                    onClick={() => {
                                      setEnvOverrides({
                                        ...envOverrides, 
                                        [key]: String(currentValue).toLowerCase() === 'true' ? 'false' : 'true'
                                      });
                                    }}
                                    className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${String(currentValue).toLowerCase() === 'true' ? 'bg-primary' : 'bg-slate-700'}`}
                                  >
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${String(currentValue).toLowerCase() === 'true' ? 'translate-x-5' : ''}`} />
                                  </div>
                                )}
                              </div>
                            </div>
                            {!isBoolean ? (
                              <input 
                                  type="text"
                                  className={`w-full bg-slate-900 border rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-sm font-mono ${
                                    hasOverride ? 'border-primary/50 text-white' : 'border-slate-700 text-slate-500'
                                  }`}
                                  value={currentValue}
                                  onChange={(e) => setEnvOverrides({...envOverrides, [key]: e.target.value})}
                                  placeholder={defaultValue}
                              />
                            ) : (
                              <div className="text-[10px] text-slate-600 font-mono">
                                Default: {defaultValue} | Current: <span className={String(currentValue).toLowerCase() === 'true' ? 'text-green-500' : 'text-slate-500'}>
                                  {currentValue}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                        [
                            'PROMPT_URL', 'IS_SEASON', 'START_WITH', 'BOT_VERSION', 
                            'EXCLUDE_BLOCKS', 'EXCLUDE_PARENTS', 'sendTG', 
                            'PREPARE_TOKEN_COOKIE', 'USER_AGENT'
                        ].map(key => {
                            const value = envOverrides[key] !== undefined ? envOverrides[key] : '';
                            const isBoolean = ['IS_SEASON', 'sendTG'].includes(key) || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'false';
                            
                            return (
                              <div key={key} className="flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                  <label className="block text-xs font-semibold text-slate-500 uppercase">{key}</label>
                                  {isBoolean && (
                                    <div 
                                      onClick={() => setEnvOverrides({...envOverrides, [key]: String(value).toLowerCase() === 'true' ? 'false' : 'true'})}
                                      className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${String(value).toLowerCase() === 'true' ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${String(value).toLowerCase() === 'true' ? 'translate-x-5' : ''}`} />
                                    </div>
                                  )}
                                </div>
                                {!isBoolean ? (
                                  <input 
                                      type="text"
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:border-primary text-slate-300 text-sm font-mono"
                                      value={value}
                                      onChange={(e) => setEnvOverrides({...envOverrides, [key]: e.target.value})}
                                      placeholder={`Enter ${key}...`}
                                  />
                                ) : (
                                  <div className="text-[10px] text-slate-600 font-mono">
                                    Current value: <span className={String(value).toLowerCase() === 'true' ? 'text-green-500' : 'text-slate-500'}>{value || 'false'}</span>
                                  </div>
                                )}
                              </div>
                            );
                        })
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstanceDetails;
