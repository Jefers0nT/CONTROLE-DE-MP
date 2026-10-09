import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from database import get_db_connection, init_db
import pandas as pd

app = Flask(__name__)
CORS(app)

# Initialize database on startup
init_db()

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Saída acumulada (exemplo: count de baixas ou soma de custos)
    cursor.execute("SELECT COUNT(id) as total_saidas, SUM(custo) as custo_total FROM historico_baixas")
    saidas = dict(cursor.fetchone() or {})
    
    # 2. Saldo no armazém 10
    cursor.execute("SELECT SUM(saldo_arm_10) as total_arm_10 FROM saldo_atual")
    saldo_10 = dict(cursor.fetchone() or {})
    
    # 3. Matéria-prima empenhada
    cursor.execute("SELECT SUM(quantidade) as total_empenhos FROM empenhos")
    empenhos = dict(cursor.fetchone() or {})
    
    # 4. Produção paga (Mock ou calc extra)
    producao_paga = {"total": 0} # Placeholder
    
    # Divergências (exemplo)
    # Produtos com empenho maior que o saldo
    cursor.execute('''
        SELECT e.produto as codigo_produto, SUM(e.empenho) as empenhado, s.saldo_atual as saldo_arm_10 
        FROM empenhos e
        JOIN saldo_atual s ON e.produto = s.produto AND s.armazem = '10'
        GROUP BY e.produto, s.saldo_atual
        HAVING SUM(e.empenho) > s.saldo_atual
    ''')
    divergencias = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        "saida_acumulada": saidas,
        "saldo_armazem_10": saldo_10,
        "materia_prima_empenhada": empenhos,
        "producao_paga": producao_paga,
        "divergencias": divergencias
    })

@app.route('/api/dashboard/resumo', methods=['GET'])
def get_dashboard_resumo():
    """Retorna os dados consolidados calculando KG e Chapas (unidades) simultaneamente"""
    conn = get_db_connection()
    
    # Função auxiliar para gerar a query SQL de soma com conversão para chapas
    def calcular_metricas(tabela, coluna_valor, where_clause=""):
        query = f"""
            SELECT 
                SUM(t.{coluna_valor}) as total_kg,
                SUM(
                    CASE 
                        -- Só calcula se o produto tiver medidas cadastradas
                        WHEN p.comprimento IS NOT NULL AND p.comprimento > 0 
                        THEN t.{coluna_valor} / ((p.comprimento * p.largura * p.espessura * 7.85) / 1000000.0)
                        ELSE 0 
                    END
                ) as total_chapas
            FROM {tabela} t
            LEFT JOIN produtos_medidas p ON t.produto = p.codigo_produto
            {where_clause}
        """
        try:
            row = conn.execute(query).fetchone()
            return {
                "kg": row['total_kg'] or 0,
                "chapas": row['total_chapas'] or 0
            }
        except Exception:
            return {"kg": 0, "chapas": 0}

    # 1. Saída Acumulada
    saidas = calcular_metricas('historico_baixas', 'quantidade')
    # 2. Saldo no Armazém 10
    saldo_10 = calcular_metricas('saldo_atual', 'saldo_atual', "WHERE t.armazem = '10'")
    # 3. Matéria-prima Empenhada
    empenhos = calcular_metricas('empenhos', 'empenho')
    # 4. Produção Paga (Armazém 99)
    saldo_99 = calcular_metricas('empenhos', 'saldo_atual', "WHERE t.armazem = '99'")
    
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT e.produto as produto, SUM(e.empenho) as empenhado, s.saldo_atual as fisico
            FROM empenhos e
            JOIN saldo_atual s ON e.produto = s.produto AND s.armazem = '10'
            GROUP BY e.produto, s.saldo_atual
            HAVING SUM(e.empenho) > s.saldo_atual
        ''')
        divergencias = [dict(row) for row in cursor.fetchall()]
    except Exception:
        divergencias = []

    try:
        # Encontra produtos movimentados ou com saldo que NÃO têm cadastro na tabela de medidas
        cursor.execute('''
            SELECT DISTINCT t.produto 
            FROM (
                SELECT produto FROM historico_baixas WHERE quantidade > 0
                UNION
                SELECT produto FROM saldo_atual WHERE saldo_atual > 0
                UNION
                SELECT produto FROM empenhos WHERE empenho > 0 OR saldo_atual > 0
            ) t
            LEFT JOIN produtos_medidas p ON t.produto = p.codigo_produto
            WHERE p.codigo_produto IS NULL AND t.produto IS NOT NULL AND trim(t.produto) != ''
        ''')
        sem_medida = [row['produto'] for row in cursor.fetchall()]
    except Exception:
        sem_medida = []
    
    conn.close()
    
    return jsonify({
        "saida_acumulada": saidas,
        "saldo_armazem_10": saldo_10,
        "materia_prima_empenhada": empenhos,
        "producao_paga_armazem_99": saldo_99,
        "divergencias": divergencias,
        "produtos_sem_medida": sem_medida
    })

@app.route('/api/movimentacoes/recentes', methods=['GET'])
def get_movimentacoes_recentes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT h.produto, h.quantidade, h.armazem, h.dt_emissao, h.nr_op, h.documento, h.tp_movimento,
               CASE 
                   WHEN p.comprimento IS NOT NULL AND p.comprimento > 0 
                   THEN h.quantidade / ((p.comprimento * p.largura * p.espessura * 7.85) / 1000000.0)
                   ELSE NULL
               END as quantidade_chapas
        FROM historico_baixas h
        LEFT JOIN produtos_medidas p ON h.produto = p.codigo_produto
        ORDER BY h.dt_emissao DESC, h.id DESC
        LIMIT 20
    ''')
    movimentacoes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(movimentacoes)

