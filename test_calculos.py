from decimal import Decimal, InvalidOperation
import pytest
from calculos import ler_peso, peso_liquido

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