// Porte dos 32 testes de test_calculos.py (mesma ordem e mesmos casos),
// seguido de testes extras para o que existe só na versão JavaScript.
import { describe, it, expect } from 'vitest';
import {
  D,
  lerPeso,
  pesoLiquido,
  custoAlimento,
  custoProducao,
  percentualSobra,
  lerValor,
  totalGastos,
  lerNaoNegativo,
  lerDinheiroBR,
} from '../src/calculos.js';

// Igualdade numérica de Decimal (como == no Python).
const igual = (obtido, esperado) => expect(obtido.equals(D(esperado))).toBe(true);

describe('lerPeso (porte do Python)', () => {
  it('aceita vírgula', () => igual(lerPeso('3,5'), '3.5'));
  it('aceita ponto', () => igual(lerPeso('3.5'), '3.5'));
  it('ignora espaços', () => igual(lerPeso('  2  '), '2'));
  it('rejeita vazio', () => expect(() => lerPeso('')).toThrow(Error));
  it('rejeita letra', () => expect(() => lerPeso('A')).toThrow(Error));
  it('rejeita NaN', () => expect(() => lerPeso('NaN')).toThrow(Error));
  it('rejeita Infinity', () => expect(() => lerPeso('Infinity')).toThrow(Error));
  it('rejeita zero', () => expect(() => lerPeso('0')).toThrow(Error));
  it('rejeita negativo', () => expect(() => lerPeso('-1')).toThrow(Error));
});

describe('pesoLiquido (porte do Python)', () => {
  it('calcula bruto - tara', () => igual(pesoLiquido(D('5.3'), D('2.0')), '3.3'));
  it('rejeita líquido zero', () => expect(() => pesoLiquido(D('2.0'), D('2.0'))).toThrow(Error));
  it('rejeita líquido negativo', () => expect(() => pesoLiquido(D('1.5'), D('2.0'))).toThrow(Error));
});

describe('custoAlimento (porte do Python)', () => {
  it('calcula líquido × preço', () => igual(custoAlimento(D('3.3'), D('8.50')), '28.05'));
  it('arredonda meio para cima', () => igual(custoAlimento(D('0.5'), D('1.01')), '0.51'));
  it('arredonda três casas', () => igual(custoAlimento(D('0.333'), D('8.50')), '2.83'));
  it('rejeita líquido negativo', () => expect(() => custoAlimento(D('-1'), D('8.5'))).toThrow(Error));
  it('rejeita líquido zero', () => expect(() => custoAlimento(D('0'), D('8.5'))).toThrow(Error));
  it('rejeita preço negativo', () => expect(() => custoAlimento(D('8.5'), D('-1'))).toThrow(Error));
  it('rejeita preço zero', () => expect(() => custoAlimento(D('8.5'), D('0'))).toThrow(Error));
});

describe('custoProducao (porte do Python)', () => {
  it('calcula líquido × preço × (1 + taxa)', () =>
    igual(custoProducao(D('3.3'), D('8.50'), D('0.30')), '36.47'));
  it('arredonda só no fim (0,25 × 10,10 × 1,30 = 3,2825 -> 3,28)', () =>
    igual(custoProducao(D('0.25'), D('10.10'), D('0.30')), '3.28'));
  it('rejeita líquido negativo', () =>
    expect(() => custoProducao(D('-1'), D('8.5'), D('0.30'))).toThrow(Error));
  it('rejeita líquido zero', () =>
    expect(() => custoProducao(D('0'), D('8.5'), D('0.30'))).toThrow(Error));
  it('rejeita preço negativo', () =>
    expect(() => custoProducao(D('8.5'), D('-1'), D('0.30'))).toThrow(Error));
  it('rejeita preço zero', () =>
    expect(() => custoProducao(D('8.5'), D('0'), D('0.30'))).toThrow(Error));
  it('rejeita taxa negativa', () =>
    expect(() => custoProducao(D('3.3'), D('8.50'), D('-0.1'))).toThrow(Error));
});

describe('percentualSobra (porte do Python)', () => {
  it('calcula sobra / saída × 100', () => igual(percentualSobra(D('0.5'), D('3.3')), '15.2'));
  it('sobra zero vira "0.0"', () => expect(percentualSobra(D('0'), D('3.3')).toFixed(1)).toBe('0.0'));
  it('sobra igual à saída vira "100.0"', () =>
    expect(percentualSobra(D('3.3'), D('3.3')).toFixed(1)).toBe('100.0'));
  it('rejeita sobra maior que a saída', () =>
    expect(() => percentualSobra(D('4'), D('3.3'))).toThrow(Error));
  it('rejeita sobra negativa', () => expect(() => percentualSobra(D('-1'), D('3.3'))).toThrow(Error));
  it('rejeita saída zero', () => expect(() => percentualSobra(D('1'), D('0'))).toThrow(Error));
});

// ---------------------------------------------------------------------------
// Testes extras (não existem no Python)
// ---------------------------------------------------------------------------

