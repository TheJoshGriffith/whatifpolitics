import { getEvent } from "@/lib/data";
import { finalPolls, pollsterTable, scoreVote, topTwo, type VoteScore } from "@/lib/pollAccuracy";

const pts = (x: number, dp = 1) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(dp)}`;

function names(v: VoteScore) {
  const e = getEvent(v.vote.eventId);
  const party = (id: string) => e.parties.find((p) => p.id === id);
  return {
    name: (id: string) => party(id)?.name ?? id,
    short: (id: string) => party(id)?.short ?? id,
    colour: (id: string) => party(id)?.colour ?? "#999",
  };
}

/** One sentence on how the polls did, in plain words. */
function verdict(v: VoteScore): string {
  const n = names(v);
  const [w, r] = topTwo(v.vote);
  const lead = v.vote.result[w] - v.vote.result[r];
  const avgLead = v.average[w] - v.average[r];
  // "the Conservatives", "the Liberal Democrats", but "Labour", "Leave".
  const the = (x: string) => (x.endsWith("s") ? `the ${x}` : x);
  const winner = the(n.name(w));
  const runner = the(n.name(r));
  const winners = winner.endsWith("s") ? `${winner}'` : `${winner}'s`;
  if (avgLead <= 0)
    return `On average the final polls had ${runner} ahead or level. ${winner[0].toUpperCase() + winner.slice(1)} won by ${lead.toFixed(1)} points.`;
  const diff = avgLead - lead;
  if (Math.abs(diff) < 1.5)
    return `The final polls got the lead about right: ${avgLead.toFixed(1)} points on average, against ${lead.toFixed(1)} on the day.`;
  return diff > 0
    ? `The final polls overstated ${winners} lead over ${runner}: ${avgLead.toFixed(1)} points on average, against ${lead.toFixed(1)} on the day.`
    : `The final polls understated ${winners} lead over ${runner}: ${avgLead.toFixed(1)} points on average, against ${lead.toFixed(1)} on the day.`;
}

export function PollingContent() {
  const votes = finalPolls.map(scoreVote);
  const general = votes.filter((v) => v.vote.kind === "general");
  const maxLead = Math.max(...votes.map((v) => Math.abs(v.leadError)), 1);
  const best = [...general].sort((a, b) => a.meanError - b.meanError)[0];
  const worst = [...general].sort((a, b) => b.meanError - a.meanError)[0];
  const table = pollsterTable(votes);

  return (
    <article className="flex flex-col gap-6 pt-4 sm:pt-10">
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        How good are the polls? <span aria-hidden>🔮</span>
      </h1>
      <p className="max-w-2xl text-lg text-ink/80">
        Every polling company&apos;s final poll before each vote on the site, against what actually
        happened. Most of the time they&apos;re within a couple of points per party. Now and then
        they miss in the same direction all at once.
      </p>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card flex flex-col gap-1.5 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">🎯 Closest general election</p>
          <p className="font-display text-3xl font-black">{best.vote.short}</p>
          <p className="text-sm text-ink/80">
            The final polls were {best.meanError.toFixed(1)} points out per party, on average.
          </p>
        </div>
        <div className="card flex flex-col gap-1.5 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">🙈 Furthest out</p>
          <p className="font-display text-3xl font-black">{worst.vote.short}</p>
          <p className="text-sm text-ink/80">
            {worst.meanError.toFixed(1)} points out per party on average. {verdict(worst)}
          </p>
        </div>
        <div className="card flex flex-col gap-1.5 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">🗳️ Polls in the book</p>
          <p className="font-display text-3xl font-black">{votes.reduce((a, v) => a + v.scores.length, 0)}</p>
          <p className="text-sm text-ink/80">Final polls from {votes.length} votes, {votes[0].vote.date.slice(0, 4)} to {votes[votes.length - 1].vote.date.slice(0, 4)}.</p>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="font-display text-xl font-extrabold">📏 How far off was the lead?</h2>
        <p className="text-sm text-ink/80">
          The average final poll&apos;s lead for the eventual winner, minus the real lead, in points. Bars to
          the right mean the polls had the winner further ahead than they finished; bars to the left mean the
          race was less close than the polls said.
        </p>
        <ul className="flex flex-col gap-1.5">
          {votes.map((v) => {
            const n = names(v);
            const [w] = topTwo(v.vote);
            const width = (Math.abs(v.leadError) / maxLead) * 50;
            return (
              <li key={v.vote.eventId} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-2 text-sm">
                <span className="font-extrabold">{v.vote.short}</span>
                <span className="relative h-4 rounded-full bg-ink/5" aria-label={`${pts(v.leadError)} points`}>
                  <span className="absolute inset-y-0 left-1/2 w-0.5 bg-ink/40" aria-hidden />
                  <span
                    className="absolute inset-y-0.5 rounded-full"
                    style={{
                      background: n.colour(w),
                      width: `${width}%`,
                      left: v.leadError >= 0 ? "50%" : `${50 - width}%`,
                    }}
                  />
                </span>
                <span className="text-right tabular-nums">{pts(v.leadError)}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted">
          Colour: the party or side that won. For referendums we leave out the undecideds before comparing.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-extrabold">🗂️ Vote by vote</h2>
        {[...votes].reverse().map((v) => {
          const n = names(v);
          return (
            <details key={v.vote.eventId} className="card p-4 sm:p-5">
              <summary className="cursor-pointer list-none">
                <span className="font-display text-lg font-extrabold">{v.vote.label}</span>{" "}
                <span className="text-sm text-muted">
                  · {v.meanError.toFixed(1)} pts out per {v.vote.kind === "referendum" ? "side" : "party"} · {v.called} of {v.scores.length} polls had the winner ahead
                </span>
                <p className="mt-1 text-sm text-ink/80">{verdict(v)}</p>
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink text-left text-xs font-extrabold uppercase tracking-wider text-muted">
                      <th className="py-2 pr-2">Pollster</th>
                      {v.vote.parties.map((p) => (
                        <th key={p} className="pr-2 text-right">
                          {n.short(p)}
                        </th>
                      ))}
                      <th className="text-right">Avg miss</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-ink/15 font-extrabold">
                      <td className="py-1.5 pr-2">Result{v.vote.kind === "general" ? " (GB)" : ""}</td>
                      {v.vote.parties.map((p) => (
                        <td key={p} className="pr-2 text-right tabular-nums">
                          {v.vote.result[p].toFixed(1)}
                        </td>
                      ))}
                      <td />
                    </tr>
                    {v.scores.map((s, i) => (
                      <tr key={i} className="border-b border-ink/10">
                        <td className="py-1.5 pr-2">
                          {s.poll.pollster}
                          {s.poll.client && <span className="text-muted"> / {s.poll.client}</span>}
                        </td>
                        {v.vote.parties.map((p) => (
                          <td key={p} className="pr-2 text-right tabular-nums">
                            {s.errors[p] === undefined ? (
                              "?"
                            ) : (
                              <>
                                {(v.vote.result[p] + s.errors[p]).toFixed(v.vote.kind === "referendum" ? 1 : 0)}{" "}
                                <span className={`text-xs ${Math.abs(s.errors[p]) >= 3 ? "font-bold text-pink" : "text-muted"}`}>
                                  ({pts(s.errors[p], 0)})
                                </span>
                              </>
                            )}
                          </td>
                        ))}
                        <td className="text-right tabular-nums">{s.meanError.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">
                Sorted closest first. Misses of 3 points or more are in pink.{" "}
                <a href={v.vote.url} target="_blank" rel="noopener noreferrer" className="underline">
                  Source ↗
                </a>
              </p>
            </details>
          );
        })}
      </section>

      <section className="card flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="font-display text-xl font-extrabold">🏅 Pollsters with three or more votes here</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left text-xs font-extrabold uppercase tracking-wider text-muted">
              <th className="py-2 pr-2">Pollster</th>
              <th className="pr-2 text-right">Votes</th>
              <th className="pr-2 text-right">Avg miss per party</th>
              <th className="text-right">Had the winner ahead</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.pollster} className="border-b border-ink/10">
                <td className="py-1.5 pr-2 font-bold">{r.pollster}</td>
                <td className="pr-2 text-right tabular-nums">{r.votes}</td>
                <td className="pr-2 text-right tabular-nums">{r.meanError.toFixed(1)} pts</td>
                <td className="text-right tabular-nums">{r.called}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted">
          Different companies polled different votes, and the hard years drag everyone down, so this isn&apos;t a
          fair race. Gallup, Harris, NOP and Marplan stopped publishing election polls in Britain years ago. MORI
          became Ipsos MORI and then Ipsos; we count them as one firm.
        </p>
      </section>

      <section className="card prose-casual flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="font-display text-xl font-extrabold">🤷 Why do polls miss?</h2>
        <ul>
          <li>
            <b>Who they reach.</b> A poll is only as good as its sample. If the people who answer differ from those
            who don&apos;t, in ways weighting doesn&apos;t fix, every poll goes wrong together. The industry
            inquiry into 2015 (Sturgis and colleagues, for the British Polling Council and Market Research Society)
            put that year&apos;s miss mainly down to unrepresentative samples.
          </li>
          <li>
            <b>Who turns out.</b> Pollsters have to guess who will actually vote. In 2017 several adjusted for
            young people turning out less, and those adjustments made their final polls further out, not closer.
          </li>
          <li>
            <b>Late changes of mind.</b> The Market Research Society&apos;s inquiry into 1992 found a late swing,
            people declining to say how they&apos;d vote, and sampling problems all played a part.
          </li>
          <li>
            <b>Method.</b> Before the 2016 referendum, phone polls tended to show more support for Remain than
            online polls did. On the day the online polls were closer.
          </li>
          <li>
            <b>Margin of error.</b> Even a perfect random sample of 1,000 people is usually within about 3 points
            of the truth for each party, and sometimes it isn&apos;t.
          </li>
        </ul>
        <p className="text-sm">
          That&apos;s worth keeping in mind for the &ldquo;Polls now&rdquo; projection on the Play page: it takes the
          polls at face value.
        </p>
      </section>

      <p className="text-xs text-muted">
        Final polls are each company&apos;s last poll ending in the week before the vote, as listed on Wikipedia&apos;s
        &ldquo;Opinion polling for the …&rdquo; pages. General election results are for Great Britain, because
        that&apos;s what the polls cover. &ldquo;Avg miss&rdquo; is the average gap between poll and result for each
        party on 5% or more of the vote (smaller parties are shown but don&apos;t count towards it).
      </p>
    </article>
  );
}
