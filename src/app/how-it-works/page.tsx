import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <article className="flex flex-col gap-6 pt-4 sm:pt-10">
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        How it works <span aria-hidden>🔧</span>
      </h1>
      <div className="card prose-casual p-5 sm:p-8">
        <p className="text-lg">
          Short version: we take the real 2024 result in every seat, make an educated guess about{" "}
          <i>who</i> cast those votes, then quietly remove some people and recount. No polling
          station staff were harmed.
        </p>

        <h2>1. Start with the real result</h2>
        <p>
          For each of the 650 constituencies we know how many votes every party actually got on 4
          July 2024. That&apos;s our anchor: whatever we do, if everybody votes, we get the real
          result back.
        </p>

        <h2>2. Guess who voted for whom</h2>
        <p>
          Nobody publishes &ldquo;how 18–24s voted in Clacton&rdquo;. What we do have is
          YouGov&apos;s huge post-election survey (42,000 people) saying how each age group, sex,
          social grade and education level voted nationally, and how big a slice of all voters each
          group was.
        </p>
        <p>
          So for every seat we make a first guess: <i>the group&apos;s slice of voters × its national
          vote share for each party</i>. Then we nudge that guess up and down, round and round
          (it&apos;s called <b>raking</b>, or iterative proportional fitting, if you want to sound
          clever at a party) until two things are true:
        </p>
        <ul>
          <li>each party&apos;s votes add up to exactly what it really got in that seat, and</li>
          <li>each group still makes up the same slice of that seat&apos;s voters.</li>
        </ul>
        <p>
          That&apos;s why, in a seat where Reform did brilliantly, more of those Reform votes get
          pinned on the groups that like Reform (older, non-graduate, C2DE voters), and the SNP only
          gets votes in Scotland, even though the national polling numbers are the same everywhere.
        </p>

        <h2>3. Remove some people, recount</h2>
        <p>
          Pick a scenario and we either delete the chosen groups&apos; estimated votes (&ldquo;nobody
          in these groups voted&rdquo;) or keep <i>only</i> theirs. Whoever has the most votes left
          in each seat wins it, first-past-the-post style. Add up the seats, check whether anyone has
          326 or more, and write a cheeky headline.
        </p>

        <h2>The big fat caveats 🧂</h2>
        <ul>
          <li>
            <b>It&apos;s a toy.</b> It&apos;s for curiosity and pub arguments, not predictions.
          </li>
          <li>
            <b>Ecological assumptions.</b> We assume, say, young people in Truro vote like young
            people nationally, adjusted to fit Truro&apos;s result. Reality is lumpier.
          </li>
          <li>
            <b>Every seat gets the same mix of people.</b> For now we assume each seat&apos;s voters
            are the national mix (say 10% are 18–24). In real life a student-heavy seat in Sheffield
            and a retirement hotspot on the coast look nothing alike. Plugging in Census 2021
            figures for each seat is next on the to-do list; the engine already supports it.
          </li>
          <li>
            <b>One slice at a time.</b> Age, sex, class and education are modelled separately, so
            you can&apos;t (yet) do &ldquo;only female graduates under 35&rdquo;.
          </li>
          <li>
            <b>Nobody changes their mind.</b> If half the country stayed home, the other half might
            vote differently: no tactical voting shifts, no different campaigns, no different
            candidates. Everyone left votes exactly as before.
          </li>
          <li>
            <b>Polls are polls.</b> Group-level vote shares come from post-election surveys, which
            have margins of error and their own definitions (social grade especially).
          </li>
          <li>
            <b>Small parties get fuzzy.</b> &ldquo;Other&rdquo; and independents lump together lots
            of very different candidates. The polls are Great Britain only, so in Northern Ireland we
            assume every group voted the same way, which means NI seats basically never change.
          </li>
          <li>
            <b>Rounding.</b> Raking runs a fixed number of rounds, so tiny numbers can wobble by a
            vote or two. In a really tight seat that could matter, which is half the fun.
          </li>
        </ul>
        <p>
          Every number we use is listed on the <Link href="/sources/">sources page</Link>.
        </p>
      </div>
    </article>
  );
}
