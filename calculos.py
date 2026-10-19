from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

def ler_peso(texto: str):
    texto = texto.strip().replace(",", ".")
    try:
        valor = Decimal(texto)
    except InvalidOperation:
        raise ValueError("peso invalido")
    if not valor.is_finite():
        raise ValueError("peso invalido")
    if valor <= 0:
        raise ValueError("O peso deve ser maior que zero")
    return valor

def peso_liquido(bruto:Decimal, tara:Decimal):
    liquido = bruto - tara
    if liquido <= 0:
        raise ValueError("o peso bruto precisa ser maior que a tara do recipiente")
    return liquido

def custo_alimento(liquido, preco_kg):
    if liquido <= 0:
        raise ValueError("Peso liquido deve ser maior que zero")
    if preco_kg <= 0:
        raise ValueError("“o preço por kg deve ser maior que zero")
    custo = liquido * preco_kg
    return custo.quantize(Decimal("0.01"), rounding = ROUND_HALF_UP)

def custo_producao(peso_liquido, preco_kg, taxa):
    if peso_liquido <= 0:
        raise ValueError("O peso deve ser maior que 0")
    if preco_kg <= 0:
        raise ValueError("O preço de Kg deve ser maior que 0")
    if taxa < 0:
        raise ValueError("a taxa não pode ser negativa")
    calculo = preco_kg * peso_liquido * (1 + taxa)
    return calculo.quantize(Decimal("0.01"), rounding = ROUND_HALF_UP)
                                                                    
def percentual_sobra(sobra, saida):
    if saida <= 0:
        raise ValueError("a saída precisa ser maior que zero")
    if sobra < 0:
        raise ValueError("Sobra não pode ser negativa")
    if sobra > saida:
        raise ValueError("A sobra não pode ser maior que a saida")
    calculo = sobra / saida * 100
    return calculo.quantize(Decimal("0.1"), rounding = ROUND_HALF_UP)