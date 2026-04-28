import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInstances, createInstance, updateInstance, deleteInstance, getAdminUsers, updateAdminUser, deleteAdminUser, getEnvConfig, updateEnvConfig } from '../api';
import { Plus, Bot, ChevronRight, Activity, Users, LayoutDashboard, Trash2, Edit2, Settings, Save, RefreshCw } from 'lucide-react';
import Header from '../components/Header';

const Dashboard = () => {
  const [instances, setInstances] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSocketPort, setNewSocketPort] = useState('');
  const [editingInstance, setEditingInstance] = useState(null);
  const [activeTab, setActiveTab] = useState('instances'); // 'instances' or 'users'
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', password: '', limit: 5 });
  const [envConfig, setEnvConfig] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);
  const userRole = localStorage.getItem('userRole');

  const fetchInstances = async () => {
    try {
      const { data } = await getInstances();
      setInstances(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    try {
      const { data } = await getEnvConfig();
      setEnvConfig(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInstances();
    fetchConfig();
    if (userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole]);

  const handleConfigChange = (key, value) => {
    setEnvConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await updateEnvConfig(envConfig);
      alert('Configuration saved successfully');
    } catch (err) {
      alert('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (editingInstance) {
        await updateInstance(editingInstance.id, {
          name: newName,
          socketPort: newSocketPort
        });
      } else {
        await createInstance({ 
          name: newName, 
          accounts: newEmail,
          socketPort: newSocketPort 
        });
      }
      setShowModal(false);
      setNewName('');
      setNewEmail('');
      setNewSocketPort('');
      setEditingInstance(null);
      fetchInstances();
    } catch (err) {
      alert(err?.response?.data?.error || `Failed to ${editingInstance ? 'update' : 'create'} instance`);
    }
  };

  const handleEditInstance = (instance, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingInstance(instance);
    setNewName(instance.name);
    setNewSocketPort(instance.socketPort || '');
    setShowModal(true);
  };

  const handleDeleteInstance = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this instance? This will stop the bot and delete all its data.')) return;
    try {
      await deleteInstance(id);
      fetchInstances();
    } catch {
      alert('Failed to delete instance');
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateAdminUser(userForm);
      setShowUserModal(false);
      setUserForm({ email: '', password: '', limit: 5 });
      fetchUsers();
    } catch {
      alert('Failed to save user');
    }
  };

  const handleDeleteUser = async (email) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;
    try {
      await deleteAdminUser(email);
      fetchUsers();
    } catch {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-200">
      <Header />
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
              {activeTab === 'instances' ? 'Dashboard' : activeTab === 'users' ? 'User Management' : 'System Config'}
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              {activeTab === 'instances' ? 'Manage your WeBook bot instances' : activeTab === 'users' ? 'Manage system users and their limits' : 'Global environment configuration'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="bg-secondary p-1 rounded-lg border border-slate-700 flex overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('instances')}
                className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'instances' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Bot size={18} /> <span className="text-sm">Instances</span>
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Users size={18} /> <span className="text-sm">Users</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'config' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Settings size={18} /> <span className="text-sm">Config</span>
              </button>
            </div>
            
            {activeTab === 'instances' ? (
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={20} /> New Instance
              </button>
            ) : activeTab === 'users' ? (
              <button
                onClick={() => {
                  setUserForm({ email: '', password: '', limit: 5 });
                  setShowUserModal(true);
                }}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={20} /> Add User
              </button>
            ) : (
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                Save Config
              </button>
            )}
          </div>
        </div>

      {activeTab === 'instances' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {instances.map((instance) => (
            <Link
              key={instance.id}
              to={`/instance/${instance.id}`}
              className="bg-secondary border border-slate-700 p-6 rounded-xl hover:border-primary transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-800 p-3 rounded-lg text-primary group-hover:scale-110 transition-transform">
                  <Bot size={24} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                    instance.status === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {instance.status}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditInstance(instance, e)}
                      className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-700 transition-colors"
                      title="Edit Instance"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">{instance.name}</h3>
              <p className="text-slate-400 text-sm mb-1">{instance.email}</p>
              <p className="text-slate-500 text-xs mb-4">Port: {instance.socketPort}</p>
              <div className="flex items-center text-primary text-sm font-medium">
                View Details <ChevronRight size={16} />
              </div>
              
              <div className="absolute -right-4 -bottom-4 text-slate-800 opacity-20 transform -rotate-12">
                 <Activity size={100} />
              </div>
            </Link>
          ))}
        </div>
      ) : activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Mobile User Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {users.map((user) => (
              <div key={user.email} className="bg-secondary border border-slate-700 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium truncate">{user.email}</p>
                    <p className="text-slate-500 font-mono text-[10px] mt-1">{user.password}</p>
                  </div>
                  <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full text-primary text-xs font-bold">
                    Limit: {user.limit}
                  </span>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setUserForm(user);
                      setShowUserModal(true);
                    }}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.email)}
                    className="p-2 text-red-500 hover:text-red-400 bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-secondary border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Password</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">Instance Limit</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.email} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-sm">{user.password}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-full text-primary font-bold">
                        {user.limit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setUserForm(user);
                            setShowUserModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.email)}
                          className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-secondary border border-slate-700 rounded-xl overflow-hidden p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 md:gap-y-6">
            {Object.entries(envConfig).map(([key, value]) => {
              const isBoolean = value.toLowerCase() === 'true' || value.toLowerCase() === 'false';
              return (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-300 font-mono">{key}</label>
                    {isBoolean && (
                      <div 
                        onClick={() => handleConfigChange(key, value.toLowerCase() === 'true' ? 'false' : 'true')}
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${value.toLowerCase() === 'true' ? 'bg-primary' : 'bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${value.toLowerCase() === 'true' ? 'translate-x-6' : ''}`} />
                      </div>
                    )}
                  </div>
                  {!isBoolean ? (
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-slate-200 font-mono text-sm"
                      value={value}
                      onChange={(e) => handleConfigChange(key, e.target.value)}
                    />
                  ) : (
                    <div className="text-xs text-slate-500 font-mono">
                      Current: <span className={value.toLowerCase() === 'true' ? 'text-green-500' : 'text-slate-500'}>{value}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingInstance ? 'Edit Instance' : 'Create New Instance'}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Instance Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-slate-200"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Primary Bot"
                />
              </div>
              {!editingInstance && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Accounts (email:password, one per line)</label>
                  <textarea
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-slate-200 h-32 font-mono text-sm"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user1@gmail.com:pass123&#10;user2@gmail.com:pass456"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Socket Port (optional, default: next available)</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-slate-200"
                  value={newSocketPort}
                  onChange={(e) => setNewSocketPort(e.target.value)}
                  placeholder="e.g. 8080"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingInstance(null);
                    setNewName('');
                    setNewEmail('');
                    setNewSocketPort('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold"
                >
                  {editingInstance ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">{userForm.email ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  disabled={!!userForm.email && users.some(u => u.email === userForm.email)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-slate-200 disabled:opacity-50"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-slate-200"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  placeholder="Password"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Instance Limit</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-primary text-slate-200"
                  value={userForm.limit}
                  onChange={(e) => setUserForm({...userForm, limit: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