@app.route('/api/produtos/<codigo_produto>/peso', methods=['GET'])
def calcular_peso(codigo_produto):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT comprimento, largura, espessura FROM produtos_medidas WHERE codigo_produto = ?", (codigo_produto,))
    medidas = cursor.fetchone()
    conn.close()

    if not medidas:
        return jsonify({"error": "Medidas não encontradas"}), 404

    c, l, e = medidas['comprimento'], medidas['largura'], medidas['espessura']
    
    try:
        peso = (c * l * e * 7.85) / 1000000
        estimado = not float(peso).is_integer()
        return jsonify({"codigo_produto": codigo_produto, "peso_kg": peso, "estimado": estimado})
    except ZeroDivisionError:
        return jsonify({"error": "Medidas inválidas (zero)"}), 400

@app.route('/api/produtos/medidas', methods=['POST'])
def cadastrar_medidas():
    """Cadastra ou atualiza as dimensões de uma chapa"""
    dados = request.get_json()
    
    # Validação básica para garantir que todos os dados foram enviados
    produto = dados.get('produto')
    comprimento = dados.get('comprimento')
    largura = dados.get('largura')
    espessura = dados.get('espessura')

    if not all([produto, comprimento, largura, espessura]):
        return jsonify({
            "erro": "Dados incompletos. Envie produto, comprimento, largura e espessura."
        }), 400

    conn = get_db_connection()
    # INSERT OR REPLACE atualiza a linha se o código do produto já existir
    conn.execute('''
        INSERT OR REPLACE INTO produtos_medidas (codigo_produto, comprimento, largura, espessura)
        VALUES (?, ?, ?, ?)
    ''', (produto, float(comprimento), float(largura), float(espessura)))
    
    conn.commit()
    conn.close()

    return jsonify({"mensagem": f"Medidas do produto '{produto}' salvas com sucesso!"}), 201

@app.route('/api/produtos/medidas', methods=['GET'])
def listar_medidas():
    """Lista todos os produtos com medidas cadastradas"""
    conn = get_db_connection()
    medidas = conn.execute('SELECT * FROM produtos_medidas ORDER BY codigo_produto').fetchall()
    conn.close()

    return jsonify([dict(row) for row in medidas])

