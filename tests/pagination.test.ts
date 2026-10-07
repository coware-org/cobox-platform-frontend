import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampPageIndex,
  getPageCount,
  getPageSummary,
  paginate,
} from '../src/lib/pagination.ts';

const orders = Array.from({ length: 25 }, (_, index) => `orden-${index + 1}`);

test('getPageCount divide en páginas completas y parciales', () => {
  assert.equal(getPageCount(25, 10), 3);
  assert.equal(getPageCount(20, 10), 2);
  assert.equal(getPageCount(0, 10), 0);
  assert.equal(getPageCount(25, 0), 0);
  assert.equal(getPageCount(-5, 10), 0);
});

test('clampPageIndex mantiene el índice dentro del rango válido', () => {
  assert.equal(clampPageIndex(0, 3), 0);
  assert.equal(clampPageIndex(2, 3), 2);
  assert.equal(clampPageIndex(9, 3), 2);
  assert.equal(clampPageIndex(-1, 3), 0);
  assert.equal(clampPageIndex(5, 0), 0);
  assert.equal(clampPageIndex(Number.NaN, 3), 0);
});

test('paginate devuelve los segmentos exactos de cada página', () => {
  assert.deepEqual(paginate(orders, 0, 10), orders.slice(0, 10));
  assert.deepEqual(paginate(orders, 1, 10), orders.slice(10, 20));
  assert.deepEqual(paginate(orders, 2, 10), orders.slice(20, 25));
  assert.equal(paginate(orders, 2, 10).length, 5);
});

test('paginate acota el índice cuando los filtros reducen los resultados', () => {
  const filtered = orders.slice(0, 4);

  assert.equal(paginate(filtered, 5, 10).length, 4);
  assert.deepEqual(paginate(filtered, 5, 10), filtered);
  assert.deepEqual(paginate([], 3, 10), []);
  assert.deepEqual(paginate(orders, -2, 10), orders.slice(0, 10));
});

test('paginate sin pageSize válido devuelve la lista completa', () => {
  assert.deepEqual(paginate(orders, 0, 0), orders);
});

test('getPageSummary describe el rango visible de la página', () => {
  assert.deepEqual(getPageSummary(0, 10, 25), {
    from: 1,
    to: 10,
    label: 'Mostrando 1-10 de 25',
  });
  assert.deepEqual(getPageSummary(2, 10, 25), {
    from: 21,
    to: 25,
    label: 'Mostrando 21-25 de 25',
  });
  assert.deepEqual(getPageSummary(0, 10, 0), {
    from: 0,
    to: 0,
    label: 'Mostrando 0 de 0',
  });
});

test('getPageSummary acota el índice fuera de rango', () => {
  assert.deepEqual(getPageSummary(9, 10, 25), {
    from: 21,
    to: 25,
    label: 'Mostrando 21-25 de 25',
  });
});
