import { useState, useEffect } from 'react';
import { Package, TrendingDown, Lock, CheckCircle, RefreshCcw } from 'lucide-react';

interface Divergencia {
  produto: string;
  empenhado: number;
  fisico: number;
}

interface Metrica {
  kg: number;
  chapas: number;
}

interface Resumo {
  saida_acumulada: Metrica;
  saldo_armazem_10: Metrica;
  materia_prima_empenhada: Metrica;
  producao_paga_armazem_99: Metrica;
  divergencias: Divergencia[];
  produtos_sem_medida: string[];
}

export default function Dashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  
  const [carregando, setCarregando] = useState(true);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      // Busca os 4 indicadores
      const resResumo = await fetch('http://localhost:5000/api/dashboard/resumo');
      const dataResumo = await resResumo.json();
      setResumo(dataResumo);
    } catch (error) {
      console.error("Erro ao carregar os dados do dashboard", error);
    } finally {
      setCarregando(false);
    }
  };

  // Carrega os dados ao abrir a tela
  useEffect(() => {
    carregarDados();
    
    // Opcional: Atualiza a tela automaticamente a cada 30 segundos
    const intervalo = setInterval(carregarDados, 30000);
    return () => clearInterval(intervalo);
  }, []);

  // Função para formatar números no padrão brasileiro (ex: 1.500,50 kg)
  const formatarPeso = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor) + ' kg';
  };

  // Regra de Ouro: Identifica se é inteiro ou estimado e formata
  const formatarChapas = (valor: number, kgTotal: number) => {
    if (kgTotal > 0 && valor === 0) {
      return <span className="text-orange-500 text-xs">⚠️ Faltam medidas cadastradas</span>;
    }
    
    // Arredonda para 2 casas para verificar se as casas decimais são próximas a .00
    const isInteiro = Number.isInteger(Math.round(valor * 100) / 100);
    
    // Se não for inteiro, SEMPRE arredonda para cima (ex: 16.01 vira 17)
    const qtdFinal = isInteiro ? Math.round(valor) : Math.ceil(valor);
    
    if (isInteiro) {
      return <span className="text-slate-500 font-medium">{qtdFinal}</span>;
    } else {
      return <span className="text-blue-500 font-medium">≈ {qtdFinal} (estimado)</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Controle de Matéria-Prima — Chapas</h1>
          <p className="text-slate-500 mt-1">Visão consolidada de saídas, saldos físicos, reservas e pagamentos.</p>
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

      {/* Grid com os Cartões */}
      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border-y border-r border-slate-200 p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Saída Acumulada</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingDown size={20} /></div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatarPeso(resumo.saida_acumulada.kg)}</h3>
            <div className="mt-1 text-sm">
              {formatarChapas(resumo.saida_acumulada.chapas, resumo.saida_acumulada.kg)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-green-500 border-y border-r border-slate-200 p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Saldo Armazém 10</p>
              <div className="p-2 bg-green-50 rounded-lg text-green-600"><Package size={20} /></div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatarPeso(resumo.saldo_armazem_10.kg)}</h3>
            <div className="mt-1 text-sm">
              {formatarChapas(resumo.saldo_armazem_10.chapas, resumo.saldo_armazem_10.kg)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-orange-500 border-y border-r border-slate-200 p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Material Reservado</p>
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Lock size={20} /></div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatarPeso(resumo.materia_prima_empenhada.kg)}</h3>
            <div className="mt-1 text-sm">
              {formatarChapas(resumo.materia_prima_empenhada.chapas, resumo.materia_prima_empenhada.kg)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-purple-500 border-y border-r border-slate-200 p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Produção Paga (Arm. 99)</p>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><CheckCircle size={20} /></div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatarPeso(resumo.producao_paga_armazem_99.kg)}</h3>
            <div className="mt-1 text-sm">
              {formatarChapas(resumo.producao_paga_armazem_99.chapas, resumo.producao_paga_armazem_99.kg)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-red-500 border-y border-r border-slate-200 p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Divergência de Estoque</p>
              <div className="p-2 bg-red-50 rounded-lg text-red-600"><TrendingDown size={20} /></div>
            </div>
            {resumo.divergencias.length > 0 ? (
              <>
                <h3 className="text-2xl font-bold text-red-600">
                  {formatarPeso(resumo.divergencias.reduce((acc, div) => acc + (div.empenhado - div.fisico), 0))}
                </h3>
                <div className="mt-1 text-sm text-slate-500 font-medium">
                  em {resumo.divergencias.length} {resumo.divergencias.length === 1 ? 'item' : 'itens'}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-800">0,00 kg</h3>
                <div className="mt-1 text-sm text-green-500 font-medium">
                  Estoque OK
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
