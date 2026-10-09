import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCcw, ArrowRight } from 'lucide-react';

export default function SemMedidas({ onNavigateToConfig }: { onNavigateToConfig: () => void }) {
  const [produtos, setProdutos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/resumo');
      const data = await res.json();
      setProdutos(data.produtos_sem_medida || []);
    } catch (error) {
      console.error("Erro ao carregar itens sem medidas", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={28} />
            Produtos sem Medidas
          </h1>
          <p className="text-slate-500 mt-1">Ação Necessária: Produtos que precisam de cadastro de dimensões.</p>
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
      ) : produtos.length === 0 ? (
        <div className="bg-green-50 text-green-700 p-6 rounded-lg border border-green-200 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-bold mb-1">Tudo certo por aqui!</p>
          <p>Todos os produtos movimentados possuem medidas cadastradas.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 bg-orange-50 border-b border-orange-100">
            <p className="text-slate-800 text-sm">
              Os <strong>{produtos.length} produtos</strong> listados abaixo possuem saldo ou movimentação no estoque, 
              mas suas medidas (comprimento, largura, espessura) ainda não foram informadas. Por isso, 
              o cálculo de quantidade de chapas para eles será sempre exibido como zero no Dashboard.
            </p>
            <button 
              onClick={onNavigateToConfig}
              className="mt-4 flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-sm text-sm"
            >
              Ir para Configurações de Medidas
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-slate-700 mb-4 uppercase tracking-wider text-sm">Lista de Produtos</h3>
            <div className="flex flex-wrap gap-3">
              {produtos.map((prod, idx) => (
                <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-800 px-4 py-2 rounded-md shadow-sm font-medium">
                  {prod}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
