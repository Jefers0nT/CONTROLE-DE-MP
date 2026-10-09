import { useState, useEffect } from 'react';
import { History, RefreshCcw } from 'lucide-react';

interface Movimentacao {
  produto: string;
  quantidade: number;
  quantidade_chapas?: number;
  armazem: string;
  dt_emissao: string;
  nr_op: string;
  documento: string;
  tp_movimento: string;
}

export default function Movimentacoes() {
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarAcumulado, setMostrarAcumulado] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const res = await fetch('http://localhost:5000/api/movimentacoes/recentes');
      const data = await res.json();
      setHistorico(data);
    } catch (error) {
      console.error("Erro ao carregar histórico", error);
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

  const historicoFiltrado = historico.filter(mov => 
    mov.produto.toLowerCase().includes(termoBusca.toLowerCase()) || 
    mov.armazem.includes(termoBusca) ||
    (mov.documento && mov.documento.toLowerCase().includes(termoBusca.toLowerCase()))
  );

  const historicoAcumulado = Object.values(historicoFiltrado.reduce((acc, mov) => {
    if (!acc[mov.produto]) {
      acc[mov.produto] = {
        produto: mov.produto,
        quantidade_kg: 0,
        quantidade_chapas: 0,
        tem_medidas: true
      };
    }
    acc[mov.produto].quantidade_kg += mov.quantidade;
    if (mov.quantidade_chapas === null || mov.quantidade_chapas === undefined) {
      acc[mov.produto].tem_medidas = false;
    } else {
      acc[mov.produto].quantidade_chapas += mov.quantidade_chapas;
    }
    return acc;
  }, {} as Record<string, { produto: string, quantidade_kg: number, quantidade_chapas: number, tem_medidas: boolean }>)).sort((a, b) => b.quantidade_kg - a.quantidade_kg);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <History className="text-slate-600" size={28} />
            Baixas
          </h1>
          <p className="text-slate-500 mt-1">Histórico recente de baixas efetuadas no estoque.</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">Histórico de Baixas</h2>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm hover:bg-slate-50">
              <input 
                type="checkbox" 
                checked={mostrarAcumulado} 
                onChange={(e) => setMostrarAcumulado(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-sm font-medium text-slate-700">Agrupar por Produto</span>
            </label>
          </div>
          <input 
            type="text" 
            placeholder="Pesquisar por produto, armazém ou documento..." 
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 w-full md:w-80 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white">
              <tr>
                {!mostrarAcumulado && <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Data</th>}
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Produto</th>
                {!mostrarAcumulado && <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Armazém</th>}
                {!mostrarAcumulado && <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Documento / OP</th>}
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qtd (KG)</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qtd (UN)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr>
                  <td colSpan={mostrarAcumulado ? 3 : 6} className="px-6 py-8 text-center text-slate-500">
                    Carregando movimentações...
                  </td>
                </tr>
              ) : (mostrarAcumulado ? historicoAcumulado.length === 0 : historicoFiltrado.length === 0) ? (
                <tr>
                  <td colSpan={mostrarAcumulado ? 3 : 6} className="px-6 py-8 text-center text-slate-500">
                    {historico.length === 0 ? "Nenhuma movimentação registrada no banco." : "Nenhum resultado encontrado para a pesquisa."}
                  </td>
                </tr>
              ) : mostrarAcumulado ? (
                historicoAcumulado.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{item.produto}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 text-right">
                      {formatarPeso(item.quantidade_kg)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                      {!item.tem_medidas ? (
                        <span className="text-orange-500 text-xs font-medium bg-orange-50 px-2 py-1 rounded">Sem medidas</span>
                      ) : (
                        (() => {
                          const isInt = Number.isInteger(Math.round(item.quantidade_chapas * 100) / 100);
                          const qtdFinal = isInt ? Math.round(item.quantidade_chapas) : Math.ceil(item.quantidade_chapas);
                          return (
                            <span className={isInt ? "text-slate-700 font-bold" : "text-blue-600 font-bold"}>
                              {isInt ? `${qtdFinal}` : `≈ ${qtdFinal}`}
                            </span>
                          );
                        })()
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                historicoFiltrado.map((mov, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {mov.dt_emissao ? new Date(mov.dt_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{mov.produto}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${mov.armazem === '10' ? 'bg-green-100 text-green-800' : mov.armazem === '99' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>
                        {mov.armazem}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      Doc: {mov.documento || '-'} <br/> <span className="text-xs text-slate-400">OP: {mov.nr_op || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 text-right">
                      {formatarPeso(mov.quantidade)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                      {mov.quantidade_chapas === null || mov.quantidade_chapas === undefined ? (
                        <span className="text-orange-500 text-xs font-medium bg-orange-50 px-2 py-1 rounded">Sem medidas</span>
                      ) : (
                        (() => {
                          const isInt = Number.isInteger(Math.round(mov.quantidade_chapas * 100) / 100);
                          const qtdFinal = isInt ? Math.round(mov.quantidade_chapas) : Math.ceil(mov.quantidade_chapas);
                          return (
                            <span className={isInt ? "text-slate-700 font-medium" : "text-blue-500 font-medium"}>
                              {isInt ? `${qtdFinal}` : `≈ ${qtdFinal}`}
                            </span>
                          );
                        })()
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
