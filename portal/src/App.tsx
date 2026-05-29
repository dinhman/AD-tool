import { useState, useEffect } from 'react';

function App() {
  const [config, setConfig] = useState<any>(null);
  const [botStatus, setBotStatus] = useState(false);
  const [dashboard, setDashboard] = useState<any>({ logs: [], stats: { awaiting: 0, inTalk: 0, total: 0, currentLines: 0 }, agents: [] });
  const [loading, setLoading] = useState(true);
const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');
const [capturing, setCapturing] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:3005/api/config');
      const data = await res.json();
      setConfig(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('http://localhost:3005/api/dashboard');
      const data = await res.json();
      setDashboard(data);
      setBotStatus(data.isRunning);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 3000);
    return () => clearInterval(interval);
  }, []);

  const saveConfig = async () => {
    try {
      await fetch('http://localhost:3005/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Đã lưu cấu hình thành công!');
    } catch (e) {
      alert('Lỗi khi lưu cấu hình');
    }
  };

  const resetConfig = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục cấu hình mặc định? Toàn bộ thiết lập hiện tại sẽ bị xóa.')) return;
    try {
      const res = await fetch('http://localhost:3005/api/config/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        alert('Đã khôi phục cấu hình mặc định!');
      } else {
        alert('Lỗi khi khôi phục cấu hình');
      }
    } catch (e) {
      alert('Lỗi kết nối khi khôi phục cấu hình');
    }
  };

  const toggleBot = async () => {
    const action = botStatus ? 'stop' : 'start';
    try {
      const res = await fetch(`http://localhost:3005/api/bot/${action}`, { method: 'POST' });
      const data = await res.json();
      setBotStatus(data.isRunning);
      fetchDashboard();
    } catch (e) {
      alert('Lỗi khi kết nối đến Bot');
    }
  };

  const captureMouse = async (category: string, fieldX: string, fieldY: string) => {
    const captureId = `${category}_${fieldX}`;
    setCapturing(captureId);
    try {
      const res = await fetch('http://localhost:3005/api/mouse-capture');
      const data = await res.json();
      setConfig((prev: any) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [fieldX]: data.x,
          [fieldY]: data.y
        }
      }));
    } catch (e) {
      alert('Không lấy được tọa độ');
    } finally {
      setCapturing(null);
    }
  };

  if (loading || !config?.general) return <div className="p-10 text-center text-xl font-semibold text-gray-700">Đang tải cấu hình hoặc kết nối thất bại... Hãy chắc chắn Backend đang chạy ở port 3005!</div>;

  return (
    <div className="min-h-screen p-8 text-gray-800 flex justify-center">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Config */}
        <div className="flex-1 space-y-6">
          <div className="flex space-x-4 mb-2">
            <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-t-lg font-bold ${activeTab === 'config' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Cấu hình Chung</button>
            <button onClick={() => setActiveTab('sql')} className={`px-4 py-2 rounded-t-lg font-bold ${activeTab === 'sql' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Kết nối SQL</button>
          </div>

          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Auto Scale Bot</h1>
              <p className="text-gray-500 mt-1 font-medium">Cấu hình Computer Vision RPA</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleBot}
                className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg ${botStatus ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}`}
              >
                {botStatus ? 'Dừng Bot 🛑' : 'Khởi động Bot 🚀'}
              </button>
            </div>
          </div>

          {activeTab === 'config' && (
            <>
              <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-blue-500">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">1. Quy tắc Tự động</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Ngưỡng Awaiting (Tăng)</label><input type="number" value={config.general.thresholdWaiting} onChange={(e) => setConfig({...config, general: {...config.general, thresholdWaiting: parseInt(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Mỗi lần tăng</label><input type="number" value={config.general.stepUp} onChange={(e) => setConfig({...config, general: {...config.general, stepUp: parseInt(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Mỗi lần giảm</label><input type="number" value={config.general.stepDown} onChange={(e) => setConfig({...config, general: {...config.general, stepDown: parseInt(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Chu kỳ quét (ms)</label><input type="number" value={config.general.cooldownMs} onChange={(e) => setConfig({...config, general: {...config.general, cooldownMs: parseInt(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Số line Tối đa</label><input type="number" value={config.general.maxLines} onChange={(e) => setConfig({...config, general: {...config.general, maxLines: parseInt(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Số line Tối thiểu</label><input type="number" value={config.general.minLines} onChange={(e) => setConfig({...config, general: {...config.general, minLines: parseInt(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Danh sách nhân viên (Login) theo dõi (cách nhau bởi dấu phẩy)</label>
                  <input type="text" placeholder="VD: vy.vo, quynh.phan02, nga.le" value={config.general.monitoredAgents || ''} onChange={(e) => setConfig({...config, general: {...config.general, monitoredAgents: e.target.value}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="mt-4 flex items-center bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <input type="checkbox" id="monitorOnly" checked={config.general.monitorOnly || false} onChange={(e) => setConfig({...config, general: {...config.general, monitorOnly: e.target.checked}})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mr-3" />
                  <label htmlFor="monitorOnly" className="text-sm font-bold text-yellow-800 cursor-pointer">
                    Chế độ Monitor-Only (Chỉ theo dõi trên Dashboard, KHÔNG cho phép Bot tự động Click sửa số Line)
                  </label>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-green-500">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">2. Tọa độ Nhập liệu (Hỗ trợ 2 Campaign)</h2>
                  <button onClick={async () => {
                      try {
                          const res = await fetch('http://localhost:3005/api/bot/test-click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: 10 }) });
                          const data = await res.json();
                          alert(data.message || (data.success ? "Test thành công!" : "Test thất bại!"));
                      } catch (e) { alert("Lỗi khi gọi API Test Click"); }
                  }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center">
                    🖱️ Test Chuỗi Click
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Campaign 1 */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-green-700 bg-green-50 p-2 rounded-lg text-center border border-green-100">Campaign 1 (Trái)</h3>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-gray-700">Ô nhập "Line Limit"</span>
                        <button onClick={() => captureMouse('click', 'camp1_inputX', 'camp1_inputY')} disabled={capturing === 'click_camp1_inputX'} className={`text-xs border px-3 py-1.5 rounded-lg font-bold shadow-sm transition-colors ${capturing === 'click_camp1_inputX' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 hover:bg-gray-100 text-blue-600'}`}>{capturing === 'click_camp1_inputX' ? '⏳ Chờ 5s...' : '🎯 Bắt tự động'}</button>
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">X</label><input type="number" value={config.click.camp1_inputX} onChange={(e) => setConfig({...config, click: {...config.click, camp1_inputX: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">Y</label><input type="number" value={config.click.camp1_inputY} onChange={(e) => setConfig({...config, click: {...config.click, camp1_inputY: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-gray-700">Nút "Save"</span>
                        <button onClick={() => captureMouse('click', 'camp1_saveX', 'camp1_saveY')} disabled={capturing === 'click_camp1_saveX'} className={`text-xs border px-3 py-1.5 rounded-lg font-bold shadow-sm transition-colors ${capturing === 'click_camp1_saveX' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 hover:bg-gray-100 text-blue-600'}`}>{capturing === 'click_camp1_saveX' ? '⏳ Chờ 5s...' : '🎯 Bắt tự động'}</button>
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">X</label><input type="number" value={config.click.camp1_saveX} onChange={(e) => setConfig({...config, click: {...config.click, camp1_saveX: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">Y</label><input type="number" value={config.click.camp1_saveY} onChange={(e) => setConfig({...config, click: {...config.click, camp1_saveY: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                      </div>
                    </div>
                  </div>

                  {/* Campaign 2 */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-blue-700 bg-blue-50 p-2 rounded-lg text-center border border-blue-100">Campaign 2 (Phải)</h3>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-gray-700">Ô nhập "Line Limit"</span>
                        <button onClick={() => captureMouse('click', 'camp2_inputX', 'camp2_inputY')} disabled={capturing === 'click_camp2_inputX'} className={`text-xs border px-3 py-1.5 rounded-lg font-bold shadow-sm transition-colors ${capturing === 'click_camp2_inputX' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 hover:bg-gray-100 text-blue-600'}`}>{capturing === 'click_camp2_inputX' ? '⏳ Chờ 5s...' : '🎯 Bắt tự động'}</button>
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">X</label><input type="number" value={config.click.camp2_inputX} onChange={(e) => setConfig({...config, click: {...config.click, camp2_inputX: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">Y</label><input type="number" value={config.click.camp2_inputY} onChange={(e) => setConfig({...config, click: {...config.click, camp2_inputY: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-gray-700">Nút "Save"</span>
                        <button onClick={() => captureMouse('click', 'camp2_saveX', 'camp2_saveY')} disabled={capturing === 'click_camp2_saveX'} className={`text-xs border px-3 py-1.5 rounded-lg font-bold shadow-sm transition-colors ${capturing === 'click_camp2_saveX' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 hover:bg-gray-100 text-blue-600'}`}>{capturing === 'click_camp2_saveX' ? '⏳ Chờ 5s...' : '🎯 Bắt tự động'}</button>
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">X</label><input type="number" value={config.click.camp2_saveX} onChange={(e) => setConfig({...config, click: {...config.click, camp2_saveX: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                        <div className="flex-1"><label className="text-xs font-semibold text-gray-500">Y</label><input type="number" value={config.click.camp2_saveY} onChange={(e) => setConfig({...config, click: {...config.click, camp2_saveY: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'sql' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-purple-500">
              <div className="border-b pb-2 mb-4">
                <h2 className="text-xl font-bold text-gray-800">3. Kết nối MS SQL Server</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Server IP</label><input type="text" value={config.database?.server || ''} onChange={(e) => setConfig({...config, database: {...config.database, server: e.target.value}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Port</label><input type="number" value={config.database?.port || 1433} onChange={(e) => setConfig({...config, database: {...config.database, port: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Username</label><input type="text" value={config.database?.user || ''} onChange={(e) => setConfig({...config, database: {...config.database, user: e.target.value}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Password</label><input type="password" value={config.database?.password || ''} onChange={(e) => setConfig({...config, database: {...config.database, password: e.target.value}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Tên Database</label><input type="text" value={config.database?.database || ''} onChange={(e) => setConfig({...config, database: {...config.database, database: e.target.value}})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" /></div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-bold text-gray-700 mb-3">4. Kết nối Webhook Cảnh báo Lỗi</h3>
                <label className="block text-xs font-semibold text-gray-600 mb-1">URL Webhook (Nhận HTTP POST khi có lỗi Not Parked hoặc Connecting quá lâu)</label>
                <input type="text" placeholder="https://n8n.interlogistics.vn/..." value={config.general.webhookUrl || ''} onChange={(e) => setConfig({...config, general: {...config.general, webhookUrl: e.target.value}})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-2 pb-10">
            <button onClick={resetConfig} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-xl transition-transform transform hover:scale-105">
              🔄 RESET MẶC ĐỊNH
            </button>
            <button onClick={saveConfig} className="bg-gray-900 hover:bg-black text-white px-10 py-3 rounded-xl font-bold shadow-xl transition-transform transform hover:scale-105">
              💾 LƯU CẤU HÌNH
            </button>
          </div>
        </div>

        {/* Right Column: Dashboard */}
        <div className="lg:w-1/3 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center justify-between">
              Live Dashboard
              <span className="flex h-3 w-3 relative">
                {botStatus && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${botStatus ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
            </h2>
            
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              <div className="bg-green-50 rounded-xl p-3 border border-green-100 flex flex-col items-center justify-center shadow-sm">
                <span className="text-xs font-semibold text-green-700">In talk</span>
                <span className="text-2xl font-black text-green-600">{dashboard.stats.inTalk || 0}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col items-center justify-center shadow-sm">
                <span className="text-xs font-semibold text-gray-600">Awaiting</span>
                <span className="text-2xl font-black text-gray-800">{dashboard.stats.awaiting || 0}</span>
              </div>
              <div className="bg-red-50 rounded-xl p-3 border border-red-100 flex flex-col items-center justify-center shadow-sm">
                <span className="text-xs font-semibold text-red-700">Break</span>
                <span className="text-2xl font-black text-red-500">{dashboard.stats.break || 0}</span>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 flex flex-col items-center justify-center shadow-sm">
                <span className="text-xs font-semibold text-purple-700">Filling card</span>
                <span className="text-2xl font-black text-purple-600">{dashboard.stats.fillingCard || 0}</span>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 flex flex-col items-center justify-center shadow-sm">
                <span className="text-xs font-semibold text-yellow-700">Connecting</span>
                <span className="text-2xl font-black text-yellow-600">{dashboard.stats.connecting || 0}</span>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 flex flex-col items-center justify-center shadow-sm">
                <span className="text-xs font-semibold text-orange-700">Working</span>
                <span className="text-2xl font-black text-orange-600">{dashboard.stats.workingIssues || 0}</span>
              </div>
              <div className="col-span-2 lg:col-span-3 bg-blue-50 rounded-xl p-4 border border-blue-100 flex justify-between items-center shadow-inner mt-2">
                <span className="text-sm font-bold text-blue-800">SỐ LINE ĐANG MỞ</span>
                <span className="text-3xl font-black text-blue-600">{dashboard.stats.currentLines || 0}</span>
              </div>
            </div>


            {/* Terminal Logs */}
            <div className="flex-1 bg-gray-900 rounded-xl p-4 overflow-hidden flex flex-col shadow-inner min-h-[300px]">
              <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex justify-between">
                <span>System Logs (SQLite)</span>
                <span className="text-green-400 opacity-50 text-[10px]">Realtime</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] lg:text-xs">
                {dashboard.logs.length === 0 ? (
                  <div className="text-gray-600 italic">No logs available...</div>
                ) : (
                  dashboard.logs.map((log: any, idx: number) => (
                    <div key={idx} className="border-b border-gray-800 pb-1">
                      <span className="text-gray-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={log.message.includes('Action') ? 'text-yellow-400' : log.message.includes('Success') ? 'text-green-400' : log.message.includes('Error') ? 'text-red-400' : 'text-gray-300'}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
