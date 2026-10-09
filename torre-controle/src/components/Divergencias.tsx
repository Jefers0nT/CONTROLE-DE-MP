import { useState, useEffect } from 'react';
import { TrendingDown, RefreshCcw } from 'lucide-react';

interface Divergencia {
  produto: string;
  empenhado: number;
  fisico: number;
}

export default function Divergencias() {
  const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/resumo');
      const data = await res.json();
      setDivergencias(data.divergencias || []);
    } catch (error) {
      console.error("Erro ao carregar divergências", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatarPeso = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor) + ' kg';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <TrendingDown className="text-red-500" size={28} />
            Divergências de Estoque
          </h1>
          <p className="text-slate-500 mt-1">Produtos com Empenho maior que Saldo Físico.</p>
        </div>
        <button 
          onClick={carregarDados} 
          disabled={carregando}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition font-medium border border-slate-300"
        >
          <RefreshCcw size={18} className={carregando ? 'animate-spin' : ''} />
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {carregando ? (
        <p className="text-slate-500">Carregando dados...</p>
      ) : divergencias.length === 0 ? (
        <div className="bg-green-50 text-green-700 p-6 rounded-lg border border-green-200 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-bold mb-1">Tudo certo por aqui!</p>
          <p>Nenhuma divergência encontrada. Todos os empenhos possuem saldo físico suficiente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {divergencias.map((div, idx) => (
            <div key={idx} className="bg-white border-l-4 border-l-red-500 shadow-sm border-y border-r border-slate-200 rounded-lg p-5">
              <p className="font-bold text-slate-800 text-lg">{div.produto}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Empenho Registrado</span>
                  <span className="text-red-600 font-bold">{formatarPeso(div.empenhado)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500 text-sm">Saldo Físico (Arm. 10)</span>
                  <span className="text-slate-700 font-bold">{formatarPeso(div.fisico)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
