from decimal import Decimal, InvalidOperation

def ler_peso(texto: str):
    texto = texto.strip().replace(",", ".")
    try:
        valor = Decimal(texto)
    except InvalidOperation:
        raise ValueError("peso invalido")
    if not valor.is_finite():
        raise ValueError("Erro no valor")
    if valor <= 0:
        raise ValueError("O peso deve ser maior que zero")
    return valor

def peso_liquido(bruto:Decimal, tara:Decimal):
    liquido = bruto - tara
    if liquido <= 0:
        raise ValueError("o peso bruto precisa ser maior que a tara do recipiente")
    return liquido
