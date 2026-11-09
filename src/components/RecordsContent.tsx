import { events } from "@/lib/data";
import {
  partyColour,
  partyCosts,
  partyName,
  seatRecords,
  summarise,
  type ElectionSummary,
} from "@/lib/records";

const pct = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const int = (x: number) => Math.round(x).toLocaleString("en-GB");

export function RecordsContent() {
  const general = events.filter((e) => e.kind === "general").sort((a, b) => a.year - b.year);
  const sums = general.map(summarise);
  const majorities = sums.filter((s) => s.majority > 0);
  const by = <T,>(xs: T[], f: (x: T) => number) => [...xs].sort((a, b) => f(a) - f(b));
  const smallestShare = by(majorities, (s) => s.voteShares[s.winner])[0];
  const biggestMaj = by(sums, (s) => -s.majority)[0];
  const biggestBonus = by(sums, (s) => -s.bonus)[0];
  const highT = by(sums, (s) => -s.turnout)[0];
  const lowT = by(sums, (s) => s.turnout)[0];
  const mostGap = by(sums, (s) => -s.gap)[0];
  const leastGap = by(sums, (s) => s.gap)[0];
  const costs = partyCosts(sums);
  const withSeats = costs.filter((c) => c.seats > 0);
  const dearest = by(withSeats, (c) => -c.perSeat).slice(0, 5);
  const cheapest = by(withSeats, (c) => c.perSeat)[0];
  const noSeat = by(costs.filter((c) => c.seats === 0), (c) => -c.votes)[0];
  const seats = seatRecords(general);
  const closest = by(seats, (s) => s.majorityVotes).slice(0, 5);
  const safest = by(seats, (s) => -s.majorityShare)[0];
  const lowestWin = by(seats, (s) => s.winnerShare)[0];

  const W = (s: ElectionSummary) => partyName(s.event, s.winner);

  return (
    <article className="flex flex-col gap-6 pt-4 sm:pt-10">
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        The record book <span aria-hidden>🏆</span>
      </h1>
      <p className="max-w-2xl text-lg text-ink/80">
        The real results of every general election on the site, {general[0].year} to{" "}
        {general[general.length - 1].year}, worked out seat by seat. No modelling here, just counting.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Fact
          emoji="🪶"
          title="Smallest vote share to win a majority"
          big={pct(smallestShare.voteShares[smallestShare.winner])}
          body={`${W(smallestShare)} in ${smallestShare.event.year}: ${smallestShare.winnerSeats} of ${smallestShare.seatsTotal} seats, a majority of ${smallestShare.majority}.`}
        />
        <Fact
          emoji="🏔️"
          title="Biggest majority"
          big={`${biggestMaj.majority}`}
          body={`${W(biggestMaj)} in ${biggestMaj.event.year}, with ${biggestMaj.winnerSeats} seats on ${pct(biggestMaj.voteShares[biggestMaj.winner])} of the vote.`}
        />
        <Fact
          emoji="🎁"
          title="Biggest seat bonus"
          big={`+${(biggestBonus.bonus * 100).toFixed(1)} pts`}
          body={`${W(biggestBonus)} in ${biggestBonus.event.year} won ${pct(biggestBonus.winnerSeats / biggestBonus.seatsTotal)} of the seats on ${pct(biggestBonus.voteShares[biggestBonus.winner])} of the vote. Under pure proportional representation that vote share would have been about ${biggestBonus.prSeats} seats.`}
        />
        <Fact
          emoji="💸"
          title="Most votes per MP"
          big={int(dearest[0].perSeat)}
          body={`${partyName(dearest[0].event, dearest[0].party)} in ${dearest[0].event.year}: ${int(dearest[0].votes)} votes, ${dearest[0].seats} seat${dearest[0].seats === 1 ? "" : "s"}. The fewest was ${partyName(cheapest.event, cheapest.party)} in ${cheapest.event.year}, at ${int(cheapest.perSeat)} votes each.`}
        />
        {noSeat && (
          <Fact
            emoji="🫥"
            title="Most votes without winning a seat"
            big={int(noSeat.votes)}
            body={`${partyName(noSeat.event, noSeat.party)} in ${noSeat.event.year} (${pct(noSeat.votes / sums.find((s) => s.event === noSeat.event)!.totalVotes)} of the vote).`}
          />
        )}
        <Fact
          emoji="🗳️"
          title="Highest and lowest turnout"
          big={`${pct(highT.turnout)} / ${pct(lowT.turnout)}`}
          body={`Highest in ${highT.event.year}, lowest in ${lowT.event.year}. Votes cast as a share of the registered electorate.`}
        />
        <Fact
          emoji="📏"
          title="Biggest and smallest seats-vs-votes gap"
          big={`${mostGap.gap.toFixed(1)} / ${leastGap.gap.toFixed(1)}`}
          body={`Biggest in ${mostGap.event.year}, smallest in ${leastGap.event.year}. This is the Gallagher index: 0 means every party's seat share matches its vote share.`}
        />
        <Fact
          emoji="🏰"
          title="Safest seat"
          big={pct(safest.majorityShare)}
          body={`${safest.seat} in ${safest.event.year}: ${partyName(safest.event, safest.winner)} won ${pct(safest.winnerShare)} of the vote, a majority of ${int(safest.majorityVotes)}.`}
        />
        <Fact
          emoji="🍰"
          title="Lowest share to win a seat"
          big={pct(lowestWin.winnerShare)}
          body={`${lowestWin.seat} in ${lowestWin.event.year}, won by ${partyName(lowestWin.event, lowestWin.winner)}. ${pct(1 - lowestWin.winnerShare, 0)} of voters there backed someone else.`}
        />
      </section>

      <section className="card flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="font-display text-xl font-extrabold">🪒 Closest seats</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {closest.map((s) => (
            <li key={`${s.event.id}-${s.seat}`} className="rounded-2xl border-2 border-ink bg-paper px-3 py-2 text-sm">
              <b>{s.seat}</b>, {s.event.year}: {partyName(s.event, s.winner)} beat{" "}
              {s.second ? partyName(s.event, s.second) : "nobody"} by{" "}
              <b>
                {s.majorityVotes} vote{s.majorityVotes === 1 ? "" : "s"}
              </b>
              .
            </li>
          ))}
        </ul>
      </section>

      <section className="card flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="font-display text-xl font-extrabold">📋 Every election at a glance</h2>
        <p className="text-sm text-ink/80">
          The party with the most seats, how much of the vote it won, and how many seats that vote share
          would have been under pure proportional representation.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-xs font-extrabold uppercase tracking-wider text-muted">
                <th className="py-2 pr-2">Year</th>
                <th className="pr-2">Most seats</th>
                <th className="pr-2 text-right">Votes</th>
                <th className="pr-2">Seats vs votes</th>
                <th className="pr-2 text-right">Seats</th>
                <th className="pr-2 text-right">Majority</th>
                <th className="pr-2 text-right">Under PR</th>
                <th className="text-right">Turnout</th>
              </tr>
            </thead>
            <tbody>
              {[...sums].reverse().map((s) => {
                const vs = s.voteShares[s.winner];
                const ss = s.winnerSeats / s.seatsTotal;
                const c = partyColour(s.event, s.winner);
                return (
                  <tr key={s.event.id} className="border-b border-ink/15">
                    <td className="py-2 pr-2 font-extrabold">{s.event.year}</td>
                    <td className="pr-2">
                      <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                      {W(s)}
                    </td>
                    <td className="pr-2 text-right tabular-nums">{pct(vs)}</td>
                    <td className="pr-2">
                      <div className="flex w-40 flex-col gap-0.5" aria-label={`${pct(vs)} of votes, ${pct(ss)} of seats`}>
                        <div className="h-2 rounded-full bg-ink/10">
                          <div className="h-2 rounded-full opacity-50" style={{ width: pct(vs), background: c }} />
                        </div>
                        <div className="h-2 rounded-full bg-ink/10">
                          <div className="h-2 rounded-full" style={{ width: pct(ss), background: c }} />
                        </div>
                      </div>
                    </td>
                    <td className="pr-2 text-right tabular-nums">
                      {s.winnerSeats} <span className="text-muted">({pct(ss, 0)})</span>
                    </td>
                    <td className="pr-2 text-right tabular-nums">
                      {s.majority > 0 ? s.majority : <span className="text-muted">hung</span>}
                    </td>
                    <td className="pr-2 text-right tabular-nums">{s.prSeats}</td>
                    <td className="text-right tabular-nums">{pct(s.turnout, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Bars: the faint one is the share of the vote, the solid one the share of seats. &ldquo;Under PR&rdquo; is a
          single nationwide count with no threshold (Sainte-Laguë). Majority means seats above everyone else
          combined. For 1979 to 2001 our results file lumps small parties and Northern Ireland&apos;s parties together,
          so they&apos;re left out of the party and seat records.
        </p>
      </section>
    </article>
  );
}

function Fact({ emoji, title, big, body }: { emoji: string; title: string; big: string; body: string }) {
  return (
    <div className="card flex flex-col gap-1.5 p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted">
        <span aria-hidden>{emoji}</span> {title}
      </p>
      <p className="font-display text-3xl font-black tabular-nums">{big}</p>
      <p className="text-sm text-ink/80">{body}</p>
    </div>
  );
}
