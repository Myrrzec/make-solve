import type { ExplanationMode, SolutionMethod } from '../cube/types';
import { SOLVERS } from '../solvers/registry';
import { IsoCube } from '../ui/IsoCube';

export function ExplanationModeScreen({ onSelect }: { onSelect: (mode: ExplanationMode) => void }) {
  return (
    <main className="page">
      <div className="page-head">
        <div className="eyebrow">Step 1 of 3</div>
        <h1>How should moves be explained?</h1>
        <p>This only changes how hints are shown. The solution stays the same, and you can switch at any time.</p>
      </div>
      <div className="choices">
        <button type="button" className="card choice" onClick={() => onSelect('beginner')}>
          <h2>I am a beginner</h2>
          <p className="lead">I don't know the notation. Explain every move in words and show it on the 3D model.</p>
          <div className="sample">
            <div className="beginner-sample">
              <IsoCube top="white" front="green" right="red" size={104} arrowOnTop highlight="top" />
              <div>
                <div className="text">Turn the top face 90° clockwise</div>
                <div className="note">The front row moves left. Direction as seen looking down at the face.</div>
                <div style={{ marginTop: 10 }}>
                  <span className="notation-chip">U</span>
                </div>
              </div>
            </div>
          </div>
          <span className="cta">Choose</span>
        </button>
        <button type="button" className="card choice" onClick={() => onSelect('notation')}>
          <h2>I know the notation</h2>
          <p className="lead">I read algorithms. Show the move large with the whole sequence, and keep the text small.</p>
          <div className="sample">
            <div className="notation-sample">
              <span>U</span>
              <span>R'</span>
              <span>L2</span>
              <span>Rw</span>
              <span>x</span>
            </div>
          </div>
          <span className="cta">Choose</span>
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
        <div className="eyebrow">Step 2 of 3</div>
        <h1>Which method should we use?</h1>
        <p>The method decides which steps the solution is made of.</p>
      </div>
      <div className="choices">
        <button type="button" className="card choice" onClick={() => onSelect('beginner')}>
          <h2>Beginner method</h2>
          <p className="lead">The layer by layer learning method. More moves, but every step is clear and easy to remember.</p>
          <ol className="stage-list">
            <li>White cross on top</li>
            <li>Flip, then the white face with the sexy move</li>
            <li>Middle layer</li>
            <li>Yellow cross</li>
            <li>Cross side colors</li>
            <li>Corner placement</li>
            <li>Corner twist with the sexy move</li>
          </ol>
          <span className="cta">Choose</span>
        </button>
        <button type="button" className="card choice" disabled={!cfopReady} onClick={() => onSelect('cfop')}>
          <div className="row" style={{ alignItems: 'center' }}>
            <h2>CFOP (Fridrich)</h2>
            {!cfopReady && <span className="tag">In progress</span>}
          </div>
          <p className="lead">The speedcubing method: about half the moves, but more algorithms to learn.</p>
          <ol className="stage-list">
            <li>Cross: white cross straight on the bottom</li>
            <li>F2L: corner and edge pairs into slots</li>
            <li>OLL: yellow face, 57 cases</li>
            <li>PLL: last layer, 21 cases</li>
          </ol>
          <span className="cta muted">{cfopReady ? 'Choose' : 'Coming in the next version'}</span>
        </button>
      </div>
      <div style={{ marginTop: 24 }}>
        <button type="button" className="btn quiet" onClick={onBack}>
          Back
        </button>
      </div>
    </main>
  );
}