@app.route('/api/produtos/medidas/importar', methods=['POST'])
def importar_medidas_excel():
    """Lê um arquivo Excel enviado pelo usuário e cadastra as medidas em lote"""
    if 'file' not in request.files:
        return jsonify({"erro": "Nenhum arquivo enviado"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"erro": "Nenhum arquivo selecionado"}), 400

    try:
        # Lê o Excel usando o pandas
        df = pd.read_excel(file)
        
        # Espera-se que a planilha tenha colunas como: codigo_produto, comprimento, largura, espessura
        # Vamos padronizar os nomes das colunas para minúsculo
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        # Mapeamento para aceitar nomes alternativos (ex: 'produto' ou 'codigo_produto')
        col_produto = 'codigo_produto' if 'codigo_produto' in df.columns else 'produto' if 'produto' in df.columns else None
        
        if not col_produto or not all(col in df.columns for col in ['comprimento', 'largura', 'espessura']):
            return jsonify({"erro": "A planilha deve conter as colunas: codigo_produto (ou produto), comprimento, largura e espessura"}), 400

        conn = get_db_connection()
        registros_inseridos = 0
        
        for index, row in df.iterrows():
            prod = str(row[col_produto]).strip()
            if not prod or pd.isna(row[col_produto]):
                continue
                
            try:
                c = float(row['comprimento'])
                l = float(row['largura'])
                e = float(row['espessura'])
                
                conn.execute('''
                    INSERT OR REPLACE INTO produtos_medidas (codigo_produto, comprimento, largura, espessura)
                    VALUES (?, ?, ?, ?)
                ''', (prod, c, l, e))
                registros_inseridos += 1
            except ValueError:
                # Pula linhas com valores que não são números válidos
                continue
                
        conn.commit()
        conn.close()
        
        return jsonify({"mensagem": f"{registros_inseridos} produtos importados/atualizados com sucesso!"}), 201

    except Exception as e:
        return jsonify({"erro": f"Erro ao processar o arquivo: {str(e)}"}), 500

@app.route('/api/insumos', methods=['GET'])
def listar_insumos():
    conn = get_db_connection()
    insumos = conn.execute('SELECT * FROM insumos_almoxarifado').fetchall()
    conn.close()
    return jsonify([dict(row) for row in insumos])

@app.route('/api/insumos', methods=['POST'])
def salvar_insumo():
    dados = request.get_json()
    codigo = dados.get('codigo')
    descricao = dados.get('descricao')
    quantidade = dados.get('quantidade')
    aba = dados.get('aba')
    foto = dados.get('foto')
    estoque_minimo = dados.get('estoque_minimo', 0)
    ponto_pedido = dados.get('ponto_pedido', 0)

    if not all([codigo, descricao, aba]):
        return jsonify({"erro": "Dados incompletos"}), 400

    conn = get_db_connection()
    conn.execute('''
        INSERT OR REPLACE INTO insumos_almoxarifado (codigo, descricao, quantidade, aba, foto, estoque_minimo, ponto_pedido)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (codigo, descricao, float(quantidade or 0), aba, foto, float(estoque_minimo or 0), float(ponto_pedido or 0)))
    conn.commit()
    conn.close()

    return jsonify({"mensagem": "Insumo salvo com sucesso"}), 201

@app.route('/api/insumos/<codigo>', methods=['DELETE'])
def deletar_insumo(codigo):
    conn = get_db_connection()
    conn.execute('DELETE FROM insumos_almoxarifado WHERE codigo = ?', (codigo,))
    conn.commit()
    conn.close()
    return jsonify({"mensagem": "Insumo deletado com sucesso"}), 200

@app.route('/api/estoque/analise', methods=['GET'])
def get_analise_estoque():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            p.produto,
            COALESCE(MAX(s10.descricao), MAX(e.descricao), '') as descricao,
            COALESCE(MAX(s10.saldo_atual), 0) as saldo_10,
            COALESCE(MAX(s99.saldo_atual), 0) as saldo_99,
            COALESCE(MAX(e.empenho), 0) as empenhado
        FROM (
            SELECT produto FROM saldo_atual
            UNION
            SELECT produto FROM empenhos
        ) p
        LEFT JOIN saldo_atual s10 ON p.produto = s10.produto AND s10.armazem = '10'
        LEFT JOIN saldo_atual s99 ON p.produto = s99.produto AND s99.armazem = '99'
        LEFT JOIN empenhos e ON p.produto = e.produto
        GROUP BY p.produto
        ORDER BY p.produto
    ''')
    dados = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(dados)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
