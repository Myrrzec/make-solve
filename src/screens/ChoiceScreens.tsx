import type { ExplanationMode, SolutionMethod } from '../cube/types';
import { SOLVERS } from '../solvers/registry';
import { IsoCube } from '../ui/IsoCube';

export function ExplanationModeScreen({ onSelect }: { onSelect: (mode: ExplanationMode) => void }) {
  return (
    <main className="page">
      <div className="page-head">
        <div className="eyebrow">Шаг 1 из 3</div>
        <h1>Как вам объяснять ходы?</h1>
        <p>От выбора зависит только подача подсказок. Решение будет одним и тем же, режим можно сменить в любой момент.</p>
      </div>
      <div className="choices">
        <button type="button" className="card choice" onClick={() => onSelect('beginner')}>
          <h2>Я начинающий</h2>
          <p className="lead">Не знаю обозначений. Хочу, чтобы каждый ход объясняли словами и показывали на 3D-модели.</p>
          <div className="sample">
            <div className="beginner-sample">
              <IsoCube top="white" front="green" right="red" size={104} arrowOnTop highlight="top" />
              <div>
                <div className="text">Поверните верхнюю грань по часовой стрелке на 90°</div>
                <div className="note">Передний ряд уходит влево. Направление считается, если смотреть на грань сверху.</div>
                <div style={{ marginTop: 10 }}>
                  <span className="notation-chip">U</span>
                </div>
              </div>
            </div>
          </div>
          <span className="cta">Выбрать</span>
        </button>
        <button type="button" className="card choice" onClick={() => onSelect('notation')}>
          <h2>Я знаю нотацию</h2>
          <p className="lead">Читаю формулы. Нужна крупная запись хода и вся лента алгоритма, текст пусть будет мелко.</p>
          <div className="sample">
            <div className="notation-sample">
              <span>U</span>
              <span>R'</span>
              <span>L2</span>
              <span>Rw</span>
              <span>x</span>
            </div>
          </div>
          <span className="cta">Выбрать</span>
        </button>
      </div>
    </main>
  );
}

export function MethodScreen({ onSelect, onBack }: { onSelect: (method: SolutionMethod) => void; onBack: () => void }) {
  const cfopReady = SOLVERS.cfop.status !== 'unavailable';
  return (
    <main className="page">
      <div className="page-head">
        <div className="eyebrow">Шаг 2 из 3</div>
        <h1>Каким методом собираем?</h1>
        <p>Метод определяет, из каких этапов будет состоять решение.</p>
      </div>
      <div className="choices">
        <button type="button" className="card choice" onClick={() => onSelect('beginner')}>
          <h2>Базовый метод</h2>
          <p className="lead">Учебный способ «слой за слоем». Ходов больше, зато каждый этап понятен и легко запоминается.</p>
          <ol className="stage-list">
            <li>Белый крест сверху</li>
            <li>Переворот и белая грань пиф-пафом</li>
            <li>Средний слой</li>
            <li>Жёлтый крест</li>
            <li>Боковые цвета креста</li>
            <li>Расстановка углов</li>
            <li>Разворот углов пиф-пафом</li>
          </ol>
          <span className="cta">Выбрать</span>
        </button>
        <button type="button" className="card choice" disabled={!cfopReady} onClick={() => onSelect('cfop')}>
          <div className="row" style={{ alignItems: 'center' }}>
            <h2>Фридрих (CFOP)</h2>
            {!cfopReady && <span className="tag">В разработке</span>}
          </div>
          <p className="lead">Метод скоростной сборки: примерно вдвое меньше ходов, зато больше алгоритмов.</p>
          <ol className="stage-list">
            <li>Cross: белый крест сразу снизу</li>
            <li>F2L: пары угол и ребро в слоты</li>
            <li>OLL: жёлтая грань, 57 случаев</li>
            <li>PLL: последний слой, 21 случай</li>
          </ol>
          <span className="cta muted">{cfopReady ? 'Выбрать' : 'Появится в следующей версии'}</span>
        </button>
      </div>
      <div style={{ marginTop: 24 }}>
        <button type="button" className="btn quiet" onClick={onBack}>
          Назад
        </button>
      </div>
    </main>
  );
}
