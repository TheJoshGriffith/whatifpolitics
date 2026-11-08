import { SiteLink as Link } from "@/components/SiteLink";

export function HowItWorksContent() {
  return (
    <article className="flex flex-col gap-6 pt-4 sm:pt-10">
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        How it works <span aria-hidden>🔧</span>
      </h1>
      <div className="card prose-casual p-5 sm:p-8">
        <p className="text-lg">
          Short version: pick a vote (any general election from 2010 to 2024, the 2016 Brexit referendum or the 2014 Scottish independence referendum), we take the real result in every seat or counting area, make an educated guess about{" "}
          <i>who</i> cast those votes, then quietly remove some people and recount. No polling
          station staff were harmed.
        </p>

        <h2>1. Start with the real result</h2>
        <p>
          For each of the 650 constituencies we know how many votes every party actually got, from
          the House of Commons Library&apos;s results database. That&apos;s our anchor: whatever we do, if everybody votes, we get the real
          result back.
        </p>

        <h2>2. Guess who voted for whom</h2>
        <p>
          Nobody publishes &ldquo;how 18–24s voted in Clacton&rdquo;. What we do have is
          YouGov&apos;s huge post-election survey (42,000 people) saying how each age group, sex,
          social grade, education level, housing situation and work status voted nationally (plus
          Ipsos for ethnicity), and how big a slice of all voters each
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

        <h2>4. Referendums work the same way</h2>
        <p>
          For the 2016 EU referendum we use the Electoral Commission&apos;s Remain and Leave counts in
          all 382 counting areas, and for the 2014 Scottish referendum the Yes and No counts in all 32
          councils. Instead of parties there are two answers, and instead of seats we just add up the
          votes, because a referendum is won on the national count. We still show which areas would
          change sides, for fun. The group splits come from YouGov and Lord Ashcroft&apos;s polls on
          the day, so the same caveats apply (the Scottish poll only had 14 16–17-year-olds in it).
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
            <b>Older elections have thinner polling.</b> For 2010 and 2015 the only big post-election
            breakdowns we could get are Ipsos&apos;s, which split out Con, Lab, Lib Dem (and UKIP and
            Green in 2015) and lump everyone else together. The SNP, Plaid and friends are worked
            out from where they actually won votes. Group sizes for 2015–2019 Ipsos slices are
            estimated from Ipsos&apos;s 2010 survey profile.
          </li>
          <li>
            <b>Ethnicity is the roughest slice.</b> Ipsos is the only post-election poll we could
            get with a White / Asian / Black / Mixed split, and it warns the minority samples are
            small. It doesn&apos;t report &ldquo;other&rdquo; ethnic groups separately, so we lump
            them in with Mixed. And because every seat currently gets the national mix, Leicester
            South gets the same share of Asian voters as Penrith, which really isn&apos;t true.
            Take these ones with a big pinch of salt.
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