describe('extras: regras que só o JavaScript precisa', () => {
  it('custoProducao aceita taxa zero', () => igual(custoProducao(D('3.3'), D('8.50'), D('0')), '28.05'));

  it('mensagens dizem o campo e a regra', () => {
    expect(() => lerPeso('', 'Peso bruto')).toThrow('Peso bruto: informe um valor.');
    expect(() => lerPeso('abc', 'Peso bruto')).toThrow('Peso bruto: "abc" não é um número válido.');
    expect(() => lerPeso('0', 'Peso bruto')).toThrow('Peso bruto: deve ser maior que zero.');
    expect(() => pesoLiquido(D('1'), D('2'))).toThrow(/maior que a tara/);
    expect(() => custoProducao(D('1'), D('1'), D('-0.1'))).toThrow(/Taxa: não pode ser negativa/);
  });

  it('rejeita Number (evita ponto flutuante em dinheiro e peso)', () => {
    expect(() => pesoLiquido(5.3, D('2'))).toThrow(/Decimal/);
    expect(() => custoAlimento(D('1'), 8.5)).toThrow(/Decimal/);
  });

  it('lerPeso rejeita formatos que o decimal.js aceitaria', () => {
    for (const t of ['0x10', '0b1', '1e3', '-Infinity', '1.2.3', '3,5,1', '1 000', null, undefined]) {
      expect(() => lerPeso(t)).toThrow(Error);
    }
  });

  it('lerPeso aceita ".5" e "5."', () => {
    igual(lerPeso('.5'), '0.5');
    igual(lerPeso('5.'), '5');
  });

  it('não acumula erro de ponto flutuante', () => igual(pesoLiquido(D('0.3'), D('0.1')), '0.2'));
});

describe('lerValor (novo: valor em reais)', () => {
  it('aceita vírgula e ponto', () => {
    igual(lerValor('12,50'), '12.50');
    igual(lerValor('12.5'), '12.5');
  });
  it('rejeita vazio, texto, NaN e Infinity', () => {
    for (const t of ['', '   ', 'abc', 'NaN', 'Infinity']) expect(() => lerValor(t)).toThrow(Error);
  });
  it('rejeita zero e negativo', () => {
    expect(() => lerValor('0', 'Valor')).toThrow('Valor: deve ser maior que zero.');
    expect(() => lerValor('-5')).toThrow(Error);
  });
  it('rejeita mais de 2 casas decimais', () =>
    expect(() => lerValor('1,234', 'Valor')).toThrow('Valor: use no máximo 2 casas decimais (centavos).'));
  it('rejeita separador de milhar (ambíguo)', () => expect(() => lerValor('1.234,56')).toThrow(Error));
});

describe('totalGastos (novo)', () => {
  it('soma strings guardadas no Firestore', () => igual(totalGastos(['10.10', '0.20', '5']), '15.30'));
  it('soma sem erro de ponto flutuante', () => igual(totalGastos(['0.1', '0.2']), '0.30'));
  it('lista vazia dá zero', () => expect(totalGastos([]).toFixed(2)).toBe('0.00'));
  it('aceita Decimal', () => igual(totalGastos([D('1.5'), D('2.25')]), '3.75'));
  it('rejeita item inválido dizendo a posição', () =>
    expect(() => totalGastos(['1', 'x'])).toThrow('Gasto nº 2: "x" não é um número válido.'));
  it('rejeita Number', () => expect(() => totalGastos([1.5])).toThrow(Error));
});

describe('lerNaoNegativo (novo: tara, taxa e peso bruto da sobra)', () => {
  it('aceita zero', () => igual(lerNaoNegativo('0', 'Tara'), '0'));
  it('aceita vírgula', () => igual(lerNaoNegativo('3,8', 'Tara'), '3.8'));
  it('rejeita negativo', () => expect(() => lerNaoNegativo('-1', 'Tara')).toThrow('Tara: não pode ser menor que zero.'));
  it('rejeita vazio e texto', () => {
    expect(() => lerNaoNegativo('', 'Tara')).toThrow('Tara: informe um valor.');
    expect(() => lerNaoNegativo('x', 'Tara')).toThrow(Error);
  });
});

describe('lerDinheiroBR (valores em reais como se escreve no Brasil)', () => {
  it.each([
    ['3.500,00', '3500'],
    ['R$ 3.500,00', '3500'],
    ['R$3.500,00', '3500'],
    ['3500', '3500'],
    ['3500,5', '3500.5'],
    ['3500.50', '3500.5'],
    ['1.234.567,89', '1234567.89'],
    ['0,50', '0.5'],
    ['  250  ', '250'],
    ['3.500', '3500'], // ponto com 3 dígitos depois é separador de milhar
    ['3.5', '3.5'], // ponto com 1 ou 2 dígitos é decimal
  ])('aceita %s', (texto, esperado) => igual(lerDinheiroBR(texto, 'Valor'), esperado));

  it.each(['', '   ', 'R$', 'abc', '-5', '3,505', '3.5000', '1.23.4', '1,2,3', '1.234,5,6', '12 34', 'NaN', 'Infinity', '1e3', '0x10'])(
    'recusa %j',
    (texto) => expect(() => lerDinheiroBR(texto, 'Valor')).toThrow(Error),
  );
  it('zero só é aceito quando permitido', () => {
    expect(() => lerDinheiroBR('0', 'Salário')).toThrow('Salário: deve ser maior que zero.');
    expect(() => lerDinheiroBR('0,00', 'Salário')).toThrow('Salário: deve ser maior que zero.');
    igual(lerDinheiroBR('0', 'Prêmio', { permitirZero: true }), '0');
  });
  it('mensagem diz o campo e a regra', () => {
    expect(() => lerDinheiroBR('', 'Salário')).toThrow('Salário: informe um valor.');
    expect(() => lerDinheiroBR('abc', 'Salário')).toThrow('Salário: "abc" não é um valor em reais válido.');
    expect(() => lerDinheiroBR('3,505', 'Salário')).toThrow('Salário: use no máximo 2 casas decimais (centavos).');
    expect(() => lerDinheiroBR('-5', 'Prêmio', { permitirZero: true })).toThrow('Prêmio: não pode ser negativo.');
  });
});
