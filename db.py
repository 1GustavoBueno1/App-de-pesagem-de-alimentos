import sqlite3

SCHEMA = """
    CREATE TABLE IF NOT EXISTS recipientes (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    tara TEXT                      
);

CREATE TABLE IF NOT EXISTS alimentos (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    preco_kg TEXT NOT NULL,
    recipiente_padrao_id INTEGER REFERENCES recipientes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS configuracao (
    chave TEXT PRIMARY KEY,        
    valor TEXT NOT NULL         
);

CREATE TABLE IF NOT EXISTS saidas (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,            
    alimento_id INTEGER NOT NULL REFERENCES alimentos(id),
    recipiente_id INTEGER NOT NULL REFERENCES recipientes(id),
    peso_bruto TEXT NOT NULL,
    tara TEXT NOT NULL,            
    preco_kg TEXT NOT NULL,        
    taxa TEXT NOT NULL            
);

CREATE TABLE IF NOT EXISTS sobras (
    id INTEGER PRIMARY KEY,
    saida_id INTEGER NOT NULL UNIQUE REFERENCES saidas(id) ON DELETE CASCADE,
    peso_bruto TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observacoes_dia (
    data TEXT PRIMARY KEY,
    texto TEXT
);
"""
RECIPIENTES_INICIAIS = [
    ("Panela de feijão", "3.8"),
    ("Cuba maior", "2.0"),
    ("Cuba menor", "1.5"),
    ("Cuba pequena", "0.3"),
    ("Caixote de frutas", "2.0"),
    ("Panela de pressão tradicional", "3.8"),
]

def conectar(caminho):
    conn = sqlite3.conncet(caminho)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreing_keys = ON")
    return conn

def criar_banco(conn):
    conn.executescript(SCHEMA)
    conn.executemany(
        "INSERT OR IGNORE INTO recipientes (nome, taxa), VALUES (?, ?)", RECIPIENTES_INICIAIS
    )
    conn.commit()