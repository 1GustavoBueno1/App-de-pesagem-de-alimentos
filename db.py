import sqlite3

SCHEMA = """ """


def conectar(caminho):
    conn = sqlite3.conncet(caminho)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreing_keys = ON")
    return conn

def criar_banco(conn):
    ...