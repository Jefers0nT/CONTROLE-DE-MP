import { useState, useEffect, Fragment } from 'react';
import { Activity, RefreshCcw, CheckCircle, TrendingDown, Lightbulb, Package } from 'lucide-react';

interface AnaliseItem {
  produto: string; // no agrupado, pode não ser usado diretamente
  descricao: string;
  saldo_10: number;
  saldo_99: number;
  empenhado: number;
}

interface ItemAgrupado {
  codigos: string[];
  descricao: string;
  saldo_10: number;
  saldo_99: number;
  empenhado: number;
  detalhes: AnaliseItem[];
}

export default function AnaliseSaude() {
  const [dados, setDados] = useState<AnaliseItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'furos' | 'saudaveis' | 'oportunidades' | 'neutros'>('todos');
  const [busca, setBusca] = useState('');

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const res = await fetch('http://localhost:5000/api/estoque/analise');
      const data = await res.json();
      setDados(data || []);
    } catch (error) {
      console.error("Erro ao carregar análise de estoque", error);
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

  // Regras de negócio para as classificações baseadas no item agrupado
  const temFuro = (item: ItemAgrupado) => item.empenhado > item.saldo_10;
  const ehSaudavel = (item: ItemAgrupado) => item.saldo_10 >= item.empenhado && item.empenhado > 0;
  const temOportunidade = (item: ItemAgrupado) => {
    return (item.saldo_10 > 0 && item.empenhado === 0) || (item.saldo_99 > 0);
  };

  // 1. Primeiro, agrupa todos os dados pela descrição exata
  const dadosAgrupados = Object.values(dados.reduce((acc, item) => {
    const desc = (item.descricao || 'SEM DESCRICAO').trim();
    if (!acc[desc]) {
      acc[desc] = {
        codigos: [item.produto],
        descricao: desc,
        saldo_10: item.saldo_10,
        saldo_99: item.saldo_99,
        empenhado: item.empenhado,
        detalhes: [item]
      };
    } else {
      if (!acc[desc].codigos.includes(item.produto)) {
        acc[desc].codigos.push(item.produto);
      }
      acc[desc].saldo_10 += item.saldo_10;
      acc[desc].saldo_99 += item.saldo_99;
      acc[desc].empenhado += item.empenhado;
      acc[desc].detalhes.push(item);
    }
    return acc;
  }, {} as Record<string, ItemAgrupado>));

  // 2. Depois, filtra em cima dos dados agrupados
  const dadosFiltrados = dadosAgrupados.filter(item => {
    // Aplica o filtro de status
    let passouStatus = true;
    if (filtro === 'furos') passouStatus = temFuro(item);
    else if (filtro === 'saudaveis') passouStatus = ehSaudavel(item);
    else if (filtro === 'oportunidades') passouStatus = temOportunidade(item);
    else if (filtro === 'neutros') passouStatus = !temFuro(item) && !ehSaudavel(item) && !temOportunidade(item);

    // Aplica o filtro de busca de texto
    const buscaLower = busca.toLowerCase();
    const passouBusca = busca === '' || 
      item.descricao.toLowerCase().includes(buscaLower) || 
      item.codigos.some(cod => cod.toLowerCase().includes(buscaLower));

    return passouStatus && passouBusca;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="text-blue-600" size={32} />
            Saúde do Estoque
          </h1>
          <p className="text-slate-500 mt-1">Comparação de saldos entre Armazém 10, Armazém 99 e Reservas.</p>
        </div>
        <button 
          onClick={carregarDados} 
          disabled={carregando}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition font-medium border border-slate-300 shadow-sm"
        >
          <RefreshCcw size={18} className={carregando ? 'animate-spin' : ''} />
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
              filtro === 'todos' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltro('furos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
              filtro === 'furos' ? 'bg-red-50 text-red-700 border-red-200 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <TrendingDown size={18} className={filtro === 'furos' ? 'text-red-600' : ''} />
            Com Furos
          </button>
          <button
            onClick={() => setFiltro('saudaveis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
              filtro === 'saudaveis' ? 'bg-green-50 text-green-700 border-green-200 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <CheckCircle size={18} className={filtro === 'saudaveis' ? 'text-green-600' : ''} />
            Saudáveis
          </button>
          <button
            onClick={() => setFiltro('oportunidades')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
              filtro === 'oportunidades' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Lightbulb size={18} className={filtro === 'oportunidades' ? 'text-amber-600' : ''} />
            Oportunidades
          </button>
        </div>

        <div className="w-full md:w-72">
          <input 
            type="text" 
            placeholder="Buscar por código ou descrição..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-slate-500">Buscando inteligência de dados...</div>
        ) : dadosFiltrados.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Package size={48} className="text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Nenhum dado encontrado</h3>
            <p className="text-slate-500 mt-2">Não há produtos que se encaixam neste filtro atualmente.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-semibold">Produto / Descrição</th>
                <th className="p-4 font-semibold text-right w-32 border-l border-slate-200">Saldo Arm. 10<br/><span className="text-xs font-normal">Físico</span></th>
                <th className="p-4 font-semibold text-right w-32 border-l border-slate-200">Saldo Arm. 99<br/><span className="text-xs font-normal">Prod. Paga</span></th>
                <th className="p-4 font-semibold text-right w-32 border-l border-slate-200">Empenhado<br/><span className="text-xs font-normal">Reserva</span></th>
                <th className="p-4 font-semibold text-center w-40 border-l border-slate-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((item, idx) => {
                // Status consolidado do grupo (para referência, se quiser)
                const furoGrupo = temFuro(item);
                
                return (
                  <Fragment key={item.codigos[0] + idx}>
                    {/* Linha de Cabeçalho do Grupo (Descrição) */}
                    <tr className="bg-slate-200/70 border-b border-slate-300">
                      <td colSpan={5} className="p-3 font-bold text-slate-800 text-sm tracking-wide">
                        {item.descricao}
                      </td>
                    </tr>
                    
                    {/* Linhas Individuais para cada Código (Detalhes) */}
                    {item.detalhes.map(detalhe => {
                      const furo = detalhe.empenhado > detalhe.saldo_10;
                      const saudavel = detalhe.saldo_10 >= detalhe.empenhado && detalhe.empenhado > 0;
                      const op = (detalhe.saldo_10 > 0 && detalhe.empenhado === 0) || (detalhe.saldo_99 > 0);

                      return (
                        <tr key={detalhe.produto} className="border-b border-slate-200 hover:bg-blue-50 transition-colors bg-white">
                          <td className="p-4 pl-8">
                            <span className="font-mono bg-blue-100 text-blue-800 border border-blue-300 text-sm font-bold px-2.5 py-1 rounded-md shadow-sm">
                              {detalhe.produto}
                            </span>
                          </td>
                          <td className="p-4 text-right border-l border-slate-100 font-medium text-slate-700">
                            {formatarPeso(detalhe.saldo_10)}
                          </td>
                          <td className="p-4 text-right border-l border-slate-100 font-medium text-purple-600">
                            {formatarPeso(detalhe.saldo_99)}
                          </td>
                          <td className="p-4 text-right border-l border-slate-100 font-bold text-orange-600">
                            {formatarPeso(detalhe.empenhado)}
                          </td>
                          <td className="p-4 text-center border-l border-slate-100">
                            {furo ? (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold w-full justify-center shadow-sm border border-red-200">
                                <TrendingDown size={14} /> Faltam {formatarPeso(detalhe.empenhado - detalhe.saldo_10)}
                              </span>
                            ) : saudavel ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold w-full justify-center shadow-sm border border-green-200">
                                <CheckCircle size={14} /> OK
                              </span>
                            ) : op ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold w-full justify-center shadow-sm border border-amber-200">
                                <Lightbulb size={14} /> Sobra
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold w-full justify-center border border-slate-200">
                                Neutro
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
