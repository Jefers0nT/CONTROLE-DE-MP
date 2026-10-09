import { useState } from 'react';
import Dashboard from './components/Dashboard';
import CadastroMedidas from './components/CadastroMedidas';
import Divergencias from './components/Divergencias';
import SemMedidas from './components/SemMedidas';
import Movimentacoes from './components/Movimentacoes';
import AnaliseSaude from './components/AnaliseSaude';
import { LayoutDashboard, Settings, AlertTriangle, TrendingDown, History, Activity } from 'lucide-react';

function App() {
  // Estado para controlar qual tela está ativa
  const [telaAtiva, setTelaAtiva] = useState<'dashboard' | 'configuracoes' | 'divergencias' | 'sem_medidas' | 'movimentacoes' | 'analise'>('dashboard');

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Menu Lateral (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-wide">Torre de Controle</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase">Gestão de Chapas</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setTelaAtiva('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${telaAtiva === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button 
            onClick={() => setTelaAtiva('analise')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${telaAtiva === 'analise' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Activity size={20} className={telaAtiva === 'analise' ? 'text-white' : 'text-blue-400'} />
            Saúde do Estoque
          </button>

          <button 
            onClick={() => setTelaAtiva('movimentacoes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${telaAtiva === 'movimentacoes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <History size={20} className={telaAtiva === 'movimentacoes' ? 'text-white' : 'text-slate-400'} />
            Baixas
          </button>

          <button 
            onClick={() => setTelaAtiva('divergencias')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${telaAtiva === 'divergencias' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <TrendingDown size={20} className={telaAtiva === 'divergencias' ? 'text-white' : 'text-red-400'} />
            Divergências
          </button>

          <button 
            onClick={() => setTelaAtiva('sem_medidas')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${telaAtiva === 'sem_medidas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <AlertTriangle size={20} className={telaAtiva === 'sem_medidas' ? 'text-white' : 'text-orange-400'} />
            Sem Medidas
          </button>
          
          <button 
            onClick={() => setTelaAtiva('configuracoes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${telaAtiva === 'configuracoes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={20} />
            Configurações
          </button>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        {telaAtiva === 'dashboard' && <Dashboard />}
        {telaAtiva === 'analise' && <AnaliseSaude />}
        {telaAtiva === 'movimentacoes' && <Movimentacoes />}
        {telaAtiva === 'divergencias' && <Divergencias />}
        {telaAtiva === 'sem_medidas' && <SemMedidas onNavigateToConfig={() => setTelaAtiva('configuracoes')} />}
        {telaAtiva === 'configuracoes' && <CadastroMedidas />}
      </main>
    </div>
  );
}

export default App;
