//~ The numbers beside the trace, and the 5-1-1 landmark as three checks —
// what is met shows at a glance, without reading the figures.
import type { Timeline } from '../domain/timeline';
import { fiveOneOne, rhythm } from '../domain/stats';
import { minSec } from '../format';
import { StatTile as Tile } from './StatTile';

export const RhythmPanel = ({ timeline }: { timeline: Timeline }) => {
  const now = rhythm(timeline);
  const landmark = fiveOneOne(timeline);
  const checks = [
    { met: landmark.everyFiveMinutes, label: 'Toutes les 5 min ou moins' },
    { met: landmark.lastingOneMinute, label: 'Durée 1 min ou plus' },
    { met: landmark.forOneHour, label: 'Depuis 1 heure' }
  ];
  const metCount = checks.filter((check) => check.met).length;

  return (
    <section className="rhythm" aria-label="Rythme">
      <div className="rhythm__tiles">
        <Tile label="Fréquence" value={now.perTenMinutes} unit="/ 10 min" />
        <Tile label="Intervalle moyen" value={now.averageInterval === null ? null : minSec(now.averageInterval)} unit="min" />
        <Tile
          label="Durée moyenne"
          value={now.averageDuration === null ? null : Math.round(now.averageDuration)}
          unit="s"
        />
        <Tile label="Depuis la dernière" value={now.sinceLast === null ? null : minSec(now.sinceLast)} unit="min" />
        <Tile label="Mouvements bébé" value={now.movementsLastHour} unit="/ dern. heure" />
        <Tile
          label="Dernier mouvement"
          value={now.sinceLastMovement === null ? null : minSec(now.sinceLastMovement)}
          unit="min"
        />
      </div>
      <div className="rhythm__landmark" data-met={landmark.met}>
        <div className="rhythm__landmark-head">
          <strong>Faut-il partir à la maternité ?</strong>
          <span className="rhythm__verdict">
            {landmark.met ? 'Atteint : contactez votre maternité' : `${metCount} / 3 critères`}
          </span>
        </div>
        <ul>
          {checks.map((check) => (
            <li key={check.label} data-met={check.met}>
              {check.label}
            </li>
          ))}
        </ul>
        <p>
          Règle « 5-1-1 », souvent donnée pour un premier bébé : il est temps d'appeler la maternité quand les trois
          conditions sont réunies. Calculée sur la dernière heure. Elle ne remplace pas les consignes de votre
          sage-femme ou maternité.
        </p>
      </div>
    </section>
  );
};
