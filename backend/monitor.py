import os
import time
import sqlite3
import pandas as pd
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Caminho da pasta que será monitorada
PASTA_MONITORADA = r"C:\Users\jeferson.silva\Desktop\BAIXA DE MP"
BANCO_DADOS = 'estoque.db'

def processar_planilha(caminho_arquivo):
    nome_arquivo = os.path.basename(caminho_arquivo).lower()
    
    # Ignora arquivos temporários do Excel
    if nome_arquivo.startswith('~$'):
        return

    # Pequena pausa para garantir que o Windows terminou de salvar/copiar o arquivo
    time.sleep(2)

    try:
        print(f"\n[Processando] Detectado arquivo: {nome_arquivo}")
        df = pd.read_excel(caminho_arquivo, engine='openpyxl')
        
        # Padroniza os nomes das colunas (tudo minúsculo e sem espaços)
        df.columns = [str(col).strip().lower().replace(' ', '_').replace('.', '') for col in df.columns]
        
        # Remove linhas onde a coluna 'produto' estiver vazia
        if 'produto' in df.columns:
            df = df.dropna(subset=['produto'])
            df['produto'] = df['produto'].astype(str)
            if 'armazem' in df.columns:
                df['armazem'] = df['armazem'].astype(str)

        # Converte colunas de data/hora para string para evitar erro do SQLite (type 'Timestamp' is not supported)
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].astype(str)
            # Converte NaN para None (NULL no SQLite)
            df[col] = df[col].where(pd.notna(df[col]), None)

        conn = sqlite3.connect(BANCO_DADOS)
        cursor = conn.cursor()

        # ------------------------------------------------------------------
        # REGRA 1: ARQUIVO DE BAIXA (Histórico contínuo)
        # ------------------------------------------------------------------
        if 'baixa' in nome_arquivo:
            # Seleciona apenas as colunas que importam, com valores padrão caso falte alguma
            colunas_esperadas = ['produto', 'quantidade', 'armazem', 'dt_emissao', 'nrorp', 'documento', 'tp_movimento', 'lote', 'endereco', 'custo', 'usuario', 'grupo']
            for col in colunas_esperadas:
                if col not in df.columns:
                    df[col] = None
                    
            registros = df[colunas_esperadas].values.tolist()
            
            # INSERT OR IGNORE garante que a restrição UNIQUE criada no banco
            # barre a importação de uma mesma movimentação duas vezes
            cursor.executemany('''
                INSERT OR IGNORE INTO historico_baixas 
                (produto, quantidade, armazem, dt_emissao, nr_op, documento, tp_movimento, lote, endereco, custo, usuario, grupo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', registros)
            
            print(f"[Sucesso] Arquivo de BAIXA importado. {cursor.rowcount} novos registros inseridos.")

        # ------------------------------------------------------------------
        # REGRA 2: ARQUIVO ATUAL (Fotografia de Saldo)
        # ------------------------------------------------------------------
        elif 'atual' in nome_arquivo:
            colunas = ['produto', 'armazem', 'descricao', 'saldo_atual']
            for col in colunas:
                if col not in df.columns:
                    df[col] = 0 if col == 'saldo_atual' else ''
                    
            registros = df[colunas].values.tolist()
            
            # INSERT OR REPLACE atualiza o saldo se a chave (produto, armazem) já existir
            cursor.executemany('''
                INSERT OR REPLACE INTO saldo_atual (produto, armazem, descricao, saldo_atual)
                VALUES (?, ?, ?, ?)
            ''', registros)
            
            print(f"[Sucesso] Arquivo de SALDO ATUAL importado. Saldos atualizados.")

        # ------------------------------------------------------------------
        # REGRA 3: ARQUIVO DE EMPENHO (Fotografia de Reserva)
        # ------------------------------------------------------------------
        elif 'empenho' in nome_arquivo:
            colunas = ['produto', 'armazem', 'descricao', 'empenho', 'saldo_atual']
            for col in colunas:
                if col not in df.columns:
                    df[col] = 0 if col in ('empenho', 'saldo_atual') else ''
                    
            registros = df[colunas].values.tolist()
            
            cursor.executemany('''
                INSERT OR REPLACE INTO empenhos (produto, armazem, descricao, empenho, saldo_atual)
                VALUES (?, ?, ?, ?, ?)
            ''', registros)
            
            print(f"[Sucesso] Arquivo de EMPENHO importado. Reservas atualizadas.")

        else:
            print(f"[Ignorado] O arquivo {nome_arquivo} não corresponde a 'baixa', 'atual' ou 'empenho'.")

        conn.commit()
        conn.close()

    except Exception as e:
        print(f"[Erro] Falha ao processar {nome_arquivo}: {e}")


# Classe que define o que acontece quando a pasta sofre alterações
class ProtheusHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.xlsx'):
            processar_planilha(event.src_path)

    def on_modified(self, event):
        # Muitas vezes ao salvar, o Excel gera um evento de modificação
        if not event.is_directory and event.src_path.endswith('.xlsx'):
            processar_planilha(event.src_path)


def iniciar_monitoramento():
    # Verifica se a pasta existe, senão cria
    if not os.path.exists(PASTA_MONITORADA):
        os.makedirs(PASTA_MONITORADA)
        print(f"Pasta criada: {PASTA_MONITORADA}")

    print(f"[*] Escaneando arquivos já existentes na pasta...")
    for arquivo in os.listdir(PASTA_MONITORADA):
        if arquivo.endswith('.xlsx') and not arquivo.startswith('~$'):
            caminho_completo = os.path.join(PASTA_MONITORADA, arquivo)
            processar_planilha(caminho_completo)

    event_handler = ProtheusHandler()
    observer = Observer()
    observer.schedule(event_handler, PASTA_MONITORADA, recursive=False)
    observer.start()
    
    print(f"\n[*] Monitorando ativamente a pasta: {PASTA_MONITORADA}")
    print("[*] Cole as planilhas do Protheus na pasta para atualização automática.")
    print("[*] Pressione Ctrl+C para parar.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\nMonitoramento encerrado.")
    observer.join()

if __name__ == "__main__":
    iniciar_monitoramento()
