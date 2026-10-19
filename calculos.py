from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

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

def custo_alimentos(liquido, peso_kg):
    if liquido <= 0:
        raise ValueError("Peso liquido deve ser maior que zero")
    if peso_kg <= 0:
        raise ValueError("Peso do alimento deve ser maior que zero")
    custo = liquido * peso_kg
    return custo.quantize(Decimal("0.01"), rounding = ROUND_HALF_UP)

def custo_producao(peso_kg, preco_kg, taxa):
    if peso_kg <= 0:
        raise ValueError("O peso deve ser maior que 0")
    if preco_kg <= 0:
        raise ValueError("O preço de Kg deve ser maior que 0")
    if taxa < 0:
        raise ValueError("A taxa deve ser maior que 0")
    calculo = preco_kg * peso_kg * (1 + taxa)
    return calculo.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)