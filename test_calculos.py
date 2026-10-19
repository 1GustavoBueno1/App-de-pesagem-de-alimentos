from decimal import Decimal, InvalidOperation
import pytest
from calculos import ler_peso, peso_liquido, custo_alimentos

def test_virgula():
    assert ler_peso("3,5") == Decimal("3.5")

def test_vazio_erro():
    with pytest.raises(ValueError):
        ler_peso("")

def test_ponto():
    assert ler_peso("3.5") == Decimal("3.5")        

def test_letra():
    with pytest.raises(ValueError):
        ler_peso("A")

def test_NAN():
    with pytest.raises(ValueError):
        ler_peso("NaN")
def test_infinity():
    with pytest.raises(ValueError):
        ler_peso("Infinity")

def test_espacos():
    assert ler_peso("  2  ") == Decimal("2")

def test_zero():
    with pytest.raises(ValueError):
        ler_peso("0")

def test_negativo():
    with pytest.raises(ValueError):
        ler_peso("-1")

def test_correto():
    assert peso_liquido(Decimal("5.3"), Decimal("2.0")) == Decimal("3.3")

def test_liquido_zero():
    with pytest.raises(ValueError):
        peso_liquido(Decimal("2.0"), Decimal("2.0"))

def test_liquido_negativo():
    with pytest.raises(ValueError):
        peso_liquido(Decimal("1.5"), Decimal("2.0"))

def test_custo_correto1():
    assert custo_alimentos(Decimal("3.3"), Decimal("8.50")) == Decimal("28.05")

def test_custo_correto2():
    assert custo_alimentos(Decimal("0.5"), Decimal("1.01")) == Decimal("0.51")

def test_custo_correto3():
    assert custo_alimentos(Decimal("0.333"), Decimal("8.50")) == Decimal("2.83")

def test_custo_negativo_liquido():
    with pytest.raises(ValueError):
            custo_alimentos(Decimal("-1"), Decimal("8.5"))
def test_custo_zero_liquido():
    with pytest.raises(ValueError):
        custo_alimentos(Decimal("0"), Decimal("8 .5"))

def test_custo_negativo_liquido():
    with pytest.raises(ValueError):
            custo_alimentos(Decimal("8.5"), Decimal("-1"))
def test_custo_zero_liquido():
    with pytest.raises(ValueError):
        custo_alimentos(Decimal("8.5"), Decimal("0"))
