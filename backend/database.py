import sqlite3
import os

DB_PATH = 'estoque.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # historico_baixas: Acumula os eventos de movimentação
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS historico_baixas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT,
            quantidade REAL,
            armazem TEXT,
            dt_emissao DATETIME,
            nr_op TEXT,
            documento TEXT,
            tp_movimento TEXT,
            lote TEXT,
            endereco TEXT,
            custo REAL,
            usuario TEXT,
            grupo TEXT,
            data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(produto, quantidade, armazem, dt_emissao, nr_op, documento, tp_movimento, lote)
        )
    ''')
    
    # saldo_atual: Fotografia física (Armazém 10) e sistêmica (Armazém 99)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS saldo_atual (
            produto TEXT,
            armazem TEXT,
            descricao TEXT,
            saldo_atual REAL,
            data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (produto, armazem)
        )
    ''')
    
    # empenhos: Quantidades reservadas e saldos empenhados (ex: Armazém 99)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS empenhos (
            produto TEXT,
            armazem TEXT,
            descricao TEXT,
            empenho REAL,
            saldo_atual REAL,
            data_empenho DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (produto, armazem)
        )
    ''')
    
    # produtos_medidas: Comprimento (C), largura (L) e espessura (E)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS produtos_medidas (
            codigo_produto TEXT PRIMARY KEY,
            comprimento REAL,
            largura REAL,
            espessura REAL
        )
    ''')
    
    # insumos_almoxarifado: Insumos, quantidades e foto
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS insumos_almoxarifado (
            codigo TEXT PRIMARY KEY,
            descricao TEXT,
            quantidade REAL,
            aba TEXT,
            foto TEXT,
            estoque_minimo REAL DEFAULT 0,
            ponto_pedido REAL DEFAULT 0
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized.")
