import { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';

// Define o formato dos dados que vamos usar
interface ProdutoMedida {
  produto: string;
  comprimento: number | '';
  largura: number | '';
  espessura: number | '';
}

export default function CadastroMedidas() {
  // Estados do componente
  const [medidas, setMedidas] = useState<ProdutoMedida[]>([]);
  const [form, setForm] = useState<ProdutoMedida>({ produto: '', comprimento: '', largura: '', espessura: '' });
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  const [importando, setImportando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca a lista de produtos ao carregar a tela
  useEffect(() => {
    carregarMedidas();
  }, []);

  const carregarMedidas = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/produtos/medidas');
      const data = await response.json();
      setMedidas(data);
    } catch (error) {
      console.error("Erro ao buscar medidas", error);
    }
  };

  // Lida com a digitação nos campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      // Se for o campo produto, mantém texto. Se for medida, converte para número
      [name]: name === 'produto' ? value : (value === '' ? '' : Number(value))
    });
  };

  // Envia os dados para a API (Cadastrar ou Atualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/api/produtos/medidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setMensagem({ texto: 'Medidas salvas com sucesso!', tipo: 'sucesso' });
        setForm({ produto: '', comprimento: '', largura: '', espessura: '' }); // Limpa o form
        carregarMedidas(); // Atualiza a tabela
      } else {
        setMensagem({ texto: 'Erro ao salvar as medidas.', tipo: 'erro' });
      }
    } catch (error) {
      setMensagem({ texto: 'Erro de conexão com o servidor.', tipo: 'erro' });
    }

    // Limpa a mensagem após 3 segundos
    setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
  };

  // Preenche o formulário com os dados da linha clicada
  const editarProduto = (produto: ProdutoMedida) => {
    // Atenção: a API retorna codigo_produto, precisamos mapear para 'produto' no formulário
    setForm({
      produto: (produto as any).codigo_produto || produto.produto,
      comprimento: produto.comprimento,
      largura: produto.largura,
      espessura: produto.espessura
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportando(true);
    setMensagem({ texto: 'Enviando arquivo...', tipo: 'sucesso' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/produtos/medidas/importar', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setMensagem({ texto: data.mensagem, tipo: 'sucesso' });
        carregarMedidas();
      } else {
        setMensagem({ texto: data.erro || 'Erro ao importar.', tipo: 'erro' });
      }
    } catch (error) {
      setMensagem({ texto: 'Erro de conexão.', tipo: 'erro' });
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setMensagem({ texto: '', tipo: '' }), 5000);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Cadastro de Medidas de Chapas</h2>
        
        {/* Botão de Upload de Excel */}
        <div>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importando}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition font-medium shadow-sm"
          >
            <Upload size={18} />
            {importando ? 'Importando...' : 'Importar Excel'}
          </button>
        </div>
      </div>

      {/* Exibição de Mensagens (Sucesso/Erro) */}
      {mensagem.texto && (
        <div className={`p-4 mb-6 rounded ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {mensagem.texto}
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cód. Produto</label>
            <input 
              type="text" name="produto" required value={form.produto} onChange={handleInputChange}
              className="w-full border border-slate-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ex: CHAPA-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comprimento (mm)</label>
            <input 
              type="number" name="comprimento" required min="1" step="0.01" value={form.comprimento} onChange={handleInputChange}
              className="w-full border border-slate-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Largura (mm)</label>
            <input 
              type="number" name="largura" required min="1" step="0.01" value={form.largura} onChange={handleInputChange}
              className="w-full border border-slate-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Espessura (mm)</label>
            <input 
              type="number" name="espessura" required min="0.1" step="0.01" value={form.espessura} onChange={handleInputChange}
              className="w-full border border-slate-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <button type="submit" className="mt-6 w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-medium">
          Salvar Medidas
        </button>
      </form>

      {/* Tabela de Produtos Cadastrados */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produto</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Comp. (mm)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Larg. (mm)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Espessura (mm)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {medidas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-slate-500">Nenhum produto cadastrado.</td>
              </tr>
            ) : (
              medidas.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{(item as any).codigo_produto || item.produto}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-slate-500">{item.comprimento}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-slate-500">{item.largura}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-slate-500">{item.espessura}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => editarProduto(item)} className="text-blue-600 hover:text-blue-900">
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
