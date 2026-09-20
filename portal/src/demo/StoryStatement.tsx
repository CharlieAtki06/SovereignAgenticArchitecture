import type {ReactNode} from 'react';

import type {StoryStatementMotif} from './scenes';
import styles from './StoryStatement.module.css';

export interface StoryStatementProps {
  readonly motif: StoryStatementMotif;
}

/**
 * Narrative typography for the non-architecture scenes. It deliberately adds
 * no topology or implementation status; those remain in the LikeC4 model.
 */
export default function StoryStatement({motif}: StoryStatementProps): ReactNode {
  return (
    <div className={styles.frame} data-story-statement={motif} aria-hidden="true">
      {motif === 'origin' && (
        <div className={styles.origin}>
          <span className={styles.microLabel}>Where we started</span>
          <strong>SMALL</strong>
          <strong>LOCAL</strong>
          <strong>USEFUL</strong>
          <span className={styles.rule} />
          <p>Intelligence close to the person.</p>
        </div>
      )}

      {motif === 'tension' && (
        <div className={styles.tension}>
          <section>
            <span className={styles.zoneNumber}>01</span>
            <strong>ON THE DEVICE</strong>
            <small>Conversation · intent · control</small>
          </section>
          <div className={styles.gap}>
            <span />
            <em>THE USEFUL GAP</em>
            <span />
          </div>
          <section>
            <span className={styles.zoneNumber}>03</span>
            <strong>IN THE ENTERPRISE</strong>
            <small>Records · services · deeper reasoning</small>
          </section>
        </div>
      )}

      {motif === 'question' && (
        <div className={styles.question}>
          <span className={styles.questionMark}>?</span>
          <p>LOCAL INTELLIGENCE</p>
          <span className={styles.plus}>+</span>
          <p>GOVERNED REACH</p>
        </div>
      )}

      {motif === 'handoff' && (
        <div className={styles.handoff}>
          <div className={styles.liveLabel}>
            <span /> Live demonstration
          </div>
          <ol>
            <li><span>01</span>Ask</li>
            <li><span>02</span>Govern</li>
            <li><span>03</span>Use</li>
            <li><span>04</span>Return</li>
          </ol>
          <p>The architecture becomes visible in the experience.</p>
        </div>
      )}
    </div>
  );
}
