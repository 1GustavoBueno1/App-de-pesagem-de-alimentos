from decimal import Decimal
import pytest
from calculos import ler_peso, peso_liquido, custo_alimento, custo_producao, percentual_sobra


def test_ler_peso_virgula():
    assert ler_peso("3,5") == Decimal("3.5")

def test_ler_peso_ponto():
    assert ler_peso("3.5") == Decimal("3.5")

def test_ler_peso_espacos():
    assert ler_peso("  2  ") == Decimal("2")

def test_ler_peso_vazio():
    with pytest.raises(ValueError):
        ler_peso("")

def test_ler_peso_letra():
    with pytest.raises(ValueError):
        ler_peso("A")

def test_ler_peso_nan():
    with pytest.raises(ValueError):
        ler_peso("NaN")

def test_ler_peso_infinity():
    with pytest.raises(ValueError):
        ler_peso("Infinity")

def test_ler_peso_zero():
    with pytest.raises(ValueError):
        ler_peso("0")

def test_ler_peso_negativo():
    with pytest.raises(ValueError):
        ler_peso("-1")



def test_peso_liquido_correto():
    assert peso_liquido(Decimal("5.3"), Decimal("2.0")) == Decimal("3.3")

def test_peso_liquido_zero():
    with pytest.raises(ValueError):
        peso_liquido(Decimal("2.0"), Decimal("2.0"))

def test_peso_liquido_negativo():
    with pytest.raises(ValueError):
        peso_liquido(Decimal("1.5"), Decimal("2.0"))



def test_custo_alimento_correto():
    assert custo_alimento(Decimal("3.3"), Decimal("8.50")) == Decimal("28.05")

def test_custo_alimento_arredonda_meio_para_cima():

    assert custo_alimento(Decimal("0.5"), Decimal("1.01")) == Decimal("0.51")

def test_custo_alimento_tres_casas():
    assert custo_alimento(Decimal("0.333"), Decimal("8.50")) == Decimal("2.83")

def test_custo_alimento_liquido_negativo():
    with pytest.raises(ValueError):
        custo_alimento(Decimal("-1"), Decimal("8.5"))

def test_custo_alimento_liquido_zero():
    with pytest.raises(ValueError):
        custo_alimento(Decimal("0"), Decimal("8.5"))

def test_custo_alimento_preco_negativo():
    with pytest.raises(ValueError):
        custo_alimento(Decimal("8.5"), Decimal("-1"))

def test_custo_alimento_preco_zero():
    with pytest.raises(ValueError):
        custo_alimento(Decimal("8.5"), Decimal("0"))



def test_custo_producao_correto():
    assert custo_producao(Decimal("3.3"), Decimal("8.50"), Decimal("0.30")) == Decimal("36.47")

def test_custo_producao_arredonda_so_no_fim():
    assert custo_producao(Decimal("0.25"), Decimal("10.10"), Decimal("0.30")) == Decimal("3.28")

def test_custo_producao_liquido_negativo():
    with pytest.raises(ValueError):
        custo_producao(Decimal("-1"), Decimal("8.5"), Decimal("0.30"))

def test_custo_producao_liquido_zero():
    with pytest.raises(ValueError):
        custo_producao(Decimal("0"), Decimal("8.5"), Decimal("0.30"))

def test_custo_producao_preco_negativo():
    with pytest.raises(ValueError):
        custo_producao(Decimal("8.5"), Decimal("-1"), Decimal("0.30"))

def test_custo_producao_preco_zero():
    with pytest.raises(ValueError):
        custo_producao(Decimal("8.5"), Decimal("0"), Decimal("0.30"))

def test_custo_producao_taxa_negativa():
    with pytest.raises(ValueError):
        custo_producao(Decimal("3.3"), Decimal("8.50"), Decimal("-0.1"))

def test_percentual_sobra_correto():
    assert percentual_sobra(Decimal("0.5"), Decimal("3.3")) == Decimal("15.2")

def test_percentual_sobra_zero():
    assert str(percentual_sobra(Decimal("0"), Decimal("3.3"))) == "0.0"

def test_percentual_sobra_cem():
    assert str(percentual_sobra(Decimal("3.3"), Decimal("3.3"))) == "100.0"

def test_percentual_sobra_maior_que_saida():
    with pytest.raises(ValueError):
        percentual_sobra(Decimal("4"), Decimal("3.3"))

def test_percentual_sobra_negativa():
    with pytest.raises(ValueError):
        percentual_sobra(Decimal("-1"), Decimal("3.3"))

def test_percentual_sobra_saida_zero():
    with pytest.raises(ValueError):
        percentual_sobra(Decimal("1"), Decimal("0"))